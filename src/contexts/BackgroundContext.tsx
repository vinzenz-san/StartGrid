import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { storage } from '../lib/storage';
import { storageLocal } from '../lib/storageLocal';
import { BackgroundConfig, DEFAULT_BG } from '../types/background';
import { resolveBackgroundCss } from '../components/Background/providers';
import { useSettings } from './SettingsContext';
import { useUnsplash, UnsplashAttribution } from '../hooks/useUnsplash';

const SYNC_KEY          = 'sg:background';
const LOCAL_KEY         = 'sg:background:image';
// Both keys use plain localStorage for synchronous first-render fast-paths,
// eliminating the white flash caused by async storage.sync / storage.local hydration.
const FAST_CONFIG_KEY   = 'sg:bg:fastConfig';
const FAST_URL_KEY      = 'sg:unsplash:fastUrl';

function readFastConfig(): BackgroundConfig | null {
  try {
    const raw = localStorage.getItem(FAST_CONFIG_KEY);
    return raw ? (JSON.parse(raw) as BackgroundConfig) : null;
  } catch { return null; }
}
function writeFastConfig(cfg: BackgroundConfig): void {
  try { localStorage.setItem(FAST_CONFIG_KEY, JSON.stringify(cfg)); } catch {}
}

function readFastUrl(): string | null {
  try { return localStorage.getItem(FAST_URL_KEY); } catch { return null; }
}
function writeFastUrl(url: string | null): void {
  try {
    if (url) localStorage.setItem(FAST_URL_KEY, url);
    else localStorage.removeItem(FAST_URL_KEY);
  } catch {}
}

interface BackgroundCtx {
  config: BackgroundConfig;
  customImageUrl: string | null;
  loaded: boolean;
  setConfig: (cfg: BackgroundConfig) => void;
  setCustomImage: (dataUrl: string) => void;
  clearCustomImage: () => void;
  backgroundCss: string;
  unsplash: {
    imageUrl: string | null;
    attribution: UnsplashAttribution | null;
    isFetching: boolean;
    error: string | null;
    fetchNow: () => void;
  };
}

const Ctx = createContext<BackgroundCtx | null>(null);

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const { colorScheme } = useSettings();
  const isDark = colorScheme !== 'light';

  // Initialise synchronously from localStorage fast-path — avoids first-frame flash
  const [config, setConfigState]            = useState<BackgroundConfig>(() => readFastConfig() ?? DEFAULT_BG);
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);
  const [unsplashImageUrl, setUnsplashImageUrlRaw] = useState<string | null>(readFastUrl);
  const [loaded, setLoaded]                 = useState(false);
  const lastSaved                           = useRef('');

  const setUnsplashImageUrl = (url: string | null) => {
    setUnsplashImageUrlRaw(url);
    writeFastUrl(url);
  };

  const { attribution, isFetching, error, fetchNow } = useUnsplash(config, setUnsplashImageUrl);

  // Hydrate from real storage (sync + local) on mount
  useEffect(() => {
    Promise.all([
      storage.get(SYNC_KEY),
      storageLocal.get(LOCAL_KEY),
    ]).then(([cfg, img]) => {
      if (cfg) {
        const c = cfg as BackgroundConfig;
        lastSaved.current = JSON.stringify(c);
        setConfigState(c);
        writeFastConfig(c);
      }
      if (img) setCustomImageUrl(img as string);
      setLoaded(true);
    });
  }, []);

  // Persist config changes to storage.sync + localStorage fast-path
  useEffect(() => {
    if (!loaded) return;
    const serialized = JSON.stringify(config);
    if (serialized === lastSaved.current) return;
    lastSaved.current = serialized;
    storage.set(SYNC_KEY, config);
    writeFastConfig(config);
  }, [config, loaded]);

  const setConfig = (cfg: BackgroundConfig) => {
    setConfigState(cfg);
    writeFastConfig(cfg); // write immediately so fast-path is always current
  };

  const setCustomImage = (dataUrl: string) => {
    setCustomImageUrl(dataUrl);
    storageLocal.set(LOCAL_KEY, dataUrl);
    setConfig({ mode: 'custom', value: '' });
  };

  const clearCustomImage = () => {
    setCustomImageUrl(null);
    storageLocal.remove(LOCAL_KEY);
    setConfig(DEFAULT_BG);
  };

  const backgroundCss = resolveBackgroundCss(config, {
    isDark,
    customImageUrl,
    unsplashImageUrl,
  });

  return (
    <Ctx.Provider value={{
      config, customImageUrl, loaded,
      setConfig, setCustomImage, clearCustomImage,
      backgroundCss,
      unsplash: { imageUrl: unsplashImageUrl, attribution, isFetching, error, fetchNow },
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useBackground() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useBackground must be used within BackgroundProvider');
  return ctx;
}
