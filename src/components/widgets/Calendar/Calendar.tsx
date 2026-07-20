import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { CalendarData, CalendarEvent } from './calendar.types';
import { GCAL_COLORS, DEFAULT_EVENT_COLOR } from './calendar.types';
import { useCalendar } from './useCalendar';
import { useGoogleAuth } from '../../../hooks/useGoogleAuth';
import { SettingsRow, SegmentedControl, SettingsSwitch } from '../../shared/Form';
import { useSettings } from '../../../contexts/SettingsContext';
import { LOCALES } from '../../../i18n';
import './Calendar.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

function toLocalDateKey(event: CalendarEvent): string {
  return (event.start.date ?? event.start.dateTime!).slice(0, 10);
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Narrow weekday initials (Su/Mo/Tu/…) for the monthly grid header, derived
// from a known-Sunday-start week rather than a hardcoded array — follows the
// active locale's own weekday naming.
function getDowLabels(locale: string): string[] {
  const sunday = new Date(2023, 0, 1); // a Sunday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(d);
  });
}

function formatDayHeading(dateKey: string, locale: string, todayLabel: string, tomorrowLabel: string): string {
  const [y, m, day] = dateKey.split('-').map(Number);
  const d = new Date(y, m - 1, day);
  const today    = localDateKey(new Date());
  const tomorrow = localDateKey(new Date(Date.now() + 86_400_000));
  if (dateKey === today)    return todayLabel;
  if (dateKey === tomorrow) return tomorrowLabel;
  return new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }).format(d);
}

function formatTimeBlock(event: CalendarEvent, allDayLabel: string): string {
  if (event.start.date) return allDayLabel;
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };
  return `${fmt(event.start.dateTime!)} – ${fmt(event.end.dateTime!)}`;
}

function formatFullDate(dateKey: string, locale: string): string {
  const [y, m, day] = dateKey.split('-').map(Number);
  const d = new Date(y, m - 1, day);
  return new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(d);
}

function formatHeaderDate(locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date());
}

function eventColor(colorId?: string): string {
  return colorId ? (GCAL_COLORS[colorId] ?? DEFAULT_EVENT_COLOR) : DEFAULT_EVENT_COLOR;
}

interface DayGroup { dateKey: string; events: CalendarEvent[]; }

function groupEventsByDay(events: CalendarEvent[], maxDays: number, showAllDay: boolean): DayGroup[] {
  const today = new Date(); today.setHours(0,0,0,0);
  const cutoff = new Date(today.getTime() + maxDays * 86_400_000);
  const filtered = events.filter(evt => {
    if (!showAllDay && evt.start.date) return false;
    const [y,m,d] = toLocalDateKey(evt).split('-').map(Number);
    const evtDay = new Date(y, m-1, d);
    return evtDay >= today && evtDay < cutoff;
  });
  const map = new Map<string, CalendarEvent[]>();
  for (const evt of filtered) {
    const key = toLocalDateKey(evt);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(evt);
  }
  return Array.from(map.entries()).sort(([a],[b]) => a.localeCompare(b)).map(([dateKey, evts]) => ({
    dateKey,
    events: evts.sort((a,b) => (a.start.date?'':(a.start.dateTime??'')).localeCompare(b.start.date?'':(b.start.dateTime??''))),
  }));
}

// ── SVG icons ─────────────────────────────────────────────────────────────────

function IconRefresh({ spinning }: { spinning: boolean }) {
  return (
    <svg className={`sg-cal-icon-refresh${spinning ? ' spinning' : ''}`} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <polyline points="15,2.5 15,6.5 11,6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.7 10a6 6 0 1 1-1.4-6.2L15 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg className="sg-cal-logo-icon" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="1" y="3" width="18" height="16" rx="2" fill="#1a73e8"/>
      <rect x="1" y="3" width="18" height="5"  rx="2" fill="#4285f4"/>
      <rect x="6"  y="1" width="2" height="4" rx="1" fill="#fff"/>
      <rect x="12" y="1" width="2" height="4" rx="1" fill="#fff"/>
      <text x="10" y="16" textAnchor="middle" fontSize="7" fontWeight="700" fontFamily="system-ui,sans-serif" fill="#fff">
        {new Date().getDate()}
      </text>
    </svg>
  );
}

