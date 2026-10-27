import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export const AUTH_FILE = path.resolve(__dirname, '../../.auth/user.json');

export interface LoginOptions {
  username?: string;
  password?: string;
  loginType?: string;
  resetPassword?: string;
}

/**
 * Helper untuk memastikan browser dalam kondisi terautentikasi (logged in)
 */
export async function ensureAuthenticated(page: Page, options: LoginOptions = {}) {
  const username = options.username || process.env.FAST_USERNAME;
  const password = options.password || process.env.FAST_PASSWORD;
  const loginType = options.loginType || process.env.FAST_LOGIN_TYPE || 'HQ';
  const resetPassword = options.resetPassword || process.env.FAST_RESET_PASSWORD || 'ResetBni';

  if (!username || !password) {
    console.log('\n[WeDocIt Auth] Menunggu sesi login...');
    console.log('Untuk menjalankan otomatis tanpa intervensi, sediakan FAST_USERNAME & FAST_PASSWORD di file .env.');
    return;
  }

  // Jika auth file sudah ada, lakukan verifikasi cepat
  if (fs.existsSync(AUTH_FILE)) {
    return;
  }

  // Jika belum ada session file, login sekarang
  await loginWithCredentials(page, { username, password, loginType, resetPassword });
}

/**
 * Melakukan proses login lengkap ke AMS FAST dev server dengan auto-reset jika sesi aktif bentrok
 */
export async function loginWithCredentials(page: Page, options: { 
  username: string; 
  password: string; 
  loginType?: string;
  resetPassword?: string;
}) {
  const resetPass = options.resetPassword || 'ResetBni';
  const typeTarget = options.loginType === '1' || !options.loginType ? 'HQ' : options.loginType;

  console.log(`[WeDocIt Auth] Mengakses halaman login AMS FAST dev... (User: ${options.username})`);
  await page.goto('/login', { waitUntil: 'networkidle' });

  // 1. Isi Username & Password
  await page.locator('input#username').fill(options.username);
  await page.locator('input[type="password"]').fill(options.password);

  // 2. Pilih Type (HQ)
  await selectLoginType(page, typeTarget);

  // 3. Klik tombol Login
  await page.locator('button[type="submit"]:has-text("Login")').click();
  await page.waitForTimeout(2500);

  // 4. Deteksi apakah ada pesan "User Already Login"
  const toastTexts = await getToastMessages(page);
  const isAlreadyLogin = toastTexts.some(t => t.toLowerCase().includes('already login'));

  if (isAlreadyLogin) {
    console.log('⚠️ [WeDocIt Auth] Terdeteksi sesi aktif sebelumnya (User Already Login).');
    console.log(`🔄 [WeDocIt Auth] Menjalankan Reset Session otomatis dengan user ${options.username} & pass ${resetPass}...`);

    // Reset session dengan password ResetBni
    await page.locator('input[type="password"]').fill(resetPass);
    await page.locator('button[type="submit"]:has-text("Login")').click();
    await page.waitForTimeout(2000);

    const resetFeedback = await getToastMessages(page);
    console.log(`✔ [WeDocIt Auth] Status Reset: ${resetFeedback.join(' | ') || 'Sukses'}`);

    // Login ulang dengan kredensial utama
    console.log('🔑 [WeDocIt Auth] Login kembali dengan password utama...');
    await page.locator('input#username').fill(options.username);
    await page.locator('input[type="password"]').fill(options.password);
    await selectLoginType(page, typeTarget);
    await page.locator('button[type="submit"]:has-text("Login")').click();
  }

  // 5. Tunggu redirect sukses keluar dari /login
  try {
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    console.log(`🎉 [WeDocIt Auth] Berhasil masuk ke: ${page.url()}`);

    // 6. Simpan session state untuk run berikutnya
    const authDir = path.dirname(AUTH_FILE);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
    await page.context().storageState({ path: AUTH_FILE });
    console.log(`💾 [WeDocIt Auth] Sesi autentikasi tersimpan aman di: ${AUTH_FILE}`);
  } catch (err) {
    const errorToasts = await getToastMessages(page);
    console.error(`❌ [WeDocIt Auth] Gagal login: ${errorToasts.join(' | ') || 'Navigasi timeout'}`);
    throw err;
  }
}

async function selectLoginType(page: Page, typeTarget: string) {
  const selectTrigger = page.locator('p-select, .p-select');
  if (await selectTrigger.isVisible()) {
    await selectTrigger.click();
    await page.waitForTimeout(300);
    const targetOption = page.locator(`.p-select-option:has-text("${typeTarget}"), li:has-text("${typeTarget}")`).first();
    if (await targetOption.isVisible()) {
      await targetOption.click();
    } else {
      // Fallback ke opsi pertama atau HQ
      await page.locator('.p-select-option, li').first().click();
    }
  }
}

async function getToastMessages(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.p-toast-message, .p-toast-detail, .p-toast-summary'))
      .map(el => (el as HTMLElement).innerText?.trim())
      .filter(Boolean);
  });
}
