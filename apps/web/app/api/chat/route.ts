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

// TypeScript interfaces for smart action system
interface BaseAction {
  action: string
  negotiation_id: number
  buyer_name: string
  item_name: string
  current_offer: number
  reasoning: string
}

interface AcceptAction extends BaseAction {
  action: 'accept'
}

interface DeclineAction extends BaseAction {
  action: 'decline'
  message: string
}

interface CounterAction extends BaseAction {
  action: 'counter'
  price: number
  message: string
}

type SmartAction = AcceptAction | DeclineAction | CounterAction

interface OfferAnalysis {
  category: 'premium' | 'strong' | 'reasonable' | 'lowball'
  percentage: number
  recommendation: string
}

// Business intelligence helper functions
function analyzeOffer(currentOffer: number, startingPrice: number): OfferAnalysis {
  const percentage = Math.round((currentOffer / startingPrice) * 100)
  
  if (percentage >= 100) {
    return {
      category: 'premium',
      percentage,
      recommendation: 'Excellent! Accept immediately'
    }
  } else if (percentage >= 90) {
    return {
      category: 'strong', 
      percentage,
      recommendation: 'Strong offer - accept or counter slightly higher'
    }
  } else if (percentage >= 70) {
    return {
      category: 'reasonable',
      percentage,
      recommendation: 'Fair offer - counter to asking price or accept'
    }
  } else {
    return {
      category: 'lowball',
      percentage,
      recommendation: 'Too low - decline or counter much higher'
    }
  }
}

