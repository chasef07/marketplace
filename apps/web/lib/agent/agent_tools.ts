import { tool } from 'ai';
import { z } from 'zod';

// Types for API responses
interface OfferAnalysis {
  offerId: string;
  assessment: 'Strong' | 'Fair' | 'Weak';
  isLowball: boolean;
  offerRatio: number;
  reason: string;
}

interface CounterOfferResult {
  success: boolean;
  newStatus: string;
  counterAmount: number;
  error?: string;
}

interface DecisionResult {
  success: boolean;
  newStatus: string;
  error?: string;
}


// Tool 1: Analyze Offer
export const analyzeOfferTool = tool({
  description: 'Analyze an offer to assess value and detect lowballs.',
  inputSchema: z.object({
    offerAmount: z.number().describe('Offer price in USD'),
    listPrice: z.number().describe('Listing price in USD'),
    minAccept: z.number().optional().describe('Minimum acceptable price (default 80% of list)'),
    offerId: z.string().describe('Unique offer ID'),
  }),
  execute: async ({ offerAmount, listPrice, minAccept = listPrice * 0.8, offerId }: {
    offerAmount: number;
    listPrice: number;
    minAccept?: number;
    offerId: string;
  }): Promise<OfferAnalysis> => {
    const ratio = offerAmount / listPrice;
    const isLowball = ratio < 0.7;
    
    return {
      offerId,
      assessment: ratio >= 0.9 ? 'Strong' : ratio >= 0.8 ? 'Fair' : 'Weak',
      isLowball,
      offerRatio: Math.round(ratio * 100) / 100, // Round to 2 decimal places
      reason: isLowball ? 'Offer is below 70% of listing price' : `Offer is ${Math.round(ratio * 100)}% of listing price`,
    };
  },
});

