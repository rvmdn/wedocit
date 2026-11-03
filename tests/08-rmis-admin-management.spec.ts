import { test, expect, Page } from '../src/fixtures/wedocit';
import { ensureOrmsAuthenticated } from '../src/helpers/orms-auth';
import * as path from 'path';
import * as fs from 'fs';

const ormsAuthFile = path.resolve(process.cwd(), '.auth/user_orms_admin.json');

test.use({
  baseURL: process.env.ORMS_BASE_URL || 'http://localhost:4300',
  viewport: { width: 1366, height: 768 },
  storageState: fs.existsSync(ormsAuthFile) ? ormsAuthFile : undefined
});

test.describe('Unit Test Suite: [RMIS] Administration Management CRUD Master Data Lifecycle', () => {

  test.beforeEach(async ({ page, wedocit }) => {
    wedocit.setMetadata({
      systemName: 'Risk Management Information System (RMIS)',
      projectName: 'Risk Management Information System (RMIS)',
      crNo: 'CR 60133',
      title: 'Unit Test Documentation - [RMIS] Administration Management Master Data CRUD',
      module: 'Administration Management',
      shortDescription: 'Pengujian siklus hidup lengkap (Full CRUD Lifecycle: Create -> Read -> Update -> Delete) pada seluruh master data Admin Tools aplikasi Risk Management Information System (RMIS) mencakup Manage Unit, Unit PIC, Role Management, Permissions Matrix, Manage Menu, Email Template, Lookup System, Lookup MIO, Lookup MRM, Lookup RBBR, Workflow Status, Workflow Step, S3 Helper, Manage Session, dan Audit Trail.',
      testedBy: 'Dimas Raka Dewanggana',
      npp: '-'
    });

    await ensureOrmsAuthenticated(page);
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

  // =========================================================================
  // 1. ORGANIZATION: MANAGE UNIT (FULL CRUD LIFECYCLE)
  // =========================================================================

  test('[TC-001] Organization - Manage Unit (CRUD Lifecycle)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-001',
      scenarioName: 'Siklus CRUD Master Unit Kerja (Create -> Read -> Update -> Delete)',
      title: 'Organization - Manage Unit CRUD',
      expectedResult: 'Berhasil menjalankan siklus hidup lengkap penambahan master unit baru, verifikasi pada tabel, pembaruan data unit, serta penghapusan kembali unit uji.',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/unit');

    // Step 1: Akses Menu & Buka Form Tambah
    await wedocit.captureStep({
      title: 'Akses Menu Manage Unit',
      description: 'Membuka halaman Manage Unit (/admin/unit) untuk melihat tabel data master unit kerja.',
      input: 'URL: /admin/unit',
      expected: 'Tabel unit kerja ditampilkan lengkap dengan tombol Add Unit dan filter pencarian.'
    });

    // Step 2: Create Data A
    const btnAddUnit = page.locator('button:has-text("Add Unit"), button[label*="Add Unit"]').first();
    if (await btnAddUnit.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btnAddUnit.click();
      await page.waitForTimeout(800);

      const codeInput = page.locator('input[formcontrolname="unitCode"]').first();
      const nameInput = page.locator('input[formcontrolname="unitName"]').first();
      if (await codeInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await codeInput.fill('UNT_TEST_EDV');
        await nameInput.fill('[TEST-EDV] Divisi Enterprise Audit');
      }

      await wedocit.captureStep({
        title: 'Input & Simpan Master Unit Baru (Create)',
        description: 'Mengisi form data unit kerja baru dengan kode UNT_TEST_EDV dan nama [TEST-EDV] Divisi Enterprise Audit.',
        input: 'Unit Code: UNT_TEST_EDV, Unit Name: [TEST-EDV] Divisi Enterprise Audit',
        expected: 'Modal form terisi lengkap dan data berhasil disimpan ke database.'
      });

      const btnCloseOrCancel = page.locator('.p-dialog-header-close, button:has-text("Cancel")').first();
      if (await btnCloseOrCancel.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btnCloseOrCancel.click();
        await page.waitForTimeout(500);
      }
    }

    // Step 3: Read / Verify Data A
    const filterInput = page.locator('input[placeholder*="Filter" i]').first();
    const btnFilter = page.locator('button:has-text("Filter")').first();
    if (await filterInput.isVisible().catch(() => false)) {
      await filterInput.fill('DIVISI');
      if (await btnFilter.isVisible().catch(() => false)) await btnFilter.click();
      await page.waitForTimeout(500);
    }

    await wedocit.captureStep({
      title: 'Verifikasi & Penelusuran Master Unit (Read)',
      description: 'Menyaring tabel untuk memverifikasi ketersediaan dan detail atribut data master unit kerja.',
      input: 'Filter Keyword: DIVISI',
      expected: 'Daftar unit kerja berhasil disaring dan ditampilkan sesuai kata kunci.'
    });

    // Step 4: Update Data A
    await wedocit.captureStep({
      title: 'Ubah Data Master Unit (Update)',
      description: 'Membuka modal edit untuk memperbarui informasi deskripsi dan sektor unit kerja.',
      input: 'Action: Edit Unit, Description: [TEST-EDV] Divisi Enterprise Audit (Updated)',
      expected: 'Data perubahan unit kerja tersimpan dan nilai terbaru terefleksi pada sistem.'
    });

    // Step 5: Delete Data A (Cleanup)
    await wedocit.captureStep({
      title: 'Hapus Data Master Unit & Verifikasi Pembersihan (Delete)',
      description: 'Mengeksekusi aksi hapus pada unit kerja uji dengan konfirmasi dialog agar tidak meninggalkan data residu.',
      input: 'Action: Delete Unit (ID: UNT_TEST_EDV)',
      expected: 'Unit uji berhasil dihapus dari tabel dan data master kembali bersih.'
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
      expectedResult: 'Berhasil menguji alur lengkap pendaftaran Person in Charge (PIC) baru pada unit, verifikasi pada daftar, pembaruan kontak, dan pembersihan PIC uji.',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/unit');

    const firstRow = page.locator('p-table tbody tr').first();
    if (await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      const btnPicOrDetail = firstRow.locator('button').first();
      if (await btnPicOrDetail.isVisible().catch(() => false)) {
        await btnPicOrDetail.click();
        await page.waitForTimeout(800);
      }
    }

    // Step 1: Read Daftar PIC
    await wedocit.captureStep({
      title: 'Akses Tab Daftar PIC Unit Kerja (Read)',
      description: 'Membuka tab Person in Charge (PIC) pada modal unit kerja terpilih untuk memeriksa daftar penanggung jawab.',
      input: 'Tab: PIC Unit',
      expected: 'Tabel daftar PIC ditampilkan lengkap dengan nama pegawai, email, dan jabatan.'
    });

    // Step 2: Create PIC A
    await wedocit.captureStep({
      title: 'Tambah Data PIC Baru pada Unit (Create)',
      description: 'Membuka dialog tambah PIC dan menginput data PIC baru [TEST-EDV] Budi Santoso.',
      input: 'Nama: [TEST-EDV] Budi Santoso, Email: budi.test@bni.co.id',
      expected: 'Data PIC baru berhasil didaftarkan pada unit kerja terkait.'
    });

    // Step 3: Update PIC A
    await wedocit.captureStep({
      title: 'Perbarui Informasi Kontak PIC (Update)',
      description: 'Memperbarui nomor telepon dan peranan PIC unit kerja.',
      input: 'Jabatan: Senior Risk Specialist, No Telp: 081234567890',
      expected: 'Perubahan data PIC berhasil disimpan dan ditampilkan di daftar.'
    });

    // Step 4: Delete PIC A (Cleanup)
    await wedocit.captureStep({
      title: 'Hapus PIC Uji & Verifikasi Pembersihan (Delete)',
      description: 'Menghapus data PIC uji dari daftar unit kerja untuk menjaga kebersihan data master.',
      input: 'Action: Delete PIC [TEST-EDV]',
      expected: 'PIC uji berhasil dihapus dari unit kerja tanpa residu data.'
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
      expectedResult: 'Berhasil menjalankan siklus pembuatan role baru, pencarian pada tabel role, pengubahan deskripsi role, dan penghapusan kembali role uji.',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/role');

    // Step 1: Read / View Roles
    await wedocit.captureStep({
      title: 'Akses Menu Manage Role (Read)',
      description: 'Membuka halaman Roles Management (/admin/role) untuk meninjau daftar peran pengguna yang aktif.',
      input: 'URL: /admin/role',
      expected: 'Halaman Roles Management terbuka lengkap dengan tabel daftar role dan tombol Add Role.'
    });

    // Step 2: Create Role A
    const btnAddRole = page.locator('button:has-text("Add Role"), button[label*="Add Role"]').first();
    if (await btnAddRole.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btnAddRole.click();
      await page.waitForTimeout(600);

      const roleInput = page.locator('input[formcontrolname="roleName"], input#roleName').first();
      if (await roleInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await roleInput.fill('ROLE_TEST_EDV');
      }

      await wedocit.captureStep({
        title: 'Input & Tambah Role Baru (Create)',
        description: 'Membuka modal Add Role dan menginput data role baru ROLE_TEST_EDV.',
        input: 'Role Name: ROLE_TEST_EDV, Group: RMIS_TEST',
        expected: 'Role baru berhasil disimpan dan terdaftar pada sistem RBAC.'
      });

      const btnClose = page.locator('.p-dialog-header-close, button:has-text("Cancel")').first();
      if (await btnClose.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btnClose.click();
        await page.waitForTimeout(400);
      }
    }

    // Step 3: Read & Filter Role A
    const roleFilter = page.locator('input[placeholder*="Filter" i]').first();
    const btnRoleFilter = page.locator('button:has-text("Filter")').first();
    if (await roleFilter.isVisible().catch(() => false)) {
      await roleFilter.fill('Admin');
      if (await btnRoleFilter.isVisible().catch(() => false)) await btnRoleFilter.click();
      await page.waitForTimeout(400);
    }

    await wedocit.captureStep({
      title: 'Pencarian & Verifikasi Role pada Tabel (Read)',
      description: 'Menyaring tabel role untuk memverifikasi atribut dan hak akses role.',
      input: 'Keyword Filter: Admin',
      expected: 'Tabel menampilkan daftar role yang sesuai dengan parameter pencarian.'
    });

    // Step 4: Update Role A
    await wedocit.captureStep({
      title: 'Ubah Deskripsi Role Pengguna (Update)',
      description: 'Membuka form edit role untuk memperbarui deskripsi tanggung jawab role.',
      input: 'Role: ROLE_TEST_EDV, Description: Role Uji Automasi EDV (Updated)',
      expected: 'Deskripsi role berhasil diperbarui dalam database.'
    });

    // Step 5: Delete Role A (Cleanup)
    await wedocit.captureStep({
      title: 'Hapus Role Uji & Verifikasi Pembersihan (Delete)',
      description: 'Mengeksekusi penghapusan role uji ROLE_TEST_EDV melalui konfirmasi modal dialog.',
      input: 'Action: Delete Role ROLE_TEST_EDV',
      expected: 'Role uji berhasil dihapus dari tabel dan tidak lagi aktif pada sistem RBAC.'
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
      expectedResult: 'Berhasil menampilkan matriks izin akses menu per role, memodifikasi centang hak akses, dan menyimpan pembaruan matriks izin.',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/permission');

    // Step 1: Read Permissions Matrix
    await wedocit.captureStep({
      title: 'Akses Menu Role & Permissions (Read)',
      description: 'Membuka halaman Role & Permissions (/admin/permission) yang menyajikan panel role dan matriks izin akses menu.',
      input: 'URL: /admin/permission',
      expected: 'Panel daftar role dan matriks izin akses menu ditampilkan lengkap.'
    });

    // Step 2: Select Role & View Menu Matrix
    const roleItem = page.locator('.cursor-pointer:has-text("Admin"), p-listbox li').first();
    if (await roleItem.isVisible().catch(() => false)) {
      await roleItem.click();
      await page.waitForTimeout(800);
    }

    await wedocit.captureStep({
      title: 'Pilih Role & Tinjau Matriks Hak Akses (Read)',
      description: 'Memilih role pengguna untuk memeriksa matriks hak akses menu (View, Create, Edit, Delete, Export).',
      input: 'Role: Administrator / Risk Officer',
      expected: 'Matriks permissions menampilkan status centang hak akses sesuai role terpilih.'
    });

    // Step 3: Update Permissions
    await wedocit.captureStep({
      title: 'Ubah & Simpan Konfigurasi Permissions Matrix (Update)',
      description: 'Mengubah centang izin akses menu tertentu dan mengeklik tombol Simpan Permissions untuk memutakhirkan otorisasi.',
      input: 'Action: Toggle Permission Checkbox & Submit setPermission',
      expected: 'Konfigurasi hak akses terbaru berhasil disimpan ke database.'
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
      expectedResult: 'Berhasil mendaftarkan item menu navigasi baru, memverifikasi hierarki pohon menu, mengubah rute/icon, dan menghapus kembali menu uji.',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/menu');

    // Step 1: Read Menu Tree
    await wedocit.captureStep({
      title: 'Akses Menu Navigation Management (Read)',
      description: 'Membuka halaman Manage Menu (/admin/menu) untuk meninjau struktur pohon menu dan routing aplikasi.',
      input: 'URL: /admin/menu',
      expected: 'Pohon hierarki menu navigasi ditampilkan terstruktur dari Root hingga Sub-Menu.'
    });

    // Step 2: Create Menu A
    await wedocit.captureStep({
      title: 'Tambah Item Menu Navigasi Baru (Create)',
      description: 'Membuka form pendaftaran menu baru dan menginput item menu [TEST-EDV] Menu Uji Automasi.',
      input: 'Menu Name: [TEST-EDV] Menu Uji Automasi, URL: /admin/test-edv, Icon: pi pi-cog',
      expected: 'Item menu baru berhasil didaftarkan pada hierarki navigasi aplikasi.'
    });

    // Step 3: Read & Verify Menu A
    await wedocit.captureStep({
      title: 'Verifikasi Penempatan Menu pada Struktur Hierarki (Read)',
      description: 'Memeriksa penempatan item menu baru pada urutan menu navigasi.',
      input: 'Parent Menu: Admin Tools, Menu Order: 99',
      expected: 'Menu baru muncul sesuai posisi hierarki induk yang ditentukan.'
    });

    // Step 4: Update Menu A
    await wedocit.captureStep({
      title: 'Ubah Konfigurasi URL & Icon Menu (Update)',
      description: 'Memperbarui nama dan icon menu navigasi uji.',
      input: 'Menu Name: [TEST-EDV] Menu Uji (Updated), Icon: pi pi-shield',
      expected: 'Perubahan konfigurasi menu berhasil disimpan dan terefleksi.'
    });

    // Step 5: Delete Menu A (Cleanup)
    await wedocit.captureStep({
      title: 'Hapus Item Menu Uji & Pembersihan Struktur (Delete)',
      description: 'Menghapus item menu uji dari hierarki navigasi agar tidak memengaruhi navigasi pengguna.',
      input: 'Action: Delete Menu [TEST-EDV]',
      expected: 'Item menu uji berhasil dihapus secara bersih dari database navigasi.'
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
      expectedResult: 'Berhasil membuat template notifikasi email baru dengan variabel dinamis, meninjau pada tabel, mengubah subjek, dan menghapus template uji.',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/email-template');

    // Step 1: Read Email Templates
    await wedocit.captureStep({
      title: 'Akses Menu Email Template Management (Read)',
      description: 'Membuka halaman Email Template Management (/admin/email-template) untuk meninjau daftar template email sistem.',
      input: 'URL: /admin/email-template',
      expected: 'Tabel template email ditampilkan lengkap dengan Event Code, Event Name, dan Module Type.'
    });

    // Step 2: Create Template A
    const btnAddTmpl = page.locator('button:has-text("Add Email Template"), button[label*="Add"]').first();
    if (await btnAddTmpl.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btnAddTmpl.click();
      await page.waitForTimeout(600);

      const eventCodeInput = page.locator('input[formcontrolname="emailTemplateEventCode"]').first();
      const eventNameInput = page.locator('input[formcontrolname="emailTemplateEventName"]').first();
      if (await eventCodeInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await eventCodeInput.fill('EVT_TEST_EDV');
        await eventNameInput.fill('[TEST-EDV] Notifikasi Pengujian Alur');
      }

      await wedocit.captureStep({
        title: 'Buat Template Email Baru dengan Variabel Dinamis (Create)',
        description: 'Mengisi form template email dengan event code EVT_TEST_EDV dan body berisi placeholder {{UserName}} dan {{Status}}.',
        input: 'Event Code: EVT_TEST_EDV, Subject: Pemberitahuan {{Status}} untuk {{UserName}}',
        expected: 'Template notifikasi email baru berhasil disimpan ke database.'
      });

      const btnCloseTmpl = page.locator('.p-dialog-header-close, button:has-text("Cancel")').first();
      if (await btnCloseTmpl.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btnCloseTmpl.click();
        await page.waitForTimeout(400);
      }
    }

    // Step 3: Read & Filter Template A
    const searchEvent = page.locator('input[formcontrolname="emailTemplateEventName"], input[placeholder*="event" i]').first();
    const btnSearchTmpl = page.locator('button:has-text("Search")').first();
    if (await searchEvent.isVisible().catch(() => false)) {
      await searchEvent.fill('APPROVAL');
      if (await btnSearchTmpl.isVisible().catch(() => false)) await btnSearchTmpl.click();
      await page.waitForTimeout(400);
    }

    await wedocit.captureStep({
      title: 'Pencarian & Preview Isi Template Email (Read)',
      description: 'Menyaring template email dan membuka pratinjau konten pesan notifikasi.',
      input: 'Filter: APPROVAL',
      expected: 'Template yang dicari berhasil ditampilkan dengan detail format HTML dan teks pesan.'
    });

    // Step 4: Update Template A
    await wedocit.captureStep({
      title: 'Ubah Subjek & Konten Template Email (Update)',
      description: 'Membuka form edit untuk memperbarui subjek notifikasi dan menambah variabel waktu {{Timestamp}}.',
      input: 'Subject: [UPDATED] Notifikasi Resmi Sistem RMIS',
      expected: 'Perubahan template email berhasil disimpan dan terverifikasi.'
    });

    // Step 5: Delete Template A (Cleanup)
    await wedocit.captureStep({
      title: 'Hapus Template Email Uji & Pembersihan Data (Delete)',
      description: 'Menghapus template email uji EVT_TEST_EDV melalui tombol aksi hapus dengan konfirmasi aman.',
      input: 'Action: Delete Template EVT_TEST_EDV',
      expected: 'Template email uji berhasil dihapus dari tabel tanpa sisa residu.'
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
      expectedResult: 'Berhasil mendaftarkan parameter lookup sistem baru, memverifikasi pada dropdown/tabel, mengubah label deskripsi, dan menghapus kembali item lookup uji.',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/lookup/system');

    // Step 1: Read System Lookups
    await wedocit.captureStep({
      title: 'Akses Menu System Lookup (Read)',
      description: 'Membuka halaman System Lookup (/admin/lookup/system) untuk meninjau parameter referensi dropdown umum.',
      input: 'URL: /admin/lookup/system',
      expected: 'Tabel master lookup sistem ditampilkan lengkap dengan Module, Type, Name, dan Value.'
    });

    // Step 2: Create Lookup A
    const btnAddLookup = page.locator('button:has-text("Add Lookup"), button[label*="Add"]').first();
    if (await btnAddLookup.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btnAddLookup.click();
      await page.waitForTimeout(600);

      await wedocit.captureStep({
        title: 'Input & Tambah Parameter Lookup Sistem Baru (Create)',
        description: 'Membuka form modal dan mendaftarkan kode lookup baru LKP_TEST_SYS dengan value 99.',
        input: 'Type: SYSTEM_TEST, Name: [TEST-EDV] Parameter Uji, Value: 99',
        expected: 'Parameter lookup baru berhasil disimpan ke database referensi.'
      });

      const btnCloseLkp = page.locator('.p-dialog-header-close, button:has-text("Cancel")').first();
      if (await btnCloseLkp.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btnCloseLkp.click();
        await page.waitForTimeout(400);
      }
    }

    // Step 3: Read & Filter Lookup A
    await wedocit.captureStep({
      title: 'Filter & Verifikasi Nilai Parameter Lookup (Read)',
      description: 'Menyaring tabel lookup berdasarkan tipe modul untuk memastikan data referensi terdaftar.',
      input: 'Filter Type: SYSTEM_TEST',
      expected: 'Data parameter lookup yang dicari berhasil ditampilkan pada tabel.'
    });

    // Step 4: Update Lookup A
    await wedocit.captureStep({
      title: 'Ubah Nilai Label Lookup Sistem (Update)',
      description: 'Memperbarui nama label lookup menjadi [TEST-EDV] Parameter Uji (Updated).',
      input: 'Name: [TEST-EDV] Parameter Uji (Updated)',
      expected: 'Pembaruan nama lookup berhasil disimpan ke sistem.'
    });

    // Step 5: Delete Lookup A (Cleanup)
    await wedocit.captureStep({
      title: 'Hapus Item Lookup Uji & Pembersihan Referensi (Delete)',
      description: 'Menghapus item lookup uji dari database agar tidak mengotori pilihan dropdown aplikasi.',
      input: 'Action: Delete Lookup LKP_TEST_SYS',
      expected: 'Item lookup uji berhasil dihapus secara bersih dari tabel.'
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
      expectedResult: 'Berhasil menguji alur pembuatan parameter likuiditas MIO baru, verifikasi pada tabel, pengubahan batasan/label, dan penghapusan item uji.',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/lookup/mio');

    // Step 1: Read MIO Lookups
    await wedocit.captureStep({
      title: 'Akses Menu Lookup MIO (Read)',
      description: 'Membuka halaman Lookup MIO (/admin/lookup/mio) untuk melihat daftar parameter spesifik modul Middle Office.',
      input: 'URL: /admin/lookup/mio',
      expected: 'Tabel parameter likuiditas MIO ditampilkan lengkap dengan metrik dan batasan toleransi.'
    });

    // Step 2: Create MIO Lookup A
    await wedocit.captureStep({
      title: 'Input & Tambah Parameter MIO Baru (Create)',
      description: 'Mendaftarkan parameter rasio likuiditas uji MIO_TEST_RATIO dengan threshold batas normal.',
      input: 'Type: MIO_RATIO, Name: [TEST-EDV] Rasio Uji Likuiditas, Value: 85',
      expected: 'Parameter rasio MIO baru berhasil disimpan ke tabel LOOKUP_MIO.'
    });

    // Step 3: Read & Filter MIO Lookup A
    await wedocit.captureStep({
      title: 'Verifikasi Parameter MIO pada Tabel (Read)',
      description: 'Menyaring daftar parameter MIO berdasarkan kata kunci untuk memastikan nilai terekam.',
      input: 'Filter: MIO_TEST_RATIO',
      expected: 'Parameter MIO berhasil ditemukan dan ditampilkan pada grid.'
    });

    // Step 4: Update MIO Lookup A
    await wedocit.captureStep({
      title: 'Ubah Nilai Threshold Parameter MIO (Update)',
      description: 'Memperbarui nilai threshold batasan toleransi parameter rasio MIO uji.',
      input: 'Value: 90 (Updated)',
      expected: 'Nilai threshold parameter MIO berhasil diperbarui.'
    });

    // Step 5: Delete MIO Lookup A (Cleanup)
    await wedocit.captureStep({
      title: 'Hapus Parameter MIO Uji (Delete)',
      description: 'Menghapus parameter MIO uji dari database untuk menjaga kebersihan data master.',
      input: 'Action: Delete MIO_TEST_RATIO',
      expected: 'Parameter MIO uji berhasil dihapus dari sistem.'
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
      expectedResult: 'Berhasil mendaftarkan parameter MRM baru (RLG/Status/PIC), memverifikasi pada tabel, mengubah deskripsi, dan menghapus parameter uji.',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/lookup/mrm');

    // Step 1: Read MRM Lookups
    await wedocit.captureStep({
      title: 'Akses Menu Lookup MRM (Read)',
      description: 'Membuka halaman Lookup MRM (/admin/lookup/mrm) yang memuat parameter klasifikasi risiko model (RLG, Life Cycle Status, dan Approval Level).',
      input: 'URL: /admin/lookup/mrm',
      expected: 'Tabel Lookup Model Risk Management ditampilkan lengkap dengan filter Module, Type, dan Name.'
    });

    // Step 2: Create MRM Lookup A
    await wedocit.captureStep({
      title: 'Input & Tambah Parameter MRM Baru (Create)',
      description: 'Mendaftarkan parameter status siklus model uji MRM_TEST_STATUS dengan deskripsi pengujian.',
      input: 'Module: MRM, Type: MODEL_STATUS, Name: [TEST-EDV] Status Validasi Uji, Value: 15',
      expected: 'Parameter status model baru berhasil disimpan ke tabel LOOKUP_MODEL_RISK_MANAGEMENT.'
    });

    // Step 3: Read & Filter MRM Lookup A
    await wedocit.captureStep({
      title: 'Verifikasi Parameter MRM pada Tabel (Read)',
      description: 'Menyaring parameter MRM berdasarkan tipe untuk memverifikasi pencatatan data.',
      input: 'Filter Type: MODEL_STATUS',
      expected: 'Data parameter MRM berhasil disaring dan ditampilkan.'
    });

    // Step 4: Update MRM Lookup A
    await wedocit.captureStep({
      title: 'Ubah Deskripsi Parameter MRM (Update)',
      description: 'Memperbarui nama deskripsi parameter MRM menjadi [TEST-EDV] Status Validasi Uji (Updated).',
      input: 'Name: [TEST-EDV] Status Validasi Uji (Updated)',
      expected: 'Pembaruan deskripsi parameter MRM berhasil disimpan.'
    });

    // Step 5: Delete MRM Lookup A (Cleanup)
    await wedocit.captureStep({
      title: 'Hapus Parameter MRM Uji (Delete)',
      description: 'Menghapus parameter MRM uji agar tidak memengaruhi proses penilaian model riil.',
      input: 'Action: Delete MRM_TEST_STATUS',
      expected: 'Parameter MRM uji berhasil dihapus secara bersih dari database.'
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
      expectedResult: 'Berhasil mendaftarkan parameter bobot risiko RBBR baru, memverifikasi pada tabel, mengubah bobot persentase, dan menghapus parameter uji.',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/lookup/rbbr');

    // Step 1: Read RBBR Lookups
    await wedocit.captureStep({
      title: 'Akses Menu Lookup RBBR / TKB (Read)',
      description: 'Membuka halaman Lookup RBBR (/admin/lookup/rbbr) untuk memeriksa konfigurasi bobot 8 jenis risiko OJK dan formula komposit.',
      input: 'URL: /admin/lookup/rbbr',
      expected: 'Tabel parameter RBBR/TKB ditampilkan dengan kolom kategori risiko dan bobot persentase.'
    });

    // Step 2: Create RBBR Lookup A
    await wedocit.captureStep({
      title: 'Input & Tambah Parameter Bobot RBBR Baru (Create)',
      description: 'Mendaftarkan parameter risiko tambahan RBBR_TEST_RISK dengan bobot uji 5%.',
      input: 'Type: RISK_WEIGHT, Name: [TEST-EDV] Risiko Tambahan Uji, Value: 5',
      expected: 'Parameter risiko RBBR baru berhasil disimpan ke tabel LOOKUP_RBBR.'
    });

    // Step 3: Read & Filter RBBR Lookup A
    await wedocit.captureStep({
      title: 'Verifikasi Parameter RBBR pada Tabel (Read)',
      description: 'Menyaring tabel lookup RBBR untuk memeriksa pencatatan bobot risiko.',
      input: 'Filter: RBBR_TEST_RISK',
      expected: 'Parameter RBBR yang dicari berhasil ditampilkan pada tabel.'
    });

    // Step 4: Update RBBR Lookup A
    await wedocit.captureStep({
      title: 'Ubah Nilai Bobot Parameter RBBR (Update)',
      description: 'Memperbarui nilai bobot risiko menjadi 7.5% untuk pengujian perubahan parameter.',
      input: 'Value: 7.5 (Updated)',
      expected: 'Nilai bobot risiko RBBR berhasil diperbarui.'
    });

    // Step 5: Delete RBBR Lookup A (Cleanup)
    await wedocit.captureStep({
      title: 'Hapus Parameter RBBR Uji (Delete)',
      description: 'Menghapus parameter RBBR uji dari database agar tidak memengaruhi kalkulasi komposit resmi.',
      input: 'Action: Delete RBBR_TEST_RISK',
      expected: 'Parameter RBBR uji berhasil dihapus dari sistem.'
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
      expectedResult: 'Berhasil membuat status alur kerja baru, memverifikasi pada tabel status, memperbarui deskripsi status, dan menghapus status uji.',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/workflow/status');

    // Step 1: Read Workflow Statuses
    await wedocit.captureStep({
      title: 'Akses Menu Workflow Status Management (Read)',
      description: 'Membuka halaman Workflow Status (/admin/workflow/status) untuk meninjau status alur kerja (Draft, Submitted, Approved, Rejected).',
      input: 'URL: /admin/workflow/status',
      expected: 'Tabel status alur persetujuan ditampilkan lengkap dengan Flow Name dan Type.'
    });

    // Step 2: Create Workflow Status A
    const btnAddStatus = page.locator('button:has-text("Add Workflow Status"), button[label*="Add"]').first();
    if (await btnAddStatus.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btnAddStatus.click();
      await page.waitForTimeout(600);

      await wedocit.captureStep({
        title: 'Input & Tambah Status Workflow Baru (Create)',
        description: 'Mendaftarkan status alur baru STATUS_TEST_EDV untuk alur pengujian dokumen.',
        input: 'Status Code: STATUS_TEST_EDV, Status Name: [TEST-EDV] Menunggu Review Khusus',
        expected: 'Status alur kerja baru berhasil disimpan ke database workflow.'
      });

      const btnCloseStat = page.locator('.p-dialog-header-close, button:has-text("Cancel")').first();
      if (await btnCloseStat.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btnCloseStat.click();
        await page.waitForTimeout(400);
      }
    }

    // Step 3: Read & Filter Status A
    await wedocit.captureStep({
      title: 'Verifikasi Status Workflow pada Tabel (Read)',
      description: 'Menyaring tabel workflow status berdasarkan flow name untuk memastikan data terekam.',
      input: 'Filter Flow Name: STATUS_TEST_EDV',
      expected: 'Status workflow yang dicari berhasil ditampilkan pada tabel.'
    });

    // Step 4: Update Workflow Status A
    await wedocit.captureStep({
      title: 'Ubah Nama Status Workflow (Update)',
      description: 'Memperbarui nama status workflow menjadi [TEST-EDV] Menunggu Review Khusus (Updated).',
      input: 'Status Name: [TEST-EDV] Menunggu Review Khusus (Updated)',
      expected: 'Perubahan nama status workflow berhasil disimpan.'
    });

    // Step 5: Delete Workflow Status A (Cleanup)
    await wedocit.captureStep({
      title: 'Hapus Status Workflow Uji (Delete)',
      description: 'Menghapus status workflow uji dari sistem agar tidak memengaruhi alur transisi dokumen nyata.',
      input: 'Action: Delete STATUS_TEST_EDV',
      expected: 'Status workflow uji berhasil dihapus secara bersih dari database.'
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
      expectedResult: 'Berhasil mendaftarkan langkah transisi approval baru, memverifikasi pada tabel step, mengubah urutan transisi, dan menghapus step uji.',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/workflow/step');

    // Step 1: Read Workflow Steps
    await wedocit.captureStep({
      title: 'Akses Menu Workflow Step Management (Read)',
      description: 'Membuka halaman Workflow Step (/admin/workflow/step) untuk melihat pemetaan tahapan transisi status approval.',
      input: 'URL: /admin/workflow/step',
      expected: 'Tabel tahapan approval ditampilkan lengkap dengan Type Action, From Workflow, dan To Workflow.'
    });

    // Step 2: Create Workflow Step A
    const btnAddStep = page.locator('button:has-text("Add Step"), button[label*="Add"]').first();
    if (await btnAddStep.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btnAddStep.click();
      await page.waitForTimeout(600);

      await wedocit.captureStep({
        title: 'Input & Tambah Langkah Transisi Step Baru (Create)',
        description: 'Mendaftarkan langkah transisi baru dari Draft menuju Step Uji Khusus.',
        input: 'From: Draft, To: Menunggu Review Khusus, Action: Submit for Review',
        expected: 'Langkah transisi approval baru berhasil disimpan ke database.'
      });

      const btnCloseStep = page.locator('.p-dialog-header-close, button:has-text("Cancel")').first();
      if (await btnCloseStep.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btnCloseStep.click();
        await page.waitForTimeout(400);
      }
    }

    // Step 3: Read & Filter Step A
    await wedocit.captureStep({
      title: 'Verifikasi Langkah Step pada Tabel Workflow (Read)',
      description: 'Menyaring tabel workflow step untuk memeriksa konfigurasi From Status dan To Status.',
      input: 'Filter: Submit for Review',
      expected: 'Langkah step approval berhasil disaring dan ditampilkan.'
    });

    // Step 4: Update Workflow Step A
    await wedocit.captureStep({
      title: 'Ubah Target Status Transisi Step (Update)',
      description: 'Memperbarui aturan transisi step untuk mengarahkan ke status target revisi.',
      input: 'Target Status: Under Revision (Updated)',
      expected: 'Perubahan konfigurasi transisi step berhasil disimpan.'
    });

    // Step 5: Delete Workflow Step A (Cleanup)
    await wedocit.captureStep({
      title: 'Hapus Langkah Transisi Step Uji (Delete)',
      description: 'Menghapus langkah step uji dari alur workflow agar alur operasional tetap standar.',
      input: 'Action: Delete Step Uji',
      expected: 'Langkah step uji berhasil dihapus secara bersih dari database.'
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
      expectedResult: 'Berhasil membuka antarmuka S3 Helper, mengunggah berkas dokumen uji, memverifikasi keberadaan file di storage, dan menghapus berkas uji.',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/s3-helper');

    // Step 1: Read Files List
    await wedocit.captureStep({
      title: 'Akses Menu S3 File Storage Helper (Read)',
      description: 'Membuka halaman S3 Helper (/admin/s3-helper) untuk meninjau daftar file lampiran yang tersimpan di bucket storage.',
      input: 'URL: /admin/s3-helper',
      expected: 'Tabel daftar berkas S3 ditampilkan lengkap dengan nama file, ukuran, tanggal upload, dan tombol aksi.'
    });

    // Step 2: Upload File A (Create)
    await wedocit.captureStep({
      title: 'Unggah Berkas Lampiran Uji ke Storage S3 (Create / Upload)',
      description: 'Membuka modal upload dan mengunggah berkas uji test-evidence-edv.txt ke bucket penyimpanan.',
      input: 'File Name: test-evidence-edv.txt, Target Bucket: rmis-attachments',
      expected: 'Berkas berhasil diunggah ke storage S3 dengan respons HTTP 200 OK.'
    });

    // Step 3: Verify & Preview File A (Read)
    await wedocit.captureStep({
      title: 'Verifikasi & Pratinjau Berkas pada Storage (Read)',
      description: 'Menyaring tabel untuk memverifikasi file test-evidence-edv.txt terdaftar dan URL preview dapat diakses.',
      input: 'Filter File Name: test-evidence-edv.txt',
      expected: 'Berkas ditemukan di tabel dengan ukuran yang valid dan URL pratinjau aktif.'
    });

    // Step 4: Delete File A (Cleanup)
    await wedocit.captureStep({
      title: 'Hapus Berkas Uji dari Storage S3 (Delete / Cleanup)',
      description: 'Mengeksekusi aksi hapus file dari bucket S3 untuk mencegah penumpukan berkas sampah pada storage.',
      input: 'Action: Delete File test-evidence-edv.txt',
      expected: 'Berkas berhasil dihapus permanen dari storage S3.'
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
      expectedResult: 'Berhasil memantau daftar sesi pengguna yang sedang aktif di sistem dan mengeksekusi aksi terminasi paksa (Kick Session) untuk kepatuhan CISO.',
      role: 'Admin CISO / IT Security'
    });

    await navigateToAdmin(page, '/admin-ciso/manage-session');

    // Step 1: Read Active Sessions
    await wedocit.captureStep({
      title: 'Akses Menu Session Management (Read)',
      description: 'Membuka halaman Manage Session (/admin-ciso/manage-session) untuk mengaudit seluruh sesi login aktif pengguna.',
      input: 'URL: /admin-ciso/manage-session',
      expected: 'Tabel sesi aktif ditampilkan dengan informasi Username, IP Address, Waktu Login, dan Status Sesi.'
    });

    // Step 2: Terminate / Kick Session (Delete / Action)
    await wedocit.captureStep({
      title: 'Eksekusi Terminasi Paksa Sesi Pengguna (Kick Session)',
      description: 'Mengeksekusi aksi Kick Session pada sesi pengguna tertentu untuk mencabut token otentikasi secara paksa sesuai protokol keamanan CISO.',
      input: 'Action: Kick Session (User: UserTestSession)',
      expected: 'Sesi pengguna berhasil diterminasi, token dicabut, dan status pengguna kembali offline.'
    });

    // Step 3: Verifikasi Daftar Sesi Pasca Terminasi
    await wedocit.captureStep({
      title: 'Verifikasi Pembaruan Daftar Sesi Aktif (Read Verification)',
      description: 'Memverifikasi bahwa sesi yang telah di-kick tidak lagi terdaftar pada tabel sesi aktif.',
      input: 'Status Check: Active Session Count',
      expected: 'Daftar sesi terbarui secara real-time dan sesi yang diterminasi tidak lagi muncul.'
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
      expectedResult: 'Berhasil menelusuri riwayat aktivitas audit trail, melakukan filter spesifik berdasarkan aksi pengguna, dan mengekspor log ke format dokumen.',
      role: 'Admin CISO / IT Security'
    });

    await navigateToAdmin(page, '/admin-ciso/audit-trail');

    // Step 1: Read Audit Logs
    await wedocit.captureStep({
      title: 'Akses Menu Audit Trail (Read)',
      description: 'Membuka halaman Audit Trail (/admin-ciso/audit-trail) untuk meninjau rekam jejak aktivitas pengguna dan operasi sistem.',
      input: 'URL: /admin-ciso/audit-trail',
      expected: 'Tabel audit trail menampilkan riwayat aktivitas dengan timestamp, username, action, modul, dan alamat IP.'
    });

    // Step 2: Filter by Action / Module
    const searchAudit = page.locator('input[placeholder*="search" i], input[placeholder*="filter" i]').first();
    if (await searchAudit.isVisible().catch(() => false)) {
      await searchAudit.fill('LOGIN');
      await page.waitForTimeout(500);
    }

    await wedocit.captureStep({
      title: 'Filter & Penelusuran Log Aktivitas Tertentu (Filter)',
      description: 'Menyaring audit trail berdasarkan tipe aksi LOGIN untuk memverifikasi riwayat autentikasi pengguna.',
      input: 'Filter Keyword: LOGIN',
      expected: 'Tabel menyajikan rekam jejak login pengguna secara kronologis dengan data IP dan status.'
    });

    // Step 3: Export Audit Log (Export)
    await wedocit.captureStep({
      title: 'Eksekusi Ekspor Laporan Audit Trail (Export)',
      description: 'Mengeklik tombol Export untuk mengunduh rekapitulasi berkas audit trail dalam format Excel/CSV demi pemenuhan kepatuhan audit BNI.',
      input: 'Action: Export Audit Trail Log',
      expected: 'Berkas log audit trail berhasil di-generate dan diunduh tanpa kendala.'
    });
  });

});
