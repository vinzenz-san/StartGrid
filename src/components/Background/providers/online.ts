import { OnlineImageConfig, BackgroundProviderDef } from '../../../types/background';

export const onlineImageProvider: BackgroundProviderDef<OnlineImageConfig> = {
  mode: 'online',
  label: 'Online Image',
  panel: 'online',
  resolveCss(config, _ctx) {
    if (!config.value) return '#0f1117';
    // Size/position/repeat come from the shared display controls
    // (Background.tsx's layerStyle), same as every other image-backed
    // provider — just the bare url() here. No fetch relay is needed to
    // *display* a cross-origin image (CSS background-image loading isn't
    // subject to CORS the way fetch/XHR is) — only useBackgroundContrast's
    // canvas pixel-sampling needs the relay, and it already applies to any
    // non-'custom' mode generically.
    return `url("${config.value}")`;
  },
};
