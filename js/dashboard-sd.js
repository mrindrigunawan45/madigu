import { supabase } from './config.js'
import { loadCurrentUser, getCurrentUser } from './session.js'
import { loadSiswa } from './absensi-sd.js'
import { initRekapAbsensi } from './rekap-absensi-sd.js'
import { initJurnal } from './jurnal-sd.js'

// =====================
// ELEMENT DOM
// =====================
const menuBtn = document.getElementById('menuBtn')
const sidebar = document.getElementById('sidebar')
const overlay = document.getElementById('overlay')
const jumlahSiswa = document.getElementById('jumlahSiswa')
const hadirHariIni = document.getElementById('hadirHariIni')
const hadirHariIniStat = document.getElementById('hadirHariIniStat')
const namaGuru = document.getElementById('namaGuru')

let currentUser = null
let currentClass = null

// =====================
// MOBILE SIDEBAR
// =====================
menuBtn?.addEventListener('click', () => {
  sidebar?.classList.add('show')
  overlay?.classList.add('show')
})

overlay?.addEventListener('click', () => {
  sidebar?.classList.remove('show')
  overlay?.classList.remove('show')
})

// =====================
// NAVIGATION
// =====================
function initNavigation() {
  const menus = document.querySelectorAll('.menu')

  menus.forEach(menu => {
    menu.addEventListener('click', e => {
      e.preventDefault()

      menus.forEach(item => item.classList.remove('active'))
      menu.classList.add('active')

      // Sembunyikan semua section
      document.querySelectorAll('.page').forEach(page => page.classList.add('hidden'))

      // Tampilkan target section
      const targetPage = document.getElementById(menu.dataset.page + 'Page')
      if (targetPage) {
        targetPage.classList.remove('hidden')
      }

      // Trigger modul spesifik saat tab diklik
      if (menu.dataset.page === 'absensi') {
        loadSiswa()
      }

      if (menu.dataset.page === 'rekapAbsensi') {
        initRekapAbsensi()
      }

      if (menu.dataset.page === 'jurnal') {
        initJurnal()
      }

      // Tutup sidebar mobile
      sidebar?.classList.remove('show')
      overlay?.classList.remove('show')
    })
  })
}

// =====================
// DASHBOARD DATA
// =====================
async function loadDashboard() {
  try {
    if (!currentClass?.id) return

    // 1. TOTAL SISWA
    const { data: siswa, error: siswaError } = await supabase
      .from('siswa')
      .select('*')
      .eq('class_id', currentClass.id)

    if (siswaError) console.error('Siswa Error:', siswaError)
    if (jumlahSiswa) jumlahSiswa.textContent = siswa?.length || 0

    // 2. ABSENSI HARI INI (Format Tanggal Lokal Komputer)
    const d = new Date()
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    const { data: absensi, error: absensiError } = await supabase
      .from('absensi')
      .select('*')
      .eq('class_id', currentClass.id)
      .eq('tanggal', today)

    if (absensiError) console.error('Absensi Error:', absensiError)

    // Perhitungan status fleksibel (Abaikan kapitalisasi & dukung kode H/S/I/A)
    let hadir = 0, sakit = 0, izin = 0, alpa = 0

    if (absensi && absensi.length > 0) {
      absensi.forEach(x => {
        const st = (x.status || '').trim().toUpperCase()
        if (st === 'HADIR' || st === 'H') hadir++
        else if (st === 'SAKIT' || st === 'S') sakit++
        else if (st === 'IZIN' || st === 'I') izin++
        else if (st === 'ALPA' || st === 'ALFA' || st === 'A') alpa++
      })
    }

    // Update elemen DOM
    if (hadirHariIni) hadirHariIni.textContent = hadir
    if (hadirHariIniStat) hadirHariIniStat.textContent = hadir

    const elSakit = document.getElementById('totalSakit')
    const elIzin = document.getElementById('totalIzin')
    const elAlfa = document.getElementById('totalAlfa')

    if (elSakit) elSakit.textContent = sakit
    if (elIzin) elIzin.textContent = izin
    if (elAlfa) elAlfa.textContent = alpa

    // 3. INFORMASI KELAS & SEMESTER
    const kelasInfo = document.getElementById('kelasInfo')
    if (kelasInfo && currentClass?.nama_kelas) {
      kelasInfo.textContent = `Kelas ${currentClass.nama_kelas}`
    }

    const { data: semester, error: semesterError } = await supabase
      .from('semester')
      .select('*')
      .eq('school_id', currentClass.school_id)
      .eq('is_active', true)
      .limit(1)

    if (semesterError) {
      console.error('Semester Error:', semesterError)
    } else {
      const semesterAktif = semester?.[0]?.nama_semester || '-'
      const tahunAjaran = semester?.[0]?.tahun_ajaran || '-'

      const elSemester = document.getElementById('semesterAktifInfo')
      const elTahunAjaran = document.getElementById('tahunAjaranInfo')

      if (elSemester) elSemester.textContent = semesterAktif
      if (elTahunAjaran) elTahunAjaran.textContent = `Tahun Ajaran ${tahunAjaran}`
    }

  } catch (err) {
    console.error('Dashboard Load Error:', err)
  }
}

// =====================
// LOGOUT
// =====================
document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
  e.preventDefault()
  try {
    await supabase.auth.signOut()
  } catch (err) {
    console.error(err)
  }
  location.href = 'index.html'
})

// =====================
// INIT APP
// =====================
async function initDashboard() {
  try {
    await loadCurrentUser()
    currentUser = getCurrentUser()

    if (!currentUser) {
      location.href = 'index.html'
      return
    }

    // Penanganan Kelas (Array maupun Single Object)
    currentClass = Array.isArray(currentUser.kelas) ? currentUser.kelas[0] : currentUser.kelas

    if (namaGuru && currentUser.profile?.name) {
      namaGuru.textContent = currentUser.profile.name
    }

    const sekolahInfo = document.getElementById('sekolahInfo')
    if (sekolahInfo && currentUser.profile?.sekolah) {
      sekolahInfo.textContent = currentUser.profile.sekolah
    }

    await loadDashboard()
  } catch (err) {
    console.error('Init Error:', err)
  }
}

// Exec
initNavigation()
initDashboard()