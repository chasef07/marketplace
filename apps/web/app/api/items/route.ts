import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { ratelimit, withRateLimit } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  return withRateLimit(request, ratelimit.api, async () => {
    try {
    const supabase = createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    
    // Parse pagination parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const offset = (page - 1) * limit

    // Validate pagination parameters
    const validatedLimit = Math.min(Math.max(limit, 1), 50) // Max 50 items per page
    const validatedOffset = Math.max(offset, 0)

    const { data: items, error, count } = await supabase
      .from('items')
      .select(`
        *,
        seller:profiles!seller_id (
          id,
          username,
          email,
          zip_code
        )
      `, { count: 'exact' })
      .in('item_status', ['active', 'under_negotiation'])
      .order('created_at', { ascending: false })
      .range(validatedOffset, validatedOffset + validatedLimit - 1)

    if (error) {
      console.error('Error fetching items:', error)
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }

    // Return paginated response with metadata
    const response = NextResponse.json({
      items: items || [],
      pagination: {
        page,
        limit: validatedLimit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / validatedLimit),
        has_next: validatedOffset + validatedLimit < (count || 0),
        has_prev: page > 1
      }
    })

    // Add caching headers - shorter cache for better UX when new items are added
    response.headers.set('Cache-Control', 'public, max-age=30, s-maxage=60') // 30 sec client, 1 min CDN
    return response
    } catch (error) {
      console.error('Items fetch error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}

export async function POST(request: NextRequest) {
  return withRateLimit(request, ratelimit.api, async () => {
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

    // Valid furniture types from the database enum
    const validFurnitureTypes = [
      'couch', 'dining_table', 'bookshelf', 'chair', 'desk', 'bed',
      'dresser', 'coffee_table', 'nightstand', 'cabinet', 'other'
    ]

    // Map and validate furniture type
    let furnitureType = body.furniture_type?.toLowerCase()
    
    // Handle common mappings - map all home goods to appropriate furniture categories
    const furnitureTypeMap: Record<string, string> = {
      // Furniture mappings
      'sofa': 'couch',
      'sectional': 'couch',
      'loveseat': 'couch',
      'table': 'dining_table',
      'dining': 'dining_table',
      'bookcase': 'bookshelf',
      'shelving': 'bookshelf',
      'wardrobe': 'dresser',
      'armoire': 'dresser',
      'side_table': 'nightstand',
      'end_table': 'nightstand',
      'storage': 'cabinet',
      'entertainment_center': 'cabinet',
      'tv_stand': 'cabinet',
      
      // Musical instruments
      'musical_instrument': 'other',
      'instrument': 'other',
      'piano': 'other',
      'guitar': 'other',
      'drums': 'other',
      'drum_set': 'other',
      'drum': 'other',
      'percussion': 'other',
      'bass': 'other',
      'violin': 'other',
      'keyboard': 'other',
      'synthesizer': 'other',
      
      // Home goods
      'home_decor': 'other',
      'appliance': 'other',
      'electronics': 'other',
      'artwork': 'other',
      'lighting': 'other',
      'textiles': 'other',
      'storage_container': 'other',
      'decor': 'other',
      'art': 'other',
      'lamp': 'other',
      'mirror': 'other',
      'rug': 'other',
      'curtains': 'other',
      'tv': 'other',
      'speaker': 'other',
      'microwave': 'other',
      'refrigerator': 'other'
    }

    // Apply mapping if exists
    if (furnitureType && furnitureTypeMap[furnitureType]) {
      furnitureType = furnitureTypeMap[furnitureType]
    }

    // Default to 'other' if not in valid list
    if (!furnitureType || !validFurnitureTypes.includes(furnitureType)) {
      furnitureType = 'other'
    }

    // Handle images - support both old and new format
    let imagesData = []
    if (body.images && Array.isArray(body.images)) {
      // New format with multiple images
      imagesData = body.images
    } else if (body.image_filename) {
      // Old format with single image - convert to new format
      imagesData = [{
        filename: body.image_filename,
        order: 1,
        is_primary: true
      }]
    }

    // Log the data being inserted for debugging
    console.log('Attempting to insert item with data:', {
      seller_id: user.id,
      name: body.name,
      description: body.description,
      furniture_type: furnitureType,
      original_furniture_type: body.furniture_type,
      starting_price: body.starting_price,
      images: imagesData, // JSONB images support
      dimensions: body.dimensions,
      agent_enabled: body.agent_enabled || false
    })

    const { data: item, error } = await supabase
      .from('items')
      .insert({
        seller_id: user.id,
        name: body.name,
        description: body.description,
        furniture_type: furnitureType,
        starting_price: body.starting_price,
        images: imagesData, // JSONB images support
        dimensions: body.dimensions,
        agent_enabled: body.agent_enabled || false // Default to false if not specified
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating item:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json({ 
        error: 'Failed to create item',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    return NextResponse.json(item)
    } catch (error) {
      console.error('Item creation error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}