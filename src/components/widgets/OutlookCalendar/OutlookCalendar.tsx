import { useEffect } from 'react';
import type { OutlookCalendarData } from '../../../types/widget';
import { OUTLOOK_CATEGORY_COLORS, DEFAULT_EVENT_COLOR } from './outlookCalendar.types';
import { useOutlookCalendar } from './useOutlookCalendar';
import { useMsAuth } from '../../../hooks/useMsAuth';
import { SettingsRow, SegmentedControl, SettingsSwitch } from '../../shared/Form';
import { useSettings } from '../../../contexts/SettingsContext';
import { LOCALES } from '../../../i18n';
import {
  IconRefresh, IconConnect, IconDisconnect, SkeletonGroup,
  DayGroupView, MonthlyCalendar, groupEventsByDay, formatHeaderDate,
} from '../shared/CalendarCore';
import './OutlookCalendar.css';

function eventColor(colorId?: string): string {
  return colorId ? (OUTLOOK_CATEGORY_COLORS[colorId] ?? DEFAULT_EVENT_COLOR) : DEFAULT_EVENT_COLOR;
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

// ── Settings ──────────────────────────────────────────────────────────────────

interface SettingsProps {
  data: OutlookCalendarData;
  onUpdateData: (patch: Partial<OutlookCalendarData>) => void;
}

export function OutlookCalendarSettings({ data, onUpdateData }: SettingsProps) {
  const { t } = useSettings();
  const maxDays    = data.maxDays    ?? 3;
  const showAllDay = data.showAllDay ?? true;
  const viewMode   = data.viewMode   ?? 'agenda';
  const firstDayOfWeek = data.firstDayOfWeek ?? 0;
  const { isConnected, isConnecting, email, error, connect, disconnect } = useMsAuth();

  return (
    <div className="sg-cal-settings" onClick={e => e.stopPropagation()}>
      <SettingsRow label={t('widget.outlookCalendar.view')}>
        <SegmentedControl
          options={[{ value: 'agenda', label: t('widget.outlookCalendar.viewAgenda') }, { value: 'monthly', label: t('widget.outlookCalendar.viewMonthly') }]}
          value={viewMode}
          onChange={v => onUpdateData({ viewMode: v })}
        />
      </SettingsRow>

      {viewMode === 'monthly' && (
        <SettingsRow label={t('widget.outlookCalendar.firstDayOfWeek')}>
          <SegmentedControl
            options={[{ value: 'sunday', label: t('widget.outlookCalendar.firstDaySunday') }, { value: 'monday', label: t('widget.outlookCalendar.firstDayMonday') }]}
            value={firstDayOfWeek === 1 ? 'monday' : 'sunday'}
            onChange={v => onUpdateData({ firstDayOfWeek: v === 'monday' ? 1 : 0 })}
          />
        </SettingsRow>
      )}

      {viewMode === 'agenda' && (
        <SettingsRow label={t('widget.outlookCalendar.daysAhead')}>
          <div className="sg-cal-slider-wrap">
            <input type="range" min={1} max={28} value={maxDays}
              onChange={e => onUpdateData({ maxDays: Number(e.target.value) })}
              className="sg-cal-slider"/>
            <span className="sg-cal-slider-val">{maxDays}</span>
          </div>
        </SettingsRow>
      )}

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
        ) : viewMode === 'monthly' ? (
          <MonthlyCalendar
            events={events}
            showAllDay={showAllDay}
            locale={locale}
            firstDayOfWeek={firstDayOfWeek}
            prevMonthLabel={t('widget.outlookCalendar.prevMonth')}
            nextMonthLabel={t('widget.outlookCalendar.nextMonth')}
            allDayLabel={t('widget.outlookCalendar.allDay')}
            noEventsLabel={t('widget.outlookCalendar.noEventsForDay')}
            closeAriaLabel={t('widget.outlookCalendar.closeAria')}
            locationLabel={t('widget.outlookCalendar.location')}
            descriptionLabel={t('widget.outlookCalendar.description')}
            eventColor={eventColor}
          />
        ) : (() => {
          const groups = groupEventsByDay(events, maxDays, showAllDay);
          return groups.length === 0 ? (
            <div className="sg-cal-empty">
              <span className="sg-cal-empty-icon">✓</span>
              <span className="sg-cal-empty-text">{t('widget.outlookCalendar.noUpcomingEvents')}</span>
            </div>
          ) : groups.map(g => (
            <DayGroupView
              key={g.dateKey}
              group={g}
              locale={locale}
              todayLabel={t('widget.outlookCalendar.today')}
              tomorrowLabel={t('widget.outlookCalendar.tomorrow')}
              allDayLabel={t('widget.outlookCalendar.allDay')}
              eventColor={eventColor}
            />
          ));
        })()}
      </div>
    </div>
  );
}
