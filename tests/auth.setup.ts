import { test as setup } from '@playwright/test';
import { AUTH_FILE, loginWithCredentials } from '../src/helpers/auth';
import * as fs from 'fs';

setup('Autentikasi AMS FAST Dev Server', async ({ page }) => {
  const username = process.env.FAST_USERNAME;
  const password = process.env.FAST_PASSWORD;
  const loginType = process.env.FAST_LOGIN_TYPE;
  const loginPath = process.env.FAST_LOGIN_PATH || '/login';
  const baseUrl = process.env.FAST_BASE_URL || 'https://amsfast-dev.bni.co.id:8081';

  if (username && password) {
    console.log(`[Setup] Melakukan login otomatis dengan user: ${username}`);
    await loginWithCredentials(page, { username, password, loginType, loginPath });
  } else if (!fs.existsSync(AUTH_FILE)) {
    console.log('[Setup] FAST_USERNAME atau FAST_PASSWORD belum didefinisikan.');
    console.log(`[Setup] Membuka halaman login ${baseUrl}${loginPath}...`);
    await page.goto(loginPath);
    // Jika dijalankan headed, beri waktu pengguna untuk login manual sekali saja
    if (!process.env.CI) {
      console.log('[Setup] Silakan login manual pada jendela browser Playwright...');
      try {
        await page.waitForURL((url) => !url.pathname.includes(loginPath), { timeout: 60000 });
        const dir = require('path').dirname(AUTH_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        await page.context().storageState({ path: AUTH_FILE });
        console.log(`[Setup] Sesi berhasil disimpan ke ${AUTH_FILE}!`);
      } catch (e) {
        console.log('[Setup] Melewati penyimpanan sesi (timeout atau mode headless).');
      }
    }
  }
});
