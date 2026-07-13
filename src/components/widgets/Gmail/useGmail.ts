import { useState, useCallback, useRef } from 'react';
import type { GmailState, GmailMessage } from './gmail.types';
import { getValidToken } from '../../../lib/googleAuth';

// ── Real Gmail API fetch ───────────────────────────────────────────────────────
// Calls:
//   1. GET /gmail/v1/users/me/messages?labelIds=INBOX&maxResults=N
//      → list of { id, threadId }
//   2. GET /gmail/v1/users/me/messages/{id}?format=metadata&metadataHeaders=...
//      → headers (From, Subject, Date) + snippet + labelIds
// Both requests use metadata format only — no message body is ever downloaded.

const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

interface RawMessageRef { id: string; threadId: string; }

interface RawMessage {
  id: string;
  threadId: string;
  snippet: string;
  labelIds: string[];
  payload: {
    headers: { name: string; value: string }[];
  };
}

function headerValue(headers: { name: string; value: string }[], name: string): string {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
}

function parseDate(raw: string): string {
  // RFC-2822 mail date → ISO-8601 for consistent downstream formatting
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

async function fetchGmailEmails(token: string, maxResults: number): Promise<GmailMessage[]> {
  const authHeader = { Authorization: `Bearer ${token}` };

  // Step 1: list message IDs
  const listUrl = new URL(`${GMAIL_BASE}/messages`);
  listUrl.searchParams.set('labelIds',   'INBOX');
  listUrl.searchParams.set('maxResults', String(maxResults));

  const listRes = await fetch(listUrl.toString(), { headers: authHeader });
  if (listRes.status === 401) throw new Error('UNAUTHORIZED');
  if (!listRes.ok) throw new Error(`Gmail list failed: ${listRes.status}`);

  const listData = await listRes.json() as { messages?: RawMessageRef[] };
  const refs = listData.messages ?? [];
  if (refs.length === 0) return [];

  // Step 2: fetch metadata for each message in parallel
  const messages = await Promise.all(
    refs.map(async ({ id }) => {
      const url = new URL(`${GMAIL_BASE}/messages/${id}`);
      url.searchParams.set('format', 'metadata');
      // Only pull the headers we actually need — minimises response size
      for (const h of ['From', 'Subject', 'Date']) {
        url.searchParams.append('metadataHeaders', h);
      }
      const res = await fetch(url.toString(), { headers: authHeader });
      if (!res.ok) throw new Error(`Gmail get ${id} failed: ${res.status}`);
      return res.json() as Promise<RawMessage>;
    }),
  );

  return messages.map(m => ({
    id:       m.id,
    threadId: m.threadId,
    from:     headerValue(m.payload.headers, 'From'),
    subject:  headerValue(m.payload.headers, 'Subject') || '(no subject)',
    snippet:  m.snippet,
    date:     parseDate(headerValue(m.payload.headers, 'Date')),
    isUnread: m.labelIds.includes('UNREAD'),
  }));
}

// ── Mock data — used in dev mode when extension APIs are unavailable ───────────
// Keep this here so the widget renders something useful during local development.

const MOCK_EMAILS: GmailMessage[] = [
  {
    id: 'msg_001', threadId: 'thr_001',
    from: 'GitHub <noreply@github.com>',
    subject: '[StartGrid] PR #42 approved by @teammate',
    snippet: 'Your pull request "feat: Gmail widget M8" has been approved and is ready to merge.',
    date: new Date(Date.now() - 1000 * 60 * 8).toISOString(), isUnread: true,
  },
  {
    id: 'msg_002', threadId: 'thr_002',
    from: 'Vercel <noreply@vercel.com>',
    subject: 'Deployment successful: startgrid.app',
    snippet: 'Your latest deployment to production is live.',
    date: new Date(Date.now() - 1000 * 60 * 34).toISOString(), isUnread: true,
  },
  {
    id: 'msg_003', threadId: 'thr_003',
    from: 'Anna Schmidt <anna@example.com>',
    subject: 'Re: Design review for Q3',
    snippet: 'Looks great overall! I left a few comments on the Figma file.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), isUnread: true,
  },
  {
    id: 'msg_004', threadId: 'thr_004',
    from: 'Linear <notifications@linear.app>',
    subject: 'SG-88 moved to In Progress',
    snippet: 'Vinzenz moved "Gmail widget skeleton states" to In Progress.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), isUnread: false,
  },
  {
    id: 'msg_005', threadId: 'thr_005',
    from: 'Mozilla Developer <developer@mozilla.org>',
    subject: 'Firefox 127 release notes — new extension APIs',
    snippet: 'Firefox 127 ships with improvements to the browser.action API.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(), isUnread: false,
  },
];

async function fetchMockEmails(): Promise<GmailMessage[]> {
  await new Promise(r => setTimeout(r, 750));
  return MOCK_EMAILS;
}

const isExtension = typeof chrome !== 'undefined' && !!chrome.storage;

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useGmail() {
  const [state, setState] = useState<GmailState>({
    status: 'idle',
    emails: [],
    unreadCount: 0,
    error: null,
    lastRefreshed: null,
  });

  const fetchingRef = useRef(false);

  const refresh = useCallback(async (maxResults = 10) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setState(s => ({ ...s, status: 'loading', error: null }));

    try {
      let emails: GmailMessage[];

      if (!isExtension) {
        // Dev server — show mock data so the widget is always previewable
        emails = await fetchMockEmails();
      } else {
        const token = await getValidToken();
        if (!token) {
          setState(s => ({ ...s, status: 'unauthenticated', error: null }));
          return;
        }
        try {
          emails = await fetchGmailEmails(token, maxResults);
        } catch (err) {
          if (err instanceof Error && err.message === 'UNAUTHORIZED') {
            // Token was valid in storage but Google rejected it (e.g. revoked)
            setState(s => ({ ...s, status: 'unauthenticated', error: null }));
            return;
          }
          throw err;
        }
      }

      setState({
        status: 'success',
        emails,
        unreadCount: emails.filter(e => e.isUnread).length,
        error: null,
        lastRefreshed: new Date(),
      });
    } catch (err) {
      setState(s => ({
        ...s,
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to load emails',
      }));
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  return { ...state, refresh };
}
