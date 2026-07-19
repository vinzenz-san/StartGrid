import { useEffect } from 'react';
import type { GmailData, GmailMessage } from './gmail.types';
import { useGmail } from './useGmail';
import { useGoogleAuth } from '../../../hooks/useGoogleAuth';
import { SettingsRow, SettingsSwitch, SettingsSlider, ActionButton } from '../../shared/Form';
import { useSettings } from '../../../contexts/SettingsContext';
import './Gmail.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseSender(from: string): string {
  const match = from.match(/^(.+?)\s*<[^>]+>$/);
  return match ? match[1].trim() : from;
}

function formatRelativeTime(iso: string, nowLabel: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return nowLabel;
  if (mins  < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

// ── SVG icons ─────────────────────────────────────────────────────────────────

function IconRefresh({ spinning }: { spinning: boolean }) {
  return (
    <svg className={`sg-gm-icon-refresh${spinning ? ' spinning' : ''}`}
      viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <polyline points="15,2.5 15,6.5 11,6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.7 10a6 6 0 1 1-1.4-6.2L15 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

function IconGmail() {
  return (
    <svg className="sg-gm-logo-icon" viewBox="0 0 20 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="20" height="16" rx="2" fill="#EA4335"/>
      <polyline points="1,1 10,9 19,1" fill="none" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  );
}

function IconConnect() {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ width: 14, height: 14, flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function IconDisconnect() {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ width: 14, height: 14, flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M5 8h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="sg-gm-skeleton-row">
      <div className="sg-gm-skeleton sg-gm-skeleton--sender" />
      <div className="sg-gm-skeleton sg-gm-skeleton--subject" />
      <div className="sg-gm-skeleton sg-gm-skeleton--snippet" />
    </div>
  );
}

// ── Email row ─────────────────────────────────────────────────────────────────

function EmailRow({ email, showSnippet }: { email: GmailMessage; showSnippet: boolean }) {
  const { t } = useSettings();
  return (
    <a className={`sg-gm-row${email.isUnread ? ' sg-gm-row--unread' : ''}`}
      href={`https://mail.google.com/mail/u/0/#inbox/${email.threadId}`}
      title={`${parseSender(email.from)} — ${email.subject}`}>
      {email.isUnread && <span className="sg-gm-unread-dot" aria-label={t('widget.gmail.unreadAria')} />}
      <div className="sg-gm-row-main">
        <div className="sg-gm-row-top">
          <span className="sg-gm-sender">{parseSender(email.from)}</span>
          <span className="sg-gm-time">{formatRelativeTime(email.date, t('widget.gmail.relativeNow'))}</span>
        </div>
        <span className="sg-gm-subject">{email.subject}</span>
        {showSnippet && email.snippet && <span className="sg-gm-snippet">{email.snippet}</span>}
      </div>
    </a>
  );
}

// ── Settings ──────────────────────────────────────────────────────────────────

interface SettingsProps {
  data: GmailData;
  onUpdateData: (patch: Partial<GmailData>) => void;
}

export function GmailSettings({ data, onUpdateData }: SettingsProps) {
  const { t } = useSettings();
  const maxEmails    = data.maxEmails    ?? 5;
  const showSnippets = data.showSnippets ?? true;
  const { isConnected, isConnecting, email, error, connect, disconnect } = useGoogleAuth();

  return (
    <div className="sg-gm-settings" onClick={e => e.stopPropagation()}>
      <SettingsSlider
        label={t('widget.gmail.maxEmails')}
        min={5} max={30} step={1}
        value={maxEmails}
        onChange={v => onUpdateData({ maxEmails: v })}
        valueFormatter={v => String(v)}
      />

      <SettingsRow label={t('widget.gmail.showSnippets')}>
        <SettingsSwitch checked={showSnippets} onChange={v => onUpdateData({ showSnippets: v })} />
      </SettingsRow>

      <div className="sg-gm-settings-divider" />

      <div className="sg-gm-settings-section">
        <span className="sg-gm-settings-label">{t('widget.gmail.googleAccount')}</span>
        {isConnected ? (
          <>
            {email && <p className="sg-gm-account-email">{email}</p>}
            <ActionButton
              variant="danger"
              cooldownTime={1}
              onClick={disconnect}
            >
              <IconDisconnect /> {t('widget.gmail.disconnect')}
            </ActionButton>
          </>
        ) : (
          <>
            <button className="sg-gm-connect-btn" onClick={connect} disabled={isConnecting}>
              <IconConnect /> {isConnecting ? t('widget.gmail.connecting') : t('widget.gmail.connect')}
            </button>
            {error && <p className="sg-gm-connect-error">{error}</p>}
            <p className="sg-gm-connect-note">{t('widget.gmail.grantNote')}</p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────

interface Props {
  data: GmailData;
  onUpdateData: (patch: Partial<GmailData>) => void;
}

export default function Gmail({ data, onUpdateData: _onUpdateData }: Props) {
  const { t } = useSettings();
  const { status, emails, unreadCount, refresh } = useGmail();
  const { isConnected, connect, isConnecting } = useGoogleAuth();
  const maxEmails    = data.maxEmails    ?? 5;
  const showSnippets = data.showSnippets ?? true;

  useEffect(() => { refresh(maxEmails); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(maxEmails); }, [isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading     = status === 'idle' || status === 'loading';
  const isUnauthed    = status === 'unauthenticated';
  const visibleEmails = emails.slice(0, maxEmails);

  return (
    <div className="sg-gm">
      <div className="sg-gm-header">
        <div className="sg-gm-title">
          <IconGmail />
          <span>{t('widget.gmail.title')}</span>
          {!isLoading && !isUnauthed && unreadCount > 0 && <span className="sg-gm-badge">{unreadCount}</span>}
          {!isLoading && !isUnauthed && unreadCount === 0 && status === 'success' && <span className="sg-gm-badge sg-gm-badge--zero">0</span>}
        </div>
        <button className="sg-gm-refresh" onClick={() => refresh(maxEmails)}
          disabled={isLoading || isUnauthed} title={t('widget.gmail.refresh')} aria-label={t('widget.gmail.refreshAria')}>
          <IconRefresh spinning={isLoading} />
        </button>
      </div>
      <div className="sg-gm-body">
        {isUnauthed ? (
          <div className="sg-gm-empty">
            <IconGmail />
            <span className="sg-gm-empty-text">{t('widget.gmail.connectPrompt')}</span>
            <button className="sg-gm-connect-btn" onClick={connect} disabled={isConnecting}>
              <IconConnect /> {isConnecting ? t('widget.gmail.connecting') : t('widget.gmail.connect')}
            </button>
          </div>
        ) : isLoading ? (
          Array.from({ length: maxEmails }).map((_, i) => <SkeletonRow key={i} />)
        ) : status === 'error' ? (
          <div className="sg-gm-empty">
            <span className="sg-gm-empty-icon">⚠</span>
            <span className="sg-gm-empty-text">{t('widget.gmail.loadError')}</span>
          </div>
        ) : visibleEmails.length === 0 ? (
          <div className="sg-gm-empty">
            <span className="sg-gm-empty-icon">✓</span>
            <span className="sg-gm-empty-text">{t('widget.gmail.allCaughtUp')}</span>
          </div>
        ) : (
          visibleEmails.map(email => <EmailRow key={email.id} email={email} showSnippet={showSnippets} />)
        )}
      </div>
    </div>
  );
}
