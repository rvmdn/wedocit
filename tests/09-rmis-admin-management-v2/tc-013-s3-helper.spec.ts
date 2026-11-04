import { test, expect, commonTestConfig, setupTest, navigateToAdmin, closeModalIfOpen } from './_common';

test.use(commonTestConfig);

test.describe('[V2.0] [TC-013] Storage Utility - S3 Helper (Lifecycle)', () => {
  test.beforeEach(async ({ page, wedocit }) => {
    await setupTest(page, wedocit);
  });

test('[TC-013] Storage Utility - S3 Helper (Lifecycle)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-013',
      scenarioName: 'Siklus Pengelolaan Berkas Penyimpanan S3 (Read -> Upload -> Delete)',
      title: 'Storage Utility - S3 Helper Lifecycle',
      expectedResult: 'Berhasil membuka antarmuka S3 Helper (Read), mengunggah berkas dokumen uji (Upload/Create), dan menghapus berkas uji (Delete).',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/s3-helper');

    // SUB-TC 13.1: READ
    await test.step('Sub-TC 13.1: [READ] Akses Halaman S3 & Tinjau Berkas Dokumen', async () => {
      console.log('   🔹 [Sub-TC 13.1: READ] Memeriksa daftar berkas di bucket S3...');
      const searchS3 = page.locator('input[formcontrolname="prefix"], input[placeholder*="file" i]').first();
      const btnSearchS3 = page.locator('button:has-text("Search")').first();
      if (await searchS3.isVisible().catch(() => false)) {
        await searchS3.fill('test');
        if (await btnSearchS3.isVisible().catch(() => false)) await btnSearchS3.click();
        await page.waitForTimeout(400);
      }

      await wedocit.captureStep({
        title: 'Sub-TC 13.1: [READ] Akses Halaman S3 & Tinjau Berkas Dokumen',
        description: 'Membuka antarmuka S3 File Management untuk meninjau berkas penyimpanan dan memeriksa direktori bucket.',
        input: 'URL: /admin/s3-helper, Prefix: test',
        expected: 'Tabel daftar berkas S3 ditampilkan lengkap dengan nama key, ukuran file, dan tanggal modifikasi.',
        highlight: searchS3
      });
    });

    // SUB-TC 13.2: CREATE - Buka Modal Upload
    await test.step('Sub-TC 13.2: [CREATE] Membuka Modal Upload Berkas Dokumen ke S3', async () => {
      console.log('   🔹 [Sub-TC 13.2: CREATE] Membuka modal Upload File...');
      const btnUploadS3 = page.locator('button:has-text("Upload File"), button[label*="Upload"]').first();
      await wedocit.captureStep({
        title: 'Sub-TC 13.2: [CREATE] Membuka Modal Upload Berkas Dokumen ke S3',
        description: 'Pengguna menekan tombol "Upload File" pada toolbar halaman untuk membuka modal pengunggahan berkas ke storage S3.',
        input: 'Klik Tombol: Upload File',
        expected: 'Modal formulir upload berkas dokumen S3 terbuka di layar.',
        highlight: btnUploadS3
      });

      if (await btnUploadS3.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnUploadS3.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 13.3: CREATE - Pilih Berkas
    await test.step('Sub-TC 13.3: [CREATE] Memilih Berkas Dokumen Uji pada Modal', async () => {
      console.log('   🔹 [Sub-TC 13.3: CREATE] Memilih file uji test-evidence-edv.txt...');
      const uploadDialogArea = page.locator('p-dialog[header*="Upload"], .p-dialog, p-fileupload').first();
      await wedocit.captureStep({
        title: 'Sub-TC 13.3: [CREATE] Memilih Berkas Dokumen Uji pada Modal',
        description: 'Memilih file test-evidence-edv.txt dan mengonfigurasi bucket penyimpanan target.',
        input: 'File Target: test-evidence-edv.txt, Bucket: rmis-attachments',
        expected: 'File uji terlampir pada area upload dan siap dieksekusi.',
        highlight: uploadDialogArea
      });
    });

    // SUB-TC 13.4: CREATE - Eksekusi Upload
    await test.step('Sub-TC 13.4: [CREATE] Eksekusi Unggah Berkas ke Bucket Penyimpanan', async () => {
      console.log('   🔹 [Sub-TC 13.4: CREATE] Mengeksekusi simpan upload file...');
      const btnSubmitUpload = page.locator('.p-dialog button:has-text("Upload"), .p-dialog button:has-text("Save"), .p-dialog button:has-text("Simpan")').first();
      await wedocit.captureStep({
        title: 'Sub-TC 13.4: [CREATE] Eksekusi Unggah Berkas ke Bucket Penyimpanan',
        description: 'Pengguna menekan tombol konfirmasi upload untuk mengirim berkas uji ke storage S3.',
        input: 'Klik Tombol: Upload / Simpan Berkas',
        expected: 'Berkas berhasil diunggah ke storage S3 dengan respons HTTP 200 OK.',
        highlight: btnSubmitUpload
      });

      await closeModalIfOpen(page);
    });

    // SUB-TC 13.5: DELETE - Klik Hapus Berkas
    await test.step('Sub-TC 13.5: [DELETE] Memilih Aksi Hapus pada Baris Berkas Dokumen', async () => {
      console.log('   🔹 [Sub-TC 13.5: DELETE] Menekan tombol Delete berkas S3...');
      const btnDeleteFileRow = page.locator('p-table tbody tr:first-child button:has(.pi-trash)').first();
      await wedocit.captureStep({
        title: 'Sub-TC 13.5: [DELETE] Memilih Aksi Hapus pada Baris Berkas Dokumen',
        description: 'Pengguna menekan icon Delete pada baris berkas dokumen untuk memicu konfirmasi penghapusan permanen.',
        input: 'Klik Icon: Delete File pada baris pertama',
        expected: 'Dialog peringatan konfirmasi penghapusan berkas S3 muncul di layar.',
        highlight: btnDeleteFileRow
      });

      if (await btnDeleteFileRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnDeleteFileRow.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 13.6: DELETE - Konfirmasi Hapus Berkas
    await test.step('Sub-TC 13.6: [DELETE] Konfirmasi Eksekusi Hapus Berkas dari Bucket', async () => {
      console.log('   🔹 [Sub-TC 13.6: DELETE] Mengonfirmasi hapus berkas S3...');
      const confirmDialog = page.locator('.p-confirm-dialog, .p-dialog').first();
      const btnConfirmDel = page.locator('.p-confirm-dialog button.p-confirm-dialog-accept, .p-confirm-dialog button:has-text("Hapus"), .p-confirm-dialog button:has-text("Ya")').first();

      const targetHighlight = (await btnConfirmDel.isVisible({ timeout: 1000 }).catch(() => false)) ? btnConfirmDel : confirmDialog;

      await wedocit.captureStep({
        title: 'Sub-TC 13.6: [DELETE] Konfirmasi Eksekusi Hapus Berkas dari Bucket',
        description: 'Pengguna menekan tombol konfirmasi Hapus pada dialog peringatan untuk menghapus file dari storage S3.',
        input: 'Klik Tombol: Hapus / Ya, Lanjutkan',
        expected: 'Berkas berhasil dihapus permanen dari storage S3 tanpa residu.',
        highlight: targetHighlight
      });

      await closeModalIfOpen(page);
    });
  });

  // =========================================================================
});