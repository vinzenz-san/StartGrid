import { useEffect, useState, type ReactNode } from 'react';
import { useSettingsPanelOpen } from '../../contexts/SettingsPanelOpenContext';
import './DetailedSettings.css';

interface Props {
  children: ReactNode;
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
export function DetailedSettings({ children }: Props) {
  const sidebarOpen = useSettingsPanelOpen();
  const [isOpen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(prev => !prev);

  useEffect(() => {
    if (sidebarOpen) setIsOpen(false);
  }, [sidebarOpen]);

  return (
    <div className="sg-detailed-settings">
      <div className="sg-detailed-settings-header">
        <button
          className="sg-detailed-settings-trigger"
          onClick={toggle}
          title={isOpen ? 'Hide advanced settings' : 'Show advanced settings'}
        >
          {isOpen ? 'Close Display Settings' : 'Open Display Settings'}
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
