
import { supabase } from './config.js'
import {
  getCurrentProfile
} from './auth-sd.js'

// =====================
// ELEMENT
// =====================

const menuBtn =
  document.getElementById('menuBtn')

const sidebar =
  document.getElementById('sidebar')

const overlay =
  document.getElementById('overlay')

const totalSiswa =
  document.getElementById('totalSiswa')

const totalGuru =
  document.getElementById('totalGuru')

const totalKelas =
  document.getElementById('totalKelas')

const persenHadir =
  document.getElementById('persenHadir')

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

document
  .querySelectorAll('.menu')
  .forEach(menu => {

    menu.addEventListener(
      'click',
      e => {

        e.preventDefault()

        document
          .querySelectorAll('.menu')
          .forEach(item =>
            item.classList.remove(
              'active'
            )
          )

        menu.classList.add(
          'active'
        )

        document
          .querySelectorAll(
            'main section'
          )
          .forEach(section =>
            section.classList.add(
              'hidden'
            )
          )

        const page =
          document.getElementById(
            menu.dataset.page +
            'Page'
          )

        if (page) {

          page.classList.remove(
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

// =====================
// DASHBOARD
// =====================

async function loadDashboard() {

  try {

    const profile =
      await getCurrentProfile()

    if (!profile) {

      return

    }

    const schoolId =
      profile.school_id

    console.log(
      'SCHOOL:',
      schoolId
    )

    // =====================
    // TOTAL SISWA
    // =====================

    const {
      data: siswa,
      error: siswaError
    } = await supabase

      .from('siswa')
      .select('id')
      .eq(
        'school_id',
        schoolId
      )

    if (siswaError) {

      console.error(
        siswaError
      )

    }

    totalSiswa.textContent =
      siswa?.length || 0

    // =====================
    // TOTAL GURU SD
    // =====================

    const {
      data: guru,
      error: guruError
    } = await supabase

      .from('profiles')
      .select('id')
      .eq(
        'role',
        'guru_sd'
      )
      .eq(
        'school_id',
        schoolId
      )

    if (guruError) {

      console.error(
        guruError
      )

    }

    totalGuru.textContent =
      guru?.length || 0

    // =====================
    // TOTAL KELAS
    // =====================

    const {
      data: kelas,
      error: kelasError
    } = await supabase

      .from('kelas')
      .select('id')
      .eq(
        'school_id',
        schoolId
      )

    if (kelasError) {

      console.error(
        kelasError
      )

    }

    totalKelas.textContent =
      kelas?.length || 0

    // =====================
    // KEHADIRAN HARI INI
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
      .select('status')
      .eq(
        'school_id',
        schoolId
      )
      .eq(
        'tanggal',
        today
      )

    if (absensiError) {

      console.error(
        absensiError
      )

    }

    const total =
      absensi?.length || 0

    const hadir =
      absensi?.filter(
        x =>
          x.status === 'Hadir'
      ).length || 0

    const persen =
      total > 0
        ? Math.round(
            hadir / total * 100
          )
        : 0

    persenHadir.textContent =
      `${persen}%`

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

async function init() {

  await loadDashboard()

}

init()