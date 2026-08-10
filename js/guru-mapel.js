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
const jenisPenilaian = document.getElementById('jenisPenilaian')
const containerAbsensi = document.getElementById('containerAbsensi')
const siswaList = document.getElementById('siswaList')
const tbodyInputNilai = document.getElementById('tbodyInputNilai')

let currentUser = null
let dataAbsensi = {}
let currentSiswaList = []
let currentAbsenData = []

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
    menu.addEventListener('click', async e => {
      e.preventDefault()

      menus.forEach(item => item.classList.remove('active'))
      menu.classList.add('active')

      document.querySelectorAll('.tab-section').forEach(page => page.classList.add('hidden'))

      const targetTabId = menu.dataset.tab
      const targetTab = document.getElementById(targetTabId)

      if (targetTab) {
        targetTab.classList.remove('hidden')
      }

      sidebar?.classList.remove('show')
      overlay?.classList.remove('show')

      if (targetTabId === 'tab-rekap-absensi') {
        await initRekapAbsensi()
      }
    })
  })
}

// =====================
// SUB-TAB TOGGLE (RESET STATE SAAT BERPINDAH)
// =====================
function initSubTabNilai() {
  const subtabBtns = document.querySelectorAll('.btn-subtab')
  const groupJenisPenilaian = document.getElementById('groupJenisPenilaian')

  subtabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Prevent behavior bawaan agar tidak lompat / reload
      e.preventDefault()

      // Reset Style Tombol
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

      // Jika ingin me-reset tampilan dropdown ke opsi default saat pindah tab
      if (targetId === 'subtab-entry') {
        groupJenisPenilaian?.classList.remove('hidden')

        // Reset dropdown ke opsi pertama (Pilih Kelas & TP1)
        if (nilaiKelas) nilaiKelas.selectedIndex = 0
        if (jenisPenilaian) jenisPenilaian.selectedIndex = 0

        // Muat ulang tabel berdasarkan filter default
        loadSiswaNilai(nilaiKelas?.value)
      } else if (targetId === 'subtab-ledger') {
        groupJenisPenilaian?.classList.add('hidden')

        // Reset dropdown kelas ke opsi pertama
        if (nilaiKelas) nilaiKelas.selectedIndex = 0

        // Muat ledger berdasarkan kelas default
        loadLedgerNilai(nilaiKelas?.value)
      }
    })
  })
}

// =====================
// FITUR REKAP ABSENSI
// =====================
async function initRekapAbsensi() {
  const container = document.getElementById('rekapAbsensiContainer')
  if (!container) return

  const schoolId = currentUser?.profile?.school_id || currentUser?.user?.user_metadata?.school_id || null

  container.innerHTML = `
    <div class="card">
      <div class="card-header-flex">
        <h3 style="margin:0;"><i class="fas fa-chart-pie" style="color: #0d8a73;"></i> Rekap Absensi Siswa</h3>
        <button id="btnExportRekap" class="btn-outline" style="display:none;">
          <i class="fas fa-file-excel"></i> Download Excel
        </button>
      </div>

      <div class="filter-grid" style="margin-top: 20px;">
        <div class="form-group">
          <label>Pilih Kelas</label>
          <select id="rekapKelas" class="form-control">
            <option value="">Pilih Kelas...</option>
          </select>
        </div>

        <div class="form-group">
          <label>Mode Rekap</label>
          <div style="display: flex; gap: 16px; height: 42px; align-items: center;">
            <label style="cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 0.9rem;">
              <input type="radio" name="modeRekap" value="bulanan" checked> Bulanan
            </label>
            <label style="cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 0.9rem;">
              <input type="radio" name="modeRekap" value="semester"> Semesteran
            </label>
          </div>
        </div>

        <div id="bulananFilter" class="form-group">
          <label>Bulan & Tahun</label>
          <div style="display: flex; gap: 8px;">
            <select id="bulanRekap" class="form-control" style="flex: 2;">
              <option value="1">Januari</option>
              <option value="2">Februari</option>
              <option value="3">Maret</option>
              <option value="4">April</option>
              <option value="5">Mei</option>
              <option value="6">Juni</option>
              <option value="7">Juli</option>
              <option value="8">Agustus</option>
              <option value="9">September</option>
              <option value="10">Oktober</option>
              <option value="11">November</option>
              <option value="12">Desember</option>
            </select>
            <input type="number" id="tahunRekap" class="form-control" style="width: 90px;">
          </div>
        </div>

        <div id="semesterFilter" class="form-group" style="display:none;">
          <label>Pilih Semester</label>
          <select id="semesterRekap" class="form-control" style="width: 100%;"></select>
        </div>

        <div class="form-group" style="justify-content: flex-end;">
          <button id="btnLoadRekap" class="btn-primary" style="height: 42px; width: 100%;">
            <i class="fas fa-search"></i> Tampilkan Rekap
          </button>
        </div>
      </div>

      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;">

      <div id="rekapResult">
        <div style="text-align: center; color: #6b7280; padding: 30px;">
          Silakan pilih kelas, periode, dan klik <b>Tampilkan Rekap</b>
        </div>
      </div>
    </div>
  `

  const now = new Date()
  document.getElementById('bulanRekap').value = now.getMonth() + 1
  document.getElementById('tahunRekap').value = now.getFullYear()

  let queryKelas = supabase.from('kelas').select('id, nama_kelas').order('nama_kelas', { ascending: true })
  if (schoolId) queryKelas = queryKelas.eq('school_id', schoolId)

  const { data: listKelas } = await queryKelas

  const rekapKelasSelect = document.getElementById('rekapKelas')
  if (listKelas && rekapKelasSelect) {
    listKelas.forEach(k => {
      rekapKelasSelect.innerHTML += `<option value="${k.id}" data-nama="${k.nama_kelas}">Kelas ${k.nama_kelas}</option>`
    })
  }

  setupRekapEvents(schoolId)
}

