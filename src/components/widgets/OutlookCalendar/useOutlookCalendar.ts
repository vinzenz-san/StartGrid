import { useState, useCallback, useRef } from 'react';
import type { OutlookCalendarState, OutlookEvent } from './outlookCalendar.types';
import { getValidMsToken } from '../../../lib/msAuth';

// ── Real Microsoft Graph fetch ────────────────────────────────────────────────
// Calls:
//   GET https://graph.microsoft.com/v1.0/me/calendarView
//     ?startDateTime=<now>&endDateTime=<now+30d>&$orderby=start/dateTime
//
// calendarView (rather than /events) already expands recurring events into
// individual instances within the window — the Graph equivalent of Google's
// singleEvents=true. The response is mapped into the same shape the Google
// Calendar widget's UI expects (see outlookCalendar.types.ts).

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

interface RawGraphEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  isAllDay: boolean;
  location?: { displayName?: string };
  bodyPreview?: string;
  webLink: string;
  categories?: string[];
}

interface RawEventList {
  value?: RawGraphEvent[];
  error?: { code: string; message: string };
}

function mapGraphEvent(raw: RawGraphEvent): OutlookEvent {
  return {
    id: raw.id,
    summary: raw.subject || '(No subject)',
    start: raw.isAllDay ? { date: raw.start.dateTime.slice(0, 10) } : { dateTime: raw.start.dateTime, timeZone: raw.start.timeZone },
    end:   raw.isAllDay ? { date: raw.end.dateTime.slice(0, 10) }   : { dateTime: raw.end.dateTime,   timeZone: raw.end.timeZone },
    colorId: raw.categories?.[0],
    location: raw.location?.displayName || undefined,
    description: raw.bodyPreview || undefined,
    htmlLink: raw.webLink,
  };
}

async function fetchCalendarEvents(token: string, maxResults: number): Promise<OutlookEvent[]> {
  const now = new Date();
  const cutoff = new Date(now.getTime() + 30 * 86_400_000); // 30-day window, trimmed client-side by maxDays

  const url = new URL(`${GRAPH_BASE}/me/calendarView`);
  url.searchParams.set('startDateTime', now.toISOString());
  url.searchParams.set('endDateTime', cutoff.toISOString());
  url.searchParams.set('$orderby', 'start/dateTime');
  url.searchParams.set('$top', String(maxResults));
  url.searchParams.set('$select', 'subject,start,end,isAllDay,location,bodyPreview,webLink,categories');

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Prefer: 'outlook.timezone="UTC"',
    },
  });

  if (res.status === 401) throw new Error('UNAUTHORIZED');
  if (!res.ok) throw new Error(`Calendar fetch failed: ${res.status}`);

  const data = await res.json() as RawEventList;
  if (data.error) throw new Error(data.error.message);
  return (data.value ?? []).map(mapGraphEvent);
}

// ── Mock data — used in dev mode when extension APIs are unavailable ───────────

function daysFromNow(days: number, hours = 0, minutes = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

function allDayDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

const BASE_LINK = 'https://outlook.office.com/calendar/item';

const MOCK_EVENTS: OutlookEvent[] = [
  { id: 'oevt_001', summary: 'Weekly sync',
    start: { dateTime: daysFromNow(0, 9, 0) }, end: { dateTime: daysFromNow(0, 9, 30) },
    colorId: 'Blue category', htmlLink: BASE_LINK },
  { id: 'oevt_002', summary: 'Client call — StartGrid rollout',
    start: { dateTime: daysFromNow(0, 13, 0) }, end: { dateTime: daysFromNow(0, 14, 0) },
    colorId: 'Green category', htmlLink: BASE_LINK },
  { id: 'oevt_003', summary: 'Out of office',
    start: { date: allDayDate(1) }, end: { date: allDayDate(2) },
    colorId: 'Orange category', htmlLink: BASE_LINK },
  { id: 'oevt_004', summary: '1:1 with manager',
    start: { dateTime: daysFromNow(2, 10, 30) }, end: { dateTime: daysFromNow(2, 11, 0) },
    colorId: 'Purple category', location: 'Teams', htmlLink: BASE_LINK },
];

async function fetchMockEvents(): Promise<OutlookEvent[]> {
  await new Promise(r => setTimeout(r, 650));
  return MOCK_EVENTS;
}

const isExtension = typeof chrome !== 'undefined' && !!chrome.storage;

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useOutlookCalendar() {
  const [state, setState] = useState<OutlookCalendarState>({
    status: 'idle',
    events: [],
    error: null,
    lastRefreshed: null,
  });

  const fetchingRef = useRef(false);

  const refresh = useCallback(async (maxResults = 50) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setState(s => ({ ...s, status: 'loading', error: null }));

    try {
      let events: OutlookEvent[];

      if (!isExtension) {
        events = await fetchMockEvents();
      } else {
        const token = await getValidMsToken();
        if (!token) {
          setState(s => ({ ...s, status: 'unauthenticated', error: null }));
          return;
        }
        try {
          events = await fetchCalendarEvents(token, maxResults);
        } catch (err) {
          if (err instanceof Error && err.message === 'UNAUTHORIZED') {
            setState(s => ({ ...s, status: 'unauthenticated', error: null }));
            return;
          }
          throw err;
        }
      }

      setState({
        status: 'success',
        events,
        error: null,
        lastRefreshed: new Date(),
      });
    } catch (err) {
      setState(s => ({
        ...s,
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to load calendar',
      }));
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  return { ...state, refresh };
}
