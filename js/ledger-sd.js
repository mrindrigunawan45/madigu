import { supabase }
from './config.js';

import {
  getCurrentClass
}
from './auth-sd.js';

let currentLedgerData = []
let currentMapel = []
let currentSemester = null
// =====================
// ELEMENT
// =====================

const exportBtn =
  document.getElementById(
    'exportLedgerBtn'
  )

const container =
  document.getElementById(
    'ledgerContainer'
  )

const semesterInfo =
  document.getElementById(
    'ledgerSemesterInfo'
  )

// =====================
// LOAD LEDGER
// =====================

async function loadLedger() {

  try {

    container.innerHTML =
      'Memuat Ledger...'

    // =====================
    // SEMESTER AKTIF
    // =====================

    const {
      data: semester,
      error: semesterError
    } = await supabase

      .from('semester')
      .select('*')
      .eq(
        'school_id',
        'SDNHB01'
      )
      .eq(
        'is_active',
        true
      )
      .single()

    if (
      semesterError ||
      !semester
    ) {

      semesterInfo.textContent =
        'Semester tidak ditemukan'

      container.innerHTML =
        'Semester aktif tidak ditemukan'

      return

    }

    semesterInfo.textContent =
      `${semester.nama_semester} • ${semester.tahun_ajaran}`

    // =====================
    // SISWA
    // =====================

   const currentClass =
  await getCurrentClass()

const {
  data: siswa,
  error: siswaError
} = await supabase

  .from('siswa')
  .select(
    'id,nama_siswa'
  )
  .eq(
    'class_id',
    currentClass.id
  )
  .order(
    'nama_siswa'
  )

if (siswaError) {

  console.error(
    'ERROR SISWA',
    siswaError
  )

  throw siswaError

}

    // =====================
    // MAPEL
    // =====================

    const {
      data: mapel
    } = await supabase

      .from('mata_pelajaran')
      .select(
        'id,nama_mapel'
      )
      .eq(
        'school_id',
        'SDNHB01'
      )
      .order(
        'id'
      )

    // =====================
    // NILAI
    // =====================

    const {
      data: nilai
    } = await supabase

      .from('nilai_sd')
      .select('*')
      .eq(
        'semester_id',
        semester.id
      )

    // =====================
    // BENTUK DATA LEDGER
    // =====================

    const ledgerData = []

    siswa.forEach(s => {

      let total = 0
      let jumlah = 0

      const nilaiMapel = {}

      mapel.forEach(m => {

        const n = nilai.find(
          x =>
            Number(x.siswa_id) === Number(s.id)
            &&
            Number(x.mapel_id) === Number(m.id)
        )

        const akhir =
          Number(
            n?.nilai_akhir || 0
          )

        nilaiMapel[m.id] =
          akhir

        if (akhir > 0) {

          total += akhir
          jumlah++

        }

      })

      const rata =
        jumlah > 0
          ? total / jumlah
          : 0

      ledgerData.push({

        siswa_id: s.id,
        nama:s.nama_siswa,
        nilai: nilaiMapel,
        rata

      })

    })

    // =====================
    // RANKING
    // =====================

    
currentLedgerData = ledgerData
currentMapel = mapel
currentSemester = semester

    // =====================
    // STATISTIK
    // =====================

    const rataKelas =

      ledgerData.length

      ?

      ledgerData.reduce(
        (a,b)=>
          a + b.rata,
        0
      ) / ledgerData.length

      :

      0

    const tertinggi =

      ledgerData.length

      ?

      Math.max(
        ...ledgerData.map(
          x => x.rata
        )
      )

      :

      0

    const terendah =

      ledgerData.length

      ?

      Math.min(
        ...ledgerData.map(
          x => x.rata
        )
      )

      :

      0

    // =====================
    // REKAP MAPEL
    // =====================

    let mapelHtml = `

      <h3>
        Rekap Mata Pelajaran
      </h3>

      <table
        class="ledger-table"
        id="ledgerTable"
>

      <thead>

      <tr>

        <th>Mapel</th>
        <th>Rata-rata</th>

      </tr>

      </thead>

      <tbody>

    `

    mapel.forEach(m => {

      let total = 0
      let count = 0

      ledgerData.forEach(s => {

        const n =
          s.nilai[m.id]

        if (n > 0) {

          total += n
          count++

        }

      })

      const rataMapel =

        count > 0

        ?

        (
          total / count
        ).toFixed(2)

        :

        '-'

      mapelHtml += `

        <tr>

          <td>
            ${m.nama_mapel}
          </td>

          <td>
            ${rataMapel}
          </td>

        </tr>

      `

    })

    mapelHtml += `
      </tbody>
      </table>
    `

    // =====================
    // TABEL
    // =====================

    let html = `

      <div class="ledger-stats">

        <div class="summary-card">
          <h4>Rata-rata Kelas</h4>
          <h2>${rataKelas.toFixed(2)}</h2>
        </div>

        <div class="summary-card">
          <h4>Nilai Tertinggi</h4>
          <h2>${tertinggi.toFixed(2)}</h2>
        </div>

        <div class="summary-card">
          <h4>Nilai Terendah</h4>
          <h2>${terendah.toFixed(2)}</h2>
        </div>

      </div>

      <br>

      <div class="table-responsive">

      <table class="ledger-table">

      <thead>

      <tr>

      <th>No</th>
      <th>Nama</th>

    `

    mapel.forEach(m => {

      html += `
        <th>
          ${m.nama_mapel}
        </th>
      `

    })

    html += `
      <th>Rata²</th>
      </tr>
      </thead>
      <tbody>
    `

    ledgerData.forEach(
      (s,index) => {
        
        html += `

          <tr>

          <td>${index+1}</td>

          <td>${s.nama}</td>

        `

        mapel.forEach(m => {

          html += `
            <td>
              ${
                s.nilai[m.id] || ''
              }
            </td>
          `

        })

        html += `

          <td>
            ${s.rata.toFixed(2)}
          </td>
          
          </tr>

        `

      }
    )

    html += `
      </tbody>
      </table>
      </div>

      <br><br>

      ${mapelHtml}
    `

    container.innerHTML =
      html

  }

  catch(err) {

    console.error(err)

    container.innerHTML =
      'Gagal memuat ledger'

  }

}

