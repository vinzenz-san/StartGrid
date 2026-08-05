import { useRef, useState } from 'react';
import { useWidgets } from '../../contexts/WidgetContext';
import { useGridConfig } from '../../contexts/GridConfigContext';
import { useSettings } from '../../contexts/SettingsContext';
import { GRID_PRESETS, applyPreset } from '../../lib/gridPresets';
import { exportLayout, parseLayoutFile } from '../../lib/layoutShare';
import { SettingsRow, Dropdown, ActionButton } from './Form';
import ConfirmDialog from './ConfirmDialog';
import type { Widget } from '../../types/widget';

export default function LayoutPresets() {
  const { widgets, replaceAllWidgets } = useWidgets();
  const { gridConfig } = useGridConfig();
  const { t } = useSettings();
  const [presetId, setPresetId] = useState(GRID_PRESETS[0].id);
  // Set when a destructive replace-all-widgets action (preset or import) is
  // staged and waiting on the shared confirm dialog below.
  const [pendingWidgets, setPendingWidgets] = useState<Widget[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const options = GRID_PRESETS.map(p => ({ value: p.id, label: t(p.labelKey) }));

  function handleImportFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    parseLayoutFile(file)
      .then(setPendingWidgets)
      .catch(err => setImportError(err instanceof Error ? err.message : 'Unknown error.'));
    e.target.value = '';
  }

  return (
    <>
      <SettingsRow label={t('widgets.presets.sectionLabel')}>
        <Dropdown options={options} value={presetId} onChange={setPresetId} />
      </SettingsRow>
      <ActionButton variant="ghost" onClick={() => setPendingWidgets(applyPreset(presetId, gridConfig.columns))}>
        {t('widgets.presets.apply')}
      </ActionButton>

      <ActionButton variant="ghost" onClick={() => exportLayout(widgets)}>
        {t('widgets.presets.export')}
      </ActionButton>
      <ActionButton variant="ghost" onClick={() => fileInputRef.current?.click()}>
        {t('widgets.presets.import')}
      </ActionButton>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={handleImportFileChange}
      />
      {importError && <p className="sg-form-hint">{importError}</p>}

      <ConfirmDialog
        open={pendingWidgets !== null}
        onClose={() => setPendingWidgets(null)}
        onConfirm={() => {
          if (pendingWidgets) replaceAllWidgets(pendingWidgets);
          setPendingWidgets(null);
        }}
        title={t('widgets.presets.confirmTitle')}
        body={t('widgets.presets.confirmBody')}
        confirmLabel={t('widgets.presets.confirmButton')}
        cancelLabel={t('widgets.presets.cancelButton')}
      />
    </>
  );
}
