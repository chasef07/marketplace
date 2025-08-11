import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { ratelimit, withRateLimit } from '@/lib/rate-limit'

// AI chat functionality replaced with Quick Actions overlay for better UX

const supabase = createSupabaseServerClient()

// Legacy functions removed - now using Quick Actions overlay with direct API calls

export async function POST(request: NextRequest) {
  return withRateLimit(request, ratelimit.chat, async () => {
    try {
      // Redirect users to use the new Quick Actions overlay
      return NextResponse.json({ 
        message: "I've been upgraded! Please use the Quick Actions button (✨) in the bottom-right corner for a faster, more reliable experience. No more AI delays - just instant actions!",
        conversation_id: null 
      })

    } catch (error: unknown) {
      return NextResponse.json(
        { message: "Please use the Quick Actions button (✨) for marketplace actions!" },
        { status: 200 }
      )
    }
  })
}