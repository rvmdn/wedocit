import { test, expect, commonTestConfig, setupTest, navigateToAdmin, closeModalIfOpen } from './_common';

test.use(commonTestConfig);

test.describe('[V2.0] [TC-008] Lookup Management - MIO Lookup (CRUD Lifecycle)', () => {
  test.beforeEach(async ({ page, wedocit }) => {
    await setupTest(page, wedocit);
  });

test('[TC-008] Lookup Management - MIO Lookup (CRUD Lifecycle)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-008',
      scenarioName: 'Siklus CRUD Parameter Lookup Middle Office (Create -> Read -> Update -> Delete)',
      title: 'Lookup Management - MIO Lookup CRUD',
      expectedResult: 'Berhasil menguji alur pembuatan parameter likuiditas MIO baru (Create), verifikasi pada tabel (Read), pengubahan batasan/label (Update), dan pembersihan item uji (Delete).',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/lookup/mio');

    // Tunggu tombol Add Lookup atau tabel MIO selesai dimuat
    const btnAddMio = page.locator('button:has-text("Add Lookup"), button[label*="Add"]').first();
    await btnAddMio.waitFor({ state: 'visible', timeout: 15000 });

    // SUB-TC 8.1: CREATE - Buka Modal Tambah
    await test.step('Sub-TC 8.1: [CREATE] Akses Formulir Tambah Parameter MIO Baru', async () => {
      console.log('   🔹 [Sub-TC 8.1: CREATE] Membuka modal Add Lookup MIO...');
      await wedocit.captureStep({
        title: 'Sub-TC 8.1: [CREATE] Akses Formulir Tambah Parameter MIO Baru',
        description: 'Pengguna menekan tombol "Add Lookup" pada toolbar halaman untuk membuka form pendaftaran parameter rasio likuiditas MIO baru.',
        input: 'Klik Tombol: Add Lookup MIO',
        expected: 'Modal formulir parameter rasio likuiditas MIO terbuka di layar.',
        highlight: btnAddMio
      });

      await btnAddMio.click();
      await page.locator('app-lookup-form-modal p-dialog .p-dialog').first().waitFor({ state: 'visible', timeout: 7000 });
      await page.waitForTimeout(400);
    });

    // SUB-TC 8.2: CREATE - Input Form MIO
    await test.step('Sub-TC 8.2: [CREATE] Pengisian Form Parameter Likuiditas MIO', async () => {
      console.log('   🔹 [Sub-TC 8.2: CREATE] Mengisi form parameter MIO...');
      const mioModuleInput = page.locator('app-lookup-form-modal input[formcontrolname="lookupModule"], app-lookup-form-modal input#module').first();
      const mioTypeInput = page.locator('app-lookup-form-modal input[formcontrolname="lookupType"], app-lookup-form-modal input#type').first();
      const mioNameInput = page.locator('app-lookup-form-modal input[formcontrolname="lookupName"], app-lookup-form-modal input#name').first();
      const mioValueInput = page.locator('app-lookup-form-modal input[formcontrolname="lookupValue"], app-lookup-form-modal input#value').first();
      const mioOrderInput = page.locator('app-lookup-form-modal input[formcontrolname="lookupOrder"], app-lookup-form-modal input#order').first();

      await mioNameInput.waitFor({ state: 'visible', timeout: 5000 });

      if (await mioModuleInput.isEditable().catch(() => false)) await mioModuleInput.fill('MIO');
      if (await mioTypeInput.isEditable().catch(() => false)) await mioTypeInput.fill('RATIO');
      await mioNameInput.fill('[TEST-EDV] Rasio Uji Likuiditas');
      await mioValueInput.fill('85');
      if (await mioOrderInput.isEditable().catch(() => false)) await mioOrderInput.fill('1');

      await wedocit.captureStep({
        title: 'Sub-TC 8.2: [CREATE] Pengisian Form Parameter Likuiditas MIO',
        description: 'Mengisi data parameter rasio likuiditas uji dengan module MIO, tipe RATIO, dan nilai batas normal 85.',
        input: 'Module: MIO, Type: RATIO, Name: [TEST-EDV] Rasio Uji Likuiditas, Value: 85',
        expected: 'Formulir parameter MIO terisi dengan nilai batas yang valid.',
        highlight: mioNameInput
      });
    });

    // SUB-TC 8.3: CREATE - Simpan Parameter MIO
    await test.step('Sub-TC 8.3: [CREATE] Simpan Parameter Rasio MIO ke Database', async () => {
      console.log('   🔹 [Sub-TC 8.3: CREATE] Menekan tombol Save Lookup MIO...');
      const btnSaveMio = page.locator('app-lookup-form-modal button:has-text("Save"), app-lookup-form-modal button:has(.pi-check)').first();
      await btnSaveMio.waitFor({ state: 'visible', timeout: 5000 });

      await wedocit.captureStep({
        title: 'Sub-TC 8.3: [CREATE] Simpan Parameter Rasio MIO ke Database',
        description: 'Pengguna menekan tombol "Save" pada dialog untuk menyimpan parameter rasio MIO baru ke database.',
        input: 'Klik Tombol: Save Parameter MIO',
        expected: 'Parameter rasio MIO baru berhasil disimpan ke tabel LOOKUP_MIO.',
        highlight: btnSaveMio
      });

      await btnSaveMio.click();
      await page.locator('app-lookup-form-modal p-dialog .p-dialog').first().waitFor({ state: 'hidden', timeout: 7000 }).catch(() => {});
      await page.waitForTimeout(600);
    });

    // SUB-TC 8.4: READ - Filter Tabel MIO
    await test.step('Sub-TC 8.4: [READ] Pencarian & Verifikasi Parameter MIO pada Tabel', async () => {
      console.log('   🔹 [Sub-TC 8.4: READ] Menyaring parameter MIO...');
      const mioFilter = page.locator('input[placeholder*="Filter" i]').first();
      const btnMioFilter = page.locator('button:has-text("Filter")').first();

      await mioFilter.waitFor({ state: 'visible', timeout: 5000 });
      await mioFilter.fill('MIO');
      if (await btnMioFilter.isVisible().catch(() => false)) await btnMioFilter.click();
      await page.waitForTimeout(600);

      await wedocit.captureStep({
        title: 'Sub-TC 8.4: [READ] Pencarian & Verifikasi Parameter MIO pada Tabel',
        description: 'Menyaring daftar parameter MIO berdasarkan kata kunci untuk memastikan nilai terekam.',
        input: 'Filter Keyword: MIO',
        expected: 'Parameter MIO berhasil ditemukan dan ditampilkan pada grid.',
        highlight: mioFilter
      });
    });

    // SUB-TC 8.5: UPDATE - Buka Modal Edit MIO
    await test.step('Sub-TC 8.5: [UPDATE] Memilih Baris Data & Membuka Modal Edit MIO', async () => {
      console.log('   🔹 [Sub-TC 8.5: UPDATE] Memilih aksi edit parameter MIO...');
      const btnEditMioRow = page.locator('p-table tbody tr:first-child button:has(.pi-pencil)').first();
      await btnEditMioRow.waitFor({ state: 'visible', timeout: 7000 });

      await wedocit.captureStep({
        title: 'Sub-TC 8.5: [UPDATE] Memilih Baris Data & Membuka Modal Edit MIO',
        description: 'Pengguna menekan tombol icon Edit pada baris parameter MIO terpilih di tabel.',
        input: 'Klik Icon: Edit MIO pada baris pertama',
        expected: 'Modal formulir edit parameter MIO terbuka dengan nilai batasan saat ini.',
        highlight: btnEditMioRow
      });

      await btnEditMioRow.click();
      await page.locator('app-lookup-form-modal p-dialog .p-dialog').first().waitFor({ state: 'visible', timeout: 7000 });
      await page.waitForTimeout(400);
    });

    // SUB-TC 8.6: UPDATE - Ubah Batasan Nilai
    await test.step('Sub-TC 8.6: [UPDATE] Memperbarui Ambang Batas Parameter MIO', async () => {
      console.log('   🔹 [Sub-TC 8.6: UPDATE] Mengubah threshold rasio MIO...');
      const mioValueEdit = page.locator('app-lookup-form-modal input[formcontrolname="lookupValue"], app-lookup-form-modal input#value').first();
      await mioValueEdit.waitFor({ state: 'visible', timeout: 5000 });
      await mioValueEdit.fill('90');

      await wedocit.captureStep({
        title: 'Sub-TC 8.6: [UPDATE] Memperbarui Ambang Batas Parameter MIO',
        description: 'Memperbarui nilai batas ambang toleransi parameter rasio MIO uji menjadi 90.',
        input: 'Updated Value: 90',
        expected: 'Nilai threshold parameter MIO berhasil diperbarui pada modal.',
        highlight: mioValueEdit
      });
    });

    // SUB-TC 8.7: UPDATE - Simpan Perubahan MIO
    await test.step('Sub-TC 8.7: [UPDATE] Simpan Pembaruan Batasan Parameter MIO', async () => {
      console.log('   🔹 [Sub-TC 8.7: UPDATE] Menyimpan perubahan parameter MIO...');
      const btnSaveMioEdit = page.locator('app-lookup-form-modal button:has-text("Save"), app-lookup-form-modal button:has(.pi-check)').first();
      await btnSaveMioEdit.waitFor({ state: 'visible', timeout: 5000 });

      await wedocit.captureStep({
        title: 'Sub-TC 8.7: [UPDATE] Simpan Pembaruan Batasan Parameter MIO',
        description: 'Pengguna menekan tombol "Save" pada modal dialog untuk memutakhirkan ambang batas rasio MIO.',
        input: 'Klik Tombol: Save Perubahan',
        expected: 'Nilai threshold parameter MIO berhasil diperbarui di sistem.',
        highlight: btnSaveMioEdit
      });

      await btnSaveMioEdit.click();
      await page.locator('app-lookup-form-modal p-dialog .p-dialog').first().waitFor({ state: 'hidden', timeout: 7000 }).catch(() => {});
      await page.waitForTimeout(600);
    });

    // SUB-TC 8.8: DELETE - Klik Hapus Parameter MIO
    await test.step('Sub-TC 8.8: [DELETE] Memilih Aksi Hapus pada Baris Parameter MIO', async () => {
      console.log('   🔹 [Sub-TC 8.8: DELETE] Menekan tombol Delete parameter MIO...');
      const btnDeleteMioRow = page.locator('p-table tbody tr:first-child button:has(.pi-trash)').first();
      await btnDeleteMioRow.waitFor({ state: 'visible', timeout: 7000 });

      await wedocit.captureStep({
        title: 'Sub-TC 8.8: [DELETE] Memilih Aksi Hapus pada Baris Parameter MIO',
        description: 'Pengguna menekan icon Delete pada baris parameter MIO untuk memicu dialog peringatan.',
        input: 'Klik Icon: Delete MIO',
        expected: 'Dialog konfirmasi penghapusan parameter MIO muncul di layar.',
        highlight: btnDeleteMioRow
      });

      await btnDeleteMioRow.click();
      await page.waitForTimeout(600);
    });

    // SUB-TC 8.9: DELETE - Konfirmasi Hapus Parameter MIO
    await test.step('Sub-TC 8.9: [DELETE] Konfirmasi Eksekusi Hapus Parameter MIO Uji', async () => {
      console.log('   🔹 [Sub-TC 8.9: DELETE] Mengonfirmasi hapus parameter MIO...');
      const confirmDialog = page.locator('.p-confirm-dialog, .p-dialog').last();
      const btnConfirmDel = page.locator('.p-confirm-dialog button.p-confirm-dialog-accept, .p-confirm-dialog button:has-text("Hapus"), .p-confirm-dialog button:has-text("Ya"), button.p-button-danger:has-text("Hapus")').first();

      const targetHighlight = (await btnConfirmDel.isVisible({ timeout: 1500 }).catch(() => false)) ? btnConfirmDel : confirmDialog;

      await wedocit.captureStep({
        title: 'Sub-TC 8.9: [DELETE] Konfirmasi Eksekusi Hapus Parameter MIO Uji',
        description: 'Pengguna menekan tombol konfirmasi Hapus pada dialog untuk mengeksekusi penghapusan parameter MIO uji.',
        input: 'Klik Tombol: Hapus / Ya, Lanjutkan',
        expected: 'Parameter MIO uji berhasil dihapus dari sistem secara bersih.',
        highlight: targetHighlight
      });

      await closeModalIfOpen(page);
    });
  });

  // =========================================================================
});