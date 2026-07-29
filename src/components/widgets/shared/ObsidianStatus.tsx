import { useSettings } from '../../../contexts/SettingsContext';
import { useObsidian } from '../../../hooks/useObsidian';
import type { ObsidianErrorCode } from '../../../lib/obsidianApi';
import './obsidian.css';

/**
 * The shared not-loaded state for every REST-backed Obsidian widget.
 *
 * `UNREACHABLE` is the interesting one: Obsidian simply not being open is the
 * normal condition for most of the day, so it gets a calm explanatory state
 * rather than an error presentation.
 */

interface Props {
  code: ObsidianErrorCode;
  /** Rendered as the primary action for NOT_FOUND (e.g. "Create today's note"). */
  action?: { label: string; onClick: () => void; disabled?: boolean };
}

export default function ObsidianStatus({ code, action }: Props) {
  const { t } = useSettings();
  const { grantPermission } = useObsidian();

  const icon =
    code === 'UNREACHABLE'  ? '⚡' :
    code === 'NO_PERMISSION' ? '🔒' :
    code === 'UNAUTHORIZED'  ? '🔑' :
    code === 'NOT_FOUND'     ? '📄' :
    code === 'NOT_CONFIGURED' ? '◈' : '⚠';

  const text =
    code === 'UNREACHABLE'    ? t('widget.obsidian.errUnreachable') :
    code === 'NO_PERMISSION'  ? t('widget.obsidian.errNoPermission') :
    code === 'UNAUTHORIZED'   ? t('widget.obsidian.errUnauthorized') :
    code === 'NOT_FOUND'      ? t('widget.obsidian.errNotFound') :
    code === 'NOT_CONFIGURED' ? t('widget.obsidian.errNotConfigured') :
    t('widget.obsidian.errGeneric');

  return (
    <div className="sg-obs-setup">
      <span className="sg-obs-setup-icon">{icon}</span>
      <span className="sg-obs-setup-text">{text}</span>

      {code === 'NO_PERMISSION' && (
        // Straight from the click — see lib/permissions.ts on the Firefox
        // user-gesture constraint.
        <button className="sg-cal-connect-btn" onClick={() => void grantPermission()}>
          {t('widget.obsidian.grantAccess')}
        </button>
      )}

      {action && (
        <button className="sg-cal-connect-btn" onClick={action.onClick} disabled={action.disabled}>
          {action.label}
        </button>
      )}
    </div>
  );
}
