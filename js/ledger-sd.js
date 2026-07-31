import { supabase } from './config.js';
import { loadCurrentUser, getCurrentUser } from './session.js';

let currentUser = null;
let currentClass = null;

let currentLedgerData = [];
let currentMapel = [];
let currentSemester = null;

console.log('Ledger SD Loaded - Compact Mode');

document.addEventListener('DOMContentLoaded', async () => {
  await initLedger();

  const exportBtn = document.getElementById('exportLedgerBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', handleExportExcel);
  }
});

// Fungsi pembuat singkatan Nama Mapel agar header tidak terlalu lebar
function getShortMapelName(fullName) {
  const map = {
    'Pendidikan Agama Islam': 'PAI',
    'Pendidikan Agama Islam dan Budi Pekerti': 'PAI',
    'Pancasila': 'PPKn',
    'Pendidikan Pancasila': 'PPKn',
    'Bahasa Indonesia': 'B.Indo',
    'Matematika': 'MTK',
    'Ilmu Pengetahuan Alam dan Sosial': 'IPAS',
    'Seni Budaya': 'SBdP',
    'Seni dan Budaya': 'SBdP',
    'Seni Musik': 'S.Musik',
    'Seni Rupa': 'S.Rupa',
    'Pendidikan Jasmani, Olahraga, dan Kesehatan': 'PJOK',
    'Bahasa Inggris': 'B.Ing',
    'Bahasa Daerah': 'B.Sunda'
  };

  return map[fullName] || (fullName.length > 8 ? fullName.substring(0, 6) + '.' : fullName);
}

