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

// Debounce for search-driven refetches (typing in Search/Collection ID) —
// keeps every keystroke from firing its own API call and hitting Unsplash's
// rate limit. Mode activation, manual "Next photo", and rotation stay instant.
const SEARCH_DEBOUNCE_MS = 450;

// Accepts either a bare collection id/slug or a full Unsplash collection URL
// (e.g. https://unsplash.com/de/kollektionen/3jMstqgu2e4/summer-light) and
// returns just the id/slug segment, trimmed of whitespace.
export function extractCollectionId(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/\/(?:collections|kollektionen)\/([a-zA-Z0-9_-]+)/i);
  return (match ? match[1] : trimmed).trim();
}

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
      const authHeader = { Authorization: `Client-ID ${apiKey}` };
      const throwForStatus = (res: Response) => {
        if (res.ok) return;
        throw new Error(
          res.status === 401 ? 'Invalid API key'      :
          res.status === 403 ? 'Rate limit exceeded'  :
          res.status === 404 ? 'Collection not found' :
          `Error ${res.status}`,
        );
      };

      const source = uc.source ?? 'official';
      let data: { urls: { regular: string }; user: { name: string; links: { html: string } }; links: { html: string } };

      if (source === 'collection' && uc.collectionId) {
        const collectionId = extractCollectionId(uc.collectionId);
        if (/^\d+$/.test(collectionId)) {
          // Legacy numeric collection ids still resolve via /photos/random.
          const params = new URLSearchParams({ orientation: 'landscape', collections: collectionId });
          const res = await fetch(`https://api.unsplash.com/photos/random?${params}`, { headers: authHeader });
          throwForStatus(res);
          data = await res.json();
        } else {
          // Modern alphanumeric collection slugs 404 on /photos/random?collections= —
          // pull a page from the collection's own photo list (an array of Photo, not
          // a single Photo like /photos/random) and pick one at random instead.
          const fetchCollectionPhotos = async (withOrientation: boolean) => {
            const params = new URLSearchParams({ per_page: '30' });
            if (withOrientation) params.set('orientation', 'landscape');
            const res = await fetch(
              `https://api.unsplash.com/collections/${encodeURIComponent(collectionId)}/photos?${params}`,
              { headers: authHeader },
            );
            throwForStatus(res);
            return res.json();
          };

          let photos = await fetchCollectionPhotos(true);
          if (!Array.isArray(photos) || photos.length === 0) {
            console.error(`[Unsplash] Collection "${collectionId}" returned no landscape-oriented photos — retrying without the orientation filter.`);
            photos = await fetchCollectionPhotos(false);
          }
          if (!Array.isArray(photos) || photos.length === 0) {
            console.error(`[Unsplash] Collection "${collectionId}" has no usable photos.`);
            throw new Error('Collection has no photos');
          }
          data = photos[Math.floor(Math.random() * photos.length)];
        }
      } else {
        const params = new URLSearchParams({ orientation: 'landscape' });
        if (source === 'search' && uc.query) {
          params.set('query', uc.query);
        } else if (source === 'topics' && uc.topics?.length) {
          params.set('topics', uc.topics.join(','));
        } else if (source === 'official') {
          params.set('featured', 'true');
        }
        const res = await fetch(`https://api.unsplash.com/photos/random?${params}`, { headers: authHeader });
        throwForStatus(res);
        data = await res.json();
      }

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
  }, [apiKey, uc?.source, uc?.query, uc?.topics, uc?.collectionId]);

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
      }
      // 'every new tab' mode always fetches a fresh photo on load rather than
      // trusting the cache, even if a cached attribution already exists.
      if (apiKey && (!cached || uc?.rotationInterval === 0)) {
        fetchRef.current();
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // Refetch when search config changes (not on mount — cache load handles that).
  // Debounced so typing into Search/Collection ID doesn't fire a request per
  // keystroke — each dependency change cancels the previous pending timeout.
  const queryKey = JSON.stringify([uc?.source, uc?.query, uc?.topics, uc?.collectionId]);
  const prevQueryKey = useRef(queryKey);
  useEffect(() => {
    if (!isActive || !apiKey) return;
    if (prevQueryKey.current === queryKey) return;
    prevQueryKey.current = queryKey;
    const t = setTimeout(() => fetchRef.current(), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [isActive, apiKey, queryKey]);

  // Rotation scheduler — reruns after each successful fetch (attribution dep)
  const fetchedAt = attribution?.fetchedAt ?? 0;
  useEffect(() => {
    if (!isActive || !apiKey || !fetchedAt) return;
    const rotation = uc.rotationInterval ?? 900;
    // 0 = 'every new tab' — only fetches on (re)mount, never on a recurring timer.
    if (rotation === 0) return;
    const interval = rotation * 1000;
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
