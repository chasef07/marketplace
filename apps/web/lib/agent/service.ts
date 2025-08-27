// Unified Agent Service - Centralized logic for AI Agent operations
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { 
  AgentTask, 
  AgentDecision, 
  AgentEnabledItem, 
  AgentStats, 
  AgentConfiguration,
  AgentNotification 
} from './types';

export class AgentService {
  private supabase = createSupabaseServerClient();

  /**
   * Get the next pending task from the agent queue
   */
  async getNextQueuedTask(): Promise<AgentTask | null> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_next_agent_task');
      
      if (error) {
        console.error('Error getting next agent task:', error);
        return null;
      }
      
      return data?.[0] || null;
    } catch (error) {
      console.error('Failed to get next queued task:', error);
      return null;
    }
  }

  /**
   * Record an agent decision in the database
   */
  async recordDecision(decision: Omit<AgentDecision, 'id' | 'created_at' | 'items'>): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('agent_decisions')
        .insert({
          decision_type: decision.decision_type,
          original_offer_price: decision.original_offer_price,
          recommended_price: decision.recommended_price,
          confidence_score: decision.confidence_score,
          reasoning: decision.reasoning,
          market_conditions: decision.market_conditions,
          seller_id: (decision as any).seller_id,
          item_id: (decision as any).item_id,
          negotiation_id: (decision as any).negotiation_id
        });

      if (error) {
        console.error('Error recording agent decision:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to record decision:', error);
      return false;
    }
  }

  /**
   * Get agent-enabled items for a seller
   */
  async getAgentItems(sellerId: string): Promise<AgentEnabledItem[]> {
    try {
      const { data: itemsData } = await this.supabase
        .from('items')
        .select(`
          id,
          name,
          starting_price,
          item_status,
          views_count,
          created_at,
          images,
          negotiations(
            id,
            status,
            offers(id, price, offer_type)
          )
        `)
        .eq('seller_id', sellerId)
        .in('item_status', ['active', 'under_negotiation', 'sold'])
        .order('created_at', { ascending: false });

      // Check seller agent profile for enabled status
      let agentEnabled = true; // Default to enabled
      try {
        const { data: profile } = await this.supabase
          .from('seller_agent_profile')
          .select('enabled')
          .eq('seller_id', sellerId)
          .single();
        
        agentEnabled = profile?.enabled ?? true;
      } catch {
        // Profile doesn't exist, use default
      }

      // Process items data
      const processedItems = itemsData?.map(item => {
        const negotiations = item.negotiations || [];
        const offers = negotiations.flatMap((n: any) => n.offers || []);
        const buyerOffers = offers.filter((o: any) => o.offer_type === 'buyer');
        
        return {
          ...item,
          agent_enabled: agentEnabled,
          negotiationsCount: negotiations.length,
          offersCount: buyerOffers.length,
          highestOffer: buyerOffers.length > 0 
            ? Math.max(...buyerOffers.map((o: any) => parseFloat(o.price))) 
            : undefined
        };
      }) || [];

      return processedItems;
    } catch (error) {
      console.error('Failed to get agent items:', error);
      return [];
    }
  }

  /**
   * Get recent agent decisions for a seller
   */
  async getRecentDecisions(sellerId: string, limit = 10): Promise<AgentDecision[]> {
    try {
      const { data } = await this.supabase
        .from('agent_decisions')
        .select('*, items(name)')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      return data?.map(decision => ({
        ...decision,
        items: { name: decision.items?.name || 'Unknown Item' }
      })) || [];
    } catch (error) {
      console.error('Failed to get recent decisions:', error);
      return [];
    }
  }

  /**
   * Calculate agent statistics for a seller
   */
  async getAgentStats(sellerId: string): Promise<AgentStats> {
    try {
      const [items, decisions] = await Promise.all([
        this.getAgentItems(sellerId),
        this.getRecentDecisions(sellerId, 100)
      ]);

      const agentEnabledItems = items.filter(item => item.agent_enabled);
      const totalDecisions = decisions.length;
      const avgConfidence = decisions.length > 0 
        ? decisions.reduce((sum, d) => sum + (d.confidence_score || 0), 0) / decisions.length 
        : 0;
      const successfulDeals = items.filter(item => 
        item.item_status === 'sold' && item.agent_enabled
      ).length;

      return {
        totalAgentItems: agentEnabledItems.length,
        totalDecisions,
        averageConfidence: avgConfidence,
        successfulDeals
      };
    } catch (error) {
      console.error('Failed to calculate agent stats:', error);
      return {
        totalAgentItems: 0,
        totalDecisions: 0,
        averageConfidence: 0,
        successfulDeals: 0
      };
    }
  }

  /**
   * Get or create agent configuration for a seller
   */
  async getAgentConfiguration(sellerId: string): Promise<AgentConfiguration> {
    try {
      const { data, error } = await this.supabase
        .from('seller_agent_profile')
        .select('*')
        .eq('seller_id', sellerId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        console.error('Error getting agent configuration:', error);
      }

      // Return default configuration if none exists
      return {
        enabled: data?.enabled ?? true,
        aggressiveness: data?.aggressiveness ?? 'moderate',
        minAcceptanceThreshold: data?.min_acceptance_threshold ?? 0.8,
        maxCounterRounds: data?.max_counter_rounds ?? 5,
        timeUrgencyWeight: data?.time_urgency_weight ?? 0.3
      };
    } catch (error) {
      console.error('Failed to get agent configuration:', error);
      return {
        enabled: true,
        aggressiveness: 'moderate',
        minAcceptanceThreshold: 0.8,
        maxCounterRounds: 5,
        timeUrgencyWeight: 0.3
      };
    }
  }

  /**
   * Update agent configuration for a seller
   */
  async updateAgentConfiguration(
    sellerId: string, 
    config: Partial<AgentConfiguration>
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('seller_agent_profile')
        .upsert({
          seller_id: sellerId,
          enabled: config.enabled,
          aggressiveness: config.aggressiveness,
          min_acceptance_threshold: config.minAcceptanceThreshold,
          max_counter_rounds: config.maxCounterRounds,
          time_urgency_weight: config.timeUrgencyWeight,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error updating agent configuration:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to update agent configuration:', error);
      return false;
    }
  }

  /**
   * Create agent notification
   */
  async createNotification(
    sellerId: string,
    type: AgentNotification['type'],
    message: string,
    metadata?: AgentNotification['metadata']
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('agent_notifications')
        .insert({
          seller_id: sellerId,
          type,
          message,
          metadata,
          read: false,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error creating notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to create notification:', error);
      return false;
    }
  }

  /**
   * Get unread notifications for a seller
   */
  async getUnreadNotifications(sellerId: string): Promise<AgentNotification[]> {
    try {
      const { data } = await this.supabase
        .from('agent_notifications')
        .select('*')
        .eq('seller_id', sellerId)
        .eq('read', false)
        .order('created_at', { ascending: false });

      return data || [];
    } catch (error) {
      console.error('Failed to get unread notifications:', error);
      return [];
    }
  }

  /**
   * Mark notifications as read
   */
  async markNotificationsRead(notificationIds: number[]): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('agent_notifications')
        .update({ read: true })
        .in('id', notificationIds);

      if (error) {
        console.error('Error marking notifications as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      return false;
    }
  }
}

// Export singleton instance
export const agentService = new AgentService();