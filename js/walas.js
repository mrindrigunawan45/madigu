import { supabaseClient } from './supabase.js'

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

// Load Kelas Khusus Wali Kelas yang Sedang Login
export async function loadKelasWalas() {
  if (!kelasWalasSelect || !siswaWalasContainer) return;

  const { data: { user } } = await supabaseClient.auth.getUser()
  if (!user) return

  // Tampilkan loading indikator
  siswaWalasContainer.innerHTML = `<p style="padding: 12px; color: #64748b; text-align: center;">Memuat data siswa...</p>`;

  // 1. Ambil class_id dari profile user
  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('class_id, school_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || !profile.class_id) {
    console.error('User bukan Walas atau tidak punya class_id', profileError)
    kelasWalasSelect.innerHTML = '<option value="">Bukan Wali Kelas</option>'
    siswaWalasContainer.innerHTML = `<p style="padding: 12px; color: #ef4444; text-align: center;">Anda belum diset sebagai Wali Kelas.</p>`;
    return
  }

  // 2. Ambil nama kelas siswa berdasarkan class_id tersebut
  const { data: siswaDataSample, error: siswaError } = await supabaseClient
    .from('siswa')
    .select('kelas')
    .eq('class_id', profile.class_id)
    .limit(1)

  if (siswaError || !siswaDataSample || siswaDataSample.length === 0) {
    console.error('Data kelas tidak ditemukan', siswaError)
    kelasWalasSelect.innerHTML = '<option value="">Kelas Tidak Ditemukan</option>'
    siswaWalasContainer.innerHTML = `<p style="padding: 12px; color: #ef4444; text-align: center;">Data kelas tidak ditemukan di database.</p>`;
    return
  }

  const namaKelas = siswaDataSample[0].kelas

  // 3. Set dropdown dan kunci
  kelasWalasSelect.innerHTML = `<option value="${namaKelas}" selected>${namaKelas}</option>`
  
  // Otomatis load daftar siswanya
  await loadSiswaByKelas(namaKelas)
}

// Helper untuk Render/Load Siswa berdasarkan Nama Kelas
async function loadSiswaByKelas(kelas) {
  if (!kelas) {
    siswaWalasContainer.innerHTML = ''
    return
  }

  const schoolId = await getSchoolId()
  
  let query = supabaseClient
    .from('siswa')
    .select('*')
    .eq('kelas', kelas)

  if (schoolId) {
    query = query.eq('school_id', schoolId)
  }

  const { data, error } = await query.order('nama_siswa', { ascending: true })

  if (error || !data || data.length === 0) {
    console.error("Gagal load siswa:", error)
    siswaWalasContainer.innerHTML = `<p style="padding: 12px; color: #ef4444; text-align: center;">Siswa tidak ditemukan untuk kelas ${kelas}.</p>`;
    return
  }

  siswaData = data
  siswaWalasContainer.innerHTML = ''

  data.forEach((item, index) => {
    const namaSiswa = item.nama_siswa || item.nama || 'Siswa'
    const initials = namaSiswa.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

    siswaWalasContainer.innerHTML += `
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
            <input type="radio" name="absen-walas-${index}" value="H" checked>
            <span class="btn-content">
              <strong>H</strong>
              <small>Hadir</small>
            </span>
          </label>

          <label class="absen-btn status-s">
            <input type="radio" name="absen-walas-${index}" value="S">
            <span class="btn-content">
              <strong>S</strong>
              <small>Sakit</small>
            </span>
          </label>

          <label class="absen-btn status-i">
            <input type="radio" name="absen-walas-${index}" value="I">
            <span class="btn-content">
              <strong>I</strong>
              <small>Izin</small>
            </span>
          </label>

          <label class="absen-btn status-a">
            <input type="radio" name="absen-walas-${index}" value="A">
            <span class="btn-content">
              <strong>A</strong>
              <small>Alpa</small>
            </span>
          </label>
        </div>
      </div>
    `
  })
}

// Event saat Kelas Dipilih Manual
kelasWalasSelect?.addEventListener('change', async () => {
  const kelas = kelasWalasSelect.value
  await loadSiswaByKelas(kelas)
})

// Simpan Data Absen Walas
saveWalasBtn?.addEventListener('click', async () => {
  const { data: { user } } = await supabaseClient.auth.getUser()

  if (!tanggalWalas.value || !kelasWalasSelect.value) {
    alert('Silahkan pilih tanggal dan kelas terlebih dahulu!')
    return
  }

  if (siswaData.length === 0) {
    alert('Tidak ada data siswa untuk disimpan!')
    return
  }

  const catatan = document.getElementById('catatan-walas')?.value || ''

  const payload = siswaData.map((item, index) => {
    const radioChecked = document.querySelector(`input[name="absen-walas-${index}"]:checked`)
    const status = radioChecked ? radioChecked.value : 'H'
    return {
      user_id: user.id,
      tanggal: tanggalWalas.value,
      kelas: kelasWalasSelect.value,
      catatan: catatan,
      nama: item.nama_siswa || item.nama,
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
  if (document.getElementById('catatan-walas')) {
    document.getElementById('catatan-walas').value = ''
  }
  loadKelasWalas()
})

// Run saat pertama load
loadKelasWalas()

// Ekspor ke window
window.loadKelasWalas = loadKelasWalas;