function setupRekapEvents(schoolId) {
  document.querySelectorAll('input[name="modeRekap"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const mode = radio.value
      document.getElementById('bulananFilter').style.display = mode === 'bulanan' ? 'flex' : 'none'
      document.getElementById('semesterFilter').style.display = mode === 'semester' ? 'flex' : 'none'
    })
  })

  document.getElementById('btnLoadRekap')?.addEventListener('click', loadRekap)
  document.getElementById('btnExportRekap')?.addEventListener('click', exportRekapToExcel)

  loadSemesterOptions(schoolId)
}

async function loadSemesterOptions(schoolId) {
  const select = document.getElementById('semesterRekap')
  if (!select) return

  let query = supabase.from('semester').select('*').order('created_at', { ascending: false })
  if (schoolId) query = query.eq('school_id', schoolId)

  const { data } = await query

  if (!data) return
  select.innerHTML = ''
  data.forEach(item => {
    select.innerHTML += `
      <option value="${item.id}" data-start="${item.tanggal_mulai || ''}" data-end="${item.tanggal_selesai || ''}">
        ${item.nama_semester || 'Semester'} (${item.tahun_ajaran || '-'})
      </option>
    `
  })
}

// =====================
// LOAD REKAP
// =====================
async function loadRekap() {
  const result = document.getElementById('rekapResult')
  const btnExport = document.getElementById('btnExportRekap')
  const selectKelasElem = document.getElementById('rekapKelas')
  const classId = selectKelasElem?.value
  const namaKelasText = selectKelasElem?.options[selectKelasElem.selectedIndex]?.getAttribute('data-nama') || ''

  if (!classId) {
    return alert('Silakan pilih kelas terlebih dahulu!')
  }

  result.innerHTML = `<div style="text-align:center; padding: 30px; color: #6b7280;">⏳ Memuat data rekap absensi...</div>`
  if (btnExport) btnExport.style.display = 'none'

  try {
    const mode = document.querySelector('input[name="modeRekap"]:checked')?.value
    let startDate, endDate

    if (mode === 'bulanan') {
      const bulan = parseInt(document.getElementById('bulanRekap').value)
      const tahun = parseInt(document.getElementById('tahunRekap').value)
      startDate = `${tahun}-${String(bulan).padStart(2, '0')}-01`
      const lastDay = new Date(tahun, bulan, 0).getDate()
      endDate = `${tahun}-${String(bulan).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    } else {
      const selectSemester = document.getElementById('semesterRekap')
      const selectedOption = selectSemester.options[selectSemester.selectedIndex]
      startDate = selectedOption?.getAttribute('data-start')
      endDate = selectedOption?.getAttribute('data-end')
    }

    const { data: siswa, error: errSiswa } = await supabase
      .from('siswa')
      .select('*')
      .eq('class_id', classId)
      .order('nama_siswa')

    if (errSiswa) throw errSiswa

    let queryJurnal = supabase.from('jurnal').select('*').eq('kelas', namaKelasText)

    if (startDate) queryJurnal = queryJurnal.gte('tanggal', startDate)
    if (endDate) queryJurnal = queryJurnal.lte('tanggal', endDate)

    const { data: absensi, error: errAbsensi } = await queryJurnal

    if (errAbsensi) throw errAbsensi

    renderRekapCard(siswa || [], absensi || [])
    if (btnExport && siswa?.length > 0) btnExport.style.display = 'inline-flex'

  } catch (err) {
    console.error('Error loadRekap:', err)
    result.innerHTML = `<div style="text-align:center; color: #ef4444; padding: 30px;">⚠️ Gagal memuat data rekap.</div>`
  }
}

function renderRekapCard(siswa, absensi) {
  const result = document.getElementById('rekapResult')
  if (siswa.length === 0) {
    result.innerHTML = `<div style="text-align:center; padding:30px; color:#6b7280;">Tidak ada data siswa di kelas ini.</div>`
    return
  }

  currentAbsenData = []
  let html = `<div style="display: flex; flex-direction: column; gap: 12px;">`

  siswa.forEach((item, index) => {
    const dataSiswa = absensi.filter(x => x.nama === item.nama_siswa)

    const hadir = dataSiswa.filter(x => x.status === 'Hadir' || x.status === 'H').length
    const sakit = dataSiswa.filter(x => x.status === 'Sakit' || x.status === 'S').length
    const izin = dataSiswa.filter(x => x.status === 'Izin' || x.status === 'I').length
    const alpa = dataSiswa.filter(x => x.status === 'Alpa' || x.status === 'A').length

    const total = hadir + sakit + izin + alpa
    const persen = total === 0 ? 0 : Math.round((hadir / total) * 100)

    currentAbsenData.push({
      No: index + 1,
      Nama: item.nama_siswa,
      Hadir: hadir,
      Sakit: sakit,
      Izin: izin,
      Alpa: alpa,
      Total_Pertemuan: total,
      Persentase: persen + '%'
    })

    const classPersen = persen >= 85 ? 'persen-tinggi' : persen >= 70 ? 'persen-sedang' : 'persen-rendah'

    html += `
      <div class="rekap-item-card" style="display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 16px;">
        <div class="siswa-info" style="display: flex; align-items: center; gap: 12px; min-width: 0;">
          <div class="avatar-initial" style="flex-shrink: 0;">${getInitial(item.nama_siswa)}</div>
          <div style="min-width: 0;">
            <div class="siswa-nama" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.nama_siswa}</div>
            <div style="font-size: 0.78rem; color: #6b7280;">Total Pertemuan: ${total} hari</div>
          </div>
        </div>

        <div class="badge-status-group" style="display: flex; gap: 8px; justify-content: center; width: 220px;">
          <div class="badge-status-item badge-h">H: <strong>${hadir}</strong></div>
          <div class="badge-status-item badge-s">S: <strong>${sakit}</strong></div>
          <div class="badge-status-item badge-i">I: <strong>${izin}</strong></div>
          <div class="badge-status-item badge-a">A: <strong>${alpa}</strong></div>
        </div>

        <div style="width: 140px; text-align: right;">
          <span class="persen-badge ${classPersen}">
            ${persen}% Kehadiran
          </span>
        </div>
      </div>
    `
  })

  html += `</div>`
  result.innerHTML = html
}

// =====================
// EXPORT REKAP ABSENSI (EXCELJS)
// =====================
async function exportRekapToExcel() {
  if (!currentAbsenData.length) return alert('Belum ada data rekap!')
  const rekapKelasSelect = document.getElementById('rekapKelas')
  const namaKelas = rekapKelasSelect?.options[rekapKelasSelect.selectedIndex]?.text || 'Kelas'

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Rekap Absensi')

  worksheet.mergeCells('A1:H1')
  const titleCell = worksheet.getCell('A1')
  titleCell.value = `REKAPITULASI ABSENSI SISWA - ${namaKelas.toUpperCase()}`
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: '0D8A73' } }
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' }

  worksheet.mergeCells('A2:H2')
  const subCell = worksheet.getCell('A2')
  subCell.value = `Sekolah: ${currentUser?.header?.sekolah || '-'} | Mapel: ${currentUser?.header?.mapel || '-'}`
  subCell.font = { name: 'Calibri', size: 10, italic: true }
  subCell.alignment = { vertical: 'middle', horizontal: 'center' }

  worksheet.addRow([])

  const headers = ['No', 'Nama Siswa', 'Hadir (H)', 'Sakit (S)', 'Izin (I)', 'Alpa (A)', 'Total Pertemuan', '% Kehadiran']
  const headerRow = worksheet.addRow(headers)

  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0D8A73' } }
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })

  currentAbsenData.forEach(item => {
    const row = worksheet.addRow([
      item.No,
      item.Nama,
      item.Hadir,
      item.Sakit,
      item.Izin,
      item.Alpa,
      item.Total_Pertemuan,
      item.Persentase
    ])

    row.getCell(1).alignment = { horizontal: 'center' }
    row.getCell(2).alignment = { horizontal: 'left' }
    for (let i = 3; i <= 8; i++) {
      row.getCell(i).alignment = { horizontal: 'center' }
    }
  })

  worksheet.columns = [
    { width: 6 },
    { width: 35 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 16 },
    { width: 16 }
  ]

  worksheet.eachRow((row, rowNum) => {
    if (rowNum >= 4) {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'D1D5DB' } },
          left: { style: 'thin', color: { argb: 'D1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
          right: { style: 'thin', color: { argb: 'D1D5DB' } }
        }
      })
    }
  })

  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(new Blob([buffer]), `Rekap_Absensi_${namaKelas.replace(/\s+/g, '_')}.xlsx`)
}

// =====================
// LOAD SISWA & FETCH NILAI EKSISTING (FIXED)
// =====================
async function loadSiswaNilai(classId = nilaiKelas?.value) {
  if (!tbodyInputNilai) return

  if (!classId) {
    tbodyInputNilai.innerHTML = '<tr><td colspan="3" style="text-align:center;">Pilih kelas untuk menampilkan siswa.</td></tr>'
    return
  }

  // Mengambil kode jenis penilaian (misal: TP1)
  const jenisValue = jenisPenilaian?.value?.trim() || ''
  let jenisKode = jenisValue
  const match = jenisValue.match(/\(([^)]+)\)/)
  if (match && match[1]) {
    jenisKode = match[1]
  }

  try {
    // 1. Ambil Data Siswa berdasarkan kelas
    const { data: siswa, error: errSiswa } = await supabase
      .from('siswa')
      .select('id, nama_siswa')
      .eq('class_id', classId)
      .order('nama_siswa', { ascending: true })

    if (errSiswa) throw errSiswa

    if (!siswa || siswa.length === 0) {
      tbodyInputNilai.innerHTML = '<tr><td colspan="3" style="text-align:center;">Tidak ada data siswa di kelas ini.</td></tr>'
      return
    }

    const siswaIds = siswa.map(s => s.id)

    // 2. Fetch nilai tersimpan mengurutkan via ID Siswa (sama seperti mekanisme Ledger)
    let nilaiMap = {}
    if (jenisKode && siswaIds.length > 0) {
      const { data: nilaiData, error: errNilai } = await supabase
        .from('nilai_guru_mapel')
        .select('siswa_id, nilai')
        .in('siswa_id', siswaIds)
        .eq('jenis_penilaian', jenisKode)

      if (!errNilai && nilaiData) {
        nilaiData.forEach(item => {
          nilaiMap[item.siswa_id] = item.nilai
        })
      }
    }

    // 3. Render tabel & isi input nilai eksisting
    let rowsHTML = ''
    siswa.forEach((item, index) => {
      const nilaiTersimpan = (nilaiMap[item.id] !== undefined && nilaiMap[item.id] !== null) ? nilaiMap[item.id] : ''

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
                   value="${nilaiTersimpan}"
                   style="width: 100%; text-align: center;">
          </td>
        </tr>
      `
    })
    tbodyInputNilai.innerHTML = rowsHTML

  } catch (err) {
    console.error('Error loadSiswaNilai:', err)
    tbodyInputNilai.innerHTML = '<tr><td colspan="3" style="text-align:center; color:red;">Gagal memuat data siswa/nilai.</td></tr>'
  }
}

