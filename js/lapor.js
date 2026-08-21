import { supabaseClient } from './supabase.js'

// =========================
// ELEMENT
// =========================

const siswaSelect = document.getElementById('siswaSelect')
const kategoriSelect = document.getElementById('kategoriSelect')
const jenisContainer = document.getElementById('jenisContainer')
const lainnyaBox = document.getElementById('lainnyaBox')
const laporanLainnya = document.getElementById('laporanLainnya')
const catatan = document.getElementById('catatan')
const kirimBtn = document.getElementById('kirimBtn')

let currentJenis = null
let currentSchoolId = null
let schoolModeKategori = 'all'

// =========================
// LOAD SISWA & DETEKSI SCHOOL MODE
// =========================

async function loadSiswaAndSchoolConfig() {
  const { data: { user } } = await supabaseClient.auth.getUser()
  if (!user) return

  // 1. AMBIL SCHOOL_ID DARI PROFILE USER
  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('class_id, school_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    console.log('Profile Error / Not Found:', profileError)
    return
  }

  currentSchoolId = profile.school_id
  console.log('CURRENT SCHOOL ID:', currentSchoolId)

  // 2. QUERY KE TABEL "schools" BERDASARKAN ID
  if (currentSchoolId) {
    const { data: schoolData, error: schoolError } = await supabaseClient
      .from('schools')
      .select('mode_kategori')
      .eq('id', currentSchoolId)
      .maybeSingle()

    if (schoolError) {
      console.log('Schools Query Error:', schoolError)
    } else if (schoolData && schoolData.mode_kategori) {
      schoolModeKategori = schoolData.mode_kategori
      console.log('DETECTED SCHOOL MODE:', schoolModeKategori)
    }
  }

  // 3. AMBIL DATA SISWA
  const { data: siswaData, error: siswaError } = await supabaseClient
    .from('siswa')
    .select('*')
    .eq('class_id', profile.class_id)
    .order('nama_siswa')

  if (siswaError) {
    console.log('Siswa Error:', siswaError)
    return
  }

  siswaSelect.innerHTML = `<option value="">Pilih siswa</option>`
  siswaData.forEach(item => {
    siswaSelect.innerHTML += `<option value="${item.id}">${item.nama_siswa}</option>`
  })
}

// =========================
// LOAD KATEGORI (VERBAL ONLY CHECK)
// =========================

async function loadKategori() {
  const kategoriGroup = kategoriSelect ? (kategoriSelect.closest('.form-group') || kategoriSelect.parentElement) : null

  // JIKA SEKOLAH DALAM MODE VERBAL ONLY OR SCHOOL ID SMPN36JKT
  if (schoolModeKategori === 'verbal_only' || currentSchoolId === 'SMPN36JKT') {
    if (kategoriGroup) {
      kategoriGroup.style.display = 'none' // Sembunyikan dropdown Kategori
    }

    // Auto select Kategori ID 1 (Verbal)
    kategoriSelect.innerHTML = `<option value="1" selected>Verbal</option>`
    kategoriSelect.value = "1"

    // langsung load jenis laporan Verbal (ID: 1)
    await loadJenisLaporan(1)

  } else {
    // MODE NORMAL
    if (kategoriGroup) {
      kategoriGroup.style.display = 'block'
    }

    const { data, error } = await supabaseClient
      .from('kategori_laporan')
      .select('*')
      .order('nama')

    if (error) {
      console.log('Kategori Error:', error)
      return
    }

    kategoriSelect.innerHTML = `<option value="">Pilih kategori</option>`
    data.forEach(item => {
      kategoriSelect.innerHTML += `<option value="${item.id}">${item.nama}</option>`
    })
  }
}

// =========================
// LOAD JENIS LAPORAN
// =========================

