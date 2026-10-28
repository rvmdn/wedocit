param(
    [switch]$Headed,
    [switch]$DebugMode,
    [switch]$ExportPdf
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  WeDocIt Runner: [ORMS] Integrasi LDAP Active Directory  " -ForegroundColor Yellow
Write-Host "  CR No: CR 60131 | Viewport: 1366x768 (Standar BNI)      " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Pastikan file .env ada
if (Test-Path ".env") {
    Write-Host "✔ File .env terdeteksi (kredensial terkonfigurasi)." -ForegroundColor Green
} else {
    Write-Host "⚠️ File .env belum ditemukan, membuat file default..." -ForegroundColor Yellow
    @"
FAST_BASE_URL=https://amsfast-dev.bni.co.id:8081
ORMS_BASE_URL=http://localhost:4300
ORMS_USERNAME=Admin
ORMS_PASSWORD=AdminBni1234/
"@ | Out-File -Encoding utf8 .env
}

# 2. Cek apakah WeDocIt Studio running di http://127.0.0.1:4400
try {
    $weDocItStatus = Invoke-RestMethod -Uri "http://127.0.0.1:4400/api/workspace" -Method Get -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✔ WeDocIt Studio Server aktif di port 4400." -ForegroundColor Green
} catch {
    Write-Host "⚠️ WeDocIt Studio Desktop belum aktif di port 4400." -ForegroundColor Yellow
    Write-Host "   Tips: Jalankan 'node server.js' di terminal lain agar evidens langsung tersinkron." -ForegroundColor DarkGray
}

# 3. Parameter Eksekusi Playwright
$playwrightArgs = @("playwright", "test", "tests/06-orms-ldap.spec.ts")

if ($Headed) {
    $playwrightArgs += "--headed"
    Write-Host "🖥️ Mode Headed diaktifkan: Browser akan tampil di layar." -ForegroundColor Cyan
}

if ($DebugMode) {
    $playwrightArgs += "--debug"
    Write-Host "🐛 Mode Debug diaktifkan." -ForegroundColor Magenta
}

Write-Host "`n🚀 Menjalankan Otomasi Pengujian Playwright..." -ForegroundColor Cyan
Write-Host "Perintah: npx $($playwrightArgs -join ' ')`n" -ForegroundColor DarkGray

& npx @playwrightArgs

$exitCode = $LASTEXITCODE

Write-Host "`n----------------------------------------------------------" -ForegroundColor DarkGray
if ($exitCode -eq 0) {
    Write-Host "🎉 Seluruh Test Case Berhasil Dieksekusi (Exit Code: 0)!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Terdapat langkah yang membutuhkan penyesuaian (Exit Code: $exitCode)." -ForegroundColor Yellow
}

# 4. Trigger Ekspor PDF Otomatis jika diminta
if ($ExportPdf) {
    Write-Host "`n📄 Mengirim permintaan compile PDF ke WeDocIt Studio..." -ForegroundColor Cyan
    try {
        $pdfResp = Invoke-RestMethod -Uri "http://127.0.0.1:4400/api/export-pdf" -Method Post -TimeoutSec 60
        if ($pdfResp.success) {
            Write-Host "✅ Dokumen PDF Berhasil Dibuat: $($pdfResp.pdfPath)" -ForegroundColor Green
        } else {
            Write-Host "❌ Gagal Ekspor PDF: $($pdfResp.error)" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Gagal menghubungi endpoint ekspor: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Selesai. Buka http://127.0.0.1:4400 untuk melihat evidens." -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
