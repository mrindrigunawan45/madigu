import { supabaseClient } from './supabase.js'
import { resetForm, clearElement } from './utils.js'

async function getSchoolId() {
  const { data: { user } } = await supabaseClient.auth.getUser()
  if (!user) return null

  const { data: profile, error } = await supabaseClient
    .from('profiles')
    .select('school_id')
    .eq('id', user.id)
    .single()

  if (error) return null
  return profile.school_id
}

const tanggalWalas = document.getElementById('tanggal-walas')
const kelasWalasSelect = document.getElementById('kelas-walas')
const siswaWalasContainer = document.getElementById('list-siswa-walas')
const saveWalasBtn = document.getElementById('saveWalasBtn')

let siswaData = []

// Set Tanggal Default Hari Ini
if (tanggalWalas) {
  tanggalWalas.value = new Date().toISOString().split('T')[0]
}

// Load Dropdown Kelas
async function loadKelasWalas() {
  const schoolId = await getSchoolId()
  const { data, error } = await supabaseClient
    .from('siswa')
    .select('kelas')
    .eq('school_id', schoolId)

  if (error) {
    console.error(error)
    return
  }

  const kelasUnik = [...new Set(data.map(item => item.kelas).filter(Boolean))].sort()

  kelasWalasSelect.innerHTML = '<option value="">Pilih Kelas</option>'
  kelasUnik.forEach(kelas => {
    kelasWalasSelect.appendChild(new Option(kelas, kelas))
  })
}

// Event saat Kelas Dipilih
kelasWalasSelect?.addEventListener('change', async () => {
  const kelas = kelasWalasSelect.value
  if (!kelas) {
    siswaWalasContainer.innerHTML = ''
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
  siswaWalasContainer.innerHTML = ''

  data.forEach((item, index) => {
    siswaWalasContainer.innerHTML += `
      <div class="siswa-card">
        <div class="siswa-info">
          <div class="siswa-avatar">
            ${item.nama_siswa.split(' ').map(n => n[0]).slice(0, 2).join('')}
          </div>
          <div class="siswa-name">
            <h4>${item.nama_siswa}</h4>
          </div>
        </div>

        <div class="absen-modern">
          <label class="absen-card hadir">
            <input type="radio" name="absen-walas-${index}" value="H" checked>
            <div class="absen-content">
              <div class="absen-icon">H</div>
              <span>Hadir</span>
            </div>
          </label>

          <label class="absen-card sakit">
            <input type="radio" name="absen-walas-${index}" value="S">
            <div class="absen-content">
              <div class="absen-icon">S</div>
              <span>Sakit</span>
            </div>
          </label>

          <label class="absen-card izin">
            <input type="radio" name="absen-walas-${index}" value="I">
            <div class="absen-content">
              <div class="absen-icon">I</div>
              <span>Izin</span>
            </div>
          </label>

          <label class="absen-card alpa">
            <input type="radio" name="absen-walas-${index}" value="A">
            <div class="absen-content">
              <div class="absen-icon">A</div>
              <span>Alpa</span>
            </div>
          </label>
        </div>
      </div>
    `
  })
})

// Simpan Data Absen Walas
saveWalasBtn?.addEventListener('click', async () => {
  const { data: { user } } = await supabaseClient.auth.getUser()

  if (!tanggalWalas.value || !kelasWalasSelect.value) {
    alert('Silahkan pilih tanggal dan kelas terlebih dahulu!')
    return
  }

  const catatan = document.getElementById('catatan-walas')?.value || ''

  const payload = siswaData.map((item, index) => {
    const status = document.querySelector(`input[name="absen-walas-${index}"]:checked`).value
    return {
      user_id: user.id,
      tanggal: tanggalWalas.value,
      kelas: kelasWalasSelect.value,
      catatan: catatan,
      nama: item.nama_siswa,
      nisn: item.nisn || '',
      status: status
    }
  })

  saveWalasBtn.innerText = 'Menyimpan...'
  saveWalasBtn.disabled = true

  const result = await supabaseClient
    .from('absen_walas')
    .insert(payload)

  saveWalasBtn.innerText = 'Simpan Absen Walas'
  saveWalasBtn.disabled = false

  if (result.error) {
    console.error(result.error)
    alert('Gagal menyimpan: ' + result.error.message)
    return
  }

  alert('Absensi Walas berhasil disimpan!')
  resetForm(['kelas-walas', 'catatan-walas'])
  clearElement('list-siswa-walas')
  siswaData = []
  tanggalWalas.value = new Date().toISOString().split('T')[0]
})

// Init
loadKelasWalas()