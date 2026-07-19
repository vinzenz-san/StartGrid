// Extension background entry (Chrome MV3 service worker / Firefox event page).
//
// Deliberately zero-dependency: no imports from the rest of the app (not even
// lib/storage.ts, which dynamically import()s webextension-polyfill) — any
// reachable dynamic import() anywhere in this module's graph makes the
// bundler inject its default chunk-loading runtime, which references
// `document` and crashes a service worker before it can even register. See
// providers/bing.ts / lib/bingApi.ts for the same constraint documented on
// the fetch-helper side.
//
// Purpose: relay a same-extension "fetch this external image" request through
// the background context, where host_permissions bypass CORS for fetch()
// even when the image host's own response headers refuse it for a page-level
// fetch (confirmed via console: apod.nasa.gov blocks the direct newtab-page
// fetch despite host_permissions). Converts the result to a base64 data: URL
// so it can be handed straight to an <img src> with zero further CORS concerns.

// `browser` is Firefox's native global (no polyfill import needed here — see
// the file-level note above); `chrome` is Chrome's. Neither @types/chrome nor
// @types/firefox-webext-browser is a project dependency (this file avoids
// importing webextension-polyfill on purpose), so these are read as untyped
// globals rather than pulling in an ambient-types package for one file.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalApi = globalThis as any;
const runtime = (globalApi.browser ?? globalApi.chrome).runtime;

async function fetchAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  const contentType = res.headers.get('content-type') || 'application/octet-stream';
  const bytes = new Uint8Array(await res.arrayBuffer());

  // Chunked to avoid a call-stack overflow from String.fromCharCode(...bytes)
  // on large images (spreading a huge typed array as individual arguments).
  const CHUNK_SIZE = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE));
  }
  return `data:${contentType};base64,${btoa(binary)}`;
}

interface FetchExternalImageMessage {
  action: 'FETCH_EXTERNAL_IMAGE';
  url: string;
}

function isFetchExternalImageMessage(message: unknown): message is FetchExternalImageMessage {
  return !!message && typeof message === 'object'
    && (message as { action?: unknown }).action === 'FETCH_EXTERNAL_IMAGE'
    && typeof (message as { url?: unknown }).url === 'string';
}

runtime.onMessage.addListener((message: unknown) => {
  if (!isFetchExternalImageMessage(message)) return undefined;

  return fetchAsDataUrl(message.url)
    .then(dataUrl => ({ ok: true as const, dataUrl }))
    .catch((err: unknown) => ({ ok: false as const, error: err instanceof Error ? err.message : 'Fetch failed' }));
});
