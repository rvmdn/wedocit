/**
 * WeDocIt Desktop Studio v3.3.2 - Local Backend Server
 * Modularized Architecture:
 * - src/server/config.js           -> Directory paths, constants & MIME types
 * - src/server/utils.js            -> HTTP payload & Word COM PDF exporter helpers
 * - src/server/routes.js           -> Core REST API endpoint router
 * - src/server/services/           -> Domain services (Test runner, Spec generator, Auto-fix)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const { PORT, ROOT_DIR, DATA_DIR, WORKSPACE_FILE, OUTPUT_DIR, MIME_TYPES } = require('./src/server/config');
const { getDefaultWorkspace } = require('./src/server/utils');
const { handleApiRequest } = require('./src/server/routes');

// Pastikan direktori data & output tersedia
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Inisialisasi workspace file jika belum ada
if (!fs.existsSync(WORKSPACE_FILE)) {
  fs.writeFileSync(WORKSPACE_FILE, JSON.stringify(getDefaultWorkspace(), null, 2), 'utf8');
}

const server = http.createServer((req, res) => {
  // CORS & Security Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // 1. API ROUTES
  if (pathname.startsWith('/api/')) {
    handleApiRequest(req, res, pathname);
    return;
  }

  // 2. STATIC FILES SERVING
  let relativePath = pathname === '/' ? '/editor.html' : pathname;
  const safePath = path.normalize(decodeURIComponent(relativePath)).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(ROOT_DIR, safePath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('404 Not Found');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 [WeDocIt Studio Desktop v3.3.2] Server Aktif (Modular)!`);
  console.log(`🌐 URL: http://127.0.0.1:${PORT}`);
  console.log(`📁 Data Workspace: ${WORKSPACE_FILE}`);
  console.log(`⚡ Modular Architecture: Clean & High-Performance`);
  console.log(`======================================================\n`);
});

module.exports = server;
