const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function addZipCodeColumn() {
  try {
    console.log('🔧 Adding zip_code column to profiles table...')
    
    // Add the zip_code column
    const { data: alterData, error: alterError } = await supabase.rpc('exec', {
      sql: `
        ALTER TABLE public.profiles 
        ADD COLUMN IF NOT EXISTS zip_code VARCHAR(10);
        
        COMMENT ON COLUMN public.profiles.zip_code IS 'User zip code for local pickup/delivery area';
      `
    })
    
    if (alterError) {
      console.error('❌ Error adding column:', alterError.message)
      // Try alternative approach
      console.log('🔄 Trying alternative approach...')
      
      // Use a direct SQL query instead
      const { error: directError } = await supabase
        .from('profiles')
        .select('zip_code')
        .limit(1)
      
      if (directError && directError.message.includes('column "zip_code" does not exist')) {
        console.error('❌ zip_code column definitely does not exist')
        console.log('📝 Please run this SQL manually in Supabase Dashboard:')
        console.log('ALTER TABLE public.profiles ADD COLUMN zip_code VARCHAR(10);')
        return false
      }
    } else {
      console.log('✅ Column added successfully')
    }
    
    // Update existing users with test zip codes
    console.log('📍 Adding test zip codes to existing users...')
    
    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update({ zip_code: '90210' })
      .is('zip_code', null)
      .select('id, username, zip_code')
    
    if (updateError) {
      console.error('❌ Error updating profiles:', updateError.message)
      return false
    }
    
    console.log(`✅ Updated ${updateData?.length || 0} profiles with zip code 90210`)
    console.log('Updated profiles:', updateData?.map(p => ({ username: p.username, zip_code: p.zip_code })))
    
    // Verify the column exists by selecting it
    const { data: verifyData, error: verifyError } = await supabase
      .from('profiles')
      .select('id, username, zip_code')
      .limit(3)
    
    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message)
      return false
    }
    
    console.log('✅ Verification successful!')
    console.log('Sample profiles with zip codes:', verifyData)
    
    return true
    
  } catch (error) {
    console.error('❌ Script error:', error.message)
    return false
  }
}

// Run the script
addZipCodeColumn().then(success => {
  if (success) {
    console.log('🎉 Migration completed successfully!')
    console.log('🔄 Refresh your browser to see zip code maps!')
  } else {
    console.log('❌ Migration failed. Please add the column manually in Supabase Dashboard.')
  }
  process.exit(success ? 0 : 1)
})