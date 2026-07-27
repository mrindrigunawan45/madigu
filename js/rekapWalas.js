import { supabaseClient } from './supabase.js'

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

const rekapKelasSelect = document.getElementById('rekap-walas-kelas')
const container = document.getElementById('rekap-walas-table')
const downloadBtn = document.getElementById('downloadWalasBtn')

let walasData = []

// =======================
// LOAD KELAS
// =======================
async function loadKelasWalas() {
  const schoolId = await getSchoolId()
  if (!schoolId) return

  const { data, error } = await supabaseClient
    .from('siswa')
    .select('kelas')
    .eq('school_id', schoolId)

  if (error) {
    console.error(error)
    return
  }

  const kelasUnik = [
    ...new Set(
      data
        .map(item => item.kelas)
        .filter(k => k && k.trim() !== '')
    )
  ]

  kelasUnik.sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  )

  rekapKelasSelect.innerHTML = '<option value="">Pilih Kelas</option>'

  kelasUnik.forEach(kelas => {
    rekapKelasSelect.appendChild(new Option(kelas, kelas))
  })
}

// =======================
// LOAD REKAP WALAS
// =======================
async function loadRekapWalas() {
  const kelas = rekapKelasSelect.value
  if (!kelas) {
    container.innerHTML = ''
    walasData = []
    return
  }

  const { data, error } = await supabaseClient
    .from('absen_walas')
    .select('*')
    .eq('kelas', kelas)

  if (error) {
    console.error(error)
    return
  }

  const grouped = {}

  data.forEach(item => {
    if (!item.nama) return

    if (!grouped[item.nama]) {
      grouped[item.nama] = {
        nama: item.nama,
        hadir: 0,
        sakit: 0,
        izin: 0,
        alpa: 0,
        total: 0
      }
    }

    grouped[item.nama].total++

    if (item.status === 'H') grouped[item.nama].hadir++
    if (item.status === 'S') grouped[item.nama].sakit++
    if (item.status === 'I') grouped[item.nama].izin++
    if (item.status === 'A') grouped[item.nama].alpa++
  })

  walasData = Object.values(grouped).sort((a, b) => a.nama.localeCompare(b.nama))

  renderRekapCards()
}

// =======================
// RENDER CARDS (MODERN UI)
// =======================
function renderRekapCards() {
  if (!walasData.length) {
    container.innerHTML = `
      <div class="empty-state">
        Belum ada data rekap absen walas untuk kelas ini
      </div>
    `
    return
  }

  container.innerHTML = `
    <div class="rekap-modern">
      ${walasData.map(item => {
        const persen = item.total > 0
          ? ((item.hadir / item.total) * 100).toFixed(1)
          : '0.0'

        const avatarText = item.nama
          .split(' ')
          .map(n => n[0])
          .slice(0, 2)
          .join('')

        return `
          <div class="rekap-card">
            <div class="rekap-left">
              <div class="rekap-avatar">
                ${avatarText}
              </div>
              <div class="rekap-user">
                <h3>${item.nama}</h3>
                <p>Total Pertemuan: ${item.total}</p>
              </div>
            </div>

            <div class="rekap-center">
              <div class="rekap-badge hadir">
                <div class="rekap-badge-content">
                  <span>H</span>
                  <strong>${item.hadir}</strong>
                </div>
              </div>

              <div class="rekap-badge sakit">
                <div class="rekap-badge-content">
                  <span>S</span>
                  <strong>${item.sakit}</strong>
                </div>
              </div>

              <div class="rekap-badge izin">
                <div class="rekap-badge-content">
                  <span>I</span>
                  <strong>${item.izin}</strong>
                </div>
              </div>

              <div class="rekap-badge alpa">
                <div class="rekap-badge-content">
                  <span>A</span>
                  <strong>${item.alpa}</strong>
                </div>
              </div>
            </div>

            <div class="rekap-right">
              <div class="persen-circle" style="--percent:${persen};">
                <span>${persen}%</span>
              </div>
            </div>
          </div>
        `
      }).join('')}
    </div>
  `
}

// =======================
// DOWNLOAD EXCEL
// =======================
downloadBtn?.addEventListener('click', () => {
  if (!walasData.length) {
    alert('Belum ada data absen walas')
    return
  }

  const excelData = walasData.map((item, index) => ({
    No: index + 1,
    'Nama Siswa': item.nama,
    Hadir: item.hadir,
    Sakit: item.sakit,
    Izin: item.izin,
    Alpa: item.alpa,
    'Total Pertemuan': item.total,
    Persentase: item.total > 0
      ? ((item.hadir / item.total) * 100).toFixed(1) + '%'
      : '0%'
  }))

  const ws = XLSX.utils.json_to_sheet(excelData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Walas')

  const kelas = rekapKelasSelect.value || 'Kelas'
  XLSX.writeFile(wb, `Rekap_Absen_Walas_${kelas}.xlsx`)
})

// =======================
// EVENT LISTENERS
// =======================
rekapKelasSelect?.addEventListener('change', loadRekapWalas)

// INIT
loadKelasWalas()