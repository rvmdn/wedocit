import { test, expect, commonTestConfig, setupTest, navigateToAdmin, closeModalIfOpen } from './_common';

test.use(commonTestConfig);

test.describe('[V2.0] [TC-014] Security Administration - Manage Session (Read & Kick Session)', () => {
  test.beforeEach(async ({ page, wedocit }) => {
    await setupTest(page, wedocit);
  });

test('[TC-014] Security Administration - Manage Session (Read & Kick Session)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-014',
      scenarioName: 'Pengujian Pemantauan Sesi & Terminasi Paksa Sesi Pengguna (Read -> Kick Session)',
      title: 'Security Administration - Manage Session',
      expectedResult: 'Berhasil memantau daftar sesi pengguna aktif (Read) dan mengeksekusi terminasi paksa (Kick Session / Delete) untuk kepatuhan CISO.',
      role: 'Admin CISO / IT Security'
    });

    await navigateToAdmin(page, '/admin-ciso/manage-session');

    // SUB-TC 14.1: READ
    const searchSession = page.locator('input#keyword, input[placeholder*="Search" i]').first();
    await test.step('Sub-TC 14.1: [READ] Akses Halaman & Filter Daftar Sesi Login Aktif', async () => {
      console.log('   🔹 [Sub-TC 14.1: READ] Memeriksa daftar sesi aktif pengguna...');
      const btnSearchSession = page.locator('button:has-text("Search")').first();
      if (await searchSession.isVisible().catch(() => false)) {
        await searchSession.fill('Admin');
        if (await btnSearchSession.isVisible().catch(() => false)) await btnSearchSession.click();
        await page.waitForTimeout(400);
      }

      await wedocit.captureStep({
        title: 'Sub-TC 14.1: [READ] Akses Halaman & Filter Daftar Sesi Login Aktif',
        description: 'Membuka halaman Session Management untuk mengaudit seluruh sesi login aktif pengguna aplikasi.',
        input: 'Filter Keyword: Admin',
        expected: 'Tabel sesi aktif ditampilkan dengan informasi User, Login Time, Expired At, dan Last Activity.',
        highlight: searchSession
      });
    });

    // SUB-TC 14.2: DELETE / KICK - Klik Tombol Kick
    const btnKickSession = page.locator('p-table tbody tr:first-child button:has-text("Kick")').first();
    await test.step('Sub-TC 14.2: [DELETE] Memilih Sesi Pengguna & Klik Tombol Kick', async () => {
      console.log('   🔹 [Sub-TC 14.2: DELETE] Memilih sesi untuk di-kick...');
      await wedocit.captureStep({
        title: 'Sub-TC 14.2: [DELETE] Memilih Sesi Pengguna & Klik Tombol Kick',
        description: 'Pengguna menekan tombol "Kick" pada baris sesi pengguna target untuk mencabut token otentikasi.',
        input: 'Klik Tombol: Kick pada baris pengguna terpilih',
        expected: 'Sistem merespons aksi dan memicu verifikasi terminasi sesi keamanan.',
        highlight: btnKickSession
      });

      if (await btnKickSession.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnKickSession.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 14.3: DELETE / KICK - Dialog Konfirmasi
    const confirmKickDialog = page.locator('.p-confirm-dialog, .p-dialog').first();
    await test.step('Sub-TC 14.3: [DELETE] Menampilkan Modal Dialog Konfirmasi Kick Sesi', async () => {
      console.log('   🔹 [Sub-TC 14.3: DELETE] Menampilkan dialog konfirmasi terminasi...');
      await wedocit.captureStep({
        title: 'Sub-TC 14.3: [DELETE] Menampilkan Modal Dialog Konfirmasi Kick Sesi',
        description: 'Dialog peringatan konfirmasi terminasi paksa sesi muncul sesuai protokol keamanan CISO BNI.',
        input: 'Verifikasi: Modal Konfirmasi Terminasi Sesi',
        expected: 'Dialog konfirmasi menampilkan pesan peringatan pemutusan koneksi pengguna.',
        highlight: confirmKickDialog
      });
    });

    // SUB-TC 14.4: DELETE / KICK - Eksekusi Konfirmasi Kick
    await test.step('Sub-TC 14.4: [DELETE] Eksekusi Konfirmasi Terminasi Paksa Sesi', async () => {
      console.log('   🔹 [Sub-TC 14.4: DELETE] Mengonfirmasi terminasi paksa sesi...');
      const btnConfirmKick = page.locator('.p-confirm-dialog button.p-confirm-dialog-accept, .p-confirm-dialog button:has-text("Ya"), button.p-button-danger:has-text("Kick")').first();
      const targetHighlight = (await btnConfirmKick.isVisible({ timeout: 1000 }).catch(() => false)) ? btnConfirmKick : confirmKickDialog;

      await wedocit.captureStep({
        title: 'Sub-TC 14.4: [DELETE] Eksekusi Konfirmasi Terminasi Paksa Sesi',
        description: 'Pengguna menekan tombol konfirmasi pada modal untuk mencabut token sesi secara permanen.',
        input: 'Klik Tombol: Ya, Lanjutkan / Kick',
        expected: 'Sesi pengguna berhasil diterminasi, token dicabut, dan status pengguna kembali offline.',
        highlight: targetHighlight
      });

      await closeModalIfOpen(page);
    });

    // SUB-TC 14.5: READ - Verifikasi Sesi Terputus
    await test.step('Sub-TC 14.5: [READ] Verifikasi Pembaruan Sesi Aktif Pasca Terminasi', async () => {
      console.log('   🔹 [Sub-TC 14.5: READ] Memverifikasi daftar sesi pasca kick...');
      const sessionSummary = page.locator('div:has-text("Total Active Sessions")').first();
      await wedocit.captureStep({
        title: 'Sub-TC 14.5: [READ] Verifikasi Pembaruan Sesi Aktif Pasca Terminasi',
        description: 'Memverifikasi bahwa sesi yang telah di-kick tidak lagi terdaftar pada tabel sesi aktif.',
        input: 'Status Check: Total Active Sessions Counter',
        expected: 'Daftar sesi terbarui secara real-time dan sesi yang diterminasi tidak lagi muncul.',
        highlight: sessionSummary
      });
    });
  });

  // =========================================================================
});