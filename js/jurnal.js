import { supabaseClient } from './supabase.js'

import {
  resetForm,
  clearElement
} from './utils.js'

const tanggal =
  document.getElementById('tanggal')

const kelasSelect =
  document.getElementById('kelas-jurnal')

const mapelSelect =
  document.getElementById('mapel-jurnal')

const siswaContainer =
  document.getElementById('list-siswa-jurnal')

const saveBtn =
  document.getElementById('saveJurnalBtn')

let siswaData = []

tanggal.value =
  new Date().toISOString().split('T')[0]

async function loadMapel() {

  const { data, error } = await supabaseClient

    .from('mata_pelajaran')

    .select('*')

  if (error) {

    console.error(error)

    return

  }

  mapelSelect.innerHTML = ''

  mapelSelect.appendChild(
    new Option('Pilih Mata Pelajaran', '')
  )

  data.forEach(item => {

    mapelSelect.appendChild(

      new Option(
        item.nama_mapel,
        item.nama_mapel
      )

    )

  })

}

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

kelasSelect.addEventListener('change', async () => {

  const kelas = kelasSelect.value

  if (!kelas) return

  const { data, error } = await supabaseClient

    .from('siswa')

    .select('*')

    .eq('kelas', kelas)

  if (error) {

    console.error(error)

    return

  }

  siswaData = data

  siswaContainer.innerHTML = ''

  data.forEach((item, index) => {

    siswaContainer.innerHTML += `

      <div class="siswa-card">

        <div class="siswa-info">

          <div class="siswa-avatar">

            ${item.nama_siswa
              .split(' ')
              .map(n => n[0])
              .slice(0,2)
              .join('')}

          </div>

          <div class="siswa-name">

            <h4>${item.nama_siswa}</h4>

          </div>

        </div>

        <div class="absen-modern">

          <label class="absen-card hadir">

            <input
              type="radio"
              name="absen-${index}"
              value="H"
              checked
            >

            <div class="absen-content">

              <div class="absen-icon">
                H
              </div>

              <span>Hadir</span>

            </div>

          </label>

          <label class="absen-card sakit">

            <input
              type="radio"
              name="absen-${index}"
              value="S"
            >

            <div class="absen-content">

              <div class="absen-icon">
                S
              </div>

              <span>Sakit</span>

            </div>

          </label>

          <label class="absen-card izin">

            <input
              type="radio"
              name="absen-${index}"
              value="I"
            >

            <div class="absen-content">

              <div class="absen-icon">
                I
              </div>

              <span>Izin</span>

            </div>

          </label>

          <label class="absen-card alpa">

            <input
              type="radio"
              name="absen-${index}"
              value="A"
            >

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

})

saveBtn.addEventListener('click', async () => {

  const {
    data: { user }
  } = await supabaseClient.auth.getUser()

  if (
    !tanggal.value ||
    !kelasSelect.value ||
    !mapelSelect.value
  ) {

    alert('Lengkapi data terlebih dahulu')

    return

  }

  const materi =
    document.getElementById('materi').value

  const payload = siswaData.map((item, index) => {

    const status = document.querySelector(

      `input[name="absen-${index}"]:checked`

    ).value

    return {

      user_id: user.id,

      tanggal: tanggal.value,

      kelas: kelasSelect.value,

      mapel: mapelSelect.value,

      materi: materi,

      nama: item.nama_siswa,

      status: status

    }

  })

  saveBtn.innerHTML =
    'Menyimpan...'

  saveBtn.disabled = true

  let error = null

  if (window.editJurnalId) {

    const { error: updateError } =
      await supabaseClient

        .from('jurnal')

        .update({

          tanggal: tanggal.value,

          kelas: kelasSelect.value,

          mapel: mapelSelect.value,

          materi: materi

        })

        .eq('id', window.editJurnalId)

    error = updateError

    window.editJurnalId = null

  } else {

    const result =
      await supabaseClient

        .from('jurnal')

        .insert(payload)

    error = result.error

  }

  saveBtn.innerHTML =
    'Simpan Jurnal'

  saveBtn.disabled = false

  if (error) {

    console.error(error)

    alert(error.message)

    return

  }

  alert('Jurnal berhasil disimpan')

  resetForm([
    'mapel-jurnal',
    'kelas-jurnal',
    'materi'
  ])

  clearElement('list-siswa-jurnal')

  siswaData = []

  tanggal.value =
    new Date().toISOString().split('T')[0]

})

loadMapel()

loadKelas()