function generateSmartIntroMessage(negotiations: any[], items: any[]): string {
  if (negotiations.length === 0) {
    if (items.length > 0) {
      const oldestItem = items.reduce((oldest, item) => {
        const itemAge = Math.floor((Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24))
        const oldestAge = Math.floor((Date.now() - new Date(oldest.created_at).getTime()) / (1000 * 60 * 60 * 24))
        return itemAge > oldestAge ? item : oldest
      })
      const daysOld = Math.floor((Date.now() - new Date(oldestItem.created_at).getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysOld >= 7) {
        return `${oldestItem.name}: no offers in ${daysOld} days. Lower price from $${oldestItem.starting_price}?`
      } else {
        return `${items.length} listing${items.length > 1 ? 's' : ''} active. No offers yet - be patient or adjust pricing.`
      }
    }
    return "Ready to help with your marketplace!"
  }

  // Analyze all offers
  const analyses = negotiations.map(neg => ({
    ...neg,
    analysis: analyzeOffer(parseFloat(neg.current_offer), parseFloat(neg.item?.starting_price || neg.starting_price))
  }))

  // Sort by offer amount (highest first)
  analyses.sort((a, b) => parseFloat(b.current_offer) - parseFloat(a.current_offer))

  if (analyses.length === 1) {
    const neg = analyses[0]
    const buyerName = neg.buyer?.[0]?.username || 'Someone'
    const itemName = neg.item?.name || neg.item_name || 'item'
    const analysis = neg.analysis
    
    return `${buyerName}: $${neg.current_offer} (${analysis.percentage}% of asking) for ${itemName}. ${analysis.recommendation.split(' - ')[1] || 'Accept?'}`
  }

  // Multiple offers - show strategic summary
  const bestOffer = analyses[0]
  const buyerName = bestOffer.buyer?.[0]?.username || 'Someone'
  const itemName = bestOffer.item?.name || bestOffer.item_name || 'item'
  
  const premiumCount = analyses.filter(a => a.analysis.category === 'premium').length
  const strongCount = analyses.filter(a => a.analysis.category === 'strong').length
  const lowballCount = analyses.filter(a => a.analysis.category === 'lowball').length
  
  if (premiumCount > 0) {
    return `${analyses.length} offers! ${premiumCount} at/above asking. Accept ${buyerName}'s $${bestOffer.current_offer}?`
  } else if (strongCount > 0) {
    return `${analyses.length} offers! Best: ${buyerName} $${bestOffer.current_offer} (${bestOffer.analysis.percentage}%) for ${itemName}. Accept it?`
  } else if (lowballCount === analyses.length) {
    return `${analyses.length} offers, all lowballs. Highest: ${buyerName} $${bestOffer.current_offer} (${bestOffer.analysis.percentage}%). Decline all?`
  } else {
    return `${analyses.length} offers! Highest: ${buyerName} $${bestOffer.current_offer} (${bestOffer.analysis.percentage}%) for ${itemName}. Counter at asking price?`
  }
}

// 🔍 SIMPLE AGENT TOOLS: Let AI intelligence handle natural language mapping
const AGENT_TOOLS = [
  {
    name: "get_current_status",
    description: "Get current marketplace offers and listings. Use this to understand what offers exist and their details.",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "take_marketplace_action", 
    description: "Execute marketplace actions: accept offers, decline offers, or make counter offers. Use this for any offer-related actions.",
    parameters: {
      type: "object",
      properties: {
        action_type: {
          type: "string",
          enum: ["accept", "decline", "counter"],
          description: "Type of action to take"
        },
        negotiation_id: {
          type: "number", 
          description: "ID of the negotiation to act on"
        },
        counter_price: {
          type: "number",
          description: "Price for counter offers (required if action_type is 'counter')"
        },
        reason: {
          type: "string",
          description: "Optional reason for declining (e.g., 'too low', 'not interested')"
        }
      },
      required: ["action_type", "negotiation_id"]
    }
  },
  {
    name: "send_buyer_message",
    description: "Send a message to a buyer. Use this for pickup scheduling, questions, or any communication.",
    parameters: {
      type: "object",
      properties: {
        buyer_name: {
          type: "string",
          description: "Name of the buyer to message"
        },
        message_type: {
          type: "string", 
          enum: ["pickup_scheduling", "question", "custom"],
          description: "Type of message being sent"
        },
        custom_message: {
          type: "string",
          description: "Custom message content (required if message_type is 'custom')"
        }
      },
      required: ["buyer_name", "message_type"]
    }
  }
]

// =============================================================================
// AGENT IMPLEMENTATION: Core intelligence functions
// =============================================================================

async function getCurrentStatus(sellerId: string) {
  console.log('🔍 Getting current marketplace status for seller:', sellerId)
  
  try {
    // Simple direct query to get all active negotiations with details
    const { data: negotiations, error } = await supabase
      .from('negotiations')
      .select(`
        id,
        current_offer,
        status,
        created_at,
        items!inner (
          id,
          name, 
          starting_price
        ),
        profiles!inner (
          username,
          email
        )
      `)
      .eq('seller_id', sellerId)
      .eq('status', 'active')
      .order('current_offer', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch negotiations: ${error.message}`)
    }

    console.log(`✅ Found ${negotiations?.length || 0} active negotiations`)
    
    return {
      active_negotiations: negotiations || [],
      summary: `${negotiations?.length || 0} active offers`
    }
  } catch (error) {
    console.error('Error getting current status:', error)
    throw error
  }
}

// Simple marketplace action handler
async function takeMarketplaceAction(sellerId: string, actionType: string, negotiationId: number, details: any = {}) {
  console.log(`🎯 Taking action: ${actionType} on negotiation ${negotiationId}`)
  
  try {
    switch (actionType) {
      case 'accept':
        return await acceptOffer(sellerId, negotiationId)
        
      case 'decline':
        const reason = details.reason || 'Thank you for your interest, but I cannot accept this offer.'
        return await declineOffer(sellerId, negotiationId, reason)
        
      case 'counter':
        if (!details.counter_price) {
          throw new Error('Counter price is required for counter offers')
        }
        const message = details.message || `Hi! Thanks for your offer. How about $${details.counter_price}? That's a fair price for this quality piece.`
        return await counterOffer(sellerId, negotiationId, details.counter_price, message)
        
      default:
        throw new Error(`Unknown action type: ${actionType}`)
    }
  } catch (error) {
    console.error(`Error executing ${actionType}:`, error)
    throw error
  }
}

// Simple buyer messaging handler  
async function sendBuyerMessage(sellerId: string, buyerName: string, messageType: string, customMessage?: string) {
  console.log(`💬 Sending ${messageType} message to ${buyerName}`)
  
  try {
    let message = customMessage
    
    if (!message) {
      switch (messageType) {
        case 'pickup_scheduling':
          message = `Hi ${buyerName}! Thanks for your offer. When would be a good time for you to pick up the item? I'm generally available evenings and weekends. Looking forward to hearing from you!`
          break
        case 'question':
          message = `Hi ${buyerName}! I wanted to follow up about your offer. Do you have any questions about the item?`
          break
        default:
          message = `Hi ${buyerName}! Thanks for your interest in the item.`
      }
    }
    
    // Find the buyer and send message using existing composeBuyerMessage function
    return await composeBuyerMessage(sellerId, buyerName, messageType, message)
    
  } catch (error) {
    console.error(`Error sending message to ${buyerName}:`, error)
    throw error
  }
}
  
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
      buyer:buyer_id (username, email),
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
  
  const buyerName = negotiation.buyer?.[0]?.username || 'the buyer'
  const itemName = negotiation.items?.[0]?.name || 'your item'
  
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
  
  // DEBUG: Log what we're working with
  console.log('🔍 DEBUG: All negotiations:', JSON.stringify(allNegotiations.map(n => ({
    id: n.id,
    buyer: n.buyer,
    buyer_username: n.buyer?.[0]?.username,
    current_offer: n.current_offer,
    item_name: n.item_name
  })), null, 2))

  // Find the negotiation based on buyer identifier
  let targetNegotiation = null
  const identifierLower = buyerIdentifier.toLowerCase()
  
  // Try to match by username, email, or offer amount
  for (const neg of allNegotiations) {
    const buyerName = neg.buyer?.[0]?.username?.toLowerCase() || ''
    const buyerEmail = neg.buyer?.[0]?.email?.toLowerCase() || neg.buyer_id?.toString().toLowerCase() || ''
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
      message: `I couldn't find a buyer matching "${buyerIdentifier}". Here are your current negotiations: ${allNegotiations.map(n => `${n.buyer?.[0]?.username || 'Unknown'} ($${n.current_offer} for ${n.item_name})`).join(', ')}`
    }
  }

  // Send the message through the platform
  try {
    const result = await sendMessageToBuyer(sellerId, targetNegotiation.id, messageContent)
    
    return {
      success: true,
      message: `Message sent to ${targetNegotiation.buyer?.[0]?.username || 'the buyer'} about ${messageTopic}. They'll see it in their negotiations tab.`,
      buyer_name: targetNegotiation.buyer?.[0]?.username,
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

  // Parse the user request and determine actions with flexible language support
  const requestLower = userRequest.toLowerCase()
  const actions = []

  // Handle accept variations: "accept highest/best/top offer", "take the best offer", "go with highest"
  const acceptPatterns = [
    /accept.*(highest|best|top|maximum)/,
    /take.*(best|highest|top)/,
    /go\s+with.*(highest|best|top)/,
    /(choose|pick|select).*(highest|best|top)/
  ]
  
  const isAcceptRequest = acceptPatterns.some(pattern => pattern.test(requestLower))
  
  if (isAcceptRequest) {
    const highestOffer = relevantNegotiations.reduce((max, neg) => 
      neg.current_offer > max.current_offer ? neg : max
    )
    actions.push({
      action: 'accept',
      negotiation_id: highestOffer.id,
      buyer_name: highestOffer.buyer?.[0]?.username || 'Buyer',
      item_name: highestOffer.item_name,
      current_offer: highestOffer.current_offer,
      reasoning: 'Highest offer available'
    } as AcceptAction)
  }
  
  // Handle decline variations: "remove lowballs", "get rid of bad offers", "decline weak offers"
  const declinePatterns = [
    /remove.*(lowball|low|bad|weak|poor)/,
    /decline.*(lowball|low|bad|weak|poor)/,
    /(get\s+rid\s+of|delete|clear).*(lowball|low|bad|weak|poor)/,
    /reject.*(lowball|low|bad|weak|poor)/,
    /(remove|decline).*(offer|lowball)/
  ]
  
  const isDeclineRequest = declinePatterns.some(pattern => pattern.test(requestLower))
  
  if (isDeclineRequest) {
    const lowballOffers = relevantNegotiations.filter(neg => 
      neg.current_offer < neg.starting_price * 0.7
    )
    lowballOffers.forEach(neg => {
      actions.push({
        action: 'decline',
        negotiation_id: neg.id,
        buyer_name: neg.buyer?.[0]?.username || 'Buyer',
        item_name: neg.item_name,
        current_offer: neg.current_offer,
        message: "Thanks for your interest, but I can't go that low. Good luck with your search!",
        reasoning: `Lowball offer (${Math.round((neg.current_offer / neg.starting_price) * 100)}% of asking price)`
      } as DeclineAction)
    })
  }
  
  // Handle counter variations: "counter reasonable offers", "negotiate with strong offers"
  const counterPatterns = [
    /counter.*(reasonable|strong|good|fair)/,
    /negotiate.*(with|reasonable|strong|good|fair)/,
    /(respond|reply).*(reasonable|strong|good|fair)/
  ]
  
  const isCounterRequest = counterPatterns.some(pattern => pattern.test(requestLower)) || requestLower.includes('counter')
  
  if (isCounterRequest) {
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
        buyer_name: neg.buyer?.[0]?.username || 'Buyer',
        item_name: neg.item_name,
        current_offer: neg.current_offer,
        price: counterPrice,
        message: `Hi! Thanks for your offer. How about $${counterPrice}? That's a fair price for this quality piece.`,
        reasoning: `Strategic counter to move towards asking price`
      } as CounterAction)
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
          buyer_name: neg.buyer?.[0]?.username || 'Buyer',
          item_name: neg.item_name,
          current_offer: neg.current_offer,
          message: `Thanks for your interest, but I can't go that low. Good luck with your search!`,
          reasoning: `Below $${threshold} threshold`
        } as DeclineAction)
      })
    }
  }

  if (actions.length === 0) {
    // Provide intelligent suggestions based on current offers
    const hasHighValueOffers = relevantNegotiations.some(neg => neg.current_offer >= neg.starting_price * 0.9)
    const hasLowballOffers = relevantNegotiations.some(neg => neg.current_offer < neg.starting_price * 0.7)
    
    let suggestions = []
    if (hasHighValueOffers) suggestions.push('"accept the best offer"')
    if (hasLowballOffers) suggestions.push('"remove lowball offers"')
    suggestions.push('"counter reasonable offers"')
    
    return {
      error: true,
      message: `I couldn't understand "${userRequest}". Try: ${suggestions.join(', ')}, or "message [buyer] about pickup".`
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

  for (const action of actions as SmartAction[]) {
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
          result = await counterOffer(sellerId, action.negotiation_id, action.price, action.message)
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
      buyer:buyer_id (username, email),
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
    buyer: negotiation.buyer,
    conversation_history: offers,
    summary: `${offers.length} messages in ${negotiation.round_number} rounds`
  }
}

async function markItemPickedUp(sellerId: string, negotiationId: number, notes?: string) {
  console.log('✅ COMPLETING: Marking item picked up for negotiation', negotiationId)
  
  // Verify negotiation belongs to seller and is completed
  const { data: negotiation, error: negError } = await supabase
    .from('negotiations')
    .select(`
      id,
      status,
      item_id,
      current_offer,
      items!inner (name),
      profiles!negotiations_buyer_id_fkey (username)
    `)
    .eq('id', negotiationId)
    .eq('seller_id', sellerId)
    .single()

  if (negError || !negotiation) {
    throw new Error('Negotiation not found or unauthorized')
  }

  if (negotiation.status !== 'completed') {
    throw new Error('Can only mark picked up for completed sales')
  }

  // Update negotiation with pickup confirmation
  const { error: updateError } = await supabase
    .from('negotiations')
    .update({ 
      status: 'picked_up',
      pickup_confirmed_at: new Date().toISOString(),
      pickup_notes: notes || null
    })
    .eq('id', negotiationId)

  if (updateError) {
    throw new Error(`Failed to mark pickup: ${updateError.message}`)
  }

  console.log('✅ COMPLETED: Item marked as picked up')
  
  const buyerName = negotiation.buyer?.[0]?.username || 'the buyer'
  const itemName = negotiation.items?.[0]?.name || 'your item'
  const finalPrice = negotiation.current_offer
  
  return { 
    success: true, 
    message: `✅ ${itemName} marked as picked up by ${buyerName}. Final sale: $${finalPrice}. Transaction complete!`,
    buyer_name: buyerName,
    item_name: itemName,
    final_price: finalPrice,
    notes: notes
  }
}

// =============================================================================
// CORE MARKETPLACE OPERATIONS
// =============================================================================

async function acceptOffer(_sellerId: string, negotiationId: number) {
  try {
    // Get auth token from supabase session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('No authentication token available')
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/api/negotiations/${negotiationId}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({})
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to accept offer')
    }

    const result = await response.json()
    return { message: 'Offer accepted successfully', final_price: result.final_price }
  } catch (error) {
    throw new Error(`Failed to accept offer: ${(error as Error).message}`)
  }
}

