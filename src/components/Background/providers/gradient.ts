import { ColourGradientConfig, BackgroundProviderDef } from '../../../types/background';

// Placeholder — dedicated multi-stop colour gradient editor is not yet wired up.
// Distinct from the existing 'gradient' mode in color.ts, which is the
// auto-generated gradient behind the Colors tab's custom-color swatch.
export const colourGradientProvider: BackgroundProviderDef<ColourGradientConfig> = {
  mode: 'colourGradient',
  label: 'Colour Gradient',
  panel: 'gradient',
  resolveCss(_config, _ctx) {
    return '#0f1117';
  },
};
