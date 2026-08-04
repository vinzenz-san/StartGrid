# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/). Versioning: SemVer. Minor bumps mark architecture/feature milestones; patch bumps mark fixes/polish within a milestone.

## [1.7.0] — Background weather effect (rain/snow)

- New optional **background weather effect**: animated rain or snow rendered behind the widget grid, driven by live weather at its own independently-set location (Settings → Settings, right after Disable Background Blur — not tied to any Weather widget instance, so it works with zero or several on the dashboard). Off by default
- Rendered via small sprite textures blitted onto a canvas rather than procedural shapes — cheap and crisp regardless of particle count. Other conditions (clear, clouds, fog, thunderstorm) currently render nothing; only rain and snow are implemented
- Auto-plays for ~10s after a new tab opens, fading in and back out, rather than running as a persistent always-on animation — pauses entirely while the tab is hidden and is skipped outright under `prefers-reduced-motion`
- Developer Options gains a "Force Weather Effect" override to preview rain/snow instantly without waiting on real weather or wiring up a location

## [1.6.14] — Weather overhaul, slider reset buttons, calendar/search polish

- Weather widget: condition/feels-like/location text now uses the primary `--text` color instead of `--text-muted`, matching the temperature number and making the light/dark theme switch actually visible (previously two similar grays made it look unchanged); new **Alignment** setting (left/center/right/top/bottom, top/bottom correctly centering on the cross-axis rather than pinning to a corner); new **Display Settings** panel (Font Size/Scale/Rotation/Padding), with icon/condition/feels-like/location sizes scaling proportionally off the Font Size slider; location display now shows only the city name (full "City, State, Country" is kept for the settings-panel search results); gains the same opt-in **"Allow overflow"** toggle as Clock/Greeting (see 1.6.13), and feels-like/location no longer ellipsis-truncate while overflowing
- `SettingsSlider` gains an optional reset button (small ↺ icon, dimmed once at default) — wired up for Font Size/Scale/Rotation/Padding (Display Settings) and the font outline-size slider
- Bookmark Search: opt-in **"Fall back to Google search"** — when no bookmark matches, Enter or a results-panel button opens a Google search for the query in a new tab. The "autofocus on new tab" toggle added in 1.6.13 was removed again after confirming it can't reliably work — the browser keeps focus in the address bar on a fresh tab — so the dead toggle/effect are gone rather than left inert
- Calendar/OutlookCalendar now default to **Monday** as first day of week (was Sunday) for anyone who hasn't explicitly changed the setting — the Sunday/Monday toggle itself already existed

## [1.6.13] — Settings-button slide-in, per-widget overflow toggle

