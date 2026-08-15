import { supabaseClient } from './supabase.js'

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

console.log('REKAP AKTIF')

const table = document.getElementById('rekap-table')
const mapelSelect = document.getElementById('rekap-mapel')
const kelasSelect = document.getElementById('rekap-kelas')

let rekapData = []

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

  mapelSelect.innerHTML = '<option value="">Pilih Mata Pelajaran</option>'
  data.forEach(item => {
    mapelSelect.innerHTML += `
      <option value="${item.nama_mapel}">
        ${item.nama_mapel}
      </option>
    `
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
        .filter(k => k && k.trim() !== '')
    )
  ]

  kelasUnik.sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  )

  kelasSelect.innerHTML = '<option value="">Pilih Kelas</option>'
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

  const { data: { user } } = await supabaseClient.auth.getUser()
  if (!user) return

  if (!kelasSelect.value || !mapelSelect.value) {
    table.innerHTML = ''
    return
  }

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

  // Sorting A-Z berdasarkan nama siswa
  rekapData = (data || []).sort((a, b) => 
    (a.siswa || '').localeCompare(b.siswa || '')
  )

  renderTable()
}

// Helper: Cek apakah nilai valid
function isValidNilai(val) {
  return val !== null && val !== undefined && val !== '' && !isNaN(val)
}

// Hitung Nilai Akhir
function hitungNilaiAkhir(item) {
  const semuaNilai = [
    item.s1, item.s2, item.s3, item.s4,
    item.f1, item.f2, item.f3, item.f4,
    item.asts, item.asas
  ]

  const nilaiDiisi = semuaNilai.filter(isValidNilai).map(Number)

  if (!nilaiDiisi.length) return '-'

  const total = nilaiDiisi.reduce((a, b) => a + b, 0)
  const nilaiAkhir = total / nilaiDiisi.length

  return nilaiAkhir.toFixed(2)
}

function renderTable() {
  table.innerHTML = `
    <tr>
      <th style="text-align: left; padding-left: 12px;">Nama</th>

      <th title="Sumatif 1">S1</th>
      <th title="Sumatif 2">S2</th>
      <th title="Sumatif 3">S3</th>
      <th title="Sumatif 4">S4</th>

      <th title="Formatif 1">F1</th>
      <th title="Formatif 2">F2</th>
      <th title="Formatif 3">F3</th>
      <th title="Formatif 4">F4</th>

      <th title="Asesmen Sumatif Tengah Semester">ASTS</th>
      <th title="Asesmen Sumatif Akhir Semester">ASAS</th>

      <th>Nilai Akhir</th>
    </tr>
  `

  if (!rekapData.length) {
    table.innerHTML += `
      <tr>
        <td colspan="12" style="text-align: center;">
          Belum ada data
        </td>
      </tr>
    `
    return
  }

  rekapData.forEach(item => {
    const nilaiAkhir = hitungNilaiAkhir(item)

    table.innerHTML += `
      <tr>
        <td style="text-align: left; padding-left: 12px;">${item.siswa || '-'}</td>

        <td>${isValidNilai(item.s1) ? item.s1 : '-'}</td>
        <td>${isValidNilai(item.s2) ? item.s2 : '-'}</td>
        <td>${isValidNilai(item.s3) ? item.s3 : '-'}</td>
        <td>${isValidNilai(item.s4) ? item.s4 : '-'}</td>

        <td>${isValidNilai(item.f1) ? item.f1 : '-'}</td>
        <td>${isValidNilai(item.f2) ? item.f2 : '-'}</td>
        <td>${isValidNilai(item.f3) ? item.f3 : '-'}</td>
        <td>${isValidNilai(item.f4) ? item.f4 : '-'}</td>

        <td>${isValidNilai(item.asts) ? item.asts : '-'}</td>
        <td>${isValidNilai(item.asas) ? item.asas : '-'}</td>

        <td style="font-weight: bold; color: #1d4ed8;">
          ${nilaiAkhir}
        </td>
      </tr>
    `
  })
}

kelasSelect.addEventListener('change', loadRekap)
mapelSelect.addEventListener('change', loadRekap)

loadMapel()
loadKelas()

// Global Window Function agar bisa dipanggil otomatis saat pindah Tab
window.refreshRekapNilai = loadRekap