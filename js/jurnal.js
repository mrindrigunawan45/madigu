import { supabaseClient } from './supabase.js'
import { resetForm, clearElement } from './utils.js'

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

const tanggalInput = document.getElementById('tanggal')
const mapelSelect = document.getElementById('mapel-jurnal')
const kelasSelect = document.getElementById('kelas-jurnal')
const materiInput = document.getElementById('materi')
const catatanKejadianInput = document.getElementById('catatan-kejadian')
const siswaContainer = document.getElementById('list-siswa-jurnal')
const saveBtn = document.getElementById('saveJurnalBtn')

let siswaData = []

// Set Default Tanggal Hari Ini
if (tanggalInput && !tanggalInput.value) {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  tanggalInput.value = `${year}-${month}-${day}`
}

export async function loadMapelJurnal() {
  if (!mapelSelect) return
  const schoolId = await getSchoolId()
  if (!schoolId) return

  const { data, error } = await supabaseClient
    .from('mata_pelajaran')
    .select('*')
    .eq('school_id', schoolId)

  if (error) {
    console.error('Error load mapel jurnal:', error)
    return
  }

  mapelSelect.innerHTML = ''
  mapelSelect.appendChild(new Option('Pilih Mata Pelajaran', ''))

  data.forEach(item => {
    mapelSelect.appendChild(new Option(item.nama_mapel, item.nama_mapel))
  })
}

export async function loadKelasJurnal() {
  if (!kelasSelect) return
  const schoolId = await getSchoolId()
  if (!schoolId) return

  const { data, error } = await supabaseClient
    .from('siswa')
    .select('kelas')
    .eq('school_id', schoolId)

  if (error) {
    console.error('Error load kelas jurnal:', error)
    return
  }

  const kelasUnik = [
    ...new Set(data.map(item => item.kelas).filter(Boolean))
  ].sort()

  kelasSelect.innerHTML = ''
  kelasSelect.appendChild(new Option('Pilih Kelas', ''))

  kelasUnik.forEach(kelas => {
    kelasSelect.appendChild(new Option(kelas, kelas))
  })
}

async function loadSiswaJurnal() {
  if (!kelasSelect || !siswaContainer) return
  const kelas = kelasSelect.value
  if (!kelas) {
    siswaContainer.innerHTML = ''
    return
  }

  const schoolId = await getSchoolId()
  const { data: siswa, error } = await supabaseClient
    .from('siswa')
    .select('*')
    .eq('kelas', kelas)
    .eq('school_id', schoolId)
    .order('nama_siswa', { ascending: true })

  if (error) {
    console.error(error)
    return
  }

  siswaData = siswa
  siswaContainer.innerHTML = ''

  if (siswa.length === 0) {
    siswaContainer.innerHTML = '<p style="color: #64748b; font-size: 14px;">Tidak ada siswa di kelas ini.</p>'
    return
  }

  let html = `
    <div style="margin-top: 16px; margin-bottom: 12px;">
      <h4 style="margin: 0 0 8px 0; font-size: 15px; color: #1e293b;">Presensi Siswa</h4>
    </div>
  `

  siswa.forEach((item, index) => {
    html += `
      <div class="siswa-row" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
        <span style="font-weight: 500; font-size: 14px; color: #334155;">${index + 1}. ${item.nama_siswa}</span>
        <div style="display: flex; gap: 12px;">
          <label style="cursor: pointer; font-size: 13px;"><input type="radio" name="absen-${index}" value="H" checked> H</label>
          <label style="cursor: pointer; font-size: 13px;"><input type="radio" name="absen-${index}" value="S"> S</label>
          <label style="cursor: pointer; font-size: 13px;"><input type="radio" name="absen-${index}" value="I"> I</label>
          <label style="cursor: pointer; font-size: 13px;"><input type="radio" name="absen-${index}" value="A"> A</label>
        </div>
      </div>
    `
  })

  siswaContainer.innerHTML = html
}

if (kelasSelect) {
  kelasSelect.addEventListener('change', loadSiswaJurnal)
}

if (saveBtn) {
  saveBtn.addEventListener('click', async () => {
    const { data: { user } } = await supabaseClient.auth.getUser()

    if (!tanggalInput.value || !mapelSelect.value || !kelasSelect.value || !materiInput.value) {
      alert('Mohon lengkapi tanggal, mata pelajaran, kelas, dan materi pembelajaran!')
      return
    }

    if (siswaData.length === 0) {
      alert('Siswa belum dimuat / kelas belum dipilih!')
      return
    }

    saveBtn.disabled = true
    saveBtn.innerHTML = 'Menyimpan...'

    const presensiList = []
    siswaData.forEach((item, index) => {
      const statusSelected = document.querySelector(`input[name="absen-${index}"]:checked`)?.value || 'H'
      presensiList.push({
        nama_siswa: item.nama_siswa,
        status: statusSelected
      })
    })

    const schoolId = await getSchoolId()

    const payload = {
      user_id: user.id,
      school_id: schoolId,
      tanggal: tanggalInput.value,
      mapel: mapelSelect.value,
      kelas: kelasSelect.value,
      materi: materiInput.value,
      catatan: catatanKejadianInput ? catatanKejadianInput.value : '',
      presensi: presensiList
    }

    const { error } = await supabaseClient
      .from('jurnal')
      .insert([payload])

    saveBtn.disabled = false
    saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk" style="margin-right: 6px;"></i> Simpan Jurnal'

    if (error) {
      console.error(error)
      alert('Gagal menyimpan jurnal: ' + error.message)
      return
    }

    alert('Jurnal berhasil disimpan!')

    resetForm(['mapel-jurnal', 'kelas-jurnal', 'materi', 'catatan-kejadian'])
    clearElement('list-siswa-jurnal')
    siswaData = []
  })
}

// Inisialisasi awal saat script dimuat
loadMapelJurnal()
loadKelasJurnal()

// Expose ke Window agar dashboard.html bisa memanggil ulang jika perlu
window.loadJurnalDropdowns = function () {
  loadMapelJurnal()
  loadKelasJurnal()
}