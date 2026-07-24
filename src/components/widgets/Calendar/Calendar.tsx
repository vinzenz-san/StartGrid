import { useEffect } from 'react';
import type { CalendarData } from './calendar.types';
import { GCAL_COLORS, DEFAULT_EVENT_COLOR } from './calendar.types';
import { useCalendar } from './useCalendar';
import { useGoogleAuth } from '../../../hooks/useGoogleAuth';
import { SettingsRow, SegmentedControl, SettingsSwitch } from '../../shared/Form';
import { useSettings } from '../../../contexts/SettingsContext';
import { LOCALES } from '../../../i18n';
import {
  IconRefresh, IconConnect, IconDisconnect, SkeletonGroup,
  DayGroupView, MonthlyCalendar, groupEventsByDay, formatHeaderDate,
} from '../shared/CalendarCore';
import './Calendar.css';

function eventColor(colorId?: string): string {
  return colorId ? (GCAL_COLORS[colorId] ?? DEFAULT_EVENT_COLOR) : DEFAULT_EVENT_COLOR;
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
  const firstDayOfWeek = data.firstDayOfWeek ?? 0;
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

      {viewMode === 'monthly' && (
        <SettingsRow label={t('widget.calendar.firstDayOfWeek')}>
          <SegmentedControl
            options={[{ value: 'sunday', label: t('widget.calendar.firstDaySunday') }, { value: 'monday', label: t('widget.calendar.firstDayMonday') }]}
            value={firstDayOfWeek === 1 ? 'monday' : 'sunday'}
            onChange={v => onUpdateData({ firstDayOfWeek: v === 'monday' ? 1 : 0 })}
          />
        </SettingsRow>
      )}

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
  const firstDayOfWeek = data.firstDayOfWeek ?? 0;

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
            firstDayOfWeek={firstDayOfWeek}
            prevMonthLabel={t('widget.calendar.prevMonth')}
            nextMonthLabel={t('widget.calendar.nextMonth')}
            allDayLabel={t('widget.calendar.allDay')}
            noEventsLabel={t('widget.calendar.noEventsForDay')}
            closeAriaLabel={t('widget.calendar.closeAria')}
            locationLabel={t('widget.calendar.location')}
            descriptionLabel={t('widget.calendar.description')}
            eventColor={eventColor}
          />
        ) : (() => {
          const groups = groupEventsByDay(events, maxDays, showAllDay);
          return groups.length === 0 ? (
            <div className="sg-cal-empty">
              <span className="sg-cal-empty-icon">✓</span>
              <span className="sg-cal-empty-text">{t('widget.calendar.noUpcomingEvents')}</span>
            </div>
          ) : groups.map(g => (
            <DayGroupView
              key={g.dateKey}
              group={g}
              locale={locale}
              todayLabel={t('widget.calendar.today')}
              tomorrowLabel={t('widget.calendar.tomorrow')}
              allDayLabel={t('widget.calendar.allDay')}
              eventColor={eventColor}
            />
          ));
        })()}
      </div>
    </div>
  );
}
