import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from './supabase'

export interface AuthResult {
  user: {
    id: string
    email?: string
    [key: string]: unknown
  } | null
  token: string | null
  error?: string
}

export async function getAuthenticatedUser(request: NextRequest): Promise<AuthResult> {
  const supabase = createSupabaseServerClient()
  
  // Try Authorization header first
  const authHeader = request.headers.get('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: authError } = await supabase.auth.getUser(token)
    
    if (!authError && userData.user) {
      return {
        user: {
          ...userData.user,
          id: userData.user.id,
          email: userData.user.email
        },
        token: token
      }
    }
  }
  
  // Fallback to session-based auth
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError || !session?.user) {
    return {
      user: null,
      token: null,
      error: 'Authentication required'
    }
  }
  
  return {
    user: {
      ...session.user,
      id: session.user.id,
      email: session.user.email
    },
    token: session.access_token
  }
}

export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const authResult = await getAuthenticatedUser(request)
  
  if (!authResult.user) {
    throw new Error(authResult.error || 'Authentication required')
  }
  
  return authResult
}