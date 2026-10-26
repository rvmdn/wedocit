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
      document.removeEventListener('mousedown', onMouseDownHandler, true);
      document.removeEventListener('click', onClickHandler, true);
      document.removeEventListener('change', onChangeHandler, true);
      document.removeEventListener('input', onInputHandler, true);
      document.removeEventListener('focusout', onFocusOutHandler, true);
      window.removeEventListener('keydown', onKeydownHandler);
      if (inputDebounceTimer) { clearTimeout(inputDebounceTimer); inputDebounceTimer = null; }
      activePendingInput = null;
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
    const targetId = doc.activeTcId || sessionData.activeTcId;
    return tcs.find(t => t.id === targetId) || tcs[0] || { tcNumber: 1, title: 'TC 1', steps: [] };
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
        document.addEventListener('mousedown', onMouseDownHandler, true);
        document.addEventListener('click', onClickHandler, true);
        document.addEventListener('change', onChangeHandler, true);
        document.addEventListener('input', onInputHandler, true);
        document.addEventListener('focusout', onFocusOutHandler, true);
        isListenersAttached = true;
      }
      if (!toastObserver) {
        initNotificationObserver();
      }
    } else {
      if (isListenersAttached) {
        document.removeEventListener('mousedown', onMouseDownHandler, true);
        document.removeEventListener('click', onClickHandler, true);
        document.removeEventListener('change', onChangeHandler, true);
        document.removeEventListener('input', onInputHandler, true);
        document.removeEventListener('focusout', onFocusOutHandler, true);
        isListenersAttached = false;
      }
      if (inputDebounceTimer) { clearTimeout(inputDebounceTimer); inputDebounceTimer = null; }
      activePendingInput = null;
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
      tcId: getActiveTc()?.id,
      step: {
        title: `Notifikasi: "${summary || fullText}"`,
        actionDescription: `Sistem menampilkan pesan konfirmasi: "${fullText}".`,
        inputData: '-',
        expectedResult: `Sistem berhasil memproses aksi sebelumnya dan menyajikan pesan konfirmasi (${summary || fullText}).`,
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

      /* MODAL DIALOG SKENARIO & TC BARU */
      .wedocit-modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(15, 23, 42, 0.7);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2147483647;
      }
      .wedocit-modal-card {
        background: #0f172a;
        border: 1px solid #334155;
        border-radius: 12px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(56, 189, 248, 0.25);
        width: 480px;
        max-width: 92vw;
        padding: 20px 22px;
        color: #f8fafc;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        box-sizing: border-box;
      }
      .wedocit-modal-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: 14px;
      }
      .wedocit-modal-title {
        font-size: 14px;
        font-weight: 700;
        color: #38bdf8;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .wedocit-modal-subtitle {
        font-size: 11px;
        color: #94a3b8;
        margin-top: 3px;
        line-height: 1.4;
      }
      .wedocit-modal-close {
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 16px;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 4px;
      }
      .wedocit-modal-close:hover {
        background: #1e293b;
        color: #f8fafc;
      }
      .wedocit-form-group {
        margin-bottom: 12px;
      }
      .wedocit-form-label {
        display: block;
        font-size: 11px;
        font-weight: 600;
        color: #cbd5e1;
        margin-bottom: 5px;
      }
      .wedocit-form-hint {
        font-size: 10px;
        color: #64748b;
        margin-top: 3px;
      }
      .wedocit-input, .wedocit-textarea {
        width: 100%;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 6px;
        padding: 8px 10px;
        font-size: 12px;
        color: #f8fafc;
        outline: none;
        box-sizing: border-box;
        transition: border-color 0.15s;
        font-family: inherit;
      }
      .wedocit-input:focus, .wedocit-textarea:focus {
        border-color: #38bdf8;
        box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.25);
      }
      .wedocit-textarea {
        resize: vertical;
        min-height: 56px;
      }
      .wedocit-modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 16px;
      }
      .wedocit-btn-cancel {
        background: #1e293b;
        border: 1px solid #334155;
        color: #cbd5e1;
        padding: 6px 14px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }
      .wedocit-btn-cancel:hover {
        background: #334155;
        color: #fff;
      }
      .wedocit-btn-submit {
        background: linear-gradient(135deg, #0284c7, #6366f1);
        border: none;
        color: #fff;
        padding: 6px 16px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        box-shadow: 0 2px 6px rgba(2, 132, 199, 0.4);
      }
      .wedocit-btn-submit:hover {
        filter: brightness(1.15);
        transform: translateY(-1px);
      }
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
    const currentActiveTc = getActiveTc();
    const currentActiveTcId = currentActiveTc?.id || (activeDoc && activeDoc.activeTcId) || sessionData.activeTcId;
    let tcOptionsHtml = '';
    tcs.forEach((tc) => {
      const selected = tc.id === currentActiveTcId ? 'selected' : '';
      const numLabel = tc.tcNumberStr || ('TC ' + tc.tcNumber);
      tcOptionsHtml += `<option value="${tc.id}" ${selected}>${numLabel}: ${escapeHtml(tc.title || numLabel)}</option>`;
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
      const stepTitle = `Verifikasi Tampilan Antarmuka "${currentMenu}"`;
      const actionDesc = `Pengguna membuka dan meninjau seluruh tata letak (layout) serta komponen modul [${currentMenu}].`;
      const expected = `Halaman antarmuka [${currentMenu}] termuat dengan baik, tabel/data tersaji lengkap, dan seluruh kontrol fungsional aktif.`;
      const actual = `Seluruh komponen antarmuka modul [${currentMenu}] tampil secara lengkap dan siap digunakan.`;

      // 4. Tambahkan sebagai Langkah Baru di Test Case aktif
      safeSendMessage({
        type: 'ADD_STEP',
        tcId: getActiveTc()?.id,
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

  // 3. Prediksi lengkap Skenario -> Test Case -> Expected Result
  function predictFromScenario(scenarioName, nextNum = 1) {
    const title = predictTestCaseFromScenario(scenarioName, nextNum);
    const expected = predictExpectedFromTestCase(title);
    return { title, expected };
  }

  function openNewTcModal() {
    if (!shadowRoot) return;
    
    // Hapus modal lama jika ada
    const existing = shadowRoot.getElementById('wedocit-new-tc-modal');
    if (existing) existing.remove();

    const activeDoc = getActiveDoc();
    const tcs = activeDoc.testCases || [];
    const nextNum = tcs.length + 1;
    const context = scanPageContext();

    // 1. Judul Dokumen Unit Test (Terpisah dari nomor skenario)
    const currentDocTitle = activeDoc.metadata?.title || `Unit Test Documentation - ${context.menuName || 'Pelaksanaan Audit'}`;

    // 2. Skenario per nomor (Skenario ${nextNum})
    const rawSuggestedScenario = context.predictedScenario || context.scenarioName || context.menuName || `Pengujian Alur ${nextNum}`;
    const cleanSuggestedScenario = rawSuggestedScenario.replace(/^(TC\s*\d+[:.-]?|Skenario\s*\d*[:.-]?)\s*/i, '').trim();

    // 3. Test Case (Based on Skenario)
    const defaultTitle = predictTestCaseFromScenario(cleanSuggestedScenario, nextNum);

    // 4. Expected Result (Based on Test Case)
    const defaultExpected = predictExpectedFromTestCase(defaultTitle);

    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'wedocit-modal-backdrop';
    modalBackdrop.id = 'wedocit-new-tc-modal';
    modalBackdrop.innerHTML = `
      <div class="wedocit-modal-card" id="wedocit-modal-card">
        <div class="wedocit-modal-header">
          <div>
            <div class="wedocit-modal-title">
              <span>✨</span>
              <span>Skenario &amp; Test Case Baru (TC ${nextNum})</span>
            </div>
            <div class="wedocit-modal-subtitle">
              Skenario bernomor urut, Test Case diturunkan dari skenario, dan Expected Result disesuaikan dari test case:
            </div>
          </div>
          <button class="wedocit-modal-close" id="btn-modal-close" title="Batal (Esc)">✕</button>
        </div>

        <!-- INFORMASI DOKUMEN UNIT TEST (TETAP / KONSISTEN) -->
        <div style="background: rgba(15, 23, 42, 0.6); padding: 8px 12px; border-radius: 6px; border: 1px solid #334155; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
          <div style="font-size: 11.5px; color: #94a3b8; display: flex; align-items: center; gap: 6px;">
            <span>📄 Judul Dokumen:</span>
            <strong style="color: #38bdf8; font-weight: 600;">${escapeHtml(currentDocTitle)}</strong>
          </div>
          <span style="font-size: 10px; color: #64748b; background: rgba(51, 65, 85, 0.4); padding: 2px 6px; border-radius: 4px;">Tetap</span>
        </div>

        <!-- 2. SKENARIO (PER NOMOR) -->
        <div class="wedocit-form-group">
          <label class="wedocit-form-label" for="inp-modal-scenario">
            🎯 Skenario Pengujian (Skenario ${nextNum}):
          </label>
          <div style="display: flex; gap: 8px; align-items: center;">
            <span style="font-weight: 700; color: #38bdf8; font-size: 12.5px; white-space: nowrap; padding: 6px 10px; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 6px;">Skenario ${nextNum}:</span>
            <input type="text" class="wedocit-input" id="inp-modal-scenario" value="${escapeHtml(cleanSuggestedScenario)}" placeholder="Contoh: Propose Pendalaman / Persetujuan Alur" style="flex: 1;" />
          </div>
          <div class="wedocit-form-hint">Alur fitur spesifik Skenario ${nextNum}. Mengubah ini otomatis memperbarui Test Case &amp; Expected Result.</div>
        </div>

        <!-- 3. TEST CASE (BASED ON SKENARIO) -->
        <div class="wedocit-form-group">
          <label class="wedocit-form-label" for="inp-modal-title">
            📝 Test Case (Based on Skenario ${nextNum}):
          </label>
          <input type="text" class="wedocit-input" id="inp-modal-title" value="${escapeHtml(defaultTitle)}" placeholder="Contoh: Melakukan Propose Pendalaman" />
          <div class="wedocit-form-hint">Tindakan spesifik yang dilakukan pada skenario. Mengubah ini otomatis memperbarui Expected Result.</div>
        </div>

        <!-- 4. EXPECTED RESULT (BASED ON TEST CASE) -->
        <div class="wedocit-form-group">
          <label class="wedocit-form-label" for="inp-modal-expected">
            🎯 Hasil yang Diharapkan (Expected Result based on Test Case):
          </label>
          <textarea class="wedocit-textarea" id="inp-modal-expected" rows="3" placeholder="Contoh: Data berhasil diajukan dan status proses terkait terbarui di sistem...">${escapeHtml(defaultExpected)}</textarea>
        </div>

        <div class="wedocit-modal-actions">
          <button class="wedocit-btn-cancel" id="btn-modal-cancel">Batal</button>
          <button class="wedocit-btn-submit" id="btn-modal-submit">
            <span>💾</span>
            <span>Simpan &amp; Lanjut Rekam</span>
          </button>
        </div>
      </div>
    `;

    shadowRoot.appendChild(modalBackdrop);

    const inpScenario = shadowRoot.getElementById('inp-modal-scenario');
    const inpTitle = shadowRoot.getElementById('inp-modal-title');
    const inpExpected = shadowRoot.getElementById('inp-modal-expected');
    const btnClose = shadowRoot.getElementById('btn-modal-close');
    const btnCancel = shadowRoot.getElementById('btn-modal-cancel');
    const btnSubmit = shadowRoot.getElementById('btn-modal-submit');

    let userEditedTitle = false;
    let userEditedExpected = false;

    // Saat user mengetik / mengubah Test Case secara manual
    inpTitle?.addEventListener('input', () => {
      userEditedTitle = true;
      const currentTitle = inpTitle.value.trim();
      // Perbarui Expected Result berdasarkan Test Case jika user belum mengedit expected result secara spesifik
      if (!userEditedExpected && currentTitle) {
        inpExpected.value = predictExpectedFromTestCase(currentTitle);
      }
    });

    // Saat user mengetik / mengubah Expected Result secara manual
    inpExpected?.addEventListener('input', () => {
      userEditedExpected = true;
    });

    // Saat user mengetik / mengubah Skenario:
    // 1. Test case otomatis terisi based on skenario
    // 2. Expected result otomatis terisi based on test case yang dihasilkan
    inpScenario?.addEventListener('input', () => {
      const currentSc = inpScenario.value.trim();
      if (!currentSc) return;
      const derivedTitle = predictTestCaseFromScenario(currentSc, nextNum);
      if (!userEditedTitle) {
        inpTitle.value = derivedTitle;
      }
      if (!userEditedExpected) {
        inpExpected.value = predictExpectedFromTestCase(userEditedTitle ? inpTitle.value : derivedTitle);
      }
    });

    // Auto-focus & select text on scenario input
    setTimeout(() => {
      inpScenario?.focus();
      inpScenario?.select();
    }, 50);

    const closeModal = () => {
      modalBackdrop.remove();
      // Revert dropdown TC jika user membatalkan pilihan __NEW_TC__
      const selTc = shadowRoot?.getElementById('sel-active-tc');
      if (selTc && selTc.value === '__NEW_TC__') {
        const curDoc = getActiveDoc();
        selTc.value = (curDoc && curDoc.activeTcId) || sessionData.activeTcId || '';
      }
    };

    const submitNewTc = () => {
      const rawSc = inpScenario?.value?.trim() || cleanSuggestedScenario;
      const cleanSc = rawSc.replace(/^(TC\s*\d+[:.-]?|Skenario\s*\d*[:.-]?)\s*/i, '').trim();
      const finalScenario = `Skenario ${nextNum}: ${cleanSc}`;
      const finalTitle = inpTitle?.value?.trim() || defaultTitle;
      const finalExpected = inpExpected?.value?.trim() || defaultExpected;

      safeSendMessage({
        type: 'CREATE_NEXT_TC',
        scenarioName: finalScenario,
        title: finalTitle,
        expectedResult: finalExpected
      }, (res) => {
        if (res?.sessionData) {
          sessionData = res.sessionData;
          updateWidgetUI();
        }
        closeModal();
        showToast(`✨ TC ${res?.newTc?.tcNumber || nextNum} ("${finalScenario}") aktif!`);
      });
    };

    btnSubmit.onclick = (e) => {
      e.stopPropagation();
      submitNewTc();
    };

    btnCancel.onclick = (e) => {
      e.stopPropagation();
      closeModal();
    };

    btnClose.onclick = (e) => {
      e.stopPropagation();
      closeModal();
    };

    modalBackdrop.onclick = (e) => {
      if (e.target === modalBackdrop) {
        closeModal();
      }
    };

    // Keyboard support: Enter -> submit, Esc -> close
    const onModalKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        modalBackdrop.removeEventListener('keydown', onModalKeyDown);
        closeModal();
      } else if (e.key === 'Enter' && (e.target === inpScenario || e.target === inpTitle || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        modalBackdrop.removeEventListener('keydown', onModalKeyDown);
        submitNewTc();
      }
    };
    modalBackdrop.addEventListener('keydown', onModalKeyDown);
  }

  function attachWidgetEvents() {
    const selTc = shadowRoot?.getElementById('sel-active-tc');
    if (selTc) {
      selTc.onchange = (e) => {
        const val = e.target.value;
        if (val === '__NEW_TC__') {
          openNewTcModal();
        } else {
          // 1. Update in-memory state seketika agar tidak flicker / lompat kembali ke TC sebelumnya
          const doc = getActiveDoc();
          if (doc) doc.activeTcId = val;
          sessionData.activeTcId = val;

          // 2. Beritahu background service worker
          safeSendMessage({ type: 'SWITCH_ACTIVE_TC', tcId: val }, (res) => {
            if (res?.sessionData) {
              sessionData = res.sessionData;
            }
            const curDoc = getActiveDoc();
            if (curDoc) curDoc.activeTcId = val;
            sessionData.activeTcId = val;
            updateWidgetUI();
            const curTc = getActiveTc();
            const label = curTc.tcNumberStr || ('TC ' + curTc.tcNumber);
            showToast('🔄 Berpindah ke ' + label);
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
        openNewTcModal();
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

    // Deteksi profil pasif dari DOM UI (tanpa network call/fetch)
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
    let breadcrumbLast = '';
    let pageHeading = '';
    let activeTab = '';

    // 1. PrimeNG Breadcrumb (Used in AMS FAST layout)
    try {
      const bcNodes = document.querySelectorAll('.p-breadcrumb ul li, p-breadcrumb ul li, .p-breadcrumb-item, ol.breadcrumb li, .breadcrumb li');
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
          breadcrumbLast = texts[texts.length - 1];
          menuName = breadcrumbLast;
        }
      }
    } catch (e) {}

    // 2. Active Tabs / Sub-tabs / Steps (AMS FAST PrimeNG TabView, TabMenu, Steps, etc.)
    try {
      const activeTabEls = document.querySelectorAll(
        '.p-tabview-nav li.p-highlight, ' +
        '.p-tabmenu-nav li.p-highlight, ' +
        '.p-steps li.p-steps-current, ' +
        '.p-steps li.p-highlight, ' +
        '[role="tab"][aria-selected="true"], ' +
        '.nav-tabs .active, .tab-item.active'
      );
      const tabsFound = [];
      activeTabEls.forEach(el => {
        const txtEl = el.querySelector('.p-tabview-title, .p-menuitem-text, .p-steps-title') || el;
        const t = (txtEl.innerText || txtEl.textContent || '').trim();
        if (t && t.length > 1 && t.length < 60 && !tabsFound.includes(t)) {
          tabsFound.push(t);
        }
      });
      if (tabsFound.length > 0) {
        // Ambil tab paling spesifik (paling dalam / sub-tab aktif)
        activeTab = tabsFound[tabsFound.length - 1];
      }
    } catch (e) {}

    // 3. Active Sidebar Menu item (AMS FAST Sakai / Apollo template)
    try {
      if (!menuName) {
        const activeRoute = document.querySelector('.active-menuitem > a .layout-menuitem-text, a.active-route .layout-menuitem-text, .router-link-active, .layout-menuitem.active');
        if (activeRoute && activeRoute.innerText) {
          menuName = activeRoute.innerText.trim();
        }
      }
    } catch (e) {}

    // 4. Page Header / Heading / Card Title in main area
    try {
      const headingEl = document.querySelector('.layout-main h1, .layout-main h2, .layout-main h3, .layout-main .font-semibold.text-xl, .layout-main .text-2xl, .p-card-title, .p-panel-header, h1, h2');
      if (headingEl && headingEl.innerText) {
        pageHeading = headingEl.innerText.trim();
      }
    } catch (e) {}

    // 5. Document title or clean URL path
    const docTitle = document.title ? document.title.split(/[-–|]/)[0].trim() : '';
    const pathname = window.location.pathname || '';
    const pathSegments = pathname.split('/').filter(Boolean);
    const lastSegment = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : '';
    const cleanUrl = lastSegment ? lastSegment.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

    const finalMenu = menuName || pageHeading || docTitle || cleanUrl || 'Halaman AMS FAST';
    const finalBase = breadcrumbLast || pageHeading || finalMenu;

    // 0. Deteksi Dialog / Modal Aktif (PrimeNG p-dialog, swal, modal)
    let modalTitle = '';
    try {
      const activeDialog = document.querySelector('.p-dialog:not([style*="display: none"]), .p-confirm-dialog:not([style*="display: none"]), .p-sidebar.p-sidebar-active, .modal.show, .swal2-popup');
      if (activeDialog) {
        const titleEl = activeDialog.querySelector('.p-dialog-title, .p-dialog-header-title, .modal-title, .swal2-title, h1, h2, h3');
        if (titleEl && titleEl.innerText) {
          modalTitle = titleEl.innerText.trim();
        }
      }
    } catch (e) {}

    // Prediksi Nama Skenario & Hasil Diharapkan Berdasarkan Posisi Screen, Dialog & Tab
    let predictedScenario = '';
    let predictedTitle = '';
    let predictedExpected = '';

    if (modalTitle) {
      predictedScenario = modalTitle.replace(/^(Dialog|Modal|Formulir)\s*/i, '').trim();
      const pred = predictFromScenario(predictedScenario);
      predictedTitle = pred.title;
      predictedExpected = pred.expected;
    } else if (activeTab) {
      predictedScenario = `${finalBase} - ${activeTab}`;
      const pred = predictFromScenario(activeTab);
      predictedTitle = pred.title;
      predictedExpected = pred.expected;
    } else {
      predictedScenario = breadcrumbPath ? `${breadcrumbPath}` : finalBase;
      const pred = predictFromScenario(finalBase);
      predictedTitle = pred.title;
      const hasTable = !!document.querySelector('p-table, .p-datatable, table, .table');
      const hasForm = !!document.querySelector('form, p-dropdown, .p-inputtext');
      if (hasTable) {
        predictedExpected = `Halaman antarmuka ${finalBase} berhasil dimuat lengkap dengan seluruh komponen filter, tabel data, dan tombol aksi aktif.`;
      } else if (hasForm) {
        predictedExpected = `Formulir pengisian ${finalBase} siap menerima input pengujian dan proses validasi berjalan sesuai aturan bisnis.`;
      } else {
        predictedExpected = pred.expected;
      }
    }

    return {
      menuName: finalMenu,
      breadcrumbPath: breadcrumbPath,
      breadcrumbLast: breadcrumbLast,
      activeTab: activeTab,
      scenarioName: predictedScenario,
      predictedScenario: predictedScenario,
      predictedTitle: predictedTitle,
      predictedExpected: predictedExpected,
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

      // 1. Deteksi Tooltip & Directive Attributes (PrimeNG, Bootstrap, Angular)
      if (!label) {
        const tooltipVal = el.getAttribute('pTooltip') ||
                           el.getAttribute('ng-reflect-text') ||
                           el.getAttribute('data-pr-tooltip') ||
                           el.getAttribute('tooltip') ||
                           el.getAttribute('data-tooltip') ||
                           el.getAttribute('data-original-title');
        if (tooltipVal && tooltipVal.trim()) label = tooltipVal.trim();
      }

      // 2. Deteksi Chip / Filter Tag Remove
      if (!label && (el.closest('.p-chip-remove-icon') || el.classList.contains('p-chip-remove-icon'))) {
        const chip = el.closest('.p-chip');
        const chipTxt = chip?.querySelector('.p-chip-text')?.innerText || chip?.innerText;
        if (chipTxt && chipTxt.trim()) label = chipTxt.trim();
      }

      // 3. Deteksi Accordion Header Text
      if (!label && (el.closest('.p-accordion-header') || el.classList.contains('p-accordion-header'))) {
        const accHeader = el.closest('.p-accordion-header');
        const headerTxt = accHeader?.querySelector('.p-accordion-header-text')?.innerText || accHeader?.innerText;
        if (headerTxt && headerTxt.trim()) label = headerTxt.trim();
      }

      // 4. Deteksi Stepper / Steps Title
      if (!label && (el.closest('.p-steps-item') || el.classList.contains('p-steps-item'))) {
        const stepItem = el.closest('.p-steps-item');
        const titleTxt = stepItem?.querySelector('.p-steps-title')?.innerText || stepItem?.innerText;
        if (titleTxt && titleTxt.trim()) label = titleTxt.trim();
      }

      // 5. Deteksi Saklar Switch / Toggle
      if (!label && (el.closest('.p-inputswitch, .p-togglebutton') || el.classList.contains('p-inputswitch') || el.classList.contains('p-togglebutton'))) {
        const sw = el.closest('.p-inputswitch, .p-togglebutton');
        const nearbyLbl = sw?.closest('.p-field, .field')?.querySelector('label') || (sw?.id ? document.querySelector(`label[for="${sw.id}"]`) : null);
        if (nearbyLbl && nearbyLbl.innerText) label = nearbyLbl.innerText.trim();
      }

      // 6. Deteksi Header Kolom Tabel (Sortable)
      if (!label && (el.closest('.p-sortable-column') || el.classList.contains('p-sortable-column'))) {
        const th = el.closest('.p-sortable-column');
        if (th && th.innerText) label = th.innerText.trim();
      }

      // 7. Deteksi Icon Classes untuk Tombol Ikon (PrimeNG, FontAwesome, Bootstrap)
      if (!label) {
        const iconEl = el.querySelector('[class*="pi-"], [class*="fa-"], [class*="bi-"], [class*="icon-"]') || el;
        const classNames = (iconEl.className || '').toString();

        if (/pi-pencil|pi-edit|fa-pencil|fa-edit/i.test(classNames)) label = 'Ubah (Edit)';
        else if (/pi-trash|fa-trash/i.test(classNames)) label = 'Hapus (Delete)';
        else if (/pi-plus|fa-plus/i.test(classNames)) label = 'Tambah Data';
        else if (/pi-search|fa-search|pi-filter/i.test(classNames)) label = 'Cari / Filter';
        else if (/pi-download|fa-download/i.test(classNames)) label = 'Unduh';
        else if (/pi-upload|fa-upload/i.test(classNames)) label = 'Unggah';
        else if (/pi-check|fa-check/i.test(classNames)) label = 'Setujui (Approve)';
        else if (/pi-times|fa-times/i.test(classNames)) label = 'Tutup / Batal';
        else if (/pi-eye|fa-eye/i.test(classNames)) label = 'Lihat Detail';
        else if (/pi-refresh|fa-sync|fa-redo/i.test(classNames)) label = 'Refresh Data';
        else if (/pi-print|fa-print/i.test(classNames)) label = 'Cetak Dokumen';
        else if (/pi-save|fa-save/i.test(classNames)) label = 'Simpan';
        else if (/pi-arrow-left|pi-chevron-left/i.test(classNames)) label = 'Kembali';
        else if (/pi-cog|fa-cog/i.test(classNames)) label = 'Pengaturan';
        else if (/pi-copy|fa-copy/i.test(classNames)) label = 'Salin Data';
      }
    }

    // Forbid generic HTML tags like 'p', 'div', 'span' from becoming labels
    const genericTags = ['p', 'div', 'span', 'b', 'i', 'strong', 'em', 'small', 'td', 'tr', 'table', 'section', 'article', 'br'];
    if (!label || genericTags.includes(label.toLowerCase())) {
      if (el.tagName === 'BUTTON' || el.classList.contains('p-button')) {
        label = 'Tombol';
      } else if (el.tagName === 'A' || el.classList.contains('p-tabview-nav-link')) {
        label = 'Menu / Tautan';
      } else if (el.classList.contains('p-dropdown') || el.closest('.p-dropdown') || el.classList.contains('p-multiselect') || el.closest('.p-multiselect')) {
        label = 'Pilihan Dropdown';
      } else {
        label = 'Elemen UI';
      }
    }

    meta.computedLabel = label;
    return meta;
  }

  const EXCLUDED_FIELD_SELECTOR = `
    input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]),
    textarea, .p-inputtextarea,
    .ql-editor, p-editor, .p-editor, [contenteditable="true"],
    .p-inputtext, .p-calendar, .p-datepicker,
    .p-fileupload, .p-fileupload-choose, .p-fileupload-buttonbar,
    label
  `;

  const CLICKABLE_SELECTOR = `
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
    .p-accordion-header, .p-accordion-header-link,
    .p-steps-item, .p-steps-number, .p-steps-title,
    .p-breadcrumb a, .p-breadcrumb-item,
    .p-splitbutton-defaultbutton, .p-splitbutton-menubutton,
    .p-dropdown, .p-multiselect, .p-multiselect-label-container,
    .p-inputswitch, .p-inputswitch-slider, .p-togglebutton,
    input[type="checkbox"], input[type="radio"],
    .p-checkbox, .p-radiobutton,
    .p-paginator button, .p-paginator-page, .p-paginator-next, .p-paginator-prev, .p-paginator-first, .p-paginator-last,
    .p-sortable-column, th[pSortableColumn],
    .p-chip-remove-icon, .p-chip,
    .p-selectable-row, tbody tr
  `;

  let isWidgetPreHidden = false;
  let preHideTimer = null;

  function highlightElement(el) {
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
    // Paksa synchronous layout reflow agar border merah seketika ter-paint
    void highlight.offsetHeight;

    return () => {
      if (highlight.parentNode) highlight.parentNode.removeChild(highlight);
    };
  }

  function hideWidget() {
    isWidgetPreHidden = true;
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
    isWidgetPreHidden = false;
    if (preHideTimer) {
      clearTimeout(preHideTimer);
      preHideTimer = null;
    }
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

  // Pre-Hide di event mousedown: Sembunyikan widget lebih awal saat mouse ditekan
  function onMouseDownHandler(e) {
    if (!isExtensionValid()) {
      cleanupDeadExtension();
      return;
    }
    if (!sessionData.isRecording || sessionData.isPaused) return;
    if (rootContainer && rootContainer.contains(e.target)) return;

    const target = e.target;
    if (!target) return;

    if (target.closest(EXCLUDED_FIELD_SELECTOR)) return;

    const clickable = target.closest(CLICKABLE_SELECTOR);
    if (!clickable || clickable === document.body || clickable === document.documentElement) return;
    if (clickable.closest('.p-fileupload, .p-fileupload-choose')) return;

    // Sembunyikan widget seketika! Jeda fisik jari saat menekan tombol mouse (70-150ms)
    // memberi waktu bagi GPU browser untuk me-render layar bersih tanpa widget SEBELUM event click terjadi.
    hideWidget();

    // Safety timer: jika user batal klik / lepas mouse di luar target, kembalikan widget
    if (preHideTimer) clearTimeout(preHideTimer);
    preHideTimer = setTimeout(() => {
      if (!isCapturing) {
        showWidget();
      }
    }, 700);
  }

  let captureQueue = Promise.resolve();

  function captureScreenshot() {
    const doCapture = () => {
      return new Promise(async (resolve) => {
        if (!isExtensionValid()) {
          resolve('');
          return;
        }
        isCapturing = true;

        // Jika belum di-prehide (misal klik via keyboard Enter / touch tap), sembunyikan sekarang
        if (!isWidgetPreHidden) {
          hideWidget();
          if (document.body) void document.body.offsetHeight;
          await new Promise((r) => {
            requestAnimationFrame(() => {
              setTimeout(r, 40);
            });
          });
        }

        // Ambil screenshot seketika (< 3ms) sebelum SPA router membongkar halaman lama
        try {
          chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' }, (res) => {
            isCapturing = false;
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
          isCapturing = false;
          showWidget();
          resolve('');
        }
      });
    };

    const nextPromise = captureQueue.then(doCapture, doCapture);
    captureQueue = nextPromise.then(() => new Promise(r => setTimeout(r, 120)), () => new Promise(r => setTimeout(r, 120)));
    return nextPromise;
  }

  // Helper: Mengekstrak ringkasan field dalam modal / formulir aktif (khususnya field mandatory / berbintang)
  function getSurroundingFormSummary(btn) {
    let container = btn?.closest?.('.p-dialog, .swal2-popup, [role="dialog"], .p-tabview-panel[aria-hidden="false"], form, .p-card, .card');
    if (!container) {
      container = btn?.closest?.('section, main, .container, .p-component') || document.body;
    }

    const inputs = container.querySelectorAll('input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]), textarea, select, .ql-editor, p-dropdown');
    const mandatoryFields = [];
    const optionalFields = [];

    inputs.forEach(el => {
      if (rootContainer && rootContainer.contains(el)) return;
      if (el.offsetWidth === 0 && el.offsetHeight === 0 && !el.classList.contains('ql-editor')) return; // lewati elemen tersembunyi

      let label = '';
      let isMandatory = false;

      if (el.required || el.getAttribute('aria-required') === 'true' || el.classList.contains('p-invalid') || el.classList.contains('ng-invalid')) {
        isMandatory = true;
      }

      const parentField = el.closest('.p-field, .form-group, .field, tr, .col-12, .col-6, div');
      if (parentField) {
        const lblEl = parentField.querySelector('label, .p-label, th');
        if (lblEl) {
          label = lblEl.innerText.replace(/[*:]/g, '').trim();
          if (lblEl.innerText.includes('*') || lblEl.querySelector('.p-error, .text-danger, .required, .mandatory')) {
            isMandatory = true;
          }
        }
      }

      if (!label) {
        label = el.getAttribute('placeholder') || el.getAttribute('aria-label') || el.name || el.id || '';
      }

      let val = '';
      if (el.classList.contains('ql-editor')) {
        val = cleanAndExtractFieldValue(el);
      } else if (el.tagName.toUpperCase() === 'P-DROPDOWN' || el.classList.contains('p-dropdown')) {
        val = el.querySelector('.p-dropdown-label')?.innerText?.trim() || '';
      } else if (el.tagName.toUpperCase() === 'SELECT') {
        val = el.options[el.selectedIndex]?.text?.trim() || el.value?.trim() || '';
      } else {
        val = cleanAndExtractFieldValue(el);
      }

      if (val && val !== '-' && val !== 'Pilih' && val !== 'Select' && !val.startsWith('--')) {
        const cleanL = (label || 'Field').replace(/[*:]/g, '').trim();
        const fieldInfo = { label: cleanL, value: val, isMandatory };
        if (isMandatory) {
          mandatoryFields.push(fieldInfo);
        } else {
          optionalFields.push(fieldInfo);
        }
      }
    });

    return {
      mandatoryFields,
      optionalFields,
      totalFilled: mandatoryFields.length + optionalFields.length
    };
  }

  // Intelligent Semantic Wording Generator (Menghasilkan kalimat formal standar QA / Audit BNI)
  function generateSmartWording(el, meta, tagName) {
    let label = (meta.computedLabel || '').trim();
    const cleanLabel = label.replace(/^["'\[\]]+|["'\[\]]+$/g, '').trim();
    const lLower = cleanLabel.toLowerCase();

    let title = meta.customTitle || '';
    let action = '';
    let expected = meta.customExpected || '';
    let actual = 'Berhasil dieksekusi sesuai spesifikasi.';
    let inputData = '-';

    const formSummary = getSurroundingFormSummary(el);

    // 1. SIMPAN / SAVE / PERBARUI / REKAM
    if (/^(simpan|save|perbarui|update|rekam|simpan data|save changes)$/i.test(cleanLabel) || /simpan|save/i.test(lLower)) {
      title = title || (/^(simpan|save|rekam|perbarui)/i.test(cleanLabel) ? cleanLabel : `Simpan ${cleanLabel}`);
      if (formSummary.mandatoryFields.length > 0) {
        const mandList = formSummary.mandatoryFields.map(f => f.label).join(', ');
        action = `Pengguna melengkapi data wajib (${mandList}) dan menekan tombol "${cleanLabel}" untuk menyimpan perubahan data ke dalam sistem.`;
      } else {
        action = `Pengguna menekan tombol "${cleanLabel}" untuk menyimpan perubahan data ke dalam sistem.`;
      }
      expected = expected || `Sistem memvalidasi formulir dan berhasil menyimpan data dengan menampilkan pesan konfirmasi sukses.`;
      actual = `Data berhasil disimpan ke basis data sistem.`;
    }
    // 2. TAMBAH / CREATE / BARU / ADD / NEW / BUAT
    else if (/^(tambah|create|tambah data|baru|new|add|buat|tambah baru)$/i.test(cleanLabel) || /tambah|create|buat baru/i.test(lLower)) {
      title = title || (/^(tambah|create|baru|new|add|buat)/i.test(cleanLabel) ? cleanLabel : `Tambah ${cleanLabel}`);
      action = `Pengguna memilih tombol "${cleanLabel}" untuk memulai penginputan data baru.`;
      expected = expected || `Sistem merespons dengan menampilkan formulir input pembuatan data baru dalam kondisi siap diisi.`;
      actual = `Formulir tambah data berhasil dimuat.`;
    }
    // 3. UBAH / EDIT / MODIFY / PERBAIKI / KOREKSI
    else if (/^(ubah|edit|modify|koreksi|perbaiki)$/i.test(cleanLabel) || /edit|ubah/i.test(lLower)) {
      title = title || (/^(ubah|edit|modify|koreksi)/i.test(cleanLabel) ? cleanLabel : `Ubah Data ${cleanLabel}`);
      action = `Pengguna menekan tombol "${cleanLabel}" pada data terpilih untuk melakukan penyesuaian informasi.`;
      expected = expected || `Sistem memuat data eksisting ke dalam formulir pengubahan agar dapat disunting oleh pengguna.`;
      actual = `Formulir edit data ditampilkan dengan data eksisting lengkap.`;
    }
    // 4. HAPUS / DELETE / REMOVE / BATALKAN ITEM
    else if (/^(hapus|delete|remove|destroy)$/i.test(cleanLabel) || /hapus|delete/i.test(lLower)) {
      title = title || `Hapus Data Terpilih`;
      action = `Pengguna memilih tombol "${cleanLabel}" untuk menghapus item data yang dipilih.`;
      expected = expected || `Sistem memunculkan dialog konfirmasi penghapusan data sebelum mengeksekusi penghapusan.`;
      actual = `Dialog konfirmasi hapus muncul dengan tepat.`;
    }
    // 5. PROPOSE / KIRIM / SUBMIT / AJUKAN / REQUEST / FORWARD
    else if (/^(kirim|submit|ajukan|propose|request|forward)$/i.test(cleanLabel) || /submit|kirim|ajukan|propose|request|forward/i.test(lLower)) {
      const verb = /propose/i.test(lLower) ? 'propose' : (/submit/i.test(lLower) ? 'submit' : 'ajukan');
      title = title || (/^(melakukan)/i.test(cleanLabel) ? cleanLabel : `Melakukan ${cleanLabel}`);
      if (formSummary.mandatoryFields.length > 0) {
        const mandList = formSummary.mandatoryFields.map(f => f.label).join(', ');
        action = `Pengguna melengkapi data wajib (${mandList}) dan menekan tombol "${cleanLabel}" untuk memproses pengajuan.`;
        inputData = formSummary.mandatoryFields.map(f => `[Wajib] ${f.label}: "${f.value}"`).join('; ');
      } else {
        action = `Pengguna menekan tombol "${cleanLabel}" untuk memproses pengajuan ke tahap berikutnya.`;
        if (formSummary.optionalFields.length > 0) {
          inputData = formSummary.optionalFields.map(f => `${f.label}: "${f.value}"`).join('; ');
        }
      }
      expected = expected || `Data berhasil di-${verb} dan status proses terkait terbarui di sistem.`;
      actual = `Pengajuan "${cleanLabel}" berhasil diproses oleh sistem.`;
    }
    // 6. APPROVE / SETUJUI / VERIFIKASI / VALIDASI / REKOMENDASI
    else if (/^(setujui|approve|verifikasi|validasi|rekomendasi)$/i.test(cleanLabel) || /approve|setuju|verifikasi/i.test(lLower)) {
      title = title || `Persetujuan (Approve) Data`;
      action = `Pengguna melakukan persetujuan dengan menekan tombol "${cleanLabel}".`;
      expected = expected || `Sistem mencatat persetujuan pengguna dan memperbarui status dokumen menjadi Disetujui (Approved).`;
      actual = `Persetujuan berhasil dicatat oleh sistem.`;
    }
    // 7. TOLAK / REJECT / RETURN / KEMBALIKAN
    else if (/^(tolak|reject|kembalikan|return)$/i.test(cleanLabel) || /reject|tolak|kembalikan/i.test(lLower)) {
      title = title || `Penolakan (Reject) Pengajuan`;
      action = `Pengguna memilih opsi "${cleanLabel}" untuk menolak pengajuan atau mengembalikannya ke pemohon.`;
      expected = expected || `Sistem meminta catatan alasan penolakan dan memperbarui status pengajuan menjadi Ditolak / Perlu Perbaikan.`;
      actual = `Status penolakan pengajuan berhasil diproses.`;
    }
    // 8. RESET / BERSIHKAN / CLEAR (Harus dicek SEBELUM filter/cari)
    else if (/^(reset|bersihkan|clear|batal filter)$/i.test(cleanLabel) || /reset|clear|bersihkan/i.test(lLower)) {
      title = title || `Reset Parameter Pencarian`;
      action = `Pengguna memilih tombol "${cleanLabel}" untuk mengosongkan seluruh kriteria filter.`;
      expected = expected || `Seluruh kolom input filter dikosongkan dan tabel kembali menampilkan semua data semula.`;
      actual = `Filter berhasil direset ke kondisi default.`;
    }
    // 9. CARI / FILTER / TEMUKAN / SEARCH
    else if (/^(cari|filter|search|temukan|apply filter)$/i.test(cleanLabel) || /cari|search|filter/i.test(lLower)) {
      title = title || `Pencarian / Filter Data`;
      action = `Pengguna menekan tombol "${cleanLabel}" untuk menyaring data berdasarkan parameter filter yang ditentukan.`;
      expected = expected || `Sistem menyaring dan menyajikan daftar data tabel yang relevan sesuai kriteria pencarian.`;
      actual = `Hasil pencarian data berhasil ditampilkan pada tabel.`;
    }
    // 10. UNDUH / EXPORT / DOWNLOAD / CETAK / PRINT
    else if (/^(unduh|download|export|ekspor|cetak|print)$/i.test(cleanLabel) || /unduh|download|export|cetak/i.test(lLower)) {
      title = title || `Ekspor / Unduh Berkas Dokumen`;
      action = `Pengguna memilih aksi "${cleanLabel}" untuk mengunduh berkas laporan/dokumen dari sistem.`;
      expected = expected || `Sistem mengenerate berkas dokumen dan otomatis terunduh ke perangkat pengguna dengan format yang valid.`;
      actual = `Berkas dokumen berhasil diunduh tanpa kendala.`;
    }
    // 11. UNGGAH / UPLOAD / BROWSE / IMPORT
    else if (/^(unggah|upload|import|impor|pilih berkas)$/i.test(cleanLabel) || /upload|unggah|import/i.test(lLower)) {
      title = title || `Unggah Berkas Lampiran`;
      action = `Pengguna memilih tombol "${cleanLabel}" untuk melampirkan berkas dokumen ke dalam sistem.`;
      expected = expected || `Sistem memvalidasi berkas yang dipilih dan menampilkan pratinjau lampiran yang siap disimpan.`;
      actual = `Berkas lampiran berhasil dipilih dan diproses.`;
    }
    // 12. BATAL / KEMBALI / CANCEL / CLOSE / BACK / TUTUP
    else if (/^(batal|kembali|cancel|close|tutup|back)$/i.test(cleanLabel) || /batal|kembali|cancel|close|tutup/i.test(lLower)) {
      title = title || `Batal / Kembali ke Halaman Sebelumnya`;
      action = `Pengguna menekan tombol "${cleanLabel}" untuk membatalkan proses dan menutup dialog/halaman aktif.`;
      expected = expected || `Sistem menghentikan operasi tanpa menyimpan perubahan dan mengarahkan kembali ke tampilan sebelumnya.`;
      actual = `Operasi dibatalkan dan sistem kembali ke layar awal.`;
    }
    // 13. DETAIL / LIHAT / VIEW / RINCIAN / INFO
    else if (/^(lihat|detail|view|rincian|informasi|info)$/i.test(cleanLabel) || /detail|lihat|rincian/i.test(lLower)) {
      title = title || `Lihat Rincian Data`;
      action = `Pengguna memilih aksi "${cleanLabel}" untuk meninjau rincian informasi data terkait.`;
      expected = expected || `Sistem menampilkan pop-up atau halaman detail dengan informasi data yang lengkap.`;
      actual = `Rincian data berhasil ditampilkan secara detail.`;
    }
    // 14. REFRESH / MUAT ULANG / RELOAD / SYNC
    else if (/^(refresh|muat ulang|reload|sync|singkronisasi)$/i.test(cleanLabel) || /refresh|reload|sync/i.test(lLower)) {
      title = title || `Muat Ulang (Refresh) Data`;
      action = `Pengguna menekan tombol "${cleanLabel}" untuk memperbarui data terkini dari server.`;
      expected = expected || `Sistem melakukan pembaruan data dan menyajikan versi data yang paling mutakhir.`;
      actual = `Data tabel/halaman berhasil diperbarui.`;
    }
    // 15. JALUR BREADCRUMB
    else if (el.closest('.p-breadcrumb') || el.classList.contains('p-breadcrumb')) {
      title = title || `Navigasi Breadcrumb ke "${cleanLabel}"`;
      action = `Pengguna mengklik jalur navigasi breadcrumb [${cleanLabel}] untuk kembali ke hierarki modul terkait.`;
      expected = expected || `Sistem memuat halaman modul [${cleanLabel}] sesuai hierarki navigasi breadcrumb.`;
      actual = `Halaman hierarki [${cleanLabel}] berhasil dimuat.`;
    }
    // 16. ACCORDION (Buka / Tutup Panel)
    else if (el.closest('.p-accordion-header') || el.classList.contains('p-accordion-header')) {
      title = title || `Buka / Tutup Panel "${cleanLabel}"`;
      action = `Pengguna mengklik panel accordion [${cleanLabel}] untuk menampilkan atau menyembunyikan rincian bagian tersebut.`;
      expected = expected || `Panel accordion [${cleanLabel}] merespons dengan menampilkan atau menyembunyikan rincian konten secara dinamis.`;
      actual = `Panel accordion [${cleanLabel}] berhasil dibuka/ditutup.`;
    }
    // 17. STEPPER / LANGKAH PROSES
    else if (el.closest('.p-steps-item') || el.classList.contains('p-steps-item')) {
      title = title || `Pindah ke Tahap "${cleanLabel}"`;
      action = `Pengguna memilih tahapan alur [${cleanLabel}] pada stepper proses transaksi.`;
      expected = expected || `Sistem beralih ke tahapan alur [${cleanLabel}] dan memuat formulir yang sesuai.`;
      actual = `Tahapan alur [${cleanLabel}] aktif dan konten berhasil dimuat.`;
    }
    // 18. STRUKTUR POHON DATA (Tree Node)
    else if (el.closest('.p-treenode-content') || el.classList.contains('p-treenode-content')) {
      title = title || `Pilih Item Hirarki "${cleanLabel}"`;
      action = `Pengguna memilih simpul (node) [${cleanLabel}] pada struktur pohon hierarki data.`;
      expected = expected || `Simpul hierarki [${cleanLabel}] terpilih dan sistem menyajikan detail atau sub-item terkait.`;
      actual = `Node hierarki [${cleanLabel}] berhasil dipilih.`;
    }
    // 19. SAKLAR SWITCH / TOGGLE BUTTON
    else if (el.closest('.p-inputswitch, .p-togglebutton') || el.classList.contains('p-inputswitch') || el.classList.contains('p-togglebutton')) {
      title = title || `Alihkan (Toggle) Saklar "${cleanLabel}"`;
      action = `Pengguna menekan saklar switch [${cleanLabel}] untuk mengubah status pengaturan.`;
      expected = expected || `Status switch [${cleanLabel}] berhasil dialihkan dan status baru aktif di sistem.`;
      actual = `Status switch [${cleanLabel}] berhasil diperbarui.`;
    }
    // 20. MULTISELECT DROPDOWN
    else if (el.closest('.p-multiselect') || el.classList.contains('p-multiselect')) {
      title = title || `Buka Pilihan Multi-Select "${cleanLabel}"`;
      action = `Pengguna membuka panel multi-select [${cleanLabel}] untuk menentukan opsi-opsi yang diinginkan.`;
      expected = expected || `Sistem membuka overlay daftar opsi multi-select [${cleanLabel}] yang dapat dipilih.`;
      actual = `Daftar opsi multi-select [${cleanLabel}] berhasil dimuat.`;
    }
    // 21. CHIP / TAG FILTER REMOVE
    else if (el.closest('.p-chip-remove-icon') || el.classList.contains('p-chip-remove-icon')) {
      title = title || `Hapus Filter Tag "${cleanLabel}"`;
      action = `Pengguna menghapus tag filter [${cleanLabel}] dari parameter pencarian aktif.`;
      expected = expected || `Tag filter [${cleanLabel}] terhapus dan sistem memperbarui data tabel sesuai filter yang tersisa.`;
      actual = `Tag filter [${cleanLabel}] berhasil dihapus.`;
    }
    // 22. NAVIGASI / MENU SIDEBAR / TAB HEADER
    else if (tagName === 'A' || el.classList.contains('p-tabview-nav-link') || el.getAttribute('role') === 'tab' || el.closest('nav, aside, .sidebar, .layout-menuitem')) {
      const isTab = el.getAttribute('role') === 'tab' || el.classList.contains('p-tabview-nav-link');
      if (isTab) {
        title = title || `Pindah ke Tab "${cleanLabel}"`;
        action = `Pengguna beralih ke tab navigasi [${cleanLabel}] untuk melihat rincian kategori tersebut.`;
        expected = expected || `Sistem menampilkan konten dan formulir yang berada di bawah tab [${cleanLabel}].`;
        actual = `Tab [${cleanLabel}] aktif dan konten berhasil ditampilkan.`;
      } else {
        title = title || `Navigasi ke Menu "${cleanLabel}"`;
        action = `Pengguna memilih menu navigasi [${cleanLabel}] pada sidebar aplikasi.`;
        expected = expected || `Halaman diarahkan ke modul [${cleanLabel}] dan seluruh komponen termuat dengan lengkap.`;
        actual = `Halaman modul [${cleanLabel}] berhasil dimuat.`;
      }
    }
    // 16. DROPDOWN (PrimeNG Dropdown / Select)
    else if (el.classList.contains('p-dropdown') || el.closest('.p-dropdown')) {
      title = title || `Buka Pilihan "${cleanLabel}"`;
      action = `Pengguna mengklik dropdown [${cleanLabel}] untuk meninjau opsi yang tersedia.`;
      expected = expected || `Sistem membuka panel daftar opsi dropdown yang dapat dipilih.`;
      actual = `Daftar pilihan dropdown berhasil ditampilkan.`;
    }
    // 17. CHECKBOX / RADIO BUTTON
    else if (tagName === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio')) {
      const isChecked = el.checked;
      title = title || `${isChecked ? 'Centang' : 'Hapus centang'} Opsi "${cleanLabel}"`;
      action = `Pengguna ${isChecked ? 'mencentang' : 'menghapus centang'} opsi [${cleanLabel}].`;
      expected = expected || `Status opsi [${cleanLabel}] berhasil diperbarui menjadi ${isChecked ? 'Aktif (Checked)' : 'Tidak Aktif (Unchecked)'}.`;
      actual = `Status pilihan [${cleanLabel}] berhasil disesuaikan.`;
      inputData = isChecked ? 'Checked' : 'Unchecked';
    }
    // 18. BARIS TABEL (tr)
    else if (el.closest('tr')) {
      const tr = el.closest('tr');
      const tds = Array.from(tr.querySelectorAll('td'))
        .map(td => td.innerText ? td.innerText.trim().replace(/\s+/g, ' ') : '')
        .filter(t => t.length > 0 && t !== '-' && !/^(edit|hapus|detail|pilih|aksi|action)$/i.test(t));

      // Cari kolom teks yang bermakna (bukan sekadar nomor urut baris 1, 2, 3.. 7)
      const meaningfulCol = tds.find(t => !/^\d{1,3}$/.test(t) && t.length > 2);
      const rowLabel = meaningfulCol ? meaningfulCol.substring(0, 35) : '';

      if (rowLabel) {
        title = title || `Pilih Data [${rowLabel}]`;
        action = `Pengguna memilih data "${rowLabel}" yang akan diuji.`;
        expected = expected || `Sistem menandai data [${rowLabel}] dan menampilkan rincian data terkait.`;
        actual = `Data [${rowLabel}] berhasil dipilih.`;
        inputData = rowLabel;
      } else {
        title = title || 'Pilih Data yang Akan Diuji';
        action = 'Pengguna memilih data yang akan diuji.';
        expected = expected || 'Sistem menandai baris data yang dipilih dan menampilkan rincian data terkait.';
        actual = 'Data yang akan diuji berhasil dipilih.';
        inputData = '-';
      }
    }
    // 19. PAGINASI TABEL (PrimeNG Paginator)
    else if (el.closest('.p-paginator') || el.classList.contains('p-paginator-page') || el.classList.contains('p-paginator-next') || el.classList.contains('p-paginator-prev')) {
      if (el.classList.contains('p-paginator-next') || el.classList.contains('p-paginator-last')) {
        title = title || 'Navigasi ke Halaman Berikutnya';
        action = 'Pengguna berpindah ke halaman data berikutnya pada pagination tabel.';
        expected = expected || 'Sistem menampilkan baris data untuk halaman selanjutnya.';
        actual = 'Halaman berikutnya pada tabel berhasil dimuat.';
      } else if (el.classList.contains('p-paginator-prev') || el.classList.contains('p-paginator-first')) {
        title = title || 'Navigasi ke Halaman Sebelumnya';
        action = 'Pengguna kembali ke halaman data sebelumnya pada pagination tabel.';
        expected = expected || 'Sistem menampilkan baris data untuk halaman sebelumnya.';
        actual = 'Halaman sebelumnya pada tabel berhasil dimuat.';
      } else {
        const pageNum = el.innerText ? el.innerText.trim() : 'Terkait';
        title = title || `Pindah ke Halaman ${pageNum}`;
        action = `Pengguna memilih halaman ke-${pageNum} pada pagination tabel data.`;
        expected = expected || `Sistem menyajikan baris data untuk halaman ke-${pageNum}.`;
        actual = `Data halaman ke-${pageNum} berhasil ditampilkan.`;
      }
    }
    // 20. SORTING KOLOM TABEL
    else if (el.closest('.p-sortable-column') || el.classList.contains('p-sortable-column')) {
      const colHeader = el.innerText ? el.innerText.trim().replace(/\s+/g, ' ') : cleanLabel;
      title = title || `Urutkan Kolom [${colHeader}]`;
      action = `Pengguna mengklik header kolom [${colHeader}] untuk mengubah urutan (sorting) data tabel.`;
      expected = expected || `Sistem mengurutkan seluruh rekaman data pada tabel berdasarkan kolom [${colHeader}].`;
      actual = `Data tabel berhasil diurutkan berdasarkan kolom [${colHeader}].`;
    }
    // 21. DIALOG CLOSE BUTTON
    else if (el.closest('.p-dialog-header-close') || el.classList.contains('p-dialog-header-close')) {
      title = title || 'Tutup Jendela Dialog';
      action = 'Pengguna menutup jendela dialog pop-up yang sedang aktif.';
      expected = expected || 'Jendela dialog tertutup dan antarmuka kembali ke halaman utama.';
      actual = 'Jendela dialog berhasil ditutup.';
    }
    // 22. GENERAL FALLBACK DENGAN KONTEKS LOKAL (Menghindari "Klik 'Tombol'")
    else {
      let displayLabel = cleanLabel;
      const isGeneric = !displayLabel || /^(tombol|elemen ui|menu \/ tautan|aksi|button|klik)$/i.test(displayLabel);

      if (isGeneric) {
        // Ambil konteks terdekat (judul card, modal, atau form legend)
        const nearbyHeading = el.closest('.p-card, .card, fieldset, .p-panel, .p-dialog, form')
          ?.querySelector('.p-card-title, .card-title, legend, .p-panel-title, .p-dialog-title, h1, h2, h3, h4')
          ?.innerText?.trim();

        if (el.classList.contains('p-button-danger') || el.classList.contains('btn-danger')) {
          displayLabel = nearbyHeading ? `Batalkan / Hapus (${nearbyHeading.substring(0, 25)})` : 'Batalkan Tindakan';
        } else if (el.classList.contains('p-button-success') || el.classList.contains('btn-success')) {
          displayLabel = nearbyHeading ? `Konfirmasi (${nearbyHeading.substring(0, 25)})` : 'Konfirmasi Transaksi';
        } else if (nearbyHeading) {
          displayLabel = `Proses pada ${nearbyHeading.substring(0, 30)}`;
        } else {
          displayLabel = 'Proses Langkah Pengujian';
        }

        title = title || `${displayLabel}`;
        action = `Pengguna mengeksekusi aksi [${displayLabel}] untuk melanjutkan alur fungsionalitas sistem.`;
        expected = expected || `Sistem merespons proses [${displayLabel}] dengan mengeksekusi fungsi terkait secara akurat.`;
        actual = `Aksi [${displayLabel}] berhasil diproses oleh sistem.`;
      } else {
        title = title || `Aksi "${displayLabel}"`;
        action = `Pengguna menekan tombol atau opsi [${displayLabel}] untuk melanjutkan proses pengujian.`;
        expected = expected || `Sistem memproses tindakan [${displayLabel}] dan memperbarui antarmuka aplikasi.`;
        actual = `Tindakan [${displayLabel}] berhasil dieksekusi oleh sistem.`;
      }
    }

    if (inputData === '-') {
      if (formSummary.mandatoryFields.length > 0) {
        inputData = formSummary.mandatoryFields.map(f => `[Wajib] ${f.label}: "${f.value}"`).join('; ');
      } else if (formSummary.optionalFields.length > 0) {
        inputData = formSummary.optionalFields.map(f => `${f.label}: "${f.value}"`).join('; ');
      }
    }

    return { title, action, expected, actual, inputData };
  }

  // Click Handler
  function onClickHandler(e) {
    if (!isExtensionValid()) {
      cleanupDeadExtension();
      return;
    }
    if (!sessionData.isRecording || sessionData.isPaused) return;
    if (rootContainer && rootContainer.contains(e.target)) return;

    const target = e.target;
    if (!target) return;

    // 1. ABAIKAN FIELD INPUT TEKS, TEXTAREA, KOMENTAR, DATEPICKER, DAN UPLOAD FILE
    const isExcludedField = target.closest(EXCLUDED_FIELD_SELECTOR);
    if (isExcludedField) {
      return;
    }

    // 2. TANGKAP TOMBOL & LINK NAVIGASI / MENU SIDEBAR / TAB / CHECKBOX / RADIO
    const clickable = target.closest(CLICKABLE_SELECTOR);
    if (!clickable) {
      return;
    }

    // Jika ada input field/komentar yang baru saja selesai diketik sebelum tombol ditekan, commit segera nilainya
    if (activePendingInput) {
      commitPendingFieldInput();
    }

    // Pastikan bukan bagian dari uploader file dokumen
    if (clickable.closest('.p-fileupload, .p-fileupload-choose')) {
      return;
    }

    if (clickable === document.body || clickable === document.documentElement) return;

    if (preHideTimer) {
      clearTimeout(preHideTimer);
      preHideTimer = null;
    }

    const shouldCapture = sessionData.autoScreenshot === true || e.altKey === true;
    const meta = extractElementMetadata(clickable);
    const tagName = clickable.tagName.toUpperCase();

    // Generate wording kaya dan bervariasi sesuai semantik tombol / menu
    const wording = generateSmartWording(clickable, meta, tagName);

    (async () => {
      let screenshot = '';
      if (shouldCapture) {
        let cleanupHighlight = () => {};
        if (sessionData.autoHighlight !== false) {
          cleanupHighlight = highlightElement(clickable);
        }
        screenshot = await captureScreenshot();
        cleanupHighlight();
      }

      safeSendMessage({
        type: 'ADD_STEP',
        tcId: getActiveTc()?.id,
        step: {
          title: wording.title,
          actionDescription: wording.action,
          inputData: wording.inputData || '-',
          expectedResult: wording.expected,
          actual: wording.actual,
          status: 'Pass',
          screenshot: screenshot,
          metadata: meta
        }
      }, () => {
        showToast(`✔ "${wording.title}" tercatat!`);
      });
    })();
  }

  // =========================================================================
  // SISTEM DEBOUNCE INPUT & KOMENTAR (Mencegah Screenshot per Huruf)
  // Screenshot dan langkah HANYA dicatat saat masukan pengguna sudah FULL
  // =========================================================================
  let activePendingInput = null;
  let inputDebounceTimer = null;

  // Ekstrak nilai bersih teks dari elemen (termasuk PrimeNG p-editor / Quill / textarea)
  // Menghilangkan tag HTML, decode entities, dan membersihkan lampiran gambar base64 besar
  function cleanAndExtractFieldValue(element) {
    if (!element) return '';
    const isQuill = element.classList?.contains('ql-editor') || !!element.closest?.('.ql-editor');
    const actual = isQuill ? (element.classList?.contains('ql-editor') ? element : element.closest('.ql-editor')) : element;
    const tagName = actual.tagName ? actual.tagName.toUpperCase() : '';

    let rawVal = '';
    let hasImage = false;

    if (isQuill) {
      if (actual.querySelector && actual.querySelector('img')) {
        hasImage = true;
      }
      rawVal = (actual.innerText || actual.textContent || '').trim();
    } else if (tagName === 'TEXTAREA' || tagName === 'INPUT') {
      rawVal = (actual.value || '').trim();
    } else {
      if (actual.querySelector && actual.querySelector('img')) {
        hasImage = true;
      }
      rawVal = (actual.innerText || actual.textContent || actual.value || '').trim();
    }

    // Periksa apakah terdapat data gambar base64 (misal paste screenshot ke text area)
    if (/data:image\/[a-zA-Z]+;base64,/i.test(rawVal)) {
      hasImage = true;
      rawVal = rawVal.replace(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+/gi, ' ').trim();
    }

    // Bersihkan tag HTML (seperti <p>propose</p> dari Quill / Angular p-editor)
    let stripped = rawVal.replace(/<img[^>]*>/gi, ' ')
      .replace(/<\/p>|<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .trim();

    // Decode HTML entities umum
    stripped = stripped.replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"');
    stripped = stripped.replace(/\s+/g, ' ').trim();

    if (hasImage) {
      if (!stripped) {
        return '[Lampiran Gambar]';
      } else {
        return `${stripped} [Lampiran Gambar]`;
      }
    }

    // Batasi panjang nilai teks per field agar rapi dan tidak membengkak
    if (stripped.length > 200) {
      stripped = stripped.substring(0, 197) + '...';
    }

    return stripped;
  }

  // Deteksi label field secara cerdas (mencegah fallback generic seperti [Elemen UI])
  function detectFieldLabel(actualTarget, tagName, isQuill) {
    const meta = extractElementMetadata(actualTarget);
    let label = (meta.computedLabel || '').trim();

    // Jika label masih generic seperti "field", "input", "text", "elemen", "Elemen UI":
    if (!label || /^(field|input|text|elemen|elemen ui|ui)$/i.test(label)) {
      // 1. Cari dari container PrimeNG / form-group terdekat
      const container = actualTarget.closest('.p-field, .form-group, .field, p-editor, .p-editor-container, [formgroupname], tr, .col-12, .col-6, div');
      if (container) {
        const lbl = container.querySelector('label, .p-label, th, .form-label');
        if (lbl) label = lbl.innerText.trim();
      }
      // 2. Cari dari previous sibling elemen
      if (!label || /^(field|input|text|elemen|elemen ui|ui)$/i.test(label)) {
        const host = actualTarget.closest('p-editor, .p-editor-container, textarea, input');
        if (host && host.previousElementSibling) {
          const prev = host.previousElementSibling;
          if (prev.tagName === 'LABEL') {
            label = prev.innerText.trim();
          } else if (prev.querySelector('label')) {
            label = prev.querySelector('label').innerText.trim();
          }
        }
      }
      // 3. Dari atribut formControlName atau name atau id
      if (!label || /^(field|input|text|elemen|elemen ui|ui)$/i.test(label)) {
        const ctrl = actualTarget.getAttribute('formcontrolname') ||
          actualTarget.closest('[formcontrolname]')?.getAttribute('formcontrolname') ||
          actualTarget.getAttribute('name') ||
          actualTarget.getAttribute('id') || '';
        if (ctrl) {
          label = ctrl.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').trim();
          label = label.charAt(0).toUpperCase() + label.slice(1);
        }
      }
    }

    if (!label || /^(field|input|text|elemen|elemen ui|ui)$/i.test(label)) {
      label = actualTarget.getAttribute('placeholder') || actualTarget.getAttribute('aria-label') || '';
    }

    const clean = label.replace(/[*:]/g, '').trim();
    if (!clean || /^(field|input|text|elemen|elemen ui|ui)$/i.test(clean)) {
      return (tagName === 'TEXTAREA' || isQuill) ? 'Catatan / Komentar' : 'Input Data';
    }
    return clean;
  }

  // Eksekusi perekaman langkah input setelah masukan FULL / selesai diketik
  function commitPendingFieldInput() {
    if (inputDebounceTimer) {
      clearTimeout(inputDebounceTimer);
      inputDebounceTimer = null;
    }
    if (!activePendingInput) return;

    const target = activePendingInput.target;
    activePendingInput = null;

    if (!isExtensionValid()) {
      cleanupDeadExtension();
      return;
    }
    if (!sessionData.isRecording || sessionData.isPaused) return;
    if (rootContainer && rootContainer.contains(target)) return;
    if (!target) return;

    const isQuill = target.classList?.contains('ql-editor') || !!target.closest?.('.ql-editor');
    const actualTarget = isQuill ? (target.classList?.contains('ql-editor') ? target : target.closest('.ql-editor')) : target;
    const tagName = actualTarget.tagName ? actualTarget.tagName.toUpperCase() : '';

    const val = cleanAndExtractFieldValue(actualTarget);
    if (!val) return; // Kosong / hanya spasi / tag html kosong

    // Hindari duplikasi jika isi sama persis dengan yang sudah pernah di-commit
    const committedVal = actualTarget.dataset.__wedocit_committed_val || '';
    if (val === committedVal) return;

    actualTarget.dataset.__wedocit_committed_val = val;

    const cleanLabel = detectFieldLabel(actualTarget, tagName, isQuill);
    const meta = extractElementMetadata(actualTarget);
    if (!meta.computedLabel || /^(field|input|text|elemen|elemen ui|ui)$/i.test(meta.computedLabel)) {
      meta.computedLabel = cleanLabel;
    }

    const isMandatory = actualTarget.required ||
      actualTarget.getAttribute('aria-required') === 'true' ||
      actualTarget.classList.contains('p-invalid') ||
      actualTarget.classList.contains('ng-invalid') ||
      (meta.computedLabel && meta.computedLabel.includes('*')) ||
      !!actualTarget.closest('.p-field, .form-group, .field')?.querySelector('label .required, label .p-error, .text-danger, .mandatory');

    const isComment = /komentar|catatan|keterangan|alasan|tanggapan|note|remark|reason|comment|description/i.test(
      cleanLabel + ' ' + (actualTarget.placeholder || '') + ' ' + (actualTarget.name || '') + ' ' + (actualTarget.id || '') + ' ' + actualTarget.className
    ) || tagName === 'TEXTAREA' || isQuill;

    const shortVal = val.length > 60 ? val.substring(0, 57) + '...' : val;

    let stepTitle = '';
    let actionDesc = '';
    let expected = '';

    if (isComment) {
      stepTitle = `Input Komentar: [${cleanLabel}]`;
      actionDesc = `Pengguna memasukkan catatan/komentar pada field [${cleanLabel}]: "${val}".`;
      expected = `Field catatan/komentar [${cleanLabel}] berhasil terisi sesuai masukan pengguna.`;
    } else if (isMandatory) {
      stepTitle = `Input Field Wajib [${cleanLabel}]`;
      actionDesc = `Pengguna mengisi field wajib [${cleanLabel}] dengan nilai: "${val}".`;
      expected = `Field mandatory [${cleanLabel}] terisi lengkap dan tervalidasi dengan benar oleh sistem.`;
    } else {
      stepTitle = `Input [${cleanLabel}]: "${shortVal}"`;
      actionDesc = `Pengguna memasukkan nilai "${val}" pada field [${cleanLabel}].`;
      expected = `Nilai pada field [${cleanLabel}] berhasil diterima dan ditampilkan pada formulir.`;
    }

    const inputDataStr = isMandatory ? `[Wajib] ${val}` : val;

    safeSendMessage({
      type: 'ADD_STEP',
      tcId: getActiveTc()?.id,
      step: {
        title: stepTitle,
        actionDescription: actionDesc,
        inputData: inputDataStr,
        expectedResult: expected,
        actual: `Data ${isComment ? 'catatan/komentar' : 'input'} [${cleanLabel}] tersimpan pada formulir.`,
        status: 'Pass',
        metadata: meta,
        screenshot: '' // Pengisian field formulir tidak membutuhkan screenshot (cukup teks informatif)
      }
    }, () => {
      showToast(`✔ ${isComment ? 'Komentar' : 'Input'}: ${cleanLabel}`);
    });
  }

  // Antrekan input step: saat user mengetik, tunggu jeda (debounce) atau commit segera saat focusout
  function queueFieldInputStep(target, immediate) {
    if (!isExtensionValid()) {
      cleanupDeadExtension();
      return;
    }
    if (!sessionData.isRecording || sessionData.isPaused) return;
    if (rootContainer && rootContainer.contains(target)) return;
    if (!target) return;

    const isQuill = target.classList?.contains('ql-editor') || !!target.closest?.('.ql-editor');
    const actualTarget = isQuill ? (target.classList?.contains('ql-editor') ? target : target.closest('.ql-editor')) : target;
    const tagName = actualTarget.tagName ? actualTarget.tagName.toUpperCase() : '';

    if (!isQuill && tagName !== 'TEXTAREA' && tagName !== 'INPUT') return;
    if (tagName === 'INPUT' && /^(checkbox|radio|submit|button|file|image|reset)$/i.test(actualTarget.type || '')) return;

    // Bersihkan nilai saat ini, jika kosong maka tidak perlu antrekan pending
    const currentVal = cleanAndExtractFieldValue(actualTarget);
    if (!currentVal) return;

    activePendingInput = { target: actualTarget };

    if (inputDebounceTimer) {
      clearTimeout(inputDebounceTimer);
      inputDebounceTimer = null;
    }

    if (immediate) {
      // Focusout: User selesai mengisi dan berpindah field -> rekam SEGERA nilai akhirnya
      commitPendingFieldInput();
    } else {
      // Saat event input / change: tunda 1500ms dari ketukan terakhir (user selesai mengetik)
      inputDebounceTimer = setTimeout(() => {
        commitPendingFieldInput();
      }, 1500);
    }
  }

  // Listener event input (menangani pengetikan pada input, textarea, maupun rich text contenteditable)
  function onInputHandler(e) {
    if (!isExtensionValid()) {
      cleanupDeadExtension();
      return;
    }
    if (!sessionData.isRecording || sessionData.isPaused) return;
    if (rootContainer && rootContainer.contains(e.target)) return;

    const target = e.target;
    if (!target) return;
    const isQuill = target.classList?.contains('ql-editor') || !!target.closest?.('.ql-editor');
    const tagName = target.tagName ? target.tagName.toUpperCase() : '';
    if (isQuill || tagName === 'TEXTAREA' || tagName === 'INPUT') {
      queueFieldInputStep(target, false);
    }
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

    const tagName = target.tagName ? target.tagName.toUpperCase() : '';
    if (tagName === 'SELECT') {
      const meta = extractElementMetadata(target);
      const label = meta.computedLabel;
      const selectedOption = target.options[target.selectedIndex]?.text || target.value;
      const stepTitle = meta.customTitle || `Pilih [${label}]: "${selectedOption}"`;
      const actionDesc = `Pengguna menentukan pilihan "${selectedOption}" pada dropdown [${label}].`;
      const expected = meta.customExpected || `Sistem menerapkan opsi "${selectedOption}" dan memperbarui data/tampilan pada field [${label}].`;

      safeSendMessage({
        type: 'ADD_STEP',
        tcId: getActiveTc()?.id,
        step: {
          title: stepTitle,
          actionDescription: actionDesc,
          inputData: selectedOption,
          expectedResult: expected,
          actual: `Opsi "${selectedOption}" berhasil diterapkan.`,
          status: 'Pass',
          metadata: meta,
          screenshot: '' // Pemilihan opsi dropdown formulir tanpa screenshot
        }
      }, () => {
        showToast('✔ Pilihan: ' + selectedOption);
      });
    } else if (tagName === 'TEXTAREA' || tagName === 'INPUT') {
      // Debounce input text/textarea: jangan pernah rekam per huruf
      queueFieldInputStep(target, false);
    }
  }

  function onFocusOutHandler(e) {
    if (!isExtensionValid()) {
      cleanupDeadExtension();
      return;
    }
    if (!sessionData.isRecording || sessionData.isPaused) return;
    if (rootContainer && rootContainer.contains(e.target)) return;

    const target = e.target;
    if (!target) return;

    const tagName = target.tagName ? target.tagName.toUpperCase() : '';
    if (target.classList?.contains('ql-editor') || target.closest?.('.ql-editor') || tagName === 'TEXTAREA' || tagName === 'INPUT') {
      // Focusout: User selesai mengisi dan berpindah field -> rekam SEGERA nilai akhirnya
      queueFieldInputStep(target, true);
    }
  }
  // Dynamic event listeners

  function escapeHtml(text) {
    if (!text) return '';
    return text.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
})();