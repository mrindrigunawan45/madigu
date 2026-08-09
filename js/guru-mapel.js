import { supabase } from './config.js'
import { loadCurrentUser, getCurrentUser } from './session.js'

// =====================
// ELEMENT DOM
// =====================
const menuBtn = document.getElementById('menuBtn')
const sidebar = document.getElementById('sidebar')
const overlay = document.getElementById('overlay')
const namaGuru = document.getElementById('namaGuru')
const sekolahInfo = document.getElementById('sekolahInfo')
const mapelInfo = document.getElementById('mapelInfo')
const semesterAktifInfo = document.getElementById('semesterAktifInfo')
const tahunAjaranInfo = document.getElementById('tahunAjaranInfo')

const jurnalKelas = document.getElementById('jurnalKelas')
const nilaiKelas = document.getElementById('nilaiKelas')
const containerAbsensi = document.getElementById('containerAbsensi')
const siswaList = document.getElementById('siswaList')
const tbodyInputNilai = document.getElementById('tbodyInputNilai')

let currentUser = null
let currentClass = null
let dataAbsensi = {}

// =====================
// HELPER NAMA INITIAL
// =====================
function getInitial(nama) {
  if (!nama) return 'S'
  const words = nama.trim().split(' ')
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return words[0].substring(0, 2).toUpperCase()
}

// =====================
// MOBILE SIDEBAR
// =====================
menuBtn?.addEventListener('click', () => {
  sidebar?.classList.add('show')
  overlay?.classList.add('show')
})

overlay?.addEventListener('click', () => {
  sidebar?.classList.remove('show')
  overlay?.classList.remove('show')
})

// =====================
// NAVIGATION TAB
// =====================
function initNavigation() {
  const menus = document.querySelectorAll('.sidebar-menu a[data-tab]')

  menus.forEach(menu => {
    menu.addEventListener('click', e => {
      e.preventDefault()

      menus.forEach(item => item.classList.remove('active'))
      menu.classList.add('active')

      document.querySelectorAll('.tab-section').forEach(page => page.classList.add('hidden'))

      const targetTab = document.getElementById(menu.dataset.tab)
      if (targetTab) {
        targetTab.classList.remove('hidden')
      }

      sidebar?.classList.remove('show')
      overlay?.classList.remove('show')
    })
  })
}

// =====================
// SUB-TAB TOGGLE (ENTRY VS LEDGER)
// =====================
function initSubTabNilai() {
  const subtabBtns = document.querySelectorAll('.btn-subtab')
  const groupJenisPenilaian = document.getElementById('groupJenisPenilaian')

  subtabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      subtabBtns.forEach(b => {
        b.style.background = 'white'
        b.style.color = '#0d8a73'
        b.classList.remove('active')
      })
      btn.style.background = '#0d8a73'
      btn.style.color = 'white'
      btn.classList.add('active')

      const targetId = btn.dataset.subtab
      document.querySelectorAll('.subtab-content').forEach(content => {
        content.classList.add('hidden')
      })
      document.getElementById(targetId)?.classList.remove('hidden')

      if (targetId === 'subtab-ledger') {
        groupJenisPenilaian?.classList.add('hidden')
        const currentClassId = nilaiKelas?.value
        loadLedgerNilai(currentClassId)
      } else {
        groupJenisPenilaian?.classList.remove('hidden')
      }
    })
  })
}

// =====================
// LOAD DROPDOWN KELAS
// =====================
async function loadKelasOptions(schoolId) {
  try {
    const { data: listKelas, error } = await supabase
      .from('kelas')
      .select('id, nama_kelas')
      .eq('school_id', schoolId)
      .order('nama_kelas', { ascending: true })

    if (error) {
      console.error('Error fetching kelas:', error.message)
      return
    }

    if (listKelas && listKelas.length > 0) {
      let optionsHTML = '<option value="">Pilih Kelas...</option>'
      listKelas.forEach(item => {
        optionsHTML += `<option value="${item.id}">Kelas ${item.nama_kelas}</option>`
      })

      if (jurnalKelas) jurnalKelas.innerHTML = optionsHTML
      if (nilaiKelas) nilaiKelas.innerHTML = optionsHTML
    } else {
      const emptyHTML = '<option value="">Tidak ada kelas tersedia</option>'
      if (jurnalKelas) jurnalKelas.innerHTML = emptyHTML
      if (nilaiKelas) nilaiKelas.innerHTML = emptyHTML
    }
  } catch (err) {
    console.error('Error loadKelasOptions:', err)
  }
}

