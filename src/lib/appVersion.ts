// Baked in at build time by rspack.config.ts's DefinePlugin (from package.json's
// version) — identical in every build target, including the docs/preview demo
// (sync-preview.js just copies dist/chrome as-is). Shared here since more than
// one component now reads it (Settings footer, widget tour re-trigger).
export const APP_VERSION = (import.meta as any).env.APP_VERSION || '';
