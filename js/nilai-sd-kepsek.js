import { supabase } from './config.js'
import { getCurrentProfile } from './auth-sd.js'

const nilaiContainer =
  document.getElementById(
    'nilaiContainer'
  )

window.addEventListener(
  'load',
  async () => {

    const profile =
      await getCurrentProfile()

    if (!profile) return

    loadMonitoringNilai(
      profile.school_id
    )

  }
)

async function loadMonitoringNilai(
  schoolId
) {

  const {
    data: kelas
  } = await supabase

    .from('kelas')
    .select('*')
    .eq(
      'school_id',
      schoolId
    )

  const {
    data: guru
  } = await supabase

    .from('profiles')
    .select('*')
    .eq(
      'role',
      'guru_sd'
    )
    .eq(
      'school_id',
      schoolId
    )

  let html = `

    <div class="page-header">

      <h1>
        Monitoring Nilai
      </h1>

      <p>
        Monitoring nilai seluruh kelas
      </p>

    </div>

    <div class="content-card">

      <table>

        <thead>

          <tr>

            <th>Kelas</th>
            <th>Wali Kelas</th>
            <th>Nilai</th>

          </tr>

        </thead>

        <tbody>

  `

  kelas.forEach(item => {

    const waliKelas =
      guru.find(
        g =>
          g.class_id === item.id
      )

    html += `

      <tr>

        <td>
          ${item.nama_kelas}
        </td>

        <td>
          ${waliKelas?.name || '-'}
        </td>

        <td>

          <button
            class="btn-detail"
            onclick="
              showDetailNilaiKelas(
                ${item.id},
                '${item.nama_kelas}'
              )
            "
          >

            👁️ Lihat

          </button>

        </td>

      </tr>

    `
  })

  html += `

        </tbody>

      </table>

    </div>

  `

  nilaiContainer.innerHTML =
    html

}

