/**
 * WeDocIt Studio - AI Prompt Generator & Compiler Modal (Modular)
 */
function initAiPromptModal() {
  // =========================================================================
  // AI PROMPT GENERATOR (Placeholder Replacer & AI Copilot Integrator)
  // =========================================================================
  const modalAiPrompt = document.getElementById('modal-ai-prompt');
  const btnOpenAiPrompt = document.getElementById('btn-ai-prompt');
  const btnCloseAiPrompt = document.getElementById('btn-close-ai-prompt');
  const btnCloseAiPromptBtn = document.getElementById('btn-close-ai-prompt-btn');
  const selPromptPreset = document.getElementById('sel-prompt-preset');
  const inpPromptBaseUrl = document.getElementById('inp-prompt-baseurl');
  const inpPromptCodePath = document.getElementById('inp-prompt-codepath');
  const inpPromptUserRole = document.getElementById('inp-prompt-userrole');
  const txtAiPromptOutput = document.getElementById('txt-ai-prompt-output');
  const btnCopyAiPrompt = document.getElementById('btn-copy-ai-prompt');
  const btnSaveAiPromptFile = document.getElementById('btn-save-ai-prompt-file');
  const promptStatusMsg = document.getElementById('prompt-status-msg');
  const promptCharCount = document.getElementById('prompt-char-count');

  function generateCompiledAiPrompt() {
    const doc = getActiveDoc();
    const meta = doc.metadata || {};
    const tcs = doc.testCases || [];

    const preset = selPromptPreset ? selPromptPreset.value : 'playwright_full';
    const baseUrl = (inpPromptBaseUrl && inpPromptBaseUrl.value.trim()) || meta.testUrl || 'http://localhost:4200';
    const codePath = (inpPromptCodePath && inpPromptCodePath.value.trim()) || meta.codePath || '';
    
    // Deteksi role secara cerdas dari test cases dokumen jika belum ada
    let detectedRole = meta.testRole;
    if (!detectedRole && tcs.length > 0) {
      const tcRole = tcs.find(t => t.role && t.role.trim() && t.role.trim() !== '-');
      if (tcRole) detectedRole = tcRole.role.trim();
    }
    if (!detectedRole) detectedRole = getDefaultTesterRole() || 'Admin / User';
    const userRole = (inpPromptUserRole && inpPromptUserRole.value.trim()) || detectedRole;

    const projectName = meta.systemName || meta.projectName || 'Aplikasi BNI';
    const moduleName = meta.scenarioName || meta.title || 'Modul Aplikasi';
    const crNo = meta.testCaseId || meta.projectNo || 'CR_2026';
    const testerName = meta.testedBy || 'QA Engineer';
    const npp = meta.npp || '822117';
    const resolution = meta.screenResolution || '1366x768';

    // Susun daftar Test Case dalam format teks terstruktur
    let tcListStr = '';
    tcs.forEach((tc, idx) => {
      const tcNum = tc.tcNumberStr || `TC-${idx + 1}`;
      tcListStr += `\n[${tcNum}] ${tc.title || tc.scenarioName || 'Test Case ' + (idx + 1)} (Role: ${tc.role || userRole})\n`;
      tcListStr += `  Ekspektasi: ${tc.expectedResult || 'Proses berhasil tanpa error'}\n`;
      if (tc.steps && tc.steps.length > 0) {
        tcListStr += `  Langkah Alur:\n`;
        tc.steps.forEach((st, sIdx) => {
          tcListStr += `    ${sIdx + 1}. ${st.actionDescription || st.title}`;
          if (st.inputData && st.inputData !== '-') tcListStr += ` (Input: ${st.inputData})`;
          tcListStr += `\n`;
        });
      }
    });

    let prompt = '';

    if (preset === 'playwright_full') {
      prompt = `Halo AI, tolong buatkan script pengujian Playwright (spec.ts) dan runner script PowerShell (run.ps1) untuk WeDocIt:

## 1. Kebutuhan & Konteks Pengujian
- Proyek / Sistem: ${projectName}
- Modul: ${moduleName}
- Nomor CR / Tiket: ${crNo}
- Penguji: ${testerName} (NPP: ${npp})
- Lingkungan Target: ${baseUrl}
- Lokasi Kode Sumber: ${codePath || '(Disesuaikan dengan folder frontend proyek)'}
- Role / Akun Pengujian: ${userRole}
- Resolusi Viewport: ${resolution} (Standar BNI)

## 2. Daftar Skenario & Langkah yang Harus Diuji:
${tcListStr || 'Belum ada Test Case. Buatkan 3 skenario standar (Akses Menu, Pengujian Form, Verifikasi Simpan).'}

## 3. Ketentuan Pembuatan Script:
1. File Spec Playwright: Simpan ke folder 'tests/' (misal: tests/test_${moduleName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.spec.ts).
2. Setiap langkah penting harus mengambil screenshot HD (${resolution}) tanpa toast error yang tidak relevan.
3. Gunakan locator yang tangguh (data-testid, role, atau selector CSS komponen ${codePath ? 'yang sesuai dengan source code di ' + codePath : 'yang stabil'}).
4. File Runner PowerShell (run.ps1):
   - Menjalankan Playwright test dengan opsi headed/headless.
   - Mengompilasi bukti pengujian ke dokumen Word & PDF via endpoint WeDocIt Studio (http://127.0.0.1:4400/api/export-pdf).
5. Jangan gunakan kredensial nyata di dalam script publik; gunakan environment variable jika diperlukan.

Tolong berikan kode lengkap 'spec.ts' dan 'run.ps1' siap pakai.`;
    } else if (preset === 'source_code_explore') {
      prompt = `Halo AI, tolong telusuri source code berikut dan rancang selector Playwright serta skenario pengujian untuk WeDocIt:

## 1. Lokasi & Konteks:
- Path Source Code: ${codePath || '(Isi path folder proyek Anda)'}
- Modul / Komponen: ${moduleName}
- Target URL: ${baseUrl}
- Role Pengguna: ${userRole}

## 2. Tugas AI:
1. Periksa file komponen template (.html) dan TypeScript (.ts) pada modul ${moduleName}.
2. Identifikasi selector elemen kunci: tombol aksi, field input mandatory, dropdown, tabel data, dan tombol simpan/submit.
3. Petakan kriteria validasi error (toast error, alert validasi form).
4. Susun usulan langkah pengujian Playwright baku dengan locator yang paling stabil dan tidak mudah patah.`;
    } else {
      prompt = `Halo AI, tolong rapikan daftar Test Case berikut ke dalam format baku Unit Test Dokumen BNI EDV:

## 1. Metadata:
- Sistem: ${projectName}
- Modul: ${moduleName}
- No. CR: ${crNo}

## 2. Skenario Saat Ini:
${tcListStr}

## 3. Output yang Diminta:
1. Buatkan tabel ringkasan Bab 2.1 (No, Skenario, Test Case Title, Expected Result, Status).
2. Susun narasi Bab 3.1 Detail Alur Pengujian menggunakan kalimat aktif korporat BNI ("Klik button X", "Pilih baris pada kolom Y tabel Z", "Isi kolom catatan...").
3. Pastikan tidak ada teks robotik DOM parser.`;
    }

    if (txtAiPromptOutput) {
      txtAiPromptOutput.value = prompt;
      if (promptCharCount) promptCharCount.textContent = `${prompt.length} karakter`;
    }
  }

  btnOpenAiPrompt?.addEventListener('click', () => {
    const doc = getActiveDoc();
    const meta = doc.metadata || {};
    const tcs = doc.testCases || [];

    // Deteksi role otomatis
    let initialRole = meta.testRole;
    if (!initialRole && tcs.length > 0) {
      const tcRole = tcs.find(t => t.role && t.role.trim() && t.role.trim() !== '-');
      if (tcRole) initialRole = tcRole.role.trim();
    }
    if (!initialRole) initialRole = getDefaultTesterRole() || 'Admin / User';

    if (inpPromptUserRole) inpPromptUserRole.value = initialRole;
    if (inpPromptCodePath) inpPromptCodePath.value = meta.codePath || '';
    if (inpPromptBaseUrl) inpPromptBaseUrl.value = meta.testUrl || 'http://localhost:4200';

    if (modalAiPrompt) modalAiPrompt.style.display = 'flex';
    generateCompiledAiPrompt();
  });

  const closeAiModal = () => {
    if (modalAiPrompt) modalAiPrompt.style.display = 'none';
    if (promptStatusMsg) promptStatusMsg.textContent = '';
  };

  btnCloseAiPrompt?.addEventListener('click', closeAiModal);
  btnCloseAiPromptBtn?.addEventListener('click', closeAiModal);

  selPromptPreset?.addEventListener('change', generateCompiledAiPrompt);
  
  inpPromptBaseUrl?.addEventListener('input', () => {
    const doc = getActiveDoc();
    if (doc.metadata) doc.metadata.testUrl = inpPromptBaseUrl.value.trim();
    saveActiveDocState();
    generateCompiledAiPrompt();
  });
  
  inpPromptCodePath?.addEventListener('input', () => {
    const doc = getActiveDoc();
    if (doc.metadata) doc.metadata.codePath = inpPromptCodePath.value.trim();
    saveActiveDocState();
    generateCompiledAiPrompt();
  });
  
  inpPromptUserRole?.addEventListener('input', () => {
    const doc = getActiveDoc();
    if (doc.metadata) doc.metadata.testRole = inpPromptUserRole.value.trim();
    saveActiveDocState();
    generateCompiledAiPrompt();
  });

  btnCopyAiPrompt?.addEventListener('click', async () => {
    if (!txtAiPromptOutput) return;
    try {
      await navigator.clipboard.writeText(txtAiPromptOutput.value);
      if (promptStatusMsg) {
        promptStatusMsg.textContent = '✅ Berhasil disalin ke clipboard! Siap di-paste ke Antigravity / AI.';
        setTimeout(() => { if (promptStatusMsg) promptStatusMsg.textContent = ''; }, 4000);
      }
    } catch (err) {
      txtAiPromptOutput.select();
      document.execCommand('copy');
      if (promptStatusMsg) promptStatusMsg.textContent = '✅ Disalin (fallback copy)!';
    }
  });

  btnSaveAiPromptFile?.addEventListener('click', async () => {
    if (!txtAiPromptOutput) return;
    try {
      const resp = await fetch('/api/save-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: txtAiPromptOutput.value })
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        if (promptStatusMsg) {
          promptStatusMsg.textContent = '✅ Berhasil disimpan ke output/prompt_for_ai.txt!';
          setTimeout(() => { if (promptStatusMsg) promptStatusMsg.textContent = ''; }, 4000);
        }
      } else {
        alert('Gagal menyimpan file: ' + (data.error || 'Terjadi kesalahan'));
      }
    } catch (e) {
      alert('Gagal menghubungi server: ' + e.message);
    }
  });

}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAiPromptModal);
} else {
  initAiPromptModal();
}
