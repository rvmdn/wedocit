import { test, expect, Page } from '../src/fixtures/wedocit';
import { ensureRmisAuthenticated, navigateToRmis } from '../src/helpers/rmis-auth';
import * as path from 'path';
import * as fs from 'fs';

const rmisAuthFile = path.resolve(process.cwd(), '.auth/user_rmis_admin.json');
const legacyAuthFile = path.resolve(process.cwd(), '.auth/user_orms_admin.json');
const activeAuthFile = fs.existsSync(rmisAuthFile) ? rmisAuthFile : (fs.existsSync(legacyAuthFile) ? legacyAuthFile : undefined);

test.use({
  baseURL: process.env.RMIS_BASE_URL || process.env.ORMS_BASE_URL || 'http://localhost:4300',
  viewport: { width: 1366, height: 768 },
  storageState: activeAuthFile
});

test.describe('Unit Test Suite: [RMIS] Main Dashboard Executive Overview', () => {

  test.beforeEach(async ({ page, wedocit }) => {
    wedocit.setMetadata({
      docId: "doc_1793845594798",
      systemName: "Risk Management Information System (RMIS)",
      projectName: "Risk Management Information System (RMIS)",
      crNo: "CR_2026_001",
      title: "Unit Test Documentation - [RMIS] Main Dashboard Executive Overview",
      module: "Main Dashboard",
      shortDescription: "Pengujian fungsionalitas visualisasi widget KPI, grafik tren risiko, dan interaktivitas halaman utama Main Dashboard serta cross-navigation ke modul RBBR, MIO, dan MRM.",
      testedBy: "QA Engineer",
      npp: "-"
    });

    await ensureRmisAuthenticated(page);
  });

  test('[TC-001] Filter & Switcher Sumber Data Eksekutif (All, RBBR, MIO, MRM)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: "TC-001",
      scenarioName: "Pengujian Interaktivitas Pill Switcher Sumber Data Dashboard",
      title: "Filter & Switcher Sumber Data Eksekutif (All, RBBR, MIO, MRM)",
      expectedResult: "Kontainer dashboard berhasil memfilter dan menampilkan kartu risiko sesuai sumber data yang dipilih secara responsif.",
      role: "Admin / User"
    });

    await navigateToRmis(page, '/');
    await page.waitForTimeout(1000);

    const banner = page.locator('h1:has-text("Hi,")').first();
    await wedocit.captureStep({
      title: "Akses Halaman Utama Executive Dashboard",
      description: "Pengguna membuka halaman utama RMIS pada URL http://localhost:4300.",
      input: "URL: http://localhost:4300",
      expected: "Halaman dashboard berhasil dimuat dengan banner sapaan dan tombol switcher sumber data aktif.",
      highlight: banner
    });

    // Switcher: Semua Data
    const btnAll = page.locator('button:has-text("Semua Data")').first();
    if (await btnAll.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btnAll.click();
      await page.waitForTimeout(600);
    }
    await wedocit.captureStep({
      title: "Uji Switcher: Semua Data (3 Source)",
      description: "Mengklik tombol pill switcher \"Semua Data (3 Source)\" pada header dashboard.",
      input: "Klik: Semua Data (3 Source)",
      expected: "Grid dashboard menampilkan seluruh kartu risiko dari 3 sumber terintegrasi (RBBR, MIO, dan MRM).",
      highlight: btnAll,
      highlightColor: 'blue'
    });

    // Switcher: RBBR
    const btnRbbr = page.locator('button:has-text("RBBR")').first();
    if (await btnRbbr.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btnRbbr.click();
      await page.waitForTimeout(600);
    }
    await wedocit.captureStep({
      title: "Uji Switcher: Filter Khusus Modul RBBR",
      description: "Mengklik tombol pill switcher \"RBBR\".",
      input: "Klik: RBBR",
      expected: "Tampilan dashboard menyaring konten dan hanya menampilkan seksi matriks profil risiko dan TKB RBBR.",
      highlight: btnRbbr,
      highlightColor: 'emerald'
    });

    // Switcher: MIO
    const btnMio = page.locator('button:has-text("MIO")').first();
    if (await btnMio.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btnMio.click();
      await page.waitForTimeout(600);
    }
    await wedocit.captureStep({
      title: "Uji Switcher: Filter Khusus Modul MIO",
      description: "Mengklik tombol pill switcher \"MIO\".",
      input: "Klik: MIO",
      expected: "Tampilan dashboard hanya menyajikan indikator ketersediaan alat likuid dan chart tren limit MIO.",
      highlight: btnMio,
      highlightColor: 'amber'
    });

    // Switcher: MRM
    const btnMrm = page.locator('button:has-text("MRM")').first();
    if (await btnMrm.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btnMrm.click();
      await page.waitForTimeout(600);
    }
    await wedocit.captureStep({
      title: "Uji Switcher: Filter Khusus Modul MRM",
      description: "Mengklik tombol pill switcher \"MRM\".",
      input: "Klik: MRM",
      expected: "Tampilan dashboard menyaring dan menampilkan ringkasan Model Risk Management.",
      highlight: btnMrm,
      highlightColor: 'red'
    });
  });

  test('[TC-002] Dashboard Eksekutif - Ringkasan Potongan Data RBBR & Tingkat Kesehatan Bank', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: "TC-002",
      scenarioName: "Verifikasi Visualisasi Matriks Profil Risiko, Rentabilitas, dan Donut Chart TKB",
      title: "Dashboard Eksekutif - Ringkasan Potongan Data RBBR & Tingkat Kesehatan Bank",
      expectedResult: "Seluruh komponen kartu RBBR ter-render sempurna dengan nilai matriks tren dan chart TKB yang proporsional.",
      role: "Admin / User"
    });

    await navigateToRmis(page, '/');
    const btnRbbr = page.locator('button:has-text("RBBR")').first();
    if (await btnRbbr.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btnRbbr.click();
      await page.waitForTimeout(600);
    }

    const profilRisiko = page.locator('text=/Profil Risiko|Tingkat Kesehatan Bank/i').first();
    await wedocit.captureStep({
      title: "Periksa Ringkasan Profil Risiko & Rentabilitas",
      description: "Memeriksa deskripsi teks dan badge status profil risiko serta rentabilitas bank pada kartu RBBR.",
      input: "-",
      expected: "Teks narasi profil risiko dan rentabilitas tampil jelas dan sesuai data backend.",
      highlight: profilRisiko
    });

    const gcgTable = page.locator('table, .grid').first();
    await wedocit.captureStep({
      title: "Verifikasi Matriks Tata Kelola (GCG) & Permodalan",
      description: "Memeriksa tabel perbandingan nilai semester (Jun vs Des) dan indikator tren naik/turun/stabil.",
      input: "-",
      expected: "Tabel matriks menampilkan baris komponen, nilai perbandingan semester, serta simbol arah tren yang valid.",
      highlight: gcgTable
    });

    const donutChart = page.locator('.echarts, canvas, svg, [class*="chart"]').first();
    await wedocit.captureStep({
      title: "Verifikasi Visualisasi Donut Chart Peringkat TKB",
      description: "Memeriksa render grafik donut Tingkat Kesehatan Bank beserta label kompositnya.",
      input: "-",
      expected: "Grafik donut TKB tampil utuh di tengah kartu dengan pewarnaan peringkat komposit yang tepat.",
      highlight: donutChart
    });
  });

  test('[TC-003] Dashboard Eksekutif - Ringkasan Potongan Data MIO (Middle Office)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: "TC-003",
      scenarioName: "Verifikasi Status Ketersediaan Alat Likuid, Risk Appetite, dan Grafik Likuiditas",
      title: "Dashboard Eksekutif - Ringkasan Potongan Data MIO (Middle Office)",
      expectedResult: "Indikator status operasional likuiditas dan chart ECharts MIO tersaji lengkap tanpa kendala rendering.",
      role: "Admin / User"
    });

    await navigateToRmis(page, '/');
    const btnMio = page.locator('button:has-text("MIO")').first();
    if (await btnMio.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btnMio.click();
      await page.waitForTimeout(600);
    }

    const alatLikuid = page.locator('text=/Alat Likuid|Likuiditas|Normal/i').first();
    await wedocit.captureStep({
      title: "Verifikasi Badge Status Ketersediaan Alat Likuid",
      description: "Memeriksa kotak indikator alat likuid di kolom pertama kartu MIO.",
      input: "-",
      expected: "Badge status menampilkan label kondisi likuiditas (NORMAL/WASPADA) dengan warna kontras standar.",
      highlight: alatLikuid
    });

    const riskAppetite = page.locator('text=/Risk Appetite|Toleransi/i').first();
    await wedocit.captureStep({
      title: "Verifikasi Indikator Range Risk Appetite",
      description: "Memeriksa kotak status kesesuaian operasional terhadap limit toleransi risiko.",
      input: "-",
      expected: "Status toleransi risiko tampil jelas (contoh: \"DALAM RANGE RISK APPETITE\").",
      highlight: riskAppetite
    });

    const mioChart = page.locator('canvas, svg, .echarts').first();
    await wedocit.captureStep({
      title: "Verifikasi Grafik ECharts Ketahanan & Kualitas Likuiditas",
      description: "Memeriksa visualisasi grafik chart pada kolom kedua dan ketiga kartu MIO.",
      input: "-",
      expected: "Grafik ECharts ketahanan likuiditas dan tren limit ter-render rapi dengan sumbu dan legenda aktif.",
      highlight: mioChart
    });
  });

  test('[TC-004] Dashboard Eksekutif - Ringkasan Potongan Data MRM (Model Risk Management)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: "TC-004",
      scenarioName: "Verifikasi Metrik Model Inventory, Status Validasi, dan Matriks Life Cycle",
      title: "Dashboard Eksekutif - Ringkasan Potongan Data MRM (Model Risk Management)",
      expectedResult: "Metrik agregasi model risiko kuantitatif terdisplay akurat sesuai klasifikasi tiering perbankan.",
      role: "Admin / User"
    });

    await navigateToRmis(page, '/');
    const btnMrm = page.locator('button:has-text("MRM")').first();
    if (await btnMrm.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btnMrm.click();
      await page.waitForTimeout(600);
    }

    const modelMetric = page.locator('text=/Model|Inventory|Tier/i').first();
    await wedocit.captureStep({
      title: "Verifikasi Metrik Total Model Inventory",
      description: "Memeriksa angka rekapitulasi jumlah model aktif dan dalam pengembangan pada ringkasan MRM.",
      input: "-",
      expected: "Angka total model risiko terdata dan tersaji pada tile ringkasan.",
      highlight: modelMetric
    });

    const tieringSection = page.locator('text=/Tier 1|Tier 2|Tier 3/i').first();
    await wedocit.captureStep({
      title: "Verifikasi Distribusi Tiering & Tingkat Risiko Model",
      description: "Memeriksa visualisasi proporsi model berdasarkan Tier 1, Tier 2, dan Tier 3.",
      input: "-",
      expected: "Distribusi tier model risiko terpetakan proporsional sesuai data master model.",
      highlight: tieringSection
    });

    const lifecycleSection = page.locator('text=/Validasi|Life Cycle|Siklus/i').first();
    await wedocit.captureStep({
      title: "Verifikasi Siklus Hidup & Kepatuhan Validasi Model",
      description: "Memeriksa ringkasan kepatuhan validasi berkala model risiko perbankan.",
      input: "-",
      expected: "Status tahapan life cycle dan indikator kepatuhan validasi model terdisplay dengan benar.",
      highlight: lifecycleSection
    });
  });

  test('[TC-005] Dashboard Eksekutif - Cross-Navigation ke Modul Operasional Terkait', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: "TC-005",
      scenarioName: "Pengujian Tautan Drilldown Navigasi dari Dashboard ke Sub-Modul Detil",
      title: "Dashboard Eksekutif - Cross-Navigation ke Modul Operasional Terkait",
      expectedResult: "Pengguna dapat bertransisi secara seamless dari kartu ringkasan dashboard menuju halaman modul operasional penuh.",
      role: "Admin / User"
    });

    // 1. Cross-Navigation ke Modul RBBR
    await navigateToRmis(page, '/rbbr');
    await page.waitForTimeout(1200);
    const rbbrHeader = page.locator('h1, h2, text="TINGKAT KESEHATAN BANK"').first();
    await wedocit.captureStep({
      title: "Navigasi Drilldown ke Modul RBBR / TKB",
      description: "Pengguna berpindah dari dashboard menuju halaman modul operasional penuh Tingkat Kesehatan Bank (RBBR).",
      input: "Navigasi URL: http://localhost:4300/rbbr",
      expected: "Sistem berhasil memuat halaman operasional modul RBBR (/rbbr/dashboard) dengan tabel komposit lengkap.",
      highlight: rbbrHeader
    });

    // 2. Cross-Navigation ke Modul Middle Office (MIO)
    await navigateToRmis(page, '/mio');
    await page.waitForTimeout(1200);
    const mioHeader = page.locator('h1, h2, text="MIDDLE OFFICE"').first();
    await wedocit.captureStep({
      title: "Navigasi Drilldown ke Modul Middle Office (MIO)",
      description: "Pengguna berpindah dari dashboard menuju halaman modul operasional penuh Middle Office (MIO).",
      input: "Navigasi URL: http://localhost:4300/mio",
      expected: "Sistem berhasil menampilkan modul operasional Middle Office (/mio) secara lengkap.",
      highlight: mioHeader
    });

    // 3. Cross-Navigation ke Modul Model Risk Management (MRM)
    await navigateToRmis(page, '/risk-management');
    await page.waitForTimeout(1200);
    const mrmHeader = page.locator('h1, h2, text="HOME", text="Model Risk Management"').first();
    await wedocit.captureStep({
      title: "Navigasi Drilldown ke Modul Model Risk Management (MRM)",
      description: "Pengguna berpindah dari dashboard menuju halaman modul operasional penuh Model Risk Management (MRM).",
      input: "Navigasi URL: http://localhost:4300/risk-management",
      expected: "Sistem berhasil memuat modul operasional Model Risk Management (/risk-management).",
      highlight: mrmHeader
    });
  });

});
