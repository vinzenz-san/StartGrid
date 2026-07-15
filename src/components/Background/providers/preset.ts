import { mixHex } from '../../../lib/colorUtils';
import { PRESETS, PresetConfig, BackgroundProviderDef, BackgroundRenderCtx } from '../../../types/background';

export function computePresetCss(presetId: string, intensity: number, isDark: boolean): string {
  const preset = PRESETS.find(p => p.id === presetId);
  if (!preset) return '#0f1117';
  const t = Math.max(0, Math.min(100, intensity)) / 100;
  const [startColor, endColor] = isDark
    ? [preset.darkStart, preset.darkEnd]
    : [preset.lightStart, preset.lightEnd];
  const blendedStart = t === 0 ? endColor : mixHex(endColor, startColor, t);
  return `linear-gradient(135deg, ${blendedStart} 0%, ${endColor} 100%)`;
}

export const presetProvider: BackgroundProviderDef<PresetConfig> = {
  mode: 'preset',
  label: 'Presets',
  resolveCss(config, ctx) {
    const intensity = config.gradientIntensity ?? 100;
    return computePresetCss(config.value, intensity, ctx.isDark);
  },
};
