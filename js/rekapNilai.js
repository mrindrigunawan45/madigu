import { supabaseClient } from './supabase.js'

console.log('REKAP AKTIF')

const table =
  document.getElementById('rekap-table')

const mapelSelect =
  document.getElementById('rekap-mapel')

const kelasSelect =
  document.getElementById('rekap-kelas')

let rekapData = []

async function loadMapel() {

  const { data, error } = await supabaseClient

    .from('mata_pelajaran')

    .select('*')

  if (error) {

    console.error(error)

    return

  }

  const mapelUnik =
    [...new Set(data.map(item => item.nama_mapel))]

  console.log(
    'MAPEL REKAP:',
    mapelUnik
  )

  mapelSelect.innerHTML = ''

  mapelSelect.appendChild(
    new Option('Pilih Mata Pelajaran', '')
  )

  mapelUnik.forEach(mapel => {

    mapelSelect.appendChild(

      new Option(
        mapel,
        mapel
      )

    )

  })

}

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

  console.log(
    'KELAS REKAP:',
    kelasUnik
  )

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

  const {
    data: { user }
  } = await supabaseClient.auth.getUser()

  if (
    !kelasSelect.value ||
    !mapelSelect.value
  ) {

    table.innerHTML = ''

    return

  }

  console.log(
    'USER LOGIN:',
    user.id
  )

  const { data, error } = await supabaseClient

    .from('nilai')

    .select('*')

    .eq('user_id', user.id)

    .eq('kelas', kelasSelect.value)

    .eq('mapel', mapelSelect.value)

  if (error) {

    console.error(error)

    return

  }

  console.log(
    'REKAP DATA:',
    data
  )

  rekapData = data

  renderTable()

}

function renderTable() {

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

  if (!rekapData.length) {

    table.innerHTML += `

      <tr>

        <td colspan="12">

          Belum ada data

        </td>

      </tr>

    `

    return

  }

  rekapData.forEach(item => {

    table.innerHTML += `

      <tr>

        <td>${item.siswa || '-'}</td>

        <td>${item.s1 ?? '-'}</td>
        <td>${item.s2 ?? '-'}</td>
        <td>${item.s3 ?? '-'}</td>
        <td>${item.s4 ?? '-'}</td>

        <td>${item.f1 ?? '-'}</td>
        <td>${item.f2 ?? '-'}</td>
        <td>${item.f3 ?? '-'}</td>
        <td>${item.f4 ?? '-'}</td>

        <td>${item.asts ?? '-'}</td>
        <td>${item.asas ?? '-'}</td>

        <td>

          ${item.nilai_akhir
            ? Number(
                item.nilai_akhir
              ).toFixed(2)
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

loadMapel()

loadKelas()