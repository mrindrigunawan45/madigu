import { supabaseClient } from './supabase.js'

// =========================
// ELEMENT
// =========================

const siswaSelect =
  document.getElementById('siswaSelect')

const kategoriSelect =
  document.getElementById('kategoriSelect')

const jenisContainer =
  document.getElementById('jenisContainer')

const lainnyaBox =
  document.getElementById('lainnyaBox')

const laporanLainnya =
  document.getElementById('laporanLainnya')

const catatan =
  document.getElementById('catatan')

const kirimBtn =
  document.getElementById('kirimBtn')

let currentJenis = null

// =========================
// LOAD SISWA
// =========================

async function loadSiswa() {

  const {
    data: { user }
  } =
  await supabaseClient.auth.getUser()

  // AMBIL PROFILE AGEN
  const {
    data: profile,
    error: profileError
  } =
  await supabaseClient

    .from('profiles')

    .select('class_id')

    .eq('id', user.id)

    .single()

  if (profileError) {

    console.log(profileError)

    return
  }

  // AMBIL SISWA SESUAI KELAS
  const {
    data,
    error
  } =
  await supabaseClient

    .from('siswa')

    .select('*')

    .eq('class_id', profile.class_id)

    .order('nama_siswa')

  if (error) {

    console.log(error)

    return
  }

  siswaSelect.innerHTML = `
    <option value="">
      Pilih siswa
    </option>
  `

  data.forEach(item => {

    siswaSelect.innerHTML += `
      <option value="${item.id}">
        ${item.nama_siswa}
      </option>
    `
  })
}

// =========================
// LOAD KATEGORI
// =========================

async function loadKategori() {

  const {
    data,
    error
  } =
  await supabaseClient

    .from('kategori_laporan')

    .select('*')

    .order('nama')

  if (error) {

    console.log(error)

    return
  }

  kategoriSelect.innerHTML = `
    <option value="">
      Pilih kategori
    </option>
  `

  data.forEach(item => {

    kategoriSelect.innerHTML += `
      <option value="${item.id}">
        ${item.nama}
      </option>
    `
  })
}

// =========================
// LOAD JENIS LAPORAN
// =========================

async function loadJenisLaporan(kategoriId) {

  jenisContainer.innerHTML = `
    <div class="loading-text">
      Memuat jenis laporan...
    </div>
  `

  currentJenis = null

  lainnyaBox.classList.add('hidden')

  // QUERY
  const {
    data,
    error
  } =
  await supabaseClient

    .from('jenis_laporan')

    .select('*')

    .eq(
      'kategori_id',
      Number(kategoriId)
    )

    .order('nama')

  console.log('JENIS:', data)

  if (error) {

    console.log(error)

    jenisContainer.innerHTML = `
      <div class="error-text">
        Gagal memuat jenis laporan
      </div>
    `

    return
  }

  // KOSONG
  if (!data || data.length === 0) {

    jenisContainer.innerHTML = `
      <div class="error-text">
        Tidak ada jenis laporan
      </div>
    `

    return
  }

  // RESET
  jenisContainer.innerHTML = ''

  // RENDER
  data.forEach(item => {

    jenisContainer.innerHTML += `

      <label class="radio-item">

        <input
          type="radio"
          name="jenis"
          value="${item.id}"
        >

        <span>
          ${item.nama}
        </span>

      </label>
    `
  })

  // LAINNYA
  jenisContainer.innerHTML += `

    <label class="radio-item">

      <input
        type="radio"
        name="jenis"
        value="lainnya"
      >

      <span>
        Lainnya
      </span>

    </label>
  `

  // EVENT RADIO
  document

    .querySelectorAll(
      'input[name="jenis"]'
    )

    .forEach(radio => {

      radio.addEventListener(
        'change',
        () => {

          currentJenis =
            radio.value

          if (
            radio.value === 'lainnya'
          ) {

            lainnyaBox.classList.remove(
              'hidden'
            )

          } else {

            lainnyaBox.classList.add(
              'hidden'
            )
          }
        }
      )
    })
}

