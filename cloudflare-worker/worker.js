/**
 * Cloudflare Worker: GitHub OAuth CORS proxy + newsletter dispatch gate
 *
 * github.com/login/* endpoints do not send CORS headers, so browser-based
 * Device Flow requests are rejected. This worker proxies only the two
 * endpoints needed for the Device Flow and provides a server-side /dispatch
 * endpoint so the newsletter submission never requires public_repo scope.
 *
 * Required secrets (set via `wrangler secret put <NAME>`):
 *   GITHUB_APP_ID              — the GitHub App's numeric ID
 *   GITHUB_APP_PRIVATE_KEY     — the GitHub App's PEM private key
 *   GITHUB_APP_INSTALLATION_ID — the installation ID on the org
 *
 * Routes:
 *   POST /device/code          → https://github.com/login/device/code
 *   POST /oauth/access_token   → https://github.com/login/oauth/access_token
 *   POST /dispatch             → verifies org membership, then fires repository_dispatch
 *
 * All routes reject requests from origins other than ALLOWED_ORIGINS.
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
 * Generates a GitHub App JWT, valid for 60 seconds, using the app's private key.
 * Uses the Web Crypto API (available in Cloudflare Workers).
 */
async function generateAppJwt(appId, pemKey) {
  const now = Math.floor(Date.now() / 1000)
  const payload = { iat: now - 10, exp: now + 60, iss: String(appId) }

  const header = { alg: 'RS256', typ: 'JWT' }
  const encode = obj => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const signingInput = `${encode(header)}.${encode(payload)}`

  // Strip PEM headers/footers and decode the raw DER bytes
  const pemBody = pemKey
    .replace(/-----BEGIN RSA PRIVATE KEY-----|-----END RSA PRIVATE KEY-----|-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n|\r/g, '')
  const keyBytes = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  )

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  return `${signingInput}.${sigB64}`
}

/**
 * Exchanges a GitHub App JWT for a short-lived installation access token.
 */
async function getInstallationToken(appId, pemKey, installationId) {
  const jwt = await generateAppJwt(appId, pemKey)
  const resp = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'uk-x-gov-software-community-newsletter'
      }
    }
  )
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '')
    throw new Error(`Failed to get installation token: ${resp.status} ${detail}`)
  }
  const data = await resp.json()
  return data.token
}

/**
 * Verifies the user's OAuth token, checks org membership, sanitises the
 * payload, then fires the repository_dispatch using a GitHub App installation
 * token (so the user never needs public_repo scope).
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
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'uk-x-gov-software-community-newsletter'
  }

  // Resolve the authenticated user's login from the token — don't trust the client.
  const userResp = await fetch('https://api.github.com/user', { headers: ghHeaders })
  if (!userResp.ok) {
    const detail = await userResp.text().catch(() => '')
    return new Response(JSON.stringify({ error: `Invalid or expired token (GitHub ${userResp.status}: ${detail})` }), { status: 401, headers: jsonHeaders })
  }
  const { login: github_username } = await userResp.json()

  // Generate a fresh GitHub App installation token for privileged API calls.
  let appToken
  try {
    appToken = await getInstallationToken(
      env.GITHUB_APP_ID,
      env.GITHUB_APP_PRIVATE_KEY,
      env.GITHUB_APP_INSTALLATION_ID
    )
  } catch (err) {
    console.error(`Failed to get app installation token: ${err.message}`)
    return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: jsonHeaders })
  }

  const appHeaders = {
    Authorization: `Bearer ${appToken}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'uk-x-gov-software-community-newsletter'
  }

  // Authoritatively check org membership using the app installation token.
  const memberResp = await fetch(
    `https://api.github.com/orgs/${ORG}/members/${encodeURIComponent(github_username)}`,
    { headers: appHeaders }
  )
  if (memberResp.status !== 204) {
    const detail = await memberResp.text().catch(() => '')
    console.error(`Membership check failed for ${github_username}: HTTP ${memberResp.status} — ${detail}`)
    return new Response(JSON.stringify({ error: 'Not a member of the organisation' }), { status: 403, headers: jsonHeaders })
  }

  // Sanitise all payload fields before forwarding; derive trusted fields server-side.
  const sanitised = sanitisePayload(payload, github_username)

  const dispatchResp = await fetch(
    `https://api.github.com/repos/${ORG}/${SITE_REPO}/dispatches`,
    {
      method: 'POST',
      headers: { ...appHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'newsletter-submission', client_payload: sanitised })
    }
  )

  if (dispatchResp.status !== 204) {
    const detail = await dispatchResp.text().catch(() => '')
    console.error(`Dispatch failed: ${dispatchResp.status} — ${detail}`)
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
