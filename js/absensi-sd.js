import { supabase } from './config.js'
import { loadCurrentUser, getCurrentUser } from './session.js'

// ======================
// ELEMENT DOM
// ======================
const absensiList = document.getElementById('absensiList')
const tanggalInput = document.getElementById('tanggalAbsensi')
const saveBtn = document.getElementById('saveAbsensiBtn')
const absensiContent = document.getElementById('absensiContent')

let siswaData = []
let isEditMode = false
let currentClass = null

// Set tanggal default ke HARI INI
if (tanggalInput) {
  const today = new Date().toISOString().split('T')[0]
  tanggalInput.value = today
}

// ======================
// LOAD SISWA
// ======================
export async function loadSiswa() {
  if (!absensiList) return

  try {
    await loadCurrentUser()
    const currentUser = getCurrentUser()

    if (!currentUser) {
      alert('Session tidak ditemukan')
      return
    }

    currentClass = currentUser.kelas
    if (!currentClass) {
      alert('Kelas guru belum diatur')
      return
    }

    // Ambil data siswa dari database berdasarkan class_id
    const { data, error } = await supabase
      .from('siswa')
      .select('*')
      .eq('class_id', currentClass.id)
      .order('nama_siswa')

    if (error) {
      console.error('Error load siswa:', error)
      return
    }

    siswaData = data || []

    if (siswaData.length === 0) {
      absensiList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <h3>Belum ada data siswa</h3>
          <p>Siswa pada kelas ini belum terdaftar.</p>
        </div>`
      if (saveBtn) saveBtn.style.display = 'none'
      return
    }

    // Tampilkan tombol simpan & konten absensi
    if (saveBtn) saveBtn.style.display = 'inline-block'
    if (absensiContent) absensiContent.style.display = 'block'

    renderSiswa()
    await loadAbsensiByTanggal()

  } catch (err) {
    console.error('Error di loadSiswa:', err)
  }
}

// ======================
// RENDER SISWA
// ======================
function renderSiswa() {
  if (!absensiList) return
  absensiList.innerHTML = ''

  siswaData.forEach((item, index) => {
    const inisial = item.nama_siswa
      ?.split(' ')
      .map(x => x[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'

    absensiList.innerHTML += `
      <div class="siswa-card status-hadir">
        <div class="siswa-info">
          <div class="siswa-avatar">${inisial}</div>
          <div class="siswa-name">
            <h4>${item.nama_siswa}</h4>
          </div>
        </div>
        <div class="absen-modern">
          <label class="absen-card hadir">
            <input type="radio" name="absen-${index}" value="Hadir" checked>
            <div class="absen-content">
              <div class="absen-icon">H</div>
              <span>Hadir</span>
            </div>
          </label>
          <label class="absen-card sakit">
            <input type="radio" name="absen-${index}" value="Sakit">
            <div class="absen-content">
              <div class="absen-icon">S</div>
              <span>Sakit</span>
            </div>
          </label>
          <label class="absen-card izin">
            <input type="radio" name="absen-${index}" value="Izin">
            <div class="absen-content">
              <div class="absen-icon">I</div>
              <span>Izin</span>
            </div>
          </label>
          <label class="absen-card alpa">
            <input type="radio" name="absen-${index}" value="Alpa">
            <div class="absen-content">
              <div class="absen-icon">A</div>
              <span>Alpa</span>
            </div>
          </label>
        </div>
      </div>`
  })
}

// Event listener ganti warna kartu saat radio button diubah
document.addEventListener('change', e => {
  if (!e.target.matches('input[type="radio"]')) return
  const card = e.target.closest('.siswa-card')
  if (!card) return

  card.classList.remove('status-hadir', 'status-sakit', 'status-izin', 'status-alpa')
  const status = e.target.value.toLowerCase()
  card.classList.add(`status-${status}`)
})

// ======================
// LOAD ABSENSI BY TANGGAL
// ======================
async function loadAbsensiByTanggal() {
  if (!tanggalInput) return
  const tanggal = tanggalInput.value

  if (siswaData.length === 0) return

  const { data, error } = await supabase
    .from('absensi')
    .select('*')
    .eq('tanggal', tanggal)
    .in('siswa_id', siswaData.map(x => x.id))

  if (error) {
    console.error('Error load absensi by tanggal:', error)
    return
  }

  if (!data || data.length === 0) {
    isEditMode = false
    if (saveBtn) saveBtn.innerHTML = 'Simpan Absensi'
    renderSiswa()
    return
  }

  isEditMode = true
  if (saveBtn) saveBtn.innerHTML = 'Update Absensi'
  renderSiswa()

  // Centang radio button sesuai data di database
  data.forEach(item => {
    const siswaIndex = siswaData.findIndex(s => s.id === item.siswa_id)
    if (siswaIndex === -1) return

    const radio = document.querySelector(
      `input[name="absen-${siswaIndex}"][value="${item.status}"]`
    )
    if (radio) radio.click()
  })
}

// ======================
// EVENT TANGGAL DIUBAH
// ======================
tanggalInput?.addEventListener('change', async () => {
  await loadAbsensiByTanggal()
})

// ======================
// SIMPAN / UPDATE ABSENSI
// ======================
saveBtn?.addEventListener('click', async () => {
  try {
    saveBtn.disabled = true
    saveBtn.innerHTML = 'Menyimpan...'

    const tanggal = tanggalInput.value

    // Buat Payload Data
    const payload = siswaData.map((item, index) => {
      const status = document.querySelector(`input[name="absen-${index}"]:checked`)?.value || 'Hadir'
      return {
        school_id: item.school_id,
        class_id: item.class_id,
        siswa_id: item.id,
        tanggal,
        status,
        keterangan: ''
      }
    })

    let error = null

    if (isEditMode) {
      // Hapus absensi lama di tanggal ini lalu masukkan yang baru
      await supabase
        .from('absensi')
        .delete()
        .eq('tanggal', tanggal)
        .in('siswa_id', siswaData.map(x => x.id))

      const result = await supabase.from('absensi').insert(payload)
      error = result.error
    } else {
      const result = await supabase.from('absensi').insert(payload)
      error = result.error
    }

    if (error) {
      console.error(error)
      alert(error.message)
      saveBtn.disabled = false
      saveBtn.innerHTML = isEditMode ? 'Update Absensi' : 'Simpan Absensi'
      return
    }

    alert('Absensi berhasil disimpan!')
    saveBtn.disabled = false
    isEditMode = true
    saveBtn.innerHTML = 'Update Absensi'

  } catch (err) {
    console.error(err)
    alert('Terjadi kesalahan saat menyimpan absensi')
    saveBtn.disabled = false
    saveBtn.innerHTML = 'Simpan Absensi'
  }
})

// Panggil Otomatis saat Script Di-load
loadSiswa()