/**
 * WeDocIt Desktop Studio v3.0 - Local Backend Server
 * Menjalankan server aplikasi mandiri (standalone desktop) tanpa dependensi eksternal.
 * Menyediakan REST API untuk workspace data, Playwright runner, dan Word/PDF export.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 4400;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const WORKSPACE_FILE = path.join(DATA_DIR, 'workspace.json');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');

// Pastikan direktori data & output tersedia
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Status runner pengujian otomatis
let testRunnerState = {
  running: false,
  startTime: null,
  finishTime: null,
  exitCode: null,
  logs: [],
  lastOutputFile: null
};

// MIME Types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pdf': 'application/pdf'
};

// Helper untuk default workspace jika file belum ada
function getDefaultWorkspace() {
  const initialDoc = {
    id: 'doc_' + Date.now(),
    title: 'Unit Test Documentation - Pelaksanaan Audit (Offline & Online)',
    systemName: 'AMS Fast',
    projectName: 'AMS (Audit Management System)',
    crNo: 'CR_AMS_2026_OFFLINE',
    module: 'Pelaksanaan Audit',
    shortDescription: 'Modul Pelaksanaan Audit mencakup AP Non-Kredit, Pengujian AP, AP Kredit, RHA, dan Pelaksanaan Audit Online.',
    scope: 'Pengujian menyeluruh modul Pelaksanaan Audit Offline dan Online',
    acceptanceCriteria: 'Seluruh skenario pengujian berjalan sukses dan data tersimpan di sistem.',
    testedBy: 'Irvan Ramadan',
    npp: '822117',
    developers: [{ name: 'Irvan Ramadan', npp: '822117' }],
    startDate: '19/08/2026',
    endDate: '27/10/2026',
    docDate: '27/10/2026',
    copyrightYear: '2026',
    version: 'V1.0',
    env: 'Development / SIT',
    screenResolution: '1366x768',
    testCases: []
  };

  return {
    activeDocId: initialDoc.id,
    documents: [initialDoc]
  };
}

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
  // Sanitasi path traversal
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

function handleApiRequest(req, res, pathname) {
  // GET /api/ping
  if (pathname === '/api/ping' && req.method === 'GET') {
    return sendJson(res, 200, {
      status: 'ok',
      app: 'WeDocIt Desktop Studio',
      version: '3.0.0',
      port: PORT,
      timestamp: new Date().toISOString()
    });
  }

  // GET /api/workspace
  if (pathname === '/api/workspace' && req.method === 'GET') {
    try {
      const data = fs.readFileSync(WORKSPACE_FILE, 'utf8');
      return sendJson(res, 200, JSON.parse(data));
    } catch (err) {
      return sendJson(res, 500, { error: 'Gagal membaca workspace', details: err.message });
    }
  }

  // POST /api/workspace
  if (pathname === '/api/workspace' && req.method === 'POST') {
    readRequestBody(req, (body, err) => {
      if (err) return sendJson(res, 400, { error: 'Payload tidak valid' });
      try {
        const workspaceData = JSON.parse(body);
        fs.writeFileSync(WORKSPACE_FILE, JSON.stringify(workspaceData, null, 2), 'utf8');
        return sendJson(res, 200, { success: true, message: 'Workspace berhasil disimpan' });
      } catch (saveErr) {
        return sendJson(res, 500, { error: 'Gagal menyimpan workspace', details: saveErr.message });
      }
    });
    return;
  }

  // GET /api/specs (Mendaftarkan daftar file spec Playwright secara dinamis)
  if (pathname === '/api/specs' && req.method === 'GET') {
    try {
      const testsDir = path.join(ROOT_DIR, 'tests');
      let specs = [];
      if (fs.existsSync(testsDir)) {
        const files = fs.readdirSync(testsDir).filter(f => f.endsWith('.spec.ts'));
        specs = files.map(f => {
          let label = f;
          if (f.includes('06-orms-ldap')) label = '🎯 [ORMS] Integrasi LDAP Active Directory (CR 60131 - 20 TC)';
          else if (f.includes('01-ap-non-kredit')) label = 'Modul 1: AP Non-Kredit Offline (TC-1.1 - 1.3)';
          else if (f.includes('02-pengujian')) label = 'Modul 2: Pengujian AP Non-Kredit Offline (TC-2.1 - 2.5)';
          else if (f.includes('03-ap-kredit')) label = 'Modul 3: AP Kredit Offline (TC-3.1 - 3.5)';
          else if (f.includes('04-rha')) label = 'Modul 4: RHA Offline (TC-4.1 - 4.3)';
          else if (f.includes('05-pelaksanaan-audit')) label = 'Modul 5: Pelaksanaan Audit Online (TC-5.1 - 5.2)';
          return {
            path: `tests/${f}`,
            name: f,
            label
          };
        });
      }
      return sendJson(res, 200, { specs });
    } catch (err) {
      return sendJson(res, 500, { error: 'Gagal membaca direktori tests', details: err.message });
    }
  }

  // GET /api/test-status
  if (pathname === '/api/test-status' && req.method === 'GET') {
    return sendJson(res, 200, testRunnerState);
  }

  // POST /api/run-tests
  if (pathname === '/api/run-tests' && req.method === 'POST') {
    readRequestBody(req, (body) => {
      let params = {};
      try { if (body) params = JSON.parse(body); } catch {}

      if (testRunnerState.running) {
        return sendJson(res, 409, { error: 'Pengujian sedang berjalan', state: testRunnerState });
      }

      const specFile = params.spec || '';
      startPlaywrightTest(specFile, { headed: !!params.headed });
      return sendJson(res, 202, {
        message: 'Pengujian Playwright berhasil dimulai di latar belakang',
        state: testRunnerState
      });
    });
    return;
  }

  // POST /api/export-pdf
  if (pathname === '/api/export-pdf' && req.method === 'POST') {
    readRequestBody(req, (body) => {
      let params = {};
      try { if (body) params = JSON.parse(body); } catch {}
      const docxPath = params.docxPath || getLatestDocxInOutput();

      if (!docxPath || !fs.existsSync(docxPath)) {
        return sendJson(res, 400, { error: 'File DOCX tidak ditemukan untuk diekspor ke PDF' });
      }

      exportDocxToPdf(docxPath, (err, pdfPath) => {
        if (err) {
          return sendJson(res, 500, { error: 'Gagal mengekspor PDF', details: err.message });
        }
        return sendJson(res, 200, { success: true, pdfPath });
      });
    });
    return;
  }

  // POST /api/save-prompt (Menyimpan prompt terisi ke output/prompt_for_ai.txt)
  if (pathname === '/api/save-prompt' && req.method === 'POST') {
    readRequestBody(req, (body) => {
      try {
        const payload = JSON.parse(body || '{}');
        const promptText = payload.prompt || '';
        const targetPath = path.join(OUTPUT_DIR, 'prompt_for_ai.txt');
        fs.writeFileSync(targetPath, promptText, 'utf8');
        return sendJson(res, 200, {
          success: true,
          filePath: targetPath,
          message: 'Prompt berhasil disimpan ke output/prompt_for_ai.txt'
        });
      } catch (err) {
        return sendJson(res, 500, { error: 'Gagal menyimpan prompt', details: err.message });
      }
    });
    return;
  }

  // GET /api/latest-results (Mengambil hasil test cases & bukti screenshot dari run terakhir)
  if (pathname === '/api/latest-results' && req.method === 'GET') {
    const resultsJsonPath = path.join(OUTPUT_DIR, 'latest_run_results.json');
    if (!fs.existsSync(resultsJsonPath)) {
      return sendJson(res, 404, { error: 'Belum ada hasil pengujian yang tersimpan di output/latest_run_results.json' });
    }
    try {
      const data = fs.readFileSync(resultsJsonPath, 'utf8');
      return sendJson(res, 200, JSON.parse(data));
    } catch (err) {
      return sendJson(res, 500, { error: 'Gagal membaca latest_run_results.json', details: err.message });
    }
  }

  // GET /api/outputs
  if (pathname === '/api/outputs' && req.method === 'GET') {
    try {
      const files = fs.readdirSync(OUTPUT_DIR).map(f => {
        const full = path.join(OUTPUT_DIR, f);
        const stat = fs.statSync(full);
        return {
          name: f,
          size: stat.size,
          updatedAt: stat.mtime,
          ext: path.extname(f).toLowerCase(),
          url: `/output/${f}`
        };
      }).sort((a, b) => b.updatedAt - a.updatedAt);
      return sendJson(res, 200, { files });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // Route tidak ditemukan
  sendJson(res, 404, { error: 'Endpoint API tidak ditemukan' });
}

function startPlaywrightTest(specFile = '', options = {}) {
  testRunnerState = {
    running: true,
    startTime: new Date().toISOString(),
    finishTime: null,
    exitCode: null,
    logs: [],
    lastOutputFile: null
  };

  const args = ['playwright', 'test'];
  if (specFile) {
    args.push(specFile);
  }
  if (options.headed) {
    args.push('--headed');
  }

  const child = spawn('npx.cmd', args, {
    cwd: ROOT_DIR,
    shell: true,
    env: { ...process.env, CI: options.headed ? '' : '1' }
  });

  const appendLog = (chunk) => {
    const text = chunk.toString();
    testRunnerState.logs.push(text);
    if (testRunnerState.logs.length > 500) {
      testRunnerState.logs.shift();
    }
    // Deteksi nama file output docx jika dicetak oleh reporter
    const match = text.match(/File:\s*([^\r\n]+\.docx)/i);
    if (match && match[1]) {
      testRunnerState.lastOutputFile = match[1].trim();
    }
  };

  child.stdout.on('data', appendLog);
  child.stderr.on('data', appendLog);

  child.on('close', (code) => {
    testRunnerState.running = false;
    testRunnerState.finishTime = new Date().toISOString();
    testRunnerState.exitCode = code;
    if (!testRunnerState.lastOutputFile) {
      testRunnerState.lastOutputFile = getLatestDocxInOutput();
    }
  });
}

function exportDocxToPdf(docxPath, callback) {
  const pdfPath = docxPath.replace(/\.docx$/i, '.pdf');
  const psScript = `
    $ErrorActionPreference = 'Stop'
    $word = $null
    try {
      $word = New-Object -ComObject Word.Application
      $word.Visible = $false
      $word.DisplayAlerts = 0
      $doc = $word.Documents.Open('${docxPath.replace(/'/g, "''")}', $false, $true, $false)
      $doc.ExportAsFixedFormat('${pdfPath.replace(/'/g, "''")}', 17) # 17 = wdExportFormatPDF
      $doc.Close($false)
      Write-Output 'SUCCESS'
    } finally {
      if ($word) { $word.Quit(); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) }
      [GC]::Collect(); [GC]::WaitForPendingFinalizers()
    }
  `;

  const child = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript]);
  let output = '';
  let errOutput = '';

  child.stdout.on('data', (d) => output += d.toString());
  child.stderr.on('data', (d) => errOutput += d.toString());

  child.on('close', (code) => {
    if (code === 0 && output.includes('SUCCESS') && fs.existsSync(pdfPath)) {
      callback(null, pdfPath);
    } else {
      callback(new Error(errOutput || 'Gagal konversi ke PDF via Word COM'));
    }
  });
}

function getLatestDocxInOutput() {
  if (!fs.existsSync(OUTPUT_DIR)) return null;
  const files = fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.endsWith('.docx') && !f.startsWith('~$'))
    .map(f => ({ name: f, path: path.join(OUTPUT_DIR, f), time: fs.statSync(path.join(OUTPUT_DIR, f)).mtime }))
    .sort((a, b) => b.time - a.time);
  return files[0] ? files[0].path : null;
}

function readRequestBody(req, callback) {
  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if (body.length > 50 * 1024 * 1024) { // Max 50 MB (untuk image base64)
      req.connection.destroy();
    }
  });
  req.on('end', () => callback(body, null));
  req.on('error', err => callback(null, err));
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 [WeDocIt Studio Desktop v3.0] Server Aktif!`);
  console.log(`🌐 URL: http://127.0.0.1:${PORT}`);
  console.log(`📁 Data Workspace: ${WORKSPACE_FILE}`);
  console.log(`======================================================\n`);
});
