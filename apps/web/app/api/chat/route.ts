import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import OpenAI from 'openai'
import { ratelimit, withRateLimit } from '@/lib/rate-limit'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const supabase = createSupabaseServerClient()

// =============================================================================
// AI AGENT ARCHITECTURE: Perception → Reasoning → Action
// =============================================================================

// 🔍 PERCEPTION: Agent tools to gather fresh marketplace data
const AGENT_TOOLS = [
  {
    name: "get_current_status",
    description: "Get real-time overview of listings, offers, and recent activity. Always call this first to perceive current state.",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "analyze_offers",
    description: "Analyze offers for specific item or all items. Provides strategic insights and recommendations.",
    parameters: {
      type: "object",
      properties: {
        item_identifier: {
          type: "string",
          description: "Optional item name/keyword (e.g., 'couch', 'dining table'). If not provided, analyzes all items."
        }
      },
      required: []
    }
  },
  {
    name: "send_message_to_buyer",
    description: "Send a message to a specific buyer in a negotiation. Use for custom communication.",
    parameters: {
      type: "object",
      properties: {
        negotiation_id: {
          type: "number",
          description: "ID of the negotiation"
        },
        message: {
          type: "string",
          description: "Message to send to the buyer"
        }
      },
      required: ["negotiation_id", "message"]
    }
  },
  {
    name: "compose_buyer_message",
    description: "Help compose and send a message to a buyer by name or description. Use when user wants to contact a specific buyer about pickup, scheduling, etc.",
    parameters: {
      type: "object",
      properties: {
        buyer_identifier: {
          type: "string",
          description: "Buyer name, email, or description (e.g., 'Sarah', 'the person who offered $1200', 'test000@gmail.com')"
        },
        message_topic: {
          type: "string",
          description: "What the message is about (e.g., 'pickup scheduling', 'payment details', 'availability')"
        },
        message_content: {
          type: "string",
          description: "The actual message content to send"
        }
      },
      required: ["buyer_identifier", "message_topic", "message_content"]
    }
  },
  {
    name: "smart_action_planner",
    description: "Intelligently interprets natural language requests and creates action plans. Use for requests like 'accept highest offer', 'remove lowballs', 'counter all reasonable offers', etc.",
    parameters: {
      type: "object",
      properties: {
        user_request: {
          type: "string",
          description: "The user's natural language request (e.g., 'accept the highest offer', 'remove all lowballs', 'counter reasonable offers at 90% asking price')"
        },
        item_identifier: {
          type: "string",
          description: "Optional item name/keyword to filter to specific item"
        },
        confirmed: {
          type: "boolean",
          description: "Set to true only when user has explicitly confirmed the actions",
          default: false
        }
      },
      required: ["user_request"]
    }
  },
  {
    name: "get_conversation_context",
    description: "Get message history and context for a specific negotiation",
    parameters: {
      type: "object",
      properties: {
        negotiation_id: {
          type: "number",
          description: "ID of the negotiation to get context for"
        }
      },
      required: ["negotiation_id"]
    }
  }
]

// =============================================================================
// AGENT IMPLEMENTATION: Core intelligence functions
// =============================================================================

async function getCurrentStatus(sellerId: string) {
  console.log('🔍 PERCEIVING: Getting current marketplace status for seller:', sellerId)
  
  // Get all active items with negotiations in single query
  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select(`
      id,
      name,
      starting_price,
      created_at,
      negotiations!inner (
        id,
        status,
        current_offer,
        updated_at,
        buyer_id,
        profiles!negotiations_buyer_id_fkey (username)
      )
    `)
    .eq('seller_id', sellerId)
    .eq('is_available', true)
    .eq('negotiations.status', 'active')
    .order('updated_at', { ascending: false })

  if (itemsError) {
    throw new Error(`Failed to fetch current status: ${itemsError.message}`)
  }

  // Get recent activity (last 24 hours)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: recentActivity, error: activityError } = await supabase
    .from('negotiations')
    .select(`
      id,
      current_offer,
      updated_at,
      items!inner (name),
      profiles!negotiations_buyer_id_fkey (username)
    `)
    .eq('seller_id', sellerId)
    .gte('updated_at', yesterday)
    .order('updated_at', { ascending: false })
    .limit(10)

  if (activityError) {
    console.warn('Could not fetch recent activity:', activityError.message)
  }

  const result = {
    timestamp: new Date().toISOString(),
    items: items || [],
    total_active_listings: items?.length || 0,
    total_active_negotiations: items?.reduce((acc, item) => acc + (item.negotiations?.length || 0), 0) || 0,
    recent_activity: recentActivity || [],
    highest_offer: items?.reduce((max, item) => {
      const itemMax = Math.max(...(item.negotiations?.map(n => n.current_offer) || [0]))
      return Math.max(max, itemMax)
    }, 0) || 0
  }

  console.log('✅ PERCEIVED:', `${result.total_active_listings} listings, ${result.total_active_negotiations} active offers, highest: $${result.highest_offer}`)
  return result
}

