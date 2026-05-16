import { supabaseClient } from './supabase.js'

const logoutBtn =
  document.getElementById('logoutBtn')

// =========================
// CEK LOGIN
// =========================

async function checkLogin() {

  const session =
    localStorage.getItem('session')

  if (!session) {

    window.location.href =
      'index.html'

  }

}

checkLogin()

// =========================
// LOGOUT
// =========================

if (logoutBtn) {

  logoutBtn.addEventListener(
    'click',
    async () => {

      localStorage.removeItem('session')

      localStorage.removeItem('guru_nama')

      localStorage.removeItem('school_id')

      window.location.href =
        'index.html'

    }
  )

}

// =========================
// LOGIN PAGE
// =========================

const loginBtn =
  document.getElementById('loginBtn')

if (loginBtn) {

  loginBtn.addEventListener(
    'click',
    async () => {

      const username =
        document
          .getElementById('username')
          .value

      const password =
        document
          .getElementById('password')
          .value

      if (!username || !password) {

        alert(
          'Username dan password wajib diisi'
        )

        return

      }

      // =========================
      // CEK KE DATABASE GURU
      // =========================

      const { data, error } =
        await supabaseClient

          .from('guru')

          .select('*')

          .eq('username', username)

          .eq('password', password)

          .single()

      if (error || !data) {

        alert(
          'Username atau password salah'
        )

        return

      }

      // =========================
      // SIMPAN SESSION
      // =========================

      localStorage.setItem(
        'session',
        JSON.stringify(data)
      )

      // =========================
      // SIMPAN NAMA GURU
      // =========================

      localStorage.setItem(
        'guru_nama',
        data.nama_guru
      )

      // =========================
      // SIMPAN SCHOOL ID
      // =========================

      localStorage.setItem(
        'school_id',
        data.school_id
      )

      // =========================
      // REDIRECT
      // =========================

      window.location.href =
        'dashboard.html'

    }
  )

}