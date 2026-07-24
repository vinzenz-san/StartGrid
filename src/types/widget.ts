/** Shared rich-text styling block — TablissNG-parity "Font Settings" panel,
 *  reusable across any widget by giving that widget's data type an optional
 *  `fontSettings?: FontSettings` field. Resolved into CSS via
 *  lib/fontStyle.ts's resolveFontStyle(). */
export interface FontSettings {
  fontFamily?:       string;
  fontWeight?:        number;  // undefined = Default/inherit
  italic?:             boolean;
  underline?:          boolean;
  color?:              string;
  useAccentColor?:     boolean; // when true, color follows the app's live accent color instead of `color`
  textOutline?:        boolean;
  textOutlineStyle?:   'basic' | 'advanced'; // basic = fixed-size text-shadow; advanced = -webkit-text-stroke
  textOutlineColor?:   string;
  textOutlineSize?:    number;  // advanced only
}

/** Shared TablissNG-parity "Display Settings" — Font Size / Scale / Rotation
 *  (Position and Custom CSS Class are deliberately not part of this app's
 *  version). Reusable the same way as FontSettings: any widget data type
 *  adds `displaySettings?: DisplaySettings`. Resolved via
 *  lib/displayStyle.ts's resolveDisplayStyle(). */
export interface DisplaySettings {
  fontSize?: number; // px, default 42 — the widget's primary text size
  scale?:    number; // default 1
  rotation?: number; // degrees, default 0
  padding?:  number; // px, default 12 — overrides the widget's own CSS padding
}

export interface ClockData {
  format: '24h' | '12h';
  showSeconds: boolean;
  showDate: boolean;
  /** IANA timezone id (e.g. 'Europe/Berlin'), or 'local' for the system timezone. Default 'local'. */
  timezone?: string;
  /** left/right/center control horizontal placement; top/bottom control
   *  vertical placement (the widget's flex-direction is column, so these
   *  map to align-items vs justify-content respectively). Default 'center'. */
  alignment?: WidgetAlignment;
  fontSettings?: FontSettings;
  displaySettings?: DisplaySettings;
}

export interface QuickLink {
  id: string;
  url: string;
  title?: string;
  customIcon?: string;
  iconSource?: 'auto' | 'custom-url' | 'upload';
  showTitle: boolean;
  showWhiteBadge?: boolean;
}

export type WidgetAlignment = 'left' | 'center' | 'right' | 'top' | 'bottom';

export interface QuicklinksData {
  links: QuickLink[];
  layout: 'grid' | 'list';
  iconSize?: 'small' | 'medium' | 'large';
  showTitles?: boolean;
  textSize?: 'S' | 'M' | 'L';
  alignment?: WidgetAlignment; // default 'left'
}

export type BookmarkSortMode = 'original' | 'foldersFirst' | 'alphabetical';

export interface BookmarkIconOverride {
  iconSource?:     'auto' | 'custom-url' | 'upload';
  customIcon?:     string;
  showWhiteBadge?: boolean;
}

export interface BookmarksData {
  rootFolderId?: string;
  folderTitle?:  string;
  iconSize?:     'small' | 'medium' | 'large'; // default 'medium'
  showTitles?:   boolean;                      // default true
  textSize?:     'S' | 'M' | 'L';               // default 'M'
  layout?:       'list' | 'grid';               // default 'list'
  alignment?:    WidgetAlignment;                // default 'left'
  sortingMode?:  BookmarkSortMode;
  /** Per-bookmark icon overrides, keyed by bookmark id. Scoped to the direct
   *  children of rootFolderId only — cleared whenever rootFolderId changes,
   *  and self-pruned of stale ids whenever the root folder's children are
   *  fetched and a previously-overridden id is no longer present. */
  iconOverrides?: Record<string, BookmarkIconOverride>;
}

export interface BookmarkSearchData {
  maxResults: number;
}

export interface CalendarData {
  maxDays: number;
  showAllDay: boolean;
  viewMode?: 'agenda' | 'monthly';
}

export interface OutlookCalendarData {
  maxDays: number;
  showAllDay: boolean;
}

export interface OutlookMailData {
  maxResults: number;      // 1–25, default 8
  showUnreadOnly?: boolean; // default false
}

export interface NotesData {
  content:      string;
  fontSize?:    'S' | 'M' | 'L';
  storageMode?: 'local' | 'synced';
}

export interface PlaceholderData {
  title?: string;
}

export interface GreetingData {
  userName?: string;
  useCustomQuote?: boolean;
  customQuote?: string;
  alignment?: WidgetAlignment; // default 'left'
  fontSettings?: FontSettings;
  displaySettings?: DisplaySettings;
}

export interface WeatherData {
  locationName?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  units?: 'metric' | 'imperial'; // default 'metric'
  showFeelsLike?: boolean;       // default true
  showLocationName?: boolean;    // default true
}

// Maps each widget type string to its strongly-typed data interface.
export interface WidgetDataMap {
  clock:           ClockData;
  quicklinks:      QuicklinksData;
  bookmarks:       BookmarksData;
  bookmarkSearch:  BookmarkSearchData;
  calendar:        CalendarData;
  outlookCalendar: OutlookCalendarData;
  outlookMail:     OutlookMailData;
  notes:           NotesData;
  greeting:        GreetingData;
  weather:         WeatherData;
  placeholder:     PlaceholderData;
}

export type WidgetType = keyof WidgetDataMap;

interface WidgetBase {
  id: string;
  col: number;
  row: number;
  w: number;
  h: number;
  bgColor?: string;
  bgColorScheme?: 'dark' | 'light'; // which theme was active when bgColor was picked — see getAdaptiveColor (colorUtils.ts)
  bgPresetId?: string;
  bgOpacity?: number;
  bgDim?: number;
  localOverrideEnabled?: boolean;
  /** @deprecated read-only; use bgGradientIntensity instead */
  localGradientOverride?: boolean;
  bgGradientIntensity?: number;  // 0-100; replaces localGradientOverride
  bgShadow?: number;             // 0-100; local shadow intensity override
  /** Explicit per-widget theme override. Unset (auto) follows the global colorScheme. */
  localColorScheme?: 'light' | 'dark';
  showCustomTitle?: boolean;
  customTitle?: string;
}

// Discriminated union — TypeScript narrows `data` automatically when `type` is checked.
export type Widget =
  | (WidgetBase & { type: 'clock';          data: ClockData })
  | (WidgetBase & { type: 'quicklinks';     data: QuicklinksData })
  | (WidgetBase & { type: 'bookmarks';      data: BookmarksData })
  | (WidgetBase & { type: 'bookmarkSearch'; data: BookmarkSearchData })
  | (WidgetBase & { type: 'calendar';       data: CalendarData })
  | (WidgetBase & { type: 'outlookCalendar'; data: OutlookCalendarData })
  | (WidgetBase & { type: 'outlookMail';     data: OutlookMailData })
  | (WidgetBase & { type: 'notes';          data: NotesData })
  | (WidgetBase & { type: 'greeting';       data: GreetingData })
  | (WidgetBase & { type: 'weather';        data: WeatherData })
  | (WidgetBase & { type: 'placeholder';    data: PlaceholderData });
