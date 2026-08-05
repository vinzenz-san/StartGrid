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

  // Bumped by every param change below, and by fetchWeather itself when it
  // starts — a resolved async call only applies its result if it's still the
  // most recent one requested, so switching location/units mid-flight can't
  // clobber the newer request's state with a stale one.
  const requestIdRef = useRef(0);

  const fetchWeather = useCallback(async () => {
    if (!hasLocation) return;
    const requestId = ++requestIdRef.current;
    setIsFetching(true);
    setError(null);
    try {
      const result = await fetchCurrentWeather(latitude!, longitude!, units);
      if (requestIdRef.current !== requestId) return;
      setWeather(result);
      const cache: WeatherCache = { weather: result, fetchedAt: Date.now() };
      storageLocal.set(cacheKey(latitude!, longitude!, units), cache);
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      setError(err instanceof Error ? err.message : 'Fetch failed');
    } finally {
      if (requestIdRef.current === requestId) setIsFetching(false);
    }
  }, [hasLocation, latitude, longitude, units]);

  useEffect(() => { fetchRef.current = fetchWeather; }, [fetchWeather]);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    if (!hasLocation) { setWeather(null); return; }
    const key = cacheKey(latitude!, longitude!, units);
    storageLocal.get(key).then(cached => {
      if (requestIdRef.current !== requestId) return;
      const c = cached as WeatherCache | undefined;
      if (c && Date.now() - c.fetchedAt < CACHE_TTL_MS) {
        setWeather(c.weather);
      } else {
        fetchRef.current();
      }
    });
  }, [hasLocation, latitude, longitude, units]);

  return { weather, isFetching, error, refetch: fetchWeather };
}
