import { supabaseClient } from './supabase.js'

// =======================
// GET SCHOOL ID
// =======================
async function getSchoolId() {

  const {
    data: { user }
  } = await supabaseClient.auth.getUser()

  if (!user) return null

  const {
    data: profile,
    error
  } = await supabaseClient

    .from('profiles')

    .select('school_id')

    .eq('id', user.id)

    .single()

  if (error) {

    console.error(error)

    return null

  }

  return profile.school_id

}

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

  const schoolId =
    await getSchoolId()

  if (!schoolId) return

  const { data, error } =
    await supabaseClient

      .from('siswa')

      .select('kelas')

      .eq('school_id', schoolId)

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

        catatan_kejadian:
          item.catatan_kejadian || '',

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
      <th>Catatan Kejadian</th>
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

        <td>

          ${new Date(item.tanggal)
            .toLocaleDateString(
              'id-ID',
              {
                day:'2-digit',
                month:'short',
                year:'2-digit'
              }
            )}

        </td>

        <td>${item.kelas}</td>

        <td>${item.mapel}</td>

        <td>${item.materi}</td>
        <td>
        ${item.catatan_kejadian || '-'}
        </td>
        <td>

  ${
    item.tidakHadir.length

      ? `<button
           class="lihat-absen-btn"
           onclick='lihatTidakHadir(
             ${JSON.stringify(
               item.tidakHadir
             )}
           )'
         >
           ${item.tidakHadir.length}
           siswa
         </button>`

      : '-'
  }

</td>

        <td>

  <div class="aksi-jurnal">

    <button
      class="edit-btn"
      title="Edit"
      onclick="editJurnal('${item.id}')"
    >

      ✏️

    </button>

    <button
      class="delete-btn"
      title="Hapus"
      onclick='hapusJurnal(
        "${item.tanggal}",
        "${item.kelas}",
        "${item.mapel}",
        ${JSON.stringify(item.materi)}
      )'
    >

      🗑️

    </button>

  </div>

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
  
    document.getElementById(
    'catatan-kejadian'
    ).value =
      data.catatan_kejadian || ''

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

      'Catatan Kejadian':
        item.catatan_kejadian || '-',

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