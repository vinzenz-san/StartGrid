import { useState, useCallback, useRef } from 'react';
import type { CalendarState, CalendarEvent } from './calendar.types';
import { getValidToken } from '../../../lib/googleAuth';

// ── Real Google Calendar API fetch ────────────────────────────────────────────
// Calls:
//   GET https://www.googleapis.com/calendar/v3/calendars/primary/events
//     ?timeMin=<now>&singleEvents=true&orderBy=startTime&maxResults=N
//
// singleEvents=true expands recurring events into individual instances, which
// is what the user expects to see. The response items map directly to our
// CalendarEvent type — no transformation of the start/end shape is needed.

const CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3';

interface RawEventList {
  items?: CalendarEvent[];
  error?: { code: number; message: string };
}

async function fetchCalendarEvents(token: string, maxResults: number): Promise<CalendarEvent[]> {
  const url = new URL(`${CALENDAR_BASE}/calendars/primary/events`);
  url.searchParams.set('timeMin',       new Date().toISOString());
  url.searchParams.set('singleEvents',  'true');
  url.searchParams.set('orderBy',       'startTime');
  url.searchParams.set('maxResults',    String(maxResults));
  // Only pull fields the widget actually uses — reduces payload size
  url.searchParams.set('fields',
    'items(id,summary,start,end,colorId,location,htmlLink)');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) throw new Error('UNAUTHORIZED');
  if (!res.ok) throw new Error(`Calendar fetch failed: ${res.status}`);

  const data = await res.json() as RawEventList;
  if (data.error) throw new Error(data.error.message);
  return data.items ?? [];
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

const BASE_LINK = 'https://calendar.google.com/calendar/r/eventedit';

const MOCK_EVENTS: CalendarEvent[] = [
  { id: 'evt_001', summary: 'Morning standup',
    start: { dateTime: daysFromNow(0, 9, 30) }, end: { dateTime: daysFromNow(0, 9, 45) },
    colorId: '7', htmlLink: BASE_LINK },
  { id: 'evt_002', summary: 'M8 code review — Gmail & Calendar widgets',
    start: { dateTime: daysFromNow(0, 11, 0) }, end: { dateTime: daysFromNow(0, 12, 0) },
    colorId: '9', htmlLink: BASE_LINK },
  { id: 'evt_003', summary: 'Lunch with Anna',
    start: { dateTime: daysFromNow(0, 12, 30) }, end: { dateTime: daysFromNow(0, 13, 30) },
    colorId: '2', location: 'Café Central, Berlin', htmlLink: BASE_LINK },
  { id: 'evt_004', summary: 'Public holiday — no meetings',
    start: { date: allDayDate(0) }, end: { date: allDayDate(1) },
    colorId: '5', htmlLink: BASE_LINK },
  { id: 'evt_005', summary: 'Design sync: Q3 onboarding flow',
    start: { dateTime: daysFromNow(1, 10, 0) }, end: { dateTime: daysFromNow(1, 11, 0) },
    colorId: '3', htmlLink: BASE_LINK },
  { id: 'evt_006', summary: 'Dentist appointment',
    start: { dateTime: daysFromNow(1, 14, 30) }, end: { dateTime: daysFromNow(1, 15, 30) },
    colorId: '4', htmlLink: BASE_LINK },
  { id: 'evt_007', summary: 'Sprint planning',
    start: { dateTime: daysFromNow(2, 9, 0) }, end: { dateTime: daysFromNow(2, 10, 30) },
    colorId: '9', htmlLink: BASE_LINK },
  { id: 'evt_008', summary: 'Team off-site',
    start: { date: allDayDate(2) }, end: { date: allDayDate(4) },
    colorId: '6', htmlLink: BASE_LINK },
];

async function fetchMockEvents(): Promise<CalendarEvent[]> {
  await new Promise(r => setTimeout(r, 650));
  return MOCK_EVENTS;
}

const isExtension = typeof chrome !== 'undefined' && !!chrome.storage;

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCalendar() {
  const [state, setState] = useState<CalendarState>({
    status: 'idle',
    events: [],
    error: null,
    lastRefreshed: null,
  });

  const fetchingRef = useRef(false);

  const refresh = useCallback(async (maxResults = 25) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setState(s => ({ ...s, status: 'loading', error: null }));

    try {
      let events: CalendarEvent[];

      if (!isExtension) {
        events = await fetchMockEvents();
      } else {
        const token = await getValidToken();
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
