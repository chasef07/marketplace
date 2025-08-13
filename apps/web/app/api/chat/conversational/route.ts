import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { ratelimit, withRateLimit } from '@/lib/rate-limit'
import { getAuthenticatedUser } from '@/src/lib/auth-helpers'

// Simple marketplace assistant - no complex state management
export async function POST(request: NextRequest) {
  return withRateLimit(request, ratelimit.chat, async () => {
    try {
      const { message } = await request.json()

      if (!message || typeof message !== 'string') {
        return NextResponse.json({ error: 'Message is required' }, { status: 400 })
      }

      // Get authenticated user
      const authResult = await getAuthenticatedUser(request)
      
      if (!authResult.user) {
        return NextResponse.json({ error: authResult.error || 'Authentication required' }, { status: 401 })
      }

      const supabase = createSupabaseServerClient()
      const userId = authResult.user.id

      // Handle different actions
      if (message === 'hello' || message === 'hi' || message.startsWith('hello')) {
        return await handleWelcome(supabase, userId)
      }

      if (message.startsWith('accept_')) {
        const negotiationId = parseInt(message.replace('accept_', ''))
        return await handleAccept(supabase, userId, negotiationId, authResult.token)
      }

      if (message.startsWith('decline_')) {
        const negotiationId = parseInt(message.replace('decline_', ''))
        return await handleDecline(supabase, userId, negotiationId, authResult.token)
      }

      if (message.startsWith('counter_')) {
        const parts = message.split('_')
        const negotiationId = parseInt(parts[1])
        const price = parseFloat(parts[2])
        return await handleCounter(supabase, userId, negotiationId, price, authResult.token)
      }

      if (message.startsWith('force_counter_')) {
        const parts = message.split('_')
        const negotiationId = parseInt(parts[2])
        const price = parseFloat(parts[3])
        return await handleCounterForce(supabase, userId, negotiationId, price, authResult.token)
      }

      if (message.startsWith('show_counter_')) {
        const negotiationId = parseInt(message.replace('show_counter_', ''))
        return await showCounterInput(supabase, userId, negotiationId)
      }

      // Default: show welcome
      return await handleWelcome(supabase, userId)

    } catch (error: any) {
      console.error('Chat error:', error)
      return NextResponse.json(
        { 
          error: 'Chat service temporarily unavailable',
          message: "Sorry, I'm having trouble right now. Please try again.",
          buttons: [{ text: "🔄 Try Again", action: "hello" }]
        }, 
        { status: 500 }
      )
    }
  })
}

