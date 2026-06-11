import { supabaseClient } from './supabase.js'

import {
  resetForm,
  clearElement
} from './utils.js'

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
        .filter(Boolean)

    )

  ].sort()

  kelasSelect.innerHTML = ''

  kelasSelect.appendChild(
    new Option('Pilih Kelas', '')
  )

  kelasUnik.forEach(kelas => {

    kelasSelect.appendChild(
      new Option(kelas, kelas)
    )

  })

}

async function loadSiswaDanNilai() {

  const schoolId =
    await getSchoolId()

  const {
    data: { user }
  } = await supabaseClient.auth.getUser()

  if (
    !kelasSelect.value ||
    !mapelSelect.value ||
    !jenisSelect.value
  ) return

  const { data: siswa, error: siswaError } =
    await supabaseClient

    .from('siswa')
    .select('*')
    .eq('kelas', kelasSelect.value)
    .eq('school_id', schoolId)

  if (siswaError) {

    console.error(siswaError)

    return

  }

  siswaData = siswa

  const { data: nilaiExisting, error: nilaiError } =
    await supabaseClient

      .from('nilai')

      .select('*')

      .eq('user_id', user.id)

      .eq('kelas', kelasSelect.value)

      .eq('mapel', mapelSelect.value)

  if (nilaiError) {

    console.error(nilaiError)

    return

  }

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

  if (
    !kelasSelect.value ||
    !mapelSelect.value ||
    !jenisSelect.value
  ) {

    alert('Lengkapi data terlebih dahulu')

    return

  }

  saveBtn.disabled = true

  saveBtn.innerHTML =
    'Menyimpan...'

  const payload = []

  for (const [index, item] of siswaData.entries()) {

    const nilaiInput = Number(

      document.getElementById(
        `nilai-${index}`
      ).value

    )

    const { data: existing } =
      await supabaseClient

        .from('nilai')

        .select('*')

        .eq('user_id', user.id)

        .eq('siswa', item.nama_siswa)

        .eq('kelas', kelasSelect.value)

        .eq('mapel', mapelSelect.value)

        .maybeSingle()

    const merged = {

      user_id: user.id,

      siswa: item.nama_siswa,

      kelas: kelasSelect.value,

      mapel: mapelSelect.value,

      s1: existing?.s1 || null,
      s2: existing?.s2 || null,
      s3: existing?.s3 || null,
      s4: existing?.s4 || null,

      f1: existing?.f1 || null,
      f2: existing?.f2 || null,
      f3: existing?.f3 || null,
      f4: existing?.f4 || null,

      asts: existing?.asts || null,
      asas: existing?.asas || null,

      [jenisSelect.value]: nilaiInput

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

    payload.push(merged)

  }

  const { error } = await supabaseClient

    .from('nilai')

    .upsert(payload, {

      onConflict:
        'user_id,siswa,kelas,mapel'

    })

  saveBtn.disabled = false

  saveBtn.innerHTML =
    'Simpan Nilai'

  if (error) {

    console.error(error)

    alert(error.message)

    return

  }

  alert('Nilai berhasil disimpan')

resetForm([
  'mapel-nilai',
  'jenis-nilai',
  'kelas-nilai'
])

clearElement('list-siswa-nilai')

siswaData = []

})

loadMapel()

loadKelas()