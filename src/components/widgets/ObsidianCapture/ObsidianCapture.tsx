import { useEffect, useRef, useState } from 'react';
import type { ObsidianCaptureData } from '../../../types/widget';
import { SettingsRow, SegmentedControl, SettingsSwitch } from '../../shared/Form';
import { storageLocal } from '../../../lib/storageLocal';
import { useSettings } from '../../../contexts/SettingsContext';
import { buildAppendUri, launchUri } from '../../../lib/obsidianUri';
import {
  DEFAULT_DAILY_TEMPLATE,
  formatDateTokens,
  normalizeVaultPath,
  resolvePathTemplate,
} from '../../../lib/obsidianPath';
import '../shared/obsidian.css';
import './ObsidianCapture.css';

const DEFAULT_TIMESTAMP_FORMAT = 'HH:mm';
const SENT_FLASH_MS = 1600;

// ── Composition ───────────────────────────────────────────────────────────────

/** Turn the textarea contents into the lines that get appended to the note.
 *  Blank lines are dropped rather than bulleted — pasting multi-paragraph text
 *  would otherwise produce a run of empty bullets. */
export function composeCapture(
  text: string,
  opts: { bulletPrefix: boolean; prependTimestamp: boolean; timestampFormat: string },
  now: Date = new Date(),
): string {
  const stamp = opts.prependTimestamp ? `${formatDateTokens(opts.timestampFormat, now)} ` : '';
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, i) => {
      // The timestamp marks the capture, not every line of it, so only the
      // first line carries it — the rest stay aligned underneath.
      const prefix = opts.bulletPrefix ? '- ' : '';
      return i === 0 ? `${prefix}${stamp}${line}` : `${prefix}${line}`;
    })
    .join('\n');
}

/** Resolve the note this widget captures into. */
export function resolveTarget(data: ObsidianCaptureData, now: Date = new Date()): string {
  if ((data.targetMode ?? 'daily') === 'daily') {
    return resolvePathTemplate(data.dailyTemplate || DEFAULT_DAILY_TEMPLATE, now);
  }
  return normalizeVaultPath(data.targetPath ?? '');
}

// ── Settings ──────────────────────────────────────────────────────────────────

interface SettingsProps {
  data:         ObsidianCaptureData;
  onUpdateData: (patch: Partial<ObsidianCaptureData>) => void;
}

