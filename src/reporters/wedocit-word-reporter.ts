import { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';
import JSZip from 'jszip';
import { WeDocItMetadata, WeDocItStep, WeDocItTestCaseInfo } from '../fixtures/wedocit';
import { wedocitConfig } from '../../wedocit.config';

interface CollectedTestCase {
  id: string;
  tcNumberStr: string;
  title: string;
  scenarioName: string;
  expectedResult: string;
  role?: string;
  status: 'OK' | 'NOK';
  steps: WeDocItStep[];
}

export default class WeDocItWordReporter implements Reporter {
  private metadata: WeDocItMetadata = {
    ...wedocitConfig.metadata
  };

  private testCases: CollectedTestCase[] = [];

  onTestEnd(test: TestCase, result: TestResult) {
    let customMeta: WeDocItMetadata = {};
    let tcInfo: Partial<WeDocItTestCaseInfo> = {};
    const steps: WeDocItStep[] = [];

    // Parse annotations emitted by WeDocItContext
    for (const ann of test.annotations) {
      if (ann.type === 'wedocit_metadata' && ann.description) {
        try {
          customMeta = { ...customMeta, ...JSON.parse(ann.description) };
        } catch {}
      } else if (ann.type === 'wedocit_tc_info' && ann.description) {
        try {
          tcInfo = { ...tcInfo, ...JSON.parse(ann.description) };
        } catch {}
      } else if (ann.type === 'wedocit_step' && ann.description) {
        try {
          steps.push(JSON.parse(ann.description));
        } catch {}
      }
    }

    if (Object.keys(customMeta).length > 0) {
      this.metadata = { ...this.metadata, ...customMeta };
    }

    const tcIndex = this.testCases.length + 1;
    const tcNumberStr = tcInfo.tcNumberStr || `TC ${tcIndex}`;
    const status: 'OK' | 'NOK' = (result.status === 'passed') ? 'OK' : 'NOK';

    this.testCases.push({
      id: tcInfo.id || `tc_${Date.now()}_${tcIndex}`,
      tcNumberStr,
      title: tcInfo.title || test.title,
      scenarioName: tcInfo.scenarioName || test.title,
      expectedResult: tcInfo.expectedResult || 'Sistem merespons proses pengujian dengan benar.',
      role: tcInfo.role,
      status,
      steps
    });
  }

  async onEnd(result: FullResult) {
    console.log(`\n📄 [WeDocIt v2.0] Mengenerate Dokumen Word EDV BNI dari ${this.testCases.length} Test Case...`);
    
    const templatePath = path.resolve(process.cwd(), wedocitConfig.document?.templatePath || 'templates/template-bni-edv.docx');
    if (!fs.existsSync(templatePath)) {
      console.error(`❌ Template Word BNI EDV tidak ditemukan di: ${templatePath}`);
      return;
    }

    try {
      const templateBuffer = fs.readFileSync(templatePath);
      const zip = await JSZip.loadAsync(templateBuffer);

      // Pastikan fallback nilai metadata terisi dari konfigurasi dan environment
      if (process.env.DOC_TITLE) this.metadata.title = process.env.DOC_TITLE;
      if (process.env.DOC_MODULE) this.metadata.module = process.env.DOC_MODULE;
      if (process.env.DOC_SCOPE) this.metadata.scope = process.env.DOC_SCOPE;
      if (process.env.DOC_CR_NO) this.metadata.crNo = process.env.DOC_CR_NO;
      if (process.env.DOC_CRITERIA) this.metadata.acceptanceCriteria = process.env.DOC_CRITERIA;


      const devs = this.metadata.developers || [];
      let devHeaderFormatted = '';
      let devNamesOnly = '';
      let devNppOnly = '';
      if (devs.length > 0) {
        devHeaderFormatted = devs.map(d => `[${d.name || ''}] / ${d.npp || '-'}`).join('\n');
        devNamesOnly = devs.map(d => d.name || '').filter(Boolean).join('\n');
        devNppOnly = devs.map(d => d.npp || '').filter(Boolean).join('\n');
      } else {
        devHeaderFormatted = `[${this.metadata.testedBy || 'Developer'}] / ${this.metadata.npp || '-'}`;
        devNamesOnly = this.metadata.testedBy || 'Developer Team';
        devNppOnly = this.metadata.npp || '-';
      }

      const placeholderMap: Record<string, string> = {
        '[{developer}] / {npp}': devHeaderFormatted,
        '[{developer}]': `[${devNamesOnly}]`,
        '{developer}': devNamesOnly,
        '{npp}': devNppOnly,
        '[{tanggal_mulai}]': this.metadata.startDate || '',
        '{tanggal_mulai}': this.metadata.startDate || '',
        '[{tanggal_selesai}]': this.metadata.endDate || '',
        '{tanggal_selesai}': this.metadata.endDate || '',
        '{cr_unit_test}': this.metadata.crNo || 'CR: Unit Test',
        '{deskripsi_singkat}': this.metadata.shortDescription || '',
        '{judul_unit_test}': this.metadata.title || 'Unit Test Documentation',
        '{nama_aplikasi}': this.metadata.systemName || 'Aplikasi Web',
        '{tanggal_dokumen}': this.metadata.docDate || '',
        '{tahun}': this.metadata.copyrightYear || String(new Date().getFullYear()),
        '{bussiness_criteria}': this.metadata.acceptanceCriteria || '',
        '{scope_unit_test}': this.metadata.scope || ''
      };

      const escapeXml = (unsafe: string) => {
        if (!unsafe) return '';
        return String(unsafe)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
      };

      const formatScenarioWithTc = (tc: CollectedTestCase, idx: number) => {
        const tcTag = tc.tcNumberStr || `TC ${idx + 1}`;
        let baseScenario = (tc.scenarioName || tc.title || 'Skenario Pengujian').trim();

        if (/^\[TC[-0-9\s]+\]/i.test(baseScenario)) return baseScenario;
        if (/^TC[-0-9\s]+[:.-]?\s*/i.test(baseScenario)) {
          const withoutPrefix = baseScenario.replace(/^TC[-0-9\s]+[:.-]?\s*/i, '').trim();
          return `[${tcTag}] ${withoutPrefix}`;
        }
        return `[${tcTag}] ${baseScenario}`;
      };

      const replaceDocxPlaceholders = (xmlStr: string, replacements: Record<string, string>) => {
        if (!xmlStr) return xmlStr;
        return xmlStr.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, (pXml) => {
          let fullText = '';
          const textMatches = pXml.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g) || [];
          textMatches.forEach(tTag => {
            fullText += tTag.replace(/^<w:t\b[^>]*>|<\/w:t>$/g, '');
          });

          let modified = false;
          let newText = fullText;
          for (const [key, val] of Object.entries(replacements)) {
            if (newText.includes(key)) {
              newText = newText.split(key).join(escapeXml(val));
              modified = true;
            }
          }

          if (!modified) return pXml;

          const formattedVal = newText.replace(/\n/g, '</w:t><w:br/><w:t>');
          let firstReplaced = false;
          return pXml.replace(/<w:t\b([^>]*)>([\s\S]*?)<\/w:t>/g, () => {
            if (!firstReplaced) {
              firstReplaced = true;
              return `<w:t xml:space="preserve">${formattedVal}</w:t>`;
            } else {
              return `<w:t></w:t>`;
            }
          });
        });
      };

      // Table 2.1 Repeater
      const expandTableRowRepeater = (xmlStr: string) => {
        if (!xmlStr) return xmlStr;
        return xmlStr.replace(/<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g, (trXml) => {
          if (!trXml.includes('{no}') && !trXml.includes('{test_case}') && !trXml.includes('{ekspektasi}')) {
            return trXml;
          }

          return this.testCases.map((tc, idx) => {
            const rowMap = {
              '{no}': String(idx + 1), // Nomor urut murni sekuensial
              '{skenario}': formatScenarioWithTc(tc, idx), // [TC-xxx] Scenario Name
              '{test_case}': tc.role ? `${tc.title} (Role: ${tc.role})` : tc.title,
              '{ekspektasi}': tc.expectedResult || 'Berhasil',
              '{result}': tc.status || 'OK'
            };
            return replaceDocxPlaceholders(trXml, rowMap);
          }).join('');
        });
      };

      // Section 3.1 Process & Evidence Screenshots Injection
      const injectUnitTestProcess = async (xmlStr: string) => {
        if (!xmlStr) return xmlStr;

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

        for (let tcIdx = 0; tcIdx < this.testCases.length; tcIdx++) {
          const tc = this.testCases[tcIdx];
          const tcNum = tc.tcNumberStr || `TC ${tcIdx + 1}`;
          const roleSuffix = tc.role ? ` [Role: ${tc.role}]` : '';

          generatedXml += `
            <w:p>
              <w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
              <w:r>
                <w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="003366"/></w:rPr>
                <w:t xml:space="preserve">3.1.${tcIdx + 1} ${escapeXml(tcNum)}: ${escapeXml(tc.title)}${escapeXml(roleSuffix)}</w:t>
              </w:r>
            </w:p>
          `;

          const steps = tc.steps || [];
          for (let sIdx = 0; sIdx < steps.length; sIdx++) {
            const s = steps[sIdx];
            const sNum = sIdx + 1;
            const stepText = `${sNum}. ${s.actionDescription || s.title}` + (s.inputData && s.inputData !== '-' ? ` (Input: ${s.inputData})` : '');
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
                const base64Data = s.screenshot.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
                const uint8Data = Buffer.from(base64Data, 'base64');
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
                console.warn('Gagal embed gambar di docx:', eImg);
              }
            }
          }
        }

        if (relsFile) {
          zip.file('word/_rels/document.xml.rels', relsXml);
        }

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

      // Process word/document.xml
      const docXmlFile = zip.file('word/document.xml');
      if (docXmlFile) {
        let docXml = await docXmlFile.async('text');
        docXml = replaceDocxPlaceholders(docXml, placeholderMap);
        docXml = expandTableRowRepeater(docXml);
        docXml = await injectUnitTestProcess(docXml);
        zip.file('word/document.xml', docXml);
      }

      // Process headers & footers
      const headerFooterFiles = Object.keys(zip.files).filter(f => /word\/(header\d+|footer\d+)\.xml/i.test(f));
      for (const hfPath of headerFooterFiles) {
        const fileObj = zip.file(hfPath);
        if (fileObj) {
          let hfXml = await fileObj.async('text');
          hfXml = replaceDocxPlaceholders(hfXml, placeholderMap);
          zip.file(hfPath, hfXml);
        }
      }

      // Generate buffer and save
      const outputBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      const outputDir = path.resolve(process.cwd(), wedocitConfig.document?.outputDir || 'output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const safeModule = (this.metadata.module || this.metadata.title || 'Modul')
        .replace(/Unit Test Documentation\s*[-–:]\s*/i, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeCr = (this.metadata.crNo || 'CR').replace(/[^a-zA-Z0-9_-]/g, '_');
      const pattern = wedocitConfig.document?.filenamePattern || 'EDV_Unit_Test_{crNo}_{module}_V1.0.docx';
      const filename = pattern.replace('{crNo}', safeCr).replace('{module}', safeModule);
      let outputPath = path.join(outputDir, filename);

      try {
        fs.writeFileSync(outputPath, outputBuffer);
      } catch (err: any) {
        if (err.code === 'EBUSY') {
          const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
          const fallbackFilename = `EDV_Unit_Test_${safeCr}_${safeModule}_${timestamp}.docx`;
          outputPath = path.join(outputDir, fallbackFilename);
          fs.writeFileSync(outputPath, outputBuffer);
          console.log(`⚠️ File utama sedang dibuka di MS Word. Disimpan sebagai: ${fallbackFilename}`);
        } else {
          throw err;
        }
      }

      console.log(`\n🎉 [WeDocIt v2.0] DOKUMEN BERHASIL DIGENERATE!\n📁 File: ${outputPath}\n`);

    } catch (err: any) {
      console.error('❌ Gagal mengenerate dokumen Word:', err);
    }
  }
}
