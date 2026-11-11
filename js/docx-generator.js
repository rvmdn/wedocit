/**
 * WeDocIt Studio - DOCX Template Replacer & Word XML Engine (Modular)
 * Menangani penggantian placeholder XML, injeksi tangkapan layar, dan pembentukan berkas Word (.docx).
 */

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


// Global binding
window.escapeHtml = escapeHtml;
window.escapeXml = escapeXml;
window.base64ToUint8Array = base64ToUint8Array;
window.blobToBase64 = blobToBase64;
window.generateCurrentDocxBlob = generateCurrentDocxBlob;
