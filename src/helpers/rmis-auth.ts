import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { ensureOrmsAuthenticated, OrmsAuthOptions } from './orms-auth';

const rmisAuthFile = path.resolve(process.cwd(), '.auth/user_rmis_admin.json');
const ormsAuthFile = path.resolve(process.cwd(), '.auth/user_orms_admin.json');

export { OrmsAuthOptions as RmisAuthOptions };

/**
 * Helper autentikasi untuk Risk Management Information System (RMIS)
 */
export async function ensureRmisAuthenticated(page: Page, options: OrmsAuthOptions = {}) {
  const username = options.username || process.env.RMIS_USERNAME || process.env.ORMS_USERNAME || 'Admin';
  const password = options.password || process.env.RMIS_PASSWORD || process.env.ORMS_PASSWORD || 'AdminBni1234/';
  return ensureOrmsAuthenticated(page, { ...options, username, password });
}

/**
 * Helper navigasi terpadu ke halaman RMIS (otomatis menangani tombol portal jika muncul)
 */
export async function navigateToRmis(page: Page, targetUrl: string = '/') {
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
    const currentUrl = page.url();
    if (targetUrl && !currentUrl.endsWith(targetUrl) && !currentUrl.includes(targetUrl)) {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(1000);
    }
    break;
  }
}

