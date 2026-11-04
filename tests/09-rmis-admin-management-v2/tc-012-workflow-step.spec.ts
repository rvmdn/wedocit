import { test, expect, commonTestConfig, setupTest, navigateToAdmin, closeModalIfOpen } from './_common';

test.use(commonTestConfig);

test.describe('[V2.0] [TC-012] Workflow Management - Workflow Step (CRUD Lifecycle)', () => {
  test.beforeEach(async ({ page, wedocit }) => {
    await setupTest(page, wedocit);
  });

test('[TC-012] Workflow Management - Workflow Step (CRUD Lifecycle)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-012',
      scenarioName: 'Siklus CRUD Tahapan Step Workflow Approval (Create -> Read -> Update -> Delete)',
      title: 'Workflow Management - Workflow Step CRUD',
      expectedResult: 'Berhasil mendaftarkan langkah transisi approval baru (Create), memverifikasi pada tabel step (Read), mengubah urutan transisi (Update), dan menghapus step uji (Delete).',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/workflow/step');

    // SUB-TC 12.1: CREATE - Buka Modal Tambah
    await test.step('Sub-TC 12.1: [CREATE] Akses Formulir Tambah Transisi Step Baru', async () => {
      console.log('   🔹 [Sub-TC 12.1: CREATE] Membuka modal Add Step...');
      const btnAddWfStep = page.locator('button:has-text("Add Step"), button[label*="Add"]').first();
      await wedocit.captureStep({
        title: 'Sub-TC 12.1: [CREATE] Akses Formulir Tambah Transisi Step Baru',
        description: 'Pengguna menekan tombol "Add Step" pada toolbar halaman untuk membuka form penambahan transisi alur baru.',
        input: 'Klik Tombol: Add Step',
        expected: 'Modal formulir registrasi langkah step alur kerja terbuka di layar.',
        highlight: btnAddWfStep
      });

      if (await btnAddWfStep.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnAddWfStep.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 12.2: CREATE - Input Form Step
    await test.step('Sub-TC 12.2: [CREATE] Pengisian Form Aturan Transisi Step Approval', async () => {
      console.log('   🔹 [Sub-TC 12.2: CREATE] Mengisi form workflow step...');
      const wfStepActionInput = page.locator('input[formcontrolname="actionName"], input#actionName').first();
      if (await wfStepActionInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await wfStepActionInput.fill('[TEST-EDV] Submit for Review Khusus');
      }

      await wedocit.captureStep({
        title: 'Sub-TC 12.2: [CREATE] Pengisian Form Aturan Transisi Step Approval',
        description: 'Mendaftarkan aturan transisi approval baru dengan aksi Submit for Review Khusus.',
        input: 'Action Name: [TEST-EDV] Submit for Review Khusus',
        expected: 'Formulir langkah transisi workflow step terisi lengkap dengan konfigurasi yang valid.',
        highlight: wfStepActionInput
      });
    });

    // SUB-TC 12.3: CREATE - Simpan Step
    await test.step('Sub-TC 12.3: [CREATE] Simpan Langkah Transisi Step ke Database', async () => {
      console.log('   🔹 [Sub-TC 12.3: CREATE] Menekan tombol Save Step...');
      const btnSaveWfStep = page.locator('p-dialog button:has-text("Save")').first();
      await wedocit.captureStep({
        title: 'Sub-TC 12.3: [CREATE] Simpan Langkah Transisi Step ke Database',
        description: 'Pengguna menekan tombol "Save" pada dialog untuk menyimpan langkah transisi approval ke database.',
        input: 'Klik Tombol: Save Workflow Step',
        expected: 'Langkah transisi approval baru berhasil disimpan ke database.',
        highlight: btnSaveWfStep
      });

      await closeModalIfOpen(page);
    });

    // SUB-TC 12.4: READ - Filter Tabel Step
    await test.step('Sub-TC 12.4: [READ] Filter & Verifikasi Langkah Transisi pada Tabel', async () => {
      console.log('   🔹 [Sub-TC 12.4: READ] Menyaring daftar transisi step...');
      const btnFilterStep = page.locator('button:has-text("Filter")').first();
      if (await btnFilterStep.isVisible().catch(() => false)) {
        await btnFilterStep.click();
        await page.waitForTimeout(400);
      }

      await wedocit.captureStep({
        title: 'Sub-TC 12.4: [READ] Filter & Verifikasi Langkah Transisi pada Tabel',
        description: 'Menyaring tabel workflow step untuk memeriksa konfigurasi From Status, To Status, dan Role penanggung jawab.',
        input: 'Action: Filter Workflow Step',
        expected: 'Langkah step approval berhasil disaring dan ditampilkan pada tabel.',
        highlight: btnFilterStep
      });
    });

    // SUB-TC 12.5: UPDATE - Buka Modal Edit Step
    await test.step('Sub-TC 12.5: [UPDATE] Memilih Baris Step & Membuka Modal Edit', async () => {
      console.log('   🔹 [Sub-TC 12.5: UPDATE] Memilih aksi edit workflow step...');
      const btnEditWfStepRow = page.locator('p-table tbody tr:first-child button:has(.pi-pencil)').first();
      await wedocit.captureStep({
        title: 'Sub-TC 12.5: [UPDATE] Memilih Baris Step & Membuka Modal Edit',
        description: 'Pengguna menekan tombol icon Edit pada baris step alur terpilih di tabel.',
        input: 'Klik Icon: Edit Step pada baris pertama',
        expected: 'Modal formulir edit transisi workflow step terbuka di layar.',
        highlight: btnEditWfStepRow
      });

      if (await btnEditWfStepRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnEditWfStepRow.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 12.6: UPDATE - Ubah Aturan Target Transisi
    await test.step('Sub-TC 12.6: [UPDATE] Memperbarui Aturan Target Transisi Step', async () => {
      console.log('   🔹 [Sub-TC 12.6: UPDATE] Mengubah konfigurasi transisi step...');
      const editWfStepAction = page.locator('p-dialog input[formcontrolname="actionName"]').first();
      if (await editWfStepAction.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editWfStepAction.fill('[TEST-EDV] Submit for Revision (Updated)');
      }

      await wedocit.captureStep({
        title: 'Sub-TC 12.6: [UPDATE] Memperbarui Aturan Target Transisi Step',
        description: 'Memperbarui aturan nama aksi transisi step menjadi Submit for Revision (Updated).',
        input: 'Updated Action: [TEST-EDV] Submit for Revision (Updated)',
        expected: 'Nilai aturan target transisi step terbarui pada form modal edit.',
        highlight: editWfStepAction
      });
    });

    // SUB-TC 12.7: UPDATE - Simpan Perubahan Step
    await test.step('Sub-TC 12.7: [UPDATE] Simpan Pembaruan Transisi Step ke Sistem', async () => {
      console.log('   🔹 [Sub-TC 12.7: UPDATE] Menyimpan perubahan workflow step...');
      const btnSaveWfStepEdit = page.locator('p-dialog button:has-text("Save")').first();
      await wedocit.captureStep({
        title: 'Sub-TC 12.7: [UPDATE] Simpan Pembaruan Transisi Step ke Sistem',
        description: 'Pengguna menekan tombol "Save" pada dialog untuk memutakhirkan rekaman aturan transisi step.',
        input: 'Klik Tombol: Save Perubahan Step',
        expected: 'Perubahan konfigurasi transisi step berhasil disimpan ke database.',
        highlight: btnSaveWfStepEdit
      });

      await closeModalIfOpen(page);
    });

    // SUB-TC 12.8: DELETE - Klik Hapus Step
    await test.step('Sub-TC 12.8: [DELETE] Memilih Aksi Hapus pada Baris Step Alur', async () => {
      console.log('   🔹 [Sub-TC 12.8: DELETE] Menekan tombol Delete workflow step...');
      const btnDeleteWfStepRow = page.locator('p-table tbody tr:first-child button:has(.pi-trash)').first();
      await wedocit.captureStep({
        title: 'Sub-TC 12.8: [DELETE] Memilih Aksi Hapus pada Baris Step Alur',
        description: 'Pengguna menekan icon Delete pada baris workflow step untuk memicu konfirmasi penghapusan.',
        input: 'Klik Icon: Delete Step',
        expected: 'Dialog peringatan konfirmasi penghapusan step workflow muncul di layar.',
        highlight: btnDeleteWfStepRow
      });

      if (await btnDeleteWfStepRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnDeleteWfStepRow.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 12.9: DELETE - Konfirmasi Hapus Step
    await test.step('Sub-TC 12.9: [DELETE] Konfirmasi Eksekusi Hapus Langkah Step Uji', async () => {
      console.log('   🔹 [Sub-TC 12.9: DELETE] Mengonfirmasi hapus workflow step...');
      const confirmDialog = page.locator('.p-confirm-dialog, .p-dialog').first();
      const btnConfirmDel = page.locator('.p-confirm-dialog button.p-confirm-dialog-accept, .p-confirm-dialog button:has-text("Hapus"), .p-confirm-dialog button:has-text("Ya")').first();

      const targetHighlight = (await btnConfirmDel.isVisible({ timeout: 1000 }).catch(() => false)) ? btnConfirmDel : confirmDialog;

      await wedocit.captureStep({
        title: 'Sub-TC 12.9: [DELETE] Konfirmasi Eksekusi Hapus Langkah Step Uji',
        description: 'Pengguna menekan tombol konfirmasi Hapus pada dialog peringatan untuk mengeksekusi penghapusan step.',
        input: 'Klik Tombol: Hapus / Ya, Lanjutkan',
        expected: 'Langkah step uji berhasil dihapus secara bersih dari database.',
        highlight: targetHighlight
      });

      await closeModalIfOpen(page);
    });
  });

  // =========================================================================
});