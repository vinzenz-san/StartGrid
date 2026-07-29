// Runtime permission helpers for optional_permissions declared in the
// manifest (currently just "bookmarks" — see manifest.firefox.json /
// manifest.chrome.json). Mirrors the pattern already used for OAuth in
// googleAuth.ts/msAuth.ts: nothing is granted at install time, a widget
// requests it lazily the moment the user actually needs the feature.
//
// webextension-polyfill throws at *module evaluation time* (not just when
// its APIs are called) if no chrome/browser global exists — which is always
// the case in the plain-browser preview build (docs/preview, and the older
// preview-server.js dev workflow). A static top-level `import browser from
// 'webextension-polyfill'` would therefore crash the whole bundle before
// React even mounts, in any non-extension context. So detection below uses
// the raw `chrome` global directly (present only in extension pages),
// matching the pattern in storage.ts/storageLocal.ts, and the polyfill
// itself is only ever imported when that's true.
//
// The actual permission *request* still needs care: Firefox only honours
// browser.permissions.request() when called synchronously within a
// user-gesture call stack (a click handler) — even one `await` in between
// can lose that gesture context. So the dynamic import is pre-warmed as
// soon as we know we're in an extension (well before any click), and the
// click handler below awaits the already-cached promise and calls
// .request() with no further await in between.
const isExtensionEnvRaw = typeof chrome !== 'undefined' && !!chrome.runtime?.id;

const browserPromise = isExtensionEnvRaw
  ? import('webextension-polyfill').then((m) => m.default)
  : null;

export const isExtensionEnv = isExtensionEnvRaw;

export async function hasBookmarksPermission(): Promise<boolean> {
  if (!browserPromise) return false;
  try {
    const browser = await browserPromise;
    return await browser.permissions.contains({ permissions: ['bookmarks'] });
  } catch {
    return false;
  }
}

// Must be invoked directly from a click handler — no await before this call
// once browserPromise has already resolved (it's pre-warmed above).
export function requestBookmarksPermission(): Promise<boolean> {
  if (!browserPromise) return Promise.resolve(false);
  return browserPromise
    .then((browser) => browser.permissions.request({ permissions: ['bookmarks'] }))
    .catch(() => false);
}
