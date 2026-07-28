// Runtime permission helpers for optional_permissions declared in the
// manifest (currently just "bookmarks" — see manifest.firefox.json /
// manifest.chrome.json). Mirrors the pattern already used for OAuth in
// googleAuth.ts/msAuth.ts: nothing is granted at install time, a widget
// requests it lazily the moment the user actually needs the feature.
//
// Static import (not the dynamic import() used elsewhere in this codebase
// for the background/service-worker entry) is required here: Firefox only
// honours browser.permissions.request() when it's called synchronously
// within a user-gesture call stack (a click handler). Even one `await` for
// a dynamic import() in between can lose that gesture context, causing the
// native prompt to silently never appear and the request to resolve false.
import browser from 'webextension-polyfill';

// Detected via browser.runtime.id (always present in any extension page,
// regardless of which permissions are granted) rather than chrome.permissions
// — Firefox's chrome.* compat shim doesn't reliably expose `permissions`
// even though it exposes `bookmarks`, so checking for it produced a false
// negative in Firefox and made the extension think it wasn't an extension.
export const isExtensionEnv = typeof browser !== 'undefined' && !!browser.runtime?.id;

export async function hasBookmarksPermission(): Promise<boolean> {
  if (!isExtensionEnv) return false;
  try {
    return await browser.permissions.contains({ permissions: ['bookmarks'] });
  } catch {
    return false;
  }
}

// Must be invoked directly from a click handler — no await before this call.
export function requestBookmarksPermission(): Promise<boolean> {
  if (!isExtensionEnv) return Promise.resolve(false);
  return browser.permissions.request({ permissions: ['bookmarks'] }).catch(() => false);
}
