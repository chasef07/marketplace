import { createSupabaseServerClient } from "@/lib/supabase-server"

type OfferType = 'buyer' | 'seller'

interface CreateOfferParams {
  negotiationId: number
  offerType: OfferType
  price?: number
  message?: string
  isCounterOffer: boolean
  isMessageOnly?: boolean
  agentGenerated?: boolean
  agentDecisionId?: number
  userId: string
}

interface ValidationResult {
  isValid: boolean
  error?: string
}

interface OfferValidationContext {
  negotiation: {
    status: string
    expires_at?: string
    seller_id: string
    buyer_id: string
  }
  item: {
    starting_price: number
    item_status: string
  }
  latestOffer?: {
    offer_type: string
    price: number
    round_number: number
  }
  userRole: 'seller' | 'buyer'
}

export class OfferService {
  private supabase: ReturnType<typeof createSupabaseServerClient>

  constructor() {
    this.supabase = createSupabaseServerClient()
  }

  /**
   * Unified offer creation with transaction safety and comprehensive validation
   */
  async createOffer(params: CreateOfferParams) {
    const {
      negotiationId,
      offerType,
      price,
      message = '',
      isCounterOffer,
      isMessageOnly = false,
      agentGenerated = false,
      agentDecisionId,
      userId
    } = params

    console.log('🔄 OfferService.createOffer - Starting with params:', {
      negotiationId,
      offerType,
      price,
      isCounterOffer,
      isMessageOnly,
      agentGenerated,
      userId
    })

    try {
      // Start transaction for race condition safety
      const result = await this.supabase.rpc('create_offer_transaction', {
        p_negotiation_id: negotiationId,
        p_offer_type: offerType,
        p_user_id: userId,
        p_price: price || null,
        p_message: message,
        p_is_counter_offer: isCounterOffer,
        p_is_message_only: isMessageOnly,
        p_agent_generated: agentGenerated,
        p_agent_decision_id: agentDecisionId || null
      })

      if (result.error) {
        console.error('🔄 OfferService.createOffer - Transaction error:', result.error)
        throw new Error(result.error.message)
      }

      const createdOffer = result.data?.[0]

      if (!createdOffer) {
        throw new Error('No offer created by transaction')
      }

      console.log('🔄 OfferService.createOffer - Success:', {
        offerId: createdOffer.id,
        negotiationId,
        price,
        offerType
      })

      return {
        success: true,
        offer: createdOffer,
        offerId: createdOffer.id
      }

    } catch (error) {
      console.error('🔄 OfferService.createOffer - Error Details:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        params: {
          negotiationId,
          offerType,
          price,
          userId,
          isCounterOffer,
          agentGenerated
        },
        timestamp: new Date().toISOString()
      })
      
