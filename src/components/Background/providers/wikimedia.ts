import { WikimediaConfig, BackgroundProviderDef } from '../../../types/background';

// Placeholder — Wikimedia Commons "Picture of the Day" is not yet wired up.
export const wikimediaProvider: BackgroundProviderDef<WikimediaConfig> = {
  mode: 'wikimedia',
  label: 'Wikimedia Image of the Day',
  panel: 'wikimedia',
  resolveCss(_config, _ctx) {
    return '#0f1117';
  },
};
