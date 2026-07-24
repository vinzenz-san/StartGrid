import { rspack, type Configuration } from '@rspack/core';
import path from 'path';
import fs from 'fs';

// Minimal .env parser — no dotenv dependency needed for a handful of
// KEY=VALUE lines. Missing files simply contribute nothing (a fresh clone
// without a .env still builds fine; see the DEMO_KEY fallback in astronomy.ts).
function loadEnvFile(filePath: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return result;
  for (const line of fs.readFileSync(filePath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

const { version } = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));

// Pins the Chrome extension's unpacked-load ID so the Google OAuth redirect
// URI (https://<id>.chromiumapp.org/) stops changing across rebuilds/reclones
// — see startgrid-chrome-key.pem (gitignored, kept outside the repo). Included
// in every normal `pnpm build:chrome` (that's the artifact you load unpacked
// to test), but the Chrome Web Store rejects uploads containing a "key"
// field — use `pnpm build:chrome-store` for the actual submission zip, which
// omits it. See git history on manifest.chrome.json for why this must never
// ship in the store artifact.
const CHROME_DEV_KEY_PATH = path.resolve(__dirname, 'startgrid-chrome-key.pub.b64.txt');

export default (env: { target?: string; production?: boolean; store?: boolean } = {}) => {
  const target = (env.target === 'chrome' ? 'chrome' : 'firefox') as 'firefox' | 'chrome';

  // .env.local (gitignored, machine-specific) takes precedence over .env (gitignored template-filled copy).
  const envVars = {
    ...loadEnvFile(path.resolve(__dirname, '.env')),
    ...loadEnvFile(path.resolve(__dirname, '.env.local')),
  };

  const config: Configuration = {
    entry: {
      newtab: './src/main.tsx',
      background: './src/background.ts',
    },
    output: {
      path: path.resolve(__dirname, 'dist', env.store ? `${target}-store` : target),
      filename: '[name].js',
      clean: true,
      // Both target browsers have supported globalThis since 2018 — telling
      // rspack this lets it skip generating the Function("return this")()
      // fallback in its runtime helper, which AMO's linter (no-unsanitized)
      // flags as an eval-equivalent, even though it's unreachable dead code
      // in a Manifest V3 extension context.
      environment: {
        globalThis: true,
      },
    },
    module: {
      rules: [
        {
          test: /\.(tsx?|jsx?)$/,
          use: {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                // Without an explicit target, swc downlevels async/await into
                // a generator+Promise "__awaiter" wrapper (calling the inner
                // fn via .apply()) — AMO's linter flags that .apply() call as
                // an unsanitized dynamic callable. Both target browsers
                // (Firefox 109+, current Chrome) support ES2020 natively, so
                // there's nothing to downlevel here.
                target: 'es2020',
                parser: {
                  syntax: 'typescript',
                  tsx: true,
                },
                transform: {
                  react: {
                    runtime: 'automatic',
                  },
                },
              },
            },
          },
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          type: 'css',
        },
      ],
    },
    plugins: [
      // Rspack has no Vite-style automatic import.meta.env — statically inject
      // each key we need at build time instead. Empty string when unset
      // (no .env / .env.local present) so each consumer's own fallback
      // (astronomy.ts's DEMO_KEY, useUnsplash.ts's proxyReady gate) engages
      // rather than the build crashing on undefined.
      new rspack.DefinePlugin({
        'import.meta.env.APP_NASA_API_KEY': JSON.stringify(envVars.APP_NASA_API_KEY || ''),
        'import.meta.env.APP_MEDIA_PROXY_URL': JSON.stringify(envVars.APP_MEDIA_PROXY_URL || ''),
      }),
      new rspack.HtmlRspackPlugin({
        template: './src/newtab.html',
        filename: 'newtab.html',
        chunks: ['newtab'],
      }),
      new rspack.CopyRspackPlugin({
        patterns: [
          {
            from: 'public',
            to: '.',
            // Rspack's CopyRspackPlugin has no JS-predicate `filter` option
            // (unlike webpack's copy-webpack-plugin) — that field is silently
            // ignored, so public/manifest.json was copying through unfiltered
            // and clobbering the real per-target manifest below (neither
            // pattern set `force`, so whichever copied first silently won).
            // globOptions.ignore is the actual supported exclusion mechanism.
            globOptions: { ignore: ['**/manifest.json'] },
            // public/manifest.json was the only file in this directory — now
            // that it's removed, `public` is empty (or may not exist at all
            // for a fresh clone), and Rspack hard-errors on a from-glob that
            // matches nothing unless told otherwise.
            noErrorOnMissing: true,
          },
          {
            from: `src/manifest.${target}.json`,
            to: 'manifest.json',
            force: true,
            priority: 10,
            transform(content) {
              const manifest = JSON.parse(content.toString());
              manifest.version = version;
              if (target === 'chrome' && !env.store && fs.existsSync(CHROME_DEV_KEY_PATH)) {
                manifest.key = fs.readFileSync(CHROME_DEV_KEY_PATH, 'utf-8').trim();
              }
              return JSON.stringify(manifest, null, 2);
            },
          },
        ],
      }),
    ],
    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js'],
    },
    experiments: {
      css: true,
    },
    mode: env.production ? 'production' : 'development',
    devtool: env.production ? false : 'source-map',
  };

  return config;
};
