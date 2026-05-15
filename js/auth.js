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

      console.log(data)
      console.log(error)

      if (error) {

        alert(error.message)

        return

      }

      window.location.href =
        'dashboard.html'

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