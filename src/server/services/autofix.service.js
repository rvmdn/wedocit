const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { ROOT_DIR, WORKSPACE_FILE } = require('../config');
const { syncResultsInternal } = require('./test-runner.service');

function handleAutoRepairTc(payload, callback) {
  try {
    const tcNo = payload.tcNo || 'TC-001';
    const docId = payload.docId || '';
    let specFile = payload.specFile || '';

    // 1. Jika specFile belum diberikan, cek apakah dokumen di workspace.json memiliki referensi specFile
    let targetDoc = null;
    if (fs.existsSync(WORKSPACE_FILE)) {
      try {
        const ws = JSON.parse(fs.readFileSync(WORKSPACE_FILE, 'utf8'));
        targetDoc = ws.documents?.find(d => d.id === docId);
        if (targetDoc?.metadata?.specFile && fs.existsSync(path.join(ROOT_DIR, targetDoc.metadata.specFile))) {
          specFile = targetDoc.metadata.specFile;
        }
      } catch (e) {}
    }

    // 2. Jika belum ketemu, cari file spec di tests/ yang mereferensikan docId ini
    const testsDir = path.join(ROOT_DIR, 'tests');
    if (!specFile && docId && fs.existsSync(testsDir)) {
      const allSpecs = fs.readdirSync(testsDir).filter(f => f.endsWith('.spec.ts'));
      for (const f of allSpecs) {
        try {
          const content = fs.readFileSync(path.join(testsDir, f), 'utf8');
          if (content.includes(`"${docId}"`) || content.includes(`'${docId}'`)) {
            specFile = `tests/${f}`;
            break;
          }
        } catch (e) {}
      }
    }

    // 3. Jika belum ketemu, cocokkan slug skenario/modul dengan nama file spec
    if (!specFile && (payload.module || targetDoc?.metadata?.scenarioName) && fs.existsSync(testsDir)) {
      const rawMod = payload.module || targetDoc?.metadata?.scenarioName || '';
      const modSlug = rawMod.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      if (modSlug) {
        const allSpecs = fs.readdirSync(testsDir).filter(f => f.endsWith('.spec.ts'));
        const matched = allSpecs.find(f => {
          const fSlug = f.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          return fSlug.includes(modSlug) || modSlug.includes(fSlug.replace(/^\d+-/, ''));
        });
        if (matched) {
          specFile = `tests/${matched}`;
        }
      }
    }

    // 4. Deteksi modular V2 khusus Admin Management jika memang relevan
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

    // 5. Validasi: Jangan fallback buta ke modul lain!
    if (!specFile || !fs.existsSync(path.join(ROOT_DIR, specFile))) {
      if (docId.includes('admin') || (payload.module || '').toLowerCase().includes('administration')) {
        specFile = isV2 ? 'tests/09-rmis-admin-management-v2' : 'tests/08-rmis-admin-management.spec.ts';
      } else {
        return callback(new Error(`File script Playwright untuk modul "${payload.module || docId}" belum tersedia. Silakan buat spec otomatis terlebih dahulu dengan menekan tombol "⚡ Buat Spec dari Dokumen Ini" di dialog Jalankan Otomasi.`));
      }
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
      const syncRes = syncResultsInternal(docId);
      return callback(null, {
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
    return callback(err);
  }
}

module.exports = {
  handleAutoRepairTc
};

