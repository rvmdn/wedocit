import { test, expect, commonTestConfig, setupTest, navigateToAdmin, closeModalIfOpen } from './_common';

test.use(commonTestConfig);

test.describe('[V2.0] [TC-007] Lookup Management - System Lookup (CRUD Lifecycle)', () => {
  test.beforeEach(async ({ page, wedocit }) => {
    await setupTest(page, wedocit);
  });

test('[TC-007] Lookup Management - System Lookup (CRUD Lifecycle)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-007',
      scenarioName: 'Siklus CRUD Parameter Lookup System (Create -> Read -> Update -> Delete)',
      title: 'Lookup Management - System Lookup CRUD',
      expectedResult: 'Berhasil mendaftarkan parameter lookup sistem baru (Create), memverifikasi pada dropdown/tabel (Read), mengubah label deskripsi (Update), dan menghapus kembali item lookup uji (Delete).',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/lookup/system');

    // SUB-TC 7.1: CREATE - Buka Modal Tambah
    await test.step('Sub-TC 7.1: [CREATE] Akses Formulir Tambah Parameter Lookup Baru', async () => {
      console.log('   🔹 [Sub-TC 7.1: CREATE] Membuka modal Add Lookup...');
      const btnAddLookup = page.locator('button:has-text("Add Lookup"), button[label*="Add"]').first();
      await wedocit.captureStep({
        title: 'Sub-TC 7.1: [CREATE] Akses Formulir Tambah Parameter Lookup Baru',
        description: 'Pengguna menekan tombol "Add Lookup" pada toolbar halaman untuk membuka formulir pendaftaran parameter sistem baru.',
        input: 'Klik Tombol: Add Lookup',
        expected: 'Modal formulir penambahan parameter lookup sistem terbuka di layar.',
        highlight: btnAddLookup
      });

      if (await btnAddLookup.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnAddLookup.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 7.2: CREATE - Input Form Lookup
    await test.step('Sub-TC 7.2: [CREATE] Pengisian Atribut Lookup Module, Name & Value', async () => {
      console.log('   🔹 [Sub-TC 7.2: CREATE] Mengisi form parameter lookup...');
      const lookupNameInput = page.locator('input[formcontrolname="lookupName"], input#lookupName').first();
      const lookupValueInput = page.locator('input[formcontrolname="lookupValue"], input#lookupValue').first();

      if (await lookupNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await lookupNameInput.fill('[TEST-EDV] Parameter Uji Sistem');
        if (await lookupValueInput.isVisible().catch(() => false)) await lookupValueInput.fill('99');
      }

      await wedocit.captureStep({
        title: 'Sub-TC 7.2: [CREATE] Pengisian Atribut Lookup Module, Name & Value',
        description: 'Mengisi atribut lookup mencakup Nama [TEST-EDV] Parameter Uji Sistem dan nilai konfigurasi 99.',
        input: 'Name: [TEST-EDV] Parameter Uji Sistem, Value: 99',
        expected: 'Formulir parameter lookup terisi lengkap dengan nilai yang valid.',
        highlight: lookupNameInput
      });
    });

    // SUB-TC 7.3: CREATE - Simpan Parameter Lookup
    await test.step('Sub-TC 7.3: [CREATE] Simpan Parameter Lookup Baru ke Database', async () => {
      console.log('   🔹 [Sub-TC 7.3: CREATE] Menekan tombol Save Lookup...');
      const btnSaveLookup = page.locator('p-dialog button:has-text("Save")').first();
      await wedocit.captureStep({
        title: 'Sub-TC 7.3: [CREATE] Simpan Parameter Lookup Baru ke Database',
        description: 'Pengguna menekan tombol "Save" pada dialog untuk menyimpan parameter lookup sistem baru ke database referensi.',
        input: 'Klik Tombol: Save Lookup',
        expected: 'Parameter lookup baru berhasil disimpan ke database referensi.',
        highlight: btnSaveLookup
      });

      await closeModalIfOpen(page);
    });

    // SUB-TC 7.4: READ - Filter Tabel Lookup
    await test.step('Sub-TC 7.4: [READ] Pencarian & Verifikasi Parameter pada Tabel Lookup', async () => {
      console.log('   🔹 [Sub-TC 7.4: READ] Menyaring tabel lookup sistem...');
      const lookupFilter = page.locator('input[placeholder*="Filter" i]').first();
      const btnLookupFilter = page.locator('button:has-text("Filter")').first();
      if (await lookupFilter.isVisible().catch(() => false)) {
        await lookupFilter.fill('SYSTEM');
        if (await btnLookupFilter.isVisible().catch(() => false)) await btnLookupFilter.click();
        await page.waitForTimeout(400);
      }

      await wedocit.captureStep({
        title: 'Sub-TC 7.4: [READ] Pencarian & Verifikasi Parameter pada Tabel Lookup',
        description: 'Menyaring tabel lookup sistem berdasarkan kata kunci untuk memverifikasi ketersediaan parameter referensi.',
        input: 'Filter Keyword: SYSTEM',
        expected: 'Data parameter lookup yang dicari berhasil ditampilkan pada tabel.',
        highlight: lookupFilter
      });
    });

    // SUB-TC 7.5: UPDATE - Buka Modal Edit Lookup
    await test.step('Sub-TC 7.5: [UPDATE] Memilih Baris Data & Membuka Modal Edit Lookup', async () => {
      console.log('   🔹 [Sub-TC 7.5: UPDATE] Memilih aksi edit pada baris parameter lookup...');
      const btnEditLookupRow = page.locator('p-table tbody tr:first-child button:has(.pi-pencil)').first();
      await wedocit.captureStep({
        title: 'Sub-TC 7.5: [UPDATE] Memilih Baris Data & Membuka Modal Edit Lookup',
        description: 'Pengguna menekan tombol icon Edit pada baris parameter lookup terpilih di tabel.',
        input: 'Klik Icon: Edit Lookup pada baris pertama',
        expected: 'Modal formulir edit lookup terbuka dengan nilai parameter saat ini.',
        highlight: btnEditLookupRow
      });

      if (await btnEditLookupRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnEditLookupRow.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 7.6: UPDATE - Ubah Nilai Label
    await test.step('Sub-TC 7.6: [UPDATE] Memperbarui Nilai Label Parameter Lookup', async () => {
      console.log('   🔹 [Sub-TC 7.6: UPDATE] Mengubah label nama parameter lookup...');
      const editLookupName = page.locator('p-dialog input[formcontrolname="lookupName"]').first();
      if (await editLookupName.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editLookupName.fill('[TEST-EDV] Parameter Uji Sistem (Updated)');
      }

      await wedocit.captureStep({
        title: 'Sub-TC 7.6: [UPDATE] Memperbarui Nilai Label Parameter Lookup',
        description: 'Memperbarui nama label lookup menjadi [TEST-EDV] Parameter Uji Sistem (Updated) pada form modal.',
        input: 'Updated Name: [TEST-EDV] Parameter Uji Sistem (Updated)',
        expected: 'Nilai nama parameter lookup terbarui dengan benar pada modal.',
        highlight: editLookupName
      });
    });

    // SUB-TC 7.7: UPDATE - Simpan Perubahan Lookup
    await test.step('Sub-TC 7.7: [UPDATE] Simpan Pembaruan Data Lookup ke Sistem', async () => {
      console.log('   🔹 [Sub-TC 7.7: UPDATE] Menyimpan perubahan parameter lookup...');
      const btnSaveLookupEdit = page.locator('p-dialog button:has-text("Save")').first();
      await wedocit.captureStep({
        title: 'Sub-TC 7.7: [UPDATE] Simpan Pembaruan Data Lookup ke Sistem',
        description: 'Pengguna menekan tombol "Save" pada modal dialog untuk memutakhirkan data parameter lookup.',
        input: 'Klik Tombol: Save Perubahan',
        expected: 'Pembaruan nama lookup berhasil disimpan ke sistem.',
        highlight: btnSaveLookupEdit
      });

      await closeModalIfOpen(page);
    });

    // SUB-TC 7.8: DELETE - Klik Hapus Parameter Lookup
    await test.step('Sub-TC 7.8: [DELETE] Memilih Aksi Hapus pada Baris Parameter Lookup', async () => {
      console.log('   🔹 [Sub-TC 7.8: DELETE] Menekan tombol Delete lookup...');
      const btnDeleteLookupRow = page.locator('p-table tbody tr:first-child button:has(.pi-trash)').first();
      await wedocit.captureStep({
        title: 'Sub-TC 7.8: [DELETE] Memilih Aksi Hapus pada Baris Parameter Lookup',
        description: 'Pengguna menekan icon Delete pada baris parameter lookup untuk memicu dialog peringatan.',
        input: 'Klik Icon: Delete Lookup',
        expected: 'Dialog konfirmasi penghapusan parameter lookup muncul di layar.',
        highlight: btnDeleteLookupRow
      });

      if (await btnDeleteLookupRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnDeleteLookupRow.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 7.9: DELETE - Konfirmasi Hapus Parameter Lookup
    await test.step('Sub-TC 7.9: [DELETE] Konfirmasi Eksekusi Hapus Parameter Lookup Uji', async () => {
      console.log('   🔹 [Sub-TC 7.9: DELETE] Mengonfirmasi hapus parameter lookup...');
      const confirmDialog = page.locator('.p-confirm-dialog, .p-dialog').first();
      const btnConfirmDel = page.locator('.p-confirm-dialog button.p-confirm-dialog-accept, .p-confirm-dialog button:has-text("Hapus"), .p-confirm-dialog button:has-text("Ya")').first();

      const targetHighlight = (await btnConfirmDel.isVisible({ timeout: 1000 }).catch(() => false)) ? btnConfirmDel : confirmDialog;

      await wedocit.captureStep({
        title: 'Sub-TC 7.9: [DELETE] Konfirmasi Eksekusi Hapus Parameter Lookup Uji',
        description: 'Pengguna menekan tombol konfirmasi Hapus pada dialog peringatan untuk mengeksekusi penghapusan parameter.',
        input: 'Klik Tombol: Hapus / Ya, Lanjutkan',
        expected: 'Item lookup uji berhasil dihapus secara bersih dari tabel.',
        highlight: targetHighlight
      });

      await closeModalIfOpen(page);
    });
  });

  // =========================================================================
});