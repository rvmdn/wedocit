/**
 * WeDocIt Studio - Scenario & Step Derivation Templates
 * Auto-prediction of expected results, test case naming, and standard scenario sets.
 */

const DEFAULT_TC_PATTERNS = [
  {
    title: "Akses dan Verifikasi Halaman Modul",
    expectedResult: "Halaman antarmuka berhasil dimuat lengkap dengan seluruh filter, tabel data, dan tombol aksi siap digunakan."
  },
  {
    title: "Pencarian dan Penyaringan Data (Filter)",
    expectedResult: "Tabel menyajikan data yang akurat dan relevan sesuai parameter pencarian atau filter yang diterapkan."
  },
  {
    title: "Perekaman Data Baru (Input Mandatory & Opsional)",
    expectedResult: "Data baru berhasil tersimpan ke sistem dengan notifikasi konfirmasi sukses dan muncul pada daftar tabel."
  },
  {
    title: "Pemutakhiran Informasi Data (Edit & Update)",
    expectedResult: "Perubahan informasi data berhasil diperbarui dan tersimpan secara konsisten di database sistem."
  },
  {
    title: "Penghapusan Data dengan Konfirmasi Sistem",
    expectedResult: "Data berhasil dihapus dari sistem setelah konfirmasi dan tidak lagi ditampilkan pada daftar utama."
  },
  {
    title: "Pengunduhan Berkas Laporan / Ekspor Dokumen",
    expectedResult: "Sistem berhasil mengenerate berkas laporan dalam format yang valid tanpa korupsi data."
  },
  {
    title: "Pengujian Validasi Form & Pembatasan Input",
    expectedResult: "Sistem memunculkan pesan validasi yang jelas pada field mandatory dan mencegah penyimpanan data yang keliru."
  }
];

function getContextualTcDetails(num) {
  const idx = Math.max(0, (num || 1) - 1) % DEFAULT_TC_PATTERNS.length;
  const p = DEFAULT_TC_PATTERNS[idx];
  return {
    title: `TC ${num || 1}: ${p.title}`,
    expectedResult: p.expectedResult
  };
}

function predictExpectedFromTestCase(tcTitle) {
  const title = (tcTitle || '').trim();
  const low = title.toLowerCase();

  if (/propose/i.test(low)) {
    return 'Data berhasil di-propose dan status proses terkait terbarui di sistem.';
  }
  if (/submit/i.test(low)) {
    return 'Data berhasil di-submit dan status proses terkait terbarui di sistem.';
  }
  if (/kirim|ajukan|pengajuan|request|forward/i.test(low)) {
    return 'Data berhasil diajukan dan alur berlanjut ke tahap verifikasi di sistem.';
  }
  if (/approval|persetujuan|setuju/i.test(low)) {
    return 'Data berhasil disetujui (approved) dan status dokumen terbarui di sistem.';
  }
  if (/tolak|penolakan|reject|kembalikan|return/i.test(low)) {
    return 'Pengajuan berhasil ditolak dan catatan alasan penolakan tercatat di sistem.';
  }
  if (/input|tambah|penambahan|buat|pembuatan|create|rekam|perekaman/i.test(low)) {
    return 'Data baru berhasil disimpan lengkap dengan seluruh field mandatory.';
  }
  if (/ubah|pengubahan|edit|update|perbarui|pembaruan|koreksi/i.test(low)) {
    return 'Perubahan informasi data berhasil tersimpan ke sistem secara akurat.';
  }
  if (/hapus|penghapusan|delete|remove/i.test(low)) {
    return 'Data berhasil dihapus dari sistem dengan notifikasi konfirmasi sukses.';
  }
  if (/unduh|pengunduhan|ekspor|export|download|cetak/i.test(low)) {
    return 'Sistem berhasil mengenerate berkas dokumen dalam format yang valid tanpa kendala.';
  }
  if (/filter|penyaringan|cari|pencarian|search/i.test(low)) {
    return 'Sistem menyaring data secara akurat sesuai kriteria parameter pencarian.';
  }
  if (/verifikasi|akses|tampilan|menu|halaman/i.test(low)) {
    return 'Halaman antarmuka berhasil dimuat lengkap dengan seluruh komponen filter, tabel, dan tombol aksi aktif.';
  }
  return `Tindakan pengujian berhasil dieksekusi sesuai spesifikasi sistem.`;
}

