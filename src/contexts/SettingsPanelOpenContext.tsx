import { createContext, useContext } from 'react';

// Lets a deeply-nested <DetailedSettings> instance know when the Settings
// Sidebar transitions open, without prop-drilling `isOpen` through every
// intermediate component (BackgroundEditor, UnsplashSettings, ...) or forcing
// the whole sidebar content tree to remount (which would re-hydrate every
// persisted <PanelSection> from storage mid-transition — a visible flash).
export const SettingsPanelOpenContext = createContext(false);

export function useSettingsPanelOpen(): boolean {
  return useContext(SettingsPanelOpenContext);
}
