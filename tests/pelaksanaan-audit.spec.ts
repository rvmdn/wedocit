import { test, expect } from '../src/fixtures/wedocit';

test.describe('Modul: Pelaksanaan Audit', () => {

  test('Melakukan Propose Pendalaman', async ({ page, wedocit }) => {
    // 1. Set Metadata Dokumen (Sesuai Format Resmi BNI EDV)
    wedocit.setMetadata({
      title: 'Unit Test Documentation - Pelaksanaan Audit',
      module: 'Pelaksanaan Audit',
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
      scope: 'Pengujian dan verifikasi alur fitur Propose Pendalaman pada Pelaksanaan Audit',
      acceptanceCriteria: 'Seluruh skenario pengujian berhasil dieksekusi dan notifikasi sukses tampil.'
    });

    // 2. Set Informasi Test Case (TC-007)
    wedocit.setTestCase({
      tcNumberStr: 'TC-007',
      scenarioName: 'Propose Pendalaman',
      title: 'Melakukan Propose Pendalaman',
      expectedResult: 'Data berhasil di-propose dan status proses terkait terbarui di sistem.',
      role: 'FASTIA26'
    });

    // Simulasi UI Halaman Pengujian (HTML Mock)
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>AMS FAST - Pelaksanaan Audit</title>
        <style>
          body { font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; }
          .header { background: #0284c7; padding: 12px; border-radius: 6px; font-weight: bold; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 6px; }
          th, td { border: 1px solid #334155; padding: 10px; text-align: left; }
          th { background: #0f172a; color: #38bdf8; }
          .btn { background: #0284c7; color: #fff; border: none; padding: 8px 14px; border-radius: 4px; cursor: pointer; }
          .toast { display: none; background: #059669; color: #fff; padding: 12px; border-radius: 6px; margin-top: 16px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">🏛️ AMS FAST - Pelaksanaan Audit [Role: FASTIA26]</div>
        <table>
          <thead>
            <tr><th>No</th><th>Nomor Surat Tugas</th><th>Auditee</th><th>Status</th><th>Aksi</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>7</td>
              <td>ST-2026-007</td>
              <td>Divisi Pengawasan & Audit Internal</td>
              <td><span style="color: #f59e0b;">Draft</span></td>
              <td><button id="btn-propose" class="btn">Propose Pendalaman</button></td>
            </tr>
          </tbody>
        </table>
        <div id="toast-success" class="toast">✔ Propose pendalaman berhasil disimpan ke sistem.</div>
        <script>
          document.getElementById('btn-propose').addEventListener('click', () => {
            document.getElementById('toast-success').style.display = 'block';
          });
        </script>
      </body>
      </html>
    `);

    // Step 1: Pilih Baris Data pada Tabel
    await wedocit.captureStep({
      title: 'Pilih Baris Data Penugasan pada Tabel',
      description: 'Pengguna memilih salah satu baris data penugasan pada tabel untuk diproses lebih lanjut.',
      input: 'Baris ke-7'
    });

    // Step 2: Input Catatan Propose (Tanpa Screenshot)
    await wedocit.captureStep({
      title: 'Input Catatan Propose Pendalaman',
      description: 'Pengguna memasukkan catatan pada field Catatan Propose: "propose unit sampling audit".',
      input: 'propose unit sampling audit',
      screenshot: false
    });

    // Step 3: Klik Tombol Propose & Konfirmasi Hasil
    await page.locator('#btn-propose').click();
    await expect(page.locator('#toast-success')).toBeVisible();

    await wedocit.captureStep({
      title: 'Notifikasi: "Propose pendalaman berhasil."',
      description: 'Sistem menampilkan pesan konfirmasi: "Propose pendalaman berhasil disimpan ke sistem.".',
      expected: 'Sistem berhasil memproses aksi dan menampilkan pesan konfirmasi sukses.'
    });
  });

  test('Melakukan View (Surat Tugas)', async ({ page, wedocit }) => {
    wedocit.setTestCase({
      tcNumberStr: 'TC 2',
      scenarioName: 'View (Surat Tugas)',
      title: 'Melakukan View (Surat Tugas)',
      expectedResult: 'Sistem menyajikan modal detail surat tugas dan rincian data auditee terkait.'
    });

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>AMS FAST - View Surat Tugas</title>
        <style>
          body { font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; }
          .modal { background: #1e293b; border: 1px solid #0284c7; padding: 20px; border-radius: 8px; width: 600px; margin: 40px auto; }
          .modal h3 { color: #38bdf8; margin-top: 0; }
        </style>
      </head>
      <body>
        <div class="modal">
          <h3>📄 Rincian Surat Tugas: ST-2026-007</h3>
          <p><b>Auditee:</b> Kantor Wilayah Jakarta Pusat</p>
          <p><b>Periode Audit:</b> Q3 2026</p>
          <p><b>Status:</b> Approved by PKA</p>
        </div>
      </body>
      </html>
    `);

    await wedocit.captureStep({
      title: 'Tampilan Detail Surat Tugas',
      description: 'Pengguna membuka dan meninjau seluruh informasi surat tugas pada dialog detail.'
    });
  });

});
