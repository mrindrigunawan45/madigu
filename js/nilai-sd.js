import { supabase } from './config.js';
import { loadCurrentUser, getCurrentUser } from './session.js';

let currentUser = null;
let currentClass = null;

// Log penanda file berhasil dimuat
console.log('Nilai SD Loaded');

document.addEventListener('DOMContentLoaded', async () => {
  await loadCurrentUser();
  currentUser = getCurrentUser();

  if (!currentUser || !currentUser.kelas) {
    alert("Session atau data kelas tidak ditemukan.");
    return;
  }

  currentClass = currentUser.kelas;

  await loadSemesterNilai();
  await loadMapelNilai();

  // Listener Tombol Tampilkan Nilai
  document.getElementById('loadNilaiBtn')?.addEventListener('click', handleTampilkan);
});

// ==========================================
// 1. LOAD DROPDOWN OPTIONS (SEMESTER & MAPEL)
// ==========================================
async function loadSemesterNilai() {
  const select = document.getElementById('semesterNilai');
  if (!select) return;

  const { data, error } = await supabase
    .from('semester')
    .select('*')
    .eq('school_id', currentUser.profile.school_id)
    .eq('is_active', true);

  if (error) {
    console.error('Error Semester:', error);
    return;
  }

  select.innerHTML = `<option value="">Pilih Semester...</option>`;
  data?.forEach(item => {
    select.innerHTML += `<option value="${item.id}">${item.nama_semester}</option>`;
  });
}

async function loadMapelNilai() {
  const select = document.getElementById('mapelNilai');
  if (!select) return;

  const { data, error } = await supabase
    .from('mata_pelajaran')
    .select('*')
    .eq('school_id', currentUser.profile.school_id)
    .order('nama_mapel');

  if (error) {
    console.error('Error Mapel:', error);
    return;
  }

  select.innerHTML = `<option value="">Pilih Mata Pelajaran...</option>`;
  data?.forEach(mapel => {
    select.innerHTML += `<option value="${mapel.id}">${mapel.nama_mapel}</option>`;
  });
}

// ==========================================
// 2. TOGGLE ACTION (INPUT SPESIFIK / REKAP)
// ==========================================
async function handleTampilkan() {
  const semesterId = document.getElementById('semesterNilai')?.value;
  const mapelId = document.getElementById('mapelNilai')?.value;
  const jenisNilai = document.getElementById('jenisNilai')?.value;

  if (!semesterId || !mapelId || !jenisNilai) {
    alert('Pilih Semester, Mata Pelajaran, dan Jenis Penilaian terlebih dahulu.');
    return;
  }

  if (jenisNilai === 'rekap') {
    await renderRekapKeseluruhan(semesterId, mapelId);
  } else {
    await renderInputNilaiSpesifik(semesterId, mapelId, jenisNilai);
  }
}

