import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { ratelimit, withRateLimit } from '@/lib/rate-limit'
import { getAuthenticatedUser } from '@/src/lib/auth-helpers'

const supabase = createSupabaseServerClient()

// Conversation state management
enum ConversationState {
  VIEWING_OFFERS = 'viewing_offers',
  COUNTERING = 'countering', 
  ACCEPTING = 'accepting',
  DEAL_COMPLETED = 'deal_completed',
  ARRANGING_MEETUP = 'arranging_meetup',
  ERROR_STATE = 'error_state'
}

interface ConversationContext {
  state: ConversationState
  userId: string
  activeNegotiations: any[]
  selectedNegotiation?: number
  selectedItem?: number
  lastAction?: string
  errorMessage?: string
}

// State-driven conversation manager
class ConversationManager {
  private context: ConversationContext
  private authToken: string | null

  constructor(userId: string, authToken: string | null = null) {
    this.context = {
      state: ConversationState.VIEWING_OFFERS,
      userId,
      activeNegotiations: [],
      authToken
    }
    this.authToken = authToken
  }

  async processMessage(message: string): Promise<{ message: string; buttons: any[] }> {
    // Load fresh negotiations data
    await this.loadNegotiations()
    
    // Determine new state based on message and current context
    const newState = this.determineNewState(message)
    this.context.state = newState
    
    // Generate response based on current state
    return await this.generateStateResponse(message)
  }

