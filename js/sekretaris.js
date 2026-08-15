import { supabaseClient } from './supabase.js'

let currentProfile = null
let listSiswaData = []
let absenState = {} // Status H/S/I/A per nama/id siswa
let limitHistori = 5 // Menyimpan batasan awal jumlah histori yang ditampilkan

document.addEventListener('DOMContentLoaded', async () => {
  // Biarkan input tanggal KOSONG saat awal buka
  const tglInput = document.getElementById('tgl-absen')
  if (tglInput) {
    tglInput.value = ''
    tglInput.addEventListener('change', handleDateChange)
  }

  // Attach event listener tombol
  const btnSimpan = document.getElementById('btnSimpanAbsen')
  if (btnSimpan) btnSimpan.addEventListener('click', simpanAbsensi)

  const btnTabAbsen = document.getElementById('btn-tab-absen')
  if (btnTabAbsen) btnTabAbsen.addEventListener('click', () => switchTab('absen'))

  const btnTabHistori = document.getElementById('btn-tab-histori')
  if (btnTabHistori) btnTabHistori.addEventListener('click', () => switchTab('histori'))
  
  const logoutBtn = document.getElementById('logoutBtn')
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await supabaseClient.auth.signOut()
      window.location.href = 'index.html'
    })
  }

  // Init Profil & Master Siswa
  await initSekretaris()
})

async function initSekretaris() {
  const { data: { user } } = await supabaseClient.auth.getUser()

  if (!user) {
    window.location.href = 'index.html'
    return
  }

  // 1. Fetch Profil User
  const { data: profile, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    alert('Gagal memuat profil sekretaris')
    return
  }

  currentProfile = profile

  // Header Info
  const elNama = document.getElementById('sekretaris-nama')
  const elDetail = document.getElementById('sekretaris-detail')
  if (elNama) elNama.innerText = profile.name || profile.kelas || 'Sekretaris'
  if (elDetail) elDetail.innerText = profile.sekolah || ''
  
  // Fetch Master Siswa
  if (profile.class_id || profile.kelas) {
    await fetchMasterSiswa(profile.class_id, profile.kelas)
  }
}

async function fetchMasterSiswa(classId, namaKelas) {
  let query = supabaseClient.from('siswa').select('*')

  if (classId) {
    query = query.eq('class_id', Number(classId))
  } else if (namaKelas) {
    query = query.eq('kelas', namaKelas)
  }

  const { data: siswa, error } = await query.order('nama_siswa', { ascending: true })

  if (error) {
    console.error('Error fetch siswa:', error)
    listSiswaData = []
    return
  }

  listSiswaData = siswa || []
  console.log('Master siswa berhasil dimuat:', listSiswaData.length, 'siswa')
}

// Handler saat tanggal dipilih
async function handleDateChange(e) {
  const selectedDate = e.target.value
  const btnSimpan = document.getElementById('btnSimpanAbsen')
  const container = document.getElementById('list-siswa')

  if (!selectedDate) {
    container.innerHTML = `
      <div class="empty-placeholder">
        <i class="fa-regular fa-calendar-check"></i>
        <div>Silakan pilih <strong>Tanggal Absen</strong> di atas untuk memunculkan daftar siswa.</div>
      </div>
    `
    if (btnSimpan) btnSimpan.style.display = 'none'
    return
  }

  // Tampilkan Loading
  container.innerHTML = `
    <div style="text-align:center; padding: 30px; color: #64748b;">
      <i class="fa-solid fa-spinner fa-spin fa-2x"></i>
      <p style="margin-top: 8px; font-size: 13px;">Memuat data tanggal ${selectedDate}...</p>
    </div>
  `

  // Reset & Default status Hadir (H)
  absenState = {}
  listSiswaData.forEach(s => {
    absenState[s.id] = 'H'
  })

  // Cek apakah tanggal ini SUDAH PERNAH DIISI di DB (Filter berdasarkan kelas & tanggal)
  const namaKelas = currentProfile.kelas || '9C'
  const { data: existingAbsen, error } = await supabaseClient
    .from('absen_walas')
    .select('nama, status')
    .eq('kelas', namaKelas)
    .eq('tanggal', selectedDate)

  if (!error && existingAbsen && existingAbsen.length > 0) {
    // Cari siswa_id berdasarkan kecocokan nama_siswa
    existingAbsen.forEach(item => {
      const matchSiswa = listSiswaData.find(s => (s.nama_siswa || s.nama) === item.nama)
      if (matchSiswa) {
        absenState[matchSiswa.id] = item.status
      }
    })
  }

  renderSiswaList()
  if (btnSimpan) btnSimpan.style.display = 'flex'
}

