// Pure network helper — fetches from Open-Meteo (api.open-meteo.com /
// geocoding-api.open-meteo.com), a free, no-API-key weather + geocoding
// service. Both endpoints send a permissive CORS header, so a direct fetch()
// from an extension page works with no background-script relay, same as the
// Bing mirror (see src/lib/bingApi.ts).

const GEOCODE_ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

export interface GeocodeResult {
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

interface GeocodeApiEntry {
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export async function geocodeCity(query: string): Promise<GeocodeResult[]> {
  const url = `${GEOCODE_ENDPOINT}?name=${encodeURIComponent(query)}&count=5&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  const data = await res.json() as { results?: GeocodeApiEntry[] };
  return (data.results ?? []).map(r => ({
    name: r.name,
    country: r.country,
    admin1: r.admin1,
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone,
  }));
}

export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  weatherCode: number;
  windSpeed: number;
  isDay: boolean;
}

interface ForecastApiResponse {
  current?: {
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    is_day: number;
  };
}

export async function fetchCurrentWeather(
  lat: number,
  lon: number,
  units: 'metric' | 'imperial',
): Promise<CurrentWeather> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day',
    temperature_unit: units === 'imperial' ? 'fahrenheit' : 'celsius',
    wind_speed_unit: units === 'imperial' ? 'mph' : 'kmh',
  });
  const res = await fetch(`${FORECAST_ENDPOINT}?${params.toString()}`);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  const data = await res.json() as ForecastApiResponse;
  const c = data.current;
  if (!c) throw new Error('No current weather in response');
  return {
    temperature: c.temperature_2m,
    feelsLike: c.apparent_temperature,
    weatherCode: c.weather_code,
    windSpeed: c.wind_speed_10m,
    isDay: c.is_day === 1,
  };
}