window.showDetailNilaiKelas =
async function(
  classId,
  namaKelas
){

  const profile =
    await getCurrentProfile()

  const schoolId =
    profile.school_id

  const {
    data: semester
  } = await supabase

    .from('semester')
    .select('*')
    .eq(
      'school_id',
      schoolId
    )
    .order('id')

  const {
    data: mapel
  } = await supabase

    .from('mata_pelajaran')
    .select('*')
    .eq(
      'school_id',
      schoolId
    )
    .order(
      'nama_mapel'
    )

  let html = `

    <div class="page-header">

      <h1>
        Nilai Kelas ${namaKelas}
      </h1>

      <p>
        Monitoring nilai siswa
      </p>

    </div>

    <div class="content-card">

      <button
        id="btnKembaliNilai"
      >
        ← Kembali
      </button>

      <br><br>

      <select
        id="semesterNilai"
      >

        <option value="">
          Pilih Semester
        </option>

        ${
          semester.map(item => `
            <option value="${item.id}">
              ${item.nama_semester}
            </option>
          `).join('')
        }

      </select>

      <select
        id="mapelNilai"
      >

        <option value="">
          Pilih Mapel
        </option>

        ${
          mapel.map(item => `
            <option value="${item.id}">
              ${item.nama_mapel}
            </option>
          `).join('')
        }

      </select>

      <button
        id="btnTampilkanNilai"
      >
        Tampilkan
      </button>

      <div
        id="detailNilaiContainer"
      ></div>

    </div>

  `

  nilaiContainer.innerHTML =
    html

  document
    .getElementById(
      'btnKembaliNilai'
    )
    .addEventListener(
      'click',
      async () => {

        const profile =
          await getCurrentProfile()

        loadMonitoringNilai(
          profile.school_id
        )

      }
    )

  document
    .getElementById(
      'btnTampilkanNilai'
    )
    .addEventListener(
      'click',
      () => {

        loadNilaiKelas(
          classId
        )

      }
    )

}
async function loadNilaiKelas(
  classId
){

  const semesterId =
    document.getElementById(
      'semesterNilai'
    ).value

  const mapelId =
    document.getElementById(
      'mapelNilai'
    ).value

  if (
    !semesterId ||
    !mapelId
  ) {

    alert(
      'Pilih semester dan mapel'
    )

    return

  }

  const {
    data: siswa
  } = await supabase

    .from('siswa')
    .select('*')

    .eq(
      'class_id',
      classId
    )

const {
  data: nilai
} = await supabase

  .from('nilai_sd')
  .select('*')

  .eq(
    'class_id',
    classId
  )

  .eq(
    'semester_id',
    Number(
      semesterId
    )
  )

  .eq(
    'mapel_id',
    Number(
      mapelId
    )
  )

  console.log(
    'DATA NILAI',
    nilai
  )

  console.log(
  'DATA SISWA',
  siswa
)

console.log(
  'JUMLAH SISWA',
  siswa?.length
)

console.log(
  'JUMLAH NILAI',
  nilai?.length
)

  let totalNilai = 0

  let nilaiTertinggi = 0

  let nilaiTerendah = 100

  let sudahDinilai = 0

  let belumDinilai = 0

  let html = `

  <div class="stats-grid">

    <div class="summary-card">

      <h4>Jumlah Siswa</h4>

      <h2>
        ${siswa?.length || 0}
      </h2>

    </div>

    <div class="summary-card">

      <h4>Sudah Dinilai</h4>

      <h2 id="sudahDinilai">
        0
      </h2>

    </div>

    <div class="summary-card">

      <h4>Belum Dinilai</h4>

      <h2 id="belumDinilai">
        0
      </h2>

    </div>

    <div class="summary-card">

      <h4>Rata-rata</h4>

      <h2 id="rataNilai">
        0
      </h2>

    </div>

    <div class="summary-card">

      <h4>Tertinggi</h4>

      <h2 id="nilaiTertinggi">
        0
      </h2>

    </div>

    <div class="summary-card">

      <h4>Terendah</h4>

      <h2 id="nilaiTerendah">
        0
      </h2>

    </div>

  </div>

  <div class="content-card">

  <table>

  <thead>

  <tr>

  <th>Nama Siswa</th>

  <th>TP1</th>
  <th>TP2</th>
  <th>TP3</th>
  <th>TP4</th>

  <th>PTS</th>
  <th>PAS</th>

  <th>Rata TP</th>

  <th>Nilai Akhir</th>

  </tr>

  </thead>

  <tbody>

  `
  nilai.forEach(item => {

  const dataSiswa =
    siswa.find(
      s => s.id === item.siswa_id
    )

  const akhir =
  Number(
    item.nilai_akhir || 0
  )

if (akhir <= 0) {

  belumDinilai++

} else {

  sudahDinilai++

  totalNilai += akhir

  if (
    akhir > nilaiTertinggi
  ) {

    nilaiTertinggi = akhir

  }

  if (
    akhir < nilaiTerendah
  ) {

    nilaiTerendah = akhir

  }

}

  html += `

    <tr>

      <td>
        ${dataSiswa?.nama_siswa || '-'}
      </td>

      <td>${item.tp1 > 0 ? item.tp1 : '-'}</td>

      <td>${item.tp2 > 0 ? item.tp2 : '-'}</td>

      <td>${item.tp3 > 0 ? item.tp3 : '-'}</td>

      <td>${item.tp4 > 0 ? item.tp4 : '-'}</td>

      <td>${item.pts > 0 ? item.pts : '-'}</td>

      <td>${item.pas > 0 ? item.pas : '-'}</td>

      <td>${item.rata_tp > 0 ? item.rata_tp : '-'}</td>

      <td>
        <strong>
          ${item.nilai_akhir > 0
            ? item.nilai_akhir
            : '-'}
        </strong>
      </td>

    </tr>

  `

})
html += `

</tbody>

</table>

</div>

`
const rataRata =

  sudahDinilai

    ? (
        totalNilai /
        sudahDinilai
      ).toFixed(1)

    : 0
  
    document
  .getElementById(
    'detailNilaiContainer'
  )
  .innerHTML =
    html

document
  .getElementById(
    'rataNilai'
  )
  .textContent =
    rataRata

document
  .getElementById(
    'nilaiTertinggi'
  )
  .textContent =
    nilaiTertinggi

document
  .getElementById(
    'nilaiTerendah'
  )
  .textContent =

    sudahDinilai
      ? nilaiTerendah
      : '-'
      
  document
  .getElementById(
    'sudahDinilai'
  )
  .textContent =
    sudahDinilai

document
  .getElementById(
    'belumDinilai'
  )
  .textContent =
    belumDinilai
}

