import { supabaseClient } from './supabase.js'

export async function getCurrentProfile() {

  const {
    data: { session }
  } = await supabaseClient.auth.getSession()

  if (!session) return null

  const { data, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (error) {
    console.error(error)
    return null
  }

  window.currentUser = data

  return data
}

export async function getCurrentSchoolId() {

  const profile = await getCurrentProfile()

  return profile?.school_id || null
}
