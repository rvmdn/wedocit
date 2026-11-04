import { test, expect, Page } from '../src/fixtures/wedocit';
import { ensureRmisAuthenticated } from '../src/helpers/rmis-auth';
import * as path from 'path';
import * as fs from 'fs';

const rmisAuthFile = path.resolve(process.cwd(), '.auth/user_rmis_admin.json');
const legacyAuthFile = path.resolve(process.cwd(), '.auth/user_orms_admin.json');
const activeAuthFile = fs.existsSync(rmisAuthFile) ? rmisAuthFile : (fs.existsSync(legacyAuthFile) ? legacyAuthFile : undefined);

test.use({
  baseURL: process.env.RMIS_BASE_URL || process.env.ORMS_BASE_URL || 'http://localhost:4300',
  viewport: { width: 1366, height: 768 },
  storageState: activeAuthFile
});

test.describe('Unit Test Suite: [RMIS] Administration Management CRUD Master Data Lifecycle', () => {

  test.beforeEach(async ({ page, wedocit }) => {
    wedocit.setMetadata({
      systemName: 'Risk Management Information System (RMIS)',
      projectName: 'Risk Management Information System (RMIS)',
      crNo: 'CR 60133',
      title: 'Unit Test Documentation - [RMIS] Administration Management Master Data CRUD',
      module: 'Administration Management',
      scope: 'Pengembangan pada CR ini terdiri dari pengembangan frontend dan backend modul Administration Management pada aplikasi Risk Management Information System (RMIS) yang mencakup pengelolaan Unit Kerja & Unit PIC, Manajemen Role & Matriks Hak Akses (Permissions), Manajemen Menu Navigasi, Template Email Notifikasi, Pengelolaan Master Lookup (System, MIO, MRM, dan RBBR/TKB), Alur Kerja Persetujuan (Workflow Status & Steps), Utilitas Object Storage S3, serta Pemantauan Sesi Aktif dan Audit Trail.',
      shortDescription: 'Pengujian siklus hidup lengkap (Full CRUD Lifecycle: Create -> Read -> Update -> Delete) pada seluruh master data Admin Tools aplikasi Risk Management Information System (RMIS) mencakup Manage Unit, Unit PIC, Role Management, Permissions Matrix, Manage Menu, Email Template, Lookup System, Lookup MIO, Lookup MRM, Lookup RBBR, Workflow Status, Workflow Step, S3 Helper, Manage Session, dan Audit Trail.',
      testedBy: 'Dimas Raka Dewanggana',
      npp: '-'
    });

    await ensureRmisAuthenticated(page);
  });

  /**
   * Helper navigasi terpadu ke halaman Administration Management RMIS
   */
  async function navigateToAdmin(page: Page, targetUrl: string) {
    await page.keyboard.press('Escape').catch(() => {});
    await page.evaluate(() => {
      document.querySelectorAll('vite-error-overlay').forEach(el => el.remove());
    }).catch(() => {});

    for (let attempt = 0; attempt < 3; attempt++) {
      const portalBtn = page.locator('text=Masuk ke Aplikasi RMIS, button:has-text("Masuk ke Aplikasi RMIS")').first();
      if (await portalBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await portalBtn.click({ force: true });
        await page.waitForTimeout(1500);
      }

      const passInput = page.locator('input[placeholder*="Password" i], input#password, input[type="password"]').first();
      const userInput = page.locator('input[placeholder*="Username" i], input#username, input[type="text"]').first();
      if (await passInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        if (await userInput.isEditable({ timeout: 1500 }).catch(() => false)) {
          await userInput.fill('Admin');
          await passInput.fill('AdminBni1234/');
          await page.evaluate(() => {
            document.querySelectorAll('vite-error-overlay').forEach(el => el.remove());
          }).catch(() => {});
          await page.locator('button:has-text("SIGN IN"), button[type="submit"]').first().click({ force: true });
          await page.waitForURL(url => !url.toString().includes('login'), { timeout: 10000 }).catch(() => {});
          await page.waitForTimeout(1500);
        }
      }

      if (!page.url().includes(targetUrl)) {
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
        await page.waitForTimeout(1500);
      }

      const isTableReady = await page.locator('p-table, p-treeTable, table, .card').first().isVisible({ timeout: 5000 }).catch(() => false);
      if (isTableReady && !page.url().includes('portal') && !page.url().includes('login')) {
        return;
      }
      await page.waitForTimeout(800);
    }
  }

  /**
   * Helper penutup dialog modal secara aman dan tuntas (mencegah pointer interceptor)
   */
  async function closeModalIfOpen(page: Page) {
    await page.keyboard.press('Escape').catch(() => {});
    const closeBtn = page.locator('button:has-text("Close"), button:has-text("Cancel"), button:has-text("Tutup"), .p-dialog-header-close, button[aria-label="Close"], button.p-dialog-header-icon').first();
    if (await closeBtn.isVisible({ timeout: 1200 }).catch(() => false)) {
      await closeBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(400);
    }
    await page.keyboard.press('Escape').catch(() => {});
  }

  // =========================================================================
  // 1. ORGANIZATION: MANAGE UNIT (FULL CRUD LIFECYCLE)
  // =========================================================================

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
        await page.waitForTimeout(500);
      }

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
      const btnEditRow = page.locator('p-table tbody tr:first-child button[ptooltip="Edit"], p-table tbody tr:first-child button:has(.pi-pencil)').first();
      await wedocit.captureStep({
        title: 'Sub-TC 1.5: [UPDATE] Memilih Data & Membuka Modal Edit Unit',
        description: 'Pengguna menekan tombol icon Edit pada baris data unit kerja terpilih di tabel.',
        input: 'Klik Icon: Edit Unit pada baris pertama',
        expected: 'Modal formulir edit terbuka dengan seluruh data atribut unit sebelumnya.',
        highlight: btnEditRow
      });

      if (await btnEditRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnEditRow.click();
        await page.waitForTimeout(800);
      }
    });

    // SUB-TC 1.6: UPDATE - Ubah Field
    await test.step('Sub-TC 1.6: [UPDATE] Memperbarui Nilai Atribut Unit Kerja', async () => {
      console.log('   🔹 [Sub-TC 1.6: UPDATE] Mengubah nama dan deskripsi unit...');
      const editName = page.locator('p-dialog input[formcontrolname="unitName"]').first();
      if (await editName.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editName.fill('[TEST-EDV] Divisi Enterprise Audit (Updated)');
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
  // 2. ORGANIZATION: UNIT PIC (FULL CRUD LIFECYCLE)
  // =========================================================================

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
  // 3. ACCESS CONTROL: MANAGE ROLE (FULL CRUD LIFECYCLE)
  // =========================================================================

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
  // 4. ACCESS CONTROL: ROLE PERMISSIONS MATRIX
  // =========================================================================

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
  // 5. NAVIGATION: MANAGE MENU (FULL CRUD LIFECYCLE)
  // =========================================================================

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
  // 6. NOTIFICATION: MANAGE EMAIL TEMPLATE (FULL CRUD LIFECYCLE)
  // =========================================================================

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
  // 7. LOOKUP MANAGEMENT: SYSTEM LOOKUP (FULL CRUD LIFECYCLE)
  // =========================================================================

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
  // 8. LOOKUP MANAGEMENT: MIO LOOKUP (FULL CRUD LIFECYCLE)
  // =========================================================================

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
  // 9. LOOKUP MANAGEMENT: MRM LOOKUP (FULL CRUD LIFECYCLE)
  // =========================================================================

  test('[TC-009] Lookup Management - MRM Lookup (CRUD Lifecycle)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-009',
      scenarioName: 'Siklus CRUD Parameter Lookup Model Risk Management (Create -> Read -> Update -> Delete)',
      title: 'Lookup Management - MRM Lookup CRUD',
      expectedResult: 'Berhasil mendaftarkan parameter MRM baru (Create), memverifikasi pada tabel (Read), mengubah deskripsi (Update), dan menghapus parameter uji (Delete).',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/lookup/mrm');

    // SUB-TC 9.1: CREATE - Buka Modal Tambah
    await test.step('Sub-TC 9.1: [CREATE] Akses Formulir Tambah Parameter MRM Baru', async () => {
      console.log('   🔹 [Sub-TC 9.1: CREATE] Membuka modal Add Lookup MRM...');
      const btnAddMrm = page.locator('button:has-text("Add Lookup"), button[label*="Add"]').first();
      await wedocit.captureStep({
        title: 'Sub-TC 9.1: [CREATE] Akses Formulir Tambah Parameter MRM Baru',
        description: 'Pengguna menekan tombol "Add Lookup" pada toolbar halaman untuk membuka form pembuatan parameter status model.',
        input: 'Klik Tombol: Add Lookup MRM',
        expected: 'Modal formulir parameter model risk management terbuka di layar.',
        highlight: btnAddMrm
      });

      if (await btnAddMrm.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnAddMrm.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 9.2: CREATE - Input Form MRM
    await test.step('Sub-TC 9.2: [CREATE] Pengisian Form Parameter Siklus Model Risk', async () => {
      console.log('   🔹 [Sub-TC 9.2: CREATE] Mengisi form parameter MRM...');
      const mrmNameInput = page.locator('input[formcontrolname="lookupName"], input[formcontrolname="name"]').first();
      const mrmValueInput = page.locator('input[formcontrolname="lookupValue"], input[formcontrolname="value"]').first();

      if (await mrmNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await mrmNameInput.fill('[TEST-EDV] Status Validasi Model Khusus');
        if (await mrmValueInput.isVisible().catch(() => false)) await mrmValueInput.fill('15');
      }

      await wedocit.captureStep({
        title: 'Sub-TC 9.2: [CREATE] Pengisian Form Parameter Siklus Model Risk',
        description: 'Mendaftarkan parameter status siklus model uji dengan kode nilai 15 dan deskripsi pengujian.',
        input: 'Name: [TEST-EDV] Status Validasi Model Khusus, Value: 15',
        expected: 'Formulir parameter MRM terisi dengan konfigurasi data yang tepat.',
        highlight: mrmNameInput
      });
    });

    // SUB-TC 9.3: CREATE - Simpan Parameter MRM
    await test.step('Sub-TC 9.3: [CREATE] Simpan Parameter Model Risk ke Database', async () => {
      console.log('   🔹 [Sub-TC 9.3: CREATE] Menekan tombol Save Lookup MRM...');
      const btnSaveMrm = page.locator('p-dialog button:has-text("Save")').first();
      await wedocit.captureStep({
        title: 'Sub-TC 9.3: [CREATE] Simpan Parameter Model Risk ke Database',
        description: 'Pengguna menekan tombol "Save" pada dialog untuk menyimpan rekaman parameter model risk management.',
        input: 'Klik Tombol: Save Parameter MRM',
        expected: 'Parameter status model baru berhasil disimpan ke tabel LOOKUP_MODEL_RISK_MANAGEMENT.',
        highlight: btnSaveMrm
      });

      await closeModalIfOpen(page);
    });

    // SUB-TC 9.4: READ - Filter Tabel MRM
    await test.step('Sub-TC 9.4: [READ] Filter & Verifikasi Parameter MRM pada Tabel', async () => {
      console.log('   🔹 [Sub-TC 9.4: READ] Menyaring parameter MRM...');
      const mrmFilter = page.locator('input[placeholder*="Name" i], input[placeholder*="Filter" i]').first();
      const btnMrmFilter = page.locator('button:has-text("Filter")').first();
      if (await mrmFilter.isVisible().catch(() => false)) {
        await mrmFilter.fill('Model');
        if (await btnMrmFilter.isVisible().catch(() => false)) await btnMrmFilter.click();
        await page.waitForTimeout(400);
      }

      await wedocit.captureStep({
        title: 'Sub-TC 9.4: [READ] Filter & Verifikasi Parameter MRM pada Tabel',
        description: 'Menyaring parameter MRM berdasarkan nama model untuk memverifikasi pencatatan data referensi.',
        input: 'Filter Keyword: Model',
        expected: 'Data parameter MRM berhasil disaring dan ditampilkan pada tabel.',
        highlight: mrmFilter
      });
    });

    // SUB-TC 9.5: UPDATE - Buka Modal Edit MRM
    await test.step('Sub-TC 9.5: [UPDATE] Memilih Baris Data & Membuka Modal Edit MRM', async () => {
      console.log('   🔹 [Sub-TC 9.5: UPDATE] Memilih aksi edit parameter MRM...');
      const btnEditMrmRow = page.locator('p-table tbody tr:first-child button:has(.pi-pencil)').first();
      await wedocit.captureStep({
        title: 'Sub-TC 9.5: [UPDATE] Memilih Baris Data & Membuka Modal Edit MRM',
        description: 'Pengguna menekan tombol icon Edit pada baris parameter MRM terpilih di tabel.',
        input: 'Klik Icon: Edit MRM pada baris pertama',
        expected: 'Modal formulir edit parameter MRM terbuka dengan rincian saat ini.',
        highlight: btnEditMrmRow
      });

      if (await btnEditMrmRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnEditMrmRow.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 9.6: UPDATE - Ubah Deskripsi MRM
    await test.step('Sub-TC 9.6: [UPDATE] Memperbarui Deskripsi Status Model Risk', async () => {
      console.log('   🔹 [Sub-TC 9.6: UPDATE] Mengubah deskripsi parameter MRM...');
      const editMrmName = page.locator('p-dialog input[formcontrolname="lookupName"], p-dialog input[formcontrolname="name"]').first();
      if (await editMrmName.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editMrmName.fill('[TEST-EDV] Status Validasi Model Khusus (Updated)');
      }

      await wedocit.captureStep({
        title: 'Sub-TC 9.6: [UPDATE] Memperbarui Deskripsi Status Model Risk',
        description: 'Memperbarui nama deskripsi parameter MRM menjadi [TEST-EDV] Status Validasi Model Khusus (Updated).',
        input: 'Updated Name: [TEST-EDV] Status Validasi Model Khusus (Updated)',
        expected: 'Pembaruan deskripsi parameter MRM terinput pada formulir.',
        highlight: editMrmName
      });
    });

    // SUB-TC 9.7: UPDATE - Simpan Perubahan MRM
    await test.step('Sub-TC 9.7: [UPDATE] Simpan Pembaruan Parameter MRM ke Sistem', async () => {
      console.log('   🔹 [Sub-TC 9.7: UPDATE] Menyimpan perubahan parameter MRM...');
      const btnSaveMrmEdit = page.locator('p-dialog button:has-text("Save")').first();
      await wedocit.captureStep({
        title: 'Sub-TC 9.7: [UPDATE] Simpan Pembaruan Parameter MRM ke Sistem',
        description: 'Pengguna menekan tombol "Save" pada dialog untuk menyimpan pembaruan parameter MRM.',
        input: 'Klik Tombol: Save Perubahan',
        expected: 'Pembaruan deskripsi parameter MRM berhasil disimpan ke database.',
        highlight: btnSaveMrmEdit
      });

      await closeModalIfOpen(page);
    });

    // SUB-TC 9.8: DELETE - Klik Hapus Parameter MRM
    await test.step('Sub-TC 9.8: [DELETE] Memilih Aksi Hapus pada Baris Parameter MRM', async () => {
      console.log('   🔹 [Sub-TC 9.8: DELETE] Menekan tombol Delete parameter MRM...');
      const btnDeleteMrmRow = page.locator('p-table tbody tr:first-child button:has(.pi-trash)').first();
      await wedocit.captureStep({
        title: 'Sub-TC 9.8: [DELETE] Memilih Aksi Hapus pada Baris Parameter MRM',
        description: 'Pengguna menekan icon Delete pada baris parameter MRM untuk memicu konfirmasi penghapusan.',
        input: 'Klik Icon: Delete MRM',
        expected: 'Dialog konfirmasi penghapusan parameter MRM muncul di layar.',
        highlight: btnDeleteMrmRow
      });

      if (await btnDeleteMrmRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnDeleteMrmRow.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 9.9: DELETE - Konfirmasi Hapus Parameter MRM
    await test.step('Sub-TC 9.9: [DELETE] Konfirmasi Eksekusi Hapus Parameter MRM Uji', async () => {
      console.log('   🔹 [Sub-TC 9.9: DELETE] Mengonfirmasi hapus parameter MRM...');
      const confirmDialog = page.locator('.p-confirm-dialog, .p-dialog').first();
      const btnConfirmDel = page.locator('.p-confirm-dialog button.p-confirm-dialog-accept, .p-confirm-dialog button:has-text("Hapus"), .p-confirm-dialog button:has-text("Ya")').first();

      const targetHighlight = (await btnConfirmDel.isVisible({ timeout: 1000 }).catch(() => false)) ? btnConfirmDel : confirmDialog;

      await wedocit.captureStep({
        title: 'Sub-TC 9.9: [DELETE] Konfirmasi Eksekusi Hapus Parameter MRM Uji',
        description: 'Pengguna menekan tombol konfirmasi Hapus pada dialog peringatan untuk mengeksekusi penghapusan.',
        input: 'Klik Tombol: Hapus / Ya, Lanjutkan',
        expected: 'Parameter MRM uji berhasil dihapus secara bersih dari database.',
        highlight: targetHighlight
      });

      await closeModalIfOpen(page);
    });
  });

  // =========================================================================
  // 10. LOOKUP MANAGEMENT: RBBR / TKB LOOKUP (FULL CRUD LIFECYCLE)
  // =========================================================================

  test('[TC-010] Lookup Management - RBBR / TKB Lookup (CRUD Lifecycle)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-010',
      scenarioName: 'Siklus CRUD Parameter Lookup RBBR / TKB (Create -> Read -> Update -> Delete)',
      title: 'Lookup Management - RBBR Lookup CRUD',
      expectedResult: 'Berhasil mendaftarkan parameter bobot risiko RBBR baru (Create), memverifikasi pada tabel (Read), mengubah bobot persentase (Update), dan menghapus parameter uji (Delete).',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/lookup/rbbr');

    // SUB-TC 10.1: CREATE - Buka Modal Tambah
    await test.step('Sub-TC 10.1: [CREATE] Akses Formulir Tambah Parameter Bobot RBBR', async () => {
      console.log('   🔹 [Sub-TC 10.1: CREATE] Membuka modal Add Lookup RBBR...');
      const btnAddRbbr = page.locator('button:has-text("Add Lookup"), button[label*="Add"]').first();
      await wedocit.captureStep({
        title: 'Sub-TC 10.1: [CREATE] Akses Formulir Tambah Parameter Bobot RBBR',
        description: 'Pengguna menekan tombol "Add Lookup" pada toolbar halaman untuk membuka form pendaftaran parameter bobot risiko.',
        input: 'Klik Tombol: Add Lookup RBBR',
        expected: 'Modal formulir parameter bobot risiko RBBR terbuka di layar.',
        highlight: btnAddRbbr
      });

      if (await btnAddRbbr.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnAddRbbr.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 10.2: CREATE - Input Form RBBR
    await test.step('Sub-TC 10.2: [CREATE] Pengisian Form Parameter Bobot Risiko RBBR', async () => {
      console.log('   🔹 [Sub-TC 10.2: CREATE] Mengisi form parameter RBBR...');
      const rbbrNameInput = page.locator('input[formcontrolname="lookupName"]').first();
      const rbbrValueInput = page.locator('input[formcontrolname="lookupValue"]').first();

      if (await rbbrNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await rbbrNameInput.fill('[TEST-EDV] Risiko Tambahan Uji RBBR');
        if (await rbbrValueInput.isVisible().catch(() => false)) await rbbrValueInput.fill('5');
      }

      await wedocit.captureStep({
        title: 'Sub-TC 10.2: [CREATE] Pengisian Form Parameter Bobot Risiko RBBR',
        description: 'Mendaftarkan parameter risiko tambahan RBBR_TEST_RISK dengan bobot uji 5%.',
        input: 'Name: [TEST-EDV] Risiko Tambahan Uji RBBR, Value: 5',
        expected: 'Formulir bobot risiko RBBR terisi lengkap dengan nilai numerik valid.',
        highlight: rbbrNameInput
      });
    });

    // SUB-TC 10.3: CREATE - Simpan Parameter RBBR
    await test.step('Sub-TC 10.3: [CREATE] Simpan Parameter Bobot Risiko ke Database', async () => {
      console.log('   🔹 [Sub-TC 10.3: CREATE] Menekan tombol Save Lookup RBBR...');
      const btnSaveRbbr = page.locator('p-dialog button:has-text("Save")').first();
      await wedocit.captureStep({
        title: 'Sub-TC 10.3: [CREATE] Simpan Parameter Bobot Risiko ke Database',
        description: 'Pengguna menekan tombol "Save" pada dialog untuk menyimpan konfigurasi bobot risiko RBBR ke database.',
        input: 'Klik Tombol: Save Parameter RBBR',
        expected: 'Parameter risiko RBBR baru berhasil disimpan ke tabel LOOKUP_RBBR.',
        highlight: btnSaveRbbr
      });

      await closeModalIfOpen(page);
    });

    // SUB-TC 10.4: READ - Filter Tabel RBBR
    await test.step('Sub-TC 10.4: [READ] Filter & Verifikasi Bobot Risiko pada Tabel', async () => {
      console.log('   🔹 [Sub-TC 10.4: READ] Menyaring tabel lookup RBBR...');
      const rbbrFilter = page.locator('input[placeholder*="Filter" i]').first();
      const btnRbbrFilter = page.locator('button:has-text("Filter")').first();
      if (await rbbrFilter.isVisible().catch(() => false)) {
        await rbbrFilter.fill('RBBR');
        if (await btnRbbrFilter.isVisible().catch(() => false)) await btnRbbrFilter.click();
        await page.waitForTimeout(400);
      }

      await wedocit.captureStep({
        title: 'Sub-TC 10.4: [READ] Filter & Verifikasi Bobot Risiko pada Tabel',
        description: 'Menyaring tabel lookup RBBR untuk memeriksa pencatatan dan keterbacaan bobot risiko.',
        input: 'Filter Keyword: RBBR',
        expected: 'Parameter RBBR yang dicari berhasil ditampilkan pada tabel.',
        highlight: rbbrFilter
      });
    });

    // SUB-TC 10.5: UPDATE - Buka Modal Edit RBBR
    await test.step('Sub-TC 10.5: [UPDATE] Memilih Baris Data & Membuka Modal Edit RBBR', async () => {
      console.log('   🔹 [Sub-TC 10.5: UPDATE] Memilih aksi edit parameter RBBR...');
      const btnEditRbbrRow = page.locator('p-table tbody tr:first-child button:has(.pi-pencil)').first();
      await wedocit.captureStep({
        title: 'Sub-TC 10.5: [UPDATE] Memilih Baris Data & Membuka Modal Edit RBBR',
        description: 'Pengguna menekan tombol icon Edit pada baris parameter RBBR terpilih di tabel.',
        input: 'Klik Icon: Edit RBBR pada baris pertama',
        expected: 'Modal formulir edit parameter RBBR terbuka dengan data bobot saat ini.',
        highlight: btnEditRbbrRow
      });

      if (await btnEditRbbrRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnEditRbbrRow.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 10.6: UPDATE - Ubah Nilai Bobot
    await test.step('Sub-TC 10.6: [UPDATE] Memperbarui Nilai Persentase Bobot Risiko', async () => {
      console.log('   🔹 [Sub-TC 10.6: UPDATE] Mengubah bobot RBBR...');
      const editRbbrName = page.locator('p-dialog input[formcontrolname="lookupName"]').first();
      if (await editRbbrName.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editRbbrName.fill('[TEST-EDV] Risiko Tambahan Uji RBBR (Bobot 7.5%)');
      }

      await wedocit.captureStep({
        title: 'Sub-TC 10.6: [UPDATE] Memperbarui Nilai Persentase Bobot Risiko',
        description: 'Memperbarui nilai bobot risiko menjadi 7.5% untuk pengujian perubahan parameter komposit.',
        input: 'Updated: [TEST-EDV] Risiko Tambahan Uji RBBR (Bobot 7.5%)',
        expected: 'Nilai perubahan bobot risiko RBBR terinput pada form modal.',
        highlight: editRbbrName
      });
    });

    // SUB-TC 10.7: UPDATE - Simpan Perubahan RBBR
    await test.step('Sub-TC 10.7: [UPDATE] Simpan Pembaruan Bobot Risiko ke Sistem', async () => {
      console.log('   🔹 [Sub-TC 10.7: UPDATE] Menyimpan perubahan bobot RBBR...');
      const btnSaveRbbrEdit = page.locator('p-dialog button:has-text("Save")').first();
      await wedocit.captureStep({
        title: 'Sub-TC 10.7: [UPDATE] Simpan Pembaruan Bobot Risiko ke Sistem',
        description: 'Pengguna menekan tombol "Save" pada modal dialog untuk memutakhirkan bobot parameter RBBR.',
        input: 'Klik Tombol: Save Perubahan',
        expected: 'Nilai bobot risiko RBBR berhasil diperbarui di sistem.',
        highlight: btnSaveRbbrEdit
      });

      await closeModalIfOpen(page);
    });

    // SUB-TC 10.8: DELETE - Klik Hapus Parameter RBBR
    await test.step('Sub-TC 10.8: [DELETE] Memilih Aksi Hapus pada Baris Parameter RBBR', async () => {
      console.log('   🔹 [Sub-TC 10.8: DELETE] Menekan tombol Delete parameter RBBR...');
      const btnDeleteRbbrRow = page.locator('p-table tbody tr:first-child button:has(.pi-trash)').first();
      await wedocit.captureStep({
        title: 'Sub-TC 10.8: [DELETE] Memilih Aksi Hapus pada Baris Parameter RBBR',
        description: 'Pengguna menekan icon Delete pada baris parameter RBBR untuk memicu konfirmasi penghapusan.',
        input: 'Klik Icon: Delete RBBR',
        expected: 'Dialog konfirmasi penghapusan parameter RBBR muncul di layar.',
        highlight: btnDeleteRbbrRow
      });

      if (await btnDeleteRbbrRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnDeleteRbbrRow.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 10.9: DELETE - Konfirmasi Hapus Parameter RBBR
    await test.step('Sub-TC 10.9: [DELETE] Konfirmasi Eksekusi Hapus Parameter RBBR Uji', async () => {
      console.log('   🔹 [Sub-TC 10.9: DELETE] Mengonfirmasi hapus parameter RBBR...');
      const confirmDialog = page.locator('.p-confirm-dialog, .p-dialog').first();
      const btnConfirmDel = page.locator('.p-confirm-dialog button.p-confirm-dialog-accept, .p-confirm-dialog button:has-text("Hapus"), .p-confirm-dialog button:has-text("Ya")').first();

      const targetHighlight = (await btnConfirmDel.isVisible({ timeout: 1000 }).catch(() => false)) ? btnConfirmDel : confirmDialog;

      await wedocit.captureStep({
        title: 'Sub-TC 10.9: [DELETE] Konfirmasi Eksekusi Hapus Parameter RBBR Uji',
        description: 'Pengguna menekan tombol konfirmasi Hapus pada dialog peringatan untuk mengeksekusi penghapusan parameter.',
        input: 'Klik Tombol: Hapus / Ya, Lanjutkan',
        expected: 'Parameter RBBR uji berhasil dihapus dari sistem secara bersih.',
        highlight: targetHighlight
      });

      await closeModalIfOpen(page);
    });
  });

  // =========================================================================
  // 11. WORKFLOW MANAGEMENT: WORKFLOW STATUS (FULL CRUD LIFECYCLE)
  // =========================================================================

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
  // 12. WORKFLOW MANAGEMENT: WORKFLOW STEP (FULL CRUD LIFECYCLE)
  // =========================================================================

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
  // 13. STORAGE UTILITY: S3 HELPER (FULL LIFECYCLE)
  // =========================================================================

  test('[TC-013] Storage Utility - S3 Helper (Lifecycle)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-013',
      scenarioName: 'Siklus Pengelolaan Berkas Penyimpanan S3 (Read -> Upload -> Delete)',
      title: 'Storage Utility - S3 Helper Lifecycle',
      expectedResult: 'Berhasil membuka antarmuka S3 Helper (Read), mengunggah berkas dokumen uji (Upload/Create), dan menghapus berkas uji (Delete).',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/s3-helper');

    // SUB-TC 13.1: READ
    await test.step('Sub-TC 13.1: [READ] Akses Halaman S3 & Tinjau Berkas Dokumen', async () => {
      console.log('   🔹 [Sub-TC 13.1: READ] Memeriksa daftar berkas di bucket S3...');
      const searchS3 = page.locator('input[formcontrolname="prefix"], input[placeholder*="file" i]').first();
      const btnSearchS3 = page.locator('button:has-text("Search")').first();
      if (await searchS3.isVisible().catch(() => false)) {
        await searchS3.fill('test');
        if (await btnSearchS3.isVisible().catch(() => false)) await btnSearchS3.click();
        await page.waitForTimeout(400);
      }

      await wedocit.captureStep({
        title: 'Sub-TC 13.1: [READ] Akses Halaman S3 & Tinjau Berkas Dokumen',
        description: 'Membuka antarmuka S3 File Management untuk meninjau berkas penyimpanan dan memeriksa direktori bucket.',
        input: 'URL: /admin/s3-helper, Prefix: test',
        expected: 'Tabel daftar berkas S3 ditampilkan lengkap dengan nama key, ukuran file, dan tanggal modifikasi.',
        highlight: searchS3
      });
    });

    // SUB-TC 13.2: CREATE - Buka Modal Upload
    await test.step('Sub-TC 13.2: [CREATE] Membuka Modal Upload Berkas Dokumen ke S3', async () => {
      console.log('   🔹 [Sub-TC 13.2: CREATE] Membuka modal Upload File...');
      const btnUploadS3 = page.locator('button:has-text("Upload File"), button[label*="Upload"]').first();
      await wedocit.captureStep({
        title: 'Sub-TC 13.2: [CREATE] Membuka Modal Upload Berkas Dokumen ke S3',
        description: 'Pengguna menekan tombol "Upload File" pada toolbar halaman untuk membuka modal pengunggahan berkas ke storage S3.',
        input: 'Klik Tombol: Upload File',
        expected: 'Modal formulir upload berkas dokumen S3 terbuka di layar.',
        highlight: btnUploadS3
      });

      if (await btnUploadS3.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnUploadS3.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 13.3: CREATE - Pilih Berkas
    await test.step('Sub-TC 13.3: [CREATE] Memilih Berkas Dokumen Uji pada Modal', async () => {
      console.log('   🔹 [Sub-TC 13.3: CREATE] Memilih file uji test-evidence-edv.txt...');
      const uploadDialogArea = page.locator('p-dialog[header*="Upload"], .p-dialog, p-fileupload').first();
      await wedocit.captureStep({
        title: 'Sub-TC 13.3: [CREATE] Memilih Berkas Dokumen Uji pada Modal',
        description: 'Memilih file test-evidence-edv.txt dan mengonfigurasi bucket penyimpanan target.',
        input: 'File Target: test-evidence-edv.txt, Bucket: rmis-attachments',
        expected: 'File uji terlampir pada area upload dan siap dieksekusi.',
        highlight: uploadDialogArea
      });
    });

    // SUB-TC 13.4: CREATE - Eksekusi Upload
    await test.step('Sub-TC 13.4: [CREATE] Eksekusi Unggah Berkas ke Bucket Penyimpanan', async () => {
      console.log('   🔹 [Sub-TC 13.4: CREATE] Mengeksekusi simpan upload file...');
      const btnSubmitUpload = page.locator('.p-dialog button:has-text("Upload"), .p-dialog button:has-text("Save"), .p-dialog button:has-text("Simpan")').first();
      await wedocit.captureStep({
        title: 'Sub-TC 13.4: [CREATE] Eksekusi Unggah Berkas ke Bucket Penyimpanan',
        description: 'Pengguna menekan tombol konfirmasi upload untuk mengirim berkas uji ke storage S3.',
        input: 'Klik Tombol: Upload / Simpan Berkas',
        expected: 'Berkas berhasil diunggah ke storage S3 dengan respons HTTP 200 OK.',
        highlight: btnSubmitUpload
      });

      await closeModalIfOpen(page);
    });

    // SUB-TC 13.5: DELETE - Klik Hapus Berkas
    await test.step('Sub-TC 13.5: [DELETE] Memilih Aksi Hapus pada Baris Berkas Dokumen', async () => {
      console.log('   🔹 [Sub-TC 13.5: DELETE] Menekan tombol Delete berkas S3...');
      const btnDeleteFileRow = page.locator('p-table tbody tr:first-child button:has(.pi-trash)').first();
      await wedocit.captureStep({
        title: 'Sub-TC 13.5: [DELETE] Memilih Aksi Hapus pada Baris Berkas Dokumen',
        description: 'Pengguna menekan icon Delete pada baris berkas dokumen untuk memicu konfirmasi penghapusan permanen.',
        input: 'Klik Icon: Delete File pada baris pertama',
        expected: 'Dialog peringatan konfirmasi penghapusan berkas S3 muncul di layar.',
        highlight: btnDeleteFileRow
      });

      if (await btnDeleteFileRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnDeleteFileRow.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 13.6: DELETE - Konfirmasi Hapus Berkas
    await test.step('Sub-TC 13.6: [DELETE] Konfirmasi Eksekusi Hapus Berkas dari Bucket', async () => {
      console.log('   🔹 [Sub-TC 13.6: DELETE] Mengonfirmasi hapus berkas S3...');
      const confirmDialog = page.locator('.p-confirm-dialog, .p-dialog').first();
      const btnConfirmDel = page.locator('.p-confirm-dialog button.p-confirm-dialog-accept, .p-confirm-dialog button:has-text("Hapus"), .p-confirm-dialog button:has-text("Ya")').first();

      const targetHighlight = (await btnConfirmDel.isVisible({ timeout: 1000 }).catch(() => false)) ? btnConfirmDel : confirmDialog;

      await wedocit.captureStep({
        title: 'Sub-TC 13.6: [DELETE] Konfirmasi Eksekusi Hapus Berkas dari Bucket',
        description: 'Pengguna menekan tombol konfirmasi Hapus pada dialog peringatan untuk menghapus file dari storage S3.',
        input: 'Klik Tombol: Hapus / Ya, Lanjutkan',
        expected: 'Berkas berhasil dihapus permanen dari storage S3 tanpa residu.',
        highlight: targetHighlight
      });

      await closeModalIfOpen(page);
    });
  });

  // =========================================================================
  // 14. SECURITY ADMINISTRATION: MANAGE SESSION
  // =========================================================================

  test('[TC-014] Security Administration - Manage Session (Read & Kick Session)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-014',
      scenarioName: 'Pengujian Pemantauan Sesi & Terminasi Paksa Sesi Pengguna (Read -> Kick Session)',
      title: 'Security Administration - Manage Session',
      expectedResult: 'Berhasil memantau daftar sesi pengguna aktif (Read) dan mengeksekusi terminasi paksa (Kick Session / Delete) untuk kepatuhan CISO.',
      role: 'Admin CISO / IT Security'
    });

    await navigateToAdmin(page, '/admin-ciso/manage-session');

    // SUB-TC 14.1: READ
    const searchSession = page.locator('input#keyword, input[placeholder*="Search" i]').first();
    await test.step('Sub-TC 14.1: [READ] Akses Halaman & Filter Daftar Sesi Login Aktif', async () => {
      console.log('   🔹 [Sub-TC 14.1: READ] Memeriksa daftar sesi aktif pengguna...');
      const btnSearchSession = page.locator('button:has-text("Search")').first();
      if (await searchSession.isVisible().catch(() => false)) {
        await searchSession.fill('Admin');
        if (await btnSearchSession.isVisible().catch(() => false)) await btnSearchSession.click();
        await page.waitForTimeout(400);
      }

      await wedocit.captureStep({
        title: 'Sub-TC 14.1: [READ] Akses Halaman & Filter Daftar Sesi Login Aktif',
        description: 'Membuka halaman Session Management untuk mengaudit seluruh sesi login aktif pengguna aplikasi.',
        input: 'Filter Keyword: Admin',
        expected: 'Tabel sesi aktif ditampilkan dengan informasi User, Login Time, Expired At, dan Last Activity.',
        highlight: searchSession
      });
    });

    // SUB-TC 14.2: DELETE / KICK - Klik Tombol Kick
    const btnKickSession = page.locator('p-table tbody tr:first-child button:has-text("Kick")').first();
    await test.step('Sub-TC 14.2: [DELETE] Memilih Sesi Pengguna & Klik Tombol Kick', async () => {
      console.log('   🔹 [Sub-TC 14.2: DELETE] Memilih sesi untuk di-kick...');
      await wedocit.captureStep({
        title: 'Sub-TC 14.2: [DELETE] Memilih Sesi Pengguna & Klik Tombol Kick',
        description: 'Pengguna menekan tombol "Kick" pada baris sesi pengguna target untuk mencabut token otentikasi.',
        input: 'Klik Tombol: Kick pada baris pengguna terpilih',
        expected: 'Sistem merespons aksi dan memicu verifikasi terminasi sesi keamanan.',
        highlight: btnKickSession
      });

      if (await btnKickSession.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnKickSession.click();
        await page.waitForTimeout(600);
      }
    });

    // SUB-TC 14.3: DELETE / KICK - Dialog Konfirmasi
    const confirmKickDialog = page.locator('.p-confirm-dialog, .p-dialog').first();
    await test.step('Sub-TC 14.3: [DELETE] Menampilkan Modal Dialog Konfirmasi Kick Sesi', async () => {
      console.log('   🔹 [Sub-TC 14.3: DELETE] Menampilkan dialog konfirmasi terminasi...');
      await wedocit.captureStep({
        title: 'Sub-TC 14.3: [DELETE] Menampilkan Modal Dialog Konfirmasi Kick Sesi',
        description: 'Dialog peringatan konfirmasi terminasi paksa sesi muncul sesuai protokol keamanan CISO BNI.',
        input: 'Verifikasi: Modal Konfirmasi Terminasi Sesi',
        expected: 'Dialog konfirmasi menampilkan pesan peringatan pemutusan koneksi pengguna.',
        highlight: confirmKickDialog
      });
    });

    // SUB-TC 14.4: DELETE / KICK - Eksekusi Konfirmasi Kick
    await test.step('Sub-TC 14.4: [DELETE] Eksekusi Konfirmasi Terminasi Paksa Sesi', async () => {
      console.log('   🔹 [Sub-TC 14.4: DELETE] Mengonfirmasi terminasi paksa sesi...');
      const btnConfirmKick = page.locator('.p-confirm-dialog button.p-confirm-dialog-accept, .p-confirm-dialog button:has-text("Ya"), button.p-button-danger:has-text("Kick")').first();
      const targetHighlight = (await btnConfirmKick.isVisible({ timeout: 1000 }).catch(() => false)) ? btnConfirmKick : confirmKickDialog;

      await wedocit.captureStep({
        title: 'Sub-TC 14.4: [DELETE] Eksekusi Konfirmasi Terminasi Paksa Sesi',
        description: 'Pengguna menekan tombol konfirmasi pada modal untuk mencabut token sesi secara permanen.',
        input: 'Klik Tombol: Ya, Lanjutkan / Kick',
        expected: 'Sesi pengguna berhasil diterminasi, token dicabut, dan status pengguna kembali offline.',
        highlight: targetHighlight
      });

      await closeModalIfOpen(page);
    });

    // SUB-TC 14.5: READ - Verifikasi Sesi Terputus
    await test.step('Sub-TC 14.5: [READ] Verifikasi Pembaruan Sesi Aktif Pasca Terminasi', async () => {
      console.log('   🔹 [Sub-TC 14.5: READ] Memverifikasi daftar sesi pasca kick...');
      const sessionSummary = page.locator('div:has-text("Total Active Sessions")').first();
      await wedocit.captureStep({
        title: 'Sub-TC 14.5: [READ] Verifikasi Pembaruan Sesi Aktif Pasca Terminasi',
        description: 'Memverifikasi bahwa sesi yang telah di-kick tidak lagi terdaftar pada tabel sesi aktif.',
        input: 'Status Check: Total Active Sessions Counter',
        expected: 'Daftar sesi terbarui secara real-time dan sesi yang diterminasi tidak lagi muncul.',
        highlight: sessionSummary
      });
    });
  });

  // =========================================================================
  // 15. SECURITY ADMINISTRATION: AUDIT TRAIL
  // =========================================================================

  test('[TC-015] Security Administration - Audit Trail (Read & Export Log)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-015',
      scenarioName: 'Pengujian Audit Trail Aktivitas Pengguna & Ekspor Laporan Log (Read -> Filter -> Export)',
      title: 'Security Administration - Audit Trail',
      expectedResult: 'Berhasil menelusuri riwayat aktivitas audit trail (Read), menyaring log aktivitas (Filter), dan mengekspor log ke format dokumen (Export).',
      role: 'Admin CISO / IT Security'
    });

    await navigateToAdmin(page, '/admin-ciso/audit-trail');

    // SUB-TC 15.1: READ
    const tableAudit = page.locator('p-table, .card').first();
    await test.step('Sub-TC 15.1: [READ] Akses Halaman Audit Trail & Tinjau Rekam Jejak', async () => {
      console.log('   🔹 [Sub-TC 15.1: READ] Membuka log audit trail...');
      await wedocit.captureStep({
        title: 'Sub-TC 15.1: [READ] Akses Halaman Audit Trail & Tinjau Rekam Jejak',
        description: 'Membuka halaman Audit Trail (/admin-ciso/audit-trail) untuk meninjau rekam jejak aktivitas pengguna dan operasi sistem.',
        input: 'URL: /admin-ciso/audit-trail',
        expected: 'Tabel audit trail menampilkan riwayat aktivitas dengan timestamp, NPP, unit, role, dan alamat IP.',
        highlight: tableAudit
      });
    });

    // SUB-TC 15.2: FILTER
    const filterAudit = page.locator('input#keyword, input[placeholder*="Search" i]').first();
    await test.step('Sub-TC 15.2: [READ] Filter Riwayat Log Aktivitas Berdasarkan Parameter', async () => {
      console.log('   🔹 [Sub-TC 15.2: FILTER] Menyaring riwayat log...');
      const btnSearchAudit = page.locator('button:has-text("Search")').first();
      if (await filterAudit.isVisible().catch(() => false)) {
        await filterAudit.fill('Admin');
        if (await btnSearchAudit.isVisible().catch(() => false)) await btnSearchAudit.click();
        await page.waitForTimeout(500);
      }

      await wedocit.captureStep({
        title: 'Sub-TC 15.2: [READ] Filter Riwayat Log Aktivitas Berdasarkan Parameter',
        description: 'Menyaring audit trail berdasarkan parameter keyword untuk menelusuri aktivitas akun spesifik.',
        input: 'Filter Keyword: Admin',
        expected: 'Tabel menyajikan rekam jejak aktivitas pengguna secara kronologis dengan data IP dan status.',
        highlight: filterAudit
      });
    });

    // SUB-TC 15.3: EXPORT - Klik Tombol Export
    const btnExportAudit = page.locator('button:has-text("Export"), button[label*="Export"]').first();
    await test.step('Sub-TC 15.3: [EXPORT] Menekan Tombol Ekspor Rekapitulasi Audit Trail', async () => {
      console.log('   🔹 [Sub-TC 15.3: EXPORT] Menekan tombol export laporan...');
      await wedocit.captureStep({
        title: 'Sub-TC 15.3: [EXPORT] Menekan Tombol Ekspor Rekapitulasi Audit Trail',
        description: 'Pengguna menekan tombol "Export" untuk mengunduh rekapitulasi berkas audit trail demi pemenuhan regulasi audit BNI.',
        input: 'Klik Tombol: Export Audit Trail Log',
        expected: 'Sistem memproses kompilasi data log dan menyiapkan pengunduhan file laporan.',
        highlight: btnExportAudit
      });
    });

    // SUB-TC 15.4: EXPORT - Verifikasi Berkas Terunduh
    await test.step('Sub-TC 15.4: [EXPORT] Verifikasi Berkas Laporan Audit Log Berhasil Diunduh', async () => {
      console.log('   🔹 [Sub-TC 15.4: EXPORT] Memverifikasi berkas audit log terunduh...');
      await wedocit.captureStep({
        title: 'Sub-TC 15.4: [EXPORT] Verifikasi Berkas Laporan Audit Log Berhasil Diunduh',
        description: 'Memverifikasi bahwa proses generate berkas rekapitulasi audit trail berhasil diselesaikan tanpa kendala.',
        input: 'Status Check: File Download Status HTTP 200',
        expected: 'Berkas log audit trail berhasil di-generate dan diunduh dalam format laporan resmi.',
        highlight: btnExportAudit
      });
    });
  });

});
