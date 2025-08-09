import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import OpenAI from 'openai'
import { ratelimit, withRateLimit } from '@/lib/rate-limit'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const supabase = createSupabaseServerClient()

// Level 1: Smart Analysis Functions
function analyzeOffers(offers: any[], itemStartingPrice: number) {
  // Filter out offers with null/undefined prices
  const validOffers = offers.filter(o => o.price != null && typeof o.price === 'number')
  
  const analysis = {
    total: validOffers.length,
    priceRanges: {
      lowball: validOffers.filter(o => o.price < itemStartingPrice * 0.6).length,
      reasonable: validOffers.filter(o => o.price >= itemStartingPrice * 0.6 && o.price < itemStartingPrice * 0.9).length,
      strong: validOffers.filter(o => o.price >= itemStartingPrice * 0.9 && o.price < itemStartingPrice * 1.1).length,
      premium: validOffers.filter(o => o.price >= itemStartingPrice * 1.1).length
    },
    priceStats: validOffers.length > 0 ? {
      min: Math.min(...validOffers.map(o => o.price)),
      max: Math.max(...validOffers.map(o => o.price)),
      avg: validOffers.reduce((sum, o) => sum + o.price, 0) / validOffers.length,
      median: validOffers.sort((a, b) => a.price - b.price)[Math.floor(validOffers.length / 2)]?.price || 0
    } : {
      min: 0,
      max: 0,
      avg: 0,
      median: 0
    },
    urgencySignals: validOffers.filter(o => 
      o.message?.toLowerCase().includes('asap') ||
      o.message?.toLowerCase().includes('immediately') ||
      o.message?.toLowerCase().includes('today') ||
      o.message?.toLowerCase().includes('cash')
    ),
    qualityIndicators: validOffers.filter(o =>
      o.message?.toLowerCase().includes('cash') ||
      o.message?.toLowerCase().includes('pickup') ||
      o.message?.toLowerCase().includes('truck') ||
      o.message && o.message.length > 50 // Detailed messages indicate serious buyers
    )
  }
  
  return analysis
}

function generateRecommendations(analysis: any, itemName: string, startingPrice: number) {
  const recommendations = []
  
  if (analysis.priceRanges.premium > 0) {
    recommendations.push(`🔥 JACKPOT! Someone offered ABOVE asking price for your ${itemName}. I'd accept that immediately!`)
  }
  
  if (analysis.priceRanges.strong >= 3) {
    recommendations.push(`💪 You're in control here - ${analysis.priceRanges.strong} solid offers near asking. Pick your favorite buyer!`)
  }
  
  if (analysis.urgencySignals.length > 0) {
    recommendations.push(`⚡ ${analysis.urgencySignals.length} buyers need this fast! Perfect for quick sales - they'll pay more.`)
  }
  
  if (analysis.qualityIndicators.length > 0) {
    recommendations.push(`✨ Found ${analysis.qualityIndicators.length} serious buyers with cash ready. These are your best bets.`)
  }
  
  if (analysis.priceRanges.lowball > analysis.total * 0.6) {
    recommendations.push(`😤 Too many lowballs (${analysis.priceRanges.lowball} out of ${analysis.total}). Your price might be too high or photos need work.`)
  }
  
  // Strategic recommendations  
  if (analysis.priceStats.max > startingPrice * 0.85) {
    recommendations.push(`🎯 Smart play: Counter the top 3 at $${Math.round(startingPrice * 0.92)}. Creates competition!`)
  }
  
  return recommendations
}

// Level 2: Strategic Planning
function createNegotiationStrategy(offers: any[], itemStartingPrice: number) {
  const analysis = analyzeOffers(offers, itemStartingPrice)
  const strategy = {
    phase: '',
    actions: [] as string[],
    reasoning: ''
  }
  
  if (analysis.priceRanges.premium > 0) {
    strategy.phase = 'ACCEPT_NOW'
    strategy.actions = ['Accept the highest offer right now!']
    strategy.reasoning = `Someone's paying MORE than asking - that's rare! Take it before they change their mind.`
  } else if (analysis.priceRanges.strong >= 2) {
    strategy.phase = 'CREATE_COMPETITION'  
    strategy.actions = [
      'Counter the top 3 buyers at 95% asking price',
      'Give them 24 hours to respond',
      'Accept the first one who says yes'
    ]
    strategy.reasoning = `Multiple good offers means you can create a bidding war!`
  } else if (analysis.priceRanges.reasonable >= 5) {
    strategy.phase = 'BATCH_AND_MOVE'
    strategy.actions = [
      'Counter everyone reasonable at 88% asking', 
      'Ignore the lowballs completely',
      'First to respond wins'
    ]
    strategy.reasoning = `Tons of interest! Move fast and pick the quickest buyer.`
  } else {
    strategy.phase = 'PIVOT_STRATEGY'
    strategy.actions = [
      'Drop price by 10-15%',
      'Add better photos',
      'Check what similar items are selling for'
    ]
    strategy.reasoning = `Not enough good offers - something needs to change.`
  }
  
  return strategy
}

