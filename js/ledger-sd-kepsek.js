import { supabase } from './config.js'
import { getCurrentProfile } from './auth-sd.js'

const ledgerContainer =
  document.getElementById(
    'ledgerContainer'
  )

window.loadMonitoringLedger =
async function () {

  const profile =
    await getCurrentProfile()

  if (!profile) return

  const schoolId =
    profile.school_id

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
      Ledger
    </h1>

    <p>
      Monitoring ledger seluruh kelas
    </p>

  </div>

  <div class="content-card">

    <table>

      <thead>

        <tr>

          <th>Kelas</th>
          <th>Wali Kelas</th>
          <th>Ledger</th>

        </tr>

      </thead>

      <tbody>

  `

  kelas.forEach(item => {

    const wali =
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
          ${wali?.name || '-'}
        </td>

        <td>

          <button
            class="btn-detail"
            onclick="
              showLedgerKelas(
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

  ledgerContainer.innerHTML =
    html

}
window.showLedgerKelas =
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

  let html = `

  <div class="page-header">

    <h1>
      Ledger Kelas ${namaKelas}
    </h1>

  </div>

  <div class="content-card">

    <button
      id="btnKembaliLedger"
    >

      ← Kembali

    </button>

    <br><br>

    <select
      id="semesterLedger"
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

    <button
      id="btnTampilkanLedger"
    >

      Tampilkan

    </button>

    <div
      id="ledgerDetailContainer"
    ></div>

  </div>

  `

  ledgerContainer.innerHTML =
    html

  document
    .getElementById(
      'btnKembaliLedger'
    )
    .addEventListener(
      'click',
      loadMonitoringLedger
    )

  document
    .getElementById(
      'btnTampilkanLedger'
    )
    .addEventListener(
      'click',
      () => {

        loadLedgerKelas(
          classId
        )

      }
    )

}
async function loadLedgerKelas(
  classId
){

  const semesterId =
    document.getElementById(
      'semesterLedger'
    ).value

  if (!semesterId) {

    alert(
      'Pilih semester'
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

    const mapelUrut = [
    { id: 13, nama: 'PAI' },
    { id: 14, nama: 'PPKn' },
    { id: 15, nama: 'B. Indo' },
    { id: 16, nama: 'MTK' },
    { id: 17, nama: 'IPAS' },
    { id: 18, nama: 'SBdP' },
    { id: 19, nama: 'PJOK' },
    { id: 20, nama: 'B. Ing' },
    { id: 21, nama: 'B. Daerah' }
  ]

  const ledger = []

  siswa.forEach(item => {

    const dataSiswa =
      nilai.filter(
        n =>
          n.siswa_id === item.id
      )

    const row = {

      nama:
        item.nama_siswa,

      nilaiMapel: {},

      jumlah: 0,

      mapelTerisi: 0,

      rerata: 0

    }

    mapelUrut.forEach(mapel => {

      const dataNilai =
        dataSiswa.find(
          n =>
            n.mapel_id === mapel.id
        )

      const nilaiAkhir =
        Number(
          dataNilai?.nilai_akhir || 0
        )

      row.nilaiMapel[
        mapel.id
      ] = nilaiAkhir

      if (nilaiAkhir > 0) {

        row.jumlah +=
          nilaiAkhir

        row.mapelTerisi++

      }

    })

    row.rerata =
      row.mapelTerisi
        ? (
            row.jumlah /
            row.mapelTerisi
          )
        : 0

    ledger.push(row)

  })

  ledger.sort(
    (a, b) =>
      b.rerata - a.rerata
  )

  let html = `

    <div
      style="
        margin-top:20px;
        overflow:auto;
      "
    >

      <table>

        <thead>

          <tr>

            <th>No</th>

            <th>
              Nama Siswa
            </th>

  `

  mapelUrut.forEach(
    mapel => {

      html += `
        <th>
          ${mapel.nama}
        </th>
      `

    }
  )

  html += `

            <th>Jumlah</th>

            <th>Rerata</th>

            <th>Peringkat</th>

          </tr>

        </thead>

        <tbody>

  `

  ledger.forEach(
    (row, index) => {

      html += `

        <tr>

          <td>

            ${index + 1}

          </td>

          <td style="
            white-space: nowrap;
            min-width: 180px;
          ">

            ${row.nama}

          </td>
      `

      mapelUrut.forEach(
        mapel => {

          const nilaiMapel =
            row.nilaiMapel[
              mapel.id
            ]

          html += `

            <td>

              ${
                nilaiMapel > 0
                  ? nilaiMapel
                  : '-'
              }

            </td>

          `

        }
      )

      html += `

          <td>

            ${
              row.jumlah > 0
                ? row.jumlah
                : '-'
            }

          </td>

          <td>

            ${
              row.rerata > 0
                ? row.rerata.toFixed(1)
                : '-'
            }

          </td>

          <td>

            ${
              row.rerata > 0
                ? index + 1
                : '-'
            }

          </td>

        </tr>

      `

    }
  )

  html += `

        </tbody>

      </table>

    </div>

  `

  document
  .getElementById(
    'ledgerDetailContainer'
  )
  .innerHTML =
    html
}