// Tool 2: Counter Offer
export const counterOfferTool = tool({
  description: 'Submit a counter-offer to the marketplace API.',
  inputSchema: z.object({
    negotiationId: z.number().describe('Negotiation ID'),
    amount: z.number().describe('Counter-offer price in USD'),
    message: z.string().optional().describe('Message to buyer'),
    sellerId: z.string().describe('Seller ID for authentication'),
  }),
  execute: async ({ negotiationId, amount, message = 'Please consider this counter-offer', sellerId }: {
    negotiationId: number;
    amount: number;
    message?: string;
    sellerId: string;
  }): Promise<CounterOfferResult> => {
    try {
      // Use server-side offer service directly for agent operations
      const { offerService } = await import('@/lib/services/offer-service');
      await offerService.createOffer({
        negotiationId,
        offerType: 'seller',
        price: amount,
        message,
        isCounterOffer: true,
        isMessageOnly: false,
        agentGenerated: true,
        userId: sellerId,
      });

      return {
        success: true,
        newStatus: 'Countered',
        counterAmount: amount,
      };
    } catch (error) {
      return {
        success: false,
        newStatus: 'Failed',
        counterAmount: amount,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

// Tool 3: Get Listing Age
export const getListingAgeTool = tool({
  description: 'Get how long an item has been listed and recent activity.',
  inputSchema: z.object({
    itemId: z.number().describe('Item ID to check listing age for'),
  }),
  execute: async ({ itemId }: { itemId: number }) => {
    try {
      const { createSupabaseServerClient } = await import('@/lib/supabase-server');
      const supabase = createSupabaseServerClient();

      // Get item listing date and recent activity
      const { data: item } = await supabase
        .from('items')
        .select('created_at, updated_at, views_count')
        .eq('id', itemId)
        .single();

      if (!item) {
        throw new Error('Item not found');
      }

      const listingDate = new Date(item.created_at);
      const daysOnMarket = Math.floor((Date.now() - listingDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Simple activity assessment
      const recentActivity = item.views_count > 10 ? 'High' : item.views_count > 5 ? 'Medium' : 'Low';

      return {
        daysOnMarket,
        listingDate: item.created_at,
        totalViews: item.views_count || 0,
        activityLevel: recentActivity,
        marketStatus: daysOnMarket <= 7 ? 'Fresh' : daysOnMarket <= 21 ? 'Active' : 'Stale'
      };
    } catch (error) {
      return {
        daysOnMarket: 0,
        listingDate: new Date().toISOString(),
        totalViews: 0,
        activityLevel: 'Unknown',
        marketStatus: 'Unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
});

// Tool 4: Get Competing Offers
export const getCompetingOffersTool = tool({
  description: 'Get information about competing offers on an item.',
  inputSchema: z.object({
    itemId: z.number().describe('Item ID to check competing offers for'),
    currentNegotiationId: z.number().describe('Current negotiation ID to exclude'),
  }),
  execute: async ({ itemId, currentNegotiationId }: { itemId: number; currentNegotiationId: number }) => {
    try {
      const { createSupabaseServerClient } = await import('@/lib/supabase-server');
      const supabase = createSupabaseServerClient();

      // Get all active negotiations for this item (excluding current one)
      const { data: competingNegotiations } = await supabase
        .from('negotiations')
        .select(`
          id,
          status,
          created_at,
          offers (
            price,
            created_at,
            offer_type
          )
        `)
        .eq('item_id', itemId)
        .neq('id', currentNegotiationId)
        .in('status', ['active', 'buyer_accepted']);

      if (!competingNegotiations || competingNegotiations.length === 0) {
        return {
          competingOffers: 0,
          highestCompetingOffer: 0,
          recentOfferActivity: false,
          competitionLevel: 'None'
        };
      }

      // Get all buyer offers from competing negotiations
      const allCompetingOffers = competingNegotiations
        .flatMap(neg => neg.offers || [])
        .filter(offer => offer.offer_type === 'buyer')
        .map(offer => offer.price);

      const highestCompetingOffer = allCompetingOffers.length > 0 ? Math.max(...allCompetingOffers) : 0;
      
      // Check for recent activity (last 48 hours)
      const recent = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const hasRecentActivity = competingNegotiations.some(neg => 
        new Date(neg.created_at) > recent
      );

      const competitionLevel = allCompetingOffers.length >= 3 ? 'High' : 
                              allCompetingOffers.length >= 1 ? 'Medium' : 'Low';

      return {
        competingOffers: allCompetingOffers.length,
        highestCompetingOffer,
        recentOfferActivity: hasRecentActivity,
        competitionLevel,
        competingNegotiations: competingNegotiations.length
      };
    } catch (error) {
      return {
        competingOffers: 0,
        highestCompetingOffer: 0,
        recentOfferActivity: false,
        competitionLevel: 'Unknown',
        competingNegotiations: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
});

// Tool 5: Decide Offer
export const decideOfferTool = tool({
  description: 'Accept or reject an offer in the marketplace.',
  inputSchema: z.object({
    negotiationId: z.number().describe('Negotiation ID'),
    decision: z.enum(['accept', 'reject']).describe('Accept or reject'),
    reason: z.string().optional().describe('Reason for decision'),
    sellerId: z.string().describe('Seller ID for authentication'),
  }),
  execute: async ({ negotiationId, decision }: {
    negotiationId: number;
    decision: 'accept' | 'reject';
    reason?: string;
    sellerId: string;
  }): Promise<DecisionResult> => {
    try {
      const { createSupabaseServerClient } = await import('@/lib/supabase-server');
      const supabase = createSupabaseServerClient();

      if (decision === 'accept') {
        // Get current offer details
        const { data: currentOffer } = await supabase
          .rpc('get_current_offer', { neg_id: negotiationId });

        // Update negotiation status
        const { error: updateError } = await supabase
          .from('negotiations')
          .update({
            status: 'completed',
            final_price: (currentOffer as any)?.price || 0,
            completed_at: new Date().toISOString()
          })
          .eq('id', negotiationId);

        if (updateError) {
          throw new Error(updateError.message);
        }

        return {
          success: true,
          newStatus: 'Accepted',
        };
      } else {
        // Update negotiation status to cancelled
        const { error: updateError } = await supabase
          .from('negotiations')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', negotiationId);

        if (updateError) {
          throw new Error(updateError.message);
        }

        return {
          success: true,
          newStatus: 'Rejected',
        };
      }
    } catch (error) {
      return {
        success: false,
        newStatus: 'Failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});