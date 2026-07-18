import { CustomImageConfig, BackgroundProviderDef } from '../../../types/background';

export const customProvider: BackgroundProviderDef<CustomImageConfig> = {
  mode: 'custom',
  label: 'Image / GIF',
  panel: 'image',
  resolveCss(config, ctx) {
    if (!ctx.customImageUrl) return '#0f1117';
    const size = (config.scalingMode ?? 'fit') === 'fit' ? 'contain' : 'cover';
    return `url("${ctx.customImageUrl}") center/${size} no-repeat`;
  },
};
