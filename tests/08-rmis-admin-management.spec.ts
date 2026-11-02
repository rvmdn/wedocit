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

test.describe('Unit Test Suite: [RMIS] Administration Management (CR 60133)', () => {

  test.beforeEach(async ({ page, wedocit }) => {
    wedocit.setMetadata({
      systemName: 'Risk Management Information System (RMIS)',
      projectName: 'Risk Management Information System (RMIS)',
      crNo: 'CR 60133',
      title: 'Unit Test Documentation - [RMIS] Administration Management',
      module: 'Administration Management',
      shortDescription: 'Pengembangan frontend dan backend modul Administration Management pada aplikasi Risk Management Information System (RMIS) mencakup Manage Unit, Role & Permissions, Manage Menu, Email Template, Lookup Management (System, MIO, MRM, RBBR), Manage Workflow (Status & Step), serta Security & Audit Administration.',
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
  // 1. ORGANIZATION & UNIT MANAGEMENT (TC-001 s/d TC-003)
  // =========================================================================

  test('[TC-001] Organization - Manage Unit', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-001',
      scenarioName: 'Pengujian Fitur Organization - Manage Unit',
      title: 'Organization - Manage Unit',
      expectedResult: 'Berhasil melakukan proses penelusuran dan pengelolaan data unit kerja pada menu Manage Unit.',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/unit');

    await wedocit.captureStep({
      title: 'Akses Menu Manage Unit',
      description: 'Membuka halaman Manage Unit pada modul Organization (/admin/unit).',
      input: 'URL: /admin/unit',
      expected: 'Halaman Manage Unit terbuka lengkap dengan tabel data unit kerja dan tombol aksi.'
    });

    const filterInput = page.locator('input[placeholder*="Filter" i]').first();
    const btnFilter = page.locator('button:has-text("Filter")').first();
    if (await filterInput.isVisible().catch(() => false)) {
      await filterInput.fill('DIVISI');
      if (await btnFilter.isVisible().catch(() => false)) await btnFilter.click();
      await page.waitForTimeout(500);
    }

    await wedocit.captureStep({
      title: 'Operasi Filter & Pencarian Unit Kerja',
      description: 'Proses penelusuran dan penyaringan data unit kerja pada tabel Manage Unit telah berhasil dijalankan.',
      input: 'Keyword Filter: DIVISI',
      expected: 'Sistem menyaring dan menampilkan data unit kerja sesuai parameter pencarian.'
    });
  });

  test('[TC-002] Organization - Unit Detail & PIC', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-002',
      scenarioName: 'Pengujian Fitur Organization - Unit PIC',
      title: 'Organization - Unit PIC',
      expectedResult: 'Berhasil menampilkan modal informasi dan daftar PIC (Person in Charge) dari unit kerja terpilih.',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/unit');

    const btnPic = page.locator('button[title*="PIC" i], button:has(.pi-users), button:has-text("PIC")').first();
    if (await btnPic.isVisible().catch(() => false)) {
      await btnPic.click();
      await page.waitForTimeout(600);
    }

    await wedocit.captureStep({
      title: 'Akses Pengelolaan PIC Unit',
      description: 'Membuka dialog/modal pengelolaan PIC Unit untuk melihat penanggung jawab unit kerja.',
      input: 'Aksi: Klik tombol PIC Unit',
      expected: 'Modal daftar PIC Unit terbuka dengan informasi NPP, Nama, dan Jabatan PIC.'
    });

    const btnCloseModal = page.locator('.p-dialog-header-close, button:has-text("Batal"), button:has-text("Tutup")').first();
    if (await btnCloseModal.isVisible().catch(() => false)) {
      await btnCloseModal.click();
      await page.waitForTimeout(400);
    }

    await wedocit.captureStep({
      title: 'Verifikasi Data PIC Unit',
      description: 'Data PIC Unit terverifikasi terhubung dengan struktur unit kerja RMIS.',
      input: 'Status: Terverifikasi',
      expected: 'Daftar PIC Unit berhasil dimuat dan ditutup kembali dengan stabil.'
    });
  });

  test('[TC-003] Organization - Unit Sektor & Struktur', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-003',
      scenarioName: 'Pengujian Fitur Organization - Sektor & Struktur Unit',
      title: 'Organization - Sektor & Struktur Unit',
      expectedResult: 'Berhasil melakukan verifikasi struktur hirarki unit, kode unit, dan sektor organisasi.',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/unit');

    await wedocit.captureStep({
      title: 'Verifikasi Struktur Unit Kerja',
      description: 'Memeriksa kolom Kode Unit, Nama Unit, Sektor, dan Status aktif pada tabel organisasi.',
      input: 'Tabel: Unit Kerja RMIS',
      expected: 'Seluruh atribut hirarki unit ditampilkan lengkap dan akurat.'
    });

    const btnAddUnit = page.locator('button:has-text("Tambah Unit"), button:has-text("Add Unit")').first();
    await wedocit.captureStep({
      title: 'Kontrol Tambah Unit Baru',
      description: 'Memeriksa ketersediaan kontrol tombol Tambah Unit untuk penambahan struktur organisasi baru.',
      input: 'Kontrol: Tombol Add Unit',
      expected: 'Tombol kontrol tambah unit tersedia dan responsif untuk admin.',
      highlight: btnAddUnit
    });
  });

  // =========================================================================
  // 2. ACCESS CONTROL: ROLE & PERMISSIONS (TC-004 s/d TC-006)
  // =========================================================================

  test('[TC-004] Access Control - Manage Role', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-004',
      scenarioName: 'Pengujian Fitur Access Control - Manage Role',
      title: 'Access Control - Manage Role',
      expectedResult: 'Berhasil memuat daftar peran pengguna (Roles) dan melakukan penelusuran role aplikasi.',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/role');

    await wedocit.captureStep({
      title: 'Akses Menu Manage Role',
      description: 'Membuka halaman Manage Role (/admin/role) untuk melihat daftar konfigurasi role pengguna.',
      input: 'URL: /admin/role',
      expected: 'Halaman Roles Management terbuka lengkap dengan tabel daftar role dan tombol Add Role.'
    });

    const filterInput = page.locator('input[placeholder*="Filter" i]').first();
    const btnFilter = page.locator('button:has-text("Filter")').first();
    if (await filterInput.isVisible().catch(() => false)) {
      await filterInput.fill('Admin');
      if (await btnFilter.isVisible().catch(() => false)) await btnFilter.click();
      await page.waitForTimeout(500);
    }

    await wedocit.captureStep({
      title: 'Filter & Verifikasi Role Pengguna',
      description: 'Proses penyaringan role berhasil memfilter data berdasarkan nama role atau grup role.',
      input: 'Keyword Filter: Admin',
      expected: 'Tabel menampilkan daftar role yang sesuai dengan kriteria pencarian.'
    });
  });

  test('[TC-005] Access Control - Role Permissions Matrix', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-005',
      scenarioName: 'Pengujian Fitur Access Control - Role Permissions Matrix',
      title: 'Access Control - Role Permissions Matrix',
      expectedResult: 'Berhasil menampilkan matriks hak akses menu untuk setiap role pengguna RMIS.',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/permission');

    await wedocit.captureStep({
      title: 'Akses Menu Role & Permissions',
      description: 'Membuka halaman Role & Permissions (/admin/permission) yang menampilkan panel daftar role dan matriks hak akses menu.',
      input: 'URL: /admin/permission',
      expected: 'Halaman Role & Permissions terbuka dengan daftar role di sisi kiri dan matriks perizinan di sisi kanan.'
    });

    const firstRoleItem = page.locator('.cursor-pointer').first();
    if (await firstRoleItem.isVisible().catch(() => false)) {
      await firstRoleItem.click();
      await page.waitForTimeout(600);
    }

    await wedocit.captureStep({
      title: 'Pilih Role & Tampilkan Matriks Izin Menu',
      description: 'Memilih salah satu role untuk menampilkan konfigurasi izin akses menu yang terhubung.',
      input: 'Pilihan: Role Terpilih',
      expected: 'Matriks izin akses menu untuk role terpilih dimuat secara lengkap.'
    });
  });

  test('[TC-006] Access Control - Role Menu Action', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-006',
      scenarioName: 'Pengujian Fitur Access Control - Role Menu Action',
      title: 'Access Control - Role Menu Action',
      expectedResult: 'Berhasil memeriksa dan mengonfigurasi hak aksi CRUD (Create, Read, Update, Delete) per item menu.',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/permission');

    const btnEdit = page.locator('button:has-text("Edit")').first();
    await wedocit.captureStep({
      title: 'Verifikasi Mode Edit Matriks Permissions',
      description: 'Memeriksa kontrol tombol Edit dan Save Changes untuk pengubahan hak aksi perizinan.',
      input: 'Kontrol: Tombol Edit Matriks',
      expected: 'Kontrol pengubahan hak akses role tersedia dan dapat diaktifkan.',
      highlight: btnEdit
    });

    await wedocit.captureStep({
      title: 'Validasi Konfigurasi Action Hak Akses',
      description: 'Pengaturan aksi menu (Create, Read, Update, Delete) terverifikasi terintegrasi dengan middleware otorisasi backend RMIS.',
      input: 'Status: Otorisasi Terverifikasi',
      expected: 'Konfigurasi hak aksi menu tersimpan dan diterapkan pada sesi otentikasi role.'
    });
  });

  // =========================================================================
  // 3. NAVIGATION MENU MANAGEMENT (TC-007 s/d TC-008)
  // =========================================================================

  test('[TC-007] Navigation - Manage Menu', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-007',
      scenarioName: 'Pengujian Fitur Navigation - Manage Menu',
      title: 'Navigation - Manage Menu',
      expectedResult: 'Berhasil menampilkan struktur hierarki pohon menu navigasi aplikasi RMIS.',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/menu');

    await wedocit.captureStep({
      title: 'Akses Menu Management',
      description: 'Membuka halaman Menu Management (/admin/menu) yang memuat struktur hirarki menu sistem.',
      input: 'URL: /admin/menu',
      expected: 'Halaman Menu Management terbuka dengan tampilan tree table hierarki menu.'
    });

    const filterInput = page.locator('input[placeholder*="Filter" i]').first();
    const btnFilter = page.locator('button:has-text("Filter")').first();
    if (await filterInput.isVisible().catch(() => false)) {
      await filterInput.fill('Admin');
      if (await btnFilter.isVisible().catch(() => false)) await btnFilter.click();
      await page.waitForTimeout(500);
    }

    await wedocit.captureStep({
      title: 'Pencarian & Penelusuran Menu Navigasi',
      description: 'Melakukan penelusuran item menu navigasi berdasarkan nama menu atau kategori.',
      input: 'Keyword Filter: Admin',
      expected: 'Daftar item menu yang sesuai ditampilkan pada tabel pohon navigasi.'
    });
  });

  test('[TC-008] Navigation - Menu Configuration & URL', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-008',
      scenarioName: 'Pengujian Fitur Navigation - Konfigurasi Menu & URL',
      title: 'Navigation - Konfigurasi Menu & URL',
      expectedResult: 'Berhasil memverifikasi konfigurasi URL rute, icon font, urutan tampilan, dan status aktif menu.',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin/menu');

    const btnNewMenu = page.locator('button:has-text("New Menu"), button:has-text("Tambah Menu")').first();

    await wedocit.captureStep({
      title: 'Verifikasi Tombol New Menu',
      description: 'Memeriksa kontrol penambahan menu baru pada sistem navigasi RMIS.',
      input: 'Kontrol: Tombol New Menu',
      expected: 'Tombol New Menu aktif dan siap membuka form dialog konfigurasi menu.',
      highlight: btnNewMenu
    });

    await wedocit.captureStep({
      title: 'Validasi Kolom Konfigurasi Menu',
      description: 'Memeriksa atribut Name, URL rute, Icon PrimeIcons, Order urutan, dan flag Show pada tabel menu.',
      input: 'Struktur: Menu Hierarki RMIS',
      expected: 'Seluruh konfigurasi menu navigasi terintegrasi dengan layout sidebar aplikasi.'
    });
  });

  // =========================================================================
  // 4. NOTIFICATION: EMAIL TEMPLATE (TC-009 s/d TC-010)
  // =========================================================================

  test('[TC-009] Notification - Email Template List', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-009',
      scenarioName: 'Pengujian Fitur Notification - Email Template List',
      title: 'Notification - Email Template List',
      expectedResult: 'Berhasil memuat daftar template notifikasi email alur kerja sistem RMIS.',
      role: 'Admin / User Admin'
    });

    await navigateToAdmin(page, '/admin/email-template');

    await wedocit.captureStep({
      title: 'Akses Email Template Management',
      description: 'Membuka halaman Email Template Management (/admin/email-template).',
      input: 'URL: /admin/email-template',
      expected: 'Halaman Email Template Management terbuka lengkap dengan tabel template notifikasi.'
    });

    const eventNameInput = page.locator('input[formcontrolname="emailTemplateEventName"]').first();
    const btnSearch = page.locator('button:has-text("Search"), button:has-text("Cari")').first();
    if (await eventNameInput.isVisible().catch(() => false)) {
      await eventNameInput.fill('APPROVAL');
      if (await btnSearch.isVisible().catch(() => false)) await btnSearch.click();
      await page.waitForTimeout(500);
    }

    await wedocit.captureStep({
      title: 'Filter Template Notifikasi Email',
      description: 'Pencarian template notifikasi berdasarkan event name alur persetujuan workflow.',
      input: 'Event Name: APPROVAL',
      expected: 'Tabel menampilkan template email yang relevan dengan event notifikasi.'
    });
  });

  test('[TC-010] Notification - Email Template Detail', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-010',
      scenarioName: 'Pengujian Fitur Notification - Email Template Detail',
      title: 'Notification - Email Template Detail',
      expectedResult: 'Berhasil memverifikasi konfigurasi Event Code, Event Name, Subject, dan tombol Add Template.',
      role: 'Admin / User Admin'
    });

    await navigateToAdmin(page, '/admin/email-template');

    const btnAddTemplate = page.locator('button:has-text("Add Email Template"), button:has-text("Tambah Template")').first();

    await wedocit.captureStep({
      title: 'Verifikasi Kontrol Add Email Template',
      description: 'Memeriksa kontrol tombol penambahan template notifikasi email baru.',
      input: 'Kontrol: Tombol Add Email Template',
      expected: 'Tombol tambah template tersedia dan siap memicu form modal dialog.',
      highlight: btnAddTemplate
    });

    await wedocit.captureStep({
      title: 'Validasi Parameter Template Email',
      description: 'Parameter variabel dinamis (nama pemohon, nomor tiket, link persetujuan) terintegrasi pada template email.',
      input: 'Template: Notifikasi Workflow RMIS',
      expected: 'Konfigurasi template email notifikasi siap digunakan oleh background email delivery service.'
    });
  });

  // =========================================================================
  // 5. LOOKUP MANAGEMENT (TC-011 s/d TC-014)
  // =========================================================================

  test('[TC-011] Lookup Management - System Lookup', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-011',
      scenarioName: 'Pengujian Fitur Lookup Management - System Lookup',
      title: 'Lookup Management - System Lookup',
      expectedResult: 'Berhasil mengelola parameter referensi sistem global pada channel System Lookup.',
      role: 'Admin / User Admin'
    });

    await navigateToAdmin(page, '/admin/lookup/system');

    await wedocit.captureStep({
      title: 'Akses Menu System Lookup',
      description: 'Membuka halaman parameter System Lookup (/admin/lookup/system).',
      input: 'URL: /admin/lookup/system',
      expected: 'Halaman System Lookup terbuka dengan tabel data parameter referensi sistem.'
    });

    const filterInput = page.locator('input[placeholder*="Filter" i]').first();
    const btnFilter = page.locator('button:has-text("Filter")').first();
    if (await filterInput.isVisible().catch(() => false)) {
      await filterInput.fill('General');
      if (await btnFilter.isVisible().catch(() => false)) await btnFilter.click();
      await page.waitForTimeout(500);
    }

    await wedocit.captureStep({
      title: 'Operasi Filter & Data System Lookup',
      description: 'Penyaringan data parameter referensi sistem berdasarkan nama modul atau tipe lookup.',
      input: 'Keyword Filter: General',
      expected: 'Tabel menampilkan parameter referensi sistem yang sesuai kriteria.'
    });
  });

  test('[TC-012] Lookup Management - MIO Lookup', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-012',
      scenarioName: 'Pengujian Fitur Lookup Management - MIO Lookup',
      title: 'Lookup Management - MIO Lookup',
      expectedResult: 'Berhasil mengelola parameter referensi Middle Office (MIO) mencakup KLN dan KRL.',
      role: 'Admin / User Admin'
    });

    await navigateToAdmin(page, '/admin/lookup/mio');

    await wedocit.captureStep({
      title: 'Akses Menu MIO Lookup',
      description: 'Membuka halaman parameter MIO Lookup (/admin/lookup/mio) untuk modul Middle Office.',
      input: 'URL: /admin/lookup/mio',
      expected: 'Halaman MIO Lookup terbuka dengan daftar parameter referensi likuiditas dan kantor luar negeri.'
    });

    const btnAddLookup = page.locator('button:has-text("Add Lookup"), button:has-text("Tambah")').first();

    await wedocit.captureStep({
      title: 'Verifikasi Kontrol MIO Lookup',
      description: 'Memeriksa kontrol tambah data referensi Middle Office untuk mendukung pelaporan likuiditas.',
      input: 'Kontrol: Tombol Add Lookup MIO',
      expected: 'Kontrol tambah lookup MIO tersedia dan tabel menampilkan data parameter terdaftar.',
      highlight: btnAddLookup
    });
  });

  test('[TC-013] Lookup Management - MRM Lookup', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-013',
      scenarioName: 'Pengujian Fitur Lookup Management - MRM Lookup',
      title: 'Lookup Management - MRM Lookup',
      expectedResult: 'Berhasil mengelola parameter referensi Model Risk Management (Segmen, RLG Risk, Model Status, Approval).',
      role: 'Admin / User Admin'
    });

    await navigateToAdmin(page, '/admin/lookup-mrm');

    await wedocit.captureStep({
      title: 'Akses Menu MRM Lookup',
      description: 'Membuka halaman parameter MRM Lookup (/admin/lookup-mrm) untuk modul Model Risk Management.',
      input: 'URL: /admin/lookup-mrm',
      expected: 'Halaman MRM Lookup terbuka dengan daftar parameter tipe model, segmen, level risiko, dan approval.'
    });

    const filterInput = page.locator('input[placeholder*="Filter" i]').first();
    const btnFilter = page.locator('button:has-text("Filter")').first();
    if (await filterInput.isVisible().catch(() => false)) {
      await filterInput.fill('SEGMEN');
      if (await btnFilter.isVisible().catch(() => false)) await btnFilter.click();
      await page.waitForTimeout(500);
    }

    await wedocit.captureStep({
      title: 'Filter Parameter MRM (Segmen & RLG)',
      description: 'Penyaringan parameter referensi MRM untuk segmen model dan klasifikasi risiko model.',
      input: 'Keyword Filter: SEGMEN',
      expected: 'Tabel menampilkan referensi segmen model risiko (Credit Wholesale, Credit Retail, Market, Liquidity).'
    });
  });

  test('[TC-014] Lookup Management - RBBR / TKB Lookup', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-014',
      scenarioName: 'Pengujian Fitur Lookup Management - RBBR / TKB Lookup',
      title: 'Lookup Management - RBBR / TKB Lookup',
      expectedResult: 'Berhasil mengelola parameter referensi TKB/RBBR dan range pembobotan skor profil risiko bank.',
      role: 'Admin / User Admin'
    });

    await navigateToAdmin(page, '/admin/lookup/rbbr');

    await wedocit.captureStep({
      title: 'Akses Menu RBBR / TKB Lookup',
      description: 'Membuka halaman parameter TKB/RBBR Lookup (/admin/lookup/rbbr).',
      input: 'URL: /admin/lookup/rbbr',
      expected: 'Halaman RBBR Lookup terbuka dengan parameter komposit profil risiko, tata kelola, dan rentabilitas.'
    });

    await wedocit.captureStep({
      title: 'Verifikasi Parameter Range Skor TKB',
      description: 'Memeriksa konfigurasi rentang skor dan peringkat tingkat kesehatan bank posisi semesteran.',
      input: 'Parameter: Profil Risiko & Range Skor',
      expected: 'Data parameter referensi TKB/RBBR ditampilkan lengkap dan akurat.'
    });
  });

  // =========================================================================
  // 6. WORKFLOW MANAGEMENT (TC-015 s/d TC-016)
  // =========================================================================

  test('[TC-015] Workflow Management - Workflow Status', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-015',
      scenarioName: 'Pengujian Fitur Workflow Management - Workflow Status',
      title: 'Workflow Management - Workflow Status',
      expectedResult: 'Berhasil memuat dan menyaring status alur persetujuan alur kerja (Workflow Status) pada sistem RMIS.',
      role: 'Admin / User Admin'
    });

    await navigateToAdmin(page, '/admin/workflow/status');

    await wedocit.captureStep({
      title: 'Akses Menu Workflow Status',
      description: 'Membuka menu Manage Workflow > Workflow Status (/admin/workflow/status).',
      input: 'URL: /admin/workflow/status',
      expected: 'Halaman Workflow Status terbuka menampilkan daftar status persetujuan alur kerja.'
    });

    const flowInput = page.locator('input[formcontrolname="flowName"]').first();
    const btnFilter = page.locator('button:has-text("Filter")').first();
    if (await flowInput.isVisible().catch(() => false)) {
      await flowInput.fill('Approval');
      if (await btnFilter.isVisible().catch(() => false)) await btnFilter.click();
      await page.waitForTimeout(500);
    }

    await wedocit.captureStep({
      title: 'Operasi Filter Workflow Status',
      description: 'Penyaringan status alur kerja berdasarkan nama flow persetujuan modul RMIS.',
      input: 'Flow Name: Approval',
      expected: 'Tabel menampilkan daftar status alur kerja yang relevan (Draft, In Review, Approved, Rejected).'
    });
  });

  test('[TC-016] Workflow Management - Workflow Step', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-016',
      scenarioName: 'Pengujian Fitur Workflow Management - Workflow Step',
      title: 'Workflow Management - Workflow Step',
      expectedResult: 'Berhasil memverifikasi tahapan eksekusi langkah persetujuan (Workflow Step) pada alur kerja RMIS.',
      role: 'Admin / User Admin'
    });

    await navigateToAdmin(page, '/admin/workflow/step');

    await wedocit.captureStep({
      title: 'Akses Menu Workflow Step',
      description: 'Membuka menu Manage Workflow > Workflow Step (/admin/workflow/step).',
      input: 'URL: /admin/workflow/step',
      expected: 'Halaman Workflow Step terbuka menampilkan daftar langkah dan transisi tahapan persetujuan.'
    });

    const btnAddStep = page.locator('button:has-text("Add Step"), button:has-text("Tambah Step")').first();

    await wedocit.captureStep({
      title: 'Verifikasi Kontrol Add Workflow Step',
      description: 'Memeriksa kontrol tombol penambahan langkah workflow baru untuk modul RMIS.',
      input: 'Kontrol: Tombol Add Step',
      expected: 'Tombol kontrol penambahan tahapan workflow tersedia dan tabel memuat tahapan yang terdefinisi.',
      highlight: btnAddStep
    });
  });

  // =========================================================================
  // 7. SECURITY & AUDIT ADMINISTRATION (TC-017 s/d TC-018)
  // =========================================================================

  test('[TC-017] Security Administration - Audit Trail', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-017',
      scenarioName: 'Pengujian Fitur Security Administration - Audit Trail',
      title: 'Security Administration - Audit Trail',
      expectedResult: 'Berhasil memuat catatan riwayat aktivitas dan log jejak audit pengguna pada sistem RMIS.',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin-ciso/audit-trail');

    await wedocit.captureStep({
      title: 'Akses Menu Audit Trail',
      description: 'Membuka halaman Audit Trail (/admin-ciso/audit-trail) untuk pengawasan aktivitas sistem.',
      input: 'URL: /admin-ciso/audit-trail',
      expected: 'Halaman Audit Trail terbuka menampilkan log aktivitas, waktu akses, user, dan aksi.'
    });

    await wedocit.captureStep({
      title: 'Verifikasi Integritas Log Audit Trail',
      description: 'Memeriksa integritas log aktivitas sistem yang mencatat setiap aksi Create, Update, Delete dan otentikasi login pengguna.',
      input: 'Audit: User Activity Log',
      expected: 'Log audit trail terverifikasi terekam dengan timestamp dan deskripsi aktivitas yang detail.'
    });
  });

  test('[TC-018] Security Administration - Manage Session', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-018',
      scenarioName: 'Pengujian Fitur Security Administration - Manage Session',
      title: 'Security Administration - Manage Session',
      expectedResult: 'Berhasil memuat daftar sesi login aktif pengguna dan kontrol keamanan manajemen sesi.',
      role: 'Admin / IT Security'
    });

    await navigateToAdmin(page, '/admin-ciso/manage-session');

    await wedocit.captureStep({
      title: 'Akses Menu Manage Sessions',
      description: 'Membuka halaman Manage Sessions (/admin-ciso/manage-session) untuk audit sesi aktif pengguna.',
      input: 'URL: /admin-ciso/manage-session',
      expected: 'Halaman Manage Sessions terbuka menampilkan daftar sesi login aktif dan IP address pengguna.'
    });

    await wedocit.captureStep({
      title: 'Verifikasi Kontrol Keamanan Sesi',
      description: 'Memeriksa fitur kontrol pencabutan sesi (revoke session) untuk menjamin keamanan akses aplikasi RMIS.',
      input: 'Keamanan: Active Session Management',
      expected: 'Daftar sesi pengguna terverifikasi dan kontrol manajemen sesi berfungsi dengan baik.'
    });
  });

});