export function ObsidianCaptureSettings({ data, onUpdateData }: SettingsProps) {
  const { t } = useSettings();
  const targetMode = data.targetMode ?? 'daily';

  return (
    <div className="sg-obs-settings" onClick={e => e.stopPropagation()}>
      <SettingsRow label={t('widget.obsidianCapture.vaultName')}>
        <input
          className="sg-obs-input"
          placeholder={t('widget.obsidianCapture.vaultPlaceholder')}
          value={data.vaultName ?? ''}
          onChange={e => onUpdateData({ vaultName: e.target.value || undefined })}
          onPointerDown={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          onDragStart={e => e.stopPropagation()}
        />
      </SettingsRow>
      <p className="sg-obs-hint">{t('widget.obsidianCapture.vaultHint')}</p>

      <SettingsRow label={t('widget.obsidianCapture.target')}>
        <SegmentedControl
          options={[
            { value: 'daily', label: t('widget.obsidianCapture.targetDaily') },
            { value: 'file',  label: t('widget.obsidianCapture.targetFile') },
          ]}
          value={targetMode}
          onChange={v => onUpdateData({ targetMode: v as 'daily' | 'file' })}
        />
      </SettingsRow>

      {targetMode === 'daily' ? (
        <>
          <SettingsRow label={t('widget.obsidianCapture.dailyTemplate')}>
            <input
              className="sg-obs-input sg-obs-input--mono"
              placeholder={DEFAULT_DAILY_TEMPLATE}
              value={data.dailyTemplate ?? ''}
              onChange={e => onUpdateData({ dailyTemplate: e.target.value || undefined })}
              onPointerDown={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
              onDragStart={e => e.stopPropagation()}
            />
          </SettingsRow>
          <p className="sg-obs-hint">
            {t('widget.obsidianCapture.templateHint')}{' '}
            <code>{resolveTarget({ ...data, targetMode: 'daily' })}</code>
          </p>
        </>
      ) : (
        <SettingsRow label={t('widget.obsidianCapture.targetPath')}>
          <input
            className="sg-obs-input sg-obs-input--mono"
            placeholder="Inbox.md"
            value={data.targetPath ?? ''}
            onChange={e => onUpdateData({ targetPath: e.target.value || undefined })}
            onPointerDown={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            onDragStart={e => e.stopPropagation()}
          />
        </SettingsRow>
      )}

      <SettingsRow label={t('widget.obsidianCapture.bulletPrefix')}>
        <SettingsSwitch
          checked={data.bulletPrefix ?? true}
          onChange={v => onUpdateData({ bulletPrefix: v })}
        />
      </SettingsRow>

      <SettingsRow label={t('widget.obsidianCapture.timestamp')}>
        <SettingsSwitch
          checked={data.prependTimestamp ?? false}
          onChange={v => onUpdateData({ prependTimestamp: v })}
        />
      </SettingsRow>

      <SettingsRow label={t('widget.obsidianCapture.clearAfterSend')}>
        <SettingsSwitch
          checked={data.clearAfterSend ?? true}
          onChange={v => onUpdateData({ clearAfterSend: v })}
        />
      </SettingsRow>

      <SettingsRow label={t('widget.obsidianCapture.fontSize')}>
        <SegmentedControl
          options={[{ value: 'S', label: 'S' }, { value: 'M', label: 'M' }, { value: 'L', label: 'L' }]}
          value={data.fontSize ?? 'M'}
          onChange={v => onUpdateData({ fontSize: v as 'S' | 'M' | 'L' })}
        />
      </SettingsRow>

    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconSend() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 8h9M7.5 4.5 11 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="m3.5 8.5 3 3 6-7" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────

interface Props {
  data:      ObsidianCaptureData;
  widgetId?: string;
}

export default function ObsidianCapture({ data, widgetId }: Props) {
  const { t } = useSettings();
  const draftKey = widgetId ? `obsidian_capture_draft_${widgetId}` : null;

  const [text,   setText]   = useState('');
  const [sent,   setSent]   = useState(false);
  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const vaultName = data.vaultName?.trim() ?? '';
  const target    = resolveTarget(data);
  const canSend   = text.trim().length > 0 && !!vaultName && !!target;

  // A new tab page remounts constantly — an unsent thought must survive that,
  // so the draft is persisted the same way the Notes widget persists content.
  useEffect(() => {
    if (!draftKey) return;
    storageLocal.get(draftKey).then(stored => {
      if (typeof stored === 'string' && stored) setText(stored);
    });
  }, [draftKey]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (flashTimer.current) clearTimeout(flashTimer.current);
  }, []);

  function persistDraft(value: string) {
    if (!draftKey) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void storageLocal.set(draftKey, value); }, 400);
  }

  function handleChange(value: string) {
    setText(value);
    persistDraft(value);
  }

  function handleSend() {
    if (!canSend) return;

    const content = composeCapture(text, {
      bulletPrefix:     data.bulletPrefix ?? true,
      prependTimestamp: data.prependTimestamp ?? false,
      timestampFormat:  data.timestampFormat || DEFAULT_TIMESTAMP_FORMAT,
    });
    if (!content) return;

    // Leading newline so the append lands on its own line rather than running
    // onto the end of whatever the note currently ends with.
    launchUri(buildAppendUri(vaultName, target, `
${content}`));

    if (data.clearAfterSend ?? true) {
      setText('');
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (draftKey) void storageLocal.remove(draftKey);
    }

    setSent(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSent(false), SENT_FLASH_MS);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Ctrl/Cmd+Enter sends; plain Enter stays a newline so multi-line captures
    // aren't cut short mid-thought.
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!vaultName) {
    return (
      <div className="sg-obs-setup">
        <span className="sg-obs-setup-icon">◈</span>
        <span className="sg-obs-setup-text">{t('widget.obsidianCapture.needsVault')}</span>
      </div>
    );
  }

  const sizeCls = `sg-obsc--${(data.fontSize ?? 'M').toLowerCase()}`;

  return (
    <div className="sg-obsc">
      <textarea
        className={`sg-obsc-input ${sizeCls}`}
        value={text}
        placeholder={t('widget.obsidianCapture.placeholder')}
        spellCheck={false}
        onChange={e => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onPointerDown={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        onDragStart={e => e.stopPropagation()}
      />
      <div className="sg-obsc-footer">
        <span className="sg-obsc-target" title={target}>{target}</span>
        <button
          className={`sg-obsc-send${sent ? ' sg-obsc-send--sent' : ''}`}
          onClick={handleSend}
          disabled={!canSend}
          title={t('widget.obsidianCapture.sendHint')}
          aria-label={t('widget.obsidianCapture.send')}
          onPointerDown={e => e.stopPropagation()}
        >
          {sent ? <IconCheck/> : <IconSend/>}
        </button>
      </div>
    </div>
  );
}
