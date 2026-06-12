import { supabase } from './config.js'

async function getSchoolId(){

  const {
    data:{session}
  } = await supabase.auth.getSession()

  if(!session) return null

  const { data } =
    await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', session.user.id)
      .single()

  return data?.school_id || null
}

const jurnalList =
  document.getElementById('jurnalList')

const todayOnly =
  document.getElementById('todayOnly')

const monthCount =
  document.getElementById('monthCount')

const searchInput =
  document.getElementById('searchInput')

let allData = []

let currentLimit = 20

// ====================
// MOBILE SIDEBAR
// ====================

const menuBtn =
  document.getElementById('menuBtn')

const sidebar =
  document.getElementById('sidebar')

const overlay =
  document.getElementById('overlay')

menuBtn?.addEventListener(
  'click',
  ()=>{

    sidebar.classList.add('show')

    overlay.classList.add('show')
  }
)

overlay?.addEventListener(
  'click',
  ()=>{

    sidebar.classList.remove('show')

    overlay.classList.remove('show')
  }
)

// ====================
// MENU
// ====================

document
.querySelectorAll('.menu')

.forEach(menu=>{

  menu.addEventListener(
    'click',
    e=>{

      e.preventDefault()

      // ACTIVE MENU
      document
      .querySelectorAll('.menu')
      .forEach(x=>
        x.classList.remove('active')
      )

      menu.classList.add('active')
      // ====================
// RESET JURNAL
// ====================

if(menu.dataset.page === 'jurnal'){

  searchInput.value = ''

  currentLimit = 20

  renderJurnal(allData)

  jurnalList.scrollTop = 0
}

// ====================
// RESET REKAP
// ====================

if(menu.dataset.page === 'rekap'){

  const kelasSelect =
    document.getElementById(
      'kelasSelect'
    )

  const rekapBody =
    document.getElementById(
      'rekapBody'
    )

  kelasSelect.selectedIndex = 0

  rekapBody.innerHTML = `

    <tr>

      <td colspan="4">

        <div class="empty-state">

          <div class="empty-icon">
            📊
          </div>

          <h3>

            Pilih kelas terlebih dahulu

          </h3>

        </div>

      </td>

    </tr>
  `
}
      // HIDE ALL PAGE
      document
      .querySelectorAll('main section')
      .forEach(x=>
        x.classList.add('hidden')
      )

      
      // SHOW PAGE
      document
      .getElementById(
        menu.dataset.page + 'Page'
      )
      .classList.remove('hidden')

      // CLOSE MOBILE
      sidebar.classList.remove('show')

      overlay.classList.remove('show')
    }
  )
})

// ====================
// AUTH
// ====================

async function checkAuth(){

  const {
    data:{session}
  } = await supabase.auth.getSession()

  if(!session){

    location.href='index.html'

    return
  }

  loadData()
}

checkAuth()

// ====================
// LOAD DATA
// ====================

async function loadData(){

  const schoolId =
      await getSchoolId()
  
  console.log(
    'BK SCHOOL ID:',
    schoolId
  )
  
  const laporanRes =
    await supabase
    .from('laporan')
    .select('*')
    .eq('school_id', schoolId)
    .order(
      'created_at',
      {
        ascending:false
      }
    )

    const siswaRes =
      await supabase
        .from('siswa')
        .select('*')
        .eq('school_id', schoolId)

  const kategoriRes =
    await supabase
    .from('kategori_laporan')
    .select('*')

  const jenisRes =
    await supabase
    .from('jenis_laporan')
    .select('*')

  const laporan =
    laporanRes.data || []

  const siswa =
    siswaRes.data || []

  const kategori =
    kategoriRes.data || []

  const jenis =
    jenisRes.data || []

  const merged =
    laporan.map(item => {

      const siswaData =
        siswa.find(
          s => s.id == item.siswa_id
        )

      const kategoriData =
        kategori.find(
          k => k.id == item.kategori_id
        )

      const jenisData =
        jenis.find(
          j => j.id == item.jenis_laporan_id
        )

      return {

        ...item,

        siswa:siswaData,

        kategori:kategoriData,

        jenis:jenisData
      }
    })

  allData = merged

  renderDashboard(merged)

  renderJurnal(merged)

  loadKelas()
}

// ====================
// DASHBOARD
// ====================

function renderDashboard(data){

  const today =
    new Date().toDateString()

  const currentMonth =
    new Date().getMonth()

  const currentYear =
    new Date().getFullYear()

  const monthlyData =
    data.filter(item => {

      const d =
        new Date(item.created_at)

      return (

        d.getMonth() === currentMonth &&

        d.getFullYear() === currentYear
      )
    })

  monthCount.textContent =
    monthlyData.length

  todayOnly.textContent =
    data.filter(item =>

      new Date(
        item.created_at
      ).toDateString() === today

    ).length
}

