import { useEffect, useState } from 'react';
import type { CalendarData, CalendarEvent } from './calendar.types';
import { GCAL_COLORS, DEFAULT_EVENT_COLOR } from './calendar.types';
import { useCalendar } from './useCalendar';
import { useGoogleAuth } from '../../../hooks/useGoogleAuth';
import './Calendar.css';

// ── Date/time helpers ─────────────────────────────────────────────────────────

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS   = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toLocalDateKey(event: CalendarEvent): string {
  // All-day events use a plain date string; timed events use dateTime.
  const raw = event.start.date ?? event.start.dateTime!;
  return raw.slice(0, 10); // "YYYY-MM-DD"
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDayHeading(dateKey: string): string {
  const [y, m, day] = dateKey.split('-').map(Number);
  const d = new Date(y, m - 1, day);
  const today    = localDateKey(new Date());
  const tomorrow = localDateKey(new Date(Date.now() + 86_400_000));
  if (dateKey === today)    return 'Today';
  if (dateKey === tomorrow) return 'Tomorrow';
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[m - 1]} ${day}`;
}

function formatTimeBlock(event: CalendarEvent): string {
  if (event.start.date) return 'All Day';
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  return `${fmt(event.start.dateTime!)} – ${fmt(event.end.dateTime!)}`;
}

function formatHeaderDate(): string {
  const d = new Date();
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function eventColor(colorId?: string): string {
  return colorId ? (GCAL_COLORS[colorId] ?? DEFAULT_EVENT_COLOR) : DEFAULT_EVENT_COLOR;
}

// ── Group events by day, filtered to maxDays window ───────────────────────────

interface DayGroup {
  dateKey: string;
  events: CalendarEvent[];
}

function groupEventsByDay(
  events: CalendarEvent[],
  maxDays: number,
  showAllDay: boolean,
): DayGroup[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today.getTime() + maxDays * 86_400_000);

  const filtered = events.filter(evt => {
    if (!showAllDay && evt.start.date) return false;
    const key = toLocalDateKey(evt);
    const [y, m, d] = key.split('-').map(Number);
    const evtDay = new Date(y, m - 1, d);
    return evtDay >= today && evtDay < cutoff;
  });

  const map = new Map<string, CalendarEvent[]>();
  for (const evt of filtered) {
    const key = toLocalDateKey(evt);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(evt);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, evts]) => ({
      dateKey,
      // within a day: all-day first, then timed chronologically
      events: evts.sort((a, b) => {
        const aVal = a.start.date ? '' : (a.start.dateTime ?? '');
        const bVal = b.start.date ? '' : (b.start.dateTime ?? '');
        return aVal.localeCompare(bVal);
      }),
    }));
}

// ── SVG icons ─────────────────────────────────────────────────────────────────

function IconRefresh({ spinning }: { spinning: boolean }) {
  return (
    <svg
      className={`sg-cal-icon-refresh${spinning ? ' spinning' : ''}`}
      viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
    >
      <polyline points="15,2.5 15,6.5 11,6.5" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.7 10a6 6 0 1 1-1.4-6.2L15 6.5" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg className="sg-cal-logo-icon" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="1" y="3" width="18" height="16" rx="2" fill="#1a73e8" />
      <rect x="1" y="3" width="18" height="5"  rx="2" fill="#4285f4" />
      <rect x="6"  y="1" width="2" height="4" rx="1" fill="#fff" />
      <rect x="12" y="1" width="2" height="4" rx="1" fill="#fff" />
      <text x="10" y="16" textAnchor="middle" fontSize="7" fontWeight="700"
        fontFamily="system-ui,sans-serif" fill="#fff">
        {new Date().getDate()}
      </text>
    </svg>
  );
}

function IconConnect() {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
      style={{ width: 14, height: 14, flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function IconDisconnect() {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
      style={{ width: 14, height: 14, flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 8h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function SkeletonGroup() {
  return (
    <div className="sg-cal-skeleton-group">
      <div className="sg-cal-skeleton sg-cal-skeleton--heading" />
      <div className="sg-cal-skeleton-row">
        <div className="sg-cal-skeleton sg-cal-skeleton--time" />
        <div className="sg-cal-skeleton sg-cal-skeleton--title" />
      </div>
      <div className="sg-cal-skeleton-row">
        <div className="sg-cal-skeleton sg-cal-skeleton--time" />
        <div className="sg-cal-skeleton sg-cal-skeleton--title sg-cal-skeleton--title-short" />
      </div>
    </div>
  );
}

// ── Event row ─────────────────────────────────────────────────────────────────

function EventRow({ event }: { event: CalendarEvent }) {
  const timeBlock = formatTimeBlock(event);
  const isAllDay  = !!event.start.date;
  const color     = eventColor(event.colorId);

  return (
    <a
      className={`sg-cal-event${isAllDay ? ' sg-cal-event--allday' : ''}`}
      href={event.htmlLink}
      title={event.summary}
    >
      <span className="sg-cal-dot" style={{ background: color }} aria-hidden="true" />
      <span className="sg-cal-time">{timeBlock}</span>
      <span className="sg-cal-title">{event.summary}</span>
    </a>
  );
}

// ── Day group ─────────────────────────────────────────────────────────────────

function DayGroup({ group }: { group: DayGroup }) {
  return (
    <div className="sg-cal-day">
      <div className="sg-cal-day-heading">{formatDayHeading(group.dateKey)}</div>
      {group.events.map(evt => <EventRow key={evt.id} event={evt} />)}
    </div>
  );
}

// ── Settings panel ────────────────────────────────────────────────────────────

interface SettingsProps {
  data: CalendarData;
  onUpdateData: (patch: Partial<CalendarData>) => void;
}

function CalendarSettings({ data, onUpdateData }: SettingsProps) {
  const maxDays    = data.maxDays   ?? 3;
  const showAllDay = data.showAllDay ?? true;
  const viewMode   = data.viewMode  ?? 'agenda';
  const { isConnected, isConnecting, email, error, connect, disconnect } = useGoogleAuth();

  return (
    <div className="sg-cal-settings" onClick={e => e.stopPropagation()}>

      <div className="sg-cal-settings-row">
        <span className="sg-cal-settings-label">View</span>
        <div className="sg-cal-seg">
          <button
            className={`sg-cal-seg-btn${viewMode === 'agenda' ? ' sg-cal-seg-btn--active' : ''}`}
            onClick={() => onUpdateData({ viewMode: 'agenda' })}
          >Agenda</button>
          <button
            className={`sg-cal-seg-btn${viewMode === 'monthly' ? ' sg-cal-seg-btn--active' : ''}`}
            onClick={() => onUpdateData({ viewMode: 'monthly' })}
          >Monthly</button>
        </div>
      </div>

      {viewMode === 'agenda' && (
        <div className="sg-cal-settings-row">
          <label className="sg-cal-settings-label" htmlFor="sg-cal-maxdays">Days ahead</label>
          <div className="sg-cal-slider-wrap">
            <input
              id="sg-cal-maxdays"
              type="range"
              min={1}
              max={28}
              value={maxDays}
              onChange={e => onUpdateData({ maxDays: Number(e.target.value) })}
              className="sg-cal-slider"
            />
            <span className="sg-cal-slider-val">{maxDays}</span>
          </div>
        </div>
      )}

      <div className="sg-cal-settings-row">
        <span className="sg-cal-settings-label">All-day events</span>
        <button
          role="switch"
          aria-checked={showAllDay}
          className={`sg-cal-switch${showAllDay ? ' sg-cal-switch--on' : ''}`}
          onClick={() => onUpdateData({ showAllDay: !showAllDay })}
        >
          <span className="sg-cal-switch-thumb" />
        </button>
      </div>

      <div className="sg-cal-settings-divider" />

      <div className="sg-cal-settings-section">
        <span className="sg-cal-settings-label">Google Account</span>

        {isConnected ? (
          <>
            {email && <p className="sg-cal-account-email">{email}</p>}
            <button className="sg-cal-connect-btn sg-cal-connect-btn--disconnect"
              onClick={disconnect}>
              <IconDisconnect />
              Disconnect account
            </button>
          </>
        ) : (
          <>
            <button className="sg-cal-connect-btn" onClick={connect}
              disabled={isConnecting}>
              <IconConnect />
              {isConnecting ? 'Connecting…' : 'Connect Google Account'}
            </button>
            {error && <p className="sg-cal-connect-error">{error}</p>}
            <p className="sg-cal-connect-note">
              Grants read-only access to your Google Calendar.
            </p>
          </>
        )}
      </div>

    </div>
  );
}

// ── Monthly calendar grid ─────────────────────────────────────────────────────

const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface MonthlyProps {
  events: CalendarEvent[];
  showAllDay: boolean;
}

function MonthlyCalendar({ events, showAllDay }: MonthlyProps) {
  const [display, setDisplay] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const year  = display.getFullYear();
  const month = display.getMonth();

  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today       = localDateKey(new Date());

  const eventsByDay = new Map<string, CalendarEvent[]>();
  for (const evt of events) {
    if (!showAllDay && evt.start.date) continue;
    const key = toLocalDateKey(evt);
    const [ey, em] = key.split('-').map(Number);
    if (ey !== year || em !== month + 1) continue;
    if (!eventsByDay.has(key)) eventsByDay.set(key, []);
    eventsByDay.get(key)!.push(evt);
  }

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => setDisplay(new Date(year, month - 1, 1));
  const nextMonth = () => setDisplay(new Date(year, month + 1, 1));

  return (
    <div className="sg-cal-monthly">
      <div className="sg-cal-monthly-nav">
        <button className="sg-cal-monthly-nav-btn" onClick={prevMonth} aria-label="Previous month">‹</button>
        <span className="sg-cal-monthly-nav-label">{MONTHS[month]} {year}</span>
        <button className="sg-cal-monthly-nav-btn" onClick={nextMonth} aria-label="Next month">›</button>
      </div>

      <div className="sg-cal-monthly-grid">
        {DOW_LABELS.map((d, i) => (
          <div key={i} className="sg-cal-monthly-dow">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} className="sg-cal-monthly-cell sg-cal-monthly-cell--empty" />;
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayEvts = eventsByDay.get(key) ?? [];
          const isToday = key === today;
          return (
            <div key={key} className={`sg-cal-monthly-cell${isToday ? ' sg-cal-monthly-cell--today' : ''}`}>
              <span className="sg-cal-monthly-day-num">{day}</span>
              {dayEvts.length > 0 && (
                <div className="sg-cal-monthly-dots">
                  {dayEvts.slice(0, 3).map(evt => (
                    <span key={evt.id} className="sg-cal-monthly-dot"
                      style={{ background: eventColor(evt.colorId) }} />
                  ))}
                  {dayEvts.length > 3 && (
                    <span className="sg-cal-monthly-more">+{dayEvts.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────

interface Props {
  data: CalendarData;
  isSettingsOpen: boolean;
  onUpdateData: (patch: Partial<CalendarData>) => void;
}

export default function Calendar({ data, isSettingsOpen, onUpdateData }: Props) {
  const { status, events, refresh } = useCalendar();
  const { isConnected } = useGoogleAuth();

  const maxDays    = data.maxDays   ?? 3;
  const showAllDay = data.showAllDay ?? true;
  const viewMode   = data.viewMode  ?? 'agenda';

  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, [isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isSettingsOpen) {
    return <CalendarSettings data={data} onUpdateData={onUpdateData} />;
  }

  const isLoading  = status === 'idle' || status === 'loading';
  const isUnauthed = status === 'unauthenticated';

  return (
    <div className="sg-cal">

      <div className="sg-cal-header">
        <div className="sg-cal-title">
          <IconCalendar />
          <span>{formatHeaderDate()}</span>
        </div>
        <button className="sg-cal-refresh" onClick={() => refresh()}
          disabled={isLoading || isUnauthed} title="Refresh" aria-label="Refresh calendar">
          <IconRefresh spinning={isLoading} />
        </button>
      </div>

      <div className="sg-cal-body">
        {isUnauthed ? (
          <div className="sg-cal-empty">
            <IconCalendar />
            <span className="sg-cal-empty-text">
              Connect your Google Account in ⚙ settings to see your calendar.
            </span>
          </div>
        ) : isLoading ? (
          <>
            <SkeletonGroup />
            <SkeletonGroup />
          </>
        ) : status === 'error' ? (
          <div className="sg-cal-empty">
            <span className="sg-cal-empty-icon">⚠</span>
            <span className="sg-cal-empty-text">Could not load calendar</span>
          </div>
        ) : viewMode === 'monthly' ? (
          <MonthlyCalendar events={events} showAllDay={showAllDay} />
        ) : (() => {
          const groups = groupEventsByDay(events, maxDays, showAllDay);
          return groups.length === 0 ? (
            <div className="sg-cal-empty">
              <span className="sg-cal-empty-icon">✓</span>
              <span className="sg-cal-empty-text">No upcoming events</span>
            </div>
          ) : (
            groups.map(g => <DayGroup key={g.dateKey} group={g} />)
          );
        })()}
      </div>

    </div>
  );
}
