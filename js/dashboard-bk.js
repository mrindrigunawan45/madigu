import { supabaseClient as supabase } from './supabase.js';

// Global Data Storage
let dataSiswaAll = [];
let allLaporan = [];

// Daftar Kategori & Jenis Masalah (Lokal Handled)
const jenisMasalahMap = {
  "Kedisiplinan": ["Keterlambatan", "Atribut Tidak Lengkap", "Membawa HP / Barang Terlarang", "Rambut / Seragam Tidak Rapi", "Membawa Rokok / Vape"],
  "Akademik": ["Nilai Rendah / Di Bawah KKM", "Jarang Masuk Kelas / Membolos", "Tugas Tidak Pernah Mengumpulkan", "Kesulitan Belajar"],
  "Perilaku / Sosial": ["Perundungan (Bullying)", "Keributan / Perkelahian", "Kurang Sopan ke Guru", "Merusak Fasilitas Sekolah"],
  "Pribadi & Emosional": ["Masalah Keluarga", "Kurang Motivasi Belajar", "Kecemasan / Stress Tinggi", "Masalah Pergaulan"]
};

document.addEventListener('DOMContentLoaded', async () => {
  // Check Auth Session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return;
  }

  // Setup Navigation UI
  initNavigation();
  
  // Load Master Data & Initial Dashboard
  await loadMasterData();
  await loadDashboardData();

  // Setup Form Events & Export Listeners
  setupFormEvents();
  setupExportEvents();
});

// 1. NAVIGASI TAB UTAMA
function initNavigation() {
  const navDashboard = document.getElementById('navDashboard');
  const navJurnal = document.getElementById('navJurnal');
  const navRekap = document.getElementById('navRekap');

  const viewDashboard = document.getElementById('viewDashboard');
  const viewJurnal = document.getElementById('viewJurnal');
  const viewRekap = document.getElementById('viewRekap');

  const pageTitle = document.getElementById('pageTitle');
  const pageSubtitle = document.getElementById('pageSubtitle');
  const pageIcon = document.getElementById('pageIcon');

  function switchTab(activeNav, showView, title, subtitle, icon) {
    [navDashboard, navJurnal, navRekap].forEach(n => n?.classList.remove('active'));
    [viewDashboard, viewJurnal, viewRekap].forEach(v => { if(v) v.style.display = 'none'; });

    activeNav?.classList.add('active');
    if (showView) showView.style.display = 'block';

    if (pageTitle) pageTitle.textContent = title;
    if (pageSubtitle) pageSubtitle.textContent = subtitle;
    if (pageIcon) pageIcon.textContent = icon;
  }

  navDashboard?.addEventListener('click', (e) => {
    e.preventDefault();
    switchTab(navDashboard, viewDashboard, 'Dashboard BK', 'Monitoring laporan siswa secara realtime', '🏠');
    loadDashboardData();
  });

  navJurnal?.addEventListener('click', (e) => {
    e.preventDefault();
    switchTab(navJurnal, viewJurnal, 'Jurnal Laporan', 'Kelola dan tindak lanjuti laporan dari seluruh agen sekolah', '📋');
    loadJurnalData();
  });

  navRekap?.addEventListener('click', (e) => {
    e.preventDefault();
    switchTab(navRekap, viewRekap, 'Rekap Kelas', 'Ringkasan rekam jejak perilaku per kelas', '📊');
    loadRekapKelas(true); // Reset dropdown & tabel saat tab Rekap diklik
  });

  document.getElementById('seeAllBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    navJurnal?.click();
  });

  document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await supabase.auth.signOut();
    window.location.href = 'index.html';
  });
}

