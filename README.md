# StartGrid

A customizable new tab page for Firefox and Chrome — a widget grid (clock, weather, notes, bookmarks, quicklinks, and more) set against a background of your choice.

- Homepage: https://vinzenz-san.github.io/StartGrid/
- Privacy Policy: https://vinzenz-san.github.io/StartGrid/privacy.html

## Building from source

### Requirements

- **OS**: any (Windows, macOS, Linux) — the build is pure Node.js/JavaScript, no OS-specific steps.
- **Node.js**: v20 or later (built and tested with v24.18.0).
- **pnpm**: v9 or later (built and tested with v11.12.0). Install via `corepack enable` (bundled with Node 16.13+) or `npm install -g pnpm`.

### Steps

```bash
pnpm install
pnpm build:firefox
```

This produces the exact contents of the submitted package in `dist/firefox/` (manifest, HTML, minified JS/CSS, icons).

For the Chrome/Chromium build instead: `pnpm build:chrome` → `dist/chrome/`.

### What the build does

- Bundles `src/` with [rspack](https://rspack.dev) (a Webpack-compatible bundler) using `builtin:swc-loader` for TypeScript/JSX compilation and minification, targeting ES2020 (both browsers have supported it since 2020/2018 respectively).
- Injects the version from `package.json` into the per-target manifest (`src/manifest.firefox.json` / `src/manifest.chrome.json`) at build time.
- Runs `scripts/patch-runtime.js` as a post-build step, which replaces a `Function("return this")()` fallback in rspack's own generated runtime helper (a defensive pattern for pre-2018 browsers, unreachable in this extension's supported targets) with a direct `globalThis` reference — done to satisfy `no-unsanitized` static analysis, since the fallback is otherwise indistinguishable from an eval call to that tooling despite never executing.

No other code generation, templating, or obfuscation is used beyond what's described above.
