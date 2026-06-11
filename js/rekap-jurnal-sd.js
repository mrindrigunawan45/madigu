import { supabase } from './config.js';
import { getCurrentClass } from './auth-sd.js';

let currentClass = null;

document.addEventListener(
  'DOMContentLoaded',
  async () => {

    currentClass =
      await getCurrentClass();

    await loadHeaderInfo();

    await loadDropdownSiswa();

    document
      .getElementById(
        'btnLoadRekapJurnal'
      )
      ?.addEventListener(
        'click',
        loadRekapJurnal
      );

    document
      .getElementById(
        'btnCariSiswa'
      )
      ?.addEventListener(
        'click',
        loadRiwayatSiswa
      );

    document
      .getElementById(
        'closeModalJurnal'
      )
      ?.addEventListener(
        'click',
        () => {

          document
            .getElementById(
              'modalDetailJurnal'
            )
            .classList.add(
              'hidden'
            );

        }
      );

    loadRekapJurnal();

  }
);

async function loadHeaderInfo(){

  const info =
    document.getElementById(
      'rekapJurnalInfo'
    );

  const {
    data: semester
  } = await supabase

    .from('semester')

    .select('*')

    .eq(
      'is_active',
      true
    )

    .single();

  info.innerHTML = `

    <strong>Kelas:</strong>
    ${currentClass.nama_kelas}

    &nbsp; | &nbsp;

    <strong>Semester:</strong>
    ${semester?.nama_semester || '-'}

    &nbsp; | &nbsp;

    <strong>Tahun:</strong>
    ${semester?.tahun_ajaran || '-'}

  `;

}

async function loadDropdownSiswa(){

  const {
    data,
    error
  } = await supabase

    .from('siswa')

    .select(`
      id,
      nama_siswa
    `)

    .eq(
      'class_id',
      currentClass.id
    )

    .order(
      'nama_siswa'
    );

  if(error){

    console.error(error);
    return;

  }

  const select =
    document.getElementById(
      'searchSiswa'
    );

  if(!select) return;

  select.innerHTML =
    '<option value="">Pilih Siswa...</option>';

  data.forEach(siswa=>{

    select.innerHTML += `
      <option value="${siswa.id}">
        ${siswa.nama_siswa}
      </option>
    `;

  });

}

async function loadRekapJurnal(){

  const container =
    document.getElementById(
      'rekapJurnalContainer'
    );

  const stats =
    document.getElementById(
      'rekapJurnalStats'
    );

  const awal =
    document.getElementById(
      'filterTanggalAwal'
    )?.value;

  const akhir =
    document.getElementById(
      'filterTanggalAkhir'
    )?.value;

  let query =
    supabase

      .from('jurnal_kelas_sd')

      .select(`
        *,
        mata_pelajaran(
          nama_mapel
        )
      `)

      .eq(
        'class_id',
        currentClass.id
      );

  if(awal){

    query =
      query.gte(
        'tanggal',
        awal
      );

  }

  if(akhir){

    query =
      query.lte(
        'tanggal',
        akhir
      );

  }

  const {
    data,
    error
  } = await query.order(
    'tanggal',
    {
      ascending:false
    }
  );

  if(error){

    console.error(error);
    return;

  }

  stats.innerHTML = `

    <div class="rekap-jurnal-card">
      <h3>${data.length}</h3>
      <p>Jumlah Jurnal</p>
    </div>

  `;

  let html = `

    <div class="table-responsive">

      <table
        class="rekap-jurnal-table"
      >

        <thead>

          <tr>

            <th>Tanggal</th>
            <th>Mapel</th>
            <th>Materi</th>
            <th>Kegiatan</th>
            <th>Catatan</th>
            <th>Aksi</th>

          </tr>

        </thead>

        <tbody>

  `;

  for(const item of data){

    const {
      data: detail
    } = await supabase

      .from(
        'jurnal_siswa_sd'
      )

      .select('*')

      .eq(
        'jurnal_id',
        item.id
      );

    html += `

      <tr>

        <td>${item.tanggal}</td>

        <td>
          ${
            item
            .mata_pelajaran
            ?.nama_mapel || '-'
          }
        </td>

        <td>${item.materi || '-'}</td>

        <td>${item.kegiatan || '-'}</td>

        <td>

          <span
            class="badge-catatan"
          >

            ${detail.length}
            Catatan

          </span>

        </td>

        <td>

          <button
            onclick="showDetailJurnal(${item.id})"
          >
            Detail
          </button>

        </td>

      </tr>

    `;

  }

  html += `

        </tbody>

      </table>

    </div>

  `;

  container.innerHTML =
    html;

}