// =====================
// LOAD SISWA ABSENSI
// =====================
async function loadSiswaByKelas(classId) {
  if (!classId) {
    containerAbsensi?.classList.add('hidden')
    if (siswaList) siswaList.innerHTML = ''
    return
  }

  try {
    const { data: siswa, error } = await supabase
      .from('siswa')
      .select('id, nama_siswa')
      .eq('class_id', classId)
      .order('nama_siswa', { ascending: true })

    if (error) return console.error('Error fetching siswa:', error.message)

    if (siswa && siswa.length > 0) {
      containerAbsensi?.classList.remove('hidden')
      siswaList.innerHTML = ''
      dataAbsensi = {} 

      siswa.forEach(item => {
        dataAbsensi[item.id] = 'Hadir'

        const card = document.createElement('div')
        card.className = 'siswa-card'
        card.innerHTML = `
          <div class="siswa-info">
            <div class="avatar-initial">${getInitial(item.nama_siswa)}</div>
            <div class="siswa-nama">${item.nama_siswa}</div>
          </div>
          <div class="status-group" data-siswa-id="${item.id}">
            <button type="button" class="btn-status active" data-status="Hadir">
              <span class="icon">H</span><span class="label">Hadir</span>
            </button>
            <button type="button" class="btn-status" data-status="Sakit">
              <span class="icon">S</span><span class="label">Sakit</span>
            </button>
            <button type="button" class="btn-status" data-status="Izin">
              <span class="icon">I</span><span class="label">Izin</span>
            </button>
            <button type="button" class="btn-status" data-status="Alpa">
              <span class="icon">A</span><span class="label">Alpa</span>
            </button>
          </div>
        `
        siswaList.appendChild(card)
      })

      attachStatusEvents()
    } else {
      containerAbsensi?.classList.remove('hidden')
      siswaList.innerHTML = '<p style="color: #6b7280; text-align: center; padding: 12px;">Tidak ada data siswa di kelas ini.</p>'
    }
  } catch (err) {
    console.error('Error loadSiswaByKelas:', err)
  }
}

// =====================
// LOAD SISWA INPUT NILAI
// =====================
async function loadSiswaNilai(classId) {
  if (!tbodyInputNilai) return

  if (!classId) {
    tbodyInputNilai.innerHTML = '<tr><td colspan="3" style="text-align:center;">Pilih kelas untuk menampilkan siswa.</td></tr>'
    return
  }

  try {
    const { data: siswa, error } = await supabase
      .from('siswa')
      .select('id, nama_siswa')
      .eq('class_id', classId)
      .order('nama_siswa', { ascending: true })

    if (error) return console.error('Error fetching siswa nilai:', error.message)

    if (siswa && siswa.length > 0) {
      let rowsHTML = ''
      siswa.forEach((item, index) => {
        rowsHTML += `
          <tr>
            <td style="text-align: center; font-weight: 600;">${index + 1}</td>
            <td style="font-weight: 600; color: #1f2937;">${item.nama_siswa}</td>
            <td>
              <input type="number" 
                     class="form-control input-nilai-siswa" 
                     data-siswa-id="${item.id}" 
                     min="0" 
                     max="100" 
                     placeholder="0 - 100" 
                     style="width: 100%; text-align: center;">
            </td>
          </tr>
        `
      })
      tbodyInputNilai.innerHTML = rowsHTML
    } else {
      tbodyInputNilai.innerHTML = '<tr><td colspan="3" style="text-align:center;">Tidak ada data siswa di kelas ini.</td></tr>'
    }
  } catch (err) {
    console.error('Error loadSiswaNilai:', err)
  }
}