// =====================
// SIMPAN NILAI KE SUPABASE & REFRESH AUTOMATIS
// =====================
async function simpanNilai() {
  const btnSimpan = document.getElementById('btnSimpanNilai')
  const selectKelas = document.getElementById('nilaiKelas')
  const selectJenis = document.getElementById('jenisPenilaian')

  const classId = selectKelas?.value
  const jenisValue = selectJenis?.value?.trim() || ''

  if (!classId) return alert('⚠️ Silakan pilih Kelas terlebih dahulu!')
  if (!jenisValue) return alert('⚠️ Silakan pilih Jenis Penilaian!')

  let jenisKode = jenisValue
  const match = jenisValue.match(/\(([^)]+)\)/)
  if (match && match[1]) {
    jenisKode = match[1]
  }

  const inputs = document.querySelectorAll('.input-nilai-siswa')
  const payload = []

  inputs.forEach(input => {
    const siswaId = input.dataset.siswaId
    const nilaiVal = input.value.trim()

    if (siswaId && nilaiVal !== '') {
      payload.push({
        siswa_id: siswaId,
        kelas_id: classId,
        jenis_penilaian: jenisKode,
        nilai: Number(nilaiVal)
      })
    }
  })

  if (payload.length === 0) {
    return alert('⚠️ Belum ada nilai yang diisi!')
  }

  try {
    if (btnSimpan) {
      btnSimpan.innerText = 'Menyimpan...'
      btnSimpan.disabled = true
    }

    const { error } = await supabase
      .from('nilai_guru_mapel')
      .upsert(payload, { onConflict: 'siswa_id,jenis_penilaian' })

    if (error) throw error

    alert('✅ Data nilai berhasil disimpan!')

    // Refresh tampilan tabel agar nilai yang tersimpan langsung muncul di input
    await loadSiswaNilai(classId)

  } catch (err) {
    console.error('Error simpanNilai:', err)
    alert('❌ Gagal menyimpan nilai: ' + (err.message || 'Terjadi kesalahan server.'))
  } finally {
    if (btnSimpan) {
      btnSimpan.innerHTML = '<i class="fas fa-save"></i> Simpan Nilai'
      btnSimpan.disabled = false
    }
  }
}

