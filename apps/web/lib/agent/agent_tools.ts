import { tool } from 'ai';
import { z } from 'zod';

// Types for API responses
interface OfferAnalysis {
  offerId: string;
  assessment: 'Strong' | 'Fair' | 'Weak';
  isLowball: boolean;
  suggestedCounter: number;
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
      suggestedCounter: isLowball ? Math.max(offerAmount * 1.15, minAccept) : Math.max(offerAmount * 1.05, minAccept),
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

// Tool 3: Decide Offer
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