export interface ClockData {
  format: '24h' | '12h';
  showSeconds: boolean;
  showDate: boolean;
  fontSize?: 'S' | 'M' | 'L' | 'XL';
  dateFontSize?: 'S' | 'M' | 'L';
  isBold?: boolean;
  boldDate?: boolean;
  fontColor?: string;
  /** IANA timezone id (e.g. 'Europe/Berlin'), or 'local' for the system timezone. Default 'local'. */
  timezone?: string;
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

export interface BookmarksData {
  rootFolderId?: string;
  folderTitle?:  string;
  iconSize?:     'small' | 'medium' | 'large'; // default 'medium'
  showTitles?:   boolean;                      // default true
  textSize?:     'S' | 'M' | 'L';               // default 'M'
  layout?:       'list' | 'grid';               // default 'list'
  alignment?:    WidgetAlignment;                // default 'left'
  sortingMode?:  BookmarkSortMode;
}

export interface BookmarkSearchData {
  maxResults: number;
}

export interface GmailData {
  maxEmails: number;
  showSnippets: boolean;
}

export interface CalendarData {
  maxDays: number;
  showAllDay: boolean;
  viewMode?: 'agenda' | 'monthly';
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
  textSize?: 'S' | 'M' | 'L' | 'XL';
  alignment?: WidgetAlignment; // default 'left'
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
  clock:          ClockData;
  quicklinks:     QuicklinksData;
  bookmarks:      BookmarksData;
  bookmarkSearch: BookmarkSearchData;
  gmail:          GmailData;
  calendar:       CalendarData;
  notes:          NotesData;
  greeting:       GreetingData;
  weather:        WeatherData;
  placeholder:    PlaceholderData;
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
  | (WidgetBase & { type: 'gmail';          data: GmailData })
  | (WidgetBase & { type: 'calendar';       data: CalendarData })
  | (WidgetBase & { type: 'notes';          data: NotesData })
  | (WidgetBase & { type: 'greeting';       data: GreetingData })
  | (WidgetBase & { type: 'weather';        data: WeatherData })
  | (WidgetBase & { type: 'placeholder';    data: PlaceholderData });
