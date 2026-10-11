# 🚀 WeDocIt - Smart Test & Guide Documenter (Chrome / Edge Extension)

**WeDocIt** adalah ekstensi browser khusus untuk membuat dokumen pengujian sistem (**Unit Test, SIT, UAT, Skenario Testing**) dan **Buku Panduan Pengguna (User Guide)** secara otomatis dengan tangkapan layar cerdas dan narasi **Bahasa Indonesia**.

---

## 🌟 Fitur Utama
1. **Floating Toolbar Praktis:**
   * Tombol Rekam, Jeda, Screenshot Manual, dan Selesai selalu melayang di layar tanpa mengganggu pekerjaan.
2. **Smart DOM Parser (Bahasa Indonesia):**
   * Otomatis mengenali Tombol, Input Form, Dropdown PrimeNG (`p-dropdown`), Checkbox, Radio, dan Navigasi Tabel.
   * Format kalimat otomatis: *"Klik tombol [Simpan Data]"*, *"Isi field [Nomor Surat] dengan '001/AUDIT/2026'"*, dsb.
3. **Auto-Highlight Elemen:**
   * Menyorot elemen yang diklik dengan kotak merah sebelum screenshot diambil.
4. **Studio Dokumen Terintegrasi (`editor.html`):**
   * Edit deskripsi langkah, pindahkan urutan langkah (Up/Down), hapus langkah yang tidak perlu (anti-spam klik), ubah status *Pass / Fail*.
   * Preview dan perbesar screenshot.
5. **Ekspor 1-Klik:**
   * 📄 **Microsoft Word (.docx / .doc)**: Format tabel pengujian rapi lengkap dengan header institusi, kolom status, evidens tangkapan layar, dan form tanda tangan persetujuan (*Sign-Off*).
   * 🖨️ **Cetak / PDF**: Format siap cetak kertas A4.
   * 📑 **Markdown**: Siap disalin ke Jira, Confluence, GitHub, atau Gitlab.
   * 💾 **JSON**: Simpan dan muat kembali sesi pengujian kapan saja.

---

## 🛠 Cara Pasang di Google Chrome / Microsoft Edge
1. Buka browser **Chrome** atau **Edge**.
2. Masuk ke halaman ekstensi:
   * Chrome: `chrome://extensions/`
   * Edge: `edge://extensions/`
3. Aktifkan **Developer mode** (Mode pengembang) di pojok kanan atas.
4. Klik tombol **Load unpacked** (Muat yang belum dibongkar).
5. Pilih folder:
   📁 `F:\Project\Desktop\wedocit`
6. Ekstensi **WeDocIt** siap digunakan! Pasang pin di toolbar browser Anda.

---

## 📖 Cara Penggunaan
1. Buka aplikasi web yang ingin diuji (misal: AMS Fast).
2. Klik tombol **Mulai Rekam** pada floating bar di pojok kanan bawah (atau via icon popup WeDocIt).
3. Lakukan alur pengujian seperti biasa.
4. Setelah selesai, klik **⏹ Selesai**.
5. Halaman **Document Studio** akan terbuka otomatis. Periksa teks, sesuaikan judul & hasil pengujian, lalu klik **Ekspor Dokumen Word**!