import { supabaseClient } from './supabase.js'

const kelasSelect =
  document.getElementById('rekap-absen-kelas')

const table =
  document.getElementById('rekap-absen-table')

const downloadBtn =
  document.getElementById('downloadAbsenBtn')

let absenData = []

async function loadKelas() {

  const { data, error } = await supabaseClient

    .from('siswa')

    .select('kelas')

  if (error) {

    console.error(error)

    return

  }

  const kelasUnik =
    [...new Set(data.map(item => item.kelas))]

  kelasSelect.innerHTML = ''

  kelasSelect.appendChild(
    new Option('Pilih Kelas', '')
  )

  kelasUnik.forEach(kelas => {

    kelasSelect.appendChild(

      new Option(
        kelas,
        kelas
      )

    )

  })

}

async function loadRekapAbsen() {

  if (!kelasSelect.value) return

  const { data, error } = await supabaseClient

    .from('jurnal')

    .select('*')

    .eq('kelas', kelasSelect.value)

  if (error) {

    console.error(error)

    return

  }

  const grouped = {}

  data.forEach(item => {

  // skip data kosong
  if (!item.nama) return

  if (!grouped[item.nama]) {

    grouped[item.nama] = {

      nama: item.nama,

      sakit: 0,

      izin: 0,

      alpa: 0,

      hadir: 0,

      total: 0

    }

  }

  grouped[item.nama].total++

  if (item.status === 'H')
    grouped[item.nama].hadir++

  if (item.status === 'S')
    grouped[item.nama].sakit++

  if (item.status === 'I')
    grouped[item.nama].izin++

  if (item.status === 'A')
    grouped[item.nama].alpa++

})

  absenData = Object.values(grouped)

  renderTable()

}

function renderTable() {

  table.innerHTML = `

    <tr>

      <th>No</th>

      <th>Nama</th>

      <th>S</th>

      <th>I</th>

      <th>A</th>

      <th>Kehadiran</th>

    </tr>

  `

  absenData.forEach((item, index) => {

    const persen =

      ((item.hadir / item.total) * 100)

      .toFixed(1)

    table.innerHTML += `

      <tr>

        <td>${index + 1}</td>

        <td>${item.nama}</td>

        <td>${item.sakit}</td>

        <td>${item.izin}</td>

        <td>${item.alpa}</td>

        <td>${persen}%</td>

      </tr>

    `

  })

}

kelasSelect.addEventListener(
  'change',
  loadRekapAbsen
)

downloadBtn.addEventListener('click', () => {

  if (!absenData.length) {

    alert('Data kosong')

    return

  }

  const exportData = absenData.map((item, index) => ({

    No: index + 1,

    Nama: item.nama,

    Sakit: item.sakit,

    Izin: item.izin,

    Alpa: item.alpa,

    Kehadiran:

      ((item.hadir / item.total) * 100)

      .toFixed(1) + '%'

  }))

  const worksheet =
    XLSX.utils.json_to_sheet(exportData)

  const workbook =
    XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(

    workbook,

    worksheet,

    'Rekap Absen'

  )

  XLSX.writeFile(

    workbook,

    `Rekap_Absen_${kelasSelect.value}.xlsx`

  )

})

loadKelas()