// ==========================================
// 3. MODE 1: INPUT NILAI SPESIFIK
// ==========================================
async function renderInputNilaiSpesifik(semesterId, mapelId, jenisNilai) {
  const container = document.getElementById('nilaiContainer');
  if (!container) return;

  container.innerHTML = '<p style="text-align:center; padding:20px; color:#64748b;">Memuat data siswa...</p>';

  // Load Siswa
  const { data: siswa, error: siswaError } = await supabase
    .from('siswa')
    .select('*')
    .eq('class_id', currentClass.id)
    .order('nama_siswa');

  if (siswaError) {
    container.innerHTML = '<p style="color:red; text-align:center;">Gagal memuat daftar siswa.</p>';
    return;
  }

  // Load Nilai Existing
  const { data: nilaiData } = await supabase
    .from('nilai_sd')
    .select('*')
    .eq('school_id', currentUser.profile.school_id)
    .eq('class_id', currentClass.id)
    .eq('semester_id', Number(semesterId))
    .eq('mapel_id', Number(mapelId));

  const nilaiMap = {};
  nilaiData?.forEach(item => {
    nilaiMap[item.siswa_id] = item;
  });

  const labelMap = {
    tugas1: 'Tugas 1', tugas2: 'Tugas 2', tugas3: 'Tugas 3', tugas4: 'Tugas 4',
    ulangan1: 'Ulangan 1', ulangan2: 'Ulangan 2', ulangan3: 'Ulangan 3', ulangan4: 'Ulangan 4',
    pts: 'PTS', pas: 'PAS'
  };

  let html = `
    <div class="nilai-table-container" style="background:#fff; padding:24px; border-radius:12px; max-width: 650px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:15px; border-bottom:2px solid #e2e8f0; padding-bottom:10px;">
        <h3 style="color:#0f766e; margin:0; font-size:1.1rem;">📝 Input Nilai: ${labelMap[jenisNilai] || jenisNilai.toUpperCase()}</h3>
      </div>

      <table class="nilai-table" style="width:100%; border-collapse:collapse;">
        <thead>
          <tr style="background:#f8fafc; text-align:left;">
            <th style="padding:10px 12px; border-bottom:2px solid #cbd5e1; width:70%;">Nama Siswa</th>
            <th style="padding:10px 12px; border-bottom:2px solid #cbd5e1; text-align:center; width:30%;">Nilai (${labelMap[jenisNilai]})</th>
          </tr>
        </thead>
        <tbody>
  `;

  siswa.forEach(s => {
    const nilaiObj = nilaiMap[s.id] || {};
    const val = nilaiObj[jenisNilai] ?? '';

    html += `
      <tr data-siswa-id="${s.id}" style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:10px 12px; font-weight:600; color:#334155; vertical-align:middle;">${s.nama_siswa}</td>
        <td style="padding:8px 12px; text-align:center; vertical-align:middle;">
          <input type="number" class="input-spesifik" value="${val}" min="0" max="100" placeholder="0" 
                 style="width:75px; padding:8px; text-align:center; border:1px solid #cbd5e1; border-radius:6px; font-weight:bold; font-size:1rem; outline:none;"
                 onfocus="this.select()">
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
      <div style="margin-top:20px;">
        <button id="saveSpesifikBtn" style="background:#0f766e; color:white; border:none; padding:12px 24px; border-radius:6px; font-weight:bold; cursor:pointer; width:100%; font-size:0.95rem;">
          💾 Simpan ${labelMap[jenisNilai]}
        </button>
      </div>
    </div>
  `;

  container.innerHTML = html;

  document.getElementById('saveSpesifikBtn')?.addEventListener('click', () => saveSpesifik(semesterId, mapelId, jenisNilai, nilaiMap));
}

// SIMPAN HASIL INPUT SPESIFIK
async function saveSpesifik(semesterId, mapelId, jenisNilai, nilaiMapExisting) {
  const rows = document.querySelectorAll('tr[data-siswa-id]');
  const payload = [];

  rows.forEach(row => {
    const siswaId = Number(row.getAttribute('data-siswa-id'));
    const inputVal = row.querySelector('.input-spesifik').value;
    const nilaiBaru = inputVal !== '' ? Number(inputVal) : null;

    const existing = nilaiMapExisting[siswaId] || {};

    const record = {
      school_id: currentUser.profile.school_id,
      class_id: currentClass.id,
      semester_id: Number(semesterId),
      mapel_id: Number(mapelId),
      siswa_id: siswaId,
      tugas1: existing.tugas1 ?? null,
      tugas2: existing.tugas2 ?? null,
      tugas3: existing.tugas3 ?? null,
      tugas4: existing.tugas4 ?? null,
      ulangan1: existing.ulangan1 ?? null,
      ulangan2: existing.ulangan2 ?? null,
      ulangan3: existing.ulangan3 ?? null,
      ulangan4: existing.ulangan4 ?? null,
      pts: existing.pts ?? null,
      pas: existing.pas ?? null,
    };

    record[jenisNilai] = nilaiBaru;

    // Kalkulasi nilai akhir & rata-rata
    const { avgTugas, avgUlangan, nilaiAkhir } = hitungKalkulasi(record);

    record.rata_tugas = avgTugas;
    record.rata_ulangan = avgUlangan;
    record.nilai_akhir = nilaiAkhir;

    payload.push(record);
  });

  const { error } = await supabase
    .from('nilai_sd')
    .upsert(payload, { onConflict: 'semester_id,siswa_id,mapel_id' });

  if (error) {
    console.error(error);
    alert('Gagal menyimpan nilai: ' + error.message);
    return;
  }

  alert('✅ Nilai berhasil disimpan!');

  // Reset tampilan setelah berhasil simpan
  const selectJenis = document.getElementById('jenisNilai');
  if (selectJenis) selectJenis.value = '';

  const container = document.getElementById('nilaiContainer');
  if (container) container.innerHTML = '';
}

// ==========================================
// 4. MODE 2: REKAP KESELURUHAN
// ==========================================
async function renderRekapKeseluruhan(semesterId, mapelId) {
  const container = document.getElementById('nilaiContainer');
  if (!container) return;

  container.innerHTML = '<p style="text-align:center; padding:20px; color:#64748b;">Memuat rekap nilai...</p>';

  const { data: siswa } = await supabase
    .from('siswa')
    .select('*')
    .eq('class_id', currentClass.id)
    .order('nama_siswa');

  const { data: nilaiData } = await supabase
    .from('nilai_sd')
    .select('*')
    .eq('school_id', currentUser.profile.school_id)
    .eq('class_id', currentClass.id)
    .eq('semester_id', Number(semesterId))
    .eq('mapel_id', Number(mapelId));

  const nilaiMap = {};
  nilaiData?.forEach(item => {
    nilaiMap[item.siswa_id] = item;
  });

  let html = `
    <div class="nilai-table-container" style="background:#fff; padding:20px; border-radius:12px; overflow-x:auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <h3 style="margin-bottom:15px; color:#0f766e;">📊 Rekap Nilai Keseluruhan</h3>
      <table class="nilai-table" style="width:100%; border-collapse:collapse; font-size:0.85rem;">
        <thead>
          <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0; text-align:center;">
            <th style="padding:10px; text-align:left; min-width:180px;">Nama Siswa</th>
            <th>T1</th><th>T2</th><th>T3</th><th>T4</th>
            <th style="background:#f1f5f9; color:#0f766e;">R.Tugas</th>
            <th>U1</th><th>U2</th><th>U3</th><th>U4</th>
            <th style="background:#f1f5f9; color:#0f766e;">R.Ulang</th>
            <th>PTS</th>
            <th>PAS</th>
            <th style="background:#ccfbf1; color:#0f766e;">NA</th>
          </tr>
        </thead>
        <tbody>
  `;

  siswa?.forEach(s => {
    const n = nilaiMap[s.id] || {};
    const { avgTugas, avgUlangan, nilaiAkhir } = hitungKalkulasi(n);

    html += `
      <tr style="border-bottom:1px solid #f1f5f9; text-align:center;">
        <td style="padding:8px 10px; text-align:left; font-weight:600; color:#334155;">${s.nama_siswa}</td>
        <td>${n.tugas1 ?? '-'}</td><td>${n.tugas2 ?? '-'}</td><td>${n.tugas3 ?? '-'}</td><td>${n.tugas4 ?? '-'}</td>
        <td style="background:#f8fafc; font-weight:bold; color:#0f766e;">${avgTugas || '-'}</td>
        <td>${n.ulangan1 ?? '-'}</td><td>${n.ulangan2 ?? '-'}</td><td>${n.ulangan3 ?? '-'}</td><td>${n.ulangan4 ?? '-'}</td>
        <td style="background:#f8fafc; font-weight:bold; color:#0f766e;">${avgUlangan || '-'}</td>
        <td>${n.pts ?? '-'}</td>
        <td>${n.pas ?? '-'}</td>
        <td style="background:#ccfbf1; font-weight:bold; color:#0f766e;">${nilaiAkhir || 0}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
}

// ==========================================
// 5. HELPER KALKULASI RATA-RATA & NA
// ==========================================
function hitungKalkulasi(rec) {
  // 1. Avg Tugas (hanya angka yang diisi)
  const listTugas = [rec.tugas1, rec.tugas2, rec.tugas3, rec.tugas4].filter(x => x !== null && x !== '' && !isNaN(x));
  const avgTugas = listTugas.length > 0 ? listTugas.reduce((a, b) => Number(a) + Number(b), 0) / listTugas.length : null;

  // 2. Avg Ulangan (hanya angka yang diisi)
  const listUlangan = [rec.ulangan1, rec.ulangan2, rec.ulangan3, rec.ulangan4].filter(x => x !== null && x !== '' && !isNaN(x));
  const avgUlangan = listUlangan.length > 0 ? listUlangan.reduce((a, b) => Number(a) + Number(b), 0) / listUlangan.length : null;

  // 3. Komponen Nilai Akhir
  const komponen = [];
  if (avgTugas !== null) komponen.push(avgTugas);
  if (avgUlangan !== null) komponen.push(avgUlangan);
  if (rec.pts !== null && rec.pts !== '' && !isNaN(rec.pts)) komponen.push(Number(rec.pts));
  if (rec.pas !== null && rec.pas !== '' && !isNaN(rec.pas)) komponen.push(Number(rec.pas));

  const nilaiAkhir = komponen.length > 0 ? komponen.reduce((a, b) => a + b, 0) / komponen.length : 0;

  return {
    avgTugas: avgTugas ? Number(avgTugas.toFixed(1)) : 0,
    avgUlangan: avgUlangan ? Number(avgUlangan.toFixed(1)) : 0,
    nilaiAkhir: Number(nilaiAkhir.toFixed(1))
  };
}