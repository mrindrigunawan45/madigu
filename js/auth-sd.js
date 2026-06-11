import { supabase } from './config.js'

export async function getCurrentProfile() {

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()

  if (authError || !user) {

    console.error(
      'User tidak ditemukan'
    )

    return null

  }

  const {
    data: profile,
    error: profileError
  } = await supabase

    .from('profiles')

    .select('*')

    .eq('id', user.id)

    .single()

  if (profileError) {

    console.error(profileError)

    return null

  }

  return profile

}

export async function getCurrentClass() {

  const profile =
    await getCurrentProfile()

  console.log(
    'PROFILE LOGIN:',
    profile
  )

  console.log(
    'CLASS ID:',
    profile?.class_id
  )

  if (
    !profile ||
    !profile.class_id
  ) {

    return null

  }

  const {
    data,
    error
  } = await supabase

    .from('kelas')

    .select('*')

    .eq(
      'id',
      profile.class_id
    )

  console.log(
    'DATA KELAS:',
    data
  )

  console.log(
    'ERROR KELAS:',
    error
  )

  if (error) {

    return null

  }

  return data?.[0] || null

}