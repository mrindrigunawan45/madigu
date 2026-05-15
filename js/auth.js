import { supabaseClient } from './supabase.js'
import { showToast, showLoading, hideLoading } from './utils.js'

window.login = async () => {

  const email = document.getElementById('email').value
  const password = document.getElementById('password').value

  showLoading()

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  })

  hideLoading()

  if (error) {
    showToast(error.message, 'error')
    return
  }

  showToast('Login berhasil')

  setTimeout(() => {
    window.location.href = 'dashboard.html'
  }, 1000)
}