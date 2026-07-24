// ── Generic calendar event shape, shared by Calendar (Google) and
// OutlookCalendar (Microsoft Graph, mapped to match) — see CalendarCore.tsx.

export interface CalendarEventDateTime {
  dateTime?: string;  // ISO-8601, e.g. "2025-07-14T10:00:00+02:00"
  date?: string;      // YYYY-MM-DD for all-day events
  timeZone?: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: CalendarEventDateTime;
  end: CalendarEventDateTime;
  colorId?: string;
  location?: string;
  description?: string;
  htmlLink: string;
}

export type CalendarViewStatus = 'idle' | 'loading' | 'success' | 'error' | 'unauthenticated';
