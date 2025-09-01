import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { z } from 'zod'

const agentSetupSchema = z.object({
  minAcceptablePrice: z.number().nullable(),
  sellingPriority: z.enum(['best_price', 'quick_sale']),
  targetSaleDate: z.string().nullable().transform((val) => val ? new Date(val) : null)
})

// POST - Setup AI agent preferences for first-time user
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const body = await request.json()
    
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

    // Validate input
    const validation = agentSetupSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: validation.error.errors 
      }, { status: 400 })
    }

    const { minAcceptablePrice, sellingPriority, targetSaleDate } = validation.data

    try {
      // Start a transaction to update both tables
      const { error: transactionError } = await supabase.rpc('setup_agent_transaction', {
        user_id: user.id,
        min_price: minAcceptablePrice,
        priority: sellingPriority,
        target_date: targetSaleDate?.toISOString() || null
      })

      if (transactionError) {
        console.error('Transaction error:', transactionError)
        // Fallback to manual operations if the RPC doesn't exist
        
        // Update profile to mark agent setup as seen
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            has_seen_agent_setup: true,
            agent_setup_completed_at: new Date().toISOString()
          })
          .eq('id', user.id)

        if (profileError) {
          console.error('Profile update error:', profileError)
          return NextResponse.json({ 
            error: 'Failed to update profile',
            details: profileError.message 
          }, { status: 500 })
        }

        // Create or update agent profile
        const agentProfileData = {
          seller_id: user.id,
          enabled: true,
          aggressiveness_level: sellingPriority === 'quick_sale' ? 0.7 : 0.5, // More aggressive for quick sales
          auto_accept_threshold: 0.95, // Accept offers at 95% of asking price
          min_acceptable_ratio: minAcceptablePrice ? (minAcceptablePrice / 1000) : 0, // 0 means no minimum price constraint
          response_delay_minutes: 0, // Instant responses
          setup_source: 'first_listing',
          last_activity_at: new Date().toISOString(),
          selling_priority: sellingPriority,
          target_sale_date: targetSaleDate?.toISOString() || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { data: agentProfile, error: agentError } = await supabase
          .from('seller_agent_profile')
          .upsert(agentProfileData, { 
            onConflict: 'seller_id',
            ignoreDuplicates: false 
          })
          .select()
          .single()

        if (agentError) {
          console.error('Agent profile upsert error:', agentError)
          return NextResponse.json({ 
            error: 'Failed to setup agent profile',
            details: agentError.message 
          }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          message: 'AI agent setup completed successfully',
          agentProfile
        })
      }

      // If transaction succeeded
      return NextResponse.json({
        success: true,
        message: 'AI agent setup completed successfully'
      })

    } catch (dbError) {
      console.error('Database error during agent setup:', dbError)
      return NextResponse.json({ 
        error: 'Failed to setup AI agent',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Agent setup error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}