async function analyzeOffers(sellerId: string, itemIdentifier?: string) {
  console.log('🧠 REASONING: Analyzing offers', itemIdentifier ? `for "${itemIdentifier}"` : 'for all items')
  
  let itemsQuery = supabase
    .from('items')
    .select(`
      id,
      name,
      starting_price,
      negotiations!inner (
        id,
        status,
        current_offer,
        updated_at,
        buyer_id,
        profiles!negotiations_buyer_id_fkey (username, buyer_personality),
        offers (id, price, message, created_at, offer_type)
      )
    `)
    .eq('seller_id', sellerId)
    .eq('is_available', true)
    .eq('negotiations.status', 'active')

  // Filter by item if specified
  if (itemIdentifier) {
    itemsQuery = itemsQuery.ilike('name', `%${itemIdentifier}%`)
  }

  const { data: items, error } = await itemsQuery

  if (error) {
    throw new Error(`Failed to analyze offers: ${error.message}`)
  }

  if (!items || items.length === 0) {
    return {
      message: itemIdentifier 
        ? `No active offers found for items matching "${itemIdentifier}"`
        : "No active offers to analyze",
      analysis: { total_offers: 0 }
    }
  }

  // Analyze each item
  const itemAnalyses = items.map(item => {
    const negotiations = item.negotiations || []
    const offers = negotiations.flatMap(n => n.offers || [])
    const startingPrice = parseFloat(item.starting_price)

    // Price analysis
    const validOffers = offers.filter(o => o.price && o.price > 0)
    const priceStats = validOffers.length > 0 ? {
      min: Math.min(...validOffers.map(o => o.price)),
      max: Math.max(...validOffers.map(o => o.price)),
      avg: validOffers.reduce((sum, o) => sum + o.price, 0) / validOffers.length
    } : { min: 0, max: 0, avg: 0 }

    // Categorize offers by strength
    const categories = {
      premium: negotiations.filter(n => n.current_offer >= startingPrice * 1.1),
      strong: negotiations.filter(n => n.current_offer >= startingPrice * 0.9 && n.current_offer < startingPrice * 1.1),
      reasonable: negotiations.filter(n => n.current_offer >= startingPrice * 0.7 && n.current_offer < startingPrice * 0.9),
      lowball: negotiations.filter(n => n.current_offer < startingPrice * 0.7)
    }

    // Generate strategic recommendations
    const recommendations = []
    if (categories.premium.length > 0) {
      recommendations.push("Accept premium offers immediately!")
    }
    if (categories.strong.length >= 2) {
      recommendations.push("Create competition between strong offers")
    }
    if (categories.reasonable.length >= 3) {
      recommendations.push("Counter reasonable offers to move them higher")
    }
    if (categories.lowball.length > negotiations.length * 0.6) {
      recommendations.push("Consider better photos or lower starting price")
    }

    return {
      item: {
        id: item.id,
        name: item.name,
        starting_price: startingPrice
      },
      negotiations,
      categories,
      price_stats: priceStats,
      recommendations,
      total_offers: negotiations.length
    }
  })

  console.log('✅ REASONED: Analysis complete for', items.length, 'items')
  return {
    items: itemAnalyses,
    summary: `Analyzed ${itemAnalyses.reduce((sum, item) => sum + item.total_offers, 0)} offers across ${items.length} item(s)`,
    strategic_insights: generateStrategicInsights(itemAnalyses)
  }
}

