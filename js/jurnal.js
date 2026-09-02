import { supabaseClient } from './supabase.js'
import {
  resetForm,
  clearElement
} from './utils.js'

// Track status perubahan data yang belum disimpan
let isFormDirty = false

// Registrasi fungsi proteksi ke window agar bisa diakses saat pindah tab di dashboard.html
window.checkUnsavedNilai = function() {
  if (isFormDirty) {
    return confirm("Ada nilai yang belum kamu simpan! Yakin ingin pindah tab?")
  }
  return true
}

// Proteksi tambahan saat user reload halaman atau tutup browser/tab
window.addEventListener('beforeunload', (e) => {
  if (isFormDirty) {
    e.preventDefault()
    e.returnValue = ''
  }
})

// =======================
// GET SCHOOL ID
// =======================
async function getSchoolId() {
  const { data: { user } } = await supabaseClient.auth.getUser()
  if (!user) return null

  const { data: profile, error } = await supabaseClient
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

const kelasSelect = document.getElementById('kelas-nilai')
const mapelSelect = document.getElementById('mapel-nilai')
const jenisSelect = document.getElementById('jenis-nilai')
const siswaContainer = document.getElementById('list-siswa-nilai')
const saveBtn = document.getElementById('saveNilaiBtn')

let siswaData = []

// Helper: Cek apakah nilai valid (bukan null, undefined, atau string kosong)
function isValidNilai(val) {
  return val !== null && val !== undefined && val !== '' && !isNaN(val)
}

// Helper: Memproses input form agar jika kosong disimpan NULL, bukan 0
function parseNilaiInput(val) {
  if (val === null || val === undefined || String(val).trim() === '') {
    return null
  }
  return Number(val)
}

async function loadMapel() {
  const schoolId = await getSchoolId()
  const { data, error } = await supabaseClient
    .from('mata_pelajaran')
    .select('*')
    .eq('school_id', schoolId)

  if (error) {
    console.error(error)
    return
  }

  mapelSelect.innerHTML = ''
  mapelSelect.appendChild(new Option('Pilih Mata Pelajaran', ''))

  data.forEach(item => {
    mapelSelect.appendChild(
      new Option(item.nama_mapel, item.nama_mapel)
    )
  })
}

async function loadKelas() {
  const schoolId = await getSchoolId()
  const { data, error } = await supabaseClient
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
  kelasSelect.appendChild(new Option('Pilih Kelas', ''))

  kelasUnik.forEach(kelas => {
    kelasSelect.appendChild(new Option(kelas, kelas))
  })
}

async function loadSiswaDanNilai() {
  const schoolId = await getSchoolId()
  const { data: { user } } = await supabaseClient.auth.getUser()

  if (!kelasSelect.value || !mapelSelect.value || !jenisSelect.value) return

  // Reset status form dirty jika ganti filter kelas/mapel/jenis
  isFormDirty = false

  // Ambil daftar siswa A-Z
  const { data: siswa, error: siswaError } = await supabaseClient
    .from('siswa')
    .select('*')
    .eq('kelas', kelasSelect.value)
    .eq('school_id', schoolId)
    .order('nama_siswa', { ascending: true })

  if (siswaError) {
    console.error(siswaError)
    return
  }

  siswaData = siswa

  const { data: nilaiExisting, error: nilaiError } = await supabaseClient
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
    const existing = nilaiExisting.find(n => n.siswa === item.nama_siswa)
    const oldValue = existing?.[jenisSelect.value]

    const displayValue = isValidNilai(oldValue) ? oldValue : ''

    siswaContainer.innerHTML += `
      <div class="nilai-row">
        <span>${item.nama_siswa}</span>
        <input
          type="number"
          id="nilai-${index}"
          class="input-nilai-item"
          value="${displayValue}"
          placeholder="Nilai (kosongkan jika tidak ada)"
        >
      </div>
    `
  })

  // Pasang pendeteksi: Begitu user mulai ngetik/ngubah nilai, set isFormDirty = true
  document.querySelectorAll('.input-nilai-item').forEach(input => {
    input.addEventListener('input', () => {
      isFormDirty = true
    })
  })
}

kelasSelect.addEventListener('change', loadSiswaDanNilai)
mapelSelect.addEventListener('change', loadSiswaDanNilai)
jenisSelect.addEventListener('change', loadSiswaDanNilai)

saveBtn.addEventListener('click', async () => {
  const { data: { user } } = await supabaseClient.auth.getUser()

  if (!kelasSelect.value || !mapelSelect.value || !jenisSelect.value) {
    alert('Lengkapi data terlebih dahulu')
    return
  }

  saveBtn.disabled = true
  saveBtn.innerHTML = 'Menyimpan...'

  const payload = []

  for (const [index, item] of siswaData.entries()) {
    const rawInputValue = document.getElementById(`nilai-${index}`)?.value
    const nilaiInput = parseNilaiInput(rawInputValue)

    const { data: existing } = await supabaseClient
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

      s1: existing?.s1 ?? null,
      s2: existing?.s2 ?? null,
      s3: existing?.s3 ?? null,
      s4: existing?.s4 ?? null,

      f1: existing?.f1 ?? null,
      f2: existing?.f2 ?? null,
      f3: existing?.f3 ?? null,
      f4: existing?.f4 ?? null,

      asts: existing?.asts ?? null,
      asas: existing?.asas ?? null,

      [jenisSelect.value]: nilaiInput
    }

    const semuaNilaiDiisi = [
      merged.s1, merged.s2, merged.s3, merged.s4,
      merged.f1, merged.f2, merged.f3, merged.f4,
      merged.asts, merged.asas
    ].filter(isValidNilai).map(Number)

    if (semuaNilaiDiisi.length > 0) {
      const total = semuaNilaiDiisi.reduce((a, b) => a + b, 0)
      merged.nilai_akhir = Number((total / semuaNilaiDiisi.length).toFixed(2))
    } else {
      merged.nilai_akhir = null
    }

    payload.push(merged)
  }

  const { error } = await supabaseClient
    .from('nilai')
    .upsert(payload, {
      onConflict: 'user_id,siswa,kelas,mapel'
    })

  saveBtn.disabled = false
  saveBtn.innerHTML = 'Simpan Nilai'

  if (error) {
    console.error(error)
    alert(error.message)
    return
  }

  // Reset status dirty setelah berhasil disimpan
  isFormDirty = false

  alert('Nilai berhasil disimpan!')

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