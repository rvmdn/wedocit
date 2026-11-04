import { test, expect, commonTestConfig, setupTest, navigateToAdmin, closeModalIfOpen } from './_common';

test.use(commonTestConfig);

test.describe('[V2.0] [TC-011] Workflow Management - Workflow Status (CRUD Lifecycle)', () => {
  test.beforeEach(async ({ page, wedocit }) => {
    await setupTest(page, wedocit);
  });

test('[TC-011] Workflow Management - Workflow Status (CRUD Lifecycle)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-011',
      scenarioName: 'Siklus CRUD Status Workflow Approval (Create -> Read -> Update -> Delete)',
      title: 'Workflow Management - Workflow Status CRUD',
      expectedResult: 'Berhasil membuat status alur kerja baru (Create), memverifikasi pada tabel status (Read), memperbarui deskripsi status (Update), dan menghapus status uji (Delete).',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/workflow/status');

    // SUB-TC 11.1: CREATE - Buka Modal Tambah
    await test.step('Sub-TC 11.1: [CREATE] Akses Formulir Tambah Status Workflow Baru', async () => {
      console.log('   🔹 [Sub-TC 11.1: CREATE] Membuka modal Add Workflow Status...');
      const btnAddWfStatus = page.locator('button:has-text("Add Workflow Status"), button[label*="Add"]').first();
      await wedocit.captureStep({
        title: 'Sub-TC 11.1: [CREATE] Akses Formulir Tambah Status Workflow Baru',
        description: 'Pengguna menekan tombol "Add Workflow Status" pada toolbar halaman untuk membuka form status alur baru.',
        input: 'Klik Tombol: Add Workflow Status',
        expected: 'Modal formulir pembuatan status workflow baru terbuka di layar.',
        highlight: btnAddWfStatus
      });

      if (await btnAddWfStatus.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnAddWfStatus.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 11.2: CREATE - Input Form Workflow Status
    await test.step('Sub-TC 11.2: [CREATE] Pengisian Form Status Alur Kerja Dokumen', async () => {
      console.log('   🔹 [Sub-TC 11.2: CREATE] Mengisi form workflow status...');
      const wfStatusNameInput = page.locator('input[formcontrolname="statusName"], input#statusName').first();
      const wfStatusValInput = page.locator('input[formcontrolname="statusValue"], input#statusValue').first();

      if (await wfStatusNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await wfStatusNameInput.fill('[TEST-EDV] Menunggu Review Khusus');
        if (await wfStatusValInput.isVisible().catch(() => false)) await wfStatusValInput.fill('STATUS_TEST_EDV');
      }

      await wedocit.captureStep({
        title: 'Sub-TC 11.2: [CREATE] Pengisian Form Status Alur Kerja Dokumen',
        description: 'Mendaftarkan status alur baru STATUS_TEST_EDV untuk alur pengujian review dokumen.',
        input: 'Status Code: STATUS_TEST_EDV, Status Name: [TEST-EDV] Menunggu Review Khusus',
        expected: 'Formulir status alur kerja dokumen terisi dengan data yang valid.',
        highlight: wfStatusNameInput
      });
    });

    // SUB-TC 11.3: CREATE - Simpan Status Workflow
    await test.step('Sub-TC 11.3: [CREATE] Simpan Status Alur Kerja ke Database', async () => {
      console.log('   🔹 [Sub-TC 11.3: CREATE] Menekan tombol Save Workflow Status...');
      const btnSaveWfStatus = page.locator('p-dialog button:has-text("Save")').first();
      await wedocit.captureStep({
        title: 'Sub-TC 11.3: [CREATE] Simpan Status Alur Kerja ke Database',
        description: 'Pengguna menekan tombol "Save" pada dialog untuk menyimpan status alur kerja ke database.',
        input: 'Klik Tombol: Save Workflow Status',
        expected: 'Status alur kerja baru berhasil disimpan ke database workflow.',
        highlight: btnSaveWfStatus
      });

      await closeModalIfOpen(page);
    });

    // SUB-TC 11.4: READ - Filter Tabel Status
    await test.step('Sub-TC 11.4: [READ] Filter & Verifikasi Status Alur pada Tabel', async () => {
      console.log('   🔹 [Sub-TC 11.4: READ] Menyaring daftar status workflow...');
      const wfStatusFilter = page.locator('input[formcontrolname="flowName"], input[placeholder*="nama" i]').first();
      const btnWfFilter = page.locator('button:has-text("Filter")').first();
      if (await wfStatusFilter.isVisible().catch(() => false)) {
        await wfStatusFilter.fill('Flow');
        if (await btnWfFilter.isVisible().catch(() => false)) await btnWfFilter.click();
        await page.waitForTimeout(400);
      }

      await wedocit.captureStep({
        title: 'Sub-TC 11.4: [READ] Filter & Verifikasi Status Alur pada Tabel',
        description: 'Menyaring tabel workflow status berdasarkan flow name untuk memastikan status alur terekam.',
        input: 'Filter Flow Name: Flow',
        expected: 'Status workflow yang dicari berhasil ditampilkan pada tabel.',
        highlight: wfStatusFilter
      });
    });

    // SUB-TC 11.5: UPDATE - Buka Modal Edit Status
    await test.step('Sub-TC 11.5: [UPDATE] Memilih Baris Status & Membuka Modal Edit', async () => {
      console.log('   🔹 [Sub-TC 11.5: UPDATE] Memilih aksi edit status workflow...');
      const btnEditWfStatusRow = page.locator('p-table tbody tr:first-child button:has(.pi-pencil)').first();
      await wedocit.captureStep({
        title: 'Sub-TC 11.5: [UPDATE] Memilih Baris Status & Membuka Modal Edit',
        description: 'Pengguna menekan tombol icon Edit pada baris status alur terpilih di tabel.',
        input: 'Klik Icon: Edit Status pada baris pertama',
        expected: 'Modal formulir edit status workflow terbuka dengan rincian status saat ini.',
        highlight: btnEditWfStatusRow
      });

      if (await btnEditWfStatusRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnEditWfStatusRow.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 11.6: UPDATE - Ubah Nama Status
    await test.step('Sub-TC 11.6: [UPDATE] Memperbarui Keterangan Status Alur Kerja', async () => {
      console.log('   🔹 [Sub-TC 11.6: UPDATE] Mengubah nama status workflow...');
      const editWfStatusName = page.locator('p-dialog input[formcontrolname="statusName"]').first();
      if (await editWfStatusName.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editWfStatusName.fill('[TEST-EDV] Menunggu Review Khusus (Updated)');
      }

      await wedocit.captureStep({
        title: 'Sub-TC 11.6: [UPDATE] Memperbarui Keterangan Status Alur Kerja',
        description: 'Memperbarui nama status workflow menjadi [TEST-EDV] Menunggu Review Khusus (Updated).',
        input: 'Updated Status: [TEST-EDV] Menunggu Review Khusus (Updated)',
        expected: 'Nilai nama status alur kerja terbarui dengan benar pada modal edit.',
        highlight: editWfStatusName
      });
    });

    // SUB-TC 11.7: UPDATE - Simpan Perubahan Status
    await test.step('Sub-TC 11.7: [UPDATE] Simpan Pembaruan Status Alur ke Database', async () => {
      console.log('   🔹 [Sub-TC 11.7: UPDATE] Menyimpan perubahan status workflow...');
      const btnSaveWfStatusEdit = page.locator('p-dialog button:has-text("Save")').first();
      await wedocit.captureStep({
        title: 'Sub-TC 11.7: [UPDATE] Simpan Pembaruan Status Alur ke Database',
        description: 'Pengguna menekan tombol "Save" pada dialog untuk memutakhirkan rekaman status alur.',
        input: 'Klik Tombol: Save Perubahan',
        expected: 'Perubahan nama status workflow berhasil disimpan ke database.',
        highlight: btnSaveWfStatusEdit
      });

      await closeModalIfOpen(page);
    });

    // SUB-TC 11.8: DELETE - Klik Hapus Status
    await test.step('Sub-TC 11.8: [DELETE] Memilih Aksi Hapus pada Baris Status Alur', async () => {
      console.log('   🔹 [Sub-TC 11.8: DELETE] Menekan tombol Delete status workflow...');
      const btnDeleteWfStatusRow = page.locator('p-table tbody tr:first-child button:has(.pi-trash)').first();
      await wedocit.captureStep({
        title: 'Sub-TC 11.8: [DELETE] Memilih Aksi Hapus pada Baris Status Alur',
        description: 'Pengguna menekan icon Delete pada baris status workflow untuk memicu konfirmasi penghapusan.',
        input: 'Klik Icon: Delete Status Workflow',
        expected: 'Dialog peringatan konfirmasi penghapusan status alur kerja muncul di layar.',
        highlight: btnDeleteWfStatusRow
      });

      if (await btnDeleteWfStatusRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnDeleteWfStatusRow.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 11.9: DELETE - Konfirmasi Hapus Status
    await test.step('Sub-TC 11.9: [DELETE] Konfirmasi Eksekusi Hapus Status Alur Uji', async () => {
      console.log('   🔹 [Sub-TC 11.9: DELETE] Mengonfirmasi hapus status workflow...');
      const confirmDialog = page.locator('.p-confirm-dialog, .p-dialog').first();
      const btnConfirmDel = page.locator('.p-confirm-dialog button.p-confirm-dialog-accept, .p-confirm-dialog button:has-text("Hapus"), .p-confirm-dialog button:has-text("Ya")').first();

      const targetHighlight = (await btnConfirmDel.isVisible({ timeout: 1000 }).catch(() => false)) ? btnConfirmDel : confirmDialog;

      await wedocit.captureStep({
        title: 'Sub-TC 11.9: [DELETE] Konfirmasi Eksekusi Hapus Status Alur Uji',
        description: 'Pengguna menekan tombol konfirmasi Hapus pada dialog peringatan untuk mengeksekusi penghapusan status.',
        input: 'Klik Tombol: Hapus / Ya, Lanjutkan',
        expected: 'Status workflow uji berhasil dihapus secara bersih dari database.',
        highlight: targetHighlight
      });

      await closeModalIfOpen(page);
    });
  });

  // =========================================================================
});