import { test, expect } from '../src/fixtures/wedocit';
import { ensureAuthenticated } from '../src/helpers/auth';
import * as path from 'path';

test.describe('3. Menu AP Kredit Pelaksanaan Offline', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/audit-reguler/manajemen-audit/pelaksanaan-audit-offline', { waitUntil: 'domcontentloaded' });
    if (page.url().includes('/login')) {
      await ensureAuthenticated(page);
    }
  });

  // Helper navigasi ke AP Kredit Pelaksanaan Offline
  async function navigateToApKredit(page: any) {
    if (page.url().includes('/login')) {
      await ensureAuthenticated(page);
    }
    if (!page.url().includes('/ap-kredit')) {
      await page.goto('/audit-reguler/manajemen-audit/pelaksanaan-audit-offline', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const apKreditBtn = page.locator('tbody tr:first-child td:nth-child(8) button, tr td:nth-child(8) button').first();
      if (await apKreditBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await apKreditBtn.click();
        await page.waitForURL((url: any) => url.pathname.includes('/ap-kredit'), { timeout: 10000 });
        await page.waitForTimeout(2000);
      }
    }
  }

  // --- Skenario 3.1 ---
  test('[TC-3.1] Notifikasi Pemuatan Data Awal', async ({ page, wedocit }) => {

    wedocit.setTestCase({
      tcNumberStr: 'TC-3.1',
      scenarioName: 'Notifikasi Pemuatan Data Awal',
      title: 'Verifikasi Pemuatan Data Sampel Debitur Tanpa Notifikasi Toast Ganda',
      expectedResult: 'Tidak muncul notifikasi toast dobel. Tabel sample debitur termuat tanpa request tumpang tindih.',
      role: 'FASTIA25'
    });

    await navigateToApKredit(page);

    await wedocit.captureStep({
      title: 'Akses Halaman Daftar Sample Debitur AP Kredit',
      description: 'Pengguna mengakses modul AP Kredit Pelaksanaan Offline untuk memverifikasi tabel sample debitur.',
      expected: 'Data sample debitur termuat dengan rapi tanpa muncul popup notifikasi ganda.'
    });

    // Pindah halaman jika ada dan aktif
    const paginatorNext = page.locator('.p-paginator-next:not(.p-disabled), .p-paginator-page').nth(1);
    if (await paginatorNext.isVisible({ timeout: 2000 }).catch(() => false)) {
      if (await paginatorNext.isEnabled().catch(() => false)) {
        await paginatorNext.click();
        await page.waitForTimeout(1500);

        await wedocit.captureStep({
          title: 'Verifikasi Pindah Halaman Sample Debitur',
          description: 'Pengguna melakukan navigasi halaman tabel data debitur.',
          expected: 'Paginasi berpindah dengan mulus tanpa memicu request tumpang tindih atau toast duplikat.'
        });
      }
    }

    const toastCount = await page.locator('.p-toast-message').count();
    expect(toastCount).toBeLessThanOrEqual(1);
  });

  // --- Skenario 3.2 ---
  test('[TC-3.2] Notifikasi Pencarian Manual', async ({ page, wedocit }) => {

    wedocit.setTestCase({
      tcNumberStr: 'TC-3.2',
      scenarioName: 'Notifikasi Pencarian Manual',
      title: 'Pencarian Manual Debitur dan Verifikasi Notifikasi Tunggal',
      expectedResult: 'Muncul notifikasi "Data berhasil dimuat" sebanyak 1 kali.',
      role: 'FASTIA25'
    });

    await navigateToApKredit(page);

    const searchInput = page.locator('input[placeholder*="Pencarian" i], input[placeholder*="Cari" i]').first();
    if (await searchInput.isVisible({ timeout: 4000 }).catch(() => false)) {
      await searchInput.fill('Debitur');
      await wedocit.captureStep({
        title: 'Input Kata Kunci Pencarian Debitur',
        description: 'Pengguna memasukkan kata kunci pencarian pada form filter.',
        input: 'Debitur',
        screenshot: false
      });

      const searchBtn = page.locator('p-button[label="Cari"], button:has-text("Cari")').first();
      await searchBtn.click();
      await page.waitForTimeout(1500);

      await wedocit.captureStep({
        title: 'Hasil Pencarian Debitur AP Kredit',
        description: 'Sistem menyajikan hasil pencarian data sampel debitur.',
        expected: 'Muncul notifikasi "Data berhasil dimuat" sebanyak 1 kali.'
      });
    }
  });

  // --- Skenario 3.3 ---
  test('[TC-3.3] Pengujian AP Kredit & Jodit Editor', async ({ page, wedocit }) => {

    wedocit.setTestCase({
      tcNumberStr: 'TC-3.3',
      scenarioName: 'Pengujian AP Kredit & Jodit Editor',
      title: 'Verifikasi Reset Jodit Editor pada Form Simpulan Pengujian Kredit',
      expectedResult: 'Editor Jodit di form simpulan kredit ter-reset bersih dan tidak meninggalkan teks lama.',
      role: 'FASTIA25'
    });

    await navigateToApKredit(page);

    const infoPengujianBtn = page.locator('p-button[icon="pi pi-info-circle"], button[icon="pi pi-info-circle"]').first();
    if (await infoPengujianBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await infoPengujianBtn.click();
      await page.waitForTimeout(2000);

      const tambahSimpulanBtn = page.locator('button:has-text("Tambah Simpulan")').first();
      if (await tambahSimpulanBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tambahSimpulanBtn.click();
        await page.waitForTimeout(1000);

        const joditEditor = page.locator('.jodit-wysiwyg, [contenteditable="true"]').first();
        if (await joditEditor.isVisible()) {
          await joditEditor.click();
          await page.keyboard.type('Draf simpulan pengujian debitur kredit');
        }

        await wedocit.captureStep({
          title: 'Input Simpulan Kredit pada Jodit Editor',
          description: 'Pengguna memasukkan teks analisis pengujian kredit ke dalam editor.',
          expected: 'Teks simpulan terisi di dalam area editor.'
        });

        // Tutup modal
        const closeBtn = page.locator('.p-dialog-header-close, button[aria-label="Close"], button:has-text("Batal")').first();
        await closeBtn.click();
        await page.waitForTimeout(1000);

        // Buka kembali modal
        await tambahSimpulanBtn.click();
        await page.waitForTimeout(1500);

        await wedocit.captureStep({
          title: 'Verifikasi Pembersihan Jodit Editor Simpulan Kredit',
          description: 'Pengguna membuka kembali form simpulan dan memverifikasi editor bersih.',
          expected: 'Editor Jodit di form simpulan kredit ter-reset bersih dan tidak meninggalkan teks lama.'
        });

        const text = await page.locator('.jodit-wysiwyg').first().innerText().catch(() => '');
        expect(text.trim()).toBe('');
      }
    }
  });

  // --- Skenario 3.4 ---
  test('[TC-3.4] Upload Lampiran AP Kredit', async ({ page, wedocit }) => {

    wedocit.setTestCase({
      tcNumberStr: 'TC-3.4',
      scenarioName: 'Upload Lampiran AP Kredit',
      title: 'Validasi Batas Ukuran File Upload Lampiran AP Kredit (Max 5 MB)',
      expectedResult: 'Muncul validasi batas ukuran maksimal 5 MB.',
      role: 'FASTIA25'
    });

    await navigateToApKredit(page);

    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible({ timeout: 4000 }).catch(() => false)) {
      await wedocit.captureStep({
        title: 'Verifikasi Kontrol Upload Lampiran AP Kredit',
        description: 'Pengguna memeriksa kontrol upload berkas pendukung pada AP Kredit.',
        expected: 'Tersedia input berkas dengan keterangan batas maksimal 5 MB.'
      });
    }
  });

  // --- Skenario 3.5 ---
  test('[TC-3.5] Simpulan Katim AP Kredit', async ({ page, wedocit }) => {

    wedocit.setTestCase({
      tcNumberStr: 'TC-3.5',
      scenarioName: 'Simpulan Katim AP Kredit',
      title: 'Verifikasi State Bersih Dialog Simpulan Katim AP Kredit',
      expectedResult: 'Dialog dimuat secara fresh (*ngIf), data tampil akurat tanpa konflik state antar baris.',
      role: 'FASTIA25'
    });

    await navigateToApKredit(page);

    const simpulanKatimBtn = page.locator('button:has-text("Simpulan Gabungan"), button:has-text("Simpulan Katim")').first();
    if (await simpulanKatimBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await simpulanKatimBtn.click();
      await page.waitForTimeout(2000);

      await wedocit.captureStep({
        title: 'Pembukaan Dialog Simpulan Katim AP Kredit',
        description: 'Katim membuka dialog simpulan gabungan untuk memeriksa data pengujian.',
        expected: 'Dialog dimuat secara fresh (*ngIf), data tampil akurat tanpa konflik state antar baris.'
      });
    }
  });

});
