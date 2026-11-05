# Changelog - WeDocIt Studio Desktop

Semua perubahan pada proyek **WeDocIt Enterprise Studio** dicatat dalam dokumen ini.

---

## 📌 Standar Penomoran Versi (`v3.x.y`)
WeDocIt saat ini berada pada generasi **v3 (Standalone Desktop Studio)**.
Aturan penomoran versi mengikuti skema:
> **Format Versi:** `v3.x.y`
> - **`x` (Perubahan Major):** Naik `+1` (`v3.(x+1).0`) jika terdapat penambahan modul/fitur pengujian utama baru, integrasi sistem baru, atau perombakan arsitektur besar. Saat `x` naik, `y` direset ke `0`.
> - **`y` (Perubahan Minor):** Naik `+1` (`v3.x.(y+1)`) untuk perbaikan bug (*bugfix*), penyesuaian skenario test case minor, pembaruan skrip runner, perbaikan tampilan UI, atau refactoring kecil.

---

## [v3.3.0] - 2026-11-05
### Major Feature & Spec Automation Engine (`x` +1)
- **Active Code-Driven Playwright Spec Generator (`server.js`):**
  - Generator Playwright spec (`generatePlaywrightSpecFromDocument`) tidak lagi sekadar menghasilkan placeholder `captureStep` statis.
  - **Dynamic Route Navigation**: Mendeteksi aksi/input pengujian yang menuju ke modul/sub-modul terkait (seperti `/rbbr`, `/mio`, `/risk-management`, `/admin`, dll.) dan secara otomatis mengompilasi perintah `navigateToRmis(page, targetUrl)`.
  - **Interactive Element Execution & Highlight**: Mendeteksi interaksi klik tombol, pill switcher sumber data (seperti `Semua Data (3 Source)`, `RBBR`, `MIO`, `MRM`), mengeksekusi klik Playwright, dan otomatis memberikan highlight visual pada tangkapan layar.
  - Hasil screenshot pada dokumen kini memuat evidensi riil dan berbeda-beda dari modul yang dituju, bukan screenshot halaman statis yang sama.

---

## [v3.2.2] - 2026-11-05
### Bugfix & Reliability (`y` +1)
- **Fix "URL Belum Terekam" False Positive & Auto-Populate `pageUrl`:**
  - `analyzeComponentAndBuildTestCases` di `server.js` kini otomatis menyertakan `pageUrl: targetUrl` pada setiap langkah yang dirancang dari source code (AI Chat).
  - Modal audit screenshot (`openScreenshotAuditModal` di `editor.js`) kini memiliki fallback cerdas ke `doc.metadata.testUrl` atau `http://localhost:4300/` jika `st.pageUrl` belum terisi, mencegah deteksi salah (*false positive*) sebagai "Suspect Loading".
  - Heuristik loading disempurnakan hanya untuk layar yang benar-benar tertahan di status `about:blank`.

---

## [v3.2.1] - 2026-11-05
### Bugfix & Reliability (`y` +1)
- **Fix Auto-Fix / Single TC Runner Cross-Document Hijack:**
  - Mengirim parameter `specFile` dokumen aktif secara eksplisit dari `editor.js` (`runSingleTestCase` & `triggerAutoFixTc`).
  - Menghapus hardcoded fallback `tests/08-rmis-admin-management.spec.ts` di endpoint `POST /api/auto-repair-tc`.
  - Mengimplementasikan *Dynamic Spec Resolution* di `server.js` (mencocokkan `targetDoc.metadata.specFile`, ID dokumen di dalam file `.spec.ts`, atau slug nama modul).
  - Menyimpan referensi `specFile` ke dalam `workspace.json` saat generate spec via button `⚡ Buat Spec dari Dokumen Ini`.
  - Memperbarui `syncResultsInternal(callerDocId)` agar mempertahankan dokumen aktif pemanggil dan tidak membajak tampilan UI ke modul lain.
- **Enhanced Dropdown Suite Labels:**
  - Menambahkan auto-extraction judul suite `test.describe` untuk spec yang baru di-generate pada endpoint `GET /api/specs`.

---