// 2. LOAD MASTER DATA
async function loadMasterData() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .maybeSingle();

    const currentSchoolId = profile?.school_id || user.user_metadata?.school_id;

    let query = supabase
      .from('siswa')
      .select('id, nama_siswa, kelas, school_id')
      .order('nama_siswa', { ascending: true });

    if (currentSchoolId) {
      query = query.eq('school_id', currentSchoolId);
    }

    const { data: siswaData, error: errSiswa } = await query;
    if (errSiswa) throw errSiswa;

    dataSiswaAll = siswaData || [];

    const inputKelasSelect = document.getElementById('inputKelasSelect');
    const rekapClassSelect = document.getElementById('rekapClassSelect');

    const uniqueClasses = [...new Set(dataSiswaAll.map(s => s.kelas).filter(Boolean))].sort();

    if (inputKelasSelect) {
      inputKelasSelect.innerHTML = '<option value="">-- Pilih Kelas --</option>' +
        uniqueClasses.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    if (rekapClassSelect) {
      rekapClassSelect.innerHTML = '<option value="">Pilih Kelas</option>' +
        uniqueClasses.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    const inputKategoriSelect = document.getElementById('inputKategoriSelect');
    if (inputKategoriSelect) {
      const kategoriList = Object.keys(jenisMasalahMap);
      inputKategoriSelect.innerHTML = '<option value="">-- Pilih Kategori --</option>' +
        kategoriList.map(k => `<option value="${k}">${k}</option>`).join('');
    }

  } catch (err) {
    console.error('Error loading master data:', err);
  }
}

// 3. SETUP FORM & SUBMIT LAPORAN
function setupFormEvents() {
  const inputKelasSelect = document.getElementById('inputKelasSelect');
  const inputSiswaSelect = document.getElementById('inputSiswaSelect');
  const inputKategoriSelect = document.getElementById('inputKategoriSelect');
  const inputJenisSelect = document.getElementById('inputJenisSelect');

  inputKelasSelect?.addEventListener('change', (e) => {
    const selectedClass = e.target.value;
    if (!selectedClass) {
      if (inputSiswaSelect) {
        inputSiswaSelect.innerHTML = '<option value="">-- Pilih Kelas Terlebih Dahulu --</option>';
        inputSiswaSelect.disabled = true;
      }
      return;
    }

    const filteredSiswa = dataSiswaAll.filter(s => s.kelas === selectedClass);
    if (inputSiswaSelect) {
      inputSiswaSelect.innerHTML = '<option value="">-- Pilih Siswa --</option>' +
        filteredSiswa.map(s => `<option value="${s.id}">${s.nama_siswa}</option>`).join('');
      inputSiswaSelect.disabled = false;
    }
  });

  inputKategoriSelect?.addEventListener('change', (e) => {
    const selectedKategori = e.target.value;
    const jenisList = jenisMasalahMap[selectedKategori] || [];

    if (!selectedKategori || jenisList.length === 0) {
      if (inputJenisSelect) {
        inputJenisSelect.innerHTML = '<option value="">-- Pilih Kategori Terlebih Dahulu --</option>';
        inputJenisSelect.disabled = true;
      }
      return;
    }

    if (inputJenisSelect) {
      inputJenisSelect.innerHTML = '<option value="">-- Pilih Jenis Masalah --</option>' +
        jenisList.map(j => `<option value="${j}">${j}</option>`).join('');
      inputJenisSelect.disabled = false;
    }
  });

  const modalInputBK = document.getElementById('modalInputBK');
  document.getElementById('btnTambahLaporanBK')?.addEventListener('click', () => {
    if (modalInputBK) modalInputBK.style.display = 'flex';
  });

  document.getElementById('closeModalInputBtn')?.addEventListener('click', () => {
    if (modalInputBK) modalInputBK.style.display = 'none';
  });

  // SUBMIT LAPORAN
  document.getElementById('formInputBK')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const siswaId = inputSiswaSelect?.value;
    const kategoriVal = inputKategoriSelect?.value;
    const jenisVal = inputJenisSelect?.value;
    const catatanVal = document.getElementById('inputCatatan')?.value;
    const statusVal = document.getElementById('inputStatusSelect')?.value || 'diproses';

    if (!siswaId || !kategoriVal) {
      alert('Mohon lengkapi data siswa dan kategori masalah!');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Sesi login telah berakhir. Silakan login kembali.');
        return;
      }

      const selectedSiswaObj = dataSiswaAll.find(s => String(s.id) === String(siswaId));

      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .maybeSingle();

      const finalSchoolId = profile?.school_id || user.user_metadata?.school_id || selectedSiswaObj?.school_id || 'SMPN36JKT';

      const categoryMap = {
        "Kedisiplinan": 1,
        "Akademik": 2,
        "Perilaku / Sosial": 3,
        "Pribadi & Emosional": 4
      };
      
      const kategoriIdInt = categoryMap[kategoriVal] || 5;

      const payload = {
        siswa_id: parseInt(siswaId, 10),
        agen_id: user.id,
        school_id: finalSchoolId,
        kategori_id: kategoriIdInt,
        laporan_lainnya: jenisVal ? `${kategoriVal} - ${jenisVal}` : kategoriVal,
        catatan: catatanVal || null,
        status: statusVal,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('laporan').insert([payload]);

      if (error) throw error;

      // TELEGRAM NOTIFICATION EDGE FUNCTION
      try {
        await fetch('https://ocakjidyndcojeapdsop.functions.supabase.co/telegram-bk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            school_id: finalSchoolId,
            nama_siswa: selectedSiswaObj?.nama_siswa || '-',
            kelas: selectedSiswaObj?.kelas || '-',
            kategori: kategoriVal,
            jenis: jenisVal || '-',
            laporan_lainnya: jenisVal ? `${kategoriVal} - ${jenisVal}` : kategoriVal,
            catatan: catatanVal || '-'
          })
        });
      } catch (teleErr) {
        console.warn('Telegram Error:', teleErr);
      }

      alert('Laporan berhasil disimpan!');

      if (modalInputBK) modalInputBK.style.display = 'none';
      document.getElementById('formInputBK').reset();
      if (inputSiswaSelect) inputSiswaSelect.disabled = true;
      if (inputJenisSelect) inputJenisSelect.disabled = true;

      await loadDashboardData();

    } catch (err) {
      console.error('Error insert laporan:', err);
      alert(`Gagal menyimpan laporan: ${err.message || 'Cek console browser'}`);
    }
  });

  document.getElementById('searchInput')?.addEventListener('input', filterJurnalTable);
  document.getElementById('filterStatus')?.addEventListener('change', filterJurnalTable);
}

