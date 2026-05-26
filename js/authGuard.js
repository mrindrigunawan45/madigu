import { supabaseClient } from './supabase.js'
import { getCurrentProfile } from './session.js'

const { data } =
  await supabaseClient.auth.getSession()

if (!data.session) {

  window.location.href =
    'index.html'

}

// load profile + school_id
const profile =
  await getCurrentProfile()

console.log(
  'CURRENT USER:',
  profile
)