async function handleWelcome(supabase: any, userId: string) {
  try {
    // Get all active negotiations where user is the seller
    const { data: negotiations, error } = await supabase
      .from('negotiations')
      .select(`
        id,
        status,
        created_at,
        items!inner(id, name, starting_price),
        profiles!negotiations_buyer_id_fkey(username)
      `)
      .eq('seller_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching negotiations:', error)
      return NextResponse.json({
        message: "Unable to load your offers right now. Please try again.",
        buttons: [{ text: "🔄 Retry", action: "hello" }]
      })
    }

    if (!negotiations || negotiations.length === 0) {
      return NextResponse.json({
        message: "💼 **Marketplace Assistant**\n\nYou have no active offers at the moment. Your items are live on the marketplace waiting for buyers!",
        buttons: []
      })
    }

    // Get latest offers and offer history for each negotiation
    const enrichedNegotiations = await Promise.all(
      negotiations.map(async (neg: any) => {
        // Get latest offer
        const { data: latestOffer } = await supabase
          .from('offers')
          .select('*')
          .eq('negotiation_id', neg.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        // Get offer count and history
        const { data: allOffers } = await supabase
          .from('offers')
          .select('*')
          .eq('negotiation_id', neg.id)
          .order('created_at', { ascending: true })

        // Get buyer's original offer (first buyer offer)
        const buyerOriginalOffer = allOffers?.find(offer => offer.offer_type === 'buyer' && !offer.is_counter_offer)

        return {
          ...neg,
          latest_offer: latestOffer,
          offer_count: allOffers?.length || 0,
          buyer_original_offer: buyerOriginalOffer,
          offer_history: allOffers || []
        }
      })
    )

    // Build simple offer list message
    const offerCount = enrichedNegotiations.length
    let message = `💼 **Marketplace Assistant**\n\nYou have ${offerCount} active offer${offerCount > 1 ? 's' : ''}:\n\n`

    const buttons: any[] = []

    enrichedNegotiations.forEach((neg, index) => {
      const buyerName = neg.profiles?.username || 'Unknown Buyer'
      const itemName = neg.items?.name || 'Unknown Item'
      const startingPrice = neg.items?.starting_price || 0
      const latestOffer = neg.latest_offer
      const buyerOriginalOffer = neg.buyer_original_offer
      const offerCount = neg.offer_count

      message += `**${index + 1}. ${itemName}**\n`
      message += `Buyer: @${buyerName} | Starting Price: $${startingPrice}\n`

      // Determine negotiation state and show appropriate context
      if (offerCount === 0) {
        // Edge case: negotiation exists but no offers
        message += `⚠️ **No offers yet** - This may be an error\n`
        message += `Time: ${getTimeAgo(neg.created_at)}\n\n`
        // Don't add action buttons for broken negotiations
        return
      }

      const timeAgo = getTimeAgo(latestOffer?.created_at || neg.created_at)

      if (buyerOriginalOffer && latestOffer) {
        if (latestOffer.offer_type === 'buyer') {
          // Latest move was by buyer
          if (latestOffer.is_counter_offer) {
            message += `💰 **Buyer countered: $${latestOffer.price}** (originally $${buyerOriginalOffer.price})\n`
          } else {
            message += `📥 **Buyer offered: $${latestOffer.price}**\n`
          }
          message += `⏳ **Your turn to respond**\n`
        } else {
          // Latest move was by seller (you)
          message += `📤 **You countered: $${latestOffer.price}** (buyer offered $${buyerOriginalOffer.price})\n`
          message += `⏳ **Waiting for buyer response**\n`
        }
      }

      message += `Time: ${timeAgo} | Round ${offerCount}\n\n`

      // Add action buttons based on who made the last move
      if (latestOffer?.offer_type === 'buyer') {
        // Buyer made last move - seller can respond
        buttons.push(
          { text: `✅ Accept $${latestOffer.price}`, action: `accept_${neg.id}` },
          { text: `❌ Decline #${index + 1}`, action: `decline_${neg.id}` },
          { text: `💰 Counter #${index + 1}`, action: `show_counter_${neg.id}` }
        )
      } else {
        // Seller made last move - waiting for buyer
        buttons.push(
          { text: `👁️ View #${index + 1}`, action: `hello` } // Just refresh to see any updates
        )
      }
    })

    message += "Choose an action for any offer:"

    return NextResponse.json({
      message,
      buttons
    })

  } catch (error) {
    console.error('Welcome handler error:', error)
    return NextResponse.json({
      message: "Error loading offers. Please try again.",
      buttons: [{ text: "🔄 Retry", action: "hello" }]
    })
  }
}

async function handleAccept(_supabase: any, _userId: string, negotiationId: number, authToken: string | null) {
  try {
    const response = await fetch(`/api/negotiations/${negotiationId}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    })

    if (response.ok) {
      const result = await response.json()
      return NextResponse.json({
        message: `🎉 **Offer Accepted!**\n\nYou've accepted the offer for $${result.final_price}.\n\nThe buyer has been notified and the item is now sold. You can arrange pickup details with the buyer.`,
        buttons: [
          { text: "📱 View All Offers", action: "hello" }
        ]
      })
    } else {
      const error = await response.json()
      return NextResponse.json({
        message: `❌ **Unable to Accept**\n\n${error.error || 'Something went wrong'}`,
        buttons: [
          { text: "🔄 Try Again", action: "hello" }
        ]
      })
    }
  } catch (error) {
    console.error('Accept handler error:', error)
    return NextResponse.json({
      message: "❌ Error accepting offer. Please try again.",
      buttons: [{ text: "🔄 Retry", action: "hello" }]
    })
  }
}

