import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function POST() {
  try {
    const supabase = createSupabaseServerClient()
    
    // First, let's check the current profiles table structure
    const { data: profiles, error: selectError } = await supabase
      .from('profiles')
      .select('id, username, email')
      .limit(5)
    
    if (selectError) {
      console.error('Error selecting profiles:', selectError)
      return NextResponse.json({ 
        error: 'Failed to read profiles table',
        details: selectError.message 
      }, { status: 500 })
    }
    
    // Try to update one profile with a zip code to test if column exists
    if (profiles && profiles.length > 0) {
      const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update({ zip_code: '90210' })
        .eq('id', profiles[0].id)
        .select()
      
      if (updateError) {
        return NextResponse.json({ 
          error: 'zip_code column may not exist',
          details: updateError.message,
          suggestion: 'Please add the zip_code column to the profiles table in Supabase'
        }, { status: 500 })
      }
      
      return NextResponse.json({ 
        success: true,
        message: 'Successfully updated profile with zip code',
        updated_profile: updateData,
        all_profiles: profiles
      })
    }
    
    return NextResponse.json({ 
      success: false,
      message: 'No profiles found to update'
    })
    
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: (error as Error).message
    }, { status: 500 })
  }
}