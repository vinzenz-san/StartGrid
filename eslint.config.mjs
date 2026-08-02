import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/**', 'dist-zip/**', 'node_modules/**', 'scripts/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2021,
      globals: { ...globals.browser, ...globals.webextensions },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // Only the two classic, always-correct hook rules — not the plugin's
      // full v7 "recommended" preset, which is a React Compiler-readiness
      // rule set (set-state-in-effect, refs, purity, etc.) that flags
      // idiomatic, correct patterns already in use here (e.g. floating-ui's
      // ref={refs.setFloating}) as hard errors. Revisit if this codebase
      // ever actually opts into the React Compiler.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Widely used in this codebase for narrow, documented escape hatches
      // (e.g. runtime API surfaces the type packages don't cover) — the
      // review burden is on comments at each site, not a blanket ban.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Best-effort localStorage/storage writes intentionally swallow errors
      // (quota exceeded, restricted contexts) with an empty catch — a real,
      // recurring pattern here, not an oversight.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    // Widgets get their row-height/spacing consistency from the shared Form
    // components (SettingsSlider, SettingsSwitch, SegmentedControl, Dropdown)
    // sharing --sg-control-h — a raw <input type="range"> bypasses that and
    // reintroduces exactly the per-widget drift that was audited out. Scoped
    // to widgets/ only: this file itself is where SettingsSlider legitimately
    // renders one.
    files: ['src/components/widgets/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXOpeningElement[name.name="input"] > JSXAttribute[name.name="type"] > Literal[value="range"]',
          message: 'Use the shared <SettingsSlider> (src/components/shared/Form) instead of a raw <input type="range"> — keeps slider height/spacing consistent with --sg-control-h across all widgets.',
        },
      ],
    },
  },
  {
    files: ['rspack.config.ts', '*.config.ts'],
    languageOptions: { globals: globals.node },
  },
);
