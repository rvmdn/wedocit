// WeDocIt - Content Script (Robust Zero-Error & Context Protection)
(function () {
  // Global error suppressor for Chrome extension context invalidation
  window.addEventListener('error', function (e) {
    if (e.message && e.message.includes('Extension context invalidated')) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      cleanupDeadExtension();
      return true;
    }
  }, true);

  window.addEventListener('unhandledrejection', function (e) {
    if (e.reason && e.reason.message && e.reason.message.includes('Extension context invalidated')) {
      e.preventDefault();
      e.stopPropagation();
      cleanupDeadExtension();
      return true;
    }
  }, true);

  if (window.__wedocit_injected) return;
  window.__wedocit_injected = true;

  let sessionData = {
    isRecording: false,
    isPaused: false,
    autoScreenshot: true,
    autoHighlight: true,
    activeTcId: "tc_1",
    testCases: []
  };

  let rootContainer = null;
  let shadowRoot = null;
  let isCapturing = false;
  let cachedUserProfile = null;

  // Safe pre-fetch user profile in background
  setTimeout(() => {
    try {
      fetchUserProfile().catch(() => {});
    } catch (e) {}
  }, 100);
  // Dynamic observer activation
  let isMinimized = localStorage.getItem('__wedocit_minimized') === 'true';

  // Safe validity checker with try-catch (Proxy safe)
  function isExtensionValid() {
    try {
      return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
    } catch (e) {
      return false;
    }
  }

  function cleanupDeadExtension() {
    try {
      if (rootContainer && rootContainer.parentNode) {
        rootContainer.parentNode.removeChild(rootContainer);
        rootContainer = null;
      }
      document.removeEventListener('click', onClickHandler, true);
      document.removeEventListener('change', onChangeHandler, true);
      window.removeEventListener('keydown', onKeydownHandler);
      if (toastObserver) { toastObserver.disconnect(); toastObserver = null; }
      isListenersAttached = false;
    } catch (e) {}
  }

  function safeSendMessage(msg, callback) {
    if (!isExtensionValid()) {
      cleanupDeadExtension();
      return;
    }
    try {
      chrome.runtime.sendMessage(msg, (response) => {
        try {
          if (chrome.runtime && chrome.runtime.lastError) {
            // suppress
          }
        } catch (e) {}
        if (callback && isExtensionValid()) {
          callback(response);
        }
      });
    } catch (err) {
      cleanupDeadExtension();
    }
  }

  // Initialize
  safeSendMessage({ type: 'GET_STATE' }, (response) => {
    if (response && response.success && response.data) {
      sessionData = { ...sessionData, ...response.data };
      syncActiveListeners();
      if (sessionData.isWidgetClosed) {
        if (rootContainer) rootContainer.style.display = 'none';
      } else {
        ensureWidgetMounted();
      }
    }
  });

  try {
    if (isExtensionValid()) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (!isExtensionValid()) {
          cleanupDeadExtension();
          return;
        }

        if (message && message.type === 'SHOW_WIDGET') {
          sessionData.isWidgetClosed = false;
          ensureWidgetMounted();
          if (rootContainer) {
            rootContainer.style.display = 'block';
            rootContainer.style.visibility = 'visible';
          }
          if (shadowRoot) {
            const bar = shadowRoot.getElementById('wedocit-bar');
            if (bar) {
              if (message.forceResetPosition) {
                bar.style.top = 'auto';
                bar.style.left = 'auto';
                bar.style.bottom = '24px';
                bar.style.right = '24px';
                try { localStorage.removeItem('__wedocit_bar_pos'); } catch (e) {}
              }
              clampBarPosition(bar);
            }
            updateWidgetUI();
          }
          if (message.toast) {
            showToast(message.toast);
          }
          sendResponse({ success: true });
          return true;
        }

        if (message && message.type === 'HIDE_WIDGET') {
          sessionData.isWidgetClosed = true;
          if (rootContainer) {
            rootContainer.style.display = 'none';
          }
          sendResponse({ success: true });
          return true;
        }

        if (message && message.type === 'TRIGGER_MANUAL_SCREENSHOT') {
          triggerManualScreenshot();
          sendResponse({ success: true });
          return true;
        }

        if (message && message.type === 'SCAN_PAGE_CONTEXT') {
          (async () => {
            try {
              if (!cachedUserProfile) {
                await fetchUserProfile();
              }
              const ctx = scanPageContext();
              ctx.userProfile = cachedUserProfile;
              sendResponse({ success: true, data: ctx });
            } catch (err) {
              sendResponse({ success: false, error: err.message });
            }
          })();
          return true;
        }

        if (message.type === 'STATE_CHANGED' && message.sessionData) {
          sessionData = message.sessionData;
          syncActiveListeners();
          if (sessionData.isRecording) {
            sessionData.isWidgetClosed = false;
          }
          if (sessionData.isWidgetClosed) {
            if (rootContainer) rootContainer.style.display = 'none';
          } else {
            ensureWidgetMounted();
            if (rootContainer) {
              rootContainer.style.display = 'block';
              rootContainer.style.visibility = 'visible';
            }
            if (shadowRoot) {
              const bar = shadowRoot.getElementById('wedocit-bar');
              if (bar) clampBarPosition(bar);
            }
            updateWidgetUI();
          }
        }
      });
    }
  } catch (e) {
    cleanupDeadExtension();
  }

  // Hotkey handler: F9 (single key), F8, Alt+S, Alt+Shift+S, Ctrl+Shift+S
  function onKeydownHandler(e) {
    const isF9 = e.key === 'F9';
    const isF8 = e.key === 'F8';
    const isAltS = e.altKey && (e.key === 'S' || e.key === 's');
    const isCtrlShiftS = e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's');

    if (isF9 || isF8 || isAltS || isCtrlShiftS) {
      e.preventDefault();
      e.stopPropagation();
      triggerManualScreenshot();
    }
  }
  window.addEventListener('keydown', onKeydownHandler, true);

  function getActiveDoc() {
    const docs = sessionData.documents || [];
    return docs.find(d => d.id === sessionData.activeDocId) || docs[0] || {
      metadata: { scenarioName: 'Perbaikan RAP' },
      testCases: []
    };
  }

  function getActiveTc() {
    const doc = getActiveDoc();
    const tcs = doc.testCases || [];
    return tcs.find(t => t.id === doc.activeTcId) || tcs[0] || { tcNumber: 1, title: 'TC 1', steps: [] };
  }

    // ==============================================================
  // AUTO-CAPTURE NOTIFIKASI SUKSES / POPUP (PrimeNG Toast / Swal / Dialog)
  // ==============================================================
  let lastCapturedToastMsg = '';
  let toastCaptureCooldown = false;

  let lastToastCheck = 0;
  let toastObserver = null;
  let isListenersAttached = false;

  function syncActiveListeners() {
    const isRecordingActive = sessionData.isRecording && !sessionData.isPaused;

    if (isRecordingActive) {
      if (!isListenersAttached) {
        document.addEventListener('click', onClickHandler, true);
        document.addEventListener('change', onChangeHandler, true);
        isListenersAttached = true;
      }
      if (!toastObserver) {
        initNotificationObserver();
      }
    } else {
      if (isListenersAttached) {
        document.removeEventListener('click', onClickHandler, true);
        document.removeEventListener('change', onChangeHandler, true);
        isListenersAttached = false;
      }
      if (toastObserver) {
        try { toastObserver.disconnect(); } catch (e) {}
        toastObserver = null;
      }
    }
  }

  function initNotificationObserver() {
    try {
      if (toastObserver) toastObserver.disconnect();
      toastObserver = new MutationObserver(() => {
        if (!isExtensionValid() || !sessionData.isRecording || sessionData.isPaused || toastCaptureCooldown) return;

        const now = Date.now();
        if (now - lastToastCheck < 250) return; // Throttled max 4x/sec
        lastToastCheck = now;

        const toastEl = document.querySelector('.p-toast-message-success, .p-toast-message, .p-message-success, .swal2-modal, div[role="alert"]');
        if (toastEl) {
          handleDetectedToast(toastEl);
        }
      });

      toastObserver.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
  }

  async function handleDetectedToast(toastEl) {
    if (toastCaptureCooldown) return;

    // Ambil teks ringkasan notifikasi
    const summaryEl = toastEl.querySelector('.p-toast-summary, .swal2-title, .p-message-summary, strong, h2') || toastEl;
    const detailEl = toastEl.querySelector('.p-toast-detail, .swal2-html-container, .p-message-detail');
    const summary = summaryEl.innerText ? summaryEl.innerText.trim() : '';
    const detail = detailEl && detailEl.innerText ? detailEl.innerText.trim() : '';
    const fullText = (summary + (detail ? ' - ' + detail : '')).trim();

    if (!fullText) return;
    if (fullText === lastCapturedToastMsg) return;

    // Validasi apakah ini notifikasi sukses / selesai
    const isSuccess = toastEl.classList.contains('p-toast-message-success') ||
                      toastEl.classList.contains('p-message-success') ||
                      /berhasil|success|sukses|disimpan|selesai|created|updated|deleted|diunggah/i.test(fullText);

    if (!isSuccess) return;

    lastCapturedToastMsg = fullText;
    toastCaptureCooldown = true;
    setTimeout(() => {
      toastCaptureCooldown = false;
      lastCapturedToastMsg = '';
    }, 4000); // 4 detik cooldown agar tidak duplikat

    // Tunggu 300ms agar animasi toast/pop-up selesai muncul sempurna di layar
    await new Promise(r => setTimeout(r, 300));
    if (!isExtensionValid() || !sessionData.isRecording) return;

    showToast('📸 Menangkap evidens Notifikasi Sukses...');
    const screenshot = await captureScreenshot();

    safeSendMessage({
      type: 'ADD_STEP',
      step: {
        title: `Notifikasi: "${summary || fullText}"`,
        action: `Sistem memunculkan notifikasi: "${fullText}".`,
        expected: `Sistem berhasil memproses aksi dan menampilkan notifikasi sukses (${summary || fullText}).`,
        actual: 'Sistem menampilkan notifikasi sukses sesuai ekspektasi.',
        status: 'Pass',
        screenshot: screenshot,
        metadata: {
          tagName: 'notification',
          route: window.location.pathname,
          pageTitle: document.title,
          timestamp: new Date().toLocaleTimeString('id-ID')
        }
      }
    }, () => {
      showToast('✔ Notifikasi sukses otomatis tercapture!');
    });
  }

  
  function clampBarPosition(bar) {
    if (!bar) return;
    if (bar.style.top && bar.style.top !== 'auto') {
      const topVal = parseFloat(bar.style.top);
      const leftVal = parseFloat(bar.style.left);
      const maxTop = window.innerHeight - 60;
      const maxLeft = window.innerWidth - 120;

      if (isNaN(topVal) || isNaN(leftVal) || topVal < 10 || topVal > maxTop || leftVal < 10 || leftVal > maxLeft) {
        bar.style.top = 'auto';
        bar.style.left = 'auto';
        bar.style.bottom = '24px';
        bar.style.right = '24px';
        try { localStorage.removeItem('__wedocit_bar_pos'); } catch (e) {}
      }
    }
  }

  window.addEventListener('resize', () => {
    if (shadowRoot) {
      const bar = shadowRoot.getElementById('wedocit-bar');
      if (bar) clampBarPosition(bar);
    }
  });

  function ensureWidgetMounted() {
    if (!isExtensionValid()) return false;
    if (!document.body) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensureWidgetMounted, { once: true });
      } else {
        setTimeout(ensureWidgetMounted, 50);
      }
      return false;
    }
    if (!rootContainer || !document.body.contains(rootContainer)) {
      if (rootContainer && rootContainer.parentNode) {
        try { rootContainer.parentNode.removeChild(rootContainer); } catch (e) {}
      }
      rootContainer = null;
      shadowRoot = null;
      renderWidget();
      return true;
    }
    return true;
  }

  function renderWidget() {
    if (!isExtensionValid()) return;
    if (!document.body) {
      setTimeout(renderWidget, 50);
      return;
    }
    if (rootContainer && document.body.contains(rootContainer)) return;

    rootContainer = document.createElement('div');
    rootContainer.id = 'wedocit-extension-root';
    rootContainer.style.cssText = 'all: initial; position: fixed; z-index: 2147483647;';
    document.body.appendChild(rootContainer);

    shadowRoot = rootContainer.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
      
      .floating-bar {
        position: fixed;
        bottom: 24px;
        right: 24px;
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(15, 23, 42, 0.97);
        backdrop-filter: blur(14px);
        border: 1px solid rgba(56, 189, 248, 0.35);
        border-radius: 50px;
        padding: 5px 10px;
        box-shadow: 0 12px 35px rgba(0, 0, 0, 0.55), 0 0 2px 1px rgba(56, 189, 248, 0.25);
        color: #fff;
        font-size: 12px;
        user-select: none;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        cursor: grab; }
      .floating-bar.minimized {
        padding: 4px 8px;
        gap: 6px;
        background: rgba(15, 23, 42, 0.96);
        border: 1px solid rgba(56, 189, 248, 0.6);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.6);
      }

      .btn-window-action {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        padding: 2px 5px;
        border-radius: 4px;
        font-size: 11px;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
      }
      .btn-window-action:hover {
        background: rgba(255, 255, 255, 0.15);
        color: #fff;
      }
      .btn-window-action.btn-close-action:hover {
        background: #ef4444;
        color: #fff;
      }
      .floating-bar:active { cursor: grabbing; }

      .brand {
        display: flex;
        align-items: center;
        gap: 5px;
        font-weight: 700;
        font-size: 12px;
        color: #38bdf8;
        padding-right: 6px;
        border-right: 1px solid rgba(255, 255, 255, 0.15);
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .brand:hover {
        color: #7dd3fc;
        transform: scale(1.04);
      }
      .brand-dot {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: #ef4444;
      }
      .brand-dot.recording { animation: pulse 1.4s infinite; }
      .brand-dot.idle { background: #64748b; }
      .brand-dot.paused { background: #f59e0b; }

      @keyframes pulse {
        0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
        70% { transform: scale(1.15); box-shadow: 0 0 0 7px rgba(239, 68, 68, 0); }
        100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
      }

      .tc-select-wrapper {
        display: inline-flex;
        align-items: center;
        background: #1e293b;
        border: 1px solid #0284c7;
        border-radius: 16px;
        padding: 1px 6px;
        max-width: 145px;
      }
      .tc-select {
        background: transparent;
        color: #38bdf8;
        font-weight: 800;
        font-size: 11px;
        border: none;
        outline: none;
        cursor: pointer;
        max-width: 130px;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
      }
      .tc-select option {
        background: #0f172a;
        color: #f8fafc;
      }

      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        border: none;
        outline: none;
        padding: 5px 9px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;
      }
      .btn:hover { filter: brightness(1.15); transform: translateY(-1px); }
      .btn:active { transform: translateY(0); }

      .btn-icon-round {
        width: 27px;
        height: 27px;
        min-width: 27px;
        padding: 0;
        border-radius: 50%;
        font-size: 13px;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .btn-record.btn-icon-round {
        background: #ef4444;
        color: #fff;
        font-size: 14px;
        box-shadow: 0 0 8px rgba(239, 68, 68, 0.45);
      }
      .btn-record.btn-icon-round:hover {
        box-shadow: 0 0 12px rgba(239, 68, 68, 0.75);
        transform: scale(1.1);
      }
      .btn-pause { background: #334155; color: #e2e8f0; font-size: 12px; }
      .btn-manual-ss { background: #0284c7; color: #fff; font-size: 13px; box-shadow: 0 2px 6px rgba(2,132,199,0.4); }
      .btn-manual-ss:hover { transform: scale(1.1); box-shadow: 0 2px 8px rgba(2,132,199,0.6); }
      .btn-next-tc { background: #8b5cf6; color: #fff; font-size: 11px; font-weight: 700; box-shadow: 0 2px 6px rgba(139,92,246,0.4); }
      .btn-finish { background: #10b981; color: #fff; font-size: 13px; }
      .btn-reset { background: #475569; color: #cbd5e1; font-size: 14px; font-weight: 700; }
      .btn-reset:hover { background: #ef4444; color: #fff; }
      .btn-icon { width: 27px; height: 27px; min-width: 27px; padding: 0; border-radius: 50%; background: #1e293b; color: #94a3b8; font-size: 13px; }
      .btn-icon:hover { background: #334155; color: #f8fafc; }

      .toggle-ss-pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 27px;
        height: 27px;
        min-width: 27px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 50%;
        padding: 0;
        font-size: 12px;
        color: #94a3b8;
        cursor: pointer;
        transition: all 0.2s;
      }
      .toggle-ss-pill:hover { filter: brightness(1.2); transform: scale(1.08); }
      .toggle-ss-pill.active {
        background: rgba(16, 185, 129, 0.25);
        border-color: #10b981;
        color: #10b981;
        box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
      }

      .badge-counter {
        background: rgba(56, 189, 248, 0.15);
        color: #38bdf8;
        border: 1px solid rgba(56, 189, 248, 0.3);
        padding: 2px 6px;
        border-radius: 12px;
        font-size: 10.5px;
        font-weight: 700;
        white-space: nowrap;
      }

      .toast-msg {
        position: fixed;
        bottom: 75px;
        right: 24px;
        background: #0f172a;
        color: #f8fafc;
        border: 1px solid #38bdf8;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        box-shadow: 0 4px 14px rgba(0,0,0,0.5);
        opacity: 0;
        transform: translateY(10px);
        transition: all 0.2s ease;
        pointer-events: none;
      }
      .toast-msg.show { opacity: 1; transform: translateY(0); }
    `;

    const widget = document.createElement('div');
    widget.className = 'floating-bar';
    widget.id = 'wedocit-bar';
    widget.innerHTML = renderWidgetHtml();

    shadowRoot.appendChild(style);
    shadowRoot.appendChild(widget);

    attachWidgetEvents();
    makeDraggable(widget);
  }

  function renderWidgetHtml() {
    const isRec = sessionData.isRecording;
    const isPaused = sessionData.isPaused;
    const autoSS = sessionData.autoScreenshot === true;
    const activeDoc = getActiveDoc();
    const tcs = activeDoc.testCases || [];
    const activeTc = getActiveTc();
    const stepCount = (activeTc.steps || []).length;

    // JIKA MODE MINIMIZED (SUPER COMPACT / HEMAT TEMPAT)
    if (isMinimized) {
      return `
        <div class="brand" id="btn-toggle-brand" style="border:none; padding-right:2px; cursor:pointer;" title="WeDocIt (Klik untuk Perluas Toolbar)">
          <div class="brand-dot ${isRec ? (isPaused ? 'paused' : 'recording') : 'idle'}" id="status-dot"></div>
          <span style="font-weight:700; font-size:11px; color:#38bdf8;">WeDocIt</span>
        </div>
        <span style="font-weight:700; font-size:11px; color:#38bdf8; max-width:85px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${activeTc.title || 'TC ' + activeTc.tcNumber}">
          ${activeTc.title || 'TC ' + activeTc.tcNumber}
        </span>
        <span style="font-size:10px; font-weight:700; color:#94a3b8; background:#1e293b; padding:1px 6px; border-radius:10px;" title="Jumlah evidens langkah">
          ${stepCount}
        </span>
        ${isRec ? `
          <button class="btn btn-manual-ss btn-icon-round" id="btn-manual-ss-mini" title="Ambil SS Layar Penuh (Tekan F9 / Alt+S)" style="width:24px; height:24px; font-size:11px;">
            📸
          </button>
        ` : `
          <button class="btn btn-record btn-icon-round" id="btn-toggle-rec" title="Mulai Rekam TC Ini" style="width:24px; height:24px; font-size:11px;">
            ⏺
          </button>
        `}
        <button class="btn-window-action" id="btn-expand-widget" title="Perbesar Toolbar Lengkap" style="font-size:13px; font-weight:bold;">
          ⤢
        </button>
        <button class="btn-window-action btn-close-action" id="btn-close-widget" title="Tutup & Nonaktifkan Tools (Auto-Disable)" style="font-size:13px; font-weight:bold;">
          ✕
        </button>
        <div class="toast-msg" id="toast-notification">Langkah tersimpan!</div>
      `;
    }

    // MODE FULL (LENGKAP - RAMPING & ICON-FIRST DENGAN TOOLTIP)
    let tcOptionsHtml = '';
    tcs.forEach((tc) => {
      const selected = tc.id === sessionData.activeTcId ? 'selected' : '';
      tcOptionsHtml += `<option value="${tc.id}" ${selected}>TC ${tc.tcNumber}: ${escapeHtml(tc.title || 'TC ' + tc.tcNumber)}</option>`;
    });
    tcOptionsHtml += `<option value="__NEW_TC__">➕ Buat TC Baru...</option>`;

    return `
      <div class="brand" id="btn-toggle-brand" title="WeDocIt: Klik untuk ciutkan toolbar (Hemat tempat)">
        <div class="brand-dot ${isRec ? (isPaused ? 'paused' : 'recording') : 'idle'}" id="status-dot"></div>
        <span>WeDocIt</span>
      </div>

      <div class="tc-select-wrapper" title="Pilih Test Case yang sedang aktif atau buat baru">
        <select class="tc-select" id="sel-active-tc">
          ${tcOptionsHtml}
        </select>
      </div>

      <div class="badge-counter" id="step-count" title="Jumlah langkah evidens tersimpan">
        ${stepCount} Langkah
      </div>

      ${!isRec ? `
        <button class="btn btn-record btn-icon-round" id="btn-toggle-rec" title="Mulai Rekam TC Ini (Klik untuk merekam langkah)">
          ⏺
        </button>
        <div class="toggle-ss-pill ${autoSS ? 'active' : ''}" id="btn-toggle-auto-ss" title="Auto Screenshot per Klik: ${autoSS ? 'ON (Aktif)' : 'OFF (Mati)'} - Klik untuk ubah">
          📷
        </div>
        <button class="btn btn-reset btn-icon-round" id="btn-reset-rec" title="Reset langkah pengujian kembali ke 0 (TC 1)">
          ↺
        </button>
      ` : `
        <button class="btn btn-pause btn-icon-round" id="btn-toggle-pause" title="${isPaused ? 'Lanjutkan Rekaman' : 'Jeda Rekaman'}">
          ${isPaused ? '▶' : '⏸'}
        </button>

        <div class="toggle-ss-pill ${autoSS ? 'active' : ''}" id="btn-toggle-auto-ss" title="Auto Screenshot per Klik: ${autoSS ? 'ON (Aktif)' : 'OFF (Mati)'} - Klik untuk ubah">
          📷
        </div>

        <button class="btn btn-manual-ss btn-icon-round" id="btn-manual-ss" title="Ambil SS Layar Penuh untuk Menu ini (Tekan F9 atau Alt+S)">
          📸
        </button>

        <button class="btn btn-next-tc btn-icon-round" id="btn-save-next-tc" title="Simpan TC ini dan otomatis lanjut rekam TC berikutnya">
          💾 ➔
        </button>

        <button class="btn btn-finish btn-icon-round" id="btn-finish-rec" title="Selesai Rekaman & Buka Dokumen Studio">
          ⏹
        </button>
      `}

      <button class="btn btn-icon btn-icon-round" id="btn-open-doc" title="Buka Dokumen Studio">
        📄
      </button>

      <!-- Jendela Aksi: Minimize (Hemat Tempat) & Close (Auto Disable) -->
      <div style="display:flex; align-items:center; gap:2px; margin-left:4px; padding-left:4px; border-left:1px solid rgba(255,255,255,0.15);">
        <button class="btn-window-action" id="btn-minimize-widget" title="Perkecil (Mode Hemat Tempat)" style="font-size:12px; font-weight:bold;">
          🗕
        </button>
        <button class="btn-window-action btn-close-action" id="btn-close-widget" title="Tutup & Nonaktifkan Tools (Auto-Disable)" style="font-size:12px; font-weight:bold;">
          ✕
        </button>
      </div>

      <div class="toast-msg" id="toast-notification">Langkah tersimpan!</div>
    `;
  }

  function updateWidgetUI() {
    syncActiveListeners();
    if (!shadowRoot || !isExtensionValid()) return;
    const bar = shadowRoot.getElementById('wedocit-bar');
    if (!bar) return;
    if (isMinimized) {
      bar.classList.add('minimized');
    } else {
      bar.classList.remove('minimized');
    }
    bar.innerHTML = renderWidgetHtml();
    attachWidgetEvents();
  }

  function showToast(msg) {
    if (!shadowRoot) return;
    const toast = shadowRoot.getElementById('toast-notification');
    if (toast) {
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => {
        if (toast) toast.classList.remove('show');
      }, 2000);
    }
  }

  async function triggerManualScreenshot() {
    if (!isExtensionValid() || isCapturing) return;

    // Pastikan session aktif merekam
    if (!sessionData.isRecording) {
      await new Promise((resolve) => {
        safeSendMessage({
          type: 'UPDATE_STATE',
          payload: { isRecording: true, isPaused: false }
        }, resolve);
      });
      sessionData.isRecording = true;
      sessionData.isPaused = false;
    }

    isCapturing = true;
    showToast('📸 Mengambil screenshot 1 layar penuh...');

    try {
      // 1. Pindai nama menu / breadcrumb / judul halaman saat ini
      const ctx = scanPageContext();
      const currentMenu = ctx.breadcrumbPath || ctx.menuName || document.title || 'Halaman Aktif';

      // 2. Ambil screenshot 1 layar penuh (otomatis menyembunyikan floating bar WeDocIt)
      const screen = await captureScreenshot();
      isCapturing = false;

      if (!screen) {
        showToast('⚠️ Gagal mengambil screenshot layar.');
        return;
      }

      // 3. Susun data langkah evidens
      const stepTitle = `Tampilan menu/halaman "${currentMenu}"`;
      const actionDesc = `Pengguna membuka dan menampilkan layar menu [${currentMenu}].`;
      const expected = `Halaman menu [${currentMenu}] tampil dengan baik dan seluruh elemen halaman termuat lengkap.`;
      const actual = `Menu [${currentMenu}] berhasil ditampilkan.`;

      // 4. Tambahkan sebagai Langkah Baru di Test Case aktif
      safeSendMessage({
        type: 'ADD_STEP',
        step: {
          title: stepTitle,
          actionDescription: actionDesc,
          inputData: '-',
          expectedResult: expected,
          actual: actual,
          status: 'Pass',
          screenshot: screen,
          metadata: {
            type: 'FULL_SCREEN_CAPTURE',
            menuName: ctx.menuName,
            breadcrumbPath: ctx.breadcrumbPath,
            pageHeading: ctx.pageHeading,
            url: window.location.href,
            pageTitle: document.title
          }
        }
      }, (res) => {
        const stepNum = res?.step?.stepNumber || (res?.activeTc?.steps?.length) || '';
        showToast(`✔ Screenshot menu "${currentMenu}" tersimpan (Langkah ${stepNum})!`);
      });
    } catch (err) {
      isCapturing = false;
      showToast('⚠️ Gagal memproses screenshot.');
    }
  }

  function attachWidgetEvents() {
    const selTc = shadowRoot?.getElementById('sel-active-tc');
    if (selTc) {
      selTc.onchange = (e) => {
        const val = e.target.value;
        if (val === '__NEW_TC__') {
          safeSendMessage({ type: 'CREATE_NEXT_TC' }, () => {
            showToast('➕ Test Case baru dibuat!');
          });
        } else {
          safeSendMessage({ type: 'SWITCH_ACTIVE_TC', tcId: val }, () => {
            showToast('🔄 Berpindah ke ' + selTc.options[selTc.selectedIndex].text);
          });
        }
      };
    }

    const btnRec = shadowRoot?.getElementById('btn-toggle-rec');
    if (btnRec) {
      btnRec.onclick = (e) => {
        e.stopPropagation();
        safeSendMessage({
          type: 'UPDATE_STATE',
          payload: { isRecording: true, isPaused: false }
        });
        showToast('🔴 Perekaman dimulai...');
      };
    }

    const btnSaveNextTc = shadowRoot?.getElementById('btn-save-next-tc');
    if (btnSaveNextTc) {
      btnSaveNextTc.onclick = (e) => {
        e.stopPropagation();
        safeSendMessage({ type: 'CREATE_NEXT_TC' }, (res) => {
          showToast('💾 TC tersimpan! Lanjut merekam TC ' + (res?.newTc?.tcNumber || ''));
        });
      };
    }

    // BRAND LOGO CLICKABLE (TOGGLE MINIMIZE / RAMPING)
    const brandToggle = shadowRoot?.getElementById('btn-toggle-brand');
    if (brandToggle) {
      brandToggle.onclick = (e) => {
        e.stopPropagation();
        isMinimized = !isMinimized;
        try { localStorage.setItem('__wedocit_minimized', isMinimized ? 'true' : 'false'); } catch (e) {}
        updateWidgetUI();
        showToast(isMinimized ? '🗕 Mode Ringkas (Hemat Tempat)' : '⤢ Mode Lengkap');
      };
    }

    const btnReset = shadowRoot?.getElementById('btn-reset-rec');
    if (btnReset) {
      btnReset.onclick = (e) => {
        e.stopPropagation();
        if (confirm('Reset seluruh Test Case ke awal (TC 1)? Semua langkah evidens akan dihapus.')) {
          safeSendMessage({ type: 'RESET_ALL' }, () => {
            showToast('↺ Seluruh langkah berhasil di-reset ke 0');
          });
        }
      };
    }

    const btnPause = shadowRoot?.getElementById('btn-toggle-pause');
    if (btnPause) {
      btnPause.onclick = (e) => {
        e.stopPropagation();
        safeSendMessage({
          type: 'UPDATE_STATE',
          payload: { isPaused: !sessionData.isPaused }
        });
      };
    }

    const btnToggleAutoSS = shadowRoot?.getElementById('btn-toggle-auto-ss');
    if (btnToggleAutoSS) {
      btnToggleAutoSS.onclick = (e) => {
        e.stopPropagation();
        const newVal = !sessionData.autoScreenshot;
        safeSendMessage({
          type: 'UPDATE_STATE',
          payload: { autoScreenshot: newVal }
        }, () => {
          showToast(newVal ? '📷 Auto SS diaktifkan' : '⚡ Auto SS dimatikan');
        });
      };
    }

    const btnManualSS = shadowRoot?.getElementById('btn-manual-ss');
    if (btnManualSS) {
      btnManualSS.onclick = (e) => {
        e.stopPropagation();
        triggerManualScreenshot();
      };
    }

    const btnFinish = shadowRoot?.getElementById('btn-finish-rec');
    if (btnFinish) {
      btnFinish.onclick = (e) => {
        e.stopPropagation();
        safeSendMessage({
          type: 'UPDATE_STATE',
          payload: { isRecording: false, isPaused: false }
        }, () => {
          safeSendMessage({ type: 'OPEN_EDITOR' });
        });
      };
    }

    // MINIMIZE (Hemat Tempat)
    const btnMinimize = shadowRoot?.getElementById('btn-minimize-widget');
    if (btnMinimize) {
      btnMinimize.onclick = (e) => {
        e.stopPropagation();
        isMinimized = true;
        try { localStorage.setItem('__wedocit_minimized', 'true'); } catch (e) {}
        updateWidgetUI();
      };
    }

    // EXPAND
    const btnExpand = shadowRoot?.getElementById('btn-expand-widget');
    if (btnExpand) {
      btnExpand.onclick = (e) => {
        e.stopPropagation();
        isMinimized = false;
        try { localStorage.setItem('__wedocit_minimized', 'false'); } catch (e) {}
        updateWidgetUI();
      };
    }

    // CLOSE & AUTO-DISABLE
    const btnClose = shadowRoot?.getElementById('btn-close-widget');
    if (btnClose) {
      btnClose.onclick = (e) => {
        e.stopPropagation();
        sessionData.isRecording = false;
        sessionData.isPaused = false;
        sessionData.isWidgetClosed = true;
        if (rootContainer) rootContainer.style.display = 'none';
        safeSendMessage({
          type: 'UPDATE_STATE',
          payload: { isRecording: false, isPaused: false, isWidgetClosed: true }
        });
      };
    }

    // MINI SS
    const btnMiniSs = shadowRoot?.getElementById('btn-manual-ss-mini');
    if (btnMiniSs) {
      btnMiniSs.onclick = (e) => {
        e.stopPropagation();
        triggerManualScreenshot();
      };
    }

    const btnOpenDoc = shadowRoot?.getElementById('btn-open-doc');
    if (btnOpenDoc) {
      btnOpenDoc.onclick = (e) => {
        e.stopPropagation();
        safeSendMessage({ type: 'OPEN_EDITOR' });
      };
    }
  }

  async function fetchUserProfile() {
    if (cachedUserProfile) return cachedUserProfile;

    // 1. Direct fetch ke endpoint Profile dengan session cookies browser
    const endpoints = [
      '/api/Auth/Profile',
      '/Auth/Profile'
    ];

    for (const ep of endpoints) {
      try {
        const resp = await fetch(ep, { credentials: 'include' });
        if (resp.ok) {
          const json = await resp.json();
          if (json && json.data && (json.data.nama || json.data.nppOrUsername)) {
            const d = json.data;
            const primaryRole = (d.roleName && d.roleName[0]) || (d.roles && d.roles[0]) || '';
            const allRoles = (d.roleName && d.roleName.length > 0) ? d.roleName.join(', ') : (d.roles ? d.roles.join(', ') : '');
            cachedUserProfile = {
              nama: d.nama || '',
              npp: d.nppOrUsername || '',
              roles: d.roles || [],
              roleName: d.roleName || [],
              codeUnit: d.codeUnit || '',
              divisionName: d.divisionName || '',
              primaryRole: primaryRole,
              allRoles: allRoles,
              formattedAuthor: `${d.nama || ''} (${d.nppOrUsername || ''}) - ${primaryRole}`.trim()
            };
            return cachedUserProfile;
          }
        }
      } catch (err) {}
    }

    // 2. Fallback: Parse dari Topbar UI DOM AMS FAST
    try {
      const nppEl = document.querySelector('.layout-topbar-button .font-semibold');
      const npp = nppEl ? nppEl.innerText.trim() : '';

      const nameEl = document.querySelector('.p-menu .font-bold, .p-overlaypanel .font-bold');
      const roleEl = document.querySelector('.p-menu .text-sm, .p-overlaypanel .text-sm');
      const divEl = document.querySelector('.p-menu .font-semibold');

      if (npp || nameEl) {
        const nama = nameEl ? nameEl.innerText.trim() : '';
        const role = roleEl ? roleEl.innerText.trim() : '';
        const division = divEl ? divEl.innerText.trim() : '';
        cachedUserProfile = {
          nama: nama,
          npp: npp,
          roles: role ? [role] : [],
          roleName: role ? [role] : [],
          codeUnit: '',
          divisionName: division,
          primaryRole: role,
          allRoles: role,
          formattedAuthor: `${nama} (${npp}) - ${role}`.trim()
        };
        return cachedUserProfile;
      }
    } catch (e) {}

    return null;
  }

  function scanPageContext() {
    let menuName = '';
    let breadcrumbPath = '';
    let pageHeading = '';

    // 1. PrimeNG Breadcrumb (Used in AMS FAST layout)
    try {
      const bcNodes = document.querySelectorAll('.p-breadcrumb ul li, p-breadcrumb ul li, .p-breadcrumb-item, ol.breadcrumb li');
      if (bcNodes && bcNodes.length > 0) {
        const texts = [];
        bcNodes.forEach(node => {
          const txtEl = node.querySelector('.p-menuitem-text') || node;
          const t = txtEl.innerText ? txtEl.innerText.trim() : '';
          // Filter out home icon, separators, or empty
          if (t && t !== '/' && t !== '>' && !t.toLowerCase().includes('home')) {
            texts.push(t);
          }
        });
        if (texts.length > 0) {
          breadcrumbPath = texts.join(' > ');
          menuName = texts[texts.length - 1];
        }
      }
    } catch (e) {}

    // 2. Active Sidebar Menu item (AMS FAST Sakai / Apollo template)
    try {
      if (!menuName) {
        const activeRoute = document.querySelector('.active-menuitem > a .layout-menuitem-text, a.active-route .layout-menuitem-text, .router-link-active, .layout-menuitem.active');
        if (activeRoute && activeRoute.innerText) {
          menuName = activeRoute.innerText.trim();
        }
      }
    } catch (e) {}

    // 3. Page Header / Heading / Card Title in main area
    try {
      const headingEl = document.querySelector('.layout-main h1, .layout-main h2, .layout-main h3, .layout-main .font-semibold.text-xl, .layout-main .text-2xl, .p-card-title, .p-panel-header, h1, h2');
      if (headingEl && headingEl.innerText) {
        pageHeading = headingEl.innerText.trim();
      }
    } catch (e) {}

    // 4. Document title or clean URL path
    const docTitle = document.title ? document.title.split(/[-–|]/)[0].trim() : '';
    const pathname = window.location.pathname || '';
    const pathSegments = pathname.split('/').filter(Boolean);
    const lastSegment = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : '';
    const cleanUrl = lastSegment ? lastSegment.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

    const finalMenu = menuName || pageHeading || docTitle || cleanUrl || 'Halaman AMS FAST';
    const finalScenario = breadcrumbPath ? `${breadcrumbPath}` : (pageHeading || finalMenu);

    return {
      menuName: finalMenu,
      breadcrumbPath: breadcrumbPath,
      scenarioName: finalScenario.startsWith('Pengujian') ? finalScenario : `Pengujian ${finalScenario}`,
      pageTitle: document.title || finalMenu,
      url: window.location.href
    };
  }

  function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    element.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT' || e.target.closest('button') || e.target.closest('select') || e.target.classList.contains('toggle-ss-pill')) return;
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;

      let newTop = element.offsetTop - pos2;
      let newLeft = element.offsetLeft - pos1;

      // Restrict within viewport boundaries so it doesn't get lost off-screen
      newTop = Math.max(10, Math.min(window.innerHeight - element.offsetHeight - 10, newTop));
      newLeft = Math.max(10, Math.min(window.innerWidth - element.offsetWidth - 10, newLeft));

      element.style.top = newTop + "px";
      element.style.left = newLeft + "px";
      element.style.bottom = 'auto';
      element.style.right = 'auto';
    }

    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
      try {
        localStorage.setItem('__wedocit_bar_pos', JSON.stringify({
          top: element.style.top,
          left: element.style.left
        }));
      } catch (err) {}
    }
  }

  function extractElementMetadata(el) {
    if (!el) return {};
    const meta = {
      tagName: el.tagName ? el.tagName.toLowerCase() : '',
      testId: el.getAttribute('data-testid') || el.getAttribute('data-test') || el.getAttribute('data-cy') || '',
      customTitle: el.getAttribute('data-doc-title') || el.getAttribute('data-step') || '',
      customExpected: el.getAttribute('data-doc-expected') || el.getAttribute('data-expected') || '',
      formControlName: el.getAttribute('formcontrolname') || el.getAttribute('ng-reflect-name') || '',
      route: window.location.pathname + window.location.hash,
      pageTitle: document.title,
      timestamp: new Date().toLocaleTimeString('id-ID')
    };

    let label = meta.customTitle;
    if (!label) {
      if (el.getAttribute('aria-label')) {
        label = el.getAttribute('aria-label').trim();
      } else if (el.getAttribute('placeholder')) {
        label = el.getAttribute('placeholder').trim();
      } else if (el.getAttribute('title')) {
        label = el.getAttribute('title').trim();
      } else if (meta.formControlName) {
        label = meta.formControlName;
      } else if (el.id) {
        const lbl = document.querySelector(`label[for="${el.id}"]`);
        if (lbl && lbl.innerText) label = lbl.innerText.trim();
      }
      
      if (!label) {
        const parentLabel = el.closest('label') || el.closest('.p-field')?.querySelector('label') || el.closest('.field')?.querySelector('label');
        if (parentLabel && parentLabel.innerText) label = parentLabel.innerText.trim();
      }

      if (!label) {
        const directText = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
        if (directText && directText.length > 0 && directText.length < 50) {
          label = directText;
        }
      }
    }

    // Forbid generic HTML tags like 'p', 'div', 'span' from becoming labels
    const genericTags = ['p', 'div', 'span', 'b', 'i', 'strong', 'em', 'small', 'td', 'tr', 'table', 'section', 'article', 'br'];
    if (!label || genericTags.includes(label.toLowerCase())) {
      if (el.tagName === 'BUTTON' || el.classList.contains('p-button')) {
        label = 'Tombol';
      } else if (el.tagName === 'A' || el.classList.contains('p-tabview-nav-link')) {
        label = 'Menu / Tautan';
      } else if (el.classList.contains('p-dropdown') || el.closest('.p-dropdown')) {
        label = 'Pilihan Dropdown';
      } else {
        label = 'Elemen UI';
      }
    }

    meta.computedLabel = label;
    return meta;
  }

  function highlightElement(el) {
    return new Promise((resolve) => {
      const rect = el.getBoundingClientRect();
      const highlight = document.createElement('div');
      highlight.id = 'wedocit-target-highlight';
      highlight.style.cssText = `
        position: fixed;
        left: ${rect.left - 2}px;
        top: ${rect.top - 2}px;
        width: ${rect.width + 4}px;
        height: ${rect.height + 4}px;
        border: 2px solid #ef4444;
        border-radius: 4px;
        box-shadow: 0 0 10px rgba(239, 68, 68, 0.7);
        z-index: 2147483646;
        pointer-events: none;
      `;

      const badge = document.createElement('div');
      badge.style.cssText = `
        position: absolute;
        top: -12px;
        left: -2px;
        background: #ef4444;
        color: #fff;
        font-size: 9px;
        font-weight: 800;
        padding: 1px 4px;
        border-radius: 3px;
        text-transform: uppercase;
      `;
      badge.textContent = 'KLIK';
      highlight.appendChild(badge);

      document.body.appendChild(highlight);

      setTimeout(() => {
        resolve(() => {
          if (highlight.parentNode) highlight.parentNode.removeChild(highlight);
        });
      }, 50);
    });
  }

  
  function hideWidget() {
    if (rootContainer) {
      rootContainer.style.setProperty('display', 'none', 'important');
      rootContainer.style.setProperty('visibility', 'hidden', 'important');
      rootContainer.style.setProperty('opacity', '0', 'important');
    }
    const bar = shadowRoot?.querySelector('.floating-bar');
    if (bar) {
      bar.style.setProperty('display', 'none', 'important');
      bar.style.setProperty('visibility', 'hidden', 'important');
      bar.style.setProperty('opacity', '0', 'important');
    }
  }

  function showWidget() {
    if (sessionData.isWidgetClosed) return;
    if (rootContainer) {
      rootContainer.style.setProperty('display', 'block', 'important');
      rootContainer.style.setProperty('visibility', 'visible', 'important');
      rootContainer.style.setProperty('opacity', '1', 'important');
    }
    const bar = shadowRoot?.querySelector('.floating-bar');
    if (bar) {
      bar.style.setProperty('display', isMinimized ? 'inline-flex' : 'flex', 'important');
      bar.style.setProperty('visibility', 'visible', 'important');
      bar.style.setProperty('opacity', '1', 'important');
    }
  }

  function captureScreenshot() {
    return new Promise(async (resolve) => {
      if (!isExtensionValid()) {
        resolve('');
        return;
      }
      // 1. Sembunyikan widget WeDocIt secara total dari render tree
      hideWidget();

      // 2. Paksa reflow dan tunggu frame GPU compositor di-repaint tanpa widget
      if (document.body) void document.body.offsetHeight;
      await new Promise((r) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(r, 85);
          });
        });
      });

      // 3. Ambil screenshot layar
      try {
        chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' }, (res) => {
          // 4. Munculkan kembali widget WeDocIt setelah capture selesai
          showWidget();
          try {
            if (chrome.runtime && chrome.runtime.lastError) {
              resolve('');
              return;
            }
          } catch (e) {}
          if (!res || !res.success) {
            resolve('');
          } else {
            resolve(res.dataUrl || '');
          }
        });
      } catch (e) {
        showWidget();
        resolve('');
      }
    });
  }

  // Click Handler (Hanya menangkap BUTTON / aksi nyata, abaikan pengisian field, komentar, dan upload dokumen)
  function onClickHandler(e) {
    if (!isExtensionValid()) {
      cleanupDeadExtension();
      return;
    }
    if (!sessionData.isRecording || sessionData.isPaused) return;
    if (rootContainer && rootContainer.contains(e.target)) return;

    const target = e.target;
    if (!target) return;

    // 1. ABAIKAN FIELD INPUT TEKS, TEXTAREA, KOMENTAR / RICH TEXT EDITOR, DATEPICKER, DAN UPLOAD FILE
    const isExcludedField = target.closest(`
      input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]),
      textarea, .p-inputtextarea,
      .ql-editor, p-editor, .p-editor, [contenteditable="true"],
      .p-inputtext, .p-calendar, .p-datepicker,
      .p-fileupload, .p-fileupload-choose, .p-fileupload-buttonbar,
      label
    `);
    if (isExcludedField) {
      return; // Cukup lengkapi data mandatory di form, tidak perlu screenshot/langkah per klik field
    }

    // 2. TANGKAP TOMBOL & LINK NAVIGASI / MENU SIDEBAR / TAB / CHECKBOX / RADIO
    const clickable = target.closest(`
      button,
      .p-button,
      [role="button"],
      a,
      [role="menuitem"],
      [role="treeitem"],
      [role="link"],
      summary,
      nav li,
      aside li,
      .sidebar li,
      .sidebar-item,
      .ActionListItem,
      .ActionListContent,
      [data-component="ActionList.Item"],
      .layout-menuitem a,
      .layout-menuitem,
      .menu-item,
      .nav-link,
      .sidebar a,
      nav a,
      aside a,
      .p-panelmenu-header,
      .p-panelmenu-header-link,
      .p-menuitem-link,
      .p-treenode-content,
      input[type="submit"], input[type="button"],
      .p-dialog-header-close,
      [role="tab"], .p-tabview-nav-link,
      .p-splitbutton-defaultbutton, .p-splitbutton-menubutton,
      .p-dropdown,
      input[type="checkbox"], input[type="radio"],
      .p-checkbox, .p-radiobutton,
      tr[pSelectableRow]
    `);

    // JIKA BUKAN TOMBOL / LINK NAVIGASI / AKSI NYATA, ABAIKAN!
    if (!clickable) {
      return;
    }

    // Pastikan bukan bagian dari uploader file dokumen
    if (clickable.closest('.p-fileupload, .p-fileupload-choose')) {
      return;
    }

    if (clickable === document.body || clickable === document.documentElement) return;

    const shouldCapture = sessionData.autoScreenshot === true || e.altKey === true;
    const meta = extractElementMetadata(clickable);
    const label = meta.computedLabel;
    const tagName = clickable.tagName.toUpperCase();

    let stepTitle = meta.customTitle || `Klik ${label}`;
    let actionDesc = `Pengguna melakukan aksi klik pada [${label}].`;
    let expected = meta.customExpected || `Sistem merespons aksi klik [${label}] dengan tepat.`;

    if (tagName === 'BUTTON' || clickable.classList.contains('p-button') || clickable.getAttribute('role') === 'button') {
      stepTitle = meta.customTitle || `Klik tombol "${label}"`;
      actionDesc = `Pengguna mengklik tombol [${label}].`;
      expected = meta.customExpected || `Sistem mengeksekusi aksi dari tombol [${label}].`;
    } else if (tagName === 'A' || clickable.classList.contains('p-tabview-nav-link') || clickable.getAttribute('role') === 'tab') {
      stepTitle = meta.customTitle || `Buka menu / tab "${label}"`;
      actionDesc = `Pengguna memilih menu atau tab [${label}].`;
      expected = meta.customExpected || `Halaman diarahkan ke menu/tab [${label}].`;
    } else if (clickable.classList.contains('p-dropdown') || clickable.closest('.p-dropdown')) {
      stepTitle = meta.customTitle || `Buka pilihan "${label}"`;
      actionDesc = `Pengguna membuka pilihan dropdown [${label}].`;
      expected = meta.customExpected || `Sistem menampilkan daftar pilihan dropdown.`;
    } else if (tagName === 'INPUT' && (clickable.type === 'checkbox' || clickable.type === 'radio')) {
      const isChecked = clickable.checked;
      stepTitle = meta.customTitle || `${isChecked ? 'Centang' : 'Hapus centang'} opsi "${label}"`;
      actionDesc = `Pengguna mengubah status pilihan [${label}].`;
      expected = meta.customExpected || `Pilihan [${label}] berhasil disesuaikan.`;
    } else if (clickable.closest('tr')) {
      stepTitle = meta.customTitle || `Pilih baris pada tabel`;
      actionDesc = `Pengguna memilih baris data [${label}] pada tabel.`;
      expected = meta.customExpected || `Baris data terpilih dan sistem menampilkan rincian data.`;
    }

    (async () => {
      let screenshot = '';
      if (shouldCapture) {
        let cleanupHighlight = () => {};
        if (sessionData.autoHighlight !== false) {
          cleanupHighlight = await highlightElement(clickable);
        }
        screenshot = await captureScreenshot();
        cleanupHighlight();
      }

      safeSendMessage({
        type: 'ADD_STEP',
        step: {
          title: stepTitle,
          actionDescription: actionDesc,
          inputData: '-',
          expectedResult: expected,
          actual: 'Berhasil dieksekusi.',
          status: 'Pass',
          screenshot: screenshot,
          metadata: meta
        }
      }, () => {
        showToast(`✔ Tombol "${label}" tercatat!`);
      });
    })();
  }

  function onChangeHandler(e) {
    if (!isExtensionValid()) {
      cleanupDeadExtension();
      return;
    }
    if (!sessionData.isRecording || sessionData.isPaused) return;
    if (rootContainer && rootContainer.contains(e.target)) return;

    const target = e.target;
    if (!target) return;

    // HANYA proses SELECT dropdown jika ada (Abaikan input teks, textarea, komentar, upload)
    const tagName = target.tagName.toUpperCase();
    if (tagName === 'SELECT') {
      const meta = extractElementMetadata(target);
      const label = meta.computedLabel;
      const selectedOption = target.options[target.selectedIndex]?.text || target.value;
      const stepTitle = meta.customTitle || `Pilih opsi "${selectedOption}" pada dropdown "${label}"`;
      const actionDesc = `Pengguna memilih opsi [${selectedOption}] pada dropdown [${label}].`;
      const expected = meta.customExpected || `Opsi [${selectedOption}] terpilih.`;

      (async () => {
        let screenshot = '';
        if (sessionData.autoScreenshot === true) {
          let cleanupHighlight = () => {};
          if (sessionData.autoHighlight) {
            cleanupHighlight = await highlightElement(target);
          }
          screenshot = await captureScreenshot();
          cleanupHighlight();
        }

        safeSendMessage({
          type: 'ADD_STEP',
          step: {
            title: stepTitle,
            actionDescription: actionDesc,
            inputData: selectedOption,
            expectedResult: expected,
            actual: 'Opsi berhasil dipilih.',
            status: 'Pass',
            metadata: meta,
            screenshot: screenshot
          }
        });

        showToast('✔ Pilihan: ' + selectedOption);
      })();
    }
  }
  // Dynamic event listeners

  function escapeHtml(text) {
    if (!text) return '';
    return text.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
})();