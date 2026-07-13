// ── Persistent widget data (stored in browser.storage.sync) ──────────────────

export interface GmailData {
  maxEmails: number;       // 3–10, default 5
  showSnippets: boolean;   // show preview text under subject
}

// ── API-mirroring types (matches Gmail REST API message resource) ─────────────
// When wiring to the real API, GmailMessage maps 1:1 to a processed
// messages.list + messages.get response with labelIds: ['UNREAD', 'INBOX'].

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;        // "Display Name <email@example.com>" or just email
  subject: string;
  snippet: string;     // plain-text preview, 100 chars max from API
  date: string;        // ISO-8601 timestamp
  isUnread: boolean;
}

// ── Hook state ────────────────────────────────────────────────────────────────

export type GmailStatus = 'idle' | 'loading' | 'success' | 'error' | 'unauthenticated';

export interface GmailState {
  status: GmailStatus;
  emails: GmailMessage[];
  unreadCount: number;
  error: string | null;
  lastRefreshed: Date | null;
}
