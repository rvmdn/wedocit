document.addEventListener('DOMContentLoaded', () => {
  const popDocSelector = document.getElementById('pop-doc-selector');
  const popBtnNewDoc = document.getElementById('pop-btn-new-doc');
  const recStatus = document.getElementById('rec-status');
  const stepCounter = document.getElementById('step-counter');
  const btnToggleRec = document.getElementById('btn-toggle-recording');
  const btnOpenEditor = document.getElementById('btn-open-editor');
  const btnToggleWidget = document.getElementById('btn-toggle-widget');
  const chkAutoShot = document.getElementById('chk-auto-shot');
  const chkAutoHighlight = document.getElementById('chk-auto-highlight');

  // Scanner UI elements
  const detectedMenuNameEl = document.getElementById('detected-menu-name');
  const btnUseMenuNew = document.getElementById('btn-use-menu-new');
  const btnUseMenuSync = document.getElementById('btn-use-menu-sync');
  const scanStatusEl = document.getElementById('scan-status');
  const lblUserName = document.getElementById('lbl-user-name');
  const lblUserRole = document.getElementById('lbl-user-role');

  let activeScannedContext = {
    menuName: 'Halaman Pengujian',
    breadcrumbPath: '',
    scenarioName: 'Pengujian Alur Modul'
  };

  // SCAN ACTIVE TAB UI
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0] && tabs[0].id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'SCAN_PAGE_CONTEXT' }, (res) => {
        try {
          if (chrome.runtime && chrome.runtime.lastError) {
            fallbackScan(tabs[0]);
            return;
          }
        } catch (e) {}
        if (res && res.success && res.data) {
          activeScannedContext = res.data;
          displayScannedContext(res.data);
        } else {
          fallbackScan(tabs[0]);
        }
      });
    }
  });

  function fallbackScan(tab) {
    const title = tab.title ? tab.title.split(/[-–|]/)[0].trim() : 'Halaman Pengujian';
    activeScannedContext = {
      menuName: title,
      breadcrumbPath: '',
      scenarioName: title.startsWith('Pengujian') ? title : ('Pengujian ' + title)
    };
    displayScannedContext(activeScannedContext);
  }

  function displayScannedContext(ctx) {
    if (detectedMenuNameEl) {
      detectedMenuNameEl.textContent = ctx.breadcrumbPath || ctx.menuName || 'Halaman Pengujian';
    }
    if (scanStatusEl) {
      scanStatusEl.textContent = '● Terdeteksi dari Layar';
      scanStatusEl.style.color = '#10b981';
    }
    if (ctx.userProfile) {
      const u = ctx.userProfile;
      if (lblUserName) lblUserName.textContent = `${u.nama || '-'} (${u.npp || '-'})`;
      if (lblUserRole) lblUserRole.textContent = u.primaryRole || (u.roles && u.roles[0]) || '-';
    } else {
      if (lblUserName) lblUserName.textContent = 'Prepared by EDV Team';
      if (lblUserRole) lblUserRole.textContent = 'PKA / Auditor';
    }
  }

  // 1. ACTION: Buat Dokumen Baru dari Menu yang Terdeteksi di Layar
  btnUseMenuNew?.addEventListener('click', () => {
    const defaultTitle = 'Unit Test Documentation - ' + (activeScannedContext.menuName || 'Pelaksanaan Modul');
    const docTitle = prompt(
      'Judul Dokumen Unit Test Baru:',
      defaultTitle
    );
    if (!docTitle) return;
    const cr = prompt('Nomor CR / Defect:', 'CR: Unit Test - ' + (activeScannedContext.menuName || ''));
    chrome.runtime.sendMessage({
      type: 'CREATE_NEW_DOC',
      docTitle: docTitle,
      scenarioName: activeScannedContext.scenarioName || activeScannedContext.menuName || 'Pengujian Alur Modul',
      crNumber: cr || 'CR: Unit Test',
      userProfile: activeScannedContext.userProfile
    }, () => {
      refresh();
      chrome.runtime.sendMessage({ type: 'OPEN_EDITOR' });
    });
  });

  // 2. ACTION: Jadikan Menu Terdeteksi sebagai Judul & Scope Dokumen Aktif
  btnUseMenuSync?.addEventListener('click', () => {
    const defaultTitle = 'Unit Test Documentation - ' + (activeScannedContext.menuName || 'Pelaksanaan Modul');
    const docTitle = prompt(
      'Ubah Judul Dokumen Unit Test Aktif ke Menu Ini:',
      defaultTitle
    );
    if (!docTitle) return;
    chrome.runtime.sendMessage({
      type: 'RENAME_ACTIVE_DOC_SCENARIO',
      docTitle: docTitle,
      scenarioName: activeScannedContext.scenarioName || activeScannedContext.menuName || 'Pengujian Alur Modul',
      crNumber: 'CR: Unit Test - ' + (activeScannedContext.menuName || ''),
      userProfile: activeScannedContext.userProfile
    }, () => {
      refresh();
    });
  });

  function refresh() {
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (res) => {
      if (res && res.data) {
        const d = res.data;

        // Render document dropdown
        if (popDocSelector && d.documents) {
          popDocSelector.innerHTML = '';
          d.documents.forEach(doc => {
            const opt = document.createElement('option');
            opt.value = doc.id;
            const tcCount = (doc.testCases || []).length;
            const docTitleDisplay = doc.metadata?.title || doc.metadata?.scenarioName || 'Dokumen';
            opt.textContent = `${doc.metadata?.testCaseId || 'CR'} - ${docTitleDisplay} (${tcCount} TC)`;
            if (doc.id === d.activeDocId) opt.selected = true;
            popDocSelector.appendChild(opt);
          });
        }

        // Active document steps
        const activeDoc = (d.documents || []).find(doc => doc.id === d.activeDocId) || (d.documents || [])[0];
        let totalSteps = 0;
        if (activeDoc && activeDoc.testCases) {
          activeDoc.testCases.forEach(tc => {
            totalSteps += (tc.steps || []).length;
          });
        }

        if (d.isRecording) {
          recStatus.textContent = d.isPaused ? 'Dijeda (Paused)' : 'Sedang Merekam 🔴';
          recStatus.style.color = d.isPaused ? '#f59e0b' : '#ef4444';
          btnToggleRec.textContent = '⏹ Berhenti & Buka Editor';
          btnToggleRec.className = 'btn btn-secondary';
        } else {
          recStatus.textContent = 'Siap Merekam';
          recStatus.style.color = '#38bdf8';
          btnToggleRec.textContent = '⏺ Mulai Rekam Skenario';
          btnToggleRec.className = 'btn btn-primary';
        }

        stepCounter.textContent = totalSteps + ' Langkah';
        chkAutoShot.checked = d.autoScreenshot !== false;
        chkAutoHighlight.checked = d.autoHighlight !== false;

        if (btnToggleWidget) {
          if (d.isWidgetClosed) {
            btnToggleWidget.textContent = '👁️ Munculkan Tools di Layar';
            btnToggleWidget.style.color = '#38bdf8';
            btnToggleWidget.style.borderColor = '#0284c7';
          } else {
            btnToggleWidget.textContent = '✕ Sembunyikan Tools dari Layar';
            btnToggleWidget.style.color = '#94a3b8';
            btnToggleWidget.style.borderColor = '#334155';
          }
        }
      }
    });
  }

  // Switch document
  popDocSelector?.addEventListener('change', () => {
    chrome.runtime.sendMessage({
      type: 'SWITCH_ACTIVE_DOC',
      docId: popDocSelector.value
    }, () => refresh());
  });

  // Create new document (default prompt with scanned menu)
  popBtnNewDoc?.addEventListener('click', () => {
    const defaultTitle = 'Unit Test Documentation - ' + (activeScannedContext.menuName || 'Modul Aplikasi');
    const docTitle = prompt(
      'Judul Dokumen Unit Test Baru:',
      defaultTitle
    );
    if (!docTitle) return;
    const cr = prompt('Nomor CR / Defect:', 'CR: Unit Test - ' + (activeScannedContext.menuName || ''));
    chrome.runtime.sendMessage({
      type: 'CREATE_NEW_DOC',
      docTitle: docTitle,
      scenarioName: activeScannedContext.scenarioName || activeScannedContext.menuName || 'Pengujian Alur Modul',
      crNumber: cr || 'CR: Unit Test',
      userProfile: activeScannedContext.userProfile
    }, () => {
      refresh();
      chrome.runtime.sendMessage({ type: 'OPEN_EDITOR' });
    });
  });

  
  function dispatchTabWidgetMessage(msgType, toastMsg, onDone) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs && tabs[0];
      if (!activeTab || !activeTab.id) {
        if (onDone) onDone();
        return;
      }

      // Hindari tab browser internal (chrome://, edge://, devtools://)
      if (activeTab.url && (activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('edge://') || activeTab.url.startsWith('chrome-extension://') || activeTab.url.startsWith('devtools://'))) {
        if (onDone) onDone();
        return;
      }

      const payload = {
        type: msgType,
        forceResetPosition: true,
        toast: toastMsg || null
      };

      chrome.tabs.sendMessage(activeTab.id, payload, (response) => {
        if (chrome.runtime.lastError) {
          // Tab belum terinjeksi content.js (ekstensi baru di-reload)
          if (chrome.scripting) {
            chrome.scripting.executeScript({
              target: { tabId: activeTab.id },
              files: ['content.js']
            }).then(() => {
              setTimeout(() => {
                chrome.tabs.sendMessage(activeTab.id, payload).catch(() => {});
                if (onDone) onDone();
              }, 120);
            }).catch(() => {
              if (onDone) onDone();
            });
          } else {
            if (onDone) onDone();
          }
        } else {
          if (onDone) onDone();
        }
      });
    });
  }

  btnToggleRec.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (res) => {
      const isRec = res?.data?.isRecording;
      const willRecord = !isRec;
      chrome.runtime.sendMessage({
        type: 'UPDATE_STATE',
        payload: {
          isRecording: willRecord,
          isPaused: false,
          isWidgetClosed: false
        }
      }, () => {
        refresh();
        if (willRecord) {
          dispatchTabWidgetMessage('SHOW_WIDGET', '🔴 Perekaman dimulai! Floating tools aktif.');
        } else {
          chrome.runtime.sendMessage({ type: 'OPEN_EDITOR' });
        }
      });
    });
  });

  btnOpenEditor.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_EDITOR' });
  });

  btnToggleWidget?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (res) => {
      const isClosed = !!res?.data?.isWidgetClosed;
      const willClose = !isClosed;
      chrome.runtime.sendMessage({
        type: 'UPDATE_STATE',
        payload: { isWidgetClosed: willClose }
      }, () => {
        refresh();
        const msgType = willClose ? 'HIDE_WIDGET' : 'SHOW_WIDGET';
        const toast = willClose ? null : '👁️ Floating tools aktif di layar!';
        dispatchTabWidgetMessage(msgType, toast);
      });
    });
  });

  chkAutoShot.addEventListener('change', () => {
    chrome.runtime.sendMessage({
      type: 'UPDATE_STATE',
      payload: { autoScreenshot: chkAutoShot.checked }
    });
  });

  chkAutoHighlight.addEventListener('change', () => {
    chrome.runtime.sendMessage({
      type: 'UPDATE_STATE',
      payload: { autoHighlight: chkAutoHighlight.checked }
    });
  });

  const btnResetStorage = document.getElementById('btn-reset-storage');
  btnResetStorage?.addEventListener('click', () => {
    if (confirm('Yakin ingin MENGHAPUS SEMUA data storage lokal? (Ini akan membersihkan data lama/rekaman yang tertahan di memori browser).')) {
      chrome.storage.local.clear(() => {
        chrome.runtime.sendMessage({ type: 'RESET_ALL_DOCUMENTS' }, () => {
          refresh();
          alert('Storage lokal berhasil dibersihkan total! Kondisi kembali bersih.');
        });
      });
    }
  });

  refresh();
});
