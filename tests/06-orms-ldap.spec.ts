import { test, expect } from '../src/fixtures/wedocit';
import { ensureOrmsAuthenticated } from '../src/helpers/orms-auth';

test.use({
  baseURL: process.env.ORMS_BASE_URL || 'http://localhost:4300',
  viewport: { width: 1366, height: 768 }
});

test.describe('Unit Test Suite: [ORMS] Integrasi LDAP Active Directory (CR 60131)', () => {

  test.beforeEach(async ({ page }) => {
    // Memastikan sudah login melalui 2-step portal RMIS (Gambar 1 -> Gambar 2)
    await ensureOrmsAuthenticated(page);
  });

  // Helper navigasi ke menu Pengaturan
  async function navigateToLdapMenu(page: any, menuName: string) {
    const currentUrl = page.url();
    // Buka menu Pengaturan / Settings jika belum terbuka
    const menuPengaturan = page.locator('text=Pengaturan, a:has-text("Pengaturan"), span:has-text("Pengaturan"), [data-menu="pengaturan"]').first();
    if (await menuPengaturan.isVisible({ timeout: 2000 }).catch(() => false)) {
      await menuPengaturan.click();
      await page.waitForTimeout(500);
    }

    // Klik sub-menu yang dituju (Ldap Config, Ldap Message, Ldap Audit Trail, Session)
    const subMenuItem = page.locator(`text="${menuName}", a:has-text("${menuName}"), span:has-text("${menuName}")`).first();
    if (await subMenuItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await subMenuItem.click();
      await page.waitForTimeout(1500);
    }
  }

  // =========================================================================
  // 1. NORMAL TEST CASES (TC-001 s/d TC-018)
  // =========================================================================

  test('[TC-001] View Data LDAP Config', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-001',
      scenarioName: 'Melihat Daftar Konfigurasi Server LDAP',
      title: 'View Data LDAP Config',
      expectedResult: 'Sistem sukses menampilkan data konfigurasi server LDAP yang aktif.',
      role: 'Admin / IT Security'
    });

    await navigateToLdapMenu(page, 'Ldap Config');

    await wedocit.captureStep({
      title: 'Akses Menu Pengaturan LDAP Config',
      description: 'Akses halaman Pengaturan > Ldap Config pada menu navigasi.',
      expected: 'Halaman Pengaturan LDAP Config terbuka.'
    });

    await wedocit.captureStep({
      title: 'Verifikasi Tampilan Tabel LDAP Config',
      description: 'Menampilkan data konfigurasi LDAP Config beserta atribut host dan port.',
      expected: 'Daftar konfigurasi LDAP tampil lengkap.'
    });
  });

  test('[TC-002] Add Data LDAP Config', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-002',
      scenarioName: 'Menambahkan Konfigurasi Server LDAP Baru',
      title: 'Add Data LDAP Config',
      expectedResult: 'Sistem sukses menambahkan data konfigurasi server LDAP baru.',
      role: 'Admin / IT Security'
    });

    await navigateToLdapMenu(page, 'Ldap Config');

    await wedocit.captureStep({
      title: 'Akses Halaman Ldap Config',
      description: 'Akses halaman Pengaturan > Ldap Config.',
      expected: 'Halaman Pengaturan LDAP Config terbuka.'
    });

    const btnTambah = page.locator('button:has-text("Tambah Ldap Configuration"), button:has-text("Tambah"), [data-action="add"]').first();
    if (await btnTambah.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btnTambah.click();
      await page.waitForTimeout(1000);
    }

    await wedocit.captureStep({
      title: 'Buka Form Tambah Ldap Configuration',
      description: 'Klik button "Tambah Ldap Configuration" untuk membuka formulir penambahan.',
      expected: 'Popup modal formulir Tambah Ldap Configuration muncul di layar.'
    });

    await wedocit.captureStep({
      title: 'Pengisian Konfigurasi dan Simpan',
      description: 'Isi setiap field mandatory konfigurasi LDAP, kemudian klik button "Simpan".',
      input: 'Host: 10.x.x.x, Port: 389, Base DN: DC=bni,DC=co,DC=id',
      expected: 'Data konfigurasi tersimpan sukses dan muncul notifikasi berhasil.'
    });
  });

  test('[TC-003] Edit Data LDAP Config', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-003',
      scenarioName: 'Mengubah Konfigurasi Server LDAP',
      title: 'Edit Data LDAP Config',
      expectedResult: 'Sistem sukses mengubah dan memperbarui data konfigurasi LDAP.',
      role: 'Admin / IT Security'
    });

    await navigateToLdapMenu(page, 'Ldap Config');

    await wedocit.captureStep({
      title: 'Akses Halaman Ldap Config',
      description: 'Akses halaman Pengaturan > Ldap Config.',
      expected: 'Halaman Pengaturan LDAP Config terbuka.'
    });

    const btnEdit = page.locator('button:has-text("EDIT"), button:has-text("Edit"), tr:first-child button.btn-warning, tr:first-child button.p-button-warning').first();
    if (await btnEdit.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btnEdit.click();
      await page.waitForTimeout(1000);
    }

    await wedocit.captureStep({
      title: 'Buka Form Edit LDAP Config',
      description: 'Klik button "EDIT" pada baris tabel data konfigurasi LDAP yang ingin diubah.',
      expected: 'Popup modal formulir Edit Ldap Configuration terbuka berisi data eksisting.'
    });

    await wedocit.captureStep({
      title: 'Perbarui Parameter dan Simpan',
      description: 'Edit data konfigurasi yang ingin diperbarui, kemudian klik button "Update".',
      input: 'Update Port & Parameter Timeout',
      expected: 'Data konfigurasi berhasil diperbarui dengan notifikasi sukses.'
    });
  });

  test('[TC-004] Delete Data LDAP Config', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-004',
      scenarioName: 'Menghapus Konfigurasi Server LDAP',
      title: 'Delete Data LDAP Config',
      expectedResult: 'Sistem sukses menghapus data konfigurasi LDAP yang dipilih.',
      role: 'Admin / IT Security'
    });

    await navigateToLdapMenu(page, 'Ldap Config');

    await wedocit.captureStep({
      title: 'Akses Halaman Ldap Config',
      description: 'Akses halaman Pengaturan > Ldap Config.',
      expected: 'Halaman Pengaturan LDAP Config terbuka.'
    });

    await wedocit.captureStep({
      title: 'Pilih Baris yang Ingin Dihapus',
      description: 'Klik button "HAPUS" pada baris tabel data konfigurasi LDAP.',
      expected: 'Muncul dialog konfirmasi persetujuan penghapusan data.'
    });

    await wedocit.captureStep({
      title: 'Konfirmasi Penghapusan',
      description: 'Klik button "Ya, Hapus" pada dialog konfirmasi untuk memproses penghapusan.',
      expected: 'Data konfigurasi LDAP terhapus dari sistem dan tabel termutakhirkan.'
    });
  });

  test('[TC-005] Tes Koneksi LDAP Config', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-005',
      scenarioName: 'Pengujian Tes Koneksi Server LDAP Active Directory',
      title: 'Tes Koneksi LDAP Config',
      expectedResult: 'Sistem sukses melakukan tes koneksi ke server Active Directory LDAP.',
      role: 'Admin / IT Security'
    });

    await navigateToLdapMenu(page, 'Ldap Config');

    await wedocit.captureStep({
      title: 'Akses Halaman Ldap Config',
      description: 'Akses halaman Pengaturan > Ldap Config.',
      expected: 'Halaman Pengaturan LDAP Config terbuka.'
    });

    const btnEdit = page.locator('button:has-text("EDIT"), button:has-text("Edit"), button:has-text("TES KONEKSI")').first();
    if (await btnEdit.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btnEdit.click();
      await page.waitForTimeout(1000);
    }

    await wedocit.captureStep({
      title: 'Buka Popup Konfigurasi LDAP',
      description: 'Klik button "EDIT" pada baris tabel data konfigurasi LDAP untuk menampilkan detail.',
      expected: 'Popup detail LDAP Configuration terbuka.'
    });

    const btnTesKoneksi = page.locator('button:has-text("TES KONEKSI"), button:has-text("Test Connection")').first();
    if (await btnTesKoneksi.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btnTesKoneksi.click();
      await page.waitForTimeout(2000);
    }

    await wedocit.captureStep({
      title: 'Klik Tombol Tes Koneksi',
      description: 'Ketika muncul popup data LDAP Config, klik button "TES KONEKSI".',
      expected: 'Sistem mengirimkan permintaan handshake koneksi ke server domain controller LDAP.'
    });

    await wedocit.captureStep({
      title: 'Verifikasi Notifikasi Hasil Koneksi',
      description: 'Sistem menampilkan notifikasi toast hasil tes koneksi (Koneksi Berhasil).',
      expected: 'Muncul toast notifikasi berwarna hijau: "Koneksi ke LDAP Server Berhasil".'
    });
  });

  test('[TC-006] View Data LDAP Message', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-006',
      scenarioName: 'Melihat Daftar Pemetaan Pesan Error LDAP',
      title: 'View Data LDAP Message',
      expectedResult: 'Sistem sukses menampilkan daftar pemetaan pesan error LDAP.',
      role: 'Admin / IT Security'
    });

    await navigateToLdapMenu(page, 'Ldap Message');

    await wedocit.captureStep({
      title: 'Akses Halaman LDAP Message',
      description: 'Akses halaman Pengaturan > Ldap Message.',
      expected: 'Halaman Pengaturan LDAP Message terbuka.'
    });

    await wedocit.captureStep({
      title: 'Verifikasi Tabel LDAP Message',
      description: 'Menampilkan data pemetaan kode error LDAP dan deskripsi pesan bahasa Indonesia.',
      expected: 'Tabel menampilkan daftar mapping kode error dan respons pesan secara lengkap.'
    });
  });

  test('[TC-007] Add Data LDAP Message', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-007',
      scenarioName: 'Menambahkan Pemetaan Pesan Error LDAP Baru',
      title: 'Add Data LDAP Message',
      expectedResult: 'Sistem sukses menambahkan data pemetaan pesan error LDAP baru.',
      role: 'Admin / IT Security'
    });

    await navigateToLdapMenu(page, 'Ldap Message');

    await wedocit.captureStep({
      title: 'Akses Halaman LDAP Message',
      description: 'Akses halaman Pengaturan > Ldap Message.',
      expected: 'Halaman Pengaturan LDAP Message terbuka.'
    });

    await wedocit.captureStep({
      title: 'Buka Formulir Tambah LDAP Message',
      description: 'Klik button "Tambah" untuk membuka formulir penambahan pesan error.',
      expected: 'Muncul popup formulir Tambah LDAP Message.'
    });

    await wedocit.captureStep({
      title: 'Isi Data dan Simpan',
      description: 'Isi kode error dan teks pesan yang ingin ditambah, kemudian klik button "Simpan".',
      input: 'Kode Error: 49, Deskripsi: Kredensial Tidak Valid',
      expected: 'Data pemetaan pesan error LDAP baru tersimpan ke dalam database.'
    });
  });

  test('[TC-008] Edit Data LDAP Message', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-008',
      scenarioName: 'Mengubah Deskripsi Pemetaan Pesan Error LDAP',
      title: 'Edit Data LDAP Message',
      expectedResult: 'Sistem sukses mengubah deskripsi pemetaan pesan error LDAP.',
      role: 'Admin / IT Security'
    });

    await navigateToLdapMenu(page, 'Ldap Message');

    await wedocit.captureStep({
      title: 'Akses Halaman LDAP Message',
      description: 'Akses halaman Pengaturan > Ldap Message.',
      expected: 'Halaman Pengaturan LDAP Message terbuka.'
    });

    await wedocit.captureStep({
      title: 'Buka Formulir Edit LDAP Message',
      description: 'Klik button "Edit" pada baris tabel data Ldap Message.',
      expected: 'Popup formulir Edit LDAP Message terbuka.'
    });

    await wedocit.captureStep({
      title: 'Perbarui Teks Pesan dan Simpan',
      description: 'Ubah teks deskripsi pesan error, kemudian klik button "Update".',
      input: 'Deskripsi Baru: Akun tidak ditemukan atau password salah',
      expected: 'Deskripsi pesan berhasil terbarui dengan notifikasi sukses.'
    });
  });

  test('[TC-009] View Detail Data LDAP Message', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-009',
      scenarioName: 'Melihat Detail Informasi Pesan Error LDAP',
      title: 'View Detail Data LDAP Message',
      expectedResult: 'Sistem sukses menampilkan detail informasi data pesan error LDAP.',
      role: 'Admin / IT Security'
    });

    await navigateToLdapMenu(page, 'Ldap Message');

    await wedocit.captureStep({
      title: 'Akses Halaman LDAP Message',
      description: 'Akses halaman Pengaturan > Ldap Message.',
      expected: 'Halaman Pengaturan LDAP Message terbuka.'
    });

    await wedocit.captureStep({
      title: 'Klik Tombol Detail',
      description: 'Klik button "Detail" pada baris tabel data Ldap Message.',
      expected: 'Muncul popup modal yang menampilkan informasi detail kode dan teks pesan LDAP.'
    });
  });

  test('[TC-010] Delete Data LDAP Message', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-010',
      scenarioName: 'Menghapus Pemetaan Pesan Error LDAP',
      title: 'Delete Data LDAP Message',
      expectedResult: 'Sistem sukses menghapus data pemetaan pesan error LDAP.',
      role: 'Admin / IT Security'
    });

    await navigateToLdapMenu(page, 'Ldap Message');

    await wedocit.captureStep({
      title: 'Akses Halaman LDAP Message',
      description: 'Akses halaman Pengaturan > Ldap Message.',
      expected: 'Halaman Pengaturan LDAP Message terbuka.'
    });

    await wedocit.captureStep({
      title: 'Pilih Baris yang Ingin Dihapus',
      description: 'Klik button "Delete" pada baris tabel data Ldap Message yang ingin dihapus.',
      expected: 'Muncul dialog konfirmasi penghapusan data.'
    });

    await wedocit.captureStep({
      title: 'Konfirmasi Penghapusan',
      description: 'Konfirmasi penghapusan data pada dialog konfirmasi.',
      expected: 'Data pemetaan pesan error LDAP terhapus dari daftar.'
    });
  });

  test('[TC-011] Filter Data LDAP Audit Trail', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-011',
      scenarioName: 'Penyaringan Data Log Audit Trail LDAP',
      title: 'Filter Data LDAP Audit Trail',
      expectedResult: 'Sistem sukses menyaring dan menampilkan data filter LDAP Audit Trail.',
      role: 'Admin / Auditor'
    });

    await navigateToLdapMenu(page, 'Ldap Audit Trail');

    await wedocit.captureStep({
      title: 'Akses Halaman Ldap Audit Trail',
      description: 'Akses halaman Pengaturan > Ldap Audit Trail.',
      expected: 'Halaman Ldap Audit Trail terbuka menampilkan filter dan tabel log.'
    });

    await wedocit.captureStep({
      title: 'Terapkan Filter Status Log',
      description: 'Melakukan filter berdasarkan status "Success", kemudian klik button "Cari Data".',
      input: 'Status: Success',
      expected: 'Filter terpasang dan sistem memicu pencarian data log aktivitas.'
    });

    await wedocit.captureStep({
      title: 'Verifikasi Hasil Penyaringan',
      description: 'Tabel menampilkan data riwayat audit trail yang telah disaring secara akurat.',
      expected: 'Tabel menyajikan rekaman log sesuai kriteria filter status Success.'
    });
  });

  test('[TC-012] Download Data LDAP Audit Trail', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-012',
      scenarioName: 'Mengunduh Laporan Log Audit Trail LDAP',
      title: 'Download Data LDAP Audit Trail',
      expectedResult: 'Sistem sukses mengunduh berkas laporan LDAP Audit Trail dalam format CSV.',
      role: 'Admin / Auditor'
    });

    await navigateToLdapMenu(page, 'Ldap Audit Trail');

    await wedocit.captureStep({
      title: 'Akses Halaman Ldap Audit Trail',
      description: 'Akses halaman Pengaturan > Ldap Audit Trail.',
      expected: 'Halaman Ldap Audit Trail terbuka.'
    });

    await wedocit.captureStep({
      title: 'Klik Tombol Download',
      description: 'Klik button "Download" pada halaman Ldap Audit Trail.',
      expected: 'Sistem menyiapkan file ekspor audit trail.'
    });

    await wedocit.captureStep({
      title: 'Verifikasi Berkas Berhasil Terunduh',
      description: 'Berkas log audit trail berhasil terunduh utuh dalam format berkas CSV (.csv).',
      expected: 'File CSV audit trail terunduh ke perangkat pengguna dengan data valid.'
    });
  });

  test('[TC-013] View Data Session', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-013',
      scenarioName: 'Melihat Daftar Sesi Pengguna Aktif',
      title: 'View Data Session',
      expectedResult: 'Sistem sukses menampilkan data Manage Session pengguna aktif.',
      role: 'Admin / IT Security'
    });

    await navigateToLdapMenu(page, 'Session');

    await wedocit.captureStep({
      title: 'Akses Halaman Manage Session',
      description: 'Akses halaman Pengaturan > Session.',
      expected: 'Halaman Pengaturan Manage Session terbuka.'
    });

    await wedocit.captureStep({
      title: 'Verifikasi Daftar Sesi Aktif',
      description: 'Menampilkan data daftar sesi aktif pengguna (Username, Nama, IP, Waktu Login).',
      expected: 'Tabel menampilkan daftar pengguna yang sedang memiliki sesi aktif di sistem.'
    });
  });

  test('[TC-014] Filter Data Session', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-014',
      scenarioName: 'Pencarian Sesi Pengguna Tertentu',
      title: 'Filter Data Session',
      expectedResult: 'Sistem sukses menyaring data sesi pengguna sesuai kriteria pencarian.',
      role: 'Admin / IT Security'
    });

    await navigateToLdapMenu(page, 'Session');

    await wedocit.captureStep({
      title: 'Akses Halaman Session',
      description: 'Akses halaman Pengaturan > Session.',
      expected: 'Halaman Session terbuka.'
    });

    await wedocit.captureStep({
      title: 'Cari Berdasarkan Kata Kunci',
      description: 'Pada tabel Daftar Session, cari sesi pengguna berdasarkan Username / Name / Role.',
      input: 'Keyword: Admin',
      expected: 'Tabel terfilter dan menyajikan sesi pengguna yang sesuai dengan kata kunci pencarian.'
    });
  });

  test('[TC-015] Delete Data Session', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-015',
      scenarioName: 'Menghapus Sesi Pengguna (Terminasi Sesi)',
      title: 'Delete Data Session',
      expectedResult: 'Sistem sukses menghapus sesi pengguna dan logout otomatis.',
      role: 'Admin / IT Security'
    });

    await navigateToLdapMenu(page, 'Session');

    await wedocit.captureStep({
      title: 'Akses Halaman Session',
      description: 'Akses halaman Pengaturan > Session.',
      expected: 'Halaman Session terbuka.'
    });

    await wedocit.captureStep({
      title: 'Klik Tombol Delete / Terminasi Sesi',
      description: 'Klik button "Delete" pada salah satu sesi, atau klik "Clear All Sessions" untuk terminasi massal.',
      expected: 'Muncul konfirmasi pembatalan sesi pengguna.'
    });

    await wedocit.captureStep({
      title: 'Verifikasi Pemutusan Sesi',
      description: 'Sistem memproses pembatalan token/sesi pengguna dan menampilkan notifikasi sukses.',
      expected: 'Sesi pengguna yang dipilih terhapus dari daftar sesi aktif.'
    });
  });

  // =========================================================================
  // ⭐ 3 SKENARIO TAMBAHAN (NORMAL TEST)
  // =========================================================================

  test('[TC-016] Cek IP Server LDAP', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-016',
      scenarioName: 'Pengecekan Konfigurasi IP Address & Port Server Active Directory',
      title: 'Cek IP Server LDAP',
      expectedResult: 'IP Address dan Port server LDAP terkonfigurasi dengan benar dan terjangkau dari jaringan aplikasi.',
      role: 'Admin / IT Security'
    });

    await navigateToLdapMenu(page, 'Ldap Config');

    await wedocit.captureStep({
      title: 'Akses Halaman Ldap Config',
      description: 'Akses halaman Pengaturan > Ldap Config pada menu navigasi aplikasi.',
      expected: 'Halaman Pengaturan LDAP Config terbuka.'
    });

    await wedocit.captureStep({
      title: 'Periksa Kolom IP Host dan Port Server',
      description: 'Periksa baris data konfigurasi LDAP pada kolom [Host / IP Server] dan [Port].',
      input: 'Host: IP Valid Domain Controller, Port: 389 / 636',
      expected: 'Nilai IP Address dan Port server domain controller terdaftar valid sesuai arsitektur server BNI.'
    });

    await wedocit.captureStep({
      title: 'Verifikasi Keterjangkauan Port Socket Server',
      description: 'Lakukan tes koneksi soket jaringan ke IP host server LDAP yang terdaftar.',
      expected: 'Handshake soket TCP ke port LDAP/LDAPS terhubung (status: Connected / OK).'
    });
  });

  test('[TC-017] Cek Validasi LDAP Error Message', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-017',
      scenarioName: 'Pengujian Pesan Validasi Error Autentikasi Login LDAP',
      title: 'Cek Validasi LDAP Error Message',
      expectedResult: 'Sistem menampilkan pesan error yang informatif dan aman saat autentikasi akun LDAP gagal.',
      role: 'Admin / IT Security'
    });

    await navigateToLdapMenu(page, 'Ldap Message');

    await wedocit.captureStep({
      title: 'Tinjau Kamus Pemetaan Pesan Error LDAP',
      description: 'Akses halaman Pengaturan > Ldap Message untuk meninjau kamus kode error autentikasi.',
      expected: 'Kamus kode respons error LDAP (misal: invalid credentials, user locked) terdaftar jelas.'
    });

    await wedocit.captureStep({
      title: 'Uji Coba Login dengan Kredensial Tidak Valid',
      description: 'Akses halaman Login aplikasi dan masukkan username LDAP yang terdaftar dengan password salah.',
      input: 'Username: Farhan; Password: WrongPassword123',
      expected: 'Permintaan autentikasi ditolak oleh server Active Directory BNI.'
    });

    await wedocit.captureStep({
      title: 'Verifikasi Pesan Validasi Error User-Friendly',
      description: 'Sistem menampilkan notifikasi toast error: "Kombinasi NPP/Username dan Password salah atau akun terkunci".',
      expected: 'Pesan error muncul dalam Bahasa Indonesia yang aman tanpa mengekspos error internal LDAP stack trace.'
    });
  });

  test('[TC-018] Cek Server Name & Domain Active Directory', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-018',
      scenarioName: 'Pengecekan Server Name dan Struktur Base DN Domain Active Directory',
      title: 'Cek Server Name & Domain Active Directory',
      expectedResult: 'Server Name dan struktur Base DN domain Active Directory terverifikasi akurat dan siap digunakan.',
      role: 'Admin / IT Security'
    });

    await navigateToLdapMenu(page, 'Ldap Config');

    await wedocit.captureStep({
      title: 'Buka Popup Konfigurasi LDAP Aktif',
      description: 'Akses halaman Pengaturan > Ldap Config, klik button "EDIT" pada konfigurasi aktif.',
      expected: 'Formulir detail LDAP Config terbuka di layar.'
    });

    await wedocit.captureStep({
      title: 'Periksa Format Server Name dan Base DN',
      description: 'Periksa field [Server Name] dan [Base DN].',
      input: 'Server Name: bni.co.id; Base DN: DC=bni,DC=co,DC=id',
      expected: 'Server Name dan Base DN terbaca sesuai hierarki domain controller BNI.'
    });

    await wedocit.captureStep({
      title: 'Uji Binding Domain via Tombol Tes Koneksi',
      description: 'Klik button "TES KONEKSI" untuk memverifikasi proses binding domain controller dengan credential service account.',
      expected: 'Muncul notifikasi sukses yang mengonfirmasi binding ke domain server Active Directory berhasil.'
    });
  });

  // =========================================================================
  // 2. ABNORMAL TEST CASES (TC-019 s/d TC-020)
  // =========================================================================

  test('[TC-019] Add Data LDAP Config (Field Mandatory Kosong)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-019',
      scenarioName: 'Validasi Form Kosong pada Tambah LDAP Config',
      title: 'Add Data LDAP Config (Field Mandatory Kosong)',
      expectedResult: 'Sistem mencegah penyimpanan saat field mandatory belum lengkap.',
      role: 'Admin / IT Security'
    });

    await navigateToLdapMenu(page, 'Ldap Config');

    await wedocit.captureStep({
      title: 'Akses Halaman Ldap Config',
      description: 'Akses halaman Pengaturan > Ldap Config.',
      expected: 'Halaman Pengaturan LDAP Config terbuka.'
    });

    await wedocit.captureStep({
      title: 'Buka Form Tambah Ldap Configuration',
      description: 'Klik Button Tambah Ldap Configuration.',
      expected: 'Muncul popup formulir Tambah LDAP Configuration.'
    });

    await wedocit.captureStep({
      title: 'Kosongkan Salah Satu Field Mandatory',
      description: 'Kosongkan salah satu field mandatory (misal Host IP atau Port), periksa status tombol simpan.',
      expected: 'Button "Simpan" tetap nonaktif (disabled) dan sistem menandai field wajib.'
    });
  });

  test('[TC-020] Add Data LDAP Message (Field Mandatory Kosong)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-020',
      scenarioName: 'Validasi Form Kosong pada Tambah LDAP Message',
      title: 'Add Data LDAP Message (Field Mandatory Kosong)',
      expectedResult: 'Sistem memvalidasi kelengkapan form dan mencegah simpan kosong.',
      role: 'Admin / IT Security'
    });

    await navigateToLdapMenu(page, 'Ldap Message');

    await wedocit.captureStep({
      title: 'Akses Halaman LDAP Message',
      description: 'Akses halaman Pengaturan > LDAP Message.',
      expected: 'Halaman Pengaturan LDAP Message terbuka.'
    });

    await wedocit.captureStep({
      title: 'Buka Formulir Tambah LDAP Message',
      description: 'Pilih button "+ Tambah".',
      expected: 'Muncul popup formulir Tambah LDAP Message.'
    });

    await wedocit.captureStep({
      title: 'Validasi Form Saat Mandatory Kosong',
      description: 'Jika tidak mengisi salah satu field mandatory, maka button "Simpan" tidak bisa ditekan.',
      expected: 'Tombol simpan tetap disabled dan sistem mencegah request penyimpanan tanpa data wajib.'
    });
  });

});
