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

  async captureStep(options: {
    title: string;
    description?: string;
    input?: string;
    expected?: string;
    screenshot?: boolean;
  }) {
    const takeScreenshot = options.screenshot !== false;
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
      screenshot: screenshotBase64
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