// ==========================================
// 1. INIT LEDGER
// ==========================================
export async function initLedger() {
  const container = document.getElementById('ledgerContainer');
  const sekolahInfo = document.getElementById('sekolahLedgerInfo');
  const semesterInfo = document.getElementById('ledgerSemesterInfo');
  const kelasInfo = document.getElementById('ledgerKelasInfo');

  try {
    if (container) {
      container.innerHTML = '<p style="text-align:center; padding:20px; color:#64748b;">⏳ Memuat Ledger...</p>';
    }

    await loadCurrentUser();
    currentUser = getCurrentUser();

    if (!currentUser || !currentUser.kelas) {
      alert('Session atau data kelas tidak ditemukan.');
      if (container) container.innerHTML = '<p style="color:#ef4444; text-align:center;">Data kelas tidak ditemukan.</p>';
      return;
    }

    // Set nama sekolah dinamis dari profil user login
    if (sekolahInfo) {
      sekolahInfo.textContent = currentUser.profile?.sekolah || 'Sekolah -';
    }

    currentClass = currentUser.kelas;

    if (kelasInfo) {
      kelasInfo.textContent = `Kelas ${currentClass.nama_kelas || currentClass.tingkat || '-'}`;
    }

    // A. LOAD SEMESTER AKTIF
    const { data: semester, error: semesterError } = await supabase
      .from('semester')
      .select('*')
      .eq('school_id', currentUser.profile.school_id)
      .eq('is_active', true)
      .maybeSingle();

    if (semesterError || !semester) {
      if (semesterInfo) semesterInfo.textContent = 'Semester tidak aktif';
      if (container) container.innerHTML = '<p style="color:#ef4444; text-align:center;">Semester aktif tidak ditemukan.</p>';
      return;
    }

    currentSemester = semester;
    if (semesterInfo) {
      semesterInfo.textContent = `${semester.nama_semester} • T.A ${semester.tahun_ajaran}`;
    }

    // B. LOAD SISWA
    const { data: siswa, error: siswaError } = await supabase
      .from('siswa')
      .select('id, nama_siswa')
      .eq('class_id', currentClass.id)
      .order('nama_siswa');

    if (siswaError) throw siswaError;

    // C. LOAD MAPEL
    const { data: mapel, error: mapelError } = await supabase
      .from('mata_pelajaran')
      .select('id, nama_mapel')
      .eq('school_id', currentUser.profile.school_id)
      .order('id');

    if (mapelError) throw mapelError;

    currentMapel = mapel || [];

    // D. LOAD NILAI
    const { data: nilai, error: nilaiError } = await supabase
      .from('nilai_sd')
      .select('*')
      .eq('school_id', currentUser.profile.school_id)
      .eq('class_id', currentClass.id)
      .eq('semester_id', semester.id);

    if (nilaiError) throw nilaiError;

    // E. OLAH DATA LEDGER
    const ledgerData = [];

    siswa?.forEach(s => {
      let total = 0;
      let jumlahMapelDiisi = 0;
      const nilaiMapel = {};

      currentMapel.forEach(m => {
        const n = nilai?.find(
          x => Number(x.siswa_id) === Number(s.id) && Number(x.mapel_id) === Number(m.id)
        );

        const akhir = n?.nilai_akhir !== null && n?.nilai_akhir !== undefined ? Number(n.nilai_akhir) : null;
        nilaiMapel[m.id] = akhir;

        if (akhir !== null && !isNaN(akhir)) {
          total += akhir;
          jumlahMapelDiisi++;
        }
      });

      const rata = jumlahMapelDiisi > 0 ? total / jumlahMapelDiisi : 0;

      ledgerData.push({
        siswa_id: s.id,
        nama: s.nama_siswa,
        nilai: nilaiMapel,
        rata: rata,
        hasValue: jumlahMapelDiisi > 0
      });
    });

    currentLedgerData = ledgerData;

    // F. RENDER TABEL RESPONSITIF
    let html = `
      <div style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
        <h3 style="color:#0f766e; font-size:1.05rem; margin:0; font-weight:600;">
          📊 Rekap Ledger Nilai Keseluruhan
        </h3>
      </div>

      <div style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; background:#fff;">
        <table style="width:100%; table-layout:fixed; border-collapse:collapse; font-size:0.82rem;">
          <thead>
            <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; color:#334155;">
              <th style="padding:8px 4px; width:32px; text-align:center;">No</th>
              <th style="padding:8px 8px; text-align:left; width:auto;">Nama Siswa</th>
    `;

    currentMapel.forEach(m => {
      const shortName = getShortMapelName(m.nama_mapel);
      html += `
        <th style="padding:8px 2px; width:52px; text-align:center; font-weight:600;" title="${m.nama_mapel}">
          ${shortName}
        </th>`;
    });

    html += `
              <th style="padding:8px 2px; width:58px; background:#d1fae5; color:#0f766e; text-align:center; font-weight:bold;">
                Rata²
              </th>
            </tr>
          </thead>
          <tbody>
    `;

    ledgerData.forEach((s, index) => {
      const bgRow = index % 2 === 0 ? '#ffffff' : '#f8fafc';

      html += `
        <tr style="border-bottom:1px solid #f1f5f9; background:${bgRow};">
          <td style="padding:6px 2px; color:#64748b; text-align:center; font-size:0.8rem;">${index + 1}</td>
          <td style="padding:6px 8px; font-weight:600; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${s.nama}">
            ${s.nama}
          </td>
      `;

      currentMapel.forEach(m => {
        const val = s.nilai[m.id];
        const displayVal = val !== null && val !== undefined ? val : '-';
        const textColor = val !== null && val !== undefined ? '#0f766e' : '#cbd5e1';

        html += `<td style="padding:6px 2px; text-align:center; font-weight:500; color:${textColor};">${displayVal}</td>`;
      });

      const rataDisplay = s.hasValue ? s.rata.toFixed(0) : '0';
      const rataColor = s.hasValue ? '#0f766e' : '#94a3b8';

      html += `
          <td style="padding:6px 2px; background:#e6f4ea; font-weight:bold; color:${rataColor}; text-align:center;">
            ${rataDisplay}
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    // G. KETERANGAN SINGKATAN MAPEL DI BAWAH TABEL
    html += `
      <div style="margin-top:14px; padding:10px; background:#f8fafc; border-radius:6px; border:1px solid #e2e8f0; font-size:0.78rem; color:#64748b;">
        <strong style="color:#334155;">💡 Keterangan Singkatan Mata Pelajaran:</strong>
        <div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:6px;">
    `;

    currentMapel.forEach(m => {
      html += `<span><strong>${getShortMapelName(m.nama_mapel)}</strong>: ${m.nama_mapel}</span>`;
    });

    html += `
        </div>
      </div>
    `;

    if (container) container.innerHTML = html;

  } catch (err) {
    console.error(err);
    if (container) container.innerHTML = `<p style="color:#ef4444; text-align:center; padding:20px;">Gagal memuat ledger: ${err.message}</p>`;
  }
}

// ==========================================
// 2. EXPORT EXCEL FUNCTION
// ==========================================
function handleExportExcel() {
  if (!currentLedgerData.length) {
    alert('Data ledger belum tersedia.');
    return;
  }

  if (typeof XLSX === 'undefined') {
    alert('Library SheetJS (XLSX) belum dimuat.');
    return;
  }

  const wb = XLSX.utils.book_new();
  const data = [];

  data.push(['LEDGER NILAI SISWA']);
  data.push([`Sekolah: ${currentUser?.profile?.sekolah || '-'}`]);
  data.push([`Kelas: ${currentClass?.nama_kelas || '-'}`]);
  data.push([`${currentSemester?.nama_semester || ''} - T.A ${currentSemester?.tahun_ajaran || ''}`]);
  data.push([]);

  const header = ['No', 'Nama Siswa'];
  currentMapel.forEach(m => header.push(m.nama_mapel));
  header.push('Rata-rata');
  data.push(header);

  currentLedgerData.forEach((s, index) => {
    const row = [index + 1, s.nama];
    currentMapel.forEach(m => {
      const val = s.nilai[m.id];
      row.push(val !== null && val !== undefined ? val : '-');
    });
    row.push(s.hasValue ? Number(s.rata).toFixed(1) : '0');
    data.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 5 },
    { wch: 30 },
    ...currentMapel.map(() => ({ wch: 16 })),
    { wch: 12 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Ledger Nilai');

  const fileName = `Ledger_Nilai_${currentClass?.nama_kelas || 'Kelas'}.xlsx`;
  XLSX.writeFile(wb, fileName);
}