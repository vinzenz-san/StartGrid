import { mixHex, darkenHex } from '../../../lib/colorUtils';
import { ColorConfig, BackgroundProviderDef } from '../../../types/background';

function resolveColorCss(config: ColorConfig): string {
  if (config.customColor) {
    const intensity = config.gradientIntensity ?? (config.customGradient === false ? 0 : 100);
    const t = intensity / 100;
    const blendedEnd = mixHex(config.customColor, darkenHex(config.customColor), t);
    return `linear-gradient(135deg, ${config.customColor} 0%, ${blendedEnd} 100%)`;
  }
  return config.value;
}

export const colorProvider: BackgroundProviderDef<ColorConfig> = {
  mode: 'color',
  label: 'Custom Color',
  resolveCss: resolveColorCss,
};

export const gradientProvider: BackgroundProviderDef<ColorConfig> = {
  mode: 'gradient',
  label: 'Gradient',
  resolveCss: resolveColorCss,
};
