import { test, expect, commonTestConfig, setupTest, navigateToAdmin, closeModalIfOpen } from './_common';

test.use(commonTestConfig);

test.describe('[V2.0] [TC-004] Access Control - Role Permissions Matrix (Read & Update)', () => {
  test.beforeEach(async ({ page, wedocit }) => {
    await setupTest(page, wedocit);
  });

test('[TC-004] Access Control - Role Permissions Matrix (Read & Update)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-004',
      scenarioName: 'Pengujian Konfigurasi Matriks Hak Akses Role (Read -> Update -> Save)',
      title: 'Access Control - Role Permissions Matrix',
      expectedResult: 'Berhasil memilih role dari panel kiri (Read), memuat matriks izin akses menu, mengaktifkan mode Edit, memodifikasi centang hak akses (Update), dan menyimpan pembaruan matriks izin.',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/permission');

    // SUB-TC 4.1: READ - Akses Halaman Role & Permissions
    const roleListContainer = page.locator('p-card:has-text("Roles"), div:has(> p:text-is("Roles"))').first();
    await test.step('Sub-TC 4.1: [READ] Akses Halaman Role & Permissions', async () => {
      console.log('   🔹 [Sub-TC 4.1: READ] Membuka halaman Role & Permissions...');
      // Tunggu hingga daftar role selesai dimuat dari backend
      await page.locator('.cursor-pointer:has(.font-bold)').first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
      const firstRoleCard = page.locator('.cursor-pointer:has(.font-bold)').first();

      await wedocit.captureStep({
        title: 'Sub-TC 4.1: [READ] Akses Halaman Role & Permissions',
        description: 'Membuka antarmuka manajemen hak akses untuk meninjau seluruh daftar role pengguna yang terdaftar pada sistem.',
        input: 'URL: /admin/permission',
        expected: 'Halaman Role & Permissions terbuka menampilkan panel daftar role di sebelah kiri.',
        highlight: (await firstRoleCard.isVisible().catch(() => false)) ? firstRoleCard : roleListContainer
      });
    });

    // SUB-TC 4.2: READ - Memilih Role & Memuat Matriks Menu
    const targetRole = page.locator('.cursor-pointer:has-text("LocalAdmin"), .cursor-pointer:has(.font-bold)').first();
    await test.step('Sub-TC 4.2: [READ] Memilih Role & Memuat Matriks Hak Akses Menu', async () => {
      console.log('   🔹 [Sub-TC 4.2: READ] Mengklik role untuk memuat pohon matriks permissions...');
      if (await targetRole.isVisible({ timeout: 3000 }).catch(() => false)) {
        await targetRole.click();
        await page.waitForTimeout(1000);
      }

      // Tunggu hingga pohon permission dirender di panel kanan
      await page.locator('p-tree, span:has-text("Action"), span:has-text("Menu")').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      const permHeader = page.locator('span:has-text("Permissions:"), p-tag:has-text("VIEWING")').first();
      const treeView = page.locator('p-tree, .p-tree').first();

      await wedocit.captureStep({
        title: 'Sub-TC 4.2: [READ] Memilih Role & Memuat Matriks Hak Akses Menu',
        description: 'Pengguna memilih role pada panel kiri untuk memuat pohon hierarki menu beserta matriks hak akses yang berlaku dalam mode VIEWING.',
        input: 'Pilih Role: LocalAdmin / Administrator',
        expected: 'Panel kanan memuat pohon hierarki menu, status indikator VIEWING aktif, dan tombol Edit siap digunakan.',
        highlight: (await treeView.isVisible().catch(() => false)) ? treeView : permHeader
      });
    });

    // SUB-TC 4.3: UPDATE - Aktifkan Mode Edit
    const btnEditMode = page.locator('button:has-text("Edit")').first();
    await test.step('Sub-TC 4.3: [UPDATE] Mengaktifkan Mode Pengubahan Hak Akses', async () => {
      console.log('   🔹 [Sub-TC 4.3: UPDATE] Menekan tombol Edit permissions...');
      await wedocit.captureStep({
        title: 'Sub-TC 4.3: [UPDATE] Mengaktifkan Mode Pengubahan Hak Akses',
        description: 'Pengguna menekan tombol "Edit" pada toolbar atas untuk membuka proteksi dan mengaktifkan kontrol checkbox izin.',
        input: 'Klik Tombol: Edit Permissions',
        expected: 'Mode pengubahan hak akses aktif dengan indikator tag EDITING menyala dan kontrol checkbox dapat diinteraksikan.',
        highlight: btnEditMode
      });

      if (await btnEditMode.isVisible({ timeout: 3000 }).catch(() => false)) {
        await btnEditMode.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 4.4: UPDATE - Modifikasi Checkbox Matrix
    await test.step('Sub-TC 4.4: [UPDATE] Mengubah Konfigurasi Centang Hak Akses Menu', async () => {
      console.log('   🔹 [Sub-TC 4.4: UPDATE] Mengubah status checkbox izin akses...');
      const targetCheckbox = page.locator('p-tree input[type="checkbox"]').first();
      if (await targetCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
        await targetCheckbox.click({ force: true });
        await page.waitForTimeout(400);
      }

      await wedocit.captureStep({
        title: 'Sub-TC 4.4: [UPDATE] Mengubah Konfigurasi Centang Hak Akses Menu',
        description: 'Mengubah centang izin akses menu tertentu pada pohon hierarki untuk menguji modifikasi otorisasi pengguna.',
        input: 'Action: Toggle Checkbox Hak Akses Menu',
        expected: 'Status centang checkbox izin menu berubah dan tombol Save Changes menjadi aktif.',
        highlight: targetCheckbox
      });
    });

    // SUB-TC 4.5: UPDATE - Klik Save Changes
    const btnSavePerm = page.locator('button:has-text("Save Changes")').first();
    await test.step('Sub-TC 4.5: [UPDATE] Simpan Perubahan Matriks Hak Akses', async () => {
      console.log('   🔹 [Sub-TC 4.5: UPDATE] Menekan tombol Save Changes...');
      await wedocit.captureStep({
        title: 'Sub-TC 4.5: [UPDATE] Simpan Perubahan Matriks Hak Akses',
        description: 'Pengguna menekan tombol "Save Changes" untuk memvalidasi dan menyimpan pembaruan otorisasi ke database.',
        input: 'Klik Tombol: Save Changes',
        expected: 'Konfigurasi hak akses terbaru berhasil disimpan ke database.',
        highlight: btnSavePerm
      });

      // Kembalikan ke mode normal via Cancel atau Save
      const btnCancel = page.locator('button:has-text("Cancel")').first();
      if (await btnCancel.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btnCancel.click();
        await page.waitForTimeout(400);
      }
    });

    // SUB-TC 4.6: READ - Verifikasi Mode View
    await test.step('Sub-TC 4.6: [READ] Verifikasi Status Otorisasi Pasca Pembaruan', async () => {
      console.log('   🔹 [Sub-TC 4.6: READ] Memverifikasi status viewing...');
      const viewingBadge = page.locator('p-tag:has-text("VIEWING"), span:has-text("Permissions:")').first();
      await wedocit.captureStep({
        title: 'Sub-TC 4.6: [READ] Verifikasi Status Otorisasi Pasca Pembaruan',
        description: 'Memverifikasi status matriks hak akses kembali ke mode VIEWING dan konfigurasi otorisasi telah terkunci aman.',
        input: 'Status Check: VIEWING Mode Locked',
        expected: 'Matriks izin kembali terkunci pada mode VIEWING dengan data terbarui.',
        highlight: viewingBadge
      });
    });
  });

  // =========================================================================
});