import { supabaseClient } from './supabase.js'

console.log('AUTH ACTIVE')

// =========================
// 1. LOGIN & REDIRECT
// =========================
const loginForm = document.getElementById('loginForm')

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault()

    const email = document.getElementById('email').value
    const password = document.getElementById('password').value

    console.log('Proses Login:', email)

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    })

    // JIKA ERROR LOGIN
    if (error) {
      alert('Login Gagal: ' + error.message)
      return
    }

    const user = data.user

    // AMBIL PROFILE USER DARI SUPABASE
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      alert('Profile tidak ditemukan!')
      return
    }

    const role = profile.role
    console.log('ROLE USER:', role)

    // REDIRECT PERALIHAN HALAMAN BERDASARKAN ROLE
    if (role === 'sekretaris') {
      window.location.href = 'sekretaris.html'
      return
    } else if (role === 'agen') {
      window.location.href = 'lapor.html'
      return
    } else if (role === 'bk') {
      window.location.href = 'dashboard-bk.html'
      return
    } else if (role === 'guru_sd') {
      window.location.href = 'dashboard-sd.html'
      return
    } else if (role === 'guru_mapel') {
      window.location.href = 'dashboard-guru-mapel.html'
      return
    } else if (role === 'kepsek_sd') {
      window.location.href = 'dashboard-kepsek-sd.html'
      return
    } else if (role === 'kepsek_smp') {
      window.location.href = 'dashboard-kepsek-smp.html'
      return
    } else {
      // Default jika role umum
      window.location.href = 'dashboard.html'
      return
    }
  })
}

// =========================
// 2. CHECK SESSION (PROTEKSI HALAMAN)
// =========================
async function checkAuth() {
  const {
    data: { session }
  } = await supabaseClient.auth.getSession()

  // Ambil halaman saat ini
  const currentPath = window.location.pathname

  // Jika belum login tapi mencoba akses halaman yang diproteksi
  if (!session && (currentPath.includes('dashboard') || currentPath.includes('sekretaris.html') || currentPath.includes('lapor.html'))) {
    window.location.href = 'index.html'
  }
}

checkAuth()

// =========================
// 3. LOGOUT
// =========================
const logoutBtn = document.getElementById('logoutBtn')

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await supabaseClient.auth.signOut()
    window.location.href = 'index.html'
  })
}