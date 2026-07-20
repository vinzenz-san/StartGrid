import type { ReactNode } from 'react';
import type { WidgetDataMap, WidgetType, ClockData, QuicklinksData, BookmarksData, BookmarkSearchData, GmailData, CalendarData, NotesData, GreetingData, WeatherData, PlaceholderData } from '../../types/widget';
import type { TranslationKey } from '../../i18n';
import Clock, { ClockSettings } from './Clock/Clock';
import Quicklinks, { QuicklinksSettings } from './Quicklinks/Quicklinks';
import BookmarkFolder, { BookmarkFolderSettings } from './BookmarkFolder/BookmarkFolder';
import BookmarkSearch, { BookmarkSearchSettings } from './BookmarkSearch/BookmarkSearch';
import Gmail, { GmailSettings } from './Gmail/Gmail';
import Calendar, { CalendarSettings } from './Calendar/Calendar';
import Notes, { NotesSettings } from './Notes/Notes';
import Greeting, { GreetingSettings } from './Greeting/Greeting';
import Weather, { WeatherSettings } from './Weather/Weather';
import WidgetPlaceholder from '../shared/WidgetPlaceholder';

// ── Types ──────────────────────────────────────────────────────────────────────

// Fully typed per-widget entry — enforced at definition via `satisfies`.
interface TypedEntry<T> {
  label:       string;
  icon:        string;
  defaultSize: { w: number; h: number };
  defaultData: T;
  devOnly?:    boolean;
  titleBehavior:        'optional' | 'auto' | 'none';
  defaultTitle?:        string;
  defaultShowCustomTitle?: boolean;
  resolveDynamicTitle?: (data: T) => string | undefined;
  renderComponent: (data: T, onUpdateData: (patch: Partial<T>) => void, isSettingsOpen?: boolean, widgetId?: string) => ReactNode;
  renderSettings:  ((data: T, onUpdateData: (patch: Partial<T>) => void, widgetId?: string) => ReactNode) | null;
}

// Type-erased entry used for dynamic lookup by widget.type at runtime.
// The `satisfies` checks on each entry below guarantee the internal correctness.
export interface WidgetEntry {
  label:       string;
  icon:        string;
  defaultSize: { w: number; h: number };
  defaultData: unknown;
  devOnly?:    boolean;
  titleBehavior:        'optional' | 'auto' | 'none';
  defaultTitle?:        string;
  defaultShowCustomTitle?: boolean;
  resolveDynamicTitle?: (data: unknown) => string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderComponent: (data: any, onUpdateData: (patch: any) => void, isSettingsOpen?: boolean, widgetId?: string) => ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderSettings:  ((data: any, onUpdateData: (patch: any) => void, widgetId?: string) => ReactNode) | null;
}

// ── Registry ───────────────────────────────────────────────────────────────────