// Phase 1: Data Retrieval Functions (No Side Effects)
const DATA_RETRIEVAL_FUNCTIONS = [
  {
    name: "get_seller_status",
    description: "Get overview of seller's items, offers, and negotiations",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "get_offer_details",
    description: "Get detailed information about offers for a specific item",
    parameters: {
      type: "object",
      properties: {
        item_id: {
          type: "number",
          description: "The ID of the item to get offers for"
        }
      },
      required: ["item_id"]
    }
  },
  {
    name: "analyze_offers_smart",
    description: "Perform intelligent analysis of offers with recommendations and strategy",
    parameters: {
      type: "object", 
      properties: {
        item_id: {
          type: "number",
          description: "The ID of the item to analyze offers for"
        }
      },
      required: ["item_id"]
    }
  },
  {
    name: "create_action_plan", 
    description: "Generate a detailed action plan with specific steps (NO EXECUTION)",
    parameters: {
      type: "object",
      properties: {
        item_id: {
          type: "number", 
          description: "The ID of the item to create action plan for"
        }
      },
      required: ["item_id"]
    }
  },
  {
    name: "create_smart_action_plan",
    description: "Intelligently create action plan by finding item and analyzing offers automatically. Use this for natural requests like 'counter top 3 couch offers' or 'remove offers under $900'",
    parameters: {
      type: "object",
      properties: {
        request: {
          type: "string",
          description: "The user's natural request (e.g., 'counter top 3 couch offers', 'remove offers under $900', 'accept best dining table offer')"
        }
      },
      required: ["request"]
    }
  },
  {
    name: "get_current_status_update",
    description: "Get fresh, real-time status for dynamic responses and welcome messages. Use this for greetings, check-ins, or after actions to provide current info.",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  }
]

// Phase 2: Action Execution Functions (Only called after user confirmation)
const ACTION_EXECUTION_FUNCTIONS = [
  {
    name: "execute_confirmed_plan",
    description: "Execute a previously created and confirmed action plan",
    parameters: {
      type: "object",
      properties: {
        plan_id: {
          type: "string",
          description: "The ID of the confirmed plan to execute"
        }
      },
      required: ["plan_id"]
    }
  }
]

// In-memory storage for pending action plans (in production, use Redis or database)
const pendingPlans = new Map<string, any>()

// Helper function to execute seller functions
async function executeSellerFunction(functionName: string, args: any, sellerId: string, conversationContext?: any) {
  try {
    switch (functionName) {
      // Data Retrieval Functions
      case 'get_seller_status':
        return await getSellerStatus(sellerId)
      
      case 'get_offer_details':
        return await getOfferDetails(args.item_id, sellerId)
      
      case 'analyze_offers_smart':
        return await analyzeOffersSmart(args.item_id, sellerId)
      
      case 'create_action_plan':
        return await createActionPlan(args.item_id, sellerId)
      
      case 'create_smart_action_plan':
        return await createSmartActionPlan(args.request, sellerId)
      
      case 'get_current_status_update':
        return await getCurrentStatusUpdate(sellerId)
      
      // Action Execution Functions
      case 'execute_confirmed_plan':
        return await executeConfirmedPlan(args.plan_id, sellerId)
      
      default:
        return { error: `Unknown function: ${functionName}` }
    }
  } catch (error: any) {
    return { error: error.message }
  }
}

// Implementation of seller functions
async function getSellerStatus(sellerId: string) {
  console.log('Getting seller status for:', sellerId)
  
  // First, get all items for this seller (without requiring negotiations)
  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select(`
      *,
      negotiations (
        id,
        status,
        current_offer,
        buyer_id,
        profiles!negotiations_buyer_id_fkey (username)
      )
    `)
    .eq('seller_id', sellerId)
    .eq('is_available', true)

  console.log('Items query result:', { items, error: itemsError })

  if (itemsError) {
    console.error('Items error:', itemsError)
    throw new Error(`Failed to fetch items: ${itemsError.message}`)
  }

  // Get recent offers - simplified query
  const { data: recentOffers, error: offersError } = await supabase
    .from('negotiations')
    .select(`
      *,
      items!inner (
        name,
        starting_price,
        seller_id
      ),
      profiles!negotiations_buyer_id_fkey (username),
      offers (
        id,
        price,
        created_at,
        offer_type
      )
    `)
    .eq('seller_id', sellerId)
    .order('updated_at', { ascending: false })
    .limit(5)

  console.log('Offers query result:', { recentOffers, error: offersError })

  if (offersError) {
    console.error('Offers error:', offersError)
    // Don't throw error for offers, just log and continue
    console.log('Continuing without offers data due to error:', offersError.message)
  }

  const result = {
    items: items || [],
    recent_offers: recentOffers || [],
    total_active_items: items?.length || 0,
    total_active_negotiations: items?.reduce((acc, item) => acc + (item.negotiations?.length || 0), 0) || 0
  }

  console.log('Final seller status result:', result)
  return result
}

