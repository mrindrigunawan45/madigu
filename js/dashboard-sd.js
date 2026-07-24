import { supabase } from './config.js'

import {
  loadCurrentUser,
  getCurrentUser
} from './session.js'

// =====================
// ELEMENT
// =====================

const menuBtn =
  document.getElementById('menuBtn')

const sidebar =
  document.getElementById('sidebar')

const overlay =
  document.getElementById('overlay')

const jumlahSiswa =
  document.getElementById('jumlahSiswa')

const hadirHariIni =
  document.getElementById('hadirHariIni')

const namaGuru =
  document.getElementById('namaGuru')

let currentUser = null
let currentClass = null

// =====================
// MOBILE SIDEBAR
// =====================

menuBtn?.addEventListener(
  'click',
  () => {

    sidebar?.classList.add(
      'show'
    )

    overlay?.classList.add(
      'show'
    )

  }
)

overlay?.addEventListener(
  'click',
  () => {

    sidebar?.classList.remove(
      'show'
    )

    overlay?.classList.remove(
      'show'
    )

  }
)

// =====================
// NAVIGATION
// =====================

function initNavigation() {

  const menus =
    document.querySelectorAll('.menu')

  menus.forEach(menu => {

    menu.addEventListener(
      'click',
      e => {

        e.preventDefault()

        menus.forEach(item =>
          item.classList.remove('active')
        )

        menu.classList.add('active')

        document
          .querySelectorAll('.page')
          .forEach(page =>
            page.classList.add('hidden')
          )

        const targetPage =
          document.getElementById(
            menu.dataset.page + 'Page'
          )

        if (targetPage) {

          targetPage.classList.remove(
            'hidden'
          )

        }

        sidebar?.classList.remove(
          'show'
        )

        overlay?.classList.remove(
          'show'
        )

      }
    )

  })

}

// =====================
// DASHBOARD
// =====================

async function loadDashboard() {

  try {

    // =====================
    // TOTAL SISWA SD
    // =====================

    const {
      data: siswa,
      error: siswaError
    } = await supabase

      .from('siswa')
      .select('*')
      .eq(
        'class_id',
        currentClass.id
      )

    if (siswaError) {

      console.error(siswaError)

      return

    }

    jumlahSiswa.textContent =
      siswa?.length || 0

    // =====================
    // HARI INI
    // =====================

    const today =
      new Date()
        .toISOString()
        .split('T')[0]

    const {
      data: absensi,
      error: absensiError
    } = await supabase

      .from('absensi')
      .select('*')
      .eq(
        'class_id',
        currentClass.id
      )
      .eq(
        'tanggal',
        today
      )

    if (absensiError) {

      console.error(absensiError)

    }

    const hadir =
      absensi?.filter(
        x =>
          x.status === 'Hadir'
      ).length || 0

    const sakit =
      absensi?.filter(
        x =>
          x.status === 'Sakit'
      ).length || 0

    const izin =
      absensi?.filter(
        x =>
          x.status === 'Izin'
      ).length || 0

    const alpa =
      absensi?.filter(
        x =>
          x.status === 'Alpa'
      ).length || 0

    hadirHariIni.textContent = hadir;

    document.getElementById("totalSakit").textContent = sakit;
    document.getElementById("totalIzin").textContent = izin;
    document.getElementById("totalAlfa").textContent = alpa;

    // =====================
// SEMESTER AKTIF
// =====================

const {
  data: semester,
  error: semesterError
} = await supabase

  .from('semester')
  .select('*')
  .eq('school_id', currentClass.school_id)
  .eq('is_active', true)
  .limit(1)

if (semesterError) {

  console.error(semesterError)

} else {

  const semesterAktif =
    semester?.[0]?.nama_semester || '-'

  console.log(
    'Semester Aktif:',
    semesterAktif
  )

}

}

catch (err) {

  console.error(
    'Dashboard Error',
    err
  )
}

}

// =====================
// LOGOUT
// =====================

document
  .getElementById(
    'logoutBtn'
  )
  ?.addEventListener(
    'click',
    async () => {

      try {

        await supabase
          .auth
          .signOut()

      }

      catch (err) {

        console.error(err)

      }

      location.href =
        'index.html'

    }
  )

// =====================
// INIT
// =====================

async function initDashboard() {

  await loadCurrentUser()

  currentUser =
    getCurrentUser()

  console.log(
    'CURRENT USER',
    currentUser
  )

  currentClass =
    currentUser.kelas

  console.log(
    'CURRENT CLASS',
    currentClass
  )

  namaGuru.textContent =
    currentUser.profile.name

  await loadDashboard()

}

initNavigation()
initDashboard()