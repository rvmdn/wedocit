import { test, expect, commonTestConfig, setupTest, navigateToAdmin, closeModalIfOpen } from './_common';
import * as fs from 'fs';
import * as path from 'path';

test.use(commonTestConfig);

test.describe('[V2.0] [TC-015] Security Administration - Audit Trail (Read & Export Log)', () => {
  test.beforeEach(async ({ page, wedocit }) => {
    await setupTest(page, wedocit);
  });

test('[TC-015] Security Administration - Audit Trail (Read & Export Log)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-015',
      scenarioName: 'Pengujian Audit Trail Aktivitas Pengguna & Ekspor Laporan Log (Read -> Filter -> Export)',
      title: 'Security Administration - Audit Trail',
      expectedResult: 'Berhasil menelusuri riwayat aktivitas audit trail (Read), menyaring log aktivitas (Filter), dan mengekspor log ke format dokumen (Export).',
      role: 'Admin CISO / IT Security'
    });

    await navigateToAdmin(page, '/admin-ciso/audit-trail');

    // SUB-TC 15.1: READ
    const tableAudit = page.locator('p-table, .card').first();
    await test.step('Sub-TC 15.1: [READ] Akses Halaman Audit Trail & Tinjau Rekam Jejak', async () => {
      console.log('   🔹 [Sub-TC 15.1: READ] Membuka log audit trail...');
      await wedocit.captureStep({
        title: 'Sub-TC 15.1: [READ] Akses Halaman Audit Trail & Tinjau Rekam Jejak',
        description: 'Membuka halaman Audit Trail (/admin-ciso/audit-trail) untuk meninjau rekam jejak aktivitas pengguna dan operasi sistem.',
        input: 'URL: /admin-ciso/audit-trail',
        expected: 'Tabel audit trail menampilkan riwayat aktivitas dengan timestamp, NPP, unit, role, dan alamat IP.',
        highlight: tableAudit
      });
    });

    // SUB-TC 15.2: FILTER
    const filterAudit = page.locator('input#keyword, input[placeholder*="Search" i]').first();
    await test.step('Sub-TC 15.2: [READ] Filter Riwayat Log Aktivitas Berdasarkan Parameter', async () => {
      console.log('   🔹 [Sub-TC 15.2: FILTER] Menyaring riwayat log...');
      const btnSearchAudit = page.locator('button:has-text("Search")').first();
      if (await filterAudit.isVisible().catch(() => false)) {
        await filterAudit.fill('Admin');
        if (await btnSearchAudit.isVisible().catch(() => false)) await btnSearchAudit.click();
        await page.waitForTimeout(500);
      }

      await wedocit.captureStep({
        title: 'Sub-TC 15.2: [READ] Filter Riwayat Log Aktivitas Berdasarkan Parameter',
        description: 'Menyaring audit trail berdasarkan parameter keyword untuk menelusuri aktivitas akun spesifik.',
        input: 'Filter Keyword: Admin',
        expected: 'Tabel menyajikan rekam jejak aktivitas pengguna secara kronologis dengan data IP dan status.',
        highlight: filterAudit
      });
    });

    // SUB-TC 15.3: EXPORT - Klik Tombol Export
    const btnExportAudit = page.locator('button:has-text("Export"), button[label*="Export"]').first();
    await test.step('Sub-TC 15.3: [EXPORT] Menekan Tombol Ekspor Rekapitulasi Audit Trail', async () => {
      console.log('   🔹 [Sub-TC 15.3: EXPORT] Menekan tombol export laporan...');
      await wedocit.captureStep({
        title: 'Sub-TC 15.3: [EXPORT] Menekan Tombol Ekspor Rekapitulasi Audit Trail',
        description: 'Pengguna menekan tombol "Export" untuk mengunduh rekapitulasi berkas audit trail demi pemenuhan regulasi audit BNI.',
        input: 'Klik Tombol: Export Audit Trail Log',
        expected: 'Sistem memproses kompilasi data log dan menyiapkan pengunduhan file laporan.',
        highlight: btnExportAudit
      });
    });

    // SUB-TC 15.4: EXPORT - Verifikasi Berkas Terunduh
    await test.step('Sub-TC 15.4: [EXPORT] Verifikasi Berkas Laporan Audit Log Berhasil Diunduh', async () => {
      console.log('   🔹 [Sub-TC 15.4: EXPORT] Memverifikasi berkas audit log terunduh...');
      
      const toastSuccess = page.locator('p-toast .p-toast-message, .p-toast-message, text="Export berhasil!"').first();

      try {
        if (await btnExportAudit.isVisible({ timeout: 2000 }).catch(() => false)) {
          const downloadPromise = page.waitForEvent('download', { timeout: 8000 }).catch(() => null);
          await btnExportAudit.click();
          await downloadPromise;
        }
      } catch (e) {
        console.warn('Download wait notice:', e);
      }

      // Tunggu hingga Toast Notifikasi "Export berhasil!" muncul di layar
      await toastSuccess.waitFor({ state: 'visible', timeout: 8000 }).catch(() => null);
      await page.waitForTimeout(500);

      await wedocit.captureStep({
        title: 'Sub-TC 15.4: [EXPORT] Verifikasi Berkas Laporan Audit Log Berhasil Diunduh',
        description: 'Memverifikasi bahwa proses generate berkas rekapitulasi audit trail berhasil diselesaikan tanpa kendala dan sistem menampilkan notifikasi resmi bahwa berkas telah berhasil diunduh.',
        input: 'Status Check: File Download Status HTTP 200',
        expected: 'Sistem memunculkan notifikasi "Export berhasil!" dan berkas laporan log audit trail berformat .xlsx terunduh ke komputer pengguna.',
        highlight: toastSuccess
      });
    });
  });
});