// 4. LOAD DASHBOARD DATA
async function loadDashboardData() {
  const totalBulanEl = document.getElementById('totalLaporanBulan');
  const totalHariEl = document.getElementById('totalLaporanHari');
  const container = document.getElementById('recentReportsContainer');

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .maybeSingle();

    const currentSchoolId = profile?.school_id || user.user_metadata?.school_id;

    let query = supabase
      .from('laporan')
      .select('*, siswa(nama_siswa, kelas)')
      .order('created_at', { ascending: false });

    if (currentSchoolId) {
      query = query.eq('school_id', currentSchoolId);
    }

    const { data: laporan, error } = await query;
    if (error) throw error;

    allLaporan = laporan || [];

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const laporanHari = allLaporan.filter(l => l.created_at?.startsWith(todayStr)).length;
    const laporanBulan = allLaporan.filter(l => l.created_at?.startsWith(monthStr)).length;

    if (totalBulanEl) totalBulanEl.textContent = laporanBulan;
    if (totalHariEl) totalHariEl.textContent = laporanHari;

    if (container) {
      const recent = allLaporan.slice(0, 5);
      if (recent.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding: 20px; color:#6b7280;">Belum ada laporan.</div>';
        return;
      }

      container.innerHTML = recent.map(l => `
        <div style="padding: 12px; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>${l.siswa?.nama_siswa || 'Siswa N/A'} (${l.siswa?.kelas || '-'})</strong><br>
            <span style="font-size: 13px; color: #6b7280;">${l.laporan_lainnya || '-'}</span>
          </div>
          <span class="badge ${l.status === 'selesai' ? 'green' : 'orange'}">${l.status || 'diproses'}</span>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Error load dashboard:', err);
  }
}

// 5. LOAD JURNAL
function loadJurnalData() {
  filterJurnalTable();
}

function filterJurnalTable() {
  const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
  const status = document.getElementById('filterStatus')?.value || 'all';
  const container = document.getElementById('jurnalContainer');

  if (!container) return;

  const filtered = getFilteredJurnal();

  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding: 40px; color:#6b7280;">Tidak ada laporan ditemukan.</div>';
    return;
  }

  container.innerHTML = filtered.map(l => `
    <div style="background: white; border-radius: 16px; padding: 16px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h4 style="margin: 0 0 4px 0; color: #1e293b;">${l.siswa?.nama_siswa || 'Siswa N/A'} <span style="font-weight: normal; color: #64748b;">(${l.siswa?.kelas || '-'})</span></h4>
        <p style="margin: 0; font-size: 13px; color: #475569;"><strong>Kategori/Detail:</strong> ${l.laporan_lainnya || '-'}</p>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">${l.catatan || 'Tidak ada catatan.'}</p>
      </div>
      <div>
        <select class="select-status-jurnal" data-laporan-id="${l.id}" style="padding: 4px 8px; font-size: 12px; border-radius: 6px; border: 1px solid #cbd5e1; background-color: ${l.status === 'selesai' ? '#dcfce7' : '#fef3c7'}; color: ${l.status === 'selesai' ? '#166534' : '#92400e'}; font-weight: 600; cursor: pointer;">
          <option value="diproses" ${l.status !== 'selesai' ? 'selected' : ''}>Diproses</option>
          <option value="selesai" ${l.status === 'selesai' ? 'selected' : ''}>Selesai</option>
        </select>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.select-status-jurnal').forEach(selectEl => {
    selectEl.addEventListener('change', async (e) => {
      const laporanId = e.target.getAttribute('data-laporan-id');
      const statusBaru = e.target.value;

      try {
        const { error } = await supabase
          .from('laporan')
          .update({ status: statusBaru })
          .eq('id', laporanId);

        if (error) throw error;

        alert(`Status berhasil diubah ke "${statusBaru.toUpperCase()}"!`);
        await loadDashboardData();
        loadJurnalData();
      } catch (err) {
        alert('Gagal update status: ' + err.message);
      }
    });
  });
}