async function getOfferDetails(itemId: number, sellerId: string) {
  console.log(`getOfferDetails called with itemId: ${itemId}, sellerId: ${sellerId}`)
  
  // Verify item belongs to seller
  const { data: item, error: itemError } = await supabase
    .from('items')
    .select('*')
    .eq('id', itemId)
    .eq('seller_id', sellerId)
    .single()

  console.log('Item query result:', { item, error: itemError })

  if (itemError || !item) {
    console.error('Item not found error:', itemError)
    throw new Error(`Item not found or not owned by seller. ItemId: ${itemId}, SellerId: ${sellerId}`)
  }

  // Get negotiations and offers for this item
  const { data: negotiations, error: negotiationsError } = await supabase
    .from('negotiations')
    .select(`
      *,
      profiles!negotiations_buyer_id_fkey (username, buyer_personality),
      offers (*)
    `)
    .eq('item_id', itemId)
    .eq('seller_id', sellerId)
    .order('updated_at', { ascending: false })

  if (negotiationsError) throw new Error('Failed to fetch negotiations')

  return {
    item,
    negotiations: negotiations || []
  }
}

async function acceptOffer(negotiationId: number, sellerId: string) {
  // Update negotiation status to completed
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

async function declineOffer(negotiationId: number, sellerId: string, reason?: string) {
  console.log(`Declining offer: negotiationId=${negotiationId}, sellerId=${sellerId}, reason=${reason}`)
  
  // First verify the negotiation exists and belongs to seller
  const { data: existingNegotiation, error: checkError } = await supabase
    .from('negotiations')
    .select('id, status, current_offer')
    .eq('id', negotiationId)
    .eq('seller_id', sellerId)
    .single()

  if (checkError) {
    console.error('Error checking negotiation:', checkError)
    throw new Error(`Negotiation not found: ${checkError.message}`)
  }

  if (!existingNegotiation) {
    throw new Error(`Negotiation ${negotiationId} not found or doesn't belong to seller`)
  }

  console.log('Found negotiation:', existingNegotiation)

  // Update negotiation status to cancelled
  const { data: updatedData, error: updateError } = await supabase
    .from('negotiations')
    .update({ 
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('id', negotiationId)
    .eq('seller_id', sellerId)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating negotiation:', updateError)
    throw new Error(`Failed to decline offer: ${updateError.message}`)
  }

  // Add decline message to offers table for conversation history
  if (reason) {
    const { error: offerError } = await supabase
      .from('offers')
      .insert({
        negotiation_id: negotiationId,
        offer_type: 'seller',
        price: existingNegotiation.current_offer, // Keep the same price for decline
        message: reason,
        round_number: 1, // Simple decline response
        is_counter_offer: false
      })

    if (offerError) {
      console.warn('Failed to add decline message to offers table:', offerError)
      // Don't throw error here - the main decline still succeeded
    }
  }

  console.log('Successfully declined negotiation:', updatedData)
  return { message: 'Offer declined successfully', reason, negotiation_id: negotiationId }
}

async function counterOffer(negotiationId: number, sellerId: string, price: number, message?: string) {
  // Get current negotiation to increment round number
  const { data: currentNeg, error: getCurrentError } = await supabase
    .from('negotiations')
    .select('round_number')
    .eq('id', negotiationId)
    .eq('seller_id', sellerId)
    .single()

  if (getCurrentError) throw new Error('Failed to get current negotiation')

  // First update the negotiation with new current offer
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

  // Add the counter offer to offers table
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

  return { message: 'Counter offer created successfully', offer: offer }
}

async function adjustItemPrice(itemId: number, sellerId: string, newPrice: number) {
  const { data, error } = await supabase
    .from('items')
    .update({ 
      starting_price: newPrice,
      updated_at: new Date().toISOString()
    })
    .eq('id', itemId)
    .eq('seller_id', sellerId)
    .select()
    .single()

  if (error) throw new Error('Failed to update item price')

  return { message: 'Price updated successfully', item: data }
}

// Level 1 & 2: Agentic Functions Implementation
async function analyzeOffersSmart(itemId: number, sellerId: string) {
  // Get item and offers
  const { data: item, error: itemError } = await supabase
    .from('items')
    .select('*')
    .eq('id', itemId)
    .eq('seller_id', sellerId)
    .single()

  if (itemError || !item) throw new Error('Item not found')

  const { data: negotiations, error: negotiationsError } = await supabase
    .from('negotiations')
    .select(`
      *,
      offers (
        id,
        price,
        message,
        created_at,
        offer_type
      )
    `)
    .eq('item_id', itemId)
    .eq('seller_id', sellerId)

  if (negotiationsError) throw new Error('Failed to fetch negotiations')

  // Extract all offers
  const allOffers = negotiations?.flatMap(n => n.offers || []) || []
  
  if (allOffers.length === 0) {
    return { 
      message: `No offers yet for "${item.name}". Consider promoting your listing or adjusting the price.`,
      analysis: { total: 0 }
    }
  }

  // Perform analysis
  const analysis = analyzeOffers(allOffers, parseFloat(item.starting_price))
  const recommendations = generateRecommendations(analysis, item.name, parseFloat(item.starting_price))

  return {
    item: { 
      id: item.id, 
      name: item.name, 
      starting_price: item.starting_price 
    },
    analysis,
    recommendations,
    summary: `📊 Analysis of ${analysis.total} offers on "${item.name}": ${analysis.priceRanges.premium} premium, ${analysis.priceRanges.strong} strong, ${analysis.priceRanges.reasonable} reasonable, ${analysis.priceRanges.lowball} lowballs.`
  }
}

async function findItemByKeyword(keyword: string, sellerId: string) {
  console.log(`Finding items for keyword: ${keyword}, seller: ${sellerId}`)
  
  const { data: items, error } = await supabase
    .from('items')
    .select('id, name, starting_price')
    .eq('seller_id', sellerId)
    .eq('is_available', true)
    .ilike('name', `%${keyword}%`)

  if (error) {
    console.error('Error finding items by keyword:', error)
    throw new Error('Failed to search for items')
  }

  if (!items || items.length === 0) {
    return {
      found: false,
      message: `No items found matching "${keyword}". Your current items might use different names.`,
      suggestion: "Try 'table', 'chair', 'sofa', or check your full item list first."
    }
  }

  if (items.length === 1) {
    return {
      found: true,
      item_id: items[0].id,
      item_name: items[0].name,
      starting_price: items[0].starting_price,
      message: `Found your ${keyword}: "${items[0].name}" (ID: ${items[0].id})`
    }
  }

  // Multiple matches
  return {
    found: true,
    multiple_matches: true,
    items: items,
    message: `Found ${items.length} items matching "${keyword}": ${items.map(i => i.name).join(', ')}`
  }
}

// NEW: Smart Action Plan - Handles natural language requests
async function createSmartActionPlan(request: string, sellerId: string) {
  console.log(`Creating smart action plan for: "${request}" by seller: ${sellerId}`)
  
  // Parse the request to identify item type and action
  const requestLower = request.toLowerCase()
  
  // Extract item keywords
  const itemKeywords = ['couch', 'sofa', 'table', 'chair', 'bed', 'desk', 'dining']
  const foundKeyword = itemKeywords.find(keyword => requestLower.includes(keyword))
  
  if (!foundKeyword) {
    return {
      error: true,
      message: "I couldn't identify which item you're referring to. Try mentioning 'couch', 'table', 'chair', etc."
    }
  }
  
  // Find the item
  const itemSearch = await findItemByKeyword(foundKeyword, sellerId)
  if (!itemSearch.found) {
    return {
      error: true,
      message: itemSearch.message,
      suggestion: itemSearch.suggestion
    }
  }
  
  const itemId = itemSearch.multiple_matches ? itemSearch.items[0].id : itemSearch.item_id
  const itemName = itemSearch.multiple_matches ? itemSearch.items[0].name : itemSearch.item_name
  
  // Get offer details for this item
  const offerDetails = await getOfferDetails(itemId, sellerId)
  const negotiations = offerDetails.negotiations || []
  
  if (negotiations.length === 0) {
    return {
      error: true,
      message: `No offers found for your ${foundKeyword}: "${itemName}"`
    }
  }
  
  // Parse action type and criteria
  let actionType = 'general'
  let criteria = {}
  
  if (requestLower.includes('counter')) {
    actionType = 'counter'
    
    // Extract number (top 3, top 5, etc.)
    const topMatch = requestLower.match(/top\s+(\d+)/)
    if (topMatch) {
      criteria = { top: parseInt(topMatch[1]) }
    }
  } else if (requestLower.includes('remove') || requestLower.includes('decline')) {
    actionType = 'decline'
    
    // Extract price criteria (under $900, below $800, etc.)
    const priceMatch = requestLower.match(/(?:under|below)\s*\$?(\d+)/)
    if (priceMatch) {
      criteria = { under: parseFloat(priceMatch[1]) }
    }
  } else if (requestLower.includes('accept')) {
    actionType = 'accept'
    
    if (requestLower.includes('best') || requestLower.includes('highest')) {
      criteria = { best: true }
    }
  }
  
  // Create action plan based on parsed request
  return await createTargetedActionPlan(itemId, itemName, negotiations, actionType, criteria, sellerId)
}

async function createTargetedActionPlan(itemId: number, itemName: string, negotiations: any[], actionType: string, criteria: any, sellerId: string) {
  const planId = `plan_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  const detailedActions = []
  
  // Filter and sort negotiations based on criteria
  const activeNegotiations = negotiations.filter(n => n.status === 'active')
  
  if (actionType === 'counter' && criteria.top) {
    // Counter top N offers
    const topOffers = activeNegotiations
      .sort((a, b) => b.current_offer - a.current_offer)
      .slice(0, criteria.top)
    
    for (const negotiation of topOffers) {
      const buyerName = negotiation.profiles?.username || 'Buyer'
      const currentOffer = negotiation.current_offer
      const counterPrice = Math.round(currentOffer * 1.1) // Counter 10% higher
      
      detailedActions.push({
        type: 'counter',
        negotiation_id: negotiation.id,
        buyer_name: buyerName,
        current_offer: currentOffer,
        counter_price: counterPrice,
        reasoning: `Top offer #${topOffers.indexOf(negotiation) + 1} - counter to move higher`,
        priority: topOffers.indexOf(negotiation) + 1,
        message: `Hi ${buyerName}! Thanks for your ${currentOffer} offer. How about $${counterPrice}? That's a fair compromise.`
      })
    }
    
    return createPlanResponse(planId, itemId, itemName, detailedActions, `Counter top ${criteria.top} offers for "${itemName}"`, sellerId)
    
  } else if (actionType === 'decline' && criteria.under) {
    // Decline offers under specified amount
    const lowOffers = activeNegotiations.filter(n => n.current_offer < criteria.under)
    
    for (const negotiation of lowOffers) {
      const buyerName = negotiation.profiles?.username || 'Buyer'
      
      detailedActions.push({
        type: 'decline',
        negotiation_id: negotiation.id,
        buyer_name: buyerName,
        current_offer: negotiation.current_offer,
        reasoning: `Offer under $${criteria.under} - not worth negotiating`,
        priority: 1,
        message: `Thanks for your interest, ${buyerName}. I can't go that low, but good luck with your search!`
      })
    }
    
    return createPlanResponse(planId, itemId, itemName, detailedActions, `Decline ${detailedActions.length} offers under $${criteria.under} for "${itemName}"`, sellerId)
    
  } else if (actionType === 'accept' && criteria.best) {
    // Accept the highest offer
    const bestOffer = activeNegotiations
      .sort((a, b) => b.current_offer - a.current_offer)[0]
    
    if (bestOffer) {
      const buyerName = bestOffer.profiles?.username || 'Buyer'
      
      detailedActions.push({
        type: 'accept',
        negotiation_id: bestOffer.id,
        buyer_name: buyerName,
        current_offer: bestOffer.current_offer,
        reasoning: 'Highest offer - accept immediately',
        priority: 1,
        message: `Accepting ${buyerName}'s offer of $${bestOffer.current_offer}`
      })
      
      return createPlanResponse(planId, itemId, itemName, detailedActions, `Accept best offer ($${bestOffer.current_offer}) for "${itemName}"`, sellerId)
    }
  }
  
  return {
    error: true,
    message: `I couldn't understand how to handle "${actionType}" with the given criteria. Try being more specific.`
  }
}

