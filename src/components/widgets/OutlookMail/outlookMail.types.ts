// ── Persistent widget data (stored in browser.storage.sync) ──────────────────

export interface OutlookMailData {
  maxResults: number;       // 1–25, default 8
  showUnreadOnly?: boolean; // default false
}

// ── API-mirroring types ─────────────────────────────────────────────────────
// Mirrors the shape returned (after field selection) by Microsoft Graph's
//   GET https://graph.microsoft.com/v1.0/me/messages
//     ?$select=subject,from,receivedDateTime,isRead,bodyPreview,webLink
//     &$orderby=receivedDateTime desc

export interface MailMessage {
  id: string;
  subject: string;
  fromName: string;
  fromAddress: string;
  receivedDateTime: string; // ISO-8601
  isRead: boolean;
  bodyPreview: string;
  webLink: string;
}

// ── Hook state ────────────────────────────────────────────────────────────────

export type OutlookMailStatus = 'idle' | 'loading' | 'success' | 'error' | 'unauthenticated';

export interface OutlookMailState {
  status: OutlookMailStatus;
  messages: MailMessage[];
  error: string | null;
  lastRefreshed: Date | null;
}
