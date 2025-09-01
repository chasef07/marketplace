import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from "@/lib/supabase-server"

// GET - Get AI agent status for current user
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get the Authorization header from the client request
    const authHeader = request.headers.get('authorization')
    
    let user = null
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Use the access token from the header
      const token = authHeader.split(' ')[1]
      const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token)
      
      if (!tokenError && tokenUser) {
        user = tokenUser
      }
    }
    
    if (!user) {
      // Fall back to session-based authentication
      const { data: { user: sessionUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !sessionUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      user = sessionUser
    }

    try {
      // Get agent profile for the user
      const { data: agentProfile, error: profileError } = await supabase
        .from('seller_agent_profile')
        .select('*')
        .eq('seller_id', user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching agent profile:', profileError)
        return NextResponse.json({ 
          error: 'Failed to fetch agent status',
          details: profileError.message 
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        agentProfile: agentProfile || null
      })

    } catch (dbError) {
      console.error('Database error fetching agent status:', dbError)
      return NextResponse.json({ 
        error: 'Failed to fetch agent status',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Agent status error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}