import { useBackground } from '../../contexts/BackgroundContext';
import { useSettings } from '../../contexts/SettingsContext';
import { PRESETS } from '../../types/background';
import { mixHex, darkenHex } from '../../lib/colorUtils';
import './Background.css';

function computePresetBg(presetId: string, intensity: number, isDark: boolean): string {
  const preset = PRESETS.find(p => p.id === presetId);
  if (!preset) return '#0f1117';
  const t = Math.max(0, Math.min(100, intensity)) / 100;
  const [startColor, endColor] = isDark
    ? [preset.darkStart, preset.darkEnd]
    : [preset.lightStart, preset.lightEnd];
  const blendedStart = t === 0 ? endColor : mixHex(endColor, startColor, t);
  return `linear-gradient(135deg, ${blendedStart} 0%, ${endColor} 100%)`;
}

export default function Background() {
  const { backgroundCss, config } = useBackground();
  const { colorScheme } = useSettings();
  const dimAmount = config.dimAmount ?? 0;
  const isFit = config.mode === 'custom' && (config.scalingMode ?? 'fit') === 'fit';

  const intensity = config.gradientIntensity ?? (config.customGradient === false ? 0 : 100);

  let resolvedBg: string;
  if (config.mode === 'preset') {
    resolvedBg = computePresetBg(config.value, intensity, colorScheme !== 'light');
  } else if ((config.mode === 'color' || config.mode === 'gradient') && config.customColor) {
    const t = intensity / 100;
    const blendedEnd = mixHex(config.customColor, darkenHex(config.customColor), t);
    resolvedBg = `linear-gradient(135deg, ${config.customColor} 0%, ${blendedEnd} 100%)`;
  } else {
    resolvedBg = backgroundCss;
  }

  return (
    <>
      {isFit && (
        <div
          className="sg-background-letterbox"
          style={{ background: config.letterboxColor ?? '#000000' }}
        />
      )}
      <div className="sg-background" style={{ background: resolvedBg }} />
      {dimAmount > 0 && (
        <div className="sg-background-dim" style={{ opacity: dimAmount }} />
      )}
    </>
  );
}
