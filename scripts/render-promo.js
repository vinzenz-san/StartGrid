// Renders the store-asset promo tiles from HTML to PNG, so the .png files stay
// in sync with their .html source instead of being re-screenshotted by hand.
//
// Each tile's dimensions come from its filename (`...-WIDTHxHEIGHT.html`), and
// the render is clipped to the `.tile` element rather than the viewport — the
// store listings reject anything off by even a pixel, so the element's own
// box is the authoritative size, and the filename is only cross-checked
// against it to catch a rename that drifted from the CSS.
//
// Usage:
//   node scripts/render-promo.js              # render every tile in store-assets/
//   node scripts/render-promo.js <file.html>  # render one

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const ASSET_DIR = path.join(__dirname, '..', 'store-assets');
const SIZE_RE = /-(\d+)x(\d+)\.html$/;

function targets() {
  const arg = process.argv[2];
  if (arg) {
    const p = path.resolve(arg);
    if (!fs.existsSync(p)) {
      console.error(`not found: ${arg}`);
      process.exit(1);
    }
    return [p];
  }
  if (!fs.existsSync(ASSET_DIR)) {
    console.error(`asset dir not found: ${ASSET_DIR}`);
    process.exit(1);
  }
  return fs
    .readdirSync(ASSET_DIR)
    .filter((f) => f.endsWith('.html'))
    .map((f) => path.join(ASSET_DIR, f));
}

(async () => {
  const files = targets();
  if (files.length === 0) {
    console.log('[render-promo] no .html tiles found — nothing to do.');
    return;
  }

  const browser = await puppeteer.launch();
  let failed = 0;

  try {
    for (const file of files) {
      const name = path.basename(file);
      const declared = name.match(SIZE_RE);

      const page = await browser.newPage();
      // deviceScaleFactor 1: the stores want exact pixel dimensions, not @2x.
      await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
      await page.goto('file://' + file.split(path.sep).join('/'), {
        waitUntil: 'networkidle0',
      });

      const tile = await page.$('.tile');
      if (!tile) {
        console.error(`[render-promo] ${name}: no .tile element — skipped.`);
        failed++;
        await page.close();
        continue;
      }

      const box = await tile.boundingBox();
      const actual = `${Math.round(box.width)}x${Math.round(box.height)}`;

      if (declared && `${declared[1]}x${declared[2]}` !== actual) {
        console.error(
          `[render-promo] ${name}: filename says ${declared[1]}x${declared[2]} ` +
            `but .tile renders at ${actual} — skipped, fix one or the other.`,
        );
        failed++;
        await page.close();
        continue;
      }

      const out = file.replace(/\.html$/, '.png');
      await tile.screenshot({ path: out, omitBackground: false });
      await page.close();

      const kb = (fs.statSync(out).size / 1024).toFixed(1);
      console.log(`[render-promo] ${name} -> ${path.basename(out)} (${actual}, ${kb} KB)`);
    }
  } finally {
    await browser.close();
  }

  if (failed > 0) {
    process.exitCode = 1;
  }
})();
