// WeDocIt - Background Service Worker (Multi-Document & Multi-TC Architecture)
chrome.runtime.onInstalled.addListener(() => {
  initStorage();
});

function createDefaultDoc(scenarioName, crNumber, userProfile) {
  const docId = 'doc_' + Date.now();
  const tcId = 'tc_' + Date.now();
  
  let authorStr = "Prepared by EDV Team";
  let precondStr = "1. User telah login ke aplikasi New AMS FAST menggunakan role yang memiliki akses ke modul terkait.\n2. Browser: Google Chrome / Microsoft Edge.";
  let customTags = [];

  if (userProfile && (userProfile.nama || userProfile.npp)) {
    authorStr = userProfile.formattedAuthor || `${userProfile.nama} (${userProfile.npp}) - ${userProfile.primaryRole || ''}`.trim();
    precondStr = `1. User telah login ke aplikasi New AMS FAST menggunakan role yang memiliki hak akses modul ini:\n   - Nama / NPP  : ${userProfile.nama} (${userProfile.npp})\n   - Role        : ${userProfile.allRoles || userProfile.primaryRole || '-'}\n   - Unit/Divisi : ${userProfile.divisionName || '-'}\n2. Browser: Google Chrome / Microsoft Edge.`;
    customTags = [
      { key: "Penguji (NPP)", value: `${userProfile.nama} (${userProfile.npp})` },
      { key: "Role Penguji", value: userProfile.allRoles || userProfile.primaryRole || "" },
      { key: "Divisi", value: userProfile.divisionName || "DIVISI INTERNAL AUDIT" }
    ];
  }
  return {
    id: docId,
    createdAt: new Date().toISOString(),
    metadata: {
      templateType: "BNI_EDV",
      scenarioName: scenarioName || "Pengujian Modul AMS FAST",
      title: "Unit Test Documentation - AMS FAST",
      systemName: "AMS FAST (Audit Management System)",
      testCaseId: crNumber || ("CR: " + Math.floor(10000 + Math.random() * 90000) + " - Unit Test"),
      author: authorStr,
      date: new Date().toLocaleDateString('id-ID'),
      environment: "Development / SIT",
      screenResolution: "1366x768",
      objective: "Requirement pengembangan pada CR ini adalah perbaikan temuan PTR prioritas AMS FAST - Aplikasi New AMS FAST Fase 3 dan 4.",
      precondition: "1. User telah login ke aplikasi New AMS FAST menggunakan role yang sesuai.\n2. Penyesuaian Connection String API Backend pada environment.ts telah sesuai.",
      customFields: [
        { label: "Nomor CR / Defect", value: crNumber || "CR: 52419" },
        { label: "Aplikasi", value: "New AMS FAST Fase 3 & 4" },
        { label: "Scope Pengujian", value: "Perbaikan fitur RAP, RAT, dan Dokumen Persuratan" }
      ]
    },
    activeTcId: tcId,
    testCases: [
      {
        id: tcId,
        tcNumber: 1,
        title: "Test Case 1",
        expectedResult: "Sistem merespons proses dengan benar dan berhasil.",
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
      const defaultDoc = createDefaultDoc("Pengujian Modul AMS FAST", "CR: Unit Test");
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
        if (message.scenarioName) activeDoc.metadata.scenarioName = message.scenarioName;
        if (message.crNumber) activeDoc.metadata.testCaseId = message.crNumber;
        if (message.userProfile && (message.userProfile.nama || message.userProfile.npp)) {
          const u = message.userProfile;
          activeDoc.metadata.author = u.formattedAuthor || `${u.nama} (${u.npp}) - ${u.primaryRole || ''}`.trim();
          activeDoc.metadata.precondition = `1. User telah login ke aplikasi New AMS FAST menggunakan role yang memiliki hak akses modul ini:\n   - Nama / NPP  : ${u.nama} (${u.npp})\n   - Role        : ${u.allRoles || u.primaryRole || '-'}\n   - Unit/Divisi : ${u.divisionName || '-'}\n2. Browser: Google Chrome / Microsoft Edge.`;
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
      const newDoc = createDefaultDoc(message.scenarioName, message.crNumber, message.userProfile);
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
        docs = [createDefaultDoc()];
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
      const newTc = {
        id: 'tc_' + Date.now(),
        tcNumber: nextNum,
        title: 'Test Case ' + nextNum,
        expectedResult: 'Sistem merespons proses dengan benar dan berhasil.',
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
        sendResponse({ success: true, activeTcId: message.tcId });
      });
    });
    return true;
  }

  // RESET ACTIVE DOC / RESET ALL
  if (message.type === 'RESET_ACTIVE_DOC' || message.type === 'RESET_ALL') {
    chrome.storage.local.get(['sessionData'], (res) => {
      const current = res.sessionData || {};
      const activeDoc = getActiveDoc(current);
      const defaultTc = {
        id: "tc_" + Date.now(),
        tcNumber: 1,
        title: "Test Case 1",
        expectedResult: "Sistem merespons proses dengan benar dan berhasil.",
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

  // ADD STEP TO ACTIVE TC IN ACTIVE DOC
  if (message.type === 'ADD_STEP') {
    chrome.storage.local.get(['sessionData'], (res) => {
      const current = res.sessionData || {};
      const activeDoc = getActiveDoc(current);
      let tcs = activeDoc.testCases || [];
      if (tcs.length === 0) {
        tcs = [{
          id: "tc_1",
          tcNumber: 1,
          title: "Test Case 1",
          expectedResult: "Sistem merespons proses dengan benar dan berhasil.",
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
        activeTc = {
          id: "tc_1",
          tcNumber: 1,
          title: "Test Case 1",
          expectedResult: "Sistem merespons proses dengan benar dan berhasil.",
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
          title: 'Tangkapan Layar Halaman',
          actionDescription: 'Tampilan halaman saat ini (' + (message.pageTitle || 'Web Page') + ')',
          inputData: '-',
          expectedResult: 'Tampilan halaman sesuai dengan rancangan.',
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
        chrome.tabs.update(tabs[0].id, { active: true });
        chrome.windows.update(tabs[0].windowId, { focused: true });
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