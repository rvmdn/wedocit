import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const authFile = path.resolve(process.cwd(), '.auth/user_orms_admin.json');

export interface OrmsAuthOptions {
  username?: string;
  password?: string;
  forceLogin?: boolean;
}

/**
 * Helper autentikasi untuk RMIS / ORMS
 * Mengakomodasi 2-step login:
 * 1. Portal Landing Page (RMIS Portal) -> Klik "Masuk ke Aplikasi RMIS"
 * 2. Form Sign in to RMIS -> Isi Username: Admin, Password: AdminBni1234/ -> Klik "SIGN IN"
 */
export async function ensureOrmsAuthenticated(page: Page, options: OrmsAuthOptions = {}) {
  const username = options.username || process.env.ORMS_USERNAME || 'Admin';
  const password = options.password || process.env.ORMS_PASSWORD || 'AdminBni1234/';

  // 1. Kunjungi halaman awal (/login langsung atau portal /)
  const currentUrl = page.url();
  if (currentUrl === 'about:blank' || !currentUrl.includes('localhost') && !currentUrl.includes('http')) {
    try {
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
    } catch {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
    }
    await page.waitForTimeout(1000);
  }

  // 2. Cek apakah berada di Halaman Portal (Gambar 1: RMIS Portal)
  const portalBtn = page.locator('text=Masuk ke Aplikasi RMIS, a:has-text("Masuk ke Aplikasi RMIS"), button:has-text("Masuk ke Aplikasi RMIS")').first();
  if (await portalBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
    console.log('🌐 [RMIS Auth] Terdeteksi Portal Landing Page, mengklik "Masuk ke Aplikasi RMIS"...');
    await portalBtn.click();
    await page.waitForTimeout(1500);
  }

  // 3. Cek apakah berada di Form Sign in to RMIS (Gambar 2: Sign in)
  const userInput = page.locator('input[placeholder*="Username" i], input#username, input[name="username"], input[type="text"]').first();
  const passInput = page.locator('input[placeholder*="Password" i], input#password, input[name="password"], input[type="password"]').first();
  const signInBtn = page.locator('button:has-text("SIGN IN"), button[type="submit"], button:has-text("Sign in")').first();

  if (await passInput.isVisible({ timeout: 2500 }).catch(() => false)) {
    console.log(`🔑 [RMIS Auth] Mengisi form login sebagai [${username}]...`);
    await userInput.fill(username);
    await passInput.fill(password);
    await page.waitForTimeout(300);
    await signInBtn.click();

    // Tunggu navigasi masuk ke dashboard / modul internal
    await page.waitForURL(url => !url.toString().includes('login'), { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const enterAppBtn = page.locator('text=Masuk ke Aplikasi RMIS, a:has-text("Masuk ke Aplikasi RMIS"), button:has-text("Masuk ke Aplikasi RMIS")').first();
    if (await enterAppBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('🌐 [RMIS Auth] Mengklik "Masuk ke Aplikasi RMIS" untuk memasuki modul internal...');
      await enterAppBtn.click();
      await page.waitForURL(url => !url.toString().includes('portal'), { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1500);
    }

    // Simpan storage state agar sesi tersimpan
    try {
      const authDir = path.dirname(authFile);
      if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });
      await page.context().storageState({ path: authFile });
      console.log(`💾 [RMIS Auth] Sesi login tersimpan di ${authFile}`);
    } catch (e) {
      console.warn('Gagal menyimpan storageState:', e);
    }
  } else {
    // Jika sudah login tapi masih di portal, klik masuk
    const enterAppBtn = page.locator('text=Masuk ke Aplikasi RMIS, a:has-text("Masuk ke Aplikasi RMIS"), button:has-text("Masuk ke Aplikasi RMIS")').first();
    if (await enterAppBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('🌐 [RMIS Auth] Masih di portal, mengklik "Masuk ke Aplikasi RMIS"...');
      await enterAppBtn.click();
      await page.waitForTimeout(2000);
    }
    console.log('✔ [RMIS Auth] Sesi sudah aktif.');
  }
}
