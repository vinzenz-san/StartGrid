// ── Developer setup ───────────────────────────────────────────────────────────
//
// Before this extension can authenticate with Google, you must:
//
// 1. Go to https://console.cloud.google.com/ and create a project.
// 2. Enable the Gmail API and Google Calendar API in "APIs & Services".
// 3. Create OAuth 2.0 credentials: "Web application" type.
// 4. Load the extension in Firefox (about:debugging → Load Temporary Add-on).
// 5. In the Browser Console run:
//      chrome.identity.getRedirectURL()   // or browser.identity.getRedirectURL()
//    Copy the URL it returns (e.g. "https://abc123.extensions.allizom.org/").
// 6. Add that exact URL as an Authorized Redirect URI in your GCP OAuth client.
// 7. Paste your Client ID below (it is a public identifier, not a secret).
//
// ─────────────────────────────────────────────────────────────────────────────

export const GOOGLE_CLIENT_ID = '11878324251-rs30jg690odsp9ie707ji328hiv6t3r0.apps.googleusercontent.com';

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY    = 'sg_google_auth';
const AUTH_ENDPOINT  = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';

// Request the minimum scopes needed for both widgets.
// These are read-only — the extension cannot modify any user data.
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'openid',     // gives us id_token so we can show the user's email
  'email',
];

// ── Stored shape ──────────────────────────────────────────────────────────────

export interface StoredAuth {
  accessToken: string;
  refreshToken?: string;  // absent when using implicit flow (Web Application client type)
  expiresAt: number;      // ms since epoch; we subtract 60 s for clock-skew safety
  email?: string;         // decoded from id_token for display only
}

// ── PKCE helpers (Web Crypto — always available in extension pages) ────────────

function base64urlEncode(buf: Uint8Array): string {
  // btoa works on binary strings; replace chars that are URL-unsafe
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
// We trust Google's HTTPS delivery here; this is display-only.
function extractEmailFromIdToken(idToken: string): string | undefined {
  try {
    const payload = idToken.split('.')[1];
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.email === 'string' ? json.email : undefined;
  } catch {
    return undefined;
  }
}

// ── Storage helpers ───────────────────────────────────────────────────────────

async function getBrowser() {
  const { default: browser } = await import('webextension-polyfill');
  return browser;
}

async function readStoredAuth(): Promise<StoredAuth | null> {
  const browser = await getBrowser();
  const result  = await browser.storage.local.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as StoredAuth) ?? null;
}

async function writeStoredAuth(auth: StoredAuth): Promise<void> {
  const browser = await getBrowser();
  await browser.storage.local.set({ [STORAGE_KEY]: auth });
}

async function clearStoredAuth(): Promise<void> {
  const browser = await getBrowser();
  await browser.storage.local.remove(STORAGE_KEY);
}

// ── Token refresh ─────────────────────────────────────────────────────────────

async function refreshAccessToken(stored: StoredAuth): Promise<StoredAuth | null> {
  if (!stored.refreshToken) {
    // Implicit flow — no refresh token issued. Clear storage so the widget
    // shows the "Connect" prompt and the user can re-authenticate.
    await clearStoredAuth();
    return null;
  }

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: stored.refreshToken,
      client_id:     GOOGLE_CLIENT_ID,
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

  const updated: StoredAuth = {
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
export async function checkIsConnected(): Promise<boolean> {
  const stored = await readStoredAuth();
  return stored !== null;
}

/**
 * Returns a valid access token, silently refreshing if expired.
 * Returns null if the user has never authenticated or if the refresh token
 * has been revoked (they must call connectGoogle() again).
 */
export async function getValidToken(): Promise<string | null> {
  const stored = await readStoredAuth();
  if (!stored) return null;

  if (Date.now() < stored.expiresAt) return stored.accessToken;

  const refreshed = await refreshAccessToken(stored);
  return refreshed?.accessToken ?? null;
}

/**
 * Returns the email address from stored auth, if available.
 */
export async function getConnectedEmail(): Promise<string | undefined> {
  const stored = await readStoredAuth();
  return stored?.email;
}

/**
 * Launches the Google OAuth2 authorization code + PKCE flow in a popup window.
 * Stores the resulting tokens and returns the access token.
 * Throws if the user cancels or if any step fails.
 */
export async function connectGoogle(): Promise<string> {
  const browser     = await getBrowser();
  const redirectUrl = browser.identity.getRedirectURL();
  // CSRF state — verified after redirect
  const state = base64urlEncode(crypto.getRandomValues(new Uint8Array(16)));

  // Implicit flow: response_type=token returns the access token directly in the
  // redirect fragment. No token exchange step, no client_secret required.
  // This is compatible with "Web application" OAuth clients in Google Cloud Console.
  // Downside: no refresh_token — the user must re-authenticate when the token
  // expires (~1 hour). To get a refresh_token, recreate the GCP client as
  // "Desktop app" type and switch back to the PKCE authorization_code flow.
  const authUrl = new URL(AUTH_ENDPOINT);
  authUrl.searchParams.set('client_id',     GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri',  redirectUrl);
  authUrl.searchParams.set('response_type', 'token');
  authUrl.searchParams.set('scope',         SCOPES.join(' '));
  authUrl.searchParams.set('state',         state);

  const responseUrl = await browser.identity.launchWebAuthFlow({
    url:         authUrl.toString(),
    interactive: true,
  });

  // Token arrives in the URL fragment: #access_token=...&expires_in=3600&...
  const fragment      = new URLSearchParams(new URL(responseUrl).hash.slice(1));
  const accessToken   = fragment.get('access_token');
  const returnedState = fragment.get('state');
  const error         = fragment.get('error');

  if (error)                   throw new Error(`Google auth error: ${error}`);
  if (!accessToken)            throw new Error('No access token in redirect response');
  if (returnedState !== state) throw new Error('OAuth state mismatch — possible CSRF attack');

  const expiresIn = Number(fragment.get('expires_in') ?? 3600);

  const auth: StoredAuth = {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000 - 60_000,
    // No refresh_token with implicit flow
  };

  await writeStoredAuth(auth);
  return accessToken;
}

/**
 * Revokes the access token at Google, then clears local storage.
 */
export async function disconnectGoogle(): Promise<void> {
  const stored = await readStoredAuth();
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
  await clearStoredAuth();
}
