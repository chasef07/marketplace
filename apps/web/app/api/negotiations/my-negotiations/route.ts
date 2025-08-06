import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createSupabaseServerClient()

    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: negotiations, error } = await supabase
      .from('negotiations')
      .select(`
        *,
        items:item_id (
          id,
          name,
          starting_price,
          image_filename
        ),
        seller:seller_id (
          id,
          username,
          email
        ),
        buyer:buyer_id (
          id,
          username,
          email
        ),
        offers (
          id,
          price,
          message,
          offer_type,
          round_number,
          created_at
        )
      `)
      .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching negotiations:', error)
      return NextResponse.json({ error: 'Failed to fetch negotiations' }, { status: 500 })
    }

    return NextResponse.json(negotiations)
  } catch (error) {
    console.error('Negotiations fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}