function IconConnect() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ width: 14, height: 14, flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function IconDisconnect() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ width: 14, height: 14, flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M5 8h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonGroup() {
  return (
    <div className="sg-cal-skeleton-group">
      <div className="sg-cal-skeleton sg-cal-skeleton--heading"/>
      <div className="sg-cal-skeleton-row">
        <div className="sg-cal-skeleton sg-cal-skeleton--time"/>
        <div className="sg-cal-skeleton sg-cal-skeleton--title"/>
      </div>
      <div className="sg-cal-skeleton-row">
        <div className="sg-cal-skeleton sg-cal-skeleton--time"/>
        <div className="sg-cal-skeleton sg-cal-skeleton--title sg-cal-skeleton--title-short"/>
      </div>
    </div>
  );
}

// ── Event / Day ───────────────────────────────────────────────────────────────

function EventRow({ event, allDayLabel }: { event: CalendarEvent; allDayLabel: string }) {
  return (
    <a className={`sg-cal-event${event.start.date ? ' sg-cal-event--allday' : ''}`} href={event.htmlLink} title={event.summary}>
      <span className="sg-cal-dot" style={{ background: eventColor(event.colorId) }} aria-hidden="true"/>
      <span className="sg-cal-time">{formatTimeBlock(event, allDayLabel)}</span>
      <span className="sg-cal-title">{event.summary}</span>
    </a>
  );
}

function DayGroup({ group, locale, todayLabel, tomorrowLabel, allDayLabel }: { group: DayGroup; locale: string; todayLabel: string; tomorrowLabel: string; allDayLabel: string }) {
  return (
    <div className="sg-cal-day">
      <div className="sg-cal-day-heading">{formatDayHeading(group.dateKey, locale, todayLabel, tomorrowLabel)}</div>
      {group.events.map(evt => <EventRow key={evt.id} event={evt} allDayLabel={allDayLabel}/>)}
    </div>
  );
}

// ── Event details popover (Monthly View) ─────────────────────────────────────

interface SelectedDay { dateKey: string; anchor: DOMRect; }

interface EventDetailsPopoverProps {
  selected: SelectedDay;
  events: CalendarEvent[];
  locale: string;
  allDayLabel: string;
  noEventsLabel: string;
  closeAriaLabel: string;
  locationLabel: string;
  descriptionLabel: string;
  onClose: () => void;
}

const POPOVER_WIDTH = 260;
const POPOVER_MARGIN = 8;