async function handleDecline(_supabase: any, _userId: string, negotiationId: number, authToken: string | null) {
  try {
    const response = await fetch(`/api/negotiations/${negotiationId}/decline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ reason: 'Offer declined by seller' })
    })

    if (response.ok) {
      return NextResponse.json({
        message: `❌ **Offer Declined**\n\nThe offer has been declined and the buyer has been notified.`,
        buttons: [
          { text: "📱 View Remaining Offers", action: "hello" }
        ]
      })
    } else {
      const error = await response.json()
      return NextResponse.json({
        message: `❌ **Unable to Decline**\n\n${error.error || 'Something went wrong'}`,
        buttons: [
          { text: "🔄 Try Again", action: "hello" }
        ]
      })
    }
  } catch (error) {
    console.error('Decline handler error:', error)
    return NextResponse.json({
      message: "❌ Error declining offer. Please try again.",
      buttons: [{ text: "🔄 Retry", action: "hello" }]
    })
  }
}

async function showCounterInput(supabase: any, userId: string, negotiationId: number) {
  try {
    // Get negotiation details for context
    const { data: negotiation } = await supabase
      .from('negotiations')
      .select(`
        id,
        items!inner(name, starting_price),
        profiles!negotiations_buyer_id_fkey(username)
      `)
      .eq('id', negotiationId)
      .eq('seller_id', userId)
      .single()

    if (!negotiation) {
      return NextResponse.json({
        message: "❌ Negotiation not found.",
        buttons: [{ text: "📱 Back to Offers", action: "hello" }]
      })
    }

    // Get latest offer and buyer's original offer
    const { data: latestOffer } = await supabase
      .from('offers')
      .select('*')
      .eq('negotiation_id', negotiationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const { data: buyerOriginalOffer } = await supabase
      .from('offers')
      .select('price')
      .eq('negotiation_id', negotiationId)
      .eq('offer_type', 'buyer')
      .eq('is_counter_offer', false)
      .limit(1)
      .single()

    const currentOffer = latestOffer?.price || 0
    const buyerOriginal = buyerOriginalOffer?.price || 0
    const startingPrice = negotiation.items?.starting_price || 0
    const itemName = negotiation.items?.name || 'Item'
    const buyerName = negotiation.profiles?.username || 'Unknown'
    
    // Suggest reasonable counter range
    const suggestedMin = Math.max(buyerOriginal, Math.floor(startingPrice * 0.8))
    const suggestedMax = Math.min(startingPrice, Math.floor(currentOffer * 1.15))
    
    return NextResponse.json({
      message: `💰 **Counter Offer**\n\n**Item:** ${itemName} (Listed: $${startingPrice})\n**Buyer:** @${buyerName}\n**Their Offer:** $${currentOffer}\n**Original Offer:** $${buyerOriginal}\n\n💡 **Suggested range:** $${suggestedMin} - $${suggestedMax}\n\nEnter your counter price:`,
      buttons: [
        { text: "⬅️ Back to Offers", action: "hello" }
      ],
      inputField: {
        type: 'number',
        placeholder: `e.g. ${Math.floor((suggestedMin + suggestedMax) / 2)}`,
        submitText: 'Send Counter Offer',
        submitAction: `counter_${negotiationId}`,
        min: 1
      }
    })

  } catch (error) {
    console.error('Show counter input error:', error)
    return NextResponse.json({
      message: "❌ Error loading counter form.",
      buttons: [{ text: "📱 Back to Offers", action: "hello" }]
    })
  }
}

async function handleCounter(supabase: any, userId: string, negotiationId: number, price: number, authToken: string | null) {
  try {
    if (!price || price <= 0) {
      return NextResponse.json({
        message: "❌ Please enter a valid price.",
        buttons: [
          { text: "🔄 Try Again", action: `show_counter_${negotiationId}` },
          { text: "⬅️ Back", action: "hello" }
        ]
      })
    }

    // Get negotiation and item details for validation
    const { data: negotiation } = await supabase
      .from('negotiations')
      .select(`
        id,
        items!inner(starting_price),
        profiles!negotiations_buyer_id_fkey(username)
      `)
      .eq('id', negotiationId)
      .eq('seller_id', userId)
      .single()

    if (!negotiation) {
      return NextResponse.json({
        message: "❌ Negotiation not found.",
        buttons: [{ text: "📱 Back to Offers", action: "hello" }]
      })
    }

    const startingPrice = negotiation.items?.starting_price || 0
    
    // Business logic validation
    if (price > startingPrice * 1.2) {
      return NextResponse.json({
        message: `❌ **Counter too high!**\n\nYour counter of $${price} is more than 20% above your starting price ($${startingPrice}).\n\nConsider a more reasonable counter offer.`,
        buttons: [
          { text: "🔄 Try Again", action: `show_counter_${negotiationId}` },
          { text: "⬅️ Back", action: "hello" }
        ]
      })
    }

    if (price < startingPrice * 0.5) {
      return NextResponse.json({
        message: `❌ **Counter too low!**\n\nYour counter of $${price} seems unusually low for this item (listed at $${startingPrice}).\n\nAre you sure you want to proceed?`,
        buttons: [
          { text: `✅ Yes, counter $${price}`, action: `force_counter_${negotiationId}_${price}` },
          { text: "🔄 Try Different Price", action: `show_counter_${negotiationId}` },
          { text: "⬅️ Back", action: "hello" }
        ]
      })
    }

    console.log('Counter offer - negotiationId:', negotiationId, 'price:', price, 'authToken:', authToken ? 'present' : 'missing')

    const response = await fetch(`/api/negotiations/${negotiationId}/counter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ 
        price: price,
        message: `Counter offer: $${price}`
      })
    })

    console.log('Counter API response status:', response.status)
    
    if (response.ok) {
      const result = await response.json()
      console.log('Counter API success:', result)
      return NextResponse.json({
        message: `💰 **Counter Offer Sent!**\n\nYou've sent a counter offer of $${price}.\n\nThe buyer has been notified and can now accept, decline, or counter your offer.`,
        buttons: [
          { text: "📱 View All Offers", action: "hello" }
        ]
      })
    } else {
      const error = await response.json()
      console.log('Counter API error:', error)
      return NextResponse.json({
        message: `❌ **Counter Offer Failed**\n\n${error.error || 'Something went wrong'}`,
        buttons: [
          { text: "🔄 Try Again", action: `show_counter_${negotiationId}` },
          { text: "⬅️ Back", action: "hello" }
        ]
      })
    }
  } catch (error) {
    console.error('Counter handler error:', error)
    return NextResponse.json({
      message: "❌ Error sending counter offer. Please try again.",
      buttons: [
        { text: "🔄 Retry", action: `show_counter_${negotiationId}` },
        { text: "⬅️ Back", action: "hello" }
      ]
    })
  }
}

