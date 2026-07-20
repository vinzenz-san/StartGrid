// Orchestrates a grid-dimension/resolution change: captures the current
// (soon-to-be "old") GridConfig, runs the pure rescaleWidgets transform
// against the current widget layout, and commits both the new config and
// the rescaled widgets. Lives here (rather than inside GridConfigContext)
// so GridConfigContext itself stays free of a WidgetContext dependency —
// this hook is the one place both contexts need to be read together.
//
// Note on atomicity: gridConfig and widgets are two separate browser.storage
// keys (via useStorage), so this is not a single atomic write — calling
// replaceAllWidgets() and setGridConfig() back-to-back issues two writes in
// quick succession. A reload landing in the gap between them is a real,
// accepted edge case (see the architecture discussion this implements),
// not something this hook attempts to fully solve.
import { useGridConfig } from '../contexts/GridConfigContext';
import { useWidgets } from '../contexts/WidgetContext';
import { rescaleWidgets } from '../lib/gridRescale';
import type { GridConfig } from '../types/grid';

export function useApplyGridConfig() {
  const { gridConfig, setGridConfig } = useGridConfig();
  const { widgets, replaceAllWidgets } = useWidgets();

  const applyGridConfig = (next: GridConfig) => {
    const rescaled = rescaleWidgets(widgets, gridConfig, next);
    replaceAllWidgets(rescaled);
    setGridConfig(next);
  };

  return { gridConfig, applyGridConfig };
}
