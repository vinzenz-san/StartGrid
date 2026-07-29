/** Chrome shared by the REST-backed Obsidian widgets. Kept here rather than
 *  duplicated per widget, and styled with the existing sg-cal-* classes the
 *  Outlook widgets already use for their headers and skeletons. */

export function IconObsidian() {
  return (
    <svg className="sg-cal-logo-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M11.6 1.8 5.9 6.1 4 13.2l4.2 5 5.9-1.9 2-8.4-4.5-6.1Z" fill="#7c3aed"/>
      <path d="m8.2 18.2 1-5.5 4.9-1.3-1 5-4.9 1.8Z" fill="#a78bfa"/>
    </svg>
  );
}

export function IconRefresh({ spinning }: { spinning: boolean }) {
  return (
    <svg className={`sg-cal-icon-refresh${spinning ? ' spinning' : ''}`} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <polyline points="15,2.5 15,6.5 11,6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.7 10a6 6 0 1 1-1.4-6.2L15 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

/** "Open in Obsidian" — an arrow leaving a frame. */
export function IconOpenExternal() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ width: 13, height: 13 }}>
      <path d="M9 3h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13 3 7.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M12 10.5V12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h1.5"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/** Dice — the Random Note reshuffle action. */
export function IconShuffle() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ width: 13, height: 13 }}>
      <rect x="2.5" y="2.5" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="5.8" cy="5.8" r="1.05" fill="currentColor"/>
      <circle cx="10.2" cy="10.2" r="1.05" fill="currentColor"/>
      <circle cx="10.2" cy="5.8" r="1.05" fill="currentColor"/>
    </svg>
  );
}

export function SkeletonRow() {
  return (
    <div className="sg-cal-skeleton-group">
      <div className="sg-cal-skeleton-row">
        <div className="sg-cal-skeleton sg-cal-skeleton--time"/>
        <div className="sg-cal-skeleton sg-cal-skeleton--title"/>
      </div>
    </div>
  );
}
