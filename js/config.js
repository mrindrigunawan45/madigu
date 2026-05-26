import { createClient } from
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL =
  'https://ocakjidyndcojeapdsop.supabase.co'

const SUPABASE_ANON_KEY =
  'sb_publishable_sBVisHxIzGA1pEtlChR5pw_pcF-J3nm'

export const supabase =
  createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  )