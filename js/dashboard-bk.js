import { supabaseClient as supabase } from './supabase.js';

// Global Data Storage
let dataSiswaAll = [];
let allLaporan = [];
let allJenisMasalah = [];
let currentSchoolId = null;
let schoolModeKategori = 'all';

// Chart.js Instances
let chartJenis = null;
let chartKelas = null;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Check Auth Session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return;
  }

  // 2. Setup Navigation & Mobile Sidebar
  setupMobileSidebar();
  setupNavigation();

  // 3. Load User Profile, References & Dashboard Data
  await loadBKProfileAndConfig(session.user.id);
  await loadDashboardData();

  // 4. Bind Global Functions to Window for HTML Events
  window.toggleSaveBtn = toggleSaveBtn;
  window.saveStatusManual = saveStatusManual;
  window.editLaporan = editLaporan;
  window.hapusLaporan = hapusLaporan;

  // 5. Setup Action Buttons & Modal Listeners
  setupButtonListeners();
});

// ==========================================
// 1. LOAD PROFILE GURU BK & MODE SEKOLAH (FIXED)
// ==========================================
async function loadBKProfileAndConfig(userId) {
  // Validasi Mencegah Error 400 Bad Request jika userId undefined/null
  if (!userId) {
    console.warn('userId tidak ditemukan, lewati query profile.');
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('school_id, role')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    console.error('Gagal mengambil profile BK:', profileError.message);
    return;
  }

  currentSchoolId = profile?.school_id || 'SMPN36JKT';

  if (currentSchoolId) {
    const { data: schoolData, error: schoolError } = await supabase
      .from('schools')
      .select('mode_kategori')
      .eq('id', currentSchoolId)
      .maybeSingle();

    if (!schoolError && schoolData) {
      schoolModeKategori = schoolData.mode_kategori || 'all';
    }
  }

  if (currentSchoolId === 'SMPN36JKT') {
    schoolModeKategori = 'verbal_only';
  }
}

// ==========================================
// 2. LOAD DATA LAPORAN, SISWA & JENIS (FIXED)
// ==========================================
async function loadDashboardData() {
  try {
    // 1. Ambil data profil user saat ini
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = 'index.html';
      return;
    }

    // Fetch profile tanpa relational join bertingkat (mencegah error 400)
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileErr) console.error('Error profile fetch:', profileErr.message);

    if (profile?.school_id) {
      currentSchoolId = profile.school_id;

      // Ambil detail nama & mode sekolah terpisah
      const { data: schoolData } = await supabase
        .from('schools')
        .select('nama_sekolah, mode_kategori')
        .eq('id', currentSchoolId)
        .maybeSingle();

      if (schoolData) {
        schoolModeKategori = schoolData.mode_kategori || 'verbal_only';
        const elSchoolName = document.getElementById('schoolName');
        if (elSchoolName) elSchoolName.innerText = schoolData.nama_sekolah || 'Dashboard BK';
      }
    }

    // 2. Fetch data paralel (Siswa, Jenis Laporan, dan Laporan)
    const [resSiswa, resJenis, resLaporan] = await Promise.all([
      supabase.from('siswa').select('*').eq('school_id', currentSchoolId),
      supabase.from('jenis_laporan').select('*'),
      supabase.from('laporan').select(`
        *,
        siswa (id, nama_siswa, kelas),
        jenis_laporan (id, nama)
      `).eq('school_id', currentSchoolId).order('created_at', { ascending: false })
    ]);

    if (resSiswa.error) throw resSiswa.error;
    if (resJenis.error) throw resJenis.error;
    if (resLaporan.error) throw resLaporan.error;

    dataSiswaAll = resSiswa.data || [];
    allJenisMasalah = resJenis.data || [];
    allLaporan = resLaporan.data || [];

    // 3. Render komponen dashboard
    renderStatistik();
    renderLaporanTerbaru();
    renderCharts();
    renderJurnal();
    setupJurnalListeners();
    
    // 4. Populate dropdown rekap kelas
    populateRekapClassDropdown();

  } catch (error) {
    console.error('Error loading dashboard:', error);
    alert('Gagal memuat data dashboard: ' + error.message);
  }
}

