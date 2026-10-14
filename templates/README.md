# Folder Template WeDocIt

Folder ini digunakan untuk menyimpan template dokumen Word (.docx) resmi yang digunakan oleh WeDocIt saat proses ekspor dokumen.

## Template Default yang Didukung:
1. **`template-bni-edv.docx`**
   - Template resmi BNI EDV (Format 5 Halaman / Screen).
   - Letakkan file template Anda di folder ini dengan nama:
     `f:\Project\Desktop\wedocit\templates\template-bni-edv.docx`

## Daftar Placeholder yang Didukung:
- `{judul_unit_test}` : Judul Dokumen
- `{nama_aplikasi}` : Nama Sistem / Aplikasi
- `{cr_unit_test}` : Nomor CR / Project No
- `[{developer}] / {npp}` : Nama & NPP Developer (mendukung multi-developer)
- `{developer}` : Nama developer untuk Cover
- `[{tanggal_mulai}]` / `{tanggal_mulai}` : Tanggal mulai pengujian
- `[{tanggal_selesai}]` / `{tanggal_selesai}` : Tanggal selesai pengujian
- `{deskripsi_singkat}` : Deskripsi singkat pengujian
- `{bussiness_criteria}` : Business Acceptance Criteria
- `{scope_unit_test}` : Lingkup pengujian (Scope)
- `{tanggal_dokumen}` : Tanggal rilis dokumen (contoh: 21/10/2026)
- `{tahun}` : Tahun hak cipta (contoh: 2026)
- `{no}`, `{skenario}`, `{test_case}`, `{ekspektasi}`, `{result}` : Baris tabel Skenario (auto-clone baris)
- `{unit_test_process}` : Injeksi seluruh langkah pengujian & evidens screenshot
