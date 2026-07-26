import { supabase } from './config.js';
import { loadCurrentUser, getCurrentUser } from './session.js';

let currentClass = null;
let currentUser = null;

const kategoriList = [
  "Akademik",
  "Perilaku",
  "Sosial",
  "Kedisiplinan",
  "Prestasi",
  "Lainnya"
];

// =====================
// INIT JURNAL
// =====================
export async function initJurnal() {
  console.log("🚀 INIT JURNAL DIJALANKAN...");

  try {
    await loadCurrentUser();
    currentUser = getCurrentUser();

    if (!currentUser) {
      console.error("❌ User session tidak ditemukan!");
      return;
    }

    currentClass = currentUser.kelas;
    console.log("📌 DATA KELAS JURNAL:", currentClass);

    // 1. Auto Set Tanggal Hari Ini
    const tglInput = document.getElementById("jurnalTanggal");
    if (tglInput) {
      tglInput.value = new Date().toISOString().split('T')[0];
    }

    // 2. Load Data
    loadKelasJurnal();
    await loadMapelJurnal();
    loadRiwayatJurnal();

    // 3. Re-bind Event Listener Tombol Tambah Catatan Siswa
    const addBtn = document.getElementById("addCatatanSiswaBtn");
    if (addBtn) {
      addBtn.onclick = (e) => {
        e.preventDefault();
        addCatatanSiswaRow();
      };
      console.log("✅ Tombol Tambah Catatan Siswa Terhubung");
    } else {
      console.warn("⚠️ Tombol #addCatatanSiswaBtn tidak ditemukan di HTML!");
    }

    // 4. Re-bind Event Listener Tombol Simpan
    const saveBtn = document.getElementById("saveJurnalBtn");
    if (saveBtn) {
      saveBtn.onclick = (e) => {
        e.preventDefault();
        saveJurnal();
      };
    }

  } catch (err) {
    console.error("❌ Error pada initJurnal:", err);
  }
}

// =====================
// LOAD KELAS
// =====================
function loadKelasJurnal() {
  const select = document.getElementById("jurnalKelas");
  if (!select) return;

  if (currentClass && currentClass.nama_kelas) {
    select.innerHTML = `<option value="${currentClass.nama_kelas}">Kelas ${currentClass.nama_kelas}</option>`;
    select.disabled = true;
  } else {
    select.innerHTML = `<option value="">-</option>`;
  }
}

// =====================
// LOAD MAPEL
// =====================
async function loadMapelJurnal() {
  const select = document.getElementById("jurnalMapel");
  if (!select) return;

  const schoolId = currentClass?.school_id || currentUser?.profile?.school_id;

  let query = supabase.from("mata_pelajaran").select("*");
  if (schoolId) {
    query = query.or(`school_id.eq.${schoolId},school_id.is.null`);
  }

  const { data, error } = await query.order("nama_mapel");

  if (error) {
    console.error("❌ Gagal load mapel:", error);
    return;
  }

  select.innerHTML = `<option value="">Pilih Mata Pelajaran</option>`;

  if (data && data.length > 0) {
    data.forEach(mapel => {
      select.innerHTML += `<option value="${mapel.id}">${mapel.nama_mapel}</option>`;
    });
  } else {
    select.innerHTML = `<option value="">Mata pelajaran kosong</option>`;
  }
}

// =====================
// TAMBAH CATATAN SISWA
// =====================
function addCatatanSiswaRow() {
  console.log("➕ Menambahkan baris catatan siswa...");
  const container = document.getElementById("catatanSiswaContainer");
  
  if (!container) {
    console.error("❌ Container #catatanSiswaContainer tidak ditemukan!");
    return;
  }

  const row = document.createElement("div");
  row.className = "catatan-siswa-card";
  row.style.cssText = "background: #f9fafb; padding: 12px; margin-bottom: 12px; border-radius: 8px; border: 1px solid #e5e7eb;";

  row.innerHTML = `
    <div style="display: flex; gap: 10px; margin-bottom: 8px;">
      <select class="catatan-siswa-select" style="flex: 1; padding: 8px; border-radius: 4px; border: 1px solid #ccc;">
        <option value="">Pilih Siswa</option>
      </select>
      <select class="catatan-kategori" style="width: 150px; padding: 8px; border-radius: 4px; border: 1px solid #ccc;">
        ${kategoriList.map(item => `<option value="${item}">${item}</option>`).join("")}
      </select>
    </div>
    <textarea class="catatan-siswa-text" rows="2" placeholder="Catatan siswa..." style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ccc; box-sizing: border-box;"></textarea>
    <button type="button" class="remove-catatan" style="margin-top: 6px; background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Hapus</button>
  `;

  container.appendChild(row);

  loadSiswaDropdown(row);

  row.querySelector(".remove-catatan").onclick = () => row.remove();
}

