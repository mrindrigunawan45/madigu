import { supabaseClient } from './supabase.js'

/// ==========================================
// 1. GET PROFILE GURU DARI TABEL 'profiles'
// ==========================================
async function getGuruProfile() {
  const { data: { user } } = await supabaseClient.auth.getUser()
  if (!user) return null

  // GANTI / MASUKKAN DI SINI:
  const { data: profile, error } = await supabaseClient
    .from('profiles')
    .select('school_id') // Membaca school_id dari tabel profiles
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }

  return { userId: user.id, ...profile }
}

const kelasSelect = document.getElementById('rekap-absen-kelas')
const modeSelect = document.getElementById('rekap-absen-mode')
const bulanSelect = document.getElementById('rekap-absen-bulan')
const container = document.getElementById('rekap-absen-table')
const downloadBtn = document.getElementById('downloadAbsenBtn')

let siswaList = []
let tanggalList = []

if (bulanSelect) bulanSelect.value = 'semua'
if (modeSelect) modeSelect.value = 'ringkasan'

// ==========================================
// 2. LOAD DROPDOWN KELAS OTOMATIS (DARI TABEL 'kelas')
// ==========================================
async function loadKelas() {
  const profile = await getGuruProfile()
  if (!profile || !kelasSelect) return

  let listKelas = []

  // 1. Ambil dari tabel 'kelas' berdasarkan school_id guru
  if (profile.school_id) {
    const { data: dataKelas, error: errKelas } = await supabaseClient
      .from('kelas')
      .select('nama_kelas')
      .eq('school_id', profile.school_id)

    if (!errKelas && dataKelas && dataKelas.length > 0) {
      listKelas = dataKelas.map(item => item.nama_kelas)
    }
  }

  // 2. Fallback: Jika tabel 'kelas' kosong, ambil dari riwayat tabel 'jurnal'
  if (listKelas.length === 0) {
    const { data: jurnalKelas, error: errJurnal } = await supabaseClient
      .from('jurnal')
      .select('kelas')
      .eq('user_id', profile.userId)

    if (!errJurnal && jurnalKelas && jurnalKelas.length > 0) {
      listKelas = jurnalKelas.map(item => item.kelas)
    }
  }

  // Hilangkan duplikat dan urutkan nama kelas
  const kelasUnik = [...new Set(listKelas.filter(k => k && String(k).trim() !== ''))]
  kelasUnik.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }))

  // Isi ke dropdown HTML
  kelasSelect.innerHTML = '<option value="">Pilih Kelas...</option>'
  if (kelasUnik.length > 0) {
    kelasUnik.forEach(kelas => {
      kelasSelect.appendChild(new Option(kelas, kelas))
    })
  } else {
    // Fallback default
    const defaultKelas = ['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6']
    defaultKelas.forEach(k => {
      kelasSelect.appendChild(new Option(k, k))
    })
  }
}

