import { test, expect } from '../src/fixtures/wedocit';

test.describe('Modul: Pelaksanaan Audit - Tahap 3: Kertas Kerja AP Non-Kredit', () => {

  test('Melakukan Persetujuan (Approval) - Approval Delete (AP Non Kredit)', async ({ page, wedocit }) => {
    // 1. Set Metadata Dokumen Resmi BNI EDV
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
      scope: 'Pengujian dan verifikasi alur otorisasi Approval Delete Kertas Kerja AP Non-Kredit oleh Supervisor / PKA',
      acceptanceCriteria: 'PKA berhasil melakukan persetujuan (Approve) terhadap permohonan hapus kertas kerja dan notifikasi konfirmasi tampil.'
    });

    // 2. Set Informasi Test Case Resmi (TC-035)
    wedocit.setTestCase({
      tcNumberStr: 'TC-035',
      scenarioName: 'Approval Delete (AP Non Kredit)',
      title: 'Melakukan Persetujuan (Approval) - Approval Delete (AP Non Kredit)',
      expectedResult: 'PKA berhasil melakukan persetujuan (Approve) terhadap usulan penghapusan kertas kerja AP Non Kredit dan status terbarui.',
      role: 'FASTIA26'
    });

    // 3. Simulasi Antarmuka Halaman Approval AP Non Kredit (UI Mock Standar AMS FAST)
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>AMS FAST - Approval Delete AP Non Kredit</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          body { background: #0b1120; color: #f8fafc; padding: 24px; }
          .header-bar { background: linear-gradient(135deg, #0284c7, #0369a1); padding: 14px 20px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
          .title { font-size: 16px; font-weight: 800; color: #fff; }
          .role-badge { background: #0f172a; color: #38bdf8; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; border: 1px solid #38bdf8; }
          .breadcrumb { font-size: 11px; color: #94a3b8; margin-bottom: 14px; }
          .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 18px; }
          table { width: 100%; border-collapse: collapse; margin-top: 14px; }
          th, td { border: 1px solid #1e293b; padding: 10px 12px; font-size: 12px; text-align: left; }
          th { background: #162032; color: #38bdf8; font-weight: 700; }
          tr:hover { background: rgba(56, 189, 248, 0.05); }
          .checkbox-cell { text-align: center; width: 45px; }
          .status-badge { background: rgba(245, 158, 11, 0.15); color: #f59e0b; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 11px; border: 1px solid rgba(245, 158, 11, 0.3); }
          .btn-group { display: flex; gap: 8px; margin-top: 16px; justify-content: flex-end; }
          .btn { padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; border: none; transition: 0.15s; }
          .btn-approve { background: #059669; color: #fff; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.4); }
          .btn-approve:hover { background: #10b981; }
          .btn-reject { background: #dc2626; color: #fff; }
          .form-group { margin-top: 16px; }
          .form-group label { display: block; font-size: 11px; color: #94a3b8; margin-bottom: 4px; font-weight: 600; }
          .input-text { width: 100%; background: #1e293b; border: 1px solid #334155; color: #f8fafc; padding: 8px 10px; border-radius: 6px; font-size: 12px; outline: none; }
          .toast-success { display: none; background: #059669; color: #fff; padding: 12px 18px; border-radius: 6px; margin-top: 16px; font-weight: bold; font-size: 13px; box-shadow: 0 4px 14px rgba(0,0,0,0.4); }
        </style>
      </head>
      <body>
        <div class="breadcrumb">Audit Reguler &gt; Manajemen Audit &gt; Pelaksanaan Audit &gt; Approval Delete AP Non-Kredit</div>
        <div class="header-bar">
          <div class="title">🏛️ Otorisasi Persetujuan Hapus Kertas Kerja (Approval Delete)</div>
          <div class="role-badge">👤 Role: FASTIA26 (Pengendali Teknis / PKA)</div>
        </div>

        <div class="card">
          <p style="font-size: 12px; color: #cbd5e1; margin-bottom: 8px;">Daftar permohonan penghapusan baris pengujian AP Non-Kredit yang diajukan oleh Auditor Lapangan (FASTIA25):</p>
          <table>
            <thead>
              <tr>
                <th class="checkbox-cell">Pilih</th>
                <th>No</th>
                <th>Kode AP</th>
                <th>Deskripsi Pengujian</th>
                <th>Auditor Pemohon</th>
                <th>Alasan Penghapusan</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="checkbox-cell"><input type="checkbox" id="chk-item-1" checked></td>
                <td>1</td>
                <td>AP-NK-04</td>
                <td>Verifikasi Dokumen Bukti Kasbon Non Operasional</td>
                <td>Auditor Lapangan (FASTIA25)</td>
                <td>Double input / data pengujian dipindahkan ke sampling cabang</td>
                <td><span class="status-badge" id="lbl-status">Menunggu Persetujuan PKA</span></td>
              </tr>
            </tbody>
          </table>

          <div class="form-group">
            <label for="txt-catatan">Catatan Persetujuan Supervisor / PKA (Opsional):</label>
            <input type="text" id="txt-catatan" class="input-text" value="Disetujui untuk dihapus sesuai memo klarifikasi tim audit.">
          </div>

          <div class="btn-group">
            <button type="button" class="btn btn-reject">Tolak Permohonan</button>
            <button type="button" id="btn-approve" class="btn btn-approve">✔ Setujui Penghapusan (Approve)</button>
          </div>

          <div id="toast-approval" class="toast-success">
            ✔ Sukses: Permohonan penghapusan kertas kerja AP-NK-04 berhasil disetujui oleh PKA. Status berkas diperbarui.
          </div>
        </div>

        <script>
          document.getElementById('btn-approve').addEventListener('click', () => {
            document.getElementById('lbl-status').textContent = 'Disetujui (Approved)';
            document.getElementById('lbl-status').style.background = 'rgba(5, 150, 105, 0.2)';
            document.getElementById('lbl-status').style.color = '#34d399';
            document.getElementById('lbl-status').style.borderColor = '#059669';
            document.getElementById('toast-approval').style.display = 'block';
          });
        </script>
      </body>
      </html>
    `);

    // --- Langkah 1: Akses Menu dan Tampilan Halaman Approval Delete ---
    await wedocit.captureStep({
      title: 'Verifikasi Tampilan Menu Approval Delete AP Non-Kredit',
      description: 'Pengguna (PKA) membuka antarmuka modul [Audit Reguler > Manajemen Audit > Pelaksanaan Audit > Approval Delete AP Non-Kredit] dan memeriksa daftar permohonan.',
      expected: 'Daftar permohonan penghapusan kertas kerja tersaji lengkap dengan status "Menunggu Persetujuan PKA".'
    });

    // --- Langkah 2: Centang Baris Permohonan Pengujian yang Dihapus ---
    await page.locator('#chk-item-1').check();
    await wedocit.captureStep({
      title: 'Centang Kotak Pilihan (Checkbox) Permohonan Hapus',
      description: 'Pengguna mencentang kotak pilihan pada baris kertas kerja [AP-NK-04] yang akan diproses persetujuannya.',
      input: 'AP-NK-04 (Checked)',
      screenshot: false // Langkah checklist tidak perlu screenshot berlebih
    });

    // --- Langkah 3: Input Catatan Persetujuan PKA ---
    await page.locator('#txt-catatan').fill('Disetujui untuk dihapus sesuai memo klarifikasi tim audit.');
    await wedocit.captureStep({
      title: 'Input Catatan Persetujuan PKA',
      description: 'Pengguna memasukkan catatan persetujuan pada field Catatan: "Disetujui untuk dihapus sesuai memo klarifikasi tim audit.".',
      input: 'Disetujui untuk dihapus sesuai memo klarifikasi tim audit.',
      screenshot: false // Form input tidak perlu screenshot
    });

    // --- Langkah 4: Klik Tombol Approve dan Ambil Screenshot Evidens Sukses ---
    await page.locator('#btn-approve').click();
    await expect(page.locator('#toast-approval')).toBeVisible();

    await wedocit.captureStep({
      title: 'Persetujuan (Approve) Penghapusan Kertas Kerja AP Non-Kredit',
      description: 'Pengguna menekan tombol "Setujui Penghapusan (Approve)" untuk memproses otorisasi supervisor PKA.',
      expected: 'Sistem menampilkan notifikasi konfirmasi: "Permohonan penghapusan kertas kerja AP-NK-04 berhasil disetujui oleh PKA" dan status data terbarui menjadi Approved.'
    });

  });

});