- Settings gear button no longer gets covered by the Settings sidebar when it opens on the same side (`top-left`/`bottom-left`/etc.) — the control cluster now shifts clear of the panel in sync with its open/close transition, instead of sitting underneath it
- New opt-in **"Allow overflow"** toggle on Clock and Greeting — lets text spill past the widget's own box instead of being clipped (e.g. a large clock font bleeding into the grid's dead space). Overflowing widgets are never given their own `z-index`; instead every *other* widget is raised above the default stacking level, so overflow reliably renders behind neighbors regardless of DOM order (an earlier attempt lowering the overflowing widget itself broke its own gear button's click-through)
- Greeting gains a **"Single line (no wrap)"** toggle (shown once overflow is on), so a long greeting can spill sideways instead of wrapping
- Bookmark Search gains an "autofocus on new tab" toggle (**removed again in 1.6.14** — see that entry)

## [1.6.12] — Settings UI: dropdown unification, button-position/theme pickers, row-width alignment

- Every remaining "options" picker built as a hand-rolled `SegmentedControl` (BookmarkFolder/Quicklinks Layout, Weather units, Clock format, Notes storage, ObsidianRandom refresh mode, ObsidianCapture target, Calendar/OutlookCalendar view + first-day-of-week, FontSettingsPanel outline style, and the Background editor's Date mode + Gradient type) is now a shared `Dropdown`, matching Alignment/Sort order/Timezone-style controls elsewhere in the same panels
- Global Settings → Button Position is now a `Dropdown` (arrow + label) instead of the 6-button `DirectionPicker` grid — the grid's own box height didn't follow `--sg-control-h`, so it visibly threw off row-to-row spacing in the sidebar. `DirectionPicker` had no other consumers and was deleted along with its CSS
- Global Settings → Global Theme is now a Dark/Light `Dropdown` instead of the pill `ThemeToggle` switch (same root cause — the toggle's 28px box didn't match `--sg-control-h`). The toggle's dip-to-dark fade transition was pulled out into a shared `runThemeTransition` helper (`lib/themeTransition.ts`) so both this dropdown and the two remaining `ThemeToggle` instances (top-bar cluster, per-widget local override) trigger the identical effect from one place instead of duplicating it
- `.bg-color-swatch` (accent-color swatch, letterbox-color swatches, gradient from/to swatches) shrunk from 36×28px to a `var(--sg-control-h)` square everywhere it's used, for the same row-alignment reason
- Every `Dropdown`/`SegmentedControl` control inside a `SettingsRow` now gets a shared `width: 50%` (`Form.css`), so a panel's controls line up at a consistent right edge instead of each sizing to its own content
- Background editor's Position row (Image, Online Image, Bing, Astronomy, Unsplash, Wikimedia) moved from a bespoke stacked `bg-position-row` layout (label above a full-width dropdown) onto the standard `SettingsRow`, consistent with every other row in the same panels; the now-unused `.bg-position-row` CSS was removed
- Removed dead `.sg-cal-seg`/`.sg-cal-seg-btn` CSS in `Calendar.css` — an orphaned, unreferenced segmented-control implementation predating the shared `SegmentedControl` component

## [1.6.11] — Multi-calendar support for Google Calendar and Outlook Calendar

- Both calendar widgets previously only ever fetched the account's single default calendar (Google's `primary` alias / Outlook's `/me/calendarView`), with no way to see events from any secondary calendar (e.g. a custom Google calendar like "Birthdays" or a shared Outlook calendar). Settings now gain a **"My Calendars"** checkbox list (shown once connected) listing every calendar on the account, colored to match each calendar's own color from the provider — same interaction as Google/Outlook's own native calendar UI
- `CalendarData`/`OutlookCalendarData` gain a `calendarIds?: string[]` field (default `['primary']` / `['default']`, i.e. unchanged behavior for existing installs). Both hooks now fetch events per selected calendar ID in parallel via `Promise.all`, merge, and sort by start time, instead of a single fixed-calendar request
- Event color resolution now falls back to the *source calendar's* color (Google's `calendarList.backgroundColor`, Outlook's `hexColor`) when an event has no explicit per-event color (`colorId`/category) — previously any event without its own color rendered in one flat default color regardless of which calendar it came from. Added via a new shared `calendarColor` field on the provider-agnostic `CalendarEvent` type (`shared/calendarEvent.types.ts`)
- `CalendarCore.tsx`'s shared `eventColor` callback prop changed signature from `(colorId?: string) => string` to `(event: CalendarEvent) => string`, since the calendar-color fallback needs the whole event, not just its `colorId`. Updated in both widgets — Outlook Calendar's own callback is otherwise behavior-unchanged
- No new OAuth scopes needed for either provider — Google's existing `calendar.readonly` already covers `calendarList`/non-primary calendars, and Outlook's existing `Calendars.Read` already covers `/me/calendars`/secondary calendars

## [1.6.10] — Glass effect slider, shadow intensity rework, settings UI consistency

- Added a **Glass Effect** slider, both global (Settings → Appearance) and per-widget (Local Style) — previously the frosted/blur look was implicitly tied to the Transparency slider and only rendered in light mode. Now controlled independently via its own `--widget-glass` CSS variable (default 0, no effect) and applies identically in dark mode too. The shared `backdrop-filter` formula also gained a `brightness()` term so the blur/saturate boost stays visible against dark mode's low-chroma backgrounds, which `saturate()` alone had nothing to work with
- Fixed Shadow Intensity doing nothing in light mode — the light-theme `box-shadow` was hardcoded and never actually read `--widget-shadow-opacity`, unlike the dark-theme rule. Both themes now use one identical formula
- Reworked the shadow curve: raw linear alpha was dominated by the top half of the slider's range, making 0-50% look nearly identical. Now eased via a squared `--widget-shadow-factor`, with a higher ceiling so cranking the slider reads as a real, visible shadow instead of a faint alpha shift
- Settings UI: found and fixed two controls that had drifted from the shared `SegmentedControl`/`Dropdown` components — BookmarkFolder's "Sort order" and Quicklinks' per-link icon-source picker were both hand-rolled native `<select>` elements at a smaller font-size than every other control in the same panel (this is also what fixed Quicklinks' icon-source popup ignoring dark mode, a bug noted but not fixed in 1.6.6). Added shared `.sg-form-input`/`.sg-form-hint` primitives (`Form.css`) and migrated the copy-pasted, hand-typed px values in BookmarkFolder, Quicklinks, Calendar (+ OutlookCalendar/OutlookMail), the five Obsidian widgets' shared chrome, Greeting, and Weather onto the same `rem`-based tokens the rest of the settings UI already used

## [1.6.9] — Continuous icon/text size sliders

- Quicklinks: adding a link no longer blindly prepends `https://` to any URL missing a recognized internal scheme — now any existing scheme (`file:`, `ftp:`, etc.) is left untouched, only bare domains/IPs get `https://` added. `file:` links now also open via the `browser.tabs` API path (like `about:`/`chrome:`) instead of a plain anchor, since Firefox blocks direct anchor navigation to `file://` from extension pages. `javascript:`/`data:` links are rejected with an alert
- `iconSize`/`textSize`/`fontSize` changed from a discrete `'S'|'M'|'L'` (or `'small'|'medium'|'large'`) string enum to a free `number` (px) across all 7 fields that used it: Quicklinks, BookmarkFolder (icon + text size), Notes, ObsidianCapture, ObsidianDaily, ObsidianNote, ObsidianRandom (font size). Each is now a continuous slider — icon size 18-48px (step 2, default 30px), text/font size 9-20px (step 1, default 13px) — instead of 3 fixed stops
- Icon box, favicon/image size, and grid/row tile width now scale proportionally from the raw px value (`iconImgPx`/`iconTilePx` helpers in `Quicklinks.tsx`/`BookmarkFolder.tsx`) instead of switching between 3 fixed CSS classes; removed the now-dead `.sg-*--small/medium/large` and `.sg-*--s/m/l` CSS across 7 widgets
- No migration for existing saved `'S'`/`'medium'`/etc. values — by design, per explicit decision. A widget with a legacy string still in storage renders with an invalid inline style until its slider is touched
- Built and then removed a `StepSlider` component (snapped discrete-option slider) — briefly used to convert the old segmented S/M/L pickers to sliders while keeping the enum data model, before the numeric-value approach above was chosen instead. Zero remaining consumers, so it and its CSS were deleted rather than left as unused shared code

## [1.6.8] — Widget settings row-gap fix, ESLint guard against future drift

- Clock, Greeting, and Weather's settings wrapper is `display: contents` (no box of its own), so unlike every other widget they got no `gap` between rows — only each row's own 4px padding, making their settings panels visibly more cramped than Calendar/BookmarkFolder/Quicklinks/Notes/Obsidian's 18px (padding + gap) row spacing. Moved `gap: 10px` onto the shared `.sg-widget-settings-content` wrapper (`WidgetContainer.css`) instead of each widget's own settings root, so `display: contents` widgets inherit it directly and widgets with their own flex+gap wrapper render as a single child here (no doubling up)
- `.sg-form-label` now sets `line-height: var(--sg-control-h)` — without an integer line-height, centering the label's fractional-height text box inside a row could round to a different device pixel depending on the row's cumulative Y-position, causing a 1px jitter between otherwise-identical rows (most visible on Switch rows)
- Added an ESLint rule (`eslint.config.mjs`, scoped to `src/components/widgets/**`) banning raw `<input type="range">` in favor of the shared `<SettingsSlider>` — runs in CI (`ci.yml`) on every push/PR, so a future widget reintroducing a bespoke slider (the root cause of this whole alignment audit) fails the build automatically instead of only surfacing in review. Calendar/OutlookCalendar/OutlookMail's existing raw sliders are grandfathered in with an explained `eslint-disable-next-line`, not yet migrated

## [1.6.7] — Widget settings row alignment consistency

- Every widget settings panel's horizontal inset was inconsistent — Quicklinks, BookmarkFolder, BookmarkSearch, Calendar (and OutlookCalendar/OutlookMail, which share its CSS), and Notes/Obsidian widgets each hardcoded their own `10px` padding, while Clock, Greeting, Weather, and the rest of the Obsidian widgets had **none at all**, leaving their rows (and nested Font/Display-settings sliders) flush against the panel edge. Moved this padding to one shared wrapper, `.sg-widget-settings-content` (`WidgetContainer.tsx`/`.css`), around every widget's `renderSettings` output, and stripped the now-redundant per-widget copies — matches the `10%` inset already used by the Local Style section below it
- Added `--sg-control-h` (`index.css:root`) as the single source of truth for every inline settings-row control's height. `SegmentedControl`, `SettingsSwitch`, and the `Dropdown` trigger (all shared, used by every widget) now size to it explicitly via `height` + `box-sizing: border-box`, instead of each approximating a similar-but-not-identical height through its own padding — this is why a row with a Dropdown (e.g. Timezone, Alignment) previously looked taller than a row with a Switch or SegmentedControl
- Extended the same `--sg-control-h` variable to the widgets with bespoke, non-shared controls: Calendar/OutlookCalendar/OutlookMail's "days ahead"/"max results" slider (`.sg-cal-slider-wrap`, which also lacked a `margin: 0` reset on the native range input) and BookmarkFolder's sort-order `<select>`
- Removed `.sg-cal-switch`/`.sg-cal-switch-thumb` from `Calendar.css` — a third, unused toggle-switch implementation, never referenced by any component, left over from before the shared `SettingsSwitch` existed

## [1.6.6] — Widget settings panel titles, Quicklinks link-table popout

- Dev Panel header now shows the running `APP_VERSION` next to the "DEV" label (`DevPanel.tsx`/`.css`), so the version being tested is visible without opening the Settings sidebar
- Widget settings panel title/tooltip changed from generic "Widget Settings" to "{{name}} Settings" (e.g. "Clock Settings", "Google Calendar Settings"), driven by the existing `WIDGET_TYPE_LABEL_KEYS` registry (`WidgetContainer.tsx`) — no new per-widget strings needed
- Bookmark Folder settings: the "Icon overrides" list now always starts collapsed when settings are opened (local component state, not persisted), so it no longer eats the panel on open
- Quicklinks settings: replaced the old expand/collapse-to-edit link list with a "Manage Links (N)" button that opens a second floating panel (`.sg-ql-links-panel`, 480px) next to the main settings panel, containing an always-open table (URL / Name / Icon / Badge / reorder+delete). The main settings panel stays at the shared 300px width used by every other widget — only the link table itself gets the extra room, via its own `useFloating` instance (same `flip`/`shift`/`offset` middleware as the main panel) so it repositions correctly near screen edges. Icon source changed from a 3-button segmented control to a `<select>` dropdown; selecting Custom URL/Upload reveals an extra row beneath that link for the corresponding input, as before
- Fixed the Icon-source `<select>`'s native dropdown popup rendering light/unreadable text in dark mode — the closed control inherits theme color, but the OS-rendered option list ignores `color: inherit` unless each `<option>` gets an explicit background/color
- Shared thin-scrollbar utility (`.sg-scroll-thin`, added in 1.6.4) also applied to the shared `.sg-widget-float-panel`, so every widget's settings window gets the thin scrollbar, not just the widgets that had it applied individually

## [1.6.4] — Shared thin-scrollbar utility, clock date color fix

- Several widgets' scroll containers had no scrollbar styling, so Chromium fell back to its default bulky arrow scrollbar while Firefox already rendered a thin overlay one (e.g. Quicklinks' `.sg-ql-links`, BookmarkFolder's `.sg-bf-body`/`.sg-bf-settings`/`.sg-bf-fp-tree`). `SettingsPanel.css` had its own one-off fix already, gated behind `@supports selector(::-webkit-scrollbar)`
- Replaced all of these with one shared `.sg-scroll-thin` utility class in `index.css` (`scrollbar-width`/`scrollbar-color` for Firefox, `::-webkit-scrollbar*` for Chromium — no `@supports` guard, matching the already-working unguarded pattern in `BookmarkSearch.css`/`ObsidianSearch.css`) instead of duplicating the rule per widget. Applied to Quicklinks, the global Settings panel, and all three BookmarkFolder scroll regions
- Clock widget: `.sg-clock-date` used `var(--text-muted)` while `.sg-clock-time` used `var(--text)`, so with the default (non-custom) color the date line rendered dim gray next to a bright white time. Only matched when a custom text color was set, since that's applied inline to both elements identically. Changed `.sg-clock-date` to `var(--text)` so both match by default too

## [1.6.2] — Fix preview crash when closing OAuth widget settings

- `useMsAuth.ts` and `useGoogleAuth.ts` unconditionally called `import('webextension-polyfill')` and registered a `storage.local.onChanged` listener on mount, with no `isExtension` guard (unlike every other storage adapter, e.g. `storage.ts`). On the public browser preview (`docs/preview/`) there is no `chrome.runtime`, so the polyfill's own top-level guard throws; with no `ErrorBoundary` anywhere in the app, that surfaced as the whole React tree unmounting — a black screen recoverable only by a hard refresh — specifically when closing the Outlook Mail, Outlook Calendar, or Google Calendar widget's settings panel, the only three widgets using these hooks. Not reproducible in the installed extension, where `chrome.runtime.id` is always present. Both hooks now gate the polyfill import behind `isExtension`, matching the rest of the codebase

## [1.6.1] — Firefox homepage override

- Firefox manifest (`src/manifest.firefox.json`) gains `chrome_settings_overrides.homepage: "newtab.html"`. Previously only `chrome_url_overrides.newtab` was set, so StartGrid took over every *subsequent* new tab but not the very first window on browser launch (which showed Firefox's default start page) — Firefox treats the initial-window slot and the new-tab slot as separate preferences (`about:preferences#home` → "Neue Fenster" vs. "Neue Tabs"), and only the latter is driven by `chrome_url_overrides`. `chrome_settings_overrides.homepage` is the key Firefox actually reads for the "New Windows" dropdown; no extra permission is required. Chrome is unaffected — `manifest.chrome.json` already covered both slots via its own override key and was left unchanged

## [1.6.0] — Obsidian widgets, onboarding tour, GPL-3.0 licensing

### Obsidian widgets
- Added five optional **Obsidian** widgets — Quick Capture, Daily Note, Pinned Note, Vault Search, and Random Note — reading and writing notes in a local vault. Nothing about a vault ever leaves the device: no relay, no proxy, no Worker involvement, unlike the Google/Microsoft integrations
- Two transports, deliberately. **Quick Capture** defaults to Obsidian's `obsidian://` link scheme, which needs no permission and no plugin — the OS resolves the scheme — so it works with zero setup beyond a vault name. Its drawback is that it raises and focuses the Obsidian window, which is the opposite of what a capture box on a new tab page is for, so Quick Capture silently appends over REST instead whenever a connection is configured. The other four widgets are REST-only, since the URI scheme cannot read anything back
- The REST transport targets the [Local REST API with MCP](https://github.com/coddingtonbear/obsidian-local-rest-api) plugin's **opt-in HTTP server on 27123, not its HTTPS default on 27124**. The default serves a self-signed certificate; `fetch()` rejects it and an extension has no way to click through a certificate warning, so HTTPS is unreachable without the user manually trusting the cert. Loopback HTTP is still a secure context (`127.0.0.1` is "potentially trustworthy"), so there is no mixed-content problem, and the plugin's bearer token is what actually guards the server. The base URL remains user-editable for anyone who has trusted the certificate
- Both manifests gain `optional_host_permissions: ["http://127.0.0.1/*"]`. This is a **separate top-level key** — MV3 rejects host match patterns inside `optional_permissions`, which is unchanged at `["bookmarks"]` — and match patterns carry no port component, so the entry already covers 27123 and cannot be narrowed to it. Nothing is granted at install; the prompt fires only on "Allow local access". `localhost` and `127.0.0.1` are distinct match patterns, so `127.0.0.1` is used consistently in both the manifest and every request URL. Granting the permission also exempts the requests from CORS, which matters because the plugin documents no CORS behaviour of its own
- `src/lib/obsidianMarkdown.ts` parses Markdown to **tokens**, which `MarkdownView.tsx` renders as React elements — never through `dangerouslySetInnerHTML`. Vaults routinely contain clipped web pages, and rendering that as HTML would hand arbitrary saved content script execution on the new tab page. Covers only what the widgets display (headings, emphasis, code, links, `[[wikilinks]]`, `#tags`, task lines, quotes, rules); a full CommonMark dependency would have been ~35 KB for syntax no widget shows
- Daily Note resolves its path from a **template** (`Daily/{{date:YYYY-MM-DD}}.md`) rather than a plugin endpoint. The `/periodic/` endpoints live in a separate companion plugin ("Local REST API - Periodic Notes"), so depending on them would have added a second required install; a template also works against any vault layout and over the URI transport, which has no endpoints at all
- Ticking a checkbox in Daily Note re-reads the note, confirms the target line still matches the rendered text byte-for-byte, and only then writes the file back with that one character flipped. If it no longer matches, the note was edited in Obsidian since the last refresh — the write is **refused and the widget reloads** rather than clobbering that edit. The plugin's PATCH endpoint was avoided because targeting one arbitrary list item through it is fragile
- Random Note needs a flat file list, which the REST API only exposes one directory at a time. `src/lib/obsidianIndex.ts` walks the vault breadth-first and caches the result in `browser.storage.local` for six hours, capped at 300 directory requests and depth 8 — a large vault degrades to a partial index, surfaced in the widget, rather than spinning. Only file *paths* are cached, never note contents. A new tab page opens dozens of times a day and must not re-walk a vault on each one
- The connection record (server URL, API key, vault name) is global rather than per-widget, stored in `browser.storage.local` and **never `storage.sync`** — the same rule OAuth tokens follow. An API key must not ride Chrome/Mozilla Sync to other machines, and a vault path is meaningless on a machine without that vault. `useObsidian.ts` mirrors `useMsAuth.ts`, including a `storage.onChanged` listener so connecting in one widget's settings unblocks every other mounted Obsidian widget, plus `permissions.onAdded`/`onRemoved` so a permission revoked from the browser's own add-on manager falls back cleanly instead of failing every fetch
- Quick Capture persists its unsent draft to `storage.local`, since a new tab page remounts constantly and an unsent thought shouldn't die with it
- All five widgets ship mock data behind the existing `isExtension` check and "Preview data" badge, so the public browser preview at `docs/preview/` keeps working where `chrome` is undefined and there is no vault
- Privacy policy (`docs/privacy.html`): added an "Obsidian widgets (your notes)" section and a permissions-table row for the loopback host permission. The blanket claim *"StartGrid requests no host permissions"* was **factually wrong** the moment that permission could be granted, and is now scoped to "no host permission for any website". Firefox's `data_collection_permissions` is deliberately left unchanged: those categories describe data an extension *collects or transmits*, and vault content is neither

### Widget onboarding tour
- Added a 9-step onboarding tour (`WidgetTour.tsx`) covering the full add/arrange/remove-widget flow: welcome, the Settings icon (clicking Next opens the sidebar), a "Settings Sidebar" confirmation slide, adding a widget, unlocking the grid (clicking Next enables edit mode), an "Edit mode is on" confirmation slide, moving/resizing, editing/removing, and a wrap-up. Auto-triggers once widgets have loaded
- Each targeted step spotlights the real on-screen control it's describing — a fixed-position ring tracks the element's live bounding rect (polled + resize/scroll-aware) and dims the rest of the viewport via an oversized box-shadow, rather than making the user hunt for it while reading
- The lock/theme-toggle control cluster is normally hover-only (`.sg-controls:hover`); the tour force-reveals it (icons, pill background, and the center-alignment variant's width expansion) during the "unlock the grid" step so it's visible without a real mouseover. Copy also mentions hovering and the Ctrl+E shortcut, since the tour won't always be there to force it
- Skipping marks the tour seen and shows a one-off follow-up notice pointing at Settings → "Show tutorial again" (placed above Import/Export); finishing normally closes directly. Tour entry/exit always resets to a clean state — Settings Sidebar closed, edit mode off — regardless of what the tour toggled on mid-flow or what the user had open before triggering it. Restarting via "Show tutorial again" always starts at step 1, even if the previous run ended on the skip notice
- First-run gating differs by build target: the real installed extension shows the tour once ever (`widgetTourSeen`), surviving later version updates; the `docs/preview` demo (same bundle, served as a plain web page — see `sync-preview.js`) instead re-triggers after every version bump (`widgetTourSeenVersion` vs. `APP_VERSION`), so returning visitors see what's new
- The floating "Add Widget" button (`Grid.tsx`) now also shows whenever the Settings Sidebar is open or pinned, not just during edit mode — it no longer requires unlocking the grid first to add a widget
- i18n: all new copy added to both `en.ts` and `de.ts`

### Licensing and homepage
- StartGrid is now released under **GPL-3.0-or-later**. Until now the project had no license at all, which under default copyright meant "all rights reserved" — the source was readable on GitHub but nobody could legally reuse, modify, or redistribute it, so the public repo granted no rights beyond GitHub's own fork button. GPL-3.0 was chosen over a permissive license specifically because a browser extension is trivially repackageable: it allows redistribution but requires any redistributed derivative to publish its source under the same terms, which removes the incentive to fork it into a closed-source clone with ads or tracking
- Added `LICENSE` (verbatim GPL-3.0 text), `"license": "GPL-3.0-or-later"` in `package.json`, and a License section in `README.md`
- Trademark reservation added to `README.md` — the GPL covers the code only; the "StartGrid" name, logo, and icon set are expressly reserved under GPL-3.0 §7(e), so a fork must strip the branding and ship under its own name. The reservation lives in the README rather than in `LICENSE`, which is kept byte-for-byte verbatim: modifying the GPL text would create ambiguity about which license is actually being offered
- `z_package-source.bat` now includes `LICENSE` in the AMO source archive — GPL requires the license text to accompany distributed source, and the source upload was previously omitting it
- Homepage (`docs/index.html`): the promo tile from `store-assets/` is now the hero header (replacing the small logo row), cropped from 440×280 to 440×160 so it reads as a banner rather than the square-ish tile the store listing requires — the logo and wordmark keep their original size, only the surrounding grid is trimmed. The grid is also offset by half a cell (`background-position: 20px 20px`) so no gridline sits flush against an edge; trimming alone couldn't fix this, since the repeating gradient is anchored to the box's top-left and a line therefore always lands on x=0 and y=0 regardless of the box size. The store links use Mozilla's and Google's official badge artwork instead of hand-drawn icons. All three buttons (Firefox, Chrome Web Store, Try in browser) share one 206×58 box so they line up; the vendor badges keep their own aspect ratio centred inside it, since stretching them to equal width would violate both brands' guidelines
- Homepage footer expanded from three inline links into three columns (Get StartGrid / Project / More), and both "Web Preview" links now point at `./preview/index.html` rather than `./preview/` — the directory form relies on the server's index resolution and shows a folder listing when the page is opened locally over `file://`
- Added `scripts/render-promo.js` (`pnpm render:promo`), which renders the `store-assets/` promo tiles from their `.html` source to `.png` via headless Chrome, replacing the manual screenshot step — the PNGs previously had to be recaptured by hand whenever the HTML changed, so they could silently drift out of sync. Each tile is clipped to its `.tile` element rather than the viewport, and the element's rendered size is cross-checked against the dimensions in the filename, so a tile whose CSS no longer matches its declared size fails loudly instead of producing an off-size asset the stores would reject. Adds `puppeteer` as a devDependency only; nothing in the extension build or the shipped artifact uses it
- Added `pnpm-workspace.yaml` with `allowBuilds: puppeteer: true`. pnpm blocks dependency build scripts by default, which silently skips puppeteer's Chromium download and leaves `render:promo` unable to launch a browser. pnpm 11 no longer reads these settings from package.json's `pnpm` field, so they live in this file
- Comment in `src/components/Background/providers/gradient.ts` corrected: it claimed the provider was "ported from" TablissNG's gradient plugin, but the code is two template literals producing `linear-gradient()`/`radial-gradient()` — convergent, not copied. Reworded to describe feature parity; the rationale for omitting upstream's `isRandom` option is unchanged

### Privacy policy
- Privacy policy corrected where it still described the Google Calendar and Outlook widgets as "in development and hidden behind an internal developer option — not yet enabled for general use". That stopped being true in 1.3.0, which un-gated all three; the policy had not been updated to match

## [1.3.0] — Calendar/mail widgets enabled, privacy policy corrections
- Google Calendar widget is no longer gated behind Developer Options — Google's OAuth verification of the `calendar.readonly` scope was approved, so it's now available to all users from the Add-Widget menu
- Outlook Calendar and Outlook Mail widgets are also no longer gated behind Developer Options, now available to all users
- Added the same "Preview data (browser preview)" badge already shown on Bookmark Folder to Google Calendar, Outlook Calendar, Outlook Mail, and Bookmark Search, so mock data is clearly labeled in the browser-preview build for all widgets that use it, not just one
- Privacy policy (`docs/privacy.html`) corrected: the Google OAuth token-exchange step is relayed through the Cloudflare Worker (which attaches a server-side `client_secret`), not sent directly browser-to-Google as previously stated; added a full disclosure section for the Microsoft/Outlook integration (scopes, storage, security, deletion), which existed in code but wasn't documented; added explicit "Data security" and "Data retention and deletion" sections addressing gaps flagged by Google Trust & Safety's automated privacy policy review
- Homepage and privacy policy now hosted on the custom domain `vinzenz-dev.de` (via a separate `vinzenz-san.github.io` user-page repo with GitHub Pages custom domain configured), replacing the `github.io` URLs Google's OAuth verification rejected as not domain-ownership-verifiable

## [1.2.0] — Browser preview
- Added a `build:preview` script that builds the Chrome target and copies it into `docs/preview/`, publishable via GitHub Pages with no separate hosting step — visitors can try the widget grid at a URL with no install required
- Fixed a crash that made this (and likely the existing `preview-server.js` dev workflow) impossible: `permissions.ts` statically imported `webextension-polyfill`, which throws at module-evaluation time — not just when its APIs are called — whenever no `chrome`/`browser` global exists, crashing the whole bundle before React could mount in any non-extension context
- New-install defaults changed: background is now Bing's daily wallpaper instead of a solid color (fetched directly from a community mirror, not through the Cloudflare Worker, so no API-quota cost), widget transparency defaults to 10% instead of 0%, and the Settings section of the settings panel now starts collapsed like every other section
- Bookmark Folder now shows a small "preview data" badge on its main tile when running outside the extension (mock data was already used, but the only indication was buried in the widget's settings panel)
- App version now shown in the settings panel header, injected at build time from `package.json`

## [1.1.7] — Build hygiene: reproducible builds, no key in bundle
- Build: `APP_NASA_API_KEY` is now injected only when no proxy URL is configured. `astronomy.ts` derives `MEDIA_PROXY_URL` through a `.replace()` call, so the minifier couldn't fold it to a constant, couldn't prove the direct-to-`api.nasa.gov` fallback dead, and kept that branch — meaning the key shipped as a string literal in every build even though the proxy is the path that actually runs. It's a rate-limit identifier rather than a credential, so this is hygiene rather than an incident, but the fallback is only reachable without a proxy, so the key now only ships in that case
- Build: documented the required `cp .env.example .env` step in the README. It was missing, so anyone following the build instructions — including AMO reviewers verifying the submitted package — produced a different artifact: `APP_MEDIA_PROXY_URL` is inlined at build time, and without it the Unsplash provider disables itself and NASA APOD drops to `DEMO_KEY`. Together with the change above, a production build now reproduces exactly from the public `.env.example`, with no private value needed
- Added an `engines` field (`node >=20`, `pnpm >=9`) matching the versions the README documents

## [1.1.6] — Privacy audit: token-safe backups, Worker CORS, policy corrections
- Security: settings backup/export no longer writes OAuth tokens. `exportBackup()` read `storage.local` wholesale, so `sg_google_auth`/`sg_ms_auth` (access **and** refresh tokens) were serialized into the downloaded JSON in plain text — a live credential sitting in the Downloads folder, readable by any local process, which contradicted the policy's guarantee that tokens stay in sandboxed extension storage. Both keys are now filtered on export and on import
- Security: the Cloudflare Worker no longer answers every caller with `Access-Control-Allow-Origin: *` — any web page could spend the Unsplash/NASA keys it holds, or POST to `/google-token`//`/ms-token` from a visitor's browser. It now matches the caller's `Origin` against an allowlist: Firefox's `moz-extension://<uuid>` by pattern (it's regenerated per install, so the scheme is all there is to match), Chrome's pinned extension ID exactly, plus `vinzenz-dev.de` and localhost. `ALLOWED_ORIGIN` is now a comma-separated list replacing the Chrome entry rather than a single fixed value, so it can't lock out a browser whose origin can't be predicted. Unrecognised origins get a 403 naming the origin; callers with no `Origin` at all are served without CORS headers, since an origin check only ever constrains browsers
- Privacy policy (`docs/privacy.html`) corrected against a line-by-line audit of the source, which found several claims the code didn't support: bookmark and quicklink **hostnames do leave the browser** — every rendered item requests a favicon from `icons.duckduckgo.com`, with `www.google.com/s2/favicons` and `unavatar.io` as Quicklinks fallbacks — against a policy that said bookmark data is "never transmitted anywhere"; layout and widget settings live in `browser.storage.sync` (so quicklink URLs, weather coordinates and "Cloud"-mode note text replicate through the user's browser account), not the `storage.local` the policy described; the OAuth token exchange is not a one-off, since every refresh sends the refresh token through the Worker; calendar and mail data are held in memory only and never written to storage, so the retention/deletion section described data that doesn't exist; Bing wallpapers come from the community mirror `bing.npanuhin.me`, not Microsoft; and the policy still cited a `tabs` permission dropped back in 1.1.2
- Privacy policy additions: a permission/purpose table (`storage`, `identity`, optional `bookmarks`), Factory Reset documented as a deletion route, the token-free backup export documented as a protection mechanism, honest wording for best-effort Google revocation, and an explicit note that Microsoft has no per-application revoke endpoint (with the account page link). Addresses both points raised in Google Trust & Safety's review — retention/deletion policy, and data protection mechanisms for sensitive data

## [1.1.5] — CI: typecheck + lint gate
- Added `pnpm typecheck` (`tsc --noEmit`) and `pnpm lint` (ESLint, flat config) scripts, plus a GitHub Actions workflow (`.github/workflows/ci.yml`) running typecheck, lint, and both browser builds on every push/PR — previously `tsc` had never actually been run against this codebase (rspack transpiles without type-checking)
- Fixed a real Rules-of-Hooks violation in `WidgetContainer.tsx`: `useFloating`/`useEffect` were called after the "unknown widget type" early return, so a widget with a type missing from the registry (e.g. a stale/removed type in stored data) would skip those hooks entirely — moved them above the early return
- Fixed ~13 other pre-existing type errors surfaced by the first `tsc` run: missing `@types/chrome`/`@types/firefox-webext-browser`, a null-safety gap in `useUnsplash.ts`'s rotation timer, a stale dead type-narrowing check in `SettingsContext.tsx` (comparing against `'left'`/`'right'`, values `SettingsButtonPosition` never actually has), a `Dropdown.tsx` outside-click check that couldn't call `.contains()` on a floating-ui virtual-element type, and a few discriminated-union cast points in the widget registry/context
- Cleaned up dead code the type/lint gate surfaced: unused `luminance()` helper, unused `useRef` import, a few stale `eslint-disable` comments, and useless variable initializers always overwritten before being read

## [1.1.4] — Drop background-image host_permissions entirely
- Removed the remaining `host_permissions` (`*.nasa.gov`, `*.unsplash.com`, `*.bing.com`, `bing.npanuhin.me`) along with the background-script `FETCH_EXTERNAL_IMAGE` relay and the `background.ts` entry point altogether — the extension no longer has a background context at all
- These existed solely to support `useBackgroundContrast`, which sampled the live background image's pixels on a `<canvas>` to auto-pick a light/dark settings-gear icon. That feature is removed: the settings gear now uses the same fixed, theme-aware translucent chip background as the lock and theme-toggle buttons, which needs no permissions and works unconditionally (same approach TablissNG uses for its own background providers — plain CSS `url()`, no pixel sampling)

## [1.1.3] — Reduced permissions footprint
- Removed unnecessary `host_permissions`: `accounts.google.com`, `oauth2.googleapis.com`, `www.googleapis.com`, `api.open-meteo.com`, `geocoding-api.open-meteo.com` — all confirmed CORS-permissive for direct fetch, so the permission was declared but never actually needed (Google OAuth is opened via `identity.launchWebAuthFlow`, not fetched directly; token exchange and Calendar API calls already work without it). Kept `*.nasa.gov`/`*.unsplash.com`/`*.bing.com`/`bing.npanuhin.me`, which the `FETCH_EXTERNAL_IMAGE` background relay genuinely needs for CORS-blocked image bytes.
- `bookmarks` moved from a required to an `optional_permissions` entry (Firefox: `bookmarksInfo` moved to optional data collection too) — Bookmark Folder/Search widgets now request it at runtime via `browser.permissions.request()` the first time they're used, with a "Grant access" prompt in place of silently falling back to sample data
- Fixed extension-environment detection (`isExtensionEnv`) to key off `browser.runtime.id` instead of `chrome.permissions`, which isn't reliably exposed by Firefox's `chrome.*` compatibility shim — the old check silently misdetected Firefox and could get stuck showing mock bookmarks with no permission prompt

## [1.1.2] — Store submission fixes
- Removed the unused `tabs` permission from both manifests (Chrome Web Store rejected 1.1.1 for excessive permissions — `tabs.create`/`tabs.update` don't require it since the code never reads back `Tab.url`/`title`/`favIconUrl`)
- Build: replaced PowerShell `Compress-Archive` with a Node `archiver`-based packaging script (`scripts/package-zip.js`, `pnpm package:firefox`/`package:chrome`/`package:chrome-store`) — `Compress-Archive` was writing backslash path separators into the zip, which AMO's linter rejects as invalid file names

## [1.1.1] — Outlook monthly view, Chrome ID stability
- Outlook Calendar widget gains a monthly grid view (view toggle, first-day-of-week setting), at parity with the Google Calendar widget — the agenda/monthly rendering core was extracted into a shared `widgets/shared/CalendarCore.tsx` used by both widgets
- Google Calendar widget renamed to "Google Calendar" in the Add Widget menu for consistency with "Outlook Calendar"
- Build: Chrome extension ID is now pinned via a manifest `key` for local unpacked testing (keeps the Google/Microsoft OAuth redirect URI stable across rebuilds), while a new `build:chrome-store` script produces a key-free artifact for the actual Chrome Web Store upload (the Store rejects manifests containing `key`)

## [1.1.0] — Outlook integration
- New Outlook Calendar widget (Microsoft Graph `calendarView`, `Calendars.Read`) — agenda view, reuses the Google Calendar widget's visual chrome
- New Outlook Mail widget (Microsoft Graph `messages`, `Mail.Read`) — inbox list with unread filter
- Microsoft OAuth: authorization code + PKCE flow (`src/lib/msAuth.ts`), token exchange proxied through the same Cloudflare Worker as Google's (`/ms-token` route), mirroring the Google Sign-In implementation
- Both widgets are `devOnly` pending end-to-end verification of the connect flow, same gate as the Google Calendar widget — `Mail.Read`/`Calendars.Read` don't require tenant admin consent, so this is expected to be short-lived

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