// ==========================================
// 3. LOAD DATA ABSENSI BERDASARKAN KELAS
// ==========================================
async function loadRekapAbsen() {
  const profile = await getGuruProfile()
  if (!profile || !kelasSelect) return

  const kelas = kelasSelect.value
  const bulan = bulanSelect ? bulanSelect.value : 'semua'

  if (!kelas) {
    container.innerHTML = `
      <div style="padding: 32px; text-align: center; color: #64748b; background: white; border-radius: 12px; border: 1px solid #e2e8f0;">
        Silakan pilih <b>Kelas</b> untuk menampilkan rekapitulasi absensi.
      </div>
    `
    siswaList = []
    tanggalList = []
    return
  }

  const { data, error } = await supabaseClient
    .from('jurnal')
    .select('*')
    .eq('user_id', profile.userId)
    .eq('kelas', kelas)
    .order('tanggal', { ascending: true })

  if (error) {
    console.error('Error loading jurnal:', error)
    container.innerHTML = `
      <div style="padding: 24px; text-align: center; color: #dc2626; background: #fef2f2; border-radius: 12px; border: 1px solid #fecaca;">
        Gagal mengambil data: ${error.message}
      </div>
    `
    return
  }

  let filteredData = data || []
  if (bulan && bulan !== 'semua') {
    filteredData = filteredData.filter(item => {
      if (!item.tanggal) return false
      const m = item.tanggal.split('-')[1]
      return m === bulan
    })
  }

  tanggalList = [...new Set(filteredData.map(item => item.tanggal))].sort()

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
// 4. RENDER TABEL (RINGKASAN & MATRIKS)
// ==========================================
function renderMainTable() {
  const mode = modeSelect ? modeSelect.value : 'ringkasan'

  if (!siswaList.length) {
    container.innerHTML = `
      <div style="padding: 32px; text-align: center; color: #64748b; background: white; border-radius: 12px; border: 1px solid #e2e8f0;">
        Belum ada data rekap absensi untuk kelas / periode ini.
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

function renderTabelRingkasan() {
  container.innerHTML = `
    <div style="width: 100%; overflow-x: auto; background: white; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background-color: #0d8a73; color: #ffffff;">
            <th style="padding: 12px; width: 50px; text-align: center; border-right: 1px solid rgba(255,255,255,0.2);">No</th>
            <th style="padding: 12px; text-align: left; border-right: 1px solid rgba(255,255,255,0.2);">Nama Siswa</th>
            <th style="padding: 12px; text-align: center; border-right: 1px solid rgba(255,255,255,0.2);">Hadir (H)</th>
            <th style="padding: 12px; text-align: center; border-right: 1px solid rgba(255,255,255,0.2);">Sakit (S)</th>
            <th style="padding: 12px; text-align: center; border-right: 1px solid rgba(255,255,255,0.2);">Izin (I)</th>
            <th style="padding: 12px; text-align: center; border-right: 1px solid rgba(255,255,255,0.2);">Alpa (A)</th>
            <th style="padding: 12px; text-align: center; border-right: 1px solid rgba(255,255,255,0.2);">Total Pertemuan</th>
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
                <td style="padding: 10px 12px; font-weight: 700; color: #0f172a;">${item.nama}</td>
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

function renderTabelMatriks() {
  container.innerHTML = `
    <div style="width: 100%; overflow-x: auto; background: white; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="background-color: #0d8a73; color: #ffffff;">
            <th style="padding: 10px; width: 40px; text-align: center; border-right: 1px solid rgba(255,255,255,0.2);">No</th>
            <th style="padding: 10px; text-align: left; min-width: 200px; border-right: 1px solid rgba(255,255,255,0.2);">Nama Siswa</th>
            
            ${tanggalList.map(tgl => {
              const dateObj = new Date(tgl)
              const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}`
              return `<th style="padding: 8px; text-align: center; font-size: 11px; font-weight: 600; min-width: 48px; border-right: 1px solid rgba(255,255,255,0.2); color: #ffffff;">${formattedDate}</th>`
            }).join('')}

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
                <td style="padding: 8px; font-weight: 700; color: #0f172a; border-right: 1px solid #e2e8f0;">${item.nama}</td>
                
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

// ==========================================
// 5. EXPORT EXCEL
// ==========================================
downloadBtn?.addEventListener('click', () => {
  if (!siswaList.length) {
    alert('Belum ada data rekap absensi yang dapat diunduh.')
    return
  }

  const mode = modeSelect ? modeSelect.value : 'ringkasan'
  let excelData = []

  if (mode === 'matriks') {
    excelData = siswaList.map((item, index) => {
      const row = { No: index + 1, 'Nama Siswa': item.nama }
      tanggalList.forEach(tgl => { row[tgl] = item.absenByDate[tgl] || '-' })
      row['Hadir'] = item.hadir
      row['Sakit'] = item.sakit
      row['Izin'] = item.izin
      row['Alpa'] = item.alpa
      row['Persentase'] = item.total > 0 ? ((item.hadir / item.total) * 100).toFixed(1) + '%' : '0%'
      return row
    })
  } else {
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
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Absensi')

  const kelas = kelasSelect ? kelasSelect.value : 'Kelas'
  XLSX.writeFile(wb, `Rekap_Absensi_${kelas}.xlsx`)
})

// ==========================================
// 6. EVENT LISTENERS
// ==========================================
kelasSelect?.addEventListener('change', loadRekapAbsen)
bulanSelect?.addEventListener('change', loadRekapAbsen)
modeSelect?.addEventListener('change', renderMainTable)

document.addEventListener('DOMContentLoaded', () => {
  loadKelas()
})

document.querySelectorAll('[data-tab="tab-rekap-absensi"]').forEach(tabBtn => {
  tabBtn.addEventListener('click', () => {
    loadKelas()
  })
})