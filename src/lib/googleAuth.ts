// ── Developer setup ───────────────────────────────────────────────────────────
//
// Before this extension can authenticate with Google, you must:
//
// 1. Go to https://console.cloud.google.com/ and create a project.
// 2. Enable the Google Calendar API in "APIs & Services".
// 3. Create OAuth 2.0 credentials: "Web application" type. (Google's
//    "Desktop app" type does not accept the *.chromiumapp.org / allizom.org
//    redirect URIs that browser.identity.launchWebAuthFlow requires.)
// 4. Load the extension in Firefox (about:debugging → Load Temporary Add-on).
// 5. In the Browser Console run:
//      chrome.identity.getRedirectURL()   // or browser.identity.getRedirectURL()
//    Copy the URL it returns (e.g. "https://abc123.extensions.allizom.org/").
// 6. Add that exact URL as an Authorized Redirect URI in your GCP OAuth client.
// 7. Paste your Client ID below (it is a public identifier, not a secret).
//
// ─────────────────────────────────────────────────────────────────────────────

import {
  type StoredAuthBase,
  type ProviderConfig,
  checkIsConnectedGeneric,
  getValidTokenGeneric,
  getConnectedEmailGeneric,
  readStoredAuthGeneric,
  clearStoredAuthGeneric,
  runAuthCodeFlow,
} from './oauthPkce';

export const GOOGLE_CLIENT_ID = '49189092238-uf3oopq0q7ohvuntjd3j4dvtbljjsmtn.apps.googleusercontent.com';

const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';

// Google's "Web application" client type requires client_secret at token
// exchange even when using PKCE — a secret can't live in extension code, so
// the exchange is proxied through the same Cloudflare Worker that already
// guards the Unsplash/NASA keys. See worker/api-proxy.ts's /google-token route.
const MEDIA_PROXY_URL = (import.meta.env.APP_MEDIA_PROXY_URL || '').replace(/\/$/, '');

export type StoredAuth = StoredAuthBase;

// calendar.readonly and tasks.readonly are both verified by Google now —
// tasks.readonly was previously gated behind Developer Options while its
// sensitive-scope verification was pending (see git history for that gate),
// to avoid showing regular users an "unverified app" warning and burning
// this project's limited unapproved-scope user slots. Now approved, so it's
// unconditional like calendar.readonly.
const APPROVED_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/tasks.readonly',
  'openid',
  'email',
];

const CONFIG: ProviderConfig = {
  storageKey: 'sg_google_auth',
  authEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: `${MEDIA_PROXY_URL}/google-token`,
  clientId: GOOGLE_CLIENT_ID,
  scopes: APPROVED_SCOPES,
  // access_type=offline + prompt=consent are required for Google to issue a
  // refresh_token — without prompt=consent, a returning user who already
  // granted access won't get one on subsequent logins.
  extraAuthParams: { access_type: 'offline', prompt: 'consent' },
  includeScopeInRefresh: false,
};

/**
 * Returns true if a (possibly expired) token is stored — i.e. the user has
 * previously authenticated and has not explicitly disconnected.
 */
export async function checkIsConnected(): Promise<boolean> {
  return checkIsConnectedGeneric(CONFIG);
}

/**
 * Returns a valid access token, silently refreshing if expired.
 * Returns null if the user has never authenticated or if the refresh token
 * has been revoked (they must call connectGoogle() again).
 */
export async function getValidToken(): Promise<string | null> {
  return getValidTokenGeneric<StoredAuth>(CONFIG);
}

/**
 * Returns the email address from stored auth, if available.
 */
export async function getConnectedEmail(): Promise<string | undefined> {
  return getConnectedEmailGeneric(CONFIG);
}

/**
 * Launches the Google OAuth2 authorization code + PKCE flow in a popup window.
 * Stores the resulting tokens and returns the access token.
 * Throws if the user cancels or if any step fails.
 */
export async function connectGoogle(): Promise<string> {
  return runAuthCodeFlow<StoredAuth>({ ...CONFIG, scopes: APPROVED_SCOPES }, 'Google');
}

/**
 * Revokes the access token at Google, then clears local storage.
 */
export async function disconnectGoogle(): Promise<void> {
  const stored = await readStoredAuthGeneric<StoredAuth>(CONFIG);
  if (stored) {
    // Best-effort revoke; don't throw if it fails (e.g. already revoked).
    // Google's /revoke endpoint requires POST with the token in the body —
    // a GET with it as a query param 404s instead of revoking anything.
    fetch(REVOKE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: stored.accessToken }),
    }).catch(() => {});
  }
  await clearStoredAuthGeneric(CONFIG);
}