## [v3.2.0] - 2026-11-05
### Major Change (`x` +1)
- **Arsitektur Pengujian Modular V2.0 (1 File Spec per Skenario):**
  - Memecah suite monolitik 2.500 baris menjadi folder modular [`tests/09-rmis-admin-management-v2/`](tests/09-rmis-admin-management-v2/) dengan 15 file independen (`tc-001-manage-unit.spec.ts` s/d `tc-015-audit-trail.spec.ts`).
  - Menyediakan file bersama [`_common.ts`](tests/09-rmis-admin-management-v2/_common.ts) untuk shared setup, helper navigasi, dan konfigurasi metadata V2.0.
  - Mempersingkat waktu uji per skenario dari ~10 menit menjadi ~20–30 detik per skenario dan mereduksi token AI hingga ~95%.
- **Eksekusi 1-Klik Langsung dari UI Studio:**
  - Menambahkan tombol **`⚡ Jalankan TC Ini`** pada header setiap kartu Test Case di editor untuk menguji dan memperbarui eviden tangkapan layar skenario tertentu secara instan.
  - Smart Routing pada endpoint `/api/auto-repair-tc` yang secara otomatis memetakan nomor TC ke file modular yang bersangkutan saat membuka dokumen V2.0.
  - Memperbarui `/api/specs` agar secara rekursif memindai subfolder spec dan menampilkan ke-15 skenario modular pada dropdown dialog runner.
- **Evidens Otentik Unduhan Berkas (TC-015):**
  - Menghapus overlay buatan dan menyempurnakan penangkapan layar Sub-TC 15.4 agar menyorot Toast notifikasi asli PrimeNG RMIS (`✓ Export berhasil!`) di pojok kanan atas.
  - Mengimplementasikan penanganan unduhan fisik berkas `.xlsx` secara riil melalui event Playwright `waitForEvent('download')`.
- **Refactoring UI Studio Navbar:**
  - Mengelompokkan tombol header ke dalam dropdown terorganisir: `🔄 Hasil Run ▾` (Sinkronisasi & Audit SS) dan `✨ AI Tools ▾` (Rancang via AI, Prompt Generator, Skenario Baku).
  - Mengatasi false positive pada auditor duplikat gambar menggunakan content signature hashing 64-bit.

---

## [v3.1.3] - 2026-11-03
### Minor Change (`y` +1)
- **Perbaikan Modal Dialog Backdrop & Pointer Interceptor (TC-006):**
  - Mengatasi error timeout pada pengujian `TC-006 (Notification - Manage Email Template)` di mana form modal `<app-email-template-form-modal>` menghalangi pointer click tombol *Search* pada tabel di belakangnya.
  - Mengimplementasikan helper universal `closeModalIfOpen(page)` dengan multi-selector PrimeNG (`Close`, `Cancel`, `Tutup`, `.p-dialog-header-close`, `Escape`) dan penanganan *force click* guna memastikan backdrop form selalu tertutup secara tuntas pasca proses capture step.
  - Memastikan seluruh 15 Test Case Master Data CRUD lulus 100% tanpa hambatan pointer event.

---

## [v3.1.2] - 2026-11-03
### Minor Change (`y` +1)
- **Implementasi Sub-TC CRUD Eksplisit per Skenario Master Data:**
  - Mempertahankan **Opsi A (15 Skenario Master Data Besaran)** pada antarmuka suite runner dropdown.
  - Memecah setiap skenario besaran menjadi sub-tahapan pengujian terstruktur menggunakan Playwright `test.step()` dan live console logger:
    - **`Sub-TC X.1: [CREATE]`**: Input data dummy `[TEST-EDV]` dan simpan ke sistem.
    - **`Sub-TC X.2: [READ]`**: Pencarian, pemfilteran, dan verifikasi ketersediaan data pada tabel.
    - **`Sub-TC X.3: [UPDATE]`**: Perubahan atribut deskripsi/konfigurasi data uji.
    - **`Sub-TC X.4: [DELETE]`**: Eksekusi pembersihan (*cleanup*) data uji agar database kembali steril.
  - Memperbarui label penomoran langkah pada evidence generator Word BNI EDV (`3.1.X`) agar sub-langkah CRUD tercatat secara detail dan runtut.

---

## [v3.1.1] - 2026-11-03
### Minor Change (`y` +1)
- **Restrukturisasi Test Suite CRUD Master Data RMIS:**
  - Menyusun ulang 15 Test Case pada [`tests/08-rmis-admin-management.spec.ts`](tests/08-rmis-admin-management.spec.ts) dengan alur siklus hidup berurutan: **Create Data A $\rightarrow$ Read Data A $\rightarrow$ Update Data A $\rightarrow$ Delete Data A**.
  - Menerapkan pengujian terisolasi ber-prefix `[TEST-EDV]` dengan *self-cleaning teardown* agar database master tetap bersih dan hasil dokumentasi EDV tersaji rapi dan runtut.
  - Menambahkan cakupan untuk S3 Helper (`TC-013`), Manage Session (`TC-014`), dan Audit Trail Export (`TC-015`).

