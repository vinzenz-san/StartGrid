// Pure network helper — fetches Bing's daily wallpaper via the community
// mirror at bing.npanuhin.me (same source TablissNG uses) rather than Bing's
// own HPImageArchive.aspx endpoint. Bing's own endpoint doesn't send an
// Access-Control-Allow-Origin header, so a direct fetch() from an extension
// page is blocked by ordinary CORS regardless of host_permissions; the
// mirror sends `access-control-allow-origin: *`, so no background-script
// relay is needed at all.

const BING_ENDPOINT = 'https://bing.npanuhin.me/US/en.json';

export interface BingImageResult {
  url: string;
  title?: string;
}

interface BingMirrorEntry {
  title: string;
  date: string; // YYYY-MM-DD
  url: string;  // CORS-friendly mirrored image URL
}

export async function fetchBingImageDirect(): Promise<BingImageResult> {
  const res = await fetch(BING_ENDPOINT);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  const data = await res.json() as BingMirrorEntry[];
  const latest = data[data.length - 1]; // array is date-ascending; last = today's
  if (!latest?.url) throw new Error('No image in Bing response');
  return {
    url: latest.url,
    title: latest.title,
  };
}
