import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Browser client for client-side operations
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export default createClient