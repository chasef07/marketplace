import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { ratelimit, withRateLimit } from '@/lib/rate-limit'

const supabase = createSupabaseServerClient()

// Generate conversational responses with interactive buttons
async function generateConversationalResponse(message: string, userId: string, authToken: string | null = null) {
  let negotiations: any[] = []
  
  // Get negotiations directly from database instead of API call
  try {
    
    const { data: directNegotiations, error } = await supabase
      .from('negotiations')
      .select(`
        id,
        status,
        created_at,
        item_id,
        buyer_id,
        items!inner(is_available)
      `)
      .eq('seller_id', userId)
      .eq('status', 'active')
      .eq('items.is_available', true)

    if (error) {
      console.error('Database error fetching negotiations:', error)
    } else {
      
      // Enrich with item, buyer data, and recent message previews
      const enrichedNegotiations = await Promise.all(
        (directNegotiations || []).map(async (neg) => {
          // Get buyer data and item data
          const [itemResult, buyerResult, recentOfferResult] = await Promise.all([
            supabase.from('items').select('name, starting_price').eq('id', neg.item_id!).single(),
            supabase.from('profiles').select('username, email').eq('id', neg.buyer_id!).single(),
            // Get the most recent offer with message from this negotiation
            supabase
              .from('offers')
              .select('message, created_at, offer_type, price')
              .eq('negotiation_id', neg.id!)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()
          ])

          // Extract message preview (first few meaningful words)
          let messagePreview = null
          if (recentOfferResult.data?.message) {
            const message = recentOfferResult.data.message.trim()
            const words = message.split(' ')
            // Take first 4-6 words or until we hit 45 characters
            let preview = ''
            for (let i = 0; i < Math.min(words.length, 6); i++) {
              if (preview.length + words[i].length > 45) break
              preview += (i > 0 ? ' ' : '') + words[i]
            }
            messagePreview = preview + (words.length > 6 || message.length > 45 ? '...' : '')
          }

          // Calculate time since offer
          const timeSinceOffer = recentOfferResult.data?.created_at 
            ? Date.now() - new Date(recentOfferResult.data.created_at).getTime()
            : null
          
          const hoursAgo = timeSinceOffer ? Math.floor(timeSinceOffer / (1000 * 60 * 60)) : null
          
          return {
            ...neg,
            current_offer: recentOfferResult.data?.price || 0, // Add current offer from latest offer
            items: itemResult.data ? [itemResult.data] : [],
            profiles: buyerResult.data ? [buyerResult.data] : [],
            recent_message: messagePreview,
            recent_offer_time: recentOfferResult.data?.created_at,
            hours_since_offer: hoursAgo,
            is_recent: hoursAgo !== null && hoursAgo <= 24, // Recent = within 24 hours
            buyer_offer_type: recentOfferResult.data?.offer_type
          }
        })
      )

      // Sort by current offer amount (highest first)
      negotiations = enrichedNegotiations.sort((a: any, b: any) => 
        parseFloat(b.current_offer || 0) - parseFloat(a.current_offer || 0)
      )
    }
  } catch (error) {
    console.warn('Failed to fetch negotiations for chat:', error)
    // Continue with empty data - chat can still provide basic help
  }

  // Analyze user message intent
  const messageLower = message.toLowerCase()

  // Handle different conversational flows
  if (message === 'hello' || message === 'hi' || message === 'hey' || messageLower.startsWith('hello') || messageLower.startsWith('hi ') || messageLower.startsWith('hey')) {
    return {
      message: `Hello! You have ${negotiations.length} active offer${negotiations.length > 1 ? 's' : ''}${negotiations.filter((neg: any) => neg.is_recent).length > 0 ? ` (${negotiations.filter((neg: any) => neg.is_recent).length} recent!)` : ''}. What would you like to do?`,
      buttons: [
        { text: "Show Offers", action: "show_offers" },
        { text: "View Details", action: "view_details" }
      ]
    }
  }
  

  if (messageLower.includes('offer') || messageLower.includes('show') || message === "show_offers" || message.startsWith("show_offers")) {
    if (negotiations.length === 0) {
      return {
        message: "No active offers at the moment. I can help you get more visibility.",
        buttons: [
          { text: "Get Tips", action: "get_tips" },
          { text: "Update Photos", action: "update_photos" },
          { text: "Adjust Prices", action: "adjust_prices" }
        ]
      }
    }

    // Group offers by item with enhanced data structure
    const offersByItem = negotiations.reduce((acc: any, neg: any) => {
      const itemId = neg.item_id
      const itemName = neg.items?.[0]?.name || 'Unknown Item'
      const startingPrice = parseFloat(neg.items?.[0]?.starting_price || 0)
      
      if (!acc[itemId]) {
        acc[itemId] = {
          itemId,
          itemName,
          startingPrice,
          negotiations: [],
          offerCount: 0,
          highestOffer: 0,
          averageOffer: 0,
          hasRecentActivity: false
        }
      }
      
      acc[itemId].negotiations.push(neg)
      acc[itemId].offerCount++
      
      const offerPrice = parseFloat(neg.current_offer)
      if (offerPrice > acc[itemId].highestOffer) {
        acc[itemId].highestOffer = offerPrice
      }
      
      if (neg.is_recent) {
        acc[itemId].hasRecentActivity = true
      }
      
      return acc
    }, {})

    // Calculate averages for each item
    Object.values(offersByItem).forEach((item: any) => {
      const totalOffers = item.negotiations.reduce((sum: number, neg: any) => sum + parseFloat(neg.current_offer), 0)
      item.averageOffer = totalOffers / item.offerCount
    })

    let offerText = `Your Active Offers (${negotiations.length} total):\n\n`

    // Display each item with summary stats
    const sortedItems = Object.values(offersByItem).sort((a: any, b: any) => b.highestOffer - a.highestOffer)
    
    sortedItems.forEach((item: any) => {
      const recentBadge = item.hasRecentActivity ? " [Recent]" : ""
      const priceRange = item.offerCount > 1 
        ? `$${Math.min(...item.negotiations.map((n: any) => parseFloat(n.current_offer))).toFixed(0)}-$${item.highestOffer.toFixed(0)}`
        : `$${item.highestOffer.toFixed(0)}`
      
      offerText += `${item.itemName}${recentBadge}\n`
      offerText += `   ${item.offerCount} offer${item.offerCount > 1 ? 's' : ''} • High: ${priceRange}\n`
      
      if (item.startingPrice > 0) {
        const bestRatio = (item.highestOffer / item.startingPrice * 100).toFixed(0)
        offerText += `   Best offer: ${bestRatio}% of asking ($${item.startingPrice.toFixed(0)})\n`
      }
      
      offerText += `\n`
    })

    // Create inspection buttons for each item with offers
    const inspectionButtons = sortedItems.map((item: any) => ({
      text: `Inspect ${item.itemName} (${item.offerCount})`,
      action: `inspect_item_${item.itemId}`
    }))

    // Add general action buttons
    const generalButtons = [
      { text: "⚡ Quick Actions", action: "quick_actions" },
      { text: "View All Items", action: "show_listings" }
    ]

    return {
      message: offerText + "Inspect a specific item for detailed offer management:",
      buttons: [...inspectionButtons, ...generalButtons]
    }
  }

  // Handle confirm_accept first (more specific)
  if (message.startsWith("confirm_accept")) {
    const negotiationId = message.split('_')[2] // Extract ID from "confirm_accept_123"
    
    // Accept the offer directly via Supabase
    try {
      // Find the negotiation to accept
      const acceptedNeg = negotiations.find(n => n.id.toString() === negotiationId)
      
      if (!acceptedNeg) {
        return {
          message: "Sorry, I couldn't find that negotiation. It may have already been resolved.",
          buttons: [
            { text: "Show Current Offers", action: "show_offers" },
            { text: "Refresh", action: "refresh" }
          ]
        }
      }
      
      // Update the negotiation status to completed and set final price
      const { error: updateError } = await supabase
        .from('negotiations')
        .update({
          status: 'completed',
          final_price: acceptedNeg.current_offer,
          completed_at: new Date().toISOString()
        })
        .eq('id', parseInt(negotiationId))
        .eq('seller_id', userId) // Ensure user owns this negotiation
      
      if (updateError) {
        console.error('Error updating negotiation:', updateError)
        return {
          message: "Something went wrong while accepting the offer. Please try again!",
          buttons: [
            { text: "🔄 Retry", action: "refresh" },
            { text: "❓ Get Help", action: "help" }
          ]
        }
      }

      // Mark the item as sold
      const { error: itemError } = await supabase
        .from('items')
        .update({
          is_available: false,
          sold_at: new Date().toISOString()
        })
        .eq('id', acceptedNeg.item_id)
        .eq('seller_id', userId)
      
      if (itemError) {
        console.error('Error updating item status:', itemError)
      }

      // Cancel all other active negotiations for this item
      const { error: cancelError } = await supabase
        .from('negotiations')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString()
        })
        .eq('item_id', acceptedNeg.item_id)
        .eq('seller_id', userId)
        .eq('status', 'active')
        .neq('id', parseInt(negotiationId)) // Don't cancel the accepted one
      
      if (cancelError) {
        console.error('Error cancelling other negotiations:', cancelError)
      }

      const buyerName = acceptedNeg.profiles?.[0]?.username || 'Unknown'
      const itemName = acceptedNeg.items?.[0]?.name || 'your item'
      
      return {
        message: `Offer accepted! You've sold ${itemName} to ${buyerName} for $${parseFloat(acceptedNeg.current_offer).toFixed(0)}.\n\nTime to coordinate pickup with ${buyerName}! `,
        buttons: [
          { text: "Message " + buyerName, action: "direct_message", data: acceptedNeg.buyer_id },
          { text: "📋 View Deal Details", action: "view_deal", data: negotiationId },
          { text: "🏠 Back to Overview", action: "refresh" }
        ],
        action: "offer_accepted",
        handoff: {
          buyerName: buyerName,
          negotiationId: parseInt(negotiationId),
          buyerId: acceptedNeg.buyer_id
        }
      }
    } catch (error) {
      console.error('Error accepting offer:', error)
      return {
        message: "Something went wrong while accepting the offer. Please try again!",
        buttons: [
          { text: "🔄 Retry", action: "refresh" },
          { text: "❓ Get Help", action: "help" }
        ]
      }
    }
  }

  if (messageLower.includes('accept') || messageLower.includes('highest') || message === "accept_highest") {
    const highest = negotiations.reduce((max: any, neg: any) => 
      parseFloat(neg.current_offer) > parseFloat(max.current_offer || 0) ? neg : max
    )

    if (!highest.id) {
      return {
        message: "I don't see any offers to accept right now. Want me to check for new ones?",
        buttons: [
          { text: "Refresh", action: "refresh" },
          { text: " View Items", action: "view_items" }
        ]
      }
    }

    const buyerName = highest.profiles?.[0]?.username || 'Someone'
    const price = `$${parseFloat(highest.current_offer).toFixed(0)}`
    const item = highest.items?.[0]?.name || 'your item'

    return {
      message: `Ready to accept ${buyerName}'s offer of ${price} for ${item}? 🤝\n\nThis will mark the item as sold and start direct messaging with ${buyerName}.`,
      buttons: [
        { text: "✅ Yes, Accept!", action: "confirm_accept", data: highest.id },
        { text: "💭 Let me think", action: "show_offers" },
        { text: "Counter instead", action: "counter_offer", data: highest.id }
      ]
    }
  }


  if (message.startsWith("counter_price")) {
    const price = message.split('_')[2] // Extract price from "counter_price_150"
    
    try {
      if (!authToken) {
        throw new Error('Authentication token required for counter offers')
      }
      
      // For debug mode, use a different approach
      if (authToken === 'debug') {
        return {
          message: `Counter offers sent! I've offered **$${price}** to all ${negotiations.length} buyer${negotiations.length > 1 ? 's' : ''}.\n\n⚠️ Debug mode: Counter offers simulated.`,
          buttons: [
            { text: "📊 View Status", action: "show_offers" },
            { text: "💬 Send Message", action: "send_message" },
            { text: "🏠 Back to Home", action: "refresh" }
          ]
        }
      }
      
      const headers = { 'Authorization': `Bearer ${authToken}` }
      
      // Counter all negotiations with the specified price
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'
      
      for (const neg of negotiations) {
        const response = await fetch(`${baseUrl}/api/marketplace/quick-actions`, {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'counter',
            negotiation_id: neg.id,
            price: parseInt(price),
            message: 'Counter offer from seller'
          })
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Counter offer failed for negotiation ${neg.id}:`, response.status, errorText)
          throw new Error(`Counter offer failed: ${response.status} - ${errorText}`)
        }
      }
      
      return {
        message: `Counter offers sent! I've offered **$${price}** to all ${negotiations.length} buyer${negotiations.length > 1 ? 's' : ''}.\n\nThey'll receive notifications and can respond with their own counter-offers.`,
        buttons: [
          { text: "📊 View Status", action: "show_offers" },
          { text: "💬 Send Message", action: "send_message" },
          { text: "🏠 Back to Home", action: "refresh" }
        ]
      }
    } catch (error) {
      return {
        message: "I had trouble sending those counter offers. Want to try again?",
        buttons: [
          { text: "🔄 Try Again", action: "counter_all" },
          { text: "Show Offers", action: "show_offers" }
        ]
      }
    }
  }

  if (message === "confirm_decline_lowballs") {
    const lowballs = negotiations.filter((neg: any) => {
      const startingPrice = parseFloat(neg.items[0]?.starting_price || 0)
      const offerPrice = parseFloat(neg.current_offer)
      return startingPrice > 0 && (offerPrice / startingPrice) < 0.7
    })

    try {
      // Decline all lowball offers directly via Supabase
      for (const neg of lowballs) {
        // Update negotiation status to cancelled
        const { error: updateError } = await supabase
          .from('negotiations')
          .update({
            status: 'cancelled',
            completed_at: new Date().toISOString()
          })
          .eq('id', neg.id)
          .eq('seller_id', userId) // Ensure user owns this negotiation
        
        if (updateError) {
          console.error('Error declining negotiation:', updateError)
        }
      }
      
      return {
        message: `✅ Done! I've declined ${lowballs.length} lowball offer${lowballs.length > 1 ? 's' : ''} for you.\n\n${negotiations.length - lowballs.length > 0 ? `You still have ${negotiations.length - lowballs.length} other offer${negotiations.length - lowballs.length > 1 ? 's' : ''} to consider.` : 'That clears up your offer list!'}`,
        buttons: negotiations.length - lowballs.length > 0 ? [
          { text: "Show Remaining", action: "show_offers" },
          { text: "⚡ Quick Actions", action: "quick_actions" }
        ] : [
          { text: " View Items", action: "view_items" },
          { text: "➕ Create Listing", action: "create_listing" }
        ]
      }
    } catch (error) {
      console.error('Error declining lowball offers:', error)
      return {
        message: "I had trouble declining those offers. Want to try again?",
        buttons: [
          { text: "🔄 Try Again", action: "decline_lowballs" },
          { text: "Show Offers", action: "show_offers" }
        ]
      }
    }
  }

  if (message === "counter_all" || (messageLower.includes('counter') && messageLower.includes('all'))) {
    const avgPrice = negotiations.reduce((sum: number, neg: any) => 
      sum + parseFloat(neg.current_offer), 0) / negotiations.length
    const suggestedCounter = Math.round(avgPrice * 1.15) // 15% higher

    return {
      message: `Want to counter all ${negotiations.length} offers across all items? 💪\n\nI suggest **$${suggestedCounter}** (15% above their average). Or pick your own price!`,
      buttons: [
        { text: `Counter at $${suggestedCounter}`, action: "counter_price", data: suggestedCounter },
        { text: "Choose My Price", action: "custom_counter_global" },
        { text: "Back to Offers", action: "show_offers" }
      ]
    }
  }

  if (messageLower.includes('decline') || messageLower.includes('lowball') || message === "decline_lowballs") {
    const lowballs = negotiations.filter((neg: any) => {
      const startingPrice = parseFloat(neg.items[0]?.starting_price || 0)
      const offerPrice = parseFloat(neg.current_offer)
      return startingPrice > 0 && (offerPrice / startingPrice) < 0.7
    })

    if (lowballs.length === 0) {
      return {
        message: "Actually, all your offers look pretty reasonable! 👍 No obvious lowballs to decline.",
        buttons: [
          { text: "📊 Show All Offers", action: "show_offers" },
          { text: "Counter Some", action: "counter_all" }
        ]
      }
    }

    return {
      message: `I found ${lowballs.length} offer${lowballs.length > 1 ? 's' : ''} below 70% of your asking price. 📉\n\nShall I decline these lowball offers for you?`,
      buttons: [
        { text: "❌ Yes, Decline Them", action: "confirm_decline_lowballs" },
        { text: "👀 Show Me First", action: "show_lowballs" },
        { text: "Back to Offers", action: "show_offers" }
      ]
    }
  }

  if (message === "quick_actions" || message.startsWith("quick_actions")) {
    if (negotiations.length === 0) {
      return {
        message: "No active offers for quick actions right now! 📭 Here's what you can do instead:",
        buttons: [
          { text: " View My Items", action: "view_items" },
          { text: "➕ Create Listing", action: "create_listing" },
          { text: "📊 Show Stats", action: "show_stats" }
        ]
      }
    }

    const highestOffer = Math.max(...negotiations.map((neg: any) => parseFloat(neg.current_offer || 0)))
    
    return {
      message: `⚡ Quick Actions for your ${negotiations.length} offer${negotiations.length > 1 ? 's' : ''}:\n\nChoose an action to apply to all offers:`,
      buttons: [
        { text: "Accept Highest ($" + highestOffer.toFixed(0) + ")", action: "accept_highest" },
        { text: "Counter All", action: "counter_all" },
        { text: "Decline Lowballs", action: "decline_lowballs" },
        { text: "Back", action: "show_offers" }
      ]
    }
  }

  // Handle my listings action
  if (message === "show_listings" || messageLower.includes('my listings') || messageLower.includes('listings')) {
    // Get all user's items with offer counts
    const { data: userItems, error: itemsError } = await supabase
      .from('items')
      .select(`
        id,
        name,
        starting_price,
        is_available,
        sold_at,
        created_at
      `)
      .eq('seller_id', userId)
      .order('created_at', { ascending: false })

    if (itemsError) {
      return {
        message: "Sorry, I couldn't load your listings right now. Please try again.",
        buttons: [
          { text: "🔄 Try Again", action: "show_listings" },
          { text: "🏠 Back to Home", action: "refresh" }
        ]
      }
    }

    if (!userItems || userItems.length === 0) {
      return {
        message: "You don't have any listings yet! \n\nReady to start selling?",
        buttons: [
          { text: "➕ Create First Listing", action: "create_listing" },
          { text: "💡 Get Tips", action: "selling_tips" },
          { text: "🏠 Back to Home", action: "refresh" }
        ]
      }
    }

    // Get offer counts for each item
    const itemIds = userItems.map(item => item.id)
    const { data: offerCounts } = await supabase
      .from('negotiations')
      .select(`
        item_id,
        status,
        offers!inner(price)
      `)
      .in('item_id', itemIds)
      .eq('status', 'active')
      .eq('seller_id', userId)

    // Process offer data
    const itemOfferData = userItems.map(item => {
      const itemOffers = offerCounts?.filter(n => n.item_id === item.id) || []
      const offerPrices = itemOffers
        .map(n => parseFloat((n.offers as any)?.price || 0))
        .filter(price => price > 0)
      
      return {
        ...item,
        offer_count: offerPrices.length,
        highest_offer: offerPrices.length > 0 ? Math.max(...offerPrices) : null
      }
    })

    // Separate available vs sold items
    const availableItems = itemOfferData.filter(item => item.is_available)
    const soldItems = itemOfferData.filter(item => !item.is_available)

    let listingsText = `Your Listings (${userItems.length}):\n\n`

    // Available items section
    if (availableItems.length > 0) {
      listingsText += ` Available (${availableItems.length}):\n`
      availableItems.forEach((item, index) => {
        const price = `$${parseFloat(item.starting_price.toString()).toFixed(0)}`
        const offers = item.offer_count > 0 ? ` • ${item.offer_count} offer${item.offer_count > 1 ? 's' : ''}` : ''
        listingsText += `  ${index + 1}. ${item.name} - ${price}${offers}\n`
      })
      listingsText += `\n`
    }

    // Sold items section
    if (soldItems.length > 0) {
      listingsText += `✅ Sold (${soldItems.length}):\n`
      soldItems.forEach((item, index) => {
        const price = `$${parseFloat(item.starting_price.toString()).toFixed(0)}`
        const soldInfo = item.sold_at ? 
          ` • sold ${Math.floor((Date.now() - new Date(item.sold_at).getTime()) / (1000 * 60 * 60 * 24))}d ago` : 
          ' • sold'
        listingsText += `  ${index + 1}. ${item.name} - ${price}${soldInfo}\n`
      })
    }

    return {
      message: listingsText,
      buttons: [
        { text: "💰 View Offers", action: "show_offers" },
        { text: "➕ New Listing", action: "create_listing" },
        { text: "📊 View Details", action: "listing_details" },
        { text: "🏠 Back to Home", action: "refresh" }
      ]
    }
  }

  // Handle inbox action
  if (message === "inbox" || messageLower.includes('inbox')) {
    // Get completed negotiations where user is seller (accepted offers)
    const { data: completedNegotiations, error: completedError } = await supabase
      .from('negotiations')
      .select(`
        id,
        status,
        final_price,
        completed_at,
        item_id,
        buyer_id,
        items!inner(name),
        profiles!buyer_id(username)
      `)
      .eq('seller_id', userId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(10)

    if (completedError) {
      return {
        message: "Sorry, I couldn't load your inbox right now. Please try again.",
        buttons: [
          { text: "🔄 Try Again", action: "inbox" },
          { text: "🏠 Back to Home", action: "refresh" }
        ]
      }
    }

    if (!completedNegotiations || completedNegotiations.length === 0) {
      return {
        message: "Your inbox is empty! 📭\n\nAccepted offers will appear here so you can coordinate with buyers.",
        buttons: [
          { text: "💰 View Active Offers", action: "show_offers" },
          { text: " My Listings", action: "show_listings" },
          { text: "🏠 Back to Home", action: "refresh" }
        ]
      }
    }

    let inboxText = `📬 Your Inbox (${completedNegotiations.length} conversation${completedNegotiations.length > 1 ? 's' : ''}):\n\n`

    completedNegotiations.forEach((deal: any, index: number) => {
      const buyerName = deal.profiles?.username || 'Unknown'
      const itemName = deal.items?.name || 'Unknown Item'
      const price = `$${parseFloat(deal.final_price || 0).toFixed(0)}`
      const timeAgo = deal.completed_at ? 
        Math.floor((Date.now() - new Date(deal.completed_at).getTime()) / (1000 * 60 * 60)) : 0

      inboxText += `${index + 1}. ${buyerName} - ${itemName}\n   Sold for ${price}`
      if (timeAgo < 24) {
        inboxText += ` • ${timeAgo}h ago\n`
      } else {
        inboxText += ` • ${Math.floor(timeAgo / 24)}d ago\n`
      }
      inboxText += `\n`
    })

    // Create buttons for recent conversations
    const recentDeals = completedNegotiations.slice(0, 3)
    const messageButtons = recentDeals.map((deal: any) => ({
      text: `💬 ${deal.profiles?.username || 'Unknown'}`,
      action: "direct_message",
      data: deal.buyer_id
    }))

    return {
      message: inboxText,
      buttons: [
        ...messageButtons,
        { text: "Refresh", action: "inbox" },
        { text: "🏠 Back to Home", action: "refresh" }
      ]
    }
  }

  // Handle direct message action
  if (message.startsWith("direct_message")) {
    const buyerId = message.split('_')[2] // Extract buyer ID from "direct_message_buyerid"
    
    // Get buyer information
    const { data: buyer, error } = await supabase
      .from('profiles')
      .select('username, email')
      .eq('id', buyerId)
      .single()
    
    if (error || !buyer) {
      return {
        message: "Sorry, I couldn't find that buyer's information. Please try again.",
        buttons: [
          { text: "Show Offers", action: "show_offers" },
          { text: "Refresh", action: "refresh" }
        ]
      }
    }

    const buyerName = buyer.username || 'Unknown'
    
    return {
      message: `Starting direct message with ${buyerName}...\n\nHere are some conversation starters:\n\n• "Hi ${buyerName}! Thanks for your offer. When would you like to pick up the item?"\n• "Hello! I've accepted your offer. What's the best way to coordinate pickup?"\n• "Thanks for the purchase! Please let me know your availability for pickup."`,
      buttons: [
        { text: "📞 Share Contact Info", action: "share_contact" },
        { text: "📅 Schedule Pickup", action: "schedule_pickup" },
        { text: "💬 Send Custom Message", action: "custom_message" },
        { text: "Back to Overview", action: "refresh" }
      ],
      action: "direct_message_started",
      handoff: {
        buyerName: buyerName,
        buyerId: buyerId,
        buyerEmail: buyer.email
      }
    }
  }

  // Handle item inspection - inspect_item_<itemId>
  if (message.startsWith("inspect_item_")) {
    const itemId = message.split('_')[2] // Extract ID from "inspect_item_123"
    
    if (!itemId) {
      return {
        message: "Sorry, I couldn't identify which item to inspect. Please try again.",
        buttons: [
          { text: "Show All Offers", action: "show_offers" },
          { text: "Refresh", action: "refresh" }
        ]
      }
    }

    // Filter negotiations for this specific item
    const itemNegotiations = negotiations.filter(neg => neg.item_id.toString() === itemId)
    
    if (itemNegotiations.length === 0) {
      return {
        message: "No offers found for this item. It may have been sold or the offers may have expired.",
        buttons: [
          { text: "Show All Offers", action: "show_offers" },
          { text: " View All Items", action: "show_listings" }
        ]
      }
    }

    // Get item details
    const firstNeg = itemNegotiations[0]
    const itemName = firstNeg.items?.[0]?.name || 'Unknown Item'
    const startingPrice = parseFloat(firstNeg.items?.[0]?.starting_price || 0)
    
    // Sort offers by price (highest first)
    const sortedOffers = itemNegotiations.sort((a: any, b: any) => parseFloat(b.current_offer) - parseFloat(a.current_offer))
    
    // Build detailed offer breakdown
    let inspectionText = `🔍 ${itemName} - Detailed View\n\n`
    
    if (startingPrice > 0) {
      inspectionText += `💰 Your asking price: $${startingPrice.toFixed(0)}\n`
    }
    
    inspectionText += `📊 ${itemNegotiations.length} active offer${itemNegotiations.length > 1 ? 's' : ''}:\n\n`

    sortedOffers.forEach((neg: any, index: number) => {
      const buyerName = neg.profiles?.[0]?.username || 'Someone'
      const price = parseFloat(neg.current_offer)
      const timeAgo = neg.hours_since_offer !== null 
        ? neg.hours_since_offer < 1 ? 'Just now'
          : neg.hours_since_offer < 24 ? `${neg.hours_since_offer}h ago`
          : `${Math.floor(neg.hours_since_offer / 24)}d ago`
        : 'Unknown'
      
      let offerLine = `${index + 1}. $${price.toFixed(0)} from ${buyerName} (${timeAgo})`
      
      if (startingPrice > 0) {
        const percentage = (price / startingPrice * 100).toFixed(0)
        offerLine += ` • ${percentage}% of asking`
      }
      
      if (neg.is_recent) {
        offerLine += ` 🔥`
      }
      
      inspectionText += `   ${offerLine}\n`
      
      // Add message preview if available
      if (neg.recent_message) {
        inspectionText += `      💬 "${neg.recent_message}"\n`
      }
      
      inspectionText += `\n`
    })

    // Create item-specific action buttons
    const highestOffer = sortedOffers[0]
    const highestPrice = parseFloat(highestOffer.current_offer)
    const averageOffer = sortedOffers.reduce((sum, neg) => sum + parseFloat(neg.current_offer), 0) / sortedOffers.length
    const suggestedCounter = Math.round(averageOffer * 1.15) // 15% above average

    const actionButtons = [
      { 
        text: `Accept $${highestPrice.toFixed(0)}`, 
        action: `confirm_accept_${highestOffer.id}` 
      },
      { 
        text: `Counter at $${suggestedCounter}`, 
        action: `counter_item_${itemId}_${suggestedCounter}` 
      },
      { 
        text: `Choose My Price`, 
        action: `custom_counter_item_${itemId}` 
      },
      { 
        text: `Message ${highestOffer.profiles?.[0]?.username || 'Top Buyer'}`, 
        action: `direct_message_${highestOffer.buyer_id}` 
      }
    ]

    // Add decline button if there are lowball offers
    const lowballOffers = sortedOffers.filter(neg => {
      if (startingPrice === 0) return false
      return (parseFloat(neg.current_offer) / startingPrice) < 0.7
    })

    if (lowballOffers.length > 0) {
      actionButtons.push({
        text: `Decline Lowballs (${lowballOffers.length})`,
        action: `decline_item_lowballs_${itemId}`
      })
    }

    actionButtons.push({ text: "Back to All Offers", action: "show_offers" })

    return {
      message: inspectionText,
      buttons: actionButtons
    }
  }

  // Handle item-specific counter offers - counter_item_<itemId>_<price>
  if (message.startsWith("counter_item_")) {
    const parts = message.split('_')
    const itemId = parts[2]
    const counterPrice = parts[3]
    
    if (!itemId || !counterPrice) {
      return {
        message: "Invalid counter offer format. Please try again.",
        buttons: [
          { text: "Show Offers", action: "show_offers" },
          { text: "Refresh", action: "refresh" }
        ]
      }
    }

    // Filter negotiations for this item
    const itemNegotiations = negotiations.filter(neg => neg.item_id.toString() === itemId)
    
    if (itemNegotiations.length === 0) {
      return {
        message: "No active offers found for this item.",
        buttons: [
          { text: "Show All Offers", action: "show_offers" }
        ]
      }
    }

    try {
      if (!authToken) {
        throw new Error('Authentication token required for counter offers')
      }
      
      // For debug mode, use a different approach
      if (authToken === 'debug') {
        const itemName = itemNegotiations[0].items?.[0]?.name || 'this item'
        return {
          message: `Counter offers sent! I've offered **$${counterPrice}** to all ${itemNegotiations.length} buyer${itemNegotiations.length > 1 ? 's' : ''} interested in ${itemName}.\n\n⚠️ Debug mode: Counter offers simulated.`,
          buttons: [
            { text: `View ${itemName}`, action: `inspect_item_${itemId}` },
            { text: "Show All Offers", action: "show_offers" },
            { text: "🏠 Back to Home", action: "refresh" }
          ]
        }
      }
      
      const headers = { 'Authorization': `Bearer ${authToken}` }
      
      // Send counter offer to all buyers for this item
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'
      
      for (const neg of itemNegotiations) {
        const response = await fetch(`${baseUrl}/api/marketplace/quick-actions`, {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'counter',
            negotiation_id: neg.id,
            price: parseInt(counterPrice),
            message: `Counter offer for ${neg.items?.[0]?.name || 'this item'}`
          })
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Counter offer failed for negotiation ${neg.id}:`, response.status, errorText)
          throw new Error(`Counter offer failed: ${response.status} - ${errorText}`)
        }
      }
      
      const itemName = itemNegotiations[0].items?.[0]?.name || 'this item'
      
      return {
        message: `Counter offers sent! I've offered **$${counterPrice}** to all ${itemNegotiations.length} buyer${itemNegotiations.length > 1 ? 's' : ''} interested in ${itemName}.\n\nThey'll receive notifications and can respond with their own counter-offers.`,
        buttons: [
          { text: `View ${itemName}`, action: `inspect_item_${itemId}` },
          { text: "Show All Offers", action: "show_offers" },
          { text: "🏠 Back to Home", action: "refresh" }
        ]
      }
    } catch (error) {
      return {
        message: "I had trouble sending those counter offers. Want to try again?",
        buttons: [
          { text: `🔍 Back to Item`, action: `inspect_item_${itemId}` },
          { text: "Show All Offers", action: "show_offers" }
        ]
      }
    }
  }

  // Handle decline lowballs for specific item - decline_item_lowballs_<itemId>
  if (message.startsWith("decline_item_lowballs_")) {
    const itemId = message.split('_')[3] // Extract ID from "decline_item_lowballs_123"
    
    if (!itemId) {
      return {
        message: "Invalid item ID. Please try again.",
        buttons: [
          { text: "Show All Offers", action: "show_offers" }
        ]
      }
    }

    // Filter negotiations for this item
    const itemNegotiations = negotiations.filter(neg => neg.item_id.toString() === itemId)
    
    if (itemNegotiations.length === 0) {
      return {
        message: "No active offers found for this item.",
        buttons: [
          { text: "Show All Offers", action: "show_offers" }
        ]
      }
    }

    const itemName = itemNegotiations[0].items?.[0]?.name || 'this item'
    const startingPrice = parseFloat(itemNegotiations[0].items?.[0]?.starting_price || 0)
    
    // Identify lowball offers (below 70% of asking price)
    const lowballs = itemNegotiations.filter((neg: any) => {
      if (startingPrice === 0) return false
      const offerPrice = parseFloat(neg.current_offer)
      return (offerPrice / startingPrice) < 0.7
    })

    if (lowballs.length === 0) {
      return {
        message: `No lowball offers found for ${itemName}. All offers seem reasonable!`,
        buttons: [
          { text: `🔍 Back to ${itemName}`, action: `inspect_item_${itemId}` },
          { text: "Show All Offers", action: "show_offers" }
        ]
      }
    }

    try {
      // Decline all lowball offers for this item
      for (const neg of lowballs) {
        const { error: updateError } = await supabase
          .from('negotiations')
          .update({
            status: 'cancelled',
            completed_at: new Date().toISOString()
          })
          .eq('id', neg.id)
          .eq('seller_id', userId)
        
        if (updateError) {
          console.error('Error declining negotiation:', updateError)
        }
      }
      
      const remainingOffers = itemNegotiations.length - lowballs.length
      
      return {
        message: `✅ Done! I've declined ${lowballs.length} lowball offer${lowballs.length > 1 ? 's' : ''} for ${itemName}.\n\n${remainingOffers > 0 ? `You still have ${remainingOffers} other offer${remainingOffers > 1 ? 's' : ''} to consider for this item.` : 'This item now has no active offers.'}`,
        buttons: remainingOffers > 0 ? [
          { text: `View ${itemName}`, action: `inspect_item_${itemId}` },
          { text: "Show All Offers", action: "show_offers" }
        ] : [
          { text: "Show All Offers", action: "show_offers" },
          { text: " View All Items", action: "show_listings" }
        ]
      }
    } catch (error) {
      console.error('Error declining lowball offers:', error)
      return {
        message: "I had trouble declining those offers. Want to try again?",
        buttons: [
          { text: `🔍 Back to ${itemName}`, action: `inspect_item_${itemId}` },
          { text: "Show All Offers", action: "show_offers" }
        ]
      }
    }
  }

  // Handle custom counter price input - custom_counter_item_<itemId>
  if (message.startsWith("custom_counter_item_")) {
    const itemId = message.split('_')[3] // Extract ID from "custom_counter_item_123"
    
    if (!itemId) {
      return {
        message: "Invalid item ID. Please try again.",
        buttons: [
          { text: "Show All Offers", action: "show_offers" }
        ]
      }
    }

    // Filter negotiations for this item
    const itemNegotiations = negotiations.filter(neg => neg.item_id.toString() === itemId)
    
    if (itemNegotiations.length === 0) {
      return {
        message: "No active offers found for this item.",
        buttons: [
          { text: "Show All Offers", action: "show_offers" }
        ]
      }
    }

    const itemName = itemNegotiations[0].items?.[0]?.name || 'this item'
    const startingPrice = parseFloat(itemNegotiations[0].items?.[0]?.starting_price || 0)
    
    // Calculate offer range for guidance
    const offerPrices = itemNegotiations.map(neg => parseFloat(neg.current_offer))
    const minOffer = Math.min(...offerPrices)
    const maxOffer = Math.max(...offerPrices)
    const avgOffer = offerPrices.reduce((sum, price) => sum + price, 0) / offerPrices.length
    
    let guidanceText = `💰 What price would you like to counter with for **${itemName}**?\n\n`
    
    if (startingPrice > 0) {
      guidanceText += `🏷️ Your asking price: $${startingPrice.toFixed(0)}\n`
    }
    
    guidanceText += `📊 Current offers: $${minOffer.toFixed(0)} - $${maxOffer.toFixed(0)}\n`
    guidanceText += `📈 Average offer: $${avgOffer.toFixed(0)}\n\n`
    guidanceText += `💡 **Tip**: Counter between $${Math.round(avgOffer * 1.1)}-$${Math.round(avgOffer * 1.25)} for best results!\n\n`
    guidanceText += `Just type your price (e.g., "175" or "$175"):`

    // Create quick suggestion buttons
    const suggestion1 = Math.round(avgOffer * 1.1) // 10% above average
    const suggestion2 = Math.round(avgOffer * 1.2) // 20% above average
    const suggestion3 = startingPrice > 0 ? Math.round((maxOffer + startingPrice) / 2) : Math.round(avgOffer * 1.25) // Midpoint between highest offer and asking

    return {
      message: guidanceText,
      buttons: [
        { text: `💰 $${suggestion1}`, action: `counter_item_${itemId}_${suggestion1}` },
        { text: `💰 $${suggestion2}`, action: `counter_item_${itemId}_${suggestion2}` },
        { text: `💰 $${suggestion3}`, action: `counter_item_${itemId}_${suggestion3}` },
        { text: "Back to Item", action: `inspect_item_${itemId}` }
      ],
      metadata: {
        expecting_price_input: true,
        item_id: itemId,
        context: 'custom_counter'
      }
    }
  }

  // Handle global custom counter price input - custom_counter_global
  if (message === "custom_counter_global") {
    if (negotiations.length === 0) {
      return {
        message: "No active offers to counter at the moment!",
        buttons: [
          { text: "Show Offers", action: "show_offers" },
          { text: " View Items", action: "show_listings" }
        ]
      }
    }

    // Calculate global offer statistics
    const allOfferPrices = negotiations.map(neg => parseFloat(neg.current_offer))
    const minOffer = Math.min(...allOfferPrices)
    const maxOffer = Math.max(...allOfferPrices)
    const avgOffer = allOfferPrices.reduce((sum, price) => sum + price, 0) / allOfferPrices.length

    let guidanceText = `💰 What price would you like to counter with for **all ${negotiations.length} offers**?\n\n`
    guidanceText += `📊 Current offer range: $${minOffer.toFixed(0)} - $${maxOffer.toFixed(0)}\n`
    guidanceText += `📈 Average offer: $${avgOffer.toFixed(0)}\n\n`
    guidanceText += `💡 **Tip**: Counter between $${Math.round(avgOffer * 1.1)}-$${Math.round(avgOffer * 1.25)} for best results!\n\n`
    guidanceText += `This will send the same counter price to all buyers across all your items.`

    // Create quick suggestion buttons
    const suggestion1 = Math.round(avgOffer * 1.1) // 10% above average
    const suggestion2 = Math.round(avgOffer * 1.2) // 20% above average
    const suggestion3 = Math.round(avgOffer * 1.25) // 25% above average

    return {
      message: guidanceText,
      buttons: [
        { text: `💰 $${suggestion1}`, action: `counter_price_${suggestion1}` },
        { text: `💰 $${suggestion2}`, action: `counter_price_${suggestion2}` },
        { text: `💰 $${suggestion3}`, action: `counter_price_${suggestion3}` },
        { text: "Back to Offers", action: "show_offers" }
      ]
    }
  }

  // Handle numeric price input (when user types a number after custom counter prompt)
  const numericInput = parseFloat(message.replace(/[$,\s]/g, '')) // Remove $ , and spaces
  if (!isNaN(numericInput) && numericInput > 0) {
    // This might be a price input - check if we have context from previous interaction
    // For now, we'll handle this more explicitly through button actions
    // But we can add smart detection here if needed
    
    // Check if this looks like a reasonable price (between $1-$100,000)
    if (numericInput >= 1 && numericInput <= 100000) {
      return {
        message: `I see you entered $${numericInput.toFixed(0)}. To counter a specific item, please use the "Choose My Price" button from the item view, or tell me which item you want to counter.\n\nFor example: "Counter the bed at $${numericInput.toFixed(0)}"`,
        buttons: [
          { text: "Show My Offers", action: "show_offers" },
          { text: " View All Items", action: "show_listings" }
        ]
      }
    }
  }

  // Default conversational response
  return {
    message: "I'm here to help manage your marketplace offers. What would you like to do?",
    buttons: [
      { text: "Show My Offers", action: "show_offers" }
    ]
  }
}

