import { AstronomyConfig, BackgroundProviderDef } from '../../../types/background';

// NASA APOD API — DEMO_KEY is heavily rate-limited (30 req/hr, 50/day) but
// requires no signup. Set APP_NASA_API_KEY in .env (see .env.example) for a
// real key with much higher limits; statically injected at build time via
// rspack.config.ts's DefinePlugin (Rspack has no Vite-style import.meta.env
// of its own — APP_ prefix, not VITE_, since this project is Rspack-based).
// Falls back to DEMO_KEY — with a console notice — so a fresh clone with no
// .env still builds and runs.
const NASA_API_KEY = (import.meta as any).env.APP_NASA_API_KEY || ''; // eslint-disable-line @typescript-eslint/no-explicit-any
if (!NASA_API_KEY) {
  console.info('[astronomy] APP_NASA_API_KEY not set — falling back to NASA\'s heavily rate-limited DEMO_KEY. See .env.example.');
}
const APOD_BASE = `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY || 'DEMO_KEY'}`;

// Dark space-themed fallback — used when NASA's Picture of the Day is a
// video (media_type !== 'image') or the fetch fails outright.
const FALLBACK_CSS = 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)';

export interface ApodImageResult {
  url: string;
  title?: string;
  copyright?: string;
}

interface ApodResponse {
  media_type: string;
  url: string;
  hdurl?: string;
  title?: string;
  copyright?: string;
}

// Pure network helper — same shape as fetchBingImageDirect in lib/bingApi.ts.
// Returns null when the requested APOD isn't an image (e.g. a video), so
// callers know to fall back to FALLBACK_CSS instead of treating it as an error.
// Pass a YYYY-MM-DD `date` to fetch a specific day's APOD instead of today's.
export async function fetchApodImage(date?: string): Promise<ApodImageResult | null> {
  const endpoint = date ? `${APOD_BASE}&date=${date}` : APOD_BASE;
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  const data = await res.json() as ApodResponse;
  if (data.media_type !== 'image') return null;
  const imageUrl = data.hdurl || data.url;
  if (!imageUrl) throw new Error('No image in APOD response');
  return { url: imageUrl, title: data.title, copyright: data.copyright };
}

export const astronomyProvider: BackgroundProviderDef<AstronomyConfig> = {
  mode: 'astronomy',
  label: 'Astronomy Picture of the Day',
  panel: 'astronomy',
  resolveCss(_config, ctx) {
    if (!ctx.apodImageUrl) return FALLBACK_CSS;
    return `url("${ctx.apodImageUrl}") center center / cover no-repeat`;
  },
};
