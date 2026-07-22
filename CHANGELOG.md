# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/). Versioning: SemVer. Minor bumps mark architecture/feature milestones; patch bumps mark fixes/polish within a milestone.

## [1.0.0] — First public release
- Build: version now sourced solely from `package.json`, injected into both manifests at build time
- Build: production builds now minify and drop source maps (`mode` was hardcoded to `development`)
- Security: Google OAuth switched from implicit flow to authorization code + PKCE with refresh tokens, so Google Sign-In no longer expires hourly; token exchange proxied through the existing Cloudflare Worker (Google's Web application client type requires `client_secret` at exchange, which can't live in extension code)
- Removed the Gmail widget: `gmail.readonly` is a Google-classified "restricted" scope requiring an annual paid CASA security assessment, not worth it for this project's scale
- The Calendar widget (Google Sign-In, `calendar.readonly`) is temporarily hidden from the normal Add Widget menu pending OAuth verification — reachable via a hidden Developer Options unlock (tap the app title 7× in Settings) for testing
- Privacy policy updated to disclose bookmarks/tabs access and the Weather widget's geolocation-to-Open-Meteo data flow, previously undocumented
- Widgets: Greeting gains top/bottom alignment (5 options total); Clock gains a full 5-option alignment control (previously none)
- Widgets: new Padding slider in the shared Display Settings panel (Clock, Greeting), 0-48px, default 12px

## [0.11.0] — Release prep: branding, hosting, OAuth submission
- GitHub Pages marketing site, branding icons
- Pin fixed Chrome extension ID via manifest key
- Google Search Console domain verification
- Fix Google token revocation (GET → required POST)
- Homepage copy clarified for OAuth review; meta description/OG tags added

## [0.10.0] — Security: proxied API keys
- Cloudflare Worker proxy for Unsplash and NASA APOD requests
- Removed user-facing Unsplash API key input (no longer needed client-side)

## [0.9.0] — New widgets & polish
- Greeting and Weather widgets
- Clock timezone support, Formatting Settings accordion
- Calendar event details popover, configurable first day of week
- Bookmark search readability fix under low widget opacity

## [0.8.0] — Grid & layout system
- Configurable grid resolution with layout-preserving rescale
- Grid glow overlay, Compact Grid, symmetric widget gaps
- Drag-and-drop cell targeting and Quicklinks/BookmarkFolder alignment fixes
- Floating "Add Widget" button, per-bookmark icon overrides

## [0.7.0] — i18n foundation
- Full localization pass across Settings sidebar, widget registry, Background/Widgets panels

## [0.6.0] — Background provider architecture
- Provider architecture (Unsplash, Bing, Astronomy/APOD, Wikimedia) with env-based API keys
- Adaptive color system unifying widget styling across providers

## [0.5.0] — Settings sidebar redesign
- Settings panel redesigned to full-height, pinnable sidebar with unified architecture
- Theme system rework: local-theme, glow, animated theme toggle, floating control cluster

## [0.4.0] — Bookmark widgets overhaul
- Bookmarks replaced with BookmarkExplorer, then split into Folder and Search widgets
- Custom modal replacing native `window.confirm` for factory reset

## [0.3.0] — Storage architecture
- Hybrid sync storage architecture with developer storage diagnostics
- Profile backup/restore/factory reset

## [0.2.0] — Widget architecture
- Centralized widget registry and atomic form primitives
- Decoupled widget layout into smart floating panel; modular widget header system

## [0.1.0] — Initial scaffold
- Project structure and Google OAuth integration
