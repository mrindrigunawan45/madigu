import { supabaseClient } from './supabase.js'

// ==========================================
// 1. GET SCHOOL ID & DOM ELEMENTS
// ==========================================
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

const rekapKelasSelect = document.getElementById('rekap-walas-kelas')
const rekapModeSelect = document.getElementById('rekap-walas-mode')
const rekapBulanSelect = document.getElementById('rekap-walas-bulan')
const container = document.getElementById('rekap-walas-table')
const downloadBtn = document.getElementById('downloadWalasBtn')

let rawAbsenData = []
let tanggalList = []
let siswaList = []

// ==========================================
// DEFAULT SETTINGS (Awal Buka Menu)
// ==========================================
if (rekapBulanSelect) {
  rekapBulanSelect.value = 'semua' // Default Semua Bulan
}

if (rekapModeSelect) {
  rekapModeSelect.value = 'ringkasan' // Default Mode Ringkasan
}

// ==========================================
// 2. LOAD DROPDOWN KELAS
// ==========================================
async function loadKelasWalas() {
  const schoolId = await getSchoolId()
  if (!schoolId) return

  const { data, error } = await supabaseClient
    .from('siswa')
    .select('kelas')
    .eq('school_id', schoolId)

  if (error) {
    console.error('Error loading kelas:', error)
    return
  }

  const kelasUnik = [...new Set(data.map(item => item.kelas).filter(k => k && k.trim() !== ''))]
  kelasUnik.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  rekapKelasSelect.innerHTML = '<option value="">Pilih Kelas</option>'
  kelasUnik.forEach(kelas => {
    rekapKelasSelect.appendChild(new Option(kelas, kelas))
  })
}

// ==========================================
// 3. LOAD & FILTER DATA ABSEN WALAS
// ==========================================
async function loadRekapWalas() {
  const kelas = rekapKelasSelect.value
  const bulan = rekapBulanSelect.value

  if (!kelas) {
    container.innerHTML = `
      <div style="padding: 32px; text-align: center; color: #64748b; background: white; border-radius: 12px; border: 1px solid #e2e8f0;">
        Silahkan pilih kelas untuk menampilkan data rekapitulasi absensi.
      </div>
    `
    rawAbsenData = []
    siswaList = []
    tanggalList = []
    return
  }

  // Fetch Data Absen Walas Berdasarkan Kelas
  const { data, error } = await supabaseClient
    .from('absen_walas')
    .select('*')
    .eq('kelas', kelas)
    .order('tanggal', { ascending: true })

  if (error) {
    console.error('Error fetching absen_walas:', error)
    container.innerHTML = `
      <div style="padding: 24px; text-align: center; color: #dc2626; background: #fef2f2; border-radius: 12px; border: 1px solid #fecaca;">
        Gagal mengambil data: ${error.message}
      </div>
    `
    return
  }

  // Filter Data berdasarkan Bulan (jika bukan 'semua')
  let filteredData = data || []
  if (bulan && bulan !== 'semua') {
    filteredData = filteredData.filter(item => {
      if (!item.tanggal) return false
      // Format tanggal YYYY-MM-DD -> split ke indeks 1 untuk MM
      const m = item.tanggal.split('-')[1]
      return m === bulan
    })
  }

  rawAbsenData = filteredData

  // Ambil daftar tanggal unik untuk matriks
  tanggalList = [...new Set(filteredData.map(item => item.tanggal))].sort()

  // Agregasi / Grouping Data per Siswa
  const groupedSiswa = {}
  filteredData.forEach(item => {
    if (!item.nama) return

    if (!groupedSiswa[item.nama]) {
      groupedSiswa[item.nama] = {
        nama: item.nama,
        absenByDate: {},
        hadir: 0,
        sakit: 0,
        izin: 0,
        alpa: 0,
        total: 0
      }
    }

    // Rekam status spesifik per tanggal
    groupedSiswa[item.nama].absenByDate[item.tanggal] = item.status
    groupedSiswa[item.nama].total++

    if (item.status === 'H') groupedSiswa[item.nama].hadir++
    if (item.status === 'S') groupedSiswa[item.nama].sakit++
    if (item.status === 'I') groupedSiswa[item.nama].izin++
    if (item.status === 'A') groupedSiswa[item.nama].alpa++
  })

  siswaList = Object.values(groupedSiswa).sort((a, b) => a.nama.localeCompare(b.nama))

  renderMainTable()
}

