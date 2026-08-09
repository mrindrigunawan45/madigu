import { supabase } from './config.js'
import { getCurrentClass } from './auth-sd.js'

console.log('Rekap Absensi Hybrid Loaded')

let currentClass = null
let currentAbsenData = [] // Array penampung untuk kebutuhan Download Excel

export async function initRekapAbsensi() {
  const container = document.getElementById('rekapAbsensiContainer')
  if (!container) return

  currentClass = await getCurrentClass()

  if (!currentClass) {
    container.innerHTML = `
      <div class="rekap-card-main">
        <div class="empty-state">
          <div style="font-size: 3rem; margin-bottom: 10px;">⚠️</div>
          <h3>Kelas Guru Belum Diatur</h3>
          <p>Silakan atur kelas aktif di profil/dashboard Anda terlebih dahulu.</p>
        </div>
      </div>
    `
    return
  }

  container.innerHTML = `
    <div class="rekap-card-main">
      <div class="card-header-flex">
        <h3 class="card-title">
          <i class="fas fa-chart-pie" style="color: #0d8a73;"></i> 
          Rekap Absensi - Kelas ${currentClass.nama_kelas || '-'}
        </h3>
        <button id="btnExportRekap" class="btn-outline">
          <i class="fas fa-file-excel"></i> Download Excel
        </button>
      </div>

      <div class="rekap-filter">
        <div class="filter-item">
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

        <div id="bulananFilter" class="filter-item">
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

        <div id="semesterFilter" class="filter-item" style="display:none;">
          <label>Pilih Semester</label>
          <select id="semesterRekap" class="form-control" style="width: 100%;"></select>
        </div>

        <div class="filter-item">
          <button id="btnLoadRekap" class="btn-primary" style="width: 100%;">
            <i class="fas fa-search"></i> Tampilkan Rekap
          </button>
        </div>
      </div>

      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;">

      <div id="rekapResult">
        <div class="empty-state">
          Silakan pilih periode dan klik <b>Tampilkan Rekap</b>
        </div>
      </div>
    </div>
  `

  const now = new Date()
  document.getElementById('bulanRekap').value = now.getMonth() + 1
  document.getElementById('tahunRekap').value = now.getFullYear()

  setupEvents()
  await loadSemester()
}

function setupEvents() {
  document.querySelectorAll('input[name="modeRekap"]').forEach(radio => {
    radio.addEventListener('change', toggleMode)
  })

  document.getElementById('btnLoadRekap')?.addEventListener('click', loadRekap)
  document.getElementById('btnExportRekap')?.addEventListener('click', exportToExcel)
}

function toggleMode() {
  const mode = document.querySelector('input[name="modeRekap"]:checked')?.value
  const bulananFilter = document.getElementById('bulananFilter')
  const semesterFilter = document.getElementById('semesterFilter')

  if (bulananFilter) bulananFilter.style.display = mode === 'bulanan' ? 'flex' : 'none'
  if (semesterFilter) semesterFilter.style.display = mode === 'semester' ? 'flex' : 'none'
}

async function loadSemester() {
  const select = document.getElementById('semesterRekap')
  if (!select || !currentClass?.school_id) return

  const { data, error } = await supabase
    .from('semester')
    .select('*')
    .eq('school_id', currentClass.school_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Gagal memuat data semester:', error)
    return
  }

  select.innerHTML = ''
  if (!data || data.length === 0) {
    select.innerHTML = '<option value="">Tidak ada data semester</option>'
    return
  }

  data.forEach(item => {
    select.innerHTML += `
      <option value="${item.id}" data-start="${item.tanggal_mulai || ''}" data-end="${item.tanggal_selesai || ''}">
        ${item.nama_semester || 'Semester'} (${item.tahun_ajaran || '-'})
      </option>
    `
  })
}

// Inisial Avatar Modern
function getInitial(nama) {
  if (!nama) return 'S'
  const words = nama.trim().split(' ')
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return words[0].substring(0, 2).toUpperCase()
}

