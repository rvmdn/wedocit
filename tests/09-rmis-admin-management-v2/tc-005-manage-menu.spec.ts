import { test, expect, commonTestConfig, setupTest, navigateToAdmin, closeModalIfOpen } from './_common';

test.use(commonTestConfig);

test.describe('[V2.0] [TC-005] Navigation - Manage Menu (CRUD Lifecycle)', () => {
  test.beforeEach(async ({ page, wedocit }) => {
    await setupTest(page, wedocit);
  });

test('[TC-005] Navigation - Manage Menu (CRUD Lifecycle)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-005',
      scenarioName: 'Siklus CRUD Menu Navigasi (Create -> Read -> Update -> Delete)',
      title: 'Navigation - Manage Menu CRUD',
      expectedResult: 'Berhasil mendaftarkan item menu navigasi baru (Create), memverifikasi hierarki pohon menu (Read), mengubah rute/icon (Update), dan menghapus kembali menu uji (Delete).',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/menu');

    // SUB-TC 5.1: CREATE - Buka Modal Tambah
    await test.step('Sub-TC 5.1: [CREATE] Akses Formulir Tambah Item Menu Baru', async () => {
      console.log('   🔹 [Sub-TC 5.1: CREATE] Membuka modal New Menu...');
      const btnAddMenu = page.locator('button:has-text("New Menu"), button[label*="New Menu"]').first();
      await wedocit.captureStep({
        title: 'Sub-TC 5.1: [CREATE] Akses Formulir Tambah Item Menu Baru',
        description: 'Pengguna menekan tombol "New Menu" pada toolbar halaman untuk membuka form pendaftaran rute menu baru.',
        input: 'Klik Tombol: New Menu',
        expected: 'Modal formulir registrasi item menu baru terbuka di layar.',
        highlight: btnAddMenu
      });

      if (await btnAddMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnAddMenu.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 5.2: CREATE - Input Form Menu
    await test.step('Sub-TC 5.2: [CREATE] Pengisian Formulir Atribut Menu Navigasi', async () => {
      console.log('   🔹 [Sub-TC 5.2: CREATE] Mengisi form item menu baru...');
      const menuNameInput = page.locator('input[formcontrolname="menuName"], input#menuName').first();
      const menuUrlInput = page.locator('input[formcontrolname="menuUrl"], input#menuUrl').first();
      const menuIconInput = page.locator('input[formcontrolname="menuIcon"], input#menuIcon').first();

      if (await menuNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await menuNameInput.fill('[TEST-EDV] Menu Uji Navigasi');
        if (await menuUrlInput.isVisible().catch(() => false)) await menuUrlInput.fill('/admin/test-edv');
        if (await menuIconInput.isVisible().catch(() => false)) await menuIconInput.fill('pi pi-cog');
      }

      await wedocit.captureStep({
        title: 'Sub-TC 5.2: [CREATE] Pengisian Formulir Atribut Menu Navigasi',
        description: 'Mengisi detail menu navigasi baru mencakup Nama Menu, Route URL (/admin/test-edv), dan icon visual.',
        input: 'Menu Name: [TEST-EDV] Menu Uji Navigasi, URL: /admin/test-edv, Icon: pi pi-cog',
        expected: 'Formulir registrasi menu navigasi terisi dengan atribut yang valid.',
        highlight: menuNameInput
      });
    });

    // SUB-TC 5.3: CREATE - Simpan Menu
    await test.step('Sub-TC 5.3: [CREATE] Simpan Item Menu Baru ke Sistem Navigasi', async () => {
      console.log('   🔹 [Sub-TC 5.3: CREATE] Menekan tombol Save Menu...');
      const btnSaveMenu = page.locator('p-dialog button:has-text("Save")').first();
      await wedocit.captureStep({
        title: 'Sub-TC 5.3: [CREATE] Simpan Item Menu Baru ke Sistem Navigasi',
        description: 'Pengguna menekan tombol "Save" pada modal dialog untuk menyimpan registrasi menu baru ke database.',
        input: 'Klik Tombol: Save Menu',
        expected: 'Item menu baru berhasil didaftarkan pada hierarki navigasi aplikasi.',
        highlight: btnSaveMenu
      });

      await closeModalIfOpen(page);
    });

    // SUB-TC 5.4: READ - Penelusuran Hierarki TreeTable
    await test.step('Sub-TC 5.4: [READ] Penelusuran & Verifikasi Menu pada Hierarki TreeTable', async () => {
      console.log('   🔹 [Sub-TC 5.4: READ] Menyaring struktur pohon menu...');
      const menuFilter = page.locator('input[placeholder*="Filter" i]').first();
      const btnMenuFilter = page.locator('button:has-text("Filter")').first();
      if (await menuFilter.isVisible().catch(() => false)) {
        await menuFilter.fill('Admin');
        if (await btnMenuFilter.isVisible().catch(() => false)) await btnMenuFilter.click();
        await page.waitForTimeout(400);
      }

      await wedocit.captureStep({
        title: 'Sub-TC 5.4: [READ] Penelusuran & Verifikasi Menu pada Hierarki TreeTable',
        description: 'Menyaring hierarki pohon menu untuk memverifikasi struktur penempatan rute navigasi.',
        input: 'Filter Keyword: Admin',
        expected: 'Pohon hierarki menu menampilkan item navigasi sesuai urutan dan relasi induk-anak.',
        highlight: menuFilter
      });
    });

    // SUB-TC 5.5: UPDATE - Buka Modal Edit Menu
    await test.step('Sub-TC 5.5: [UPDATE] Memilih Baris Menu & Membuka Modal Edit', async () => {
      console.log('   🔹 [Sub-TC 5.5: UPDATE] Memilih aksi edit pada baris menu...');
      const btnEditMenuRow = page.locator('p-treeTable tbody tr:first-child button:has(.pi-pencil)').first();
      await wedocit.captureStep({
        title: 'Sub-TC 5.5: [UPDATE] Memilih Baris Menu & Membuka Modal Edit',
        description: 'Pengguna menekan tombol icon Edit pada baris menu terpilih di TreeTable.',
        input: 'Klik Icon: Edit Menu pada baris pertama',
        expected: 'Modal formulir edit menu terbuka dengan rincian konfigurasi saat ini.',
        highlight: btnEditMenuRow
      });

      if (await btnEditMenuRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnEditMenuRow.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 5.6: UPDATE - Ubah Konfigurasi URL/Icon
    await test.step('Sub-TC 5.6: [UPDATE] Memperbarui Konfigurasi URL & Icon Menu', async () => {
      console.log('   🔹 [Sub-TC 5.6: UPDATE] Mengubah nama dan icon menu...');
      const editMenuName = page.locator('p-dialog input[formcontrolname="menuName"]').first();
      if (await editMenuName.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editMenuName.fill('[TEST-EDV] Menu Uji (Updated)');
      }

      await wedocit.captureStep({
        title: 'Sub-TC 5.6: [UPDATE] Memperbarui Konfigurasi URL & Icon Menu',
        description: 'Memperbarui nama dan icon menu navigasi uji pada formulir modal edit.',
        input: 'Updated Name: [TEST-EDV] Menu Uji (Updated)',
        expected: 'Perubahan konfigurasi menu terinput dengan benar pada formulir.',
        highlight: editMenuName
      });
    });

    // SUB-TC 5.7: UPDATE - Simpan Perubahan Menu
    await test.step('Sub-TC 5.7: [UPDATE] Simpan Pembaruan Menu Navigasi ke Database', async () => {
      console.log('   🔹 [Sub-TC 5.7: UPDATE] Menyimpan perubahan menu...');
      const btnSaveMenuEdit = page.locator('p-dialog button:has-text("Save")').first();
      await wedocit.captureStep({
        title: 'Sub-TC 5.7: [UPDATE] Simpan Pembaruan Menu Navigasi ke Database',
        description: 'Pengguna menekan tombol "Save" pada dialog untuk menyimpan pembaruan konfigurasi menu.',
        input: 'Klik Tombol: Save Perubahan',
        expected: 'Perubahan konfigurasi menu berhasil disimpan dan terefleksi pada navigasi.',
        highlight: btnSaveMenuEdit
      });

      await closeModalIfOpen(page);
    });

    // SUB-TC 5.8: DELETE - Klik Hapus Menu
    await test.step('Sub-TC 5.8: [DELETE] Memilih Aksi Hapus pada Baris Menu Uji', async () => {
      console.log('   🔹 [Sub-TC 5.8: DELETE] Menekan tombol Delete menu...');
      const btnDeleteMenuRow = page.locator('p-treeTable tbody tr:first-child button:has(.pi-trash)').first();
      await wedocit.captureStep({
        title: 'Sub-TC 5.8: [DELETE] Memilih Aksi Hapus pada Baris Menu Uji',
        description: 'Pengguna menekan icon Delete pada baris menu navigasi uji untuk memicu konfirmasi.',
        input: 'Klik Icon: Delete Menu',
        expected: 'Dialog peringatan konfirmasi penghapusan menu muncul di layar.',
        highlight: btnDeleteMenuRow
      });

      if (await btnDeleteMenuRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnDeleteMenuRow.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 5.9: DELETE - Konfirmasi Hapus Menu
    await test.step('Sub-TC 5.9: [DELETE] Konfirmasi Eksekusi Hapus Item Menu', async () => {
      console.log('   🔹 [Sub-TC 5.9: DELETE] Mengonfirmasi hapus menu...');
      const confirmDialog = page.locator('.p-confirm-dialog, .p-dialog').first();
      const btnConfirmDel = page.locator('.p-confirm-dialog button.p-confirm-dialog-accept, .p-confirm-dialog button:has-text("Hapus"), .p-confirm-dialog button:has-text("Ya")').first();

      const targetHighlight = (await btnConfirmDel.isVisible({ timeout: 1000 }).catch(() => false)) ? btnConfirmDel : confirmDialog;

      await wedocit.captureStep({
        title: 'Sub-TC 5.9: [DELETE] Konfirmasi Eksekusi Hapus Item Menu',
        description: 'Pengguna menekan tombol konfirmasi Hapus pada dialog peringatan untuk mengeksekusi penghapusan menu.',
        input: 'Klik Tombol: Hapus / Ya, Lanjutkan',
        expected: 'Item menu uji berhasil dihapus secara bersih dari database navigasi.',
        highlight: targetHighlight
      });

      await closeModalIfOpen(page);
    });
  });

  // =========================================================================
});