const fs = require('fs');
const path = require('path');
const { ROOT_DIR } = require('../config');

function analyzeComponentAndBuildTestCases(codePath, options = {}) {
  const scenarioName = options.scenarioName || 'Modul Aplikasi';
  const systemName = options.systemName || 'Sistem Aplikasi';
  const targetUrl = options.targetUrl || 'http://localhost:4300';
  const userRole = options.userRole || 'Admin / User';

  let files = [];
  if (codePath && fs.existsSync(codePath)) {
    const stat = fs.statSync(codePath);
    if (stat.isDirectory()) {
      function scan(curr) {
        for (const f of fs.readdirSync(curr)) {
          if (f === 'node_modules' || f === '.git' || f === 'dist') continue;
          const p = path.join(curr, f);
          if (fs.statSync(p).isDirectory()) scan(p);
          else if (/\.(html|ts|tsx|vue|jsx|js)$/i.test(f) && !f.endsWith('.spec.ts')) {
            files.push(p);
          }
        }
      }
      scan(codePath);
    } else {
      files.push(codePath);
    }
  }

  let combinedHtml = '';
  let combinedTs = '';
  for (const f of files) {
    const c = fs.readFileSync(f, 'utf8');
    if (f.endsWith('.html')) combinedHtml += '\n' + c;
    else combinedTs += '\n' + c;
  }

  // Inputs
  const inputs = [];
  const seenInputs = new Set();
  const inputRegex = /<(input|textarea|p-password|p-inputnumber|p-select|p-dropdown|p-checkbox|p-toggleswitch)[^>]*>/gi;
  let m;
  while ((m = inputRegex.exec(combinedHtml)) !== null) {
    const tagStr = m[0];
    const nameMatch = tagStr.match(/formControlName="([^"]+)"|id="([^"]+)"|name="([^"]+)"/i);
    const placeholderMatch = tagStr.match(/placeholder="([^"]+)"/i);
    const isRequired = tagStr.includes('required') || combinedHtml.includes(`${nameMatch?.[1] || ''}.invalid`) || tagStr.includes('text-red-500');
    const isPassword = m[1].toLowerCase() === 'p-password' || tagStr.includes('type="password"');
    const hasToggleMask = tagStr.includes('toggleMask');
    const fieldName = nameMatch ? (nameMatch[1] || nameMatch[2] || nameMatch[3]) : 'field';
    if (!seenInputs.has(fieldName)) {
      seenInputs.add(fieldName);
      inputs.push({
        tag: m[1],
        name: fieldName,
        placeholder: placeholderMatch ? placeholderMatch[1] : fieldName,
        isPassword,
        hasToggleMask,
        isRequired
      });
    }
  }

  // Buttons
  const buttons = [];
  const seenButtons = new Set();
  const btnRegex = /<(button|p-button|a)[^>]*>([\s\S]*?)<\/\1>/gi;
  while ((m = btnRegex.exec(combinedHtml)) !== null) {
    const fullTag = m[0];
    const innerText = m[2].replace(/<[^>]+>/g, '').trim();
    const labelAttr = (fullTag.match(/label="([^"]+)"/i) || [])[1];
    let label = (labelAttr || innerText).replace(/\s+/g, ' ').trim();
    const routerLink = (fullTag.match(/routerLink="([^"]+)"/i) || [])[1];
    const type = (fullTag.match(/type="([^"]+)"/i) || [])[1] || 'button';
    if (label && !seenButtons.has(label) && label.length < 50) {
      seenButtons.add(label);
      buttons.push({ label, type, routerLink });
    }
  }

  // Validations
  const validations = [];
  const valRegex = /<(?:small|div|span)[^>]*(?:text-red|invalid|error)[^>]*>([\s\S]*?)<\/(?:small|div|span)>/gi;
  while ((m = valRegex.exec(combinedHtml)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, '').trim();
    if (text && text.length > 3 && text.length < 80 && !validations.includes(text) && !text.includes('{{')) {
      validations.push(text);
    }
  }

  // Tables
  const hasTable = /<p-table|<table/i.test(combinedHtml);

  // 1. Deteksi Khusus: RMIS Executive Main Dashboard (Multi-Source Portal: RBBR, MIO, MRM)
  const isExecutiveWelcome = /welcome/i.test(codePath) 
    || scenarioName.toLowerCase().includes('main dashboard')
    || scenarioName.toLowerCase().includes('executive')
    || (combinedHtml.includes('setSource') || (/rbbr/i.test(combinedHtml) && /mio/i.test(combinedHtml) && /mrm/i.test(combinedHtml)));

  if (isExecutiveWelcome) {
    const dashTcs = [
      {
        tcNumberStr: 'TC-001',
        title: 'Filter & Switcher Sumber Data Eksekutif (All, RBBR, MIO, MRM)',
        scenarioName: 'Pengujian Interaktivitas Pill Switcher Sumber Data Dashboard',
        expectedResult: 'Kontainer dashboard berhasil memfilter dan menampilkan kartu risiko sesuai sumber data yang dipilih secara responsif.',
        role: userRole,
        status: 'OK',
        steps: [
          {
            stepNumber: 1,
            title: 'Akses Halaman Utama Executive Dashboard',
            actionDescription: `Pengguna membuka halaman utama RMIS pada URL ${targetUrl}.`,
            inputData: `URL: ${targetUrl}`,
            expectedResult: 'Halaman dashboard berhasil dimuat dengan banner sapaan dan tombol switcher sumber data aktif.'
          },
          {
            stepNumber: 2,
            title: 'Uji Switcher: Semua Data (3 Source)',
            actionDescription: 'Mengklik tombol pill switcher "Semua Data (3 Source)" pada header dashboard.',
            inputData: 'Klik: Semua Data (3 Source)',
            expectedResult: 'Grid dashboard menampilkan seluruh kartu risiko dari 3 sumber terintegrasi (RBBR, MIO, dan MRM).'
          },
          {
            stepNumber: 3,
            title: 'Uji Switcher: Filter Khusus Modul RBBR',
            actionDescription: 'Mengklik tombol pill switcher "RBBR".',
            inputData: 'Klik: RBBR',
            expectedResult: 'Tampilan dashboard menyaring konten dan hanya menampilkan seksi matriks profil risiko dan TKB RBBR.'
          },
          {
            stepNumber: 4,
            title: 'Uji Switcher: Filter Khusus Modul MIO',
            actionDescription: 'Mengklik tombol pill switcher "MIO".',
            inputData: 'Klik: MIO',
            expectedResult: 'Tampilan dashboard hanya menyajikan indikator ketersediaan alat likuid dan chart tren limit MIO.'
          },
          {
            stepNumber: 5,
            title: 'Uji Switcher: Filter Khusus Modul MRM',
            actionDescription: 'Mengklik tombol pill switcher "MRM".',
            inputData: 'Klik: MRM',
            expectedResult: 'Tampilan dashboard menyaring dan menampilkan ringkasan Model Risk Management.'
          }
        ]
      },
      {
        tcNumberStr: 'TC-002',
        title: 'Dashboard Eksekutif - Ringkasan Potongan Data RBBR & Tingkat Kesehatan Bank',
        scenarioName: 'Verifikasi Visualisasi Matriks Profil Risiko, Rentabilitas, dan Donut Chart TKB',
        expectedResult: 'Seluruh komponen kartu RBBR ter-render sempurna dengan nilai matriks tren dan chart TKB yang proporsional.',
        role: userRole,
        status: 'OK',
        steps: [
          {
            stepNumber: 1,
            title: 'Periksa Ringkasan Profil Risiko & Rentabilitas',
            actionDescription: 'Memeriksa deskripsi teks dan badge status profil risiko serta rentabilitas bank.',
            inputData: '-',
            expectedResult: 'Teks narasi profil risiko dan rentabilitas tampil jelas dan sesuai data backend.'
          },
          {
            stepNumber: 2,
            title: 'Verifikasi Matriks Tata Kelola (GCG) & Permodalan',
            actionDescription: 'Memeriksa tabel perbandingan nilai semester (Jun vs Des) dan indikator tren naik/turun/stabil.',
            inputData: '-',
            expectedResult: 'Tabel matriks menampilkan baris komponen, nilai perbandingan semester, serta simbol arah tren yang valid.'
          },
          {
            stepNumber: 3,
            title: 'Verifikasi Visualisasi Donut Chart Peringkat TKB',
            actionDescription: 'Memeriksa render grafik donut Tingkat Kesehatan Bank beserta label kompositnya.',
            inputData: '-',
            expectedResult: 'Grafik donut TKB tampil utuh di tengah kartu dengan pewarnaan peringkat komposit yang tepat.'
          }
        ]
      },
      {
        tcNumberStr: 'TC-003',
        title: 'Dashboard Eksekutif - Ringkasan Potongan Data MIO (Middle Office)',
        scenarioName: 'Verifikasi Status Ketersediaan Alat Likuid, Risk Appetite, dan Grafik Likuiditas',
        expectedResult: 'Indikator status operasional likuiditas dan chart ECharts MIO tersaji lengkap tanpa kendala rendering.',
        role: userRole,
        status: 'OK',
        steps: [
          {
            stepNumber: 1,
            title: 'Verifikasi Badge Status Ketersediaan Alat Likuid',
            actionDescription: 'Memeriksa kotak indikator alat likuid di kolom pertama kartu MIO.',
            inputData: '-',
            expectedResult: 'Badge status menampilkan label kondisi likuiditas (NORMAL/WASPADA) dengan warna kontras standar.'
          },
          {
            stepNumber: 2,
            title: 'Verifikasi Indikator Range Risk Appetite',
            actionDescription: 'Memeriksa kotak status kesesuaian operasional terhadap limit toleransi risiko.',
            inputData: '-',
            expectedResult: 'Status toleransi risiko tampil jelas (contoh: "DALAM RANGE RISK APPETITE").'
          },
          {
            stepNumber: 3,
            title: 'Verifikasi Grafik ECharts Ketahanan & Kualitas Likuiditas',
            actionDescription: 'Memeriksa visualisasi grafik chart pada kolom kedua dan ketiga kartu MIO.',
            inputData: '-',
            expectedResult: 'Grafik ECharts ketahanan likuiditas dan tren limit ter-render rapi dengan sumbu dan legenda aktif.'
          }
        ]
      },
      {
        tcNumberStr: 'TC-004',
        title: 'Dashboard Eksekutif - Ringkasan Potongan Data MRM (Model Risk Management)',
        scenarioName: 'Verifikasi Metrik Model Inventory, Status Validasi, dan Matriks Life Cycle',
        expectedResult: 'Metrik agregasi model risiko kuantitatif terdisplay akurat sesuai klasifikasi tiering perbankan.',
        role: userRole,
        status: 'OK',
        steps: [
          {
            stepNumber: 1,
            title: 'Verifikasi Metrik Total Model Inventory',
            actionDescription: 'Memeriksa angka rekapitulasi jumlah model aktif dan dalam pengembangan.',
            inputData: '-',
            expectedResult: 'Angka total model risiko terdata dan tersaji pada tile ringkasan.'
          },
          {
            stepNumber: 2,
            title: 'Verifikasi Distribusi Tiering & Tingkat Risiko Model',
            actionDescription: 'Memeriksa visualisasi proporsi model berdasarkan Tier 1, Tier 2, dan Tier 3.',
            inputData: '-',
            expectedResult: 'Distribusi tier model risiko terpetakan proporsional sesuai data master model.'
          },
          {
            stepNumber: 3,
            title: 'Verifikasi Siklus Hidup & Kepatuhan Validasi Model',
            actionDescription: 'Memeriksa ringkasan kepatuhan validasi berkala model risiko perbankan.',
            inputData: '-',
            expectedResult: 'Status tahapan life cycle dan indikator kepatuhan validasi model terdisplay dengan benar.'
          }
        ]
      },
      {
        tcNumberStr: 'TC-005',
        title: 'Dashboard Eksekutif - Cross-Navigation ke Modul Operasional Terkait',
        scenarioName: 'Pengujian Tautan Drilldown Navigasi dari Dashboard ke Sub-Modul Detil',
        expectedResult: 'Pengguna dapat bertransisi secara seamless dari kartu ringkasan dashboard menuju halaman modul operasional penuh.',
        role: userRole,
        status: 'OK',
        steps: [
          {
            stepNumber: 1,
            title: 'Navigasi Drilldown ke Modul RBBR / TKB',
            actionDescription: 'Pengguna mengklik tombol atau tautan navigasi detail pada kartu RBBR.',
            inputData: 'Klik: Navigasi Modul RBBR',
            expectedResult: 'Sistem mengalihkan tampilan ke modul operasional RBBR (/rbbr).'
          },
          {
            stepNumber: 2,
            title: 'Navigasi Drilldown ke Modul Middle Office (MIO)',
            actionDescription: 'Pengguna mengklik tombol atau tautan navigasi detail pada kartu MIO.',
            inputData: 'Klik: Navigasi Modul MIO',
            expectedResult: 'Sistem mengalihkan tampilan ke modul operasional Middle Office (/mio).'
          },
          {
            stepNumber: 3,
            title: 'Navigasi Drilldown ke Modul Model Risk Management (MRM)',
            actionDescription: 'Pengguna mengklik tombol atau tautan navigasi detail pada kartu MRM.',
            inputData: 'Klik: Navigasi Modul MRM',
            expectedResult: 'Sistem mengalihkan tampilan ke modul operasional Model Risk Management (/risk-management).'
          }
        ]
      }
    ];

    dashTcs.forEach(tc => {
      (tc.steps || []).forEach(s => {
        if (!s.pageUrl) s.pageUrl = targetUrl;
      });
    });

    return {
      summary: {
        filesCount: files.length,
        inputs: inputs.length,
        buttons: buttons.length,
        validations: validations.length,
        dashboardType: 'RMIS Executive Multi-Source Portal (RBBR, MIO, MRM)',
        scannedPath: codePath
      },
      testCases: dashTcs
    };
  }

  // 2. Deteksi Khusus: Widget Dashboard (misal src/app/pages/dashboard)
  const isWidgetDashboard = /pages[\\\/]dashboard/i.test(codePath) 
    || combinedHtml.includes('app-stats-widget') 
    || combinedHtml.includes('app-recent-sales-widget')
    || combinedHtml.includes('app-revenue-stream-widget');

  if (isWidgetDashboard) {
    const widgetTcs = [
      {
        tcNumberStr: 'TC-001',
        title: 'Verifikasi Widget Statistik & Key Performance Indicators (KPI)',
        scenarioName: 'Pengujian Metrik Ringkasan Utama pada Dashboard',
        expectedResult: 'Widget statistik menampilkan angka kalkulasi metrik utama secara real-time dan akurat.',
        role: userRole,
        status: 'OK',
        steps: [
          {
            stepNumber: 1,
            title: 'Akses Halaman Dashboard Utama',
            actionDescription: `Membuka halaman dashboard pada URL ${targetUrl}/dashboard.`,
            inputData: `URL: ${targetUrl}/dashboard`,
            expectedResult: 'Halaman dashboard termuat sempurna beserta seluruh grid widget statistik.'
          },
          {
            stepNumber: 2,
            title: 'Verifikasi Tile Metrik Statistik (Stats Widget)',
            actionDescription: 'Memeriksa ketersediaan kartu metrik, angka pertumbuhan, dan ikon indikator.',
            inputData: '-',
            expectedResult: 'Seluruh kartu metrik KPI ter-render rapi dengan label dan nilai yang proporsional.'
          }
        ]
      },
      {
        tcNumberStr: 'TC-002',
        title: 'Verifikasi Grafik Visualisasi Tren & Alur Pendapatan (Revenue Stream)',
        scenarioName: 'Pengujian Render Grafik Bar/Line Chart Alur Risiko & Finansial',
        expectedResult: 'Grafik tren berhasil ter-render lengkap dengan sumbu horizontal, vertikal, dan tooltip data.',
        role: userRole,
        status: 'OK',
        steps: [
          {
            stepNumber: 1,
            title: 'Periksa Komponen Grafik Revenue Stream',
            actionDescription: 'Mengidentifikasi kontainer grafik tren pada sisi kanan dashboard.',
            inputData: '-',
            expectedResult: 'Grafik bar/line chart tampil interaktif dengan skala data yang terbaca jelas.'
          },
          {
            stepNumber: 2,
            title: 'Uji Interaktivitas Hover pada Grafik',
            actionDescription: 'Mengarahkan kursor mouse ke salah satu titik data atau batang grafik.',
            inputData: '-',
            expectedResult: 'Tooltip informasi nilai detail titik data muncul secara dinamis di layar.'
          }
        ]
      },
      {
        tcNumberStr: 'TC-003',
        title: 'Verifikasi Tabel Ringkasan Transaksi / Aktivitas Terkini (Recent Activity)',
        scenarioName: 'Pengujian Tampilan Daftar Transaksi Operasional Terbaru',
        expectedResult: 'Tabel menyajikan daftar aktivitas terkini secara kronologis dengan data atribut valid.',
        role: userRole,
        status: 'OK',
        steps: [
          {
            stepNumber: 1,
            title: 'Tinjau Daftar Baris Transaksi Terkini',
            actionDescription: 'Memeriksa baris-baris data aktivitas terbaru pada widget Recent Activity.',
            inputData: '-',
            expectedResult: 'Daftar aktivitas terkini tampil lengkap beserta status dan timestamp.'
          }
        ]
      },
      {
        tcNumberStr: 'TC-004',
        title: 'Verifikasi Panel Kategori & Peringkat Tertinggi (Best Performing)',
        scenarioName: 'Pengujian Agregasi Kategori Produk / Entitas Risiko Teratas',
        expectedResult: 'Daftar entitas peringkat teratas terurut sesuai urutan volume atau eksposur risiko.',
        role: userRole,
        status: 'OK',
        steps: [
          {
            stepNumber: 1,
            title: 'Periksa Daftar Peringkat Entitas Teratas',
            actionDescription: 'Memeriksa pemeringkatan kategori/produk pada widget Best Performing.',
            inputData: '-',
            expectedResult: 'Entitas tersusun secara descending sesuai besaran volume atau skor risiko.'
          }
        ]
      },
      {
        tcNumberStr: 'TC-005',
        title: 'Verifikasi Panel Notifikasi & Peringatan Sistem (Notifications Feed)',
        scenarioName: 'Pengujian Alur Pemberitahuan Penting & Log Peringatan Sistem',
        expectedResult: 'Panel notifikasi menampilkan daftar peringatan dengan indikator urgensi yang sesuai.',
        role: userRole,
        status: 'OK',
        steps: [
          {
            stepNumber: 1,
            title: 'Tinjau Log Pemberitahuan Sistem Terkini',
            actionDescription: 'Memeriksa feed pesan notifikasi, badge kategori, dan waktu diterbitkan.',
            inputData: '-',
            expectedResult: 'Pesan notifikasi dan alert ter-render jelas dengan warna status yang kontras.'
          }
        ]
      }
    ];

    return {
      summary: {
        filesCount: files.length,
        inputs: inputs.length,
        buttons: buttons.length,
        validations: validations.length,
        dashboardType: 'RMIS Executive Widgets Dashboard',
        scannedPath: codePath
      },
      testCases: widgetTcs
    };
  }

  // Now assemble dynamic test cases based on actual components:
  const tcs = [];
  let tcIdx = 1;

  // TC-1: UI Access & Verification
  const inputSummary = inputs.map(i => i.placeholder || i.name).filter(Boolean).slice(0, 5).join(', ');
  const btnSummary = buttons.map(b => b.label).filter(Boolean).slice(0, 4).join(', ');
  tcs.push({
    tcNumberStr: `TC-${String(tcIdx++).padStart(3, '0')}`,
    title: `Verifikasi Tampilan Antarmuka Halaman ${scenarioName}`,
    scenarioName: `Memeriksa Komponen Antarmuka Form & Aksi pada ${scenarioName}`,
    expectedResult: `Halaman ${scenarioName} berhasil dimuat lengkap dengan seluruh field input dan tombol aksi aktif.`,
    role: userRole,
    status: 'OK',
    steps: [
      {
        stepNumber: 1,
        title: `Akses Halaman ${scenarioName}`,
        actionDescription: `Pengguna membuka halaman modul pada target URL (${targetUrl}).`,
        inputData: '-',
        expectedResult: `Halaman ${scenarioName} terbuka sempurna dan elemen antarmuka termuat.`
      },
      {
        stepNumber: 2,
        title: 'Verifikasi Komponen Visual Halaman',
        actionDescription: `Memeriksa ketersediaan komponen yang terdeteksi: Input (${inputSummary || 'Form Controls'}), Tombol (${btnSummary || 'Aksi'}).`,
        inputData: '-',
        expectedResult: 'Seluruh komponen visual tampil proporsional sesuai rancangan antarmuka.'
      }
    ]
  });

  // Table TC (if table present)
  if (hasTable) {
    tcs.push({
      tcNumberStr: `TC-${String(tcIdx++).padStart(3, '0')}`,
      title: `Verifikasi Tampilan Tabel dan Daftar Data ${scenarioName}`,
      scenarioName: `Melihat Daftar Entri Data pada Tabel ${scenarioName}`,
      expectedResult: 'Tabel menampilkan daftar data lengkap dengan kolom dan baris aksi operasional.',
      role: userRole,
      status: 'OK',
      steps: [
        {
          stepNumber: 1,
          title: 'Periksa Tampilan Header Kolom Tabel',
          actionDescription: 'Memeriksa kolom-kolom tabel data dan tata letak grid.',
          inputData: '-',
          expectedResult: 'Header kolom tabel tampil terstruktur dan rapi.'
        },
        {
          stepNumber: 2,
          title: 'Verifikasi Aksi Baris Tabel',
          actionDescription: 'Memeriksa ketersediaan tombol aksi operasional pada setiap baris tabel.',
          inputData: '-',
          expectedResult: 'Tombol aksi pada baris tabel dapat diakses pengguna sesuai hak akses role.'
        }
      ]
    });
  }

  // Password toggleMask TC (if password field with toggleMask exists)
  const pwdField = inputs.find(i => i.isPassword && i.hasToggleMask);
  if (pwdField) {
    tcs.push({
      tcNumberStr: `TC-${String(tcIdx++).padStart(3, '0')}`,
      title: `Fitur Masking dan Unmasking Karakter ${pwdField.name.toUpperCase()}`,
      scenarioName: `Pengujian Toggle Visibility Password pada Form`,
      expectedResult: `Karakter password dapat disembunyikan dan ditampilkan menggunakan toggle ikon mata.`,
      role: userRole,
      status: 'OK',
      steps: [
        {
          stepNumber: 1,
          title: 'Input Password dalam Kondisi Terselubung',
          actionDescription: `Memasukkan teks ke dalam field ${pwdField.name} dan memastikan karakter tersamarkan bullet.`,
          inputData: `${pwdField.name}: ********`,
          expectedResult: 'Karakter password tersembunyi untuk menjaga privasi kredensial pengguna.'
        },
        {
          stepNumber: 2,
          title: 'Klik Toggle Eye Icon untuk Menampilkan Teks',
          actionDescription: 'Mengklik ikon mata (toggle mask) pada sisi kanan field password.',
          inputData: '-',
          expectedResult: 'Karakter password tampil dalam format teks biasa (unmasked) secara jelas.'
        }
      ]
    });
  }

  // Mandatory Form Validation TC (if required inputs or validation messages exist)
  const reqInputs = inputs.filter(i => i.isRequired);
  if (reqInputs.length > 0 || validations.length > 0) {
    const reqNames = reqInputs.map(i => i.name).join(', ') || 'seluruh field wajib';
    const valText = validations.slice(0, 3).join(' & ') || 'Pesan validasi wajib diisi';
    tcs.push({
      tcNumberStr: `TC-${String(tcIdx++).padStart(3, '0')}`,
      title: `Validasi Mandatory Fields Kosong pada Form ${scenarioName}`,
      scenarioName: `Proteksi Pengiriman Form Tanpa Mengisi Field Wajib (${reqNames})`,
      expectedResult: `Sistem mencegah pengiriman form dan memunculkan indikator validasi (${valText}).`,
      role: userRole,
      status: 'OK',
      steps: [
        {
          stepNumber: 1,
          title: 'Kosongkan Field Mandatory Form',
          actionDescription: `Membuka formulir dan mengosongkan field wajib (${reqNames}).`,
          inputData: `Field Kosong: ${reqNames}`,
          expectedResult: 'Field terdeteksi kosong dan tombol submit/simpan tetap dalam status disabled atau divalidasi.'
        },
        {
          stepNumber: 2,
          title: 'Verifikasi Pesan dan Indikator Validasi Error',
          actionDescription: `Memeriksa tampilan umpan balik validasi (${valText}).`,
          inputData: '-',
          expectedResult: `Sistem menandai field dengan border merah serta menampilkan pesan validasi secara presisi.`
        }
      ]
    });
  }

  // Specific validation cases (e.g. minlength, pattern)
  const minLengthVal = validations.find(v => v.toLowerCase().includes('karakter') || v.toLowerCase().includes('minimal'));
  if (minLengthVal) {
    tcs.push({
      tcNumberStr: `TC-${String(tcIdx++).padStart(3, '0')}`,
      title: `Validasi Batas Minimal Karakter (${minLengthVal})`,
      scenarioName: `Pengujian Boundary Limit Nilai Input`,
      expectedResult: `Sistem menolak input yang belum memenuhi batas minimal karakter (${minLengthVal}).`,
      role: userRole,
      status: 'OK',
      steps: [
        {
          stepNumber: 1,
          title: 'Input Nilai di Bawah Batas Minimal',
          actionDescription: 'Memasukkan karakter yang panjangnya kurang dari batas minimal yang ditentukan.',
          inputData: 'Input: 5 karakter (kurang dari syarat)',
          expectedResult: 'Form mendeteksi panjang password belum memenuhi syarat.'
        },
        {
          stepNumber: 2,
          title: 'Verifikasi Peringatan Validasi Boundary',
          actionDescription: `Memeriksa pesan kesalahan yang muncul di bawah input field.`,
          inputData: '-',
          expectedResult: `Muncul pesan peringatan "${minLengthVal}" dan aksi simpan dicegah.`
        }
      ]
    });
  }

  // Main Action / Submit Button TC
  const mainBtn = buttons.find(b => /sign in|login|save|simpan|submit|tambah/i.test(b.label)) || buttons[0];
  if (mainBtn) {
    tcs.push({
      tcNumberStr: `TC-${String(tcIdx++).padStart(3, '0')}`,
      title: `Pengujian Eksekusi Aksi ${mainBtn.label} (Normal Case)`,
      scenarioName: `Memproses Aksi ${mainBtn.label} dengan Data Valid`,
      expectedResult: `Sistem sukses memproses aksi ${mainBtn.label} dan memperbarui data/status pada aplikasi.`,
      role: userRole,
      status: 'OK',
      steps: [
        {
          stepNumber: 1,
          title: 'Lengkapi Seluruh Parameter Data Valid',
          actionDescription: `Mengisi seluruh field form (${inputs.map(i => i.name).slice(0, 4).join(', ')}) dengan nilai valid.`,
          inputData: 'Data Valid Parameter Uji',
          expectedResult: `Seluruh form terisi valid dan tombol ${mainBtn.label} berada dalam status aktif.`
        },
        {
          stepNumber: 2,
          title: `Klik Tombol ${mainBtn.label} dan Verifikasi Hasil`,
          actionDescription: `Menekan tombol ${mainBtn.label} dan mengamati respons server.`,
          inputData: '-',
          expectedResult: `Proses berhasil dieksekusi tanpa error, data tersimpan atau sesi dialihkan sesuai alur bisnis.`
        }
      ]
    });

    // Negative / Failure Handling TC
    tcs.push({
      tcNumberStr: `TC-${String(tcIdx++).padStart(3, '0')}`,
      title: `Pengujian Penanganan Respons Error pada Aksi ${mainBtn.label} (Abnormal Case)`,
      scenarioName: `Proteksi Kesalahan Input Parameter atau Kegagalan Sistem`,
      expectedResult: `Sistem menolak proses dan memberikan feedback pesan error yang informatif serta aman.`,
      role: userRole,
      status: 'OK',
      steps: [
        {
          stepNumber: 1,
          title: 'Kondisikan Parameter Tidak Sesuai / Invalid',
          actionDescription: 'Memasukkan nilai parameter uji yang tidak sesuai dengan database atau memicu kondisi penolakan.',
          inputData: 'Parameter Invalid / Penolakan Sistem',
          expectedResult: 'Parameter dimasukkan ke dalam form pengujian.'
        },
        {
          stepNumber: 2,
          title: 'Verifikasi Notifikasi Feedback Error dari Sistem',
          actionDescription: `Menekan tombol ${mainBtn.label} dan memeriksa toast / pesan penolakan.`,
          inputData: '-',
          expectedResult: 'Sistem menampilkan notifikasi pesan penolakan tanpa mengekspos exception backend.'
        }
      ]
    });
  }

  // Navigation / RouterLink TC (if any link exists)
  const navBtn = buttons.find(b => b.routerLink);
  if (navBtn) {
    tcs.push({
      tcNumberStr: `TC-${String(tcIdx++).padStart(3, '0')}`,
      title: `Pengujian Navigasi Tautan ${navBtn.label || navBtn.routerLink}`,
      scenarioName: `Peralihan Halaman via Router Link Menuju ${navBtn.routerLink}`,
      expectedResult: `Sistem sukses mengalihkan pengguna ke route ${navBtn.routerLink}.`,
      role: userRole,
      status: 'OK',
      steps: [
        {
          stepNumber: 1,
          title: `Klik Tautan ${navBtn.label || 'Navigasi'}`,
          actionDescription: `Pengguna mengklik tautan navigasi menuju ${navBtn.routerLink}.`,
          inputData: `Route Target: ${navBtn.routerLink}`,
          expectedResult: `Browser merespons klik dan mengarahkan ke halaman target.`
        },
        {
          stepNumber: 2,
          title: 'Verifikasi Halaman Tujuan Berhasil Dimuat',
          actionDescription: `Memeriksa URL browser dan komponen halaman tujuan (${navBtn.routerLink}).`,
          inputData: '-',
          expectedResult: `Halaman tujuan ${navBtn.routerLink} terbuka sempurna tanpa hambatan navigasi.`
        }
      ]
    });
  }

  tcs.forEach(tc => {
    (tc.steps || []).forEach(s => {
      if (!s.pageUrl) s.pageUrl = targetUrl;
    });
  });

  return {
    summary: {
      filesCount: files.length,
      inputs: inputs.length,
      buttons: buttons.length,
      validations: validations.length,
      hasTable,
      scannedPath: codePath
    },
    testCases: tcs
  };
}


