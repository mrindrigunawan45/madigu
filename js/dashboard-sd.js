import { supabase } from './config.js'

import {
  getCurrentClass
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

const jumlahSiswa =
  document.getElementById('jumlahSiswa')

const hadirHariIni =
  document.getElementById('hadirHariIni')

const catatanHariIni =
  document.getElementById('catatanHariIni')

const semesterAktif =
  document.getElementById('semesterAktif')

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

        if (
            menu.dataset.page !==
            'absensi'
            ) {

            window.resetAbsensiPage?.()

            }

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

    hadirHariIni.textContent =
      hadir

    catatanHariIni.textContent =
      `S:${sakit} | I:${izin} | A:${alpa}`

    // =====================
    // SEMESTER AKTIF
    // =====================

   const {
    data: semester,
    error: semesterError
  } = await supabase

    .from('semester')
    .select('*')
    .eq('school_id', 'SDNHB01')
    .eq('is_active', true)
    .limit(1)

    if (
      semesterError ||
      !semester
    ) {

      semesterAktif.textContent =
        '-'

    } else {

      semesterAktif.textContent =
        semester?.[0]?.nama_semester || '-'

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

  currentClass =
    await getCurrentClass()

  console.log(
    'CURRENT CLASS',
    currentClass
  )

  await loadDashboard()

}

initDashboard()