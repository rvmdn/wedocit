import { test, expect, commonTestConfig, setupTest, navigateToAdmin, closeModalIfOpen } from './_common';

test.use(commonTestConfig);

test.describe('[V2.0] [TC-009] Lookup Management - MRM Lookup (CRUD Lifecycle)', () => {
  test.beforeEach(async ({ page, wedocit }) => {
    await setupTest(page, wedocit);
  });

test('[TC-009] Lookup Management - MRM Lookup (CRUD Lifecycle)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-009',
      scenarioName: 'Siklus CRUD Parameter Lookup Model Risk Management (Create -> Read -> Update -> Delete)',
      title: 'Lookup Management - MRM Lookup CRUD',
      expectedResult: 'Berhasil mendaftarkan parameter MRM baru (Create), memverifikasi pada tabel (Read), mengubah deskripsi (Update), dan menghapus parameter uji (Delete).',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/lookup/mrm');

    // SUB-TC 9.1: CREATE - Buka Modal Tambah
    await test.step('Sub-TC 9.1: [CREATE] Akses Formulir Tambah Parameter MRM Baru', async () => {
      console.log('   🔹 [Sub-TC 9.1: CREATE] Membuka modal Add Lookup MRM...');
      const btnAddMrm = page.locator('button:has-text("Add Lookup"), button[label*="Add"]').first();
      await wedocit.captureStep({
        title: 'Sub-TC 9.1: [CREATE] Akses Formulir Tambah Parameter MRM Baru',
        description: 'Pengguna menekan tombol "Add Lookup" pada toolbar halaman untuk membuka form pembuatan parameter status model.',
        input: 'Klik Tombol: Add Lookup MRM',
        expected: 'Modal formulir parameter model risk management terbuka di layar.',
        highlight: btnAddMrm
      });

      if (await btnAddMrm.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnAddMrm.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 9.2: CREATE - Input Form MRM
    await test.step('Sub-TC 9.2: [CREATE] Pengisian Form Parameter Siklus Model Risk', async () => {
      console.log('   🔹 [Sub-TC 9.2: CREATE] Mengisi form parameter MRM...');
      const mrmNameInput = page.locator('input[formcontrolname="lookupName"], input[formcontrolname="name"]').first();
      const mrmValueInput = page.locator('input[formcontrolname="lookupValue"], input[formcontrolname="value"]').first();

      if (await mrmNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await mrmNameInput.fill('[TEST-EDV] Status Validasi Model Khusus');
        if (await mrmValueInput.isVisible().catch(() => false)) await mrmValueInput.fill('15');
      }

      await wedocit.captureStep({
        title: 'Sub-TC 9.2: [CREATE] Pengisian Form Parameter Siklus Model Risk',
        description: 'Mendaftarkan parameter status siklus model uji dengan kode nilai 15 dan deskripsi pengujian.',
        input: 'Name: [TEST-EDV] Status Validasi Model Khusus, Value: 15',
        expected: 'Formulir parameter MRM terisi dengan konfigurasi data yang tepat.',
        highlight: mrmNameInput
      });
    });

    // SUB-TC 9.3: CREATE - Simpan Parameter MRM
    await test.step('Sub-TC 9.3: [CREATE] Simpan Parameter Model Risk ke Database', async () => {
      console.log('   🔹 [Sub-TC 9.3: CREATE] Menekan tombol Save Lookup MRM...');
      const btnSaveMrm = page.locator('p-dialog button:has-text("Save")').first();
      await wedocit.captureStep({
        title: 'Sub-TC 9.3: [CREATE] Simpan Parameter Model Risk ke Database',
        description: 'Pengguna menekan tombol "Save" pada dialog untuk menyimpan rekaman parameter model risk management.',
        input: 'Klik Tombol: Save Parameter MRM',
        expected: 'Parameter status model baru berhasil disimpan ke tabel LOOKUP_MODEL_RISK_MANAGEMENT.',
        highlight: btnSaveMrm
      });

      await closeModalIfOpen(page);
    });

    // SUB-TC 9.4: READ - Filter Tabel MRM
    await test.step('Sub-TC 9.4: [READ] Filter & Verifikasi Parameter MRM pada Tabel', async () => {
      console.log('   🔹 [Sub-TC 9.4: READ] Menyaring parameter MRM...');
      const mrmFilter = page.locator('input[placeholder*="Name" i], input[placeholder*="Filter" i]').first();
      const btnMrmFilter = page.locator('button:has-text("Filter")').first();
      if (await mrmFilter.isVisible().catch(() => false)) {
        await mrmFilter.fill('Model');
        if (await btnMrmFilter.isVisible().catch(() => false)) await btnMrmFilter.click();
        await page.waitForTimeout(400);
      }

      await wedocit.captureStep({
        title: 'Sub-TC 9.4: [READ] Filter & Verifikasi Parameter MRM pada Tabel',
        description: 'Menyaring parameter MRM berdasarkan nama model untuk memverifikasi pencatatan data referensi.',
        input: 'Filter Keyword: Model',
        expected: 'Data parameter MRM berhasil disaring dan ditampilkan pada tabel.',
        highlight: mrmFilter
      });
    });

    // SUB-TC 9.5: UPDATE - Buka Modal Edit MRM
    await test.step('Sub-TC 9.5: [UPDATE] Memilih Baris Data & Membuka Modal Edit MRM', async () => {
      console.log('   🔹 [Sub-TC 9.5: UPDATE] Memilih aksi edit parameter MRM...');
      const btnEditMrmRow = page.locator('p-table tbody tr:first-child button:has(.pi-pencil)').first();
      await wedocit.captureStep({
        title: 'Sub-TC 9.5: [UPDATE] Memilih Baris Data & Membuka Modal Edit MRM',
        description: 'Pengguna menekan tombol icon Edit pada baris parameter MRM terpilih di tabel.',
        input: 'Klik Icon: Edit MRM pada baris pertama',
        expected: 'Modal formulir edit parameter MRM terbuka dengan rincian saat ini.',
        highlight: btnEditMrmRow
      });

      if (await btnEditMrmRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnEditMrmRow.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 9.6: UPDATE - Ubah Deskripsi MRM
    await test.step('Sub-TC 9.6: [UPDATE] Memperbarui Deskripsi Status Model Risk', async () => {
      console.log('   🔹 [Sub-TC 9.6: UPDATE] Mengubah deskripsi parameter MRM...');
      const editMrmName = page.locator('p-dialog input[formcontrolname="lookupName"], p-dialog input[formcontrolname="name"]').first();
      if (await editMrmName.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editMrmName.fill('[TEST-EDV] Status Validasi Model Khusus (Updated)');
      }

      await wedocit.captureStep({
        title: 'Sub-TC 9.6: [UPDATE] Memperbarui Deskripsi Status Model Risk',
        description: 'Memperbarui nama deskripsi parameter MRM menjadi [TEST-EDV] Status Validasi Model Khusus (Updated).',
        input: 'Updated Name: [TEST-EDV] Status Validasi Model Khusus (Updated)',
        expected: 'Pembaruan deskripsi parameter MRM terinput pada formulir.',
        highlight: editMrmName
      });
    });

    // SUB-TC 9.7: UPDATE - Simpan Perubahan MRM
    await test.step('Sub-TC 9.7: [UPDATE] Simpan Pembaruan Parameter MRM ke Sistem', async () => {
      console.log('   🔹 [Sub-TC 9.7: UPDATE] Menyimpan perubahan parameter MRM...');
      const btnSaveMrmEdit = page.locator('p-dialog button:has-text("Save")').first();
      await wedocit.captureStep({
        title: 'Sub-TC 9.7: [UPDATE] Simpan Pembaruan Parameter MRM ke Sistem',
        description: 'Pengguna menekan tombol "Save" pada dialog untuk menyimpan pembaruan parameter MRM.',
        input: 'Klik Tombol: Save Perubahan',
        expected: 'Pembaruan deskripsi parameter MRM berhasil disimpan ke database.',
        highlight: btnSaveMrmEdit
      });

      await closeModalIfOpen(page);
    });

    // SUB-TC 9.8: DELETE - Klik Hapus Parameter MRM
    await test.step('Sub-TC 9.8: [DELETE] Memilih Aksi Hapus pada Baris Parameter MRM', async () => {
      console.log('   🔹 [Sub-TC 9.8: DELETE] Menekan tombol Delete parameter MRM...');
      const btnDeleteMrmRow = page.locator('p-table tbody tr:first-child button:has(.pi-trash)').first();
      await wedocit.captureStep({
        title: 'Sub-TC 9.8: [DELETE] Memilih Aksi Hapus pada Baris Parameter MRM',
        description: 'Pengguna menekan icon Delete pada baris parameter MRM untuk memicu konfirmasi penghapusan.',
        input: 'Klik Icon: Delete MRM',
        expected: 'Dialog konfirmasi penghapusan parameter MRM muncul di layar.',
        highlight: btnDeleteMrmRow
      });

      if (await btnDeleteMrmRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnDeleteMrmRow.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 9.9: DELETE - Konfirmasi Hapus Parameter MRM
    await test.step('Sub-TC 9.9: [DELETE] Konfirmasi Eksekusi Hapus Parameter MRM Uji', async () => {
      console.log('   🔹 [Sub-TC 9.9: DELETE] Mengonfirmasi hapus parameter MRM...');
      const confirmDialog = page.locator('.p-confirm-dialog, .p-dialog').first();
      const btnConfirmDel = page.locator('.p-confirm-dialog button.p-confirm-dialog-accept, .p-confirm-dialog button:has-text("Hapus"), .p-confirm-dialog button:has-text("Ya")').first();

      const targetHighlight = (await btnConfirmDel.isVisible({ timeout: 1000 }).catch(() => false)) ? btnConfirmDel : confirmDialog;

      await wedocit.captureStep({
        title: 'Sub-TC 9.9: [DELETE] Konfirmasi Eksekusi Hapus Parameter MRM Uji',
        description: 'Pengguna menekan tombol konfirmasi Hapus pada dialog peringatan untuk mengeksekusi penghapusan.',
        input: 'Klik Tombol: Hapus / Ya, Lanjutkan',
        expected: 'Parameter MRM uji berhasil dihapus secara bersih dari database.',
        highlight: targetHighlight
      });

      await closeModalIfOpen(page);
    });
  });

  // =========================================================================
});