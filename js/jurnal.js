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
    console.error('Error fetching school_id:', error)
    return null
  }

  return profile.school_id
}

// Elemen DOM
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

// Helper Inisial Nama (Contoh: ABDUL HAFIZ -> AH)
function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

// =======================
// LOAD MATA PELAJARAN
// =======================
export async function loadMapelJurnal() {
  const selectElem = document.getElementById('mapel-jurnal')
  if (!selectElem) return

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

  selectElem.innerHTML = ''
  selectElem.appendChild(new Option('Pilih Mata Pelajaran', ''))

  if (data && data.length > 0) {
    data.forEach(item => {
      selectElem.appendChild(new Option(item.nama_mapel, item.nama_mapel))
    })
  }
}

// =======================
// LOAD KELAS
// =======================
export async function loadKelasJurnal() {
  const selectElem = document.getElementById('kelas-jurnal')
  if (!selectElem) return

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
    ...new Set(data.map(item => item.kelas).filter(k => k && k.trim() !== ''))
  ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  selectElem.innerHTML = ''
  selectElem.appendChild(new Option('Pilih Kelas', ''))

  kelasUnik.forEach(kelas => {
    selectElem.appendChild(new Option(kelas, kelas))
  })
}

// =======================
// LOAD DAFTAR SISWA
// =======================
async function loadSiswaJurnal() {
  const selectElem = document.getElementById('kelas-jurnal')
  const containerElem = document.getElementById('list-siswa-jurnal')

  if (!selectElem || !containerElem) return

  const kelas = selectElem.value
  if (!kelas) {
    containerElem.innerHTML = ''
    siswaData = []
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
    console.error('Error load siswa:', error)
    return
  }

  siswaData = siswa || []
  containerElem.innerHTML = ''

  if (siswaData.length === 0) {
    containerElem.innerHTML = '<p style="color: #64748b; font-size: 14px; margin-top: 12px;">Tidak ada siswa di kelas ini.</p>'
    return
  }

  let html = `<div style="display: flex; flex-direction: column; gap: 10px; margin-top: 16px;">`

  siswaData.forEach((item, index) => {
    const initials = getInitials(item.nama_siswa)

    html += `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 50%; background: #eff6ff; color: #2563eb; font-weight: 700; font-size: 14px; display: flex; align-items: center; justify-content: center; border: 1px solid #bfdbfe;">
            ${initials}
          </div>
          <span style="font-weight: 700; font-size: 14px; color: #1e293b;">${item.nama_siswa}</span>
        </div>

        <div style="display: flex; gap: 8px;" class="hsia-group">
          <label style="cursor: pointer;">
            <input type="radio" name="absen-${index}" value="H" checked style="display: none;">
            <div class="hsia-btn" data-value="H" style="width: 52px; height: 48px; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; border: 1px solid #10b981; background: #10b981; color: #ffffff; transition: all 0.2s;">
              <strong style="font-size: 14px; font-weight: 800;">H</strong>
              <span>Hadir</span>
            </div>
          </label>

          <label style="cursor: pointer;">
            <input type="radio" name="absen-${index}" value="S" style="display: none;">
            <div class="hsia-btn" data-value="S" style="width: 52px; height: 48px; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; border: 1px solid #e2e8f0; background: #ffffff; color: #475569; transition: all 0.2s;">
              <strong style="font-size: 14px; font-weight: 800;">S</strong>
              <span>Sakit</span>
            </div>
          </label>

          <label style="cursor: pointer;">
            <input type="radio" name="absen-${index}" value="I" style="display: none;">
            <div class="hsia-btn" data-value="I" style="width: 52px; height: 48px; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; border: 1px solid #e2e8f0; background: #ffffff; color: #475569; transition: all 0.2s;">
              <strong style="font-size: 14px; font-weight: 800;">I</strong>
              <span>Izin</span>
            </div>
          </label>

          <label style="cursor: pointer;">
            <input type="radio" name="absen-${index}" value="A" style="display: none;">
            <div class="hsia-btn" data-value="A" style="width: 52px; height: 48px; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; border: 1px solid #e2e8f0; background: #ffffff; color: #475569; transition: all 0.2s;">
              <strong style="font-size: 14px; font-weight: 800;">A</strong>
              <span>Alpa</span>
            </div>
          </label>
        </div>
      </div>
    `
  })

  html += `</div>`
  containerElem.innerHTML = html

  // Event listener warna tombol HSIA
  containerElem.querySelectorAll('.hsia-group').forEach(group => {
    group.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const parentGroup = e.target.closest('.hsia-group')
        parentGroup.querySelectorAll('label').forEach(lbl => {
          const inp = lbl.querySelector('input')
          const btn = lbl.querySelector('.hsia-btn')
          const val = inp.value

          if (inp.checked) {
            if (val === 'H') {
              btn.style.background = '#10b981'
              btn.style.borderColor = '#10b981'
              btn.style.color = '#ffffff'
            } else if (val === 'S') {
              btn.style.background = '#3b82f6'
              btn.style.borderColor = '#3b82f6'
              btn.style.color = '#ffffff'
            } else if (val === 'I') {
              btn.style.background = '#f59e0b'
              btn.style.borderColor = '#f59e0b'
              btn.style.color = '#ffffff'
            } else if (val === 'A') {
              btn.style.background = '#ef4444'
              btn.style.borderColor = '#ef4444'
              btn.style.color = '#ffffff'
            }
          } else {
            btn.style.background = '#ffffff'
            btn.style.borderColor = '#e2e8f0'
            btn.style.color = '#475569'
          }
        })
      })
    })
  })
}

// Event Listener Pilihan Kelas
if (kelasSelect) {
  kelasSelect.addEventListener('change', loadSiswaJurnal)
}

// Event Listener Simpan Jurnal
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

    // Data persis mengikuti kolom di tabel jurnal: [user_id, tanggal, mapel, kelas, materi, catatan_kejadian, nama, status]
    const payload = siswaData.map((item, index) => {
      const statusSelected = document.querySelector(`input[name="absen-${index}"]:checked`)?.value || 'H'
      return {
        user_id: user.id,
        tanggal: tanggalInput.value,
        mapel: mapelSelect.value,
        kelas: kelasSelect.value,
        materi: materiInput.value,
        catatan_kejadian: catatanKejadianInput ? catatanKejadianInput.value : '',
        nama: item.nama_siswa,
        status: statusSelected
      }
    })

    const { error } = await supabaseClient
      .from('jurnal')
      .insert(payload)

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

// Inisialisasi awal
async function initJurnal() {
  await loadMapelJurnal()
  await loadKelasJurnal()
}

initJurnal()

// Expose ke Window
window.loadJurnalDropdowns = function () {
  loadMapelJurnal()
  loadKelasJurnal()
}