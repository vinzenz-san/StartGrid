export interface ClockData {
  format: '24h' | '12h';
  showSeconds: boolean;
  showDate: boolean;
}

export interface QuickLink {
  id: string;
  url: string;
  title?: string;
  customIcon?: string;             // data-URL (upload), external URL (custom-url), or legacy emoji
  iconSource?: 'auto' | 'custom-url' | 'upload';  // default 'auto'
  showTitle: boolean;
}

export interface QuicklinksData {
  links: QuickLink[];
  layout: 'grid' | 'list';
  iconSize?: 'small' | 'medium' | 'large';
  showTitles?: boolean;
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
}

export interface Widget {
  id: string;
  type: 'placeholder' | 'clock' | 'quicklinks' | 'bookmarks' | 'background' | 'gmail' | 'calendar';
  col: number;  // 1-based CSS Grid column
  row: number;  // 1-based CSS Grid row
  w: number;    // column span
  h: number;    // row span
  bgColor?: string;         // hex color for widget surface, e.g. '#1a1d2e'
  bgOpacity?: number;       // 0.0–1.0, default 1
  invertText?: boolean;     // invert text/title colors in widget content
  invertFavicons?: boolean; // invert favicon/icon images in widget content
  data: Record<string, unknown>;
}
