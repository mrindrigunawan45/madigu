import { supabase }
from './config.js';

import {
  getCurrentClass
}
from './auth-sd.js';

console.log(
  "Jurnal SD Loaded"
);

console.log("Jurnal SD Loaded");

const SCHOOL_ID = "SDNHB01";

let currentClass = null;

const kategoriList = [
  "Akademik",
  "Perilaku",
  "Sosial",
  "Kedisiplinan",
  "Prestasi",
  "Lainnya"
];

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    currentClass =
      await getCurrentClass();
    
    console.log(
      "CURRENT CLASS:",
      currentClass
    );

    loadKelasJurnal();
    loadMapelJurnal();
    loadRiwayatJurnal();

    document
      .getElementById(
        "addCatatanSiswaBtn"
      )
      ?.addEventListener(
        "click",
        addCatatanSiswaRow
      );

    document
      .getElementById(
        "saveJurnalBtn"
      )
      ?.addEventListener(
        "click",
        saveJurnal
      );

  }
);


// =====================
// LOAD KELAS
// =====================

async function loadKelasJurnal() {

  const select =
    document.getElementById(
      "jurnalKelas"
    );

  if (!select)
    return;

  if (!currentClass)
    return;

  select.innerHTML = `
    <option value="${currentClass.nama_kelas}">
      ${currentClass.nama_kelas}
    </option>
  `;

  select.disabled = true;

}


// =====================
// LOAD MAPEL
// =====================

async function loadMapelJurnal() {

  const select =
    document.getElementById(
      "jurnalMapel"
    );

  if (!select) return;

  const {
    data,
    error
  } = await supabase

    .from("mata_pelajaran")
    .select("*")
    .eq(
      "school_id",
      SCHOOL_ID
    )
    .order("nama_mapel");

  if (error) {

    console.error(error);

    return;

  }

  select.innerHTML =
    `<option value="">
      Pilih Mata Pelajaran
    </option>`;

  data.forEach(mapel => {

    select.innerHTML += `
      <option value="${mapel.id}">
        ${mapel.nama_mapel}
      </option>
    `;

  });

}


// =====================
// TAMBAH CATATAN SISWA
// =====================

function addCatatanSiswaRow() {

  const container =
    document.getElementById(
      "catatanSiswaContainer"
    );

  const row =
    document.createElement("div");

  row.className =
    "catatan-siswa-card";

  row.innerHTML = `

    <select class="catatan-siswa-select">

      <option value="">
        Pilih Siswa
      </option>

    </select>

    <br><br>

    <select class="catatan-kategori">

      ${kategoriList
        .map(
          item =>
            `<option value="${item}">
              ${item}
            </option>`
        )
        .join("")}

    </select>

    <br><br>

    <textarea
      class="catatan-siswa-text"
      rows="3"
      placeholder="Catatan siswa..."
    ></textarea>

    <br><br>

    <button
      type="button"
      class="remove-catatan"
    >
      Hapus
    </button>

  `;

  container.appendChild(row);

  loadSiswaDropdown(row);

  row
    .querySelector(
      ".remove-catatan"
    )
    .addEventListener(
      "click",
      () => row.remove()
    );

}


// =====================
// LOAD SISWA
// =====================

async function loadSiswaDropdown(
  row
) {

  const kelas =
    document.getElementById(
      "jurnalKelas"
    ).value;

  const select =
    row.querySelector(
      ".catatan-siswa-select"
    );

  const {
    data,
    error
  } = await supabase

    .from("siswa")
    .select("*")
    .eq(
      "class_id",
      currentClass.id
    )
    .order("nama_siswa");

  if (error) {

    console.error(error);

    return;

  }

  data.forEach(siswa => {

    select.innerHTML += `
      <option value="${siswa.id}">
        ${siswa.nama_siswa}
      </option>
    `;

  });

}


// =====================
// SIMPAN JURNAL
// =====================

