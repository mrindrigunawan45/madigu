import { supabase } from './config.js'

import {
  loadCurrentUser,
  getCurrentUser
} from './session.js'

// ======================
// ELEMENT
// ======================

const absensiList =
  document.getElementById(
    'absensiList'
  )

const tanggalInput =
  document.getElementById(
    'tanggalAbsensi'
  )

const saveBtn =
  document.getElementById(
    'saveAbsensiBtn'
  )

const absensiContent =
  document.getElementById(
    'absensiContent'
  )

// ======================
// EMPTY STATE
// ======================

if (absensiList) {

  absensiList.innerHTML = `

    <div class="empty-state">

      <div class="empty-icon">
        📅
      </div>

      <h3>
        Pilih tanggal terlebih dahulu
      </h3>

      <p>
        Untuk mulai mengisi absensi siswa
      </p>

    </div>

  `

}

if (saveBtn) {

  saveBtn.style.display = 'none'

}

let siswaData = []

let isEditMode = false

let currentClass = null

// ======================
// DEFAULT TANGGAL
// ======================

if (tanggalInput) {

  tanggalInput.value = ''

}

// ======================
// LOAD SISWA
// ======================

async function loadSiswa() {

  if (!absensiList) return

  try {

    await loadCurrentUser()

    const currentUser =
      getCurrentUser()

    if (!currentUser) {

      alert('Session tidak ditemukan')

      return

    }

    currentClass =
      currentUser.kelas
    
    if (!currentClass) {

      alert(
        'Kelas guru belum diatur'
      )

      return

    }

    console.log(
      'CURRENT CLASS:',
      currentClass
    )

    const {
      data,
      error
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

    if (error) {

      console.error(error)

      return

    }

    siswaData =
      data || []

    renderSiswa()

  }

    catch (err) {

    console.error(err)

  }

}

// ======================
// RENDER SISWA
// ======================

function renderSiswa() {

  absensiList.innerHTML = ''

  siswaData.forEach(
    (item, index) => {

      const inisial =
        item.nama_siswa
          ?.split(' ')
          .map(x => x[0])
          .slice(0, 2)
          .join('')

      absensiList.innerHTML += `

        <div class="siswa-card status-hadir">

          <div class="siswa-info">

            <div class="siswa-avatar">

              ${inisial}

            </div>

            <div class="siswa-name">

              <h4>

                ${item.nama_siswa}

              </h4>

            </div>

          </div>

          <div class="absen-modern">

            <label class="absen-card hadir">

              <input
                type="radio"
                name="absen-${index}"
                value="Hadir"
                checked
              >

              <div class="absen-content">

                <div class="absen-icon">
                  H
                </div>

                <span>
                  Hadir
                </span>

              </div>

            </label>

            <label class="absen-card sakit">

              <input
                type="radio"
                name="absen-${index}"
                value="Sakit"
              >

              <div class="absen-content">

                <div class="absen-icon">
                  S
                </div>

                <span>
                  Sakit
                </span>

              </div>

            </label>

            <label class="absen-card izin">

              <input
                type="radio"
                name="absen-${index}"
                value="Izin"
              >

              <div class="absen-content">

                <div class="absen-icon">
                  I
                </div>

                <span>
                  Izin
                </span>

              </div>

            </label>

            <label class="absen-card alpa">

              <input
                type="radio"
                name="absen-${index}"
                value="Alpa"
              >

              <div class="absen-content">

                <div class="absen-icon">
                  A
                </div>

                <span>
                  Alpa
                </span>

              </div>

            </label>

          </div>

        </div>

      `
    }
  )
}

document.addEventListener(
  'change',
  e => {

    if (
      !e.target.matches(
        'input[type="radio"]'
      )
    ) return

    const card =
      e.target.closest(
        '.siswa-card'
      )

    if (!card) return

    card.classList.remove(
      'status-hadir',
      'status-sakit',
      'status-izin',
      'status-alpa'
    )

    const status =
      e.target.value.toLowerCase()

    card.classList.add(
      `status-${status}`
    )

  }
)

async function loadAbsensiByTanggal() {

  const tanggal =
    tanggalInput.value

  const { data, error } =
  await supabase

    .from('absensi')

    .select('*')

    .eq(
      'tanggal',
      tanggal
    )

    .in(
      'siswa_id',
      siswaData.map(
        x => x.id
      )
    )

  if (error) {

    console.error(error)

    return
  }

  if (!data || data.length === 0) {

    isEditMode = false

    saveBtn.innerHTML =
      'Simpan Absensi'

    renderSiswa()

    return
  }

  isEditMode = true

  saveBtn.innerHTML =
    'Update Absensi'

  renderSiswa()

  data.forEach(item => {

    const siswaIndex =
      siswaData.findIndex(
        s => s.id === item.siswa_id
      )

    if (siswaIndex === -1) return

    const radio =
      document.querySelector(
        `input[name="absen-${siswaIndex}"][value="${item.status}"]`
      )

    radio?.click()

  })

}

// ======================
// SIMPAN ABSENSI
// ======================

saveBtn?.addEventListener(
  'click',
  async () => {

    try {

      saveBtn.disabled = true

      saveBtn.innerHTML =
        'Menyimpan...'

      const tanggal =
        tanggalInput.value

      // CEK ABSENSI SUDAH ADA ATAU BELUM
      const { data: existing } =
        await supabase

          .from('absensi')

          .select('id')

          .eq(
            'tanggal',
            tanggal
          )

          .in(
            'siswa_id',
            siswaData.map(
              x => x.id
            )
          )

          .limit(1)

      if (
        existing &&
        existing.length > 0
      ) {

        alert(
          'Absensi tanggal ini sudah pernah disimpan'
        )

        saveBtn.disabled = false

        saveBtn.innerHTML =
          'Simpan Absensi'

        return
      }

      // BUAT PAYLOAD
      const payload =
        siswaData.map(
          (item, index) => {

            console.log(
              item.nama_siswa,
              item.class_id
            )
            const status =
              document
                .querySelector(
                  `input[name="absen-${index}"]:checked`
                )
                ?.value

            return {

              school_id:
                item.school_id,

              class_id:
                item.class_id,

              siswa_id:
                item.id,

              tanggal,

              status,

              keterangan: ''

            }

          }
        )

      console.log(
        'PAYLOAD ABSENSI:',
        payload
      )

      // SIMPAN KE DATABASE
     let error = null

        if (isEditMode) {

        await supabase
          .from('absensi')
          .delete()
          .eq(
            'tanggal',
            tanggal
          )
          .in(
            'siswa_id',
            siswaData.map(
              x => x.id
            )
          )

        const result =
            await supabase
            .from('absensi')
            .insert(payload)

        error = result.error

        } else {

        const result =
            await supabase
            .from('absensi')
            .insert(payload)

        error = result.error

        }

      if (error) {

        console.error(error)

        alert(
          error.message
        )

        saveBtn.disabled = false

        saveBtn.innerHTML =
          'Simpan Absensi'

        return
      }

      // SUKSES
      alert(
        'Absensi berhasil disimpan'
      )

      saveBtn.disabled = false

        saveBtn.innerHTML =
        isEditMode
            ? 'Update Absensi'
            : 'Simpan Absensi'

    } catch (err) {

      console.error(err)

      alert(
        'Terjadi kesalahan'
      )

      saveBtn.disabled = false

      saveBtn.innerHTML =
        'Simpan Absensi'

    }

  }
)

export function resetAbsensiPage() {

  if (tanggalInput) {

    tanggalInput.value = ''

  }

  if (absensiList) {

    absensiList.innerHTML = ''

  }

  if (absensiContent) {

    absensiContent.style.display =
      'none'

  }

  if (saveBtn) {

    saveBtn.style.display =
      'none'

    saveBtn.innerHTML =
      'Simpan Absensi'

  }

  siswaData = []

  isEditMode = false

}

window.resetAbsensiPage = function () {

  if (tanggalInput) {

    tanggalInput.value = ''

  }

  if (absensiList) {

    absensiList.innerHTML = ''

  }

  if (absensiContent) {

    absensiContent.style.display =
      'none'

  }

  if (saveBtn) {

    saveBtn.style.display =
      'none'

    saveBtn.innerHTML =
      'Simpan Absensi'

  }

  siswaData = []

  isEditMode = false

}

// ======================
// INIT
// ======================

tanggalInput?.addEventListener(
  'change',
  async () => {

    absensiContent.style.display =
      'block'

    saveBtn.style.display =
      'inline-block'

    await loadSiswa()

    await loadAbsensiByTanggal()

  }
)