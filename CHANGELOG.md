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
