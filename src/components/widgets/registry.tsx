import type { ReactNode } from 'react';
import type { WidgetDataMap, WidgetType, ClockData, QuicklinksData, BookmarksData, GmailData, CalendarData, NotesData, PlaceholderData } from '../../types/widget';
import Clock, { ClockSettings } from './Clock/Clock';
import Quicklinks, { QuicklinksSettings } from './Quicklinks/Quicklinks';
import Bookmarks, { BookmarksSettings } from './Bookmarks/Bookmarks';
import Gmail, { GmailSettings } from './Gmail/Gmail';
import Calendar, { CalendarSettings } from './Calendar/Calendar';
import Notes, { NotesSettings } from './Notes/Notes';
import WidgetPlaceholder from '../shared/WidgetPlaceholder';

// ── Types ──────────────────────────────────────────────────────────────────────

// Fully typed per-widget entry — enforced at definition via `satisfies`.
interface TypedEntry<T> {
  label:       string;
  icon:        string;
  defaultSize: { w: number; h: number };
  defaultData: T;
  renderComponent: (data: T, onUpdateData: (patch: Partial<T>) => void, isSettingsOpen?: boolean) => ReactNode;
  renderSettings:  ((data: T, onUpdateData: (patch: Partial<T>) => void) => ReactNode) | null;
}

// Type-erased entry used for dynamic lookup by widget.type at runtime.
// The `satisfies` checks on each entry below guarantee the internal correctness.
export interface WidgetEntry {
  label:       string;
  icon:        string;
  defaultSize: { w: number; h: number };
  defaultData: unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderComponent: (data: any, onUpdateData: (patch: any) => void, isSettingsOpen?: boolean) => ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderSettings:  ((data: any, onUpdateData: (patch: any) => void) => ReactNode) | null;
}

// ── Registry ───────────────────────────────────────────────────────────────────

const _registry = {
  clock: {
    label:       'Clock',
    icon:        '🕐',
    defaultSize: { w: 2, h: 2 },
    defaultData: { format: '24h', showSeconds: true, showDate: true } satisfies ClockData,
    renderComponent: (data, onUpdateData) => <Clock data={data} onUpdateData={onUpdateData} />,
    renderSettings:  (data, onUpdateData) => <ClockSettings data={data} onUpdateData={onUpdateData} />,
  } satisfies TypedEntry<ClockData>,

  quicklinks: {
    label:       'Quicklinks',
    icon:        '🔗',
    defaultSize: { w: 2, h: 2 },
    defaultData: { links: [], layout: 'grid' } satisfies QuicklinksData,
    renderComponent: (data, onUpdateData, isSettingsOpen) => <Quicklinks data={data} onUpdateData={onUpdateData} isSettingsOpen={isSettingsOpen} />,
    renderSettings:  (data, onUpdateData) => <QuicklinksSettings data={data} onUpdateData={onUpdateData} />,
  } satisfies TypedEntry<QuicklinksData>,

  bookmarks: {
    label:       'Bookmarks',
    icon:        '🔖',
    defaultSize: { w: 2, h: 2 },
    defaultData: { folderId: '', layout: 'grid' } satisfies BookmarksData,
    renderComponent: (data, onUpdateData) => <Bookmarks data={data} onUpdateData={onUpdateData} />,
    renderSettings:  (data, onUpdateData) => <BookmarksSettings data={data} onUpdateData={onUpdateData} />,
  } satisfies TypedEntry<BookmarksData>,

  gmail: {
    label:       'Gmail',
    icon:        '✉',
    defaultSize: { w: 2, h: 3 },
    defaultData: { maxEmails: 5, showSnippets: true } satisfies GmailData,
    renderComponent: (data, onUpdateData) => <Gmail data={data} onUpdateData={onUpdateData} />,
    renderSettings:  (data, onUpdateData) => <GmailSettings data={data} onUpdateData={onUpdateData} />,
  } satisfies TypedEntry<GmailData>,

  calendar: {
    label:       'Calendar',
    icon:        '📅',
    defaultSize: { w: 2, h: 3 },
    defaultData: { maxDays: 3, showAllDay: true } satisfies CalendarData,
    renderComponent: (data, onUpdateData) => <Calendar data={data} onUpdateData={onUpdateData} />,
    renderSettings:  (data, onUpdateData) => <CalendarSettings data={data} onUpdateData={onUpdateData} />,
  } satisfies TypedEntry<CalendarData>,

  notes: {
    label:       'Notes',
    icon:        '📝',
    defaultSize: { w: 2, h: 2 },
    defaultData: { content: '', fontSize: 'M' } satisfies NotesData,
    renderComponent: (data, onUpdateData) => <Notes data={data} onUpdateData={onUpdateData} />,
    renderSettings:  (data, onUpdateData) => <NotesSettings data={data} onUpdateData={onUpdateData} />,
  } satisfies TypedEntry<NotesData>,

  placeholder: {
    label:       'Placeholder',
    icon:        '⬜',
    defaultSize: { w: 2, h: 2 },
    defaultData: { title: 'New' } satisfies PlaceholderData,
    renderComponent: (data, onUpdateData) => <WidgetPlaceholder widget={{ type: 'placeholder', data, id: '', col: 1, row: 1, w: 1, h: 1 }} />,
    renderSettings:  null,
  } satisfies TypedEntry<PlaceholderData>,
} satisfies { [K in WidgetType]: TypedEntry<WidgetDataMap[K]> };

// One cast total — lets WidgetContainer index by dynamic widget.type.
export const WIDGET_REGISTRY = _registry as Record<WidgetType, WidgetEntry>;

// Ordered list for the "Add Widget" menu (excludes placeholder handled separately if desired).
export const WIDGET_MENU_TYPES: WidgetType[] = [
  'clock', 'quicklinks', 'bookmarks', 'gmail', 'calendar', 'notes', 'placeholder',
];
