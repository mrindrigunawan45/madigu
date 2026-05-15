import { createClient }

from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL =
  'https://ocakjidyndcojeapdsop.supabase.co'

const SUPABASE_KEY =
  'sb_publishable_sBVisHxIzGA1pEtlChR5pw_pcF-J3nm'

const supabase =
  createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  )

// =========================
// LOGIN PAGE
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

      const { error } =
        await supabase.auth.signInWithPassword({

          email,
          password

        })

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
// CEK LOGIN
// =========================

async function checkAuth() {

  const {

    data: { session }

  } = await supabase.auth.getSession()

  // kalau belum login

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

      await supabase.auth.signOut()

      window.location.href =
        'index.html'

    }
  )

}