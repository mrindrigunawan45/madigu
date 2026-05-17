import { supabaseClient } from './supabase.js'

const kelasSelect =
  document.getElementById('rekap-absen-kelas')

const table =
  document.getElementById('rekap-absen-table')

const downloadBtn =
  document.getElementById('downloadAbsenBtn')

let absenData = []

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

async function loadRekapAbsen() {

  const {
    data: { user }
  } = await supabaseClient.auth.getUser()

  if (!kelasSelect.value) return

  const { data, error } = await supabaseClient

    .from('jurnal')

    .select('*')

    .eq('user_id', user.id)

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

              <div
                class="persen-circle"
                style="--percent:${persen};"
              >

                <span>${persen}%</span>

              </div>

            </div>

          </div>

        `

      }).join('')}

    </div>

  `

}

kelasSelect.addEventListener(
  'change',
  loadRekapAbsen
)

loadKelas()