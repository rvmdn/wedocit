const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { OUTPUT_DIR } = require('./config');

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
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

function getLatestDocxInOutput() {
  if (!fs.existsSync(OUTPUT_DIR)) return null;
  const files = fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.endsWith('.docx') && !f.startsWith('~$'))
    .map(f => ({ name: f, path: path.join(OUTPUT_DIR, f), time: fs.statSync(path.join(OUTPUT_DIR, f)).mtime }))
    .sort((a, b) => b.time - a.time);
  return files[0] ? files[0].path : null;
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

module.exports = {
  sendJson,
  readRequestBody,
  getDefaultWorkspace,
  getLatestDocxInOutput,
  exportDocxToPdf
};