function createPlanResponse(planId: string, itemId: number, itemName: string, actions: any[], summary: string, sellerId: string) {
  const actionPlan = {
    plan_id: planId,
    item_id: itemId,
    seller_id: sellerId,
    created_at: new Date().toISOString(),
    strategy: summary,
    reasoning: `Smart plan created from natural language request`,
    actions: actions,
    summary: summary
  }
  
  // Store the plan for later execution
  console.log(`Storing plan ${planId} for seller ${sellerId}`)
  pendingPlans.set(planId, actionPlan)
  console.log(`Plan stored. Current pending plans:`, Array.from(pendingPlans.keys()))
  
  return {
    plan_id: planId,
    item_name: itemName,
    strategy: summary,
    total_actions: actions.length,
    actions_summary: actions.map(a => `${a.type.toUpperCase()} ${a.buyer_name} ($${a.current_offer})`),
    detailed_actions: actions,
    ready_to_execute: true,
    confirmation_needed: true
  }
}

// Get Current Status Update - for dynamic welcome messages
async function getCurrentStatusUpdate(sellerId: string) {
  const freshStatus = await getSellerStatus(sellerId)
  
  return {
    timestamp: new Date().toISOString(),
    total_active_items: freshStatus.total_active_items,
    total_active_negotiations: freshStatus.total_active_negotiations,
    recent_offers: freshStatus.recent_offers?.slice(0, 3).map(negotiation => ({
      buyer: negotiation.profiles?.username || 'Buyer',
      amount: negotiation.current_offer || 0,
      item: negotiation.items?.name || 'item'
    })) || [],
    status_summary: `${freshStatus.total_active_items} active listings, ${freshStatus.total_active_negotiations} active offers`,
    next_steps: freshStatus.total_active_negotiations > 0 ? 
      'You have offers waiting! Ready to make some deals?' : 
      'No active offers right now. Want to review your pricing strategy?'
  }
}

