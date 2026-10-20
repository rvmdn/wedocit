// WeDocIt - Background Service Worker (Multi-Document & Multi-TC Architecture)
chrome.runtime.onInstalled.addListener(() => {
  initStorage();
});

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

function createDefaultDoc(scenarioName, crNumber, userProfile, docTitle) {
  const docId = 'doc_' + Date.now();
  const tcId = 'tc_' + Date.now();
  
  let authorStr = "Prepared by EDV Team";
  let precondStr = "1. User telah login ke aplikasi web menggunakan role yang memiliki akses ke modul terkait.\n2. Browser: Google Chrome / Microsoft Edge.";
  let customTags = [];

  let defaultDevs = [];
  if (userProfile && (userProfile.nama || userProfile.npp)) {
    authorStr = userProfile.formattedAuthor || `${userProfile.nama} (${userProfile.npp}) - ${userProfile.primaryRole || ''}`.trim();
    precondStr = `1. User telah login ke aplikasi web menggunakan role yang memiliki hak akses modul ini:\n   - Nama / NPP  : ${userProfile.nama} (${userProfile.npp})\n   - Role        : ${userProfile.allRoles || userProfile.primaryRole || '-'}\n   - Unit/Divisi : ${userProfile.divisionName || '-'}\n2. Browser: Google Chrome / Microsoft Edge.`;
    customTags = [
      { key: "Penguji (NPP)", value: `${userProfile.nama} (${userProfile.npp})` },
      { key: "Role Penguji", value: userProfile.allRoles || userProfile.primaryRole || "" },
      { key: "Divisi", value: userProfile.divisionName || "IT Development" }
    ];
    defaultDevs.push({
      name: userProfile.nama || "",
      npp: userProfile.npp || ""
    });
  }

  const today = new Date();
  const formattedToday = today.toLocaleDateString('id-ID');
  const currentYear = String(today.getFullYear());
  const finalDocTitle = docTitle || ("Unit Test Documentation - " + (scenarioName || "Unit Test"));

  return {
    id: docId,
    createdAt: today.toISOString(),
    metadata: {
      templateType: "BNI_EDV",
      scenarioName: scenarioName || "Pengujian Alur Modul",
      title: finalDocTitle,
      systemName: "Sistem Informasi / Web Application",
      testCaseId: crNumber || ("CR: " + Math.floor(10000 + Math.random() * 90000)),
      projectNo: crNumber ? crNumber.replace(/[^0-9]/g, '') : "",
      projectType: "CR",
      shortDescription: scenarioName ? ("Pengujian dan verifikasi fitur " + scenarioName) : "Pengujian dan verifikasi modul aplikasi",
      developers: defaultDevs,
      startDate: formattedToday,
      endDate: formattedToday,
      docDate: formattedToday,
      copyrightYear: currentYear,
      author: authorStr,
      date: formattedToday,
      environment: "Development / SIT",
      screenResolution: "1366x768",
      objective: "Requirement pengembangan pada modul ini adalah verifikasi alur proses pengujian fitur terkait.",
      precondition: precondStr,
      customFields: customTags.length > 0 ? customTags.map(t => ({ label: t.key, value: t.value })) : [
        { label: "Tipe Pengujian", value: "Unit Test" },
        { label: "Scope Pengujian", value: scenarioName || "Unit Testing" }
      ]
    },
    activeTcId: tcId,
    testCases: [
      {
        id: tcId,
        tcNumber: 1,
        title: getContextualTcDetails(1).title,
        scenarioName: "Skenario 1: " + (scenarioName || "Pengujian Alur Modul"),
        expectedResult: getContextualTcDetails(1).expectedResult,
        status: "OK",
        steps: []
      }
    ]
  };
}

function initStorage() {
  chrome.storage.local.get(['sessionData'], (res) => {
    let data = res.sessionData;
    if (!data || !data.documents || data.documents.length === 0) {
      const defaultDoc = createDefaultDoc("Pengujian Alur Modul", "CR: Unit Test");
      data = {
        isRecording: false,
        isPaused: false,
        autoScreenshot: true,
        autoHighlight: true,
        activeDocId: defaultDoc.id,
        documents: [defaultDoc]
      };
            // Normalize default resolution to standard 1366x768
      (data.documents || []).forEach(d => {
        if (!d.metadata) d.metadata = {};
        if (!d.metadata.screenResolution || d.metadata.screenResolution === '1707x1067' || d.metadata.screenResolution === '1280x1024') {
          d.metadata.screenResolution = '1366x768';
        }
      });
      chrome.storage.local.set({ sessionData: data });
    }
  });
}

