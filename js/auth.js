import { supabaseClient }

from './supabase.js'

console.log('AUTH ACTIVE')

// =========================
// LOGIN
// =========================

const loginForm =
  document.getElementById('loginForm')

if (loginForm) {

  loginForm.addEventListener(
    'submit',
    async (e) => {

      e.preventDefault()

      const email =
        document.getElementById('email').value

      const password =
        document.getElementById('password').value

      console.log(email, password)

      const { data, error } =

        await supabaseClient.auth

          .signInWithPassword({

            email,
            password

          })

      // ERROR LOGIN
      if (error) {

        alert(error.message)

        return

      }

      const user = data.user

      // AMBIL PROFILE
      const { data: profile } =
        await supabaseClient

          .from('profiles')

          .select('*')

          .eq('id', user.id)

          .single()

      if (!profile) {

        alert('Profile tidak ditemukan')

        return
      }

      const role = profile.role

      console.log('ROLE:', role)

      // =========================
// REDIRECT BERDASARKAN ROLE
// =========================

if (role === 'agen') {

  window.location.href =
    'lapor.html'

  return

} else if (role === 'bk') {

  window.location.href =
    'dashboard-bk.html'

  return

} else if (role === 'guru_sd') {

  window.location.href =
    'dashboard-sd.html'

  return

} else if (role === 'kepsek_sd') {

  window.location.href =
    'dashboard-kepsek-sd.html'

  return

} else if (role === 'kepsek_smp') {

  window.location.href =
    'dashboard-kepsek-smp.html'

  return

} else {

  window.location.href =
    'dashboard.html'

  return

}
    }
  )

}

// =========================
// CHECK AUTH
// =========================

async function checkAuth() {

  const {

    data: { session }

  } = await supabaseClient.auth

    .getSession()

  console.log(session)

  if (

    !session &&

    window.location.pathname

      .includes('dashboard.html')

  ) {

    window.location.href =
      'index.html'

  }

}

checkAuth()

// =========================
// LOGOUT
// =========================

const logoutBtn =
  document.getElementById('logoutBtn')

if (logoutBtn) {

  logoutBtn.addEventListener(
    'click',
    async () => {

      await supabaseClient.auth

        .signOut()

      window.location.href =
        'index.html'

    }
  )

}