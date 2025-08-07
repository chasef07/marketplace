import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const supabase = createSupabaseServerClient()

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
  // Verify item belongs to seller
  const { data: item, error: itemError } = await supabase
    .from('items')
    .select('*')
    .eq('id', itemId)
    .eq('seller_id', sellerId)
    .single()

  if (itemError || !item) throw new Error('Item not found or not owned by seller')

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

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 })
    }

    const { message, conversation_id } = await request.json()
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Get authenticated user from request headers
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Set auth header for supabase client
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get or create conversation
    let conversationId = conversation_id
    if (!conversationId) {
      // Delete any existing conversation for this seller to start fresh
      await supabase
        .from('conversations')
        .delete()
        .eq('seller_id', user.id)
      
      // Create new fresh conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({ seller_id: user.id })
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

    // Get current seller context
    const sellerStatus = await getSellerStatus(user.id)

    // Build conversation context for OpenAI
    const systemPrompt = `You are an AI assistant helping a furniture seller manage their marketplace listings and negotiations. Be proactive, conversational, and helpful.

Current seller status:
- Active items: ${sellerStatus.total_active_items}
- Active negotiations: ${sellerStatus.total_active_negotiations}
- Recent offers: ${sellerStatus.recent_offers.length}

When greeting the seller or providing status updates, be specific and actionable. For example:
"Good morning! 2 updates on your sectional:
✅ Mike offered $375 - has truck, 5-star rating  
❌ Filtered out lowball at $250
Should I accept Mike's offer?"

You can help the seller:
1. Check status of items and offers
2. Accept or decline offers  
3. Make counter offers
4. Adjust item prices
5. Get detailed offer analysis

Always provide specific details about offers including buyer info, offer amounts, and your recommendations. Confirm actions before executing them.

Recent seller activity summary:
${sellerStatus.items.map(item => 
  `- ${item.name}: $${item.starting_price} (${item.negotiations.length} active offers)`
).join('\n')}

Recent offers:
${sellerStatus.recent_offers.slice(0, 3).map(offer => {
  const item = offer.negotiations?.items
  const buyer = offer.negotiations?.profiles?.username
  return `- ${buyer || 'Anonymous'} offered $${offer.price} for ${item?.name || 'item'}`
}).join('\n')}
`

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
      const toolCall = assistantMessage.tool_calls[0]
      const functionName = toolCall.function.name
      const functionArgs = JSON.parse(toolCall.function.arguments || '{}')
      
      functionResults = await executeSellerFunction(functionName, functionArgs, user.id)
      
      // Save assistant message with function call
      await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: assistantMessage.content || '',
          function_calls: {
            name: functionName,
            arguments: functionArgs
          },
          function_results: functionResults
        })

      // Make another call to get the response based on function results
      const followUpMessages = [
        ...conversationMessages,
        {
          role: 'assistant' as const,
          content: assistantMessage.content,
          tool_calls: assistantMessage.tool_calls
        },
        {
          role: 'tool' as const,
          tool_call_id: toolCall.id,
          content: JSON.stringify(functionResults)
        }
      ]

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
        function_executed: functionName,
        function_results: functionResults
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
}