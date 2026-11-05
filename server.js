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
  const testedBy = process.env.DOC_TESTED_BY || 'QA Engineer';
  const npp = process.env.DOC_NPP || '-';
  const today = new Date().toLocaleDateString('id-ID');
  const initialDoc = {
    id: 'doc_' + Date.now(),
    title: process.env.DOC_TITLE || 'Unit Test Documentation',
    systemName: process.env.DOC_SYSTEM_NAME || 'Web Application',
    projectName: process.env.DOC_PROJECT_NAME || 'Application System',
    crNo: process.env.DOC_CR_NO || 'CR_UNIT_TEST',
    module: process.env.DOC_MODULE || 'Modul Aplikasi',
    shortDescription: process.env.DOC_SHORT_DESC || 'Pengujian dan verifikasi modul aplikasi.',
    scope: process.env.DOC_SCOPE || 'Verifikasi alur proses pengujian fitur terkait.',
    acceptanceCriteria: process.env.DOC_CRITERIA || 'Seluruh skenario pengujian berjalan sukses dan data tersimpan di sistem.',
    testedBy: testedBy,
    npp: npp,
    developers: [{ name: testedBy, npp: npp }],
    startDate: process.env.DOC_START_DATE || today,
    endDate: process.env.DOC_END_DATE || today,
    docDate: process.env.DOC_DATE || today,
    copyrightYear: process.env.DOC_YEAR || String(new Date().getFullYear()),
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

  // POST /api/active-doc (Ubah active document secara instan tanpa kirim megabyte payload)
  if (pathname === '/api/active-doc' && req.method === 'POST') {
    readRequestBody(req, (body, err) => {
      if (err) return sendJson(res, 400, { error: 'Payload tidak valid' });
      try {
        const { docId } = JSON.parse(body);
        if (docId && fs.existsSync(WORKSPACE_FILE)) {
          const wsRaw = fs.readFileSync(WORKSPACE_FILE, 'utf8');
          const ws = JSON.parse(wsRaw);
          ws.activeDocId = docId;
          fs.writeFileSync(WORKSPACE_FILE, JSON.stringify(ws, null, 2), 'utf8');
        }
        return sendJson(res, 200, { success: true });
      } catch (e) {
        return sendJson(res, 500, { error: e.message });
      }
    });
    return;
  }

  // POST /api/workspace
  if (pathname === '/api/workspace' && req.method === 'POST') {
    readRequestBody(req, (body, err) => {
      if (err) return sendJson(res, 400, { error: 'Payload tidak valid' });
      try {
        const workspaceData = JSON.parse(body);
        // Backup workspace dan smart-preserve screenshot valid agar tidak terhapus oleh payload kosong
        if (fs.existsSync(WORKSPACE_FILE)) {
          try {
            const existingRaw = fs.readFileSync(WORKSPACE_FILE, 'utf8');
            if (existingRaw && existingRaw.length > 5000) {
              fs.writeFileSync(WORKSPACE_FILE + '.bak', existingRaw, 'utf8');
              const existingData = JSON.parse(existingRaw);
              if (existingData.documents && workspaceData.documents) {
                workspaceData.documents.forEach(inDoc => {
                  const exDoc = existingData.documents.find(d => d.id === inDoc.id);
                  if (exDoc && exDoc.testCases && inDoc.testCases) {
                    inDoc.testCases.forEach((inTc, tcIdx) => {
                      const exTc = exDoc.testCases[tcIdx] || exDoc.testCases.find(t => t.id === inTc.id || t.tcNumberStr === inTc.tcNumberStr);
                      if (exTc && exTc.steps && inTc.steps) {
                        inTc.steps.forEach((inStep, sIdx) => {
                          const exStep = exTc.steps[sIdx] || exTc.steps.find(s => s.title === inStep.title);
                          if ((!inStep.screenshot || inStep.screenshot.length < 50) && exStep && exStep.screenshot && exStep.screenshot.length > 50) {
                            inStep.screenshot = exStep.screenshot;
                          }
                        });
                      }
                    });
                  }
                });
              }
            }
          } catch {}
        }
        fs.writeFileSync(WORKSPACE_FILE, JSON.stringify(workspaceData, null, 2), 'utf8');
        return sendJson(res, 200, { success: true, message: 'Workspace berhasil disimpan' });
      } catch (saveErr) {
        return sendJson(res, 500, { error: 'Gagal menyimpan workspace', details: saveErr.message });
      }
    });
    return;
  }

  // POST /api/sync-results (Menyinkronkan output/latest_run_results.json langsung ke workspace.json)
  if (pathname === '/api/sync-results' && req.method === 'POST') {
    try {
      const syncRes = syncResultsInternal();
      if (syncRes.error) {
        return sendJson(res, 400, syncRes);
      }
      return sendJson(res, 200, syncRes);
    } catch (eSync) {
      return sendJson(res, 500, { error: 'Gagal sinkronisasi hasil', details: eSync.message });
    }
  }

  // POST /api/auto-repair-tc (Auto-Fix & Re-run Partial Test Case)
  if (pathname === '/api/auto-repair-tc' && req.method === 'POST') {
    readRequestBody(req, (body) => {
      try {
        const payload = JSON.parse(body || '{}');
        const tcNo = payload.tcNo || 'TC-001';
        const docId = payload.docId || '';
        let specFile = payload.specFile || '';

        // Deteksi cerdas file skenario modular jika menggunakan V2 atau file spec spesifik
        const isV2 = docId.includes('v2') || (payload.module || '').includes('V2') || (specFile && specFile.includes('v2'));
        const v2Dir = path.join(ROOT_DIR, 'tests/09-rmis-admin-management-v2');

        const numMatch = tcNo.match(/\d+/);
        const padNum = numMatch ? String(parseInt(numMatch[0])).padStart(3, '0') : null;

        if (isV2 && padNum && fs.existsSync(v2Dir)) {
          const v2Files = fs.readdirSync(v2Dir).filter(f => f.startsWith(`tc-${padNum}`) && f.endsWith('.spec.ts'));
          if (v2Files.length > 0) {
            specFile = `tests/09-rmis-admin-management-v2/${v2Files[0]}`;
          }
        }

        if (!specFile) {
          specFile = isV2 ? 'tests/09-rmis-admin-management-v2' : 'tests/08-rmis-admin-management.spec.ts';
        }

        console.log(`[Auto-Repair] Memulai Run Skenario untuk ${tcNo} (${specFile})...`);

        const args = ['playwright', 'test', specFile];
        const isSingleTcSpec = specFile.includes('tc-') && specFile.endsWith('.spec.ts') && !specFile.includes('08-');
        if (!isSingleTcSpec) {
          args.push('-g', tcNo);
        }

        const child = spawn('npx.cmd', args, {
          cwd: ROOT_DIR,
          shell: true,
          env: { ...process.env, CI: '1' }
        });

        let testOutput = '';
        child.stdout?.on('data', d => { testOutput += d.toString(); });
        child.stderr?.on('data', d => { testOutput += d.toString(); });

        child.on('close', (code) => {
          console.log(`[Auto-Repair] Eksekusi ${tcNo} selesai dengan exit code: ${code}`);
          const syncRes = syncResultsInternal();
          return sendJson(res, 200, {
            success: code === 0,
            message: code === 0 ? `Skenario ${tcNo} berhasil dijalankan dan bukti tangkapan layar baru telah tersinkronisasi!` : `Pengujian ${tcNo} selesai dengan kode ${code}`,
            tcNo,
            specFile,
            exitCode: code,
            syncRes,
            outputSnippet: testOutput.slice(-500)
          });
        });
      } catch (err) {
        return sendJson(res, 500, { error: 'Gagal auto-repair: ' + err.message });
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
        // 1. Top-level files
        const topFiles = fs.readdirSync(testsDir).filter(f => f.endsWith('.spec.ts'));
        topFiles.forEach(f => {
          let label = f;
          let count = 0;
          try {
            const content = fs.readFileSync(path.join(testsDir, f), 'utf8');
            const matches = content.match(/\btest\s*\(\s*['"`]/g);
            count = matches ? matches.length : 0;
          } catch {}
          const tcStr = count > 0 ? ` (${count} TC)` : '';
          if (f.includes('08-rmis-admin-management') || f.includes('08-orms-admin-management')) label = `🎯 [V1.0 Full Suite] Administration Management Master Data CRUD${tcStr}`;
          else if (f.includes('07-orms-login-security')) label = `🎯 [ORMS] Login & Security Management${tcStr}`;
          else if (f.includes('06-orms-ldap')) label = `🎯 [ORMS] Integrasi LDAP Active Directory${tcStr}`;
          else if (f.includes('01-ap-non-kredit')) label = `Modul 1: AP Non-Kredit Offline${tcStr}`;
          else if (f.includes('02-pengujian')) label = `Modul 2: Pengujian AP Non-Kredit Offline${tcStr}`;
          else if (f.includes('03-ap-kredit')) label = `Modul 3: AP Kredit Offline${tcStr}`;
          else if (f.includes('04-rha')) label = `Modul 4: RHA Offline${tcStr}`;
          else if (f.includes('05-pelaksanaan-audit')) label = `Modul 5: Pelaksanaan Audit Online${tcStr}`;
          specs.push({ path: `tests/${f}`, name: f, label });
        });

        // 2. Subfolders (e.g. 09-rmis-admin-management-v2)
        const entries = fs.readdirSync(testsDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const subDirPath = path.join(testsDir, entry.name);
            const subFiles = fs.readdirSync(subDirPath).filter(f => f.endsWith('.spec.ts') && !f.startsWith('_'));
            subFiles.forEach(sf => {
              const fullSubPath = path.join(subDirPath, sf);
              let label = `${entry.name}/${sf}`;
              try {
                const content = fs.readFileSync(fullSubPath, 'utf8');
                const tcMatch = content.match(/test\s*\(\s*['"`](.*?)['"`]/);
                if (tcMatch && tcMatch[1]) {
                  label = `⚡ [V2.0] ${tcMatch[1]}`;
                } else {
                  label = `⚡ [V2.0] ${sf.replace('.spec.ts', '')}`;
                }
              } catch {}
              specs.push({
                path: `tests/${entry.name}/${sf}`,
                name: sf,
                label
              });
            });
          }
        }
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
      startPlaywrightTest(specFile, { headed: !!params.headed, grep: params.grep || '' });
      return sendJson(res, 202, {
        message: 'Pengujian Playwright berhasil dimulai di latar belakang',
        state: testRunnerState
      });
    });
    return;
  }

  // POST /api/export-pdf (Konversi DOCX ke PDF via Word COM)
  if (pathname === '/api/export-pdf' && req.method === 'POST') {
    readRequestBody(req, (body) => {
      let params = {};
      try { if (body) params = JSON.parse(body); } catch {}
      
      let docxPath = params.docxPath;

      // Jika dikirim file DOCX dalam format base64 dari browser
      if (params.base64Docx) {
        try {
          const rawName = (params.filename || 'Unit_Test_Document.docx').replace(/[^a-zA-Z0-9._-]/g, '_');
          const cleanDocxName = rawName.endsWith('.docx') ? rawName : `${rawName}.docx`;
          docxPath = path.join(OUTPUT_DIR, cleanDocxName);
          const buf = Buffer.from(params.base64Docx, 'base64');
          fs.writeFileSync(docxPath, buf);
        } catch (writeErr) {
          return sendJson(res, 500, { error: 'Gagal menyimpan file DOCX sementara di server', details: writeErr.message });
        }
      }

      if (!docxPath) {
        docxPath = getLatestDocxInOutput();
      }

      if (!docxPath || !fs.existsSync(docxPath)) {
        return sendJson(res, 400, { error: 'File DOCX tidak ditemukan untuk diekspor ke PDF' });
      }

      exportDocxToPdf(docxPath, (err, pdfPath) => {
        if (err) {
          return sendJson(res, 500, { error: 'Gagal mengekspor PDF via Microsoft Word', details: err.message });
        }
        const pdfFileName = path.basename(pdfPath);
        return sendJson(res, 200, {
          success: true,
          pdfPath,
          pdfUrl: `/output/${pdfFileName}`,
          filename: pdfFileName
        });
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

  // POST /api/ai/analyze-code (Menganalisis Source Code Secara Dinamis untuk Merancang Test Cases)
  if (pathname === '/api/ai/analyze-code' && req.method === 'POST') {
    readRequestBody(req, (body) => {
      try {
        const payload = JSON.parse(body || '{}');
        const codePath = payload.codePath || '';
        const scenarioName = payload.scenarioName || 'Modul Aplikasi';
        const systemName = payload.systemName || 'Sistem Informasi';
        const crNo = payload.crNo || 'CR_UNIT_TEST';
        const targetUrl = payload.targetUrl || 'http://localhost:4300';
        const userRole = payload.userRole || 'Admin / User';

        const result = analyzeComponentAndBuildTestCases(codePath, {
          scenarioName,
          systemName,
          crNo,
          targetUrl,
          userRole
        });

        // Simpan request ke data/ai_request.json untuk audit trail
        const aiRequestFile = path.join(DATA_DIR, 'ai_request.json');
        try {
          fs.writeFileSync(aiRequestFile, JSON.stringify({
            timestamp: new Date().toISOString(),
            request: payload,
            resultSummary: result.summary,
            totalTestCases: result.testCases.length
          }, null, 2), 'utf8');
        } catch {}

        return sendJson(res, 200, {
          success: true,
          summary: result.summary,
          testCases: result.testCases
        });
      } catch (err) {
        return sendJson(res, 500, { error: 'Gagal menganalisis source code: ' + err.message });
      }
    });
    return;
  }

  // POST /api/generate-spec (Otomatis membuat file Playwright spec baru dari dokumen aktif)
  if (pathname === '/api/generate-spec' && req.method === 'POST') {
    readRequestBody(req, (body) => {
      try {
        const payload = JSON.parse(body || '{}');
        const doc = payload.doc;
        if (!doc) return sendJson(res, 400, { error: 'Data dokumen tidak ditemukan pada payload.' });
        const result = generatePlaywrightSpecFromDocument(doc);
        return sendJson(res, 200, {
          success: true,
          message: `Berhasil membuat spec ${result.fileName}`,
          ...result
        });
      } catch (err) {
        return sendJson(res, 500, { error: 'Gagal membuat file spec: ' + err.message });
      }
    });
    return;
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

function syncResultsInternal() {
  const resultsFile = path.join(ROOT_DIR, 'output/latest_run_results.json');
  if (!fs.existsSync(resultsFile)) {
    return { error: 'File output/latest_run_results.json belum ada.' };
  }
  const latestData = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
  const wsData = JSON.parse(fs.readFileSync(WORKSPACE_FILE, 'utf8'));

  const runCr = (latestData.metadata?.crNo || '').replace(/[^0-9]/g, '');
  let targetDoc = null;
  if (latestData.metadata?.docId) {
    targetDoc = wsData.documents.find(d => d.id === latestData.metadata.docId);
  }
  if (!targetDoc && runCr) {
    const isV2 = (latestData.metadata?.module || latestData.metadata?.title || '').includes('V2');
    targetDoc = wsData.documents.find(d => {
      if (isV2 && !d.id.includes('v2')) return false;
      if (!isV2 && d.id.includes('v2')) return false;
      const docCr = ((d.metadata && (d.metadata.testCaseId || d.metadata.projectNo)) || '').replace(/[^0-9]/g, '');
      return docCr && docCr === runCr;
    });
    if (!targetDoc) {
      targetDoc = wsData.documents.find(d => {
        const docCr = ((d.metadata && (d.metadata.testCaseId || d.metadata.projectNo)) || '').replace(/[^0-9]/g, '');
        return docCr && docCr === runCr;
      });
    }
  }
  if (!targetDoc) {
    targetDoc = wsData.documents.find(d => d.id === wsData.activeDocId) || wsData.documents[0];
  }

  if (targetDoc && latestData.testCases) {
    if (latestData.testCases.length === 1 && targetDoc.testCases && targetDoc.testCases.length > 1) {
      // Mode Update Parsial (Grep / Single TC): Update/Upsert test case spesifik tanpa menghapus test case lainnya
      const incoming = latestData.testCases[0];
      const existIdx = targetDoc.testCases.findIndex(t => t.tcNumberStr === incoming.tcNumberStr || t.title === incoming.title);
      const mappedTc = {
        id: incoming.id || `tc_imported_${Date.now()}`,
        tcNumber: existIdx >= 0 ? targetDoc.testCases[existIdx].tcNumber : targetDoc.testCases.length + 1,
        tcNumberStr: incoming.tcNumberStr || `TC-${String(targetDoc.testCases.length + 1).padStart(3, '0')}`,
        role: incoming.role || 'Admin / IT Security',
        title: incoming.title,
        scenarioName: incoming.scenarioName || incoming.title,
        expectedResult: incoming.expectedResult || 'Berhasil',
        status: incoming.status || 'OK',
        steps: (incoming.steps || []).map((s, sIdx) => ({
          stepNumber: sIdx + 1,
          title: s.title,
          actionDescription: s.actionDescription,
          inputData: s.inputData || '-',
          expectedResult: s.expectedResult || 'Berhasil',
          screenshot: s.screenshot || '',
          pageUrl: s.pageUrl || '',
          status: s.status || 'READY',
          note: s.note || ''
        }))
      };
      if (existIdx >= 0) {
        targetDoc.testCases[existIdx] = mappedTc;
      } else {
        targetDoc.testCases.push(mappedTc);
      }
    } else {
      // Mode Full Run: Ganti seluruh daftar test case
      targetDoc.testCases = latestData.testCases.map((tc, idx) => ({
        id: tc.id || `tc_imported_${Date.now()}_${idx + 1}`,
        tcNumber: idx + 1,
        tcNumberStr: tc.tcNumberStr || `TC-${String(idx + 1).padStart(3, '0')}`,
        role: tc.role || 'Admin / IT Security',
        title: tc.title,
        scenarioName: tc.scenarioName || tc.title,
        expectedResult: tc.expectedResult || 'Berhasil',
        status: tc.status || 'OK',
        steps: (tc.steps || []).map((s, sIdx) => ({
          stepNumber: sIdx + 1,
          title: s.title,
          actionDescription: (tc.tcNumberStr === 'TC-010' && sIdx === 0) ? 'Menginput password kurang dari 8 karakter pada form login.' : s.actionDescription,
          inputData: s.inputData || '-',
          expectedResult: s.expectedResult || 'Berhasil',
          screenshot: s.screenshot || '',
          pageUrl: s.pageUrl || '',
          status: s.status || 'READY',
          note: s.note || ''
        }))
      }));
    }

    wsData.activeDocId = targetDoc.id;
    fs.writeFileSync(WORKSPACE_FILE, JSON.stringify(wsData, null, 2), 'utf8');
    return {
      success: true,
      message: `Berhasil menyinkronkan ${targetDoc.testCases.length} Test Case ke Dokumen Studio`,
      tcCount: targetDoc.testCases.length,
      docId: targetDoc.id
    };
  }
  return { error: 'Gagal memetakan test case ke dokumen.' };
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
  if (options.grep) {
    args.push('-g', options.grep);
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

function analyzeComponentAndBuildTestCases(codePath, options = {}) {
  const scenarioName = options.scenarioName || 'Modul Aplikasi';
  const systemName = options.systemName || 'Sistem Aplikasi';
  const targetUrl = options.targetUrl || 'http://localhost:4300';
  const userRole = options.userRole || 'Admin / User';

  let files = [];
  if (codePath && fs.existsSync(codePath)) {
    const stat = fs.statSync(codePath);
    if (stat.isDirectory()) {
      function scan(curr) {
        for (const f of fs.readdirSync(curr)) {
          if (f === 'node_modules' || f === '.git' || f === 'dist') continue;
          const p = path.join(curr, f);
          if (fs.statSync(p).isDirectory()) scan(p);
          else if (/\.(html|ts|tsx|vue|jsx|js)$/i.test(f) && !f.endsWith('.spec.ts')) {
            files.push(p);
          }
        }
      }
      scan(codePath);
    } else {
      files.push(codePath);
    }
  }

  let combinedHtml = '';
  let combinedTs = '';
  for (const f of files) {
    const c = fs.readFileSync(f, 'utf8');
    if (f.endsWith('.html')) combinedHtml += '\n' + c;
    else combinedTs += '\n' + c;
  }

  // Inputs
  const inputs = [];
  const seenInputs = new Set();
  const inputRegex = /<(input|textarea|p-password|p-inputnumber|p-select|p-dropdown|p-checkbox|p-toggleswitch)[^>]*>/gi;
  let m;
  while ((m = inputRegex.exec(combinedHtml)) !== null) {
    const tagStr = m[0];
    const nameMatch = tagStr.match(/formControlName="([^"]+)"|id="([^"]+)"|name="([^"]+)"/i);
    const placeholderMatch = tagStr.match(/placeholder="([^"]+)"/i);
    const isRequired = tagStr.includes('required') || combinedHtml.includes(`${nameMatch?.[1] || ''}.invalid`) || tagStr.includes('text-red-500');
    const isPassword = m[1].toLowerCase() === 'p-password' || tagStr.includes('type="password"');
    const hasToggleMask = tagStr.includes('toggleMask');
    const fieldName = nameMatch ? (nameMatch[1] || nameMatch[2] || nameMatch[3]) : 'field';
    if (!seenInputs.has(fieldName)) {
      seenInputs.add(fieldName);
      inputs.push({
        tag: m[1],
        name: fieldName,
        placeholder: placeholderMatch ? placeholderMatch[1] : fieldName,
        isPassword,
        hasToggleMask,
        isRequired
      });
    }
  }

  // Buttons
  const buttons = [];
  const seenButtons = new Set();
  const btnRegex = /<(button|p-button|a)[^>]*>([\s\S]*?)<\/\1>/gi;
  while ((m = btnRegex.exec(combinedHtml)) !== null) {
    const fullTag = m[0];
    const innerText = m[2].replace(/<[^>]+>/g, '').trim();
    const labelAttr = (fullTag.match(/label="([^"]+)"/i) || [])[1];
    let label = (labelAttr || innerText).replace(/\s+/g, ' ').trim();
    const routerLink = (fullTag.match(/routerLink="([^"]+)"/i) || [])[1];
    const type = (fullTag.match(/type="([^"]+)"/i) || [])[1] || 'button';
    if (label && !seenButtons.has(label) && label.length < 50) {
      seenButtons.add(label);
      buttons.push({ label, type, routerLink });
    }
  }

  // Validations
  const validations = [];
  const valRegex = /<(?:small|div|span)[^>]*(?:text-red|invalid|error)[^>]*>([\s\S]*?)<\/(?:small|div|span)>/gi;
  while ((m = valRegex.exec(combinedHtml)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, '').trim();
    if (text && text.length > 3 && text.length < 80 && !validations.includes(text) && !text.includes('{{')) {
      validations.push(text);
    }
  }

  // Tables
  const hasTable = /<p-table|<table/i.test(combinedHtml);

  // 1. Deteksi Khusus: RMIS Executive Main Dashboard (Multi-Source Portal: RBBR, MIO, MRM)
  const isExecutiveWelcome = /welcome/i.test(codePath) 
    || scenarioName.toLowerCase().includes('main dashboard')
    || scenarioName.toLowerCase().includes('executive')
    || (combinedHtml.includes('setSource') || (/rbbr/i.test(combinedHtml) && /mio/i.test(combinedHtml) && /mrm/i.test(combinedHtml)));

  if (isExecutiveWelcome) {
    const dashTcs = [
      {
        tcNumberStr: 'TC-001',
        title: 'Filter & Switcher Sumber Data Eksekutif (All, RBBR, MIO, MRM)',
        scenarioName: 'Pengujian Interaktivitas Pill Switcher Sumber Data Dashboard',
        expectedResult: 'Kontainer dashboard berhasil memfilter dan menampilkan kartu risiko sesuai sumber data yang dipilih secara responsif.',
        role: userRole,
        status: 'OK',
        steps: [
          {
            stepNumber: 1,
            title: 'Akses Halaman Utama Executive Dashboard',
            actionDescription: `Pengguna membuka halaman utama RMIS pada URL ${targetUrl}.`,
            inputData: `URL: ${targetUrl}`,
            expectedResult: 'Halaman dashboard berhasil dimuat dengan banner sapaan dan tombol switcher sumber data aktif.'
          },
          {
            stepNumber: 2,
            title: 'Uji Switcher: Semua Data (3 Source)',
            actionDescription: 'Mengklik tombol pill switcher "Semua Data (3 Source)" pada header dashboard.',
            inputData: 'Klik: Semua Data (3 Source)',
            expectedResult: 'Grid dashboard menampilkan seluruh kartu risiko dari 3 sumber terintegrasi (RBBR, MIO, dan MRM).'
          },
          {
            stepNumber: 3,
            title: 'Uji Switcher: Filter Khusus Modul RBBR',
            actionDescription: 'Mengklik tombol pill switcher "RBBR".',
            inputData: 'Klik: RBBR',
            expectedResult: 'Tampilan dashboard menyaring konten dan hanya menampilkan seksi matriks profil risiko dan TKB RBBR.'
          },
          {
            stepNumber: 4,
            title: 'Uji Switcher: Filter Khusus Modul MIO',
            actionDescription: 'Mengklik tombol pill switcher "MIO".',
            inputData: 'Klik: MIO',
            expectedResult: 'Tampilan dashboard hanya menyajikan indikator ketersediaan alat likuid dan chart tren limit MIO.'
          },
          {
            stepNumber: 5,
            title: 'Uji Switcher: Filter Khusus Modul MRM',
            actionDescription: 'Mengklik tombol pill switcher "MRM".',
            inputData: 'Klik: MRM',
            expectedResult: 'Tampilan dashboard menyaring dan menampilkan ringkasan Model Risk Management.'
          }
        ]
      },
      {
        tcNumberStr: 'TC-002',
        title: 'Dashboard Eksekutif - Ringkasan Potongan Data RBBR & Tingkat Kesehatan Bank',
        scenarioName: 'Verifikasi Visualisasi Matriks Profil Risiko, Rentabilitas, dan Donut Chart TKB',
        expectedResult: 'Seluruh komponen kartu RBBR ter-render sempurna dengan nilai matriks tren dan chart TKB yang proporsional.',
        role: userRole,
        status: 'OK',
        steps: [
          {
            stepNumber: 1,
            title: 'Periksa Ringkasan Profil Risiko & Rentabilitas',
            actionDescription: 'Memeriksa deskripsi teks dan badge status profil risiko serta rentabilitas bank.',
            inputData: '-',
            expectedResult: 'Teks narasi profil risiko dan rentabilitas tampil jelas dan sesuai data backend.'
          },
          {
            stepNumber: 2,
            title: 'Verifikasi Matriks Tata Kelola (GCG) & Permodalan',
            actionDescription: 'Memeriksa tabel perbandingan nilai semester (Jun vs Des) dan indikator tren naik/turun/stabil.',
            inputData: '-',
            expectedResult: 'Tabel matriks menampilkan baris komponen, nilai perbandingan semester, serta simbol arah tren yang valid.'
          },
          {
            stepNumber: 3,
            title: 'Verifikasi Visualisasi Donut Chart Peringkat TKB',
            actionDescription: 'Memeriksa render grafik donut Tingkat Kesehatan Bank beserta label kompositnya.',
            inputData: '-',
            expectedResult: 'Grafik donut TKB tampil utuh di tengah kartu dengan pewarnaan peringkat komposit yang tepat.'
          }
        ]
      },
      {
        tcNumberStr: 'TC-003',
        title: 'Dashboard Eksekutif - Ringkasan Potongan Data MIO (Middle Office)',
        scenarioName: 'Verifikasi Status Ketersediaan Alat Likuid, Risk Appetite, dan Grafik Likuiditas',
        expectedResult: 'Indikator status operasional likuiditas dan chart ECharts MIO tersaji lengkap tanpa kendala rendering.',
        role: userRole,
        status: 'OK',
        steps: [
          {
            stepNumber: 1,
            title: 'Verifikasi Badge Status Ketersediaan Alat Likuid',
            actionDescription: 'Memeriksa kotak indikator alat likuid di kolom pertama kartu MIO.',
            inputData: '-',
            expectedResult: 'Badge status menampilkan label kondisi likuiditas (NORMAL/WASPADA) dengan warna kontras standar.'
          },
          {
            stepNumber: 2,
            title: 'Verifikasi Indikator Range Risk Appetite',
            actionDescription: 'Memeriksa kotak status kesesuaian operasional terhadap limit toleransi risiko.',
            inputData: '-',
            expectedResult: 'Status toleransi risiko tampil jelas (contoh: "DALAM RANGE RISK APPETITE").'
          },
          {
            stepNumber: 3,
            title: 'Verifikasi Grafik ECharts Ketahanan & Kualitas Likuiditas',
            actionDescription: 'Memeriksa visualisasi grafik chart pada kolom kedua dan ketiga kartu MIO.',
            inputData: '-',
            expectedResult: 'Grafik ECharts ketahanan likuiditas dan tren limit ter-render rapi dengan sumbu dan legenda aktif.'
          }
        ]
      },
      {
        tcNumberStr: 'TC-004',
        title: 'Dashboard Eksekutif - Ringkasan Potongan Data MRM (Model Risk Management)',
        scenarioName: 'Verifikasi Metrik Model Inventory, Status Validasi, dan Matriks Life Cycle',
        expectedResult: 'Metrik agregasi model risiko kuantitatif terdisplay akurat sesuai klasifikasi tiering perbankan.',
        role: userRole,
        status: 'OK',
        steps: [
          {
            stepNumber: 1,
            title: 'Verifikasi Metrik Total Model Inventory',
            actionDescription: 'Memeriksa angka rekapitulasi jumlah model aktif dan dalam pengembangan.',
            inputData: '-',
            expectedResult: 'Angka total model risiko terdata dan tersaji pada tile ringkasan.'
          },
          {
            stepNumber: 2,
            title: 'Verifikasi Distribusi Tiering & Tingkat Risiko Model',
            actionDescription: 'Memeriksa visualisasi proporsi model berdasarkan Tier 1, Tier 2, dan Tier 3.',
            inputData: '-',
            expectedResult: 'Distribusi tier model risiko terpetakan proporsional sesuai data master model.'
          },
          {
            stepNumber: 3,
            title: 'Verifikasi Siklus Hidup & Kepatuhan Validasi Model',
            actionDescription: 'Memeriksa ringkasan kepatuhan validasi berkala model risiko perbankan.',
            inputData: '-',
            expectedResult: 'Status tahapan life cycle dan indikator kepatuhan validasi model terdisplay dengan benar.'
          }
        ]
      },
      {
        tcNumberStr: 'TC-005',
        title: 'Dashboard Eksekutif - Cross-Navigation ke Modul Operasional Terkait',
        scenarioName: 'Pengujian Tautan Drilldown Navigasi dari Dashboard ke Sub-Modul Detil',
        expectedResult: 'Pengguna dapat bertransisi secara seamless dari kartu ringkasan dashboard menuju halaman modul operasional penuh.',
        role: userRole,
        status: 'OK',
        steps: [
          {
            stepNumber: 1,
            title: 'Navigasi Drilldown ke Modul RBBR / TKB',
            actionDescription: 'Pengguna mengklik tombol atau tautan navigasi detail pada kartu RBBR.',
            inputData: 'Klik: Navigasi Modul RBBR',
            expectedResult: 'Sistem mengalihkan tampilan ke modul operasional RBBR (/rbbr).'
          },
          {
            stepNumber: 2,
            title: 'Navigasi Drilldown ke Modul Middle Office (MIO)',
            actionDescription: 'Pengguna mengklik tombol atau tautan navigasi detail pada kartu MIO.',
            inputData: 'Klik: Navigasi Modul MIO',
            expectedResult: 'Sistem mengalihkan tampilan ke modul operasional Middle Office (/mio).'
          },
          {
            stepNumber: 3,
            title: 'Navigasi Drilldown ke Modul Model Risk Management (MRM)',
            actionDescription: 'Pengguna mengklik tombol atau tautan navigasi detail pada kartu MRM.',
            inputData: 'Klik: Navigasi Modul MRM',
            expectedResult: 'Sistem mengalihkan tampilan ke modul operasional Model Risk Management (/risk-management).'
          }
        ]
      }
    ];

    return {
      summary: {
        filesCount: files.length,
        inputs: inputs.length,
        buttons: buttons.length,
        validations: validations.length,
        dashboardType: 'RMIS Executive Multi-Source Portal (RBBR, MIO, MRM)',
        scannedPath: codePath
      },
      testCases: dashTcs
    };
  }

  // 2. Deteksi Khusus: Widget Dashboard (misal src/app/pages/dashboard)
  const isWidgetDashboard = /pages[\\\/]dashboard/i.test(codePath) 
    || combinedHtml.includes('app-stats-widget') 
    || combinedHtml.includes('app-recent-sales-widget')
    || combinedHtml.includes('app-revenue-stream-widget');

  if (isWidgetDashboard) {
    const widgetTcs = [
      {
        tcNumberStr: 'TC-001',
        title: 'Verifikasi Widget Statistik & Key Performance Indicators (KPI)',
        scenarioName: 'Pengujian Metrik Ringkasan Utama pada Dashboard',
        expectedResult: 'Widget statistik menampilkan angka kalkulasi metrik utama secara real-time dan akurat.',
        role: userRole,
        status: 'OK',
        steps: [
          {
            stepNumber: 1,
            title: 'Akses Halaman Dashboard Utama',
            actionDescription: `Membuka halaman dashboard pada URL ${targetUrl}/dashboard.`,
            inputData: `URL: ${targetUrl}/dashboard`,
            expectedResult: 'Halaman dashboard termuat sempurna beserta seluruh grid widget statistik.'
          },
          {
            stepNumber: 2,
            title: 'Verifikasi Tile Metrik Statistik (Stats Widget)',
            actionDescription: 'Memeriksa ketersediaan kartu metrik, angka pertumbuhan, dan ikon indikator.',
            inputData: '-',
            expectedResult: 'Seluruh kartu metrik KPI ter-render rapi dengan label dan nilai yang proporsional.'
          }
        ]
      },
      {
        tcNumberStr: 'TC-002',
        title: 'Verifikasi Grafik Visualisasi Tren & Alur Pendapatan (Revenue Stream)',
        scenarioName: 'Pengujian Render Grafik Bar/Line Chart Alur Risiko & Finansial',
        expectedResult: 'Grafik tren berhasil ter-render lengkap dengan sumbu horizontal, vertikal, dan tooltip data.',
        role: userRole,
        status: 'OK',
        steps: [
          {
            stepNumber: 1,
            title: 'Periksa Komponen Grafik Revenue Stream',
            actionDescription: 'Mengidentifikasi kontainer grafik tren pada sisi kanan dashboard.',
            inputData: '-',
            expectedResult: 'Grafik bar/line chart tampil interaktif dengan skala data yang terbaca jelas.'
          },
          {
            stepNumber: 2,
            title: 'Uji Interaktivitas Hover pada Grafik',
            actionDescription: 'Mengarahkan kursor mouse ke salah satu titik data atau batang grafik.',
            inputData: '-',
            expectedResult: 'Tooltip informasi nilai detail titik data muncul secara dinamis di layar.'
          }
        ]
      },
      {
        tcNumberStr: 'TC-003',
        title: 'Verifikasi Tabel Ringkasan Transaksi / Aktivitas Terkini (Recent Activity)',
        scenarioName: 'Pengujian Tampilan Daftar Transaksi Operasional Terbaru',
        expectedResult: 'Tabel menyajikan daftar aktivitas terkini secara kronologis dengan data atribut valid.',
        role: userRole,
        status: 'OK',
        steps: [
          {
            stepNumber: 1,
            title: 'Tinjau Daftar Baris Transaksi Terkini',
            actionDescription: 'Memeriksa baris-baris data aktivitas terbaru pada widget Recent Activity.',
            inputData: '-',
            expectedResult: 'Daftar aktivitas terkini tampil lengkap beserta status dan timestamp.'
          }
        ]
      },
      {
        tcNumberStr: 'TC-004',
        title: 'Verifikasi Panel Kategori & Peringkat Tertinggi (Best Performing)',
        scenarioName: 'Pengujian Agregasi Kategori Produk / Entitas Risiko Teratas',
        expectedResult: 'Daftar entitas peringkat teratas terurut sesuai urutan volume atau eksposur risiko.',
        role: userRole,
        status: 'OK',
        steps: [
          {
            stepNumber: 1,
            title: 'Periksa Daftar Peringkat Entitas Teratas',
            actionDescription: 'Memeriksa pemeringkatan kategori/produk pada widget Best Performing.',
            inputData: '-',
            expectedResult: 'Entitas tersusun secara descending sesuai besaran volume atau skor risiko.'
          }
        ]
      },
      {
        tcNumberStr: 'TC-005',
        title: 'Verifikasi Panel Notifikasi & Peringatan Sistem (Notifications Feed)',
        scenarioName: 'Pengujian Alur Pemberitahuan Penting & Log Peringatan Sistem',
        expectedResult: 'Panel notifikasi menampilkan daftar peringatan dengan indikator urgensi yang sesuai.',
        role: userRole,
        status: 'OK',
        steps: [
          {
            stepNumber: 1,
            title: 'Tinjau Log Pemberitahuan Sistem Terkini',
            actionDescription: 'Memeriksa feed pesan notifikasi, badge kategori, dan waktu diterbitkan.',
            inputData: '-',
            expectedResult: 'Pesan notifikasi dan alert ter-render jelas dengan warna status yang kontras.'
          }
        ]
      }
    ];

    return {
      summary: {
        filesCount: files.length,
        inputs: inputs.length,
        buttons: buttons.length,
        validations: validations.length,
        dashboardType: 'RMIS Executive Widgets Dashboard',
        scannedPath: codePath
      },
      testCases: widgetTcs
    };
  }

  // Now assemble dynamic test cases based on actual components:
  const tcs = [];
  let tcIdx = 1;

  // TC-1: UI Access & Verification
  const inputSummary = inputs.map(i => i.placeholder || i.name).filter(Boolean).slice(0, 5).join(', ');
  const btnSummary = buttons.map(b => b.label).filter(Boolean).slice(0, 4).join(', ');
  tcs.push({
    tcNumberStr: `TC-${String(tcIdx++).padStart(3, '0')}`,
    title: `Verifikasi Tampilan Antarmuka Halaman ${scenarioName}`,
    scenarioName: `Memeriksa Komponen Antarmuka Form & Aksi pada ${scenarioName}`,
    expectedResult: `Halaman ${scenarioName} berhasil dimuat lengkap dengan seluruh field input dan tombol aksi aktif.`,
    role: userRole,
    status: 'OK',
    steps: [
      {
        stepNumber: 1,
        title: `Akses Halaman ${scenarioName}`,
        actionDescription: `Pengguna membuka halaman modul pada target URL (${targetUrl}).`,
        inputData: '-',
        expectedResult: `Halaman ${scenarioName} terbuka sempurna dan elemen antarmuka termuat.`
      },
      {
        stepNumber: 2,
        title: 'Verifikasi Komponen Visual Halaman',
        actionDescription: `Memeriksa ketersediaan komponen yang terdeteksi: Input (${inputSummary || 'Form Controls'}), Tombol (${btnSummary || 'Aksi'}).`,
        inputData: '-',
        expectedResult: 'Seluruh komponen visual tampil proporsional sesuai rancangan antarmuka.'
      }
    ]
  });

  // Table TC (if table present)
  if (hasTable) {
    tcs.push({
      tcNumberStr: `TC-${String(tcIdx++).padStart(3, '0')}`,
      title: `Verifikasi Tampilan Tabel dan Daftar Data ${scenarioName}`,
      scenarioName: `Melihat Daftar Entri Data pada Tabel ${scenarioName}`,
      expectedResult: 'Tabel menampilkan daftar data lengkap dengan kolom dan baris aksi operasional.',
      role: userRole,
      status: 'OK',
      steps: [
        {
          stepNumber: 1,
          title: 'Periksa Tampilan Header Kolom Tabel',
          actionDescription: 'Memeriksa kolom-kolom tabel data dan tata letak grid.',
          inputData: '-',
          expectedResult: 'Header kolom tabel tampil terstruktur dan rapi.'
        },
        {
          stepNumber: 2,
          title: 'Verifikasi Aksi Baris Tabel',
          actionDescription: 'Memeriksa ketersediaan tombol aksi operasional pada setiap baris tabel.',
          inputData: '-',
          expectedResult: 'Tombol aksi pada baris tabel dapat diakses pengguna sesuai hak akses role.'
        }
      ]
    });
  }

  // Password toggleMask TC (if password field with toggleMask exists)
  const pwdField = inputs.find(i => i.isPassword && i.hasToggleMask);
  if (pwdField) {
    tcs.push({
      tcNumberStr: `TC-${String(tcIdx++).padStart(3, '0')}`,
      title: `Fitur Masking dan Unmasking Karakter ${pwdField.name.toUpperCase()}`,
      scenarioName: `Pengujian Toggle Visibility Password pada Form`,
      expectedResult: `Karakter password dapat disembunyikan dan ditampilkan menggunakan toggle ikon mata.`,
      role: userRole,
      status: 'OK',
      steps: [
        {
          stepNumber: 1,
          title: 'Input Password dalam Kondisi Terselubung',
          actionDescription: `Memasukkan teks ke dalam field ${pwdField.name} dan memastikan karakter tersamarkan bullet.`,
          inputData: `${pwdField.name}: ********`,
          expectedResult: 'Karakter password tersembunyi untuk menjaga privasi kredensial pengguna.'
        },
        {
          stepNumber: 2,
          title: 'Klik Toggle Eye Icon untuk Menampilkan Teks',
          actionDescription: 'Mengklik ikon mata (toggle mask) pada sisi kanan field password.',
          inputData: '-',
          expectedResult: 'Karakter password tampil dalam format teks biasa (unmasked) secara jelas.'
        }
      ]
    });
  }

  // Mandatory Form Validation TC (if required inputs or validation messages exist)
  const reqInputs = inputs.filter(i => i.isRequired);
  if (reqInputs.length > 0 || validations.length > 0) {
    const reqNames = reqInputs.map(i => i.name).join(', ') || 'seluruh field wajib';
    const valText = validations.slice(0, 3).join(' & ') || 'Pesan validasi wajib diisi';
    tcs.push({
      tcNumberStr: `TC-${String(tcIdx++).padStart(3, '0')}`,
      title: `Validasi Mandatory Fields Kosong pada Form ${scenarioName}`,
      scenarioName: `Proteksi Pengiriman Form Tanpa Mengisi Field Wajib (${reqNames})`,
      expectedResult: `Sistem mencegah pengiriman form dan memunculkan indikator validasi (${valText}).`,
      role: userRole,
      status: 'OK',
      steps: [
        {
          stepNumber: 1,
          title: 'Kosongkan Field Mandatory Form',
          actionDescription: `Membuka formulir dan mengosongkan field wajib (${reqNames}).`,
          inputData: `Field Kosong: ${reqNames}`,
          expectedResult: 'Field terdeteksi kosong dan tombol submit/simpan tetap dalam status disabled atau divalidasi.'
        },
        {
          stepNumber: 2,
          title: 'Verifikasi Pesan dan Indikator Validasi Error',
          actionDescription: `Memeriksa tampilan umpan balik validasi (${valText}).`,
          inputData: '-',
          expectedResult: `Sistem menandai field dengan border merah serta menampilkan pesan validasi secara presisi.`
        }
      ]
    });
  }

  // Specific validation cases (e.g. minlength, pattern)
  const minLengthVal = validations.find(v => v.toLowerCase().includes('karakter') || v.toLowerCase().includes('minimal'));
  if (minLengthVal) {
    tcs.push({
      tcNumberStr: `TC-${String(tcIdx++).padStart(3, '0')}`,
      title: `Validasi Batas Minimal Karakter (${minLengthVal})`,
      scenarioName: `Pengujian Boundary Limit Nilai Input`,
      expectedResult: `Sistem menolak input yang belum memenuhi batas minimal karakter (${minLengthVal}).`,
      role: userRole,
      status: 'OK',
      steps: [
        {
          stepNumber: 1,
          title: 'Input Nilai di Bawah Batas Minimal',
          actionDescription: 'Memasukkan karakter yang panjangnya kurang dari batas minimal yang ditentukan.',
          inputData: 'Input: 5 karakter (kurang dari syarat)',
          expectedResult: 'Form mendeteksi panjang password belum memenuhi syarat.'
        },
        {
          stepNumber: 2,
          title: 'Verifikasi Peringatan Validasi Boundary',
          actionDescription: `Memeriksa pesan kesalahan yang muncul di bawah input field.`,
          inputData: '-',
          expectedResult: `Muncul pesan peringatan "${minLengthVal}" dan aksi simpan dicegah.`
        }
      ]
    });
  }

  // Main Action / Submit Button TC
  const mainBtn = buttons.find(b => /sign in|login|save|simpan|submit|tambah/i.test(b.label)) || buttons[0];
  if (mainBtn) {
    tcs.push({
      tcNumberStr: `TC-${String(tcIdx++).padStart(3, '0')}`,
      title: `Pengujian Eksekusi Aksi ${mainBtn.label} (Normal Case)`,
      scenarioName: `Memproses Aksi ${mainBtn.label} dengan Data Valid`,
      expectedResult: `Sistem sukses memproses aksi ${mainBtn.label} dan memperbarui data/status pada aplikasi.`,
      role: userRole,
      status: 'OK',
      steps: [
        {
          stepNumber: 1,
          title: 'Lengkapi Seluruh Parameter Data Valid',
          actionDescription: `Mengisi seluruh field form (${inputs.map(i => i.name).slice(0, 4).join(', ')}) dengan nilai valid.`,
          inputData: 'Data Valid Parameter Uji',
          expectedResult: `Seluruh form terisi valid dan tombol ${mainBtn.label} berada dalam status aktif.`
        },
        {
          stepNumber: 2,
          title: `Klik Tombol ${mainBtn.label} dan Verifikasi Hasil`,
          actionDescription: `Menekan tombol ${mainBtn.label} dan mengamati respons server.`,
          inputData: '-',
          expectedResult: `Proses berhasil dieksekusi tanpa error, data tersimpan atau sesi dialihkan sesuai alur bisnis.`
        }
      ]
    });

    // Negative / Failure Handling TC
    tcs.push({
      tcNumberStr: `TC-${String(tcIdx++).padStart(3, '0')}`,
      title: `Pengujian Penanganan Respons Error pada Aksi ${mainBtn.label} (Abnormal Case)`,
      scenarioName: `Proteksi Kesalahan Input Parameter atau Kegagalan Sistem`,
      expectedResult: `Sistem menolak proses dan memberikan feedback pesan error yang informatif serta aman.`,
      role: userRole,
      status: 'OK',
      steps: [
        {
          stepNumber: 1,
          title: 'Kondisikan Parameter Tidak Sesuai / Invalid',
          actionDescription: 'Memasukkan nilai parameter uji yang tidak sesuai dengan database atau memicu kondisi penolakan.',
          inputData: 'Parameter Invalid / Penolakan Sistem',
          expectedResult: 'Parameter dimasukkan ke dalam form pengujian.'
        },
        {
          stepNumber: 2,
          title: 'Verifikasi Notifikasi Feedback Error dari Sistem',
          actionDescription: `Menekan tombol ${mainBtn.label} dan memeriksa toast / pesan penolakan.`,
          inputData: '-',
          expectedResult: 'Sistem menampilkan notifikasi pesan penolakan tanpa mengekspos exception backend.'
        }
      ]
    });
  }

  // Navigation / RouterLink TC (if any link exists)
  const navBtn = buttons.find(b => b.routerLink);
  if (navBtn) {
    tcs.push({
      tcNumberStr: `TC-${String(tcIdx++).padStart(3, '0')}`,
      title: `Pengujian Navigasi Tautan ${navBtn.label || navBtn.routerLink}`,
      scenarioName: `Peralihan Halaman via Router Link Menuju ${navBtn.routerLink}`,
      expectedResult: `Sistem sukses mengalihkan pengguna ke route ${navBtn.routerLink}.`,
      role: userRole,
      status: 'OK',
      steps: [
        {
          stepNumber: 1,
          title: `Klik Tautan ${navBtn.label || 'Navigasi'}`,
          actionDescription: `Pengguna mengklik tautan navigasi menuju ${navBtn.routerLink}.`,
          inputData: `Route Target: ${navBtn.routerLink}`,
          expectedResult: `Browser merespons klik dan mengarahkan ke halaman target.`
        },
        {
          stepNumber: 2,
          title: 'Verifikasi Halaman Tujuan Berhasil Dimuat',
          actionDescription: `Memeriksa URL browser dan komponen halaman tujuan (${navBtn.routerLink}).`,
          inputData: '-',
          expectedResult: `Halaman tujuan ${navBtn.routerLink} terbuka sempurna tanpa hambatan navigasi.`
        }
      ]
    });
  }

  return {
    summary: {
      filesCount: files.length,
      inputs: inputs.length,
      buttons: buttons.length,
      validations: validations.length,
      hasTable,
      scannedPath: codePath
    },
    testCases: tcs
  };
}

function getLatestDocxInOutput() {
  if (!fs.existsSync(OUTPUT_DIR)) return null;
  const files = fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.endsWith('.docx') && !f.startsWith('~$'))
    .map(f => ({ name: f, path: path.join(OUTPUT_DIR, f), time: fs.statSync(path.join(OUTPUT_DIR, f)).mtime }))
    .sort((a, b) => b.time - a.time);
  return files[0] ? files[0].path : null;
}

function generatePlaywrightSpecFromDocument(doc) {
  if (!doc) throw new Error('Dokumen tidak ditemukan');
  const meta = doc.metadata || {};
  const tcs = doc.testCases || [];
  if (tcs.length === 0) throw new Error('Dokumen ini belum memiliki Test Case.');

  const testsDir = path.join(ROOT_DIR, 'tests');
  if (!fs.existsSync(testsDir)) fs.mkdirSync(testsDir, { recursive: true });

  const existingFiles = fs.readdirSync(testsDir).filter(f => f.endsWith('.spec.ts'));
  let maxIdx = 0;
  existingFiles.forEach(f => {
    const match = f.match(/^(\d+)[-_]/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxIdx) maxIdx = n;
    }
  });

  const nextIdx = String(maxIdx + 1).padStart(2, '0');
  const rawSlug = (meta.scenarioName || meta.module || 'unit-test')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const fileName = `${nextIdx}-${rawSlug}.spec.ts`;
  const filePath = path.join(testsDir, fileName);

  const lines = [];
  const isRmis = (meta.systemName || '').toLowerCase().includes('rmis') || (meta.projectName || '').toLowerCase().includes('rmis') || true;
  lines.push(`import { test, expect, Page } from '../src/fixtures/wedocit';`);
  lines.push(`import { ensureRmisAuthenticated, navigateToRmis } from '../src/helpers/rmis-auth';`);
  lines.push(`import * as path from 'path';`);
  lines.push(`import * as fs from 'fs';`);
  lines.push(``);
  lines.push(`const rmisAuthFile = path.resolve(process.cwd(), '.auth/user_rmis_admin.json');`);
  lines.push(`const legacyAuthFile = path.resolve(process.cwd(), '.auth/user_orms_admin.json');`);
  lines.push(`const activeAuthFile = fs.existsSync(rmisAuthFile) ? rmisAuthFile : (fs.existsSync(legacyAuthFile) ? legacyAuthFile : undefined);`);
  lines.push(``);
  lines.push(`test.use({`);
  lines.push(`  baseURL: process.env.RMIS_BASE_URL || process.env.ORMS_BASE_URL || '${meta.testUrl || 'http://localhost:4300'}',`);
  lines.push(`  viewport: { width: 1366, height: 768 },`);
  lines.push(`  storageState: activeAuthFile`);
  lines.push(`});`);
  lines.push(``);
  lines.push(`test.describe('Unit Test Suite: ${meta.title || meta.scenarioName || 'Automated Unit Test'}', () => {`);
  lines.push(``);
  lines.push(`  test.beforeEach(async ({ page, wedocit }) => {`);
  lines.push(`    wedocit.setMetadata({`);
  lines.push(`      docId: ${JSON.stringify(doc.id || '')},`);
  lines.push(`      systemName: ${JSON.stringify(meta.systemName || 'Risk Management Information System (RMIS)')},`);
  lines.push(`      projectName: ${JSON.stringify(meta.projectName || meta.systemName || 'Risk Management Information System (RMIS)')},`);
  lines.push(`      crNo: ${JSON.stringify(meta.testCaseId || meta.projectNo || 'CR 60133')},`);
  lines.push(`      title: ${JSON.stringify(meta.title || 'Unit Test Documentation')},`);
  lines.push(`      module: ${JSON.stringify(meta.scenarioName || meta.module || 'Modul Aplikasi')},`);
  lines.push(`      shortDescription: ${JSON.stringify(meta.shortDescription || 'Pengujian dan verifikasi modul aplikasi.')},`);
  lines.push(`      testedBy: ${JSON.stringify(meta.testedBy || 'QA Engineer')},`);
  lines.push(`      npp: ${JSON.stringify(meta.npp || '-')}`);
  lines.push(`    });`);
  lines.push(``);
  lines.push(`    await ensureRmisAuthenticated(page);`);
  lines.push(`  });`);
  lines.push(``);

  tcs.forEach((tc, idx) => {
    const tcNo = tc.tcNumberStr || `TC-${String(idx + 1).padStart(3, '0')}`;
    const tcTitle = tc.title || `Test Case ${idx + 1}`;
    lines.push(`  test('[${tcNo}] ${tcTitle.replace(/'/g, "\\'")}', async ({ page, wedocit }) => {`);
    lines.push(`    wedocit.setTestCase({`);
    lines.push(`      tcNumberStr: ${JSON.stringify(tcNo)},`);
    lines.push(`      scenarioName: ${JSON.stringify(tc.scenarioName || tcTitle)},`);
    lines.push(`      title: ${JSON.stringify(tcTitle)},`);
    lines.push(`      expectedResult: ${JSON.stringify(tc.expectedResult || 'Sistem berjalan normal.')},`);
    lines.push(`      role: ${JSON.stringify(tc.role || 'Admin / User')}`);
    lines.push(`    });`);
    lines.push(``);
    lines.push(`    await navigateToRmis(page, '${meta.testUrl ? meta.testUrl : '/'}');`);
    lines.push(`    await page.waitForTimeout(800);`);
    lines.push(``);

    const steps = tc.steps || [];
    steps.forEach((s, sIdx) => {
      lines.push(`    await wedocit.captureStep({`);
      lines.push(`      title: ${JSON.stringify(s.title || `Langkah ${sIdx + 1}`)},`);
      lines.push(`      description: ${JSON.stringify(s.actionDescription || '-')},`);
      lines.push(`      input: ${JSON.stringify(s.inputData || '-')},`);
      lines.push(`      expected: ${JSON.stringify(s.expectedResult || 'Sesuai ekspektasi.')}`);
      lines.push(`    });`);
      lines.push(``);
    });

    lines.push(`  });`);
    lines.push(``);
  });

  lines.push(`});`);

  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  return {
    filePath: `tests/${fileName}`,
    fileName: fileName,
    totalTcs: tcs.length,
    label: `⚡ [Generated] ${meta.scenarioName || meta.title} (${tcs.length} TC)`
  };
}

function readRequestBody(req, callback) {
  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if (body.length > 500 * 1024 * 1024) { // Max 500 MB (dukung multiple dokumen & evidensi screenshot besar)
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
