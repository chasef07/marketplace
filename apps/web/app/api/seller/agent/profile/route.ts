import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { z } from 'zod'

const agentProfileSchema = z.object({
  aggressiveness_level: z.number().min(0).max(1),
  auto_accept_threshold: z.number().min(0).max(1),
  min_acceptable_ratio: z.number().min(0).max(1),
  response_delay_minutes: z.number().min(0),
  enabled: z.boolean()
})

// GET seller agent profile
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get or create agent profile
    const { data: profile, error } = await supabase
      .from('seller_agent_profile')
      .select('*')
      .eq('seller_id', user.id)
      .single()

    if (error) {
      // If profile doesn't exist, return default settings
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          seller_id: user.id,
          aggressiveness_level: 0.5,
          auto_accept_threshold: 0.95,
          min_acceptable_ratio: 0.75,
          response_delay_minutes: 0,
          enabled: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }
      return NextResponse.json({ error: 'Failed to get agent profile' }, { status: 500 })
    }

    return NextResponse.json(profile)

  } catch (error) {
    console.error('Get agent profile error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST/PUT create or update seller agent profile
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const body = await request.json()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate input
    const validation = agentProfileSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: validation.error.errors 
      }, { status: 400 })
    }

    const profileData = {
      seller_id: user.id,
      ...validation.data,
      updated_at: new Date().toISOString()
    }

    console.log('Attempting to save profile data:', profileData)

    // Upsert (create or update) the profile
    const { data: profile, error } = await supabase
      .from('seller_agent_profile')
      .upsert(profileData, { 
        onConflict: 'seller_id',
        ignoreDuplicates: false 
      })
      .select()
      .single()

    if (error) {
      console.error('Upsert agent profile error:', error)
      return NextResponse.json({ 
        error: 'Failed to save agent profile',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    console.log('Successfully saved profile:', profile)
    return NextResponse.json(profile)

  } catch (error) {
    console.error('Save agent profile error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT update seller agent profile (same as POST for this case)
export async function PUT(request: NextRequest) {
  return POST(request)
}