// ==========================================
// 4. ROUTER RENDER TABEL
// ==========================================
function renderMainTable() {
  const mode = rekapModeSelect.value

  if (!siswaList.length) {
    container.innerHTML = `
      <div style="padding: 32px; text-align: center; color: #64748b; background: white; border-radius: 12px; border: 1px solid #e2e8f0;">
        Belum ada data rekap absen walas untuk periode/kelas ini.
      </div>
    `
    return
  }

  if (mode === 'ringkasan') {
    renderTabelRingkasan()
  } else {
    renderTabelMatriks()
  }
}

// 4A. TAMPILAN 1: MATRIKS PER TANGGAL (DETAIL CROSS-CHECK)
// RENDER MODE MATRIKS (DETAIL TANGGAL)
function renderTabelMatriks() {
  container.innerHTML = `
    <div style="width: 100%; overflow-x: auto; background: white; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="background-color: #2563eb; color: #ffffff;">
            <th style="padding: 10px; width: 40px; text-align: center; border-right: 1px solid rgba(255,255,255,0.2);">No</th>
            <th style="padding: 10px; text-align: left; min-width: 200px; border-right: 1px solid rgba(255,255,255,0.2);">Nama Siswa</th>
            
            <!-- Tanggal Dinamis (Header Seragam Biru) -->
            ${tanggalList.map(tgl => {
              const dateObj = new Date(tgl)
              const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}`
              return `<th style="padding: 8px; text-align: center; font-size: 11px; font-weight: 600; min-width: 48px; border-right: 1px solid rgba(255,255,255,0.2); color: #ffffff;">${formattedDate}</th>`
            }).join('')}

            <!-- Total H / S / I / A / % -->
            <th style="padding: 10px; text-align: center; width: 35px; border-right: 1px solid rgba(255,255,255,0.2); color: #ffffff;">H</th>
            <th style="padding: 10px; text-align: center; width: 35px; border-right: 1px solid rgba(255,255,255,0.2); color: #ffffff;">S</th>
            <th style="padding: 10px; text-align: center; width: 35px; border-right: 1px solid rgba(255,255,255,0.2); color: #ffffff;">I</th>
            <th style="padding: 10px; text-align: center; width: 35px; border-right: 1px solid rgba(255,255,255,0.2); color: #ffffff;">A</th>
            <th style="padding: 10px; text-align: center; width: 50px; color: #ffffff;">%</th>
          </tr>
        </thead>
        <tbody>
          ${siswaList.map((item, index) => {
            const persen = item.total > 0 ? ((item.hadir / item.total) * 100).toFixed(0) : '0'

            return `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px; text-align: center; color: #64748b; border-right: 1px solid #f1f5f9;">${index + 1}</td>
                <td style="padding: 8px; font-weight: 600; color: #0f172a; border-right: 1px solid #e2e8f0;">${item.nama}</td>
                
                <!-- Status Absen Per Tanggal -->
                ${tanggalList.map(tgl => {
                  const st = item.absenByDate[tgl] || '-'
                  let color = '#94a3b8'
                  if (st === 'H') color = '#16a34a'
                  if (st === 'S') color = '#ca8a04'
                  if (st === 'I') color = '#2563eb'
                  if (st === 'A') color = '#dc2626'
                  return `<td style="padding: 8px; text-align: center; font-weight: 700; color: ${color}; border-right: 1px solid #f1f5f9;">${st}</td>`
                }).join('')}

                <td style="padding: 8px; text-align: center; font-weight: 700; color: #16a34a; background: #f8fafc;">${item.hadir}</td>
                <td style="padding: 8px; text-align: center; font-weight: 700; color: #ca8a04; background: #f8fafc;">${item.sakit}</td>
                <td style="padding: 8px; text-align: center; font-weight: 700; color: #2563eb; background: #f8fafc;">${item.izin}</td>
                <td style="padding: 8px; text-align: center; font-weight: 700; color: #dc2626; background: #f8fafc;">${item.alpa}</td>
                <td style="padding: 8px; text-align: center; font-weight: 700; color: #0f172a; background: #f8fafc;">${persen}%</td>
              </tr>
            `
          }).join('')}
        </tbody>
      </table>
    </div>
  `
}

// 4B. TAMPILAN 2: RINGKASAN TOTAL (AGREGASI & PROPORSI SIAP EVALUASI)
function renderTabelRingkasan() {
  container.innerHTML = `
    <div style="width: 100%; overflow-x: auto; background: white; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
            <th style="padding: 12px; width: 50px; text-align: center;">No</th>
            <th style="padding: 12px; text-align: left;">Nama Siswa</th>
            <th style="padding: 12px; text-align: center; color: #16a34a;">Hadir (H)</th>
            <th style="padding: 12px; text-align: center; color: #ca8a04;">Sakit (S)</th>
            <th style="padding: 12px; text-align: center; color: #2563eb;">Izin (I)</th>
            <th style="padding: 12px; text-align: center; color: #dc2626;">Alpa (A)</th>
            <th style="padding: 12px; text-align: center;">Total Pertemuan</th>
            <th style="padding: 12px; text-align: center;">Persentase</th>
          </tr>
        </thead>
        <tbody>
          ${siswaList.map((item, index) => {
            const persen = item.total > 0 ? ((item.hadir / item.total) * 100).toFixed(0) : '0'
            const badgeColor = Number(persen) >= 75 ? '#dcfce7' : '#fee2e2'
            const textColor = Number(persen) >= 75 ? '#15803d' : '#b91c1c'

            return `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 12px; text-align: center; color: #64748b;">${index + 1}</td>
                <td style="padding: 10px 12px; font-weight: 600; color: #0f172a;">${item.nama}</td>
                <td style="padding: 10px 12px; text-align: center; font-weight: 700; color: #16a34a;">${item.hadir}</td>
                <td style="padding: 10px 12px; text-align: center; font-weight: 700; color: #ca8a04;">${item.sakit}</td>
                <td style="padding: 10px 12px; text-align: center; font-weight: 700; color: #2563eb;">${item.izin}</td>
                <td style="padding: 10px 12px; text-align: center; font-weight: 700; color: #dc2626;">${item.alpa}</td>
                <td style="padding: 10px 12px; text-align: center; font-weight: 600; color: #475569;">${item.total}</td>
                <td style="padding: 10px 12px; text-align: center;">
                  <span style="display: inline-block; padding: 4px 10px; border-radius: 12px; font-weight: 700; font-size: 12px; background-color: ${badgeColor}; color: ${textColor};">
                    ${persen}%
                  </span>
                </td>
              </tr>
            `
          }).join('')}
        </tbody>
      </table>
    </div>
  `
}

// ==========================================
// 5. DOWNLOAD EXCEL
// ==========================================
downloadBtn?.addEventListener('click', () => {
  if (!siswaList.length) {
    alert('Belum ada data absen walas yang dapat diunduh.')
    return
  }

  const mode = rekapModeSelect.value
  let excelData = []

  if (mode === 'matriks') {
    // Export format Matriks Per Tanggal
    excelData = siswaList.map((item, index) => {
      const row = {
        No: index + 1,
        'Nama Siswa': item.nama
      }

      // Masukkan kolom-kolom tanggal
      tanggalList.forEach(tgl => {
        row[tgl] = item.absenByDate[tgl] || '-'
      })

      row['Hadir'] = item.hadir
      row['Sakit'] = item.sakit
      row['Izin'] = item.izin
      row['Alpa'] = item.alpa
      row['Persentase'] = item.total > 0 ? ((item.hadir / item.total) * 100).toFixed(1) + '%' : '0%'

      return row
    })
  } else {
    // Export format Ringkasan Total
    excelData = siswaList.map((item, index) => ({
      No: index + 1,
      'Nama Siswa': item.nama,
      Hadir: item.hadir,
      Sakit: item.sakit,
      Izin: item.izin,
      Alpa: item.alpa,
      'Total Pertemuan': item.total,
      Persentase: item.total > 0 ? ((item.hadir / item.total) * 100).toFixed(1) + '%' : '0%'
    }))
  }

  const ws = XLSX.utils.json_to_sheet(excelData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Walas')

  const kelas = rekapKelasSelect.value || 'Kelas'
  const bulan = rekapBulanSelect.value || 'Semua'
  XLSX.writeFile(wb, `Rekap_Absen_Walas_${kelas}_Bulan_${bulan}.xlsx`)
})

// ==========================================
// 6. EVENT LISTENERS & INITIALIZATION
// ==========================================
rekapKelasSelect?.addEventListener('change', loadRekapWalas)
rekapBulanSelect?.addEventListener('change', loadRekapWalas)
rekapModeSelect?.addEventListener('change', renderMainTable)

// Initial Load Dropdown Kelas
loadKelasWalas()