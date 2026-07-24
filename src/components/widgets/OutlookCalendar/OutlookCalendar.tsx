import { useEffect } from 'react';
import type { OutlookCalendarData } from '../../../types/widget';
import type { OutlookEvent } from './outlookCalendar.types';
import { OUTLOOK_CATEGORY_COLORS, DEFAULT_EVENT_COLOR } from './outlookCalendar.types';
import { useOutlookCalendar } from './useOutlookCalendar';
import { useMsAuth } from '../../../hooks/useMsAuth';
import { SettingsRow, SettingsSwitch } from '../../shared/Form';
import { useSettings } from '../../../contexts/SettingsContext';
import { LOCALES } from '../../../i18n';
import './OutlookCalendar.css';

// ── Helpers ───────────────────────────────────────────────────────────────────
// Identical to Calendar.tsx's agenda-view helpers — see that file for the
// monthly-grid variant, not reimplemented here (see registry.tsx comment).

function toLocalDateKey(event: OutlookEvent): string {
  return (event.start.date ?? event.start.dateTime!).slice(0, 10);
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
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

function formatTimeBlock(event: OutlookEvent, allDayLabel: string): string {
  if (event.start.date) return allDayLabel;
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };
  return `${fmt(event.start.dateTime!)} – ${fmt(event.end.dateTime!)}`;
}

function formatHeaderDate(locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date());
}

function eventColor(colorId?: string): string {
  return colorId ? (OUTLOOK_CATEGORY_COLORS[colorId] ?? DEFAULT_EVENT_COLOR) : DEFAULT_EVENT_COLOR;
}

interface DayGroup { dateKey: string; events: OutlookEvent[]; }

function groupEventsByDay(events: OutlookEvent[], maxDays: number, showAllDay: boolean): DayGroup[] {
  const today = new Date(); today.setHours(0,0,0,0);
  const cutoff = new Date(today.getTime() + maxDays * 86_400_000);
  const filtered = events.filter(evt => {
    if (!showAllDay && evt.start.date) return false;
    const [y,m,d] = toLocalDateKey(evt).split('-').map(Number);
    const evtDay = new Date(y, m-1, d);
    return evtDay >= today && evtDay < cutoff;
  });
  const map = new Map<string, OutlookEvent[]>();
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

function IconOutlookCalendar() {
  return (
    <svg className="sg-cal-logo-icon" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="1" y="3" width="18" height="16" rx="2" fill="#0078d4"/>
      <rect x="1" y="3" width="18" height="5"  rx="2" fill="#2b88d8"/>
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

function EventRow({ event, allDayLabel }: { event: OutlookEvent; allDayLabel: string }) {
  return (
    <a className={`sg-cal-event${event.start.date ? ' sg-cal-event--allday' : ''}`} href={event.htmlLink} title={event.summary} target="_blank" rel="noreferrer">
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

// ── Settings ──────────────────────────────────────────────────────────────────

interface SettingsProps {
  data: OutlookCalendarData;
  onUpdateData: (patch: Partial<OutlookCalendarData>) => void;
}

export function OutlookCalendarSettings({ data, onUpdateData }: SettingsProps) {
  const { t } = useSettings();
  const maxDays    = data.maxDays    ?? 3;
  const showAllDay = data.showAllDay ?? true;
  const { isConnected, isConnecting, email, error, connect, disconnect } = useMsAuth();

  return (
    <div className="sg-cal-settings" onClick={e => e.stopPropagation()}>
      <SettingsRow label={t('widget.outlookCalendar.daysAhead')}>
        <div className="sg-cal-slider-wrap">
          <input type="range" min={1} max={28} value={maxDays}
            onChange={e => onUpdateData({ maxDays: Number(e.target.value) })}
            className="sg-cal-slider"/>
          <span className="sg-cal-slider-val">{maxDays}</span>
        </div>
      </SettingsRow>

      <SettingsRow label={t('widget.outlookCalendar.allDayEvents')}>
        <SettingsSwitch checked={showAllDay} onChange={v => onUpdateData({ showAllDay: v })} />
      </SettingsRow>

      <div className="sg-cal-settings-divider"/>

      <div className="sg-cal-settings-section">
        <span className="sg-cal-settings-label">{t('widget.outlookCalendar.msAccount')}</span>
        {isConnected ? (
          <>
            {email && <p className="sg-cal-account-email">{email}</p>}
            <button className="sg-cal-connect-btn sg-cal-connect-btn--disconnect" onClick={disconnect}>
              <IconDisconnect/> {t('widget.outlookCalendar.disconnect')}
            </button>
          </>
        ) : (
          <>
            <button className="sg-cal-connect-btn" onClick={connect} disabled={isConnecting}>
              <IconConnect/> {isConnecting ? t('widget.outlookCalendar.connecting') : t('widget.outlookCalendar.connect')}
            </button>
            {error && <p className="sg-cal-connect-error">{error}</p>}
            <p className="sg-cal-connect-note">{t('widget.outlookCalendar.grantNote')}</p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────

interface Props {
  data: OutlookCalendarData;
  onUpdateData: (patch: Partial<OutlookCalendarData>) => void;
}

export default function OutlookCalendar({ data }: Props) {
  const { t, language } = useSettings();
  const locale = LOCALES[language];
  const { status, events, refresh } = useOutlookCalendar();
  const { isConnected, connect, isConnecting } = useMsAuth();
  const maxDays    = data.maxDays    ?? 3;
  const showAllDay = data.showAllDay ?? true;

  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, [isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading  = status === 'idle' || status === 'loading';
  const isUnauthed = status === 'unauthenticated';

  return (
    <div className="sg-cal">
      <div className="sg-cal-header">
        <div className="sg-cal-title">
          <IconOutlookCalendar/>
          <span>{formatHeaderDate(locale)}</span>
        </div>
        <button className="sg-cal-refresh" onClick={() => refresh()}
          disabled={isLoading || isUnauthed} title={t('widget.outlookCalendar.refresh')} aria-label={t('widget.outlookCalendar.refreshAria')}>
          <IconRefresh spinning={isLoading}/>
        </button>
      </div>
      <div className="sg-cal-body">
        {isUnauthed ? (
          <div className="sg-cal-empty">
            <IconOutlookCalendar/>
            <span className="sg-cal-empty-text">{t('widget.outlookCalendar.connectPrompt')}</span>
            <button className="sg-cal-connect-btn" onClick={connect} disabled={isConnecting}>
              <IconConnect/> {isConnecting ? t('widget.outlookCalendar.connecting') : t('widget.outlookCalendar.connect')}
            </button>
          </div>
        ) : isLoading ? (
          <><SkeletonGroup/><SkeletonGroup/></>
        ) : status === 'error' ? (
          <div className="sg-cal-empty">
            <span className="sg-cal-empty-icon">⚠</span>
            <span className="sg-cal-empty-text">{t('widget.outlookCalendar.loadError')}</span>
          </div>
        ) : (() => {
          const groups = groupEventsByDay(events, maxDays, showAllDay);
          return groups.length === 0 ? (
            <div className="sg-cal-empty">
              <span className="sg-cal-empty-icon">✓</span>
              <span className="sg-cal-empty-text">{t('widget.outlookCalendar.noUpcomingEvents')}</span>
            </div>
          ) : groups.map(g => (
            <DayGroup
              key={g.dateKey}
              group={g}
              locale={locale}
              todayLabel={t('widget.outlookCalendar.today')}
              tomorrowLabel={t('widget.outlookCalendar.tomorrow')}
              allDayLabel={t('widget.outlookCalendar.allDay')}
            />
          ));
        })()}
      </div>
    </div>
  );
}
