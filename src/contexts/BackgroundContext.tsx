import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { storage } from '../lib/storage';
import { storageLocal } from '../lib/storageLocal';
import { BackgroundConfig, DEFAULT_BG } from '../types/background';
import { resolveBackgroundCss } from '../components/Background/providers';
import { useSettings } from './SettingsContext';
import { useUnsplash, UnsplashAttribution } from '../hooks/useUnsplash';

const SYNC_KEY  = 'sg:background';
const LOCAL_KEY = 'sg:background:image';

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
  const { colorScheme, ignoreGlobalThemeSwap } = useSettings();
  const isDark = ignoreGlobalThemeSwap ? true : colorScheme !== 'light';

  const [config, setConfigState]            = useState<BackgroundConfig>(DEFAULT_BG);
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);
  const [unsplashImageUrl, setUnsplashImageUrl] = useState<string | null>(null);
  const [loaded, setLoaded]                 = useState(false);
  const lastSaved                           = useRef('');

  const { attribution, isFetching, error, fetchNow } = useUnsplash(config, setUnsplashImageUrl);

  useEffect(() => {
    Promise.all([
      storage.get(SYNC_KEY),
      storageLocal.get(LOCAL_KEY),
    ]).then(([cfg, img]) => {
      if (cfg) {
        const c = cfg as BackgroundConfig;
        lastSaved.current = JSON.stringify(c);
        setConfigState(c);
      }
      if (img) setCustomImageUrl(img as string);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const serialized = JSON.stringify(config);
    if (serialized === lastSaved.current) return;
    lastSaved.current = serialized;
    storage.set(SYNC_KEY, config);
  }, [config, loaded]);

  const setConfig = (cfg: BackgroundConfig) => setConfigState(cfg);

  const setCustomImage = (dataUrl: string) => {
    setCustomImageUrl(dataUrl);
    storageLocal.set(LOCAL_KEY, dataUrl);
    setConfigState({ mode: 'custom', value: '' });
  };

  const clearCustomImage = () => {
    setCustomImageUrl(null);
    storageLocal.remove(LOCAL_KEY);
    setConfigState(DEFAULT_BG);
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
