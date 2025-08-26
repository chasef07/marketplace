// Shared types and interfaces for the AI Agent system

export interface AgentTask {
  queue_id: number;
  negotiation_id: number;
  offer_id: number;
  seller_id: string;
  item_id: number;
  listing_price: number;
  offer_price: number;
  furniture_type: string;
}

export interface AgentDecision {
  id: number;
  decision_type: 'accept' | 'counter' | 'decline';
  original_offer_price: number;
  recommended_price?: number;
  confidence_score: number;
  reasoning: string;
  created_at: string;
  market_conditions: any;
  items: {
    name: string;
  };
}

export interface AgentEnabledItem {
  id: number;
  name: string;
  starting_price: number;
  agent_enabled: boolean;
  item_status: string;
  views_count: number;
  created_at: string;
  images: any[];
  negotiationsCount: number;
  offersCount: number;
  highestOffer?: number;
}

export interface AgentStats {
  totalAgentItems: number;
  totalDecisions: number;
  averageConfidence: number;
  successfulDeals: number;
}

export interface NegotiationHistory {
  price: number;
  offerType: string;
  round: number;
}

export interface AgentConfiguration {
  enabled: boolean;
  aggressiveness: 'conservative' | 'moderate' | 'aggressive';
  minAcceptanceThreshold: number;
  maxCounterRounds: number;
  timeUrgencyWeight: number;
}

export interface TimelineOffer {
  id: number;
  price: number;
  message?: string;
  offer_type: 'buyer' | 'seller';
  created_at: string;
  round_number: number;
  is_counter: boolean;
}

export interface NegotiationTimeline {
  id: number;
  status: string;
  created_at: string;
  updated_at: string;
  final_price?: number;
  buyer_username: string;
  item: {
    id: number;
    name: string;
    starting_price: number;
  };
  offers: TimelineOffer[];
  agent_decisions?: AgentDecision[];
}

export interface AgentNotification {
  id: number;
  type: 'decision_made' | 'negotiation_completed' | 'threshold_reached';
  message: string;
  created_at: string;
  read: boolean;
  metadata?: {
    negotiation_id?: number;
    item_id?: number;
    decision_id?: number;
  };
}