import { supabase } from './config.js'
import { loadCurrentUser, getCurrentUser } from './session.js'
import { loadSiswa } from './absensi-sd.js'
import { initRekapAbsensi } from './rekap-absensi-sd.js' // <-- 1. DITAMBAHKAN DI SINI
import { initJurnal } from './jurnal-sd.js' // <-- Tambahkan ini

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
      e.preventDefault() // Mencegah reload/freeze page!

      menus.forEach(item => item.classList.remove('active'))
      menu.classList.add('active')

      // Sembunyikan semua section
      document.querySelectorAll('.page').forEach(page => page.classList.add('hidden'))

      // Tampilkan target section
      const targetPage = document.getElementById(menu.dataset.page + 'Page')
      if (targetPage) {
        targetPage.classList.remove('hidden')
      }

      // Jika menu yang diklik adalah 'absensi', panggil fungsi loadSiswa
      if (menu.dataset.page === 'absensi') {
        loadSiswa()
      }

      // Jika menu yang diklik adalah 'rekapAbsensi', panggil fungsi initRekapAbsensi
      if (menu.dataset.page === 'rekapAbsensi') {
        initRekapAbsensi()
      }

      // Sesuai dengan data-page="jurnal" di HTML
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

    // 2. ABSENSI HARI INI
    const today = new Date().toISOString().split('T')[0]

    const { data: absensi, error: absensiError } = await supabase
      .from('absensi')
      .select('*')
      .eq('class_id', currentClass.id)
      .eq('tanggal', today)

    if (absensiError) console.error('Absensi Error:', absensiError)

    const hadir = absensi?.filter(x => x.status === 'Hadir').length || 0
    const sakit = absensi?.filter(x => x.status === 'Sakit').length || 0
    const izin = absensi?.filter(x => x.status === 'Izin').length || 0
    const alpa = absensi?.filter(x => x.status === 'Alpa' || x.status === 'Alfa').length || 0

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
      const elSemester = document.getElementById('semesterAktifInfo')
      if (elSemester) elSemester.textContent = semesterAktif
    }

  } catch (err) {
    console.error('Dashboard Load Error:', err)
  }
}

// =====================
// LOGOUT
// =====================
document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
  e.preventDefault() // PENTING: Jangan hapus ini agar tidak crash/freeze
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

    currentClass = currentUser.kelas

    if (namaGuru && currentUser.profile?.name) {
      namaGuru.textContent = currentUser.profile.name
    }

    await loadDashboard()
  } catch (err) {
    console.error('Init Error:', err)
  }
}

// Exec
initNavigation()
initDashboard()