function renderSiswaList() {
  const container = document.getElementById('list-siswa')

  if (!listSiswaData.length) {
    container.innerHTML = `
      <div style="text-align:center; padding: 20px; color: #64748b;">
        Tidak ada data siswa di kelas ini.
      </div>
    `
    return
  }

  container.innerHTML = listSiswaData.map((siswa, idx) => {
    const currentStatus = absenState[siswa.id] || 'H'
    const namaSiswa = siswa.nama_siswa || siswa.nama || 'Siswa'

    return `
      <div class="siswa-card-mobile">
        <div class="siswa-nama">${idx + 1}. ${namaSiswa}</div>
        <div class="status-options">
          ${['H', 'S', 'I', 'A'].map(st => `
            <button 
              type="button"
              class="status-btn ${currentStatus === st ? 'selected-' + st : ''}"
              data-id="${siswa.id}"
              data-status="${st}">
              ${st}
            </button>
          `).join('')}
        </div>
      </div>
    `
  }).join('')

  // Event listener tombol H, S, I, A
  document.querySelectorAll('.status-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id')
      const status = e.currentTarget.getAttribute('data-status')
      absenState[id] = status
      renderSiswaList()
    })
  })
}

async function simpanAbsensi() {
  const tglInput = document.getElementById('tgl-absen')
  const tanggal = tglInput ? tglInput.value : ''
  
  if (!tanggal) {
    alert('Pilih tanggal terlebih dahulu!')
    return
  }

  if (!listSiswaData.length) return

  const confirmSave = confirm(`Simpan / Update absensi untuk tanggal ${tanggal}?`)
  if (!confirmSave) return

  const namaKelas = currentProfile.kelas || '9C'

  // Format payload disesuaikan dengan tabel absen_walas
  const payload = listSiswaData.map(siswa => ({
    user_id: currentProfile.id,
    tanggal: tanggal,
    kelas: namaKelas,
    nama: siswa.nama_siswa || siswa.nama,
    nisn: siswa.nisn || 'EMPTY',
    status: absenState[siswa.id] || 'H',
    catatan: 'EMPTY'
  }))

  // Hapus data lama tanggal & kelas tsb agar tidak duplikat
  await supabaseClient
    .from('absen_walas')
    .delete()
    .eq('kelas', namaKelas)
    .eq('tanggal', tanggal)

  // Insert data absensi baru
  const { error } = await supabaseClient
    .from('absen_walas')
    .insert(payload)

  if (error) {
    alert('Gagal menyimpan: ' + error.message)
  } else {
    alert('✅ Absensi berhasil disimpan!')

    // RESET HALAMAN KE PENGATURAN AWAL
    if (tglInput) {
      tglInput.value = '' // Kosongkan input tanggal
      tglInput.dispatchEvent(new Event('change')) // Trigger event change
    }
  }
}

// TAB & HISTORI LOGIC
function switchTab(tab) {
  const tabAbsen = document.getElementById('tab-absen')
  const tabHistori = document.getElementById('tab-histori')
  const btnAbsen = document.getElementById('btn-tab-absen')
  const btnHistori = document.getElementById('btn-tab-histori')

  if (tab === 'absen') {
    if (tabAbsen) tabAbsen.style.display = 'block'
    if (tabHistori) tabHistori.style.display = 'none'
    if (btnAbsen) btnAbsen.classList.add('active')
    if (btnHistori) btnHistori.classList.remove('active')
  } else {
    if (tabAbsen) tabAbsen.style.display = 'none'
    if (tabHistori) tabHistori.style.display = 'block'
    if (btnAbsen) btnAbsen.classList.remove('active')
    if (btnHistori) btnHistori.classList.add('active')
    loadHistoriAbsen()
  }
}

