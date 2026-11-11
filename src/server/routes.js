const fs = require('fs');
const path = require('path');
const { PORT, ROOT_DIR, DATA_DIR, WORKSPACE_FILE, OUTPUT_DIR } = require('./config');
const { sendJson, readRequestBody, exportDocxToPdf, getLatestDocxInOutput } = require('./utils');
const { getTestRunnerState, startPlaywrightTest, syncResultsInternal } = require('./services/test-runner.service');
const { generatePlaywrightSpecFromDocument, analyzeComponentAndBuildTestCases } = require('./services/spec-generator.service');
const { handleAutoRepairTc } = require('./services/autofix.service');

function handleApiRequest(req, res, pathname) {
  // GET /api/ping
  if (pathname === '/api/ping' && req.method === 'GET') {
    return sendJson(res, 200, {
      status: 'ok',
      app: 'WeDocIt Desktop Studio',
      version: '3.3.2',
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

  // POST /api/active-doc
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

  // POST /api/sync-results
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

  // POST /api/auto-repair-tc
  if (pathname === '/api/auto-repair-tc' && req.method === 'POST') {
    readRequestBody(req, (body) => {
      let payload = {};
      try { payload = JSON.parse(body || '{}'); } catch {}
      handleAutoRepairTc(payload, (err, result) => {
        if (err) return sendJson(res, 400, { error: err.message });
        return sendJson(res, 200, result);
      });
    });
    return;
  }

  // GET /api/specs
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
          else {
            try {
              const content = fs.readFileSync(path.join(testsDir, f), 'utf8');
              const descMatch = content.match(/test\.describe\(\s*['"`](?:Unit Test Suite:\s*)?(.*?)['"`]/);
              if (descMatch && descMatch[1]) {
                label = `⚡ ${descMatch[1].slice(0, 50)}${tcStr}`;
              }
            } catch {}
          }
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
    return sendJson(res, 200, getTestRunnerState());
  }

  // POST /api/run-tests
  if (pathname === '/api/run-tests' && req.method === 'POST') {
    readRequestBody(req, (body) => {
      let params = {};
      try { if (body) params = JSON.parse(body); } catch {}

      const state = getTestRunnerState();
      if (state.running) {
        return sendJson(res, 409, { error: 'Pengujian sedang berjalan', state });
      }

      const specFile = params.spec || '';
      startPlaywrightTest(specFile, { headed: !!params.headed, grep: params.grep || '' });
      return sendJson(res, 202, {
        message: 'Pengujian Playwright berhasil dimulai di latar belakang',
        state: getTestRunnerState()
      });
    });
    return;
  }

  // POST /api/export-pdf
  if (pathname === '/api/export-pdf' && req.method === 'POST') {
    readRequestBody(req, (body) => {
      let params = {};
      try { if (body) params = JSON.parse(body); } catch {}
      
      let docxPath = params.docxPath;

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

  // POST /api/save-prompt
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

  // GET /api/latest-results
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

  // POST /api/ai/analyze-code
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

  // POST /api/generate-spec
  if (pathname === '/api/generate-spec' && req.method === 'POST') {
    readRequestBody(req, (body) => {
      try {
        const payload = JSON.parse(body || '{}');
        const doc = payload.doc;
        if (!doc) return sendJson(res, 400, { error: 'Data dokumen tidak ditemukan pada payload.' });
        const result = generatePlaywrightSpecFromDocument(doc);

        if (doc.id && fs.existsSync(WORKSPACE_FILE)) {
          try {
            const ws = JSON.parse(fs.readFileSync(WORKSPACE_FILE, 'utf8'));
            const target = ws.documents?.find(d => d.id === doc.id);
            if (target) {
              if (!target.metadata) target.metadata = {};
              target.metadata.specFile = result.filePath;
              target.metadata.specFileName = result.fileName;
              fs.writeFileSync(WORKSPACE_FILE, JSON.stringify(ws, null, 2), 'utf8');
            }
          } catch (eWs) {
            console.warn('[Generate-Spec] Gagal menyimpan referensi specFile ke workspace:', eWs.message);
          }
        }

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

module.exports = {
  handleApiRequest
};