  private async loadNegotiations(): Promise<void> {
    try {
      console.log('Loading negotiations for user:', this.context.userId)
      
      const { data: directNegotiations, error } = await supabase
        .from('negotiations')
        .select(`
          id,
          status,
          created_at,
          item_id,
          buyer_id,
          items!inner(name, starting_price, is_available)
        `)
        .eq('seller_id', this.context.userId)
        .eq('status', 'active')
        .eq('items.is_available', true)
        
      if (error) {
        console.error('Database error:', error)
        this.context.state = ConversationState.ERROR_STATE
        this.context.errorMessage = 'Failed to load your offers'
        return
      }

      // Enrich with current offer data
      const enrichedNegotiations = await Promise.all(
        (directNegotiations || []).map(async (neg) => {
          const { data: latestOffer } = await supabase
            .from('offers')
            .select('price, offer_type, created_at, message')
            .eq('negotiation_id', neg.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          return {
            ...neg,
            current_offer: latestOffer?.price || 0,
            latest_offer_type: latestOffer?.offer_type,
            latest_message: latestOffer?.message,
            offer_time: latestOffer?.created_at
          }
        })
      )

      this.context.activeNegotiations = enrichedNegotiations
      console.log(`Loaded ${enrichedNegotiations.length} active negotiations`)
      
    } catch (error) {
      console.error('Error loading negotiations:', error)
      this.context.state = ConversationState.ERROR_STATE
      this.context.errorMessage = 'System error loading data'
    }
  }

  private determineNewState(message: string): ConversationState {
    const msg = message.toLowerCase().trim()
    
    // State transitions based on message
    if (msg === 'hello' || msg === 'hi' || msg === 'hey' || msg.startsWith('hello')) {
      return ConversationState.VIEWING_OFFERS
    }
    
    if (msg === 'show_offers' || msg.includes('show') && msg.includes('offer')) {
      return ConversationState.VIEWING_OFFERS
    }
    
    if (msg === 'counter_all_offers' || msg.startsWith('counter_price_')) {
      return ConversationState.COUNTERING
    }
    
    if (msg === 'accept_best_offers' || msg.startsWith('accept_')) {
      return ConversationState.ACCEPTING
    }
    
    if (msg.includes('deal_completed') || msg.includes('arrange')) {
      return ConversationState.ARRANGING_MEETUP
    }
    
    // Stay in current state for unrecognized messages
    return this.context.state
  }

  private async generateStateResponse(message: string): Promise<{ message: string; buttons: any[] }> {
    switch (this.context.state) {
      case ConversationState.ERROR_STATE:
        return this.handleErrorState()
        
      case ConversationState.VIEWING_OFFERS:
        return this.handleViewingOffers(message)
        
      case ConversationState.COUNTERING:
        return await this.handleCountering(message)
        
      case ConversationState.ACCEPTING:
        return await this.handleAccepting(message)
        
      case ConversationState.ARRANGING_MEETUP:
        return this.handleArrangingMeetup(message)
        
      default:
        return this.handleViewingOffers(message)
    }
  }

  private handleErrorState(): { message: string; buttons: any[] } {
    return {
      message: `⚠️ ${this.context.errorMessage || 'Something went wrong'}. Let me try to reload your data.`,
      buttons: [
        { text: "🔄 Reload", action: "show_offers" },
        { text: "📞 Get Help", action: "get_help" }
      ]
    }
  }

  private handleViewingOffers(message: string): { message: string; buttons: any[] } {
    if (this.context.activeNegotiations.length === 0) {
      return {
        message: "🏠 No active offers at the moment! Your items are live on the marketplace. I'll notify you as soon as buyers start making offers.",
        buttons: [
          { text: "📦 View My Items", action: "view_items" },
          { text: "➕ Create Listing", action: "create_listing" },
          { text: "📊 Sales Tips", action: "sales_tips" }
        ]
      }
    }

    // Create clear offer summary
    const totalOffers = this.context.activeNegotiations.length
    const totalValue = this.context.activeNegotiations.reduce((sum, neg) => sum + parseFloat(neg.current_offer), 0)
    const highestOffer = Math.max(...this.context.activeNegotiations.map(neg => parseFloat(neg.current_offer)))
    
    let offerText = `💰 **${totalOffers} Active Offer${totalOffers > 1 ? 's' : ''}** (Total: $${totalValue.toFixed(0)})\n\n`
    
    // Group by item for clarity
    const offersByItem = this.groupOffersByItem()
    Object.values(offersByItem).forEach((item: any) => {
      offerText += `📦 **${item.itemName}**\n`
      offerText += `   💵 ${item.offerCount} offer${item.offerCount > 1 ? 's' : ''} • High: $${item.highestOffer}\n`
      if (item.hasRecentActivity) {
        offerText += `   🔥 Recent activity!\n`
      }
      offerText += `\n`
    })

    return {
      message: offerText + "What would you like to do?",
      buttons: [
        { text: "💰 Counter All Offers", action: "counter_all_offers" },
        { text: "✅ Accept Best Offers", action: "accept_best_offers" },
        { text: "👀 View Details", action: "view_details" },
        { text: "🔄 Refresh", action: "show_offers" }
      ]
    }
  }

  private groupOffersByItem(): any {
    return this.context.activeNegotiations.reduce((acc: any, neg: any) => {
      const itemId = neg.item_id
      const itemName = neg.items?.name || 'Unknown Item'
      
      if (!acc[itemId]) {
        acc[itemId] = {
          itemId,
          itemName,
          negotiations: [],
          offerCount: 0,
          highestOffer: 0,
          hasRecentActivity: false
        }
      }
      
      acc[itemId].negotiations.push(neg)
      acc[itemId].offerCount++
      
      const offerPrice = parseFloat(neg.current_offer)
      if (offerPrice > acc[itemId].highestOffer) {
        acc[itemId].highestOffer = offerPrice
      }
      
      return acc
    }, {})
  }

  private async handleCountering(message: string): Promise<{ message: string; buttons: any[] }> {
    if (message === 'counter_all_offers') {
      const avgOffer = this.context.activeNegotiations.reduce((sum, neg) => sum + parseFloat(neg.current_offer), 0) / this.context.activeNegotiations.length
      
      const conservative = Math.round(avgOffer * 1.05)
      const moderate = Math.round(avgOffer * 1.15) 
      const aggressive = Math.round(avgOffer * 1.25)
      
      return {
        message: `💰 **Counter Offer Strategy**\n\nCurrent average offer: $${Math.round(avgOffer)}\n\nChoose your counter price or enter a custom amount:`,
        buttons: [
          { text: `🤝 $${conservative} (Conservative)`, action: `counter_price_${conservative}` },
          { text: `📈 $${moderate} (Recommended)`, action: `counter_price_${moderate}` },
          { text: `🚀 $${aggressive} (Aggressive)`, action: `counter_price_${aggressive}` },
          { text: "✏️ Enter Custom Price", action: "custom_counter_input" },
          { text: "⬅️ Back", action: "show_offers" }
        ]
      }
    }
    
    if (message === 'custom_counter_input') {
      const avgOffer = this.context.activeNegotiations.reduce((sum, neg) => sum + parseFloat(neg.current_offer), 0) / this.context.activeNegotiations.length
      const minSuggested = Math.round(avgOffer * 1.05)
      const maxSuggested = Math.round(avgOffer * 1.25)
      
      return {
        message: `✏️ **Enter Custom Counter Price**\n\nCurrent average offer: $${Math.round(avgOffer)}\nSuggested range: $${minSuggested} - $${maxSuggested}\n\nType your desired price amount (numbers only):`,
        buttons: [
          { text: `$${minSuggested}`, action: `counter_price_${minSuggested}` },
          { text: `$${Math.round((minSuggested + maxSuggested) / 2)}`, action: `counter_price_${Math.round((minSuggested + maxSuggested) / 2)}` },
          { text: `$${maxSuggested}`, action: `counter_price_${maxSuggested}` },
          { text: "⬅️ Back to Options", action: "counter_all_offers" }
        ]
      }
    }
    
    if (message.startsWith('counter_price_')) {
      const price = parseInt(message.split('_')[2])
      return await this.executeCounterOffers(price)
    }
    
    // Handle direct numeric input for custom prices
    if (/^\d+$/.test(message.trim())) {
      const price = parseInt(message.trim())
      const avgOffer = this.context.activeNegotiations.reduce((sum, neg) => sum + parseFloat(neg.current_offer), 0) / this.context.activeNegotiations.length
      
      if (price < avgOffer) {
        return {
          message: `⚠️ **Price too low!**\n\nYour price ($${price}) is below the current average offer ($${Math.round(avgOffer)}). Counter offers should be higher than current offers.\n\nPlease enter a higher amount:`,
          buttons: [
            { text: `$${Math.round(avgOffer * 1.05)}`, action: `counter_price_${Math.round(avgOffer * 1.05)}` },
            { text: `$${Math.round(avgOffer * 1.15)}`, action: `counter_price_${Math.round(avgOffer * 1.15)}` },
            { text: "⬅️ Back", action: "counter_all_offers" }
          ]
        }
      }
      
      if (price > avgOffer * 3) {
        return {
          message: `🤔 **Very high price!**\n\nYour price ($${price}) is much higher than current offers ($${Math.round(avgOffer)}). This might discourage buyers.\n\nProceed anyway?`,
          buttons: [
            { text: `✅ Yes, counter $${price}`, action: `counter_price_${price}` },
            { text: "📉 Lower amount", action: "custom_counter_input" },
            { text: "⬅️ Back", action: "counter_all_offers" }
          ]
        }
      }
      
      return await this.executeCounterOffers(price)
    }
    
    return this.handleViewingOffers(message)
  }

  private async executeCounterOffers(price: number): Promise<{ message: string; buttons: any[] }> {
    try {
      if (!this.authToken) {
        return {
          message: "⚠️ Authentication error. Please refresh and try again.",
          buttons: [{ text: "🔄 Refresh", action: "show_offers" }]
        }
      }

      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      let successCount = 0

      console.log(`Attempting to counter ${this.context.activeNegotiations.length} negotiations with price $${price}`)
      
      for (const neg of this.context.activeNegotiations) {
        try {
          console.log(`Countering negotiation ${neg.id} at ${baseUrl}/api/negotiations/${neg.id}/counter`)
          
          const response = await fetch(`${baseUrl}/api/negotiations/${neg.id}/counter`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.authToken}`
            },
            body: JSON.stringify({
              price: price,
              message: `Counter offer: $${price}`
            })
          })

          if (response.ok) {
            console.log(`✅ Counter offer successful for negotiation ${neg.id}`)
            successCount++
          } else {
            const errorText = await response.text()
            console.error(`❌ Counter offer failed for negotiation ${neg.id}: ${response.status} - ${errorText}`)
          }
        } catch (error) {
          console.error(`Counter error for negotiation ${neg.id}:`, error)
        }
      }

      if (successCount > 0) {
        return {
          message: `✅ **Counter offers sent!**\n\nOffered $${price} to ${successCount} buyer${successCount > 1 ? 's' : ''}. They'll be notified and can respond.`,
          buttons: [
            { text: "💰 View My Offers", action: "show_offers" },
            { text: "📱 Check Status", action: "show_offers" }
          ]
        }
      } else {
        return {
          message: "❌ **Counter offers failed**\n\nTechnical error occurred. Please try again.",
          buttons: [
            { text: "🔄 Try Again", action: "counter_all_offers" },
            { text: "💰 View Offers", action: "show_offers" }
          ]
        }
      }
    } catch (error) {
      console.error('Counter offer execution error:', error)
      return {
        message: "❌ Counter offers failed due to technical error.",
        buttons: [
          { text: "🔄 Try Again", action: "counter_all_offers" },
          { text: "💰 View Offers", action: "show_offers" }
        ]
      }
    }
  }

  private async handleAccepting(message: string): Promise<{ message: string; buttons: any[] }> {
    if (message === 'accept_best_offers') {
      try {
        let successCount = 0
        let totalValue = 0

        for (const neg of this.context.activeNegotiations) {
          try {
            const { error: updateError } = await supabase
              .from('negotiations')
              .update({
                status: 'completed',
                final_price: neg.current_offer,
                completed_at: new Date().toISOString()
              })
              .eq('id', neg.id)
              .eq('seller_id', this.context.userId)

            if (!updateError) {
              successCount++
              totalValue += parseFloat(neg.current_offer)
            }
          } catch (error) {
            console.error('Accept error for negotiation:', neg.id, error)
          }
        }

        if (successCount > 0) {
          this.context.state = ConversationState.DEAL_COMPLETED
          
          return {
            message: `🎉 **Deals accepted!**\n\nAccepted ${successCount} offer${successCount > 1 ? 's' : ''} worth $${totalValue.toFixed(0)} total.\n\n📱 Buyers have been notified!`,
            buttons: [
              { text: "💬 Chat with Buyers", action: "start_buyer_chat" },
              { text: "📅 Arrange Pickup", action: "arrange_pickup" },
              { text: "📊 View All Deals", action: "view_deals" }
            ]
          }
        } else {
          return {
            message: "❌ **Accept failed** - Unable to accept offers. Please try again.",
            buttons: [
              { text: "🔄 Try Again", action: "accept_best_offers" },
              { text: "💰 View Offers", action: "show_offers" }
            ]
          }
        }
      } catch (error) {
        console.error('Accept error:', error)
        return {
          message: "❌ Technical error while accepting offers.",
          buttons: [
            { text: "🔄 Try Again", action: "accept_best_offers" },
            { text: "💰 View Offers", action: "show_offers" }
          ]
        }
      }
    }
    
    return this.handleViewingOffers(message)
  }

  private handleArrangingMeetup(message: string): { message: string; buttons: any[] } {
    if (message === 'start_buyer_chat' || message === 'message_buyers') {
      return {
        message: "💬 **Buyer Communication**\n\nChoose how you'd like to connect with your buyers:",
        buttons: [
          { text: "📱 View All Conversations", action: "view_conversations" },
          { text: "📋 Send Meeting Templates", action: "send_templates" },
          { text: "📍 Share Pickup Location", action: "share_location" },
          { text: "⬅️ Back to Deals", action: "view_deals" }
        ]
      }
    }

    if (message === 'schedule_pickup' || message === 'arrange_pickup') {
      return {
        message: "📅 **Schedule Pickup**\n\nLet's help you coordinate with buyers:",
        buttons: [
          { text: "📅 This Weekend", action: "suggest_weekend" },
          { text: "🕐 Weekday Evening", action: "suggest_evening" },
          { text: "🏠 My Location", action: "share_my_location" },
          { text: "🤝 Buyer's Choice", action: "ask_buyer_preference" },
          { text: "⬅️ Back", action: "view_deals" }
        ]
      }
    }

    if (message === 'view_completed_deals' || message === 'view_deals') {
      return this.getCompletedDealsView()
    }

    return {
      message: "🤝 **Deal Management**\n\nYour deals are accepted! Next steps:\n\n1. Communicate with buyers\n2. Arrange pickup time/location\n3. Complete the exchange\n\nWhat would you like to do?",
      buttons: [
        { text: "💬 Message Buyers", action: "start_buyer_chat" },
        { text: "📅 Schedule Pickup", action: "schedule_pickup" },
        { text: "📊 View Deal Details", action: "view_completed_deals" },
        { text: "💰 View All Offers", action: "show_offers" }
      ]
    }
  }

  private getCompletedDealsView(): { message: string; buttons: any[] } {
    // This would typically load actual completed deals from the database
    return {
      message: "📊 **Your Completed Deals**\n\nHere are your recently accepted deals. Click on any deal to start messaging the buyer or update the status.\n\n*Note: Deal details will be loaded from your actual negotiations.*",
      buttons: [
        { text: "🔄 Refresh Deals", action: "view_deals" },
        { text: "💬 Open Chat", action: "start_buyer_chat" },
        { text: "📅 Schedule Meetings", action: "schedule_pickup" },
        { text: "✅ Mark as Completed", action: "mark_completed" },
        { text: "💰 Back to Offers", action: "show_offers" }
      ]
    }
  }
}

// New clean function to replace the old massive one
async function generateConversationalResponse(message: string, userId: string, authToken: string | null = null) {
  const manager = new ConversationManager(userId, authToken)
  return await manager.processMessage(message)
}

// Main API route handler
export async function POST(request: NextRequest) {
  return withRateLimit(request, ratelimit.chat, async () => {
    try {
      const { message, conversation_id } = await request.json()

      if (!message || typeof message !== 'string') {
        return NextResponse.json({ error: 'Message is required' }, { status: 400 })
      }

      // Get authenticated user
      const authResult = await getAuthenticatedUser(request)
      console.log('Auth result:', { user: !!authResult.user, userId: authResult.user?.id, error: authResult.error })
      
      if (!authResult.user) {
        return NextResponse.json({ error: authResult.error || 'Authentication required' }, { status: 401 })
      }

      // Generate response using new conversation manager
      const response = await generateConversationalResponse(message, authResult.user.id, authResult.token)

      return NextResponse.json({
        message: response.message,
        buttons: response.buttons,
        action: null,
        conversation_id: conversation_id || 1
      })

    } catch (error: any) {
      console.error('Chat error:', error)
      return NextResponse.json(
        { 
          error: 'Chat service temporarily unavailable',
          message: "Sorry, I'm having trouble right now. Please try again in a moment.",
          buttons: [{ text: "🔄 Try Again", action: "show_offers" }]
        }, 
        { status: 500 }
      )
    }
  })
}
