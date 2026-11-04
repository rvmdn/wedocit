import { test, expect, commonTestConfig, setupTest, navigateToAdmin, closeModalIfOpen } from './_common';

test.use(commonTestConfig);

test.describe('[V2.0] [TC-002] Organization - Unit PIC (CRUD Lifecycle)', () => {
  test.beforeEach(async ({ page, wedocit }) => {
    await setupTest(page, wedocit);
  });

test('[TC-002] Organization - Unit PIC (CRUD Lifecycle)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-002',
      scenarioName: 'Siklus CRUD PIC Unit Kerja (Create -> Read -> Update -> Delete)',
      title: 'Organization - Unit PIC CRUD',
      expectedResult: 'Berhasil menguji sub-skenario CRUD PIC unit kerja: pendaftaran PIC baru (Create), peninjauan daftar (Read), pembaruan kontak (Update), dan pembersihan PIC uji (Delete).',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/unit');

    async function ensureUnitPicTabOpen() {
      // 1. Cek apakah tab PIC pada modal unit sudah aktif
      const isPicReady = await page.locator('app-unit-form-modal button:has-text("Add PIC")').first().isVisible({ timeout: 1000 }).catch(() => false);
      if (isPicReady) return;

      // 2. Tunggu baris tabel Unit selesai dimuat
      await page.locator('p-table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 });

      // 3. Cek apakah modal form unit sudah terbuka
      const isModalOpen = await page.locator('app-unit-form-modal p-dialog .p-dialog').first().isVisible({ timeout: 1000 }).catch(() => false);
      if (!isModalOpen) {
        const editBtn = page.locator('p-table tbody tr:first-child button:has(.pi-pencil)').first();
        await editBtn.waitFor({ state: 'visible', timeout: 5000 });
        await editBtn.click();
        await page.locator('app-unit-form-modal p-dialog .p-dialog').first().waitFor({ state: 'visible', timeout: 7000 });
      }

      // 4. Klik tab PIC
      const tabPic = page.locator('app-unit-form-modal p-tab:has-text("PIC"), app-unit-form-modal [role="tab"]:has-text("PIC")').first();
      await tabPic.waitFor({ state: 'visible', timeout: 5000 });
      await tabPic.click();
      await page.waitForTimeout(600);
      await page.locator('app-unit-form-modal button:has-text("Add PIC")').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    }

    await ensureUnitPicTabOpen();
    const tabPic = page.locator('app-unit-form-modal p-tab:has-text("PIC"), app-unit-form-modal [role="tab"]:has-text("PIC")').first();

    // SUB-TC 2.1: READ
    await test.step('Sub-TC 2.1: [READ] Tinjau Daftar PIC Unit Terpilih', async () => {
      console.log('   🔹 [Sub-TC 2.1: READ] Memeriksa daftar PIC unit kerja...');
      await wedocit.captureStep({
        title: 'Sub-TC 2.1: [READ] Tinjau Daftar PIC Unit Terpilih',
        description: 'Membuka tab Person in Charge (PIC) pada modal unit kerja terpilih untuk memeriksa daftar penanggung jawab.',
        input: 'Tab: PIC Unit',
        expected: 'Tabel daftar PIC ditampilkan lengkap dengan nama pegawai, email, dan jabatan.',
        highlight: tabPic
      });
    });

    // SUB-TC 2.2: CREATE - Klik Tambah PIC
    await test.step('Sub-TC 2.2: [CREATE] Akses Formulir Tambah PIC Unit', async () => {
      console.log('   🔹 [Sub-TC 2.2: CREATE] Membuka modal Add PIC...');
      const btnAddPic = page.locator('app-unit-form-modal button:has-text("Add PIC")').first();
      await btnAddPic.waitFor({ state: 'visible', timeout: 5000 });

      await wedocit.captureStep({
        title: 'Sub-TC 2.2: [CREATE] Akses Formulir Tambah PIC Unit',
        description: 'Pengguna menekan tombol "Add PIC" pada header tab PIC untuk membuka formulir penambahan penanggung jawab.',
        input: 'Klik Tombol: Add PIC',
        expected: 'Modal formulir input data PIC unit terbuka di layar.',
        highlight: btnAddPic
      });

      await btnAddPic.click();
      await page.locator('app-unit-pic-modal p-dialog .p-dialog').first().waitFor({ state: 'visible', timeout: 5000 });
      await page.waitForTimeout(400);
    });

    // SUB-TC 2.3: CREATE - Input Data PIC
    await test.step('Sub-TC 2.3: [CREATE] Pengisian Formulir Data PIC Baru', async () => {
      console.log('   🔹 [Sub-TC 2.3: CREATE] Mengisi form PIC baru...');
      const inputName = page.locator('app-unit-pic-modal input[formcontrolname="unitPICName"], app-unit-pic-modal input#unitPICName').first();
      const inputNpp = page.locator('app-unit-pic-modal input[formcontrolname="npp"], app-unit-pic-modal input#npp').first();
      const inputEmail = page.locator('app-unit-pic-modal input[formcontrolname="unitPICEmail"], app-unit-pic-modal input#unitPICEmail').first();

      await inputName.waitFor({ state: 'visible', timeout: 5000 });
      await inputName.fill('[TEST-EDV] Budi Santoso');
      if (await inputNpp.isVisible({ timeout: 1000 }).catch(() => false)) await inputNpp.fill('822117');
      if (await inputEmail.isVisible({ timeout: 1000 }).catch(() => false)) await inputEmail.fill('budi.santoso@bni.co.id');

      await wedocit.captureStep({
        title: 'Sub-TC 2.3: [CREATE] Pengisian Formulir Data PIC Baru',
        description: 'Mengisi data penanggung jawab baru meliputi nama [TEST-EDV] Budi Santoso, NPP 822117, dan email resmi BNI.',
        input: 'Nama: [TEST-EDV] Budi Santoso, NPP: 822117, Email: budi.santoso@bni.co.id',
        expected: 'Data PIC baru terinput lengkap pada formulir modal.',
        highlight: inputName
      });
    });

    // SUB-TC 2.4: CREATE - Simpan PIC
    await test.step('Sub-TC 2.4: [CREATE] Simpan Data PIC Baru ke Unit Kerja', async () => {
      console.log('   🔹 [Sub-TC 2.4: CREATE] Menekan tombol Simpan PIC...');
      const btnSavePic = page.locator('app-unit-pic-modal button:has-text("Save"), app-unit-pic-modal button:has(.pi-check)').first();
      await btnSavePic.waitFor({ state: 'visible', timeout: 5000 });

      await wedocit.captureStep({
        title: 'Sub-TC 2.4: [CREATE] Simpan Data PIC Baru ke Unit Kerja',
        description: 'Pengguna menekan tombol "Save" pada modal dialog untuk menyimpan data PIC baru ke dalam unit kerja.',
        input: 'Klik Tombol: Save PIC',
        expected: 'Data PIC baru berhasil disimpan dan muncul pada daftar penanggung jawab unit.',
        highlight: btnSavePic
      });

      await btnSavePic.click();
      await page.locator('app-unit-pic-modal p-dialog .p-dialog').first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(600);
    });

    // SUB-TC 2.5: UPDATE - Buka Edit PIC
    await test.step('Sub-TC 2.5: [UPDATE] Memilih Data & Membuka Modal Edit PIC', async () => {
      await ensureUnitPicTabOpen();
      console.log('   🔹 [Sub-TC 2.5: UPDATE] Memilih aksi edit PIC...');
      const btnEditPic = page.locator('app-unit-form-modal p-table tbody tr:first-child button:has(.pi-pencil)').first();
      await btnEditPic.waitFor({ state: 'visible', timeout: 5000 });

      await wedocit.captureStep({
        title: 'Sub-TC 2.5: [UPDATE] Memilih Data & Membuka Modal Edit PIC',
        description: 'Pengguna menekan icon Edit pada baris PIC terpilih di dalam daftar unit kerja.',
        input: 'Klik Icon: Edit PIC pada baris pertama',
        expected: 'Formulir pembaruan data PIC terbuka dengan data terisi sebelumnya.',
        highlight: btnEditPic
      });

      await btnEditPic.click();
      await page.locator('app-unit-pic-modal p-dialog .p-dialog').first().waitFor({ state: 'visible', timeout: 5000 });
      await page.waitForTimeout(400);
    });

    // SUB-TC 2.6: UPDATE - Ubah Kontak PIC
    await test.step('Sub-TC 2.6: [UPDATE] Memperbarui Informasi Kontak & Jabatan PIC', async () => {
      console.log('   🔹 [Sub-TC 2.6: UPDATE] Mengubah kontak PIC...');
      const inputName = page.locator('app-unit-pic-modal input[formcontrolname="unitPICName"], app-unit-pic-modal input#unitPICName').first();
      await inputName.waitFor({ state: 'visible', timeout: 5000 });
      await inputName.fill('[TEST-EDV] Budi Santoso (Senior Specialist)');

      await wedocit.captureStep({
        title: 'Sub-TC 2.6: [UPDATE] Memperbarui Informasi Kontak & Jabatan PIC',
        description: 'Memperbarui nama dan jabatan PIC menjadi [TEST-EDV] Budi Santoso (Senior Specialist).',
        input: 'Updated: [TEST-EDV] Budi Santoso (Senior Specialist)',
        expected: 'Perubahan data PIC terinput pada modal formulir edit.',
        highlight: inputName
      });
    });

    // SUB-TC 2.7: UPDATE - Simpan Perubahan PIC
    await test.step('Sub-TC 2.7: [UPDATE] Simpan Pembaruan Data PIC ke Sistem', async () => {
      console.log('   🔹 [Sub-TC 2.7: UPDATE] Menyimpan perubahan data PIC...');
      const btnSavePic = page.locator('app-unit-pic-modal button:has-text("Save"), app-unit-pic-modal button:has(.pi-check)').first();
      await btnSavePic.waitFor({ state: 'visible', timeout: 5000 });

      await wedocit.captureStep({
        title: 'Sub-TC 2.7: [UPDATE] Simpan Pembaruan Data PIC ke Sistem',
        description: 'Pengguna menekan tombol "Save" untuk memutakhirkan data PIC unit kerja.',
        input: 'Klik Tombol: Save Perubahan',
        expected: 'Perubahan data PIC berhasil disimpan dan ditampilkan di daftar.',
        highlight: btnSavePic
      });

      await btnSavePic.click();
      await page.locator('app-unit-pic-modal p-dialog .p-dialog').first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(600);
    });

    // SUB-TC 2.8: DELETE - Klik Hapus PIC
    await test.step('Sub-TC 2.8: [DELETE] Memilih Aksi Hapus pada Baris Data PIC', async () => {
      await ensureUnitPicTabOpen();
      console.log('   🔹 [Sub-TC 2.8: DELETE] Menekan tombol Delete PIC...');
      const btnDeletePic = page.locator('app-unit-form-modal p-table tbody tr:first-child button:has(.pi-trash)').first();
      await btnDeletePic.waitFor({ state: 'visible', timeout: 5000 });

      await wedocit.captureStep({
        title: 'Sub-TC 2.8: [DELETE] Memilih Aksi Hapus pada Baris Data PIC',
        description: 'Pengguna menekan icon Delete pada baris PIC uji untuk memicu dialog konfirmasi penghapusan.',
        input: 'Klik Icon: Delete PIC',
        expected: 'Dialog konfirmasi penghapusan PIC muncul di layar.',
        highlight: btnDeletePic
      });

      await btnDeletePic.click();
      await page.waitForTimeout(600);
    });

    // SUB-TC 2.9: DELETE - Konfirmasi Hapus PIC
    await test.step('Sub-TC 2.9: [DELETE] Konfirmasi Eksekusi Hapus PIC Uji', async () => {
      console.log('   🔹 [Sub-TC 2.9: DELETE] Mengonfirmasi hapus PIC...');
      const confirmDialog = page.locator('.p-confirm-dialog, .p-dialog').last();
      const btnConfirmDel = page.locator('.p-confirm-dialog button.p-confirm-dialog-accept, .p-confirm-dialog button:has-text("Hapus"), .p-confirm-dialog button:has-text("Ya"), button.p-button-danger:has-text("Hapus")').first();

      const targetHighlight = (await btnConfirmDel.isVisible({ timeout: 1500 }).catch(() => false)) ? btnConfirmDel : confirmDialog;

      await wedocit.captureStep({
        title: 'Sub-TC 2.9: [DELETE] Konfirmasi Eksekusi Hapus PIC Uji',
        description: 'Pengguna menekan tombol konfirmasi Hapus pada modal untuk menghapus data PIC uji dari unit.',
        input: 'Klik Tombol: Hapus / Ya, Lanjutkan',
        expected: 'PIC uji berhasil dihapus dari unit kerja tanpa residu data.',
        highlight: targetHighlight
      });

      if (await btnConfirmDel.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btnConfirmDel.click();
        await page.waitForTimeout(500);
      }

      await closeModalIfOpen(page);
    });
  });

  // =========================================================================
});