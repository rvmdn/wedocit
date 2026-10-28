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
          const local = localStorage.getItem('wedocit_sessionData');
          const parsed = local ? JSON.parse(local) : null;
          if (callback) callback({ sessionData: parsed });
        });
    },
    set: (items, callback) => {
      if (items && items.sessionData) {
        try {
          localStorage.setItem('wedocit_sessionData', JSON.stringify(items.sessionData));
          fetch('/api/workspace', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(items.sessionData)
          }).catch(e => console.warn('[Desktop Storage] Sync server failed:', e));
        } catch (err) {
          console.warn('[Desktop Storage] Gagal menyimpan:', err);
        }
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

  const DEFAULT_TC_PATTERNS = [
    {
      title: "Verifikasi Akses Menu & Tampilan Halaman Modul",
      expectedResult: "Halaman antarmuka berhasil dimuat lengkap dengan seluruh komponen filter, tabel, dan tombol aksi aktif."
    },
    {
      title: "Pengujian Pencarian & Penyaringan (Filter) Data",
      expectedResult: "Sistem menyaring data secara akurat sesuai kriteria parameter pencarian yang dimasukkan pengguna."
    },
    {
      title: "Pengujian Input Formulir & Validasi Simpan Data Baru",
      expectedResult: "Sistem memvalidasi keabsahan data formulir dan menyimpan rekaman baru dengan menampilkan notifikasi sukses."
    },
    {
      title: "Pengujian Pemutakhiran (Ubah/Edit) Informasi Data",
      expectedResult: "Perubahan informasi data berhasil tersimpan ke sistem dan terefleksi langsung pada daftar data."
    },
    {
      title: "Pengujian Alur Verifikasi / Persetujuan (Approval)",
      expectedResult: "Alur persetujuan berjalan sesuai hierarki kewenangan dan status pengajuan terbarui menjadi Disetujui (Approved)."
    },
    {
      title: "Pengujian Ekspor Data & Unduh Berkas Laporan",
      expectedResult: "Sistem berhasil mengenerate berkas dokumen laporan dalam format yang valid tanpa kendala."
    },
    {
      title: "Pengujian Validasi Form & Penanganan Error Input",
      expectedResult: "Sistem memunculkan pesan validasi yang jelas pada field mandatory dan mencegah penyimpanan data yang keliru."
    }
  ];

  function getContextualTcDetails(num) {
    const idx = Math.max(0, (num || 1) - 1) % DEFAULT_TC_PATTERNS.length;
    const p = DEFAULT_TC_PATTERNS[idx];
    return {
      title: `TC ${num || 1}: ${p.title}`,
      expectedResult: p.expectedResult
    };
  }

  // 1. Derivasi Expected Result berdasarkan aksi pada Test Case
  function predictExpectedFromTestCase(tcTitle) {
    const title = (tcTitle || '').trim();
    const low = title.toLowerCase();

    if (/propose/i.test(low)) {
      return 'Data berhasil di-propose dan status proses terkait terbarui di sistem.';
    }
    if (/submit/i.test(low)) {
      return 'Data berhasil di-submit dan status proses terkait terbarui di sistem.';
    }
    if (/kirim|ajukan|pengajuan|request|forward/i.test(low)) {
      return 'Data berhasil diajukan dan alur berlanjut ke tahap verifikasi di sistem.';
    }
    if (/approval|persetujuan|setuju/i.test(low)) {
      return 'Data berhasil disetujui (approved) dan status dokumen terbarui di sistem.';
    }
    if (/tolak|penolakan|reject|kembalikan|return/i.test(low)) {
      return 'Pengajuan berhasil ditolak dan catatan alasan penolakan tercatat di sistem.';
    }
    if (/input|tambah|penambahan|buat|pembuatan|create|rekam|perekaman/i.test(low)) {
      return 'Data baru berhasil disimpan lengkap dengan seluruh field mandatory.';
    }
    if (/ubah|pengubahan|edit|update|perbarui|pembaruan|koreksi/i.test(low)) {
      return 'Perubahan informasi data berhasil tersimpan ke sistem secara akurat.';
    }
    if (/hapus|penghapusan|delete|remove/i.test(low)) {
      return 'Data berhasil dihapus dari sistem dengan notifikasi konfirmasi sukses.';
    }
    if (/unduh|pengunduhan|ekspor|export|download|cetak/i.test(low)) {
      return 'Sistem berhasil mengenerate berkas dokumen dalam format yang valid tanpa kendala.';
    }
    if (/filter|penyaringan|cari|pencarian|search/i.test(low)) {
      return 'Sistem menyaring data secara akurat sesuai kriteria parameter pencarian.';
    }
    if (/verifikasi|akses|tampilan|menu|halaman/i.test(low)) {
      return 'Halaman antarmuka berhasil dimuat lengkap dengan seluruh komponen filter, tabel, dan tombol aksi aktif.';
    }
    return `Tindakan pengujian berhasil dieksekusi sesuai spesifikasi sistem.`;
  }

  // 2. Derivasi Test Case (Aksi Spesifik) berdasarkan Skenario
  function predictTestCaseFromScenario(scenarioName, nextNum = 1) {
    const sc = (scenarioName || '').trim();
    const scClean = sc.replace(/^(TC\s*\d+[:.-]?|Skenario\s*\d*[:.-]?)\s*/i, '').trim();
    const low = scClean.toLowerCase();

    if (/propose|pengajuan|ajukan|kirim|submit/i.test(low)) {
      return /^(melakukan|menguji)/i.test(scClean) ? scClean : `Melakukan ${scClean}`;
    }
    if (/approval|persetujuan|setuju/i.test(low)) {
      return /^(melakukan)/i.test(scClean) ? scClean : `Melakukan Persetujuan (Approval) ${scClean}`;
    }
    if (/tolak|penolakan|reject|kembalikan/i.test(low)) {
      return /^(melakukan)/i.test(scClean) ? scClean : `Melakukan Penolakan (Reject) ${scClean}`;
    }
    if (/input|tambah|penambahan|buat|pembuatan|rekam/i.test(low)) {
      return /^(melakukan)/i.test(scClean) ? scClean : `Melakukan ${scClean}`;
    }
    if (/ubah|pengubahan|edit|update|perbarui|pembaruan/i.test(low)) {
      return /^(melakukan)/i.test(scClean) ? scClean : `Melakukan Pembaruan ${scClean}`;
    }
    if (/hapus|penghapusan|delete|remove/i.test(low)) {
      return /^(melakukan)/i.test(scClean) ? scClean : `Melakukan Penghapusan ${scClean}`;
    }
    if (/unduh|pengunduhan|ekspor|export|download/i.test(low)) {
      return /^(melakukan)/i.test(scClean) ? scClean : `Melakukan Unduh / Ekspor ${scClean}`;
    }
    if (/filter|penyaringan|cari|pencarian|search/i.test(low)) {
      return /^(pengujian|melakukan)/i.test(scClean) ? scClean : `Pengujian Pencarian & Filter ${scClean}`;
    }
    if (/verifikasi|akses|tampilan|menu|halaman/i.test(low)) {
      return /^(verifikasi|melakukan)/i.test(scClean) ? scClean : `Verifikasi Akses & Tampilan ${scClean}`;
    }
    return /^(melakukan|menguji)/i.test(scClean) ? scClean : `Melakukan ${scClean || 'Pengujian Alur'}`;
  }

  const MANUAL_STEP_TEMPLATES = [
    {
      title: "Akses Halaman Modul",
      actionDescription: "Pengguna mengakses halaman modul untuk memulai proses pengujian alur sistem.",
      inputData: "-",
      expectedResult: "Halaman antarmuka termuat dengan baik dan seluruh elemen siap digunakan."
    },
    {
      title: "Terapkan Filter & Pencarian Data",
      actionDescription: "Pengguna menentukan kriteria filter pada kolom pencarian yang tersedia.",
      inputData: "Kata Kunci Pengujian",
      expectedResult: "Tabel menyajikan data yang relevan sesuai parameter pencarian."
    },
    {
      title: "Pengisian Formulir Transaksi",
      actionDescription: "Pengguna melengkapi data yang bersifat mandatory pada formulir input.",
      inputData: "Data Pengujian Valid",
      expectedResult: "Semua field formulir terisi dengan format yang benar tanpa error validasi."
    },
    {
      title: "Simpan & Konfirmasi Data",
      actionDescription: "Pengguna menekan tombol Simpan untuk memproses rekaman data ke dalam sistem.",
      inputData: "-",
      expectedResult: "Sistem berhasil menyimpan perubahan dan menyajikan notifikasi sukses."
    },
    {
      title: "Verifikasi Pemutakhiran Status Data",
      actionDescription: "Pengguna memeriksa status dan hasil pembaruan data pada tabel daftar utama.",
      inputData: "-",
      expectedResult: "Status data terbarui secara akurat sesuai alur bisnis yang diharapkan."
    }
  ];

  function getContextualManualStep(stepNum) {
    const idx = Math.max(0, (stepNum || 1) - 1) % MANUAL_STEP_TEMPLATES.length;
    const tpl = MANUAL_STEP_TEMPLATES[idx];
    return {
      title: `${stepNum}. ${tpl.title}`,
      actionDescription: tpl.actionDescription,
      inputData: tpl.inputData,
      expectedResult: tpl.expectedResult
    };
  }

  btnToggleSidebar?.addEventListener('click', () => {
    if (mainLayout.classList.contains('sidebar-collapsed')) {
      mainLayout.classList.remove('sidebar-collapsed');
      btnToggleSidebar.textContent = '◀ Sembunyikan Metadata';
    } else {
      mainLayout.classList.add('sidebar-collapsed');
      btnToggleSidebar.textContent = '▶ Tampilkan Metadata';
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

  // 1. Auto-refresh saat tab editor difokuskan / dibuka kembali dari luar
  window.addEventListener('focus', () => {
    if (Date.now() < suppressFocusReloadUntil) return;
    if (isSavingLocally) return;
    const isTyping = document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');
    if (!isTyping && !editingStep) {
      loadFreshState();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (Date.now() < suppressFocusReloadUntil) return;
    if (isSavingLocally) return;
    if (document.visibilityState === 'visible') {
      const isTyping = document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');
      if (!isTyping && !editingStep) {
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
          { name: 'Irvan Ramadan', npp: '822117' }
        ],
        author: 'Irvan Ramadan / 822117',
        testedBy: 'Irvan Ramadan',
        npp: '822117',
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

  // SWITCH DOCUMENT EVENT
  docSelector?.addEventListener('change', () => {
    const targetDocId = docSelector.value;
    if (!targetDocId) return;
    sessionData.activeDocId = targetDocId;
    suppressFocusReloadUntil = Date.now() + 8000;
    appStorage.set({ sessionData: sessionData }, () => {
      populateActiveDoc();
    });
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

  function saveActiveDocState(onSaved) {
    isSavingLocally = true;
    suppressFocusReloadUntil = Date.now() + 4000;
    if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(() => {
      isSavingLocally = false;
    }, 1500);

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

    // Simpan langsung ke appStorage (Desktop / Local Storage)
    sessionData.activeTcId = doc.activeTcId || sessionData.activeTcId;
    appStorage.set({ sessionData: sessionData }, () => {
      if (window.chrome && window.chrome.runtime && window.chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'STORAGE_UPDATED'
        });
      }
      if (typeof onSaved === 'function') onSaved();
    });
    renderDocSelector();
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
      stepsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <div class="empty-title">Belum ada Test Case</div>
          <div class="empty-desc">Klik tombol di bawah untuk membuat Test Case 1, atau rekam langsung dari floating bar WeDocIt di aplikasi web.</div>
          <button class="btn btn-primary" id="btn-empty-add">➕ Buat Test Case 1</button>
        </div>
      `;
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
                    <img src="${s.screenshot}" class="zoomable-img" />
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
                    <img src="${s.screenshot}" class="zoomable-img" />
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

      const isCollapsed = !!tc.__isCollapsed;
      const isStepsCollapsed = !!tc.__isStepsCollapsed;
      if (isCollapsed) {
        tcCard.classList.add('is-collapsed');
      }

      tcCard.innerHTML = `
        <div class="tc-header-row">
          <div class="tc-badge-wrap">
            <div class="tc-num-badge">
              ${escapeHtml(tc.tcNumberStr || ('TC ' + (tc.tcNumber || (tcIndex + 1))))}
            </div>
            <input type="text" class="tc-title-input" value="${escapeHtml(tc.title || 'Test Case ' + (tcIndex + 1))}" placeholder="Nama Test Case" />
            <span class="tc-steps-pill" style="font-size:10.5px; color:#94a3b8; background:#1e293b; border:1px solid #334155; padding:2px 7px; border-radius:12px; white-space:nowrap; user-select:none;">
              ${steps.length} Langkah
            </span>
            ${tc.role ? `<span class="tc-role-pill" style="font-size:10.5px; color:#38bdf8; background:rgba(2,132,199,0.15); border:1px solid rgba(2,132,199,0.3); padding:2px 7px; border-radius:12px; white-space:nowrap;">👤 ${escapeHtml(tc.role)}</span>` : ''}
            ${(doc.activeTcId === tc.id || (!doc.activeTcId && tcIndex === 0)) ? `<span class="tc-active-pill" style="font-size:10.5px; color:#10b981; background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); padding:2px 7px; border-radius:12px; white-space:nowrap; font-weight:600;" title="Test Case ini merupakan target aktif perekaman di layar">🎯 Target Rekam</span>` : `<button type="button" class="btn btn-outline btn-xs btn-set-active-tc" data-tc-id="${tc.id}" style="font-size:10px; padding:1px 6px; color:#94a3b8; border-color:#475569;" title="Jadikan Test Case ini target rekaman aktif di layar">Jadikan Target</button>`}
          </div>
          <div class="tc-controls">
            <select class="tc-status-select ${(tc.status || 'OK').toLowerCase()}">
              <option value="OK" ${tc.status === 'OK' ? 'selected' : ''}>✅ OK</option>
              <option value="NOK" ${tc.status === 'NOK' ? 'selected' : ''}>❌ NOK</option>
              <option value="Pending" ${tc.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
            </select>
            <button type="button" class="btn btn-outline btn-xs btn-toggle-tc" title="Ciutkan / Bentangkan Test Case ini" style="font-size: 11px; padding: 2px 8px; border-color: #38bdf8; color: #38bdf8; font-weight: 600;">
              ${isCollapsed ? '▶ Bentangkan' : '▼ Ciutkan'}
            </button>
            <button class="btn btn-danger btn-xs btn-del-tc" title="Hapus Test Case ini">🗑 Hapus TC</button>
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
      const toggleTcBtn = tcCard.querySelector('.btn-toggle-tc');
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

      toggleTcBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        tc.__isCollapsed = !tc.__isCollapsed;
        if (tc.__isCollapsed) {
          tcBodyContent.style.display = 'none';
          tcCard.classList.add('is-collapsed');
          toggleTcBtn.textContent = '▶ Bentangkan';
        } else {
          tcBodyContent.style.display = 'block';
          tcCard.classList.remove('is-collapsed');
          toggleTcBtn.textContent = '▼ Ciutkan';
        }
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
  async function generateCurrentDocxBlob() {
    saveActiveDocState();
    const doc = getActiveDoc();
    const meta = doc.metadata || {};
    const tcs = doc.testCases || [];
    const scenarioName = meta.scenarioName || 'Pengujian Alur Modul';
    const devs = meta.developers || [];

    const selectedFormat = exportFormatSelect ? exportFormatSelect.value : 'bni_edv';
    const isUsingTemplate = (selectedFormat === 'bni_edv' || selectedFormat === 'custom');
    let templateBufferToUse = customDocxTemplateBuffer || bundledDocxTemplateBuffer;

    if (isUsingTemplate && !templateBufferToUse) {
      // Coba load bundled template jika belum dimuat
      await loadBundledTemplate();
      templateBufferToUse = customDocxTemplateBuffer || bundledDocxTemplateBuffer;
    }

    if (isUsingTemplate && !templateBufferToUse) {
      showMissingTemplateModal();
      return null;
    }

    // =========================================================================
    // JIKA MEMILIH TEMPLATE RESMI EDV - BNI / CUSTOM TEMPLATE .DOCX
    // =========================================================================
    if (isUsingTemplate && templateBufferToUse && window.JSZip) {
      try {
        const zip = await JSZip.loadAsync(templateBufferToUse);

        const crValue = meta.projectNo || meta.testCaseId || 'CR: Unit Test';
        const projectTypeValue = meta.projectType || 'CR';
        const shortDescValue = meta.shortDescription || '';
        const startDateValue = meta.startDate || new Date().toLocaleDateString('id-ID');
        const endDateValue = meta.endDate || new Date().toLocaleDateString('id-ID');
        const docDateValue = meta.docDate || meta.date || new Date().toLocaleDateString('id-ID');
        const copyrightYearValue = meta.copyrightYear || String(new Date().getFullYear());
        const docTitleValue = meta.title || 'Unit Test Documentation - Pelaksanaan Modul';
        const systemNameValue = meta.systemName || 'Audit Management System (AMS) Aplikasi FAST';
        const acceptanceCriteriaValue = meta.acceptanceCriteria || meta.objective || '';
        const scopeValue = meta.scope || meta.precondition || '';

        // Format Tim Developer
        let devHeaderFormatted = '';
        let devNamesOnly = '';
        let devNppOnly = '';
        if (devs.length > 0) {
          devHeaderFormatted = devs.map(d => `[${d.name || ''}] / ${d.npp || '-'}`).join('\n');
          devNamesOnly = devs.map(d => d.name || '').filter(Boolean).join('\n');
          devNppOnly = devs.map(d => d.npp || '').filter(Boolean).join('\n');
        } else {
          devHeaderFormatted = `[${meta.author || 'Developer'}] / -`;
          devNamesOnly = meta.author || 'EDV Team';
          devNppOnly = '-';
        }

        // Mapping Seluruh Placeholder Resmi
        const placeholderMap = {
          // 1. Header Table (Sesuai Gambar Revisi)
          '[{developer}] / {npp}': devHeaderFormatted,
          '[{developer}]': `[${devNamesOnly}]`,
          '{developer}': devNamesOnly,
          '{npp}': devNppOnly,
          '[{tanggal_mulai}]': startDateValue,
          '{tanggal_mulai}': startDateValue,
          '[{tanggal_selesai}]': endDateValue,
          '{tanggal_selesai}': endDateValue,
          '{cr_unit_test}': crValue,
          '{deskripsi_singkat}': shortDescValue,

          // 2. Cover Screen 1 & Halaman Lainnya
          '{judul_unit_test}': docTitleValue,
          '{nama_aplikasi}': systemNameValue,
          '{tanggal_dokumen}': docDateValue,
          '{tahun}': copyrightYearValue,
          '{bussiness_criteria}': acceptanceCriteriaValue,
          '{scope_unit_test}': scopeValue
        };

        // Helper: Replace placeholder dalam XML dengan aman antar run <w:r>
        const replaceDocxPlaceholders = (xmlStr, replacements) => {
          if (!xmlStr) return xmlStr;
          return xmlStr.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, (pXml) => {
            let fullText = '';
            const textMatches = pXml.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g) || [];
            textMatches.forEach(tTag => {
              const inner = tTag.replace(/^<w:t\b[^>]*>|<\/w:t>$/g, '');
              fullText += inner;
            });

            let modified = false;
            let newText = fullText;
            for (const [key, val] of Object.entries(replacements)) {
              if (newText.includes(key)) {
                // Selalu escape karakter XML (khususnya &) pada nilai pengganti
                newText = newText.split(key).join(escapeXml(val));
                modified = true;
              }
            }

            if (!modified) return pXml;

            const formattedVal = newText.replace(/\n/g, '</w:t><w:br/><w:t>');
            let firstReplaced = false;
            return pXml.replace(/<w:t\b([^>]*)>([\s\S]*?)<\/w:t>/g, (match, attrs) => {
              if (!firstReplaced) {
                firstReplaced = true;
                return `<w:t xml:space="preserve">${formattedVal}</w:t>`;
              } else {
                return `<w:t></w:t>`;
              }
            });
          });
        };

        // Helper: Clone baris tabel Screen 3 (Unit Test Scenario Table)
        const expandTableRowRepeater = (xmlStr, testCases, scName) => {
          if (!xmlStr) return xmlStr;
          return xmlStr.replace(/<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g, (trXml) => {
            if (!trXml.includes('{no}') && !trXml.includes('{test_case}') && !trXml.includes('{ekspektasi}')) {
              return trXml;
            }
            const safeTcs = (testCases && testCases.length > 0) ? testCases : [{
              title: 'Pengujian Alur',
              scenarioName: scName || 'Skenario Pengujian',
              expectedResult: 'Sistem merespons proses dengan benar.',
              status: 'OK'
            }];

            return safeTcs.map((tc, idx) => {
              const tcNumberFormatted = String(idx + 1); // Kolom nomor SELALU berupa nomor urut 1, 2, 3... bukan TC
              const formattedScenario = formatScenarioWithTc(tc, idx, scName); // TC dimasukkan ke kolom Skenario: misal [TC-007] Propose Pendalaman
              const tcTitleWithRole = tc.role ? `${tc.title || `Test Case ${idx + 1}`} (Role: ${tc.role})` : (tc.title || `Test Case ${idx + 1}`);
              const rowMap = {
                '{no}': tcNumberFormatted,
                '{skenario}': formattedScenario,
                '{test_case}': tcTitleWithRole,
                '{ekspektasi}': tc.expectedResult || 'Berhasil',
                '{result}': tc.status || 'OK'
              };
              return replaceDocxPlaceholders(trXml, rowMap);
            }).join('');
          });
        };

        // Helper: Injeksi Screen 5 ({unit_test_process}) beserta evidens screenshot
        const injectUnitTestProcess = async (xmlStr) => {
          if (!xmlStr) return xmlStr;

          // Cek apakah ada paragraph yang memuat tag unit_test_process (tahan pemisahan tag <w:r>)
          let hasUnitTestProcessTag = false;
          const pCheckList = xmlStr.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g) || [];
          for (const p of pCheckList) {
            let pTxt = '';
            const tMatches = p.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g) || [];
            tMatches.forEach(t => pTxt += t.replace(/^<w:t\b[^>]*>|<\/w:t>$/g, ''));
            if (pTxt.includes('unit_test_process')) {
              hasUnitTestProcessTag = true;
              break;
            }
          }

          if (!hasUnitTestProcessTag) return xmlStr;

          let relsXml = '';
          const relsFile = zip.file('word/_rels/document.xml.rels');
          if (relsFile) {
            relsXml = await relsFile.async('text');
          } else {
            relsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
          }

          const ctFile = zip.file('[Content_Types].xml');
          if (ctFile) {
            let contentTypesXml = await ctFile.async('text');
            if (!contentTypesXml.includes('Extension="png"')) {
              contentTypesXml = contentTypesXml.replace('</Types>', '<Default Extension="png" ContentType="image/png"/></Types>');
              zip.file('[Content_Types].xml', contentTypesXml);
            }
          }

          let imgCounter = Date.now() % 10000;
          let generatedXml = '';
          const safeTcs = (tcs && tcs.length > 0) ? tcs : [{
            title: 'Pengujian Alur Modul',
            expectedResult: 'Sistem merespons proses dengan benar.',
            status: 'OK',
            steps: []
          }];

          for (let tcIdx = 0; tcIdx < safeTcs.length; tcIdx++) {
            const tc = safeTcs[tcIdx];
            const tcNum = tc.tcNumberStr || `TC ${tcIdx + 1}`;
            const roleSuffix = tc.role ? ` [Role: ${tc.role}]` : '';

            generatedXml += `
              <w:p>
                <w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
                <w:r>
                  <w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="003366"/></w:rPr>
                  <w:t xml:space="preserve">3.1.${tcIdx + 1} ${escapeXml(tcNum)}: ${escapeXml(tc.title || 'Test Case ' + (tcIdx + 1))}${escapeXml(roleSuffix)}</w:t>
                </w:r>
              </w:p>
            `;

            const steps = tc.steps || [];
            for (let sIdx = 0; sIdx < steps.length; sIdx++) {
              const s = steps[sIdx];
              const sNum = sIdx + 1;
              const stepText = `${sNum}. ${s.actionDescription || s.title || 'Aktivitas ' + sNum}` + (s.inputData && s.inputData !== '-' ? ` (Input: ${s.inputData})` : '');
              const formattedStepText = escapeXml(stepText).replace(/\n/g, '</w:t><w:br/><w:t>');

              generatedXml += `
                <w:p>
                  <w:pPr><w:spacing w:before="100" w:after="60"/></w:pPr>
                  <w:r>
                    <w:rPr><w:sz w:val="21"/></w:rPr>
                    <w:t xml:space="preserve">${formattedStepText}</w:t>
                  </w:r>
                </w:p>
              `;

              if (s.screenshot && s.screenshot.startsWith('data:image')) {
                imgCounter++;
                const imgFileName = `wedocit_evidens_${imgCounter}.png`;
                const relId = `rIdWeDocIt_${imgCounter}`;

                try {
                  const uint8Data = base64ToUint8Array(s.screenshot);
                  zip.file(`word/media/${imgFileName}`, uint8Data);

                  const relEntry = `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imgFileName}"/>`;
                  relsXml = relsXml.replace('</Relationships>', `${relEntry}</Relationships>`);

                  generatedXml += `
                    <w:p>
                      <w:pPr>
                        <w:jc w:val="center"/>
                        <w:spacing w:before="100" w:after="200"/>
                      </w:pPr>
                      <w:r>
                        <w:drawing>
                          <wp:inline distT="0" distB="0" distL="0" distR="0">
                            <wp:extent cx="5400000" cy="3037500"/>
                            <wp:effectExtent l="0" t="0" r="0" b="0"/>
                            <wp:docPr id="${imgCounter}" name="Evidens_${imgCounter}"/>
                            <wp:cNvGraphicFramePr>
                              <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
                            </wp:cNvGraphicFramePr>
                            <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                              <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                                <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                                  <pic:nvPicPr>
                                    <pic:cNvPr id="${imgCounter}" name="Evidens_${imgCounter}"/>
                                    <pic:cNvPicPr/>
                                  </pic:nvPicPr>
                                  <pic:blipFill>
                                    <a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="${relId}"/>
                                    <a:stretch><a:fillRect/></a:stretch>
                                  </pic:blipFill>
                                  <pic:spPr>
                                    <a:xfrm>
                                      <a:off x="0" y="0"/>
                                      <a:ext cx="5400000" cy="3037500"/>
                                    </a:xfrm>
                                    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                                  </pic:spPr>
                                </pic:pic>
                              </a:graphicData>
                            </a:graphic>
                          </wp:inline>
                        </w:drawing>
                      </w:r>
                    </w:p>
                  `;
                } catch (eImg) {
                  console.warn('Failed embedding image in docx:', eImg);
                }
              }
            }
          }

          if (relsFile) {
            zip.file('word/_rels/document.xml.rels', relsXml);
          }

          // Ganti paragraph yang innerText-nya memuat unit_test_process dengan XML yang di-generate
          return xmlStr.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, (pXml) => {
            let pTxt = '';
            const tMatches = pXml.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g) || [];
            tMatches.forEach(t => pTxt += t.replace(/^<w:t\b[^>]*>|<\/w:t>$/g, ''));
            if (pTxt.includes('unit_test_process')) {
              return generatedXml;
            }
            return pXml;
          });
        };

        // 1. Update Seluruh Header & Footer XML
        for (const relativePath of Object.keys(zip.files)) {
          if (/^word\/(header|footer)\d*\.xml$/i.test(relativePath)) {
            const hFile = zip.file(relativePath);
            if (hFile) {
              const hXml = await hFile.async('text');
              const updatedHXml = replaceDocxPlaceholders(hXml, placeholderMap);
              zip.file(relativePath, updatedHXml);
            }
          }
        }

        // 2. Update word/document.xml (Cover, Body, Header Table, Screen 3 Table, Screen 5 Evidens)
        const docFile = zip.file('word/document.xml');
        if (docFile) {
          let docXml = await docFile.async('text');
          docXml = replaceDocxPlaceholders(docXml, placeholderMap);
          docXml = expandTableRowRepeater(docXml, tcs, scenarioName);
          docXml = await injectUnitTestProcess(docXml);
          zip.file('word/document.xml', docXml);
        }

        // 3. Return Blob Dokumen .docx
        const newDocxBlob = await zip.generateAsync({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        return {
          blob: newDocxBlob,
          filename: getFormattedDocFilename('docx'),
          isDocx: true
        };
      } catch (err) {
        console.error('Error modifying docx template:', err);
        alert('Gagal memproses file template .docx. Beralih ke ekspor format umum.');
      }
    }

    // =========================================================================
    // FORMAT UMUM / STANDAR WEDOCIT (HTML WORD DOCUMENT LENGKAP 5 HALAMAN)
    // =========================================================================
    let tableRowsHtml = '';
    const totalTcs = tcs.length || 1;
    const hasDistinctScenarios = tcs.some(t => t.scenarioName && t.scenarioName !== scenarioName);

    tcs.forEach((tc, idx) => {
      const statusColor = (tc.status === 'OK' || tc.status === 'Pass') ? '#047857' : ((tc.status === 'NOK' || tc.status === 'Fail') ? '#b91c1c' : '#b45309');
      const rowScenario = formatScenarioWithTc(tc, idx, scenarioName);
      
      tableRowsHtml += `
        <tr style="page-break-inside: avoid;">
          <td style="border: 1px solid #777; padding: 6px 8px; text-align: center; vertical-align: top; width: 5%;">
            ${idx + 1}
          </td>
          ${!hasDistinctScenarios ? (idx === 0 ? `
            <td rowspan="${totalTcs}" style="border: 1px solid #777; padding: 6px 8px; vertical-align: top; width: 30%; font-weight: bold;">
              ${escapeHtml(formatScenarioWithTc(tc, idx, scenarioName))}
            </td>
          ` : '') : `
            <td style="border: 1px solid #777; padding: 6px 8px; vertical-align: top; width: 30%; font-weight: 500;">
              ${escapeHtml(rowScenario)}
            </td>
          `}
          <td style="border: 1px solid #777; padding: 6px 8px; vertical-align: top; width: 25%;">
            <b>${escapeHtml(tc.title || 'TC ' + (idx + 1))}</b>${tc.role ? `<div style="font-size: 8.5pt; color: #4b5563; margin-top: 3px;">👤 Role: <i>${escapeHtml(tc.role)}</i></div>` : ''}
          </td>
          <td style="border: 1px solid #777; padding: 6px 8px; vertical-align: top; width: 30%;">
            ${escapeHtml(tc.expectedResult || '')}
          </td>
          <td style="border: 1px solid #777; padding: 6px 8px; text-align: center; vertical-align: top; width: 10%; font-weight: bold; color: ${statusColor};">
            ${tc.status || 'OK'}
          </td>
        </tr>
      `;
    });

    let evidenceSectionsHtml = '';
    tcs.forEach((tc, idx) => {
      const steps = tc.steps || [];
      let tcStepsHtml = '';
      
      steps.forEach((s, sIdx) => {
        tcStepsHtml += `
          <div style="margin-top: 12px; margin-bottom: 16px; page-break-inside: avoid;">
            <p style="font-size: 11pt; color: #000; margin: 0 0 6px 0; line-height: 1.4;">
              <b>${sIdx + 1}.</b> ${escapeHtml(s.actionDescription || s.title || '')}
              ${s.inputData && s.inputData !== '-' ? ' (Input: <i>' + escapeHtml(s.inputData) + '</i>)' : ''}
            </p>
            ${s.screenshot ? `
              <table style="border: none; width: 100%; margin: 6px 0 12px 0;">
                <tr>
                  <td align="center" style="border: none; padding: 0;">
                    <img src="${s.screenshot}" width="540" style="width: 540px; max-width: 100%; height: auto; border: 1px solid #777;" />
                  </td>
                </tr>
              </table>
            ` : ''}
          </div>
        `;
      });

      evidenceSectionsHtml += `
        <div style="margin-top: 24px; margin-bottom: 24px; page-break-inside: avoid;">
          <h3 style="font-size: 12pt; color: #003366; margin: 0 0 8px 0; font-weight: bold;">
            ${escapeHtml(tc.tcNumberStr || ('TC ' + (idx + 1)))}: ${escapeHtml(tc.title || 'Test Case ' + (idx + 1))}${tc.role ? ' (Role: ' + escapeHtml(tc.role) + ')' : ''}
          </h3>
          ${tcStepsHtml || '<p style="color:#666; font-style:italic; font-size:10pt;">(Belum ada langkah/evidens untuk Test Case ini)</p>'}
        </div>
      `;
    });

    let customMetaRows = '';
    (meta.customFields || []).forEach(cf => {
      customMetaRows += `
        <tr>
          <td class="meta-label">${escapeHtml(cf.label)}</td>
          <td colspan="3">${escapeHtml(cf.value)}</td>
        </tr>
      `;
    });

    const devHeaderString = devs.map(d => `${d.name} (${d.npp || '-'})`).join(', ');

    const docContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${escapeHtml(meta.title)}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page {
            size: A4 portrait;
            margin: 1.27cm 2.54cm 1.27cm 2.54cm;
            mso-page-orientation: portrait;
          }
          body {
            font-family: 'Arial', sans-serif;
            font-size: 11pt;
            color: #000;
            line-height: 1.35;
          }
          .doc-header {
            text-align: center;
            border-bottom: 2px solid #003366;
            padding-bottom: 12px;
            margin-bottom: 18px;
          }
          h1 {
            font-size: 16pt;
            color: #003366;
            margin: 0 0 4px 0;
            font-weight: bold;
          }
          .doc-subtitle {
            font-size: 11pt;
            color: #333;
            margin: 0;
          }
          h2 {
            font-size: 13pt;
            color: #003366;
            border-bottom: 1.5px solid #003366;
            padding-bottom: 4px;
            margin-top: 24px;
            margin-bottom: 10px;
            font-weight: bold;
          }
          table.main-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            margin-bottom: 20px;
          }
          table.main-table th {
            background-color: #93CDDC;
            color: #000000;
            border: 1px solid #777;
            padding: 6px 8px;
            font-size: 10pt;
            font-weight: bold;
            text-align: center;
          }
          .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
            margin-bottom: 16px;
          }
          .meta-table td {
            padding: 6px 10px;
            border: 1px solid #777;
            font-size: 10pt;
          }
          .meta-label {
            width: 160px;
            font-weight: bold;
            background-color: #f2f2f2;
          }
          .sign-box {
            margin-top: 36px;
            page-break-inside: avoid;
          }
        </style>
      </head>
      <body>
        <div class="doc-header">
          <h1>${escapeHtml(meta.title)}</h1>
          <p class="doc-subtitle">${escapeHtml(meta.systemName)} | ${escapeHtml(meta.testCaseId)}</p>
          <p style="font-size: 9.5pt; color: #555; margin: 4px 0 0 0;">${escapeHtml(devHeaderString || meta.author)} | Tanggal: ${escapeHtml(meta.docDate || meta.date)}</p>
        </div>

        <!-- Header Table Sesuai Format Revisi BNI EDV -->
        <table class="meta-table" style="margin-bottom: 20px;">
          <tr>
            <td class="meta-label" style="width: 18%;">Project No</td>
            <td style="width: 32%; font-weight: bold;">${escapeHtml(meta.projectNo || meta.testCaseId || '-')}</td>
            <td class="meta-label" style="width: 18%;">Developer</td>
            <td style="width: 32%;">${escapeHtml(devHeaderString || meta.author)}</td>
          </tr>
          <tr>
            <td class="meta-label">Project Type</td>
            <td><b>${escapeHtml(meta.projectType || 'CR')}</b></td>
            <td class="meta-label">Start Date</td>
            <td>[${escapeHtml(meta.startDate || '-')}]</td>
          </tr>
          <tr>
            <td class="meta-label">Short Description</td>
            <td>${escapeHtml(meta.shortDescription || '-')}</td>
            <td class="meta-label">End Date</td>
            <td>[${escapeHtml(meta.endDate || '-')}]</td>
          </tr>
        </table>

        <h2>1. Business Requirements & Scope</h2>
        <h3 style="font-size: 11pt; color: #003366; margin-top: 14px; margin-bottom: 6px;">1.1 Business Acceptance Criteria</h3>
        <p style="font-size: 10.5pt; color: #222; margin-bottom: 12px; line-height: 1.4;">
          ${escapeHtml(meta.acceptanceCriteria || meta.objective || '-').replace(/\n/g, '<br>')}
        </p>

        <h3 style="font-size: 11pt; color: #003366; margin-top: 14px; margin-bottom: 6px;">1.2 Scope</h3>
        <p style="font-size: 10.5pt; color: #222; margin-bottom: 16px; line-height: 1.4;">
          ${escapeHtml(meta.scope || meta.precondition || '-').replace(/\n/g, '<br>')}
        </p>

        <h2>B. Unit Test Summary (Tabel Skenario & Test Case)</h2>
        <table class="main-table">
          <thead>
            <tr>
              <th style="width: 5%;">No</th>
              <th style="width: 35%;">Scenario</th>
              <th style="width: 25%;">Test Case</th>
              <th style="width: 25%;">Expected Result</th>
              <th style="width: 10%;">Result</th>
            </tr>
            <tr>
              <th style="width: 5%;">No</th>
              <th style="width: 35%;">Skenario</th>
              <th style="width: 25%;">Detail Skenario / Aktivitas</th>
              <th style="width: 25%;">Hasil yang Diharapkan</th>
              <th style="width: 10%;">OK</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <h2>C. Unit Test Process - Evidence (Tangkapan Layar)</h2>
        <p style="font-size: 10.5pt; color: #444; margin-bottom: 14px;">Berikut adalah rincian aktivitas dan tangkapan layar evidens untuk Skenario <b>${escapeHtml(scenarioName)}</b>:</p>
        ${evidenceSectionsHtml}

        <div class="sign-box">
          <h2>D. Persetujuan & Sign-Off</h2>
          <table style="border: none; width: 100%; margin-top: 20px;">
            <tr>
              <td style="text-align: center; border: none; width: 50%;">
                <p>Prepared by (EDV / Tester):</p>
                <br><br><br><br>
                <p><b>( ${escapeHtml(devHeaderString || meta.author || '........................................')} )</b></p>
              </td>
              <td style="text-align: center; border: none; width: 50%;">
                <p>Reviewed & Approved by (Lead / PKA):</p>
                <br><br><br><br>
                <p><b>( .................................................... )</b></p>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + docContent], { type: 'application/msword' });
    return {
      blob,
      filename: getFormattedDocFilename('doc'),
      isDocx: false
    };
  }

  // Helper konversi Blob ke Base64
  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result ? reader.result.split(',')[1] : '';
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

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

  btnFileMenu?.addEventListener('click', (e) => {
    e.stopPropagation();
    fileMenuDropdown?.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown-wrapper')) {
      fileMenuDropdown?.classList.remove('show');
    }
  });

  fileMenuDropdown?.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
      fileMenuDropdown?.classList.remove('show');
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

  function escapeHtml(text) {
    if (!text) return '';
    return text.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeXml(text) {
    if (text === undefined || text === null) return '';
    return text.toString()
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function base64ToUint8Array(base64) {
    if (!base64) return new Uint8Array(0);
    const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '').replace(/\s+/g, '');
    const binaryString = atob(cleanBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

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

  let runnerPollInterval = null;

  async function checkLatestResultsAvailability() {
    try {
      const resp = await fetch('/api/latest-results');
      if (resp.ok && btnSyncTestResults) {
        btnSyncTestResults.style.display = 'inline-block';
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

          data.specs.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.path;
            opt.textContent = s.label;
            if (isOrms && s.path.includes('orms')) {
              opt.selected = true;
            } else if (!isOrms && currentVal === s.path) {
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

  btnSyncTestResults?.addEventListener('click', async () => {
    try {
      const resp = await fetch('/api/latest-results');
      if (!resp.ok) {
        alert('Tidak ditemukan data hasil run pengujian (latest_run_results.json). Silakan jalankan otomasi terlebih dahulu.');
        return;
      }
      const data = await resp.json();
      if (!data.testCases || data.testCases.length === 0) {
        alert('Data hasil pengujian kosong.');
        return;
      }

      const activeDoc = getActiveDoc();
      const currentCount = (activeDoc.testCases || []).length;
      const confirmMsg = `Ditemukan ${data.testCases.length} Test Case dari otomasi Playwright.\n\nApakah Anda ingin mengganti/memperbarui daftar Test Case pada dokumen aktif (${activeDoc.metadata?.scenarioName || 'Dokumen Aktif'}) dengan hasil otomasi ini?`;
      if (!confirm(confirmMsg)) return;

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
      renderDocSelector();
      closeRunnerModal();
      alert(`🎉 Berhasil menyinkronkan ${activeDoc.testCases.length} Test Case ke Dokumen Studio!`);
    } catch (err) {
      alert(`Gagal menyinkronkan hasil pengujian: ${err.message}`);
    }
  });

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
                runnerResultSummary.innerHTML = `🎉 <b style="color:#10b981;">Pengujian Sukses!</b> Dokumen Word EDV ter-generate.`;
              }
              if (stData.lastOutputFile && btnRunnerExportPdf) {
                btnRunnerExportPdf.style.display = 'inline-block';
                btnRunnerExportPdf.dataset.docx = stData.lastOutputFile;
              }
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
    const testerName = meta.testedBy || 'Irvan Ramadan';
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
});