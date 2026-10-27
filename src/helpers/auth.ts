import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export const AUTH_FILE = path.resolve(__dirname, '../../.auth/user.json');

export interface LoginOptions {
  username?: string;
  password?: string;
  loginType?: string;
}

/**
 * Helper untuk login ke AMS FAST dev server (https://amsfast-dev.bni.co.id:8081)
 */
export async function ensureAuthenticated(page: Page, options: LoginOptions = {}) {
  // 1. Cek apakah auth state file sudah ada
  if (fs.existsSync(AUTH_FILE)) {
    return;
  }

  const username = options.username || process.env.FAST_USERNAME;
  const password = options.password || process.env.FAST_PASSWORD;

  // 2. Jika kredensial tersedia di env atau options, lakukan login otomatis
  if (username && password) {
    await loginWithCredentials(page, { username, password, loginType: options.loginType });
  } else {
    // 3. Jika tidak ada kredensial, beri petunjuk ke pengguna
    console.log('\n[WeDocIt Auth] Menunggu sesi login...');
    console.log('Untuk menjalankan otomatis tanpa intervensi, sediakan FAST_USERNAME & FAST_PASSWORD di file .env.');
  }
}

/**
 * Melakukan proses login langsung pada halaman login AMS FAST
 */
export async function loginWithCredentials(page: Page, options: { username: string; password: string; loginType?: string }) {
  await page.goto('/login', { waitUntil: 'networkidle' });

  // Isi Username
  await page.locator('input#username').fill(options.username);

  // Isi Password
  await page.locator('input[type="password"]').fill(options.password);

  // Pilih Type jika ditentukan
  if (options.loginType) {
    const selectTrigger = page.locator('p-select, .p-select');
    if (await selectTrigger.isVisible()) {
      await selectTrigger.click();
      await page.locator(`.p-select-option:has-text("${options.loginType}"), li:has-text("${options.loginType}")`).first().click();
    }
  }

  // Klik tombol Login
  await page.locator('button[type="submit"]:has-text("Login")').click();

  // Tunggu redirect sukses keluar dari /login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });

  // Simpan session state untuk run berikutnya
  const authDir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  await page.context().storageState({ path: AUTH_FILE });
  console.log(`[WeDocIt Auth] Berhasil login & session disimpan di: ${AUTH_FILE}`);
}
