import { supabaseClient } from './supabase.js'

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

        <h4>${item.nama_siswa}</h4>

        <div class="absen-modern">

          <!-- HADIR -->

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

          <!-- SAKIT -->

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

          <!-- IZIN -->

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

          <!-- ALPA -->

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

  const { error } = await supabaseClient

    .from('jurnal')

    .insert(payload)

  saveBtn.innerHTML =
    'Simpan Jurnal'

  saveBtn.disabled = false

  if (error) {

    console.error(error)

    alert(error.message)

    return

  }

  alert('Jurnal berhasil disimpan')

})

loadMapel()

loadKelas()