/**
 * Cloudflare Worker: GitHub OAuth CORS proxy
 *
 * github.com/login/* endpoints do not send CORS headers, so browser-based
 * Device Flow requests are rejected. This worker proxies only the two
 * endpoints needed for the Device Flow, adding permissive CORS headers.
 *
 * No secrets are stored here. The OAuth client_id is public by design,
 * and the Device Flow never requires a client_secret.
 *
 * Routes:
 *   POST /device/code          → https://github.com/login/device/code
 *   POST /oauth/access_token   → https://github.com/login/oauth/access_token
 *
 * Deploy:
 *   1. Create a new Worker in the Cloudflare dashboard (free tier).
 *   2. Paste this file as the Worker script.
 *   3. Copy the Worker URL and set it as CORS_PROXY in assets/newsletter-submit.js.
 */

const UPSTREAM = {
  '/device/code': 'https://github.com/login/device/code',
  '/oauth/access_token': 'https://github.com/login/oauth/access_token'
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept'
}

export default {
  async fetch(request) {
    const { pathname } = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    const target = UPSTREAM[pathname]
    if (!target) {
      return new Response('Not found', { status: 404, headers: CORS_HEADERS })
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS })
    }

    const upstream = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': request.headers.get('Content-Type') || 'application/json',
        'Accept': request.headers.get('Accept') || 'application/json'
      },
      body: request.body
    })

    const responseHeaders = {
      ...CORS_HEADERS,
      'Content-Type': upstream.headers.get('Content-Type') || 'application/json'
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders
    })
  }
}
