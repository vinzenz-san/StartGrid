// Proxies background-image providers whose API key must stay server-side.
// Path-routed: /nasa/* forwards to api.nasa.gov (api_key as a query param),
// everything else forwards to api.unsplash.com (Client-ID auth header) —
// keeps a single Worker/deploy for both rather than one per provider.
export interface Env {
  UNSPLASH_ACCESS_KEY: string;
  NASA_API_KEY: string;
  ALLOWED_ORIGIN?: string; // e.g. 'chrome-extension://<id>' or 'moz-extension://<id>'
}

const UNSPLASH_UPSTREAM = 'https://api.unsplash.com';
const NASA_UPSTREAM = 'https://api.nasa.gov';
const NASA_PREFIX = '/nasa';

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
      return new Response(null, { headers: corsHeaders });
    }
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    const url = new URL(request.url);

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