      // Fallback to individual validation if transaction function doesn't exist
      console.log('🔄 Attempting fallback offer creation method...')
      return this.createOfferFallback(params)
    }
  }

  /**
   * Fallback method with individual validations (for backward compatibility)
   */
  private async createOfferFallback(params: CreateOfferParams) {
    const {
      negotiationId,
      offerType,
      price,
      message = '',
      isCounterOffer,
      isMessageOnly = false,
      agentGenerated = false,
      agentDecisionId,
      userId
    } = params

    // Get validation context
    const context = await this.getValidationContext(negotiationId, userId)
    if (!context.isValid) {
      return { success: false, error: context.error }
    }

    const validationContext = context.data!

    // Validate the offer
    const validation = await this.validateOffer(params, validationContext)
    if (!validation.isValid) {
      return { success: false, error: validation.error }
    }

    // Create the offer with optimistic locking
    const { data: offer, error: offerError } = await this.supabase
      .from('offers')
      .insert({
        negotiation_id: negotiationId,
        offer_type: offerType,
        price: price || null,
        message,
        is_counter_offer: isCounterOffer,
        is_message_only: isMessageOnly,
        agent_generated: agentGenerated,
        agent_decision_id: agentDecisionId || null,
        round_number: (validationContext.latestOffer?.round_number || 0) + 1
      })
      .select()
      .single()

    if (offerError) {
      console.error('🔄 OfferService.createOfferFallback - Database error:', offerError)
      return { success: false, error: 'Failed to create offer' }
    }

    // Update negotiation status if needed
    await this.updateNegotiationStatus(negotiationId, validationContext)

    return {
      success: true,
      offer,
      offerId: offer.id
    }
  }

  /**
   * Get all context needed for offer validation
   */
  private async getValidationContext(negotiationId: number, userId: string) {
    // Get negotiation with item details
    const { data: negotiation, error: negError } = await this.supabase
      .from('negotiations')
      .select(`
        *,
        items (
          *,
          profiles!seller_id (username)
        )
      `)
      .eq('id', negotiationId)
      .single()

    if (negError || !negotiation) {
      return { isValid: false, error: 'Negotiation not found' }
    }

    // Check user authorization
    const userRole = negotiation.seller_id === userId ? 'seller' : 
                    negotiation.buyer_id === userId ? 'buyer' : null

    if (!userRole) {
      return { isValid: false, error: 'Not authorized for this negotiation' }
    }

    // Get latest offer
    const { data: latestOffer } = await this.supabase
      .from('offers')
      .select('*')
      .eq('negotiation_id', negotiationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return {
      isValid: true,
      data: {
        negotiation,
        item: negotiation.items,
        latestOffer,
        userRole
      }
    }
  }

  /**
   * Comprehensive offer validation with consistent business rules
   */
  private async validateOffer(params: CreateOfferParams, context: OfferValidationContext): Promise<ValidationResult> {
    const { negotiation, item, latestOffer, userRole } = context
    const { offerType, price, isCounterOffer, isMessageOnly } = params

    // Check negotiation status
    if (negotiation.status !== 'active') {
      return { isValid: false, error: 'Negotiation is not active' }
    }

    // Check negotiation expiration
    if (negotiation.expires_at && new Date() > new Date(negotiation.expires_at)) {
      return { isValid: false, error: 'Negotiation has expired' }
    }

    // Validate offer type matches user role
    if ((offerType === 'seller' && userRole !== 'seller') || 
        (offerType === 'buyer' && userRole !== 'buyer')) {
      return { isValid: false, error: 'Offer type does not match user role' }
    }

    // Message-only offers don't need price validation
    if (isMessageOnly) {
      return { isValid: true }
    }

    if (!price || price <= 0) {
      return { isValid: false, error: 'Valid price required for price offers' }
    }

    // Validate turn-based system (unless agent-generated)
    // Allow buyers to update their offers, but maintain turn-based for seller responses
    if (!params.agentGenerated && latestOffer && latestOffer.offer_type === offerType) {
      // Only block if it's a seller trying to make consecutive offers
      // Buyers should be allowed to update their offers
      if (offerType === 'seller') {
        return { isValid: false, error: 'Not your turn - wait for the buyer to respond' }
      }
      // For buyers, we'll handle offer updates in the API route instead of blocking here
    }

    // Price validation based on offer type
    if (offerType === 'seller') {
      return this.validateSellerOffer(price, item, latestOffer, isCounterOffer)
    } else {
      return this.validateBuyerOffer(price, item, latestOffer)
    }
  }

  /**
   * Validate seller counter offers
   */
  private validateSellerOffer(price: number, item: { starting_price: number }, latestOffer: { price: number; offer_type: string } | null, isCounterOffer: boolean): ValidationResult {
    const startingPrice = parseFloat(item.starting_price)

    // Seller can't offer above 125% of starting price (prevents unreasonable counters)
    const maxAllowed = startingPrice * 1.25
    if (price > maxAllowed) {
      return { 
        isValid: false, 
        error: `Counter offer too high - cannot exceed 25% above starting price ($${startingPrice})` 
      }
    }

    // For counter offers, validate against buyer's last offer
    if (isCounterOffer && latestOffer && latestOffer.offer_type === 'buyer') {
      const buyerPrice = parseFloat(latestOffer.price)
      
      // Prevent dramatic price jumps that break negotiation psychology
      const maxIncrease = buyerPrice * 1.20  // Max 20% increase over buyer offer
      if (price > maxIncrease) {
        return { 
          isValid: false, 
          error: `Counter offer too aggressive - should be within 20% of buyer's offer ($${buyerPrice})` 
        }
      }

      // Counter should be higher than buyer's offer
      if (price <= buyerPrice) {
        return { 
          isValid: false, 
          error: `Counter offer must be higher than buyer's offer of $${buyerPrice}` 
        }
      }
    }

    return { isValid: true }
  }

  /**
   * Validate buyer offers
   */
  private validateBuyerOffer(price: number, item: { starting_price: number }): ValidationResult {
    const startingPrice = parseFloat(item.starting_price)

    // Buyers can't offer above starting price
    if (price > startingPrice) {
      return { 
        isValid: false, 
        error: `Offer cannot exceed the listing price of $${startingPrice}` 
      }
    }

    // Prevent extremely low offers (less than 10% of starting price)
    const minReasonable = startingPrice * 0.10
    if (price < minReasonable) {
      return { 
        isValid: false, 
        error: `Offer too low - must be at least $${minReasonable.toFixed(2)}` 
      }
    }

    return { isValid: true }
  }

  /**
   * Update negotiation status based on offer activity
   */
  private async updateNegotiationStatus(negotiationId: number, context: OfferValidationContext) {
    // Keep items as 'active' during negotiations for better UX
    // Only change status when deal is actually pending or sold
    
    // Update negotiation expiration (72 hours from now)
    const expirationTime = new Date()
    expirationTime.setHours(expirationTime.getHours() + 72)

    await this.supabase
      .from('negotiations')
      .update({ expires_at: expirationTime.toISOString() })
      .eq('id', negotiationId)
  }

  /**
   * Helper method to get negotiation round number
   */
  async getNegotiationRound(negotiationId: number): Promise<number> {
    const { data: offers } = await this.supabase
      .from('offers')
      .select('round_number')
      .eq('negotiation_id', negotiationId)
      .order('round_number', { ascending: false })
      .limit(1)

    return offers && offers.length > 0 ? offers[0].round_number : 0
  }
}

// Export singleton instance
export const offerService = new OfferService()