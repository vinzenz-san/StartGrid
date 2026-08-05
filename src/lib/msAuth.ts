// ── Developer setup ───────────────────────────────────────────────────────────
//
// Before this extension can authenticate with Microsoft, you must:
//
// 1. Go to https://portal.azure.com/ → "App registrations" → "New registration".
// 2. Supported account types: "Accounts in any organizational directory and
//    personal Microsoft accounts" (multi-tenant + personal — matches Google's
//    setup, where any user can connect regardless of tenant).
// 3. Platform: "Web" (same reasoning as Google — see googleAuth.ts — this lets
//    the Cloudflare Worker complete the exchange the same way for both).
// 4. Load the extension in Firefox (about:debugging → Load Temporary Add-on).
// 5. In the Browser Console run:
//      chrome.identity.getRedirectURL()   // or browser.identity.getRedirectURL()
//    Copy the URL it returns (e.g. "https://abc123.extensions.allizom.org/").
// 6. Add that exact URL as a Redirect URI under the "Web" platform.
// 7. "Certificates & secrets" → New client secret → set it on the Worker via
//    `wrangler secret put MS_CLIENT_SECRET` (see worker/api-proxy.ts).
// 8. "API permissions" → Add a permission → Microsoft Graph → Delegated →
//    add Mail.Read, Calendars.Read, offline_access, openid, email. Both scopes
//    have AdminConsentRequired = No, so no tenant-admin approval step is needed.
// 9. Paste your Application (client) ID below (it is a public identifier, not
//    a secret).
//
// ─────────────────────────────────────────────────────────────────────────────

import {
  type StoredAuthBase,
  type ProviderConfig,
  checkIsConnectedGeneric,
  getValidTokenGeneric,
  getConnectedEmailGeneric,
  clearStoredAuthGeneric,
  runAuthCodeFlow,
} from './oauthPkce';

export const MS_CLIENT_ID = 'b6521395-1259-4a0a-9168-e0ab8698b62a';

// Microsoft's public-client PKCE flow doesn't strictly require a client
// secret, but the exchange is routed through the same Cloudflare Worker as
// Google's for consistency — one place to rotate/revoke credentials without
// touching extension code. See worker/api-proxy.ts's /ms-token route.
const MEDIA_PROXY_URL = ((import.meta as any).env.APP_MEDIA_PROXY_URL || '').replace(/\/$/, '');

export type StoredMsAuth = StoredAuthBase;

const CONFIG: ProviderConfig = {
  storageKey: 'sg_ms_auth',
  authEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  tokenEndpoint: `${MEDIA_PROXY_URL}/ms-token`,
  clientId: MS_CLIENT_ID,
  // Read-only — the extension cannot modify any user data. Both Mail.Read
  // and Calendars.Read have AdminConsentRequired = No. offline_access is
  // required for a refresh_token to be issued.
  scopes: [
    'https://graph.microsoft.com/Mail.Read',
    'https://graph.microsoft.com/Calendars.Read',
    'offline_access',
    'openid',
    'email',
  ],
  extraAuthParams: { response_mode: 'query', prompt: 'select_account' },
  // MS's refresh_token and authorization_code exchanges both send `scope`;
  // Google's don't.
  includeScopeInRefresh: true,
  // Personal Microsoft accounts sometimes populate `preferred_username`
  // instead of `email` in the id_token.
  emailFallbackClaim: 'preferred_username',
};

/**
 * Returns true if a (possibly expired) token is stored — i.e. the user has
 * previously authenticated and has not explicitly disconnected.
 */
export async function checkIsMsConnected(): Promise<boolean> {
  return checkIsConnectedGeneric(CONFIG);
}

/**
 * Returns a valid access token, silently refreshing if expired.
 * Returns null if the user has never authenticated or if the refresh token
 * has been revoked (they must call connectMicrosoft() again).
 */
export async function getValidMsToken(): Promise<string | null> {
  return getValidTokenGeneric<StoredMsAuth>(CONFIG);
}

/**
 * Returns the email address from stored auth, if available.
 */
export async function getConnectedMsEmail(): Promise<string | undefined> {
  return getConnectedEmailGeneric(CONFIG);
}

/**
 * Launches the Microsoft identity platform authorization code + PKCE flow
 * in a popup window. Stores the resulting tokens and returns the access
 * token. Throws if the user cancels or if any step fails.
 */
export async function connectMicrosoft(): Promise<string> {
  return runAuthCodeFlow<StoredMsAuth>(CONFIG, 'Microsoft');
}

/**
 * Clears local storage. Microsoft's identity platform has no equivalent of
 * Google's /revoke endpoint for individual apps — sign-out is client-side
 * only; the user can revoke app access from account.microsoft.com if desired.
 */
export async function disconnectMicrosoft(): Promise<void> {
  await clearStoredAuthGeneric(CONFIG);
}
