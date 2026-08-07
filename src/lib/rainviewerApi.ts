// RainViewer's free public Weather Maps API — no key/registration, no rate
// limit posted (but cache the frame list, don't poll it per-render). Docs:
// https://www.rainviewer.com/api.html
const FRAMES_URL = 'https://api.rainviewer.com/public/weather-maps.json';
const TILE_SIZE = 256;
const COLOR_SCHEME = 2; // "Universal Blue", matches their own example widgets
const SMOOTH = 1;
const SNOW = 1;

export interface RadarFrame {
  time: number; // unix seconds
  path: string; // e.g. "/v2/radar/1699999999"
}

interface WeatherMapsResponse {
  host: string;
  radar: {
    past: RadarFrame[];
    nowcast: RadarFrame[];
  };
}

export interface RadarTimeline {
  host: string;
  frames: RadarFrame[]; // past + nowcast, chronological
  /** Frames at index >= pastCount are nowcast (forecast) frames. */
  pastCount: number;
}

export async function fetchRadarTimeline(): Promise<RadarTimeline> {
  const res = await fetch(FRAMES_URL);
  if (!res.ok) throw new Error(`RainViewer request failed: ${res.status}`);
  const json: WeatherMapsResponse = await res.json();
  return {
    host: json.host,
    frames: [...json.radar.past, ...json.radar.nowcast],
    pastCount: json.radar.past.length,
  };
}

export function radarTileUrlTemplate(host: string, frame: RadarFrame): string {
  return `${host}${frame.path}/${TILE_SIZE}/{z}/{x}/{y}/${COLOR_SCHEME}/${SMOOTH}_${SNOW}.png`;
}