window.showDetailJurnal =
async function(id){

  const modal =
    document.getElementById(
      'modalDetailJurnal'
    );

  const body =
    document.getElementById(
      'detailJurnalBody'
    );

  modal.classList.remove(
    'hidden'
  );

  const {
    data: jurnal
  } = await supabase

    .from('jurnal_kelas_sd')

    .select(`
      *,
      mata_pelajaran(
        nama_mapel
      )
    `)

    .eq(
      'id',
      id
    )

    .single();

  const {
    data: catatan
  } = await supabase

    .from(
      'jurnal_siswa_sd'
    )

    .select(`
      *,
      siswa(
        nama_siswa
      )
    `)

    .eq(
      'jurnal_id',
      id
    );

  let html = `

    <h3>
      ${jurnal.materi}
    </h3>

    <p>
      ${jurnal.kegiatan || '-'}
    </p>

    <hr>

    <h4>
      Catatan Siswa
    </h4>

  `;

  catatan.forEach(c=>{

    html += `

      <div
        class="catatan-siswa-card"
      >

        <strong>
          ${
            c.siswa?.nama_siswa
          }
        </strong>

        <br>

        ${c.kategori}

        <br><br>

        ${c.catatan}

      </div>

      <br>

    `;

  });

  body.innerHTML = html;

};

async function loadRiwayatSiswa(){

  const siswaId =
    document.getElementById(
      'searchSiswa'
    ).value;

  if(!siswaId){

    alert(
      'Pilih siswa terlebih dahulu.'
    );

    return;

  }

  const {
    data,
    error
  } = await supabase

    .from('jurnal_siswa_sd')

    .select(`
      *,
      siswa(
        nama_siswa
      ),
      jurnal_kelas_sd(
        tanggal
      )
    `)

    .eq(
      'siswa_id',
      siswaId
    )

    .order(
      'created_at',
      {
        ascending:false
      }
    );

  if(error){

    console.error(error);
    return;

  }

  renderRiwayatSiswa(data);

}

function renderRiwayatSiswa(data){

  const container =
    document.getElementById(
      'riwayatSiswaContainer'
    );

  if(!data.length){

    container.innerHTML = `
      <div class="riwayat-siswa-card">
        Tidak ada catatan siswa.
      </div>
    `;

    return;

  }

  const nama =
    data[0].siswa?.nama_siswa || '-';

  const sosial =
    data.filter(
      x => x.kategori === 'Sosial'
    ).length;

  const akademik =
    data.filter(
      x => x.kategori === 'Akademik'
    ).length;

  const disiplin =
    data.filter(
      x => x.kategori === 'Disiplin'
    ).length;

  const perilaku =
    data.filter(
      x => x.kategori === 'Perilaku'
    ).length;

  let rows = '';

  data.forEach(item=>{

    rows += `

      <tr>

        <td>
          ${
            item
            .jurnal_kelas_sd
            ?.tanggal || '-'
          }
        </td>

        <td>
          ${item.kategori}
        </td>

        <td>
          ${item.catatan}
        </td>

      </tr>

    `;

  });

  container.innerHTML = `

    <div class="riwayat-siswa-card">

      <h3>
        📊 Rekap Catatan ${nama}
      </h3>

      <div class="stat-catatan">

        <div class="stat-item">
          <small>Total</small>
          <h3>${data.length}</h3>
        </div>

        <div class="stat-item">
          <small>Sosial</small>
          <h3>${sosial}</h3>
        </div>

        <div class="stat-item">
          <small>Akademik</small>
          <h3>${akademik}</h3>
        </div>

        <div class="stat-item">
          <small>Disiplin</small>
          <h3>${disiplin}</h3>
        </div>

        <div class="stat-item">
          <small>Perilaku</small>
          <h3>${perilaku}</h3>
        </div>

      </div>

      <table
        class="rekap-jurnal-table"
      >

        <thead>

          <tr>

            <th>Tanggal</th>
            <th>Kategori</th>
            <th>Catatan</th>

          </tr>

        </thead>

        <tbody>

          ${rows}

        </tbody>

      </table>

    </div>

  `;

}