function getActiveDoc(sessionData) {
  if (!sessionData.documents || sessionData.documents.length === 0) {
    const newDoc = createDefaultDoc();
    sessionData.documents = [newDoc];
    sessionData.activeDocId = newDoc.id;
  }
  let doc = sessionData.documents.find(d => d.id === sessionData.activeDocId);
  if (!doc) {
    doc = sessionData.documents[0];
    sessionData.activeDocId = doc.id;
  }
  return doc;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CAPTURE_SCREENSHOT') {
    chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 65 }, (dataUrl) => {
      if (chrome.runtime.lastError || !dataUrl) {
        sendResponse({ success: false, error: chrome.runtime.lastError?.message || 'Gagal capture' });
      } else {
        sendResponse({ success: true, dataUrl: dataUrl });
      }
    });
    return true;
  }

  if (message.type === 'GET_STATE') {
    chrome.storage.local.get(['sessionData'], (res) => {
      let data = res.sessionData;
      if (!data || !data.documents) {
        initStorage();
        data = res.sessionData || {};
      }
      if (message.full) {
        sendResponse({ success: true, data: data });
      } else {
        sendResponse({ success: true, data: getLightState(data) });
      }
    });
    return true;
  }

  // RENAME ACTIVE DOC SCENARIO (FROM UI SCAN)
  if (message.type === 'RENAME_ACTIVE_DOC_SCENARIO') {
    chrome.storage.local.get(['sessionData'], (res) => {
      const current = res.sessionData || {};
      const activeDoc = getActiveDoc(current);
      if (activeDoc) {
        if (!activeDoc.metadata) activeDoc.metadata = {};
        if (message.docTitle) activeDoc.metadata.title = message.docTitle;
        if (message.scenarioName) activeDoc.metadata.scenarioName = message.scenarioName;
        if (message.crNumber) activeDoc.metadata.testCaseId = message.crNumber;
        if (message.userProfile && (message.userProfile.nama || message.userProfile.npp)) {
          const u = message.userProfile;
          activeDoc.metadata.author = u.formattedAuthor || `${u.nama} (${u.npp}) - ${u.primaryRole || ''}`.trim();
          activeDoc.metadata.precondition = `1. User telah login ke aplikasi web menggunakan role yang memiliki hak akses modul ini:\n   - Nama / NPP  : ${u.nama} (${u.npp})\n   - Role        : ${u.allRoles || u.primaryRole || '-'}\n   - Unit/Divisi : ${u.divisionName || '-'}\n2. Browser: Google Chrome / Microsoft Edge.`;
          if (!activeDoc.metadata.customFields) activeDoc.metadata.customFields = [];
          if (!activeDoc.metadata.customFields.some(f => f.key === 'Penguji (NPP)')) {
            activeDoc.metadata.customFields.push({ key: "Penguji (NPP)", value: `${u.nama} (${u.npp})` });
            activeDoc.metadata.customFields.push({ key: "Role Penguji", value: u.allRoles || u.primaryRole || "" });
          }
        }
        chrome.storage.local.set({ sessionData: current }, () => {
          broadcastState(current);
          sendResponse({ success: true, sessionData: current });
        });
      } else {
        sendResponse({ success: false });
      }
    });
    return true;
  }

  // CREATE A BRAND NEW UNIT TEST DOCUMENT
  if (message.type === 'CREATE_NEW_DOC') {
    chrome.storage.local.get(['sessionData'], (res) => {
      const current = res.sessionData || { documents: [] };
      const newDoc = createDefaultDoc(message.scenarioName, message.crNumber, message.userProfile, message.docTitle);
      if (!current.documents) current.documents = [];
      current.documents.push(newDoc);
      current.activeDocId = newDoc.id;
      current.isRecording = false;
      current.isPaused = false;
      chrome.storage.local.set({ sessionData: current }, () => {
        broadcastState(current);
        sendResponse({ success: true, newDoc: newDoc, sessionData: current });
      });
    });
    return true;
  }

  // SWITCH ACTIVE DOCUMENT
  if (message.type === 'SWITCH_ACTIVE_DOC') {
    chrome.storage.local.get(['sessionData'], (res) => {
      const current = res.sessionData || {};
      current.activeDocId = message.docId;
      chrome.storage.local.set({ sessionData: current }, () => {
        broadcastState(current);
        sendResponse({ success: true, sessionData: current });
      });
    });
    return true;
  }

  // DELETE DOCUMENT
  if (message.type === 'DELETE_DOC') {
    chrome.storage.local.get(['sessionData'], (res) => {
      const current = res.sessionData || {};
      let docs = current.documents || [];
      docs = docs.filter(d => d.id !== message.docId);
      if (docs.length === 0) {
        docs = [createDefaultDoc("Pengujian Modul", "CR: Unit Test")];
      }
      current.documents = docs;
      current.activeDocId = docs[0].id;
      chrome.storage.local.set({ sessionData: current }, () => {
        broadcastState(current);
        sendResponse({ success: true, sessionData: current });
      });
    });
    return true;
  }

  // UPDATE STATE
  if (message.type === 'UPDATE_STATE') {
    chrome.storage.local.get(['sessionData'], (res) => {
      const current = res.sessionData || {};
      const updated = { ...current, ...message.payload };
      chrome.storage.local.set({ sessionData: updated }, () => {
        broadcastState(updated);
        sendResponse({ success: true, sessionData: updated });
      });
    });
    return true;
  }

  // CREATE NEXT TC IN ACTIVE DOC
  if (message.type === 'CREATE_NEXT_TC') {
    chrome.storage.local.get(['sessionData'], (res) => {
      const current = res.sessionData || {};
      const activeDoc = getActiveDoc(current);
      const tcs = activeDoc.testCases || [];
      const nextNum = tcs.length + 1;
      const tcMeta = getContextualTcDetails(nextNum);

      // Perbarui Judul Dokumen Unit Test jika dikirim
      if (message.docTitle && activeDoc.metadata) {
        activeDoc.metadata.title = message.docTitle;
      }

      let customScenario = message.scenarioName || `Skenario ${nextNum}`;
      if (!/^Skenario\s*\d+/i.test(customScenario)) {
        customScenario = `Skenario ${nextNum}: ${customScenario}`;
      }

      const customTitle = message.title || `Melakukan ${customScenario.replace(/^Skenario\s*\d*[:.-]?\s*/i, '')}`;
      const customExpected = message.expectedResult || tcMeta.expectedResult;

      const newTc = {
        id: 'tc_' + Date.now(),
        tcNumber: nextNum,
        title: customTitle,
        scenarioName: customScenario,
        expectedResult: customExpected,
        status: 'OK',
        steps: []
      };
      tcs.push(newTc);
      activeDoc.testCases = tcs;
      activeDoc.activeTcId = newTc.id;
      current.isRecording = true;
      current.isPaused = false;
      chrome.storage.local.set({ sessionData: current }, () => {
        broadcastState(current);
        sendResponse({ success: true, newTc: newTc, sessionData: current });
      });
    });
    return true;
  }

  // SWITCH ACTIVE TC IN ACTIVE DOC
  if (message.type === 'SWITCH_ACTIVE_TC') {
    chrome.storage.local.get(['sessionData'], (res) => {
      const current = res.sessionData || {};
      const activeDoc = getActiveDoc(current);
      activeDoc.activeTcId = message.tcId;
      chrome.storage.local.set({ sessionData: current }, () => {
        broadcastState(current);
        sendResponse({ success: true, activeTcId: message.tcId, sessionData: current });
      });
    });
    return true;
  }

  // RESET ACTIVE DOC
  if (message.type === 'RESET_ACTIVE_DOC') {
    chrome.storage.local.get(['sessionData'], (res) => {
      const current = res.sessionData || {};
      const activeDoc = getActiveDoc(current);
      const initTc = getContextualTcDetails(1);
      const defaultTc = {
        id: "tc_" + Date.now(),
        tcNumber: 1,
        title: initTc.title,
        expectedResult: initTc.expectedResult,
        status: "OK",
        steps: []
      };
      activeDoc.testCases = [defaultTc];
      activeDoc.activeTcId = defaultTc.id;
      current.isRecording = false;
      current.isPaused = false;
      chrome.storage.local.set({ sessionData: current }, () => {
        broadcastState(current);
        sendResponse({ success: true, sessionData: current });
      });
    });
    return true;
  }

  // RESET ALL DOCUMENTS / CLEAR STORAGE
  if (message.type === 'RESET_ALL_DOCUMENTS' || message.type === 'RESET_ALL' || message.type === 'CLEAR_STORAGE') {
    const freshDoc = createDefaultDoc("Pengujian Modul", "CR: Unit Test");
    const freshData = {
      isRecording: false,
      isPaused: false,
      autoScreenshot: true,
      autoHighlight: true,
      activeDocId: freshDoc.id,
      documents: [freshDoc]
    };
    chrome.storage.local.set({ sessionData: freshData }, () => {
      broadcastState(freshData);
      sendResponse({ success: true, sessionData: freshData });
    });
    return true;
  }

  // ADD STEP TO ACTIVE TC IN ACTIVE DOC
  if (message.type === 'ADD_STEP') {
    chrome.storage.local.get(['sessionData'], (res) => {
      const current = res.sessionData || {};
      const activeDoc = getActiveDoc(current);
      let tcs = activeDoc.testCases || [];
      if (tcs.length === 0) {
        const initTc = getContextualTcDetails(1);
        tcs = [{
          id: "tc_1",
          tcNumber: 1,
          title: initTc.title,
          expectedResult: initTc.expectedResult,
          status: "OK",
          steps: []
        }];
        activeDoc.testCases = tcs;
        activeDoc.activeTcId = "tc_1";
      }

      let activeTc = tcs.find(t => t.id === activeDoc.activeTcId) || tcs[0];
      const newStep = {
        id: 'step_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        stepNumber: (activeTc.steps || []).length + 1,
        timestamp: new Date().toLocaleTimeString('id-ID'),
        ...message.step
      };
      if (!activeTc.steps) activeTc.steps = [];
      activeTc.steps.push(newStep);

      chrome.storage.local.set({ sessionData: current }, () => {
        broadcastState(current);
        sendResponse({ success: true, step: newStep, activeTc: activeTc });
      });
    });
    return true;
  }

  // ATTACH SCREENSHOT TO ACTIVE TC
  if (message.type === 'ATTACH_SCREENSHOT_LAST_STEP') {
    chrome.storage.local.get(['sessionData'], (res) => {
      const current = res.sessionData || {};
      const activeDoc = getActiveDoc(current);
      const tcs = activeDoc.testCases || [];
      let activeTc = tcs.find(t => t.id === activeDoc.activeTcId) || tcs[tcs.length - 1];

      if (!activeTc) {
        const initTc = getContextualTcDetails(1);
        activeTc = {
          id: "tc_1",
          tcNumber: 1,
          title: initTc.title,
          expectedResult: initTc.expectedResult,
          status: "OK",
          steps: []
        };
        tcs.push(activeTc);
        activeDoc.testCases = tcs;
        activeDoc.activeTcId = activeTc.id;
      }

      if (activeTc.steps && activeTc.steps.length > 0) {
        activeTc.steps[activeTc.steps.length - 1].screenshot = message.screenshot;
      } else {
        activeTc.steps = [{
          id: 'step_' + Date.now(),
          stepNumber: 1,
          title: 'Verifikasi Antarmuka Halaman',
          actionDescription: 'Pengguna mengakses dan meninjau tampilan halaman (' + (message.pageTitle || 'Web Page') + ').',
          inputData: '-',
          expectedResult: 'Tampilan antarmuka halaman termuat secara lengkap dan komponen aktif.',
          screenshot: message.screenshot
        }];
      }

      chrome.storage.local.set({ sessionData: current }, () => {
        broadcastState(current);
        sendResponse({ success: true, activeTc: activeTc });
      });
    });
    return true;
  }

  if (message.type === 'OPEN_EDITOR') {
    const editorUrl = chrome.runtime.getURL('editor.html');
    chrome.tabs.query({ url: editorUrl }, (tabs) => {
      if (tabs && tabs.length > 0) {
        chrome.tabs.update(tabs[0].id, { active: true }, () => {
          chrome.windows.update(tabs[0].windowId, { focused: true });
          try {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'RELOAD_EDITOR' }, () => {
              if (chrome.runtime.lastError) {
                // Ignore if tab is not listening yet
              }
            });
          } catch (e) {}
        });
      } else {
        chrome.tabs.create({ url: editorUrl });
      }
    });
    sendResponse({ success: true });
    return true;
  }
});

