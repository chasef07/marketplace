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
  const analysis = {
    total: offers.length,
    priceRanges: {
      lowball: offers.filter(o => o.price < itemStartingPrice * 0.6).length,
      reasonable: offers.filter(o => o.price >= itemStartingPrice * 0.6 && o.price < itemStartingPrice * 0.9).length,
      strong: offers.filter(o => o.price >= itemStartingPrice * 0.9 && o.price < itemStartingPrice * 1.1).length,
      premium: offers.filter(o => o.price >= itemStartingPrice * 1.1).length
    },
    priceStats: {
      min: Math.min(...offers.map(o => o.price)),
      max: Math.max(...offers.map(o => o.price)),
      avg: offers.reduce((sum, o) => sum + o.price, 0) / offers.length,
      median: offers.sort((a, b) => a.price - b.price)[Math.floor(offers.length / 2)]?.price || 0
    },
    urgencySignals: offers.filter(o => 
      o.message?.toLowerCase().includes('asap') ||
      o.message?.toLowerCase().includes('immediately') ||
      o.message?.toLowerCase().includes('today') ||
      o.message?.toLowerCase().includes('cash')
    ),
    qualityIndicators: offers.filter(o =>
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

// Define the function schemas for OpenAI function calling
const SELLER_FUNCTIONS = [
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
    name: "accept_offer",
    description: "Accept a specific offer from a buyer",
    parameters: {
      type: "object",
      properties: {
        negotiation_id: {
          type: "number",
          description: "The ID of the negotiation to accept"
        }
      },
      required: ["negotiation_id"]
    }
  },
  {
    name: "decline_offer",
    description: "Decline a specific offer with optional reason",
    parameters: {
      type: "object",
      properties: {
        negotiation_id: {
          type: "number",
          description: "The ID of the negotiation to decline"
        },
        reason: {
          type: "string",
          description: "Optional reason for declining"
        }
      },
      required: ["negotiation_id"]
    }
  },
  {
    name: "counter_offer",
    description: "Make a counter offer with new price and message",
    parameters: {
      type: "object",
      properties: {
        negotiation_id: {
          type: "number",
          description: "The ID of the negotiation to counter"
        },
        price: {
          type: "number",
          description: "New counter offer price"
        },
        message: {
          type: "string",
          description: "Message to accompany the counter offer"
        }
      },
      required: ["negotiation_id", "price"]
    }
  },
  {
    name: "adjust_item_price",
    description: "Change the listing price of an item",
    parameters: {
      type: "object",
      properties: {
        item_id: {
          type: "number",
          description: "The ID of the item to adjust price for"
        },
        new_price: {
          type: "number",
          description: "New listing price"
        }
      },
      required: ["item_id", "new_price"]
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
    name: "create_negotiation_strategy", 
    description: "Generate a multi-step strategic plan for handling negotiations",
    parameters: {
      type: "object",
      properties: {
        item_id: {
          type: "number", 
          description: "The ID of the item to create strategy for"
        }
      },
      required: ["item_id"]
    }
  },
  {
    name: "execute_batch_actions",
    description: "Execute multiple actions in sequence (counter offers, declines, etc)",
    parameters: {
      type: "object",
      properties: {
        actions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["counter", "accept", "decline"]
              },
              negotiation_id: {
                type: "number"
              },
              price: {
                type: "number"
              },
              message: {
                type: "string"
              }
            },
            required: ["type", "negotiation_id"]
          }
        }
      },
      required: ["actions"]
    }
  }
]

