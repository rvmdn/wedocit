import { test as base, Page } from '@playwright/test';

export interface WeDocItMetadata {
  title?: string;
  module?: string;
  systemName?: string;
  projectName?: string;
  docNo?: string;
  crNo?: string;
  projectType?: string;
  shortDescription?: string;
  testedBy?: string;
  npp?: string;
  developers?: Array<{ name: string; npp: string }>;
  startDate?: string;
  endDate?: string;
  docDate?: string;
  copyrightYear?: string;
  scope?: string;
  acceptanceCriteria?: string;
  screenResolution?: string;
}

export interface WeDocItStep {
  title: string;
  actionDescription: string;
  inputData?: string;
  expectedResult?: string;
  screenshot?: string; // base64
  status?: 'READY' | 'MANUAL';
  note?: string;
}

export interface WeDocItTestCaseInfo {
  id?: string;
  tcNumberStr?: string;
  title: string;
  scenarioName?: string;
  expectedResult?: string;
  role?: string;
  status?: 'OK' | 'NOK' | 'Pass' | 'Fail';
}

export class WeDocItContext {
  private page: Page;
  private testInfo: any;
  private attemptedMutation: boolean = false;

  constructor(page: Page, testInfo: any) {
    this.page = page;
    this.testInfo = testInfo;
  }

  setMetadata(meta: WeDocItMetadata) {
    this.testInfo.annotations.push({
      type: 'wedocit_metadata',
      description: JSON.stringify(meta)
    });
  }

  setTestCase(info: Partial<WeDocItTestCaseInfo>) {
    this.testInfo.annotations.push({
      type: 'wedocit_tc_info',
      description: JSON.stringify(info)
    });
  }

  /**
   * Proteksi Mutasi Transaksional Sekali Eksekusi (Anti Double-Submit)
   * Mengadopsi standar audit safety untuk operasi simpan/approval/mutasi data.
   */
  async mutationOnce(options: {
    action: () => Promise<any>;
    matches: (res: any) => boolean;
    verify?: (res: any) => Promise<void> | void;
    timeout?: number;
  }) {
    if (this.attemptedMutation) {
      throw new Error('[WeDocIt Safety] Mutasi sebelumnya belum selesai atau sudah dieksekusi. Dilarang mengirim ulang (Anti Double-Submit).');
    }
    if (typeof options.matches !== 'function') {
      throw new Error('[WeDocIt Safety] Predicate HTTP response matches wajib disediakan.');
    }

    this.attemptedMutation = true;
    const timeout = options.timeout || 60000;

    try {
      const [response] = await Promise.all([
        this.page.waitForResponse(options.matches, { timeout }),
        options.action()
      ]);

      if (!response.ok()) {
        throw new Error(`[WeDocIt Safety] Respons mutasi gagal dengan HTTP Status: ${response.status()}`);
      }

      if (typeof options.verify === 'function') {
        await options.verify(response);
      }

      this.attemptedMutation = false;
      return response;
    } catch (err: any) {
      throw new Error(`[WeDocIt Safety] Mutasi gagal diverifikasi: ${err.message}`);
    }
  }

  async captureStep(options: {
    title: string;
    description?: string;
    input?: string;
    expected?: string;
    screenshot?: boolean;
    manual?: boolean;
    note?: string;
  }) {
    const isManual = options.manual === true;
    const takeScreenshot = !isManual && options.screenshot !== false;
    let screenshotBase64 = '';

    if (takeScreenshot) {
      const buffer = await this.page.screenshot({ fullPage: false });
      screenshotBase64 = `data:image/png;base64,${buffer.toString('base64')}`;
      
      await this.testInfo.attach(options.title, {
        body: buffer,
        contentType: 'image/png'
      });
    }

    const stepObj: WeDocItStep = {
      title: options.title,
      actionDescription: options.description || options.title,
      inputData: options.input || '-',
      expectedResult: options.expected || 'Sistem merespons proses dengan benar.',
      screenshot: screenshotBase64,
      status: isManual ? 'MANUAL' : 'READY',
      note: options.note || ''
    };

    this.testInfo.annotations.push({
      type: 'wedocit_step',
      description: JSON.stringify(stepObj)
    });
  }
}

export const test = base.extend<{ wedocit: WeDocItContext }>({
  wedocit: async ({ page }, use, testInfo) => {
    const wedocit = new WeDocItContext(page, testInfo);
    await use(wedocit);
  }
});

export { expect } from '@playwright/test';
