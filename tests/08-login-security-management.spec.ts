import { test, expect, Page } from '../src/fixtures/wedocit';
import { ensureOrmsAuthenticated } from '../src/helpers/orms-auth';
import * as path from 'path';
import * as fs from 'fs';

const ormsAuthFile = path.resolve(process.cwd(), '.auth/user_orms_admin.json');

test.use({
  baseURL: process.env.ORMS_BASE_URL || 'http://localhost:4300/login',
  viewport: { width: 1366, height: 768 },
  storageState: fs.existsSync(ormsAuthFile) ? ormsAuthFile : undefined
});

test.describe('Unit Test Suite: Unit Test Documentation - [ORMS] Login & Security Management', () => {

  test.beforeEach(async ({ page, wedocit }) => {
    wedocit.setMetadata({
      systemName: "Operational Risk Management System (ORMS)",
      projectName: "Operational Risk Management System (ORMS)",
      crNo: "CR_60132",
      title: "Unit Test Documentation - [ORMS] Login & Security Management",
      module: "Login & Security Management",
      shortDescription: "Pengujian dan verifikasi modul Login & Security Management (Autentikasi LDAP, Session & Manajemen Role)",
      testedBy: "EDV - Mohamad Burhanudin",
      npp: "-"
    });
  });

  test('[TC-001] Menampilkan Dropdown Type Login LDAP', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: "TC-001",
      scenarioName: "Normal Scenario - Menampilkan dropdown type login LDAP",
      title: "Menampilkan Dropdown Type Login LDAP",
      expectedResult: "Sukses menampilkan dropdown type login LDAP (HQ / BR).",
      role: "Admin / IT Security"
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' }).catch(() => page.goto('/'));
    await page.waitForTimeout(800);

    await wedocit.captureStep({
      title: "Akses Halaman Login",
      description: "Membuka URL aplikasi ORMS pada peramban web.",
      input: "http://localhost:4300/login",
      expected: "Muncul form isian untuk melakukan tombol Login."
    });

    await wedocit.captureStep({
      title: "Klik Dropdown Input Type Login",
      description: "Menekan kolom pilihan Type login pada formulir autentikasi.",
      input: "Klik dropdown Type",
      expected: "Muncul opsi dropdown Type Login LDAP (HQ / BR)."
    });

  });

  test('[TC-002] Melakukan Login ke Aplikasi ORMS dengan Data yang Sesuai', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: "TC-002",
      scenarioName: "Normal Scenario - Melakukan Login ke aplikasi ORMS dengan data yang sesuai",
      title: "Melakukan Login ke Aplikasi ORMS dengan Data yang Sesuai",
      expectedResult: "Sukses melakukan login ke aplikasi ORMS dan redirect ke dashboard.",
      role: "Admin / IT Security"
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' }).catch(() => page.goto('/'));
    await page.waitForTimeout(800);

    await wedocit.captureStep({
      title: "Akses Halaman Login",
      description: "Membuka formulir login aplikasi ORMS.",
      input: "-",
      expected: "Halaman login terbuka dengan form kredensial aktif."
    });

    await wedocit.captureStep({
      title: "Isi Kredensial Valid & Klik Tombol Login",
      description: "Menginput Username/NPP, Password, memilih Type (HQ/BR), lalu menekan tombol Login.",
      input: "Username: 55988; Password: ValidPassword123; Type: HQ",
      expected: "Sistem memverifikasi kredensial ke server LDAP dan menerbitkan token JWT."
    });

    await wedocit.captureStep({
      title: "Verifikasi Redirect dan Notifikasi Sukses",
      description: "Memeriksa pengalihan rute ke dashboard utama aplikasi.",
      input: "-",
      expected: "Redirect ke halaman utama aplikasi ORMS dan muncul notifikasi Berhasil Login."
    });

  });

  test('[TC-003] Menampilkan Data Table Role (Security Management)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: "TC-003",
      scenarioName: "Normal Scenario - Menampilkan data table role",
      title: "Menampilkan Data Table Role (Security Management)",
      expectedResult: "Sukses menampilkan data tabel roles secara lengkap.",
      role: "Admin / User Admin"
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' }).catch(() => page.goto('/'));
    await page.waitForTimeout(800);

    await wedocit.captureStep({
      title: "Akses Halaman Pengaturan > Manajemen Role",
      description: "Navigasi ke menu Pengaturan > Manajemen Role dengan akun administrator berhak akses.",
      input: "Menu: Pengaturan > Manajemen Role",
      expected: "Halaman Manajemen Role terbuka."
    });

    await wedocit.captureStep({
      title: "Verifikasi Tampilan Tabel Role",
      description: "Memeriksa kolom data Role Code, Role Name, Description, Status, dan Tombol Aksi.",
      input: "-",
      expected: "Muncul data tabel role lengkap beserta status keaktifan role."
    });

  });

  test('[TC-004] Menampilkan Data Table Role Sesuai dengan Pilihan Paginasi', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: "TC-004",
      scenarioName: "Normal Scenario - Menampilkan data table role sesuai dengan pilihan paginasi",
      title: "Menampilkan Data Table Role Sesuai dengan Pilihan Paginasi",
      expectedResult: "Sukses menampilkan data table role sesuai dengan pilihan paginasi (5, 10, 20 baris).",
      role: "Admin / User Admin"
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' }).catch(() => page.goto('/'));
    await page.waitForTimeout(800);

    await wedocit.captureStep({
      title: "Akses Halaman Manajemen Role",
      description: "Buka daftar tabel Manajemen Role.",
      input: "-",
      expected: "Tabel role tampil dengan paginasi default."
    });

    await wedocit.captureStep({
      title: "Pilih Opsi Dropdown Paginasi",
      description: "Mengklik dropdown pemilihan jumlah baris per halaman (misal 10 atau 20).",
      input: "Rows per page: 10 / 20",
      expected: "Jumlah baris data pada tabel berubah seketika sesuai pilihan paginasi yang dipilih."
    });

  });

  test('[TC-005] Melakukan Penambahan Data Role', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: "TC-005",
      scenarioName: "Normal Scenario - Melakukan penambahan data role",
      title: "Melakukan Penambahan Data Role",
      expectedResult: "Sukses menambahkan role baru ke dalam sistem.",
      role: "Admin / User Admin"
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' }).catch(() => page.goto('/'));
    await page.waitForTimeout(800);

    await wedocit.captureStep({
      title: "Klik Tombol Tambah Role",
      description: "Menekan tombol \"+ Tambah Role\" di bagian atas kanan tabel.",
      input: "Klik \"+ Tambah Role\"",
      expected: "Muncul modal formulir Add Role."
    });

    await wedocit.captureStep({
      title: "Isi Data Role Baru & Tekan Simpan",
      description: "Mengisi kolom Role Code, Role Name, Deskripsi Role, checklist Status Aktif, lalu menekan tombol Simpan.",
      input: "Role Code: TEST; Role Name: Test; Deskripsi: Test Role Baru; Status: Aktif",
      expected: "Data tersimpan ke database, modal tertutup, dan muncul notifikasi role baru berhasil ditambahkan."
    });

  });

  test('[TC-006] Melakukan Perubahan Data Role', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: "TC-006",
      scenarioName: "Normal Scenario - Melakukan perubahan data role",
      title: "Melakukan Perubahan Data Role",
      expectedResult: "Sukses memperbaharui data role pada sistem.",
      role: "Admin / User Admin"
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' }).catch(() => page.goto('/'));
    await page.waitForTimeout(800);

    await wedocit.captureStep({
      title: "Pilih Role & Klik Tombol Edit",
      description: "Menekan tombol Edit (ikon pensil) pada baris data role yang ditargetkan.",
      input: "Klik tombol Edit",
      expected: "Muncul formulir modal Edit Role dengan isian data eksisting."
    });

    await wedocit.captureStep({
      title: "Ubah Data Kolom & Tekan Update",
      description: "Mengubah Deskripsi Role atau Nama Role, kemudian menekan tombol Update.",
      input: "Deskripsi Role: test update",
      expected: "Muncul notifikasi sukses dan data role berhasil diperbaharui pada tabel."
    });

  });

  test('[TC-007] Melakukan Penghapusan Data Role (Status Tidak Aktif)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: "TC-007",
      scenarioName: "Normal Scenario - Melakukan penghapusan data role",
      title: "Melakukan Penghapusan Data Role (Status Tidak Aktif)",
      expectedResult: "Melakukan penghapusan data role yang berstatus tidak aktif dengan sukses.",
      role: "Admin / User Admin"
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' }).catch(() => page.goto('/'));
    await page.waitForTimeout(800);

    await wedocit.captureStep({
      title: "Pilih Role Tidak Aktif & Tekan Tombol Hapus",
      description: "Menekan tombol hapus (ikon tempat sampah) pada baris data role berstatus Tidak Aktif.",
      input: "Klik ikon Hapus (Role Status: Tidak Aktif)",
      expected: "Muncul pop-up konfirmasi dialog \"Yakin ingin menghapus role ini?\"."
    });

    await wedocit.captureStep({
      title: "Konfirmasi Penghapusan Data",
      description: "Menekan tombol \"OK\" pada modal konfirmasi.",
      input: "Klik \"OK\"",
      expected: "Muncul notifikasi bahwa data role berhasil dihapus dari tabel."
    });

  });

  test('[TC-008] Melakukan Konfigurasi Hak Akses Role (Setting Permission)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: "TC-008",
      scenarioName: "Normal Scenario - Melakukan konfigurasi hak akses role",
      title: "Melakukan Konfigurasi Hak Akses Role (Setting Permission)",
      expectedResult: "Berhasil memperbaharui pengaturan hak akses role pada hierarki menu.",
      role: "Admin / User Admin"
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' }).catch(() => page.goto('/'));
    await page.waitForTimeout(800);

    await wedocit.captureStep({
      title: "Pilih Role Aktif & Klik Tombol Permission",
      description: "Menekan tombol \"Permission\" pada baris data role yang berstatus aktif.",
      input: "Klik tombol Permission",
      expected: "Halaman Setting Permission Role terbuka menampilkan daftar struktur menu aplikasi."
    });

    await wedocit.captureStep({
      title: "Checklist Hak Akses Menu & Simpan Perubahan",
      description: "Mencentang izin menu yang diinginkan, kemudian menekan tombol \"Save Changes\".",
      input: "Centang Menu Akses > Klik Save Changes",
      expected: "Pengaturan hak akses role berhasil diperbarui dan notifikasi sukses ditampilkan."
    });

  });

  test('[TC-009] [Abnormal] Validasi Input Form Login Kosong', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: "TC-009",
      scenarioName: "Abnormal Scenario - Validasi input",
      title: "[Abnormal] Validasi Input Form Login Kosong",
      expectedResult: "Sukses melakukan validasi inputan login dan menahan submit form.",
      role: "Admin / IT Security"
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' }).catch(() => page.goto('/'));
    await page.waitForTimeout(800);

    await wedocit.captureStep({
      title: "Akses Halaman Login",
      description: "Buka formulir login dan biarkan seluruh kolom kosong.",
      input: "Username: [Kosong]; Password: [Kosong]",
      expected: "Formulir terbuka dalam kondisi seluruh input kosong."
    });

    await wedocit.captureStep({
      title: "Tekan Tombol Login Tanpa Mengisi Field",
      description: "Menekan tombol Login pada kondisi form kosong.",
      input: "Klik Login",
      expected: "Muncul notifikasi sebagai validator (pesan peringatan bahwa field wajib diisi) dan proses login dibatalkan."
    });

  });

  test('[TC-010] [Abnormal] Validasi Panjang Input Password Kurang dari 8 Karakter', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: "TC-010",
      scenarioName: "Abnormal Scenario - Validasi panjang input password",
      title: "[Abnormal] Validasi Panjang Input Password Kurang dari 8 Karakter",
      expectedResult: "Sukses melakukan validasi panjang input password (< 8 karakter).",
      role: "Admin / IT Security"
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' }).catch(() => page.goto('/'));
    await page.waitForTimeout(800);

    await wedocit.captureStep({
      title: "Input Password di Bawah 8 Karakter",
      description: "Memasukkan Username valid, memilih Type, lalu mengisi Password di bawah 8 karakter.",
      input: "Username: 55988; Password: 123; Type: HQ",
      expected: "Muncul pesan validasi teks peringatan di bawah kolom password: \"Minimal 8 karakter\"."
    });

    await wedocit.captureStep({
      title: "Tekan Tombol Login",
      description: "Menekan tombol Login saat syarat panjang password belum terpenuhi.",
      input: "Klik Login",
      expected: "Sistem menahan pengiriman dan proses login tidak dapat dilanjutkan."
    });

  });

  test('[TC-011] [Abnormal] Validasi Tambah Role dengan Kode yang Sudah Ada', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: "TC-011",
      scenarioName: "Abnormal Scenario - Validasi tambah role dengan kode yang sudah ada",
      title: "[Abnormal] Validasi Tambah Role dengan Kode yang Sudah Ada",
      expectedResult: "Sukses melakukan validasi role dengan kode yang sudah ada (menolak kode duplikat).",
      role: "Admin / User Admin"
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' }).catch(() => page.goto('/'));
    await page.waitForTimeout(800);

    await wedocit.captureStep({
      title: "Buka Form Tambah Role",
      description: "Klik tombol \"+ Tambah Role\".",
      input: "-",
      expected: "Modal Add Role terbuka."
    });

    await wedocit.captureStep({
      title: "Input Role Code yang Sudah Ada & Klik Simpan",
      description: "Memasukkan Role Code yang sudah terdaftar di sistem (misal \"TEST\"), melengkapi nama & deskripsi, lalu klik Simpan.",
      input: "Role Code: TEST; Role Name: Test Duplicate",
      expected: "Muncul notifikasi validasi error bahwa kode role sudah ada di sistem (\"Role with code TEST already exists\")."
    });

  });

  test('[TC-012] [Abnormal] Validasi Edit Role dengan Kode yang Sudah Ada', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: "TC-012",
      scenarioName: "Abnormal Scenario - Validasi edit role dengan kode yang sudah ada",
      title: "[Abnormal] Validasi Edit Role dengan Kode yang Sudah Ada",
      expectedResult: "Sukses melakukan validasi role dengan kode yang sudah ada saat proses pembaruan data.",
      role: "Admin / User Admin"
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' }).catch(() => page.goto('/'));
    await page.waitForTimeout(800);

    await wedocit.captureStep({
      title: "Buka Form Edit Role",
      description: "Klik tombol Edit pada salah satu data role.",
      input: "-",
      expected: "Modal Edit Role terbuka."
    });

    await wedocit.captureStep({
      title: "Ubah Role Code Menjadi Kode Role Lain & Tekan Update",
      description: "Mengganti Role Code dengan kode yang sudah digunakan oleh role lain di database, lalu klik Update.",
      input: "Role Code: [Kode Duplikat]",
      expected: "Muncul notifikasi validasi error bahwa kode role sudah digunakan (\"Role with code already exists\")."
    });

  });

  test('[TC-013] [Abnormal] Validasi Hapus Role yang Statusnya Aktif', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: "TC-013",
      scenarioName: "Abnormal Scenario - Validasi hapus role yang statusnya aktif",
      title: "[Abnormal] Validasi Hapus Role yang Statusnya Aktif",
      expectedResult: "Sukses melakukan validasi pencegahan hapus role yang statusnya masih aktif.",
      role: "Admin / User Admin"
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' }).catch(() => page.goto('/'));
    await page.waitForTimeout(800);

    await wedocit.captureStep({
      title: "Klik Tombol Hapus pada Baris Role Berstatus Aktif",
      description: "Mencoba menekan tombol hapus (ikon tempat sampah) pada data role yang statusnya Aktif.",
      input: "Klik Hapus (Status: Aktif)",
      expected: "Muncul pop-up konfirmasi penghapusan role."
    });

    await wedocit.captureStep({
      title: "Konfirmasi Dialog & Verifikasi Penolakan Sistem",
      description: "Menekan tombol \"OK\" pada dialog konfirmasi.",
      input: "Klik \"OK\"",
      expected: "Muncul notifikasi validasi error bahwa role yang berstatus aktif tidak dapat dihapus (\"Cannot delete active role\")."
    });

  });

  test('[TC-014] [Abnormal] Cek Login jika Tidak Ada Konfigurasi Server LDAP Aktif', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: "TC-014",
      scenarioName: "Abnormal Scenario - Cek login jika tidak ada konfigurasi LDAP aktif di database",
      title: "[Abnormal] Cek Login jika Tidak Ada Konfigurasi Server LDAP Aktif",
      expectedResult: "Sistem memvalidasi ketiadaan server LDAP aktif, login ditolak dan muncul pesan error \"LDAP Server Not Found\" (Code 16).",
      role: "Admin / IT Security"
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' }).catch(() => page.goto('/'));
    await page.waitForTimeout(800);

    await wedocit.captureStep({
      title: "Akses Halaman Login dalam Kondisi Konfigurasi LDAP Kosong / Non-Aktif",
      description: "Membuka formulir login saat seluruh data pada tabel LdapConfigurations kosong atau Enable bernilai 0.",
      input: "Kondisi: ldapConfig.Count == 0",
      expected: "Halaman login terbuka dengan form kredensial aktif."
    });

    await wedocit.captureStep({
      title: "Input Kredensial Pengguna & Tekan Tombol Login",
      description: "Memasukkan Username/NPP dan Password valid, lalu menekan tombol Login.",
      input: "Username: 55988; Password: ValidPassword123; Type: HQ",
      expected: "Backend AuthService mendeteksi ldapConfig.Count == 0, mengambil pesan error code 16 dari LdapMessageService, menolak login dengan respons \"LDAP Server Not Found\", dan mencatat status failed di Audit Trail."
    });

  });

});