function getFilteredJurnal() {
  const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
  const status = document.getElementById('filterStatus')?.value || 'all';

  return allLaporan.filter(l => {
    const matchNama = (l.siswa?.nama_siswa || '').toLowerCase().includes(search);
    const matchStatus = status === 'all' || l.status === status;
    return matchNama && matchStatus;
  });
}

// 6. REKAP KELAS
function loadRekapKelas(reset = false) {
  const select = document.getElementById('rekapClassSelect');
  const tbody = document.getElementById('rekapTableBody');

  if (!select || !tbody) return;

  if (reset) {
    select.value = '';
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #6b7280;">Pilih kelas terlebih dahulu</td></tr>';
  }

  select.onchange = () => {
    const selectedClass = select.value;
    if (!selectedClass) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #6b7280;">Pilih kelas terlebih dahulu</td></tr>';
      return;
    }

    const siswaInClass = dataSiswaAll.filter(s => s.kelas === selectedClass);
    if (siswaInClass.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Tidak ada siswa di kelas ini.</td></tr>';
      return;
    }

    tbody.innerHTML = siswaInClass.map(s => {
      const siswaLaporan = allLaporan.filter(l => String(l.siswa_id) === String(s.id));
      const total = siswaLaporan.length;

      let lastLaporan = '-';
      let kategoriDominan = '-';

      // Ganti logika pembacaan laporan terakhir menjadi seperti ini:
if (total > 0) {
  const laporanTerbaru = siswaLaporan[0];
  
  // Ambil teks dari jenis_masalah, kategori, laporan_lainnya, atau catatan
  lastLaporan = laporanTerbaru.jenis_masalah 
             || laporanTerbaru.kategori 
             || laporanTerbaru.laporan_lainnya 
             || laporanTerbaru.catatan 
             || 'Ada Laporan';

  // Logika Kategori Dominan
  const counts = {};
  siswaLaporan.forEach(l => {
    const cat = l.kategori || l.laporan_lainnya || 'Lainnya';
    counts[cat] = (counts[cat] || 0) + 1;
  });
  kategoriDominan = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
}

      return `
        <tr style="border-bottom: 1px solid #f3f4f6;">
          <td style="padding: 12px; font-weight: 600;">${s.nama_siswa}</td>
          <td style="padding: 12px;">${total} Laporan</td>
          <td style="padding: 12px;">${lastLaporan}</td>
          <td style="padding: 12px;">${kategoriDominan}</td>
          <td style="padding: 12px; text-align: center;">
            <button class="btn-secondary btn-detail-siswa" data-id="${s.id}" data-nama="${s.nama_siswa}" style="padding: 4px 8px; font-size: 12px; cursor: pointer;">
              Detail
            </button>
          </td>
        </tr>
      `;
    }).join('');

    document.querySelectorAll('.btn-detail-siswa').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const siswaId = e.target.getAttribute('data-id');
        const namaSiswa = e.target.getAttribute('data-nama');
        showDetailSiswa(siswaId, namaSiswa);
      });
    });
  };
}