// Helper to strip heavy base64 screenshots for fast IPC transmission (< 1KB vs 20MB)
function getLightState(sessionData) {
  if (!sessionData) return {};
  return {
    isRecording: !!sessionData.isRecording,
    isPaused: !!sessionData.isPaused,
    autoScreenshot: sessionData.autoScreenshot !== false,
    autoHighlight: sessionData.autoHighlight !== false,
    isWidgetClosed: !!sessionData.isWidgetClosed,
    activeDocId: sessionData.activeDocId,
    activeTcId: sessionData.activeTcId,
    documents: (sessionData.documents || []).map(doc => ({
      id: doc.id,
      metadata: {
        scenarioName: doc.metadata?.scenarioName || '',
        testCaseId: doc.metadata?.testCaseId || '',
        author: doc.metadata?.author || ''
      },
      activeTcId: doc.activeTcId,
      testCases: (doc.testCases || []).map(tc => ({
        id: tc.id,
        tcNumber: tc.tcNumber,
        title: tc.title,
        status: tc.status,
        steps: (tc.steps || []).map(s => ({
          id: s.id,
          stepNumber: s.stepNumber,
          title: s.title,
          action: s.action,
          hasScreenshot: !!s.screenshot
        }))
      }))
    }))
  };
}

function broadcastState(sessionData) {
  const lightData = getLightState(sessionData);
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'STATE_CHANGED', sessionData: lightData }).catch(() => {});
      }
    });
  });
}

// GLOBAL KEYBOARD SHORTCUT COMMAND (Ctrl+Shift+S)
if (chrome.commands && chrome.commands.onCommand) {
  chrome.commands.onCommand.addListener((command) => {
    if (command === 'take-screenshot') {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'TRIGGER_MANUAL_SCREENSHOT' }).catch(() => {});
        }
      });
    }
  });
}