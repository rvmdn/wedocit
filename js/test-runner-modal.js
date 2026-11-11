/**
 * WeDocIt Studio - Playwright Automation Runner & Result Sync Modal (Modular)
 */
function initTestRunnerModal() {
  // --- PLAYWRIGHT AUTOMATION RUNNER CONTROLLER (DESKTOP STUDIO) ---
  const btnRunAutomation = document.getElementById('btn-run-automation');
  const modalRunner = document.getElementById('modal-runner');
  const btnCloseRunner = document.getElementById('btn-close-runner');
  const btnRunnerClose = document.getElementById('btn-runner-close');
  const btnTriggerRun = document.getElementById('btn-trigger-run');
  const runnerSpecSelect = document.getElementById('runner-spec-select');
  const runnerTerminalLogs = document.getElementById('runner-terminal-logs');
  const runnerStatusBadge = document.getElementById('runner-status-badge');
  const runnerResultSummary = document.getElementById('runner-result-summary');
  const btnRunnerExportPdf = document.getElementById('btn-runner-export-pdf');
  const btnSyncTestResults = document.getElementById('btn-sync-test-results');
  const btnRunnerAuditSs = document.getElementById('btn-runner-audit-ss');

  let runnerPollInterval = null;

  async function checkLatestResultsAvailability() {
    try {
      const resp = await fetch('/api/latest-results');
      if (resp.ok) {
        if (btnSyncTestResults) btnSyncTestResults.style.display = 'inline-block';
        if (btnRunnerAuditSs) btnRunnerAuditSs.style.display = 'inline-block';
      }
    } catch {}
  }

  async function loadAvailableSpecs() {
    if (!runnerSpecSelect) return;
    try {
      const resp = await fetch('/api/specs');
      if (resp.ok) {
        const data = await resp.json();
        if (data.specs && data.specs.length > 0) {
          const currentVal = runnerSpecSelect.value;
          runnerSpecSelect.innerHTML = '';
          
          const doc = getActiveDoc();
          const docId = doc.id || '';
          const isOrms = docId.includes('orms') || (doc.metadata?.title || '').toLowerCase().includes('orms') || (doc.metadata?.systemName || '').toLowerCase().includes('orms');

          const activeSpec = doc.metadata?.specFile;
          data.specs.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.path;
            opt.textContent = s.label;
            if (activeSpec && s.path === activeSpec) {
              opt.selected = true;
            } else if (!activeSpec && currentVal === s.path) {
              opt.selected = true;
            } else if (!activeSpec && isOrms && s.path.includes('orms')) {
              opt.selected = true;
            }
            runnerSpecSelect.appendChild(opt);
          });

          // Opsi Semua Suite
          const optAll = document.createElement('option');
          optAll.value = '';
          optAll.textContent = 'Semua Modul (All Specs)';
          runnerSpecSelect.appendChild(optAll);
        }
      }
    } catch (e) {
      console.warn('Gagal memuat daftar specs:', e);
    }
  }

  const btnGenerateSpecFromDoc = document.getElementById('btn-generate-spec-from-doc');
  btnGenerateSpecFromDoc?.addEventListener('click', async () => {
    const doc = getActiveDoc();
    const tcs = doc.testCases || [];
    if (tcs.length === 0) {
      alert('Dokumen ini belum memiliki Test Case. Silakan rancang skenario terlebih dahulu.');
      return;
    }

    const origHtml = btnGenerateSpecFromDoc.innerHTML;
    btnGenerateSpecFromDoc.disabled = true;
    btnGenerateSpecFromDoc.innerHTML = '<span>⏳ Mengompilasi...</span>';

    try {
      const resp = await fetch('/api/generate-spec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc })
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        if (data.filePath) {
          if (!doc.metadata) doc.metadata = {};
          doc.metadata.specFile = data.filePath;
          doc.metadata.specFileName = data.fileName;
          appStorage.set({ sessionData: sessionData });
        }
        await loadAvailableSpecs();
        if (runnerSpecSelect && data.filePath) {
          runnerSpecSelect.value = data.filePath;
        }
        alert(`🎉 Sukses membuat file script otomasi:\n\n📁 ${data.fileName}\n🔢 ${data.totalTcs} Test Case terkompilasi.\n\nFile langsung dipilih pada dropdown. Anda bisa langsung klik "▶ Mulai Eksekusi"!`);
      } else {
        alert('Gagal membuat spec: ' + (data.error || 'Terjadi kesalahan'));
      }
    } catch (err) {
      alert('Error saat menghubungi server: ' + err.message);
    } finally {
      btnGenerateSpecFromDoc.disabled = false;
      btnGenerateSpecFromDoc.innerHTML = origHtml;
    }
  });

  btnRunAutomation?.addEventListener('click', () => {
    if (modalRunner) modalRunner.style.display = 'flex';
    loadAvailableSpecs();
    checkLatestResultsAvailability();
  });

  function closeRunnerModal() {
    if (modalRunner) modalRunner.style.display = 'none';
    if (runnerPollInterval) {
      clearInterval(runnerPollInterval);
      runnerPollInterval = null;
    }
  }

  btnCloseRunner?.addEventListener('click', closeRunnerModal);
  btnRunnerClose?.addEventListener('click', closeRunnerModal);

  async function syncResultsToEditor(isAuto = false) {
    try {
      const resp = await fetch('/api/latest-results');
      if (!resp.ok) {
        if (!isAuto) alert('Tidak ditemukan data hasil run pengujian (latest_run_results.json). Silakan jalankan otomasi terlebih dahulu.');
        return;
      }
      const data = await resp.json();
      if (!data.testCases || data.testCases.length === 0) {
        if (!isAuto) alert('Data hasil pengujian kosong.');
        return;
      }

      const activeDoc = getActiveDoc();
      if (!isAuto) {
        const confirmMsg = `Ditemukan ${data.testCases.length} Test Case dari otomasi Playwright.\n\nApakah Anda ingin mengganti/memperbarui daftar Test Case pada dokumen aktif (${activeDoc.metadata?.scenarioName || 'Dokumen Aktif'}) dengan hasil otomasi ini?`;
        if (!confirm(confirmMsg)) return;
      }

      if (data.metadata) {
        if (data.metadata.title) activeDoc.metadata.title = data.metadata.title;
        if (data.metadata.module) activeDoc.metadata.scenarioName = data.metadata.module;
        if (data.metadata.systemName) activeDoc.metadata.systemName = data.metadata.systemName;
        if (data.metadata.crNo) activeDoc.metadata.testCaseId = data.metadata.crNo;
        if (data.metadata.acceptanceCriteria) activeDoc.metadata.acceptanceCriteria = data.metadata.acceptanceCriteria;
        if (data.metadata.scope) activeDoc.metadata.scope = data.metadata.scope;
        if (data.metadata.shortDescription) activeDoc.metadata.shortDescription = data.metadata.shortDescription;
        if (data.metadata.developers && data.metadata.developers.length > 0) {
          activeDoc.metadata.developers = data.metadata.developers;
        }
      }

      activeDoc.testCases = data.testCases.map((tc, idx) => ({
        id: tc.id || `tc_imported_${Date.now()}_${idx + 1}`,
        tcNumber: idx + 1,
        tcNumberStr: tc.tcNumberStr || `TC ${idx + 1}`,
        role: tc.role || '',
        title: tc.title || `Test Case ${idx + 1}`,
        scenarioName: tc.scenarioName || tc.title || `Skenario ${idx + 1}`,
        expectedResult: tc.expectedResult || 'Sistem berjalan sesuai ekspektasi.',
        status: tc.status === 'NOK' ? 'NOK' : 'OK',
        steps: (tc.steps || []).map((s, sIdx) => ({
          stepNumber: sIdx + 1,
          title: s.title || `Langkah ${sIdx + 1}`,
          actionDescription: s.actionDescription || s.title || '',
          inputData: s.inputData || '-',
          expectedResult: s.expectedResult || 'Berhasil',
          screenshot: s.screenshot || (s.imageBase64 ? `data:image/png;base64,${s.imageBase64}` : ''),
          status: s.status || 'READY',
          note: s.note || ''
        }))
      }));

      saveActiveDocState();
      populateActiveDoc();
      renderTestCases();
      renderDocSelector();
      if (!isAuto) {
        closeRunnerModal();
        alert(`🎉 Berhasil menyinkronkan ${activeDoc.testCases.length} Test Case ke Dokumen Studio!`);
      }
    } catch (err) {
      if (!isAuto) alert(`Gagal menyinkronkan hasil pengujian: ${err.message}`);
      else console.warn('Auto-sync failed:', err);
    }
  }

  btnSyncTestResults?.addEventListener('click', () => syncResultsToEditor(false));

  btnTriggerRun?.addEventListener('click', async () => {
    const spec = runnerSpecSelect ? runnerSpecSelect.value : '';
    const chkHeaded = document.getElementById('chk-runner-headed');
    const headed = chkHeaded ? chkHeaded.checked : true;

    if (btnTriggerRun) btnTriggerRun.disabled = true;
    if (runnerStatusBadge) {
      runnerStatusBadge.textContent = 'RUNNING';
      runnerStatusBadge.style.background = '#0284c7';
      runnerStatusBadge.style.color = '#fff';
    }
    if (runnerTerminalLogs) {
      runnerTerminalLogs.innerHTML = `<div style="color:#38bdf8;">[WeDocIt] Memulai eksekusi Playwright (${spec || 'All Specs'})... Mode: ${headed ? '🖥️ Headed (Tampilkan Browser)' : 'Headless'}</div>`;
    }
    if (runnerResultSummary) runnerResultSummary.textContent = 'Status: Sedang mengeksekusi tes...';
    if (btnRunnerExportPdf) btnRunnerExportPdf.style.display = 'none';

    try {
      const resp = await fetch('/api/run-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec, headed })
      });
      const data = await resp.json();

      if (!resp.ok) {
        if (runnerTerminalLogs) runnerTerminalLogs.innerHTML += `<div style="color:#ef4444;">❌ ${data.error || 'Gagal memulai test'}</div>`;
        if (btnTriggerRun) btnTriggerRun.disabled = false;
        if (runnerStatusBadge) {
          runnerStatusBadge.textContent = 'ERROR';
          runnerStatusBadge.style.background = '#ef4444';
        }
        return;
      }

      // Mulai polling status & log
      runnerPollInterval = setInterval(async () => {
        try {
          const stResp = await fetch('/api/test-status');
          const stData = await stResp.json();

          if (stData.logs && stData.logs.length > 0 && runnerTerminalLogs) {
            runnerTerminalLogs.innerHTML = stData.logs.map(l => `<div>${escapeHtml(l)}</div>`).join('');
            runnerTerminalLogs.scrollTop = runnerTerminalLogs.scrollHeight;
          }

          if (!stData.running) {
            clearInterval(runnerPollInterval);
            runnerPollInterval = null;
            if (btnTriggerRun) btnTriggerRun.disabled = false;

            checkLatestResultsAvailability();

            if (stData.exitCode === 0) {
              if (runnerStatusBadge) {
                runnerStatusBadge.textContent = 'PASSED (100%)';
                runnerStatusBadge.style.background = '#10b981';
              }
              if (runnerResultSummary) {
                runnerResultSummary.innerHTML = `🎉 <b style="color:#10b981;">Pengujian Sukses!</b> Hasil & screenshot otomatis disinkronkan ke dokumen.`;
              }
              if (stData.lastOutputFile && btnRunnerExportPdf) {
                btnRunnerExportPdf.style.display = 'inline-block';
                btnRunnerExportPdf.dataset.docx = stData.lastOutputFile;
              }
              if (btnRunnerAuditSs) {
                btnRunnerAuditSs.style.display = 'inline-block';
              }
              // Otomatis sinkronkan hasil & screenshot ke dokumen studio
              syncResultsToEditor(true);
            } else {
              if (runnerStatusBadge) {
                runnerStatusBadge.textContent = 'FAILED';
                runnerStatusBadge.style.background = '#ef4444';
              }
              if (runnerResultSummary) {
                runnerResultSummary.innerHTML = `⚠️ <b style="color:#ef4444;">Pengujian Selesai dengan Defect/Gagal</b> (Exit code: ${stData.exitCode})`;
              }
            }
          }
        } catch (pollErr) {
          console.warn('Poll error:', pollErr);
        }
      }, 1000);

    } catch (err) {
      if (runnerTerminalLogs) runnerTerminalLogs.innerHTML += `<div style="color:#ef4444;">Gagal menghubungi server: ${err.message}</div>`;
      if (btnTriggerRun) btnTriggerRun.disabled = false;
    }
  });

  // Ekspor PDF Native via Word COM
  async function triggerExportPdf(docxPath) {
    alert('Sedang mengonversi ke PDF native melalui Microsoft Word COM di latar belakang...');
    try {
      const resp = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docxPath })
      });
      const res = await resp.json();
      if (resp.ok && res.success) {
        alert(`🎉 Dokumen PDF berhasil dibuat!\n\nFile: ${res.pdfPath}`);
      } else {
        alert(`❌ Gagal ekspor PDF: ${res.error || res.details || 'Terjadi kesalahan'}`);
      }
    } catch (e) {
      alert(`Gagal menghubungi server lokal: ${e.message}`);
    }
  }

  btnRunnerExportPdf?.addEventListener('click', () => {
    triggerExportPdf(btnRunnerExportPdf.dataset.docx);
  });

}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTestRunnerModal);
} else {
  initTestRunnerModal();
}
