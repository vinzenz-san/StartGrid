// Shared data layer for Calendar (Google) and OutlookCalendar (Microsoft
// Graph) — the fetch/list/refresh state machine is identical between the two
// providers; only the actual HTTP calls (query params, response shapes,
// error formats) differ enough to stay provider-local. See useCalendar.ts /
// useOutlookCalendar.ts for those.

import { useState, useCallback, useRef, useEffect } from 'react';
import type { CalendarEvent, CalendarViewStatus } from './calendarEvent.types';

export interface ProviderCalendarState {
  status: CalendarViewStatus;
  events: CalendarEvent[];
  error: string | null;
  lastRefreshed: Date | null;
}

export interface CalendarProviderConfig<TListEntry> {
  defaultCalendarId: string; // 'primary' (Google) / 'default' (Outlook)
  getValidToken: () => Promise<string | null>;
  fetchCalendarEvents: (
    token: string,
    maxResults: number,
    calendarId: string,
    calendarColor?: string,
  ) => Promise<CalendarEvent[]>;
  fetchCalendarList: (token: string) => Promise<TListEntry[]>;
  colorForCalendarId: (id: string, list: TListEntry[]) => string | undefined;
  mockEvents: () => Promise<CalendarEvent[]>;
}

export const isExtension = typeof chrome !== 'undefined' && !!chrome.storage;

export function useProviderCalendar<TListEntry>(config: CalendarProviderConfig<TListEntry>) {
  const [state, setState] = useState<ProviderCalendarState>({
    status: 'idle',
    events: [],
    error: null,
    lastRefreshed: null,
  });

  const fetchingRef = useRef(false);

  const refresh = useCallback(async (maxResults = 50, calendarIds: string[] = [config.defaultCalendarId]) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setState(s => ({ ...s, status: 'loading', error: null }));

    try {
      let events: CalendarEvent[];

      if (!isExtension) {
        events = await config.mockEvents();
      } else {
        const token = await config.getValidToken();
        if (!token) {
          setState(s => ({ ...s, status: 'unauthenticated', error: null }));
          return;
        }
        try {
          const list = await config.fetchCalendarList(token);
          const perCalendar = await Promise.all(
            calendarIds.map(id =>
              config.fetchCalendarEvents(token, maxResults, id, config.colorForCalendarId(id, list)),
            ),
          );
          events = perCalendar.flat().sort((a, b) =>
            (a.start.date ?? a.start.dateTime ?? '').localeCompare(b.start.date ?? b.start.dateTime ?? ''));
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
    // `config` is a fresh object literal each render (from the thin wrapper
    // hooks), but every field on it is a stable module-scope function or
    // constant — same as the provider-specific originals this replaces,
    // which used an empty dependency array for the same reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...state, refresh, isMock: !isExtension };
}

export interface ProviderCalendarListState<TListEntry> {
  calendars: TListEntry[];
  loading: boolean;
  error: string | null;
}

export function useProviderCalendarList<TListEntry>(
  config: Pick<CalendarProviderConfig<TListEntry>, 'getValidToken' | 'fetchCalendarList'>,
  enabled: boolean,
) {
  const [state, setState] = useState<ProviderCalendarListState<TListEntry>>({
    calendars: [], loading: false, error: null,
  });

  const load = useCallback(async () => {
    if (!isExtension) return;
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const token = await config.getValidToken();
      if (!token) { setState({ calendars: [], loading: false, error: null }); return; }
      const calendars = await config.fetchCalendarList(token);
      setState({ calendars, loading: false, error: null });
    } catch (err) {
      setState({ calendars: [], loading: false, error: err instanceof Error ? err.message : 'Failed to load calendars' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  return state;
}