function predictTestCaseFromScenario(scenarioName, nextNum = 1) {
  const sc = (scenarioName || '').trim();
  const scClean = sc.replace(/^(TC\s*\d+[:.-]?|Skenario\s*\d*[:.-]?)\s*/i, '').trim();
  const low = scClean.toLowerCase();

  if (/propose|pengajuan|ajukan|kirim|submit/i.test(low)) {
    return /^(melakukan|menguji)/i.test(scClean) ? scClean : `Melakukan ${scClean}`;
  }
  if (/approval|persetujuan|setuju/i.test(low)) {
    return /^(melakukan)/i.test(scClean) ? scClean : `Melakukan Persetujuan (Approval) ${scClean}`;
  }
  if (/tolak|penolakan|reject|kembalikan/i.test(low)) {
    return /^(melakukan)/i.test(scClean) ? scClean : `Melakukan Penolakan (Reject) ${scClean}`;
  }
  if (/input|tambah|penambahan|buat|pembuatan|rekam/i.test(low)) {
    return /^(melakukan)/i.test(scClean) ? scClean : `Melakukan ${scClean}`;
  }
  if (/ubah|pengubahan|edit|update|perbarui|pembaruan/i.test(low)) {
    return /^(melakukan)/i.test(scClean) ? scClean : `Melakukan Pembaruan ${scClean}`;
  }
  if (/hapus|penghapusan|delete|remove/i.test(low)) {
    return /^(melakukan)/i.test(scClean) ? scClean : `Melakukan Penghapusan ${scClean}`;
  }
  if (/unduh|pengunduhan|ekspor|export|download/i.test(low)) {
    return /^(melakukan)/i.test(scClean) ? scClean : `Melakukan Unduh / Ekspor ${scClean}`;
  }
  if (/filter|penyaringan|cari|pencarian|search/i.test(low)) {
    return /^(pengujian|melakukan)/i.test(scClean) ? scClean : `Pengujian Pencarian & Filter ${scClean}`;
  }
  if (/verifikasi|akses|tampilan|menu|halaman/i.test(low)) {
    return /^(verifikasi|melakukan)/i.test(scClean) ? scClean : `Verifikasi Akses & Tampilan ${scClean}`;
  }
  return /^(melakukan|menguji)/i.test(scClean) ? scClean : `Melakukan ${scClean || 'Pengujian Alur'}`;
}

const MANUAL_STEP_TEMPLATES = [
  {
    title: "Akses Halaman Modul",
    actionDescription: "Pengguna mengakses halaman modul untuk memulai proses pengujian alur sistem.",
    inputData: "-",
    expectedResult: "Halaman antarmuka termuat dengan baik dan seluruh elemen siap digunakan."
  },
  {
    title: "Terapkan Filter & Pencarian Data",
    actionDescription: "Pengguna menentukan kriteria filter pada kolom pencarian yang tersedia.",
    inputData: "Kata Kunci Pengujian",
    expectedResult: "Tabel menyajikan data yang relevan sesuai parameter pencarian."
  },
  {
    title: "Pengisian Formulir Transaksi",
    actionDescription: "Pengguna melengkapi data yang bersifat mandatory pada formulir input.",
    inputData: "Data Pengujian Valid",
    expectedResult: "Semua field formulir terisi dengan format yang benar tanpa error validasi."
  },
  {
    title: "Simpan & Konfirmasi Data",
    actionDescription: "Pengguna menekan tombol Simpan untuk memproses rekaman data ke dalam sistem.",
    inputData: "-",
    expectedResult: "Sistem berhasil menyimpan perubahan dan menyajikan notifikasi sukses."
  },
  {
    title: "Verifikasi Pemutakhiran Status Data",
    actionDescription: "Pengguna memeriksa status dan hasil pembaruan data pada tabel daftar utama.",
    inputData: "-",
    expectedResult: "Status data terbarui secara akurat sesuai alur bisnis yang diharapkan."
  }
];

function getContextualManualStep(stepNum) {
  const idx = Math.max(0, (stepNum || 1) - 1) % MANUAL_STEP_TEMPLATES.length;
  const tpl = MANUAL_STEP_TEMPLATES[idx];
  return {
    title: `${stepNum}. ${tpl.title}`,
    actionDescription: tpl.actionDescription,
    inputData: tpl.inputData,
    expectedResult: tpl.expectedResult
  };
}

// Global binding
window.DEFAULT_TC_PATTERNS = DEFAULT_TC_PATTERNS;
window.MANUAL_STEP_TEMPLATES = MANUAL_STEP_TEMPLATES;
window.getContextualTcDetails = getContextualTcDetails;
window.predictExpectedFromTestCase = predictExpectedFromTestCase;
window.predictTestCaseFromScenario = predictTestCaseFromScenario;
window.getContextualManualStep = getContextualManualStep;

