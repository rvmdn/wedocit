// WeDocIt - Multi-Document & Multi-TC Studio (Desktop & Extension Compatible)
document.addEventListener('DOMContentLoaded', () => {
  // Desktop Storage Adapter (Menyimpan langsung ke server lokal / data/workspace.json)
  const desktopStorage = {
    get: (keys, callback) => {
      fetch('/api/workspace')
        .then(r => r.json())
        .then(data => {
          if (callback) callback({ sessionData: data });
        })
        .catch(err => {
          console.warn('[Desktop Storage] Fetch gagal, membaca fallback localStorage:', err);
          try {
            const local = localStorage.getItem('wedocit_sessionData');
            const parsed = local ? JSON.parse(local) : null;
            if (callback) callback({ sessionData: parsed });
          } catch {
            if (callback) callback({ sessionData: null });
          }
        });
    },
    set: (items, callback) => {
      if (items && items.sessionData) {
        fetch('/api/workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(items.sessionData)
        })
          .then(res => {
            if (callback) callback();
          })
          .catch(e => {
            console.warn('[Desktop Storage] Sync server failed:', e);
            if (callback) callback();
          });
        return;
      }
      if (callback) callback();
    },
    onChanged: {
      addListener: () => {}
    }
  };

  const appStorage = (window.chrome && window.chrome.storage && window.chrome.storage.local)
    ? window.chrome.storage.local
    : desktopStorage;

  let sessionData = {
    activeDocId: '',
    documents: []
  };

  // Elements
  const docSelector = document.getElementById('doc-selector');
  const btnCreateNewDoc = document.getElementById('btn-create-new-doc');
  const btnDeleteCurrentDoc = document.getElementById('btn-delete-current-doc');

  const metaScenarioName = document.getElementById('meta-scenario-name');
  const lblScenarioPreview = document.getElementById('lbl-scenario-preview');
  const metaTitle = document.getElementById('meta-title');
  const metaSystem = document.getElementById('meta-system');
  const metaTcId = document.getElementById('meta-tc-id');
  const metaProjectNo = document.getElementById('meta-project-no');
  const metaProjectType = document.getElementById('meta-project-type');
  const metaShortDesc = document.getElementById('meta-short-desc');
  const devListContainer = document.getElementById('dev-list-container');
  const btnAddDev = document.getElementById('btn-add-dev');
  const metaStartDate = document.getElementById('meta-start-date');
  const metaEndDate = document.getElementById('meta-end-date');
  const metaDate = document.getElementById('meta-date');
  const metaCopyrightYear = document.getElementById('meta-copyright-year');
  const metaDocVersion = document.getElementById('meta-doc-version');
  const lblFilenamePreview = document.getElementById('lbl-filename-preview');
  const templateDocxFile = document.getElementById('template-docx-file');
  const btnChooseTemplate = document.getElementById('btn-choose-template');
  const lblTemplateName = document.getElementById('lbl-template-name');
  const badgeTemplateStatus = document.getElementById('badge-template-status');
  const exportFormatSelect = document.getElementById('export-format-select');

  let customDocxTemplateBuffer = null;
  let bundledDocxTemplateBuffer = null;
  let activeTemplateFileName = '';

  const metaEnv = document.getElementById('meta-env');
  const metaRes = document.getElementById('meta-res');
  const metaAcceptanceCriteria = document.getElementById('meta-acceptance-criteria');
  const metaScope = document.getElementById('meta-scope');
  const metaObjective = document.getElementById('meta-objective');
  const metaPrecondition = document.getElementById('meta-precondition');
  const customMetaContainer = document.getElementById('custom-meta-container');
  const btnAddMetaField = document.getElementById('btn-add-meta-field');

  const stepsContainer = document.getElementById('steps-container');
  const totalStepCount = document.getElementById('total-step-count');

  const btnAddStep = document.getElementById('btn-add-step');
  const btnResetSteps = document.getElementById('btn-reset-steps');
  const btnExportWord = document.getElementById('btn-export-word');
  const btnExportMd = document.getElementById('btn-export-md');
  const btnExportJson = document.getElementById('btn-export-json');
  const btnImportJson = document.getElementById('btn-import-json');
  const btnCleanDoc = document.getElementById('btn-clean-doc');
  const btnPrintPdf = document.getElementById('btn-print-pdf');
  const btnExportPdfNative = document.getElementById('btn-export-pdf-native');
  const btnExportDropdown = document.getElementById('btn-export-dropdown');
  const exportMenuDropdown = document.getElementById('export-menu-dropdown');
  const fileInputJson = document.getElementById('file-input-json');
  const globalReplaceImg = document.getElementById('global-replace-img');
  let activeImgReplaceTarget = null; // { tcIdx, sIdx }

  globalReplaceImg?.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !activeImgReplaceTarget) return;
    const { tcIdx, sIdx } = activeImgReplaceTarget;
    const doc = getActiveDoc();
    const tcs = doc.testCases || [];
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const base64Data = loadEvt.target.result;
      const targetTc = tcs[tcIdx];
      if (targetTc && targetTc.steps && targetTc.steps[sIdx]) {
        targetTc.steps[sIdx].screenshot = base64Data;
        saveActiveDocState();
        renderTestCases();
      }
    };
    reader.readAsDataURL(file);
  });

  const modalZoom = document.getElementById('modal-zoom');
  const modalImg = document.getElementById('modal-img');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  // Sidebar Collapse / Expand Toggle
  const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
  const mainLayout = document.querySelector('.main-layout');


  btnToggleSidebar?.addEventListener('click', () => {
    const isCollapsed = mainLayout.classList.toggle('sidebar-collapsed');
    if (isCollapsed) {
      btnToggleSidebar.innerHTML = '▶';
      btnToggleSidebar.title = 'Tampilkan Panel Metadata (Buka Panel Kiri)';
      btnToggleSidebar.classList.add('collapsed-active');
    } else {
      btnToggleSidebar.innerHTML = '◀';
      btnToggleSidebar.title = 'Sembunyikan Panel Metadata (Hemat Ruang / Full Width)';
      btnToggleSidebar.classList.remove('collapsed-active');
    }
  });

  let isSavingLocally = false;
  let saveDebounceTimer = null;
  let suppressFocusReloadUntil = 0;
  let editingStep = null; // { tcIndex, stepIndex }

  // Normalisasi dan Pembersihan Dokumen Lama agar sesuai update terbaru:
  // 1. Membersihkan base64 gambar besar dari field teks/komentar
  // 2. Membersihkan dummy concatenation 'Field: "1"; Field: "1"...' pada action buttons
  // 3. Membersihkan raw HTML tags dari rich-text/komentar (<p>...</p>)
  // 4. Membersihkan screenshot berlebih pada step input formulir & klik placeholder kosong
  // 5. Menormalkan Judul Dokumen agar tidak tertimpa nama skenario terakhir
  // 6. Standarisasi resolusi layar ke 1366x768
  function cleanAndMigrateOldDocumentData(data) {
    if (!data || !data.documents || !Array.isArray(data.documents)) return { modified: false, cleanedSteps: 0, cleanedTexts: 0 };
    let modified = false;
    let cleanedSteps = 0;
    let cleanedTexts = 0;

    data.documents.forEach((doc) => {
      if (!doc) return;
      if (!doc.metadata) doc.metadata = {};

      // 1. Standarisasi resolusi layar
      if (!doc.metadata.screenResolution || doc.metadata.screenResolution === '1707x1067' || doc.metadata.screenResolution === '1280x1024') {
        doc.metadata.screenResolution = '1366x768';
        modified = true;
      }

      const tcs = doc.testCases || [];

      // 2. Deteksi modul aktual dari breadcrumb/steps
      let detectedModule = '';
      for (const tc of tcs) {
        for (const s of (tc.steps || [])) {
          const text = (s.title || '') + ' ' + (s.actionDescription || '');
          const match = text.match(/Audit Reguler\s*>\s*Manajemen Audit\s*>\s*([^>"]+)/i);
          if (match && match[1]) {
            const mod = match[1].trim().replace(/\s*Offline\s*/i, ' ').trim();
            if (mod) {
              detectedModule = mod;
              break;
            }
          }
        }
        if (detectedModule) break;
      }

      // Hanya migrasi nama jika dokumen ini memang dokumen awal Pelaksanaan Audit
      if (doc.id === 'doc_pelaksanaan_audit_final' || detectedModule) {
        if (!detectedModule) detectedModule = 'Pelaksanaan Audit';
        if (doc.metadata.title && /[-–|:]\s*(RHA|Export|View|Save)\s*$/i.test(doc.metadata.title)) {
          doc.metadata.title = `Unit Test Documentation - ${detectedModule}`;
          modified = true;
        } else if (!doc.metadata.title || doc.metadata.title === 'Unit Test Documentation') {
          doc.metadata.title = `Unit Test Documentation - ${detectedModule}`;
          modified = true;
        }
        if (!doc.metadata.systemName || doc.metadata.systemName === 'Sistem Informasi / Web Application') {
          doc.metadata.systemName = 'AMS Fast - Pelaksanaan Audit';
          modified = true;
        }
        if (!doc.metadata.projectName) {
          doc.metadata.projectName = 'AMS (Audit Management System)';
          modified = true;
        }
      }

      // 3. Bersihkan teks field, HTML, dummy concatenation, dan screenshot berlebih
      tcs.forEach((tc, tcIdx) => {
        // Normalisasi penomoran skenario jika ada anomali
        if (tc.scenarioName && /Skenario\s*47/i.test(tc.scenarioName) && tcIdx === 45) {
          tc.scenarioName = 'Skenario 46: Export to Word (RHA)';
          modified = true;
        }

        (tc.steps || []).forEach((s) => {
          // A. Bersihkan s.inputData dari dummy concatenation 'Field: "1"; Field: "1"...'
          if (s.inputData && (s.inputData.startsWith('Field: "1";') || s.inputData.startsWith('Field: "0";') || /^(\s*Field:\s*"[^"]*";?\s*)+$/i.test(s.inputData))) {
            s.inputData = '-';
            cleanedTexts++;
            modified = true;
          }

          // B. Bersihkan HTML tags pada inputData (misal <p>propose</p> -> propose)
          if (s.inputData && /<[^>]+>/.test(s.inputData)) {
            s.inputData = s.inputData.replace(/<[^>]+>/g, '').trim() || '-';
            cleanedTexts++;
            modified = true;
          }

          // C. Bersihkan s.inputData dari base64
          if (s.inputData && typeof s.inputData === 'string') {
            if (/data:image\/[a-zA-Z]+;base64,/i.test(s.inputData)) {
              let clean = s.inputData.replace(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+/gi, ' ').replace(/<[^>]+>/g, '').trim();
              s.inputData = clean ? `${clean} [Lampiran Gambar]` : '[Lampiran Gambar]';
              cleanedTexts++;
              modified = true;
            }
            if (s.inputData.length > 250) {
              s.inputData = s.inputData.substring(0, 247) + '...';
              cleanedTexts++;
              modified = true;
            }
          }

          // D. Bersihkan s.actionDescription dari base64
          if (s.actionDescription && typeof s.actionDescription === 'string') {
            if (/data:image\/[a-zA-Z]+;base64,/i.test(s.actionDescription)) {
              let clean = s.actionDescription.replace(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+/gi, ' ').replace(/<[^>]+>/g, '').trim();
              s.actionDescription = clean ? `${clean} [Lampiran Gambar]` : 'Pengguna mengunggah lampiran gambar evidensi.';
              cleanedTexts++;
              modified = true;
            }
          }

          // E. Bersihkan s.expectedResult dari base64
          if (s.expectedResult && typeof s.expectedResult === 'string') {
            if (/data:image\/[a-zA-Z]+;base64,/i.test(s.expectedResult)) {
              s.expectedResult = s.expectedResult.replace(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+/gi, ' ').replace(/<[^>]+>/g, '').trim();
              cleanedTexts++;
              modified = true;
            }
          }

          // F. Normalisasi klik placeholder kosong editor Quill ("Tulis di sini... CHARS: 0 WORDS: 0")
          if (s.title && s.title.includes('CHARS: 0 WORDS: 0')) {
            s.title = 'Fokus pada Editor Catatan/Komentar';
            s.actionDescription = 'Pengguna memfokuskan kursor pada editor catatan / komentar.';
            s.inputData = '-';
            if (s.screenshot) {
              s.screenshot = '';
              cleanedSteps++;
            }
            modified = true;
          }

          // G. Normalisasi nama dropdown trigger PrimeNG
          if (s.title && s.title.toLowerCase().includes('dropdown trigger')) {
            s.title = 'Buka Pilihan Dropdown';
            s.actionDescription = 'Pengguna membuka menu dropdown pilihan data.';
            if (s.screenshot) {
              s.screenshot = '';
              cleanedSteps++;
            }
            modified = true;
          }

          // H. Bersihkan screenshot berlebih pada step input formulir (bukan tombol simpan/aksi)
          const isFieldInputStep = /^(Input\s|Input Field\s|Input Komentar:|Input Catatan:|Pilih\s*\[)/i.test(s.title || '') ||
            (s.metadata && /^(input|textarea|ql-editor|select)$/i.test(s.metadata.tagName || ''));

          if (isFieldInputStep && s.screenshot) {
            s.screenshot = '';
            cleanedSteps++;
            modified = true;
          }
        });
      });
    });

    return { modified, cleanedSteps, cleanedTexts };
  }

  // Load State (Direct from Desktop appStorage with Chrome Service Worker Fallback)
  function loadFreshState(callback) {
    appStorage.get(['sessionData'], (localRes) => {
      if (localRes && localRes.sessionData && localRes.sessionData.documents) {
        sessionData = localRes.sessionData;
        const res = cleanAndMigrateOldDocumentData(sessionData);
        if (res.modified) {
          appStorage.set({ sessionData: sessionData });
        }
        renderDocSelector();
        populateActiveDoc();
        if (callback) callback();
      } else if (window.chrome && window.chrome.runtime && window.chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: 'GET_STATE', full: true }, (res) => {
          if (res && res.data) {
            sessionData = res.data;
            const cleanRes = cleanAndMigrateOldDocumentData(sessionData);
            if (cleanRes.modified) {
              appStorage.set({ sessionData: sessionData });
            }
            renderDocSelector();
            populateActiveDoc();
          }
          if (callback) callback();
        });
      } else {
        if (!sessionData || !sessionData.documents || sessionData.documents.length === 0) {
          const def = createDefaultDocument();
          sessionData = { activeDocId: def.id, documents: [def] };
          appStorage.set({ sessionData });
        }
        renderDocSelector();
        populateActiveDoc();
        if (callback) callback();
      }
    });
  }

  // Load state immediately
  loadFreshState();

  let lastStateLoadedAt = Date.now();

  // 1. Auto-refresh saat tab editor difokuskan / dibuka kembali dari luar (dithrottle min 15 detik)
  window.addEventListener('focus', () => {
    if (Date.now() < suppressFocusReloadUntil) return;
    if (isSavingLocally) return;
    if (Date.now() - lastStateLoadedAt < 15000) return;
    const isTyping = document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');
    if (!isTyping && !editingStep) {
      lastStateLoadedAt = Date.now();
      loadFreshState();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (Date.now() < suppressFocusReloadUntil) return;
    if (isSavingLocally) return;
    if (Date.now() - lastStateLoadedAt < 15000) return;
    if (document.visibilityState === 'visible') {
      const isTyping = document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');
      if (!isTyping && !editingStep) {
        lastStateLoadedAt = Date.now();
        loadFreshState();
      }
    }
  });

  // 2. Dengarkan sinyal RELOAD_EDITOR jika di lingkungan ekstensi Chrome
  if (window.chrome && window.chrome.runtime && window.chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'RELOAD_EDITOR') {
        loadFreshState();
      }
    });
  }

  // 3. Dengarkan event perubahan storage jika di lingkungan ekstensi Chrome
  if (window.chrome && window.chrome.storage && window.chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.sessionData) {
        if (Date.now() < suppressFocusReloadUntil || isSavingLocally) return;
        const isTyping = document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');
        if (!isTyping && !editingStep) {
          loadFreshState();
        }
      }
    });
  }

  function createDefaultDocument(scenarioName = 'Pengujian Modul Baru', crNumber = 'CR_2026_001', systemName = 'Sistem Informasi / Web Application') {
    const today = new Date().toLocaleDateString('id-ID');
    const docId = 'doc_' + Date.now();
    const cleanSc = scenarioName.replace(/^(TC\s*\d+[:.-]?|Skenario\s*\d*[:.-]?)\s*/i, '').trim() || 'Modul Baru';
    return {
      id: docId,
      createdAt: new Date().toISOString(),
      metadata: {
        templateType: 'BNI_EDV',
        scenarioName: cleanSc,
        title: 'Unit Test Documentation - ' + cleanSc,
        systemName: systemName || 'Sistem Informasi / Web Application',
        testCaseId: crNumber || 'CR_2026_001',
        projectNo: (crNumber || '').replace(/[^0-9]/g, '') || '10001',
        projectType: 'CR',
        shortDescription: 'Pengujian dan verifikasi modul ' + cleanSc,
        developers: [
          { name: 'QA Engineer', npp: '-' }
        ],
        author: 'QA Engineer',
        testedBy: 'QA Engineer',
        npp: '-',
        startDate: today,
        endDate: today,
        docDate: today,
        copyrightYear: String(new Date().getFullYear()),
        environment: 'Development / SIT',
        screenResolution: '1366x768',
        docVersion: 'V1.0',
        objective: 'Requirement pengembangan pada modul ini adalah verifikasi alur proses pengujian fitur terkait.',
        precondition: '1. User telah login ke aplikasi web menggunakan role yang memiliki akses ke modul terkait.\n2. Browser: Google Chrome / Microsoft Edge.',
        customFields: []
      },
      activeTcId: '',
      testCases: [] // KOSONGAN: Bersih tanpa Test Case atau screenshot lama
    };
  }

  function getActiveDoc() {
    if (!sessionData || typeof sessionData !== 'object') {
      sessionData = { documents: [] };
    }
    if (!sessionData.documents || !Array.isArray(sessionData.documents) || sessionData.documents.length === 0) {
      const def = createDefaultDocument();
      sessionData.documents = [def];
      sessionData.activeDocId = def.id;
      appStorage.set({ sessionData: sessionData });
    }
    let doc = sessionData.documents.find(d => d.id === sessionData.activeDocId);
    if (!doc) {
      doc = sessionData.documents[0];
      sessionData.activeDocId = doc.id;
    }
    return doc;
  }

  function renderDocSelector() {
    if (!docSelector) return;
    docSelector.innerHTML = '';
    const docs = sessionData.documents || [];
    docs.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      const tcCount = (d.testCases || []).length;
      opt.textContent = `${d.metadata?.testCaseId || 'CR'} - ${d.metadata?.scenarioName || 'Skenario'} (${tcCount} TC)`;
      if (d.id === sessionData.activeDocId) opt.selected = true;
      docSelector.appendChild(opt);
    });
    if (sessionData.activeDocId) {
      docSelector.value = sessionData.activeDocId;
    }
  }

  // SWITCH DOCUMENT EVENT (Instan tanpa delay & non-blocking)
  docSelector?.addEventListener('change', () => {
    const targetDocId = docSelector.value;
    if (!targetDocId) return;
    sessionData.activeDocId = targetDocId;
    suppressFocusReloadUntil = Date.now() + 8000;

    // 1. Tampilkan dokumen baru seketika (0 ms)
    populateActiveDoc();

    // 2. Simpan activeDocId ke server di background tanpa kirim megabyte payload
    fetch('/api/active-doc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId: targetDocId })
    }).catch(() => {});

    if (window.chrome && window.chrome.runtime && window.chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: 'SWITCH_ACTIVE_DOC', docId: targetDocId });
    }
  });

  // CREATE NEW DOCUMENT MODAL & EVENT (KOSONGAN & AUTO-SWITCH)
  const modalCreateDoc = document.getElementById('modal-create-doc');
  const btnCloseCreateDoc = document.getElementById('btn-close-create-doc');
  const btnCancelCreateDoc = document.getElementById('btn-cancel-create-doc');
  const btnSubmitCreateDoc = document.getElementById('btn-submit-create-doc');
  const inpNewdocScenario = document.getElementById('inp-newdoc-scenario');
  const inpNewdocSystem = document.getElementById('inp-newdoc-system');
  const inpNewdocCr = document.getElementById('inp-newdoc-cr');

  btnCreateNewDoc?.addEventListener('click', () => {
    if (modalCreateDoc) modalCreateDoc.style.display = 'flex';
    if (inpNewdocScenario) {
      inpNewdocScenario.value = 'Pengujian Modul Baru';
      inpNewdocScenario.focus();
      inpNewdocScenario.select();
    }
  });

  const closeCreateDocModal = () => {
    if (modalCreateDoc) modalCreateDoc.style.display = 'none';
  };
  btnCloseCreateDoc?.addEventListener('click', closeCreateDocModal);
  btnCancelCreateDoc?.addEventListener('click', closeCreateDocModal);

  btnSubmitCreateDoc?.addEventListener('click', () => {
    const sc = (inpNewdocScenario && inpNewdocScenario.value.trim()) || 'Pengujian Modul Baru';
    const sys = (inpNewdocSystem && inpNewdocSystem.value.trim()) || 'Sistem Informasi / Web Application';
    const cr = (inpNewdocCr && inpNewdocCr.value.trim()) || 'CR_2026_001';

    const newDoc = createDefaultDocument(sc, cr, sys);
    if (!sessionData.documents) sessionData.documents = [];
    sessionData.documents.push(newDoc);
    sessionData.activeDocId = newDoc.id;

    isSavingLocally = true;
    suppressFocusReloadUntil = Date.now() + 10000;

    renderDocSelector();
    if (docSelector) docSelector.value = newDoc.id;
    populateActiveDoc();

    appStorage.set({ sessionData: sessionData }, () => {
      isSavingLocally = false;
      closeCreateDocModal();
    });

    if (window.chrome && window.chrome.runtime && window.chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'CREATE_NEW_DOC',
        scenarioName: sc,
        crNumber: cr,
        docTitle: newDoc.metadata.title
      });
    }
  });


  // DELETE DOCUMENT EVENT
  btnDeleteCurrentDoc?.addEventListener('click', () => {
    const activeDoc = getActiveDoc();
    const docName = activeDoc.metadata?.scenarioName || activeDoc.metadata?.testCaseId || 'Dokumen Ini';
    const docs = sessionData.documents || [];

    if (confirm(`Yakin ingin menghapus dokumen "${docName}"?\n\n(Jika hanya tersisa 1 dokumen, data dokumen akan direset bersih ke awal).`)) {
      if (docs.length <= 1) {
        const def = createDefaultDocument();
        sessionData = { documents: [def], activeDocId: def.id };
      } else {
        sessionData.documents = docs.filter(d => d.id !== activeDoc.id);
        sessionData.activeDocId = sessionData.documents[0]?.id;
      }

      appStorage.set({ sessionData: sessionData }, () => {
        renderDocSelector();
        populateActiveDoc();
        alert('Dokumen berhasil dihapus.');
      });

      if (window.chrome && window.chrome.runtime && window.chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'DELETE_DOC',
          docId: activeDoc.id
        });
      }
    }
  });

  function populateActiveDoc() {
    const doc = getActiveDoc();
    const m = doc.metadata || {};

    const todayStr = new Date().toLocaleDateString('id-ID');
    const currentYearStr = String(new Date().getFullYear());

    if (metaScenarioName) metaScenarioName.value = m.scenarioName || '';
    if (lblScenarioPreview) lblScenarioPreview.textContent = m.scenarioName || 'Nama Skenario';
    if (metaTitle) metaTitle.value = m.title || '';
    if (metaSystem) metaSystem.value = m.systemName || 'Audit Management System (AMS) Aplikasi FAST';
    if (metaTcId) metaTcId.value = m.testCaseId || '';
    if (metaProjectNo) metaProjectNo.value = m.projectNo || '';
    if (metaProjectType) metaProjectType.value = m.projectType || 'CR';
    if (metaShortDesc) metaShortDesc.value = m.shortDescription || '';
    if (metaStartDate) metaStartDate.value = m.startDate || todayStr;
    if (metaEndDate) metaEndDate.value = m.endDate || todayStr;
    if (metaDate) metaDate.value = m.docDate || m.date || todayStr;
    if (metaCopyrightYear) metaCopyrightYear.value = m.copyrightYear || currentYearStr;

    if (metaEnv) metaEnv.value = m.environment || 'Development / SIT';
    if (metaRes) {
      if (!m.screenResolution || m.screenResolution === '1707x1067' || m.screenResolution === '1280x1024') {
        m.screenResolution = '1366x768';
      }
      metaRes.value = m.screenResolution;
    }
    if (metaObjective) metaObjective.value = m.objective || '';
    if (metaAcceptanceCriteria) metaAcceptanceCriteria.value = m.acceptanceCriteria || m.objective || '';
    if (metaScope) metaScope.value = m.scope || '';
    if (metaPrecondition) metaPrecondition.value = m.precondition || '';
    if (metaDocVersion) metaDocVersion.value = m.docVersion || 'V1.0';

    updateFilenamePreview();
    renderDevelopersList();
    renderCustomMetaFields();
    renderTestCases();
  }

  function renderDevelopersList() {
    if (!devListContainer) return;
    devListContainer.innerHTML = '';
    const doc = getActiveDoc();
    if (!doc.metadata.developers || !Array.isArray(doc.metadata.developers)) {
      doc.metadata.developers = [];
    }

    doc.metadata.developers.forEach((dev, index) => {
      const row = document.createElement('div');
      row.className = 'dev-item-row';
      row.innerHTML = `
        <input type="text" class="form-control dev-name" value="${escapeHtml(dev.name || '')}" placeholder="Nama Lengkap">
        <input type="text" class="form-control dev-npp" value="${escapeHtml(dev.npp || '')}" placeholder="NPP">
        <button type="button" class="btn btn-danger btn-sm btn-del-dev" style="padding:2px 6px; font-size:11px;" title="Hapus developer">&times;</button>
      `;

      const nameInput = row.querySelector('.dev-name');
      const nppInput = row.querySelector('.dev-npp');
      const delBtn = row.querySelector('.btn-del-dev');

      nameInput.addEventListener('input', () => {
        dev.name = nameInput.value;
        saveActiveDocState();
      });

      nppInput.addEventListener('input', () => {
        dev.npp = nppInput.value;
        saveActiveDocState();
      });

      delBtn.addEventListener('click', () => {
        doc.metadata.developers.splice(index, 1);
        saveActiveDocState();
        renderDevelopersList();
      });

      devListContainer.appendChild(row);
    });
  }

  btnAddDev?.addEventListener('click', () => {
    const doc = getActiveDoc();
    if (!doc.metadata.developers) doc.metadata.developers = [];
    doc.metadata.developers.push({ name: "", npp: "" });
    saveActiveDocState();
    renderDevelopersList();
  });

  // Template DOCX helper: lazy-load template hanya saat ekspor Word dipicu (tanpa fetch otomatis saat buka halaman)
  async function loadBundledTemplate() {
    if (bundledDocxTemplateBuffer) return bundledDocxTemplateBuffer;
    try {
      const url = (window.chrome && window.chrome.runtime && window.chrome.runtime.getURL)
        ? chrome.runtime.getURL('templates/template-bni-edv.docx')
        : '/templates/template-bni-edv.docx';
      const res = await fetch(url);
      if (res.ok) {
        bundledDocxTemplateBuffer = await res.arrayBuffer();
        return bundledDocxTemplateBuffer;
      }
    } catch (err) {
      console.log('Template bundled not found:', err);
    }
    return null;
  }

  // Cek ketersediaan template bawaan secara asinkron saat editor dibuka
  loadBundledTemplate().then((buf) => {
    if (buf) {
      if (badgeTemplateStatus && !customDocxTemplateBuffer) {
        badgeTemplateStatus.textContent = '🟢 Template Bawaan Siap';
        badgeTemplateStatus.style.color = '#34d399';
        badgeTemplateStatus.style.borderColor = 'rgba(52, 211, 153, 0.4)';
      }
      if (lblTemplateName && !customDocxTemplateBuffer) {
        lblTemplateName.textContent = 'template-bni-edv.docx';
        lblTemplateName.style.color = '#34d399';
      }
    } else {
      if (badgeTemplateStatus && !customDocxTemplateBuffer) {
        badgeTemplateStatus.textContent = '⚠️ Belum Ada Template';
        badgeTemplateStatus.style.color = '#f59e0b';
        badgeTemplateStatus.style.borderColor = 'rgba(245, 158, 11, 0.4)';
      }
      if (lblTemplateName && !customDocxTemplateBuffer) {
        lblTemplateName.textContent = 'Silakan upload template .docx';
        lblTemplateName.style.color = '#f59e0b';
      }
    }
  });

  // Template DOCX upload handling
  btnChooseTemplate?.addEventListener('click', () => {
    templateDocxFile?.click();
  });

  exportFormatSelect?.addEventListener('change', () => {
    const val = exportFormatSelect.value;
    if (val === 'custom' && !customDocxTemplateBuffer) {
      templateDocxFile?.click();
    }
  });

  templateDocxFile?.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        customDocxTemplateBuffer = loadEvt.target.result;
        activeTemplateFileName = file.name;
        if (lblTemplateName) {
          lblTemplateName.textContent = '✅ ' + file.name;
          lblTemplateName.style.color = '#38bdf8';
        }
        if (badgeTemplateStatus) {
          badgeTemplateStatus.textContent = '🟢 File Dimuat';
          badgeTemplateStatus.style.color = '#38bdf8';
          badgeTemplateStatus.style.borderColor = 'rgba(56, 189, 248, 0.4)';
        }
        alert(`Template "${file.name}" berhasil dimuat! Siap digunakan untuk ekspor dokumen Word format resmi.`);
      };
      reader.readAsArrayBuffer(file);
    }
  });

  function renderCustomMetaFields() {
    if (!customMetaContainer) return;
    customMetaContainer.innerHTML = '';
    const doc = getActiveDoc();
    const fields = doc.metadata?.customFields || [];
    fields.forEach((field, index) => {
      const row = document.createElement('div');
      row.className = 'meta-kv-row';
      row.innerHTML = `
        <input type="text" class="form-control kv-key" value="${escapeHtml(field.label)}" placeholder="Nama Tag">
        <input type="text" class="form-control kv-val" value="${escapeHtml(field.value)}" placeholder="Nilai">
        <button class="btn btn-danger btn-sm btn-del-kv" style="padding:4px 6px;">&times;</button>
      `;

      const keyInput = row.querySelector('.kv-key');
      const valInput = row.querySelector('.kv-val');
      const delBtn = row.querySelector('.btn-del-kv');

      keyInput.addEventListener('input', () => {
        field.label = keyInput.value;
        saveActiveDocState();
      });

      valInput.addEventListener('input', () => {
        field.value = valInput.value;
        saveActiveDocState();
      });

      delBtn.addEventListener('click', () => {
        fields.splice(index, 1);
        saveActiveDocState();
        renderCustomMetaFields();
      });

      customMetaContainer.appendChild(row);
    });
  }

  btnAddMetaField?.addEventListener('click', () => {
    const doc = getActiveDoc();
    if (!doc.metadata.customFields) doc.metadata.customFields = [];
    doc.metadata.customFields.push({ label: "Tag Baru", value: "" });
    saveActiveDocState();
    renderCustomMetaFields();
  });

  function getDefaultTesterRole() {
    const doc = getActiveDoc();
    const roleCustom = (doc.metadata?.customFields || []).find(f => /role/i.test(f.key || f.label || ''))?.value;
    if (roleCustom) return roleCustom;
    const author = doc.metadata?.author || '';
    if (author.includes(' - ')) {
      const parts = author.split(' - ');
      return parts[parts.length - 1].trim();
    }
    return '';
  }

  let actualSaveTimeout = null;

  function saveActiveDocState(onSaved, immediate = false) {
    isSavingLocally = true;
    suppressFocusReloadUntil = Date.now() + 15000;

    const doc = getActiveDoc();
    const devs = doc.metadata?.developers || [];
    const formattedAuthors = devs.map(d => d.name ? `${d.name} / ${d.npp || '-'}` : '').filter(Boolean).join(', ');

    doc.metadata = {
      ...doc.metadata,
      scenarioName: metaScenarioName ? metaScenarioName.value : '',
      title: metaTitle ? metaTitle.value : '',
      systemName: metaSystem ? metaSystem.value : '',
      testCaseId: metaTcId ? metaTcId.value : '',
      projectNo: metaProjectNo ? metaProjectNo.value : '',
      projectType: metaProjectType ? metaProjectType.value : 'CR',
      shortDescription: metaShortDesc ? metaShortDesc.value : '',
      developers: devs,
      author: formattedAuthors || 'Prepared by EDV Team',
      startDate: metaStartDate ? metaStartDate.value : '',
      endDate: metaEndDate ? metaEndDate.value : '',
      docDate: metaDate ? metaDate.value : '',
      date: metaDate ? metaDate.value : new Date().toLocaleDateString('id-ID'),
      copyrightYear: metaCopyrightYear ? metaCopyrightYear.value : '2026',
      docVersion: metaDocVersion ? metaDocVersion.value : 'V1.0',
      environment: metaEnv ? metaEnv.value : '',
      screenResolution: metaRes ? (metaRes.value || '1366x768') : '1366x768',
      acceptanceCriteria: metaAcceptanceCriteria ? metaAcceptanceCriteria.value : '',
      scope: metaScope ? metaScope.value : '',
      objective: metaAcceptanceCriteria ? metaAcceptanceCriteria.value : (metaObjective ? metaObjective.value : ''),
      precondition: metaPrecondition ? metaPrecondition.value : '',
      customFields: doc.metadata.customFields || []
    };
    if (lblScenarioPreview) lblScenarioPreview.textContent = doc.metadata.scenarioName;
    updateFilenamePreview();

    // Update in-memory activeDocId
    sessionData.activeDocId = doc.id || sessionData.activeDocId;

    const doSave = () => {
      appStorage.set({ sessionData: sessionData }, () => {
        isSavingLocally = false;
        if (window.chrome && window.chrome.runtime && window.chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({
            type: 'STORAGE_UPDATED'
          });
        }
        if (typeof onSaved === 'function') onSaved();
      });
    };

    if (actualSaveTimeout) clearTimeout(actualSaveTimeout);

    if (immediate) {
      doSave();
    } else {
      // Debounce disk serialization dan network payload 800ms agar browser tetap ringan & bebas OOM
      actualSaveTimeout = setTimeout(doSave, 800);
    }
  }

  // Standarisasi Format Nama File Unduhan: EDV_Unit_Test_CR_{cr}_{skenario}_{versi}.{ext}
  function getFormattedDocFilename(ext = 'docx') {
    const doc = getActiveDoc();
    const meta = doc.metadata || {};

    // 1. Nomor CR / Defect
    let crRaw = (meta.projectNo || meta.testCaseId || 'xxxxx').trim();
    let crClean = crRaw.replace(/^CR\s*[:\-_]?\s*/i, '').trim();
    if (!crClean) crClean = 'xxxxx';
    let crPart = 'CR_' + crClean.replace(/[^a-zA-Z0-9_-]/g, '_');

    // 2. Nama Skenario
    let scRaw = (meta.scenarioName || 'Pelaksanaan_Audit').trim();
    let scClean = scRaw
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (!scClean) scClean = 'Pelaksanaan_Audit';

    // 3. Versi Dokumen
    let verRaw = (meta.docVersion || (metaDocVersion ? metaDocVersion.value : 'V1.0') || 'V1.0').trim();
    let verClean = verRaw.replace(/[^a-zA-Z0-9_.]/g, '');
    if (!verClean) verClean = '1.0';
    if (!verClean.toUpperCase().startsWith('V')) {
      verClean = 'V' + verClean;
    }

    return `EDV_Unit_Test_${crPart}_${scClean}_${verClean}.${ext}`;
  }

  function updateFilenamePreview() {
    if (!lblFilenamePreview) return;
    lblFilenamePreview.textContent = getFormattedDocFilename('docx');
  }

  [metaScenarioName, metaTitle, metaSystem, metaTcId, metaProjectNo, metaProjectType, metaShortDesc, metaStartDate, metaEndDate, metaDate, metaCopyrightYear, metaDocVersion, metaEnv, metaRes, metaAcceptanceCriteria, metaScope, metaObjective, metaPrecondition].forEach(el => {
    el?.addEventListener('input', saveActiveDocState);
  });

  let draggedStepInfo = null; // { tcIndex, stepIndex }

  function moveStep(tcIndex, fromIdx, toIdx) {
    const doc = getActiveDoc();
    const tc = doc.testCases?.[tcIndex];
    if (!tc || !tc.steps) return;
    if (toIdx < 0 || toIdx >= tc.steps.length || fromIdx === toIdx) return;

    // Pindahkan item dalam array
    const [moved] = tc.steps.splice(fromIdx, 1);
    tc.steps.splice(toIdx, 0, moved);

    // Tata ulang nomor urut langkah
    tc.steps.forEach((st, idx) => {
      st.stepNumber = idx + 1;
    });

    // Sesuaikan editingStep jika langkah yang sedang diedit ikut berpindah posisi
    if (editingStep && editingStep.tcIndex === tcIndex) {
      if (editingStep.stepIndex === fromIdx) {
        editingStep.stepIndex = toIdx;
      } else if (fromIdx < editingStep.stepIndex && toIdx >= editingStep.stepIndex) {
        editingStep.stepIndex--;
      } else if (fromIdx > editingStep.stepIndex && toIdx <= editingStep.stepIndex) {
        editingStep.stepIndex++;
      }
    }

    suppressFocusReloadUntil = Date.now() + 3000;
    saveActiveDocState();
    renderTestCases();
  }

  function renderTestCases() {
    const doc = getActiveDoc();
    const tcs = doc.testCases || [];
    totalStepCount.textContent = tcs.length;

    if (tcs.length === 0) {
      const scName = doc.metadata?.scenarioName || 'Modul Aktif';
      stepsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <div class="empty-title">Belum ada Test Case</div>
          <div class="empty-desc">Pilih salah satu cara cerdas di bawah untuk mengisi Test Case pada dokumen <b>${escapeHtml(scName)}</b>:</div>
          <div style="display:flex; justify-content:center; gap:10px; margin-top:16px; flex-wrap:wrap;">
            <button class="btn btn-outline" id="btn-empty-auto-gen" style="border-color:#f59e0b; color:#fbbf24; font-weight:700; padding:8px 16px;">
              ⚡ Buat Skenario Standar (${escapeHtml(scName)})
            </button>
            <button class="btn btn-primary" id="btn-empty-ai-bridge" style="background:linear-gradient(135deg, #4f46e5, #7c3aed); font-weight:700; border:none; padding:8px 16px;">
              ✨ Rancang via AI Antigravity
            </button>
            <button class="btn btn-secondary" id="btn-empty-add" style="padding:8px 16px;">
              ➕ Buat Manual
            </button>
          </div>
        </div>
      `;
      document.getElementById('btn-empty-auto-gen')?.addEventListener('click', generateStandardScenariosForCurrentDoc);
      document.getElementById('btn-empty-ai-bridge')?.addEventListener('click', triggerAiBridgeChat);
      document.getElementById('btn-empty-add')?.addEventListener('click', addNewTestCase);
      return;
    }

    stepsContainer.innerHTML = '';
    tcs.forEach((tc, tcIndex) => {
      const tcCard = document.createElement('div');
      tcCard.className = 'tc-container-card';
      

      const steps = tc.steps || [];
      let stepsHtml = '';
      steps.forEach((s, sIdx) => {
        const isEditing = editingStep && editingStep.tcIndex === tcIndex && editingStep.stepIndex === sIdx;

        if (isEditing) {
          stepsHtml += `
            <div class="tc-substep-row editing-row">
              <div class="step-index-badge">${sIdx + 1}</div>
              <div class="step-info-col">
                <div class="edit-step-box">
                  <div class="edit-step-header">
                    <span>✏️ Edit Langkah ${sIdx + 1}</span>
                  </div>
                  <div>
                    <label class="edit-step-label">Judul Aktivitas:</label>
                    <input type="text" class="form-control inp-edit-title" data-tc="${tcIndex}" data-step="${sIdx}" value="${escapeHtml(s.title || '')}" placeholder="Contoh: Klik tombol Simpan">
                  </div>
                  <div>
                    <label class="edit-step-label">Deskripsi Aksi:</label>
                    <textarea class="form-control inp-edit-desc" data-tc="${tcIndex}" data-step="${sIdx}" rows="2" placeholder="Contoh: Pengguna mengklik tombol Simpan data...">${escapeHtml(s.actionDescription || '')}</textarea>
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div>
                      <label class="edit-step-label">Input Data (opsional):</label>
                      <input type="text" class="form-control inp-edit-input" data-tc="${tcIndex}" data-step="${sIdx}" value="${escapeHtml(s.inputData && s.inputData !== '-' ? s.inputData : '')}" placeholder="Contoh: ID: 12345 / -">
                    </div>
                    <div>
                      <label class="edit-step-label">Hasil yang Diharapkan:</label>
                      <input type="text" class="form-control inp-edit-expected" data-tc="${tcIndex}" data-step="${sIdx}" value="${escapeHtml(s.expectedResult || '')}" placeholder="Contoh: Data berhasil tersimpan">
                    </div>
                  </div>
                  <div style="display: flex; gap: 6px; margin-top: 4px;">
                    <button type="button" class="btn btn-primary btn-xs btn-save-step" data-tc="${tcIndex}" data-step="${sIdx}">
                      💾 Simpan
                    </button>
                    <button type="button" class="btn btn-outline btn-xs btn-cancel-step" data-tc="${tcIndex}" data-step="${sIdx}">
                      ✖ Batal
                    </button>
                  </div>
                </div>
              </div>
              <div class="step-img-col">
                ${s.screenshot ? `
                  <div class="thumb-wrapper" title="Klik untuk memperbesar gambar">
                    <img src="${s.screenshot}" class="zoomable-img" loading="lazy" decoding="async" />
                  </div>
                  <div style="display: flex; gap: 4px; justify-content: center; margin-top: 4px;">
                    <button type="button" class="btn btn-outline btn-xs btn-trigger-replace-img" data-tc="${tcIndex}" data-step="${sIdx}" style="color: #38bdf8;" title="Ganti Screenshot">
                      📷 Ganti
                    </button>
                    <button type="button" class="btn btn-outline btn-xs btn-del-img" data-tc="${tcIndex}" data-step="${sIdx}" style="color: #94a3b8;">Hapus</button>
                  </div>
                ` : `
                  <div style="color: #64748b; font-size: 10.5px; padding-top: 15px; font-style: italic;">Tidak ada screenshot</div>
                  <button type="button" class="btn btn-outline btn-xs btn-trigger-replace-img" data-tc="${tcIndex}" data-step="${sIdx}" style="color: #38bdf8; margin-top: 6px;" title="Upload Screenshot">
                    📷 Upload
                  </button>
                `}
              </div>
            </div>
          `;
        } else {
          stepsHtml += `
            <div class="tc-substep-row" draggable="true" data-tc="${tcIndex}" data-step="${sIdx}">
              <div class="step-index-badge" title="Tahan & geser (Drag) untuk menukar urutan langkah">
                <span class="step-drag-icon">⠿</span>
                <span>${sIdx + 1}</span>
              </div>
              <div class="step-info-col">
                <div class="step-title-text">${escapeHtml(s.title || 'Aktivitas ' + (sIdx + 1))}</div>
                <div class="step-action-desc">${escapeHtml(s.actionDescription || '')}</div>
                ${s.inputData && s.inputData !== '-' ? '<div class="step-input-badge">Input: <b>' + escapeHtml(s.inputData) + '</b></div>' : ''}
                ${s.expectedResult ? '<div style="font-size: 10.5px; color: #10b981; margin-top: 2px;">Ekspektasi: ' + escapeHtml(s.expectedResult) + '</div>' : ''}
                <div style="display: flex; gap: 4px; align-items: center; margin-top: 6px;">
                  <button type="button" class="btn btn-outline btn-xs btn-move-step-up" data-tc="${tcIndex}" data-step="${sIdx}" ${sIdx === 0 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''} title="Pindahkan langkah ke Atas (▲)">
                    ▲
                  </button>
                  <button type="button" class="btn btn-outline btn-xs btn-move-step-down" data-tc="${tcIndex}" data-step="${sIdx}" ${sIdx === steps.length - 1 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''} title="Pindahkan langkah ke Bawah (▼)">
                    ▼
                  </button>
                  <button type="button" class="btn btn-outline btn-xs btn-edit-step" data-tc="${tcIndex}" data-step="${sIdx}" title="Edit Langkah ini">
                    ✏️ Edit
                  </button>
                  <button type="button" class="btn btn-outline btn-xs btn-del-step" data-tc="${tcIndex}" data-step="${sIdx}" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.4);" title="Hapus Langkah ini">
                    🗑 Hapus
                  </button>
                </div>
              </div>
              <div class="step-img-col">
                ${s.screenshot ? `
                  <div class="thumb-wrapper" title="Klik untuk memperbesar gambar">
                    <img src="${s.screenshot}" class="zoomable-img" loading="lazy" decoding="async" />
                  </div>
                  <div style="display: flex; gap: 4px; justify-content: center; margin-top: 4px;">
                    <button type="button" class="btn btn-outline btn-xs btn-trigger-replace-img" data-tc="${tcIndex}" data-step="${sIdx}" style="color: #38bdf8;" title="Ganti Screenshot">
                      📷 Ganti
                    </button>
                    <button type="button" class="btn btn-outline btn-xs btn-del-img" data-tc="${tcIndex}" data-step="${sIdx}" style="color: #94a3b8;">Hapus</button>
                  </div>
                ` : `
                  <div style="color: #64748b; font-size: 10.5px; padding-top: 15px; font-style: italic;">Tidak ada screenshot</div>
                  <button type="button" class="btn btn-outline btn-xs btn-trigger-replace-img" data-tc="${tcIndex}" data-step="${sIdx}" style="color: #38bdf8; margin-top: 6px;" title="Upload Screenshot">
                    📷 Upload
                  </button>
                `}
              </div>
            </div>
          `;
        }
      });

      const isActiveTarget = (doc.activeTcId === tc.id || (!doc.activeTcId && tcIndex === 0));

      // Jika dokumen memiliki banyak TC (>3), otomatis ciutkan TC non-target untuk menghemat 85% konsumsi RAM browser
      const isCollapsed = tc.__isCollapsed !== undefined
        ? !!tc.__isCollapsed
        : (tcs.length > 3 && !isActiveTarget);

      const isStepsCollapsed = !!tc.__isStepsCollapsed;
      if (isCollapsed) {
        tcCard.classList.add('is-collapsed');
      }

      tcCard.innerHTML = `
        <div class="tc-header-row" title="Klik area baris untuk bentangkan / ciutkan Test Case ini">
          <div class="tc-badge-wrap">
            <button type="button" class="btn-toggle-tc-chevron" title="${isCollapsed ? 'Bentangkan Test Case ini' : 'Ciutkan Test Case ini'}" aria-label="${isCollapsed ? 'Bentangkan' : 'Ciutkan'}">
              ${isCollapsed ? '▶' : '▼'}
            </button>
            <div class="tc-num-badge ${isActiveTarget ? 'is-active-target' : ''} btn-set-active-tc" data-tc-id="${tc.id}" title="${isActiveTarget ? '🎯 Target Rekam Aktif (Perekaman Otomatis/Manual Masuk ke TC Ini)' : 'Klik untuk jadikan Target Rekam Aktif'}" style="cursor: pointer;">
              <span>${escapeHtml(tc.tcNumberStr || ('TC ' + (tc.tcNumber || (tcIndex + 1))))}</span>
              ${isActiveTarget ? '<span class="tc-target-icon" style="font-size: 11px;">🎯</span>' : ''}
            </div>
            <input type="text" class="tc-title-input" value="${escapeHtml(tc.title || 'Test Case ' + (tcIndex + 1))}" placeholder="Nama Test Case" />
            <span class="tc-steps-pill" style="font-size:10.5px; color:#94a3b8; background:#1e293b; border:1px solid #334155; padding:2px 7px; border-radius:12px; white-space:nowrap; user-select:none;">
              ${steps.length} Langkah
            </span>
            ${tc.role ? `<span class="tc-role-pill" style="font-size:10.5px; color:#38bdf8; background:rgba(2,132,199,0.15); border:1px solid rgba(2,132,199,0.3); padding:2px 7px; border-radius:12px; white-space:nowrap;">👤 ${escapeHtml(tc.role)}</span>` : ''}
          </div>
          <div class="tc-controls">
            <button type="button" class="btn btn-xs btn-run-single-tc" data-tc="${escapeHtml(tc.tcNumberStr || ('TC ' + (tc.tcNumber || (tcIndex + 1))))}" style="background: linear-gradient(135deg, #0284c7, #2563eb); color: #fff; border: 1px solid rgba(255,255,255,0.18); padding: 4px 10px; border-radius: 5px; font-weight: 700; font-size: 11px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 5px rgba(2,132,199,0.35); transition: all 0.15s ease;" title="Jalankan skenario ${escapeHtml(tc.tcNumberStr || ('TC ' + (tc.tcNumber || (tcIndex + 1))))} &amp; rekam bukti otomatis">
              <span>⚡ Jalankan TC Ini</span>
            </button>
            <select class="tc-status-select ${(tc.status || 'OK').toLowerCase()}">
              <option value="OK" ${tc.status === 'OK' ? 'selected' : ''}>✅ OK</option>
              <option value="NOK" ${tc.status === 'NOK' ? 'selected' : ''}>❌ NOK</option>
              <option value="Pending" ${tc.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
            </select>
            <button type="button" class="btn btn-danger btn-xs btn-del-tc btn-icon-only" title="Hapus Test Case ini">🗑</button>
          </div>
        </div>

        <div class="tc-body-content" style="${isCollapsed ? 'display: none;' : ''}">
          <!-- BARIS DETAIL TERPISAH: NOMOR TC (URUT DEFAULT, EDITABLE) & ROLE PENGUJI (OPSIONAL) -->
          <div style="display: grid; grid-template-columns: 150px 1fr; gap: 10px; margin-bottom: 8px;">
            <div class="form-group" style="margin: 0;">
              <label style="font-weight: 600; font-size: 11px; color: #94a3b8; display: block; margin-bottom: 3px;">
                🔢 Nomor Test Case:
              </label>
              <input type="text" class="form-control tc-number-input" value="${escapeHtml(tc.tcNumberStr || ('TC ' + (tc.tcNumber || (tcIndex + 1))))}" placeholder="Contoh: TC 1 / TC-01" style="font-weight: 700; color: #38bdf8;" />
            </div>
            <div class="form-group" style="margin: 0;">
              <label style="font-weight: 600; font-size: 11px; color: #94a3b8; display: block; margin-bottom: 3px;">
                👤 Role Penguji / Aktor (Opsional):
              </label>
              <input type="text" class="form-control tc-role-input" value="${escapeHtml(tc.role || '')}" placeholder="Contoh: Auditor / PKA / Penyelia / Maker / Approver" />
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 8px;">
            <label style="font-weight: 600; font-size: 11px; color: #38bdf8; display: block; margin-bottom: 4px;">
              🎯 Skenario Pengujian (Skenario ${tc.tcNumber || (tcIndex + 1)}):
            </label>
            <input type="text" class="form-control tc-scenario-input" value="${escapeHtml(tc.scenarioName || ('Skenario ' + (tc.tcNumber || (tcIndex + 1))))}" placeholder="Contoh: Skenario 1: Propose Pendalaman" />
          </div>

          <div class="form-group" style="margin-bottom: 14px;">
            <label style="font-weight: 600; font-size: 11px; color: #10b981; display: block; margin-bottom: 4px;">
              🎯 Hasil yang Diharapkan (Expected Result based on Test Case):
            </label>
            <input type="text" class="form-control tc-expected-input" value="${escapeHtml(tc.expectedResult || '')}" placeholder="Hasil yang diharapkan based on Test Case..." />
          </div>

          <div style="margin-top: 10px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 12px; font-weight: 700; color: #cbd5e1;">Aktivitas & Evidens Screenshot (${steps.length} Langkah):</span>
                <button type="button" class="btn btn-outline btn-xs btn-toggle-steps-only" style="font-size: 10px; padding: 1px 7px; border-color: #334155; color: #94a3b8;" title="Sembunyikan / Tampilkan daftar evidens screenshot TC ini">
                  ${isStepsCollapsed ? '▶ Buka Evidens' : '▼ Tutup Evidens'}
                </button>
              </div>
              <button class="btn btn-outline btn-sm btn-add-substep" data-tc="${tcIndex}">➕ Tambah Langkah Manual</button>
            </div>
            <div class="tc-steps-list" style="${isStepsCollapsed ? 'display: none;' : ''}">
              ${stepsHtml || '<div style="color:#64748b; font-size:12px; font-style:italic; padding:12px 0;">Belum ada langkah/screenshot pada TC ini. Rekam menggunakan WeDocIt atau tambahkan langkah manual.</div>'}
            </div>
          </div>
        </div>
      `;

      const titleInput = tcCard.querySelector('.tc-title-input');
      const numberInput = tcCard.querySelector('.tc-number-input');
      const roleInput = tcCard.querySelector('.tc-role-input');
      const numBadge = tcCard.querySelector('.tc-num-badge');
      const scenarioInput = tcCard.querySelector('.tc-scenario-input');
      const statusSelect = tcCard.querySelector('.tc-status-select');
      const expectedInput = tcCard.querySelector('.tc-expected-input');
      const delTcBtn = tcCard.querySelector('.btn-del-tc');
      const addSubstepBtn = tcCard.querySelector('.btn-add-substep');
      const headerRow = tcCard.querySelector('.tc-header-row');
      const toggleChevronBtn = tcCard.querySelector('.btn-toggle-tc-chevron');
      const tcBodyContent = tcCard.querySelector('.tc-body-content');
      const toggleStepsOnlyBtn = tcCard.querySelector('.btn-toggle-steps-only');
      const tcStepsList = tcCard.querySelector('.tc-steps-list');

      numberInput?.addEventListener('input', () => {
        tc.tcNumberStr = numberInput.value.trim() || `TC ${tc.tcNumber || (tcIndex + 1)}`;
        if (numBadge) numBadge.textContent = tc.tcNumberStr;
        saveActiveDocState();
      });

      roleInput?.addEventListener('input', () => {
        tc.role = roleInput.value.trim();
        saveActiveDocState();
      });

      function updateCardCollapse() {
        if (tc.__isCollapsed) {
          tcBodyContent.style.display = 'none';
          tcCard.classList.add('is-collapsed');
          if (toggleChevronBtn) {
            toggleChevronBtn.innerHTML = '▶';
            toggleChevronBtn.title = 'Bentangkan Test Case ini';
          }
        } else {
          tcBodyContent.style.display = 'block';
          tcCard.classList.remove('is-collapsed');
          if (toggleChevronBtn) {
            toggleChevronBtn.innerHTML = '▼';
            toggleChevronBtn.title = 'Ciutkan Test Case ini';
          }
        }
      }

      // 1. Klik langsung pada icon chevron kiri
      toggleChevronBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        tc.__isCollapsed = !tc.__isCollapsed;
        updateCardCollapse();
      });

      // 2. Klik pada area kosong baris header (kecuali input teks, select status, badge target, atau tombol hapus)
      headerRow?.addEventListener('click', (e) => {
        if (e.target.closest('input, select, .tc-num-badge, .btn-del-tc, .btn-toggle-tc-chevron')) {
          return;
        }
        tc.__isCollapsed = !tc.__isCollapsed;
        updateCardCollapse();
      });

      toggleStepsOnlyBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        tc.__isStepsCollapsed = !tc.__isStepsCollapsed;
        if (tc.__isStepsCollapsed) {
          tcStepsList.style.display = 'none';
          toggleStepsOnlyBtn.textContent = '▶ Buka Evidens';
        } else {
          tcStepsList.style.display = 'block';
          toggleStepsOnlyBtn.textContent = '▼ Tutup Evidens';
        }
      });

      titleInput?.addEventListener('input', () => {
        tc.title = titleInput.value;
        tc.__userEditedTitle = true;
        const currentTitle = titleInput.value.trim();
        if (currentTitle && !tc.__userEditedExpected) {
          tc.expectedResult = predictExpectedFromTestCase(currentTitle);
          if (expectedInput) expectedInput.value = tc.expectedResult;
        }
        saveActiveDocState();
      });

      scenarioInput?.addEventListener('input', () => {
        tc.scenarioName = scenarioInput.value;
        const currentSc = scenarioInput.value.trim();
        if (currentSc) {
          const derivedTitle = predictTestCaseFromScenario(currentSc, tc.tcNumber || (tcIndex + 1));
          if (!tc.__userEditedTitle) {
            tc.title = derivedTitle;
            if (titleInput) titleInput.value = derivedTitle;
          }
          if (!tc.__userEditedExpected) {
            tc.expectedResult = predictExpectedFromTestCase(tc.__userEditedTitle ? tc.title : derivedTitle);
            if (expectedInput) expectedInput.value = tc.expectedResult;
          }
        }
        saveActiveDocState();
      });

      statusSelect?.addEventListener('change', () => {
        tc.status = statusSelect.value;
        saveActiveDocState();
      });

      expectedInput?.addEventListener('input', () => {
        tc.expectedResult = expectedInput.value;
        tc.__userEditedExpected = true;
        saveActiveDocState();
      });

      const setActiveBtn = tcCard.querySelector('.btn-set-active-tc');
      setActiveBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        doc.activeTcId = tc.id;
        sessionData.activeTcId = tc.id;
        saveActiveDocState(() => {
          if (window.chrome && window.chrome.runtime && window.chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ type: 'SWITCH_ACTIVE_TC', tcId: tc.id });
          }
          renderTestCases();
        });
      });

      delTcBtn?.addEventListener('click', () => {
        suppressFocusReloadUntil = Date.now() + 5000;
        const tcLabel = tc.tcNumberStr || ('TC ' + (tc.tcNumber || (tcIndex + 1)));
        if (confirm(`Hapus Test Case ${tcLabel} ("${tc.title}")?`)) {
          tcs.splice(tcIndex, 1);
          tcs.forEach((t, i) => {
            t.tcNumber = i + 1;
            if (!t.tcNumberStr || /^TC\s*\d+$/i.test(t.tcNumberStr)) {
              t.tcNumberStr = 'TC ' + (i + 1);
            }
          });
          if (doc.activeTcId === tc.id) {
            doc.activeTcId = tcs[0]?.id || '';
            sessionData.activeTcId = doc.activeTcId;
            if (window.chrome && window.chrome.runtime && window.chrome.runtime.sendMessage) {
              chrome.runtime.sendMessage({ type: 'SWITCH_ACTIVE_TC', tcId: doc.activeTcId });
            }
          }
          saveActiveDocState();
          renderTestCases();
        }
      });

      tcCard.querySelector('.btn-run-single-tc')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        const btn = e.currentTarget;
        const curTcNo = tc.tcNumberStr || `TC-${String(tcIndex + 1).padStart(3, '0')}`;
        await runSingleTestCase(curTcNo, btn);
      });

      addSubstepBtn?.addEventListener('click', () => {
        if (!tc.steps) tc.steps = [];
        const nextStepNum = tc.steps.length + 1;
        const manualStep = getContextualManualStep(nextStepNum);
        tc.steps.push({
          id: 'step_' + Date.now(),
          stepNumber: nextStepNum,
          title: manualStep.title,
          actionDescription: manualStep.actionDescription,
          inputData: manualStep.inputData,
          expectedResult: manualStep.expectedResult,
          screenshot: ''
        });
        saveActiveDocState();
        renderTestCases();
      });

      tcCard.querySelectorAll('.zoomable-img').forEach(img => {
        img.addEventListener('click', () => {
          modalImg.src = img.src;
          modalZoom.classList.add('active');
        });
      });

      // Tombol Edit Langkah
      tcCard.querySelectorAll('.btn-edit-step').forEach(btn => {
        btn.addEventListener('click', () => {
          const tcIdx = parseInt(btn.dataset.tc, 10);
          const sIdx = parseInt(btn.dataset.step, 10);
          editingStep = { tcIndex: tcIdx, stepIndex: sIdx };
          renderTestCases();
          const targetInp = document.querySelector(`.inp-edit-title[data-tc="${tcIdx}"][data-step="${sIdx}"]`);
          if (targetInp) targetInp.focus();
        });
      });

      // Tombol Simpan Perubahan Langkah
      tcCard.querySelectorAll('.btn-save-step').forEach(btn => {
        btn.addEventListener('click', () => {
          const tcIdx = parseInt(btn.dataset.tc, 10);
          const sIdx = parseInt(btn.dataset.step, 10);
          const row = btn.closest('.tc-substep-row');
          if (!row) return;

          const newTitle = row.querySelector('.inp-edit-title')?.value.trim();
          const newDesc = row.querySelector('.inp-edit-desc')?.value.trim();
          const newInput = row.querySelector('.inp-edit-input')?.value.trim();
          const newExpected = row.querySelector('.inp-edit-expected')?.value.trim();

          const targetTc = tcs[tcIdx];
          if (targetTc && targetTc.steps && targetTc.steps[sIdx]) {
            targetTc.steps[sIdx].title = newTitle || `Aktivitas ${sIdx + 1}`;
            targetTc.steps[sIdx].actionDescription = newDesc || '';
            targetTc.steps[sIdx].inputData = newInput || '-';
            targetTc.steps[sIdx].expectedResult = newExpected || '';
            saveActiveDocState();
          }
          editingStep = null;
          renderTestCases();
        });
      });

      // Tombol Batal Edit Langkah
      tcCard.querySelectorAll('.btn-cancel-step').forEach(btn => {
        btn.addEventListener('click', () => {
          editingStep = null;
          renderTestCases();
        });
      });

      // Keyboard Shortcut saat Edit Langkah (Esc = Batal, Enter/Ctrl+Enter = Simpan)
      tcCard.querySelectorAll('.inp-edit-title, .inp-edit-desc, .inp-edit-input, .inp-edit-expected').forEach(input => {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            editingStep = null;
            renderTestCases();
          } else if (e.key === 'Enter' && (e.ctrlKey || input.tagName === 'INPUT')) {
            e.preventDefault();
            const row = input.closest('.tc-substep-row');
            row?.querySelector('.btn-save-step')?.click();
          }
        });
      });

      // Upload / Ganti Gambar Screenshot (via global file picker)
      tcCard.querySelectorAll('.btn-trigger-replace-img').forEach(btn => {
        btn.addEventListener('click', () => {
          const tcIdx = parseInt(btn.dataset.tc, 10);
          const sIdx = parseInt(btn.dataset.step, 10);
          activeImgReplaceTarget = { tcIdx, sIdx };
          if (globalReplaceImg) {
            globalReplaceImg.value = '';
            globalReplaceImg.click();
          }
        });
      });

      tcCard.querySelectorAll('.btn-del-step').forEach(btn => {
        btn.addEventListener('click', () => {
          const sIdx = parseInt(btn.dataset.step, 10);
          suppressFocusReloadUntil = Date.now() + 5000;
          if (confirm('Hapus langkah ini?')) {
            tc.steps.splice(sIdx, 1);
            tc.steps.forEach((st, idx) => { st.stepNumber = idx + 1; });
            saveActiveDocState();
            renderTestCases();
          }
        });
      });

      tcCard.querySelectorAll('.btn-del-img').forEach(btn => {
        btn.addEventListener('click', () => {
          const sIdx = parseInt(btn.dataset.step, 10);
          suppressFocusReloadUntil = Date.now() + 4000;
          tc.steps[sIdx].screenshot = '';
          saveActiveDocState();
          renderTestCases();
        });
      });

      // Tombol Pindah Langkah (Naik / Turun)
      tcCard.querySelectorAll('.btn-move-step-up').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const tcIdx = parseInt(btn.dataset.tc, 10);
          const sIdx = parseInt(btn.dataset.step, 10);
          moveStep(tcIdx, sIdx, sIdx - 1);
        });
      });

      tcCard.querySelectorAll('.btn-move-step-down').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const tcIdx = parseInt(btn.dataset.tc, 10);
          const sIdx = parseInt(btn.dataset.step, 10);
          moveStep(tcIdx, sIdx, sIdx + 1);
        });
      });

      // Drag & Drop pada baris langkah
      tcCard.querySelectorAll('.tc-substep-row[draggable="true"]').forEach(row => {
        row.addEventListener('dragstart', (e) => {
          if (e.target.closest('button, input, textarea, .zoomable-img')) {
            e.preventDefault();
            return;
          }
          const tcIdx = parseInt(row.dataset.tc, 10);
          const sIdx = parseInt(row.dataset.step, 10);
          draggedStepInfo = { tcIndex: tcIdx, stepIndex: sIdx };
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', `${tcIdx}:${sIdx}`);
          row.classList.add('is-dragging');
        });

        row.addEventListener('dragover', (e) => {
          e.preventDefault();
          if (!draggedStepInfo || draggedStepInfo.tcIndex !== parseInt(row.dataset.tc, 10)) return;
          e.dataTransfer.dropEffect = 'move';
          
          const rect = row.getBoundingClientRect();
          const offset = e.clientY - rect.top;
          if (offset < rect.height / 2) {
            row.classList.add('drag-over-top');
            row.classList.remove('drag-over-bottom');
          } else {
            row.classList.add('drag-over-bottom');
            row.classList.remove('drag-over-top');
          }
        });

        row.addEventListener('dragleave', () => {
          row.classList.remove('drag-over-top', 'drag-over-bottom');
        });

        row.addEventListener('drop', (e) => {
          e.preventDefault();
          row.classList.remove('drag-over-top', 'drag-over-bottom');
          if (!draggedStepInfo) return;

          const targetTcIdx = parseInt(row.dataset.tc, 10);
          const targetStepIdx = parseInt(row.dataset.step, 10);

          if (draggedStepInfo.tcIndex === targetTcIdx && draggedStepInfo.stepIndex !== targetStepIdx) {
            const rect = row.getBoundingClientRect();
            const isUpperHalf = (e.clientY - rect.top) < (rect.height / 2);
            let finalTargetIdx = targetStepIdx;

            if (!isUpperHalf && draggedStepInfo.stepIndex < targetStepIdx) {
              finalTargetIdx = targetStepIdx;
            } else if (isUpperHalf && draggedStepInfo.stepIndex > targetStepIdx) {
              finalTargetIdx = targetStepIdx;
            }

            moveStep(draggedStepInfo.tcIndex, draggedStepInfo.stepIndex, finalTargetIdx);
          }
          draggedStepInfo = null;
        });

        row.addEventListener('dragend', () => {
          row.classList.remove('is-dragging', 'drag-over-top', 'drag-over-bottom');
          draggedStepInfo = null;
        });
      });

      stepsContainer.appendChild(tcCard);
    });
  }

  function addNewTestCase() {
    const doc = getActiveDoc();
    const tcs = doc.testCases || [];
    const nextNum = tcs.length + 1;
    const baseMod = doc.metadata?.scenarioName || 'Pelaksanaan Alur';
    const tcScenario = `Skenario ${nextNum}: Pengujian ${baseMod}`;
    const tcTitle = predictTestCaseFromScenario(tcScenario, nextNum);
    const tcExpected = predictExpectedFromTestCase(tcTitle);
    const defaultRole = getDefaultTesterRole();
    tcs.push({
      id: 'tc_' + Date.now(),
      tcNumber: nextNum,
      tcNumberStr: `TC ${nextNum}`,
      role: defaultRole,
      scenarioName: tcScenario,
      title: tcTitle,
      expectedResult: tcExpected,
      status: 'OK',
      steps: []
    });
    doc.testCases = tcs;
    doc.activeTcId = tcs[tcs.length - 1].id;
    saveActiveDocState();
    renderTestCases();
  }

  btnAddStep?.addEventListener('click', addNewTestCase);

  // =========================================================================
  // SMART SCENARIO GENERATOR & AI BRIDGE (WeDocIt Studio)
  // =========================================================================
  function generateStandardScenariosForCurrentDoc() {
    const doc = getActiveDoc();
    const scName = (doc.metadata?.scenarioName || doc.metadata?.title || '').toLowerCase();
    const isLogin = scName.includes('login') || scName.includes('auth') || scName.includes('security');

    if ((doc.testCases || []).length > 0) {
      if (!confirm(`Dokumen saat ini sudah memiliki ${doc.testCases.length} Test Case.\n\nApakah Anda ingin menambahkan daftar skenario standar secara otomatis ke dokumen ini?`)) {
        return;
      }
    }

    let generatedTcs = [];

    if (isLogin) {
      generatedTcs = [
        {
          tcNumberStr: 'TC-001',
          title: 'Tampilan Halaman Sign In RMIS',
          scenarioName: 'Memeriksa Komponen Antarmuka Form Login',
          expectedResult: 'Halaman Sign in RMIS berhasil dimuat lengkap dengan form input dan tombol aksi.',
          role: 'Admin / User',
          status: 'OK',
          steps: [
            {
              stepNumber: 1,
              title: 'Akses Halaman Sign In RMIS',
              actionDescription: 'Pengguna membuka URL login aplikasi RMIS (http://localhost:4300/login).',
              inputData: '-',
              expectedResult: 'Halaman Sign in RMIS berhasil terbuka menampilkan logo BNI dan form autentikasi.'
            },
            {
              stepNumber: 2,
              title: 'Verifikasi Komponen Elemen Form Login',
              actionDescription: 'Memeriksa ketersediaan input Username, input Password, tombol SIGN IN, dan link kembali ke Portal.',
              inputData: '-',
              expectedResult: 'Seluruh komponen form login tampil proporsional dan siap digunakan.'
            }
          ]
        },
        {
          tcNumberStr: 'TC-002',
          title: 'Fitur Masking dan Unmasking Password',
          scenarioName: 'Pengujian Toggle Masking Password',
          expectedResult: 'Karakter password dapat disembunyikan (bullet) dan ditampilkan (teks biasa) secara presisi.',
          role: 'Admin / User',
          status: 'OK',
          steps: [
            {
              stepNumber: 1,
              title: 'Input Password Kondisi Terselubung (Masked)',
              actionDescription: 'Memasukkan karakter password dan memastikan karakter tersamarkan dengan bullet titik.',
              inputData: 'Password: ********',
              expectedResult: 'Karakter password tersamarkan untuk mencegah shoulder surfing.'
            },
            {
              stepNumber: 2,
              title: 'Klik Toggle Eye Icon untuk Menampilkan Password',
              actionDescription: 'Mengklik ikon mata (toggle mask) di sebelah kanan field password.',
              inputData: '-',
              expectedResult: 'Karakter password tampil dalam bentuk teks biasa (unmasked).'
            }
          ]
        },
        {
          tcNumberStr: 'TC-003',
          title: 'Validasi Mandatory Fields Kosong',
          scenarioName: 'Pengujian Validasi Form Kosong pada Sign In',
          expectedResult: 'Sistem mencegah pengiriman form dan menandai pesan error validasi wajib diisi.',
          role: 'Admin / User',
          status: 'OK',
          steps: [
            {
              stepNumber: 1,
              title: 'Kosongkan Field Username dan Password',
              actionDescription: 'Menyentuh field username dan password tanpa memasukkan teks apa pun.',
              inputData: 'Username: (kosong) | Password: (kosong)',
              expectedResult: 'Tombol SIGN IN tetap dalam status nonaktif (disabled).'
            },
            {
              stepNumber: 2,
              title: 'Verifikasi Pesan Validasi Form',
              actionDescription: 'Memeriksa teks peringatan validasi form.',
              inputData: '-',
              expectedResult: 'Muncul teks validasi "Username wajib diisi" dan "Password wajib diisi" berwarna merah.'
            }
          ]
        },
        {
          tcNumberStr: 'TC-004',
          title: 'Validasi Panjang Minimal Password',
          scenarioName: 'Pengujian Batas Minimal Karakter Password',
          expectedResult: 'Sistem memvalidasi panjang password minimal 8 karakter.',
          role: 'Admin / User',
          status: 'OK',
          steps: [
            {
              stepNumber: 1,
              title: 'Input Password Kurang dari 8 Karakter',
              actionDescription: 'Mengisi username valid dan mengisi password kurang dari 8 karakter (misal: "Admin1").',
              inputData: 'Password: Admin1 (6 karakter)',
              expectedResult: 'Form mendeteksi panjang password belum memenuhi syarat.'
            },
            {
              stepNumber: 2,
              title: 'Verifikasi Pesan Peringatan Minimal Karakter',
              actionDescription: 'Memeriksa pesan validasi di bawah field password.',
              inputData: '-',
              expectedResult: 'Muncul pesan validasi "Minimal 8 karakter" dan tombol SIGN IN tetap disabled.'
            }
          ]
        },
        {
          tcNumberStr: 'TC-005',
          title: 'Pengujian Login Gagal (Kredensial Salah)',
          scenarioName: 'Proteksi Autentikasi dengan Username / Password Salah',
          expectedResult: 'Sistem menolak autentikasi dan menampilkan notifikasi kesalahan kredensial.',
          role: 'Admin / User',
          status: 'OK',
          steps: [
            {
              stepNumber: 1,
              title: 'Input Kredensial Tidak Terdaftar',
              actionDescription: 'Memasukkan username dan password acak yang tidak terdaftar di sistem.',
              inputData: 'Username: user_invalid | Password: PasswordSalah123!',
              expectedResult: 'Form terisi dan tombol SIGN IN menjadi aktif.'
            },
            {
              stepNumber: 2,
              title: 'Klik Tombol SIGN IN dan Verifikasi Toast Error',
              actionDescription: 'Menekan tombol SIGN IN dan mengamati respons server.',
              inputData: '-',
              expectedResult: 'Sistem menampilkan notifikasi toast error "User Credential Salah" dan pengguna tetap berada di halaman login.'
            }
          ]
        },
        {
          tcNumberStr: 'TC-006',
          title: 'Pengujian Login Sukses Akun Local Administrator',
          scenarioName: 'Autentikasi Pengguna Menggunakan Akun Local Admin',
          expectedResult: 'Sistem sukses memvalidasi kredensial dan mengalihkan pengguna ke Dashboard / Portal.',
          role: 'Admin / Local Administrator',
          status: 'OK',
          steps: [
            {
              stepNumber: 1,
              title: 'Input Kredensial Valid Administrator',
              actionDescription: 'Memasukkan username "Admin" dan password resmi administrator.',
              inputData: 'Username: Admin | Password: [PROTECTED]',
              expectedResult: 'Kredensial terisi valid dan tombol SIGN IN aktif.'
            },
            {
              stepNumber: 2,
              title: 'Klik SIGN IN dan Verifikasi Redirect Portal',
              actionDescription: 'Menekan tombol SIGN IN untuk memulai sesi login.',
              inputData: '-',
              expectedResult: 'Sistem menyimpan token otorisasi dan mengalihkan pengguna ke halaman utama / portal aplikasi.'
            }
          ]
        },
        {
          tcNumberStr: 'TC-007',
          title: 'Pengujian Navigasi Portal Modul (RMIS & CRDM)',
          scenarioName: 'Peralihan Halaman Sign In ke Portal Pemilihan Modul',
          expectedResult: 'Sistem sukses mengalihkan pengguna ke portal pemilihan modul RMIS.',
          role: 'Admin / User',
          status: 'OK',
          steps: [
            {
              stepNumber: 1,
              title: 'Klik Tautan Pemilihan Portal Modul',
              actionDescription: 'Mengklik tautan "Kembali ke Pemilihan Portal Modul (RMIS / CRDM)" di bawah tombol login.',
              inputData: '-',
              expectedResult: 'Browser diarahkan ke route /portal.'
            },
            {
              stepNumber: 2,
              title: 'Verifikasi Tampilan Kartu Modul pada Portal',
              actionDescription: 'Memeriksa tampilan kartu modul RMIS dan CRDM.',
              inputData: '-',
              expectedResult: 'Portal RMIS menampilkan kartu pilihan aplikasi yang dapat diakses pengguna.'
            }
          ]
        },
        {
          tcNumberStr: 'TC-008',
          title: 'Pengujian Logout & Proteksi Sesi Pengguna',
          scenarioName: 'Terminasi Sesi Pengguna dan Proteksi Akses URL Internal',
          expectedResult: 'Sesi pengguna berhasil ditutup, token dibersihkan, dan rute internal dilindungi dari akses tanpa login.',
          role: 'Admin / User',
          status: 'OK',
          steps: [
            {
              stepNumber: 1,
              title: 'Eksekusi Tombol Logout pada Profil Pengguna',
              actionDescription: 'Mengklik menu profil pada navigasi atas dan memilih opsi Logout.',
              inputData: '-',
              expectedResult: 'Sistem menghapus data autentikasi dari penyimpanan sesi browser.'
            },
            {
              stepNumber: 2,
              title: 'Verifikasi Redirect ke Halaman Login dan Proteksi URL',
              actionDescription: 'Mencoba menekan tombol Back pada browser atau mengakses route internal secara langsung.',
              inputData: 'URL: /admin-ciso/ldap-configuration',
              expectedResult: 'Sistem secara otomatis mengarahkan kembali ke halaman /login (Auth Guard aktif).'
            }
          ]
        }
      ];
    } else {
      const baseMod = doc.metadata?.scenarioName || 'Modul Aplikasi';
      generatedTcs = [
        {
          tcNumberStr: 'TC-001',
          title: `Akses Menu & Tampilan Halaman ${baseMod}`,
          scenarioName: `Melihat Daftar Data ${baseMod}`,
          expectedResult: `Halaman ${baseMod} terbuka menampilkan judul, filter, dan tabel data.`,
          role: 'Admin / User',
          status: 'OK',
          steps: [
            {
              stepNumber: 1,
              title: `Akses Menu ${baseMod}`,
              actionDescription: `Pengguna mengakses menu ${baseMod} pada navigasi sistem.`,
              inputData: '-',
              expectedResult: `Halaman ${baseMod} berhasil terbuka dan dimuat lengkap.`
            },
            {
              stepNumber: 2,
              title: 'Verifikasi Komponen Filter dan Tabel Data',
              actionDescription: 'Memeriksa kolom header tabel dan tombol aksi.',
              inputData: '-',
              expectedResult: 'Tabel menampilkan daftar data dengan tombol aksi yang siap digunakan.'
            }
          ]
        },
        {
          tcNumberStr: 'TC-002',
          title: `Pencarian dan Penyaringan (Filter) Data ${baseMod}`,
          scenarioName: `Filter Data Berdasarkan Kriteria Pencarian`,
          expectedResult: 'Sistem menyaring data sesuai dengan kata kunci pencarian.',
          role: 'Admin / User',
          status: 'OK',
          steps: [
            {
              stepNumber: 1,
              title: 'Input Kriteria Pencarian',
              actionDescription: 'Memasukkan kata kunci pencarian pada kolom filter.',
              inputData: 'Keyword: TEST',
              expectedResult: 'Parameter pencarian terisi pada kolom filter.'
            },
            {
              stepNumber: 2,
              title: 'Klik Tombol Search dan Verifikasi Hasil',
              actionDescription: 'Menekan tombol Search untuk menerapkan filter.',
              inputData: '-',
              expectedResult: 'Tabel menampilkan baris data yang cocok dengan kriteria pencarian.'
            }
          ]
        },
        {
          tcNumberStr: 'TC-003',
          title: `Tambah Data Baru pada ${baseMod}`,
          scenarioName: `Menambahkan Entri Data Baru`,
          expectedResult: 'Sistem sukses menyimpan entri data baru ke dalam database.',
          role: 'Admin / User',
          status: 'OK',
          steps: [
            {
              stepNumber: 1,
              title: 'Buka Formulir Tambah Data',
              actionDescription: 'Klik tombol Tambah Data pada halaman modul.',
              inputData: '-',
              expectedResult: 'Modal dialog formulir penambahan data terbuka di layar.'
            },
            {
              stepNumber: 2,
              title: 'Lengkapi Field Mandatory dan Simpan Data',
              actionDescription: 'Mengisi seluruh kolom isian mandatory dan menekan tombol Save.',
              inputData: 'Data Uji Baru',
              expectedResult: 'Sistem memvalidasi formulir dan menyimpan data baru.'
            }
          ]
        },
        {
          tcNumberStr: 'TC-004',
          title: `Validasi Formulir Kosong (Mandatory Check)`,
          scenarioName: `Proteksi Penyimpanan Data Tanpa Mengisi Field Wajib`,
          expectedResult: 'Sistem mencegah penyimpanan data saat kolom mandatory masih kosong.',
          role: 'Admin / User',
          status: 'OK',
          steps: [
            {
              stepNumber: 1,
              title: 'Buka Form Tanpa Mengisi Data',
              actionDescription: 'Membuka form penambahan dan membiarkan field mandatory tetap kosong.',
              inputData: '-',
              expectedResult: 'Formulir terbuka dalam kondisi seluruh kolom kosong.'
            },
            {
              stepNumber: 2,
              title: 'Tekan Tombol Simpan dan Periksa Validasi Error',
              actionDescription: 'Menekan tombol Save saat form kosong.',
              inputData: '-',
              expectedResult: 'Muncul indikator validasi border merah dan penyimpanan dibatalkan.'
            }
          ]
        },
        {
          tcNumberStr: 'TC-005',
          title: `Ubah (Edit) Data ${baseMod}`,
          scenarioName: `Memperbarui Data yang Sudah Ada`,
          expectedResult: 'Sistem sukses memperbarui informasi data pada sistem.',
          role: 'Admin / User',
          status: 'OK',
          steps: [
            {
              stepNumber: 1,
              title: 'Pilih Baris Data dan Klik Tombol Edit',
              actionDescription: 'Menekan tombol edit (ikon pensil) pada baris data yang ditargetkan.',
              inputData: '-',
              expectedResult: 'Formulir edit terbuka menampilkan data yang sudah ada sebelumnya.'
            },
            {
              stepNumber: 2,
              title: 'Perbarui Kolom Data dan Simpan Perubahan',
              actionDescription: 'Mengubah nilai parameter data dan menekan tombol Save.',
              inputData: 'Data Terbarui',
              expectedResult: 'Perubahan data berhasil disimpan dan tabel menampilkan data terbaru.'
            }
          ]
        }
      ];
    }

    const currentTcs = doc.testCases || [];
    const startIndex = currentTcs.length;

    const newFormattedTcs = generatedTcs.map((t, idx) => ({
      id: `tc_${Date.now()}_${startIndex + idx + 1}`,
      tcNumber: startIndex + idx + 1,
      tcNumberStr: `TC-${String(startIndex + idx + 1).padStart(3, '0')}`,
      role: t.role || getDefaultTesterRole() || 'Admin / User',
      title: t.title,
      scenarioName: t.scenarioName,
      expectedResult: t.expectedResult,
      status: t.status,
      steps: t.steps.map(s => ({
        stepNumber: s.stepNumber,
        title: s.title,
        actionDescription: s.actionDescription,
        inputData: s.inputData,
        expectedResult: s.expectedResult,
        screenshot: '',
        status: 'READY',
        note: ''
      }))
    }));

    doc.testCases = [...currentTcs, ...newFormattedTcs];
    if (doc.testCases.length > 0) {
      doc.activeTcId = doc.testCases[0].id;
    }

    saveActiveDocState();
    populateActiveDoc();
    renderTestCases();
    renderDocSelector();

    alert(`🎉 Berhasil membuat ${newFormattedTcs.length} Skenario Standar untuk "${doc.metadata?.scenarioName || 'Modul'}"!\n\nSilakan review daftar Test Case dan langkah pengujian di layar.`);
  }

  async function triggerAiBridgeChat() {
    const doc = getActiveDoc();
    const meta = doc.metadata || {};
    const sc = meta.scenarioName || 'Modul Aplikasi';
    const sys = meta.systemName || 'Sistem Informasi';
    const cr = meta.testCaseId || 'CR_UNIT_TEST';
    const url = meta.testUrl || 'http://localhost:4300';
    let code = meta.codePath || '';
    const role = meta.testRole || 'Admin / User';

    // Selalu tampilkan dialog konfirmasi/ubah path dengan nilai default dari path yang pernah dimasukkan
    const defaultPlaceholder = code || 'e:\\BNI\\RMIS\\rmis-fe\\src\\app\\modules\\welcome\\pages';
    const inputPath = prompt(
      `Masukkan atau ubah lokasi folder komponen source code untuk modul "${sc}":\n\n(Tekan OK untuk langsung memproses path ini, atau edit jika ingin menganalisis folder lain)`,
      defaultPlaceholder
    );
    if (inputPath === null) return; // Pengguna menekan Cancel
    code = inputPath.trim();
    if (!code) {
      alert('Lokasi path folder source code tidak boleh kosong.');
      return;
    }
    doc.metadata.codePath = code;
    saveActiveDocState();

    const btnBridge = document.getElementById('btn-ai-bridge-chat');
    const origHtml = btnBridge ? btnBridge.innerHTML : '';
    if (btnBridge) {
      btnBridge.disabled = true;
      btnBridge.innerHTML = `<span>⏳ Menganalisis Kode...</span>`;
    }

    try {
      const resp = await fetch('/api/ai/analyze-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codePath: code,
          scenarioName: sc,
          systemName: sys,
          crNo: cr,
          targetUrl: url,
          userRole: role
        })
      });

      const data = await resp.json();

      if (resp.ok && data.success && data.testCases && data.testCases.length > 0) {
        // Terapkan langsung Test Cases hasil analisis riil ke dokumen aktif
        doc.testCases = data.testCases.map((tc, idx) => ({
          id: `tc_ai_${Date.now()}_${idx + 1}`,
          tcNumber: idx + 1,
          tcNumberStr: tc.tcNumberStr || `TC-${String(idx + 1).padStart(3, '0')}`,
          role: tc.role || role,
          title: tc.title,
          scenarioName: tc.scenarioName,
          expectedResult: tc.expectedResult,
          status: tc.status || 'OK',
          steps: (tc.steps || []).map((s, sIdx) => ({
            stepNumber: sIdx + 1,
            title: s.title,
            actionDescription: s.actionDescription,
            inputData: s.inputData || '-',
            expectedResult: s.expectedResult || 'Sistem berjalan normal.',
            screenshot: '',
            status: 'READY',
            note: ''
          }))
        }));

        if (doc.testCases.length > 0) {
          doc.activeTcId = doc.testCases[0].id;
        }

        saveActiveDocState();
        populateActiveDoc();
        renderTestCases();
        renderDocSelector();

        alert(
          `🎉 Analisis Dinamis AI Antigravity Berhasil!\n\n` +
          `File Dianalisis: ${data.summary.filesCount} file\n` +
          `Ditemukan Elemen Riil:\n` +
          `- ${data.summary.inputs} Input Fields / Form Controls\n` +
          `- ${data.summary.buttons} Tombol & Tautan Aksi\n` +
          `- ${data.summary.validations} Pesan Validasi Error\n\n` +
          `👉 ${data.testCases.length} Test Case dinamis berhasil dirancang dan langsung aktif di layar WeDocIt Studio!`
        );
        return;
      }
    } catch (err) {
      console.warn('Gagal analisis lokal:', err);
    } finally {
      if (btnBridge) {
        btnBridge.disabled = false;
        btnBridge.innerHTML = origHtml;
      }
    }

    // Fallback: Jika source code tidak dapat dibaca di backend, salin prompt ke clipboard
    const promptText = `Halo Antigravity AI, tolong rancang dan buatkan skenario pengujian unit test lengkap untuk dokumen aktif di WeDocIt Studio:

## Konteks Pengujian:
- Sistem / Aplikasi: ${sys}
- Modul / Skenario: ${sc}
- Nomor CR: ${cr}
- Target URL: ${url}
- Lokasi Source Code: ${code || '(Belum ditentukan)'}
- Role Akun: ${role}

## Kebutuhan:
1. Buatkan skenario pengujian lengkap mencakup: Positive/Normal Case, Negative/Abnormal Case, Boundary Validation, dan Security Flow.
2. Lengkapi setiap Test Case dengan langkah pengujian detail Bab 3.1 standar BNI EDV (Aksi aktif, Input Data, dan Ekspektasi).
3. Langsung terapkan dan sinkronkan ke dokumen WeDocIt Studio agar saya bisa review langsung di tools.`;

    try {
      await navigator.clipboard.writeText(promptText);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = promptText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }

    alert(`📋 Konteks & Instruksi AI untuk modul "${sc}" BERHASIL DISALIN ke Clipboard!\n\n👉 Silakan buka chat Antigravity, lalu tekan Ctrl+V (Paste) dan tekan Enter.\nAI akan langsung membuatkan skenario lengkap untuk dokumen ini.`);
  }

  document.getElementById('btn-quick-generate-tcs')?.addEventListener('click', generateStandardScenariosForCurrentDoc);
  document.getElementById('btn-ai-bridge-chat')?.addEventListener('click', triggerAiBridgeChat);

  document.getElementById('btn-collapse-all')?.addEventListener('click', () => {
    const doc = getActiveDoc();
    const tcs = doc.testCases || [];
    tcs.forEach(t => { t.__isCollapsed = true; });
    renderTestCases();
  });

  document.getElementById('btn-expand-all')?.addEventListener('click', () => {
    const doc = getActiveDoc();
    const tcs = doc.testCases || [];
    tcs.forEach(t => { t.__isCollapsed = false; t.__isStepsCollapsed = false; });
    renderTestCases();
  });

  btnResetSteps?.addEventListener('click', () => {
    if (confirm('Yakin ingin mereset seluruh langkah pada dokumen ini ke 0?')) {
      const doc = getActiveDoc();
      doc.testCases = [];
      appStorage.set({ sessionData: sessionData }, () => {
        renderDocSelector();
        populateActiveDoc();
      });
      if (window.chrome && window.chrome.runtime && window.chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: 'RESET_ACTIVE_DOC' });
      }
    }
  });

  const btnResetAllDocs = document.getElementById('btn-reset-all-docs');
  btnResetAllDocs?.addEventListener('click', () => {
    if (confirm('⚠️ PERINGATAN: Yakin ingin MENGHAPUS SEMUA DOKUMEN dan mereset penyimpanan ke kondisi awal yang bersih?')) {
      const def = createDefaultDocument();
      sessionData = { documents: [def], activeDocId: def.id };
      appStorage.set({ sessionData: sessionData }, () => {
        renderDocSelector();
        populateActiveDoc();
        alert('Semua dokumen berhasil dihapus dan direset ke dokumen baru yang bersih!');
      });
      if (window.chrome && window.chrome.runtime && window.chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: 'RESET_ALL_DOCUMENTS' });
      }
    }
  });

  modalCloseBtn?.addEventListener('click', () => modalZoom.classList.remove('active'));
  modalZoom?.addEventListener('click', (e) => {
    if (e.target === modalZoom) modalZoom.classList.remove('active');
  });

  function showMissingTemplateModal() {
    const existing = document.getElementById('wedocit-missing-template-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'wedocit-missing-template-modal';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.75); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:99999;';
    modal.innerHTML = `
      <div style="background:#0f172a; border:1px solid #334155; border-radius:12px; width:450px; max-width:92%; padding:24px; text-align:center; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
        <div style="font-size:36px; margin-bottom:12px;">📁</div>
        <h3 style="font-size:16px; font-weight:700; color:#f1f5f9; margin-bottom:8px;">Template Word BNI EDV Belum Ada</h3>
        <p style="font-size:12.5px; color:#94a3b8; line-height:1.5; margin-bottom:20px;">
          File template bawaan (<code>template-bni-edv.docx</code>) tidak ditemukan pada instalasi ekstensi ini (biasanya karena folder template diabaikan saat clone Git).
        </p>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <button type="button" class="btn btn-primary" id="btn-modal-upload-tpl" style="justify-content:center; padding:10px; font-weight:600;">
            📂 Pilih File Template .docx
          </button>
          <button type="button" class="btn btn-secondary" id="btn-modal-export-general" style="justify-content:center; padding:10px; font-weight:600;">
            📄 Ekspor Format Standar (Tanpa Template)
          </button>
          <button type="button" class="btn btn-outline" id="btn-modal-cancel-tpl" style="justify-content:center; margin-top:4px; color:#94a3b8;">
            Tutup
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#btn-modal-upload-tpl')?.addEventListener('click', () => {
      modal.remove();
      // Dipicu langsung dari event listener klik user -> 100% valid User Activation di Chrome!
      templateDocxFile?.click();
    });

    modal.querySelector('#btn-modal-export-general')?.addEventListener('click', () => {
      modal.remove();
      if (exportFormatSelect) exportFormatSelect.value = 'html_standard';
      btnExportWord?.click();
    });

    modal.querySelector('#btn-modal-cancel-tpl')?.addEventListener('click', () => {
      modal.remove();
    });
  }

  // Helper: Format kolom Skenario dengan tag TC (misal: [TC-007] Propose Pendalaman)
  function formatScenarioWithTc(tc, idx, fallbackScName) {
    const tcTag = tc.tcNumberStr || `TC ${idx + 1}`;
    let baseScenario = (tc.scenarioName || fallbackScName || tc.title || 'Skenario Pengujian').trim();

    // Jika skenario sudah diawali dengan [TC...], gunakan apa adanya
    if (/^\[TC[-0-9\s]+\]/i.test(baseScenario)) {
      return baseScenario;
    }

    // Jika skenario diawali dengan "TC-007" atau "TC 1:", buang prefix tersebut agar diganti [TC-xxx] rapi
    if (/^TC[-0-9\s]+[:.-]?\s*/i.test(baseScenario)) {
      const withoutPrefix = baseScenario.replace(/^TC[-0-9\s]+[:.-]?\s*/i, '').trim();
      return `[${tcTag}] ${withoutPrefix}`;
    }

    return `[${tcTag}] ${baseScenario}`;
  }

  // =========================================================================
  // EXPORT WORD: DUAL ENGINE (NATIVE DOCX TEMPLATE REPLACER + CLEAN DOC EXPORT)
  // =========================================================================
  // EXPORT ENGINE: DUAL ENGINE (NATIVE DOCX TEMPLATE REPLACER + CLEAN DOC EXPORT)
  // =========================================================================


  // Toggle Dropdown Ekspor Dokumen
  btnExportDropdown?.addEventListener('click', (e) => {
    e.stopPropagation();
    exportMenuDropdown?.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (exportMenuDropdown && !exportMenuDropdown.contains(e.target) && e.target !== btnExportDropdown) {
      exportMenuDropdown.classList.remove('show');
    }
  });

  // Action: Ekspor sebagai Word (.docx / .doc)
  btnExportWord?.addEventListener('click', async () => {
    exportMenuDropdown?.classList.remove('show');
    try {
      btnExportWord.disabled = true;
      const res = await generateCurrentDocxBlob();
      if (res && res.blob) {
        const url = URL.createObjectURL(res.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Gagal mengekspor Word:', err);
      alert('Gagal mengekspor dokumen Word: ' + err.message);
    } finally {
      btnExportWord.disabled = false;
    }
  });

  // Action: Ekspor sebagai PDF (.pdf) via Microsoft Word COM
  btnExportPdfNative?.addEventListener('click', async () => {
    exportMenuDropdown?.classList.remove('show');
    try {
      btnExportPdfNative.disabled = true;
      btnExportPdfNative.innerHTML = `
        <span style="font-size: 18px;">⏳</span>
        <div style="text-align: left;">
          <div style="font-size: 12px; font-weight: 700; color: #fee2e2;">Mengonversi ke PDF...</div>
          <div style="font-size: 10px; color: #94a3b8; font-weight: normal;">Proses Microsoft Word COM</div>
        </div>
      `;

      const docxRes = await generateCurrentDocxBlob();
      if (!docxRes || !docxRes.blob) {
        throw new Error('Gagal menghasilkan file dokumen sumber.');
      }

      if (!docxRes.isDocx) {
        // Fallback untuk HTML doc: browser print dialog
        alert('Format Umum diekspor melalui dialog cetak browser.');
        window.print();
        return;
      }

      const base64Docx = await blobToBase64(docxRes.blob);
      const resp = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Docx,
          filename: docxRes.filename
        })
      });

      const data = await resp.json();
      if (resp.ok && data.success && data.pdfUrl) {
        // Otomatis download file PDF hasil konversi Word
        const a = document.createElement('a');
        a.href = data.pdfUrl;
        a.download = data.filename || docxRes.filename.replace(/\.docx$/i, '.pdf');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        throw new Error(data.error || data.details || 'Gagal konversi ke PDF');
      }
    } catch (err) {
      console.error('Gagal ekspor PDF native:', err);
      if (confirm(`Gagal konversi PDF via Microsoft Word (${err.message}).\n\nApakah ingin mencetak / unduh PDF melalui dialog cetak browser sekarang?`)) {
        window.print();
      }
    } finally {
      btnExportPdfNative.disabled = false;
      btnExportPdfNative.innerHTML = `
        <span style="font-size: 18px;">📄</span>
        <div style="text-align: left;">
          <div style="font-size: 12px; font-weight: 700; color: #fee2e2;">Ekspor sebagai PDF (.pdf)</div>
          <div style="font-size: 10px; color: #94a3b8; font-weight: normal;">Konversi Asli Microsoft Word (COM)</div>
        </div>
      `;
    }
  });

  btnPrintPdf?.addEventListener('click', () => {
    saveActiveDocState();
    window.print();
  });

  btnExportMd?.addEventListener('click', () => {
    saveActiveDocState();
    const doc = getActiveDoc();
    const meta = doc.metadata || {};
    const tcs = doc.testCases || [];
    const scenarioName = meta.scenarioName || 'Pengujian Alur Modul';

    let md = `# ${meta.title}\n\n`;
    md += `**Aplikasi / Sistem:** ${meta.systemName}  \n`;
    md += `**Skenario Uji:** ${scenarioName}  \n`;
    md += `**CR / Test Case ID:** ${meta.testCaseId}  \n`;
    md += `**Penguji:** ${meta.author}  \n`;
    md += `**Tanggal:** ${meta.date}  \n\n`;
    md += `### Skenario & Ringkasan Test Case\n\n`;
    md += `| No | Scenario | Test Case | Expected Result | Result |\n`;
    md += `| :---: | :--- | :--- | :--- | :---: |\n`;

    tcs.forEach((tc, idx) => {
      const rowScenario = formatScenarioWithTc(tc, idx, scenarioName);
      md += `| ${idx + 1} | ${rowScenario.replace(/\|/g, '-')} | ${(tc.title || '').replace(/\|/g, '-')} | ${(tc.expectedResult || '').replace(/\|/g, '-')} | **${tc.status || 'OK'}** |\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getFormattedDocFilename('md');
    a.click();
    URL.revokeObjectURL(url);
  });

  btnExportJson?.addEventListener('click', () => {
    saveActiveDocState();
    const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wedocit_workspace.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  const btnFileMenu = document.getElementById('btn-file-menu');
  const fileMenuDropdown = document.getElementById('file-menu-dropdown');
  const btnSyncMenu = document.getElementById('btn-sync-menu');
  const syncMenuDropdown = document.getElementById('sync-menu-dropdown');
  const btnAiMenu = document.getElementById('btn-ai-menu');
  const aiMenuDropdown = document.getElementById('ai-menu-dropdown');

  const allHeaderDropdowns = [
    { btn: btnFileMenu, menu: fileMenuDropdown },
    { btn: btnExportDropdown, menu: exportMenuDropdown },
    { btn: btnSyncMenu, menu: syncMenuDropdown },
    { btn: btnAiMenu, menu: aiMenuDropdown }
  ];

  allHeaderDropdowns.forEach(({ btn, menu }) => {
    btn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const willShow = !menu?.classList.contains('show');
      allHeaderDropdowns.forEach(d => d.menu?.classList.remove('show'));
      if (willShow) {
        menu?.classList.add('show');
      }
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown-wrapper')) {
      allHeaderDropdowns.forEach(d => d.menu?.classList.remove('show'));
    }
  });

  document.querySelectorAll('.dropdown-menu .dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
      allHeaderDropdowns.forEach(d => d.menu?.classList.remove('show'));
    });
  });

  btnCleanDoc?.addEventListener('click', () => {
    fileMenuDropdown?.classList.remove('show');
    const res = cleanAndMigrateOldDocumentData(sessionData);
    if (res.modified) {
      appStorage.set({ sessionData: sessionData }, () => {
        if (window.chrome && window.chrome.runtime && window.chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ type: 'STORAGE_UPDATED' });
        }
        renderDocSelector();
        populateActiveDoc();
        alert(`✔ Dokumen berhasil dinormalisasi!\n\n- ${res.cleanedTexts} teks field/komentar dibersihkan dari gambar base64 besar.\n- ${res.cleanedSteps} screenshot step input formulir dirapikan.\n- Judul dokumen & resolusi layar disesuaikan.`);
      });
    } else {
      alert('Dokumen ini sudah dalam kondisi bersih dan teroptimasi sesuai standar terbaru.');
    }
  });

  btnImportJson?.addEventListener('click', () => {
    fileInputJson.click();
  });

  fileInputJson?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (imported) {
          sessionData = imported;
          appStorage.set({ sessionData: sessionData }, () => {
            if (window.chrome && window.chrome.runtime && window.chrome.runtime.sendMessage) {
              chrome.runtime.sendMessage({ type: 'STORAGE_UPDATED' });
            }
            renderDocSelector();
            populateActiveDoc();
            alert('Workspace Dokumen Unit Test berhasil diimpor!');
          });
        }
      } catch (err) {
        alert('Gagal membaca file JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  });



  // Global Studio Bindings for Modular Extensions (Docx, Runner, Audit, AI Prompt)
  window.WeDocIt = {
    get sessionData() { return sessionData; },
    set sessionData(val) { sessionData = val; },
    getActiveDoc,
    saveActiveDocState,
    populateActiveDoc,
    renderTestCases,
    loadFreshState,
    getCustomDocxTemplateBuffer: () => customDocxTemplateBuffer,
    setCustomDocxTemplateBuffer: (buf) => { customDocxTemplateBuffer = buf; },
    getBundledDocxTemplateBuffer: () => bundledDocxTemplateBuffer,
    loadBundledTemplate,
    showMissingTemplateModal
  };
  window.getActiveDoc = getActiveDoc;
  window.saveActiveDocState = saveActiveDocState;
  window.populateActiveDoc = populateActiveDoc;
  window.renderTestCases = renderTestCases;
  window.loadFreshState = loadFreshState;

  // Initial Load
  loadFreshState();
});
