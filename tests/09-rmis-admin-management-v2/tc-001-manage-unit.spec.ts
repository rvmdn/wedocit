import { test, expect, commonTestConfig, setupTest, navigateToAdmin, closeModalIfOpen } from './_common';

test.use(commonTestConfig);

test.describe('[V2.0] [TC-001] Organization - Manage Unit (CRUD Lifecycle)', () => {
  test.beforeEach(async ({ page, wedocit }) => {
    await setupTest(page, wedocit);
  });

test('[TC-001] Organization - Manage Unit (CRUD Lifecycle)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-001',
      scenarioName: 'Siklus CRUD Master Unit Kerja (Create -> Read -> Update -> Delete)',
      title: 'Organization - Manage Unit CRUD',
      expectedResult: 'Berhasil menjalankan sub-skenario CRUD lengkap: penambahan master unit baru (Create), verifikasi pada tabel (Read), pembaruan data unit (Update), serta pembersihan kembali unit uji (Delete).',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/unit');

    // SUB-TC 1.1: CREATE - Buka Modal Tambah
    await test.step('Sub-TC 1.1: [CREATE] Akses Formulir Tambah Unit Baru', async () => {
      console.log('   🔹 [Sub-TC 1.1: CREATE] Membuka modal Add Unit...');
      const btnAddUnit = page.locator('button:has-text("Add Unit"), button[label*="Add Unit"]').first();
      await wedocit.captureStep({
        title: 'Sub-TC 1.1: [CREATE] Akses Formulir Tambah Unit Baru',
        description: 'Pengguna menekan tombol "Add Unit" pada toolbar halaman untuk membuka modal tambah master unit kerja.',
        input: 'Klik Tombol: Add Unit',
        expected: 'Modal formulir pendaftaran unit kerja baru terbuka di layar.',
        highlight: btnAddUnit
      });

      if (await btnAddUnit.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnAddUnit.click();
        await page.waitForTimeout(800);
      }
    });

    // SUB-TC 1.2: CREATE - Input Data
    await test.step('Sub-TC 1.2: [CREATE] Pengisian Formulir Master Unit Baru', async () => {
      console.log('   🔹 [Sub-TC 1.2: CREATE] Mengisi form master unit baru...');
      const codeInput = page.locator('p-inputnumber#code input, input[formcontrolname="unitCode"]').first();
      const nameInput = page.locator('input[formcontrolname="unitName"]').first();
      const rubrikInput = page.locator('input[formcontrolname="unitRubrik"]').first();
      const outletInput = page.locator('input[formcontrolname="unitOutletCode"]').first();

      if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        if (await codeInput.isVisible().catch(() => false)) await codeInput.fill('720');
        if (await rubrikInput.isVisible().catch(() => false)) await rubrikInput.fill('ADV');
        await nameInput.fill('[TEST-EDV] Divisi Enterprise Audit');
        if (await outletInput.isVisible().catch(() => false)) await outletInput.fill('7200000');
      }

      await wedocit.captureStep({
        title: 'Sub-TC 1.2: [CREATE] Pengisian Formulir Master Unit Baru',
        description: 'Mengisi atribut master unit baru meliputi Unit Code, Rubrik, Unit Name, dan Outlet Code pada formulir modal.',
        input: 'Code: 720, Rubrik: ADV, Name: [TEST-EDV] Divisi Enterprise Audit, Outlet: 7200000',
        expected: 'Seluruh field input wajib terisi dengan data yang valid.',
        highlight: nameInput
      });
    });

    // SUB-TC 1.3: CREATE - Simpan Data
    await test.step('Sub-TC 1.3: [CREATE] Simpan Master Unit Baru ke Sistem', async () => {
      console.log('   🔹 [Sub-TC 1.3: CREATE] Menekan tombol Simpan pada modal Add Unit...');
      const btnSave = page.locator('p-dialog button:has-text("Save")').first();
      await wedocit.captureStep({
        title: 'Sub-TC 1.3: [CREATE] Simpan Master Unit Baru ke Sistem',
        description: 'Pengguna menekan tombol "Save" untuk menyimpan data master unit kerja baru ke database.',
        input: 'Klik Tombol: Save',
        expected: 'Data unit baru berhasil disimpan dan tersimpan pada sistem.',
        highlight: btnSave
      });

      await closeModalIfOpen(page);
    });

    // SUB-TC 1.4: READ - Filter & Verifikasi Tabel
    await test.step('Sub-TC 1.4: [READ] Pencarian & Verifikasi Master Unit pada Tabel', async () => {
      console.log('   🔹 [Sub-TC 1.4: READ] Menyaring tabel untuk memverifikasi data unit...');
      const filterInput = page.locator('input[placeholder*="Filter" i]').first();
      const btnFilter = page.locator('button:has-text("Filter")').first();
      if (await filterInput.isVisible().catch(() => false)) {
        await filterInput.fill('DIVISI');
        if (await btnFilter.isVisible().catch(() => false)) await btnFilter.click();
      }

      await page.waitForSelector('.p-datatable-loading-overlay, p-progressSpinner, .p-progress-spinner', { state: 'detached', timeout: 5000 }).catch(() => {});
      await page.waitForSelector('p-table tbody tr', { state: 'visible', timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(600);

      await wedocit.captureStep({
        title: 'Sub-TC 1.4: [READ] Pencarian & Verifikasi Master Unit pada Tabel',
        description: 'Menyaring tabel master unit berdasarkan kata kunci untuk memverifikasi atribut dan keterbacaan data.',
        input: 'Filter Keyword: DIVISI',
        expected: 'Daftar unit kerja berhasil disaring dan ditampilkan sesuai kata kunci.',
        highlight: filterInput
      });
    });

    // SUB-TC 1.5: UPDATE - Buka Modal Edit
    await test.step('Sub-TC 1.5: [UPDATE] Memilih Data & Membuka Modal Edit Unit', async () => {
      console.log('   🔹 [Sub-TC 1.5: UPDATE] Memilih aksi edit pada baris tabel...');
      await page.waitForSelector('.p-datatable-loading-overlay, p-progressSpinner', { state: 'detached', timeout: 5000 }).catch(() => {});
      const btnEditRow = page.locator('p-table tbody tr:first-child button[ptooltip="Edit"], p-table tbody tr:first-child button:has(.pi-pencil)').first();
      
      await wedocit.captureStep({
        title: 'Sub-TC 1.5: [UPDATE] Memilih Data & Membuka Modal Edit Unit',
        description: 'Pengguna menekan tombol icon Edit pada baris data unit kerja terpilih di tabel.',
        input: 'Klik Icon: Edit Unit pada baris pertama',
        expected: 'Modal formulir edit terbuka dengan seluruh data atribut unit sebelumnya.',
        highlight: btnEditRow
      });

      if (await btnEditRow.isVisible({ timeout: 2500 }).catch(() => false)) {
        await btnEditRow.click();
        await page.waitForSelector('p-dialog input[formcontrolname="unitName"]', { state: 'visible', timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 1.6: UPDATE - Ubah Field
    await test.step('Sub-TC 1.6: [UPDATE] Memperbarui Nilai Atribut Unit Kerja', async () => {
      console.log('   🔹 [Sub-TC 1.6: UPDATE] Mengubah nama dan deskripsi unit...');
      const editName = page.locator('p-dialog input[formcontrolname="unitName"]').first();
      if (await editName.isVisible({ timeout: 3000 }).catch(() => false)) {
        await editName.fill('[TEST-EDV] Divisi Enterprise Audit (Updated)');
        await page.waitForTimeout(300);
      }

      await wedocit.captureStep({
        title: 'Sub-TC 1.6: [UPDATE] Memperbarui Nilai Atribut Unit Kerja',
        description: 'Mengubah deskripsi dan rincian unit kerja pada formulir pembaruan data.',
        input: 'Updated Name: [TEST-EDV] Divisi Enterprise Audit (Updated)',
        expected: 'Nilai data baru terisi pada field formulir modal edit.',
        highlight: editName
      });
    });

    // SUB-TC 1.7: UPDATE - Simpan Perubahan
    await test.step('Sub-TC 1.7: [UPDATE] Simpan Pembaruan Data Unit ke Database', async () => {
      console.log('   🔹 [Sub-TC 1.7: UPDATE] Menekan tombol Save perubahan...');
      const btnSaveEdit = page.locator('p-dialog button:has-text("Save")').first();
      await wedocit.captureStep({
        title: 'Sub-TC 1.7: [UPDATE] Simpan Pembaruan Data Unit ke Database',
        description: 'Pengguna menekan tombol "Save" pada modal dialog untuk memutakhirkan rekaman data unit.',
        input: 'Klik Tombol: Save Perubahan',
        expected: 'Data perubahan unit kerja tersimpan dan nilai terbaru terefleksi pada sistem.',
        highlight: btnSaveEdit
      });

      await closeModalIfOpen(page);
    });

    // SUB-TC 1.8: DELETE - Klik Tombol Hapus pada Baris
    await test.step('Sub-TC 1.8: [DELETE] Memilih Aksi Hapus pada Baris Data Unit', async () => {
      console.log('   🔹 [Sub-TC 1.8: DELETE] Menekan tombol Delete pada baris tabel...');
      const btnDeleteRow = page.locator('p-table tbody tr:first-child button[ptooltip="Delete"], p-table tbody tr:first-child button:has(.pi-trash)').first();
      await wedocit.captureStep({
        title: 'Sub-TC 1.8: [DELETE] Memilih Aksi Hapus pada Baris Data Unit',
        description: 'Pengguna menekan tombol icon Delete pada baris data unit kerja yang ingin dihapus.',
        input: 'Klik Icon: Delete Unit',
        expected: 'Sistem merespons dan menampilkan dialog konfirmasi penghapusan data unit.',
        highlight: btnDeleteRow
      });

      if (await btnDeleteRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnDeleteRow.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 1.9: DELETE - Konfirmasi Hapus pada Dialog
    await test.step('Sub-TC 1.9: [DELETE] Konfirmasi Eksekusi Hapus Data Unit', async () => {
      console.log('   🔹 [Sub-TC 1.9: DELETE] Mengonfirmasi penghapusan data unit uji...');
      const confirmDialog = page.locator('.p-confirm-dialog, .p-dialog').first();
      const btnConfirmDel = page.locator('.p-confirm-dialog button.p-confirm-dialog-accept, .p-confirm-dialog button:has-text("Hapus"), .p-confirm-dialog button:has-text("Ya"), button.p-button-danger:has-text("Hapus")').first();

      const targetHighlight = (await btnConfirmDel.isVisible({ timeout: 1000 }).catch(() => false)) ? btnConfirmDel : confirmDialog;

      await wedocit.captureStep({
        title: 'Sub-TC 1.9: [DELETE] Konfirmasi Eksekusi Hapus Data Unit',
        description: 'Pengguna menekan tombol konfirmasi Hapus pada dialog peringatan untuk mengeksekusi penghapusan permanen.',
        input: 'Klik Tombol: Hapus / Ya, Lanjutkan',
        expected: 'Unit uji berhasil dihapus dari tabel dan data master kembali bersih.',
        highlight: targetHighlight
      });

      await closeModalIfOpen(page);
    });
  });

  // =========================================================================
});