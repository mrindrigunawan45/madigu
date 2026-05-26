import { supabaseClient } from './supabase.js'

const siswaSelect = document.getElementById('siswaSelect')
const kategoriSelect = document.getElementById('kategoriSelect')
const jenisContainer = document.getElementById('jenisContainer')
const lainnyaBox = document.getElementById('lainnyaBox')
const laporanLainnya = document.getElementById('laporanLainnya')
const catatan = document.getElementById('catatan')
const kirimBtn = document.getElementById('kirimBtn')

let currentJenis = null

async function loadSiswa() {

  const { data, error } = await supabaseClient
    .from('siswa')
    .select('*')
    .order('nama_siswa')

  if (error) {
    console.log(error)
    return
  }

  siswaSelect.innerHTML =
    '<option value=\"\">Pilih siswa</option>'

  data.forEach(item => {

    siswaSelect.innerHTML += `
      <option value="${item.id}">
        ${item.nama_siswa}
      </option>
    `
  })
}

async function loadKategori() {

  const { data, error } = await supabaseClient
    .from('kategori_laporan')
    .select('*')
    .order('nama')

  if (error) {
    console.log(error)
    return
  }

  data.forEach(item => {

    kategoriSelect.innerHTML += `
      <option value="${item.id}">
        ${item.nama}
      </option>
    `
  })
}

kategoriSelect.addEventListener('change', async () => {

  const kategoriId = kategoriSelect.value

  jenisContainer.innerHTML = ''

  const { data, error } = await supabaseClient
    .from('jenis_laporan')
    .select('*')
    .eq('kategori_id', kategoriId)

  if (error) {
    console.log(error)
    return
  }

  data.forEach(item => {

    jenisContainer.innerHTML += `
      <label class="radio-item">
        <input
          type="radio"
          name="jenis"
          value="${item.id}"
        />
        ${item.nama}
      </label>
    `
  })

  jenisContainer.innerHTML += `
    <label class="radio-item">
      <input
        type="radio"
        name="jenis"
        value="lainnya"
      />
      Lainnya
    </label>
  `

  document
    .querySelectorAll('input[name="jenis"]')
    .forEach(radio => {

      radio.addEventListener('change', () => {

        currentJenis = radio.value

        if (radio.value === 'lainnya') {
          lainnyaBox.classList.remove('hidden')
        } else {
          lainnyaBox.classList.add('hidden')
        }
      })
    })
})

kirimBtn.addEventListener('click', async () => {

  const siswaId = siswaSelect.value
  const kategoriId = kategoriSelect.value

  if (!siswaId || !kategoriId || !currentJenis) {
    alert('Lengkapi laporan terlebih dahulu')
    return
  }

  const {
    data: { user }
  } = await supabaseClient.auth.getUser()

  const payload = {
  siswa_id: siswaId,
  agen_id: user.id,
  kategori_id: kategoriId,
  catatan: catatan.value
}

  if (currentJenis === 'lainnya') {

    payload.laporan_lainnya =
      laporanLainnya.value

  } else {

    payload.jenis_laporan_id =
      currentJenis
  }

  const { error } = await supabaseClient
    .from('laporan')
    .insert(payload)

  if (error) {
    alert(error.message)
    return
  }

  alert('Laporan berhasil dikirim')

  location.reload()
})

loadSiswa()
loadKategori()