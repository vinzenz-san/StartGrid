import { useEffect, useState } from 'react';
import { storageLocal } from '../lib/storageLocal';

const KEY_PREFIX = 'sg:ui:section:';

/**
 * Persists a single collapsible panel section's open/closed state to
 * browser.storage.local (falls back to localStorage in dev — see storageLocal),
 * keyed independently per section so concurrent PanelSection instances never
 * clobber each other's persisted state via a shared blob.
 *
 * Pass `persistenceKey: undefined` for non-collapsible sections — the hook
 * becomes a no-op (no storage reads/writes), but is still safe to call
 * unconditionally to satisfy the rules of hooks.
 */
export function useSectionCollapse(persistenceKey: string | undefined, defaultOpen = false): [boolean, () => void] {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const storageKey = persistenceKey ? `${KEY_PREFIX}${persistenceKey}` : null;

  useEffect(() => {
    if (!storageKey) return;
    let cancelled = false;
    storageLocal.get(storageKey).then(stored => {
      if (!cancelled && typeof stored === 'boolean') setIsOpen(stored);
    });
    return () => { cancelled = true; };
  }, [storageKey]);

  const toggle = () => {
    setIsOpen(prev => {
      const next = !prev;
      if (storageKey) storageLocal.set(storageKey, next);
      return next;
    });
  };

  return [isOpen, toggle];
}
