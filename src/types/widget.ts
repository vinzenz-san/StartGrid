export interface ClockData {
  format: '24h' | '12h';
  showSeconds: boolean;
  showDate: boolean;
}

export interface QuickLink {
  id: string;
  url: string;
  title?: string;
  customIcon?: string;  // Emoji or data-URL
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
  data: Record<string, unknown>;
}