// ==========================================
// 3. RENDER UI & STATISTIK
// ==========================================
function renderStatistik() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentDateStr = now.toISOString().split('T')[0];

  const laporanBulanIni = allLaporan.filter(item => {
    if (!item.created_at) return false;
    const d = new Date(item.created_at);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const laporanHariIni = allLaporan.filter(item => {
    if (!item.created_at) return false;
    const d = new Date(item.created_at).toISOString().split('T')[0];
    return d === currentDateStr;
  });

  const totalBulanElem = document.getElementById('totalLaporanBulan');
  const totalHariElem = document.getElementById('totalLaporanHari');

  if (totalBulanElem) totalBulanElem.textContent = laporanBulanIni.length;
  if (totalHariElem) totalHariElem.textContent = laporanHariIni.length;
}

function renderLaporanTerbaru() {
  const container = document.getElementById('recentReportsContainer');
  if (!container) return;

  if (!allLaporan || allLaporan.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:20px; color:#6b7280;">Belum ada laporan masuk</div>';
    return;
  }

  const top5 = allLaporan.slice(0, 5);
  
  let html = `
    <div style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch;">
      <table style="width: 100%; min-width: 680px; border-collapse: collapse; text-align: left; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 2px solid #f3f4f6; color: #1e3a8a;">
            <th style="padding: 12px; width: 120px; white-space: nowrap;">Tanggal</th>
            <th style="padding: 12px; min-width: 180px; white-space: nowrap;">Siswa</th>
            <th style="padding: 12px; width: 140px; white-space: nowrap;">Jenis Laporan</th>
            <th style="padding: 12px; min-width: 200px; white-space: nowrap;">Catatan Tambahan</th>
          </tr>
        </thead>
        <tbody>
  `;
    
  top5.forEach(item => {
    const tanggal = item.created_at 
      ? new Date(item.created_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'}) 
      : '-';
    const nama = item.siswa?.nama_siswa || '-';
    const kelas = item.siswa?.kelas || '-';
    
    const namaJenisDb = item.jenis_laporan?.nama;
    const jenisLaporan = namaJenisDb || (item.laporan_lainnya ? 'Lainnya' : 'Lainnya');
    const catatan = item.laporan_lainnya || item.catatan || '-';
    
    html += `
      <tr style="border-bottom: 1px solid #f3f4f6;">
        <td style="padding: 12px; white-space: nowrap; color: #4b5563;">${tanggal}</td>
        <td style="padding: 12px;">
          <strong style="text-transform: uppercase; color: #0f172a; font-size: 13px;">${nama}</strong><br>
          <small style="color: #64748b; font-weight: 600;">${kelas}</small>
        </td>
        <td style="padding: 12px; white-space: nowrap;">
          <span style="display: inline-block; padding: 4px 10px; background-color: #dcfce7; color: #15803d; border-radius: 6px; font-weight: 500; font-size: 12px; white-space: nowrap;">
            ${jenisLaporan}
          </span>
        </td>
        <td style="padding: 12px; color: #374151;">${catatan}</td>
      </tr>
    `;
  });
  
  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

// ==========================================
// 4. RENDER CHART.JS (DOUGHNUT & BAR)
// ==========================================
function renderCharts() {
  const jenisCount = {
    'Berkata kasar': 0,
    'Berkata kotor': 0,
    'Mengejek teman': 0,
    'Lainnya': 0
  };

  allLaporan.forEach(item => {
    const namaJenis = item.jenis_laporan?.nama || item.laporan_lainnya || item.catatan || 'Lainnya';
    const jenisLower = namaJenis.toLowerCase();

    if (jenisLower.includes('kasar')) {
      jenisCount['Berkata kasar']++;
    } else if (jenisLower.includes('kotor')) {
      jenisCount['Berkata kotor']++;
    } else if (jenisLower.includes('ejek') || jenisLower.includes('mengejek')) {
      jenisCount['Mengejek teman']++;
    } else {
      jenisCount['Lainnya']++;
    }
  });

  const filteredLabels = [];
  const filteredData = [];

  Object.entries(jenisCount).forEach(([key, val]) => {
    if (val > 0) {
      filteredLabels.push(key);
      filteredData.push(val);
    }
  });

  const ctxJenis = document.getElementById('chartJenisMasalah');
  if (ctxJenis) {
    if (chartJenis) chartJenis.destroy();

    const isDataEmpty = filteredData.length === 0;
    const totalData = filteredData.reduce((a, b) => a + b, 0);

    chartJenis = new Chart(ctxJenis, {
      type: 'doughnut',
      data: {
        labels: isDataEmpty ? ['Belum Ada Data'] : filteredLabels,
        datasets: [{
          data: isDataEmpty ? [1] : filteredData,
          backgroundColor: isDataEmpty 
            ? ['#e5e7eb'] 
            : ['#2563eb', '#059669', '#d97706', '#dc2626']
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            position: 'bottom',
            labels: {
              generateLabels: (chart) => {
                const data = chart.data;
                if (!data.labels.length || isDataEmpty) return [];
                return data.labels.map((label, i) => {
                  const val = data.datasets[0].data[i];
                  const pct = totalData > 0 ? ((val / totalData) * 100).toFixed(1) : 0;
                  return {
                    text: `${label}: ${val} (${pct}%)`,
                    fillStyle: data.datasets[0].backgroundColor[i],
                    hidden: false,
                    index: i
                  };
                });
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                if (isDataEmpty) return ' Belum ada data';
                const label = context.label || '';
                const value = context.raw || 0;
                const percentage = totalData > 0 ? ((value / totalData) * 100).toFixed(1) : 0;
                return ` ${label}: ${value} laporan (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  const kelasCount = {};
  allLaporan.forEach(item => {
    const kelas = item.siswa?.kelas;
    if (kelas) kelasCount[kelas] = (kelasCount[kelas] || 0) + 1;
  });

  const sortedKelas = Object.entries(kelasCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const ctxKelas = document.getElementById('chartKelasTerbanyak');
  if (ctxKelas) {
    if (chartKelas) chartKelas.destroy();

    chartKelas = new Chart(ctxKelas, {
      type: 'bar',
      data: {
        labels: sortedKelas.length > 0 ? sortedKelas.map(k => k[0]) : ['Belum Ada Data'],
        datasets: [{
          label: 'Jumlah Aduan',
          data: sortedKelas.length > 0 ? sortedKelas.map(k => k[1]) : [0],
          backgroundColor: '#2563eb',
          borderRadius: 6
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        },
        scales: { 
          y: { 
            beginAtZero: true, 
            ticks: { stepSize: 1 } 
          } 
        }
      }
    });
  }
}

// ==========================================
// 5. SIDEBAR & TAB NAVIGATION
// ==========================================
function setupMobileSidebar() {
  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');

  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('active');
      if (overlay) overlay.classList.toggle('active');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      if (sidebar) sidebar.classList.remove('active');
      overlay.classList.remove('active');
    });
  }
}

function setupNavigation() {
  const navDashboard = document.getElementById('navDashboard');
  const navJurnal = document.getElementById('navJurnal');
  const navRekap = document.getElementById('navRekap');
  const seeAllBtn = document.getElementById('seeAllBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  const viewDashboard = document.getElementById('viewDashboard');
  const viewJurnal = document.getElementById('viewJurnal');
  const viewRekap = document.getElementById('viewRekap');

  const pageTitle = document.getElementById('pageTitle');
  const pageSubtitle = document.getElementById('pageSubtitle');
  const pageIcon = document.getElementById('pageIcon');

  const navItems = [navDashboard, navJurnal, navRekap];

  async function switchTab(targetSection, activeNav, title, subtitle, icon) {
    [viewDashboard, viewJurnal, viewRekap].forEach(sec => {
      if (sec) sec.style.display = 'none';
    });

    navItems.forEach(item => {
      if (item) item.classList.remove('active');
    });

    if (targetSection) targetSection.style.display = 'block';
    if (activeNav) activeNav.classList.add('active');

    if (pageTitle) pageTitle.textContent = title;
    if (pageSubtitle) pageSubtitle.textContent = subtitle;
    if (pageIcon) pageIcon.textContent = icon;

    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (sidebar) sidebar.classList.remove('active');
    if (overlay) overlay.classList.remove('active');

   // Hapus tombol kembali jika navigasi berpindah secara manual via menu sidebar
    const btnBack = document.getElementById('btnBackToRekap');
    if (btnBack) btnBack.remove();

    // 1. RESET INPUT & FILTER JURNAL
    const searchInput = document.getElementById('searchInput');
    const filterStatus = document.getElementById('filterStatus');

    if (searchInput) searchInput.value = '';
    if (filterStatus) filterStatus.value = 'all';

    // 2. RESET DROPDOWN & TABEL REKAP KELAS KE TAMPILAN AWAL
    const selectRekap = document.getElementById('rekapClassSelect');
    if (selectRekap) selectRekap.value = '';
    renderRekapTabel('');

    // 3. MUAT ULANG DATA DARI SUPABASE & RENDER BERSIH
    await loadDashboardData();
  }

  if (navDashboard) {
    navDashboard.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(viewDashboard, navDashboard, 'Dashboard BK', 'Monitoring laporan siswa secara realtime', '📘');
    });
  }

  if (navJurnal) {
    navJurnal.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(viewJurnal, navJurnal, 'Jurnal Laporan BK', 'Kelola dan rekam seluruh riwayat laporan bimbingan', '📋');
    });
  }

  if (navRekap) {
    navRekap.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(viewRekap, navRekap, 'Rekapitulasi Kelas', 'Analisis rekapitulasi data pelanggaran per kelas', '📊');
    });
  }

  if (seeAllBtn) {
    seeAllBtn.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(viewJurnal, navJurnal, 'Jurnal Laporan BK', 'Kelola dan rekam seluruh riwayat laporan bimbingan', '📋');
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (confirm('Yakin ingin logout dari sistem BK?')) {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
      }
    });
  }
}

// ==========================================
// 6. RENDER JURNAL & MANUAL SAVE LOGIC
// ==========================================
function renderJurnal() {
  const container = document.getElementById('jurnalContainer');
  if (!container) return;

  const searchValue = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const filterStatus = document.getElementById('filterStatus')?.value || 'all';

  let filtered = allLaporan.filter(item => {
    const namaSiswa = (item.siswa?.nama_siswa || '').toLowerCase();
    const kelasSiswa = (item.siswa?.kelas || '').toLowerCase();
    const matchesSearch = namaSiswa.includes(searchValue) || kelasSiswa.includes(searchValue);

    const statusLaporan = (item.status || 'baru').toLowerCase();
    const matchesStatus = filterStatus === 'all' || statusLaporan === filterStatus;

    return matchesSearch && matchesStatus;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 32px 16px; color: #64748b; background: white; border-radius: 12px; border: 1px solid #e2e8f0;">
        <p style="font-size: 13px; font-weight: 500;">Tidak ada laporan yang sesuai.</p>
      </div>
    `;
    return;
  }

  let html = '';
  filtered.forEach(item => {
    const tanggal = item.created_at 
      ? new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
      : '-';
    
    const nama = item.siswa?.nama_siswa || 'Siswa Tidak Diketahui';
    const kelas = item.siswa?.kelas || '-';
    const jenisLaporan = item.jenis_laporan?.nama || 'Lainnya';
    const catatanRaw = item.laporan_lainnya || item.catatan || '';
    const currentStatus = (item.status || 'baru').toLowerCase();

    // Sembunyikan paragraf jika catatan kosong atau hanya berisi "-"
    const hasCatatan = catatanRaw && catatanRaw.trim() !== '-';
    const htmlCatatan = hasCatatan 
      ? `<p style="font-size: 12px; color: #334155; margin-top: 4px; margin-bottom: 6px; line-height: 1.3;">${catatanRaw}</p>`
      : '';

    html += `
      <div class="laporan-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <div>
            <strong style="font-size: 13px; color: #0f172a; text-transform: uppercase;">${nama}</strong>
            <span style="font-size: 12px; color: #475569; font-weight: 600; margin-left: 4px;">(${kelas})</span>
          </div>
          
          <div style="display: flex; align-items: center; gap: 6px;">
            <select id="statusSelect-${item.id}" class="status-select ${currentStatus}" onchange="toggleSaveBtn('${item.id}', '${currentStatus}')">
              <option value="baru" ${currentStatus === 'baru' ? 'selected' : ''}>🔴 Baru</option>
              <option value="diproses" ${currentStatus === 'diproses' ? 'selected' : ''}>🟡 Diproses</option>
              <option value="selesai" ${currentStatus === 'selesai' ? 'selected' : ''}>🟢 Selesai</option>
            </select>

            <button id="btnSaveStatus-${item.id}" class="btn-action edit hidden" onclick="saveStatusManual('${item.id}')" title="Simpan Perubahan Status">
              💾 Simpan
            </button>
          </div>
        </div>

        <div style="margin-bottom: 4px;">
          <span class="badge green">${jenisLaporan}</span>
        </div>

        ${htmlCatatan}

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #e2e8f0; padding-top: 6px; margin-top: 4px; font-size: 11px; color: #475569;">
          <span style="font-weight: 500;">🕒 ${tanggal}</span>
          
          <div class="card-actions">
            <button class="btn-action edit" onclick="editLaporan('${item.id}')">✏️ Edit</button>
            <button class="btn-action delete" onclick="hapusLaporan('${item.id}')">🗑️ Hapus</button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Menampilkan/menyembunyikan tombol Simpan saat status diubah
function toggleSaveBtn(laporanId, originalStatus) {
  const selectElem = document.getElementById(`statusSelect-${laporanId}`);
  const btnSave = document.getElementById(`btnSaveStatus-${laporanId}`);
  
  if (!selectElem || !btnSave) return;

  if (selectElem.value !== originalStatus) {
    btnSave.classList.remove('hidden');
  } else {
    btnSave.classList.add('hidden');
  }
}

// Eksekusi Simpan Status Manual ke Supabase
async function saveStatusManual(laporanId) {
  const selectElem = document.getElementById(`statusSelect-${laporanId}`);
  const btnSave = document.getElementById(`btnSaveStatus-${laporanId}`);
  if (!selectElem) return;

  const statusBaru = selectElem.value;

  // Tampilkan indikator loading pada tombol
  if (btnSave) {
    btnSave.disabled = true;
    btnSave.textContent = '⏳ Menyimpan...';
  }

  try {
    // 1. Eksekusi Update ke Supabase
    const { data, error } = await supabase
      .from('laporan')
      .update({ status: statusBaru })
      .eq('id', laporanId)
      .select(); // Mengembalikan data yang di-update untuk verifikasi

    if (error) throw error;

    // Jika data kosong, berarti di-block oleh Policy RLS Supabase
    if (!data || data.length === 0) {
      throw new Error("Izin ditolak oleh Supabase (Aturan RLS belum dikonfigurasi untuk UPDATE).");
    }

    // 2. Update array lokal agar state data konsisten
    const index = allLaporan.findIndex(l => l.id == laporanId);
    if (index !== -1) {
      allLaporan[index].status = statusBaru;
    }

    alert('✅ Status berhasil diperbarui!');

    // 3. Render ulang UI & grafik agar statistik langsung ter-update
    renderJurnal();
    renderStatistik();
    renderCharts();

  } catch (err) {
    console.error('Gagal menyimpan status:', err);
    alert('❌ Gagal mengubah status: ' + err.message);
    
    // Kembalikan tampilan tombol jika gagal
    if (btnSave) {
      btnSave.disabled = false;
      btnSave.textContent = '💾 Simpan';
    }
  }
}

// ==========================================
// HELPER WAKTU LOKAL (UNTUK DATETIME-LOCAL)
// ==========================================
function getCurrentDateTimeLocal() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

// ==========================================
// 7. MODAL & CRUD HANDLERS
// ==========================================

// 1. Populate Dropdown Kelas & Jenis Laporan
function populateModalDropdowns() {
  const selectKelas = document.getElementById('modalKelas');
  const selectSiswa = document.getElementById('modalSiswaId');
  const selectJenis = document.getElementById('modalJenisId');

  // Populate Dropdown Kelas (Unik & A-Z)
  if (selectKelas) {
    const listKelas = [...new Set(dataSiswaAll.map(s => s.kelas).filter(Boolean))].sort();
    selectKelas.innerHTML = '<option value="">-- Pilih Kelas --</option>' +
      listKelas.map(k => `<option value="${k}">${k}</option>`).join('');
  }

  // Reset Dropdown Siswa
  if (selectSiswa) {
    selectSiswa.innerHTML = '<option value="">-- Pilih Kelas Terlebih Dahulu --</option>';
    selectSiswa.disabled = true;
  }

  // Populate Dropdown Jenis Laporan (Filter Verbal Only jika SMPN36JKT)
  if (selectJenis) {
    let listJenisFiltered = [...allJenisMasalah];

    if (schoolModeKategori === 'verbal_only') {
      const kataKunciVerbal = ['kasar', 'kotor', 'ejek', 'mengejek', 'kata', 'verbal'];
      listJenisFiltered = listJenisFiltered.filter(j => 
        kataKunciVerbal.some(key => j.nama.toLowerCase().includes(key))
      );
    }

    // Urutkan A-Z
    listJenisFiltered.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));

    selectJenis.innerHTML = '<option value="">-- Pilih Jenis Laporan --</option>' +
      listJenisFiltered.map(j => `<option value="${j.id}">${j.nama}</option>`).join('') +
      '<option value="lainnya">Lainnya...</option>';
  }
}

// 2. Filter Siswa Berdasarkan Kelas (Sorted Ascending)
function handleKelasChange(selectedKelas, targetSiswaId = null) {
  const selectSiswa = document.getElementById('modalSiswaId');
  if (!selectSiswa) return;

  if (!selectedKelas) {
    selectSiswa.innerHTML = '<option value="">-- Pilih Kelas Terlebih Dahulu --</option>';
    selectSiswa.disabled = true;
    return;
  }

  // Filter siswa berdasarkan kelas & urut nama A-Z
  const siswaTerfilter = dataSiswaAll
    .filter(s => s.kelas === selectedKelas)
    .sort((a, b) => a.nama_siswa.localeCompare(b.nama_siswa, 'id', { sensitivity: 'base' }));

  if (siswaTerfilter.length === 0) {
    selectSiswa.innerHTML = '<option value="">-- Tidak ada siswa di kelas ini --</option>';
    selectSiswa.disabled = true;
    return;
  }

  selectSiswa.innerHTML = '<option value="">-- Pilih Siswa --</option>' +
    siswaTerfilter.map(s => `<option value="${s.id}">${s.nama_siswa}</option>`).join('');
  
  selectSiswa.disabled = false;

  if (targetSiswaId) {
    selectSiswa.value = targetSiswaId;
  }
}

// 3. Open Modal Tambah
function openModalCatatMandiri() {
  document.getElementById('modalTitle').innerText = 'Catat Laporan Mandiri';
  document.getElementById('editLaporanId').value = '';
  document.getElementById('formLaporan').reset();
  
  populateModalDropdowns();

  // Set Tanggal Default Waktu Saat Ini
  const inputTanggal = document.getElementById('modalTanggal');
  if (inputTanggal) {
    inputTanggal.value = getCurrentDateTimeLocal();
  }

  const groupLainnya = document.getElementById('groupLainnya');
  if (groupLainnya) groupLainnya.classList.add('hidden');

  document.getElementById('modalLaporan').classList.remove('hidden');
}

// 4. Open Modal Edit
function editLaporan(id) {
  const item = allLaporan.find(l => l.id == id);
  if (!item) return;

  document.getElementById('modalTitle').innerText = 'Edit Laporan';
  document.getElementById('editLaporanId').value = item.id;
  
  populateModalDropdowns();

  // Set Tanggal Kejadian
  const inputTanggal = document.getElementById('modalTanggal');
  if (inputTanggal && item.created_at) {
    const d = new Date(item.created_at);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    inputTanggal.value = d.toISOString().slice(0, 16);
  }

  // Set Kelas & Trigger Siswa
  const kelasSiswa = item.siswa?.kelas || '';
  const selectKelas = document.getElementById('modalKelas');
  if (selectKelas) selectKelas.value = kelasSiswa;
  handleKelasChange(kelasSiswa, item.siswa_id);

  // Set Jenis & Catatan
  const jenisVal = item.jenis_laporan_id ? item.jenis_laporan_id : (item.laporan_lainnya ? 'lainnya' : '');
  document.getElementById('modalJenisId').value = jenisVal;
  document.getElementById('modalLainnya').value = item.laporan_lainnya || '';
  document.getElementById('modalCatatan').value = item.catatan || '';

  const groupLainnya = document.getElementById('groupLainnya');
  if (jenisVal === 'lainnya') {
    groupLainnya.classList.remove('hidden');
  } else {
    groupLainnya.classList.add('hidden');
  }

  document.getElementById('modalLaporan').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modalLaporan').classList.add('hidden');
}

// 5. Handle Submit Form Simpan Laporan
async function handleSaveLaporan(event) {
  event.preventDefault();
  const id = document.getElementById('editLaporanId').value;
  const siswaId = document.getElementById('modalSiswaId').value;
  const jenisIdRaw = document.getElementById('modalJenisId').value;
  const laporanLainnya = document.getElementById('modalLainnya').value;
  const catatan = document.getElementById('modalCatatan').value;
  const tanggalInput = document.getElementById('modalTanggal').value;

  const payload = {
    siswa_id: parseInt(siswaId),
    jenis_laporan_id: (jenisIdRaw === 'lainnya' || !jenisIdRaw) ? null : parseInt(jenisIdRaw),
    laporan_lainnya: jenisIdRaw === 'lainnya' ? laporanLainnya : null,
    catatan: catatan,
    created_at: tanggalInput ? new Date(tanggalInput).toISOString() : new Date().toISOString()
  };

  try {
    if (id) {
      const { error } = await supabase.from('laporan').update(payload).eq('id', id);
      if (error) throw error;
    } else {
      payload.status = 'baru';
      payload.school_id = currentSchoolId;
      payload.kategori_id = 1;
      const { error } = await supabase.from('laporan').insert([payload]);
      if (error) throw error;
    }

    closeModal();
    await loadDashboardData();
  } catch (err) {
    alert('Gagal menyimpan laporan: ' + err.message);
  }
}

async function hapusLaporan(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus laporan ini?')) return;

  try {
    const { error } = await supabase.from('laporan').delete().eq('id', id);
    if (error) throw error;

    allLaporan = allLaporan.filter(l => l.id != id);
    renderJurnal();
    renderStatistik();
    renderCharts();
  } catch (err) {
    alert('Gagal menghapus laporan: ' + err.message);
  }
}

function exportExcelJurnal() {
  if (!allLaporan || allLaporan.length === 0) {
    alert('Tidak ada data laporan untuk diekspor!');
    return;
  }

  const exportData = allLaporan.map((item, index) => {
    const rawStatus = (item.status || 'baru').toLowerCase();
    const formattedStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);

    const formattedTanggal = item.created_at 
      ? new Date(item.created_at).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : '-';

    return {
      'No': index + 1,
      'Tanggal': formattedTanggal,
      'Nama Siswa': item.siswa?.nama_siswa ? item.siswa.nama_siswa.toUpperCase() : '-',
      'Kelas': item.siswa?.kelas || '-',
      'Jenis Laporan': item.jenis_laporan?.nama || (item.laporan_lainnya ? 'Lainnya' : 'Lainnya'),
      'Detail Catatan': item.laporan_lainnya || item.catatan || '-',
      'Status': formattedStatus
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);

  worksheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 18 }, // Tanggal
    { wch: 28 }, // Nama Siswa
    { wch: 8 },  // Kelas
    { wch: 20 }, // Jenis Laporan
    { wch: 35 }, // Detail Catatan
    { wch: 12 }  // Status
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Jurnal BK");
  
  const today = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `Jurnal_Laporan_BK_${today}.xlsx`);
}

// ==========================================
// 8. EVENT LISTENERS SETUP
// ==========================================
function setupJurnalListeners() {
  const searchInput = document.getElementById('searchInput');
  const filterStatus = document.getElementById('filterStatus');

  if (searchInput) searchInput.addEventListener('input', () => renderJurnal());
  if (filterStatus) filterStatus.addEventListener('change', () => renderJurnal());
}

function setupButtonListeners() {
  // Listener Tombol Export & Tambah Laporan Utama
  document.getElementById('btnExportJurnal')?.addEventListener('click', exportExcelJurnal);
  document.getElementById('btnTambahLaporanBK')?.addEventListener('click', openModalCatatMandiri);
  
  // Listener Modal Form (Close, Cancel, Submit)
  document.getElementById('btnCloseModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelModal')?.addEventListener('click', closeModal);
  document.getElementById('formLaporan')?.addEventListener('submit', handleSaveLaporan);

  // Listener Pilihan Kelas di Modal (Filter Siswa Otomatis)
  document.getElementById('modalKelas')?.addEventListener('change', (e) => {
    handleKelasChange(e.target.value);
  });

  // Listener Pilihan Jenis Laporan di Modal (Toggle Input "Lainnya")
  document.getElementById('modalJenisId')?.addEventListener('change', (e) => {
    const groupLainnya = document.getElementById('groupLainnya');
    if (e.target.value === 'lainnya') {
      groupLainnya?.classList.remove('hidden');
    } else {
      groupLainnya?.classList.add('hidden');
    }
  });

  // Listener Rekapitulasi Kelas
  document.getElementById('rekapClassSelect')?.addEventListener('change', (e) => {
    renderRekapTabel(e.target.value);
  });

  document.getElementById('btnExportRekap')?.addEventListener('click', exportExcelRekap);
}
// ==========================================
// 9. LOGIKA REKAPITULASI KELAS & EXPORT
// ==========================================

// Populate Dropdown Pilih Kelas di Halaman Rekap
function populateRekapClassDropdown() {
  const selectRekap = document.getElementById('rekapClassSelect');
  if (!selectRekap) return;

  const listKelas = [...new Set(dataSiswaAll.map(s => s.kelas).filter(Boolean))].sort();
  selectRekap.innerHTML = '<option value="">Pilih Kelas</option>' +
    listKelas.map(k => `<option value="${k}">Kelas ${k}</option>`).join('');
}

// Di dalam renderRekapTabel(selectedKelas)
function renderRekapTabel(selectedKelas) {
  const tbody = document.getElementById('rekapTableBody');
  if (!tbody) return;

  // Pastikan parent dari table memiliki class table-responsive
  const tableElem = tbody.closest('table');
  if (tableElem && !tableElem.parentElement.classList.contains('table-responsive')) {
    const wrapper = document.createElement('div');
    wrapper.className = 'table-responsive';
    tableElem.parentNode.insertBefore(wrapper, tableElem);
    wrapper.appendChild(tableElem);
  }

  if (!selectedKelas) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 48px 16px; color: #94a3b8;">
          <div style="font-size: 32px; margin-bottom: 8px;">📊</div>
          <div style="font-weight: 500; font-size: 14px;">Pilih kelas terlebih dahulu untuk melihat rekapitulasi</div>
        </td>
      </tr>
    `;
    return;
  }

  const siswaKelas = dataSiswaAll
    .filter(s => s.kelas === selectedKelas)
    .sort((a, b) => a.nama_siswa.localeCompare(b.nama_siswa, 'id'));

  if (siswaKelas.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 32px; color: #64748b;">
          Tidak ada data siswa ditemukan di kelas ini.
        </td>
      </tr>
    `;
    return;
  }

  let html = '';

  siswaKelas.forEach(siswa => {
    const laporanSiswa = allLaporan.filter(l => l.siswa_id === siswa.id);
    const totalAduan = laporanSiswa.length;

    let badgeStyle = 'background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;'; // Hijau (0)
    if (totalAduan === 1) {
      badgeStyle = 'background-color: #fffbeeb; color: #b45309; border: 1px solid #fde68a;'; // Kuning (1)
    } else if (totalAduan > 1) {
      badgeStyle = 'background-color: #fef2f2; color: #b91c1c; border: 1px solid #fecaca;'; // Merah (>1)
    }

    let tglTerakhir = '-';
    if (totalAduan > 0 && laporanSiswa[0]?.created_at) {
      tglTerakhir = new Date(laporanSiswa[0].created_at).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    }

    let kategoriDominan = '-';
    if (totalAduan > 0) {
      const counter = {};
      laporanSiswa.forEach(l => {
        const jenis = l.jenis_laporan?.nama || l.laporan_lainnya || 'Lainnya';
        counter[jenis] = (counter[jenis] || 0) + 1;
      });
      kategoriDominan = Object.keys(counter).reduce((a, b) => counter[a] > counter[b] ? a : b);
    }

    const isZero = totalAduan === 0;
    const btnStyle = isZero
      ? 'background-color: #f1f5f9; color: #94a3b8; cursor: not-allowed; border: 1px solid #e2e8f0;'
      : 'background-color: #2563eb; color: #ffffff; cursor: pointer;';

    html += `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 8px; font-weight: 600; text-transform: uppercase; color: #1e293b; font-size: 12px; white-space: nowrap;">
          ${siswa.nama_siswa}
        </td>
        <td style="padding: 10px 8px; white-space: nowrap;">
          <span style="font-size: 11px; font-weight: 600; padding: 4px 8px; border-radius: 20px; white-space: nowrap; display: inline-block; ${badgeStyle}">
            ${totalAduan} Laporan
          </span>
        </td>
        <td style="padding: 10px 8px; color: #475569; font-size: 12px; white-space: nowrap;">${tglTerakhir}</td>
        <td style="padding: 10px 8px; color: #475569; font-size: 12px; white-space: nowrap;">
          ${kategoriDominan}
        </td>
        <td style="padding: 10px 8px; text-align: center; white-space: nowrap;">
          <button 
            style="padding: 5px 10px; font-size: 11px; font-weight: 500; border-radius: 6px; border: none; ${btnStyle}"
            ${isZero ? 'disabled' : `onclick="lihatDetailSiswa('${siswa.id}')"`}
          >
            🔍 Detail
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

// ISI BARU (SESUAIKAN DENGAN SIMPAN STATE KELAS & TOMBOL KEMBALI):
window.lihatDetailSiswa = function(siswaId) {
  const siswa = dataSiswaAll.find(s => s.id == siswaId);
  if (!siswa) return;

  // 1. Simpan kelas aktif ke localStorage sebelum pindah tab
  const selectRekap = document.getElementById('rekapClassSelect');
  if (selectRekap && selectRekap.value) {
    localStorage.setItem('lastSelectedKelasRekap', selectRekap.value);
  }

  // 2. Klik nav Jurnal untuk pindah halaman
  const navJurnal = document.getElementById('navJurnal');
  if (navJurnal) navJurnal.click();

  // 3. Pasang filter nama siswa & munculkan tombol kembali
  setTimeout(() => {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.value = siswa.nama_siswa;
      renderJurnal();
    }
    renderTombolKembaliRekap();
  }, 100);
};

function renderTombolKembaliRekap() {
  // Mencari container pembungkus di atas tabel Jurnal (sesuaikan jika id beda)
  const container = document.getElementById('viewJurnal');
  if (!container) return;

  let btnBack = document.getElementById('btnBackToRekap');
  
  if (!btnBack) {
    btnBack = document.createElement('button');
    btnBack.id = 'btnBackToRekap';
    btnBack.innerHTML = '⬅️ Kembali ke Rekap Kelas';
    btnBack.className = 'btn-back-rekap';
    
    btnBack.onclick = function() {
      // 1. Pindah tab kembali ke Rekap
      const navRekap = document.getElementById('navRekap');
      if (navRekap) navRekap.click();

      // 2. Kembalikan filter kelas yang dipilih sebelumnya
      const lastKelas = localStorage.getItem('lastSelectedKelasRekap');
      if (lastKelas) {
        setTimeout(() => {
          const selectRekap = document.getElementById('rekapClassSelect');
          if (selectRekap) {
            selectRekap.value = lastKelas;
            renderRekapTabel(lastKelas);
          }
        }, 100);
      }

      // 3. Hapus tombol kembali
      btnBack.remove();
    };

    // Sisipkan tombol di bagian paling atas halaman Jurnal
    container.insertBefore(btnBack, container.firstChild);
  }
}

// Export Excel Khusus Rekapitulasi Kelas
function exportExcelRekap() {
  const selectRekap = document.getElementById('rekapClassSelect');
  const selectedKelas = selectRekap ? selectRekap.value : '';

  if (!selectedKelas) {
    alert('Silakan pilih kelas terlebih dahulu sebelum mengekspor!');
    return;
  }

  const siswaKelas = dataSiswaAll
    .filter(s => s.kelas === selectedKelas)
    .sort((a, b) => a.nama_siswa.localeCompare(b.nama_siswa, 'id'));

  const exportData = siswaKelas.map((siswa, index) => {
    const laporanSiswa = allLaporan.filter(l => l.siswa_id === siswa.id);
    const totalAduan = laporanSiswa.length;

    let tglTerakhir = '-';
    if (totalAduan > 0) {
      tglTerakhir = new Date(laporanSiswa[0].created_at).toLocaleDateString('id-ID', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
    }

    let kategoriDominan = '-';
    if (totalAduan > 0) {
      const counter = {};
      laporanSiswa.forEach(l => {
        const jenis = l.jenis_laporan?.nama || l.laporan_lainnya || 'Lainnya';
        counter[jenis] = (counter[jenis] || 0) + 1;
      });
      kategoriDominan = Object.keys(counter).reduce((a, b) => counter[a] > counter[b] ? a : b);
    }

    return {
      'No': index + 1,
      'Nama Siswa': siswa.nama_siswa.toUpperCase(),
      'Kelas': selectedKelas,
      'Total Pelanggaran': totalAduan,
      'Pelanggaran Terakhir': tglTerakhir,
      'Kategori Dominan': kategoriDominan
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  worksheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 30 }, // Nama Siswa
    { wch: 10 }, // Kelas
    { wch: 18 }, // Total Pelanggaran
    { wch: 22 }, // Pelanggaran Terakhir
    { wch: 25 }  // Kategori Dominan
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Rekap Kelas ${selectedKelas}`);
  XLSX.writeFile(workbook, `Rekap_Pelanggaran_Kelas_${selectedKelas}.xlsx`);
}