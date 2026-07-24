import { supabase } from './config.js'
import { getCurrentClass } from './auth-sd.js'

console.log('Rekap Absensi SD Loaded')

const container =
  document.getElementById(
    'rekapAbsensiContainer'
  )

let currentClass = null

if (container) {

  initRekap()

}

// ======================
// INIT
// ======================

async function initRekap() {

  currentClass =
    await getCurrentClass()

  if (!currentClass) {

    container.innerHTML = `

      <div class="empty-state">

        Kelas guru belum diatur

      </div>

    `

    return

  }

  container.innerHTML = `

    <div class="rekap-card">

      <h3>

        Rekap Absensi Kelas
        ${currentClass.nama_kelas}

      </h3>

      <div class="rekap-filter">

        <div class="filter-item">

          <label>

            Mode Rekap

          </label>

          <div class="mode-wrap">

            <label>

              <input
                type="radio"
                name="modeRekap"
                value="bulanan"
                checked
              >

              Bulanan

            </label>

            <label>

              <input
                type="radio"
                name="modeRekap"
                value="semester"
              >

              Semesteran

            </label>

          </div>

        </div>

        <div
          id="bulananFilter"
          class="filter-item"
        >

          <label>Bulan</label>

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

          <label>Tahun</label>

          <input
            type="number"
            id="tahunRekap"
          >

        </div>

        <div
          id="semesterFilter"
          class="filter-item"
          style="display:none"
        >

          <label>Semester</label>

          <select id="semesterRekap">

          </select>

        </div>

        <button
          id="btnLoadRekap"
        >

          Tampilkan Rekap

        </button>

      </div>

      <div id="rekapResult">

      </div>

    </div>

  `

  const now = new Date()

  document.getElementById(
    'bulanRekap'
  ).value =
    now.getMonth() + 1

  document.getElementById(
    'tahunRekap'
  ).value =
    now.getFullYear()

  setupEvents()

  await loadSemester()

}

// ======================
// EVENTS
// ======================

function setupEvents() {

  document
    .querySelectorAll(
      'input[name="modeRekap"]'
    )
    .forEach(radio => {

      radio.addEventListener(
        'change',
        toggleMode
      )

    })

  document
    .getElementById(
      'btnLoadRekap'
    )
    ?.addEventListener(
      'click',
      loadRekap
    )

}

function toggleMode() {

  const mode =
    document.querySelector(
      'input[name="modeRekap"]:checked'
    )?.value

  document.getElementById(
    'bulananFilter'
  ).style.display =
    mode === 'bulanan'
      ? 'block'
      : 'none'

  document.getElementById(
    'semesterFilter'
  ).style.display =
    mode === 'semester'
      ? 'block'
      : 'none'

}

// ======================
// LOAD SEMESTER
// ======================

async function loadSemester() {

  const select =
    document.getElementById(
      'semesterRekap'
    )

  const {
    data,
    error
  } = await supabase

    .from('semester')
    .select('*')
    .order(
      'created_at',
      {
        ascending: false
      }
    )

  if (error) {

    console.error(error)

    return

  }

  select.innerHTML = ''

  data.forEach(item => {

    select.innerHTML += `

      <option value="${item.id}">

        ${item.nama_semester}
        -
        ${item.tahun_ajaran}

      </option>

    `

  })

}

// ======================
// LOAD REKAP
// ======================

async function loadRekap() {

  const result =
    document.getElementById(
      'rekapResult'
    )

  result.innerHTML = `

    <div class="empty-state">

      Memuat data...

    </div>

  `

  try {

    const mode =
      document.querySelector(
        'input[name="modeRekap"]:checked'
      )?.value

    let startDate
    let endDate

    if (mode === 'bulanan') {

      const bulan =
        parseInt(
          document.getElementById(
            'bulanRekap'
          ).value
        )

      const tahun =
        parseInt(
          document.getElementById(
            'tahunRekap'
          ).value
        )

      startDate =
        `${tahun}-${String(
          bulan
        ).padStart(2, '0')}-01`

      endDate =
        new Date(
          tahun,
          bulan,
          0
        )
          .toISOString()
          .split('T')[0]

    } else {

      const semesterId =
        document.getElementById(
          'semesterRekap'
        ).value

      const {
        data: semester
      } = await supabase

        .from('semester')

        .select('*')

        .eq(
          'school_id',
          CURRENT_CLASS.school_id
        )

        .eq(
          'is_active',
          true
        )

        .limit(1);

      startDate =
        semester.tanggal_mulai

      endDate =
        semester.tanggal_selesai

    }

    const {
      data: siswa,
      error: siswaError
    } = await supabase

      .from('siswa')
      .select('*')
      .eq(
        'class_id',
        currentClass.id
      )
      .order(
        'nama_siswa'
      )

    if (siswaError)
      throw siswaError

    const {
      data: absensi,
      error: absensiError
    } = await supabase

      .from('absensi')
      .select('*')
      .eq(
        'class_id',
        currentClass.id
      )
      .gte(
        'tanggal',
        startDate
      )
      .lte(
        'tanggal',
        endDate
      )

    if (absensiError)
      throw absensiError

    renderTable(
      siswa,
      absensi
    )

  }

  catch (err) {

    console.error(err)

    result.innerHTML = `

      <div class="empty-state">

        Gagal memuat data

      </div>

    `

  }

}

// ======================
// TABLE
// ======================

function renderTable(
  siswa,
  absensi
) {

  const result =
    document.getElementById(
      'rekapResult'
    )

  if (
    !siswa ||
    siswa.length === 0
  ) {

    result.innerHTML = `

      <div class="empty-state">

        Tidak ada siswa

      </div>

    `

    return

  }

  let html = `

    <div class="table-responsive">

      <table class="rekap-table">

        <thead>

          <tr>

            <th>Nama Siswa</th>
            <th>H</th>
            <th>S</th>
            <th>I</th>
            <th>A</th>
            <th>%</th>

          </tr>

        </thead>

        <tbody>

  `

  siswa.forEach(item => {

    const data =
      absensi.filter(
        x =>
          x.siswa_id === item.id
      )

    const hadir =
      data.filter(
        x =>
          x.status === 'Hadir'
      ).length

    const sakit =
      data.filter(
        x =>
          x.status === 'Sakit'
      ).length

    const izin =
      data.filter(
        x =>
          x.status === 'Izin'
      ).length

    const alpa =
      data.filter(
        x =>
          x.status === 'Alpa'
      ).length

    const total =
      hadir +
      sakit +
      izin +
      alpa

    const persen =
      total === 0
        ? 0
        : Math.round(
            (
              hadir /
              total
            ) * 100
          )

    html += `

      <tr>

        <td>${item.nama_siswa}</td>
        <td>${hadir}</td>
        <td>${sakit}</td>
        <td>${izin}</td>
        <td>${alpa}</td>
        <td>${persen}%</td>

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