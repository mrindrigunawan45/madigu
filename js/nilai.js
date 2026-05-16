import { supabaseClient } from './supabase.js'

const kelasSelect =
  document.getElementById('kelas-nilai')

const mapelSelect =
  document.getElementById('mapel-nilai')

const jenisSelect =
  document.getElementById('jenis-nilai')

const siswaContainer =
  document.getElementById('list-siswa-nilai')

const saveBtn =
  document.getElementById('saveNilaiBtn')

let siswaData = []

async function loadMapel() {

  const { data, error } = await supabaseClient

    .from('mata_pelajaran')

    .select('*')

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

async function loadSiswaDanNilai() {

  const {
    data: { user }
  } = await supabaseClient.auth.getUser()

  if (
    !kelasSelect.value ||
    !mapelSelect.value ||
    !jenisSelect.value
  ) return

  const { data: siswa } = await supabaseClient

    .from('siswa')

    .select('*')

    .eq('kelas', kelasSelect.value)

  siswaData = siswa

  const { data: nilaiExisting } = await supabaseClient

    .from('nilai')

    .select('*')

    .eq('user_id', user.id)

    .eq('kelas', kelasSelect.value)

    .eq('mapel', mapelSelect.value)

  siswaContainer.innerHTML = ''

  siswa.forEach((item, index) => {

    const existing =
      nilaiExisting.find(

        n => n.siswa === item.nama_siswa

      )

    const oldValue =
      existing?.[jenisSelect.value] || ''

    siswaContainer.innerHTML += `

      <div class="nilai-row">

        <span>${item.nama_siswa}</span>

        <input
          type="number"
          id="nilai-${index}"
          value="${oldValue}"
          placeholder="0"
        >

      </div>

    `

  })

}

kelasSelect.addEventListener(
  'change',
  loadSiswaDanNilai
)

mapelSelect.addEventListener(
  'change',
  loadSiswaDanNilai
)

jenisSelect.addEventListener(
  'change',
  loadSiswaDanNilai
)

saveBtn.addEventListener('click', async () => {

  const {
    data: { user }
  } = await supabaseClient.auth.getUser()

  const jenis = jenisSelect.value

  for (const [index, item] of siswaData.entries()) {

    const nilaiInput = Number(

      document.getElementById(
        `nilai-${index}`
      ).value

    )

    const { data: existing } = await supabaseClient

      .from('nilai')

      .select('*')

      .eq('user_id', user.id)

      .eq('siswa', item.nama_siswa)

      .eq('mapel', mapelSelect.value)

      .single()

    const merged = {

      ...existing,

      user_id: user.id,

      siswa: item.nama_siswa,

      kelas: kelasSelect.value,

      mapel: mapelSelect.value,

      [jenis]: nilaiInput

    }

    const sAvg = (

      Number(merged.s1 || 0) +
      Number(merged.s2 || 0) +
      Number(merged.s3 || 0) +
      Number(merged.s4 || 0)

    ) / 4

    const fAvg = (

      Number(merged.f1 || 0) +
      Number(merged.f2 || 0) +
      Number(merged.f3 || 0) +
      Number(merged.f4 || 0)

    ) / 4

    merged.nilai_akhir = (

      sAvg +
      fAvg +
      Number(merged.asts || 0) +
      Number(merged.asas || 0)

    ) / 4

    const { error } = await supabaseClient

      .from('nilai')

      .upsert(merged)

    if (error) {

      console.error(error)

      alert(error.message)

      return

    }

  }

  alert('Nilai berhasil disimpan')

})

loadMapel()

loadKelas()