// =========================
// EVENT KATEGORI
// =========================

kategoriSelect.addEventListener(
  'change',
  async () => {

    const kategoriId =
      kategoriSelect.value

    console.log(
      'KATEGORI:',
      kategoriId
    )

    if (!kategoriId) {

      jenisContainer.innerHTML = ''

      return
    }

    await loadJenisLaporan(
      kategoriId
    )
  }
)

// =========================
// KIRIM LAPORAN
// =========================

kirimBtn.addEventListener(
  'click',
  async () => {

    const siswaId =
      siswaSelect.value

    const kategoriId =
      kategoriSelect.value

    if (
      !siswaId ||
      !kategoriId ||
      !currentJenis
    ) {

      alert(
        'Lengkapi laporan terlebih dahulu'
      )

      return
    }

    const {
      data: { user }
    } =
    await supabaseClient.auth.getUser()
    
    const {
      data: profileData
    } =
    await supabaseClient

      .from('profiles')

      .select('school_id')

      .eq('id', user.id)

      .single()
        
      const payload = {

      siswa_id:
        siswaId,

      agen_id:
        user.id,

      kategori_id:
        kategoriId,

      school_id:
        profileData?.school_id,

      catatan:
        catatan.value
    }

    // JENIS
    if (
      currentJenis === 'lainnya'
    ) {

      payload.laporan_lainnya =
        laporanLainnya.value

    } else {

      payload.jenis_laporan_id =
        currentJenis
    }

    // INSERT
    const { error } =
      await supabaseClient

        .from('laporan')

        .insert(payload)

    if (error) {

      console.log(error)

      alert(error.message)

      return
    }

    // =========================
    // TELEGRAM NOTIFICATION
    // =========================

    try {

  // AMBIL DATA SISWA
  const {
    data:siswaData
  } =
  await supabaseClient

    .from('siswa')

    .select('*')

    .eq('id', siswaId)

    .single()

  // AMBIL KATEGORI
  const {
    data:kategoriData
  } =
  await supabaseClient

    .from('kategori_laporan')

    .select('*')

    .eq('id', kategoriId)

    .single()

  // AMBIL JENIS
  let jenisNama = 'Lainnya'

  if(currentJenis !== 'lainnya'){

    const {
      data:jenisData
    } =
    await supabaseClient

      .from('jenis_laporan')

      .select('*')

      .eq('id', currentJenis)

      .single()

    jenisNama =
      jenisData?.nama || '-'
  }

  // AMBIL SCHOOL ID
  const {
    data:profileData
  } =
  await supabaseClient

    .from('profiles')

    .select('school_id')

    .eq('id', user.id)

    .single()

  // HIT EDGE FUNCTION
  await fetch(

    'https://ocakjidyndcojeapdsop.functions.supabase.co/telegram-bk',

    {

      method:'POST',

      headers:{
        'Content-Type':
        'application/json'
      },

      body:JSON.stringify({

      school_id:
        profileData?.school_id,

      nama_siswa:
        siswaData?.nama_siswa,

      kelas:
        siswaData?.kelas,

      kategori:
        kategoriData?.nama,

      jenis:
        jenisNama,

      laporan_lainnya:
        laporanLainnya.value,

      catatan:
        catatan.value
    })
    
  }
)

}catch(err){

  console.log(
    'Telegram Error:',
    err
  )
}

    // SUCCESS
    alert(
      'Laporan berhasil dikirim'
    )

    location.reload()
  }
)

// =========================
// INIT
// =========================

window.addEventListener(
  'DOMContentLoaded',
  async () => {

    console.log(
      'LAPOR ACTIVE'
    )

    await loadSiswa()

    await loadKategori()
  }
)

// =========================
// LOGOUT
// =========================

const logoutBtn =
  document.getElementById(
    'logoutBtn'
  )

logoutBtn.addEventListener(
  'click',
  async () => {

    const confirmLogout =
      confirm(
        'Yakin ingin logout?'
      )

    if (!confirmLogout) return

    await supabaseClient.auth.signOut()

    window.location.href =
      'index.html'
  }
)