async function saveJurnal() {

  try {

    const tanggal =
      document.getElementById(
        "jurnalTanggal"
      ).value;

    const kelas =
      document.getElementById(
        "jurnalKelas"
      ).value;

    const mapelId =
      document.getElementById(
        "jurnalMapel"
      ).value;

    const materi =
      document.getElementById(
        "jurnalMateri"
      ).value;

    const kegiatan =
      document.getElementById(
        "jurnalKegiatan"
      ).value;

    const catatan =
      document.getElementById(
        "jurnalCatatan"
      ).value;

    if (
      !tanggal ||
      !kelas ||
      !mapelId
    ) {

      alert(
        "Lengkapi data jurnal."
      );

      return;

    }

    const {
      data: jurnal,
      error: jurnalError
    } = await supabase

      .from("jurnal_kelas_sd")

      .insert({
        school_id: currentClass.school_id,
        class_id: currentClass.id,
        tanggal,
        kelas,
        mapel_id: mapelId,
        materi,
        kegiatan,
        catatan
      })

      .select()

      .single();

    if (jurnalError)
      throw jurnalError;

    const cards =
      document.querySelectorAll(
        ".catatan-siswa-card"
      );

    const detail =
      [];

    cards.forEach(card => {

      const siswaId =
        card.querySelector(
          ".catatan-siswa-select"
        ).value;

      const kategori =
        card.querySelector(
          ".catatan-kategori"
        ).value;

      const catatan =
        card.querySelector(
          ".catatan-siswa-text"
        ).value;

      if (
        siswaId &&
        catatan
      ) {

      detail.push({

        jurnal_id:
          jurnal.id,

        school_id:
          currentClass.school_id,

        class_id:
          currentClass.id,

        siswa_id:
          Number(siswaId),

        kategori,

        catatan

      });

      }

    });

    if (
      detail.length > 0
    ) {

      const {
        error
      } = await supabase

        .from(
          "jurnal_siswa_sd"
        )

        .insert(detail);

      if (error)
        throw error;

    }

    alert(
      "Jurnal berhasil disimpan."
    );

    resetFormJurnal();

    loadRiwayatJurnal();

    } catch (err) {

      console.error(
        "ERROR JURNAL:",
        err
      );

      alert(
        JSON.stringify(err)
      );

    }
  }



// =====================
// RIWAYAT
// =====================

async function loadRiwayatJurnal() {

  const container =
    document.getElementById(
      "jurnalList"
    );

  if (!container) return;

  const {
    data,
    error
  } = await supabase

    .from("jurnal_kelas_sd")

    .select(`
      *,
      mata_pelajaran(
        nama_mapel
      )
    `)

    .eq(
      "school_id",
      currentClass.school_id
    )

    .eq(
      "class_id",
      currentClass.id
    )

    .order(
      "tanggal",
      {
        ascending:false
      }
    )

    .limit(20);

  if (error) {

    console.error(error);
    return;

  }

  container.innerHTML = "";

  data.forEach(item => {

    container.innerHTML += `

      <div class="jurnal-item">

        <h4>
          ${item.tanggal}
        </h4>

        <div>
          <strong>Kelas:</strong>
          ${item.kelas}
        </div>

        <div>
          <strong>Mapel:</strong>
          ${
            item.mata_pelajaran?.nama_mapel || "-"
          }
        </div>

        <div>
          <strong>Materi:</strong>
          ${item.materi || "-"}
        </div>

        <div>
          <strong>Kegiatan:</strong>
          ${item.kegiatan || "-"}
        </div>

        <br>

        <button
          class="btn-edit-jurnal"
          onclick="editJurnal(${item.id})"
        >
          ✏️ Edit
        </button>

        <button
          class="btn-hapus-jurnal"
          onclick="hapusJurnal(${item.id})"
        >
          🗑 Hapus
        </button>

      </div>

      <hr>

    `;

  });

}


// =====================
// RESET
// =====================

function resetFormJurnal() {

  document.getElementById(
    "jurnalTanggal"
  ).value = "";

  document.getElementById(
    "jurnalKelas"
  ).value = "";

  document.getElementById(
    "jurnalMapel"
  ).value = "";

  document.getElementById(
    "jurnalMateri"
  ).value = "";

  document.getElementById(
    "jurnalKegiatan"
  ).value = "";

  document.getElementById(
    "jurnalCatatan"
  ).value = "";

  document.getElementById(
    "catatanSiswaContainer"
  ).innerHTML = "";

}
window.hapusJurnal = async function(id){

  console.log(
    "HAPUS ID:",
    id
  );

  const yakin = confirm(
    "Hapus jurnal ini?"
  );

  if(!yakin) return;

  try{

    // hapus detail siswa

    const detailResult =
      await supabase

        .from("jurnal_siswa_sd")

        .delete()

        .eq(
          "jurnal_id",
          Number(id)
        )

        .select();

    console.log(
      "DETAIL DELETE:",
      detailResult
    );

    // hapus jurnal utama

      const jurnalResult =
        await supabase
          .from("jurnal_kelas_sd")
          .delete()
          .eq("id", Number(id))
          .select();

      console.log(
        "JURNAL DELETE DATA:",
        jurnalResult.data
      );

      console.log(
        "JURNAL DELETE ERROR:",
        jurnalResult.error
      );

    if(jurnalResult.error)
      throw jurnalResult.error;

    if(
      !jurnalResult.data ||
      jurnalResult.data.length === 0
    ){

      alert(
        "Tidak ada data yang terhapus. Cek RLS atau ID jurnal."
      );

      return;

    }

    alert(
      "Jurnal berhasil dihapus"
    );

    await loadRiwayatJurnal();

  }
  catch(err){

    console.error(
      "DELETE ERROR:",
      err
    );

    alert(
      JSON.stringify(err)
    );

  }

};