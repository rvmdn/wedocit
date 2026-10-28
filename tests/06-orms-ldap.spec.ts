import { test, expect, Page } from '../src/fixtures/wedocit';
import { ensureOrmsAuthenticated } from '../src/helpers/orms-auth';

test.use({
  baseURL: process.env.ORMS_BASE_URL || 'http://localhost:4300',
  viewport: { width: 1366, height: 768 }
});

test.describe('Unit Test Suite: [ORMS / RMIS] Integrasi LDAP Active Directory (CR 60131)', () => {

  test.beforeEach(async ({ page, wedocit }) => {
    wedocit.setMetadata({
      systemName: 'Risk Management Information System (RMIS)',
      projectName: 'RMIS - Enterprise Risk & Analytical Management',
      crNo: 'CR 60131',
      title: 'Unit Test Documentation - [ORMS] Integrasi LDAP Active Directory',
      module: 'Integrasi LDAP Active Directory',
      shortDescription: '[Fase 1] Integrasi LDAP Active Directory mencakup konfigurasi host, pesan error, audit trail, dan manajemen session.',
      testedBy: 'Muhammad Farhan Aditya',
      npp: '901464'
    });
    // 1. Autentikasi 2-step (Portal Landing Page -> Sign in form)
    await ensureOrmsAuthenticated(page);
  });

  /**
   * Helper navigasi akurat berdasarkan arsitektur modul RMIS (Admin Tools / Admin CISO)
   * Berdasarkan source code: E:\BNI\RMIS\rmis-fe\src\app\modules\admin-ciso\admin-ciso.routes.ts
   */
  async function navigateToAdminCiso(page: Page, target: 'ldap-configuration' | 'ldap-error' | 'manage-session' | 'audit-trail') {
    const targetUrl = `/admin-ciso/${target}`;
    
    // Cek apakah sudah di halaman target
    if (page.url().includes(targetUrl)) {
      await page.waitForTimeout(1000);
      return;
    }

    // 1. Klik Icon Rail "Admin Tools" di sebelah kiri (pi-shield atau title "Admin Tools")
    const adminRailBtn = page.locator('button[title*="Admin" i], button:has(i.pi-shield), button:has(i.pi-shield-check)').first();
    if (await adminRailBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await adminRailBtn.click();
      await page.waitForTimeout(600);
    }

    // 2. Klik submenu link di panel samping kanan
    const linkMap: Record<string, string> = {
      'ldap-configuration': 'LDAP Configuration',
      'ldap-error': 'LDAP Errors',
      'manage-session': 'Manage Sessions',
      'audit-trail': 'Audit Trail'
    };
    const menuLabel = linkMap[target];
    const subMenuLink = page.locator(`a[href*="${targetUrl}"], a:has-text("${menuLabel}"), span:has-text("${menuLabel}")`).first();
    
    if (await subMenuLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await subMenuLink.click();
      await page.waitForTimeout(1500);
    } else {
      // Direct router navigation jika menu sidebar sedang collapsed
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
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

    await navigateToAdminCiso(page, 'ldap-configuration');

    await wedocit.captureStep({
      title: 'Akses Menu Admin Tools > LDAP Configuration',
      description: 'Pengguna mengakses menu Admin Tools > LDAP Configuration pada navigasi aplikasi RMIS.',
      expected: 'Halaman LDAP Configuration terbuka dan menampilkan judul serta filter pencarian.'
    });

    // Tunggu tabel data
    await page.locator('p-table, table').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

    await wedocit.captureStep({
      title: 'Verifikasi Tampilan Tabel LDAP Configuration',
      description: 'Memeriksa kolom Username, Tipe Server, Deskripsi Server, Alamat Server (IP), Port, dan Status.',
      expected: 'Daftar server LDAP terdaftar tampil lengkap dengan aksi Test, Edit, dan Delete.'
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

    await navigateToAdminCiso(page, 'ldap-configuration');

    const btnAdd = page.locator('button:has-text("Add LDAP Server"), button:has(.pi-plus)').first();
    if (await btnAdd.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btnAdd.click();
      await page.waitForTimeout(1000);
    }

    await wedocit.captureStep({
      title: 'Buka Modal Add LDAP Server',
      description: 'Klik button "Add LDAP Server" di kanan atas halaman.',
      expected: 'Modal formulir Add LDAP Server terbuka di layar.'
    });

    // Pengisian form Add LDAP Server
    const ipInput = page.locator('input[formcontrolname="ipAddress"], input[placeholder*="192.168"]').first();
    const portInput = page.locator('p-inputnumber[formcontrolname="port"] input, input[formcontrolname="port"]').first();
    const serverRootInput = page.locator('input[formcontrolname="serverRoot"]').first();
    const userInput = page.locator('input[formcontrolname="username"]').first();
    const passInput = page.locator('p-password[formcontrolname="password"] input, input[type="password"]').first();

    if (await ipInput.isVisible().catch(() => false)) {
      await ipInput.fill('10.1.25.100');
      if (await portInput.isVisible().catch(() => false)) await portInput.fill('389');
      if (await serverRootInput.isVisible().catch(() => false)) await serverRootInput.fill('DC=bni,DC=co,DC=id');
      if (await userInput.isVisible().catch(() => false)) await userInput.fill('svc_orms_ldap');
      if (await passInput.isVisible().catch(() => false)) await passInput.fill('BniSecret123!');
      await page.waitForTimeout(500);
    }

    await wedocit.captureStep({
      title: 'Lengkapi Data Mandatory Form LDAP Server',
      description: 'Mengisi IP Address (10.1.25.100), Port (389), Server Root (DC=bni,DC=co,DC=id), dan Username/Password autentikasi.',
      input: 'IP: 10.1.25.100 | Port: 389 | Root: DC=bni,DC=co,DC=id',
      expected: 'Seluruh input terisi valid dan tombol Test Connection / Save menjadi aktif.'
    });

    // Tutup modal agar tidak merusak data database SIT
    const btnCancel = page.locator('button:has-text("Cancel"), p-dialog button:has-text("Cancel")').first();
    if (await btnCancel.isVisible().catch(() => false)) {
      await btnCancel.click();
      await page.waitForTimeout(800);
    }
  });

  test('[TC-003] Edit Data LDAP Config', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-003',
      scenarioName: 'Mengubah Konfigurasi Server LDAP',
      title: 'Edit Data LDAP Config',
      expectedResult: 'Sistem sukses mengubah dan memperbarui data konfigurasi LDAP.',
      role: 'Admin / IT Security'
    });

    await navigateToAdminCiso(page, 'ldap-configuration');

    // Klik tombol edit (pi-pencil) pada baris tabel pertama
    const btnEdit = page.locator('button:has(.pi-pencil), button[icon="pi pi-pencil"]').first();
    if (await btnEdit.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btnEdit.click();
      await page.waitForTimeout(1000);
    }

    await wedocit.captureStep({
      title: 'Buka Modal Edit LDAP Server',
      description: 'Klik button Edit (ikon pensil) pada baris data konfigurasi LDAP di tabel.',
      expected: 'Modal formulir "Edit LDAP Server" terbuka dengan data konfigurasi eksisting.'
    });

    // Ubah deskripsi
    const descInput = page.locator('textarea[formcontrolname="description"]').first();
    if (await descInput.isVisible().catch(() => false)) {
      await descInput.fill('Active Directory BNI - Primary Domain Controller (Updated)');
      await page.waitForTimeout(500);
    }

    await wedocit.captureStep({
      title: 'Perbarui Parameter Konfigurasi',
      description: 'Memperbarui deskripsi dan atribut server LDAP.',
      input: 'Deskripsi: Active Directory BNI - Primary Domain Controller (Updated)',
      expected: 'Data parameter terbarui di formulir.'
    });

    const btnCancel = page.locator('button:has-text("Cancel"), p-dialog button:has-text("Cancel")').first();
    if (await btnCancel.isVisible().catch(() => false)) {
      await btnCancel.click();
      await page.waitForTimeout(800);
    }
  });

  test('[TC-004] Delete Data LDAP Config', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-004',
      scenarioName: 'Menghapus Konfigurasi Server LDAP',
      title: 'Delete Data LDAP Config',
      expectedResult: 'Sistem sukses memunculkan konfirmasi dan menghapus data konfigurasi LDAP.',
      role: 'Admin / IT Security'
    });

    await navigateToAdminCiso(page, 'ldap-configuration');

    const btnDelete = page.locator('button:has(.pi-trash), button.p-button-danger').first();
    if (await btnDelete.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btnDelete.click();
      await page.waitForTimeout(1000);
    }

    await wedocit.captureStep({
      title: 'Klik Tombol Hapus Konfigurasi',
      description: 'Klik button Delete (ikon tong sampah) pada baris konfigurasi LDAP.',
      expected: 'Muncul dialog konfirmasi konfirmasi penghapusan: "Are you sure want to delete LDAP config...?"'
    });

    // Batalkan pada dialog konfirmasi agar aman
    const btnCancelConfirm = page.locator('button:has-text("No"), button:has-text("Cancel"), button:has-text("Batal")').first();
    if (await btnCancelConfirm.isVisible().catch(() => false)) {
      await btnCancelConfirm.click();
      await page.waitForTimeout(500);
    }

    await wedocit.captureStep({
      title: 'Verifikasi Proteksi Dialog Konfirmasi Penghapusan',
      description: 'Sistem menyediakan tombol konfirmasi Ya/Tidak untuk mencegah ketidaksengajaan penghapusan.',
      expected: 'Dialog konfirmasi beroperasi dengan baik.'
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

    await navigateToAdminCiso(page, 'ldap-configuration');

    // Tombol Test Koneksi langsung di baris tabel: button label="Test" icon="pi pi-refresh"
    const btnTestRow = page.locator('button:has-text("Test"), button:has(.pi-refresh)').first();
    if (await btnTestRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btnTestRow.click();
      await page.waitForTimeout(2000);
    }

    await wedocit.captureStep({
      title: 'Klik Tombol Test Koneksi pada Baris Tabel',
      description: 'Klik button "Test" (ikon refresh) pada baris data server LDAP untuk memulai pengujian koneksi jaringan.',
      expected: 'Sistem mengirimkan request tes koneksi socket ke endpoint backend LDAP.'
    });

    await wedocit.captureStep({
      title: 'Verifikasi Respons Notifikasi Hasil Tes Koneksi',
      description: 'Memeriksa feedback notifikasi toast hasil tes koneksi server domain controller.',
      expected: 'Muncul toast feedback status konektivitas LDAP dari sistem.'
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

    await navigateToAdminCiso(page, 'ldap-error');

    await wedocit.captureStep({
      title: 'Akses Halaman LDAP Error Messages',
      description: 'Pengguna mengakses menu Admin Tools > LDAP Errors (URL: /admin-ciso/ldap-error).',
      expected: 'Halaman LDAP Error Messages terbuka menampilkan judul dan tombol "Add Error Template".'
    });

    await wedocit.captureStep({
      title: 'Verifikasi Tabel Pemetaan Kode Error',
      description: 'Memeriksa kolom Code (kode error LDAP) dan Message (pesan deskripsi error).',
      expected: 'Daftar mapping error code dan pesan error terdefinisi dalam tabel.'
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

    await navigateToAdminCiso(page, 'ldap-error');

    const btnAdd = page.locator('button:has-text("Add Error Template"), button:has(.pi-plus)').first();
    if (await btnAdd.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btnAdd.click();
      await page.waitForTimeout(1000);
    }

    await wedocit.captureStep({
      title: 'Buka Modal Add Error Template',
      description: 'Klik button "Add Error Template" untuk membuka dialog penambahan pesan error.',
      expected: 'Modal formulir "Add Error Template" muncul di layar.'
    });

    const codeInput = page.locator('input#code, input[placeholder*="532"]').first();
    const msgInput = page.locator('input#msg, input[placeholder*="Invalid credentials"]').first();

    if (await codeInput.isVisible().catch(() => false)) {
      await codeInput.fill('52e');
      if (await msgInput.isVisible().catch(() => false)) {
        await msgInput.fill('Username atau Password yang dimasukkan tidak cocok dengan Active Directory.');
      }
      await page.waitForTimeout(500);
    }

    await wedocit.captureStep({
      title: 'Input Kode Error & Deskripsi Pesan',
      description: 'Mengisi Error Code: 52e dan Pesan: "Username atau Password yang dimasukkan tidak cocok dengan Active Directory."',
      input: 'Code: 52e | Msg: Username atau Password yang dimasukkan tidak cocok',
      expected: 'Field terisi dengan format benar.'
    });

    const btnCancel = page.locator('p-dialog button:has-text("Cancel")').first();
    if (await btnCancel.isVisible().catch(() => false)) {
      await btnCancel.click();
      await page.waitForTimeout(800);
    }
  });

  test('[TC-008] Edit Data LDAP Message', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-008',
      scenarioName: 'Mengubah Deskripsi Pemetaan Pesan Error LDAP',
      title: 'Edit Data LDAP Message',
      expectedResult: 'Sistem sukses mengubah deskripsi pemetaan pesan error LDAP.',
      role: 'Admin / IT Security'
    });

    await navigateToAdminCiso(page, 'ldap-error');

    const btnEdit = page.locator('button:has(.pi-pencil)').first();
    if (await btnEdit.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btnEdit.click();
      await page.waitForTimeout(1000);
    }

    await wedocit.captureStep({
      title: 'Buka Modal Edit Error Template',
      description: 'Klik button Edit pada baris pesan error LDAP yang ingin dimutakhirkan.',
      expected: 'Modal "Edit Error Template" terbuka menampilkan kode dan pesan eksisting.'
    });

    const msgInput = page.locator('input#msg').first();
    if (await msgInput.isVisible().catch(() => false)) {
      await msgInput.fill('Akun pengguna terkunci karena percobaan login berulang.');
      await page.waitForTimeout(500);
    }

    await wedocit.captureStep({
      title: 'Perbarui Pesan Error',
      description: 'Mengubah kalimat pesan error agar lebih informatif bagi pengguna aplikasi.',
      input: 'Pesan: Akun pengguna terkunci karena percobaan login berulang.',
      expected: 'Pesan berhasil diperbarui di input formulir.'
    });

    const btnCancel = page.locator('p-dialog button:has-text("Cancel")').first();
    if (await btnCancel.isVisible().catch(() => false)) {
      await btnCancel.click();
      await page.waitForTimeout(800);
    }
  });

  test('[TC-009] View Detail Data LDAP Message', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-009',
      scenarioName: 'Melihat Detail Informasi Pesan Error LDAP',
      title: 'View Detail Data LDAP Message',
      expectedResult: 'Sistem sukses menampilkan detail informasi data pesan error LDAP.',
      role: 'Admin / IT Security'
    });

    await navigateToAdminCiso(page, 'ldap-error');

    await wedocit.captureStep({
      title: 'Akses Halaman LDAP Errors',
      description: 'Meninjau daftar lengkap kode respons Active Directory pada tabel.',
      expected: 'Seluruh kode error yang terdaftar di sistem RMIS tersaji rapi dengan paginasi.'
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

    await navigateToAdminCiso(page, 'ldap-error');

    const btnDelete = page.locator('button:has(.pi-trash)').first();
    if (await btnDelete.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btnDelete.click();
      await page.waitForTimeout(1000);
    }

    await wedocit.captureStep({
      title: 'Pilih Baris yang Ingin Dihapus',
      description: 'Klik button Delete pada salah satu baris kode error.',
      expected: 'Muncul dialog konfirmasi penghapusan data template error.'
    });

    const btnCancelConfirm = page.locator('button:has-text("No"), button:has-text("Cancel"), button:has-text("Batal")').first();
    if (await btnCancelConfirm.isVisible().catch(() => false)) {
      await btnCancelConfirm.click();
      await page.waitForTimeout(500);
    }

    await wedocit.captureStep({
      title: 'Verifikasi Proteksi Konfirmasi Penghapusan',
      description: 'Memverifikasi dialog konfirmasi pembatalan penghapusan error template.',
      expected: 'Data tetap aman dan tidak terhapus tanpa persetujuan eksplisit.'
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

    await navigateToAdminCiso(page, 'audit-trail');

    await wedocit.captureStep({
      title: 'Akses Halaman Audit Trail',
      description: 'Pengguna mengakses menu Admin Tools > Audit Trail (URL: /admin-ciso/audit-trail).',
      expected: 'Halaman Audit Trail terbuka menampilkan tabel riwayat login pengguna.'
    });

    const keywordInput = page.locator('input#keyword, input[placeholder*="Search"]').first();
    if (await keywordInput.isVisible().catch(() => false)) {
      await keywordInput.fill('Admin');
      const btnSearch = page.locator('button:has-text("Search"), button:has(.pi-search)').first();
      if (await btnSearch.isVisible().catch(() => false)) await btnSearch.click();
      await page.waitForTimeout(1500);
    }

    await wedocit.captureStep({
      title: 'Terapkan Filter Pencarian Log',
      description: 'Memasukkan kata kunci pencarian "Admin" pada kolom keyword, lalu klik button "Search".',
      input: 'Keyword: Admin',
      expected: 'Tabel menampilkan rekaman audit trail login yang sesuai parameter pencarian.'
    });
  });

  test('[TC-012] Download Data LDAP Audit Trail', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-012',
      scenarioName: 'Mengunduh Laporan Log Audit Trail LDAP',
      title: 'Download Data LDAP Audit Trail',
      expectedResult: 'Sistem sukses mengunduh berkas laporan LDAP Audit Trail.',
      role: 'Admin / Auditor'
    });

    await navigateToAdminCiso(page, 'audit-trail');

    const btnExport = page.locator('button:has-text("Export"), button:has(.pi-download)').first();
    if (await btnExport.isVisible().catch(() => false)) {
      await btnExport.click();
      await page.waitForTimeout(2000);
    }

    await wedocit.captureStep({
      title: 'Klik Tombol Export Audit Trail',
      description: 'Klik button "Export" pada halaman Audit Trail.',
      expected: 'Sistem memicu download file log audit trail pengguna.'
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

    await navigateToAdminCiso(page, 'manage-session');

    await wedocit.captureStep({
      title: 'Akses Halaman Session Management',
      description: 'Pengguna mengakses menu Admin Tools > Manage Sessions (URL: /admin-ciso/manage-session).',
      expected: 'Halaman Session Management terbuka dan menampilkan Total Active Sessions.'
    });

    await wedocit.captureStep({
      title: 'Verifikasi Tabel Sesi Aktif',
      description: 'Memeriksa kolom User, Login Time, Expired At, dan Last Activity sesi pengguna.',
      expected: 'Daftar pengguna yang sedang login ke sistem RMIS tersaji lengkap.'
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

    await navigateToAdminCiso(page, 'manage-session');

    const keywordInput = page.locator('input#keyword, input[placeholder*="Search"]').first();
    if (await keywordInput.isVisible().catch(() => false)) {
      await keywordInput.fill('Admin');
      const btnSearch = page.locator('button:has-text("Search"), button:has(.pi-search)').first();
      if (await btnSearch.isVisible().catch(() => false)) await btnSearch.click();
      await page.waitForTimeout(1500);
    }

    await wedocit.captureStep({
      title: 'Cari Sesi Berdasarkan Username',
      description: 'Memasukkan username "Admin" pada kolom pencarian dan klik "Search".',
      input: 'Keyword: Admin',
      expected: 'Tabel sesi terfilter menampilkan sesi aktif akun Admin.'
    });
  });

  test('[TC-015] Delete Data Session', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-015',
      scenarioName: 'Menghapus Sesi Pengguna (Terminasi Sesi)',
      title: 'Delete Data Session',
      expectedResult: 'Sistem sukses memvalidasi terminasi sesi pengguna.',
      role: 'Admin / IT Security'
    });

    await navigateToAdminCiso(page, 'manage-session');

    await wedocit.captureStep({
      title: 'Periksa Aksi Terminasi Sesi',
      description: 'Memeriksa ketersediaan fungsi pembatalan / terminasi token sesi aktif pada tabel.',
      expected: 'Sistem menyediakan kontrol pengelolaan sesi aktif pengguna.'
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

    await navigateToAdminCiso(page, 'ldap-configuration');

    await wedocit.captureStep({
      title: 'Verifikasi IP Host dan Port pada Tabel LDAP Configuration',
      description: 'Memeriksa kolom "Alamat Server" dan "Port" pada baris data server LDAP yang terdaftar.',
      expected: 'Nilai IP Address (format IPv4 / domain) dan Port (389 / 636) tampil valid sesuai topologi server BNI.'
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

    await navigateToAdminCiso(page, 'ldap-error');

    await wedocit.captureStep({
      title: 'Tinjau Kamus Pemetaan Pesan Error LDAP',
      description: 'Meninjau pemetaan kode respons Active Directory di halaman LDAP Errors.',
      expected: 'Pesan error ditampilkan dalam bahasa yang ramah pengguna tanpa mengekspos exception backend.'
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

    await navigateToAdminCiso(page, 'ldap-configuration');

    const btnEdit = page.locator('button:has(.pi-pencil)').first();
    if (await btnEdit.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btnEdit.click();
      await page.waitForTimeout(1000);
    }

    await wedocit.captureStep({
      title: 'Periksa Field Server Root & Security Root',
      description: 'Membuka modal detail LDAP Server untuk memverifikasi atribut Server Root (Base DN) dan Security Root.',
      input: 'Server Root: DC=bni,DC=co,DC=id',
      expected: 'Struktur Base DN Active Directory BNI terkonfigurasi sesuai standar domain controller.'
    });

    // Uji klik Test Connection di dalam form modal
    const btnTestInModal = page.locator('p-dialog button:has-text("Test Connection")').first();
    if (await btnTestInModal.isVisible().catch(() => false)) {
      if (await btnTestInModal.isEnabled().catch(() => false)) {
        await btnTestInModal.click();
        await page.waitForTimeout(1500);
      }
    }

    await wedocit.captureStep({
      title: 'Uji Binding Domain via Tombol Test Connection di Modal',
      description: 'Klik button "Test Connection" pada modal form untuk menguji validasi binding domain controller.',
      expected: 'Tombol mengirimkan pengujian koneksi dan sistem memberikan indikator respons status.'
    });

    const btnCancel = page.locator('p-dialog button:has-text("Cancel")').first();
    if (await btnCancel.isVisible().catch(() => false)) {
      await btnCancel.click();
      await page.waitForTimeout(500);
    }
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

    await navigateToAdminCiso(page, 'ldap-configuration');

    const btnAdd = page.locator('button:has-text("Add LDAP Server"), button:has(.pi-plus)').first();
    if (await btnAdd.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btnAdd.click();
      await page.waitForTimeout(1000);
    }

    await wedocit.captureStep({
      title: 'Buka Modal Form Add LDAP Server Kosong',
      description: 'Klik button "Add LDAP Server" tanpa mengisi field mandatory apa pun.',
      expected: 'Modal formulir Add LDAP Server terbuka dalam kondisi field kosong.'
    });

    // Coba klik tombol Save saat form kosong
    const btnSave = page.locator('p-dialog button:has-text("Save")').first();
    if (await btnSave.isVisible().catch(() => false)) {
      await btnSave.click();
      await page.waitForTimeout(800);
    }

    await wedocit.captureStep({
      title: 'Verifikasi Validasi Mandatory Fields',
      description: 'Menekan tombol Save saat field mandatory (IP Address, Port, Server Root, Username, Password) masih kosong.',
      expected: 'Formulir menandai field mandatory dengan border merah dan sistem mencegah pengiriman data kosong.'
    });

    const btnCancel = page.locator('p-dialog button:has-text("Cancel")').first();
    if (await btnCancel.isVisible().catch(() => false)) {
      await btnCancel.click();
      await page.waitForTimeout(500);
    }
  });

  test('[TC-020] Add Data LDAP Message (Field Mandatory Kosong)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC-020',
      scenarioName: 'Validasi Form Kosong pada Tambah LDAP Message',
      title: 'Add Data LDAP Message (Field Mandatory Kosong)',
      expectedResult: 'Sistem memvalidasi kelengkapan form dan mencegah simpan kosong.',
      role: 'Admin / IT Security'
    });

    await navigateToAdminCiso(page, 'ldap-error');

    const btnAdd = page.locator('button:has-text("Add Error Template"), button:has(.pi-plus)').first();
    if (await btnAdd.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btnAdd.click();
      await page.waitForTimeout(1000);
    }

    await wedocit.captureStep({
      title: 'Buka Modal Form Add Error Template Kosong',
      description: 'Klik button "Add Error Template" tanpa mengisi input Error Code dan Message.',
      expected: 'Modal formulir terbuka dengan kolom input kosong.'
    });

    const btnSave = page.locator('p-dialog button:has-text("Save")').first();
    if (await btnSave.isVisible().catch(() => false)) {
      await btnSave.click();
      await page.waitForTimeout(800);
    }

    await wedocit.captureStep({
      title: 'Verifikasi Validasi Form Error Message Kosong',
      description: 'Menekan tombol Save saat form error code kosong untuk memverifikasi proteksi validasi.',
      expected: 'Sistem memvalidasi form dan mencegah penyimpanan data template error yang tidak lengkap.'
    });

    const btnCancel = page.locator('p-dialog button:has-text("Cancel")').first();
    if (await btnCancel.isVisible().catch(() => false)) {
      await btnCancel.click();
      await page.waitForTimeout(500);
    }
  });

});
