import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { storage } from '../lib/storage';
import { storageLocal } from '../lib/storageLocal';
import { BackgroundConfig, DEFAULT_BG, PRESETS } from '../types/background';

const SYNC_KEY  = 'sg:background';
const LOCAL_KEY = 'sg:background:image';

interface BackgroundCtx {
  config: BackgroundConfig;
  customImageUrl: string | null;
  loaded: boolean;
  setConfig: (cfg: BackgroundConfig) => void;
  setCustomImage: (dataUrl: string) => void;
  clearCustomImage: () => void;
  /** Resolved CSS value for background */
  backgroundCss: string;
}

const Ctx = createContext<BackgroundCtx | null>(null);

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<BackgroundConfig>(DEFAULT_BG);
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const lastSaved = useRef('');

  // Initial load
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

  // Persist config to sync storage
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

  const backgroundCss = (() => {
    switch (config.mode) {
      case 'custom':   return customImageUrl ? `url("${customImageUrl}") center/cover no-repeat` : DEFAULT_BG.value;
      case 'preset':   return PRESETS.find(p => p.id === config.value)?.css ?? DEFAULT_BG.value;
      case 'gradient': return config.value;
      case 'color':
      default:         return config.value;
    }
  })();

  return (
    <Ctx.Provider value={{ config, customImageUrl, loaded, setConfig, setCustomImage, clearCustomImage, backgroundCss }}>
      {children}
    </Ctx.Provider>
  );
}

export function useBackground() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useBackground must be used within BackgroundProvider');
  return ctx;
}