// =====================
// INIT
// =====================

loadLedger()

// =====================
// EXPORT EXCEL
// =====================


// =====================
// EXPORT EXCEL FINAL
// =====================

exportBtn?.addEventListener(
  'click',
  () => {

    if(
      !currentLedgerData.length
    ){
      alert(
        'Data ledger belum tersedia'
      )
      return
    }

    const wb =
      XLSX.utils.book_new()

    const data = []

    // =====================
    // HEADER
    // =====================

    data.push([
      'SD NEGERI HARAPAN BANGSA'
    ])

    data.push([
      'LEDGER NILAI SISWA'
    ])

    data.push([
      currentSemester.nama_semester
    ])

    data.push([
      `Tahun Ajaran ${currentSemester.tahun_ajaran}`
    ])

    data.push([])

    // =====================
    // HEADER TABEL
    // =====================

    const header = [

      'No',
      'Nama Siswa'

    ]

    currentMapel.forEach(
      m =>
        header.push(
          m.nama_mapel
        )
    )

    header.push(
      'Rata-rata'
    )

    data.push(header)

    // =====================
    // DATA SISWA
    // =====================

    currentLedgerData.forEach(
      (s,index)=>{

        const row = [

          index + 1,
          s.nama

        ]

        currentMapel.forEach(
          m => {

            row.push(
              s.nilai[m.id] || ''
            )

          }
        )

        row.push(
          Number(
            s.rata
          ).toFixed(2)
        )

        data.push(row)

      }
    )

    // =====================
    // REKAP MAPEL
    // =====================

    data.push([])
    data.push([])

    data.push([
      'REKAP MATA PELAJARAN'
    ])

    data.push([
      'Mapel',
      'Rata-rata'
    ])

    currentMapel.forEach(
      m => {

        let total = 0
        let count = 0

        currentLedgerData.forEach(
          s => {

            const nilai =
              s.nilai[m.id]

            if(nilai > 0){

              total += nilai
              count++

            }

          }
        )

        const rata =

          count > 0

          ?

          (
            total / count
          ).toFixed(2)

          :

          '-'

        data.push([
          m.nama_mapel,
          rata
        ])

      }
    )

    // =====================
    // TTD
    // =====================

    data.push([])
    data.push([])

    data.push([
      'Mengetahui'
    ])

    data.push([])

    data.push([
      'Kepala Sekolah',
      '',
      '',
      '',
      '',
      '',
      'Guru Kelas'
    ])

    data.push([])
    data.push([])
    data.push([])
    data.push([])

    data.push([
      '(________________)',
      '',
      '',
      '',
      '',
      '',
      '(________________)'
    ])

    // =====================
    // SHEET
    // =====================

    const ws =
      XLSX.utils.aoa_to_sheet(
        data
      )

    // Lebar kolom

    ws['!cols'] = [

      { wch:5 },
      { wch:30 },

      ...currentMapel.map(
        ()=>({
          wch:18
        })
      ),

      { wch:12 }

    ]

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      'Ledger'
    )

    XLSX.writeFile(

      wb,

      `Ledger_SD_${currentSemester.nama_semester}_${currentSemester.tahun_ajaran}.xlsx`

    )

  }
)