const _registry = {
  clock: {
    label:         'Clock',
    icon:          '🕐',
    defaultSize:   { w: 2, h: 2 },
    defaultData:   { format: '24h', showSeconds: true, showDate: true } satisfies ClockData,
    titleBehavior: 'none',
    renderComponent: (data, onUpdateData) => <Clock data={data} onUpdateData={onUpdateData} />,
    renderSettings:  (data, onUpdateData) => <ClockSettings data={data} onUpdateData={onUpdateData} />,
  } satisfies TypedEntry<ClockData>,

  quicklinks: {
    label:                 'Quicklinks',
    icon:                  '🔗',
    defaultSize:           { w: 2, h: 2 },
    defaultData:           { links: [], layout: 'grid' } satisfies QuicklinksData,
    titleBehavior:         'optional',
    defaultTitle:          'Quicklinks',
    defaultShowCustomTitle: false,
    renderComponent: (data, onUpdateData) => <Quicklinks data={data} onUpdateData={onUpdateData} />,
    renderSettings:  (data, onUpdateData) => <QuicklinksSettings data={data} onUpdateData={onUpdateData} />,
  } satisfies TypedEntry<QuicklinksData>,

  bookmarks: {
    label:                 'Bookmark Folder',
    icon:                  '🔖',
    defaultSize:           { w: 2, h: 3 },
    defaultData:           { sortingMode: 'original' } satisfies BookmarksData,
    titleBehavior:         'optional',
    defaultTitle:          'Bookmarks',
    defaultShowCustomTitle: false,
    resolveDynamicTitle:   (data) => data.folderTitle,
    renderComponent: (data, onUpdateData) => <BookmarkFolder data={data} onUpdateData={onUpdateData} />,
    renderSettings:  (data, onUpdateData) => <BookmarkFolderSettings data={data} onUpdateData={onUpdateData} />,
  } satisfies TypedEntry<BookmarksData>,

  bookmarkSearch: {
    label:         'Bookmark Search',
    icon:          '🔍',
    defaultSize:   { w: 2, h: 1 },
    defaultData:   { maxResults: 10 } satisfies BookmarkSearchData,
    titleBehavior: 'none',
    renderComponent: (data, onUpdateData) => <BookmarkSearch data={data} onUpdateData={onUpdateData} />,
    renderSettings:  (data, onUpdateData) => <BookmarkSearchSettings data={data} onUpdateData={onUpdateData} />,
  } satisfies TypedEntry<BookmarkSearchData>,

  gmail: {
    label:         'Gmail',
    icon:          '✉',
    defaultSize:   { w: 2, h: 3 },
    defaultData:   { maxEmails: 5, showSnippets: true } satisfies GmailData,
    titleBehavior: 'auto',
    renderComponent: (data, onUpdateData) => <Gmail data={data} onUpdateData={onUpdateData} />,
    renderSettings:  (data, onUpdateData) => <GmailSettings data={data} onUpdateData={onUpdateData} />,
  } satisfies TypedEntry<GmailData>,

  calendar: {
    label:         'Calendar',
    icon:          '📅',
    defaultSize:   { w: 2, h: 3 },
    defaultData:   { maxDays: 3, showAllDay: true } satisfies CalendarData,
    titleBehavior: 'auto',
    renderComponent: (data, onUpdateData) => <Calendar data={data} onUpdateData={onUpdateData} />,
    renderSettings:  (data, onUpdateData) => <CalendarSettings data={data} onUpdateData={onUpdateData} />,
  } satisfies TypedEntry<CalendarData>,

  notes: {
    label:                 'Notes',
    icon:                  '📝',
    defaultSize:           { w: 2, h: 2 },
    defaultData:           { content: '', fontSize: 'M', storageMode: 'local' } satisfies NotesData,
    titleBehavior:         'optional',
    defaultTitle:          'Notes',
    defaultShowCustomTitle: false,
    renderComponent: (data, onUpdateData, isSettingsOpen, widgetId) => <Notes data={data} onUpdateData={onUpdateData} widgetId={widgetId} />,
    renderSettings:  (data, onUpdateData, widgetId) => <NotesSettings data={data} onUpdateData={onUpdateData} widgetId={widgetId} />,
  } satisfies TypedEntry<NotesData>,

  greeting: {
    label:         'Greeting',
    icon:          '👋',
    defaultSize:   { w: 2, h: 1 },
    defaultData:   { textSize: 'M', alignment: 'left' } satisfies GreetingData,
    titleBehavior: 'none',
    renderComponent: (data, onUpdateData) => <Greeting data={data} onUpdateData={onUpdateData} />,
    renderSettings:  (data, onUpdateData) => <GreetingSettings data={data} onUpdateData={onUpdateData} />,
  } satisfies TypedEntry<GreetingData>,

  weather: {
    label:         'Weather',
    icon:          '⛅',
    defaultSize:   { w: 2, h: 2 },
    defaultData:   { units: 'metric', showFeelsLike: true, showLocationName: true } satisfies WeatherData,
    titleBehavior: 'none',
    renderComponent: (data, onUpdateData) => <Weather data={data} onUpdateData={onUpdateData} />,
    renderSettings:  (data, onUpdateData) => <WeatherSettings data={data} onUpdateData={onUpdateData} />,
  } satisfies TypedEntry<WeatherData>,

  placeholder: {
    label:         'Placeholder',
    icon:          '⬜',
    defaultSize:   { w: 2, h: 2 },
    defaultData:   { title: 'Placeholder' } satisfies PlaceholderData,
    devOnly:       true,
    titleBehavior: 'none',
    renderComponent: (data, onUpdateData) => <WidgetPlaceholder widget={{ type: 'placeholder', data, id: '', col: 1, row: 1, w: 1, h: 1 }} />,
    renderSettings:  null,
  } satisfies TypedEntry<PlaceholderData>,


} satisfies { [K in WidgetType]: TypedEntry<WidgetDataMap[K]> };

// One cast total — lets WidgetContainer index by dynamic widget.type.
export const WIDGET_REGISTRY = _registry as Record<WidgetType, WidgetEntry>;

// `entry.label` above stays a plain English literal — it's read as a live
// fallback for a widget's resolved title (WidgetContainer.tsx) and as the
// Add-Widget menu's internal key, not stored per-widget data. This map lets
// render sites look up the translated display text via t() without touching
// the registry's own (English, internal) label field.
export const WIDGET_TYPE_LABEL_KEYS: Record<WidgetType, TranslationKey> = {
  clock:          'widgets.type.clock',
  quicklinks:     'widgets.type.quicklinks',
  bookmarks:      'widgets.type.bookmarks',
  bookmarkSearch: 'widgets.type.bookmarkSearch',
  gmail:          'widgets.type.gmail',
  calendar:       'widgets.type.calendar',
  notes:          'widgets.type.notes',
  greeting:       'widgets.type.greeting',
  weather:        'widgets.type.weather',
  placeholder:    'widgets.type.placeholder',
};

// Ordered list for the "Add Widget" menu (excludes placeholder handled separately if desired).
export const WIDGET_MENU_TYPES: WidgetType[] = [
  'clock', 'quicklinks', 'bookmarks', 'bookmarkSearch', 'gmail', 'calendar', 'notes', 'greeting', 'weather', 'placeholder',
];
