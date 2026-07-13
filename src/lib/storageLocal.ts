/**
 * Storage adapter for large data (images) — always uses browser.storage.local
 * (5MB limit) instead of sync (100KB limit). Falls back to localStorage in dev.
 */

const isExtension = typeof chrome !== 'undefined' && !!chrome.storage;

async function get(key: string): Promise<unknown> {
  if (isExtension) {
    const { default: browser } = await import('webextension-polyfill');
    const result = await browser.storage.local.get(key);
    return result[key];
  }
  const raw = localStorage.getItem(`sg-local:${key}`);
  return raw !== null ? JSON.parse(raw) : undefined;
}

async function set(key: string, value: unknown): Promise<void> {
  if (isExtension) {
    const { default: browser } = await import('webextension-polyfill');
    await browser.storage.local.set({ [key]: value });
    return;
  }
  localStorage.setItem(`sg-local:${key}`, JSON.stringify(value));
}

async function remove(key: string): Promise<void> {
  if (isExtension) {
    const { default: browser } = await import('webextension-polyfill');
    await browser.storage.local.remove(key);
    return;
  }
  localStorage.removeItem(`sg-local:${key}`);
}

export const storageLocal = { get, set, remove };