// =====================
// LOAD LEDGER NILAI SISWA
// =====================
async function loadLedgerNilai(classId) {
  const tbodyLedger = document.getElementById('tbodyLedger')
  if (!tbodyLedger) return

  if (!classId) {
    tbodyLedger.innerHTML = '<tr><td colspan="11" style="text-align:center;">Pilih kelas untuk menampilkan ledger nilai.</td></tr>'
    return
  }

  try {
    const { data: listSiswa, error: errSiswa } = await supabase
      .from('siswa')
      .select('id, nama_siswa')
      .eq('class_id', classId)
      .order('nama_siswa', { ascending: true })

    if (errSiswa) throw errSiswa

    if (!listSiswa || listSiswa.length === 0) {
      tbodyLedger.innerHTML = '<tr><td colspan="11" style="text-align:center;">Tidak ada data siswa di kelas ini.</td></tr>'
      return
    }

    const siswaIds = listSiswa.map(s => s.id)

    const { data: listNilai, error: errNilai } = await supabase
      .from('nilai')
      .select('siswa_id, jenis_penilaian, nilai')
      .in('siswa_id', siswaIds)

    if (errNilai) console.error('Error fetching nilai:', errNilai.message)

    const mapNilai = {}
    if (listNilai) {
      listNilai.forEach(item => {
        if (!mapNilai[item.siswa_id]) mapNilai[item.siswa_id] = {}
        mapNilai[item.siswa_id][item.jenis_penilaian] = item.nilai
      })
    }

    const jenisList = ['TP1', 'TP2', 'TP3', 'TP4', 'TP5', 'TP6', 'STS', 'SAS']
    let rowsHTML = ''

    listSiswa.forEach((siswa, index) => {
      const nilaiSiswa = mapNilai[siswa.id] || {}
      let totalNilai = 0
      let countNilai = 0
      let cellsHTML = ''

      jenisList.forEach(jenis => {
        const val = nilaiSiswa[jenis] !== undefined && nilaiSiswa[jenis] !== null ? nilaiSiswa[jenis] : '-'
        if (val !== '-') {
          totalNilai += Number(val)
          countNilai++
        }
        cellsHTML += `<td style="text-align: center;">${val}</td>`
      })

      const rataRata = countNilai > 0 ? (totalNilai / countNilai).toFixed(1) : '-'

      rowsHTML += `
        <tr>
          <td style="text-align: center; font-weight: 600;">${index + 1}</td>
          <td style="font-weight: 600; color: #1f2937;">${siswa.nama_siswa}</td>
          ${cellsHTML}
          <td style="text-align: center; font-weight: 700; background-color: #f0fdf4; color: #166534;">${rataRata}</td>
        </tr>
      `
    })

    tbodyLedger.innerHTML = rowsHTML

  } catch (err) {
    console.error('Error loadLedgerNilai:', err)
    tbodyLedger.innerHTML = '<tr><td colspan="11" style="text-align:center; color:red;">Gagal memuat ledger nilai.</td></tr>'
  }
}

// =====================
// EVENT STATUS ABSENSI
// =====================
function attachStatusEvents() {
  document.querySelectorAll('.status-group').forEach(group => {
    const siswaId = group.dataset.siswaId
    const buttons = group.querySelectorAll('.btn-status')

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        dataAbsensi[siswaId] = btn.dataset.status
      })
    })
  })
}

// =====================
// EVENT LISTENERS DROPDOWN KELAS
// =====================
jurnalKelas?.addEventListener('change', (e) => {
  loadSiswaByKelas(e.target.value)
})

nilaiKelas?.addEventListener('change', (e) => {
  const selectedClassId = e.target.value
  loadSiswaNilai(selectedClassId)

  const activeSubtab = document.querySelector('.btn-subtab.active')?.dataset.subtab
  if (activeSubtab === 'subtab-ledger') {
    loadLedgerNilai(selectedClassId)
  }
})

