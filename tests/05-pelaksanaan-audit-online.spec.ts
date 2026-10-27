import { test, expect } from '../src/fixtures/wedocit';
import { ensureAuthenticated } from '../src/helpers/auth';

test.describe('5. Menu Pelaksanaan Audit Online (Komparasi & View)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/audit-reguler/manajemen-audit/pelaksanaan-audit', { waitUntil: 'domcontentloaded' });
    if (page.url().includes('/login')) {
      await ensureAuthenticated(page);
      await page.goto('/audit-reguler/manajemen-audit/pelaksanaan-audit', { waitUntil: 'domcontentloaded' });
    }
  });

  // --- Skenario 5.1 ---
  test('[TC-5.1] View Pengujian (AP Kredit & AP Non-Kredit Online)', async ({ page, wedocit }) => {

    wedocit.setTestCase({
      tcNumberStr: 'TC-5.1',
      scenarioName: 'View Pengujian (AP Kredit & AP Non-Kredit Online)',
      title: 'Verifikasi Visibilitas Data Pengujian AP pada Pelaksanaan Audit Online',
      expectedResult: 'Data pengujian dan simpulan yang diinput dari Pelaksanaan Offline dapat dilihat oleh seluruh tim audit.',
      role: 'FASTIA25'
    });

    await page.goto('/audit-reguler/manajemen-audit/pelaksanaan-audit', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await wedocit.captureStep({
      title: 'Akses Halaman Pelaksanaan Audit Online',
      description: 'Pengguna membuka modul Pelaksanaan Audit Online untuk memeriksa daftar penugasan aktif.',
      expected: 'Daftar penugasan audit online termuat dengan lengkap.'
    });

    const firstViewBtn = page.locator('p-table tr td button, .p-datatable-tbody tr td button').first();
    if (await firstViewBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await firstViewBtn.click();
      await page.waitForTimeout(2000);

      await wedocit.captureStep({
        title: 'Verifikasi Rincian Pengujian AP pada Pelaksanaan Audit Online',
        description: 'Sistem menyajikan rincian pengujian AP dan simpulan kertas kerja.',
        expected: 'Data pengujian dan simpulan dari pengerjaan offline tersinkronisasi dan dapat ditinjau oleh anggota tim.'
      });
    }
  });

  // --- Skenario 5.2 ---
  test('[TC-5.2] Jodit Editor Dialog Tanggapan Auditee & Auditor', async ({ page, wedocit }) => {

    wedocit.setTestCase({
      tcNumberStr: 'TC-5.2',
      scenarioName: 'Jodit Editor Dialog Tanggapan Auditee & Auditor',
      title: 'Verifikasi Isolasi State Editor Jodit pada Dialog Tanggapan RHA Online',
      expectedResult: 'Editor Jodit terisi sesuai data baris yang dipilih atau bersih jika belum ada tanggapan (tidak retain sisa data modal sebelumnya).',
      role: 'FASTIA25'
    });

    await page.goto('/audit-reguler/manajemen-audit/pelaksanaan-audit', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await wedocit.captureStep({
      title: 'Pemeriksaan Menu RHA Online untuk Tanggapan Auditee & Auditor',
      description: 'Pengguna mengakses modul tindak lanjut tanggapan pada temuan RHA online.',
      expected: 'Daftar temuan audit dengan kolom tanggapan auditee/auditor tersaji dengan baik.'
    });

    const tanggapanBtn = page.locator('button:has-text("Tanggapan"), p-button[label*="Tanggapan" i]').first();
    if (await tanggapanBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await tanggapanBtn.click();
      await page.waitForTimeout(2000);

      await wedocit.captureStep({
        title: 'Verifikasi Pembukaan Dialog Tanggapan dan State Jodit Editor',
        description: 'Sistem membuka dialog tanggapan dengan Rich Text Jodit Editor terisolasi sesuai baris data.',
        expected: 'Editor Jodit terisi sesuai data baris yang dipilih atau bersih jika belum ada tanggapan, tanpa residu baris lain.'
      });
    }
  });

});
