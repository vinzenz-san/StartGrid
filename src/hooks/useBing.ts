import { useState, useEffect, useCallback, useRef } from 'react';
import { storageLocal } from '../lib/storageLocal';
import { BackgroundConfig } from '../types/background';
import { fetchBingImage } from '../components/Background/providers/bing';

interface BingCache {
  url: string;
  title?: string;
  fetchedDate: string; // YYYY-MM-DD, local — drives once-a-day refresh
}

const CACHE_KEY = 'sg:bing:cache';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useBing(
  config: BackgroundConfig,
  setImageUrl: (url: string | null) => void,
) {
  const isActive = config.mode === 'bing';

  const [title, setTitle]           = useState<string | undefined>(undefined);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // Always-current ref, same pattern as useUnsplash's fetchRef
  const fetchRef = useRef<() => Promise<void>>(async () => {});

  const fetchImage = useCallback(async () => {
    setIsFetching(true);
    setError(null);
    try {
      const { url, title: t } = await fetchBingImage();
      setTitle(t);
      setImageUrl(url);
      const cache: BingCache = { url, title: t, fetchedDate: todayKey() };
      storageLocal.set(CACHE_KEY, cache);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fetch failed');
    } finally {
      setIsFetching(false);
    }
  }, [setImageUrl]);

  useEffect(() => { fetchRef.current = fetchImage; }, [fetchImage]);

  // Load cache when mode becomes active — reuse today's cached image, else refetch
  useEffect(() => {
    if (!isActive) { setImageUrl(null); return; }
    storageLocal.get(CACHE_KEY).then(cached => {
      const c = cached as BingCache | undefined;
      if (c && c.fetchedDate === todayKey()) {
        setTitle(c.title);
        setImageUrl(c.url);
      } else {
        fetchRef.current();
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  return {
    title,
    isFetching,
    error,
    fetchNow: fetchImage,
  };
}
