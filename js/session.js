import { supabase } from './config.js'

// =====================
// CURRENT USER
// =====================

window.currentUser = null

// =====================
// LOAD CURRENT USER
// =====================

export async function loadCurrentUser() {

  // Sudah pernah dimuat
  if (window.currentUser?.loaded) {

    return window.currentUser

  }

  // =====================
  // AUTH SESSION
  // =====================

  const {
    data: { session },
    error: sessionError
  } = await supabase.auth.getSession()

  if (sessionError) {

    console.error(sessionError)

    return null

  }

  if (!session) {

    window.currentUser = null

    return null

  }

  // =====================
  // PROFILE
  // =====================

  const {
    data: profile,
    error: profileError
  } = await supabase

    .from('profiles')

    .select('*')

    .eq(
      'id',
      session.user.id
    )

    .single()

  if (profileError) {

    console.error(profileError)

    return null

  }

  // =====================
  // KELAS
  // =====================

  let kelas = null

  if (profile.class_id) {

    const {
      data: kelasData,
      error: kelasError
    } = await supabase

      .from('kelas')

      .select('*')

      .eq(
        'id',
        profile.class_id
      )

      .single()

    if (kelasError) {

      console.error(kelasError)

    } else {

      kelas = kelasData

    }

  }

  // =====================
  // CURRENT USER
  // =====================

  window.currentUser = {

    loaded: true,

    profile,

    kelas,

    semester: null,

    sekolah: null,

    permissions: null

  }

  console.log(
    'CURRENT USER SESSION',
    window.currentUser
  )

  return window.currentUser

}

// =====================
// GET CURRENT USER
// =====================

export function getCurrentUser() {

  return window.currentUser

}

// =====================
// GET CURRENT PROFILE
// =====================

export async function getCurrentProfile() {

  if (!window.currentUser?.loaded) {

    await loadCurrentUser()

  }

  return window.currentUser?.profile || null

}

// =====================
// GET CURRENT CLASS
// =====================

export async function getCurrentClass() {

  if (!window.currentUser?.loaded) {

    await loadCurrentUser()

  }

  return window.currentUser?.kelas || null

}

// =====================
// GET CURRENT SCHOOL ID
// =====================

export async function getCurrentSchoolId() {

  const profile =
    await getCurrentProfile()

  return profile?.school_id || null

}

// =====================
// CLEAR SESSION
// =====================

export function clearCurrentUser() {

  window.currentUser = null

}