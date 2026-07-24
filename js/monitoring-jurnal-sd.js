import { supabase } from './config.js'
import { getCurrentProfile } from './auth-sd.js'

const jurnalContainer =
  document.getElementById(
    'jurnalContainer'
  )

async function loadMonitoringJurnal() {

  if (!jurnalContainer) return

  const profile =
    await getCurrentProfile()

  if (!profile) return

  const schoolId =
    profile.school_id

    // =========================
  // DATA GURU
  // =========================

  const {
    data: guruList,
    error: guruError
  } = await supabase

    .from('profiles')

    .select(`
      id,
      name,
      class_id
    `)

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
    guruList
  )

  if (guruError) {

    console.error(
      guruError
    )

    jurnalContainer.innerHTML =
      '<p>Gagal memuat data guru</p>'

    return
  }

  // =========================
  // DATA KELAS
  // =========================

  const {
    data: kelasList,
    error: kelasError
  } = await supabase

    .from('kelas')

    .select('*')

    .eq(
      'school_id',
      schoolId
    )

  console.log(
    'DATA KELAS',
    kelasList
  )

  if (kelasError) {

    console.error(
      kelasError
    )

  }

  const selectedDate =
  document.getElementById(
    'filterTanggalJurnal'
  )?.value
  ||
  new Date()
    .toISOString()
    .split('T')[0]

let html = `

  <div class="content-card">

    <div
      style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:15px;
        flex-wrap:wrap;
        gap:10px;
      "
    >

      <h3>
        📝 Monitoring Jurnal Guru
      </h3>

      <input
        type="date"
        id="filterTanggalJurnal"
        value="${selectedDate}"
      >

    </div>

      <div class="table-wrap">

        <table>

          <thead>

            <tr>

              <th>Guru</th>
              <th>Kelas</th>
              <th>Jurnal</th>
              <th>Catatan Siswa</th>

            </tr>

          </thead>

          <tbody>

  `

  for (const guru of guruList || []) {

    const namaKelas =
      kelasList?.find(
        k => k.id === guru.class_id
      )?.nama_kelas || '-'

    const {
      data: jurnal,
      error: jurnalError
    } = await supabase

      .from('jurnal_kelas_sd')

      .select('*')

      .eq(
        'class_id',
        guru.class_id
      )

      .eq(
        'tanggal',
        selectedDate
      )

    console.log(
      'CLASS ID GURU:',
      guru.class_id
    )

    console.log(
      'DATA JURNAL:',
      jurnal
    )

    console.log(
      'JUMLAH:',
      jurnal?.length
    )

    if (jurnalError) {
      console.error(
        'ERROR JURNAL',
        jurnalError
      )
    }

    console.log(
      'JURNAL',
      guru.name,
      jurnal
    )

    const jurnalIds =
  jurnal?.map(
    j => j.id
  ) || []

let catatanSiswa = []

if (jurnalIds.length > 0) {

  const {
    data
  } = await supabase

    .from('jurnal_siswa_sd')

    .select('*')

    .in(
      'jurnal_id',
      jurnalIds
    )

  catatanSiswa =
    data || []

}
      

    const jumlahJurnal =
      jurnal?.length || 0
    
    const jumlahCatatanSiswa =
      catatanSiswa?.length || 0

    html += `

      <tr>

        <td>
          ${guru.name || '-'}
        </td>

        <td>
          ${namaKelas}
        </td>

        <td>

          <button
          class="btn-tidak-hadir"
          onclick="showJurnalDetail(${guru.class_id})"
        >
          ${jumlahJurnal}
        </button>
        

        </td>

        

        <td>

          <button
            class="btn-tidak-hadir"
            onclick="showCatatanSiswa(${guru.class_id})"
          >
            ${jumlahCatatanSiswa}
          </button>

        </td>

      </tr>

    `
  }

  html += `

          </tbody>

        </table>

      </div>

    </div>

  `

  jurnalContainer.innerHTML =
    html
  
    document
  .getElementById(
    'filterTanggalJurnal'
  )
  ?.addEventListener(
    'change',
    loadMonitoringJurnal
  )

}
// =====================================
// DETAIL JURNAL
// =====================================

window.showJurnalDetail =
async function(classId) {

  const selectedDate =
  document.getElementById(
    'filterTanggalJurnal'
  )?.value

  

  const { data } = await supabase
    .from('jurnal_kelas_sd')
    .select('*')
    .eq('class_id', classId)
    .eq(
        'tanggal',
        selectedDate
      )

  let html = `
    <table>
      <thead>
        <tr>
          <th>Materi</th>
          <th>Kegiatan</th>
          <th>Catatan Umum</th>
        </tr>
      </thead>
      <tbody>
  `

  data?.forEach(item => {

    html += `
      <tr>
        <td>${item.materi || '-'}</td>
        <td>${item.kegiatan || '-'}</td>
        <td>${item.catatan || '-'}</td>
      </tr>
    `

  })

  html += `
      </tbody>
    </table>
  `

  document.getElementById(
    'modalTitle'
  ).innerHTML =
    'Detail Jurnal'

  document.getElementById(
    'modalBody'
  ).innerHTML =
    html

  document.getElementById(
    'detailModal'
  ).style.display =
    'flex'
}


// =====================================
// CATATAN SISWA
// =====================================

window.showCatatanSiswa =
async function(classId) {

  const selectedDate =
    document.getElementById(
      'filterTanggalJurnal'
    )?.value

  const {
    data: jurnalHariIni
  } = await supabase

    .from('jurnal_kelas_sd')

    .select('id')

    .eq(
      'class_id',
      classId
    )

    .eq(
      'tanggal',
      selectedDate
    )

  const jurnalIds =
    jurnalHariIni?.map(
      j => j.id
    ) || []

  const { data } = await supabase

    .from('jurnal_siswa_sd')

    .select(`
      *,
      siswa (
        nama_siswa
      )
    `)

    .in(
      'jurnal_id',
      jurnalIds
    )

  let html = `
    <table>
      <thead>
        <tr>
          <th>Nama Siswa</th>
          <th>Kategori</th>
          <th>Catatan</th>
        </tr>
      </thead>
      <tbody>
  `

  data?.forEach(item => {

    html += `
      <tr>
        <td>${item.siswa?.nama_siswa || '-'}</td>
        <td>${item.kategori || '-'}</td>
        <td>${item.catatan || '-'}</td>
      </tr>
    `

  })

  html += `
      </tbody>
    </table>
  `

  document.getElementById(
    'modalTitle'
  ).innerHTML =
    'Catatan Siswa'

  document.getElementById(
    'modalBody'
  ).innerHTML =
    html

  document.getElementById(
    'detailModal'
  ).style.display =
    'flex'
}

// =====================================
// CLOSE MODAL
// =====================================

window.closeDetailModal =
function() {

  document.getElementById(
    'detailModal'
  ).style.display =
    'none'
}

loadMonitoringJurnal()