async function loadJenisLaporan(kategoriId) {
  jenisContainer.innerHTML = `<div class="loading-text">Memuat jenis laporan...</div>`
  currentJenis = null
  lainnyaBox.classList.add('hidden')

  const { data, error } = await supabaseClient
    .from('jenis_laporan')
    .select('*')
    .eq('kategori_id', Number(kategoriId))
    .order('nama')

  if (error) {
    console.log(error)
    jenisContainer.innerHTML = `<div class="error-text">Gagal memuat jenis laporan</div>`
    return
  }

  if (!data || data.length === 0) {
    jenisContainer.innerHTML = `<div class="error-text">Tidak ada jenis laporan</div>`
    return
  }

  jenisContainer.innerHTML = ''
  data.forEach(item => {
    jenisContainer.innerHTML += `
      <label class="radio-item">
        <input type="radio" name="jenis" value="${item.id}">
        <span>${item.nama}</span>
      </label>
    `
  })

  jenisContainer.innerHTML += `
    <label class="radio-item">
      <input type="radio" name="jenis" value="lainnya">
      <span>Lainnya</span>
    </label>
  `

  document.querySelectorAll('input[name="jenis"]').forEach(radio => {
    radio.addEventListener('change', () => {
      currentJenis = radio.value
      if (radio.value === 'lainnya') {
        lainnyaBox.classList.remove('hidden')
      } else {
        lainnyaBox.classList.add('hidden')
      }
    })
  })
}

// =========================
// EVENT KATEGORI
// =========================

if (kategoriSelect) {
  kategoriSelect.addEventListener('change', async () => {
    const kategoriId = kategoriSelect.value
    if (!kategoriId) {
      jenisContainer.innerHTML = ''
      return
    }
    await loadJenisLaporan(kategoriId)
  })
}

// =========================
// KIRIM LAPORAN
// =========================

kirimBtn.addEventListener('click', async () => {
  const siswaId = siswaSelect.value
  const kategoriId = kategoriSelect.value

  if (!siswaId || !kategoriId || !currentJenis) {
    alert('Lengkapi laporan terlebih dahulu')
    return
  }

  const { data: { user } } = await supabaseClient.auth.getUser()

  const payload = {
    siswa_id: siswaId,
    agen_id: user.id,
    kategori_id: kategoriId,
    school_id: currentSchoolId,
    catatan: catatan.value
  }

  if (currentJenis === 'lainnya') {
    payload.laporan_lainnya = laporanLainnya.value
  } else {
    payload.jenis_laporan_id = currentJenis
  }

  const { error } = await supabaseClient
    .from('laporan')
    .insert(payload)

  if (error) {
    console.log('Insert Error:', error)
    alert(error.message)
    return
  }

  // TELEGRAM NOTIFICATION
  try {
    const { data: siswaData } = await supabaseClient
      .from('siswa')
      .select('*')
      .eq('id', siswaId)
      .single()

    const { data: kategoriData } = await supabaseClient
      .from('kategori_laporan')
      .select('*')
      .eq('id', kategoriId)
      .single()

    let jenisNama = 'Lainnya'
    if (currentJenis !== 'lainnya') {
      const { data: jenisData } = await supabaseClient
        .from('jenis_laporan')
        .select('*')
        .eq('id', currentJenis)
        .single()
      jenisNama = jenisData?.nama || '-'
    }

    await fetch('https://ocakjidyndcojeapdsop.functions.supabase.co/telegram-bk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        school_id: currentSchoolId,
        nama_siswa: siswaData?.nama_siswa,
        kelas: siswaData?.kelas,
        kategori: kategoriData?.nama,
        jenis: jenisNama,
        laporan_lainnya: laporanLainnya.value,
        catatan: catatan.value
      })
    })
  } catch (err) {
    console.log('Telegram Error:', err)
  }

  alert('Laporan berhasil dikirim')
  location.reload()
})

// =========================
// INIT
// =========================

window.addEventListener('DOMContentLoaded', async () => {
  console.log('LAPOR ACTIVE')
  await loadSiswaAndSchoolConfig()
  await loadKategori()
})

// =========================
// LOGOUT
// =========================

const logoutBtn = document.getElementById('logoutBtn')
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    const confirmLogout = confirm('Yakin ingin logout?')
    if (!confirmLogout) return
    await supabaseClient.auth.signOut()
    window.location.href = 'index.html'
  })
}