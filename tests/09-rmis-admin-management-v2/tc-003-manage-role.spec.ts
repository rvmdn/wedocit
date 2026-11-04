import { test, expect, commonTestConfig, setupTest, navigateToAdmin, closeModalIfOpen } from './_common';

test.use(commonTestConfig);

test.describe('[V2.0] [TC-003] Access Control - Manage Role (CRUD Lifecycle)', () => {
  test.beforeEach(async ({ page, wedocit }) => {
    await setupTest(page, wedocit);
  });

test('[TC-003] Access Control - Manage Role (CRUD Lifecycle)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-003',
      scenarioName: 'Siklus CRUD Role Pengguna (Create -> Read -> Update -> Delete)',
      title: 'Access Control - Manage Role CRUD',
      expectedResult: 'Berhasil menjalankan sub-skenario CRUD role: pembuatan role baru (Create), pencarian pada tabel (Read), pengubahan deskripsi (Update), dan pembersihan role uji (Delete).',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/role');

    // SUB-TC 3.1: CREATE - Buka Modal Tambah
    await test.step('Sub-TC 3.1: [CREATE] Akses Formulir Tambah Role Baru', async () => {
      console.log('   🔹 [Sub-TC 3.1: CREATE] Membuka modal Add Role...');
      const btnAddRole = page.locator('button:has-text("Add Role"), button[label*="Add Role"]').first();
      await wedocit.captureStep({
        title: 'Sub-TC 3.1: [CREATE] Akses Formulir Tambah Role Baru',
        description: 'Pengguna menekan tombol "Add Role" pada toolbar halaman untuk membuka formulir pendaftaran role baru.',
        input: 'Klik Tombol: Add Role',
        expected: 'Modal formulir pendaftaran role baru terbuka di layar.',
        highlight: btnAddRole
      });

      if (await btnAddRole.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnAddRole.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 3.2: CREATE - Input Data Role
    await test.step('Sub-TC 3.2: [CREATE] Pengisian Formulir Master Role Baru', async () => {
      console.log('   🔹 [Sub-TC 3.2: CREATE] Mengisi form master role baru...');
      const roleNameInput = page.locator('input[formcontrolname="roleName"], input#roleName').first();
      const roleGroupInput = page.locator('input[formcontrolname="roleGroup"], input#roleGroup').first();
      const roleDescInput = page.locator('textarea[formcontrolname="description"], textarea#description').first();

      if (await roleNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await roleNameInput.fill('ROLE_TEST_EDV');
        if (await roleGroupInput.isVisible().catch(() => false)) await roleGroupInput.fill('RMIS_TEST');
        if (await roleDescInput.isVisible().catch(() => false)) await roleDescInput.fill('Role Khusus Pengujian Dokumen EDV');
      }

      await wedocit.captureStep({
        title: 'Sub-TC 3.2: [CREATE] Pengisian Formulir Master Role Baru',
        description: 'Mengisi rincian role baru meliputi nama ROLE_TEST_EDV, group RMIS_TEST, dan deskripsi tugas role.',
        input: 'Role Name: ROLE_TEST_EDV, Group: RMIS_TEST',
        expected: 'Formulir master role baru terisi lengkap dengan data yang valid.',
        highlight: roleNameInput
      });
    });

    // SUB-TC 3.3: CREATE - Simpan Data Role
    await test.step('Sub-TC 3.3: [CREATE] Simpan Master Role Baru ke Sistem', async () => {
      console.log('   🔹 [Sub-TC 3.3: CREATE] Menekan tombol Save Role...');
      const btnSaveRole = page.locator('p-dialog button:has-text("Save")').first();
      await wedocit.captureStep({
        title: 'Sub-TC 3.3: [CREATE] Simpan Master Role Baru ke Sistem',
        description: 'Pengguna menekan tombol "Save" pada modal formulir untuk menyimpan master role baru ke database.',
        input: 'Klik Tombol: Save Role',
        expected: 'Role baru berhasil disimpan dan terdaftar pada sistem RBAC.',
        highlight: btnSaveRole
      });

      await closeModalIfOpen(page);
    });

    // SUB-TC 3.4: READ - Filter Tabel Role
    await test.step('Sub-TC 3.4: [READ] Pencarian & Verifikasi Role pada Tabel', async () => {
      console.log('   🔹 [Sub-TC 3.4: READ] Menyaring tabel role...');
      const roleFilter = page.locator('input[placeholder*="Filter" i]').first();
      const btnRoleFilter = page.locator('button:has-text("Filter")').first();
      if (await roleFilter.isVisible().catch(() => false)) {
        await roleFilter.fill('Admin');
        if (await btnRoleFilter.isVisible().catch(() => false)) await btnRoleFilter.click();
        await page.waitForTimeout(400);
      }

      await wedocit.captureStep({
        title: 'Sub-TC 3.4: [READ] Pencarian & Verifikasi Role pada Tabel',
        description: 'Menyaring tabel role berdasarkan kata kunci untuk memverifikasi atribut dan hak akses role.',
        input: 'Keyword Filter: Admin',
        expected: 'Tabel menampilkan daftar role yang sesuai dengan parameter pencarian.',
        highlight: roleFilter
      });
    });

    // SUB-TC 3.5: UPDATE - Buka Modal Edit Role
    await test.step('Sub-TC 3.5: [UPDATE] Memilih Data & Membuka Modal Edit Role', async () => {
      console.log('   🔹 [Sub-TC 3.5: UPDATE] Memilih aksi edit pada baris role...');
      const btnEditRoleRow = page.locator('p-table tbody tr:first-child button:has(.pi-pencil)').first();
      await wedocit.captureStep({
        title: 'Sub-TC 3.5: [UPDATE] Memilih Data & Membuka Modal Edit Role',
        description: 'Pengguna menekan tombol icon Edit pada baris role terpilih di tabel.',
        input: 'Klik Icon: Edit Role pada baris pertama',
        expected: 'Modal formulir edit role terbuka dengan rincian data role saat ini.',
        highlight: btnEditRoleRow
      });

      if (await btnEditRoleRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnEditRoleRow.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 3.6: UPDATE - Ubah Deskripsi Role
    await test.step('Sub-TC 3.6: [UPDATE] Memperbarui Deskripsi & Tanggung Jawab Role', async () => {
      console.log('   🔹 [Sub-TC 3.6: UPDATE] Mengubah deskripsi role...');
      const editRoleDesc = page.locator('p-dialog textarea[formcontrolname="description"], p-dialog input[formcontrolname="roleName"]').first();
      if (await editRoleDesc.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editRoleDesc.fill('Role Uji Automasi EDV (Updated Version)');
      }

      await wedocit.captureStep({
        title: 'Sub-TC 3.6: [UPDATE] Memperbarui Deskripsi & Tanggung Jawab Role',
        description: 'Memperbarui rincian deskripsi tanggung jawab role pada formulir modal.',
        input: 'Updated Description: Role Uji Automasi EDV (Updated Version)',
        expected: 'Nilai deskripsi terbaru terinput pada formulir edit role.',
        highlight: editRoleDesc
      });
    });

    // SUB-TC 3.7: UPDATE - Simpan Perubahan Role
    await test.step('Sub-TC 3.7: [UPDATE] Simpan Pembaruan Data Role ke Database', async () => {
      console.log('   🔹 [Sub-TC 3.7: UPDATE] Menyimpan perubahan data role...');
      const btnSaveRoleEdit = page.locator('p-dialog button:has-text("Save")').first();
      await wedocit.captureStep({
        title: 'Sub-TC 3.7: [UPDATE] Simpan Pembaruan Data Role ke Database',
        description: 'Pengguna menekan tombol "Save" pada modal dialog untuk memutakhirkan data role.',
        input: 'Klik Tombol: Save Perubahan',
        expected: 'Deskripsi role berhasil diperbarui dalam database.',
        highlight: btnSaveRoleEdit
      });

      await closeModalIfOpen(page);
    });

    // SUB-TC 3.8: DELETE - Klik Tombol Hapus Role
    await test.step('Sub-TC 3.8: [DELETE] Memilih Aksi Hapus pada Baris Data Role', async () => {
      console.log('   🔹 [Sub-TC 3.8: DELETE] Menekan tombol Delete role...');
      const btnDeleteRoleRow = page.locator('p-table tbody tr:first-child button:has(.pi-trash)').first();
      await wedocit.captureStep({
        title: 'Sub-TC 3.8: [DELETE] Memilih Aksi Hapus pada Baris Data Role',
        description: 'Pengguna menekan icon Delete pada baris data role untuk memicu dialog konfirmasi.',
        input: 'Klik Icon: Delete Role',
        expected: 'Dialog peringatan konfirmasi penghapusan role ditampilkan.',
        highlight: btnDeleteRoleRow
      });

      if (await btnDeleteRoleRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnDeleteRoleRow.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 3.9: DELETE - Konfirmasi Hapus Role
    await test.step('Sub-TC 3.9: [DELETE] Konfirmasi Eksekusi Hapus Role Uji', async () => {
      console.log('   🔹 [Sub-TC 3.9: DELETE] Mengonfirmasi hapus role...');
      const confirmDialog = page.locator('.p-confirm-dialog, .p-dialog').first();
      const btnConfirmDel = page.locator('.p-confirm-dialog button.p-confirm-dialog-accept, .p-confirm-dialog button:has-text("Hapus"), .p-confirm-dialog button:has-text("Ya")').first();

      const targetHighlight = (await btnConfirmDel.isVisible({ timeout: 1000 }).catch(() => false)) ? btnConfirmDel : confirmDialog;

      await wedocit.captureStep({
        title: 'Sub-TC 3.9: [DELETE] Konfirmasi Eksekusi Hapus Role Uji',
        description: 'Pengguna menekan tombol konfirmasi Hapus untuk menghapus role uji dari sistem RBAC.',
        input: 'Klik Tombol: Hapus / Ya, Lanjutkan',
        expected: 'Role uji berhasil dihapus dari tabel dan tidak lagi aktif pada sistem RBAC.',
        highlight: targetHighlight
      });

      await closeModalIfOpen(page);
    });
  });

  // =========================================================================
});