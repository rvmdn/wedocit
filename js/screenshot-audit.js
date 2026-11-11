/**
 * WeDocIt Studio - Visual Screenshot Audit & Auto-Fix Modal Controller (Modular)
 */
function initScreenshotAuditModal() {
  // =========================================================================
  // VISUAL SCREENSHOT AUDIT & VERIFICATION CONTROLLER (WeDocIt Studio)
  // =========================================================================
  const btnAuditScreenshots = document.getElementById('btn-audit-screenshots');
  const modalAuditScreenshots = document.getElementById('modal-audit-screenshots');
  const btnCloseAuditModal = document.getElementById('btn-close-audit-modal');
  const btnCloseAuditModalBtn = document.getElementById('btn-close-audit-modal-btn');
  const auditOverallBadge = document.getElementById('audit-overall-badge');
  const statTotalSteps = document.getElementById('stat-total-steps');
  const statValidSteps = document.getElementById('stat-valid-steps');
  const statMismatchSteps = document.getElementById('stat-mismatch-steps');
  const statMissingSteps = document.getElementById('stat-missing-steps');
  const statDupSteps = document.getElementById('stat-dup-steps');
  const auditItemsContainer = document.getElementById('audit-items-container');
  const modalImgLightbox = document.getElementById('modal-img-lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const auditFilterBtns = document.querySelectorAll('.audit-filter-btn');

  let currentAuditItems = [];
  let currentAuditFilter = 'all';

  function renderAuditCards(filter = 'all') {
    if (!auditItemsContainer) return;
    currentAuditFilter = filter;

    auditFilterBtns.forEach(btn => {
      if (btn.dataset.filter === filter) {
        btn.classList.add('active');
        btn.style.background = '#0284c7';
        btn.style.color = '#fff';
      } else {
        btn.classList.remove('active');
        btn.style.background = '#1e293b';
        btn.style.color = btn.dataset.filter === 'issues' ? '#f87171' : (btn.dataset.filter === 'ok' ? '#34d399' : '#cbd5e1');
      }
    });

    const filtered = currentAuditItems.filter(item => {
      if (filter === 'all') return true;
      if (filter === 'issues') return item.issueType !== 'ok';
      if (filter === 'ok') return item.issueType === 'ok';
      return true;
    });

    if (filtered.length === 0) {
      auditItemsContainer.innerHTML = `
        <div style="text-align:center; padding:35px 16px; color:#94a3b8; background:#020617; border-radius:8px; border:1px dashed #334155;">
          <span style="font-size:26px;">✨</span>
          <div style="margin-top:8px; font-weight:700; font-size:13px; color:#f1f5f9;">Tidak ada langkah dalam filter ini.</div>
          <div style="font-size:11.5px; color:#64748b; margin-top:2px;">Semua screenshot langkah uji berada dalam kondisi valid.</div>
        </div>
      `;
      return;
    }

    auditItemsContainer.innerHTML = filtered.map(item => `
      <div class="audit-row-card ${item.cardClass}" data-issue="${item.issueType}">
        <!-- Col 1: TC & Step Badge -->
        <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
          <span style="background:#0284c7; color:#fff; font-weight:800; font-size:11px; padding:3px 7px; border-radius:5px; text-align:center; width:100%;">
            ${escapeHtml(item.tcNo)}
          </span>
          <span style="background:#1e293b; color:#94a3b8; font-weight:700; font-size:10.5px; padding:2px 6px; border-radius:4px; text-align:center; width:100%;">
            Step ${item.stepNo}
          </span>
        </div>

        <!-- Col 2: Step Details & URL -->
        <div style="display:flex; flex-direction:column; gap:4px; min-width:0;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-weight:700; color:#f8fafc; font-size:12.5px;">${escapeHtml(item.title)}</span>
          </div>
          <div style="font-size:11.5px; color:#cbd5e1; line-height:1.35;">
            <b style="color:#94a3b8;">Aksi:</b> ${escapeHtml(item.action)}
          </div>
          <div style="font-size:11.5px; color:#94a3b8; line-height:1.35;">
            <b style="color:#64748b;">Ekspektasi:</b> ${escapeHtml(item.expected)}
          </div>
          <div style="font-size:10.5px; color:#38bdf8; font-family:monospace; margin-top:2px; word-break:break-all;">
            🌐 <span style="color:#64748b;">URL:</span> ${escapeHtml(item.pageUrl || '(URL belum terekam)')}
          </div>
          ${item.issueDesc ? `
            <div style="margin-top:4px; padding:6px 10px; border-radius:6px; font-size:11px; font-weight:600; ${item.issueStyle}">
              ${item.issueDesc}
            </div>
          ` : ''}
        </div>

        <!-- Col 3: Thumbnail -->
        <div style="display:flex; justify-content:center; align-items:center;">
          ${item.img ? `
            <img src="${item.img}" class="audit-img-thumb" data-tc="${escapeHtml(item.tcNo)}" data-step="Step ${item.stepNo}: ${escapeHtml(item.title)}" title="Klik untuk memperbesar gambar" alt="Step ${item.stepNo}">
          ` : `
            <div class="audit-img-empty">
              <span style="font-size:20px;">📷</span>
              <span style="margin-top:4px;">Tidak ada SS</span>
            </div>
          `}
        </div>

        <!-- Col 4: Status Diagnosis -->
        <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-start;">
          <span style="padding:4px 10px; border-radius:6px; font-size:11px; font-weight:700; ${item.badgeStyle}">
            ${item.badgeText}
          </span>
          <span style="font-size:11px; color:#94a3b8; line-height:1.35;">
            ${item.diagnosisNote}
          </span>
          ${item.issueType !== 'ok' ? `
            <button class="btn btn-xs btn-auto-fix-single" data-tc="${escapeHtml(item.tcNo)}" style="margin-top:6px; background:linear-gradient(135deg, #7c3aed, #4f46e5); color:#fff; border:none; padding:4px 9px; border-radius:5px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px; box-shadow:0 2px 6px rgba(124,58,237,0.35);" title="Perbaiki &amp; Uji Ulang ${escapeHtml(item.tcNo)}">
              <span>⚡ Auto-Fix ${escapeHtml(item.tcNo)}</span>
            </button>
          ` : ''}
        </div>
      </div>
    `).join('');

    // Attach lightbox click listener
    auditItemsContainer.querySelectorAll('.audit-img-thumb').forEach(imgEl => {
      imgEl.addEventListener('click', () => {
        if (modalImgLightbox && lightboxImg) {
          lightboxImg.src = imgEl.src;
          if (lightboxCaption) {
            lightboxCaption.textContent = `[${imgEl.dataset.tc}] ${imgEl.dataset.step}`;
          }
          modalImgLightbox.style.display = 'flex';
        }
      });
    });

    // Attach Auto-Fix Single TC button listener
    auditItemsContainer.querySelectorAll('.btn-auto-fix-single').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const tcNo = btn.dataset.tc;
        await triggerAutoFixTc(tcNo, btn);
      });
    });
  }

  async function runSingleTestCase(tcNo, btnElement) {
    const origHtml = btnElement ? btnElement.innerHTML : '';
    if (btnElement) {
      btnElement.disabled = true;
      btnElement.innerHTML = `<span>⏳ Menjalankan...</span>`;
      btnElement.style.background = '#64748b';
    }

    try {
      const doc = getActiveDoc();
      const docId = doc ? doc.id : '';
      const specFile = doc?.metadata?.specFile || runnerSpecSelect?.value || '';

      const res = await fetch('/api/auto-repair-tc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId,
          tcNo,
          specFile,
          module: doc?.metadata?.module || doc?.metadata?.scenarioName || doc?.title || ''
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Gagal menjalankan pengujian skenario.');
      }

      loadFreshState(() => {
        alert(`🎉 Sukses!\n\nSkenario [${tcNo}] telah selesai dieksekusi secara otomatis.\nSeluruh bukti tangkapan layar baru otomatis diperbarui dan disinkronkan ke Dokumen Studio!`);
      });
    } catch (err) {
      alert(`⚠️ Gagal Menjalankan [${tcNo}]: ${err.message}`);
    } finally {
      if (btnElement) {
        btnElement.disabled = false;
        btnElement.innerHTML = origHtml;
        btnElement.style.background = 'linear-gradient(135deg, #0284c7, #2563eb)';
      }
    }
  }

  async function triggerAutoFixTc(tcNo, btnElement) {
    const origHtml = btnElement ? btnElement.innerHTML : '';
    if (btnElement) {
      btnElement.disabled = true;
      btnElement.innerHTML = `<span>⏳ Menjalankan Auto-Fix...</span>`;
    }

    try {
      const doc = getActiveDoc();
      const docId = doc ? doc.id : '';
      const specFile = doc?.metadata?.specFile || runnerSpecSelect?.value || '';

      const res = await fetch('/api/auto-repair-tc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId,
          tcNo,
          specFile,
          module: doc?.metadata?.module || doc?.metadata?.scenarioName || doc?.title || ''
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Gagal menjalankan perbaikan otomatis.');
      }

      loadFreshState(() => {
        openScreenshotAuditModal();
        alert(`🎉 ${data.message || 'Auto-Fix Berhasil!'}\n\nSeluruh bukti tangkapan layar untuk ${tcNo} telah diperbarui dengan alur dan data riil.`);
      });
    } catch (err) {
      alert(`⚠️ Auto-Fix Gagal: ${err.message}`);
    } finally {
      if (btnElement) {
        btnElement.disabled = false;
        btnElement.innerHTML = origHtml;
      }
    }
  }

  function computeImageSignature(str) {
    if (!str) return '';
    const len = str.length;
    let h1 = 0xdeadbeef;
    let h2 = 0x41c64e6d;
    const step = Math.max(1, Math.floor(len / 512));
    for (let i = 0; i < len; i += step) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return `${len}_${(h1 >>> 0).toString(16)}${(h2 >>> 0).toString(16)}`;
  }

  function openScreenshotAuditModal() {
    const doc = getActiveDoc();
    if (!doc) {
      alert('Tidak ada dokumen aktif untuk diaudit.');
      return;
    }
    const tcs = doc.testCases || [];

    let totalSteps = 0;
    let validSteps = 0;
    let mismatchSteps = 0;
    let missingSteps = 0;
    let dupSteps = 0;

    currentAuditItems = [];
    const seenImageSignatures = new Map();

    tcs.forEach((tc, tcIdx) => {
      const tcNo = tc.tcNumberStr || `TC-${tcIdx + 1}`;
      const tcTitle = tc.title || `Test Case ${tcIdx + 1}`;
      const steps = tc.steps || [];

      steps.forEach((st, sIdx) => {
        totalSteps++;
        const stepNo = st.stepNumber || (sIdx + 1);
        const title = st.title || `Langkah ${stepNo}`;
        const action = st.actionDescription || title || '';
        const expected = st.expectedResult || '';
        const pageUrl = st.pageUrl || doc?.metadata?.testUrl || 'http://localhost:4300/';
        const img = st.screenshot || st.image || '';

        let issueType = 'ok';
        let cardClass = 'status-ok';
        let badgeStyle = 'background:rgba(16,185,129,0.15); color:#34d399; border:1px solid rgba(16,185,129,0.3);';
        let badgeText = 'Sesuai ✅';
        let issueDesc = '';
        let issueStyle = '';
        let diagnosisNote = 'Tangkapan layar valid dan sesuai konteks pengujian.';

        // Heuristik 1: Screenshot Tidak Ada / Kosong
        if (!img || img.length < 50) {
          issueType = 'missing';
          cardClass = 'issue-missing';
          badgeStyle = 'background:rgba(245,158,11,0.15); color:#fbbf24; border:1px solid rgba(245,158,11,0.3);';
          badgeText = 'Kosong 🟡';
          issueDesc = '⚠️ Screenshot belum ada atau belum diambil oleh script pengujian.';
          issueStyle = 'background:rgba(245,158,11,0.12); color:#fbbf24; border:1px solid rgba(245,158,11,0.25);';
          diagnosisNote = 'Step membutuhkan screenshot bukti uji sebelum dokumen diekspor.';
          missingSteps++;
        }
        // Heuristik 2: Sesi Mental / Halaman Keliru (Portal RMIS / Login Screen)
        else if (
          pageUrl &&
          (pageUrl.includes('/portal') || pageUrl.includes('/login')) &&
          !action.toLowerCase().includes('portal') &&
          !action.toLowerCase().includes('login') &&
          !tcTitle.toLowerCase().includes('portal') &&
          !tcTitle.toLowerCase().includes('login')
        ) {
          issueType = 'mismatch';
          cardClass = 'issue-mismatch';
          badgeStyle = 'background:rgba(239,68,68,0.15); color:#f87171; border:1px solid rgba(239,68,68,0.3);';
          badgeText = 'Suspect Mismatch 🔴';
          issueDesc = `🔴 <b>Suspect Sesi Mental / Halaman Keliru:</b> Terdeteksi screenshot berada di <code>${pageUrl}</code>, padahal aksi pengujian adalah <i>"${action}"</i>. Kemungkinan form/modal belum selesai terbuka saat screenshot diambil.`;
          issueStyle = 'background:rgba(239,68,68,0.12); color:#fca5a5; border:1px solid rgba(239,68,68,0.25);';
          diagnosisNote = 'Periksa locator tombol dan pastikan modal/halaman target sudah terlihat (waitFor visible) sebelum captureStep.';
          mismatchSteps++;
        }
        // Heuristik 2.5: URL Belum Terekam / Layar Transisi Loading
        else if (pageUrl === 'about:blank' || pageUrl.trim() === '') {
          issueType = 'mismatch';
          cardClass = 'issue-mismatch';
          badgeStyle = 'background:rgba(239,68,68,0.15); color:#f87171; border:1px solid rgba(239,68,68,0.3);';
          badgeText = 'Suspect Loading 🔄';
          issueDesc = `🔄 <b>Suspect Layar Loading / about:blank:</b> Halaman pengujian belum selesai dimuat sempurna atau masih dalam transisi blank screen saat tangkapan layar diambil.`;
          issueStyle = 'background:rgba(239,68,68,0.12); color:#fca5a5; border:1px solid rgba(239,68,68,0.25);';
          diagnosisNote = 'Gunakan waitForSelector pada elemen tabel/modal dan pastikan loading spinner selesai sebelum captureStep.';
          mismatchSteps++;
        }
        // Heuristik 3: Screenshot Duplikat Persis pada Test Case yang Sama (Content Hash Fingerprint)
        else {
          const sig = computeImageSignature(img);
          const key = `${tcIdx}_${sig}`;
          if (sIdx > 0 && seenImageSignatures.has(key)) {
            issueType = 'duplicate';
            cardClass = 'issue-duplicate';
            badgeStyle = 'background:rgba(168,85,247,0.15); color:#c084fc; border:1px solid rgba(168,85,247,0.3);';
            badgeText = 'Duplikat 🟣';
            const prevStep = seenImageSignatures.get(key);
            issueDesc = `🟣 <b>Duplikat Persis:</b> Konten screenshot identik (${img.length.toLocaleString()} bytes) dengan Langkah ${prevStep}. Kemungkinan layar belum berubah atau aksi belum dieksekusi sebelum capture.`;
            issueStyle = 'background:rgba(168,85,247,0.12); color:#d8b4fe; border:1px solid rgba(168,85,247,0.25);';
            diagnosisNote = 'Pastikan ada interaksi UI (input/klik) yang terlihat sebelum mengambil screenshot langkah selanjutnya.';
            dupSteps++;
          } else {
            seenImageSignatures.set(key, stepNo);
            validSteps++;
          }
        }

        currentAuditItems.push({
          tcNo,
          tcTitle,
          stepNo,
          title,
          action,
          expected,
          pageUrl,
          img,
          issueType,
          cardClass,
          badgeStyle,
          badgeText,
          issueDesc,
          issueStyle,
          diagnosisNote
        });
      });
    });

    // Update Pill Statistics
    if (statTotalSteps) statTotalSteps.textContent = totalSteps;
    if (statValidSteps) statValidSteps.textContent = validSteps;
    if (statMismatchSteps) statMismatchSteps.textContent = mismatchSteps;
    if (statMissingSteps) statMissingSteps.textContent = missingSteps;
    if (statDupSteps) statDupSteps.textContent = dupSteps;

    // Update Overall Badge in Modal Header
    if (auditOverallBadge) {
      if (mismatchSteps > 0) {
        auditOverallBadge.textContent = `${mismatchSteps} Langkah Suspect 🔴`;
        auditOverallBadge.style.background = '#ef4444';
      } else if (missingSteps > 0) {
        auditOverallBadge.textContent = `${missingSteps} SS Kosong 🟡`;
        auditOverallBadge.style.background = '#f59e0b';
      } else if (dupSteps > 0) {
        auditOverallBadge.textContent = `${dupSteps} Duplikat 🟣`;
        auditOverallBadge.style.background = '#a855f7';
      } else {
        auditOverallBadge.textContent = '100% Sesuai & Valid 🟢';
        auditOverallBadge.style.background = '#10b981';
      }
    }

    renderAuditCards('all');

    if (modalAuditScreenshots) {
      modalAuditScreenshots.style.display = 'flex';
    }
  }

  const btnRunnerAuditSs = document.getElementById('btn-runner-audit-ss');
  btnAuditScreenshots?.addEventListener('click', openScreenshotAuditModal);
  btnRunnerAuditSs?.addEventListener('click', openScreenshotAuditModal);

  const btnSyncHeader = document.getElementById('btn-sync-header');
  const modalSyncProgress = document.getElementById('modal-sync-progress');
  const syncProgressBar = document.getElementById('sync-progress-bar');
  const syncStepText = document.getElementById('sync-step-text');
  const syncSpinner = document.getElementById('sync-spinner');
  const syncDoneIcon = document.getElementById('sync-done-icon');
  const syncModalTitle = document.getElementById('sync-modal-title');
  const syncModalSubtitle = document.getElementById('sync-modal-subtitle');
  const syncModalActions = document.getElementById('sync-modal-actions');
  const btnSyncModalClose = document.getElementById('btn-sync-modal-close');

  btnSyncModalClose?.addEventListener('click', () => {
    if (modalSyncProgress) modalSyncProgress.style.display = 'none';
  });

  btnSyncHeader?.addEventListener('click', async () => {
    if (!modalSyncProgress) return;

    // Reset modal UI ke initial state
    modalSyncProgress.style.display = 'flex';
    syncSpinner.style.display = 'block';
    syncDoneIcon.style.display = 'none';
    syncModalActions.style.display = 'none';
    syncModalTitle.textContent = 'Menyinkronkan Hasil Otomasi...';
    syncModalSubtitle.textContent = 'Menghubungkan ke backend dan memproses bukti tangkapan layar.';
    syncProgressBar.style.width = '15%';
    syncProgressBar.style.background = 'linear-gradient(90deg, #10b981, #06b6d4)';
    syncStepText.textContent = '1/4 Membaca data pengujian Playwright...';

    btnSyncHeader.disabled = true;

    try {
      await new Promise(r => setTimeout(r, 350));
      syncProgressBar.style.width = '45%';
      syncStepText.textContent = '2/4 Memproses bukti screenshot & pemetaan skenario...';

      const res = await fetch('/api/sync-results', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyinkronkan hasil.');
      }

      syncProgressBar.style.width = '80%';
      syncStepText.textContent = '3/4 Menyimpan perubahan ke workspace lokal...';
      await new Promise(r => setTimeout(r, 400));

      // 4/4 Refresh state studio secara mulus tanpa full page crash
      syncProgressBar.style.width = '100%';
      syncStepText.textContent = '4/4 Berhasil! Memperbarui tampilan Studio...';

      // Load fresh state in-memory
      loadFreshState(() => {
        syncSpinner.style.display = 'none';
        syncDoneIcon.style.display = 'block';
        syncModalTitle.textContent = 'Sinkronisasi Berhasil!';
        syncModalSubtitle.textContent = data.message || `Berhasil menyinkronkan ${data.tcCount || ''} Test Case ke Dokumen Studio.`;
        syncStepText.style.color = '#34d399';
        syncStepText.textContent = `✔ ${data.tcCount || 14} Test Case dan seluruh bukti tangkapan layar siap ditinjau.`;
        syncModalActions.style.display = 'flex';
      });

    } catch (err) {
      syncSpinner.style.display = 'none';
      syncDoneIcon.style.display = 'block';
      syncDoneIcon.textContent = '⚠️';
      syncModalTitle.textContent = 'Sinkronisasi Gagal';
      syncModalSubtitle.textContent = err.message;
      syncProgressBar.style.background = '#ef4444';
      syncStepText.style.color = '#f87171';
      syncStepText.textContent = `Error: ${err.message}`;
      syncModalActions.style.display = 'flex';
    } finally {
      btnSyncHeader.disabled = false;
    }
  });

  const closeAuditModal = () => {
    if (modalAuditScreenshots) modalAuditScreenshots.style.display = 'none';
  };
  btnCloseAuditModal?.addEventListener('click', closeAuditModal);
  btnCloseAuditModalBtn?.addEventListener('click', closeAuditModal);

  auditFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      renderAuditCards(btn.dataset.filter);
    });
  });

  const btnAutoFixAll = document.getElementById('btn-auto-fix-all');
  btnAutoFixAll?.addEventListener('click', async () => {
    const firstIssue = currentAuditItems.find(it => it.issueType !== 'ok');
    if (!firstIssue) {
      alert('Semua screenshot langkah uji saat ini sudah sesuai dan valid!');
      return;
    }
    await triggerAutoFixTc(firstIssue.tcNo, btnAutoFixAll);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScreenshotAuditModal);
} else {
  initScreenshotAuditModal();
}