async function handleCounterForce(_supabase: any, _userId: string, negotiationId: number, price: number, authToken: string | null) {
  try {
    console.log('Force counter offer - negotiationId:', negotiationId, 'price:', price)

    const response = await fetch(`/api/negotiations/${negotiationId}/counter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ 
        price: price,
        message: `Counter offer: $${price}`
      })
    })

    console.log('Force counter API response status:', response.status)
    
    if (response.ok) {
      const result = await response.json()
      console.log('Force counter API success:', result)
      return NextResponse.json({
        message: `💰 **Counter Offer Sent!**\n\nYou've sent a counter offer of $${price}.\n\nThe buyer has been notified and can now accept, decline, or counter your offer.`,
        buttons: [
          { text: "📱 View All Offers", action: "hello" }
        ]
      })
    } else {
      const error = await response.json()
      console.log('Force counter API error:', error)
      return NextResponse.json({
        message: `❌ **Counter Offer Failed**\n\n${error.error || 'Something went wrong'}`,
        buttons: [
          { text: "🔄 Try Again", action: `show_counter_${negotiationId}` },
          { text: "⬅️ Back", action: "hello" }
        ]
      })
    }
  } catch (error) {
    console.error('Force counter handler error:', error)
    return NextResponse.json({
      message: "❌ Error sending counter offer. Please try again.",
      buttons: [
        { text: "🔄 Retry", action: `show_counter_${negotiationId}` },
        { text: "⬅️ Back", action: "hello" }
      ]
    })
  }
}

function getTimeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
  
  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`
  
  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays}d ago`
}