---

## [v3.1.0] - 2026-11-02
### Major Change (`x` +1)
- **Otomasi Administration Management RMIS:**
  - Menghapus seluruh test case warisan ORMS (RCSA, KRI, CIP, LED) yang tidak digunakan dalam ruang lingkup RMIS.
  - Mengimplementasikan suite pengujian komprehensif baru [`tests/08-rmis-admin-management.spec.ts`](tests/08-rmis-admin-management.spec.ts) dengan **18 Test Cases terstandar**:
    1. TC-001: Master Unit & Struktur Organisasi
    2. TC-002: Pembuatan Peran Pengguna (Role Management)
    3. TC-003: Matriks Hak Akses & Permissions Matrix
    4. TC-004: Manajemen Hierarki Menu & Navigasi
    5. TC-005: Pembuatan Template Notifikasi Email
    6. TC-006: Pengujian Parsing Parameter Dinamis Template Email
    7. TC-007: Lookup Management Kategori Sistem Umum
    8. TC-008: Lookup Spesifik Modul Middle Office (MIO)
    9. TC-009: Lookup Spesifik Modul Model Risk Management (MRM)
    10. TC-010: Lookup Spesifik Modul RBBR
    11. TC-011: Konfigurasi Parameter Workflow Approval Status
    12. TC-012: Definisi Multi-Level Step Approval
    13. TC-013: Pengujian Validasi Keamanan CISO & Audit Trail
    14. TC-014: Pencegahan Modifikasi Role Kritis Super Administrator
    15. TC-015: Penanganan Validasi Kegagalan Duplikasi Kode Lookup
    16. TC-016: Konfigurasi Threshold Session Inactivity Timeout
    17. TC-017: Verifikasi Pencatatan Riwayat Aktivitas Pengguna (User Activity Log)
    18. TC-018: Verifikasi Integritas Data Master Pasca Operasi Perubahan
- **Integrasi Server & UI Studio:**
  - Penambahan endpoint `/api/run-admin-test` di [`server.js`](server.js) untuk eksekusi terisolasi suite pengujian Administration Management RMIS.
  - Penambahan tombol runner dan integrasi live terminal console di [`editor.html`](editor.html) dan [`editor.js`](editor.js).

---

## [v3.0.1] - 2026-11-02
### Minor Change (`y` +1)
- **Login & Security Test Suite:**
  - Penambahan skenario pengujian keamanan login LDAP & Session Activity di [`tests/06-orms-ldap.spec.ts`](tests/06-orms-ldap.spec.ts) dan [`tests/07-orms-login-security.spec.ts`](tests/07-orms-login-security.spec.ts).
  - Peningkatan helper autentikasi di [`src/helpers/orms-auth.ts`](src/helpers/orms-auth.ts) dengan validasi token dan penanganan sesi kedaluwarsa.

---

## [v3.0.0] - 2026-10-27
### Major Generation Release (Generasi ke-3)
- **Arsitektur Desktop Native Mandiri:**
  - Rilis perdana WeDocIt Studio Desktop mandiri menggantikan ekstensi browser (*Chrome Extension*).
  - Server lokal terintegrasi Express pada port `4400` dengan penyimpanan persisten di `data/workspace.json`.
- **Fitur Utama Dokumen & Otomasi:**
  - Editor visual interaktif untuk pengujian Unit Test, SIT, UAT, dan EDV standar BNI.
  - Pengurutan langkah uji (*Drag & Drop* dan tombol naik/turun).
  - Lightbox zoom untuk evidens screenshot tangkapan layar Playwright.
  - Generator berkas Microsoft Word (`template-bni-edv.docx`) dengan metadata cleaner untuk kepatuhan audit institusi.
  - Konversi 1:1 dokumen Word ke PDF native via Microsoft Word COM automation.
  - Playwright Test Runner terintegrasi dengan terminal streaming real-time.

---

## [v2.0.0] - Histori Generasi ke-2
- Mesin Playwright Test Engine terotomasi dan BNI EDV Word Reporter berbasis CLI.
- Sinkronisasi tangkapan layar dan penggabungan laporan uji otomatis.

---

## [v1.0.0] - Histori Generasi ke-1
- Versi awal WeDocIt berbasis Chrome Extension (*in-browser recorder*).
