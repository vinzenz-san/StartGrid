import { useEffect, useState, type ReactNode } from 'react';
import { useSettingsPanelOpen } from '../../contexts/SettingsPanelOpenContext';
import { useSettings } from '../../contexts/SettingsContext';
import './DetailedSettings.css';

interface Props {
  children: ReactNode;
  /** Section name substituted into "Open/Close {name} Settings", e.g. 'Formatting'.
   *  Omit for the generic "Open/Close Display Settings" wording. */
  title?: string;
}

/**
 * Nested text-triggered collapsible for advanced/detailed sub-settings within
 * a <PanelSection>. No storage persistence — unlike a top-level <PanelSection>,
 * these shouldn't remember state across sidebar sessions. SettingsPanel never
 * unmounts (only slides via CSS transform), so a plain useState(false) alone
 * only resets on first mount; the sidebar-open flag from context resets it
 * again on every subsequent reopen, without remounting (and re-hydrating
 * from storage) the surrounding PanelSections.
 */
export function DetailedSettings({ children, title }: Props) {
  const sidebarOpen = useSettingsPanelOpen();
  const { t } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(prev => !prev);

  useEffect(() => {
    if (sidebarOpen) setIsOpen(false);
  }, [sidebarOpen]);

  const openLabel  = title ? t('detailedSettings.openNamed', { name: title })  : t('detailedSettings.open');
  const closeLabel = title ? t('detailedSettings.closeNamed', { name: title }) : t('detailedSettings.close');

  return (
    <div className="sg-detailed-settings">
      <div className="sg-detailed-settings-header">
        <button
          className="sg-detailed-settings-trigger"
          onClick={toggle}
          title={isOpen ? t('detailedSettings.hide') : t('detailedSettings.show')}
        >
          {isOpen ? closeLabel : openLabel}
        </button>
      </div>
      <div className={`sg-detailed-settings-collapse${isOpen ? ' sg-detailed-settings-collapse--expanded' : ''}`}>
        <div className="sg-detailed-settings-inner">
          {children}
        </div>
      </div>
    </div>
  );
}
