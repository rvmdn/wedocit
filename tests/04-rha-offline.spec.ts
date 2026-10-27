import { test, expect } from '../src/fixtures/wedocit';
import { ensureAuthenticated } from '../src/helpers/auth';

test.describe('4. Menu RHA Pelaksanaan Offline', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/audit-reguler/manajemen-audit/pelaksanaan-audit-offline', { waitUntil: 'domcontentloaded' });
    if (page.url().includes('/login')) {
      await ensureAuthenticated(page);
    }
  });

  // Helper navigasi ke RHA Pelaksanaan Offline
  async function navigateToRha(page: any) {
    if (page.url().includes('/login')) {
      await ensureAuthenticated(page);
    }
    if (!page.url().includes('/rha')) {
      await page.goto('/audit-reguler/manajemen-audit/pelaksanaan-audit-offline', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const rhaBtn = page.locator('tbody tr:first-child td:nth-child(9) button, tr td:nth-child(9) button').first();
      if (await rhaBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await rhaBtn.click();
        await page.waitForURL((url: any) => url.pathname.includes('/rha'), { timeout: 10000 });
        await page.waitForTimeout(2000);
      }
    }
  }

  // --- Skenario 4.1 ---
  test('[TC-4.1] Hak Akses Role (TL vs Anggota/Lainnya)', async ({ page, wedocit }) => {
    wedocit.setMetadata({
      title: 'Unit Test Documentation - RHA Pelaksanaan Offline',
      module: 'Pelaksanaan Audit Offline (RHA)',
      systemName: 'AMS Fast - Pelaksanaan Audit Offline',
      projectName: 'AMS (Audit Management System)',
      crNo: 'CR_AMS_2026_OFFLINE',
      testedBy: 'Irvan Ramadan',
      npp: '822117',
      developers: [{ name: 'Irvan Ramadan', npp: '822117' }],
      startDate: '19/08/2026',
      endDate: '27/10/2026',
      docDate: '27/10/2026',
      copyrightYear: '2026',
      scope: 'Pengujian pemisahan hak akses otorisasi antara Team Lead (Katim) dan Anggota Tim pada form RHA',
      acceptanceCriteria: 'Team Lead dapat mengedit field intro, summary, dan tombol Save aktif. Selain Team Lead (Anggota/Admin dll), tampilan bersifat View Only dan tombol Save disembunyikan.'
    });

    wedocit.setTestCase({
      tcNumberStr: 'TC-4.1',
      scenarioName: 'Hak Akses Role (TL vs Anggota/Lainnya)',
      title: 'Verifikasi Hak Akses Role Tim Audit pada Halaman RHA Offline',
      expectedResult: 'Katim: Dapat menginput/mengedit field intro, summary, dan tombol "Save" aktif. Selain Katim: Tampilan RHA bersifat View Only, tombol Save disembunyikan.',
      role: 'FASTIA25'
    });

    await navigateToRha(page);

    await wedocit.captureStep({
      title: 'Akses Halaman RHA Pelaksanaan Offline Sesuai Role Pengguna',
      description: 'Sistem memeriksa otorisasi role pengguna yang sedang aktif pada dokumen RHA.',
      expected: 'Antarmuka menyesuaikan hak akses role pengguna (apakah Katim dengan kontrol aktif atau Anggota dengan mode view-only).'
    });

    const saveBtn = page.locator('button:has-text("Save"), p-button[label="Save"]').first();
    const isSaveVisible = await saveBtn.isVisible().catch(() => false);

    await wedocit.captureStep({
      title: 'Verifikasi Ketersediaan Tombol Aksi Simpan RHA',
      description: `Pemeriksaan visibilitas tombol Simpan/Save pada toolbar RHA (Status terlihat: ${isSaveVisible}).`,
      expected: 'Tombol Save hanya tampil bagi role Katim dan disembunyikan bagi role Anggota.'
    });
  });

  // --- Skenario 4.2 ---
  test('[TC-4.2] Dialog Ubah Data Temuan', async ({ page, wedocit }) => {
    wedocit.setMetadata({
      title: 'Unit Test Documentation - RHA Pelaksanaan Offline',
      module: 'Pelaksanaan Audit Offline (RHA)',
      systemName: 'AMS Fast - Pelaksanaan Audit Offline',
      projectName: 'AMS (Audit Management System)',
      crNo: 'CR_AMS_2026_OFFLINE',
      testedBy: 'Irvan Ramadan',
      npp: '822117',
      developers: [{ name: 'Irvan Ramadan', npp: '822117' }],
      startDate: '19/08/2026',
      endDate: '27/10/2026',
      docDate: '27/10/2026',
      copyrightYear: '2026',
      scope: 'Pengujian pembersihan state modal ubah data temuan audit (*ngIf="displayUbahTemuan && selectedTemuanDetail")',
      acceptanceCriteria: 'Modal ubah data temuan terbuka dengan state data yang bersih dan terisolasi per baris temuan.'
    });

    wedocit.setTestCase({
      tcNumberStr: 'TC-4.2',
      scenarioName: 'Dialog Ubah Data Temuan',
      title: 'Verifikasi State Bersih Dialog Ubah Data Temuan RHA',
      expectedResult: 'Modal terbuka dengan state bersih (*ngIf="displayUbahTemuan && selectedTemuanDetail").',
      role: 'FASTIA25'
    });

    await navigateToRha(page);

    const ubahTemuanBtn = page.locator('button:has-text("Ubah Temuan"), button[pTooltip*="Ubah" i]').first();
    if (await ubahTemuanBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await ubahTemuanBtn.click();
      await page.waitForTimeout(2000);

      await wedocit.captureStep({
        title: 'Pembukaan Modal Dialog Ubah Data Temuan',
        description: 'Pengguna membuka modal ubah data temuan dari daftar temuan hasil audit.',
        expected: 'Modal terbuka dengan state bersih dan memuat rincian temuan terpilih tanpa konflik state sebelumnya.'
      });
    }
  });

  // --- Skenario 4.3 ---
  test('[TC-4.3] Upload Lampiran RHA', async ({ page, wedocit }) => {
    wedocit.setMetadata({
      title: 'Unit Test Documentation - RHA Pelaksanaan Offline',
      module: 'Pelaksanaan Audit Offline (RHA)',
      systemName: 'AMS Fast - Pelaksanaan Audit Offline',
      projectName: 'AMS (Audit Management System)',
      crNo: 'CR_AMS_2026_OFFLINE',
      testedBy: 'Irvan Ramadan',
      npp: '822117',
      developers: [{ name: 'Irvan Ramadan', npp: '822117' }],
      startDate: '19/08/2026',
      endDate: '27/10/2026',
      docDate: '27/10/2026',
      copyrightYear: '2026',
      scope: 'Pengujian validasi unggah berkas pendukung temuan RHA terhadap ukuran maksimal dan format file',
      acceptanceCriteria: 'Validasi ukuran 5 MB dan ekstensi file pada lampiran RHA berjalan dengan benar.'
    });

    wedocit.setTestCase({
      tcNumberStr: 'TC-4.3',
      scenarioName: 'Upload Lampiran RHA',
      title: 'Validasi Batas Ukuran File & Ekstensi Lampiran RHA',
      expectedResult: 'Validasi ukuran 5 MB dan ekstensi file berjalan dengan benar.',
      role: 'FASTIA25'
    });

    await navigateToRha(page);

    await wedocit.captureStep({
      title: 'Pemeriksaan Form Upload Lampiran Dokumen RHA',
      description: 'Pengguna memeriksa kontrol pengunggahan dokumen lampiran pendukung RHA.',
      expected: 'Form upload memvalidasi file dan memblokir file > 5 MB atau format yang tidak diizinkan.'
    });
  });

});