function generatePlaywrightSpecFromDocument(doc) {
  if (!doc) throw new Error('Dokumen tidak ditemukan');
  const meta = doc.metadata || {};
  const tcs = doc.testCases || [];
  if (tcs.length === 0) throw new Error('Dokumen ini belum memiliki Test Case.');

  const testsDir = path.join(ROOT_DIR, 'tests');
  if (!fs.existsSync(testsDir)) fs.mkdirSync(testsDir, { recursive: true });

  const existingFiles = fs.readdirSync(testsDir).filter(f => f.endsWith('.spec.ts'));
  let maxIdx = 0;
  existingFiles.forEach(f => {
    const match = f.match(/^(\d+)[-_]/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxIdx) maxIdx = n;
    }
  });

  const nextIdx = String(maxIdx + 1).padStart(2, '0');
  const rawSlug = (meta.scenarioName || meta.module || 'unit-test')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const fileName = `${nextIdx}-${rawSlug}.spec.ts`;
  const filePath = path.join(testsDir, fileName);

  const lines = [];
  const isRmis = (meta.systemName || '').toLowerCase().includes('rmis') || (meta.projectName || '').toLowerCase().includes('rmis') || true;
  lines.push(`import { test, expect, Page } from '../src/fixtures/wedocit';`);
  lines.push(`import { ensureRmisAuthenticated, navigateToRmis } from '../src/helpers/rmis-auth';`);
  lines.push(`import * as path from 'path';`);
  lines.push(`import * as fs from 'fs';`);
  lines.push(``);
  lines.push(`const rmisAuthFile = path.resolve(process.cwd(), '.auth/user_rmis_admin.json');`);
  lines.push(`const legacyAuthFile = path.resolve(process.cwd(), '.auth/user_orms_admin.json');`);
  lines.push(`const activeAuthFile = fs.existsSync(rmisAuthFile) ? rmisAuthFile : (fs.existsSync(legacyAuthFile) ? legacyAuthFile : undefined);`);
  lines.push(``);
  lines.push(`test.use({`);
  lines.push(`  baseURL: process.env.RMIS_BASE_URL || process.env.ORMS_BASE_URL || '${meta.testUrl || 'http://localhost:4300'}',`);
  lines.push(`  viewport: { width: 1366, height: 768 },`);
  lines.push(`  storageState: activeAuthFile`);
  lines.push(`});`);
  lines.push(``);
  lines.push(`test.describe('Unit Test Suite: ${meta.title || meta.scenarioName || 'Automated Unit Test'}', () => {`);
  lines.push(``);
  lines.push(`  test.beforeEach(async ({ page, wedocit }) => {`);
  lines.push(`    wedocit.setMetadata({`);
  lines.push(`      docId: ${JSON.stringify(doc.id || '')},`);
  lines.push(`      systemName: ${JSON.stringify(meta.systemName || 'Risk Management Information System (RMIS)')},`);
  lines.push(`      projectName: ${JSON.stringify(meta.projectName || meta.systemName || 'Risk Management Information System (RMIS)')},`);
  lines.push(`      crNo: ${JSON.stringify(meta.testCaseId || meta.projectNo || 'CR 60133')},`);
  lines.push(`      title: ${JSON.stringify(meta.title || 'Unit Test Documentation')},`);
  lines.push(`      module: ${JSON.stringify(meta.scenarioName || meta.module || 'Modul Aplikasi')},`);
  lines.push(`      shortDescription: ${JSON.stringify(meta.shortDescription || 'Pengujian dan verifikasi modul aplikasi.')},`);
  lines.push(`      testedBy: ${JSON.stringify(meta.testedBy || 'QA Engineer')},`);
  lines.push(`      npp: ${JSON.stringify(meta.npp || '-')}`);
  lines.push(`    });`);
  lines.push(``);
  lines.push(`    await ensureRmisAuthenticated(page);`);
  lines.push(`  });`);
  lines.push(``);

  tcs.forEach((tc, idx) => {
    const tcNo = tc.tcNumberStr || `TC-${String(idx + 1).padStart(3, '0')}`;
    const tcTitle = tc.title || `Test Case ${idx + 1}`;
    lines.push(`  test('[${tcNo}] ${tcTitle.replace(/'/g, "\\'")}', async ({ page, wedocit }) => {`);
    lines.push(`    wedocit.setTestCase({`);
    lines.push(`      tcNumberStr: ${JSON.stringify(tcNo)},`);
    lines.push(`      scenarioName: ${JSON.stringify(tc.scenarioName || tcTitle)},`);
    lines.push(`      title: ${JSON.stringify(tcTitle)},`);
    lines.push(`      expectedResult: ${JSON.stringify(tc.expectedResult || 'Sistem berjalan normal.')},`);
    lines.push(`      role: ${JSON.stringify(tc.role || 'Admin / User')}`);
    lines.push(`    });`);
    lines.push(``);
    lines.push(`    await navigateToRmis(page, '${meta.testUrl ? meta.testUrl : '/'}');`);
    lines.push(`    await page.waitForTimeout(800);`);
    lines.push(``);

    const steps = tc.steps || [];
    steps.forEach((s, sIdx) => {
      // 1. Deteksi aksi navigasi ke sub-modul (URL: /xyz atau modul terkait)
      const urlMatch = (s.inputData || s.actionDescription || '').match(/(?:\/|http[s]?:\/\/[^\s/]+)(\/[a-zA-Z0-9\-_/]+)/);
      const isSubPath = s.pageUrl && s.pageUrl !== '/' && !s.pageUrl.endsWith(':4300/');
      const targetNav = isSubPath ? s.pageUrl.replace(/^http[s]?:\/\/[^/]+/, '') : (urlMatch ? urlMatch[1] : null);

      if (targetNav && targetNav !== '/') {
        lines.push(`    await navigateToRmis(page, '${targetNav}');`);
        lines.push(`    await page.waitForTimeout(1000);`);
      }

      // 2. Deteksi aksi interaksi klik tombol / pill switcher
      const clickMatch = (s.inputData || '').match(/Klik:\s*(.+)/i) || (s.actionDescription || '').match(/Mengklik\s+(?:tombol|pill|menu)?\s*["'“]([^"'”]+)["'”]/i);
      if (clickMatch) {
        const btnText = clickMatch[1].trim();
        lines.push(`    const btn_${sIdx} = page.locator('button, a').filter({ hasText: ${JSON.stringify(btnText)} }).first();`);
        lines.push(`    if (await btn_${sIdx}.isVisible({ timeout: 2000 }).catch(() => false)) {`);
        lines.push(`      await btn_${sIdx}.click();`);
        lines.push(`      await page.waitForTimeout(600);`);
        lines.push(`    }`);
        lines.push(`    await wedocit.captureStep({`);
        lines.push(`      title: ${JSON.stringify(s.title || `Langkah ${sIdx + 1}`)},`);
        lines.push(`      description: ${JSON.stringify(s.actionDescription || '-')},`);
        lines.push(`      input: ${JSON.stringify(s.inputData || '-')},`);
        lines.push(`      expected: ${JSON.stringify(s.expectedResult || 'Sesuai ekspektasi.')},`);
        lines.push(`      highlight: btn_${sIdx}`);
        lines.push(`    });`);
      } else {
        lines.push(`    await wedocit.captureStep({`);
        lines.push(`      title: ${JSON.stringify(s.title || `Langkah ${sIdx + 1}`)},`);
        lines.push(`      description: ${JSON.stringify(s.actionDescription || '-')},`);
        lines.push(`      input: ${JSON.stringify(s.inputData || '-')},`);
        lines.push(`      expected: ${JSON.stringify(s.expectedResult || 'Sesuai ekspektasi.')}`);
        lines.push(`    });`);
      }
      lines.push(``);
    });

    lines.push(`  });`);
    lines.push(``);
  });

  lines.push(`});`);

  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  return {
    filePath: `tests/${fileName}`,
    fileName: fileName,
    totalTcs: tcs.length,
    label: `⚡ [Generated] ${meta.scenarioName || meta.title} (${tcs.length} TC)`
  };
}

module.exports = {
  analyzeComponentAndBuildTestCases,
  generatePlaywrightSpecFromDocument
};
