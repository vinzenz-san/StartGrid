import { useEffect } from 'react';
import type { GmailData, GmailMessage } from './gmail.types';
import { useGmail } from './useGmail';
import { useGoogleAuth } from '../../../hooks/useGoogleAuth';
import './Gmail.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseSender(from: string): string {
  const match = from.match(/^(.+?)\s*<[^>]+>$/);
  return match ? match[1].trim() : from;
}

function formatRelativeTime(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return 'now';
  if (mins  < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

// ── SVG icons ─────────────────────────────────────────────────────────────────

function IconRefresh({ spinning }: { spinning: boolean }) {
  return (
    <svg className={`sg-gm-icon-refresh${spinning ? ' spinning' : ''}`}
      viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <polyline points="15,2.5 15,6.5 11,6.5" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.7 10a6 6 0 1 1-1.4-6.2L15 6.5" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

function IconGmail() {
  return (
    <svg className="sg-gm-logo-icon" viewBox="0 0 20 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="20" height="16" rx="2" fill="#EA4335"/>
      <polyline points="1,1 10,9 19,1" fill="none" stroke="white" strokeWidth="1.8"
        strokeLinejoin="round"/>
    </svg>
  );
}

function IconConnect() {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
      style={{ width: 14, height: 14, flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function IconDisconnect() {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
      style={{ width: 14, height: 14, flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M5 8h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

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

interface EmailRowProps { email: GmailMessage; showSnippet: boolean; }

function EmailRow({ email, showSnippet }: EmailRowProps) {
  const sender = parseSender(email.from);
  const time   = formatRelativeTime(email.date);
  return (
    <a
      className={`sg-gm-row${email.isUnread ? ' sg-gm-row--unread' : ''}`}
      href={`https://mail.google.com/mail/u/0/#inbox/${email.threadId}`}
      title={`${sender} — ${email.subject}`}
    >
      {email.isUnread && <span className="sg-gm-unread-dot" aria-label="Unread" />}
      <div className="sg-gm-row-main">
        <div className="sg-gm-row-top">
          <span className="sg-gm-sender">{sender}</span>
          <span className="sg-gm-time">{time}</span>
        </div>
        <span className="sg-gm-subject">{email.subject}</span>
        {showSnippet && email.snippet && (
          <span className="sg-gm-snippet">{email.snippet}</span>
        )}
      </div>
    </a>
  );
}

// ── Settings panel ────────────────────────────────────────────────────────────

interface SettingsProps {
  data: GmailData;
  onUpdateData: (patch: Partial<GmailData>) => void;
}

export function GmailSettings({ data, onUpdateData }: SettingsProps) {
  const maxEmails    = data.maxEmails   ?? 5;
  const showSnippets = data.showSnippets ?? true;
  const { isConnected, isConnecting, email, error, connect, disconnect } = useGoogleAuth();

  return (
    <div className="sg-gm-settings" onClick={e => e.stopPropagation()}>

      <div className="sg-gm-settings-row">
        <label className="sg-gm-settings-label" htmlFor="sg-gm-max">Max emails</label>
        <div className="sg-gm-slider-wrap">
          <input id="sg-gm-max" type="range" min={3} max={10} value={maxEmails}
            onChange={e => onUpdateData({ maxEmails: Number(e.target.value) })}
            className="sg-gm-slider" />
          <span className="sg-gm-slider-val">{maxEmails}</span>
        </div>
      </div>

      <div className="sg-gm-settings-row">
        <span className="sg-gm-settings-label">Show snippets</span>
        <button
          role="switch" aria-checked={showSnippets}
          className={`sg-gm-switch${showSnippets ? ' sg-gm-switch--on' : ''}`}
          onClick={() => onUpdateData({ showSnippets: !showSnippets })}
        >
          <span className="sg-gm-switch-thumb" />
        </button>
      </div>

      <div className="sg-gm-settings-divider" />

      <div className="sg-gm-settings-section">
        <span className="sg-gm-settings-label">Google Account</span>

        {isConnected ? (
          <>
            {email && <p className="sg-gm-account-email">{email}</p>}
            <button className="sg-gm-connect-btn sg-gm-connect-btn--disconnect"
              onClick={disconnect}>
              <IconDisconnect />
              Disconnect account
            </button>
          </>
        ) : (
          <>
            <button className="sg-gm-connect-btn" onClick={connect}
              disabled={isConnecting}>
              <IconConnect />
              {isConnecting ? 'Connecting…' : 'Connect Google Account'}
            </button>
            {error && <p className="sg-gm-connect-error">{error}</p>}
            <p className="sg-gm-connect-note">
              Grants read-only access to your Gmail inbox.
            </p>
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
  const { status, emails, unreadCount, refresh } = useGmail();
  const { isConnected } = useGoogleAuth();

  const maxEmails    = data.maxEmails   ?? 5;
  const showSnippets = data.showSnippets ?? true;

  useEffect(() => { refresh(maxEmails); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(maxEmails); }, [isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading      = status === 'idle' || status === 'loading';
  const isUnauthed     = status === 'unauthenticated';
  const visibleEmails  = emails.slice(0, maxEmails);

  return (
    <div className="sg-gm">

      <div className="sg-gm-header">
        <div className="sg-gm-title">
          <IconGmail />
          <span>Gmail</span>
          {!isLoading && !isUnauthed && unreadCount > 0 && (
            <span className="sg-gm-badge">{unreadCount}</span>
          )}
          {!isLoading && !isUnauthed && unreadCount === 0 && status === 'success' && (
            <span className="sg-gm-badge sg-gm-badge--zero">0</span>
          )}
        </div>
        <button className="sg-gm-refresh" onClick={() => refresh(maxEmails)}
          disabled={isLoading || isUnauthed} title="Refresh" aria-label="Refresh emails">
          <IconRefresh spinning={isLoading} />
        </button>
      </div>

      <div className="sg-gm-body">
        {isUnauthed ? (
          <div className="sg-gm-empty">
            <IconGmail />
            <span className="sg-gm-empty-text">
              Connect your Google Account in ⚙ settings to see your inbox.
            </span>
          </div>
        ) : isLoading ? (
          Array.from({ length: maxEmails }).map((_, i) => <SkeletonRow key={i} />)
        ) : status === 'error' ? (
          <div className="sg-gm-empty">
            <span className="sg-gm-empty-icon">⚠</span>
            <span className="sg-gm-empty-text">Could not load emails</span>
          </div>
        ) : visibleEmails.length === 0 ? (
          <div className="sg-gm-empty">
            <span className="sg-gm-empty-icon">✓</span>
            <span className="sg-gm-empty-text">All caught up!</span>
          </div>
        ) : (
          visibleEmails.map(email => (
            <EmailRow key={email.id} email={email} showSnippet={showSnippets} />
          ))
        )}
      </div>

    </div>
  );
}
