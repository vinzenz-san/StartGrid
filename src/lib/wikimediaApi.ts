// Pure network helper — fetches Wikimedia's "Featured Content" feed, which
// includes the Picture of the Day. api.wikimedia.org sends permissive CORS
// headers (confirmed: no relay needed for the JSON fetch itself, unlike
// apod.nasa.gov/Bing's own endpoint — see the "Verify CORS Failures Before
// Architecting Around Them" note elsewhere in this codebase). The image URL
// itself still goes through the FETCH_EXTERNAL_IMAGE relay for canvas
// pixel-sampling in useBackgroundContrast.ts, same as Bing/Astronomy/Online.

const FEED_BASE = 'https://api.wikimedia.org/feed/v1/wikipedia/en/featured';

export interface WikimediaImageResult {
  url: string;
  title?: string;
  artist?: string;
}

interface FeaturedContentResponse {
  image?: {
    image?: { source?: string };
    description?: { text?: string };
    artist?: { text?: string };
  };
}

// yyyy-MM-dd -> yyyy/MM/dd, as required by the feed endpoint.
function formatDateForApi(date: string): string {
  return date.replaceAll('-', '/');
}

export async function fetchWikimediaImage(date?: string): Promise<WikimediaImageResult> {
  const formattedDate = formatDateForApi(date ?? new Date().toISOString().slice(0, 10));
  const res = await fetch(`${FEED_BASE}/${formattedDate}`);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  const data = await res.json() as FeaturedContentResponse;
  const url = data.image?.image?.source;
  if (!url) throw new Error('No image in Wikimedia response');
  return {
    url,
    title: data.image?.description?.text,
    artist: data.image?.artist?.text,
  };
}