async function loadHistoriAbsen(isLoadMore = false) {
  const container = document.getElementById('list-histori')
  if (!container) return

  // Reset limit ke 5 jika pertama kali tab histori diklik
  if (!isLoadMore) {
    limitHistori = 5
    container.innerHTML = `
      <div style="text-align:center; padding: 20px; color: #64748b;">
        <i class="fa-solid fa-spinner fa-spin"></i> Memuat histori...
      </div>
    `
  }

  const namaKelas = currentProfile.kelas || '9C'

  const { data, error } = await supabaseClient
    .from('absen_walas')
    .select('tanggal, status')
    .eq('kelas', namaKelas)
    .order('tanggal', { ascending: false })

  if (error || !data || data.length === 0) {
    container.innerHTML = `
      <div class="empty-placeholder">
        <i class="fa-solid fa-clock-rotate-left"></i>
        <div>Belum ada histori absensi yang diisi.</div>
      </div>
    `
    return
  }

  // Kelompokkan per tanggal
  const summaryPerTanggal = {}
  data.forEach(item => {
    if (!summaryPerTanggal[item.tanggal]) {
      summaryPerTanggal[item.tanggal] = { H: 0, S: 0, I: 0, A: 0, total: 0 }
    }
    summaryPerTanggal[item.tanggal][item.status] = (summaryPerTanggal[item.tanggal][item.status] || 0) + 1
    summaryPerTanggal[item.tanggal].total++
  })

  const listTanggal = Object.keys(summaryPerTanggal)
  
  // Slice array histori sesuai limit saat ini
  const displayedTanggal = listTanggal.slice(0, limitHistori)

  let htmlCards = displayedTanggal.map(tgl => {
    const st = summaryPerTanggal[tgl]
    const dateFormatted = new Date(tgl).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    return `
      <div class="histori-card">
        <div class="histori-info">
          <h4>${dateFormatted}</h4>
          <p>H: <strong>${st.H || 0}</strong> | S: <strong>${st.S || 0}</strong> | I: <strong>${st.I || 0}</strong> | A: <strong>${st.A || 0}</strong></p>
        </div>
        <button class="btn-edit-histori" onclick="editTanggalAbsen('${tgl}')">
          <i class="fa-solid fa-pen-to-square"></i> Edit
        </button>
      </div>
    `
  }).join('')

  // Jika jumlah data melebihi limit, tampilkan tombol Load More
  if (listTanggal.length > limitHistori) {
    const sisaData = listTanggal.length - limitHistori
    htmlCards += `
      <div style="text-align: center; margin-top: 16px; margin-bottom: 24px;">
        <button id="btnLoadMoreHistori" style="
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #2563eb;
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.04);
          display: inline-flex;
          align-items: center;
          gap: 6px;
        ">
          <i class="fa-solid fa-chevron-down"></i> Tampilkan Lebih Banyak (${sisaData})
        </button>
      </div>
    `
  }

  container.innerHTML = htmlCards

  // Event listener tombol Load More
  const btnLoadMore = document.getElementById('btnLoadMoreHistori')
  if (btnLoadMore) {
    btnLoadMore.addEventListener('click', () => {
      limitHistori += 5 // Tambah 5 item lagi setiap diklik
      loadHistoriAbsen(true)
    })
  }
}

// Fungsi EDIT dari Histori
window.editTanggalAbsen = function(tanggal) {
  switchTab('absen')

  const tglInput = document.getElementById('tgl-absen')
  if (tglInput) {
    tglInput.value = tanggal
    tglInput.dispatchEvent(new Event('change'))
  }
}