// =====================
// EXPORT EXCEL HANDLER
// =====================
document.getElementById('btnExportJurnal')?.addEventListener('click', () => {
  const table = document.querySelector('#tab-jurnal table')
  if (!table) return alert('Tabel Jurnal tidak ditemukan!')

  const classSelect = document.getElementById('jurnalKelas')
  const namaKelas = classSelect?.options[classSelect.selectedIndex]?.text || 'Semua_Kelas'

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.table_to_sheet(table)

  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 15 }, // Tanggal
    { wch: 12 }, // Kelas
    { wch: 10 }, // Jam
    { wch: 35 }, // Materi
    { wch: 30 }  // Catatan
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Jurnal Mengajar')
  XLSX.writeFile(wb, `Jurnal_Mengajar_${namaKelas.replace(/\s+/g, '_')}.xlsx`)
})

document.getElementById('btnExportLedger')?.addEventListener('click', () => {
  const tbody = document.getElementById('tbodyLedger')
  const classSelect = document.getElementById('nilaiKelas')
  const namaKelas = classSelect?.options[classSelect.selectedIndex]?.text || ''

  if (!classSelect?.value || tbody?.children[0]?.children.length <= 1) {
    return alert('Pilih kelas dan pastikan data ledger sudah tampil sebelum ekspor!')
  }

  const excelData = []
  excelData.push(['REKAP LEDGER NILAI SISWA'])
  excelData.push([`Kelas: ${namaKelas}`])
  excelData.push([]) 

  excelData.push(['No', 'Nama Siswa', 'TP1', 'TP2', 'TP3', 'TP4', 'TP5', 'TP6', 'STS', 'SAS', 'Rata-Rata'])

  const rows = tbody.querySelectorAll('tr')
  rows.forEach(row => {
    const cols = row.querySelectorAll('td')
    if (cols.length >= 11) {
      const rowData = Array.from(cols).map(col => {
        const text = col.innerText.trim()
        return isNaN(text) || text === '-' ? text : Number(text)
      })
      excelData.push(rowData)
    }
  })

  const ws = XLSX.utils.aoa_to_sheet(excelData)

  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 30 }, // Nama Siswa
    { wch: 8 },  // TP1
    { wch: 8 },  // TP2
    { wch: 8 },  // TP3
    { wch: 8 },  // TP4
    { wch: 8 },  // TP5
    { wch: 8 },  // TP6
    { wch: 8 },  // STS
    { wch: 8 },  // SAS
    { wch: 12 }  // Rata-Rata
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Ledger Nilai')
  XLSX.writeFile(wb, `Ledger_Nilai_${namaKelas.replace(/\s+/g, '_')}.xlsx`)
})

// =====================
// DASHBOARD & INIT
// =====================
async function loadDashboard() {
  try {
    const schoolId = currentUser?.profile?.school_id || 'SDNCIS01'
    const mapelId = currentUser?.profile?.mapel_id || 31 

    const { data: mapelData } = await supabase
      .from('mata_pelajaran')
      .select('nama_mapel')
      .eq('id', mapelId)
      .eq('school_id', schoolId)
      .single()

    if (mapelData && mapelInfo) mapelInfo.textContent = `Mata Pelajaran: ${mapelData.nama_mapel}`

    const { data: semester } = await supabase
      .from('semester')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .limit(1)

    if (semester && semester.length > 0) {
      if (semesterAktifInfo) semesterAktifInfo.textContent = semester[0].nama_semester
      if (tahunAjaranInfo) tahunAjaranInfo.textContent = `Tahun Ajaran ${semester[0].tahun_ajaran}`
    }

    await loadKelasOptions(schoolId)
  } catch (err) {
    console.error('Dashboard Load Error:', err)
  }
}

document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
  e.preventDefault()
  await supabase.auth.signOut()
  location.href = 'index.html'
})

async function initDashboard() {
  try {
    await loadCurrentUser()
    currentUser = getCurrentUser()

    if (!currentUser) return (location.href = 'index.html')

    if (namaGuru && currentUser.profile?.name) namaGuru.textContent = currentUser.profile.name
    if (sekolahInfo && currentUser.profile?.sekolah) sekolahInfo.textContent = currentUser.profile.sekolah

    await loadDashboard()
  } catch (err) {
    console.error('Init Dashboard Error:', err)
  }
}

// Exec
initNavigation()
initSubTabNilai()
initDashboard()