// Logic Load Rekap dengan database relasional & filter rentang tanggal
async function loadRekap() {
  const result = document.getElementById('rekapResult')
  const btnExport = document.getElementById('btnExportRekap')
  if (!result) return

  result.innerHTML = `<div class="empty-state">⏳ Memuat data rekap absensi...</div>`
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

      if (!startDate || !endDate) {
        const { data: semData } = await supabase
          .from('semester')
          .select('*')
          .eq('id', selectSemester.value)
          .single()

        if (semData) {
          startDate = semData.tanggal_mulai
          endDate = semData.tanggal_selesai
        }
      }
    }

    // Query Siswa
    const { data: siswa, error: siswaError } = await supabase
      .from('siswa')
      .select('*')
      .eq('class_id', currentClass.id)
      .order('nama_siswa')

    if (siswaError) throw siswaError

    // Query Absensi terpisah dari tabel absensi
    let queryAbsensi = supabase
      .from('absensi')
      .select('*')
      .eq('class_id', currentClass.id)

    if (startDate) queryAbsensi = queryAbsensi.gte('tanggal', startDate)
    if (endDate) queryAbsensi = queryAbsensi.lte('tanggal', endDate)

    const { data: absensi, error: absensiError } = await queryAbsensi
    if (absensiError) throw absensiError

    renderModernCard(siswa, absensi || [])
    if (btnExport) btnExport.style.display = 'inline-flex'

  } catch (err) {
    console.error('Error loadRekap:', err)
    result.innerHTML = `<div class="empty-state" style="color: #ef4444;">⚠️ Gagal memuat data rekap. Silakan coba lagi.</div>`
  }
}

// Render UI Modern ala Card, Badge & Percentage
function renderModernCard(siswa, absensi) {
  const result = document.getElementById('rekapResult')

  if (!siswa || siswa.length === 0) {
    result.innerHTML = `<div class="empty-state">Tidak ada data siswa di kelas ini.</div>`
    return
  }

  currentAbsenData = [] // Reset data ekspor

  let html = `<div style="display: flex; flex-direction: column; gap: 12px;">`

  siswa.forEach((item, index) => {
    const dataSiswa = absensi.filter(x => x.siswa_id === item.id)

    const hadir = dataSiswa.filter(x => x.status === 'Hadir' || x.status === 'H').length
    const sakit = dataSiswa.filter(x => x.status === 'Sakit' || x.status === 'S').length
    const izin = dataSiswa.filter(x => x.status === 'Izin' || x.status === 'I').length
    const alpa = dataSiswa.filter(x => x.status === 'Alpa' || x.status === 'A').length

    const total = hadir + sakit + izin + alpa
    const persen = total === 0 ? 0 : Math.round((hadir / total) * 100)

    // Data siap export
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

    // Warna Badge Persentase
    const classPersen = persen >= 85 ? 'persen-tinggi' : persen >= 70 ? 'persen-sedang' : 'persen-rendah'

    html += `
      <div class="rekap-item-card">
        <div class="user-info">
          <div class="avatar-initial">
            ${getInitial(item.nama_siswa)}
          </div>
          <div>
            <div style="font-weight: 700; font-size: 1rem; color: #1f2937;">${item.nama_siswa}</div>
            <div style="font-size: 0.78rem; color: #6b7280;">Total Pertemuan: ${total} hari</div>
          </div>
        </div>

        <div class="badge-group">
          <div class="badge-status badge-hadir">H: <strong>${hadir}</strong></div>
          <div class="badge-status badge-sakit">S: <strong>${sakit}</strong></div>
          <div class="badge-status badge-izin">I: <strong>${izin}</strong></div>
          <div class="badge-status badge-alpa">A: <strong>${alpa}</strong></div>
        </div>

        <div>
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

// Logika Export ke Excel via SheetJS
function exportToExcel() {
  if (!currentAbsenData || currentAbsenData.length === 0) {
    alert('Belum ada data rekap untuk diexport!')
    return
  }

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(currentAbsenData)

  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 30 }, // Nama Siswa
    { wch: 10 }, // Hadir
    { wch: 10 }, // Sakit
    { wch: 10 }, // Izin
    { wch: 10 }, // Alpa
    { wch: 16 }, // Total
    { wch: 15 }  // Persentase
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Absensi')
  XLSX.writeFile(wb, `Rekap_Absensi_Kelas_${currentClass.nama_kelas || 'SD'}.xlsx`)
}

// Inisialisasi Otomatis
if (document.getElementById('rekapAbsensiContainer')) {
  initRekapAbsensi()
}