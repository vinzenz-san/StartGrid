// ── Persistent widget data (stored in browser.storage.sync) ──────────────────

export interface OutlookCalendarData {
  maxDays: number;      // 1–28, default 3
  showAllDay: boolean;  // include all-day events, default true
}

// ── API-mirroring types ─────────────────────────────────────────────────────
// Mirrors the shape returned by Microsoft Graph's
//   GET https://graph.microsoft.com/v1.0/me/calendarView
//     ?startDateTime=<now>&endDateTime=<cutoff>&$orderby=start/dateTime
// after mapping (see useOutlookCalendar.ts) into a shape structurally
// identical to the Google Calendar widget's CalendarEvent, so the render
// logic in OutlookCalendar.tsx stays a straight copy of Calendar.tsx.

export interface OutlookEventDateTime {
  dateTime?: string;  // ISO-8601, e.g. "2025-07-14T10:00:00"
  date?: string;      // YYYY-MM-DD for all-day events
  timeZone?: string;
}

export interface OutlookEvent {
  id: string;
  summary: string;       // mapped from Graph's `subject`
  start: OutlookEventDateTime;
  end: OutlookEventDateTime;
  colorId?: string;      // mapped from Graph's `categories[0]`, via OUTLOOK_CATEGORY_COLORS
  location?: string;     // mapped from Graph's `location.displayName`
  description?: string;  // mapped from Graph's `bodyPreview`
  htmlLink: string;      // mapped from Graph's `webLink`
}

// ── Hook state ────────────────────────────────────────────────────────────────

export type OutlookCalendarStatus = 'idle' | 'loading' | 'success' | 'error' | 'unauthenticated';

export interface OutlookCalendarState {
  status: OutlookCalendarStatus;
  events: OutlookEvent[];
  error: string | null;
  lastRefreshed: Date | null;
}

// ── Outlook category name → hex ─────────────────────────────────────────────
// Outlook/Microsoft 365's default category palette (Preset22 set).

export const OUTLOOK_CATEGORY_COLORS: Record<string, string> = {
  'Red category':     '#e74856',
  'Orange category':  '#ff8c00',
  'Peach category':   '#ffb900',
  'Yellow category':  '#fce100',
  'Green category':   '#107c10',
  'Teal category':    '#00b7c3',
  'Olive category':   '#8cbd18',
  'Blue category':    '#0078d4',
  'Purple category':  '#b4009e',
  'Maroon category':  '#a80000',
  'Steel category':   '#5c6f81',
  'DarkSteel category': '#2b4657',
  'Gray category':    '#767676',
  'Dark Gray category': '#3b3a39',
  'Black category':   '#1b1a19',
};

// Outlook's own brand blue — used when an event has no category.
export const DEFAULT_EVENT_COLOR = '#0078d4';
