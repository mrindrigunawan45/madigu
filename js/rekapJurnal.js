import { supabaseClient } from './supabase.js'

const mapelSelect =
  document.getElementById('rekap-jurnal-mapel')

const kelasSelect =
  document.getElementById('rekap-jurnal-kelas')

const table =
  document.getElementById('rekap-jurnal-table')

let jurnalData = []

async function loadMapel() {

  const { data, error } = await supabaseClient

    .from('mata_pelajaran')

    .select('*')

  if (error) {

    console.log(error)

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

  if (error) {

    console.log(error)

    return

  }

  const kelasUnik = [

    ...new Set(

      data

        .map(item => item.kelas)

        .filter(k => k && k.trim() !== '')

    )

  ]

  kelasUnik.sort((a, b) =>

    a.localeCompare(
      b,
      undefined,
      { numeric: true }
    )

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

async function loadRekapJurnal() {

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

  const { data, error } = await supabaseClient

    .from('jurnal')

    .select('*')

    .eq('user_id', user.id)

    .eq('kelas', kelasSelect.value)

    .eq('mapel', mapelSelect.value)

    .order('tanggal', { ascending:false })

  if (error) {

    console.log(error)

    return

  }

  const grouped = {}

  data.forEach(item => {

    const key =

      `${item.tanggal}_${item.kelas}_${item.mapel}_${item.materi}`

    if (!grouped[key]) {

      grouped[key] = {

        id: item.id,

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
      <th>Aksi</th>

    </tr>

  `

  if (!jurnalData.length) {

    table.innerHTML += `

      <tr>

        <td colspan="6">

          Belum ada data

        </td>

      </tr>

    `

    return

  }

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

        <td>

          <button
            class="edit-btn"
            onclick="editJurnal('${item.id}')"
          >

            Edit

          </button>

          <button
            class="delete-btn"
            onclick='hapusJurnal(
              "${item.tanggal}",
              "${item.kelas}",
              "${item.mapel}",
              ${JSON.stringify(item.materi)}
            )'
          >

            Hapus

          </button>

        </td>

      </tr>

    `

  })

}

window.editJurnal =
async function(id) {

  const { data, error } =
    await supabaseClient

      .from('jurnal')

      .select('*')

      .eq('id', id)

      .single()

  if (error || !data) {

    console.log(error)

    return

  }

  document.getElementById('tanggal').value =
    data.tanggal

  document.getElementById('mapel-jurnal').value =
    data.mapel

  document.getElementById('kelas-jurnal').value =
    data.kelas

  document.getElementById('materi').value =
    data.materi

  window.editJurnalId = id

  showTab('jurnalTab')

}

window.hapusJurnal =
async function(

  tanggal,
  kelas,
  mapel,
  materi

) {

  const konfirmasi =
    confirm(

      'Yakin ingin menghapus jurnal ini?'

    )

  if (!konfirmasi) return

  const { error } =
    await supabaseClient

      .from('jurnal')

      .delete()

      .eq('tanggal', tanggal)

      .eq('kelas', kelas)

      .eq('mapel', mapel)

      .eq('materi', materi)

  if (error) {

    console.log(error)

    alert('Gagal menghapus jurnal')

    return

  }

  alert('Jurnal berhasil dihapus')

  loadRekapJurnal()

}

kelasSelect.addEventListener(
  'change',
  loadRekapJurnal
)

mapelSelect.addEventListener(
  'change',
  loadRekapJurnal
)

document
  .getElementById('downloadJurnalBtn')

  .addEventListener('click', () => {

    if (!jurnalData.length) {

      alert('Belum ada data jurnal')

      return

    }

    const excelData = jurnalData.map(item => ({

      Tanggal: item.tanggal,

      Kelas: item.kelas,

      Mapel: item.mapel,

      Materi: item.materi,

      'Tidak Hadir':

        item.tidakHadir.length

          ? item.tidakHadir.join(', ')

          : '-'

    }))

    const ws =
      XLSX.utils.json_to_sheet(excelData)

    const wb =
      XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(

      wb,
      ws,
      'Rekap Jurnal'

    )

    XLSX.writeFile(

      wb,
      'Rekap_Jurnal.xlsx'

    )

  })
  
loadMapel()

loadKelas()