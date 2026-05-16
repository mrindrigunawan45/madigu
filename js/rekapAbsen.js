import { supabaseClient } from './supabase.js'

const kelasSelect =
  document.getElementById('rekap-absen-kelas')

const table =
  document.getElementById('rekap-absen-table')

const downloadBtn =
  document.getElementById('downloadAbsenBtn')

let absenData = []

// =========================
// LOAD KELAS
// =========================

async function loadKelas() {

  const { data, error } = await supabaseClient

    .from('siswa')

    .select('kelas')

  if (error) {

    console.error(error)

    return

  }

  const kelasUnik =
    [...new Set(data.map(item => item.kelas))]

  kelasSelect.innerHTML = ''

  kelasSelect.appendChild(
    new Option('Pilih Kelas', '')
  )

  kelasUnik.forEach(kelas => {

    kelasSelect.appendChild(

      new Option(
        kelas,
        kelas
      )

    )

  })

}

// =========================
// LOAD REKAP
// =========================

async function loadRekapAbsen() {

  if (!kelasSelect.value) return

  const { data, error } = await supabaseClient

    .from('jurnal')

    .select('*')

    .eq('kelas', kelasSelect.value)

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

        sakit: 0,

        izin: 0,

        alpa: 0,

        hadir: 0,

        total: 0

      }

    }

    grouped[item.nama].total++

    if (item.status === 'H')
      grouped[item.nama].hadir++

    if (item.status === 'S')
      grouped[item.nama].sakit++

    if (item.status === 'I')
      grouped[item.nama].izin++

    if (item.status === 'A')
      grouped[item.nama].alpa++

  })

  absenData =
    Object.values(grouped)

  renderTable()

}

// =========================
// RENDER TABLE
// =========================

function renderTable() {

  if (!absenData.length) {

    table.innerHTML = `

      <div class="empty-state">

        Tidak ada data absen

      </div>

    `

    return

  }

  table.innerHTML = `

    <div class="rekap-modern">

      ${absenData.map(item => {

        const persen =

          ((item.hadir / item.total) * 100)

          .toFixed(1)

        return `

          <div class="rekap-card">

            <!-- LEFT -->

            <div class="rekap-left">

              <div class="rekap-avatar">

                ${item.nama
                  .split(' ')
                  .map(n => n[0])
                  .slice(0,2)
                  .join('')}

              </div>

              <div class="rekap-user">

                <h3>${item.nama}</h3>

                <p>

                  Total Pertemuan:
                  ${item.total}

                </p>

              </div>

            </div>

            <!-- CENTER -->

            <div class="rekap-center">

              <!-- HADIR -->

              <div class="rekap-badge hadir">

                <i class="fa-solid fa-circle-check"></i>

                <div class="rekap-badge-content">

                  <span>H</span>

                  <strong>${item.hadir}</strong>

                </div>

              </div>

              <!-- SAKIT -->

              <div class="rekap-badge sakit">

                <i class="fa-regular fa-face-frown"></i>

                <div class="rekap-badge-content">

                  <span>S</span>

                  <strong>${item.sakit}</strong>

                </div>

              </div>

              <!-- IZIN -->

              <div class="rekap-badge izin">

                <i class="fa-solid fa-circle-info"></i>

                <div class="rekap-badge-content">

                  <span>I</span>

                  <strong>${item.izin}</strong>

                </div>

              </div>

              <!-- ALPA -->

              <div class="rekap-badge alpa">

                <i class="fa-regular fa-circle-xmark"></i>

                <div class="rekap-badge-content">

                  <span>A</span>

                  <strong>${item.alpa}</strong>

                </div>

              </div>

            </div>

            <!-- RIGHT -->

            <div class="rekap-right">

              <div
                class="persen-circle"
                style="--percent:${persen};"
              >

                <span>${persen}%</span>

              </div>

              <div class="rekap-label">

                Kehadiran

              </div>

            </div>

          </div>

        `

      }).join('')}

    </div>

  `

}

// =========================
// EVENT
// =========================

kelasSelect.addEventListener(
  'change',
  loadRekapAbsen
)

// =========================
// DOWNLOAD EXCEL
// =========================

downloadBtn.addEventListener('click', () => {

  if (!absenData.length) {

    alert('Data kosong')

    return

  }

  const exportData = absenData.map((item, index) => ({

    No: index + 1,

    Nama: item.nama,

    Hadir: item.hadir,

    Sakit: item.sakit,

    Izin: item.izin,

    Alpa: item.alpa,

    Kehadiran:

      ((item.hadir / item.total) * 100)

      .toFixed(1) + '%'

  }))

  const worksheet =
    XLSX.utils.json_to_sheet(exportData)

  const workbook =
    XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(

    workbook,

    worksheet,

    'Rekap Absen'

  )

  XLSX.writeFile(

    workbook,

    `Rekap_Absen_${kelasSelect.value}.xlsx`

  )

})

// =========================
// INIT
// =========================

loadKelas()