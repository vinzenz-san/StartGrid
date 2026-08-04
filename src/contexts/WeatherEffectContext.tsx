import { createContext, useContext, useState, type ReactNode } from 'react';
import { useStorage } from '../hooks/useStorage';
import { useWeather } from '../hooks/useWeather';
import { getWeatherEffectType, type WeatherEffectType } from '../lib/weatherEffectMap';

const STORAGE_KEY = 'sg:weatherEffect';

interface WeatherEffectConfig {
  enabled:      boolean;
  latitude?:    number;
  longitude?:   number;
  locationName?: string;
}

const DEFAULTS: WeatherEffectConfig = { enabled: false };

interface WeatherEffectCtx {
  enabled:      boolean;
  locationName?: string;
  hasLocation:  boolean;
  setEnabled:   (enabled: boolean) => void;
  setLocation:  (lat: number, lon: number, name?: string) => void;
  /** Real effect derived from live weather, ignoring any dev override. */
  liveEffectType: WeatherEffectType;
  /** Effect actually shown by <WeatherEffect> — devOverride wins when set. */
  effectType:   WeatherEffectType;
  /** Dev-panel debug override — in-memory only, resets on reload. */
  devOverride:    WeatherEffectType | null;
  setDevOverride: (type: WeatherEffectType | null) => void;
  /** Live temperature in °C (units are pinned to 'metric' above), or null
   *  until resolved — drives the corner-frost overlay (< 0°C). */
  temperatureC: number | null;
  /** Real frost state derived from temperatureC, ignoring any dev override. */
  liveFrostActive: boolean;
  /** Frost state actually shown by <WeatherEffect> — devFrostOverride wins when set. */
  frostActive:      boolean;
  /** Dev-panel debug override — in-memory only, resets on reload. */
  devFrostOverride:    boolean | null;
  setDevFrostOverride: (value: boolean | null) => void;
}

const Ctx = createContext<WeatherEffectCtx | null>(null);

export function WeatherEffectProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useStorage<WeatherEffectConfig>(STORAGE_KEY, DEFAULTS);
  const [devOverride, setDevOverride] = useState<WeatherEffectType | null>(null);
  const [devFrostOverride, setDevFrostOverride] = useState<boolean | null>(null);

  const c = config ?? DEFAULTS;
  const hasLocation = c.latitude !== undefined && c.longitude !== undefined;

  const { weather } = useWeather({
    latitude:  hasLocation ? c.latitude : undefined,
    longitude: hasLocation ? c.longitude : undefined,
    units: 'metric',
  });

  const liveEffectType = weather ? getWeatherEffectType(weather.weatherCode) : 'none';
  const effectType = devOverride ?? liveEffectType;

  const temperatureC = weather ? weather.temperature : null;
  const liveFrostActive = temperatureC !== null && temperatureC < 0;
  const frostActive = devFrostOverride ?? liveFrostActive;

  const setEnabled  = (enabled: boolean) => setConfig(prev => ({ ...(prev ?? DEFAULTS), enabled }));
  const setLocation = (latitude: number, longitude: number, locationName?: string) =>
    setConfig(prev => ({ ...(prev ?? DEFAULTS), latitude, longitude, locationName }));

  return (
    <Ctx.Provider value={{
      enabled: c.enabled, locationName: c.locationName, hasLocation,
      setEnabled, setLocation,
      liveEffectType, effectType, devOverride, setDevOverride,
      temperatureC, liveFrostActive, frostActive, devFrostOverride, setDevFrostOverride,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useWeatherEffect() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useWeatherEffect must be used within WeatherEffectProvider');
  return ctx;
}
