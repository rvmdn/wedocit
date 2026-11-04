import { test as baseTest, expect, Page, Locator } from '../../src/fixtures/wedocit';
import { ensureRmisAuthenticated } from '../../src/helpers/rmis-auth';
import * as path from 'path';
import * as fs from 'fs';

const rmisAuthFile = path.resolve(process.cwd(), '.auth/user_rmis_admin.json');
const legacyAuthFile = path.resolve(process.cwd(), '.auth/user_orms_admin.json');
const activeAuthFile = fs.existsSync(rmisAuthFile) ? rmisAuthFile : (fs.existsSync(legacyAuthFile) ? legacyAuthFile : undefined);

export const test = baseTest.extend({});
export { expect, Page, Locator };

export const commonTestConfig = {
  baseURL: process.env.RMIS_BASE_URL || process.env.ORMS_BASE_URL || 'http://localhost:4300',
  viewport: { width: 1366, height: 768 },
  storageState: activeAuthFile
};

export const v2DocMetadata = {
  docId: 'doc_administration_management_cr60133_v2',
  systemName: 'Risk Management Information System (RMIS)',
  projectName: 'Risk Management Information System (RMIS)',
  crNo: 'CR 60133',
  title: 'Unit Test Documentation - [RMIS] Administration Management V2.0 Master Data CRUD',
  module: 'Administration Management V2.0',
  scope: 'Pengembangan pada CR ini terdiri dari pengembangan frontend dan backend modul Administration Management pada aplikasi Risk Management Information System (RMIS) yang mencakup pengelolaan Unit Kerja & Unit PIC, Manajemen Role & Matriks Hak Akses (Permissions), Manajemen Menu Navigasi, Template Email Notifikasi, Pengelolaan Master Lookup (System, MIO, MRM, dan RBBR/TKB), Alur Kerja Persetujuan (Workflow Status & Steps), Utilitas Object Storage S3, serta Pemantauan Sesi Aktif dan Audit Trail.',
  shortDescription: 'Pengujian modular per skenario (Full CRUD Lifecycle: Create -> Read -> Update -> Delete) pada modul Admin Tools aplikasi Risk Management Information System (RMIS) V2.0.',
  testedBy: 'Dimas Raka Dewanggana',
  npp: '-'
};

export async function setupTest(page: Page, wedocit: any) {
  wedocit.setMetadata(v2DocMetadata);
  await ensureRmisAuthenticated(page);
}

/**
 * Helper navigasi terpadu ke halaman Administration Management RMIS
 */
export async function navigateToAdmin(page: Page, targetUrl: string) {
  await page.keyboard.press('Escape').catch(() => {});
  await page.evaluate(() => {
    document.querySelectorAll('vite-error-overlay').forEach(el => el.remove());
  }).catch(() => {});

  for (let attempt = 0; attempt < 3; attempt++) {
    const portalBtn = page.locator('text=Masuk ke Aplikasi RMIS, button:has-text("Masuk ke Aplikasi RMIS")').first();
    if (await portalBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await portalBtn.click({ force: true });
      await page.waitForTimeout(1500);
    }

    const passInput = page.locator('input[placeholder*="Password" i], input#password, input[type="password"]').first();
    const userInput = page.locator('input[placeholder*="Username" i], input#username, input[type="text"]').first();
    if (await passInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      if (await userInput.isEditable({ timeout: 1500 }).catch(() => false)) {
        await userInput.fill('Admin');
        await passInput.fill('AdminBni1234/');
        await page.evaluate(() => {
          document.querySelectorAll('vite-error-overlay').forEach(el => el.remove());
        }).catch(() => {});
        await page.locator('button:has-text("SIGN IN"), button[type="submit"]').first().click({ force: true });
        await page.waitForURL(url => !url.toString().includes('login'), { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(1500);
      }
    }

    if (!page.url().includes(targetUrl)) {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(1200);
    }

    await page.waitForSelector('.p-datatable-loading-overlay, p-progressSpinner, .p-progress-spinner', { state: 'detached', timeout: 5000 }).catch(() => {});
    const isTableReady = await page.locator('p-table, p-treeTable, table, .card').first().isVisible({ timeout: 5000 }).catch(() => false);
    if (isTableReady && !page.url().includes('portal') && !page.url().includes('login')) {
      return;
    }
    await page.waitForTimeout(800);
  }
}

/**
 * Helper penutup dialog modal secara aman dan tuntas (mencegah pointer interceptor)
 */
export async function closeModalIfOpen(page: Page) {
  await page.keyboard.press('Escape').catch(() => {});
  const closeBtn = page.locator('button:has-text("Close"), button:has-text("Cancel"), button:has-text("Tutup"), .p-dialog-header-close, button[aria-label="Close"], button.p-dialog-header-icon').first();
  if (await closeBtn.isVisible({ timeout: 1200 }).catch(() => false)) {
    await closeBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(400);
  }
  await page.keyboard.press('Escape').catch(() => {});
}
