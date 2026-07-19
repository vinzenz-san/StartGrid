import { useState, useEffect, useCallback, useRef } from 'react';
import { storageLocal } from '../lib/storageLocal';
import { BackgroundConfig, UnsplashConfig } from '../types/background';

export interface UnsplashAttribution {
  imageUrl: string;
  photographerName: string;
  photographerUrl: string;
  photoUrl: string;
  fetchedAt: number;
}

const CACHE_KEY = 'sg:unsplash:cache';

// Statically injected at build time via rspack.config.ts's DefinePlugin
// (same Rspack/no-Vite pattern as astronomy.ts's NASA key — APP_ prefix,
// not VITE_, since this project is Rspack-based) — lets a repo maintainer
// ship a working default via .env without every user having to paste their
// own key into Settings first. A user-supplied apiKey in Settings always
// takes priority over this env default.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ENV_UNSPLASH_KEY = (import.meta as any).env.APP_UNSPLASH_API_KEY || '';

export function useUnsplash(
  config: BackgroundConfig,
  setImageUrl: (url: string | null) => void,
) {
  const isActive = config.mode === 'unsplash';
  const uc = isActive ? (config as UnsplashConfig) : undefined;
  const apiKey = uc?.apiKey || ENV_UNSPLASH_KEY;

  const [attribution, setAttribution] = useState<UnsplashAttribution | null>(null);
  const [isFetching, setIsFetching]   = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // Always-current ref so rotation timer doesn't depend on fetchImage identity
  const fetchRef = useRef<() => Promise<void>>(async () => {});

  const fetchImage = useCallback(async () => {
    if (!apiKey) return;
    setIsFetching(true);
    setError(null);
    try {
      const params = new URLSearchParams({ orientation: 'landscape' });
      const source = uc.source ?? 'topics';
      if (source === 'search' && uc.query) {
        params.set('query', uc.query);
      } else if (source === 'topics' && uc.topics?.length) {
        params.set('topics', uc.topics.join(','));
      }
      // 'random' → no extra params

      const res = await fetch(
        `https://api.unsplash.com/photos/random?${params}`,
        { headers: { Authorization: `Client-ID ${apiKey}` } },
      );
      if (!res.ok) throw new Error(
        res.status === 401 ? 'Invalid API key'      :
        res.status === 403 ? 'Rate limit exceeded'  :
        `Error ${res.status}`,
      );

      const data     = await res.json();
      const imageUrl = `${data.urls.regular}&w=1920&fm=webp&fit=max`;
      const next: UnsplashAttribution = {
        imageUrl,
        photographerName: data.user.name as string,
        photographerUrl:  `${data.user.links.html}?utm_source=startgrid&utm_medium=referral`,
        photoUrl:         `${data.links.html}?utm_source=startgrid&utm_medium=referral`,
        fetchedAt: Date.now(),
      };
      setAttribution(next);
      setImageUrl(next.imageUrl);
      storageLocal.set(CACHE_KEY, next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fetch failed');
    } finally {
      setIsFetching(false);
    }
  }, [apiKey, uc?.source, uc?.query, uc?.topics]);

  // Keep ref current
  useEffect(() => { fetchRef.current = fetchImage; }, [fetchImage]);

  // Load cache when mode becomes active
  useEffect(() => {
    if (!isActive) { setImageUrl(null); return; }
    storageLocal.get(CACHE_KEY).then(cached => {
      if (cached) {
        const c = cached as UnsplashAttribution;
        setAttribution(c);
        setImageUrl(c.imageUrl);
      } else if (apiKey) {
        fetchRef.current();
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // Refetch when search config changes (not on mount — cache load handles that)
  const queryKey = JSON.stringify([uc?.source, uc?.query, uc?.topics]);
  const prevQueryKey = useRef(queryKey);
  useEffect(() => {
    if (!isActive || !apiKey) return;
    if (prevQueryKey.current === queryKey) return;
    prevQueryKey.current = queryKey;
    fetchRef.current();
  }, [isActive, apiKey, queryKey]);

  // Rotation scheduler — reruns after each successful fetch (attribution dep)
  const fetchedAt = attribution?.fetchedAt ?? 0;
  useEffect(() => {
    if (!isActive || !apiKey || !fetchedAt) return;
    const interval = (uc.rotationInterval ?? 900) * 1000;
    const delay    = Math.max(0, interval - (Date.now() - fetchedAt));
    const t = setTimeout(() => fetchRef.current(), delay);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, apiKey, uc?.rotationInterval, fetchedAt]);

  return {
    attribution,
    isFetching,
    error,
    fetchNow: fetchImage,
  };
}