// ====================
// JURNAL
// ====================

function renderJurnal(data){

  jurnalList.innerHTML=''

  if(data.length===0){

    jurnalList.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          📭
        </div>

        <h3>
          Belum Ada Laporan
        </h3>

      </div>
    `

    return
  }

  data

  .slice(0,currentLimit)

  .forEach(item => {

    jurnalList.innerHTML +=
      createCard(item)
  })
}

// ====================
// CARD
// ====================

function createCard(item){

  return `

    <div class="laporan-card">

      <div class="jurnal-top">

        <div>

          <div class="jurnal-name">

            ${item.siswa?.nama_siswa || '-'}

          </div>

          <div class="jurnal-class">

            Kelas
            ${item.siswa?.kelas || '-'}
          </div>

        </div>

        <div class="total-mini">

          1 laporan

        </div>

      </div>

      <div class="badge-row">

        <span class="badge blue">

          ${item.kategori?.nama || '-'}

        </span>

        <span class="badge orange">

          ${item.jenis?.nama || '-'}

        </span>

      </div>

      <div class="jurnal-note">

        ${item.catatan || '-'}

      </div>

      <div class="jurnal-bottom">

        <div class="jurnal-time">

          🕒
          ${new Date(
            item.created_at
          ).toLocaleString('id-ID')}

        </div>

        <button
          class="detail-btn"
          onclick="showDetail(${item.id})"
        >

          Detail

        </button>

      </div>

    </div>
  `
}

// ====================
// SEARCH HISTORI SISWA
// ====================

searchInput?.addEventListener(
  'input',
  filterData
)

function filterData(){

  const keyword =
    searchInput.value
    .trim()
    .toLowerCase()

  // NORMAL MODE

  if(!keyword){

    currentLimit = 20

    renderJurnal(allData)

    return
  }

  // FILTER

  const filtered =
    allData.filter(item =>

      item.siswa?.nama_siswa

      ?.toLowerCase()

      .includes(keyword)
    )

  // GROUP

  const grouped = {}

  filtered.forEach(item => {

    const nama =
      item.siswa?.nama_siswa || '-'

    if(!grouped[nama]){

      grouped[nama] = []
    }

    grouped[nama].push(item)
  })

  jurnalList.innerHTML=''

  Object.keys(grouped)

  .forEach(nama => {

    const siswaData =
      grouped[nama]

    const siswa =
      siswaData[0]

    jurnalList.innerHTML += `

      <div class="laporan-card">

        <div class="jurnal-header">

          <div class="jurnal-title">

            <h4>

              👤 ${nama}

            </h4>

            <div class="jurnal-student">

              🏫
              ${siswa.siswa?.kelas || '-'}

            </div>

          </div>

          <span class="badge blue">

            ${siswaData.length}
            laporan

          </span>

        </div>

        <div class="catatan-box">

          ${siswaData.map(item => `

            <div style="margin-bottom:16px;">

              <strong>

                ${item.jenis?.nama || '-'}

              </strong>

              <br>

              <small>

                ${item.kategori?.nama || '-'}

              </small>

              <br><br>

              ${item.catatan || '-'}

              <br><br>

              <small class="time">

                ${new Date(
                  item.created_at
                ).toLocaleString('id-ID')}

              </small>

            </div>

          `).join('')}

        </div>

      </div>
    `
  })
}

// ====================
// LOAD MORE
// ====================

document

.getElementById('loadMoreBtn')

?.addEventListener(
  'click',
  ()=>{

    currentLimit += 20

    renderJurnal(allData)
  }
)

// ====================
// DETAIL MODAL
// ====================

window.showDetail = id => {

  const item =
    allData.find(
      x => x.id == id
    )

  if(!item) return

  document
  .getElementById('detailModal')
  .classList.remove('hidden')

  document
  .getElementById('modalBody')
  .innerHTML = `

    <div class="detail-group">

      <div class="detail-label">
        Nama Siswa
      </div>

      <div class="detail-value">

        ${item.siswa?.nama_siswa || '-'}

      </div>

    </div>

    <div class="detail-group">

      <div class="detail-label">
        Kelas
      </div>

      <div class="detail-value">

        ${item.siswa?.kelas || '-'}

      </div>

    </div>

    <div class="detail-group">

      <div class="detail-label">
        Jenis Laporan
      </div>

      <div class="detail-value">

        ${item.jenis?.nama || '-'}

      </div>

    </div>

    <div class="detail-group">

      <div class="detail-label">
        Kategori
      </div>

      <div class="detail-value">

        ${item.kategori?.nama || '-'}

      </div>

    </div>

    <div class="detail-group">

      <div class="detail-label">
        Catatan
      </div>

      <div class="detail-value">

        ${item.catatan || '-'}

      </div>

    </div>

    <div class="detail-group">

      <div class="detail-label">
        Waktu
      </div>

      <div class="detail-value">

        ${new Date(
          item.created_at
        ).toLocaleString('id-ID')}

      </div>

    </div>
  `
}

// ====================
// CLOSE MODAL
// ====================

document

.getElementById('closeModal')

?.addEventListener(
  'click',
  ()=>{

    document
    .getElementById('detailModal')
    .classList.add('hidden')
  }
)

// ====================
// LOAD KELAS
// ====================

async function loadKelas(){

  const kelasSelect =
    document.getElementById(
      'kelasSelect'
    )

  kelasSelect.innerHTML = `
    <option value="">
      Pilih Kelas
    </option>
  `

  const schoolId =
  await getSchoolId()

console.log(
  'BK SCHOOL ID:',
  schoolId
)

const { data } =
  await supabase
    .from('siswa')
    .select('kelas')
    .eq('school_id', schoolId)

  const unique =
  [...new Set(
    data.map(x=>x.kelas)
  )]

  .sort((a,b)=>
    a.localeCompare(
      b,
      undefined,
      {
        numeric:true
      }
    )
  )

  unique.forEach(kelas => {

    kelasSelect.innerHTML += `
      <option value="${kelas}">
        ${kelas}
      </option>
    `
  })
}

// ====================
// REKAP
// ====================

// ====================
// REKAP TABLE FINAL FIX
// ====================

document

.getElementById('kelasSelect')

?.addEventListener(
  'change',
  async e=>{

    const kelas =
      e.target.value

    const rekapBody =
      document.getElementById(
        'rekapBody'
      )

    rekapBody.innerHTML=''

    // ====================
    // JIKA BELUM PILIH
    // ====================

    if(!kelas){

      rekapBody.innerHTML=''

      return
    }

    // ====================
    // AMBIL SEMUA SISWA
    // ====================

    const schoolId =
      await getSchoolId()

    const { data:siswaData } =
      await supabase
        .from('siswa')
        .select('*')
        .eq('school_id', schoolId)
        .eq('kelas', kelas)

        .order(
          'nama_siswa',
          {
            ascending:true
          }
        )

    // ====================
    // JIKA TIDAK ADA SISWA
    // ====================

    if(
      !siswaData ||
      siswaData.length===0
    ){

      rekapBody.innerHTML = `

        <tr>

          <td colspan="4">

            <div class="empty-state">

              <div class="empty-icon">
                📂
              </div>

              <h3>
                Tidak Ada Data Siswa
              </h3>

            </div>

          </td>

        </tr>
      `

      return
    }

    // ====================
    // LOOP SISWA
    // ====================

    siswaData.forEach(siswa => {

      // ====================
      // FILTER LAPORAN SISWA
      // ====================

      const laporanSiswa =

        allData.filter(item =>

          String(item.siswa?.id)

          ===

          String(siswa.id)
        )

      // ====================
      // TOTAL
      // ====================

      const total =
        laporanSiswa.length

      // ====================
      // TERAKHIR
      // ====================

      const terakhir =
        laporanSiswa[0]

      // ====================
      // HITUNG DOMINAN
      // ====================

      const kategoriCount = {}

      laporanSiswa.forEach(item => {

        const namaKategori =
          item.kategori?.nama || '-'

        kategoriCount[namaKategori] =
          (kategoriCount[namaKategori] || 0) + 1
      })

      // ====================
      // CARI TERBANYAK
      // ====================

      let dominan = '-'

      let max = 0

      Object.keys(kategoriCount)

      .forEach(kategori => {

        if(
          kategoriCount[kategori] > max
        ){

          max =
            kategoriCount[kategori]

          dominan =
            kategori
        }
      })

      // ====================
      // RENDER ROW
      // ====================

      rekapBody.innerHTML += `

        <tr>

          <td>

            <strong>

              ${siswa.nama_siswa}

            </strong>

          </td>

          <td>

            <span class="total-badge">

              ${total} laporan

            </span>

          </td>

          <td>

            ${terakhir
              ? terakhir.jenis?.nama
              : '<span class="empty-text">Belum ada</span>'
            }

          </td>

          <td>

            ${total > 0
              ? dominan
              : '<span class="empty-text">-</span>'
            }

          </td>

        </tr>
      `
    })
  }
)
// ====================
// REALTIME
// ====================

supabase

.channel('laporan-bk')

.on(
  'postgres_changes',
  {
    event:'*',
    schema:'public',
    table:'laporan'
  },

  ()=>{

    loadData()
  }
)

.subscribe()

// ====================
// LOGOUT
// ====================

document

.getElementById('logoutBtn')

?.addEventListener(
  'click',
  async()=>{

    await supabase.auth.signOut()

    location.href='index.html'
  }
)