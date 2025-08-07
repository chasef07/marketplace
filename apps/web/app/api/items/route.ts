import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createSupabaseServerClient()

    const { data: items, error } = await supabase
      .from('items')
      .select(`
        *,
        seller:profiles!seller_id (
          id,
          username,
          email,
          zip_code
        )
      `)
      .eq('is_available', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching items:', error)
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }

    return NextResponse.json(items)
  } catch (error) {
    console.error('Items fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    // Valid furniture types from the database enum
    const validFurnitureTypes = [
      'couch', 'dining_table', 'bookshelf', 'chair', 'desk', 'bed',
      'dresser', 'coffee_table', 'nightstand', 'cabinet', 'other'
    ]

    // Map and validate furniture type
    let furnitureType = body.furniture_type?.toLowerCase()
    
    // Handle common mappings
    const furnitureTypeMap: Record<string, string> = {
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
      'musical_instrument': 'other',
      'instrument': 'other',
      'piano': 'other',
      'guitar': 'other'
    }

    // Apply mapping if exists
    if (furnitureType && furnitureTypeMap[furnitureType]) {
      furnitureType = furnitureTypeMap[furnitureType]
    }

    // Default to 'other' if not in valid list
    if (!furnitureType || !validFurnitureTypes.includes(furnitureType)) {
      furnitureType = 'other'
    }

    // Log the data being inserted for debugging
    console.log('Attempting to insert item with data:', {
      seller_id: user.id,
      name: body.name,
      description: body.description,
      furniture_type: furnitureType,
      original_furniture_type: body.furniture_type,
      starting_price: body.starting_price,
      condition: body.condition,
      image_filename: body.image_filename,
      material: body.material,
      brand: body.brand,
      color: body.color,
      dimensions: body.dimensions
    })

    const { data: item, error } = await supabase
      .from('items')
      .insert({
        seller_id: user.id,
        name: body.name,
        description: body.description,
        furniture_type: furnitureType,
        starting_price: body.starting_price,
        condition: body.condition,
        image_filename: body.image_filename,
        material: body.material,
        brand: body.brand,
        color: body.color,
        dimensions: body.dimensions
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
}