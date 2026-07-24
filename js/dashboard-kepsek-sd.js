
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
            item.classList.remove('active')
          )

        menu.classList.add('active')

        document
          .querySelectorAll('main section')
          .forEach(section =>
            section.classList.add('hidden')
          )

        const page =
          document.getElementById(
            menu.dataset.page + 'Page'
          )

        if (page) {

          page.classList.remove('hidden')

          if (
            menu.dataset.page ===
            'nilai'
          ) {

            if (
              typeof loadMonitoringNilai ===
              'function'
            ) {

              loadMonitoringNilai()

            }

          }

          if (
            menu.dataset.page ===
            'ledger'
          ) {

            if (
              typeof loadMonitoringLedger ===
              'function'
            ) {

              loadMonitoringLedger()

            }

          }

        }

      }

    )

  })

const monitoringKelas =
  document.getElementById(
    'monitoringKelas'
  )

const monitoringJurnal =
  document.getElementById(
    'monitoringJurnal'
  )

const catatanTerbaru =
  document.getElementById(
    'catatanTerbaru'
  )

  async function loadMonitoringKelas(
    schoolId
  ) {
  if (!monitoringKelas) return

  const {
    data: kelas
  } = await supabase

    .from('kelas')
    .select('*')
    .eq(
      'school_id',
      schoolId
    )

  const today =
    new Date()
    .toISOString()
    .split('T')[0]

  async function loadMonitoringJurnal(
    schoolId
  ) {

  }
  const { data: guru } =
  await supabase
    .from('profiles')
    .select('*')
    .eq('role','guru_sd')
    .eq('school_id', schoolId)
    let html = `

  <h3>
    📋 Rekap Kehadiran Hari Ini
  </h3>

  <div class="table-wrap">

  <table>

    <thead>

      <tr>

        <th>Kelas</th>
        <th>Guru</th>
        <th>Jumlah Siswa</th>
        <th>Hadir</th>
        <th>Tidak Hadir</th>

      </tr>

    </thead>

    <tbody>

  `

  for (const item of kelas) {

    const {
      data: siswa
    } = await supabase

      .from('siswa')
      .select('id')
      .eq(
        'class_id',
        item.id
      )

    const {
      data: guru
    } = await supabase

      .from('profiles')
      .select('name')
      .eq('class_id', item.id)
      .eq('role', 'guru_sd')
      .eq('school_id', schoolId)
      .limit(1)

    const {
      data: absensi
    } = await supabase

      .from('absensi')
      .select('status')
      .eq(
        'class_id',
        item.id
      )
      .eq(
        'tanggal',
        today
      )

    const hadir =
      absensi?.filter(
        x => x.status === 'Hadir'
      ).length || 0

    const tidakHadir =
      absensi?.filter(
        x => x.status !== 'Hadir'
      ).length || 0

    html += `

      <tr>

        <td>
          ${item.nama_kelas}
        </td>

        <td>
          ${guru?.[0]?.name || '-'}
        </td>

        <td>
          ${siswa?.length || 0}
        </td>

        <td>
          ${
            absensi?.length
              ? hadir
              : '0'
          }
        </td>
        
        <td>

          ${
            absensi?.length
              ? `
                <button
                  class="btn-tidak-hadir"
                  onclick="showTidakHadir(${item.id})"
                >
                  ${tidakHadir}
                </button>
              `
              : `
                <span class="badge-belum">
                  Belum
                </span>
              `
          }

</td>

      </tr>

    `
  }

  html += `

    </tbody>

  </table>

  </div>

  `

  monitoringKelas.innerHTML =
    html

}

document
  .getElementById(
    'closeTidakHadir'
  )
  ?.addEventListener(
    'click',
    () => {

      document
        .getElementById(
          'modalTidakHadir'
        )
        .classList
        .add('hidden')

    }
  )

// =====================
// DASHBOARD
// =====================
window.showTidakHadir =
async function(classId){

  const today =
    new Date()
    .toISOString()
    .split('T')[0]

  const {
  data,
  error
} = await supabase

  .from('absensi')
  .select('*')

  .eq(
    'class_id',
    classId
  )

  .eq(
    'tanggal',
    today
  )

  .neq(
    'status',
    'Hadir'
  )

console.log(
  'DATA TIDAK HADIR',
  data
)

  const detail =
    document.getElementById(
      'detailTidakHadir'
    )

  let html = `

  <table>

    <thead>

      <tr>

        <th>Nama</th>
        <th>Keterangan</th>

      </tr>

    </thead>

    <tbody>

`

  for (const item of data || []) {

    const {
    data: siswa
  } = await supabase

    .from('siswa')
    .select('nama_siswa')
    .eq(
      'id',
      item.siswa_id
    )
    .single()

    html += `

      <tr>

        <td>
          ${siswa?.nama_siswa || '-'}
        </td>

        <td>
          ${item.status}
        </td>

      </tr>

    `
  }

  html += `
      </tbody>
    </table>
  `

  detail.innerHTML =
    html

  document
    .getElementById(
      'modalTidakHadir'
    )
    .classList
    .remove('hidden')

}

async function loadDashboard() {

  const profile =
  await getCurrentProfile()

console.log('PROFILE LOGIN', profile)

if (!profile) return

const schoolId =
  profile.school_id

console.log('SCHOOL ID', schoolId)

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
    console.log(
      'DATA SISWA',
      siswa
    )

    console.log(
      'JUMLAH SISWA',
      siswa?.length
    )

    console.log(
      'ERROR SISWA',
      siswaError
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
  .select('id,name,class_id')
  .eq(
    'role',
    'guru_sd'
  )
  .eq(
    'school_id',
    schoolId
  )

console.log(
  'DATA GURU',
  guru
)

console.log(
  'ERROR GURU',
  guruError
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
    await loadMonitoringKelas(
      schoolId
    )
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