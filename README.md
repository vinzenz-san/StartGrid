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

## License

Copyright © 2026 Vinzenz.

StartGrid is free software, licensed under the [GNU General Public License v3.0 or later](LICENSE).

You may use, study, modify, and redistribute it. If you distribute a modified version — including publishing it to an extension store — you must release your changes under the same license and make the corresponding source available.

### Trademarks

The GPL covers the *code*. It does not grant any right to the StartGrid name or branding, and those are expressly reserved (see GPL-3.0 §7(e)).

"StartGrid", the StartGrid logo, and the StartGrid icon set are not part of the licensed work. If you distribute a modified version, you must remove them and use your own name and branding — you may not publish a fork under the StartGrid name, nor present it in a way that suggests it is the official StartGrid or is endorsed by its author.

You may of course state factually that your work is derived from StartGrid.