export async function POST(request: NextRequest) {
  return withRateLimit(request, ratelimit.chat, async () => {
    try {
      const { message } = await request.json()

      // Get authenticated user
      const authHeader = request.headers.get('authorization')
      let user = null
      let authToken = null
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1]
        authToken = token
        const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token)
        if (!tokenError && tokenUser) {
          user = tokenUser
        }
      }
      
      if (!user) {
        const { data: { session }, error: authError } = await supabase.auth.getSession()
        if (authError || !session?.user) {
          // Debug mode for testing
          user = { id: 'dffe15ff-6a9f-4be8-b223-3785355878e6' }
          // For debug mode, we'll bypass the auth token requirement
          authToken = 'debug'
        } else {
          user = session.user
          authToken = session.access_token // Use session token
        }
      }

      const response = await generateConversationalResponse(message || 'hello', user.id, authToken)

      return NextResponse.json({
        message: response.message,
        buttons: response.buttons || [],
        action: response.action || null,
        conversation_id: 1 // Mock conversation ID
      })

    } catch (error: any) {
      console.error('Conversational chat error:', error)
      return NextResponse.json(
        { 
          message: "Oops! Something went wrong. Let me try again! 🔄",
          buttons: [
            { text: "🔄 Try Again", action: "refresh" },
            { text: "❓ Get Help", action: "help" }
          ]
        },
        { status: 200 }
      )
    }
  })
}