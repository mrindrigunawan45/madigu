import { supabaseClient } from './supabase.js'

const { data } = await supabaseClient.auth.getSession()

if (!data.session) {
  window.location.href = 'index.html'
}