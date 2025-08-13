import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { ratelimit, withRateLimit } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  return withRateLimit(request, ratelimit.api, async () => {
    try {
      const supabase = createSupabaseServerClient()

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

      console.log(`🔍 Fetching negotiations for buyer: ${user.id}`)

      // Get negotiations where user is the buyer
      const { data: negotiations, error: negotiationsError } = await supabase
        .from('negotiations')
        .select(`
          id,
          status,
          created_at,
          updated_at,
          completed_at,
          final_price,
          item_id,
          seller_id,
          items!inner(
            id,
            name,
            description,
            furniture_type,
            starting_price,
            images
          ),
          profiles!negotiations_seller_id_fkey(
            id,
            username,
            email
          )
        `)
        .eq('buyer_id', user.id)
        .order('updated_at', { ascending: false })

      if (negotiationsError) {
        console.error('❌ Error fetching buyer negotiations:', negotiationsError)
        return NextResponse.json({ error: 'Failed to fetch negotiations' }, { status: 500 })
      }

      console.log(`📊 Found ${negotiations?.length || 0} negotiations for buyer ${user.id}`)

      // Get latest offer for each negotiation
      const enrichedNegotiations = await Promise.all(
        (negotiations || []).map(async (negotiation) => {
          console.log(`\n🔍 Processing negotiation ${negotiation.id} for item: ${negotiation.items?.name}`)
          
          // Get latest offer
          const { data: latestOffer, error: offerError } = await supabase
            .from('offers')
            .select('*')
            .eq('negotiation_id', negotiation.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (offerError && offerError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
            console.error(`❌ Error fetching latest offer for negotiation ${negotiation.id}:`, offerError)
          }

          console.log(`💬 Latest offer for negotiation ${negotiation.id}:`, latestOffer ? {
            id: latestOffer.id,
            offer_type: latestOffer.offer_type,
            price: latestOffer.price,
            is_counter_offer: latestOffer.is_counter_offer,
            created_at: latestOffer.created_at
          } : 'No offers found')

          // Get offer count for this negotiation
          const { count: offerCount } = await supabase
            .from('offers')
            .select('*', { count: 'exact', head: true })
            .eq('negotiation_id', negotiation.id)

          console.log(`📊 Offer count for negotiation ${negotiation.id}: ${offerCount}`)

          // Determine status based on latest offer and negotiation status
          let displayStatus = 'unknown'
          let needsAttention = false
          
          console.log(`🎯 Determining status for negotiation ${negotiation.id}:`)
          console.log(`   - Negotiation status: ${negotiation.status}`)
          console.log(`   - Latest offer exists: ${!!latestOffer}`)
          if (latestOffer) {
            console.log(`   - Latest offer type: ${latestOffer.offer_type}`)
            console.log(`   - Is counter offer: ${latestOffer.is_counter_offer}`)
          }
          
          if (negotiation.status === 'completed') {
            displayStatus = 'accepted'
            console.log(`   ✅ Status: accepted (negotiation completed)`)
          } else if (negotiation.status === 'cancelled') {
            displayStatus = 'declined'
            console.log(`   ❌ Status: declined (negotiation cancelled)`)
          } else if (latestOffer) {
            if (latestOffer.offer_type === 'seller' && latestOffer.is_counter_offer) {
              displayStatus = 'counter_received'
              needsAttention = true
              console.log(`   🔄 Status: counter_received (seller counter offer) - NEEDS ATTENTION`)
            } else if (latestOffer.offer_type === 'buyer') {
              displayStatus = 'awaiting_response'
              console.log(`   ⏳ Status: awaiting_response (buyer offer waiting)`)
            } else {
              displayStatus = 'awaiting_response'
              console.log(`   ⏳ Status: awaiting_response (default for unknown offer type)`)
            }
          } else {
            displayStatus = 'awaiting_response'
            console.log(`   ⏳ Status: awaiting_response (no offers yet)`)
          }

          const enrichedNegotiation = {
            ...negotiation,
            latest_offer: latestOffer,
            offer_count: offerCount || 0,
            display_status: displayStatus,
            needs_attention: needsAttention,
            time_since_last_update: latestOffer ? 
              Math.floor((new Date().getTime() - new Date(latestOffer.created_at).getTime()) / (1000 * 60 * 60)) : 
              Math.floor((new Date().getTime() - new Date(negotiation.created_at).getTime()) / (1000 * 60 * 60))
          }

          console.log(`📋 Final enriched negotiation ${negotiation.id}:`, {
            id: enrichedNegotiation.id,
            display_status: enrichedNegotiation.display_status,
            needs_attention: enrichedNegotiation.needs_attention,
            offer_count: enrichedNegotiation.offer_count
          })

          return enrichedNegotiation
        })
      )

      return NextResponse.json({
        negotiations: enrichedNegotiations,
        count: enrichedNegotiations.length
      })

    } catch (error) {
      console.error('Buyer negotiations API error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}