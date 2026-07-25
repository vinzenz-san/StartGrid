const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const target = process.argv[2];
if (!target) {
  console.error('Usage: node scripts/package-zip.js <firefox|chrome|chrome-store>');
  process.exit(1);
}

const srcDir = path.join(__dirname, '..', 'dist', target);
if (!fs.existsSync(srcDir)) {
  console.error(`dist dir not found: ${srcDir}`);
  process.exit(1);
}

const outDir = path.join(__dirname, '..', 'dist-zip');
fs.mkdirSync(outDir, { recursive: true });

const pkg = require('../package.json');
const outFile = path.join(outDir, `${target}-v${pkg.version}.zip`);

const output = fs.createWriteStream(outFile);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`Wrote ${outFile} (${archive.pointer()} bytes)`);
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);
// glob:false + forward-slash prefix ensures POSIX-style zip entry names on all platforms
archive.directory(srcDir, false);
archive.finalize();
