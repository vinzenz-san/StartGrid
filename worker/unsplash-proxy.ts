export interface Env {
  UNSPLASH_ACCESS_KEY: string;
  ALLOWED_ORIGIN?: string; // e.g. 'chrome-extension://<id>' or 'moz-extension://<id>'
}

const UPSTREAM = 'https://api.unsplash.com';

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
    const upstreamRes = await fetch(`${UPSTREAM}${url.pathname}${url.search}`, {
      headers: {
        Authorization: `Client-ID ${env.UNSPLASH_ACCESS_KEY}`,
        'Accept-Version': 'v1',
      },
    });

    const body = await upstreamRes.arrayBuffer();
    return new Response(body, {
      status: upstreamRes.status,
      headers: {
        ...corsHeaders,
        'Content-Type': upstreamRes.headers.get('Content-Type') || 'application/json',
      },
    });
  },
};
