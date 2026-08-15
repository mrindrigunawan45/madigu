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

const tanggal = document.getElementById('tanggal')
const kelasSelect = document.getElementById('kelas-jurnal')
const mapelSelect = document.getElementById('mapel-jurnal')
const siswaContainer = document.getElementById('list-siswa-jurnal')
const saveBtn = document.getElementById('saveJurnalBtn')

let siswaData = []

// =======================
// DEFAULT TANGGAL (WAKTU LOKAL)
// =======================
// Fungsi Helper Tanggal Lokal
function setDefaultTanggal() {
  if (!tanggal) return
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  tanggal.value = `${year}-${month}-${day}`
}

// =======================
// LOAD MAPEL
// =======================
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
    mapelSelect.appendChild(new Option(item.nama_mapel, item.nama_mapel))
  })
}

// =======================
// LOAD KELAS
// =======================
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

// =======================
// SAAT KELAS DIPILIH
// =======================
kelasSelect?.addEventListener('change', async () => {
  const kelas = kelasSelect.value
  if (!kelas) {
    siswaContainer.innerHTML = ''
    return
  }

  const schoolId = await getSchoolId()

  const { data, error } = await supabaseClient
    .from('siswa')
    .select('*')
    .eq('kelas', kelas)
    .eq('school_id', schoolId)
    .order('nama_siswa', { ascending: true })

  if (error) {
    console.error(error)
    return
  }

  siswaData = data
  siswaContainer.innerHTML = ''

  data.forEach((item, index) => {
    const namaSiswa = item.nama_siswa || item.nama || 'Siswa'
    const initials = namaSiswa.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

    siswaContainer.innerHTML += `
      <div class="siswa-card">
        <div class="siswa-info">
          <div class="siswa-avatar">
            ${initials}
          </div>
          <div class="siswa-name">
            <h4>${namaSiswa}</h4>
          </div>
        </div>

        <div class="absen-options">
          <label class="absen-btn status-h">
            <input type="radio" name="absen-${index}" value="H" checked>
            <span class="btn-content">
              <strong>H</strong>
              <small>Hadir</small>
            </span>
          </label>

          <label class="absen-btn status-s">
            <input type="radio" name="absen-${index}" value="S">
            <span class="btn-content">
              <strong>S</strong>
              <small>Sakit</small>
            </span>
          </label>

          <label class="absen-btn status-i">
            <input type="radio" name="absen-${index}" value="I">
            <span class="btn-content">
              <strong>I</strong>
              <small>Izin</small>
            </span>
          </label>

          <label class="absen-btn status-a">
            <input type="radio" name="absen-${index}" value="A">
            <span class="btn-content">
              <strong>A</strong>
              <small>Alpa</small>
            </span>
          </label>
        </div>
      </div>
    `
  })
})

// =======================
// SIMPAN JURNAL
// =======================
saveBtn?.addEventListener('click', async () => {
  const { data: { user } } = await supabaseClient.auth.getUser()

  if (!tanggal?.value || !kelasSelect?.value || !mapelSelect?.value) {
  alert('Lengkapi data terlebih dahulu')
  return
}

  if (siswaData.length === 0) {
    alert('Tidak ada siswa untuk disimpan')
    return
  }

  const materi = document.getElementById('materi')?.value || ''
  const catatanKejadian = document.getElementById('catatan-kejadian')?.value || ''

  const payload = siswaData.map((item, index) => {
    const radioChecked = document.querySelector(`input[name="absen-${index}"]:checked`)
    const status = radioChecked ? radioChecked.value : 'H'

    return {
      user_id: user.id,
      tanggal: tanggal.value,
      kelas: kelasSelect.value,
      mapel: mapelSelect.value,
      materi: materi,
      catatan_kejadian: catatanKejadian,
      nama: item.nama_siswa || item.nama,
      status: status
    }
  })

  saveBtn.innerText = 'Menyimpan...'
  saveBtn.disabled = true

  const result = await supabaseClient
    .from('jurnal')
    .insert(payload)

  saveBtn.innerText = 'Simpan Jurnal'
  saveBtn.disabled = false

  if (result.error) {
    console.error(result.error)
    alert('Gagal menyimpan: ' + result.error.message)
    return
  }

  alert('Jurnal berhasil disimpan')

  resetForm([
    'mapel-jurnal',
    'kelas-jurnal',
    'materi',
    'catatan-kejadian'
  ])

  clearElement('list-siswa-jurnal')

  siswaData = []
  if (tanggal) {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    
    tanggal.value = `${year}-${month}-${day}`
  }
})

// =======================
// INIT
// =======================
loadMapel()
loadKelas()