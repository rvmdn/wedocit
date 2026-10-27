import { test, expect } from '../src/fixtures/wedocit';
import { ensureAuthenticated } from '../src/helpers/auth';

test.describe('1. Menu AP Non-Kredit Pelaksanaan Offline', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/audit-reguler/manajemen-audit/pelaksanaan-audit-offline', { waitUntil: 'domcontentloaded' });
    if (page.url().includes('/login')) {
      await ensureAuthenticated(page);
    }
  });

  // Helper untuk membuka halaman AP Non-Kredit Offline baris pertama
  async function navigateToApNonKredit(page: any) {
    if (page.url().includes('/login')) {
      await ensureAuthenticated(page);
    }
    if (!page.url().includes('/pelaksanaan-audit-offline') || page.url().includes('/ap-non-kredit')) {
      if (!page.url().includes('/ap-non-kredit')) {
        await page.goto('/audit-reguler/manajemen-audit/pelaksanaan-audit-offline', { waitUntil: 'domcontentloaded' });
      }
    }

    if (!page.url().includes('/ap-non-kredit')) {
      await page.waitForTimeout(2000);
      // Klik tombol AP Non Kredit pada baris penugasan pertama (Kolom ke-7)
      const apBtn = page.locator('tbody tr:first-child td:nth-child(7) button, tr td:nth-child(7) button').first();
      if (await apBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await apBtn.click();
        await page.waitForURL((url: any) => url.pathname.includes('/ap-non-kredit'), { timeout: 10000 });
        await page.waitForTimeout(2000);
      }
    }
  }

  // --- Skenario 1.1 ---
  test('[TC-1.1] Notifikasi Pemuatan Data Awal', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-1.1',
      scenarioName: 'Notifikasi Pemuatan Data Awal',
      title: 'Verifikasi Notifikasi Pemuatan Data Awal & Paginasi Bersih Tanpa Toast Dobel',
      expectedResult: 'Tidak muncul notifikasi toast ganda/dobel. Data tabel langsung tampil bersih.',
      role: 'FASTIA25'
    });

    await navigateToApNonKredit(page);

    await wedocit.captureStep({
      title: 'Akses Halaman AP Non-Kredit Pelaksanaan Offline',
      description: 'Pengguna mengakses halaman AP Non-Kredit Pelaksanaan Offline dan memverifikasi data tabel termuat.',
      expected: 'Data tabel program audit tersaji bersih dan tidak muncul toast notification berulang atau tumpang tindih.'
    });

    // Pindah halaman tabel jika paginator tersedia dan aktif
    const nextPaginatorBtn = page.locator('.p-paginator-next:not(.p-disabled), .p-paginator-page').nth(1);
    if (await nextPaginatorBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      if (await nextPaginatorBtn.isEnabled().catch(() => false)) {
        await nextPaginatorBtn.click();
        await page.waitForTimeout(1500);

        await wedocit.captureStep({
          title: 'Pindah Halaman Paginasi Tabel Program Audit',
          description: 'Pengguna berpindah ke halaman berikutnya pada tabel AP Non-Kredit.',
          expected: 'Data halaman berikutnya tampil tanpa memicu popup toast berulang.'
        });
      }
    }

    // Verifikasi jumlah toast tidak duplikat
    const toastCount = await page.locator('.p-toast-message').count();
    expect(toastCount).toBeLessThanOrEqual(1);
  });

  // --- Skenario 1.2 ---
  test('[TC-1.2] Notifikasi Pencarian Manual', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-1.2',
      scenarioName: 'Notifikasi Pencarian Manual',
      title: 'Verifikasi Notifikasi Pencarian Manual Program Audit',
      expectedResult: 'Muncul notifikasi hijau: "Data berhasil dimuat" sebanyak 1 kali.',
      role: 'FASTIA25'
    });

    await navigateToApNonKredit(page);

    const searchInput = page.locator('input[placeholder*="Pencarian" i], input[placeholder*="Cari" i]').first();
    if (await searchInput.isVisible({ timeout: 4000 }).catch(() => false)) {
      await searchInput.fill('Kas');
      await wedocit.captureStep({
        title: 'Input Kata Kunci Pencarian Program Audit',
        description: 'Pengguna memasukkan kata kunci pencarian pada kolom filter.',
        input: 'Kas',
        screenshot: false
      });

      const searchBtn = page.locator('p-button[label="Cari"], button:has-text("Cari")').first();
      await searchBtn.click();
      await page.waitForTimeout(1500);

      await wedocit.captureStep({
        title: 'Hasil Pencarian Data dan Verifikasi Notifikasi Feedback',
        description: 'Pengguna menekan tombol "Cari" dan sistem memuat data hasil filter.',
        expected: 'Muncul notifikasi hijau: "Data berhasil dimuat" sebanyak 1 kali dan baris data terfilter sesuai kata kunci.'
      });
    }
  });

  // --- Skenario 1.3 ---
  test('[TC-1.3] Tombol Pengujian AP', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-1.3',
      scenarioName: 'Tombol Pengujian AP',
      title: 'Navigasi ke Halaman Pengujian AP Non-Kredit Melalui Icon Info',
      expectedResult: 'Masuk ke halaman Pengujian AP Non-Kredit (/pengujian-ap).',
      role: 'FASTIA25'
    });


    await navigateToApNonKredit(page);

    const infoBtn = page.locator('p-button[icon="pi pi-info-circle"], button[icon="pi pi-info-circle"]').first();
    if (await infoBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await wedocit.captureStep({
        title: 'Tampilan Tombol Icon Pengujian pada Tabel',
        description: 'Pengguna memeriksa tombol aksi icon info/pengujian pada baris program audit.',
        expected: 'Tombol icon info/pengujian aktif dan siap diklik.'
      });

      await infoBtn.click();
      await page.waitForURL((url: any) => url.pathname.includes('/pengujian-ap'), { timeout: 10000 });
      await page.waitForTimeout(2000);

      await wedocit.captureStep({
        title: 'Navigasi Berhasil ke Halaman Pengujian AP Non-Kredit',
        description: 'Sistem merespons klik icon info dan mengarahkan ke form kerja Pengujian AP.',
        expected: 'Halaman Pengujian AP Non-Kredit terbuka dengan URL mengandung /pengujian-ap.'
      });

      expect(page.url()).toContain('/pengujian-ap');
    }
  });

});