// 7. FUNGSI MENAMPILKAN DETAIL LAPORAN SISWA
function showDetailSiswa(siswaId, namaSiswa) {
  const siswaLaporan = allLaporan.filter(l => String(l.siswa_id) === String(siswaId));
  
  let listHtml = '';
  if (siswaLaporan.length === 0) {
    listHtml = '<p style="text-align:center; color:#6b7280; padding:20px;">Belum ada riwayat laporan untuk siswa ini.</p>';
  } else {
    listHtml = siswaLaporan.map((l) => `
      <div style="border-bottom: 1px solid #e2e8f0; padding: 12px 0;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
          <small style="color:#64748b;">${new Date(l.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })}</small>
          
          <select class="select-status-update" data-laporan-id="${l.id}" style="padding: 2px 6px; font-size: 12px; border-radius: 6px; border: 1px solid #cbd5e1; background-color: ${l.status === 'selesai' ? '#dcfce7' : '#fef3c7'}; color: ${l.status === 'selesai' ? '#166534' : '#92400e'}; font-weight: 600;">
            <option value="diproses" ${l.status !== 'selesai' ? 'selected' : ''}>Diproses</option>
            <option value="selesai" ${l.status === 'selesai' ? 'selected' : ''}>Selesai</option>
          </select>
        </div>
        <p style="margin:4px 0; font-weight:600; color:#1e293b;">${l.laporan_lainnya || '-'}</p>
        <p style="margin:0; font-size:13px; color:#475569;">Catatan: ${l.catatan || '-'}</p>
      </div>
    `).join('');
  }

  const modalDetailHtml = `
    <div id="customDetailModal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:9999;">
      <div style="background:white; border-radius:12px; width:90%; max-width:500px; padding:20px; max-height:80vh; overflow-y:auto;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">
          <h3 style="margin:0;">Riwayat Laporan: ${namaSiswa}</h3>
          <button id="closeDetailModalBtn" style="border:none; background:transparent; font-size:18px; cursor:pointer;">✖</button>
        </div>
        <div>${listHtml}</div>
      </div>
    </div>
  `;

  document.getElementById('customDetailModal')?.remove();
  document.body.insertAdjacentHTML('beforeend', modalDetailHtml);

  document.getElementById('closeDetailModalBtn')?.addEventListener('click', () => {
    document.getElementById('customDetailModal')?.remove();
  });

  document.querySelectorAll('.select-status-update').forEach(selectEl => {
    selectEl.addEventListener('change', async (e) => {
      const laporanId = e.target.getAttribute('data-laporan-id');
      const statusBaru = e.target.value;

      try {
        const { error } = await supabase
          .from('laporan')
          .update({ status: statusBaru })
          .eq('id', laporanId);

        if (error) throw error;

        alert(`Status laporan berhasil diubah ke "${statusBaru.toUpperCase()}"!`);

        await loadDashboardData();
        loadRekapKelas();

      } catch (err) {
        console.error('Gagal update status:', err);
        alert('Gagal memperbarui status laporan: ' + err.message);
      }
    });
  });
}

