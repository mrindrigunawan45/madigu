import { supabaseClient } from './supabase.js'

const mapelSelect =
  document.getElementById('rekap-jurnal-mapel')

const kelasSelect =
  document.getElementById('rekap-jurnal-kelas')

const table =
  document.getElementById('rekap-jurnal-table')

let jurnalData = []

async function loadMapel() {

  const { data } = await supabaseClient

    .from('mata_pelajaran')

    .select('*')

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

  const { data } = await supabaseClient

    .from('siswa')

    .select('kelas')

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

async function loadRekapJurnal() {

  const {
    data: { user }
  } = await supabaseClient.auth.getUser()

  if (
    !kelasSelect.value ||
    !mapelSelect.value
  ) return

  const { data } = await supabaseClient

    .from('jurnal')

    .select('*')

    .eq('user_id', user.id)

    .eq('kelas', kelasSelect.value)

    .eq('mapel', mapelSelect.value)

    .order('tanggal', { ascending:false })

  const grouped = {}

  data.forEach(item => {

    const key =

      `${item.tanggal}_${item.kelas}_${item.mapel}_${item.materi}`

    if (!grouped[key]) {

      grouped[key] = {

        tanggal: item.tanggal,

        kelas: item.kelas,

        mapel: item.mapel,

        materi: item.materi,

        tidakHadir: []

      }

    }

    if (item.status !== 'H') {

      grouped[key].tidakHadir.push(

        `${item.nama} (${item.status})`

      )

    }

  })

  jurnalData =
    Object.values(grouped)

  renderTable()

}

function renderTable() {

  table.innerHTML = `

    <tr>
      <th>Tanggal</th>
      <th>Kelas</th>
      <th>Mapel</th>
      <th>Materi</th>
      <th>Tidak Hadir</th>
    </tr>

  `

  jurnalData.forEach(item => {

    table.innerHTML += `

      <tr>

        <td>${item.tanggal}</td>
        <td>${item.kelas}</td>
        <td>${item.mapel}</td>
        <td>${item.materi}</td>

        <td>

          ${item.tidakHadir.length
            ? item.tidakHadir.join(', ')
            : '-'}

        </td>

      </tr>

    `

  })

}

kelasSelect.addEventListener(
  'change',
  loadRekapJurnal
)

mapelSelect.addEventListener(
  'change',
  loadRekapJurnal
)

loadMapel()

loadKelas()