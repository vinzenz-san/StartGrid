import type { ReactNode } from 'react';
import { useSectionCollapse } from '../../hooks/useSectionCollapse';
import './DetailedSettings.css';

interface Props {
  /** Unique key for browser.storage.local persistence — independent of any parent PanelSection's key. */
  persistenceKey: string;
  children: ReactNode;
}

/**
 * Nested text-triggered collapsible for advanced/detailed sub-settings within
 * a <PanelSection>. Reuses useSectionCollapse for storage-backed persistence,
 * keyed independently so it never collides with the parent section's own key.
 */
export function DetailedSettings({ persistenceKey, children }: Props) {
  const [isOpen, toggle] = useSectionCollapse(`adv:${persistenceKey}`);

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
