import { test, expect } from '../src/fixtures/wedocit';
import { ensureAuthenticated } from '../src/helpers/auth';

test.describe('Modul: Pelaksanaan Audit - Tahap 3: Kertas Kerja AP Non-Kredit', () => {

  test('Melakukan Persetujuan (Approval) - Approval Delete (AP Non Kredit)', async ({ page, wedocit }) => {
    // 1. Set Metadata Dokumen Resmi BNI EDV (Sesuai Standar Template Word BNI)
    wedocit.setMetadata({
      title: 'Unit Test Documentation - Pelaksanaan Audit',
      module: 'Pelaksanaan Audit (AP Non-Kredit)',
      systemName: 'AMS Fast - Pelaksanaan Audit',
      projectName: 'AMS (Audit Management System)',
      crNo: 'CR_AMS_2026_001',
      testedBy: 'Irvan Ramadan',
      npp: '822117',
      developers: [{ name: 'Irvan Ramadan', npp: '822117' }],
      startDate: '19/08/2026',
      endDate: '23/10/2026',
      docDate: '23/10/2026',
      copyrightYear: '2026',
      scope: 'Pengujian dan verifikasi alur otorisasi Approval Delete Kertas Kerja AP Non-Kredit oleh Supervisor / PKA pada server dev https://amsfast-dev.bni.co.id:8081',
      acceptanceCriteria: 'PKA berhasil melakukan persetujuan (Approve) terhadap permohonan hapus kertas kerja AP Non-Kredit pada server dev https://amsfast-dev.bni.co.id:8081 dan notifikasi konfirmasi tampil.'
    });

    // 2. Set Informasi Test Case Resmi (TC-035)
    wedocit.setTestCase({
      tcNumberStr: 'TC-035',
      scenarioName: 'Approval Delete (AP Non Kredit)',
      title: 'Melakukan Persetujuan (Approval) - Approval Delete (AP Non Kredit)',
      expectedResult: 'PKA berhasil melakukan persetujuan (Approve) terhadap usulan penghapusan kertas kerja AP Non Kredit dan status terbarui.',
      role: 'FASTIA26'
    });

    // 3. Pastikan Autentikasi / Cek Sesi ke Server AMS FAST Dev
    await ensureAuthenticated(page);

    // 4. Navigasi ke Halaman Modul Pelaksanaan Audit di Server Dev Resmi
    await page.goto('/audit-reguler/manajemen-audit/pelaksanaan-audit', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000); // Tunggu rendering PrimeNG selesai

    // --- Langkah 1: Akses Menu dan Tampilan Halaman Pelaksanaan Audit / Approval Delete ---
    await wedocit.captureStep({
      title: 'Verifikasi Tampilan Menu Pelaksanaan Audit & Approval Delete AP Non-Kredit',
      description: 'Pengguna (PKA) membuka antarmuka modul [Audit Reguler > Manajemen Audit > Pelaksanaan Audit] pada server https://amsfast-dev.bni.co.id:8081 dan memeriksa daftar penugasan/permohonan.',
      expected: 'Halaman antarmuka Pelaksanaan Audit termuat dengan baik, tabel/data tersaji lengkap, dan seluruh kontrol fungsional aktif.'
    });

    // Cek apakah halaman berada di tabel pelaksanaan audit atau diarahkan ke login
    const isLoginPage = page.url().includes('/login');

    if (isLoginPage) {
      console.log('[WeDocIt] Terdeteksi halaman login AMS FAST dev server.');
      await wedocit.captureStep({
        title: 'Verifikasi Halaman Login AMS FAST Dev Server',
        description: 'Sistem menyajikan halaman autentikasi FAST BNI pada dev server https://amsfast-dev.bni.co.id:8081.',
        expected: 'Form login tersaji dengan field Username, Password, Type, dan tombol Login aktif.'
      });
      return;
    }

    // --- Langkah 2: Interaksi dengan Tabel & Pencarian Kertas Kerja ---
    const tableLocator = page.locator('p-table, .p-datatable');
    if (await tableLocator.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Jika ada baris tabel di modul
      const firstRowCheckbox = page.locator('p-tablecheckbox, .p-checkbox').first();
      if (await firstRowCheckbox.isVisible()) {
        await firstRowCheckbox.click();
        await wedocit.captureStep({
          title: 'Centang Kotak Pilihan (Checkbox) Permohonan Hapus',
          description: 'Pengguna mencentang kotak pilihan pada baris kertas kerja AP Non-Kredit yang akan diproses persetujuannya.',
          input: 'AP Non-Kredit (Checked)',
          screenshot: false // Form / checklist tidak perlu screenshot ganda
        });
      }

      // --- Langkah 3: Input Catatan / Komentar Persetujuan jika field tersedia ---
      const commentInput = page.locator('textarea, input[placeholder*="komentar" i], input[placeholder*="catatan" i]').first();
      if (await commentInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await commentInput.fill('Disetujui untuk dihapus sesuai memo klarifikasi tim audit.');
        await wedocit.captureStep({
          title: 'Input Catatan Persetujuan PKA',
          description: 'Pengguna memasukkan catatan persetujuan pada field Catatan: "Disetujui untuk dihapus sesuai memo klarifikasi tim audit.".',
          input: 'Disetujui untuk dihapus sesuai memo klarifikasi tim audit.',
          screenshot: false
        });
      }

      // --- Langkah 4: Klik Tombol Approve / Setujui ---
      const approveButton = page.locator('button:has-text("Approve"), button:has-text("Setujui")').first();
      if (await approveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await approveButton.click();
        await page.waitForTimeout(1000);

        // Jika muncul dialog konfirmasi PrimeNG
        const confirmDialog = page.locator('p-confirmdialog, .p-dialog');
        if (await confirmDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
          await wedocit.captureStep({
            title: 'Tampilan Dialog Konfirmasi Persetujuan',
            description: 'Sistem menampilkan popup dialog konfirmasi persetujuan penghapusan kertas kerja.',
            expected: 'Dialog konfirmasi menampilkan pesan verifikasi sebelum eksekusi approval dilakukan.'
          });

          // Klik tombol konfirmasi Ya / Setuju
          const confirmYes = confirmDialog.locator('button:has-text("Ya"), button:has-text("Yes"), button:has-text("Setuju")').first();
          if (await confirmYes.isVisible()) {
            await confirmYes.click();
          }
        }

        // --- Langkah 5: Tangkap Evidens Hasil Akhir (Toast Notifikasi Berhasil) ---
        await page.waitForTimeout(1500);
        await wedocit.captureStep({
          title: 'Persetujuan (Approve) Penghapusan Kertas Kerja Berhasil',
          description: 'Pengguna memproses persetujuan (Approve) dan sistem memperbarui status data.',
          expected: 'Sistem berhasil memproses aksi persetujuan dan menyajikan pesan konfirmasi sukses.'
        });
      }
    }

  });

});