// Helper function to execute seller functions
async function executeSellerFunction(functionName: string, args: any, sellerId: string) {
  try {
    switch (functionName) {
      case 'get_seller_status':
        return await getSellerStatus(sellerId)
      
      case 'get_offer_details':
        return await getOfferDetails(args.item_id, sellerId)
      
      case 'accept_offer':
        return await acceptOffer(args.negotiation_id, sellerId)
      
      case 'decline_offer':
        return await declineOffer(args.negotiation_id, sellerId, args.reason)
      
      case 'counter_offer':
        return await counterOffer(args.negotiation_id, sellerId, args.price, args.message)
      
      case 'adjust_item_price':
        return await adjustItemPrice(args.item_id, sellerId, args.new_price)
      
      case 'analyze_offers_smart':
        return await analyzeOffersSmart(args.item_id, sellerId)
      
      case 'create_negotiation_strategy':
        return await createNegotiationStrategyAPI(args.item_id, sellerId)
      
      case 'execute_batch_actions':
        return await executeBatchActions(args.actions, sellerId)
      
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
  // Update negotiation status to cancelled
  const { error } = await supabase
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

  return { message: 'Offer declined successfully', reason }
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

async function createNegotiationStrategyAPI(itemId: number, sellerId: string) {
  // Get item and offers data
  const smartAnalysis = await analyzeOffersSmart(itemId, sellerId)
  
  if (smartAnalysis.analysis.total === 0) {
    return {
      strategy: {
        phase: 'NO_OFFERS',
        actions: ['Improve listing visibility', 'Consider price adjustment', 'Add better photos'],
        reasoning: 'No offers received yet - focus on improving listing appeal'
      }
    }
  }

  const allOffers = await getOffersForStrategy(itemId, sellerId)
  const strategy = createNegotiationStrategy(allOffers, parseFloat(smartAnalysis.item?.starting_price || '0'))

  return {
    item: smartAnalysis.item,
    analysis: smartAnalysis.analysis,
    strategy,
    actionPlan: `🎯 Strategy: ${strategy.phase} - ${strategy.reasoning}`,
    nextSteps: strategy.actions
  }
}

async function getOffersForStrategy(itemId: number, sellerId: string) {
  const { data: negotiations, error } = await supabase
    .from('negotiations')
    .select(`
      offers (price, message, created_at)
    `)
    .eq('item_id', itemId)
    .eq('seller_id', sellerId)

  if (error) return []
  return negotiations?.flatMap(n => n.offers || []) || []
}

async function executeBatchActions(actions: any[], sellerId: string) {
  const results = []
  
  for (const action of actions) {
    try {
      let result
      switch (action.type) {
        case 'accept':
          result = await acceptOffer(action.negotiation_id, sellerId)
          break
        case 'decline':
          result = await declineOffer(action.negotiation_id, sellerId, action.message || 'Not suitable')
          break
        case 'counter':
          result = await counterOffer(action.negotiation_id, sellerId, action.price, action.message || 'Counter offer')
          break
        default:
          result = { error: `Unknown action type: ${action.type}` }
      }
      results.push({ action, result, success: !(result as any).error })
    } catch (error) {
      results.push({ action, error: (error as Error).message, success: false })
    }
  }

  const successful = results.filter(r => r.success).length
  const total = results.length

  return {
    results,
    summary: `✅ Executed ${successful}/${total} batch actions successfully`,
    details: results
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

    // Get or create conversation
    let conversationId = conversation_id
    if (!conversationId) {
      // Delete any existing conversation for this seller to start fresh
      await supabase
        .from('conversations')
        .delete()
        .eq('seller_id', sellerId)
      
      // Create new fresh conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({ seller_id: sellerId })
        .select()
        .single()
      
      if (convError) {
        console.error('Failed to create conversation:', convError)
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
      }
      
      conversationId = conversation.id
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

    // Get current seller context and profile
    const sellerStatus = await getSellerStatus(sellerId)
    
    // Get seller profile for personalization
    const { data: sellerProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', sellerId)
      .single()
    
    const sellerName = sellerProfile?.username || 'there'

    // Build conversation context for OpenAI
    const systemPrompt = `You're ${sellerName}'s personal sales assistant! Think of yourself as their smart, proactive sales manager who knows their business inside out and can take immediate action.

🎯 YOUR PERSONALITY:
- Casual but professional - like talking to a knowledgeable friend
- Cut through the noise - no long explanations unless asked
- Action-oriented - suggest what to DO, not just what's happening
- Opportunistic - spot money-making opportunities instantly
- Confident - you know this business

📊 CURRENT SITUATION:
This seller has ${sellerStatus.total_active_items} active listings with ${sellerStatus.total_active_negotiations} ongoing negotiations.

${sellerStatus.items.length > 0 ? `
LISTINGS:
${sellerStatus.items.map(item => 
  `• ${item.name} ($${item.starting_price}) - ${item.negotiations.length} offers`
).join('\n')}
` : ''}

${sellerStatus.recent_offers.length > 0 ? `
LATEST ACTIVITY:
${sellerStatus.recent_offers.slice(0, 3).map(offer => {
  const buyer = offer.profiles?.username || 'Someone'
  const itemName = offer.items?.name || 'an item'
  return `• ${buyer} offered $${offer.current_offer} for ${itemName}`
}).join('\n')}
` : ''}

💬 HOW TO TALK:
Instead of: "Analysis indicates 3 offers with price variance of..."
Say: "You've got 3 offers! Two are solid, one's a lowball."

Instead of: "Strategic recommendation suggests counter-offering..."  
Say: "I'd counter Sarah at $900 - she seems eager. Want me to do it?"

Instead of: "Executing batch counter-offer operations..."
Say: "Sending counters now... Done! All 3 buyers countered."

🚀 WHAT YOU CAN DO:
When they say "do it" or "yes" or "go ahead" - you actually execute the action!
- Accept offers
- Send counter offers  
- Decline lowballs
- Analyze market patterns
- Handle multiple offers at once
- Adjust listing prices

🎪 BE PROACTIVE:
- Spot urgent opportunities ("Sarah has cash and needs it TODAY!")
- Notice patterns ("This is your 3rd $800+ offer this week")
- Suggest smart moves ("Counter the top 3 at $450, ignore the lowball")
- Celebrate wins ("Nice! That's $200 above your usual acceptance rate")

💡 GREETING BEHAVIOR:
If this seems like their first message or they're just saying "hi", give them a smart contextual greeting:
- If they have urgent offers: "Hey ${sellerName}! You've got [X] buyers who need your stuff ASAP!"
- If they have premium offers: "Great news! Someone offered ABOVE asking price!"
- If no offers yet: "Hey ${sellerName}! Your listings are live but no offers yet. Want me to check your pricing?"
- If no listings: "Ready to list some furniture? I'll help you price it right!"

Remember: You're their personal assistant, not a formal AI system. Keep it conversational, actionable, and focused on making money! 💰`

    const conversationMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))
    ]

    // Call OpenAI with function calling (using new tools format)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: conversationMessages,
      tools: SELLER_FUNCTIONS.map(func => ({
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

      const followUpCompletion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: followUpMessages,
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