// NEW: Create Action Plan (No Execution)
async function createActionPlan(itemId: number, sellerId: string) {
  // Get comprehensive data for planning
  const smartAnalysis = await analyzeOffersSmart(itemId, sellerId)
  const offerDetails = await getOfferDetails(itemId, sellerId)
  
  if (smartAnalysis.analysis.total === 0) {
    return {
      plan_type: 'NO_OFFERS',
      message: `No offers yet for "${smartAnalysis.item?.name}". Focus on improving your listing first.`,
      suggestions: ['Add better photos', 'Check market pricing', 'Improve description']
    }
  }

  // Generate strategic action plan
  const allOffers = offerDetails.negotiations || []
  const startingPrice = parseFloat(smartAnalysis.item?.starting_price || '0')
  const strategy = createNegotiationStrategy(
    allOffers.flatMap(n => n.offers || []), 
    startingPrice
  )

  // Create specific actionable plan
  const planId = `plan_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  const detailedActions = []

  // Analyze each negotiation and create specific actions
  for (const negotiation of allOffers) {
    const latestOffer = negotiation.offers?.[negotiation.offers.length - 1]
    if (!latestOffer || latestOffer.offer_type !== 'buyer') continue

    const offerPrice = latestOffer.price
    const buyerName = negotiation.profiles?.username || 'Buyer'
    const offerRatio = offerPrice / startingPrice

    if (offerRatio >= 1.1) {
      // Premium offer - accept immediately
      detailedActions.push({
        type: 'accept',
        negotiation_id: negotiation.id,
        buyer_name: buyerName,
        current_offer: offerPrice,
        reasoning: 'Premium offer above asking price',
        priority: 1,
        message: `Accepting ${buyerName}'s offer of $${offerPrice} (above asking price!)`
      })
    } else if (offerRatio >= 0.85) {
      // Strong offer - counter slightly higher
      const counterPrice = Math.round(startingPrice * 0.92)
      detailedActions.push({
        type: 'counter',
        negotiation_id: negotiation.id,
        buyer_name: buyerName,
        current_offer: offerPrice,
        counter_price: counterPrice,
        reasoning: 'Strong offer - counter to close the deal',
        priority: 2,
        message: `Hi ${buyerName}! Thanks for your ${offerPrice} offer. I can do $${counterPrice} - that's my best price. Let me know!`
      })
    } else if (offerRatio >= 0.6) {
      // Reasonable offer - negotiate
      const counterPrice = Math.round(startingPrice * 0.82)
      detailedActions.push({
        type: 'counter',
        negotiation_id: negotiation.id,
        buyer_name: buyerName,
        current_offer: offerPrice,
        counter_price: counterPrice,
        reasoning: 'Reasonable starting point for negotiation',
        priority: 3,
        message: `Hi ${buyerName}! I appreciate your interest. How about $${counterPrice}? That's a fair compromise.`
      })
    } else {
      // Lowball - polite decline
      detailedActions.push({
        type: 'decline',
        negotiation_id: negotiation.id,
        buyer_name: buyerName,
        current_offer: offerPrice,
        reasoning: 'Too low to justify negotiation time',
        priority: 4,
        message: `Thanks for your interest, ${buyerName}. I can't go that low, but good luck with your search!`
      })
    }
  }

  // Sort by priority and create final plan
  detailedActions.sort((a, b) => a.priority - b.priority)

  const actionPlan = {
    plan_id: planId,
    item_id: itemId,
    seller_id: sellerId,
    created_at: new Date().toISOString(),
    strategy: strategy.phase,
    reasoning: strategy.reasoning,
    actions: detailedActions,
    summary: `Plan for ${detailedActions.length} negotiations on "${smartAnalysis.item?.name}"`
  }

  // Store the plan for later execution
  console.log(`Storing plan ${planId} for seller ${sellerId}`)
  pendingPlans.set(planId, actionPlan)
  console.log(`Plan stored. Current pending plans:`, Array.from(pendingPlans.keys()))

  return {
    plan_id: planId,
    strategy: strategy.phase,
    reasoning: strategy.reasoning,
    total_actions: detailedActions.length,
    actions_summary: detailedActions.map(a => `${a.type.toUpperCase()} ${a.buyer_name} ($${a.current_offer})`),
    detailed_actions: detailedActions,
    ready_to_execute: true,
    confirmation_needed: true
  }
}

