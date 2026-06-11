import { supabaseClient } from './supabase.js'

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

  mapelSelect.innerHTML = ''

  mapelSelect.innerHTML +=
    `<option value="">Pilih Mata Pelajaran</option>`

  data.forEach(item => {

    mapelSelect.innerHTML += `

      <option value="${item.nama_mapel}">
        ${item.nama_mapel}
      </option>

    `

  })

}

async function loadKelas() {

  const schoolId =
    await getSchoolId()

  const { data, error } =
    await supabaseClient

      .from('siswa')

      .select('kelas')

      .eq('school_id', schoolId)

  if (error) {

    console.error(error)

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

  kelasSelect.innerHTML =
    '<option value="">Pilih Kelas</option>'

  kelasUnik.forEach(kelas => {

    kelasSelect.innerHTML += `

      <option value="${kelas}">
        ${kelas}
      </option>

    `

  })

}

async function loadRekap() {

  console.log('LOAD REKAP JALAN')

  const {
    data: { user }
  } = await supabaseClient.auth.getUser()

  console.log('USER LOGIN:', user)

  if (
    !kelasSelect.value ||
    !mapelSelect.value
  ) {

    table.innerHTML = ''

    return

  }

  const { data, error } = await supabaseClient

    .from('nilai')

    .select('*')

    .eq('user_id', user.id)

    .eq('kelas', kelasSelect.value)

    .eq('mapel', mapelSelect.value)

  console.log('REKAP DATA:', data)

  if (error) {

    console.error(error)

    return

  }

  rekapData = data

  renderTable()

}

function hitungRerata(arr) {

  const valid =
    arr.filter(

      n =>
        n !== null &&
        n !== '' &&
        !isNaN(n)

    )

  if (!valid.length)
    return 0

  const total =
    valid.reduce(

      (a, b) =>
        a + Number(b),

      0

    )

  return total / valid.length

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

    const rerataSumatif =
      hitungRerata([

        item.s1,
        item.s2,
        item.s3,
        item.s4

      ])

    const rerataFormatif =
      hitungRerata([

        item.f1,
        item.f2,
        item.f3,
        item.f4

      ])

    const nilaiAkhir = (

      rerataSumatif +
      rerataFormatif +
      Number(item.asts || 0) +
      Number(item.asas || 0)

    ) / 4

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

          ${nilaiAkhir.toFixed(2)}

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