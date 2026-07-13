import { useState, useEffect, useCallback } from 'react';
import {
  checkIsConnected,
  connectGoogle,
  disconnectGoogle,
  getConnectedEmail,
} from '../lib/googleAuth';

const STORAGE_KEY = 'sg_google_auth';

export interface GoogleAuthState {
  isConnected: boolean;
  isConnecting: boolean;
  email: string | undefined;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export function useGoogleAuth(): GoogleAuthState {
  const [isConnected,  setIsConnected]  = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [email,        setEmail]        = useState<string | undefined>(undefined);
  const [error,        setError]        = useState<string | null>(null);

  // Read initial auth state from storage on mount
  useEffect(() => {
    checkIsConnected().then(connected => {
      setIsConnected(connected);
      if (connected) getConnectedEmail().then(setEmail);
    });

    // React to storage changes from any other widget / tab that triggers
    // connect() or disconnect() — keeps all mounted widgets in sync without
    // a shared React context.
    let browser: typeof import('webextension-polyfill').default | null = null;

    const listener = (
      changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
    ) => {
      if (!(STORAGE_KEY in changes)) return;
      const hasToken = changes[STORAGE_KEY].newValue != null;
      setIsConnected(hasToken);
      if (!hasToken) setEmail(undefined);
    };

    import('webextension-polyfill').then(({ default: b }) => {
      browser = b;
      browser.storage.local.onChanged.addListener(listener);
    });

    return () => {
      browser?.storage.local.onChanged.removeListener(listener);
    };
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      await connectGoogle();
      setIsConnected(true);
      getConnectedEmail().then(setEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    await disconnectGoogle();
    setIsConnected(false);
    setEmail(undefined);
  }, []);

  return { isConnected, isConnecting, email, error, connect, disconnect };
}
