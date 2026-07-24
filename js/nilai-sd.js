import { supabase }
from './config.js';

import {
  loadCurrentUser,
  getCurrentUser
}
from './session.js';

console.log(
  'Nilai SD Loaded'
);

  let currentUser = null;
  let currentClass = null;

// =====================
// INIT
// =====================

document.addEventListener(
  'DOMContentLoaded',
  async () => {

    await loadCurrentUser();

    currentUser =
        getCurrentUser();

    if (!currentUser) {

        alert("Session tidak ditemukan");

        return;

    }

    currentClass =
        currentUser.kelas;

    console.log(
      'CURRENT CLASS',
      currentClass
    );

    loadSemesterNilai();

    loadMapelNilai();

    document
      .getElementById(
        'loadNilaiBtn'
      )
      ?.addEventListener(
        'click',
        loadNilaiSiswa
      );

  }
);

// =====================
// LOAD SEMESTER
// =====================

async function loadSemesterNilai() {

  const select =
    document.getElementById(
      'semesterNilai'
    );

  const {
    data,
    error
  } = await supabase

    .from('semester')
    .select('*')
    .eq(
        'school_id',
        currentUser.profile.school_id
    )
    .eq('is_active', true);

  console.log(
    'ERROR SEMESTER',
    error
  );

  console.log(
    'SEMUA SEMESTER',
    data
  );
  
  if (error) {

    console.error(error);
    return;

  }

  select.innerHTML = `
    <option value="">
      Pilih Semester
    </option>
  `;

  data.forEach(item => {

    select.innerHTML += `
      <option value="${item.id}">
        ${item.school_id} -
        ${item.nama_semester}
      </option>
    `;

  });

}

// =====================
// LOAD MAPEL
// =====================

async function loadMapelNilai() {
  
  const select =
    document.getElementById(
      'mapelNilai'
    );

  const {
    data,
    error
  } = await supabase

    .from('mata_pelajaran')
    .select('*')
    .eq(
        'school_id',
        currentUser.profile.school_id
    )
    .order('nama_mapel');

  console.log(
    'SEMUA MAPEL',
    data
  );

  if (error) {

    console.error(error);
    return;

  }

  select.innerHTML = `
    <option value="">
      Pilih Mata Pelajaran
    </option>
  `;

  data.forEach(mapel => {

    select.innerHTML += `
      <option value="${mapel.id}">
        ${mapel.nama_mapel}
      </option>
    `;

  });

}

// =====================
// LOAD SISWA
// =====================

async function loadNilaiSiswa() {

  const semesterId =
    document.getElementById(
      'semesterNilai'
    ).value;

  const mapelId =
    document.getElementById(
      'mapelNilai'
    ).value;

  if (
    !semesterId ||
    !mapelId
  ) {

    alert(
      'Pilih semester dan mapel.'
    );

    return;

  }

  const container =
    document.getElementById(
      'nilaiContainer'
    );

  // =====================
  // LOAD SISWA
  // =====================

  const {
    data: siswa,
    error: siswaError
  } = await supabase

    .from('siswa')

    .select('*')

    .eq(
      'class_id',
      currentClass.id
    )

    .order('kelas')

    .order(
      'nama_siswa'
    );

  if (siswaError) {

    console.error(
      siswaError
    );

    return;

  }

  // =====================
  // LOAD NILAI TERSIMPAN
  // =====================

  const {
    data: nilaiData,
    error: nilaiError
  } = await supabase

    .from('nilai_sd')

    .select('*')

    .eq(
        'school_id',
        currentUser.profile.school_id
    )

    .eq(
      'class_id',
      currentClass.id
    )

    .eq(
      'semester_id',
      Number(semesterId)
    )

    .eq(
      'mapel_id',
      Number(mapelId)
    );

  if (nilaiError) {

    console.error(
      nilaiError
    );

  }

  const nilaiMap = {};

  nilaiData?.forEach(
    item => {

      nilaiMap[
        item.siswa_id
      ] = item;

    }
  );

  let html = `

    <table class="nilai-table">

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
          <th>NA</th>

        </tr>

      </thead>

      <tbody>

  `;

  siswa.forEach(item => {

    const nilai =
      nilaiMap[
        item.id
      ] || {};

    html += `

      <tr
        data-siswa="${item.id}"
      >

        <td>
          ${item.nama_siswa}
        </td>

        <td>
          <input
            class="tp1"
            value="${nilai.tp1 || ''}"
          >
        </td>

        <td>
          <input
            class="tp2"
            value="${nilai.tp2 || ''}"
          >
        </td>

        <td>
          <input
            class="tp3"
            value="${nilai.tp3 || ''}"
          >
        </td>

        <td>
          <input
            class="tp4"
            value="${nilai.tp4 || ''}"
          >
        </td>

        <td>
          <input
            class="pts"
            value="${nilai.pts || ''}"
          >
        </td>

        <td>
          <input
            class="pas"
            value="${nilai.pas || ''}"
          >
        </td>

        <td
          class="rata"
        >
          ${nilai.rata_tp || 0}
        </td>

        <td
          class="akhir"
        >
          ${nilai.nilai_akhir || 0}
        </td>

      </tr>

    `;

  });

  html += `

      </tbody>

    </table>

    <div
      class="nilai-save-wrap"
    >

      <button
        id="saveNilaiBtn"
      >

        Simpan Nilai

      </button>

    </div>

  `;

  container.innerHTML =
    html;

  bindHitungNilai();

  document
    .getElementById(
      'saveNilaiBtn'
    )
    ?.addEventListener(
      'click',
      saveNilai
    );

}

