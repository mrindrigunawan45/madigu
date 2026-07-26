import { supabase } from './config.js'
import { getCurrentClass } from './auth-sd.js'

console.log('Rekap Absensi SD Loaded')

let currentClass = null

// Ekspor fungsi init agar bisa dipanggil saat tab menu 'Rekap Absensi' diklik
export async function initRekapAbsensi() {
  const container = document.getElementById('rekapAbsensiContainer')
  if (!container) return

  currentClass = await getCurrentClass()

  if (!currentClass) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>Kelas Guru Belum Diatur</h3>
        <p>Silakan atur kelas aktif di profil/dashboard terlebih dahulu.</p>
      </div>
    `
    return
  }

  container.innerHTML = `
    <div class="rekap-card">
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0; font-size: 20px;">
          📊 Rekap Absensi - Kelas ${currentClass.nama_kelas || '-'}
        </h3>
      </div>

      <div class="rekap-filter">
        <div class="filter-item">
          <label>Mode Rekap</label>
          <div class="mode-wrap" style="display: flex; gap: 16px; margin-top: 8px;">
            <label style="cursor: pointer; display: flex; align-items: center; gap: 6px;">
              <input type="radio" name="modeRekap" value="bulanan" checked> Bulanan
            </label>
            <label style="cursor: pointer; display: flex; align-items: center; gap: 6px;">
              <input type="radio" name="modeRekap" value="semester"> Semesteran
            </label>
          </div>
        </div>

        <div id="bulananFilter" class="filter-item">
          <label>Bulan & Tahun</label>
          <div style="display: flex; gap: 8px;">
            <select id="bulanRekap">
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
            <input type="number" id="tahunRekap" style="width: 100px;">
          </div>
        </div>

        <div id="semesterFilter" class="filter-item" style="display:none;">
          <label>Pilih Semester</label>
          <select id="semesterRekap"></select>
        </div>

        <div class="filter-item">
          <button id="btnLoadRekap" class="btn-primary" style="height: 42px; padding: 0 20px; background: #0f766e; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 600;">
            🔍 Tampilkan Rekap
          </button>
        </div>
      </div>

      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;">

      <div id="rekapResult">
        <div class="empty-state" style="text-align: center; color: #6b7280; padding: 40px 0;">
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

// Otomatis jalankan jika container tersedia di DOM
if (document.getElementById('rekapAbsensiContainer')) {
  initRekapAbsensi()
}

// ======================
// EVENTS
// ======================
function setupEvents() {
  document.querySelectorAll('input[name="modeRekap"]').forEach(radio => {
    radio.addEventListener('change', toggleMode)
  })

  document.getElementById('btnLoadRekap')?.addEventListener('click', loadRekap)
}

function toggleMode() {
  const mode = document.querySelector('input[name="modeRekap"]:checked')?.value

  const bulananFilter = document.getElementById('bulananFilter')
  const semesterFilter = document.getElementById('semesterFilter')

  if (bulananFilter) bulananFilter.style.display = mode === 'bulanan' ? 'block' : 'none'
  if (semesterFilter) semesterFilter.style.display = mode === 'semester' ? 'block' : 'none'
}

// ======================
// LOAD SEMESTER
// ======================
async function loadSemester() {
  const select = document.getElementById('semesterRekap')
  if (!select) return

  // Pastikan currentClass ada
  if (!currentClass || !currentClass.school_id) {
    console.error('school_id tidak ditemukan pada kelas aktif')
    return
  }

  // Filter semester HANYA untuk sekolah tempat guru bertugas
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
    // Ambil tanggal mulai & selesai dari DB
    const startDate = item.tanggal_mulai || ''
    const endDate = item.tanggal_selesai || ''

    select.innerHTML += `
      <option value="${item.id}" data-start="${startDate}" data-end="${endDate}">
        ${item.nama_semester || 'Semester'} (${item.tahun_ajaran || '-'})
      </option>
    `
  })
}