// =====================
// LOAD SISWA DROPDOWN
// =====================
async function loadSiswaDropdown(row) {
  const select = row.querySelector(".catatan-siswa-select");
  if (!select || !currentClass) return;

  const { data, error } = await supabase
    .from("siswa")
    .select("*")
    .eq("class_id", currentClass.id)
    .order("nama_siswa");

  if (error) {
    console.error("Gagal load siswa:", error);
    return;
  }

  data?.forEach(siswa => {
    select.innerHTML += `<option value="${siswa.id}">${siswa.nama_siswa}</option>`;
  });
}

// =====================
// SIMPAN JURNAL
// =====================
async function saveJurnal() {
  try {
    const tanggal = document.getElementById("jurnalTanggal")?.value;
    const kelas = document.getElementById("jurnalKelas")?.value;
    const mapelId = document.getElementById("jurnalMapel")?.value;
    const materi = document.getElementById("jurnalMateri")?.value;
    const kegiatan = document.getElementById("jurnalKegiatan")?.value;
    const catatan = document.getElementById("jurnalCatatan")?.value;

    if (!tanggal || !kelas || !mapelId) {
      alert("Lengkapi Tanggal, Kelas, dan Mata Pelajaran!");
      return;
    }

    const { data: jurnal, error: jurnalError } = await supabase
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

    if (jurnalError) throw jurnalError;

    const cards = document.querySelectorAll(".catatan-siswa-card");
    const detail = [];

    cards.forEach(card => {
      const siswaId = card.querySelector(".catatan-siswa-select").value;
      const kategori = card.querySelector(".catatan-kategori").value;
      const textCatatan = card.querySelector(".catatan-siswa-text").value;

      if (siswaId && textCatatan) {
        detail.push({
          jurnal_id: jurnal.id,
          school_id: currentClass.school_id,
          class_id: currentClass.id,
          siswa_id: Number(siswaId),
          kategori,
          catatan: textCatatan
        });
      }
    });

    if (detail.length > 0) {
      await supabase.from("jurnal_siswa_sd").insert(detail);
    }

    alert("Jurnal berhasil disimpan!");
    resetFormJurnal();
    loadRiwayatJurnal();
  } catch (err) {
    console.error("ERROR JURNAL:", err);
    alert("Gagal simpan jurnal: " + (err.message || JSON.stringify(err)));
  }
}

// =====================
// LOAD RIWAYAT
// =====================
async function loadRiwayatJurnal() {
  const container = document.getElementById("jurnalList");
  if (!container || !currentClass) return;

  const { data, error } = await supabase
    .from("jurnal_kelas_sd")
    .select(`*, mata_pelajaran(nama_mapel)`)
    .eq("school_id", currentClass.school_id)
    .eq("class_id", currentClass.id)
    .order("tanggal", { ascending: false })
    .limit(20);

  if (error) return;

  container.innerHTML = "";
  data?.forEach(item => {
    container.innerHTML += `
      <div class="jurnal-item" style="padding: 10px 0; border-bottom: 1px solid #eee;">
        <h4>${item.tanggal}</h4>
        <div><strong>Kelas:</strong> ${item.kelas}</div>
        <div><strong>Mapel:</strong> ${item.mata_pelajaran?.nama_mapel || "-"}</div>
        <div><strong>Materi:</strong> ${item.materi || "-"}</div>
        <div style="margin-top: 8px;">
          <button onclick="hapusJurnal(${item.id})" style="background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">🗑 Hapus</button>
        </div>
      </div>
    `;
  });
}

function resetFormJurnal() {
  document.getElementById("jurnalMateri").value = "";
  document.getElementById("jurnalKegiatan").value = "";
  document.getElementById("jurnalCatatan").value = "";
  const container = document.getElementById("catatanSiswaContainer");
  if (container) container.innerHTML = "";
}

window.hapusJurnal = async function(id) {
  if (!confirm("Hapus jurnal ini?")) return;
  try {
    await supabase.from("jurnal_siswa_sd").delete().eq("jurnal_id", Number(id));
    await supabase.from("jurnal_kelas_sd").delete().eq("id", Number(id));
    alert("Jurnal berhasil dihapus");
    await loadRiwayatJurnal();
  } catch (err) {
    alert("Gagal hapus: " + err.message);
  }
};