// Event Listener Simpan Nilai
document.getElementById('btnSimpanNilai')?.addEventListener('click', (e) => {
  e.preventDefault()
  simpanNilai()
})

// =====================
// LOAD DROPDOWN KELAS
// =====================
async function loadKelasOptions(schoolId) {
  try {
    let query = supabase.from('kelas').select('id, nama_kelas').order('nama_kelas', { ascending: true })
    if (schoolId) query = query.eq('school_id', schoolId)

    const { data: listKelas, error } = await query

    if (error) return console.error('Error fetching kelas:', error.message)

    if (listKelas && listKelas.length > 0) {
      let optionsHTML = '<option value="">Pilih Kelas...</option>'
      listKelas.forEach(item => {
        optionsHTML += `<option value="${item.id}" data-nama="${item.nama_kelas}">Kelas ${item.nama_kelas}</option>`
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
    currentSiswaList = []
    return
  }

  try {
    const { data: siswa, error } = await supabase
      .from('siswa')
      .select('id, nama_siswa')
      .eq('class_id', classId)
      .order('nama_siswa', { ascending: true })

    if (error) return console.error('Error fetching siswa:', error.message)

    currentSiswaList = siswa || []

    if (siswa && siswa.length > 0) {
      containerAbsensi?.classList.remove('hidden')
      siswaList.innerHTML = ''
      dataAbsensi = {}

      siswa.forEach(item => {
        dataAbsensi[item.id] = 'H'

        const card = document.createElement('div')
        card.className = 'siswa-card'
        card.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; margin-bottom: 10px; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; border-left: 4px solid #0d8a73;'
        
        card.innerHTML = `
          <div class="siswa-info" style="display: flex; align-items: center; gap: 12px;">
            <div class="avatar-initial" style="width: 40px; height: 40px; background: #2563eb; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">
              ${getInitial(item.nama_siswa)}
            </div>
            <div class="siswa-nama" style="font-weight: 600; color: #1f2937;">${item.nama_siswa}</div>
          </div>
          <div class="status-group" data-siswa-id="${item.id}" style="display: flex; gap: 8px;">
            <button type="button" class="btn-status active" data-status="H" style="padding: 6px 14px; border: 1px solid #0d8a73; background: #0d8a73; color: white; border-radius: 6px; cursor: pointer; font-weight: 600;">
              Hadir
            </button>
            <button type="button" class="btn-status" data-status="S" style="padding: 6px 14px; border: 1px solid #d1d5db; background: #f3f4f6; color: #374151; border-radius: 6px; cursor: pointer;">
              Sakit
            </button>
            <button type="button" class="btn-status" data-status="I" style="padding: 6px 14px; border: 1px solid #d1d5db; background: #f3f4f6; color: #374151; border-radius: 6px; cursor: pointer;">
              Izin
            </button>
            <button type="button" class="btn-status" data-status="A" style="padding: 6px 14px; border: 1px solid #d1d5db; background: #f3f4f6; color: #374151; border-radius: 6px; cursor: pointer;">
              Alpa
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
// SIMPAN JURNAL
// =====================
async function simpanJurnal() {
  const btnSimpan = document.getElementById('btnSimpanAbsensi')
  
  const inputTanggal = document.getElementById('jurnalTanggal')
  const selectKelas = document.getElementById('jurnalKelas')
  const inputMateri = document.getElementById('jurnalMateri')
  const inputCatatan = document.getElementById('jurnalCatatan')

  const tanggalValue = inputTanggal?.value
  const classId = selectKelas?.value
  const namaKelasText = selectKelas?.options[selectKelas.selectedIndex]?.getAttribute('data-nama') || ''
  const materiValue = inputMateri?.value || ''
  const catatanValue = inputCatatan?.value || ''

  if (!tanggalValue) return alert('⚠️ Silakan isi Tanggal terlebih dahulu!')
  if (!classId) return alert('⚠️ Silakan pilih Kelas terlebih dahulu!')
  if (!currentSiswaList || currentSiswaList.length === 0) return alert('⚠️ Daftar siswa kosong!')

  const userId = currentUser?.profile?.id || currentUser?.user?.id || null
  const mapelNama = currentUser?.header?.mapel || 'PAI'

  const payload = currentSiswaList.map(siswa => ({
    user_id: userId,
    tanggal: tanggalValue,
    kelas: namaKelasText,
    mapel: mapelNama,
    materi: materiValue,
    catatan_kejadian: catatanValue,
    nama: siswa.nama_siswa,
    status: dataAbsensi[siswa.id] || 'H'
  }))

  try {
    if (btnSimpan) {
      btnSimpan.innerHTML = 'Menyimpan...'
      btnSimpan.disabled = true
    }

    const { error } = await supabase.from('jurnal').insert(payload)

    if (error) throw error

    alert('✅ Jurnal & Absensi berhasil disimpan!')
    await loadJurnalTable()

  } catch (err) {
    console.error('Error Supabase:', err)
    alert('❌ Gagal Simpan: ' + (err.message || 'Terjadi kesalahan database.'))
  } finally {
    if (btnSimpan) {
      btnSimpan.innerHTML = '<i class="fas fa-save"></i> Simpan Jurnal & Absensi'
      btnSimpan.disabled = false
    }
  }
}

document.getElementById('btnSimpanAbsensi')?.addEventListener('click', (e) => {
  e.preventDefault()
  simpanJurnal()
})

// =====================
// LOAD TABLE JURNAL
// =====================
async function loadJurnalTable() {
  const tbodyJurnal = document.getElementById('tbodyJurnal')
  if (!tbodyJurnal) return

  try {
    const userId = currentUser?.profile?.id || currentUser?.user?.id || null

    let query = supabase.from('jurnal').select('*').order('tanggal', { ascending: false })
    if (userId) query = query.eq('user_id', userId)

    const { data, error } = await query

    if (error) throw error

    if (!data || data.length === 0) {
      tbodyJurnal.innerHTML = '<tr><td colspan="6" style="text-align:center;">Belum ada data jurnal.</td></tr>'
      return
    }

    const groupedJurnal = []
    const mapJurnal = new Map()

    data.forEach(item => {
      const key = `${item.tanggal}_${item.kelas}_${item.materi}`
      if (!mapJurnal.has(key)) {
        mapJurnal.set(key, item)
        groupedJurnal.push(item)
      }
    })

    let rowsHTML = ''
    groupedJurnal.forEach((item, index) => {
      rowsHTML += `
        <tr>
          <td style="text-align: center; font-weight: 600;">${index + 1}</td>
          <td>${item.tanggal || '-'}</td>
          <td>Kelas ${item.kelas || '-'}</td>
          <td style="text-align: center;">-</td>
          <td>${item.materi || '-'}</td>
          <td>${item.catatan_kejadian || '-'}</td>
        </tr>
      `
    })

    tbodyJurnal.innerHTML = rowsHTML

  } catch (err) {
    console.error('Error loadJurnalTable:', err)
    tbodyJurnal.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Gagal memuat data jurnal.</td></tr>'
  }
}

// =====================
// EXPORT EXCEL JURNAL
// =====================
document.getElementById('btnExportJurnal')?.addEventListener('click', async () => {
  const { data, error } = await supabase.from('jurnal').select('*').order('tanggal', { ascending: false })
  if (error || !data || data.length === 0) return alert('Belum ada data jurnal untuk diekspor!')

  const groupedJurnal = []
  const mapJurnal = new Map()

  data.forEach(item => {
    const key = `${item.tanggal}_${item.kelas}_${item.materi}`
    if (!mapJurnal.has(key)) {
      mapJurnal.set(key, item)
      groupedJurnal.push(item)
    }
  })

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Jurnal Mengajar')

  worksheet.mergeCells('A1:F1')
  const titleCell = worksheet.getCell('A1')
  titleCell.value = 'REKAP JURNAL MENGAJAR GURU'
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: '0D8A73' } }
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' }

  worksheet.addRow([])

  const headerRow = worksheet.addRow(['No', 'Tanggal', 'Kelas', 'Materi / CP', 'Catatan Kejadian', 'Mata Pelajaran'])
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0D8A73' } }
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })

  groupedJurnal.forEach((item, index) => {
    const row = worksheet.addRow([
      index + 1,
      item.tanggal || '-',
      `Kelas ${item.kelas || '-'}`,
      item.materi || '-',
      item.catatan_kejadian || '-',
      item.mapel || '-'
    ])

    row.getCell(1).alignment = { horizontal: 'center' }
    row.getCell(2).alignment = { horizontal: 'center' }
    row.getCell(3).alignment = { horizontal: 'center' }
  })

  worksheet.columns = [
    { width: 6 },
    { width: 15 },
    { width: 15 },
    { width: 35 },
    { width: 35 },
    { width: 18 }
  ]

  worksheet.eachRow((row, rowNum) => {
    if (rowNum >= 3) {
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'D1D5DB' } },
          left: { style: 'thin', color: { argb: 'D1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
          right: { style: 'thin', color: { argb: 'D1D5DB' } }
        }
      })
    }
  })

  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(new Blob([buffer]), `Rekap_Jurnal_Mengajar.xlsx`)
})

// =====================
// EXPORT EXCEL LEDGER
// =====================
document.getElementById('btnExportLedger')?.addEventListener('click', async () => {
  const tbody = document.getElementById('tbodyLedger')
  const classSelect = document.getElementById('nilaiKelas')
  const namaKelas = classSelect?.options[classSelect.selectedIndex]?.text || ''

  if (!classSelect?.value || tbody?.children[0]?.children.length <= 1) {
    return alert('Pilih kelas dan pastikan data ledger sudah tampil sebelum ekspor!')
  }

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Ledger Nilai')

  worksheet.mergeCells('A1:K1')
  const titleCell = worksheet.getCell('A1')
  titleCell.value = `LEDGER NILAI SISWA - ${namaKelas.toUpperCase()}`
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: '0D8A73' } }
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' }

  worksheet.addRow([])

  const headers = ['No', 'Nama Siswa', 'TP1', 'TP2', 'TP3', 'TP4', 'TP5', 'TP6', 'STS', 'SAS', 'Rata-Rata']
  const headerRow = worksheet.addRow(headers)

  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0D8A73' } }
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })

  const rows = tbody.querySelectorAll('tr')
  rows.forEach(row => {
    const cols = row.querySelectorAll('td')
    if (cols.length >= 11) {
      const rowData = Array.from(cols).map(col => {
        const text = col.innerText.trim()
        return isNaN(text) || text === '-' ? text : Number(text)
      })

      const addedRow = worksheet.addRow(rowData)
      addedRow.getCell(1).alignment = { horizontal: 'center' }
      addedRow.getCell(2).alignment = { horizontal: 'left' }

      for (let i = 3; i <= 11; i++) {
        addedRow.getCell(i).alignment = { horizontal: 'center' }
      }

      const avgCell = addedRow.getCell(11)
      avgCell.font = { bold: true, color: { argb: '166534' } }
      avgCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0FDF4' } }
    }
  })

  worksheet.columns = [
    { width: 6 },
    { width: 32 },
    { width: 8 },
    { width: 8 },
    { width: 8 },
    { width: 8 },
    { width: 8 },
    { width: 8 },
    { width: 8 },
    { width: 8 },
    { width: 14 }
  ]

  worksheet.eachRow((row, rowNum) => {
    if (rowNum >= 3) {
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'D1D5DB' } },
          left: { style: 'thin', color: { argb: 'D1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
          right: { style: 'thin', color: { argb: 'D1D5DB' } }
        }
      })
    }
  })

  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(new Blob([buffer]), `Ledger_Nilai_${namaKelas.replace(/\s+/g, '_')}.xlsx`)
})

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
      .from('nilai_guru_mapel')
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
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        buttons.forEach(b => {
          b.classList.remove('active')
          b.style.background = '#f3f4f6'
          b.style.color = '#374151'
          b.style.borderColor = '#d1d5db'
          b.style.fontWeight = 'normal'
        })
        
        btn.classList.add('active')
        btn.style.background = '#0d8a73'
        btn.style.color = '#ffffff'
        btn.style.borderColor = '#0d8a73'
        btn.style.fontWeight = '600'
        
        dataAbsensi[siswaId] = btn.dataset.status
      })
    })
  })
}

// =====================
// EVENT LISTENERS DROPDOWN KELAS & JENIS PENILAIAN
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

jenisPenilaian?.addEventListener('change', () => {
  loadSiswaNilai(nilaiKelas?.value)
})

// =====================
// DASHBOARD & HEADER USER (FIXED NAMA & SEKOLAH)
// =====================
async function loadDashboard() {
  try {
    // 1. Dapatkan Sesi / Auth User dari Supabase
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user

    let namaUser = ''
    let sekolahUser = ''

    if (user) {
      // Query ke tabel 'profiles' menggunakan kolom 'name' dan 'sekolah'
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('name, sekolah, school_id')
        .eq('id', user.id)
        .maybeSingle()

      if (profile && profile.name) {
        namaUser = profile.name
        sekolahUser = profile.sekolah
      }
    }

    // 2. Fallback dari metadata/session jika query profiles tidak mengembalikan nama
    if (!namaUser) {
      namaUser = currentUser?.profile?.name || 
                 currentUser?.profile?.nama_lengkap || 
                 currentUser?.profile?.nama || 
                 currentUser?.user?.user_metadata?.full_name || 
                 currentUser?.user?.user_metadata?.name || 
                 'Guru Mapel'
    }

    if (!sekolahUser) {
      sekolahUser = currentUser?.header?.sekolah || 
                    currentUser?.profile?.sekolah || 
                    currentUser?.profile?.nama_sekolah || 
                    'SD Negeri'
    }

    // 3. Render ke elemen DOM
    if (namaGuru) namaGuru.textContent = namaUser
    if (sekolahInfo) sekolahInfo.textContent = sekolahUser
    if (mapelInfo) mapelInfo.textContent = `Mata Pelajaran: ${currentUser?.header?.mapel || 'PAI'}`
    if (semesterAktifInfo) semesterAktifInfo.textContent = currentUser?.header?.semester || 'Semester 1'
    if (tahunAjaranInfo) tahunAjaranInfo.textContent = currentUser?.header?.tahun_ajaran || 'Tahun Ajaran 2026/2027'

    // 4. Load Option Kelas berdasarkan school_id
    const schoolId = currentUser?.profile?.school_id || currentUser?.profile?.sekolah_id || null
    await loadKelasOptions(schoolId)
    
    if (nilaiKelas && nilaiKelas.value) {
      loadSiswaNilai(nilaiKelas.value)
    }
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

    await loadDashboard()
    await loadJurnalTable()
  } catch (err) {
    console.error('Init Dashboard Error:', err)
  }
}

// Exec
initNavigation()
initSubTabNilai()
initDashboard()