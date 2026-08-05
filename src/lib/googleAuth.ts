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
import { storage } from './storage';

export const GOOGLE_CLIENT_ID = '49189092238-uf3oopq0q7ohvuntjd3j4dvtbljjsmtn.apps.googleusercontent.com';

const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';

// Google's "Web application" client type requires client_secret at token
// exchange even when using PKCE — a secret can't live in extension code, so
// the exchange is proxied through the same Cloudflare Worker that already
// guards the Unsplash/NASA keys. See worker/api-proxy.ts's /google-token route.
const MEDIA_PROXY_URL = (import.meta.env.APP_MEDIA_PROXY_URL || '').replace(/\/$/, '');

export type StoredAuth = StoredAuthBase;

// Approved scopes only — calendar.readonly is verified, openid/email are
// non-sensitive. This is what every regular (non-dev) user's Connect request
// sends, unchanged, so existing Calendar users are never affected by the
// pending Tasks verification below.
const APPROVED_SCOPES = ['https://www.googleapis.com/auth/calendar.readonly', 'openid', 'email'];

// tasks.readonly is submitted for Google's sensitive-scope verification but
// not yet approved. Bundling it into the shared scope list unconditionally
// would make EVERY Connect click — including plain Calendar connects, since
// both widgets share this one OAuth client/request — show Google's
// "unverified app" warning and burn one of this project's 100 lifetime
// unapproved-scope user slots (a hard cap that can never be reset). Gated
// behind Developer Options so only opted-in testers (already added as test
// users in the Cloud Console) can trigger it, exactly how the Calendar scope
// itself was gated before its own verification went through. Remove this
// gate once tasks.readonly shows as verified in the Cloud Console.
const TASKS_SCOPE = 'https://www.googleapis.com/auth/tasks.readonly';

async function developerOptionsEnabled(): Promise<boolean> {
  const settings = await storage.get('sg:settings') as { developerOptionsEnabled?: boolean } | undefined;
  return settings?.developerOptionsEnabled === true;
}

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
  const devEnabled = await developerOptionsEnabled();
  const scopes = devEnabled ? [...APPROVED_SCOPES, TASKS_SCOPE] : APPROVED_SCOPES;
  return runAuthCodeFlow<StoredAuth>({ ...CONFIG, scopes }, 'Google');
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
