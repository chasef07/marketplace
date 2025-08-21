import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { seller_id } = body

    if (!seller_id) {
      return NextResponse.json({
        success: false,
        error: 'seller_id required'
      }, { status: 400 })
    }

    // Check if seller profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('seller_agent_profile')
      .select('*')
      .eq('seller_id', seller_id)
      .single()

    if (existingProfile) {
      return NextResponse.json({
        success: true,
        message: 'Seller agent profile already exists',
        profile: existingProfile
      })
    }

    // Create new seller agent profile with default settings
    const { data: newProfile, error: createError } = await supabase
      .from('seller_agent_profile')
      .insert({
        seller_id: seller_id,
        agent_enabled: true,
        aggressiveness_level: 0.5, // Balanced
        auto_accept_threshold: 0.9, // 90% of listing price
        min_acceptable_ratio: 0.7, // 70% of listing price
        response_delay_minutes: 0 // Immediate response
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating seller agent profile:', createError)
      return NextResponse.json({
        success: false,
        error: 'Failed to create seller agent profile',
        details: createError
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Seller agent profile created successfully',
      profile: newProfile
    })

  } catch (error) {
    console.error('Fix seller profile error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fix seller profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET endpoint to check current seller profile
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const seller_id = url.searchParams.get('seller_id')

    if (!seller_id) {
      return NextResponse.json({
        success: false,
        error: 'seller_id parameter required'
      }, { status: 400 })
    }

    const { data: profile, error } = await supabase
      .from('seller_agent_profile')
      .select('*')
      .eq('seller_id', seller_id)
      .single()

    return NextResponse.json({
      success: true,
      profile: profile,
      exists: !!profile,
      error: error
    })

  } catch (error) {
    console.error('Check seller profile error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to check seller profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}