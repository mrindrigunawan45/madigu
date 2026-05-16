import { supabaseClient } from './supabase.js'

console.log('REKAP AKTIF')

const sessionData =
  JSON.parse(
    localStorage.getItem('session')
  )

const userLogin =
  sessionData?.email ||
  sessionData?.username ||
  'unknown-user'
  
const table =
  document.getElementById('rekap-table')

const mapelSelect =
  document.getElementById('rekap-mapel')

const kelasSelect =
  document.getElementById('rekap-kelas')

const downloadBtn =
  document.getElementById('downloadExcelBtn')

let rekapData = []

async function loadMapel() {

  const { data, error } = await supabaseClient

    .from('mata_pelajaran')

    .select('*')

  console.log('MAPEL REKAP:', data)

  if (error) {

    console.error(error)

    return

  }

  mapelSelect.innerHTML = ''

  mapelSelect.appendChild(
    new Option('Pilih Mata Pelajaran', '')
  )

  data.forEach(item => {

    mapelSelect.appendChild(

      new Option(
        item.nama_mapel,
        item.nama_mapel
      )

    )

  })

}

async function loadKelas() {

  const { data, error } = await supabaseClient

    .from('siswa')

    .select('kelas')

  console.log('KELAS REKAP:', data)

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

async function loadRekap() {

  if (
    !kelasSelect.value ||
    !mapelSelect.value
  ) return

  const { data, error } = await supabaseClient

    .from('nilai')

    .select('*')

    .eq('kelas', kelasSelect.value)

    .eq('mapel', mapelSelect.value)

  console.log('REKAP DATA:', data)

  if (error) {

    console.error(error)

    return

  }

  rekapData = data

  table.innerHTML = `

    <tr>

      <th>Nama</th>

      <th>S1</th>
      <th>S2</th>
      <th>S3</th>
      <th>S4</th>

      <th>F1</th>
      <th>F2</th>
      <th>F3</th>
      <th>F4</th>

      <th>ASTS</th>
      <th>ASAS</th>

      <th>Nilai Akhir</th>

    </tr>

  `

  data.forEach(item => {

    table.innerHTML += `

      <tr>

        <td>${item.siswa || '-'}</td>

        <td>${item.s1 || '-'}</td>
        <td>${item.s2 || '-'}</td>
        <td>${item.s3 || '-'}</td>
        <td>${item.s4 || '-'}</td>

        <td>${item.f1 || '-'}</td>
        <td>${item.f2 || '-'}</td>
        <td>${item.f3 || '-'}</td>
        <td>${item.f4 || '-'}</td>

        <td>${item.asts || '-'}</td>
        <td>${item.asas || '-'}</td>

        <td>

          ${item.nilai_akhir
            ? Number(item.nilai_akhir).toFixed(2)
            : '-'}

        </td>

      </tr>

    `

  })

}

kelasSelect.addEventListener(
  'change',
  loadRekap
)

mapelSelect.addEventListener(
  'change',
  loadRekap
)

downloadBtn.addEventListener('click', () => {

  if (!rekapData.length) {

    alert('Data kosong')

    return

  }

  const exportData = rekapData.map(item => ({

    Nama: item.siswa,

    S1: item.s1,
    S2: item.s2,
    S3: item.s3,
    S4: item.s4,

    F1: item.f1,
    F2: item.f2,
    F3: item.f3,
    F4: item.f4,

    ASTS: item.asts,
    ASAS: item.asas,

    'Nilai Akhir': item.nilai_akhir

  }))

  const worksheet =
    XLSX.utils.json_to_sheet(exportData)

  const workbook =
    XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(

    workbook,

    worksheet,

    'Rekap Nilai'

  )

  XLSX.writeFile(

    workbook,

    `Rekap_${kelasSelect.value}_${mapelSelect.value}.xlsx`

  )

})

loadMapel()

loadKelas()