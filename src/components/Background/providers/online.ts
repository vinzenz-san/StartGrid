import { OnlineImageConfig, BackgroundProviderDef } from '../../../types/background';

// Placeholder — loading a background from an arbitrary image URL is not yet wired up.
export const onlineImageProvider: BackgroundProviderDef<OnlineImageConfig> = {
  mode: 'online',
  label: 'Online Image',
  panel: 'online',
  resolveCss(_config, _ctx) {
    return '#0f1117';
  },
};
