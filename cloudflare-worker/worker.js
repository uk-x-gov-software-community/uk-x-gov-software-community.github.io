/**
 * Cloudflare Worker: GitHub OAuth CORS proxy + newsletter dispatch gate
 *
 * github.com/login/* endpoints do not send CORS headers, so browser-based
 * Device Flow requests are rejected. This worker proxies only the two
 * endpoints needed for the Device Flow and provides a server-side /dispatch
 * endpoint so the newsletter submission never requires public_repo scope.
 *
 * Required secret (set via `wrangler secret put GITHUB_DISPATCH_TOKEN`):
 *   GITHUB_DISPATCH_TOKEN — a fine-grained PAT or GitHub App installation token
 *   with `contents: write` on the site repo (needed to fire repository_dispatch).
 *
 * Routes:
 *   POST /device/code          → https://github.com/login/device/code
 *   POST /oauth/access_token   → https://github.com/login/oauth/access_token
 *   POST /dispatch             → verifies org membership, then fires repository_dispatch
 *
 * All routes reject requests from origins other than ALLOWED_ORIGIN.
 */

const ALLOWED_ORIGINS = new Set([
  'https://uk-x-gov-software-community.github.io',
  'https://www.uk-x-gov-software-community.org.uk'
])
const ORG = 'uk-x-gov-software-community'
const SITE_REPO = 'uk-x-gov-software-community.github.io'

const UPSTREAM = {
  '/device/code': 'https://github.com/login/device/code',
  '/oauth/access_token': 'https://github.com/login/oauth/access_token'
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin')

    // Reject all cross-origin requests from unexpected origins.
    if (!ALLOWED_ORIGINS.has(origin)) {
      return new Response('Forbidden', { status: 403 })
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept'
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders })
    }

    const { pathname } = new URL(request.url)

    if (pathname === '/dispatch') {
      return handleDispatch(request, env, corsHeaders)
    }

    const target = UPSTREAM[pathname]
    if (!target) {
      return new Response('Not found', { status: 404, headers: corsHeaders })
    }

    const upstream = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': request.headers.get('Content-Type') || 'application/json',
        'Accept': request.headers.get('Accept') || 'application/json'
      },
      body: request.body
    })

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json'
      }
    })
  }
}

/**
 * Verifies the user's OAuth token, checks org membership, sanitises the
 * payload, then fires the repository_dispatch using the worker's own
 * stored GITHUB_DISPATCH_TOKEN (so the user never needs public_repo scope).
 */
async function handleDispatch(request, env, corsHeaders) {
  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

  let body
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: jsonHeaders })
  }

  const { token, payload } = body
  if (!token || typeof token !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing token' }), { status: 400, headers: jsonHeaders })
  }

  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  }

  // Resolve the authenticated user's login from the token — don't trust the client.
  const userResp = await fetch('https://api.github.com/user', { headers: ghHeaders })
  if (!userResp.ok) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 401, headers: jsonHeaders })
  }
  const { login: github_username } = await userResp.json()

  // Authoritatively check org membership server-side.
  const memberResp = await fetch(
    `https://api.github.com/orgs/${ORG}/members/${encodeURIComponent(github_username)}`,
    { headers: ghHeaders, redirect: 'manual' }
  )
  if (memberResp.status !== 204) {
    return new Response(JSON.stringify({ error: 'Not a member of the organisation' }), { status: 403, headers: jsonHeaders })
  }

  // Sanitise all payload fields before forwarding; derive trusted fields server-side.
  const sanitised = sanitisePayload(payload, github_username)

  const dispatchResp = await fetch(
    `https://api.github.com/repos/${ORG}/${SITE_REPO}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GITHUB_DISPATCH_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: JSON.stringify({ event_type: 'newsletter-submission', client_payload: sanitised })
    }
  )

  if (dispatchResp.status !== 204) {
    return new Response(JSON.stringify({ error: 'Dispatch failed' }), { status: 502, headers: jsonHeaders })
  }

  return new Response(null, { status: 204, headers: corsHeaders })
}

/**
 * Strips control characters, trims, and enforces max lengths on all fields.
 * github_username and submitted_at are always derived server-side.
 */
function sanitisePayload(raw, github_username) {
  const clean = v => (typeof v === 'string' ? v.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim() : '')
  return {
    name: clean(raw?.name).slice(0, 200),
    department: clean(raw?.department).slice(0, 200),
    story: clean(raw?.story).slice(0, 4000),
    link: clean(raw?.link).slice(0, 500),
    github_username,
    submitted_at: new Date().toISOString().slice(0, 10)
  }
}