// =====================
// HITUNG
// =====================

function bindHitungNilai() {

  document
    .querySelectorAll(
      '.nilai-table input'
    )

    .forEach(input => {

      input.addEventListener(
        'input',
        hitungBaris
      );

    });

}

function hitungBaris(e) {

  const row =
    e.target.closest('tr');

  const tp1 =
    Number(
      row.querySelector(
        '.tp1'
      ).value || 0
    );

  const tp2 =
    Number(
      row.querySelector(
        '.tp2'
      ).value || 0
    );

  const tp3 =
    Number(
      row.querySelector(
        '.tp3'
      ).value || 0
    );

  const tp4 =
    Number(
      row.querySelector(
        '.tp4'
      ).value || 0
    );

  const pts =
    Number(
      row.querySelector(
        '.pts'
      ).value || 0
    );

  const pas =
    Number(
      row.querySelector(
        '.pas'
      ).value || 0
    );

  const daftarTP = [
  tp1,
  tp2,
  tp3,
  tp4
].filter(
  nilai => nilai > 0
);

  const rataTp =
    daftarTP.length > 0
      ? daftarTP.reduce(
          (a, b) => a + b,
          0
        ) / daftarTP.length
      : 0;

  const komponenNA = [];

  if (rataTp > 0)
    komponenNA.push(rataTp);

  if (pts > 0)
    komponenNA.push(pts);

  if (pas > 0)
    komponenNA.push(pas);

  const nilaiAkhir =
    komponenNA.length > 0
      ? komponenNA.reduce(
          (a, b) => a + b,
          0
        ) / komponenNA.length
      : 0;

  row.querySelector(
    '.rata'
  ).textContent =
    rataTp.toFixed(1);

  row.querySelector(
    '.akhir'
  ).textContent =
    nilaiAkhir.toFixed(1);

}

// =====================
// SIMPAN
// =====================

async function saveNilai() {

  const semesterId =
    document.getElementById(
      'semesterNilai'
    ).value;

  const mapelId =
    document.getElementById(
      'mapelNilai'
    ).value;

  const rows =
    document.querySelectorAll(
      '.nilai-table tbody tr'
    );

  let payload = [];

  rows.forEach(row => {

    payload.push({

      school_id:
        currentUser.profile.school_id,

      class_id:
        currentClass.id,

      semester_id:
        Number(semesterId),

      siswa_id:
        Number(
          row.dataset.siswa
        ),

      mapel_id:
        Number(mapelId),

      tp1:
        row.querySelector(
          '.tp1'
        ).value || 0,

      tp2:
        row.querySelector(
          '.tp2'
        ).value || 0,

      tp3:
        row.querySelector(
          '.tp3'
        ).value || 0,

      tp4:
        row.querySelector(
          '.tp4'
        ).value || 0,

      pts:
        row.querySelector(
          '.pts'
        ).value || 0,

      pas:
        row.querySelector(
          '.pas'
        ).value || 0,

      rata_tp:
        row.querySelector(
          '.rata'
        ).textContent || 0,

      nilai_akhir:
        row.querySelector(
          '.akhir'
        ).textContent || 0

    });

  });

  const {
  data,
  error
} = await supabase

  .from('nilai_sd')

  .upsert(
    payload,
    {
      onConflict:
        'semester_id,siswa_id,mapel_id'
    }
  );

if (error) {

  console.error(error);

  alert(
    JSON.stringify(
      error,
      null,
      2
    )
  );

  return;

}

  alert(
    'Nilai berhasil disimpan'
);

}