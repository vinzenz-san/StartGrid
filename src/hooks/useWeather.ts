import { useCallback, useEffect, useRef, useState } from 'react';
import { storageLocal } from '../lib/storageLocal';
import { fetchCurrentWeather, type CurrentWeather } from '../lib/openMeteoApi';

const CACHE_TTL_MS = 15 * 60 * 1000; // weather changes faster than a daily image — short TTL

interface WeatherCache {
  weather: CurrentWeather;
  fetchedAt: number;
}

function cacheKey(lat: number, lon: number, units: string): string {
  return `sg:weather:cache:${lat.toFixed(2)}:${lon.toFixed(2)}:${units}`;
}

interface Params {
  latitude?: number;
  longitude?: number;
  units: 'metric' | 'imperial';
}

export function useWeather({ latitude, longitude, units }: Params) {
  const hasLocation = latitude !== undefined && longitude !== undefined;

  const [weather, setWeather]       = useState<CurrentWeather | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const fetchRef = useRef<() => Promise<void>>(async () => {});

  const fetchWeather = useCallback(async () => {
    if (!hasLocation) return;
    setIsFetching(true);
    setError(null);
    try {
      const result = await fetchCurrentWeather(latitude!, longitude!, units);
      setWeather(result);
      const cache: WeatherCache = { weather: result, fetchedAt: Date.now() };
      storageLocal.set(cacheKey(latitude!, longitude!, units), cache);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fetch failed');
    } finally {
      setIsFetching(false);
    }
  }, [hasLocation, latitude, longitude, units]);

  useEffect(() => { fetchRef.current = fetchWeather; }, [fetchWeather]);

  useEffect(() => {
    if (!hasLocation) { setWeather(null); return; }
    const key = cacheKey(latitude!, longitude!, units);
    storageLocal.get(key).then(cached => {
      const c = cached as WeatherCache | undefined;
      if (c && Date.now() - c.fetchedAt < CACHE_TTL_MS) {
        setWeather(c.weather);
      } else {
        fetchRef.current();
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLocation, latitude, longitude, units]);

  return { weather, isFetching, error, refetch: fetchWeather };
}
