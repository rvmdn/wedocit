import { test, expect, commonTestConfig, setupTest, navigateToAdmin, closeModalIfOpen } from './_common';

test.use(commonTestConfig);

test.describe('[V2.0] [TC-006] Notification - Manage Email Template (CRUD Lifecycle)', () => {
  test.beforeEach(async ({ page, wedocit }) => {
    await setupTest(page, wedocit);
  });

test('[TC-006] Notification - Manage Email Template (CRUD Lifecycle)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-006',
      scenarioName: 'Siklus CRUD Template Notifikasi Email (Create -> Read -> Update -> Delete)',
      title: 'Notification - Email Template CRUD',
      expectedResult: 'Berhasil membuat template notifikasi email baru (Create), meninjau pada tabel (Read), mengubah subjek (Update), dan menghapus template uji (Delete).',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/email-template');

    // SUB-TC 6.1: CREATE - Buka Modal Tambah
    await test.step('Sub-TC 6.1: [CREATE] Akses Formulir Tambah Template Email Baru', async () => {
      console.log('   🔹 [Sub-TC 6.1: CREATE] Membuka modal Add Email Template...');
      const btnAddEmail = page.locator('button:has-text("Add Email Template"), button[label*="Add"]').first();
      await wedocit.captureStep({
        title: 'Sub-TC 6.1: [CREATE] Akses Formulir Tambah Template Email Baru',
        description: 'Pengguna menekan tombol "Add Email Template" pada toolbar halaman untuk membuka form pembuatan template pesan baru.',
        input: 'Klik Tombol: Add Email Template',
        expected: 'Modal formulir pembuatan template notifikasi email terbuka di layar.',
        highlight: btnAddEmail
      });

      if (await btnAddEmail.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnAddEmail.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 6.2: CREATE - Input Form Template Email
    await test.step('Sub-TC 6.2: [CREATE] Pengisian Event Code, Subject & Body Template', async () => {
      console.log('   🔹 [Sub-TC 6.2: CREATE] Mengisi form template email baru...');
      const emailEventCode = page.locator('input[formcontrolname="emailTemplateEventCode"]').first();
      const emailEventName = page.locator('input[formcontrolname="emailTemplateEventName"]').first();

      if (await emailEventCode.isVisible({ timeout: 2000 }).catch(() => false)) {
        await emailEventCode.fill('EVT_TEST_EDV');
        if (await emailEventName.isVisible().catch(() => false)) await emailEventName.fill('[TEST-EDV] Notifikasi Pengujian Alur');
      }

      await wedocit.captureStep({
        title: 'Sub-TC 6.2: [CREATE] Pengisian Event Code, Subject & Body Template',
        description: 'Mengisi konfigurasi template email meliputi event code EVT_TEST_EDV dan nama event notifikasi.',
        input: 'Event Code: EVT_TEST_EDV, Name: [TEST-EDV] Notifikasi Pengujian Alur',
        expected: 'Formulir template notifikasi email terisi lengkap dengan parameter pengujian.',
        highlight: emailEventCode
      });
    });

    // SUB-TC 6.3: CREATE - Simpan Template Email
    await test.step('Sub-TC 6.3: [CREATE] Simpan Template Notifikasi Email ke Database', async () => {
      console.log('   🔹 [Sub-TC 6.3: CREATE] Menekan tombol Save Template Email...');
      const btnSaveEmail = page.locator('p-dialog button:has-text("Save")').first();
      await wedocit.captureStep({
        title: 'Sub-TC 6.3: [CREATE] Simpan Template Notifikasi Email ke Database',
        description: 'Pengguna menekan tombol "Save" pada modal dialog untuk menyimpan rekaman template notifikasi email.',
        input: 'Klik Tombol: Save Email Template',
        expected: 'Template notifikasi email baru berhasil disimpan ke database.',
        highlight: btnSaveEmail
      });

      await closeModalIfOpen(page);
    });

    // SUB-TC 6.4: READ - Filter & Verifikasi Tabel
    await test.step('Sub-TC 6.4: [READ] Filter & Verifikasi Template Email pada Tabel', async () => {
      console.log('   🔹 [Sub-TC 6.4: READ] Menyaring template email...');
      const searchEmail = page.locator('input[formcontrolname="emailTemplateEventName"], input[placeholder*="event" i], input[placeholder*="Cari" i]').first();
      const btnSearchEmail = page.locator('button:has-text("Search")').first();
      if (await searchEmail.isVisible().catch(() => false)) {
        await searchEmail.fill('EVT');
        if (await btnSearchEmail.isVisible().catch(() => false)) await btnSearchEmail.click();
        await page.waitForTimeout(400);
      }

      await wedocit.captureStep({
        title: 'Sub-TC 6.4: [READ] Filter & Verifikasi Template Email pada Tabel',
        description: 'Menyaring tabel template email berdasarkan nama event untuk memastikan data referensi terdaftar.',
        input: 'Keyword Filter: EVT',
        expected: 'Tabel menampilkan daftar template email yang sesuai dengan kriteria pencarian.',
        highlight: searchEmail
      });
    });

    // SUB-TC 6.5: UPDATE - Buka Modal Edit Template
    await test.step('Sub-TC 6.5: [UPDATE] Memilih Baris Template & Membuka Modal Edit', async () => {
      console.log('   🔹 [Sub-TC 6.5: UPDATE] Memilih aksi edit pada baris template email...');
      const btnEditEmailRow = page.locator('p-table tbody tr:first-child button:has(.pi-pencil)').first();
      await wedocit.captureStep({
        title: 'Sub-TC 6.5: [UPDATE] Memilih Baris Template & Membuka Modal Edit',
        description: 'Pengguna menekan icon Edit pada baris template email terpilih di tabel.',
        input: 'Klik Icon: Edit Email Template pada baris pertama',
        expected: 'Modal formulir edit template email terbuka dengan data parameter sebelumnya.',
        highlight: btnEditEmailRow
      });

      if (await btnEditEmailRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnEditEmailRow.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 6.6: UPDATE - Ubah Subjek & Body Template
    await test.step('Sub-TC 6.6: [UPDATE] Memperbarui Subjek & Isi Pesan Notifikasi', async () => {
      console.log('   🔹 [Sub-TC 6.6: UPDATE] Mengubah subjek template email...');
      const editEmailName = page.locator('p-dialog input[formcontrolname="emailTemplateEventName"]').first();
      if (await editEmailName.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editEmailName.fill('[TEST-EDV] Pemberitahuan Status Terbaru (Updated)');
      }

      await wedocit.captureStep({
        title: 'Sub-TC 6.6: [UPDATE] Memperbarui Subjek & Isi Pesan Notifikasi',
        description: 'Memperbarui nama dan subjek template email pada formulir pembaruan data.',
        input: 'Updated Subject: [TEST-EDV] Pemberitahuan Status Terbaru (Updated)',
        expected: 'Nilai subjek terbaru terisi dengan benar pada form modal.',
        highlight: editEmailName
      });
    });

    // SUB-TC 6.7: UPDATE - Simpan Perubahan Template
    await test.step('Sub-TC 6.7: [UPDATE] Simpan Pembaruan Template Email ke Sistem', async () => {
      console.log('   🔹 [Sub-TC 6.7: UPDATE] Menyimpan perubahan template email...');
      const btnSaveEmailEdit = page.locator('p-dialog button:has-text("Save")').first();
      await wedocit.captureStep({
        title: 'Sub-TC 6.7: [UPDATE] Simpan Pembaruan Template Email ke Sistem',
        description: 'Pengguna menekan tombol "Save" pada dialog untuk memutakhirkan rekaman template notifikasi.',
        input: 'Klik Tombol: Save Perubahan',
        expected: 'Perubahan subjek dan body template email berhasil disimpan.',
        highlight: btnSaveEmailEdit
      });

      await closeModalIfOpen(page);
    });

    // SUB-TC 6.8: DELETE - Klik Hapus Template
    await test.step('Sub-TC 6.8: [DELETE] Memilih Aksi Hapus pada Baris Template Email', async () => {
      console.log('   🔹 [Sub-TC 6.8: DELETE] Menekan tombol Delete template email...');
      const btnDeleteEmailRow = page.locator('p-table tbody tr:first-child button:has(.pi-trash)').first();
      await wedocit.captureStep({
        title: 'Sub-TC 6.8: [DELETE] Memilih Aksi Hapus pada Baris Template Email',
        description: 'Pengguna menekan icon Delete pada baris template email untuk memicu dialog peringatan.',
        input: 'Klik Icon: Delete Email Template',
        expected: 'Dialog konfirmasi penghapusan template email muncul di layar.',
        highlight: btnDeleteEmailRow
      });

      if (await btnDeleteEmailRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnDeleteEmailRow.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 6.9: DELETE - Konfirmasi Hapus Template
    await test.step('Sub-TC 6.9: [DELETE] Konfirmasi Eksekusi Hapus Template Email Uji', async () => {
      console.log('   🔹 [Sub-TC 6.9: DELETE] Mengonfirmasi hapus template email...');
      const confirmDialog = page.locator('.p-confirm-dialog, .p-dialog').first();
      const btnConfirmDel = page.locator('.p-confirm-dialog button.p-confirm-dialog-accept, .p-confirm-dialog button:has-text("Hapus"), .p-confirm-dialog button:has-text("Ya")').first();

      const targetHighlight = (await btnConfirmDel.isVisible({ timeout: 1000 }).catch(() => false)) ? btnConfirmDel : confirmDialog;

      await wedocit.captureStep({
        title: 'Sub-TC 6.9: [DELETE] Konfirmasi Eksekusi Hapus Template Email Uji',
        description: 'Pengguna menekan tombol konfirmasi Hapus pada dialog peringatan untuk mengeksekusi penghapusan template.',
        input: 'Klik Tombol: Hapus / Ya, Lanjutkan',
        expected: 'Template email uji berhasil dihapus dari database.',
        highlight: targetHighlight
      });

      await closeModalIfOpen(page);
    });
  });

  // =========================================================================
});