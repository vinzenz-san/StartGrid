const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4747;
const DIST = path.join(__dirname, 'dist', 'chrome');

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
};

http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  // Serve newtab.html for root and extensionless paths (browser strips .html)
  const candidates = urlPath === '/' || !path.extname(urlPath)
    ? [path.join(DIST, 'newtab.html')]
    : [path.join(DIST, urlPath)];

  function tryNext(paths) {
    if (!paths.length) { res.writeHead(404); res.end('Not found'); return; }
    const filePath = paths[0];
    fs.readFile(filePath, (err, data) => {
      if (err) return tryNext(paths.slice(1));
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
      res.end(data);
    });
  }
  tryNext(candidates);
}).listen(PORT, () => {
  console.log(`StartGrid Preview running at http://localhost:${PORT}`);
});
