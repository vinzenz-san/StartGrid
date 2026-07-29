# StartGrid

A customizable new tab page for Firefox and Chrome — a widget grid (clock, weather, notes, bookmarks, quicklinks, and more) set against a background of your choice.

- Homepage: https://vinzenz-dev.de/startgrid/
- Privacy Policy: https://vinzenz-dev.de/startgrid/privacy.html

## Building from source

### Requirements

- **OS**: any (Windows, macOS, Linux) — the build is pure Node.js/JavaScript, no OS-specific steps.
- **Node.js**: v20 or later (built and tested with v24.18.0).
- **pnpm**: v9 or later (built and tested with v11.12.0). Install via `corepack enable` (bundled with Node 16.13+) or `npm install -g pnpm`.

### Steps

```bash
cp .env.example .env    # Windows: copy .env.example .env
pnpm install
pnpm build:firefox
```

This produces the contents of the submitted package in `dist/firefox/` (manifest, HTML, minified JS/CSS, icons).

The first step is required, not optional. `APP_MEDIA_PROXY_URL` is inlined into the bundle at build time (rspack's `DefinePlugin` — see `rspack.config.ts`), and building without it yields a different, degraded artifact: the Unsplash background provider disables itself entirely and NASA APOD falls back to the shared rate-limited `DEMO_KEY`. The URL in `.env.example` is a public Cloudflare Worker endpoint, not a credential — the API keys it guards live in the Worker's own secret store (see `worker/api-proxy.ts`).

For the Chrome/Chromium build instead: `pnpm build:chrome` → `dist/chrome/`.

### What the build does

- Bundles `src/` with [rspack](https://rspack.dev) (a Webpack-compatible bundler) using `builtin:swc-loader` for TypeScript/JSX compilation and minification, targeting ES2020 (both browsers have supported it since 2020/2018 respectively).
- Injects the version from `package.json` into the per-target manifest (`src/manifest.firefox.json` / `src/manifest.chrome.json`) at build time.
- Runs `scripts/patch-runtime.js` as a post-build step, which replaces a `Function("return this")()` fallback in rspack's own generated runtime helper (a defensive pattern for pre-2018 browsers, unreachable in this extension's supported targets) with a direct `globalThis` reference — done to satisfy `no-unsanitized` static analysis, since the fallback is otherwise indistinguishable from an eval call to that tooling despite never executing.

No other code generation, templating, or obfuscation is used beyond what's described above.

## Obsidian widgets

StartGrid ships five optional widgets that read and write notes in a local [Obsidian](https://obsidian.md) vault: **Quick Capture**, **Daily Note**, **Pinned Note**, **Vault Search**, and **Random Note**. Nothing about your vault ever leaves your machine — there is no server involved on StartGrid's side.

**Quick Capture works with no setup.** Add the widget, enter your vault name exactly as it appears in Obsidian's vault switcher, and send. It uses Obsidian's `obsidian://` link scheme, which needs no permission and no plugin — though sending does raise the Obsidian window.

The other four widgets, and Quick Capture's silent-append mode, need a small server running inside Obsidian:

1. In Obsidian, install the **Local REST API with MCP** community plugin (by Adam Coddington) and enable it.
2. In the plugin's settings, turn on the **HTTP server** and note its port (`27123` by default). StartGrid targets HTTP rather than the plugin's HTTPS default: that default serves a self-signed certificate, `fetch()` rejects it outright, and a browser extension cannot click through a certificate warning. Loopback traffic never leaves your machine, and the plugin's API key is what actually guards the server.
3. Copy the plugin's **API key**.
4. In any Obsidian widget's settings in StartGrid, click **Allow local access** — the browser will ask to grant `http://127.0.0.1/*`, an optional host permission that is not granted at install time. Paste the API key and click **Test connection**.

The connection is stored once and shared by all five widgets, so step 4 only has to be done in one of them. The API key lives in `browser.storage.local` and deliberately never in sync storage, so it is not replicated to your other devices. "Disconnect" clears the key and hands the host permission back.

The companion **Local REST API - Periodic Notes** plugin is *not* required — Daily Note resolves today's note from a path template you configure (`Daily/{{date:YYYY-MM-DD}}.md` by default), which works against any vault layout.

## License

Copyright © 2026 Vinzenz.

StartGrid is free software, licensed under the [GNU General Public License v3.0 or later](LICENSE).

You may use, study, modify, and redistribute it. If you distribute a modified version — including publishing it to an extension store — you must release your changes under the same license and make the corresponding source available.

### Trademarks

The GPL covers the *code*. It does not grant any right to the StartGrid name or branding, and those are expressly reserved (see GPL-3.0 §7(e)).

"StartGrid", the StartGrid logo, and the StartGrid icon set are not part of the licensed work. If you distribute a modified version, you must remove them and use your own name and branding — you may not publish a fork under the StartGrid name, nor present it in a way that suggests it is the official StartGrid or is endorsed by its author.

You may of course state factually that your work is derived from StartGrid.
