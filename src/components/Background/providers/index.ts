import { BackgroundConfig, BackgroundMode, BackgroundProviderDef, BackgroundRenderCtx } from '../../../types/background';
import { presetProvider } from './preset';
import { colorProvider, gradientProvider } from './color';
import { customProvider } from './custom';
import { unsplashProvider } from './unsplash';

// Cast needed because each provider is typed to its specific config subtype,
// but the registry holds the union — resolveCss is called only when mode matches.
const BACKGROUND_PROVIDERS: Record<BackgroundMode, BackgroundProviderDef> = {
  preset:   presetProvider   as BackgroundProviderDef,
  color:    colorProvider    as BackgroundProviderDef,
  gradient: gradientProvider as BackgroundProviderDef,
  custom:   customProvider   as BackgroundProviderDef,
  unsplash: unsplashProvider as BackgroundProviderDef,
};

export function resolveBackgroundCss(config: BackgroundConfig, ctx: BackgroundRenderCtx): string {
  const provider = BACKGROUND_PROVIDERS[config.mode];
  return provider ? provider.resolveCss(config, ctx) : '#0f1117';
}

export function getProviderLabel(mode: BackgroundMode): string {
  return BACKGROUND_PROVIDERS[mode]?.label ?? mode;
}

export { BACKGROUND_PROVIDERS };
