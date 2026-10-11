// WeDocIt - Multi-Document & Multi-TC Studio
document.addEventListener('DOMContentLoaded', () => {
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
  const templateDocxFile = document.getElementById('template-docx-file');
  const btnChooseTemplate = document.getElementById('btn-choose-template');
  const lblTemplateName = document.getElementById('lbl-template-name');
  let customDocxTemplateBuffer = null;

  const metaEnv = document.getElementById('meta-env');
  const metaRes = document.getElementById('meta-res');
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
  const btnPrintPdf = document.getElementById('btn-print-pdf');
  const fileInputJson = document.getElementById('file-input-json');

  const modalZoom = document.getElementById('modal-zoom');
  const modalImg = document.getElementById('modal-img');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  // Sidebar Collapse / Expand Toggle
  const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
  const mainLayout = document.querySelector('.main-layout');

  btnToggleSidebar?.addEventListener('click', () => {
    if (mainLayout.classList.contains('sidebar-collapsed')) {
      mainLayout.classList.remove('sidebar-collapsed');
      btnToggleSidebar.textContent = '◀ Sembunyikan Metadata';
    } else {
      mainLayout.classList.add('sidebar-collapsed');
      btnToggleSidebar.textContent = '▶ Tampilkan Metadata';
    }
  });

  // Load State
  chrome.runtime.sendMessage({ type: 'GET_STATE', full: true }, (res) => {
    if (res && res.data) {
      sessionData = res.data;
      renderDocSelector();
      populateActiveDoc();
    }
  });

  function getActiveDoc() {
    const docs = sessionData.documents || [];
    let doc = docs.find(d => d.id === sessionData.activeDocId);
    if (!doc && docs.length > 0) {
      doc = docs[0];
      sessionData.activeDocId = doc.id;
    }
    return doc || { metadata: {}, testCases: [] };
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
  }

  // SWITCH DOCUMENT EVENT
  docSelector?.addEventListener('change', () => {
    const targetDocId = docSelector.value;
    chrome.runtime.sendMessage({ type: 'SWITCH_ACTIVE_DOC', docId: targetDocId }, (res) => {
      chrome.runtime.sendMessage({ type: 'GET_STATE', full: true }, (r) => { if (r && r.data) sessionData = r.data; populateActiveDoc(); });
      if (res && res.sessionData) {
        sessionData = res.sessionData;
        populateActiveDoc();
      }
    });
  });

  // CREATE NEW DOCUMENT EVENT
  btnCreateNewDoc?.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      let suggestedScenario = 'Pengujian Modul AMS FAST';
      let suggestedCr = 'CR: Unit Test';

      const proceedPrompt = (sc, cr) => {
        const scenario = prompt('Masukkan Nama Skenario Unit Test Baru:', sc);
        if (!scenario) return;
        const crNumber = prompt('Masukkan Nomor CR / Defect:', cr);
        chrome.runtime.sendMessage({
          type: 'CREATE_NEW_DOC',
          scenarioName: scenario,
          crNumber: crNumber || 'CR: Unit Test'
        }, (res) => {
          if (res && res.sessionData) {
            sessionData = res.sessionData;
            renderDocSelector();
            populateActiveDoc();
            alert('Dokumen Unit Test baru berhasil dibuat dan siap diuji!');
          }
        });
      };

      if (tabs && tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'SCAN_PAGE_CONTEXT' }, (res) => {
          try {
            if (chrome.runtime && chrome.runtime.lastError) {
              proceedPrompt(suggestedScenario, suggestedCr);
              return;
            }
          } catch (e) {}
          if (res && res.success && res.data) {
            proceedPrompt(res.data.scenarioName || suggestedScenario, 'CR: Unit Test - ' + (res.data.menuName || ''));
          } else {
            proceedPrompt(suggestedScenario, suggestedCr);
          }
        });
      } else {
        proceedPrompt(suggestedScenario, suggestedCr);
      }
    });
  });

  // DELETE DOCUMENT EVENT
  btnDeleteCurrentDoc?.addEventListener('click', () => {
    const activeDoc = getActiveDoc();
    if (confirm(`Yakin ingin menghapus dokumen "${activeDoc.metadata?.scenarioName || 'ini'}"?`)) {
      chrome.runtime.sendMessage({
        type: 'DELETE_DOC',
        docId: activeDoc.id
      }, (res) => {
        if (res && res.sessionData) {
          sessionData = res.sessionData;
          renderDocSelector();
          populateActiveDoc();
        }
      });
    }
  });

  function populateActiveDoc() {
    const doc = getActiveDoc();
    const m = doc.metadata || {};

    if (metaScenarioName) metaScenarioName.value = m.scenarioName || 'Perbaikan RAP (Manajemen Audit Reguler)';
    if (lblScenarioPreview) lblScenarioPreview.textContent = m.scenarioName || 'Perbaikan RAP';
    if (metaTitle) metaTitle.value = m.title || 'Fixing Temuan PTR Modul Audit Pendalaman';
    if (metaSystem) metaSystem.value = m.systemName || 'Audit Management System (AMS) Aplikasi FAST';
    if (metaTcId) metaTcId.value = m.testCaseId || 'CR: 52419';
    if (metaProjectNo) metaProjectNo.value = m.projectNo || '52419';
    if (metaProjectType) metaProjectType.value = m.projectType || 'CR';
    if (metaShortDesc) metaShortDesc.value = m.shortDescription || 'Perbaikan temuan PTR prioritas AMS FAST Fase 3 dan 4';
    if (metaStartDate) metaStartDate.value = m.startDate || '18 Agustus 2026';
    if (metaEndDate) metaEndDate.value = m.endDate || '03 September 2026';
    if (metaDate) metaDate.value = m.docDate || m.date || '21/10/2026';
    if (metaCopyrightYear) metaCopyrightYear.value = m.copyrightYear || '2026';

    if (metaEnv) metaEnv.value = m.environment || 'Development / SIT';
    if (metaRes) {
      if (!m.screenResolution || m.screenResolution === '1707x1067' || m.screenResolution === '1280x1024') {
        m.screenResolution = '1366x768';
      }
      metaRes.value = m.screenResolution;
    }
    if (metaObjective) metaObjective.value = m.objective || '';
    if (metaPrecondition) metaPrecondition.value = m.precondition || '';

    renderDevelopersList();
    renderCustomMetaFields();
    renderTestCases();
  }

  function renderDevelopersList() {
    if (!devListContainer) return;
    devListContainer.innerHTML = '';
    const doc = getActiveDoc();
    if (!doc.metadata.developers || !Array.isArray(doc.metadata.developers)) {
      doc.metadata.developers = [
        { name: "Irvan Ramadan", npp: "822117" },
        { name: "Raihanudin Rafif", npp: "822082" }
      ];
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

  // Template DOCX upload handling
  btnChooseTemplate?.addEventListener('click', () => {
    templateDocxFile?.click();
  });

  templateDocxFile?.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        customDocxTemplateBuffer = loadEvt.target.result;
        if (lblTemplateName) {
          lblTemplateName.textContent = '✅ ' + file.name;
          lblTemplateName.style.color = '#38bdf8';
        }
        alert(`Template "${file.name}" berhasil dimuat! Saat Anda klik "Ekspor Word", placeholder akan langsung di-replace ke dalam dokumen template ini.`);
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

  function saveActiveDocState() {
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
      environment: metaEnv ? metaEnv.value : '',
      screenResolution: metaRes ? (metaRes.value || '1366x768') : '1366x768',
      objective: metaObjective ? metaObjective.value : '',
      precondition: metaPrecondition ? metaPrecondition.value : '',
      customFields: doc.metadata.customFields || []
    };
    if (lblScenarioPreview) lblScenarioPreview.textContent = doc.metadata.scenarioName;
    chrome.runtime.sendMessage({
      type: 'UPDATE_STATE',
      payload: { documents: sessionData.documents }
    });
    renderDocSelector();
  }

  [metaScenarioName, metaTitle, metaSystem, metaTcId, metaProjectNo, metaProjectType, metaShortDesc, metaStartDate, metaEndDate, metaDate, metaCopyrightYear, metaEnv, metaRes, metaObjective, metaPrecondition].forEach(el => {
    el?.addEventListener('input', saveActiveDocState);
  });

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
        stepsHtml += `
          <div class="tc-substep-row">
            <div class="step-index-badge">${sIdx + 1}</div>
            <div class="step-info-col">
              <div class="step-title-text">${escapeHtml(s.title || 'Aktivitas ' + (sIdx + 1))}</div>
              <div class="step-action-desc">${escapeHtml(s.actionDescription || '')}</div>
              ${s.inputData && s.inputData !== '-' ? '<div class="step-input-badge">Input: <b>' + escapeHtml(s.inputData) + '</b></div>' : ''}
              <div>
                <button class="btn btn-outline btn-xs btn-del-step" data-tc="${tcIndex}" data-step="${sIdx}" style="margin-top: 5px; color: #ef4444; border-color: rgba(239, 68, 68, 0.4);">🗑 Hapus Langkah</button>
              </div>
            </div>
            <div class="step-img-col">
              ${s.screenshot ? `
                <div class="thumb-wrapper" title="Klik untuk memperbesar gambar">
                  <img src="${s.screenshot}" class="zoomable-img" />
                </div>
                <button class="btn btn-outline btn-xs btn-del-img" data-tc="${tcIndex}" data-step="${sIdx}" style="color: #94a3b8;">Hapus Gambar</button>
              ` : '<div style="color: #64748b; font-size: 10.5px; padding-top: 25px; font-style: italic;">Tidak ada screenshot</div>'}
            </div>
          </div>
        `;
      });

      tcCard.innerHTML = `
        <div class="tc-header-row">
          <div class="tc-badge-wrap">
            <div class="tc-num-badge">
              TC ${tc.tcNumber || (tcIndex + 1)}
            </div>
            <input type="text" class="tc-title-input" value="${escapeHtml(tc.title || 'Test Case ' + (tcIndex + 1))}" placeholder="Nama Test Case" />
          </div>
          <div class="tc-controls">
            <select class="tc-status-select ${(tc.status || 'OK').toLowerCase()}">
              <option value="OK" ${tc.status === 'OK' ? 'selected' : ''}>✅ OK</option>
              <option value="NOK" ${tc.status === 'NOK' ? 'selected' : ''}>❌ NOK</option>
              <option value="Pending" ${tc.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
            </select>
            <button class="btn btn-danger btn-xs btn-del-tc" title="Hapus Test Case ini">🗑 Hapus TC</button>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 14px;">
          <label style="font-weight: 600; font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px;">Hasil yang Diharapkan (Expected Result untuk TC ini):</label>
          <input type="text" class="form-control tc-expected-input" value="${escapeHtml(tc.expectedResult || '')}" placeholder="Hasil yang diharapkan..." />
        </div>

        <div style="margin-top: 10px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 12px; font-weight: 700; color: #cbd5e1;">Aktivitas & Evidens Screenshot (${steps.length} Langkah):</span>
            <button class="btn btn-outline btn-sm btn-add-substep" data-tc="${tcIndex}">➕ Tambah Langkah Manual</button>
          </div>
          <div class="tc-steps-list">
            ${stepsHtml || '<div style="color:#64748b; font-size:12px; font-style:italic; padding:12px 0;">Belum ada langkah/screenshot pada TC ini. Rekam menggunakan WeDocIt atau tambahkan langkah manual.</div>'}
          </div>
        </div>
      `;

      const titleInput = tcCard.querySelector('.tc-title-input');
      const statusSelect = tcCard.querySelector('.tc-status-select');
      const expectedInput = tcCard.querySelector('.tc-expected-input');
      const delTcBtn = tcCard.querySelector('.btn-del-tc');
      const addSubstepBtn = tcCard.querySelector('.btn-add-substep');

      titleInput?.addEventListener('input', () => {
        tc.title = titleInput.value;
        saveActiveDocState();
      });

      statusSelect?.addEventListener('change', () => {
        tc.status = statusSelect.value;
        saveActiveDocState();
      });

      expectedInput?.addEventListener('input', () => {
        tc.expectedResult = expectedInput.value;
        saveActiveDocState();
      });

      delTcBtn?.addEventListener('click', () => {
        if (confirm(`Hapus Test Case ${tc.tcNumber || (tcIndex + 1)} ("${tc.title}")?`)) {
          tcs.splice(tcIndex, 1);
          tcs.forEach((t, i) => t.tcNumber = i + 1);
          saveActiveDocState();
          renderTestCases();
        }
      });

      addSubstepBtn?.addEventListener('click', () => {
        if (!tc.steps) tc.steps = [];
        tc.steps.push({
          id: 'step_' + Date.now(),
          stepNumber: tc.steps.length + 1,
          title: 'Aktivitas ' + (tc.steps.length + 1),
          actionDescription: 'Deskripsi langkah pengujian...',
          inputData: '-',
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

      tcCard.querySelectorAll('.btn-del-step').forEach(btn => {
        btn.addEventListener('click', () => {
          const sIdx = parseInt(btn.dataset.step, 10);
          if (confirm('Hapus langkah ini?')) {
            tc.steps.splice(sIdx, 1);
            saveActiveDocState();
            renderTestCases();
          }
        });
      });

      tcCard.querySelectorAll('.btn-del-img').forEach(btn => {
        btn.addEventListener('click', () => {
          const sIdx = parseInt(btn.dataset.step, 10);
          tc.steps[sIdx].screenshot = '';
          saveActiveDocState();
          renderTestCases();
        });
      });

      stepsContainer.appendChild(tcCard);
    });
  }

  function addNewTestCase() {
    const doc = getActiveDoc();
    const tcs = doc.testCases || [];
    const nextNum = tcs.length + 1;
    tcs.push({
      id: 'tc_' + Date.now(),
      tcNumber: nextNum,
      title: 'Test Case ' + nextNum,
      expectedResult: 'Sistem merespons proses dengan benar dan berhasil.',
      status: 'OK',
      steps: []
    });
    doc.testCases = tcs;
    doc.activeTcId = tcs[tcs.length - 1].id;
    saveActiveDocState();
    renderTestCases();
  }

  btnAddStep?.addEventListener('click', addNewTestCase);

  btnResetSteps?.addEventListener('click', () => {
    if (confirm('Yakin ingin mereset seluruh langkah pada dokumen ini ke 0?')) {
      chrome.runtime.sendMessage({ type: 'RESET_ACTIVE_DOC' }, (res) => {
        sessionData = res.sessionData;
        populateActiveDoc();
      });
    }
  });

  modalCloseBtn?.addEventListener('click', () => modalZoom.classList.remove('active'));
  modalZoom?.addEventListener('click', (e) => {
    if (e.target === modalZoom) modalZoom.classList.remove('active');
  });

  // =========================================================================
  // EXPORT WORD: DUAL ENGINE (NATIVE DOCX TEMPLATE REPLACER + CLEAN DOC EXPORT)
  // =========================================================================
  btnExportWord?.addEventListener('click', async () => {
    saveActiveDocState();
    const doc = getActiveDoc();
    const meta = doc.metadata || {};
    const tcs = doc.testCases || [];
    const scenarioName = meta.scenarioName || 'Perbaikan RAP';
    const devs = meta.developers || [];

    // JIKA USER MEMILIH TEMPLATE DOCX (ATAU FILE TEMPLATE DIUNGGAH)
    if (customDocxTemplateBuffer && window.JSZip) {
      try {
        const zip = await JSZip.loadAsync(customDocxTemplateBuffer);
        
        // Helper replace XML string
        const replacePlaceholders = (xmlStr, isHeader = false) => {
          if (!xmlStr) return xmlStr;

          // Replace Project No & Type
          if (meta.projectNo) {
            xmlStr = xmlStr.replace(/52419/g, escapeHtml(meta.projectNo));
          }
          if (meta.projectType) {
            xmlStr = xmlStr.replace(/<w:t>CR<\/w:t>/g, `<w:t>${escapeHtml(meta.projectType)}</w:t>`);
          }

          // Replace Short Description
          if (meta.shortDescription) {
            xmlStr = xmlStr.replace(/Perbaikan temuan PTR prioritas AMS FAST Fase 3 dan 4/g, escapeHtml(meta.shortDescription));
          }

          // Replace Judul Dokumen & CR code di cover
          if (meta.title) {
            xmlStr = xmlStr.replace(/Fixing Temuan PTR Modul Audit Pendalaman/g, escapeHtml(meta.title));
          }
          if (meta.testCaseId) {
            xmlStr = xmlStr.replace(/CR:\s*XXXXX/g, escapeHtml(meta.testCaseId));
          }

          // Replace Dates
          if (meta.startDate) {
            xmlStr = xmlStr.replace(/18\s*Agustus\s*2026|18\s*Agustus\s*202\s*6/g, escapeHtml(meta.startDate));
          }
          if (meta.endDate) {
            xmlStr = xmlStr.replace(/03\s*September\s*2026|03\s*September\s*202\s*6/g, escapeHtml(meta.endDate));
          }
          if (meta.docDate) {
            xmlStr = xmlStr.replace(/21\/10\/2026/g, escapeHtml(meta.docDate));
          }
          if (meta.copyrightYear) {
            xmlStr = xmlStr.replace(/Copyright © \(2026\)/g, `Copyright © (${escapeHtml(meta.copyrightYear)})`);
          }

          // Replace / Format Developers List
          if (devs.length > 0) {
            const devHeaderStrings = devs.map(d => `[${d.name || ''}] / ${d.npp || '-'}`).join(' ');
            // Replace developer names di header
            xmlStr = xmlStr.replace(/\[\s*Irvan Ramadan\s*\]\s*\/\s*822117/g, devHeaderStrings);
            // Replace developer names di cover page
            if (devs[0] && devs[0].name) {
              xmlStr = xmlStr.replace(/Irvan Ramadan/g, escapeHtml(devs[0].name));
            }
          }

          return xmlStr;
        };

        // Update word/header1.xml
        const headerFile = zip.file('word/header1.xml');
        if (headerFile) {
          const headerXml = await headerFile.async('text');
          const updatedHeaderXml = replacePlaceholders(headerXml, true);
          zip.file('word/header1.xml', updatedHeaderXml);
        }

        // Update word/document.xml
        const docFile = zip.file('word/document.xml');
        if (docFile) {
          const docXml = await docFile.async('text');
          const updatedDocXml = replacePlaceholders(docXml, false);
          zip.file('word/document.xml', updatedDocXml);
        }

        // Generate and download modified docx
        const newDocxBlob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const url = URL.createObjectURL(newDocxBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (meta.testCaseId || 'Unit_Test').replace(/[^a-zA-Z0-9_-]/g, '_') + '_' + (scenarioName || 'AMS').replace(/[^a-zA-Z0-9_-]/g, '_') + '.docx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      } catch (err) {
        console.error('Error modifying docx template:', err);
        alert('Gagal memproses file template .docx. Beralih ke ekspor dokumen standar.');
      }
    }

    // FALLBACK / STANDAR EXPORT (HTML Word Document yang kompatibel 100% dengan MS Word)
    let tableRowsHtml = '';
    const totalTcs = tcs.length || 1;

    tcs.forEach((tc, idx) => {
      const statusColor = (tc.status === 'OK' || tc.status === 'Pass') ? '#047857' : ((tc.status === 'NOK' || tc.status === 'Fail') ? '#b91c1c' : '#b45309');
      
      tableRowsHtml += `
        <tr style="page-break-inside: avoid;">
          <td style="border: 1px solid #777; padding: 6px 8px; text-align: center; vertical-align: top; width: 5%;">
            ${idx + 1}
          </td>
          ${idx === 0 ? `
            <td rowspan="${totalTcs}" style="border: 1px solid #777; padding: 6px 8px; vertical-align: top; width: 35%; font-weight: bold;">
              ${escapeHtml(scenarioName)}
            </td>
          ` : ''}
          <td style="border: 1px solid #777; padding: 6px 8px; vertical-align: top; width: 25%;">
            ${escapeHtml(tc.title || 'TC ' + (idx + 1))}
          </td>
          <td style="border: 1px solid #777; padding: 6px 8px; vertical-align: top; width: 25%;">
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
          <h3 style="font-size: 12pt; color: #003366; margin: 0 0 4px 0; font-weight: bold;">
            ${idx + 1}. ${escapeHtml(tc.title || 'Test Case ' + (idx + 1))}
          </h3>
          <p style="font-size: 10pt; color: #444; margin: 0 0 10px 0;">
            <b>Hasil yang Diharapkan:</b> ${escapeHtml(tc.expectedResult || '')} | <b>Status:</b> <span style="font-weight:bold; color:${(tc.status === 'OK' || tc.status === 'Pass') ? '#047857' : '#b91c1c'};">${escapeHtml(tc.status || 'OK')}</span>
          </p>
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

        <h2>A. Business Requirements & Scope</h2>
        <table class="meta-table">
          <tr>
            <td class="meta-label">Aplikasi / Sistem</td>
            <td>${escapeHtml(meta.systemName)}</td>
            <td class="meta-label">Nomor CR / Defect</td>
            <td>${escapeHtml(meta.testCaseId)}</td>
          </tr>
          <tr>
            <td class="meta-label">Project No / Type</td>
            <td>${escapeHtml(meta.projectNo || '-')} (${escapeHtml(meta.projectType || 'CR')})</td>
            <td class="meta-label">Short Description</td>
            <td>${escapeHtml(meta.shortDescription || '-')}</td>
          </tr>
          <tr>
            <td class="meta-label">Skenario Uji Utama</td>
            <td colspan="3" style="font-weight: bold; color: #003366;">${escapeHtml(scenarioName)}</td>
          </tr>
          <tr>
            <td class="meta-label">Tim Developer / EDV</td>
            <td>${escapeHtml(devHeaderString || meta.author)}</td>
            <td class="meta-label">Periode Pengerjaan</td>
            <td>${escapeHtml(meta.startDate || '-')} s/d ${escapeHtml(meta.endDate || '-')}</td>
          </tr>
          <tr>
            <td class="meta-label">Environment Target</td>
            <td>${escapeHtml(meta.environment)}</td>
            <td class="meta-label">Resolusi Layar</td>
            <td>${escapeHtml(meta.screenResolution)}</td>
          </tr>
          ${customMetaRows}
          <tr>
            <td class="meta-label">Scope / Requirements</td>
            <td colspan="3">${escapeHtml(meta.objective).replace(/\n/g, '<br>')}</td>
          </tr>
          <tr>
            <td class="meta-label">Preparations</td>
            <td colspan="3">${escapeHtml(meta.precondition).replace(/\n/g, '<br>')}</td>
          </tr>
        </table>

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
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (meta.testCaseId || 'Unit_Test').replace(/[^a-zA-Z0-9_-]/g, '_') + '_' + (scenarioName || 'AMS').replace(/[^a-zA-Z0-9_-]/g, '_') + '.doc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    const scenarioName = meta.scenarioName || 'Perbaikan RAP';

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
      md += `| ${idx + 1} | ${scenarioName.replace(/\|/g, '-')} | ${(tc.title || '').replace(/\|/g, '-')} | ${(tc.expectedResult || '').replace(/\|/g, '-')} | **${tc.status || 'OK'}** |\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (meta.testCaseId || 'Unit_Test') + '.md';
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
          chrome.runtime.sendMessage({
            type: 'UPDATE_STATE',
            payload: sessionData
          }, () => {
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
});