// ======================
// LOAD REKAP
// ======================
async function loadRekap() {
  const result = document.getElementById('rekapResult')
  if (!result) return

  result.innerHTML = `
    <div class="empty-state" style="text-align: center; padding: 40px 0;">
      ⏳ Memuat data rekap absensi...
    </div>
  `

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
        // Fallback jika tanggal mulai/selesai tidak diisi di tabel semester
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

    // Fetch Siswa
    const { data: siswa, error: siswaError } = await supabase
      .from('siswa')
      .select('*')
      .eq('class_id', currentClass.id)
      .order('nama_siswa')

    if (siswaError) throw siswaError

    // Fetch Absensi
    let queryAbsensi = supabase
      .from('absensi')
      .select('*')
      .eq('class_id', currentClass.id)

    if (startDate) queryAbsensi = queryAbsensi.gte('tanggal', startDate)
    if (endDate) queryAbsensi = queryAbsensi.lte('tanggal', endDate)

    const { data: absensi, error: absensiError } = await queryAbsensi

    if (absensiError) throw absensiError

    renderTable(siswa, absensi || [])
  } catch (err) {
    console.error('Error loadRekap:', err)
    result.innerHTML = `
      <div class="empty-state" style="text-align: center; color: #ef4444; padding: 40px 0;">
        ⚠️ Gagal memuat data rekap. Silakan coba lagi.
      </div>
    `
  }
}

// ======================
// RENDER TABLE
// ======================
function renderTable(siswa, absensi) {
  const result = document.getElementById('rekapResult')

  if (!siswa || siswa.length === 0) {
    result.innerHTML = `
      <div class="empty-state" style="text-align: center; padding: 40px 0;">
        Tidak ada data siswa di kelas ini.
      </div>
    `
    return
  }

  let html = `
    <div style="overflow-x: auto;">
      <table style="width:100%; border-collapse: collapse; text-align: left; font-size: 15px;">
        <thead>
          <tr style="background: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
            <th style="padding: 12px; width: 50px; text-align: center;">No</th>
            <th style="padding: 12px;">Nama Siswa</th>
            <th style="padding: 12px; text-align: center; color: #16a34a;">Hadir (H)</th>
            <th style="padding: 12px; text-align: center; color: #eab308;">Sakit (S)</th>
            <th style="padding: 12px; text-align: center; color: #2563eb;">Izin (I)</th>
            <th style="padding: 12px; text-align: center; color: #ef4444;">Alpa (A)</th>
            <th style="padding: 12px; text-align: center;">Persentase</th>
          </tr>
        </thead>
        <tbody>
  `

  siswa.forEach((item, index) => {
    const dataSiswa = absensi.filter(x => x.siswa_id === item.id)

    const hadir = dataSiswa.filter(x => x.status === 'Hadir').length
    const sakit = dataSiswa.filter(x => x.status === 'Sakit').length
    const izin = dataSiswa.filter(x => x.status === 'Izin').length
    const alpa = dataSiswa.filter(x => x.status === 'Alpa').length

    const total = hadir + sakit + izin + alpa
    const persen = total === 0 ? 0 : Math.round((hadir / total) * 100)

    html += `
      <tr style="border-bottom: 1px solid #f3f4f6;">
        <td style="padding: 12px; text-align: center; color: #6b7280;">${index + 1}</td>
        <td style="padding: 12px; font-weight: 600; color: #111827;">${item.nama_siswa}</td>
        <td style="padding: 12px; text-align: center; font-weight: 600; color: #16a34a;">${hadir}</td>
        <td style="padding: 12px; text-align: center; font-weight: 600; color: #d97706;">${sakit}</td>
        <td style="padding: 12px; text-align: center; font-weight: 600; color: #2563eb;">${izin}</td>
        <td style="padding: 12px; text-align: center; font-weight: 600; color: #dc2626;">${alpa}</td>
        <td style="padding: 12px; text-align: center;">
          <span style="padding: 4px 10px; border-radius: 20px; font-weight: 700; font-size: 13px; background: ${persen >= 85 ? '#dcfce7' : persen >= 70 ? '#fef9c3' : '#fee2e2'}; color: ${persen >= 85 ? '#15803d' : persen >= 70 ? '#a16207' : '#b91c1c'};">
            ${persen}%
          </span>
        </td>
      </tr>
    `
  })

  html += `
        </tbody>
      </table>
    </div>
  `

  result.innerHTML = html
}