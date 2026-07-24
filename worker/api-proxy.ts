// Proxies background-image providers whose API key must stay server-side.
// Path-routed: /nasa/* forwards to api.nasa.gov (api_key as a query param),
// /google-token forwards to Google's OAuth token endpoint (client_secret
// injected server-side — Google's "Web application" client type requires
// client_secret at token exchange even when the extension uses PKCE),
// /ms-token forwards to Microsoft's identity platform token endpoint (same
// reasoning — see src/lib/msAuth.ts), everything else forwards to
// api.unsplash.com (Client-ID auth header) — keeps a single Worker/deploy
// for all of these rather than one per provider.
export interface Env {
  UNSPLASH_ACCESS_KEY: string;
  NASA_API_KEY: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  MS_CLIENT_ID: string;
  MS_CLIENT_SECRET: string;
  ALLOWED_ORIGIN?: string; // e.g. 'chrome-extension://<id>' or 'moz-extension://<id>'
}

const UNSPLASH_UPSTREAM = 'https://api.unsplash.com';
const NASA_UPSTREAM = 'https://api.nasa.gov';
const NASA_PREFIX = '/nasa';
const GOOGLE_TOKEN_UPSTREAM = 'https://oauth2.googleapis.com/token';
const GOOGLE_TOKEN_PATH = '/google-token';
const MS_TOKEN_UPSTREAM = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const MS_TOKEN_PATH = '/ms-token';

async function relay(upstreamRes: Response, corsHeaders: Record<string, string>): Promise<Response> {
  const body = await upstreamRes.arrayBuffer();
  return new Response(body, {
    status: upstreamRes.status,
    headers: {
      ...corsHeaders,
      'Content-Type': upstreamRes.headers.get('Content-Type') || 'application/json',
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: { ...corsHeaders, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' },
      });
    }

    const url = new URL(request.url);

    if (url.pathname === GOOGLE_TOKEN_PATH) {
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405, headers: corsHeaders });
      }
      const incoming = await request.formData();
      const params = new URLSearchParams();
      for (const [key, value] of incoming.entries()) {
        params.set(key, String(value));
      }
      params.set('client_id', env.GOOGLE_CLIENT_ID);
      params.set('client_secret', env.GOOGLE_CLIENT_SECRET);

      const upstreamRes = await fetch(GOOGLE_TOKEN_UPSTREAM, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });
      return relay(upstreamRes, corsHeaders);
    }

    if (url.pathname === MS_TOKEN_PATH) {
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405, headers: corsHeaders });
      }
      const incoming = await request.formData();
      const params = new URLSearchParams();
      for (const [key, value] of incoming.entries()) {
        params.set(key, String(value));
      }
      params.set('client_id', env.MS_CLIENT_ID);
      params.set('client_secret', env.MS_CLIENT_SECRET);

      const upstreamRes = await fetch(MS_TOKEN_UPSTREAM, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });
      return relay(upstreamRes, corsHeaders);
    }

    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    if (url.pathname.startsWith(NASA_PREFIX)) {
      const nasaPath = url.pathname.slice(NASA_PREFIX.length) || '/';
      const params = new URLSearchParams(url.search);
      params.set('api_key', env.NASA_API_KEY);
      const upstreamRes = await fetch(`${NASA_UPSTREAM}${nasaPath}?${params}`);
      return relay(upstreamRes, corsHeaders);
    }

    const upstreamRes = await fetch(`${UNSPLASH_UPSTREAM}${url.pathname}${url.search}`, {
      headers: {
        Authorization: `Client-ID ${env.UNSPLASH_ACCESS_KEY}`,
        'Accept-Version': 'v1',
      },
    });
    return relay(upstreamRes, corsHeaders);
  },
};
