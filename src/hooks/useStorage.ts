import { useState, useEffect, useRef } from 'react';
import { storage } from '../lib/storage';

export function useStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const [loaded, setLoaded] = useState(false);
  const hydrating  = useRef(true);   // true while loading initial value
  const lastSaved  = useRef('');     // JSON of the last value we wrote ourselves

  // ── Initial load ────────────────────────────────
  useEffect(() => {
    storage.get(key).then((stored) => {
      if (stored !== undefined && stored !== null) {
        lastSaved.current = JSON.stringify(stored);
        setValue(stored as T);
      }
      setLoaded(true);
      hydrating.current = false;
    });
  }, [key]);

  // ── Persist on change ───────────────────────────
  useEffect(() => {
    if (!loaded || hydrating.current) return;
    const serialized = JSON.stringify(value);
    if (serialized === lastSaved.current) return; // nothing changed
    lastSaved.current = serialized;
    storage.set(key, value);
  }, [key, value, loaded]);

  // ── Cross-device sync via onChanged ─────────────
  // Only update state when the change came from ANOTHER source
  // (different tab / different device via Firefox Sync).
  // Our own writes are identified by matching lastSaved.
  useEffect(() => {
    return storage.addChangeListener((changedKey, newValue) => {
      if (changedKey !== key) return;
      const serialized = JSON.stringify(newValue);
      if (serialized === lastSaved.current) return; // own write — skip
      lastSaved.current = serialized;
      hydrating.current = true;
      setValue(newValue as T);
      Promise.resolve().then(() => { hydrating.current = false; });
    });
  }, [key]);

  return [value, setValue, loaded] as const;
}
