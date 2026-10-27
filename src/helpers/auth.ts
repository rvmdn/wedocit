import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { wedocitConfig } from '../../wedocit.config';

export function getAuthFilePath(role: string = 'DEFAULT'): string {
  const safeRole = role.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  return path.resolve(process.cwd(), `.auth/user_${safeRole}.json`);
}

export interface EnsureAuthOptions {
  role?: string;
  username?: string;
  password?: string;
  loginType?: string;
  forceLogin?: boolean;
}

/**
 * Helper generik untuk memastikan browser terautentikasi sesuai role yang diminta
 */
export async function ensureAuthenticated(page: Page, options: EnsureAuthOptions = {}) {
  const roleName = options.role ? options.role.toUpperCase() : 'DEFAULT';
  const roleConfig = wedocitConfig.app.roles[roleName] || wedocitConfig.app.roles.DEFAULT;
  const authFile = getAuthFilePath(roleName);

  const username = options.username || process.env[roleConfig.usernameEnv] || roleConfig.defaultUsername;
  const password = options.password || process.env[roleConfig.passwordEnv] || roleConfig.defaultPassword;
  const loginType = options.loginType || (roleConfig.loginTypeEnv ? process.env[roleConfig.loginTypeEnv] : '') || roleConfig.defaultType || 'HQ';

  const loginPath = wedocitConfig.app.loginPath || '/login';
  const isCurrentlyOnLogin = page.url().includes(loginPath);

  // Jika dipaksa login, atau di halaman login, atau belum punya session file untuk role ini
  if (options.forceLogin || !fs.existsSync(authFile) || isCurrentlyOnLogin) {
    if (!username || !password) {
      console.warn(`[WeDocIt Auth] Kredensial untuk role ${roleName} belum lengkap di .env atau wedocit.config.`);
      return;
    }
    await loginWithRole(page, {
      role: roleName,
      username,
      password,
      loginType,
      authFile
    });
  }
}

/**
 * Eksekusi login generik berbasis konfigurasi wedocit.config.ts
 */
export async function loginWithRole(page: Page, params: {
  role: string;
  username: string;
  password: string;
  loginType?: string;
  authFile: string;
}) {
  const app = wedocitConfig.app;
  const selectors = app.selectors;

  console.log(`[WeDocIt Auth] Melakukan login sebagai Role [${params.role}] (User: ${params.username})...`);
  await page.goto(app.loginPath, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // 1. Isi Username & Password
  await page.locator(selectors.usernameInput).fill(params.username);
  await page.locator(selectors.passwordInput).fill(params.password);

  // 2. Pilih Type jika ada selector type
  if (selectors.typeSelect && params.loginType) {
    const trigger = page.locator(selectors.typeSelect);
    if (await trigger.isVisible({ timeout: 1500 }).catch(() => false)) {
      await trigger.click();
      await page.waitForTimeout(300);
      const opt = page.locator(`.p-select-option:has-text("${params.loginType}"), li:has-text("${params.loginType}")`).first();
      if (await opt.isVisible().catch(() => false)) {
        await opt.click();
      } else {
        await page.locator('.p-select-option, li').first().click();
      }
    }
  }

  // 3. Submit Login
  await page.locator(selectors.submitButton).first().click();
  await page.waitForTimeout(2500);

  // 4. Deteksi Auto-Reset Session jika dikonfigurasi
  if (app.autoResetSession) {
    const toastTexts = await getToastMessages(page);
    const hasConflict = toastTexts.some(t => t.toLowerCase().includes(app.autoResetSession!.detectKeyword.toLowerCase()));

    if (hasConflict) {
      const resetPass = (app.autoResetSession.resetPasswordEnv ? process.env[app.autoResetSession.resetPasswordEnv] : '') || app.autoResetSession.defaultResetPassword || 'ResetBni';
      console.log(`⚠️ [WeDocIt Auth] Terdeteksi sesi aktif [${app.autoResetSession.detectKeyword}].`);
      console.log(`🔄 [WeDocIt Auth] Menjalankan Auto-Reset Session untuk [${params.username}]...`);

      await page.locator(selectors.passwordInput).fill(resetPass);
      await page.locator(selectors.submitButton).first().click();
      await page.waitForTimeout(2000);

      const resetFeedback = await getToastMessages(page);
      console.log(`✔ [WeDocIt Auth] Status Reset: ${resetFeedback.join(' | ') || 'Sukses'}`);

      // Login ulang
      console.log(`🔑 [WeDocIt Auth] Login ulang dengan kredensial utama...`);
      await page.locator(selectors.usernameInput).fill(params.username);
      await page.locator(selectors.passwordInput).fill(params.password);
      if (selectors.typeSelect && params.loginType) {
        const trigger = page.locator(selectors.typeSelect);
        if (await trigger.isVisible().catch(() => false)) {
          await trigger.click();
          await page.waitForTimeout(300);
          await page.locator(`.p-select-option:has-text("${params.loginType}"), li:has-text("${params.loginType}")`).first().click();
        }
      }
      await page.locator(selectors.submitButton).first().click();
    }
  }

  // 5. Tunggu redirect sukses keluar dari loginPath
  try {
    await page.waitForURL((url) => !url.pathname.includes(app.loginPath), { timeout: 15000 });
    console.log(`🎉 [WeDocIt Auth] Role [${params.role}] berhasil masuk: ${page.url()}`);

    // Simpan session state khusus role ini
    const authDir = path.dirname(params.authFile);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
    await page.context().storageState({ path: params.authFile });
    console.log(`💾 [WeDocIt Auth] Sesi role [${params.role}] tersimpan di: ${params.authFile}`);
  } catch (err) {
    const errorToasts = await getToastMessages(page);
    console.error(`❌ [WeDocIt Auth] Gagal login role [${params.role}]: ${errorToasts.join(' | ') || 'Timeout'}`);
    throw err;
  }
}

async function getToastMessages(page: Page): Promise<string[]> {
  const toastSelector = wedocitConfig.app.selectors.toastMessage || '.p-toast-message';
  return await page.evaluate((sel) => {
    return Array.from(document.querySelectorAll(sel))
      .map(el => (el as HTMLElement).innerText?.trim())
      .filter(Boolean);
  }, toastSelector);
}