function generateStrategicInsights(analyses: any[]) {
  const insights = []
  const totalOffers = analyses.reduce((sum, item) => sum + item.total_offers, 0)
  
  // Cross-item insights
  const allPremium = analyses.flatMap(item => item.categories.premium)
  const allStrong = analyses.flatMap(item => item.categories.strong)
  
  if (allPremium.length > 0) {
    insights.push(`Priority: Accept ${allPremium.length} premium offer(s) above asking price`)
  }
  
  if (allStrong.length >= 3) {
    insights.push(`Opportunity: Create bidding war with ${allStrong.length} strong offers`)
  }
  
  if (totalOffers > 10) {
    insights.push(`Hot market: ${totalOffers} total offers - perfect time to be selective`)
  }
  
  return insights
}

async function sendMessageToBuyer(sellerId: string, negotiationId: number, message: string) {
  console.log('💬 COMMUNICATING: Sending message to buyer in negotiation', negotiationId)
  
  // Verify negotiation belongs to seller and get buyer info
  const { data: negotiation, error: negError } = await supabase
    .from('negotiations')
    .select(`
      id, 
      current_offer, 
      round_number,
      buyer_id,
      profiles!negotiations_buyer_id_fkey (username, email),
      items!inner (name)
    `)
    .eq('id', negotiationId)
    .eq('seller_id', sellerId)
    .single()

  if (negError || !negotiation) {
    throw new Error('Negotiation not found or unauthorized')
  }

  // Add message to offers table
  const { data: offer, error: offerError } = await supabase
    .from('offers')
    .insert({
      negotiation_id: negotiationId,
      offer_type: 'seller',
      price: negotiation.current_offer,
      message: message,
      round_number: negotiation.round_number + 1,
      is_counter_offer: false
    })
    .select()
    .single()

  if (offerError) {
    throw new Error(`Failed to send message: ${offerError.message}`)
  }

  // Update negotiation
  await supabase
    .from('negotiations')
    .update({ 
      round_number: negotiation.round_number + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', negotiationId)

  console.log('✅ COMMUNICATED: Message sent successfully')
  
  const buyerName = negotiation.profiles?.username || 'the buyer'
  const itemName = negotiation.items?.name || 'your item'
  
  return { 
    success: true, 
    message: `Message sent to ${buyerName} about ${itemName}. They'll see it in their negotiations tab and get a notification.`,
    offer_id: offer.id,
    buyer_name: buyerName,
    item_name: itemName
  }
}

async function composeBuyerMessage(sellerId: string, buyerIdentifier: string, messageTopic: string, messageContent: string) {
  console.log('📝 COMPOSING: Message for buyer', buyerIdentifier, 'about', messageTopic)
  
  // Get all current negotiations to find the right buyer
  const currentStatus = await getCurrentStatus(sellerId)
  const allNegotiations = currentStatus.items.flatMap(item => 
    item.negotiations.map(neg => ({
      ...neg,
      item_name: item.name,
      item_id: item.id,
      starting_price: parseFloat(item.starting_price)
    }))
  )

  // Find the negotiation based on buyer identifier
  let targetNegotiation = null
  const identifierLower = buyerIdentifier.toLowerCase()
  
  // Try to match by username, email, or offer amount
  for (const neg of allNegotiations) {
    const buyerName = neg.profiles?.username?.toLowerCase() || ''
    const buyerEmail = neg.profiles?.email?.toLowerCase() || ''
    const offerAmount = neg.current_offer.toString()
    
    if (buyerName.includes(identifierLower) || 
        buyerEmail.includes(identifierLower) ||
        identifierLower.includes(offerAmount) ||
        identifierLower.includes('offered') && identifierLower.includes(offerAmount)) {
      targetNegotiation = neg
      break
    }
  }

  if (!targetNegotiation) {
    return {
      error: true,
      message: `I couldn't find a buyer matching "${buyerIdentifier}". Here are your current negotiations: ${allNegotiations.map(n => `${n.profiles?.username || 'Unknown'} ($${n.current_offer} for ${n.item_name})`).join(', ')}`
    }
  }

  // Send the message through the platform
  try {
    const result = await sendMessageToBuyer(sellerId, targetNegotiation.id, messageContent)
    
    return {
      success: true,
      message: `Message sent to ${targetNegotiation.profiles?.username || 'the buyer'} about ${messageTopic}. They'll see it in their negotiations tab.`,
      buyer_name: targetNegotiation.profiles?.username,
      item_name: targetNegotiation.item_name,
      negotiation_id: targetNegotiation.id,
      sent_message: messageContent
    }
  } catch (error) {
    return {
      error: true,
      message: `Failed to send message: ${(error as Error).message}`
    }
  }
}

// NEW: Smart Action Planner - Handles all natural language requests
async function smartActionPlanner(sellerId: string, userRequest: string, itemIdentifier?: string, confirmed: boolean = false) {
  console.log('🧠 SMART PLANNING:', userRequest, 'confirmed:', confirmed)
  
  // First, get all current offers to work with
  const currentStatus = await getCurrentStatus(sellerId)
  const allNegotiations = currentStatus.items.flatMap(item => 
    item.negotiations.map(neg => ({
      ...neg,
      item_name: item.name,
      item_id: item.id,
      starting_price: parseFloat(item.starting_price)
    }))
  )

  // Filter by item if specified
  let relevantNegotiations = allNegotiations
  if (itemIdentifier) {
    relevantNegotiations = allNegotiations.filter(neg => 
      neg.item_name.toLowerCase().includes(itemIdentifier.toLowerCase())
    )
  }

  if (relevantNegotiations.length === 0) {
    return {
      error: true,
      message: itemIdentifier 
        ? `No active offers found for items matching "${itemIdentifier}"`
        : "No active offers to work with"
    }
  }

  // Parse the user request and determine actions
  const requestLower = userRequest.toLowerCase()
  const actions = []

  // Handle "accept highest/best offer"
  if (requestLower.includes('accept') && (requestLower.includes('highest') || requestLower.includes('best'))) {
    const highestOffer = relevantNegotiations.reduce((max, neg) => 
      neg.current_offer > max.current_offer ? neg : max
    )
    actions.push({
      action: 'accept',
      negotiation_id: highestOffer.id,
      buyer_name: highestOffer.profiles?.username || 'Buyer',
      item_name: highestOffer.item_name,
      current_offer: highestOffer.current_offer,
      reasoning: 'Highest offer available'
    })
  }
  
  // Handle "remove/decline lowballs"
  if ((requestLower.includes('remove') || requestLower.includes('decline')) && requestLower.includes('lowball')) {
    const lowballOffers = relevantNegotiations.filter(neg => 
      neg.current_offer < neg.starting_price * 0.7
    )
    lowballOffers.forEach(neg => {
      actions.push({
        action: 'decline',
        negotiation_id: neg.id,
        buyer_name: neg.profiles?.username || 'Buyer',
        item_name: neg.item_name,
        current_offer: neg.current_offer,
        message: "Thanks for your interest, but I can't go that low. Good luck with your search!",
        reasoning: `Lowball offer (${Math.round((neg.current_offer / neg.starting_price) * 100)}% of asking price)`
      })
    })
  }
  
  // Handle "counter all reasonable/strong offers"
  if (requestLower.includes('counter')) {
    let targetOffers = []
    
    if (requestLower.includes('reasonable')) {
      targetOffers = relevantNegotiations.filter(neg => 
        neg.current_offer >= neg.starting_price * 0.7 && neg.current_offer < neg.starting_price * 0.9
      )
    } else if (requestLower.includes('strong')) {
      targetOffers = relevantNegotiations.filter(neg => 
        neg.current_offer >= neg.starting_price * 0.9 && neg.current_offer < neg.starting_price * 1.1
      )
    } else {
      // Counter all offers
      targetOffers = relevantNegotiations.filter(neg => 
        neg.current_offer >= neg.starting_price * 0.7
      )
    }

    targetOffers.forEach(neg => {
      // Smart counter pricing
      let counterPrice
      if (neg.current_offer >= neg.starting_price * 0.9) {
        // Strong offers - counter slightly higher
        counterPrice = Math.round(neg.current_offer * 1.05)
      } else {
        // Reasonable offers - counter towards asking price
        counterPrice = Math.round(neg.starting_price * 0.88)
      }

      actions.push({
        action: 'counter',
        negotiation_id: neg.id,
        buyer_name: neg.profiles?.username || 'Buyer',
        item_name: neg.item_name,
        current_offer: neg.current_offer,
        price: counterPrice,
        message: `Hi! Thanks for your offer. How about $${counterPrice}? That's a fair price for this quality piece.`,
        reasoning: `Strategic counter to move towards asking price`
      })
    })
  }
  
  // Handle price-based filtering (e.g., "decline offers under $500")
  if ((requestLower.includes('decline') || requestLower.includes('remove')) && requestLower.includes('under')) {
    const priceMatch = requestLower.match(/under\s*\$?(\d+)/)
    if (priceMatch) {
      const threshold = parseInt(priceMatch[1])
      const lowOffers = relevantNegotiations.filter(neg => neg.current_offer < threshold)
      
      lowOffers.forEach(neg => {
        actions.push({
          action: 'decline',
          negotiation_id: neg.id,
          buyer_name: neg.profiles?.username || 'Buyer',
          item_name: neg.item_name,
          current_offer: neg.current_offer,
          message: `Thanks for your interest, but I can't go that low. Good luck with your search!`,
          reasoning: `Below ${threshold} threshold`
        })
      })
    }
  }

  if (actions.length === 0) {
    return {
      error: true,
      message: `I couldn't figure out what action to take from "${userRequest}". Try being more specific like "accept the highest offer" or "remove lowballs".`
    }
  }

  // If not confirmed, return plan for approval
  if (!confirmed) {
    return {
      plan_type: 'SMART_ACTION_PLAN',
      actions: actions,
      summary: `Ready to execute ${actions.length} action(s) based on your request.`,
      requires_confirmation: true,
      user_request: userRequest
    }
  }

  // Execute confirmed actions
  console.log('⚡ EXECUTING:', actions.length, 'smart actions')
  const results = []
  let successCount = 0

  for (const action of actions) {
    try {
      let result
      switch (action.action) {
        case 'accept':
          result = await acceptOffer(sellerId, action.negotiation_id)
          break
        case 'decline':
          result = await declineOffer(sellerId, action.negotiation_id, action.message)
          break
        case 'counter':
          result = await counterOffer(sellerId, action.negotiation_id, action.price!, action.message)
          break
        default:
          throw new Error(`Unknown action: ${action.action}`)
      }
      
      successCount++
      results.push({ action, success: true, result })
      console.log(`✅ ${action.action.toUpperCase()} successful for negotiation ${action.negotiation_id}`)
      
    } catch (error) {
      results.push({ action, success: false, error: (error as Error).message })
      console.error(`❌ ${action.action.toUpperCase()} failed for negotiation ${action.negotiation_id}:`, error)
    }
  }

  console.log(`🎯 COMPLETED: ${successCount}/${actions.length} smart actions successful`)
  return {
    execution_complete: true,
    total_actions: actions.length,
    successful_actions: successCount,
    failed_actions: actions.length - successCount,
    results,
    summary: `Executed ${successCount}/${actions.length} actions from your request: "${userRequest}"`
  }
}

async function getConversationContext(sellerId: string, negotiationId: number) {
  console.log('📚 CONTEXT: Getting conversation history for negotiation', negotiationId)
  
  const { data: negotiation, error: negError } = await supabase
    .from('negotiations')
    .select(`
      id,
      current_offer,
      status,
      round_number,
      items!inner (name, starting_price),
      profiles!negotiations_buyer_id_fkey (username, buyer_personality),
      offers (id, price, message, created_at, offer_type, round_number)
    `)
    .eq('id', negotiationId)
    .eq('seller_id', sellerId)
    .single()

  if (negError || !negotiation) {
    throw new Error('Negotiation not found or unauthorized')
  }

  // Sort offers chronologically
  const offers = (negotiation.offers || []).sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  return {
    negotiation: {
      id: negotiation.id,
      current_offer: negotiation.current_offer,
      status: negotiation.status,
      round_number: negotiation.round_number
    },
    item: negotiation.items,
    buyer: negotiation.profiles,
    conversation_history: offers,
    summary: `${offers.length} messages in ${negotiation.round_number} rounds`
  }
}

// =============================================================================
// CORE MARKETPLACE OPERATIONS
// =============================================================================

async function acceptOffer(sellerId: string, negotiationId: number) {
  const { data, error } = await supabase
    .from('negotiations')
    .update({ 
      status: 'completed',
      updated_at: new Date().toISOString()
    })
    .eq('id', negotiationId)
    .eq('seller_id', sellerId)
    .select()
    .single()

  if (error) throw new Error('Failed to accept offer')
  return { message: 'Offer accepted successfully', negotiation: data }
}

async function declineOffer(sellerId: string, negotiationId: number, reason?: string) {
  const { data, error } = await supabase
    .from('negotiations')
    .update({ 
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('id', negotiationId)
    .eq('seller_id', sellerId)
    .select()
    .single()

  if (error) throw new Error('Failed to decline offer')

  // Add decline message if provided
  if (reason) {
    await supabase
      .from('offers')
      .insert({
        negotiation_id: negotiationId,
        offer_type: 'seller',
        price: data.current_offer,
        message: reason,
        round_number: data.round_number + 1,
        is_counter_offer: false
      })
  }

  return { message: 'Offer declined successfully', reason, negotiation_id: negotiationId }
}

async function counterOffer(sellerId: string, negotiationId: number, price: number, message?: string) {
  // Get current negotiation
  const { data: currentNeg, error: getCurrentError } = await supabase
    .from('negotiations')
    .select('round_number')
    .eq('id', negotiationId)
    .eq('seller_id', sellerId)
    .single()

  if (getCurrentError) throw new Error('Failed to get current negotiation')

  // Update negotiation with new offer
  const { data: negotiation, error: negError } = await supabase
    .from('negotiations')
    .update({ 
      current_offer: price,
      round_number: currentNeg.round_number + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', negotiationId)
    .eq('seller_id', sellerId)
    .select()
    .single()

  if (negError) throw new Error('Failed to update negotiation')

  // Add counter offer to history
  const { data: offer, error: offerError } = await supabase
    .from('offers')
    .insert({
      negotiation_id: negotiationId,
      offer_type: 'seller',
      price: price,
      message: message || '',
      round_number: negotiation.round_number,
      is_counter_offer: true
    })
    .select()
    .single()

  if (offerError) throw new Error('Failed to create counter offer')

  return { message: 'Counter offer created successfully', offer }
}

// =============================================================================
// AGENT EXECUTOR: Routes function calls to appropriate handlers
// =============================================================================

async function executeAgentFunction(functionName: string, args: any, sellerId: string) {
  try {
    switch (functionName) {
      case 'get_current_status':
        return await getCurrentStatus(sellerId)
      
      case 'analyze_offers':
        return await analyzeOffers(sellerId, args.item_identifier)
      
      case 'send_message_to_buyer':
        return await sendMessageToBuyer(sellerId, args.negotiation_id, args.message)
      
      case 'compose_buyer_message':
        return await composeBuyerMessage(sellerId, args.buyer_identifier, args.message_topic, args.message_content)
      
      case 'smart_action_planner':
        return await smartActionPlanner(sellerId, args.user_request, args.item_identifier, args.confirmed)
      
      case 'get_conversation_context':
        return await getConversationContext(sellerId, args.negotiation_id)
      
      default:
        return { error: `Unknown function: ${functionName}` }
    }
  } catch (error: any) {
    console.error(`Agent function error [${functionName}]:`, error.message)
    return { error: error.message }
  }
}

// =============================================================================
// MAIN API HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  return withRateLimit(request, ratelimit.chat, async () => {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json({ error: 'AI service not configured' }, { status: 500 })
      }

      const { message, conversation_id } = await request.json()
      
      if (!message) {
        return NextResponse.json({ error: 'Message is required' }, { status: 400 })
      }

      // Authenticate user
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
          return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }
        user = sessionUser
      }

      const sellerId = user.id

      // Get or create conversation
      let conversationId = conversation_id
      if (!conversationId) {
        const { data: existingConversation } = await supabase
          .from('conversations')
          .select()
          .eq('seller_id', sellerId)
          .single()
        
        if (existingConversation) {
          conversationId = existingConversation.id
        } else {
          const { data: conversation, error: convError } = await supabase
            .from('conversations')
            .insert({ seller_id: sellerId })
            .select()
            .single()
          
          if (convError) {
            if (convError.code === '23505') {
              const { data: retryConversation } = await supabase
                .from('conversations')
                .select()
                .eq('seller_id', sellerId)
                .single()
              conversationId = retryConversation?.id
            }
            
            if (!conversationId) {
              return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
            }
          } else {
            conversationId = conversation.id
          }
        }
      }

      // Save user message
      await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          role: 'user',
          content: message
        })

      // Get recent conversation history
      const { data: messageHistory } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(6)

      const messages = messageHistory?.reverse() || []

      // Get seller profile
      const { data: sellerProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', sellerId)
        .single()
      
      const sellerName = sellerProfile?.username || 'there'

      // Check if user is confirming a previous action plan
      const isConfirmation = message.toLowerCase().match(/^(yes|confirm|execute|do it|go ahead|proceed)$/i)
      let pendingPlan = null
      
      if (isConfirmation) {
        // Look for the most recent action plan in conversation
        for (let i = messages.length - 1; i >= 0; i--) {
          const msg = messages[i]
          if (msg.role === 'assistant' && msg.function_results) {
            const results = typeof msg.function_results === 'string' ? 
              JSON.parse(msg.function_results) : msg.function_results
            if (results.requires_confirmation && results.actions) {
              pendingPlan = results
              break
            }
          }
        }
      }

      // Build agent system prompt with human-like communication style
      const systemPrompt = `You are ${sellerName}'s AI marketplace assistant. You help manage furniture listings and negotiate with buyers. 

CRITICAL FORMATTING RULES:
- NEVER use markdown formatting like ** or ## or ### 
- NEVER bold text with **text**
- NEVER use headers with ##
- Write in plain text only like normal conversation
- When mentioning names, just say "Sarah" not "**Sarah**"
- When mentioning items, just say "dining table" not "**dining table**"

Your personality:
- Friendly and conversational, like talking to a business partner
- Direct and actionable - you get things done
- Strategic but explain things simply
- Write like you're texting a friend, no special formatting

Your process:
1. PERCEIVE: Always check current marketplace status first with get_current_status()
2. REASON: Understand what the user wants and analyze the situation  
3. ACT: Use smart_action_planner for requests like "accept highest offer", "remove lowballs", etc.

Key tools:
- get_current_status() - See all current listings and offers
- analyze_offers(item?) - Deep dive analysis with recommendations
- smart_action_planner(user_request, item?, confirmed) - Handle natural language actions
- compose_buyer_message(buyer_identifier, topic, message) - Send messages to buyers by name
- send_message_to_buyer(negotiation_id, message) - Send direct messages through platform
- get_conversation_context() - See negotiation history

Communication style:
- Natural conversation: "I found 4 offers on your couch" not "Found 4 offers"
- Show specific data: names, prices, percentages
- Give clear recommendations with reasoning
- For actions: explain the plan, wait for confirmation, then execute
- Use emojis sparingly, only for emphasis
- NEVER use any ** or ## formatting

${pendingPlan ? `

IMPORTANT: The user just confirmed a pending action plan. Use smart_action_planner with confirmed=true and the original request: "${pendingPlan.user_request || 'execute plan'}"

` : ''}

Example interaction:
User: "What should I do about lowball offers?"
You: 
1. Call get_current_status()
2. Call analyze_offers() 
3. Respond: "I see you have 3 lowball offers (under 70% of asking price) on your dining table from Mike ($400), Sarah ($350), and Tom ($380). Your asking price is $800 so these are pretty weak.

My recommendation: Remove these lowball offers since they're wasting your time. I can decline them all with a polite message.

Want me to go ahead and decline all three?"

REMEMBER: 
- Be helpful, direct, and human-like
- NO markdown formatting ever
- NO ** around names or items
- NO ## for headers
- Write like you're talking to a friend

Example of GOOD formatting:
"I found 3 offers on your dining table. Sarah offered $800, Mike offered $650, and Tom offered $900. I recommend accepting Tom's offer since it's the highest."

Example of BAD formatting (NEVER do this):
"I found 3 offers on your **dining table**. **Sarah** offered $800, **Mike** offered $650, and **Tom** offered $900. I recommend accepting **Tom's** offer since it's the highest."

Always use the GOOD style, never the BAD style.`

      const conversationMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...messages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
      ]

      // Call OpenAI with agent tools
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: conversationMessages,
        tools: AGENT_TOOLS.map(tool => ({
          type: "function" as const,
          function: tool
        })),
        tool_choice: "auto",
        temperature: 0.3,
        max_tokens: 1000
      })

      const assistantMessage = completion.choices[0].message
      let functionResults = null

      // Handle tool calls
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        const toolResults = []
        
        for (const toolCall of assistantMessage.tool_calls) {
          try {
            const functionName = toolCall.function.name
            const functionArgs = JSON.parse(toolCall.function.arguments || '{}')
            
            // If this is a confirmation, auto-set confirmed=true for smart_action_planner
            if (isConfirmation && functionName === 'smart_action_planner' && pendingPlan) {
              functionArgs.confirmed = true
              functionArgs.user_request = functionArgs.user_request || pendingPlan.user_request || 'execute plan'
            }
            
            console.log(`🤖 Agent executing: ${functionName}`, functionArgs)
            const result = await executeAgentFunction(functionName, functionArgs, sellerId)
            
            toolResults.push({
              toolCall,
              result,
              functionName,
              functionArgs
            })
          } catch (error) {
            console.error(`Agent tool error for ${toolCall.function.name}:`, error)
            toolResults.push({
              toolCall,
              result: { error: (error as Error).message },
              functionName: toolCall.function.name,
              functionArgs: {}
            })
          }
        }
        
        // Save assistant message with function calls
        await supabase
          .from('chat_messages')
          .insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: assistantMessage.content || 'Let me check that for you...',
            function_calls: {
              name: toolResults[0].functionName,
              arguments: toolResults[0].functionArgs
            },
            function_results: toolResults[0].result
          })

        // Build follow-up messages with tool responses
        const followUpMessages = [
          ...conversationMessages,
          {
            role: 'assistant' as const,
            content: assistantMessage.content || 'Let me analyze that for you...',
            tool_calls: assistantMessage.tool_calls
          },
          ...toolResults.map(tr => ({
            role: 'tool' as const,
            tool_call_id: tr.toolCall.id,
            content: JSON.stringify(tr.result)
          }))
        ]
        
        functionResults = toolResults[0].result

        // Get final agent response
        const followUpCompletion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: followUpMessages,
          temperature: 0.3,
          max_tokens: 1000
        })

        const finalMessage = followUpCompletion.choices[0].message.content || ''
        
        // Save final response
        await supabase
          .from('chat_messages')
          .insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: finalMessage
          })

        return NextResponse.json({
          message: finalMessage,
          conversation_id: conversationId,
          function_executed: toolResults[0].functionName,
          function_results: functionResults,
          agent_type: 'marketplace_agent'
        })
      } else {
        // No function call - direct response
        const responseContent = assistantMessage.content || ''
        
        await supabase
          .from('chat_messages')
          .insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: responseContent
          })

        return NextResponse.json({
          message: responseContent,
          conversation_id: conversationId,
          agent_type: 'marketplace_agent'
        })
      }

    } catch (error: any) {
      console.error('Agent API error:', error)
      return NextResponse.json(
        { error: error.message || 'Agent processing failed' },
        { status: 500 }
      )
    }
  })
}