function EventDetailsPopover({
  selected, events, locale, allDayLabel, noEventsLabel, closeAriaLabel,
  locationLabel, descriptionLabel, onClose,
}: EventDetailsPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onClose]);

  const { anchor } = selected;
  const left = Math.min(Math.max(anchor.left, POPOVER_MARGIN), window.innerWidth - POPOVER_WIDTH - POPOVER_MARGIN);
  const spaceBelow = window.innerHeight - anchor.bottom;
  const openUpward = spaceBelow < 220 && anchor.top > spaceBelow;
  const style: CSSProperties = openUpward
    ? { left, bottom: Math.max(window.innerHeight - anchor.top + 4, POPOVER_MARGIN) }
    : { left, top: Math.min(anchor.bottom + 4, window.innerHeight - POPOVER_MARGIN) };

  return createPortal(
    <div className="sg-cal-event-popover" ref={panelRef} style={style} onPointerDown={e => e.stopPropagation()}>
      <div className="sg-cal-event-popover-header">
        <span className="sg-cal-event-popover-date">{formatFullDate(selected.dateKey, locale)}</span>
        <button className="sg-cal-event-popover-close" onClick={onClose} aria-label={closeAriaLabel}>×</button>
      </div>
      <div className="sg-cal-event-popover-body">
        {events.length === 0 ? (
          <div className="sg-cal-event-popover-empty">{noEventsLabel}</div>
        ) : events.map(evt => (
          <div key={evt.id} className="sg-cal-event-popover-item">
            <div className="sg-cal-event-popover-item-heading">
              <span className="sg-cal-dot" style={{ background: eventColor(evt.colorId) }} aria-hidden="true"/>
              <span className="sg-cal-event-popover-item-title">{evt.summary}</span>
            </div>
            <div className="sg-cal-event-popover-item-time">{formatTimeBlock(evt, allDayLabel)}</div>
            {evt.location && (
              <div className="sg-cal-event-popover-item-field">
                <span className="sg-cal-event-popover-item-label">{locationLabel}:</span> {evt.location}
              </div>
            )}
            {evt.description && (
              <div className="sg-cal-event-popover-item-field">
                <span className="sg-cal-event-popover-item-label">{descriptionLabel}:</span> {evt.description}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}

// ── Monthly grid ──────────────────────────────────────────────────────────────

function MonthlyCalendar({ events, showAllDay, locale, prevMonthLabel, nextMonthLabel, allDayLabel, noEventsLabel, closeAriaLabel, locationLabel, descriptionLabel }: { events: CalendarEvent[]; showAllDay: boolean; locale: string; prevMonthLabel: string; nextMonthLabel: string; allDayLabel: string; noEventsLabel: string; closeAriaLabel: string; locationLabel: string; descriptionLabel: string }) {
  const [display, setDisplay] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; });
  const [selected, setSelected] = useState<SelectedDay | null>(null);
  const dowLabels = getDowLabels(locale);
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'short' }).format(display);
  const year = display.getFullYear(), month = display.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const today = localDateKey(new Date());

  const eventsByDay = new Map<string, CalendarEvent[]>();
  for (const evt of events) {
    if (!showAllDay && evt.start.date) continue;
    const key = toLocalDateKey(evt);
    const [ey,em] = key.split('-').map(Number);
    if (ey !== year || em !== month+1) continue;
    if (!eventsByDay.has(key)) eventsByDay.set(key, []);
    eventsByDay.get(key)!.push(evt);
  }

  const cells: (number|null)[] = [...Array(firstDow).fill(null), ...Array.from({length: daysInMonth}, (_,i)=>i+1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="sg-cal-monthly">
      <div className="sg-cal-monthly-nav">
        <button className="sg-cal-monthly-nav-btn" onClick={() => setDisplay(new Date(year,month-1,1))} aria-label={prevMonthLabel}>‹</button>
        <span className="sg-cal-monthly-nav-label">{monthLabel} {year}</span>
        <button className="sg-cal-monthly-nav-btn" onClick={() => setDisplay(new Date(year,month+1,1))} aria-label={nextMonthLabel}>›</button>
      </div>
      <div className="sg-cal-monthly-grid">
        {dowLabels.map((d,i) => <div key={i} className="sg-cal-monthly-dow">{d}</div>)}
        {cells.map((day,i) => {
          if (!day) return <div key={`e${i}`} className="sg-cal-monthly-cell sg-cal-monthly-cell--empty"/>;
          const key = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const dayEvts = eventsByDay.get(key) ?? [];
          return (
            <div
              key={key}
              className={`sg-cal-monthly-cell${key===today?' sg-cal-monthly-cell--today':''}`}
              onClick={e => setSelected({ dateKey: key, anchor: e.currentTarget.getBoundingClientRect() })}
              role="button"
              tabIndex={0}
            >
              <span className="sg-cal-monthly-day-num">{day}</span>
              {dayEvts.length > 0 && (
                <div className="sg-cal-monthly-dots">
                  {dayEvts.slice(0,3).map(evt => <span key={evt.id} className="sg-cal-monthly-dot" style={{background:eventColor(evt.colorId)}}/>)}
                  {dayEvts.length > 3 && <span className="sg-cal-monthly-more">+{dayEvts.length-3}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {selected && (
        <EventDetailsPopover
          selected={selected}
          events={eventsByDay.get(selected.dateKey) ?? []}
          locale={locale}
          allDayLabel={allDayLabel}
          noEventsLabel={noEventsLabel}
          closeAriaLabel={closeAriaLabel}
          locationLabel={locationLabel}
          descriptionLabel={descriptionLabel}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ── Settings ──────────────────────────────────────────────────────────────────

interface SettingsProps {
  data: CalendarData;
  onUpdateData: (patch: Partial<CalendarData>) => void;
}

export function CalendarSettings({ data, onUpdateData }: SettingsProps) {
  const { t } = useSettings();
  const maxDays    = data.maxDays    ?? 3;
  const showAllDay = data.showAllDay ?? true;
  const viewMode   = data.viewMode   ?? 'agenda';
  const { isConnected, isConnecting, email, error, connect, disconnect } = useGoogleAuth();

  return (
    <div className="sg-cal-settings" onClick={e => e.stopPropagation()}>
      <SettingsRow label={t('widget.calendar.view')}>
        <SegmentedControl
          options={[{ value: 'agenda', label: t('widget.calendar.viewAgenda') }, { value: 'monthly', label: t('widget.calendar.viewMonthly') }]}
          value={viewMode}
          onChange={v => onUpdateData({ viewMode: v })}
        />
      </SettingsRow>

      {viewMode === 'agenda' && (
        <SettingsRow label={t('widget.calendar.daysAhead')}>
          <div className="sg-cal-slider-wrap">
            <input type="range" min={1} max={28} value={maxDays}
              onChange={e => onUpdateData({ maxDays: Number(e.target.value) })}
              className="sg-cal-slider"/>
            <span className="sg-cal-slider-val">{maxDays}</span>
          </div>
        </SettingsRow>
      )}

      <SettingsRow label={t('widget.calendar.allDayEvents')}>
        <SettingsSwitch checked={showAllDay} onChange={v => onUpdateData({ showAllDay: v })} />
      </SettingsRow>

      <div className="sg-cal-settings-divider"/>

      <div className="sg-cal-settings-section">
        <span className="sg-cal-settings-label">{t('widget.calendar.googleAccount')}</span>
        {isConnected ? (
          <>
            {email && <p className="sg-cal-account-email">{email}</p>}
            <button className="sg-cal-connect-btn sg-cal-connect-btn--disconnect" onClick={disconnect}>
              <IconDisconnect/> {t('widget.calendar.disconnect')}
            </button>
          </>
        ) : (
          <>
            <button className="sg-cal-connect-btn" onClick={connect} disabled={isConnecting}>
              <IconConnect/> {isConnecting ? t('widget.calendar.connecting') : t('widget.calendar.connect')}
            </button>
            {error && <p className="sg-cal-connect-error">{error}</p>}
            <p className="sg-cal-connect-note">{t('widget.calendar.grantNote')}</p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────

interface Props {
  data: CalendarData;
  onUpdateData: (patch: Partial<CalendarData>) => void;
}

export default function Calendar({ data, onUpdateData: _onUpdateData }: Props) {
  const { t, language } = useSettings();
  const locale = LOCALES[language];
  const { status, events, refresh } = useCalendar();
  const { isConnected, connect, isConnecting } = useGoogleAuth();
  const maxDays    = data.maxDays    ?? 3;
  const showAllDay = data.showAllDay ?? true;
  const viewMode   = data.viewMode   ?? 'agenda';

  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, [isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading  = status === 'idle' || status === 'loading';
  const isUnauthed = status === 'unauthenticated';

  return (
    <div className="sg-cal">
      <div className="sg-cal-header">
        <div className="sg-cal-title">
          <IconCalendar/>
          <span>{formatHeaderDate(locale)}</span>
        </div>
        <button className="sg-cal-refresh" onClick={() => refresh()}
          disabled={isLoading || isUnauthed} title={t('widget.calendar.refresh')} aria-label={t('widget.calendar.refreshAria')}>
          <IconRefresh spinning={isLoading}/>
        </button>
      </div>
      <div className="sg-cal-body">
        {isUnauthed ? (
          <div className="sg-cal-empty">
            <IconCalendar/>
            <span className="sg-cal-empty-text">{t('widget.calendar.connectPrompt')}</span>
            <button className="sg-cal-connect-btn" onClick={connect} disabled={isConnecting}>
              <IconConnect/> {isConnecting ? t('widget.calendar.connecting') : t('widget.calendar.connect')}
            </button>
          </div>
        ) : isLoading ? (
          <><SkeletonGroup/><SkeletonGroup/></>
        ) : status === 'error' ? (
          <div className="sg-cal-empty">
            <span className="sg-cal-empty-icon">⚠</span>
            <span className="sg-cal-empty-text">{t('widget.calendar.loadError')}</span>
          </div>
        ) : viewMode === 'monthly' ? (
          <MonthlyCalendar
            events={events}
            showAllDay={showAllDay}
            locale={locale}
            prevMonthLabel={t('widget.calendar.prevMonth')}
            nextMonthLabel={t('widget.calendar.nextMonth')}
            allDayLabel={t('widget.calendar.allDay')}
            noEventsLabel={t('widget.calendar.noEventsForDay')}
            closeAriaLabel={t('widget.calendar.closeAria')}
            locationLabel={t('widget.calendar.location')}
            descriptionLabel={t('widget.calendar.description')}
          />
        ) : (() => {
          const groups = groupEventsByDay(events, maxDays, showAllDay);
          return groups.length === 0 ? (
            <div className="sg-cal-empty">
              <span className="sg-cal-empty-icon">✓</span>
              <span className="sg-cal-empty-text">{t('widget.calendar.noUpcomingEvents')}</span>
            </div>
          ) : groups.map(g => (
            <DayGroup
              key={g.dateKey}
              group={g}
              locale={locale}
              todayLabel={t('widget.calendar.today')}
              tomorrowLabel={t('widget.calendar.tomorrow')}
              allDayLabel={t('widget.calendar.allDay')}
            />
          ));
        })()}
      </div>
    </div>
  );
}