async function declineOffer(_sellerId: string, negotiationId: number, reason?: string) {
  try {
    // Get auth token from supabase session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('No authentication token available')
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/api/negotiations/${negotiationId}/decline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ reason: reason || 'Offer declined' })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to decline offer')
    }

    const result = await response.json()
    return { message: 'Offer declined successfully', reason, negotiation_id: negotiationId }
  } catch (error) {
    throw new Error(`Failed to decline offer: ${(error as Error).message}`)
  }
}

async function counterOffer(_sellerId: string, negotiationId: number, price: number, message?: string) {
  try {
    // Get auth token from supabase session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('No authentication token available')
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/api/negotiations/${negotiationId}/counter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ 
        price: price,
        message: message || ''
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create counter offer')
    }

    const result = await response.json()
    return { message: 'Counter offer created successfully', offer: result.offer }
  } catch (error) {
    throw new Error(`Failed to create counter offer: ${(error as Error).message}`)
  }
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
      
      case 'mark_item_picked_up':
        return await markItemPickedUp(sellerId, args.negotiation_id, args.notes)
      
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

      // Build agent system prompt - ULTRA DIRECT
      const systemPrompt = `You are ${sellerName}'s marketplace assistant. Help close deals fast.

COMMUNICATION RULES:
- ULTRA DIRECT: 1-2 sentences maximum per response
- NO explanations, strategies, or analysis unless asked
- Lead with ACTION: "Accept Mike's $800 offer?" 
- NO markdown formatting ever (no ** or ## or ###)
- Plain text only, like texting

Your job: Help complete sales quickly.

PROCESS:
1. Always check status first with get_current_status()
2. Recommend ONE clear next action
3. Execute when user confirms

Key tools:
- get_current_status() - Check listings and offers
- smart_action_planner(request, item?, confirmed) - Execute actions like "accept offer", "decline lowballs"
- compose_buyer_message(buyer_name, topic, message) - Message buyers about pickup, questions
- mark_item_picked_up(negotiation_id) - Complete sale

RESPONSE EXAMPLES:
User: "What's happening?"
You: [check status] → "Mike offered $800 for your couch. Accept it?"

User: "Yes" 
You: [execute] → "✅ Accepted. Want me to ask Mike about pickup time?"

User: "Yes ask about pickup"
You: [message buyer] → "✅ Asked Mike when he can pick up. What else?"

BE BRIEF. BE DIRECT. GET DEALS DONE.

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