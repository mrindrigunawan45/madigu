import { supabaseClient } from './supabase.js'

// =========================
// USER LOGIN
// =========================

const sessionData =

  JSON.parse(
    localStorage.getItem('session')
  )

const userLogin =

  sessionData?.email ||

  sessionData?.username ||

  'unknown-user'

// =========================
// ELEMENT
// =========================

const mapelSelect =
  document.getElementById('rekap-jurnal-mapel')

const kelasSelect =
  document.getElementById('rekap-jurnal-kelas')

const table =
  document.getElementById('rekap-jurnal-table')

const downloadBtn =
  document.getElementById('downloadJurnalBtn')

let jurnalData = []

// =========================
// LOAD MAPEL
// =========================

async function loadMapel() {

  const { data, error } =

    await supabaseClient

      .from('mata_pelajaran')

      .select('*')

  if (error) {

    console.error(error)

    return

  }

  mapelSelect.innerHTML = `

    <option value="">
      Pilih Mata Pelajaran
    </option>

  `

  data.forEach(item => {

    mapelSelect.innerHTML += `

      <option value="${item.nama_mapel}">

        ${item.nama_mapel}

      </option>

    `

  })

}

// =========================
// LOAD KELAS
// =========================

async function loadKelas() {

  const { data, error } =

    await supabaseClient

      .from('siswa')

      .select('kelas')

  if (error) {

    console.error(error)

    return

  }

  const kelasUnik =

    [...new Set(
      data.map(item => item.kelas)
    )]

  kelasSelect.innerHTML = `

    <option value="">
      Pilih Kelas
    </option>

  `

  kelasUnik.forEach(kelas => {

    kelasSelect.innerHTML += `

      <option value="${kelas}">

        ${kelas}

      </option>

    `

  })

}

// =========================
// LOAD REKAP
// =========================

async function loadRekap() {

  const mapel =
    mapelSelect.value

  const kelas =
    kelasSelect.value

  if (
    !mapel ||
    !kelas
  ) return

  const { data, error } =

    await supabaseClient

      .from('jurnal')

      .select('*')

      .eq('mapel', mapel)

      .eq('kelas', kelas)

      // MULTI USER

      .eq('created_by', userLogin)

      .order('tanggal')

  if (error) {

    console.error(error)

    return

  }

  jurnalData = data

  renderTable()

}

// =========================
// RENDER TABLE
// =========================

function renderTable() {

  if (!jurnalData.length) {

    table.innerHTML = `

      <tr>

        <td>

          Tidak ada data

        </td>

      </tr>

    `

    return

  }

  let html = `

    <tr>

      <th>No</th>

      <th>Tanggal</th>

      <th>Nama</th>

      <th>Status</th>

      <th>Materi</th>

    </tr>

  `

  jurnalData.forEach((item, index) => {

    html += `

      <tr>

        <td>

          ${index + 1}

        </td>

        <td>

          ${item.tanggal}

        </td>

        <td>

          ${item.nama}

        </td>

        <td>

          ${item.status}

        </td>

        <td>

          ${item.materi || '-'}

        </td>

      </tr>

    `

  })

  table.innerHTML = html

}

// =========================
// DOWNLOAD EXCEL
// =========================

downloadBtn.addEventListener(
  'click',
  () => {

    if (!jurnalData.length) {

      alert('Data kosong')

      return

    }

    const worksheet =

      XLSX.utils.table_to_sheet(
        table
      )

    const workbook =

      XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(

      workbook,
      worksheet,
      'Rekap Jurnal'

    )

    XLSX.writeFile(

      workbook,

      `Rekap_Jurnal_${kelasSelect.value}.xlsx`

    )

  }
)

// =========================
// EVENT
// =========================

mapelSelect.addEventListener(
  'change',
  loadRekap
)

kelasSelect.addEventListener(
  'change',
  loadRekap
)

// =========================
// INIT
// =========================

loadMapel()
loadKelas()