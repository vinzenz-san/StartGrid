export interface ClockData {
  format: '24h' | '12h';
  showSeconds: boolean;
  showDate: boolean;
  fontSize?: 'S' | 'M' | 'L' | 'XL';
  isBold?: boolean;
  fontColor?: string;
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

export interface QuicklinksData {
  links: QuickLink[];
  layout: 'grid' | 'list';
  iconSize?: 'small' | 'medium' | 'large';
  showTitles?: boolean;
  textSize?: 'S' | 'M' | 'L';
}

export interface BookmarksData {
  folderId: string;
  folderName?: string;
  layout: 'grid' | 'list';
  iconSize?: 'small' | 'medium' | 'large';
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
  content:   string;
  fontSize?: 'S' | 'M' | 'L';
}

export interface PlaceholderData {
  title?: string;
}

// Maps each widget type string to its strongly-typed data interface.
export interface WidgetDataMap {
  clock:       ClockData;
  quicklinks:  QuicklinksData;
  bookmarks:   BookmarksData;
  gmail:       GmailData;
  calendar:    CalendarData;
  notes:       NotesData;
  placeholder: PlaceholderData;
}

export type WidgetType = keyof WidgetDataMap;

interface WidgetBase {
  id: string;
  col: number;
  row: number;
  w: number;
  h: number;
  bgColor?: string;
  bgOpacity?: number;
  bgDim?: number;
  localOverrideEnabled?: boolean;
  localGradientOverride?: boolean;
  showCustomTitle?: boolean;
  customTitle?: string;
}

// Discriminated union — TypeScript narrows `data` automatically when `type` is checked.
export type Widget =
  | (WidgetBase & { type: 'clock';       data: ClockData })
  | (WidgetBase & { type: 'quicklinks';  data: QuicklinksData })
  | (WidgetBase & { type: 'bookmarks';   data: BookmarksData })
  | (WidgetBase & { type: 'gmail';       data: GmailData })
  | (WidgetBase & { type: 'calendar';    data: CalendarData })
  | (WidgetBase & { type: 'notes';       data: NotesData })
  | (WidgetBase & { type: 'placeholder'; data: PlaceholderData });
