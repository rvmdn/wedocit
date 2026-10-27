# 🚀 WeDocIt Enterprise Studio v3.0 - Unit Test Documentation & Automation Suite

**WeDocIt** adalah perangkat lunak desktop mandiri (*standalone desktop tool*) dan mesin otomasi pengujian sistem yang dirancang khusus untuk memproduksi dokumen pengujian (**Unit Test, SIT, UAT, EDV**) berstandar resmi **PT Bank Negara Indonesia (Persero) Tbk** secara otomatis, rapi, dan aman.

> [!NOTE]
> **Arsitektur Mandiri (Desktop Native):** WeDocIt kini beroperasi penuh sebagai aplikasi desktop mandiri tanpa ketergantungan pada ekstensi browser (*Chrome Extension*), sehingga kebal terhadap kebijakan pemblokiran ekstensi pada browser korporasi.

---

## 🌟 Fitur Utama

### 1. 🖥️ Standalone Desktop Studio UI
- **Penyimpanan Lokal Persisten (`data/workspace.json`):** Seluruh sesi dan dokumen pengujian disimpan langsung di direktori lokal tanpa risiko batasan kuota storage browser.
- **Tampilan Native App Window:** Berjalan dalam jendela aplikasi mandiri Microsoft Edge / Google Chrome tanpa address bar atau bookmark yang mengganggu.
- **Penyusunan Evidens Fleksibel:** Pengurutan langkah (*Drag & Drop* handle `⠿` / panah `▲ / ▼`), ganti evidens screenshot manual, perbesar gambar (*lightbox zoom*), serta pelipatan (*collapse/expand*) kartu Test Case.
- **Bukti Manual (`MANUAL` Proof Placeholder):** Mendukung penandaan evidens manual bertanda `📎 [BUKTI MANUAL]` untuk alur pengujian fisik/offline yang belum terotomasi.

### 2. ⚡ Playwright Automated Test Runner
- **Runner 1-Klik Langsung dari Studio UI:** Eksekusi seluruh skenario atau per-modul (AP Non-Kredit, Pengujian AP, AP Kredit, RHA, Pelaksanaan Online) langsung dari tombol modal `[▶ Jalankan Otomasi]`.
- **Live Terminal Console Streaming:** Memantau log proses pengujian dan status *PASS / FAILED* secara real-time.
- **📥 Sinkronisasi Hasil Uji Otomasi:** Satu klik untuk menarik seluruh Test Case, narasi langkah, dan evidens tangkapan layar hasil Playwright langsung ke editor visual Studio.

### 3. 📄 Generator Dokumen Word Resmi BNI EDV & Ekspor PDF Native
- **Format Baku EDV BNI:** Mengisi tabel pengujian dokumen Word (`template-bni-edv.docx`) secara presisi (Header Developer / NPP, Periode, Scope, Acceptance Criteria, Deskripsi Singkat, dan Tabel Evidens 3.1).
- **Ekspor PDF Native via Word COM:** Mengonversi dokumen Word ke PDF secara 1:1 menggunakan automasi Microsoft Word COM di latar belakang tanpa dependensi konverter pihak ketiga.
- **Pembersih Metadata & Privasi Dokumen:** Menghapus identitas pengguna OS / komputer lokal dari metadata berkas Word (`docProps/core.xml` & `app.xml`) dan menggantinya dengan atribut resmi institusi demi kepatuhan audit.

### 4. 🛡️ Audit & Mutasi Aman (`mutationOnce`)
- **Anti Double-Submit Guard:** Memastikan aksi mutasi transaksional (seperti Simpan Data, Kirim Persetujuan, Propose) hanya dapat dieksekusi satu kali per siklus pengujian dan memverifikasi respons HTTP sebelum melanjutkan langkah berikutnya.

---

## 🚀 Panduan Memulai Cepat (Quick Start)

### Persyaratan Sistem
- **Node.js** v18 atau yang lebih baru.
- **Microsoft Word** (untuk fitur ekspor PDF native via Word COM).
- **Microsoft Edge** atau **Google Chrome**.

### 1. Menjalankan Desktop Studio
Cukup **klik dua kali (double-click)** pada file launcher:
```bat
launch-desktop.bat
```
Atau melalui terminal:
```bash
npm run desktop
```
> Server lokal akan aktif pada `http://127.0.0.1:4400` dan otomatis membuka jendela aplikasi WeDocIt Studio Desktop.

### 2. Menjalankan Pengujian Otomasi dari UI
1. Klik tombol **`▶ Jalankan Otomasi`** di header atas Studio.
2. Pilih suite pengujian modul yang diinginkan pada dropdown.
3. Klik **`Mulai Eksekusi`**.
4. Pantau log terminal secara langsung. Setelah selesai, dokumen Word otomatis terbuat di folder `output/`.
5. Klik **`📥 Sinkronkan Hasil Uji ke Dokumen`** untuk menampilkan evidens di antarmuka visual Studio.
6. Klik **`🖨️ Ekspor PDF Dokumen Hasil`** untuk menghasilkan file PDF resmi.

### 3. Menjalankan Pengujian Otomasi via CLI (Command Line)
Untuk menjalankan runner Playwright secara langsung:
```bash
# Jalankan seluruh suite offline
npm run test:offline

# Jalankan dengan browser terlihat (headed mode)
npm run test:headed
```

---

## 📁 Struktur Direktori Proyek

```
wedocit/
├── data/
│   └── workspace.json         # Penyimpanan berkas & sesi dokumen Studio
├── output/
│   ├── EDV_Unit_Test_*.docx   # Dokumen Word hasil generate
│   ├── EDV_Unit_Test_*.pdf    # Dokumen PDF hasil konversi Word COM
│   ├── latest_run_results.json# Data hasil run Playwright terakhir
│   └── screenshots/           # Tangkapan layar evidens
├── src/
│   ├── fixtures/
│   │   └── wedocit.ts         # WeDocIt Playwright fixture (captureStep, mutationOnce)
│   └── reporters/
│       └── wedocit-word-reporter.ts # Reporter Word BNI EDV + Sanitasi Metadata
├── templates/
│   └── template-bni-edv.docx  # Template resmi Word EDV BNI
├── tests/
│   ├── 01-ap-non-kredit-offline.spec.ts
│   ├── 02-pengujian-ap-non-kredit-offline.spec.ts
│   ├── 03-ap-kredit-offline.spec.ts
│   ├── 04-rha-offline.spec.ts
│   ├── 05-pelaksanaan-audit-online.spec.ts
│   └── auth.setup.ts
├── editor.html                # Antarmuka Visual Desktop Studio
├── editor.js                  # Logika Desktop Studio & sinkronisasi API
├── launch-desktop.bat         # Launcher Desktop 1-Klik
├── package.json               # Konfigurasi npm scripts
├── playwright.config.ts       # Konfigurasi Playwright & WeDocIt Reporter
└── server.js                  # Server HTTP & API lokal mandiri (Port 4400)
```

---

## 📜 Kepatuhan Keamanan & Privasi
- File kredensial `.env` dan autentikasi sesi `.auth/` otomatis diabaikan dari pelacakan git (`.gitignore`).
- Tangkapan layar dan metadata dokumen dibersihkan dari informasi privat akun OS lokal sebelum dipublikasikan.