// 8. SETUP EXPORT EVENT LISTENERS & HELPER
function setupExportEvents() {
  // Export Excel Rekap Kelas
  document.getElementById('btnExportRekap')?.addEventListener('click', () => {
    const selectedClass = document.getElementById('rekapClassSelect')?.value;
    if (!selectedClass) {
      alert('Pilih kelas terlebih dahulu sebelum mengunduh Excel!');
      return;
    }

    const siswaInClass = dataSiswaAll.filter(s => s.kelas === selectedClass);
    if (siswaInClass.length === 0) {
      alert('Tidak ada data siswa untuk kelas ini.');
      return;
    }

    const excelData = siswaInClass.map((s, index) => {
      const siswaLaporan = allLaporan.filter(l => String(l.siswa_id) === String(s.id));
      const total = siswaLaporan.length;

      let pelanggaranTerakhir = '-';
      let kategoriDominan = '-';

      if (total > 0) {
        const last = siswaLaporan[0];
        // Menggunakan fallback lengkap sesuai data di UI Web
        pelanggaranTerakhir = last.catatan 
                           || last.rincian 
                           || last.jenis_masalah 
                           || last.laporan_lainnya 
                           || last.kategori 
                           || '-';

        const counts = {};
        siswaLaporan.forEach(l => {
          const cat = l.kategori || l.laporan_lainnya || 'Lainnya';
          counts[cat] = (counts[cat] || 0) + 1;
        });
        kategoriDominan = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
      }

      return {
        'No': index + 1,
        'Nama Siswa': s.nama_siswa,
        'Total Laporan': `${total} Laporan`,
        'Pelanggaran Terakhir': pelanggaranTerakhir,
        'Kategori Dominan': kategoriDominan
      };
    });

    exportToExcel(excelData, `Rekap_BK_Kelas_${selectedClass}.xlsx`);
  });

  // Export Excel Jurnal Laporan
  document.getElementById('btnExportJurnal')?.addEventListener('click', () => {
    const filteredJurnal = getFilteredJurnal();

    if (filteredJurnal.length === 0) {
      alert('Tidak ada data jurnal yang dapat diunduh!');
      return;
    }

    const excelData = filteredJurnal.map((l, index) => {
      const tgl = l.created_at ? new Date(l.created_at).toLocaleDateString('id-ID') : '-';
      return {
        'No': index + 1,
        'Tanggal': tgl,
        'Nama Siswa': l.siswa?.nama_siswa || '-',
        'Kelas': l.siswa?.kelas || '-',
        'Kategori / Detail': l.laporan_lainnya || l.jenis_masalah || l.kategori || '-',
        'Catatan BK': l.catatan || '-',
        'Status': (l.status || 'diproses').toUpperCase()
      };
    });

    exportToExcel(excelData, `Jurnal_Laporan_BK.xlsx`);
  });
}

// FUNGSI HELPER EXPORT EXCEL DENGAN FORMAT RAPI (AUTO-FIT WIDTH)
function exportToExcel(dataArray, filename = 'Laporan_BK.xlsx') {
  if (typeof XLSX === 'undefined') {
    alert('Library SheetJS belum terpasang di file HTML!');
    return;
  }
  
  // 1. Buat worksheet dari data JSON
  const worksheet = XLSX.utils.json_to_sheet(dataArray);

  // 2. Hitung lebar kolom otomatis (Auto Width) berdasarkan karakter terpanjang
  if (dataArray.length > 0) {
    const colWidths = Object.keys(dataArray[0]).map(key => {
      // Ambil nilai paling panjang antara Nama Header atau Isi Kolom
      const maxLength = Math.max(
        key.toString().length,
        ...dataArray.map(row => (row[key] ? row[key].toString().length : 0))
      );
      return { wch: maxLength + 5 }; // Tambah margin padding 5 karakter agar lega
    });

    worksheet['!cols'] = colWidths;
  }

  // 3. Buat Workbook & simpan file
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan BK");

  XLSX.writeFile(workbook, filename);
}