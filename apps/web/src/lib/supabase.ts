import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from './database.types'

// Singleton client instances to prevent multiple client creation
let clientInstance: ReturnType<typeof createSupabaseClient<Database>> | null = null
let serverInstance: ReturnType<typeof createSupabaseClient<Database>> | null = null

// Client-side Supabase client (singleton)
export const createClient = () => {
  if (!clientInstance) {
    clientInstance = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return clientInstance
}

// Server-side Supabase client (singleton)
export const createSupabaseServerClient = () => {
  if (!serverInstance) {
    serverInstance = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return serverInstance
}

// Reset instances (useful for testing or if credentials change)
export const resetSupabaseInstances = () => {
  clientInstance = null
  serverInstance = null
}