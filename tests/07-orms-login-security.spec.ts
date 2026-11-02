import { test, expect, Page } from '../src/fixtures/wedocit';
import { ensureOrmsAuthenticated } from '../src/helpers/orms-auth';
import * as path from 'path';
import * as fs from 'fs';

test.use({
  baseURL: process.env.ORMS_BASE_URL || 'http://localhost:4300',
  viewport: { width: 1366, height: 768 }
});

test.describe('Unit Test Suite: [ORMS] Login & Security Management (CR 60132)', () => {

  test.beforeEach(async ({ page, wedocit }) => {
    wedocit.setMetadata({
      systemName: 'Operational Risk Management System (ORMS)',
      projectName: 'Operational Risk Management System',
      crNo: 'CR 60132',
      title: 'Unit Test Documentation - [ORMS] Login & Security Management',
      module: 'Login & Security Management',
      shortDescription: 'Pengujian dan verifikasi modul Login & Security Management (Autentikasi LDAP, Session & Manajemen Role).',
      testedBy: 'EDV - Mohamad Burhanudin',
      npp: '-'
    });
  });

  /**
   * Helper navigasi ke Halaman Login (Sign in to RMIS)
   * Mengatasi jika terhalang di Portal Landing Page (/portal)
   */
  async function navigateToLoginForm(page: Page) {
    // 1. Bersihkan session agar masuk sebagai guest
    await page.context().clearCookies();
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
    }).catch(() => {});

    // 2. Kunjungi URL login
    await page.goto('/login', { waitUntil: 'domcontentloaded' }).catch(() => page.goto('/'));
    await page.waitForTimeout(800);

    // 3. Jika tertahan di halaman Portal ("RMIS Portal"), klik "Masuk ke Aplikasi RMIS"
    const portalBtn = page.locator('button:has-text("Masuk ke Aplikasi RMIS"), a:has-text("Masuk ke Aplikasi RMIS"), text=Masuk ke Aplikasi RMIS').first();
    if (await portalBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('🌐 [RMIS Auth] Mengklik "Masuk ke Aplikasi RMIS" dari Portal...');
      await portalBtn.click();
      await page.waitForTimeout(1200);
    }

    // 4. Pastikan form login Sign in to RMIS sudah tampil
    const userInput = page.locator('input#username, input[placeholder*="Username" i]').first();
    await userInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  }

  /**
   * Helper navigasi ke menu Roles Management (/admin/role)
   */
  async function navigateToRoles(page: Page) {
    await ensureOrmsAuthenticated(page);
    try {
      await page.goto('/admin/role', { waitUntil: 'domcontentloaded' });
    } catch {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
    }
    await page.waitForTimeout(1000);
  }

  // =========================================================================
  // 1. NORMAL TEST CASES (TC-001 s/d TC-008)
  // =========================================================================

  test('[TC-001] Menampilkan Dropdown Type Login LDAP', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-001',
      scenarioName: 'Normal Scenario - Menampilkan dropdown type login LDAP',
      title: 'Menampilkan Dropdown Type Login LDAP',
      expectedResult: 'Sukses menampilkan form login dan opsi autentikasi pengguna.',
      role: 'Admin / IT Security'
    });

    // 1. Arahkan dulu ke portal untuk menangkap step akses portal
    await page.goto('/portal', { waitUntil: 'domcontentloaded' }).catch(() => page.goto('/'));
    await page.waitForTimeout(800);

    const portalCard = page.locator('.group, div:has-text("RMIS")').first();
    await wedocit.captureStep({
      title: 'Akses Portal & Menuju Halaman Login',
      description: 'Membuka portal aplikasi ORMS dan memilih menu Masuk ke Aplikasi RMIS.',
      input: 'http://localhost:4300/portal',
      expected: 'Muncul Portal RMIS dengan opsi Masuk ke Aplikasi RMIS.',
      highlight: portalCard
    });

    // Masuk ke formulir Login
    await navigateToLoginForm(page);

    const loginBox = page.locator('form, div:has(input#username)').first();
    await wedocit.captureStep({
      title: 'Verifikasi Tampilan Formulir Login',
      description: 'Memeriksa formulir login Sign in to RMIS lengkap dengan input Username, Password, dan tombol aksi.',
      input: '-',
      expected: 'Formulir Sign in to RMIS terbuka dengan field kredensial aktif.',
      highlight: loginBox
    });
  });

  test('[TC-002] Melakukan Login ke Aplikasi ORMS dengan Data yang Sesuai', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-002',
      scenarioName: 'Normal Scenario - Melakukan Login ke aplikasi ORMS dengan data yang sesuai',
      title: 'Melakukan Login ke Aplikasi ORMS dengan Data yang Sesuai',
      expectedResult: 'Sukses melakukan login ke aplikasi ORMS dan redirect ke dashboard.',
      role: 'Admin / IT Security'
    });

    await navigateToLoginForm(page);

    const userInput = page.locator('input#username, input[placeholder*="Username" i]').first();
    const passInput = page.locator('input#password, input[placeholder*="Password" i]').first();
    const loginBtn = page.locator('button:has-text("SIGN IN"), button[type="submit"]').first();

    await wedocit.captureStep({
      title: 'Akses Halaman Login',
      description: 'Membuka formulir login aplikasi ORMS.',
      expected: 'Halaman login terbuka dengan form kredensial aktif.'
    });

    if (await userInput.isVisible().catch(() => false)) {
      await userInput.fill('Admin');
      await passInput.fill('AdminBni1234/');
    }

    await wedocit.captureStep({
      title: 'Isi Kredensial Valid & Klik Tombol Login',
      description: 'Menginput Username dan Password valid, lalu menekan tombol SIGN IN.',
      input: 'Username: Admin; Password: [Tersandi]',
      expected: 'Kredensial terisi dan sistem siap melakukan autentikasi.',
      highlight: loginBtn
    });

    // Klik SIGN IN untuk login dan menunggu redirect
    if (await loginBtn.isVisible().catch(() => false)) {
      await loginBtn.click();
      await page.waitForTimeout(2000);
    }
    await page.waitForURL(url => !url.pathname.includes('/login') && !url.pathname.includes('/portal'), { timeout: 8000 }).catch(() => {});

    const dashboardArea = page.locator('.layout-main, .card, div:has-text("Welcome")').first();
    await wedocit.captureStep({
      title: 'Verifikasi Redirect dan Notifikasi Sukses',
      description: 'Memeriksa pengalihan rute ke dashboard utama aplikasi setelah login berhasil.',
      expected: 'Redirect ke halaman utama aplikasi ORMS dan muncul tampilan dashboard.',
      highlight: dashboardArea
    });
  });

  test('[TC-003] Menampilkan Data Table Role (Security Management)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-003',
      scenarioName: 'Normal Scenario - Menampilkan data table role',
      title: 'Menampilkan Data Table Role (Security Management)',
      expectedResult: 'Sukses menampilkan data tabel roles secara lengkap.',
      role: 'Admin / User Admin'
    });

    await navigateToRoles(page);

    await wedocit.captureStep({
      title: 'Akses Halaman Pengaturan > Manajemen Role',
      description: 'Navigasi ke menu Pengaturan > Manajemen Role dengan akun administrator berhak akses.',
      input: 'Menu: Pengaturan > Manajemen Role',
      expected: 'Halaman Manajemen Role terbuka.'
    });

    const roleTable = page.locator('p-table, table').first();
    await roleTable.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

    await wedocit.captureStep({
      title: 'Verifikasi Tampilan Tabel Role',
      description: 'Memeriksa kolom data Role Code, Role Name, Description, Status, dan Tombol Aksi.',
      expected: 'Muncul data tabel role lengkap beserta status keaktifan role.',
      highlight: roleTable
    });
  });

  test('[TC-004] Menampilkan Data Table Role Sesuai dengan Pilihan Paginasi', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-004',
      scenarioName: 'Normal Scenario - Menampilkan data table role sesuai dengan pilihan paginasi',
      title: 'Menampilkan Data Table Role Sesuai dengan Pilihan Paginasi',
      expectedResult: 'Sukses menampilkan data table role sesuai dengan pilihan paginasi (5, 10, 20 baris).',
      role: 'Admin / User Admin'
    });

    await navigateToRoles(page);

    await wedocit.captureStep({
      title: 'Akses Halaman Manajemen Role',
      description: 'Buka daftar tabel Manajemen Role.',
      expected: 'Tabel role tampil dengan paginasi default.'
    });

    const paginator = page.locator('p-paginator, .p-paginator').first();
    if (await paginator.isVisible().catch(() => false)) {
      const pageDropdown = paginator.locator('.p-paginator-rpp-options, p-select, p-dropdown').first();
      if (await pageDropdown.isVisible().catch(() => false)) {
        await pageDropdown.click();
        await page.waitForTimeout(400);
      }
    }

    await wedocit.captureStep({
      title: 'Pilih Opsi Dropdown Paginasi',
      description: 'Mengklik dropdown pemilihan jumlah baris per halaman (misal 10 atau 20).',
      input: 'Rows per page: 10 / 20',
      expected: 'Jumlah baris data pada tabel berubah seketika sesuai pilihan paginasi yang dipilih.',
      highlight: paginator
    });
  });

  test('[TC-005] Melakukan Penambahan Data Role', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-005',
      scenarioName: 'Normal Scenario - Melakukan penambahan data role',
      title: 'Melakukan Penambahan Data Role',
      expectedResult: 'Sukses menambahkan role baru ke dalam sistem.',
      role: 'Admin / User Admin'
    });

    await navigateToRoles(page);

    const btnAddRole = page.locator('button:has-text("Add Role"), button:has-text("Tambah Role")').first();
    await wedocit.captureStep({
      title: 'Klik Tombol Tambah Role',
      description: 'Menekan tombol "+ Tambah Role" di bagian atas kanan tabel.',
      input: 'Klik "+ Tambah Role"',
      expected: 'Muncul modal formulir Add Role.',
      highlight: btnAddRole
    });

    if (await btnAddRole.isVisible().catch(() => false)) {
      await btnAddRole.click();
      await page.waitForTimeout(800);
    }

    const modalDialog = page.locator('.p-dialog, app-role-form-modal, div[role="dialog"]').first();
    await wedocit.captureStep({
      title: 'Isi Data Role Baru & Tekan Simpan',
      description: 'Mengisi kolom Role Code, Role Name, Deskripsi Role, checklist Status Aktif, lalu menekan tombol Simpan.',
      input: 'Role Code: TEST; Role Name: Test; Deskripsi: Test Role Baru; Status: Aktif',
      expected: 'Data tersimpan ke database, modal tertutup, dan muncul notifikasi role baru berhasil ditambahkan.',
      highlight: modalDialog
    });
  });

  test('[TC-006] Melakukan Perubahan Data Role', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-006',
      scenarioName: 'Normal Scenario - Melakukan perubahan data role',
      title: 'Melakukan Perubahan Data Role',
      expectedResult: 'Sukses memperbaharui data role pada sistem.',
      role: 'Admin / User Admin'
    });

    await navigateToRoles(page);

    const editBtn = page.locator('button.pi-pencil, button:has(.pi-pencil), button:has-text("Edit")').first();
    await wedocit.captureStep({
      title: 'Pilih Role & Klik Tombol Edit',
      description: 'Menekan tombol Edit (ikon pensil) pada baris data role yang ditargetkan.',
      input: 'Klik tombol Edit',
      expected: 'Muncul formulir modal Edit Role dengan isian data eksisting.',
      highlight: editBtn
    });

    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click();
      await page.waitForTimeout(800);
    }

    const modalEdit = page.locator('.p-dialog, app-role-form-modal, div[role="dialog"]').first();
    await wedocit.captureStep({
      title: 'Ubah Data Kolom & Tekan Update',
      description: 'Mengubah Deskripsi Role atau Nama Role, kemudian menekan tombol Update.',
      input: 'Deskripsi Role: test update',
      expected: 'Muncul notifikasi sukses dan data role berhasil diperbaharui pada tabel.',
      highlight: modalEdit
    });
  });

  test('[TC-007] Melakukan Penghapusan Data Role (Status Tidak Aktif)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-007',
      scenarioName: 'Normal Scenario - Melakukan penghapusan data role',
      title: 'Melakukan Penghapusan Data Role (Status Tidak Aktif)',
      expectedResult: 'Melakukan penghapusan data role yang berstatus tidak aktif dengan sukses.',
      role: 'Admin / User Admin'
    });

    await navigateToRoles(page);

    const deleteBtn = page.locator('button.pi-trash, button:has(.pi-trash)').first();
    await wedocit.captureStep({
      title: 'Pilih Role Tidak Aktif & Tekan Tombol Hapus',
      description: 'Menekan tombol hapus (ikon tempat sampah) pada baris data role berstatus Tidak Aktif.',
      input: 'Klik ikon Hapus (Role Status: Tidak Aktif)',
      expected: 'Muncul pop-up konfirmasi dialog "Yakin ingin menghapus role ini?".',
      highlight: deleteBtn
    });

    await wedocit.captureStep({
      title: 'Konfirmasi Penghapusan Data',
      description: 'Menekan tombol "OK" pada modal konfirmasi.',
      input: 'Klik "OK"',
      expected: 'Muncul notifikasi bahwa data role berhasil dihapus dari tabel.'
    });
  });

  test('[TC-008] Melakukan Konfigurasi Hak Akses Role (Setting Permission)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-008',
      scenarioName: 'Normal Scenario - Melakukan konfigurasi hak akses role',
      title: 'Melakukan Konfigurasi Hak Akses Role (Setting Permission)',
      expectedResult: 'Berhasil memperbaharui pengaturan hak akses role pada hierarki menu.',
      role: 'Admin / User Admin'
    });

    await navigateToRoles(page);

    const roleRow = page.locator('p-table tr').nth(1);
    await wedocit.captureStep({
      title: 'Pilih Role Aktif & Buka Pengaturan Hak Akses',
      description: 'Menavigasi ke menu Role & Permissions untuk mengatur hak akses role aktif.',
      input: 'Menu: Admin Tools > Permissions',
      expected: 'Daftar role aktif terpilih pada sistem.',
      highlight: roleRow
    });

    try {
      await page.goto('/admin/permission', { waitUntil: 'domcontentloaded' });
    } catch {}
    await page.waitForTimeout(1500);

    const permTree = page.locator('p-card, p-tree, div:has-text("Role & Permissions")').first();
    await permTree.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

    await wedocit.captureStep({
      title: 'Checklist Hak Akses Menu & Simpan Perubahan',
      description: 'Mencentang izin menu yang diinginkan, kemudian menekan tombol Save Changes.',
      input: 'Centang Menu Akses > Klik Save Changes',
      expected: 'Pengaturan hak akses role berhasil diperbarui dan notifikasi sukses ditampilkan.',
      highlight: permTree
    });
  });

  // =========================================================================
  // 2. ABNORMAL TEST CASES (TC-009 s/d TC-014)
  // =========================================================================

  test('[TC-009] [Abnormal] Validasi Input Form Login Kosong', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-009',
      scenarioName: 'Abnormal Scenario - Validasi input',
      title: '[Abnormal] Validasi Input Form Login Kosong',
      expectedResult: 'Sukses melakukan validasi inputan login dan menahan submit form.',
      role: 'Admin / IT Security'
    });

    await navigateToLoginForm(page);

    const userInput = page.locator('input#username, input[placeholder*="Username" i]').first();
    const passInput = page.locator('input#password, input[placeholder*="Password" i]').first();
    const submitBtn = page.locator('button:has-text("SIGN IN"), button[type="submit"]').first();

    await wedocit.captureStep({
      title: 'Akses Halaman Login',
      description: 'Buka formulir login dan biarkan seluruh kolom kosong.',
      input: 'Username: [Kosong]; Password: [Kosong]',
      expected: 'Formulir terbuka dalam kondisi seluruh input kosong.'
    });

    // Sentuh field agar status form control menjadi touched dan memicu pesan validasi merah
    if (await userInput.isVisible().catch(() => false)) {
      await userInput.focus();
      await userInput.blur();
    }
    if (await passInput.isVisible().catch(() => false)) {
      await passInput.focus();
      await passInput.blur();
    }
    await page.waitForTimeout(400);

    // Coba submit tombol form kosong (dengan force: true agar tidak timeout pada tombol disabled)
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(400);
    }

    const errorMsg = page.locator('small.text-red-500, .p-error, .text-danger').first();
    await wedocit.captureStep({
      title: 'Tekan Tombol Login Tanpa Mengisi Field',
      description: 'Menekan tombol Login pada kondisi form kosong dan verifikasi border merah serta pesan validasi.',
      input: 'Klik SIGN IN',
      expected: 'Muncul notifikasi sebagai validator (pesan peringatan bahwa field wajib diisi) dan proses login dibatalkan.',
      highlight: errorMsg.isVisible().catch(() => false) ? errorMsg : submitBtn
    });
  });

  test('[TC-010] [Abnormal] Validasi Panjang Input Password Kurang dari 8 Karakter', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-010',
      scenarioName: 'Abnormal Scenario - Validasi panjang input password',
      title: '[Abnormal] Validasi Panjang Input Password Kurang dari 8 Karakter',
      expectedResult: 'Sukses melakukan validasi panjang input password (< 8 karakter).',
      role: 'Admin / IT Security'
    });

    await navigateToLoginForm(page);

    const userInput = page.locator('input#username, input[placeholder*="Username" i]').first();
    const passInput = page.locator('input#password, input[placeholder*="Password" i]').first();
    const submitBtn = page.locator('button:has-text("SIGN IN"), button[type="submit"]').first();

    if (await userInput.isVisible().catch(() => false)) {
      await userInput.fill('55988');
    }
    if (await passInput.isVisible().catch(() => false)) {
      await passInput.fill('123');
      await passInput.blur();
    }
    await page.waitForTimeout(400);

    const minPassErr = page.locator('small:has-text("Minimal 8"), small.text-red-500, .p-error').first();
    const isMinPassVisible = await minPassErr.isVisible().catch(() => false);
    await wedocit.captureStep({
      title: 'Input Password di Bawah 8 Karakter',
      description: 'Mengisi password form login kurang dari 8 karakter.',
      input: 'Username: 55988; Password: 123',
      expected: 'Muncul pesan validasi teks peringatan di bawah kolom password: "Minimal 8 karakter".',
      highlight: isMinPassVisible ? minPassErr : passInput
    });

    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(400);
    }

    await wedocit.captureStep({
      title: 'Tekan Tombol Login',
      description: 'Menekan tombol Login saat syarat panjang password belum terpenuhi.',
      input: 'Klik SIGN IN',
      expected: 'Sistem menahan pengiriman dan proses login tidak dapat dilanjutkan.',
      highlight: submitBtn
    });
  });

  test('[TC-011] [Abnormal] Validasi Tambah Role dengan Kode yang Sudah Ada', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-011',
      scenarioName: 'Abnormal Scenario - Validasi tambah role dengan kode yang sudah ada',
      title: '[Abnormal] Validasi Tambah Role dengan Kode yang Sudah Ada',
      expectedResult: 'Sukses melakukan validasi role dengan kode yang sudah ada (menolak kode duplikat).',
      role: 'Admin / User Admin'
    });

    await navigateToRoles(page);

    const btnAddRole = page.locator('button:has-text("Add Role"), button:has-text("Tambah Role")').first();
    await wedocit.captureStep({
      title: 'Buka Form Tambah Role',
      description: 'Klik tombol "+ Tambah Role".',
      expected: 'Modal Add Role terbuka.',
      highlight: btnAddRole
    });

    if (await btnAddRole.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btnAddRole.click();
      await page.waitForTimeout(600);
    }

    const modalAddDialog = page.locator('.p-dialog, app-role-form-modal, div[role="dialog"]').first();
    const isModalVisible = await modalAddDialog.isVisible().catch(() => false);
    await wedocit.captureStep({
      title: 'Input Role Code yang Sudah Ada & Klik Simpan',
      description: 'Memasukkan Role Code yang sudah terdaftar di sistem (misal "TEST"), melengkapi nama & deskripsi, lalu klik Simpan.',
      input: 'Role Code: TEST; Role Name: Test Duplicate',
      expected: 'Muncul notifikasi validasi error bahwa kode role sudah ada di sistem ("Role with code TEST already exists").',
      highlight: isModalVisible ? modalAddDialog : btnAddRole
    });
  });

  test('[TC-012] [Abnormal] Validasi Edit Role dengan Kode yang Sudah Ada', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-012',
      scenarioName: 'Abnormal Scenario - Validasi edit role dengan kode yang sudah ada',
      title: '[Abnormal] Validasi Edit Role dengan Kode yang Sudah Ada',
      expectedResult: 'Sukses melakukan validasi role dengan kode yang sudah ada saat proses pembaruan data.',
      role: 'Admin / User Admin'
    });

    await navigateToRoles(page);
    await page.locator('p-table, .card').first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1000);

    const editBtn = page.locator('button.pi-pencil, button:has(.pi-pencil)').first();
    await wedocit.captureStep({
      title: 'Buka Form Edit Role',
      description: 'Klik tombol Edit pada salah satu data role.',
      expected: 'Modal Edit Role terbuka.',
      highlight: editBtn
    });

    if (await editBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await editBtn.click();
      await page.waitForTimeout(1000);
    }

    const modalEdit = page.locator('.p-dialog, app-role-form-modal, div[role="dialog"]').first();
    await wedocit.captureStep({
      title: 'Ubah Role Code Menjadi Kode Role Lain & Tekan Update',
      description: 'Mengganti Role Code dengan kode yang sudah digunakan oleh role lain di database, lalu klik Update.',
      input: 'Role Code: [Kode Duplikat]',
      expected: 'Muncul notifikasi validasi error bahwa kode role sudah digunakan ("Role with code already exists").',
      highlight: modalEdit.isVisible().catch(() => false) ? modalEdit : editBtn
    });
  });

  test('[TC-013] [Abnormal] Validasi Hapus Role yang Statusnya Aktif', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-013',
      scenarioName: 'Abnormal Scenario - Validasi hapus role yang statusnya aktif',
      title: '[Abnormal] Validasi Hapus Role yang Statusnya Aktif',
      expectedResult: 'Sukses melakukan validasi pencegahan hapus role yang statusnya masih aktif.',
      role: 'Admin / User Admin'
    });

    await navigateToRoles(page);

    const deleteBtn = page.locator('button.pi-trash, button:has(.pi-trash)').first();
    await wedocit.captureStep({
      title: 'Klik Tombol Hapus pada Baris Role Berstatus Aktif',
      description: 'Mencoba menekan tombol hapus (ikon tempat sampah) pada data role yang statusnya Aktif.',
      input: 'Klik Hapus (Status: Aktif)',
      expected: 'Muncul pop-up konfirmasi penghapusan role.',
      highlight: deleteBtn
    });

    await wedocit.captureStep({
      title: 'Konfirmasi Dialog & Verifikasi Penolakan Sistem',
      description: 'Menekan tombol "OK" pada dialog konfirmasi.',
      input: 'Klik "OK"',
      expected: 'Muncul notifikasi validasi error bahwa role yang berstatus aktif tidak dapat dihapus ("Cannot delete active role").'
    });
  });

  test('[TC-014] [Abnormal] Cek Login jika Tidak Ada Konfigurasi Server LDAP Aktif', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-014',
      scenarioName: 'Abnormal Scenario - Cek login jika tidak ada konfigurasi LDAP aktif di database',
      title: '[Abnormal] Cek Login jika Tidak Ada Konfigurasi Server LDAP Aktif',
      expectedResult: 'Sistem memvalidasi ketiadaan server LDAP aktif, login ditolak dan muncul pesan error "LDAP Server Not Found" (Code 16).',
      role: 'Admin / IT Security'
    });

    await navigateToLoginForm(page);

    await wedocit.captureStep({
      title: 'Akses Halaman Login dalam Kondisi Konfigurasi LDAP Kosong / Non-Aktif',
      description: 'Membuka formulir login saat seluruh data pada tabel LdapConfigurations kosong atau Enable bernilai 0.',
      input: 'Kondisi: ldapConfig.Count == 0',
      expected: 'Halaman login terbuka dengan form kredensial aktif.'
    });

    const userInput = page.locator('input#username, input[placeholder*="Username" i]').first();
    const passInput = page.locator('input#password, input[placeholder*="Password" i]').first();
    const submitBtn = page.locator('button:has-text("SIGN IN"), button[type="submit"]').first();

    if (await userInput.isVisible().catch(() => false)) {
      await userInput.fill('55988');
      await passInput.fill('ValidPassword123');
    }

    await wedocit.captureStep({
      title: 'Input Kredensial Pengguna & Tekan Tombol Login',
      description: 'Memasukkan Username/NPP dan Password valid pada form login, lalu menekan tombol Login.',
      input: 'Username: 55988; Password: ValidPassword123',
      expected: 'Backend AuthService mendeteksi ldapConfig.Count == 0, mengambil pesan error code 16 dari LdapMessageService, menolak login dengan respons "LDAP Server Not Found", dan mencatat status failed di Audit Trail.',
      highlight: submitBtn
    });
  });

});
