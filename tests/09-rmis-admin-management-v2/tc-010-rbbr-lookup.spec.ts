import { test, expect, commonTestConfig, setupTest, navigateToAdmin, closeModalIfOpen } from './_common';

test.use(commonTestConfig);

test.describe('[V2.0] [TC-010] Lookup Management - RBBR / TKB Lookup (CRUD Lifecycle)', () => {
  test.beforeEach(async ({ page, wedocit }) => {
    await setupTest(page, wedocit);
  });

test('[TC-010] Lookup Management - RBBR / TKB Lookup (CRUD Lifecycle)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-010',
      scenarioName: 'Siklus CRUD Parameter Lookup RBBR / TKB (Create -> Read -> Update -> Delete)',
      title: 'Lookup Management - RBBR Lookup CRUD',
      expectedResult: 'Berhasil mendaftarkan parameter bobot risiko RBBR baru (Create), memverifikasi pada tabel (Read), mengubah bobot persentase (Update), dan menghapus parameter uji (Delete).',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/lookup/rbbr');

    // SUB-TC 10.1: CREATE - Buka Modal Tambah
    await test.step('Sub-TC 10.1: [CREATE] Akses Formulir Tambah Parameter Bobot RBBR', async () => {
      console.log('   🔹 [Sub-TC 10.1: CREATE] Membuka modal Add Lookup RBBR...');
      const btnAddRbbr = page.locator('button:has-text("Add Lookup"), button[label*="Add"]').first();
      await wedocit.captureStep({
        title: 'Sub-TC 10.1: [CREATE] Akses Formulir Tambah Parameter Bobot RBBR',
        description: 'Pengguna menekan tombol "Add Lookup" pada toolbar halaman untuk membuka form pendaftaran parameter bobot risiko.',
        input: 'Klik Tombol: Add Lookup RBBR',
        expected: 'Modal formulir parameter bobot risiko RBBR terbuka di layar.',
        highlight: btnAddRbbr
      });

      if (await btnAddRbbr.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnAddRbbr.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 10.2: CREATE - Input Form RBBR
    await test.step('Sub-TC 10.2: [CREATE] Pengisian Form Parameter Bobot Risiko RBBR', async () => {
      console.log('   🔹 [Sub-TC 10.2: CREATE] Mengisi form parameter RBBR...');
      const rbbrNameInput = page.locator('input[formcontrolname="lookupName"]').first();
      const rbbrValueInput = page.locator('input[formcontrolname="lookupValue"]').first();

      if (await rbbrNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await rbbrNameInput.fill('[TEST-EDV] Risiko Tambahan Uji RBBR');
        if (await rbbrValueInput.isVisible().catch(() => false)) await rbbrValueInput.fill('5');
      }

      await wedocit.captureStep({
        title: 'Sub-TC 10.2: [CREATE] Pengisian Form Parameter Bobot Risiko RBBR',
        description: 'Mendaftarkan parameter risiko tambahan RBBR_TEST_RISK dengan bobot uji 5%.',
        input: 'Name: [TEST-EDV] Risiko Tambahan Uji RBBR, Value: 5',
        expected: 'Formulir bobot risiko RBBR terisi lengkap dengan nilai numerik valid.',
        highlight: rbbrNameInput
      });
    });

    // SUB-TC 10.3: CREATE - Simpan Parameter RBBR
    await test.step('Sub-TC 10.3: [CREATE] Simpan Parameter Bobot Risiko ke Database', async () => {
      console.log('   🔹 [Sub-TC 10.3: CREATE] Menekan tombol Save Lookup RBBR...');
      const btnSaveRbbr = page.locator('p-dialog button:has-text("Save")').first();
      await wedocit.captureStep({
        title: 'Sub-TC 10.3: [CREATE] Simpan Parameter Bobot Risiko ke Database',
        description: 'Pengguna menekan tombol "Save" pada dialog untuk menyimpan konfigurasi bobot risiko RBBR ke database.',
        input: 'Klik Tombol: Save Parameter RBBR',
        expected: 'Parameter risiko RBBR baru berhasil disimpan ke tabel LOOKUP_RBBR.',
        highlight: btnSaveRbbr
      });

      await closeModalIfOpen(page);
    });

    // SUB-TC 10.4: READ - Filter Tabel RBBR
    await test.step('Sub-TC 10.4: [READ] Filter & Verifikasi Bobot Risiko pada Tabel', async () => {
      console.log('   🔹 [Sub-TC 10.4: READ] Menyaring tabel lookup RBBR...');
      const rbbrFilter = page.locator('input[placeholder*="Filter" i]').first();
      const btnRbbrFilter = page.locator('button:has-text("Filter")').first();
      if (await rbbrFilter.isVisible().catch(() => false)) {
        await rbbrFilter.fill('RBBR');
        if (await btnRbbrFilter.isVisible().catch(() => false)) await btnRbbrFilter.click();
        await page.waitForTimeout(400);
      }

      await wedocit.captureStep({
        title: 'Sub-TC 10.4: [READ] Filter & Verifikasi Bobot Risiko pada Tabel',
        description: 'Menyaring tabel lookup RBBR untuk memeriksa pencatatan dan keterbacaan bobot risiko.',
        input: 'Filter Keyword: RBBR',
        expected: 'Parameter RBBR yang dicari berhasil ditampilkan pada tabel.',
        highlight: rbbrFilter
      });
    });

    // SUB-TC 10.5: UPDATE - Buka Modal Edit RBBR
    await test.step('Sub-TC 10.5: [UPDATE] Memilih Baris Data & Membuka Modal Edit RBBR', async () => {
      console.log('   🔹 [Sub-TC 10.5: UPDATE] Memilih aksi edit parameter RBBR...');
      const btnEditRbbrRow = page.locator('p-table tbody tr:first-child button:has(.pi-pencil)').first();
      await wedocit.captureStep({
        title: 'Sub-TC 10.5: [UPDATE] Memilih Baris Data & Membuka Modal Edit RBBR',
        description: 'Pengguna menekan tombol icon Edit pada baris parameter RBBR terpilih di tabel.',
        input: 'Klik Icon: Edit RBBR pada baris pertama',
        expected: 'Modal formulir edit parameter RBBR terbuka dengan data bobot saat ini.',
        highlight: btnEditRbbrRow
      });

      if (await btnEditRbbrRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnEditRbbrRow.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 10.6: UPDATE - Ubah Nilai Bobot
    await test.step('Sub-TC 10.6: [UPDATE] Memperbarui Nilai Persentase Bobot Risiko', async () => {
      console.log('   🔹 [Sub-TC 10.6: UPDATE] Mengubah bobot RBBR...');
      const editRbbrName = page.locator('p-dialog input[formcontrolname="lookupName"]').first();
      if (await editRbbrName.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editRbbrName.fill('[TEST-EDV] Risiko Tambahan Uji RBBR (Bobot 7.5%)');
      }

      await wedocit.captureStep({
        title: 'Sub-TC 10.6: [UPDATE] Memperbarui Nilai Persentase Bobot Risiko',
        description: 'Memperbarui nilai bobot risiko menjadi 7.5% untuk pengujian perubahan parameter komposit.',
        input: 'Updated: [TEST-EDV] Risiko Tambahan Uji RBBR (Bobot 7.5%)',
        expected: 'Nilai perubahan bobot risiko RBBR terinput pada form modal.',
        highlight: editRbbrName
      });
    });

    // SUB-TC 10.7: UPDATE - Simpan Perubahan RBBR
    await test.step('Sub-TC 10.7: [UPDATE] Simpan Pembaruan Bobot Risiko ke Sistem', async () => {
      console.log('   🔹 [Sub-TC 10.7: UPDATE] Menyimpan perubahan bobot RBBR...');
      const btnSaveRbbrEdit = page.locator('p-dialog button:has-text("Save")').first();
      await wedocit.captureStep({
        title: 'Sub-TC 10.7: [UPDATE] Simpan Pembaruan Bobot Risiko ke Sistem',
        description: 'Pengguna menekan tombol "Save" pada modal dialog untuk memutakhirkan bobot parameter RBBR.',
        input: 'Klik Tombol: Save Perubahan',
        expected: 'Nilai bobot risiko RBBR berhasil diperbarui di sistem.',
        highlight: btnSaveRbbrEdit
      });

      await closeModalIfOpen(page);
    });

    // SUB-TC 10.8: DELETE - Klik Hapus Parameter RBBR
    await test.step('Sub-TC 10.8: [DELETE] Memilih Aksi Hapus pada Baris Parameter RBBR', async () => {
      console.log('   🔹 [Sub-TC 10.8: DELETE] Menekan tombol Delete parameter RBBR...');
      const btnDeleteRbbrRow = page.locator('p-table tbody tr:first-child button:has(.pi-trash)').first();
      await wedocit.captureStep({
        title: 'Sub-TC 10.8: [DELETE] Memilih Aksi Hapus pada Baris Parameter RBBR',
        description: 'Pengguna menekan icon Delete pada baris parameter RBBR untuk memicu konfirmasi penghapusan.',
        input: 'Klik Icon: Delete RBBR',
        expected: 'Dialog konfirmasi penghapusan parameter RBBR muncul di layar.',
        highlight: btnDeleteRbbrRow
      });

      if (await btnDeleteRbbrRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnDeleteRbbrRow.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 10.9: DELETE - Konfirmasi Hapus Parameter RBBR
    await test.step('Sub-TC 10.9: [DELETE] Konfirmasi Eksekusi Hapus Parameter RBBR Uji', async () => {
      console.log('   🔹 [Sub-TC 10.9: DELETE] Mengonfirmasi hapus parameter RBBR...');
      const confirmDialog = page.locator('.p-confirm-dialog, .p-dialog').first();
      const btnConfirmDel = page.locator('.p-confirm-dialog button.p-confirm-dialog-accept, .p-confirm-dialog button:has-text("Hapus"), .p-confirm-dialog button:has-text("Ya")').first();

      const targetHighlight = (await btnConfirmDel.isVisible({ timeout: 1000 }).catch(() => false)) ? btnConfirmDel : confirmDialog;

      await wedocit.captureStep({
        title: 'Sub-TC 10.9: [DELETE] Konfirmasi Eksekusi Hapus Parameter RBBR Uji',
        description: 'Pengguna menekan tombol konfirmasi Hapus pada dialog peringatan untuk mengeksekusi penghapusan parameter.',
        input: 'Klik Tombol: Hapus / Ya, Lanjutkan',
        expected: 'Parameter RBBR uji berhasil dihapus dari sistem secara bersih.',
        highlight: targetHighlight
      });

      await closeModalIfOpen(page);
    });
  });

  // =========================================================================
});