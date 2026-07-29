// Copies the built Chrome extension into docs/preview/ so it can be served
// by GitHub Pages as a "try in browser" preview at vinzenz-dev.de/startgrid/preview/.
// The build's asset references (newtab.js, icons/...) are relative, so the
// output works unmodified regardless of subpath depth.
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'dist', 'chrome');
const destDir = path.join(__dirname, '..', 'docs', 'preview');

if (!fs.existsSync(srcDir)) {
  console.error(`dist dir not found: ${srcDir} — run the build first.`);
  process.exit(1);
}

fs.rmSync(destDir, { recursive: true, force: true });
fs.cpSync(srcDir, destDir, { recursive: true });

// GitHub Pages serves index.html at a folder root, not newtab.html.
fs.copyFileSync(path.join(destDir, 'newtab.html'), path.join(destDir, 'index.html'));

console.log(`[sync-preview] copied ${srcDir} -> ${destDir} (added index.html)`);
