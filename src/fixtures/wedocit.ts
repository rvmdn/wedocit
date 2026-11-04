import { test as base, Page, Locator } from '@playwright/test';

export interface WeDocItMetadata {
  docId?: string;
  title?: string;
  module?: string;
  systemName?: string;
  projectName?: string;
  companyName?: string;
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
  pageUrl?: string;
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

      return response;
    } catch (err: any) {
      throw new Error(`[WeDocIt Safety] Mutasi gagal diverifikasi: ${err.message}`);
    } finally {
      this.attemptedMutation = false;
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
    highlight?: Locator | string | (Locator | string)[];
    highlightColor?: 'red' | 'blue' | 'emerald' | 'amber' | string;
  }) {
    const isManual = options.manual === true;
    const takeScreenshot = !isManual && options.screenshot !== false;
    let screenshotBase64 = '';

    const cleanupFns: Array<() => Promise<void>> = [];

    // Inject outline kotak tebal pada elemen target sebelum screenshot
    if (takeScreenshot && options.highlight) {
      const targets = Array.isArray(options.highlight) ? options.highlight : [options.highlight];
      const colorMap: Record<string, { border: string; glow: string }> = {
        red: { border: '#ef4444', glow: 'rgba(239, 68, 68, 0.75)' },
        blue: { border: '#0284c7', glow: 'rgba(2, 132, 199, 0.75)' },
        emerald: { border: '#10b981', glow: 'rgba(16, 185, 129, 0.75)' },
        amber: { border: '#f59e0b', glow: 'rgba(245, 158, 11, 0.75)' }
      };

      const selected = colorMap[options.highlightColor || 'red'] || {
        border: options.highlightColor || '#ef4444',
        glow: 'rgba(239, 68, 68, 0.75)'
      };

      for (const target of targets) {
        try {
          const loc = typeof target === 'string' ? this.page.locator(target).first() : target;
          if (await loc.isVisible({ timeout: 1500 }).catch(() => false)) {
            await loc.evaluate((el: HTMLElement, styles: { border: string; glow: string }) => {
              (el as any).__wedocit_orig_outline = el.style.outline;
              (el as any).__wedocit_orig_offset = el.style.outlineOffset;
              (el as any).__wedocit_orig_shadow = el.style.boxShadow;

              el.style.outline = `3.5px solid ${styles.border}`;
              el.style.outlineOffset = '3px';
              el.style.boxShadow = `0 0 14px ${styles.glow}`;
            }, selected);

            cleanupFns.push(async () => {
              await loc.evaluate((el: HTMLElement) => {
                el.style.outline = (el as any).__wedocit_orig_outline || '';
                el.style.outlineOffset = (el as any).__wedocit_orig_offset || '';
                el.style.boxShadow = (el as any).__wedocit_orig_shadow || '';
              }).catch(() => {});
            });
          }
        } catch {}
      }

      if (cleanupFns.length > 0) {
        await this.page.waitForTimeout(100);
      }
    }

    try {
      if (takeScreenshot) {
        const buffer = await this.page.screenshot({ fullPage: false });
        screenshotBase64 = `data:image/png;base64,${buffer.toString('base64')}`;
        
        await this.testInfo.attach(options.title, {
          body: buffer,
          contentType: 'image/png'
        });
      }
    } finally {
      // Selalu bersihkan style highlight agar UI kembali normal
      for (const cleanup of cleanupFns) {
        await cleanup();
      }
    }

    const stepObj: WeDocItStep = {
      title: options.title,
      actionDescription: options.description || options.title,
      inputData: options.input || '-',
      expectedResult: options.expected || 'Sistem merespons proses dengan benar.',
      screenshot: screenshotBase64,
      pageUrl: this.page.url(),
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
