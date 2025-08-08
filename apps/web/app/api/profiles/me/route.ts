import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { ratelimit, withRateLimit } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  return withRateLimit(request, ratelimit.api, async () => {
    try {
      const supabase = createSupabaseServerClient()

      // Get authenticated user
      const authHeader = request.headers.get('authorization')
      let user = null
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1]
        const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token)
        
        if (!tokenError && tokenUser) {
          user = tokenUser
        }
      }
      
      if (!user) {
        const { data: { user: sessionUser }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !sessionUser) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        
        user = sessionUser
      }

      // Get full profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Error fetching profile:', profileError)
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
      }

      const response = NextResponse.json(profile)
      response.headers.set('Cache-Control', 'private, max-age=300')
      return response

    } catch (error) {
      console.error('Get my profile error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}

export async function PUT(request: NextRequest) {
  return withRateLimit(request, ratelimit.api, async () => {
    try {
      const supabase = createSupabaseServerClient()

      // Get authenticated user
      const authHeader = request.headers.get('authorization')
      let user = null
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1]
        const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token)
        
        if (!tokenError && tokenUser) {
          user = tokenUser
        }
      }
      
      if (!user) {
        const { data: { user: sessionUser }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !sessionUser) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        
        user = sessionUser
      }

      const body = await request.json()

      // Validate and sanitize input
      const allowedFields = [
        'display_name',
        'bio',
        'profile_picture_filename',
        'location_city',
        'location_state',
        'zip_code'
      ]

      const updateData: Record<string, any> = {}
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updateData[field] = body[field]
        }
      }

      // Validate required fields
      if (updateData.display_name && updateData.display_name.trim().length === 0) {
        return NextResponse.json({ error: 'Display name cannot be empty' }, { status: 400 })
      }

      // Limit bio length
      if (updateData.bio && updateData.bio.length > 500) {
        return NextResponse.json({ error: 'Bio cannot exceed 500 characters' }, { status: 400 })
      }

      // Update timestamp
      updateData.updated_at = new Date().toISOString()

      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating profile:', error)
        return NextResponse.json({ 
          error: 'Failed to update profile',
          details: error.message
        }, { status: 500 })
      }

      return NextResponse.json(updatedProfile)

    } catch (error) {
      console.error('Update profile error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}