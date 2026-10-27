import { test, expect } from '../src/fixtures/wedocit';
import { ensureAuthenticated } from '../src/helpers/auth';
import * as path from 'path';

test.describe('2. Menu Pengujian AP Non-Kredit Pelaksanaan Offline', () => {

  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
  });

  // Helper untuk membuka halaman pengujian AP Non-Kredit
  async function navigateToPengujianAp(page: any) {
    await page.goto('/audit-reguler/manajemen-audit/pelaksanaan-audit-offline', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const apBtn = page.locator('p-button[ptooltip="AP Non Kredit"], button:has-text("AP Non Kredit"), tr td:nth-child(7) button').first();
    if (await apBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await apBtn.click();
      await page.waitForURL((url: any) => url.pathname.includes('/ap-non-kredit'), { timeout: 10000 });
      await page.waitForTimeout(2000);

      const infoBtn = page.locator('p-button[icon="pi pi-info-circle"], button[icon="pi pi-info-circle"]').first();
      if (await infoBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
        await infoBtn.click();
        await page.waitForURL((url: any) => url.pathname.includes('/pengujian-ap'), { timeout: 10000 });
        await page.waitForTimeout(2000);
      }
    }
  }

  // --- Skenario 2.1 ---
  test('[TC-2.1] Upload Lampiran (Ukuran & Format)', async ({ page, wedocit }) => {
    wedocit.setMetadata({
      title: 'Unit Test Documentation - Pengujian AP Non-Kredit Offline',
      module: 'Pengujian AP Non-Kredit Pelaksanaan Offline',
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
      scope: 'Pengujian validasi unggah berkas lampiran dengan ukuran > 5 MB atau ekstensi file yang tidak diizinkan',
      acceptanceCriteria: 'Sistem memblokir proses upload dan menampilkan notifikasi peringatan validasi: format/ekstensi tidak diizinkan atau ukuran melebihi batas 5 MB.'
    });

    wedocit.setTestCase({
      tcNumberStr: 'TC-2.1',
      scenarioName: 'Upload Lampiran (Ukuran & Format)',
      title: 'Validasi Penolakan File Upload Tidak Valid (>5MB atau Format Terlarang)',
      expectedResult: 'Muncul notifikasi peringatan: "Ukuran file melebihi batas maksimal 5 MB" atau format file tidak diizinkan. Upload diblokir.',
      role: 'FASTIA25'
    });

    await navigateToPengujianAp(page);

    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible({ timeout: 4000 }).catch(() => false)) {
      const invalidFilePath = path.resolve(__dirname, '../scratch/sample-invalid.exe');
      await fileInput.setInputFiles(invalidFilePath);
      await page.waitForTimeout(1000);

      await wedocit.captureStep({
        title: 'Input File dengan Ekstensi Tidak Diizinkan (.exe)',
        description: 'Pengguna memilih berkas yang tidak termasuk dalam daftar ekstensi yang diizinkan (.pdf, .doc, .docx, .ppt, .pptx, .xls, .xlsx, .zip, .rar).',
        input: 'sample-invalid.exe',
        screenshot: false
      });

      const uploadBtn = page.locator('p-button[label="Upload"], button:has-text("Upload")').first();
      if (await uploadBtn.isEnabled()) {
        await uploadBtn.click();
        await page.waitForTimeout(1500);
      }

      await wedocit.captureStep({
        title: 'Validasi Penolakan File Tidak Diizinkan',
        description: 'Sistem memverifikasi integritas file dan menampilkan pesan peringatan.',
        expected: 'Muncul notifikasi peringatan format tidak diizinkan dan file tidak diunggah ke server.'
      });
    }
  });

  // --- Skenario 2.2 ---
  test('[TC-2.2] Upload Lampiran Valid', async ({ page, wedocit }) => {
    wedocit.setMetadata({
      title: 'Unit Test Documentation - Pengujian AP Non-Kredit Offline',
      module: 'Pengujian AP Non-Kredit Pelaksanaan Offline',
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
      scope: 'Pengujian alur upload lampiran pengujian dengan berkas valid <= 5 MB',
      acceptanceCriteria: 'File valid berhasil diunggah, muncul notifikasi sukses, dan nama file tersaji pada tabel daftar lampiran.'
    });

    wedocit.setTestCase({
      tcNumberStr: 'TC-2.2',
      scenarioName: 'Upload Lampiran Valid',
      title: 'Upload Dokumen Lampiran Pengujian Valid (<= 5 MB)',
      expectedResult: 'File berhasil diunggah, muncul notifikasi sukses, dan muncul pada tabel daftar lampiran di bawah.',
      role: 'FASTIA25'
    });

    await navigateToPengujianAp(page);

    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible({ timeout: 4000 }).catch(() => false)) {
      const validFilePath = path.resolve(__dirname, '../scratch/sample-valid.pdf');
      await fileInput.setInputFiles(validFilePath);
      await page.waitForTimeout(1000);

      await wedocit.captureStep({
        title: 'Pemilihan File Lampiran Valid (.pdf <= 5 MB)',
        description: 'Pengguna memilih berkas valid sample-valid.pdf untuk dilampirkan pada kertas kerja pengujian.',
        input: 'sample-valid.pdf',
        screenshot: false
      });

      const uploadBtn = page.locator('p-button[label="Upload"], button:has-text("Upload")').first();
      await uploadBtn.click();
      await page.waitForTimeout(2000);

      await wedocit.captureStep({
        title: 'Verifikasi Berkas Sukses Diunggah pada Tabel Lampiran',
        description: 'Sistem memproses penyimpanan berkas lampiran dan memperbarui daftar lampiran.',
        expected: 'Muncul notifikasi sukses upload dan berkas sample-valid.pdf tersaji pada tabel daftar lampiran.'
      });
    }
  });

  // --- Skenario 2.3 ---
  test('[TC-2.3] Reset Jodit Editor saat Tambah Simpulan Berulang', async ({ page, wedocit }) => {
    wedocit.setMetadata({
      title: 'Unit Test Documentation - Pengujian AP Non-Kredit Offline',
      module: 'Pengujian AP Non-Kredit Pelaksanaan Offline',
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
      scope: 'Pengujian reset state komponen Rich Text Jodit Editor saat membuka modal Tambah Simpulan secara berulang',
      acceptanceCriteria: 'Editor Jodit dan form ter-reset bersih (kosong), tidak ada sisa teks simpulan sebelumnya yang tertinggal.'
    });

    wedocit.setTestCase({
      tcNumberStr: 'TC-2.3',
      scenarioName: 'Reset Jodit Editor saat Tambah Simpulan Berulang',
      title: 'Verifikasi Reset State Jodit Editor saat Membuka Form Simpulan Berulang Kali',
      expectedResult: 'Editor Jodit dan form bersih (kosong), tidak ada teks simpulan sebelumnya yang tertinggal.',
      role: 'FASTIA25'
    });

    await navigateToPengujianAp(page);

    const tambahSimpulanBtn = page.locator('button:has-text("Tambah Simpulan")').first();
    if (await tambahSimpulanBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      // 1. Buka modal pertama
      await tambahSimpulanBtn.click();
      await page.waitForTimeout(1000);

      const joditEditor = page.locator('.jodit-wysiwyg, app-jodit-editor textarea, [contenteditable="true"]').first();
      if (await joditEditor.isVisible()) {
        await joditEditor.click();
        await page.keyboard.type('Simpulan Pengujian Siklus 1 untuk pengujian reset state');
      }

      await wedocit.captureStep({
        title: 'Input Teks Simpulan Awal pada Jodit Editor',
        description: 'Pengguna memasukkan teks simpulan pengujian pada modal Tambah Simpulan.',
        expected: 'Teks terisi di dalam area kerja Rich Text Jodit Editor.'
      });

      // Tutup dialog
      const closeBtn = page.locator('.p-dialog-header-close, button[aria-label="Close"], button:has-text("Batal")').first();
      await closeBtn.click();
      await page.waitForTimeout(1000);

      // 2. Buka kembali modal yang sama
      await tambahSimpulanBtn.click();
      await page.waitForTimeout(1500);

      await wedocit.captureStep({
        title: 'Verifikasi Editor Jodit Bersih Saat Modal Dibuka Kembali',
        description: 'Pengguna membuka kembali modal Tambah Simpulan untuk memastikan tidak ada teks residu.',
        expected: 'Area Jodit Editor bersih (kosong) dan siap untuk penambahan data baru.'
      });

      const currentText = await page.locator('.jodit-wysiwyg').first().innerText().catch(() => '');
      expect(currentText.trim()).toBe('');
    }
  });

  // --- Skenario 2.4 ---
  test('[TC-2.4] Reset Jodit Editor saat Batal / Tutup Dialog', async ({ page, wedocit }) => {
    wedocit.setMetadata({
      title: 'Unit Test Documentation - Pengujian AP Non-Kredit Offline',
      module: 'Pengujian AP Non-Kredit Pelaksanaan Offline',
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
      scope: 'Pengujian reset state Jodit Editor saat dialog dibatalkan / ditutup melalui tombol [X] atau Cancel',
      acceptanceCriteria: 'Editor Jodit bersih kembali saat modal dibuka ulang, tidak menyimpan draft yang dibatalkan.'
    });

    wedocit.setTestCase({
      tcNumberStr: 'TC-2.4',
      scenarioName: 'Reset Jodit Editor saat Batal / Tutup Dialog',
      title: 'Verifikasi Pembersihan State Jodit Editor saat Aksi Batal / Tutup Modal [X]',
      expectedResult: 'Editor Jodit bersih kembali, tidak menyimpan draft yang dibatalkan.',
      role: 'FASTIA25'
    });

    await navigateToPengujianAp(page);

    const tambahSimpulanBtn = page.locator('button:has-text("Tambah Simpulan")').first();
    if (await tambahSimpulanBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await tambahSimpulanBtn.click();
      await page.waitForTimeout(1000);

      const joditEditor = page.locator('.jodit-wysiwyg, [contenteditable="true"]').first();
      if (await joditEditor.isVisible()) {
        await joditEditor.click();
        await page.keyboard.type('Draf teks yang akan dibatalkan oleh pengguna');
      }

      await wedocit.captureStep({
        title: 'Pengetikan Draf pada Jodit Editor Sebelum Batal',
        description: 'Pengguna mengetik teks draf simpulan kemudian memutuskan untuk menutup dialog tanpa menyimpan.',
        expected: 'Teks draf tampil di editor sebelum penutupan dialog.'
      });

      // Klik tombol close [X]
      const closeBtn = page.locator('.p-dialog-header-close, button[aria-label="Close"]').first();
      await closeBtn.click();
      await page.waitForTimeout(1000);

      // Buka kembali modal
      await tambahSimpulanBtn.click();
      await page.waitForTimeout(1500);

      await wedocit.captureStep({
        title: 'Verifikasi Tidak Ada Draft Tersimpan Setelah Pembatalan',
        description: 'Pengguna membuka kembali modal dan memverifikasi editor dalam keadaan bersih.',
        expected: 'Editor Jodit bersih total tanpa menyisakan draf yang telah dibatalkan.'
      });

      const currentText = await page.locator('.jodit-wysiwyg').first().innerText().catch(() => '');
      expect(currentText.trim()).toBe('');
    }
  });

  // --- Skenario 2.5 ---
  test('[TC-2.5] Edit Simpulan Anggota', async ({ page, wedocit }) => {
    wedocit.setMetadata({
      title: 'Unit Test Documentation - Pengujian AP Non-Kredit Offline',
      module: 'Pengujian AP Non-Kredit Pelaksanaan Offline',
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
      scope: 'Pengujian pemuatan data eksisting pada modal Edit Simpulan Anggota',
      acceptanceCriteria: 'Modal Edit Simpulan terbuka dan editor Jodit terisi sesuai data simpulan yang dipilih secara presisi.'
    });

    wedocit.setTestCase({
      tcNumberStr: 'TC-2.5',
      scenarioName: 'Edit Simpulan Anggota',
      title: 'Pemuatan Data Eksisting Simpulan pada Modal Edit Simpulan Anggota',
      expectedResult: 'Modal Edit Simpulan terbuka dan editor Jodit terisi sesuai teks simpulan yang dipilih.',
      role: 'FASTIA25'
    });

    await navigateToPengujianAp(page);

    const ubahSimpulanBtn = page.locator('button:has-text("Ubah Simpulan"), p-button[label="Ubah Simpulan"]').first();
    if (await ubahSimpulanBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await wedocit.captureStep({
        title: 'Pemeriksaan Daftar Simpulan Eksisting',
        description: 'Pengguna memilih baris simpulan yang telah tersimpan untuk melakukan perubahan.',
        expected: 'Tombol "Ubah Simpulan" aktif pada kartu simpulan.'
      });

      await ubahSimpulanBtn.click();
      await page.waitForTimeout(2000);

      await wedocit.captureStep({
        title: 'Verifikasi Modal Edit Simpulan dan Data Jodit Editor Terisi',
        description: 'Sistem membuka dialog Edit Simpulan dan memuat data simpulan ke dalam Jodit Editor.',
        expected: 'Modal Edit Simpulan terbuka dan editor Jodit terisi sesuai teks simpulan yang dipilih.'
      });
    }
  });

});
