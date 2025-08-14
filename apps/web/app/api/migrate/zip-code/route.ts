import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    // Create a service role client with full access
    const supabaseServiceRole = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    console.log('🔧 Starting zip_code migration...')
    
    // First, let's check if the column already exists by trying to select it
    const { error: testError } = await supabaseServiceRole
      .from('profiles')
      .select('zip_code')
      .limit(1)
    
    if (testError && testError.message.includes('column "zip_code" does not exist')) {
      // Column doesn't exist, we need to add it
      console.log('📝 zip_code column does not exist, attempting to add it...')
      
      // Use raw SQL to add the column
      const { error: sqlError } = await supabaseServiceRole
        .rpc('exec', {
          sql: 'ALTER TABLE public.profiles ADD COLUMN zip_code VARCHAR(10);'
        })
      
      if (sqlError) {
        console.error('❌ SQL Error:', sqlError)
        return NextResponse.json({
          error: 'Failed to add zip_code column',
          details: sqlError.message,
          suggestion: 'Please run this SQL manually in Supabase Dashboard: ALTER TABLE public.profiles ADD COLUMN zip_code VARCHAR(10);'
        }, { status: 500 })
      }
      
      console.log('✅ Column added via SQL')
    } else if (testError) {
      return NextResponse.json({
        error: 'Database error',
        details: testError.message
      }, { status: 500 })
    } else {
      console.log('✅ zip_code column already exists')
    }
    
    // Now update existing profiles with test zip codes
    const { data: updateData, error: updateError } = await supabaseServiceRole
      .from('profiles')
      .update({ zip_code: '90210' })
      .is('zip_code', null)
      .select('id, username, email, zip_code')
    
    if (updateError) {
      console.error('❌ Update Error:', updateError)
      return NextResponse.json({
        error: 'Failed to update profiles with zip codes',
        details: updateError.message
      }, { status: 500 })
    }
    
    // Verify by selecting some profiles with zip codes
    const { data: verifyData, error: verifyError } = await supabaseServiceRole
      .from('profiles')
      .select('id, username, email, zip_code')
      .not('zip_code', 'is', null)
      .limit(5)
    
    if (verifyError) {
      return NextResponse.json({
        error: 'Verification failed',
        details: verifyError.message
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: `✅ Migration completed successfully!`,
      updated_count: updateData?.length || 0,
      updated_profiles: updateData?.map(p => ({ 
        username: p.username, 
        email: p.email, 
        zip_code: p.zip_code 
      })),
      verification_count: verifyData?.length || 0,
      sample_profiles: verifyData?.map(p => ({ 
        username: p.username, 
        zip_code: p.zip_code 
      }))
    })
    
  } catch (error) {
    console.error('❌ Migration error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: (error as Error).message
    }, { status: 500 })
  }
}