const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { ROOT_DIR, WORKSPACE_FILE } = require('../config');
const { getLatestDocxInOutput } = require('../utils');

let testRunnerState = {
  running: false,
  startTime: null,
  finishTime: null,
  exitCode: null,
  logs: [],
  lastOutputFile: null
};

function getTestRunnerState() {
  return testRunnerState;
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

function syncResultsInternal(callerDocId) {
  const resultsFile = path.join(ROOT_DIR, 'output/latest_run_results.json');
  if (!fs.existsSync(resultsFile)) {
    return { error: 'File output/latest_run_results.json belum ada.' };
  }
  const latestData = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
  const wsData = JSON.parse(fs.readFileSync(WORKSPACE_FILE, 'utf8'));

  const runCr = (latestData.metadata?.crNo || '').replace(/[^0-9]/g, '');
  let targetDoc = null;
  // 1. Prioritaskan jika callerDocId spesifik diberikan
  if (callerDocId) {
    targetDoc = wsData.documents.find(d => d.id === callerDocId);
  }
  if (!targetDoc && latestData.metadata?.docId) {
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

    wsData.activeDocId = callerDocId || targetDoc.id;
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

module.exports = {
  getTestRunnerState,
  startPlaywrightTest,
  syncResultsInternal
};

