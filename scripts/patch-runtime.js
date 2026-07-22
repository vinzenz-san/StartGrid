// AMO's addons-linter (no-unsanitized/no-unsafe-innerhtml rules) flags rspack's
// own generated __webpack_require__.g runtime helper for calling
// Function("return this")() as an eval-equivalent — a defensive fallback for
// pre-2018 browsers that never actually executes, since the same helper
// already returns globalThis directly when `typeof globalThis === "object"`,
// which is always true in our supported targets (Firefox 109+, current
// Chrome). This patches the dead branch out of the built output so the
// literal "Function(" call — the thing the linter keys on — is gone.
//
// Fragile-by-design: if a future rspack version changes this helper's exact
// generated shape, this simply becomes a no-op (the string won't match) —
// it fails silently rather than corrupting the build either way.
const fs = require('fs');
const path = require('path');

const target = process.argv[2];
if (!target) {
  console.error('Usage: node scripts/patch-runtime.js <path-to-newtab.js>');
  process.exit(1);
}

const filePath = path.resolve(target);
if (!fs.existsSync(filePath)) {
  console.log(`[patch-runtime] ${target} not found, skipping.`);
  process.exit(0);
}

const before = fs.readFileSync(filePath, 'utf-8');
const needle = 'Function("return this")()';
const after = before.split(needle).join('globalThis');

if (after === before) {
  console.log(`[patch-runtime] pattern not found in ${target} (already patched, or rspack's output shape changed) — no change made.`);
} else {
  fs.writeFileSync(filePath, after);
  console.log(`[patch-runtime] patched ${target}.`);
}
