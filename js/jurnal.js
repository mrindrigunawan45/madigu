import { supabaseClient } from './supabase.js'

// =========================
// USER LOGIN
// =========================

const sessionData =

  JSON.parse(
    localStorage.getItem('session')
  )

const userLogin =

  sessionData?.email ||

  sessionData?.username ||

  'unknown-user'

// =========================
// ELEMENT
// =========================

const tanggalInput =
  document.getElementById('tanggal')

const mapelSelect =
  document.getElementById('mapel-jurnal')

const kelasSelect =
  document.getElementById('kelas-jurnal')

const listSiswa =
  document.getElementById('list-siswa-jurnal')

const saveBtn =
  document.getElementById('saveJurnalBtn')

// =========================
// LOAD MAPEL
// =========================

async function loadMapel() {

  const { data, error } =

    await supabaseClient

      .from('mata_pelajaran')

      .select('*')

  if (error) {

    console.error(error)

    return

  }

  mapelSelect.innerHTML = `

    <option value="">
      Pilih Mata Pelajaran
    </option>

  `

  data.forEach(item => {

    mapelSelect.innerHTML += `

      <option value="${item.nama_mapel}">

        ${item.nama_mapel}

      </option>

    `

  })

}

// =========================
// LOAD KELAS
// =========================

async function loadKelas() {

  const { data, error } =

    await supabaseClient

      .from('siswa')

      .select('kelas')

  if (error) {

    console.error(error)

    return

  }

  const kelasUnik =

    [...new Set(
      data.map(item => item.kelas)
    )]

  kelasSelect.innerHTML = `

    <option value="">
      Pilih Kelas
    </option>

  `

  kelasUnik.forEach(kelas => {

    kelasSelect.innerHTML += `

      <option value="${kelas}">

        ${kelas}

      </option>

    `

  })

}

// =========================
// LOAD SISWA
// =========================

async function loadSiswa() {

  const kelas = kelasSelect.value

  if (!kelas) return

  const { data, error } =

    await supabaseClient

      .from('siswa')

      .select('*')

      .eq('kelas', kelas)

      .order('nama_siswa')

  if (error) {

    console.error(error)

    return

  }

  listSiswa.innerHTML = ''

  data.forEach(item => {

    const initials =

      item.nama_siswa

        .split(' ')

        .map(n => n[0])

        .slice(0,2)

        .join('')

    listSiswa.innerHTML += `

      <div class="siswa-card">

        <!-- LEFT -->

        <div class="siswa-info">

          <div class="siswa-avatar">

            ${initials}

          </div>

          <div class="siswa-name">

            <h4>

              ${item.nama_siswa}

            </h4>

          </div>

        </div>

        <!-- RIGHT -->

        <div class="absen-modern">

          <!-- HADIR -->

          <label class="absen-card hadir">

            <input
              type="radio"
              name="status-${item.id}"
              value="H"
              checked
            />

            <div class="absen-content">

              <div class="absen-icon">

                H

              </div>

              <span>Hadir</span>

            </div>

          </label>

          <!-- SAKIT -->

          <label class="absen-card sakit">

            <input
              type="radio"
              name="status-${item.id}"
              value="S"
            />

            <div class="absen-content">

              <div class="absen-icon">

                S

              </div>

              <span>Sakit</span>

            </div>

          </label>

          <!-- IZIN -->

          <label class="absen-card izin">

            <input
              type="radio"
              name="status-${item.id}"
              value="I"
            />

            <div class="absen-content">

              <div class="absen-icon">

                I

              </div>

              <span>Izin</span>

            </div>

          </label>

          <!-- ALPA -->

          <label class="absen-card alpa">

            <input
              type="radio"
              name="status-${item.id}"
              value="A"
            />

            <div class="absen-content">

              <div class="absen-icon">

                A

              </div>

              <span>Alpa</span>

            </div>

          </label>

        </div>

      </div>

    `

  })

}

// =========================
// SAVE JURNAL
// =========================

async function saveJurnal() {

  const tanggal =
    tanggalInput.value

  const mapel =
    mapelSelect.value

  const kelas =
    kelasSelect.value

  const materi =
    document
      .getElementById('materi')
      .value

  if (
    !tanggal ||
    !mapel ||
    !kelas
  ) {

    alert(
      'Lengkapi data terlebih dahulu'
    )

    return

  }

  const { data: siswaData } =

    await supabaseClient

      .from('siswa')

      .select('*')

      .eq('kelas', kelas)

  for (const siswa of siswaData) {

    const status =

      document.querySelector(

        `input[name="status-${siswa.id}"]:checked`

      )?.value || 'H'

    const { error } =

      await supabaseClient

        .from('jurnal')

        .insert({

          tanggal,
          kelas,
          mapel,
          nama: siswa.nama_siswa,
          status,
          materi,

          // MULTI USER

          created_by:
            userLogin

        })

    if (error) {

      console.error(error)

    }

  }

  alert(
    'Jurnal berhasil disimpan'
  )

}

// =========================
// EVENT
// =========================

kelasSelect.addEventListener(
  'change',
  loadSiswa
)

saveBtn.addEventListener(
  'click',
  saveJurnal
)

// =========================
// INIT
// =========================

loadMapel()
loadKelas()