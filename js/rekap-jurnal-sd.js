import { supabase } from './config.js';
import { getCurrentClass } from './auth-sd.js';

let currentClass = null;

export async function initRekapJurnal() {
  try {
    currentClass = await getCurrentClass();
    if (!currentClass) {
      console.warn("Rekap Jurnal: Kelas belum terdeteksi.");
      return;
    }

    await loadHeaderInfo();
    await loadDropdownSiswa();

    const container = document.getElementById('rekapJurnalContainer');
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 30px 20px; color: #64748b; background: #f8fafc; border-radius: 10px; border: 1px dashed #cbd5e1; margin-top: 15px;">
          <p style="margin: 0; font-size: 0.95rem;">📅 <strong>Pilih Rentang Tanggal</strong> di atas, lalu klik <strong>"Tampilkan Jurnal"</strong> untuk memuat rekap data.</p>
        </div>
      `;
    }

    const stats = document.getElementById('rekapJurnalStats');
    if (stats) stats.innerHTML = '';

  } catch (err) {
    console.error("Error initRekapJurnal:", err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnLoadRekapJurnal')?.addEventListener('click', loadRekapJurnal);
  document.getElementById('btnCariSiswa')?.addEventListener('click', loadRiwayatSiswa);

  document.getElementById('closeModalJurnal')?.addEventListener('click', () => {
    document.getElementById('modalDetailJurnal')?.classList.add('hidden');
  });

  document.querySelectorAll('.menu[data-page="rekapJurnal"]').forEach(menu => {
    menu.addEventListener('click', () => {
      initRekapJurnal();
    });
  });

  initRekapJurnal();
});

async function loadHeaderInfo() {
  const info = document.getElementById('rekapJurnalInfo');
  if (!info || !currentClass) return;

  try {
    const { data: semester, error } = await supabase
      .from('semester')
      .select('*')
      .eq('school_id', currentClass.school_id)
      .eq('is_active', true)
      .maybeSingle();

    if (error) console.error("Error semester:", error);

    info.innerHTML = `
      <strong>Kelas:</strong> ${currentClass.nama_kelas || '-'} &nbsp; | &nbsp;
      <strong>Semester:</strong> ${semester?.nama_semester || '-'} &nbsp; | &nbsp;
      <strong>Tahun Ajaran:</strong> ${semester?.tahun_ajaran || '-'}
    `;
  } catch (err) {
    console.error("Error loadHeaderInfo:", err);
    info.innerHTML = `<strong>Kelas:</strong> ${currentClass.nama_kelas || '-'}`;
  }
}

async function loadDropdownSiswa() {
  const select = document.getElementById('searchSiswa');
  if (!select || !currentClass) return;

  try {
    const { data, error } = await supabase
      .from('siswa')
      .select('id, nama_siswa')
      .eq('class_id', currentClass.id)
      .eq('school_id', currentClass.school_id)
      .order('nama_siswa');

    if (error) {
      console.error("Error fetch siswa:", error);
      return;
    }

    select.innerHTML = '<option value="">Pilih Siswa...</option>';
    if (data && data.length > 0) {
      data.forEach(siswa => {
        select.innerHTML += `<option value="${siswa.id}">${siswa.nama_siswa}</option>`;
      });
    }
  } catch (err) {
    console.error("Error loadDropdownSiswa:", err);
  }
}

async function loadRekapJurnal() {
  const container = document.getElementById('rekapJurnalContainer');
  const stats = document.getElementById('rekapJurnalStats');
  if (!container || !currentClass) return;

  if (stats) stats.innerHTML = '';

  const awal = document.getElementById('filterTanggalAwal')?.value;
  const akhir = document.getElementById('filterTanggalAkhir')?.value;

  container.innerHTML = '<p style="text-align:center; padding: 20px; color: #64748b;">Memuat data jurnal...</p>';

  try {
    let query = supabase
      .from('jurnal_kelas_sd')
      .select('*')
      .eq('class_id', currentClass.id)
      .eq('school_id', currentClass.school_id);

    if (awal) query = query.gte('tanggal', awal);
    if (akhir) query = query.lte('tanggal', akhir);

    const { data, error } = await query.order('tanggal', { ascending: false });

    if (error) {
      console.error("Error fetch jurnal:", error);
      container.innerHTML = '<p style="color:red; text-align:center; padding: 20px;">Gagal mengambil data jurnal.</p>';
      return;
    }

    if (!data || data.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 30px; color: #64748b; background: #fff3cd; border-radius: 10px; border: 1px solid #ffeeba; margin-top: 15px;">
          <p style="margin: 0;">Tidak ditemukan jurnal ${awal || akhir ? `pada rentang tanggal <strong>${awal || '...'}</strong> s.d. <strong>${akhir || '...'}</strong>` : 'di kelas ini'}.</p>
        </div>
      `;
      return;
    }

    const { data: mapelList } = await supabase
      .from('mata_pelajaran')
      .select('id, nama_mapel')
      .eq('school_id', currentClass.school_id);

    const mapelMap = {};
    if (mapelList) {
      mapelList.forEach(m => mapelMap[m.id] = m.nama_mapel);
    }

    let html = `
      <table class="rekap-jurnal-table">
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Mapel</th>
            <th>Materi</th>
            <th>Kegiatan</th>
            <th>Catatan Khusus</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const item of data) {
      const { data: detail } = await supabase
        .from('jurnal_siswa_sd')
        .select('id')
        .eq('jurnal_id', item.id);

      const countCatatan = detail ? detail.length : 0;
      const namaMapel = mapelMap[item.mapel_id] || item.mapel || '-';

      html += `
        <tr>
          <td><strong>${item.tanggal || '-'}</strong></td>
          <td>${namaMapel}</td>
          <td>${item.materi || '-'}</td>
          <td>${item.kegiatan || '-'}</td>
          <td>
            <span class="badge-catatan">
              ${countCatatan} Catatan
            </span>
          </td>
          <td>
            <button type="button" class="btn-detail" onclick="showDetailJurnal('${item.id}')">
              🔍 Detail
            </button>
          </td>
        </tr>
      `;
    }

    html += `
        </tbody>
      </table>
    `;

    container.innerHTML = html;

  } catch (err) {
    console.error("Error loadRekapJurnal:", err);
    container.innerHTML = '<p style="color:red; text-align:center; padding: 20px;">Terjadi kesalahan saat memuat rekap jurnal.</p>';
  }
}

window.showDetailJurnal = async function(id) {
  const modal = document.getElementById('modalDetailJurnal');
  const body = document.getElementById('detailJurnalBody');
  if (!modal || !body) return;

  modal.classList.remove('hidden');
  body.innerHTML = '<p style="text-align:center;">Memuat detail...</p>';

  try {
    const { data: jurnal } = await supabase
      .from('jurnal_kelas_sd')
      .select('*')
      .eq('id', id)
      .single();

    const { data: catatan } = await supabase
      .from('jurnal_siswa_sd')
      .select(`
        *,
        siswa(nama_siswa)
      `)
      .eq('jurnal_id', id);

    let html = `
      <h3>Materi: ${jurnal?.materi || '-'}</h3>
      <p><strong>Kegiatan:</strong> ${jurnal?.kegiatan || '-'}</p>
      <p><strong>Catatan Umum:</strong> ${jurnal?.catatan_umum || '-'}</p>
      <hr style="margin: 15px 0; border: 0; border-top: 1px solid #e2e8f0;">
      <h4>Catatan Khusus Siswa</h4>
    `;

    if (catatan && catatan.length > 0) {
      catatan.forEach(c => {
        html += `
          <div class="catatan-siswa-card">
            <strong>${c.siswa?.nama_siswa || 'Siswa'}</strong> 
            <span style="font-size:0.8rem; color:#0f766e;">(${c.kategori || 'Umum'})</span>
            <br>
            <p style="margin-top:5px; font-size:0.9rem;">${c.catatan || '-'}</p>
          </div>
        `;
      });
    } else {
      html += '<p style="color:#64748b; font-size:0.9rem;">Tidak ada catatan khusus siswa pada jurnal ini.</p>';
    }

    body.innerHTML = html;

  } catch (err) {
    console.error("Error showDetailJurnal:", err);
    body.innerHTML = '<p style="color:red;">Gagal memuat detail jurnal.</p>';
  }
};

async function loadRiwayatSiswa() {
  const siswaId = document.getElementById('searchSiswa')?.value;
  const container = document.getElementById('riwayatSiswaContainer');

  if (!siswaId) {
    alert('Pilih siswa terlebih dahulu.');
    return;
  }

  if (container) {
    container.innerHTML = '<p style="text-align:center; padding:15px; color:#64748b;">Memuat riwayat siswa...</p>';
  }

  try {
    const { data, error } = await supabase
      .from('jurnal_siswa_sd')
      .select(`
        *,
        siswa(nama_siswa),
        jurnal_kelas_sd(tanggal)
      `)
      .eq('siswa_id', siswaId);

    if (error) {
      console.error("Error loadRiwayatSiswa:", error);
      if (container) container.innerHTML = '<p style="color:red;">Gagal mengambil riwayat siswa.</p>';
      return;
    }

    renderRiwayatSiswa(data || []);
  } catch (err) {
    console.error("Error loadRiwayatSiswa:", err);
  }
}

function renderRiwayatSiswa(data) {
  const container = document.getElementById('riwayatSiswaContainer');
  if (!container) return;

  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="riwayat-siswa-card">
        <p style="text-align:center; color:#64748b; margin:0;">Tidak ada catatan khusus untuk siswa ini.</p>
      </div>
    `;
    return;
  }

  const nama = data[0]?.siswa?.nama_siswa || 'Siswa';
  const sosial = data.filter(x => x.kategori === 'Sosial').length;
  const akademik = data.filter(x => x.kategori === 'Akademik').length;
  const disiplin = data.filter(x => x.kategori === 'Disiplin').length;
  const perilaku = data.filter(x => x.kategori === 'Perilaku').length;

  let rows = '';
  data.forEach(item => {
    rows += `
      <tr>
        <td><strong>${item.jurnal_kelas_sd?.tanggal || '-'}</strong></td>
        <td><span class="badge-catatan">${item.kategori || 'Umum'}</span></td>
        <td>${item.catatan || '-'}</td>
      </tr>
    `;
  });

  container.innerHTML = `
    <div class="riwayat-siswa-card">
      <h3>📊 Rekap Catatan: ${nama}</h3>
      <div class="stat-catatan">
        <div class="stat-item"><small>Total</small><h3>${data.length}</h3></div>
        <div class="stat-item"><small>Sosial</small><h3>${sosial}</h3></div>
        <div class="stat-item"><small>Akademik</small><h3>${akademik}</h3></div>
        <div class="stat-item"><small>Disiplin</small><h3>${disiplin}</h3></div>
        <div class="stat-item"><small>Perilaku</small><h3>${perilaku}</h3></div>
      </div>
      <table class="rekap-jurnal-table">
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Kategori</th>
            <th>Catatan</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}