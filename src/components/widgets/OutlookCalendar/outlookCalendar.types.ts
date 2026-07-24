// ── Persistent widget data (stored in browser.storage.sync) ──────────────────

export interface OutlookCalendarData {
  maxDays: number;                 // 1–28, default 3
  showAllDay: boolean;             // include all-day events, default true
  viewMode?: 'agenda' | 'monthly'; // default 'agenda'
  firstDayOfWeek?: 0 | 1;           // 0=Sunday, 1=Monday; monthly view only, default 0
}

// ── API-mirroring types ─────────────────────────────────────────────────────
// Mirrors the shape returned by Microsoft Graph's
//   GET https://graph.microsoft.com/v1.0/me/calendarView
//     ?startDateTime=<now>&endDateTime=<cutoff>&$orderby=start/dateTime
// after mapping (see useOutlookCalendar.ts) into the shared, provider-agnostic
// CalendarEvent shape (shared/calendarEvent.types.ts) — the same one the
// Google Calendar widget uses, so CalendarCore.tsx's rendering is a straight
// reuse for both.

export type { CalendarEventDateTime as OutlookEventDateTime, CalendarEvent as OutlookEvent } from '../shared/calendarEvent.types';
import type { CalendarViewStatus, CalendarEvent } from '../shared/calendarEvent.types';

// ── Hook state ────────────────────────────────────────────────────────────────

export type OutlookCalendarStatus = CalendarViewStatus;

export interface OutlookCalendarState {
  status: OutlookCalendarStatus;
  events: CalendarEvent[];
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
