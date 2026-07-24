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

export const MS_CLIENT_ID = 'b6521395-1259-4a0a-9168-e0ab8698b62a';

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY    = 'sg_ms_auth';
const AUTH_ENDPOINT   = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';

// Microsoft's public-client PKCE flow doesn't strictly require a client
// secret, but the exchange is routed through the same Cloudflare Worker as
// Google's for consistency — one place to rotate/revoke credentials without
// touching extension code. See worker/api-proxy.ts's /ms-token route.
const MEDIA_PROXY_URL = ((import.meta as any).env.APP_MEDIA_PROXY_URL || '').replace(/\/$/, '');
const TOKEN_ENDPOINT  = `${MEDIA_PROXY_URL}/ms-token`;

// Request the minimum scopes needed for both widgets.
// These are read-only — the extension cannot modify any user data.
// Both Mail.Read and Calendars.Read have AdminConsentRequired = No.
const SCOPES = [
  'https://graph.microsoft.com/Mail.Read',
  'https://graph.microsoft.com/Calendars.Read',
  'offline_access', // required for a refresh_token to be issued
  'openid',
  'email',
];

// ── Stored shape ──────────────────────────────────────────────────────────────

export interface StoredMsAuth {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;      // ms since epoch; we subtract 60 s for clock-skew safety
  email?: string;         // decoded from id_token for display only
}

// ── PKCE helpers (Web Crypto — always available in extension pages) ────────────

function base64urlEncode(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function generateCodeVerifier(): Promise<string> {
  const raw = new Uint8Array(32);
  crypto.getRandomValues(raw);
  return base64urlEncode(raw);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data   = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64urlEncode(new Uint8Array(digest));
}

// Decode the email claim from a JWT id_token without verifying the signature.
// We trust Microsoft's HTTPS delivery here; this is display-only. Personal
// Microsoft accounts sometimes populate `preferred_username` instead of
// `email`, so fall back to that.
function extractEmailFromIdToken(idToken: string): string | undefined {
  try {
    const payload = idToken.split('.')[1];
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof json.email === 'string') return json.email;
    if (typeof json.preferred_username === 'string') return json.preferred_username;
    return undefined;
  } catch {
    return undefined;
  }
}

// ── Storage helpers ───────────────────────────────────────────────────────────

async function getBrowser() {
  const { default: browser } = await import('webextension-polyfill');
  return browser;
}

async function readStoredAuth(): Promise<StoredMsAuth | null> {
  const browser = await getBrowser();
  const result  = await browser.storage.local.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as StoredMsAuth) ?? null;
}

async function writeStoredAuth(auth: StoredMsAuth): Promise<void> {
  const browser = await getBrowser();
  await browser.storage.local.set({ [STORAGE_KEY]: auth });
}

async function clearStoredAuth(): Promise<void> {
  const browser = await getBrowser();
  await browser.storage.local.remove(STORAGE_KEY);
}

// ── Token refresh ─────────────────────────────────────────────────────────────

async function refreshAccessToken(stored: StoredMsAuth): Promise<StoredMsAuth | null> {
  if (!stored.refreshToken) {
    await clearStoredAuth();
    return null;
  }

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: stored.refreshToken,
      client_id:     MS_CLIENT_ID,
      scope:         SCOPES.join(' '),
    }),
  });

  if (!res.ok) {
    await clearStoredAuth();
    return null;
  }

  const data = await res.json() as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  const updated: StoredMsAuth = {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token ?? stored.refreshToken,
    expiresAt:    Date.now() + data.expires_in * 1000 - 60_000,
    email:        stored.email,
  };

  await writeStoredAuth(updated);
  return updated;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns true if a (possibly expired) token is stored — i.e. the user has
 * previously authenticated and has not explicitly disconnected.
 */
export async function checkIsMsConnected(): Promise<boolean> {
  const stored = await readStoredAuth();
  return stored !== null;
}

/**
 * Returns a valid access token, silently refreshing if expired.
 * Returns null if the user has never authenticated or if the refresh token
 * has been revoked (they must call connectMicrosoft() again).
 */
export async function getValidMsToken(): Promise<string | null> {
  const stored = await readStoredAuth();
  if (!stored) return null;

  if (Date.now() < stored.expiresAt) return stored.accessToken;

  const refreshed = await refreshAccessToken(stored);
  return refreshed?.accessToken ?? null;
}

/**
 * Returns the email address from stored auth, if available.
 */
export async function getConnectedMsEmail(): Promise<string | undefined> {
  const stored = await readStoredAuth();
  return stored?.email;
}

/**
 * Launches the Microsoft identity platform authorization code + PKCE flow
 * in a popup window. Stores the resulting tokens and returns the access
 * token. Throws if the user cancels or if any step fails.
 */
export async function connectMicrosoft(): Promise<string> {
  const browser     = await getBrowser();
  const redirectUrl = browser.identity.getRedirectURL();
  // CSRF state — verified after redirect
  const state = base64urlEncode(crypto.getRandomValues(new Uint8Array(16)));

  const codeVerifier  = await generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const authUrl = new URL(AUTH_ENDPOINT);
  authUrl.searchParams.set('client_id',             MS_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri',          redirectUrl);
  authUrl.searchParams.set('response_type',         'code');
  authUrl.searchParams.set('response_mode',         'query');
  authUrl.searchParams.set('scope',                 SCOPES.join(' '));
  authUrl.searchParams.set('state',                 state);
  authUrl.searchParams.set('prompt',                'select_account');
  authUrl.searchParams.set('code_challenge',        codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  const responseUrl = await browser.identity.launchWebAuthFlow({
    url:         authUrl.toString(),
    interactive: true,
  });

  const query         = new URL(responseUrl).searchParams;
  const code          = query.get('code');
  const returnedState = query.get('state');
  const error         = query.get('error');

  if (error)                   throw new Error(`Microsoft auth error: ${error}`);
  if (!code)                   throw new Error('No authorization code in redirect response');
  if (returnedState !== state) throw new Error('OAuth state mismatch — possible CSRF attack');

  const tokenRes = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      client_id:     MS_CLIENT_ID,
      redirect_uri:  redirectUrl,
      code_verifier: codeVerifier,
      scope:         SCOPES.join(' '),
    }),
  });

  if (!tokenRes.ok) {
    throw new Error(`Token exchange failed: ${tokenRes.status} ${await tokenRes.text()}`);
  }

  const data = await tokenRes.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    id_token?: string;
  };

  const auth: StoredMsAuth = {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token,
    expiresAt:    Date.now() + data.expires_in * 1000 - 60_000,
    email:        data.id_token ? extractEmailFromIdToken(data.id_token) : undefined,
  };

  await writeStoredAuth(auth);
  return auth.accessToken;
}

/**
 * Clears local storage. Microsoft's identity platform has no equivalent of
 * Google's /revoke endpoint for individual apps — sign-out is client-side
 * only; the user can revoke app access from account.microsoft.com if desired.
 */
export async function disconnectMicrosoft(): Promise<void> {
  await clearStoredAuth();
}