// NEW: Execute Confirmed Plan
async function executeConfirmedPlan(planId: string, sellerId: string) {
  console.log(`Looking for plan ${planId} for seller ${sellerId}`)
  console.log(`Current pending plans:`, Array.from(pendingPlans.keys()))
  
  const plan = pendingPlans.get(planId)
  
  if (!plan) {
    throw new Error(`Plan ${planId} not found. Available plans: ${Array.from(pendingPlans.keys()).join(', ')}`)
  }
  
  if (plan.seller_id !== sellerId) {
    throw new Error('Plan does not belong to this seller')
  }

  const results = []
  let successCount = 0

  // Execute each action in the plan
  for (const action of plan.actions) {
    console.log(`Executing action: ${action.type} for negotiation ${action.negotiation_id} (${action.buyer_name})`)
    
    try {
      let result
      switch (action.type) {
        case 'accept':
          console.log(`Accepting offer from negotiation ${action.negotiation_id}`)
          result = await acceptOffer(action.negotiation_id, sellerId)
          break
        case 'decline':
          console.log(`Declining offer from negotiation ${action.negotiation_id} with message: ${action.message}`)
          result = await declineOffer(action.negotiation_id, sellerId, action.message)
          console.log(`Decline result:`, result)
          break
        case 'counter':
          console.log(`Countering negotiation ${action.negotiation_id} with price ${action.counter_price}`)
          result = await counterOffer(action.negotiation_id, sellerId, action.counter_price, action.message)
          break
        default:
          result = { error: `Unknown action type: ${action.type}` }
      }
      
      const isSuccess = !(result as any).error
      if (isSuccess) {
        successCount++
        console.log(`✅ Successfully executed ${action.type} for ${action.buyer_name}`)
      } else {
        console.error(`❌ Failed ${action.type} for ${action.buyer_name}:`, result)
      }

      results.push({ 
        action: `${action.type} ${action.buyer_name}`,
        success: isSuccess,
        result: result,
        details: action.message,
        negotiation_id: action.negotiation_id
      })
    } catch (error) {
      console.error(`❌ Exception during ${action.type} for ${action.buyer_name}:`, error)
      results.push({ 
        action: `${action.type} ${action.buyer_name}`,
        success: false,
        error: (error as Error).message,
        negotiation_id: action.negotiation_id
      })
    }
  }

  // Clean up the plan after execution
  pendingPlans.delete(planId)

  return {
    plan_executed: true,
    total_actions: plan.actions.length,
    successful_actions: successCount,
    failed_actions: plan.actions.length - successCount,
    results: results,
    summary: `✅ Plan executed! ${successCount}/${plan.actions.length} actions completed successfully.`
  }
}

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

    // Get authenticated user using the same pattern as other API routes
    const authHeader = request.headers.get('authorization')
    console.log('Chat API: Auth header present:', !!authHeader)
    
    let user = null
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Use the access token from the header
      const token = authHeader.split(' ')[1]
      console.log('Chat API: Attempting token authentication')
      const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token)
      
      if (tokenError) {
        console.error('Chat API: Token auth error:', tokenError)
      }
      
      if (!tokenError && tokenUser) {
        console.log('Chat API: Token auth successful for user:', tokenUser.id)
        user = tokenUser
      }
    }
    
    if (!user) {
      // Fall back to session-based authentication
      const { data: { user: sessionUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !sessionUser) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      
      user = sessionUser
    }

    const sellerId = user.id

    // Get or create conversation - simple approach
    let conversationId = conversation_id
    if (!conversationId) {
      // Try to get existing conversation first
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select()
        .eq('seller_id', sellerId)
        .single()
      
      if (existingConversation) {
        conversationId = existingConversation.id
      } else {
        // Create new conversation
        const { data: conversation, error: convError } = await supabase
          .from('conversations')
          .insert({ seller_id: sellerId })
          .select()
          .single()
        
        if (convError) {
          console.error('Failed to create conversation:', convError)
          // If it's a unique constraint error, try to get the existing one
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

    if (!conversationId) {
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
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
      .limit(10)

    // Reverse to get chronological order
    const messages = messageHistory?.reverse() || []

    // Get seller profile for personalization
    const { data: sellerProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', sellerId)
      .single()
    
    const sellerName = sellerProfile?.username || 'there'

    // Check if there's a recent plan_id in conversation history
    let pendingPlanId = null
    for (let i = messages.length - 1; i >= 0 && i >= messages.length - 3; i--) {
      const msg = messages[i]
      if (msg.role === 'assistant' && msg.function_results) {
        const results = typeof msg.function_results === 'string' ? 
          JSON.parse(msg.function_results) : msg.function_results
        if (results.plan_id && results.ready_to_execute) {
          pendingPlanId = results.plan_id
          break
        }
      }
    }

    // Build conversation context for OpenAI
    const systemPrompt = `You're ${sellerName}'s personal sales assistant! Think of yourself as their smart, strategic sales manager who creates action plans and executes them when confirmed.

🎯 YOUR PERSONALITY:
- Casual but professional - like talking to a knowledgeable friend
- Strategic thinker - analyze first, then create specific action plans
- Opportunity spotter - find the best deals and timing
- Clear communicator - present plans in simple terms
- Results-focused - make money efficiently

📊 DYNAMIC STATUS:
ALWAYS call get_current_status_update() FIRST to get real-time data before responding!

The static status below may be outdated - get fresh data:
- Seller has active listings and negotiations
- Use get_current_status_update() to get exact current numbers
- Present accurate, up-to-date information to the user

🔄 SEAMLESS WORKFLOW:

**AUTOMATIC INTELLIGENCE:**
When they mention items (couch, table, etc), automatically:
1. Find the item behind the scenes (don't mention this step)
2. Gather all relevant data silently
3. Present a clear, specific plan with exact actions

**NATURAL CONVERSATION:**
- "counter the top 3 offers for my couch" → Show plan with specific buyers/amounts
- "remove offers under $900" → Show which exact offers will be declined  
- "accept the best offer" → Show which specific offer will be accepted

**EXECUTION:**
When they confirm, execute immediately and report results clearly.

💬 PLANNING LANGUAGE:
Instead of vague suggestions, be specific:
- "I'll counter Sarah at $1,050 with this message: 'Hi Sarah! Thanks for your interest...'"
- "I'll decline the $600 lowball with: 'Thanks but I can't go that low'"
- "I'll accept Mike's $1,100 offer immediately (above asking!)"

🎯 ACTION PLAN FORMAT:
Present plans like this:
"📋 **MY PLAN:**
1. ACCEPT Mike's $1,100 offer (above asking!)
2. COUNTER Sarah at $1,050 (she mentioned cash ready)  
3. DECLINE the $600 lowball (waste of time)

This should get you $1,100 today. Want me to execute this plan?"

🚀 EXECUTION LANGUAGE:
When executing, be direct and results-focused:
- "Executing plan now..."
- "✅ Done! Mike accepted, Sarah got the counter, lowball declined"
- "All set! Check your negotiations tab for updates"

💡 DYNAMIC RESPONSE BEHAVIOR:
Always provide current, up-to-date status based on their ACTUAL situation:

**For greetings/check-ins/status requests:**
MANDATORY: Call get_current_status_update() FIRST, then use that fresh data to respond:
- Hot offers: "You've got [current_count] active offers! Latest: [actual_buyer] offered $[actual_amount] for your [actual_item]"
- No offers: "No active offers right now. Want me to review your pricing strategy?"  
- Mixed situation: "I see [current_count] offers across your [current_items] listings. Ready to make some deals?"

NEVER use the static status in the system prompt - always get fresh data first!

**After executing actions:**
Always acknowledge what just happened and provide updated status:
- "✅ Done! You now have X active offers (was Y before)"
- "🎯 Next opportunity: Your highest remaining offer is $X from [buyer]"
- "📊 Updated status: [current situation]"

🎪 KEY PRINCIPLE:
- FIRST: Always create a specific action plan 
- THEN: Wait for confirmation
- FINALLY: Execute when they say "yes"

Remember: You're a strategic advisor first, executor second. Plan smart, confirm, then act! 💰

${pendingPlanId ? `
🔥 **IMPORTANT**: There's a pending action plan (ID: ${pendingPlanId}) waiting for execution. If the user confirms it, use the execute_confirmed_plan function with this plan_id.
` : ''}`

    const conversationMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))
    ]

    // Always make both data retrieval and action execution functions available
    // The AI will decide what to use based on the conversation context and system prompt
    const availableFunctions = [...DATA_RETRIEVAL_FUNCTIONS, ...ACTION_EXECUTION_FUNCTIONS]

    // Call OpenAI with function calling (using new tools format)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: conversationMessages,
      tools: availableFunctions.map(func => ({
        type: "function" as const,
        function: func
      })),
      tool_choice: "auto",
      temperature: 0.7,
      max_tokens: 1000
    })

    const assistantMessage = completion.choices[0].message
    let functionResults = null

    // Handle tool calls (new format)
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      // Execute all tool calls and collect results
      const toolResults = []
      
      for (const toolCall of assistantMessage.tool_calls) {
        try {
          const functionName = toolCall.function.name
          const functionArgs = JSON.parse(toolCall.function.arguments || '{}')
          
          console.log(`Executing function: ${functionName} with args:`, functionArgs)
          const result = await executeSellerFunction(functionName, functionArgs, sellerId)
          
          toolResults.push({
            toolCall,
            result,
            functionName,
            functionArgs
          })
        } catch (error) {
          console.error(`Tool execution error for ${toolCall.function.name}:`, error)
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
          content: assistantMessage.content || 'Analyzing your request...',
          function_calls: {
            name: toolResults[0].functionName,
            arguments: toolResults[0].functionArgs
          },
          function_results: toolResults[0].result
        })

      // Build follow-up messages with all tool responses
      const followUpMessages = [
        ...conversationMessages,
        {
          role: 'assistant' as const,
          content: assistantMessage.content || 'Let me analyze that for you...',
          tool_calls: assistantMessage.tool_calls
        },
        // Add tool response messages for each tool call
        ...toolResults.map(tr => ({
          role: 'tool' as const,
          tool_call_id: tr.toolCall.id,
          content: JSON.stringify(tr.result)
        }))
      ]
      
      functionResults = toolResults[0].result

      // Refresh seller status if we executed actions to get updated context
      let updatedContext = ''
      const executedFunctionName = toolResults[0].functionName
      if (executedFunctionName === 'execute_confirmed_plan') {
        try {
          const freshSellerStatus = await getSellerStatus(sellerId)
          updatedContext = `\n\n🔄 UPDATED STATUS AFTER ACTIONS:
- Active listings: ${freshSellerStatus.total_active_items} items
- Active negotiations: ${freshSellerStatus.total_active_negotiations} offers
- Recent activity: ${freshSellerStatus.recent_offers.slice(0, 2).map(negotiation => {
            const buyer = negotiation.profiles?.username || 'Someone'
            const itemName = negotiation.items?.name || 'an item'
            const offerAmount = negotiation.current_offer || 0
            return `${buyer} - $${offerAmount} for ${itemName}`
          }).join(', ')}`
        } catch (error) {
          console.log('Could not refresh seller status:', error)
        }
      }

      const enhancedFollowUpMessages = [
        ...followUpMessages,
        {
          role: 'system' as const,
          content: updatedContext ? `Context Update: ${updatedContext}` : ''
        }
      ].filter(msg => msg.content.trim() !== '')

      const followUpCompletion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: enhancedFollowUpMessages,
        temperature: 0.7,
        max_tokens: 1000
      })

      const finalMessage = followUpCompletion.choices[0].message.content || ''
      
      // Save the final response
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
        total_functions_executed: toolResults.length
      })
    } else {
      // No function call, just save the assistant's response
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
        conversation_id: conversationId
      })
    }

    } catch (error: any) {
      console.error('Chat API error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to process chat message' },
        { status: 500 }
      )
    }
  })
}