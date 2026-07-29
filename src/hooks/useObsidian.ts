import { useState, useEffect, useCallback } from 'react';
// Type-only import — erased at build time, so it doesn't defeat the lazy
// runtime `await import('webextension-polyfill')` below. Same reasoning as
// useMsAuth.ts: the package's .d.ts uses `export = Browser`.
import type Browser from 'webextension-polyfill';
import {
  OBSIDIAN_CONN_KEY,
  DEFAULT_BASE_URL,
  getConnection,
  setConnection,
  clearConnection,
  testConnection,
  type ObsidianConnection,
  type ConnectionTestResult,
} from '../lib/obsidianApi';
import {
  isExtensionEnv,
  hasObsidianHostPermission,
  requestObsidianHostPermission,
  removeObsidianHostPermission,
} from '../lib/permissions';

export interface ObsidianState {
  /** An API key is stored. */
  isConfigured:  boolean;
  /** The loopback host permission is granted. */
  hasPermission: boolean;
  /** Both of the above — the precondition for any REST call succeeding. */
  isReady:       boolean;
  connection:    ObsidianConnection | null;
  checking:      boolean;
  save:          (conn: ObsidianConnection) => Promise<void>;
  disconnect:    () => Promise<void>;
  /** Must be called straight from a click handler — see lib/permissions.ts. */
  grantPermission: () => Promise<boolean>;
  test:          (candidate: ObsidianConnection) => Promise<ConnectionTestResult>;
}

/**
 * Shared connection state for every Obsidian widget.
 *
 * Deliberately mirrors useMsAuth: one global record in storage.local rather
 * than per-widget data, plus a storage listener so that connecting in one
 * widget's settings immediately unblocks every other mounted Obsidian widget
 * without needing a shared React context.
 */
export function useObsidian(): ObsidianState {
  const [connection,    setConnectionState] = useState<ObsidianConnection | null>(null);
  const [hasPermission, setHasPermission]   = useState(false);
  const [checking,      setChecking]        = useState(true);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getConnection(), hasObsidianHostPermission()]).then(([conn, perm]) => {
      if (cancelled) return;
      setConnectionState(conn);
      setHasPermission(perm);
      setChecking(false);
    });

    if (!isExtensionEnv) return () => { cancelled = true; };

    let browser: Browser.Browser | null = null;

    const onStorageChanged = (
      changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
    ) => {
      if (!(OBSIDIAN_CONN_KEY in changes)) return;
      void getConnection().then(setConnectionState);
    };

    // The permission can also be revoked from the browser's own add-on
    // manager, entirely outside our UI — react to that too, so widgets fall
    // back to the disconnected state instead of failing every fetch.
    const onPermissionChange = () => {
      void hasObsidianHostPermission().then(setHasPermission);
    };

    void import('webextension-polyfill').then(({ default: b }) => {
      if (cancelled) return;
      browser = b;
      browser.storage.local.onChanged.addListener(onStorageChanged);
      browser.permissions.onAdded.addListener(onPermissionChange);
      browser.permissions.onRemoved.addListener(onPermissionChange);
    });

    return () => {
      cancelled = true;
      browser?.storage.local.onChanged.removeListener(onStorageChanged);
      browser?.permissions.onAdded.removeListener(onPermissionChange);
      browser?.permissions.onRemoved.removeListener(onPermissionChange);
    };
  }, []);

  const save = useCallback(async (conn: ObsidianConnection) => {
    await setConnection(conn);
    setConnectionState(await getConnection());
  }, []);

  const disconnect = useCallback(async () => {
    await clearConnection();
    setConnectionState(null);
    // Hand the host permission back as well — leaving it granted after the
    // user disconnects would keep an access right they no longer benefit from.
    await removeObsidianHostPermission();
    setHasPermission(await hasObsidianHostPermission());
  }, []);

  const grantPermission = useCallback(() => {
    return requestObsidianHostPermission().then(granted => {
      setHasPermission(granted);
      return granted;
    });
  }, []);

  const test = useCallback((candidate: ObsidianConnection) => {
    return testConnection(candidate);
  }, []);

  return {
    isConfigured: !!connection,
    hasPermission,
    isReady: !!connection && hasPermission,
    connection,
    checking,
    save,
    disconnect,
    grantPermission,
    test,
  };
}

export { DEFAULT_BASE_URL };
