import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Server client for API routes and server-side operations
export function createSupabaseServerClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export default createSupabaseServerClient