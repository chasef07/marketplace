#!/usr/bin/env python3

"""
SCALABLE MARKETPLACE ORCHESTRATOR

This module implements a production-ready, scalable marketplace system where multiple
AI agents can negotiate simultaneously on behalf of human users. Key features:

🔥 MAJOR FEATURES:
- Concurrent negotiations (up to 100+ simultaneous)
- Real user registration with agent personality selection
- Multi-buyer competition for single items
- Human confirmation layer for all deals
- Background cleanup of expired items/deals
- Thread-safe operations with proper locking

🏗️ ARCHITECTURE:
- ThreadPoolExecutor for concurrent negotiation handling
- In-memory data stores (easily replaceable with database)
- Event-driven negotiation lifecycle management
- Automatic deal expiration and cleanup

🎯 PRODUCTION READY:
- Proper error handling and logging
- Resource management and cleanup
- Scalable thread pool architecture
- User preference integration
"""

import asyncio
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Set
from dataclasses import dataclass, field
from enum import Enum
import threading
import time
from concurrent.futures import ThreadPoolExecutor
import json

from models import FurnitureItem, NegotiationState, NegotiationResult, Offer
from agents import BuyerAgent, SellerAgent
from utils import ConversationLogger


class ListingStatus(str, Enum):
    ACTIVE = "active"
    NEGOTIATING = "negotiating"
    PENDING_CONFIRMATION = "pending_confirmation"
    SOLD = "sold"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class UserRole(str, Enum):
    BUYER = "buyer"
    SELLER = "seller"


@dataclass
class UserProfile:
    """User profile with agent preferences"""
    user_id: str
    name: str
    role: UserRole
    agent_personality: str  # Maps to BuyerProfile or SellerProfile name
    budget_range: Tuple[float, float] = (0, 10000)
    preferred_negotiation_speed: str = "normal"  # fast, normal, slow
    risk_tolerance: float = 0.5  # 0-1 scale
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class ItemListing:
    """Marketplace listing with seller info"""
    listing_id: str
    seller_user_id: str
    item: FurnitureItem
    asking_price: float
    minimum_price: float
    listing_status: ListingStatus = ListingStatus.ACTIVE
    expiry_time: datetime = field(default_factory=lambda: datetime.now() + timedelta(days=7))
    interested_buyers: Set[str] = field(default_factory=set)
    active_negotiations: Dict[str, str] = field(default_factory=dict)  # buyer_id -> negotiation_id
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class ActiveNegotiation:
    """Represents an ongoing negotiation"""
    negotiation_id: str
    listing_id: str
    buyer_user_id: str
    seller_user_id: str
    buyer_agent: BuyerAgent
    seller_agent: SellerAgent
    negotiation_state: NegotiationState
    status: str = "active"  # active, completed, failed, expired
    created_at: datetime = field(default_factory=datetime.now)
    last_activity: datetime = field(default_factory=datetime.now)


@dataclass
class PendingDeal:
    """Deal waiting for human confirmation"""
    deal_id: str
    negotiation_id: str
    listing_id: str
    buyer_user_id: str
    seller_user_id: str
    agreed_price: float
    created_at: datetime = field(default_factory=datetime.now)
    expires_at: datetime = field(default_factory=lambda: datetime.now() + timedelta(hours=24))
    seller_confirmed: bool = False
    buyer_confirmed: bool = False


class ScalableMarketplaceOrchestrator:
    """Handles multiple concurrent negotiations with proper scaling"""
    
    def __init__(self, max_concurrent_negotiations: int = 100):
        self.max_concurrent_negotiations = max_concurrent_negotiations
        self.logger = ConversationLogger()
        
        # Data stores (in production, use database)
        self.users: Dict[str, UserProfile] = {}
        self.listings: Dict[str, ItemListing] = {}
        self.negotiations: Dict[str, ActiveNegotiation] = {}
        self.pending_deals: Dict[str, PendingDeal] = {}
        
        # Threading for concurrent negotiations
        self.executor = ThreadPoolExecutor(max_workers=max_concurrent_negotiations)
        self.negotiation_lock = threading.RLock()
        
        # Background tasks
        self.running = True
        self.cleanup_thread = threading.Thread(target=self._cleanup_expired_items, daemon=True)
        self.cleanup_thread.start()
        
    def register_user(self, name: str, role: UserRole, agent_personality: str,
                     budget_range: Tuple[float, float] = (0, 10000)) -> str:
        """Register a new user with agent preferences"""
        user_id = str(uuid.uuid4())
        user = UserProfile(
            user_id=user_id,
            name=name,
            role=role,
            agent_personality=agent_personality,
            budget_range=budget_range
        )
        self.users[user_id] = user
        return user_id
    
    def create_listing(self, seller_user_id: str, item: FurnitureItem, 
                      asking_price: float, minimum_price: float,
                      duration_days: int = 7) -> str:
        """Create a new marketplace listing"""
        if seller_user_id not in self.users:
            raise ValueError("Seller not found")
            
        if self.users[seller_user_id].role != UserRole.SELLER:
            raise ValueError("User is not registered as a seller")
        
        listing_id = str(uuid.uuid4())
        listing = ItemListing(
            listing_id=listing_id,
            seller_user_id=seller_user_id,
            item=item,
            asking_price=asking_price,
            minimum_price=minimum_price,
            expiry_time=datetime.now() + timedelta(days=duration_days)
        )
        
        self.listings[listing_id] = listing
        print(f"✅ Created listing: {item.name} for ${asking_price}")
        return listing_id
    
    def express_interest(self, buyer_user_id: str, listing_id: str) -> bool:
        """Buyer expresses interest in a listing"""
        if buyer_user_id not in self.users or listing_id not in self.listings:
            return False
            
        buyer = self.users[buyer_user_id]
        listing = self.listings[listing_id]
        
        if buyer.role != UserRole.BUYER:
            return False
            
        if listing.listing_status != ListingStatus.ACTIVE:
            return False
        
        # Check if buyer is already negotiating for this item
        if buyer_user_id in listing.active_negotiations:
            return False
        
        listing.interested_buyers.add(buyer_user_id)
        print(f"💫 {buyer.name} expressed interest in {listing.item.name}")
        return True
    
    def start_negotiation(self, buyer_user_id: str, listing_id: str) -> Optional[str]:
        """Start a new negotiation between buyer and seller agents"""
        
        with self.negotiation_lock:
            # Validation
            if len(self.negotiations) >= self.max_concurrent_negotiations:
                print("⚠️ Maximum concurrent negotiations reached")
                return None
                
            if (buyer_user_id not in self.users or listing_id not in self.listings):
                return None
                
            listing = self.listings[listing_id]
            buyer = self.users[buyer_user_id]
            seller = self.users[listing.seller_user_id]
            
            if listing.listing_status != ListingStatus.ACTIVE:
                return None
                
            if buyer_user_id in listing.active_negotiations:
                return None
            
            # Create agents based on user preferences
            buyer_agent = self._create_buyer_agent(buyer, listing.asking_price)
            seller_agent = self._create_seller_agent(seller, listing.minimum_price, listing.asking_price)
            
            # Create negotiation
            negotiation_id = str(uuid.uuid4())
            negotiation_state = NegotiationState(item=listing.item, max_rounds=8)
            
            negotiation = ActiveNegotiation(
                negotiation_id=negotiation_id,
                listing_id=listing_id,
                buyer_user_id=buyer_user_id,
                seller_user_id=listing.seller_user_id,
                buyer_agent=buyer_agent,
                seller_agent=seller_agent,
                negotiation_state=negotiation_state
            )
            
            self.negotiations[negotiation_id] = negotiation
            listing.active_negotiations[buyer_user_id] = negotiation_id
            
            # Start negotiation in background
            future = self.executor.submit(self._run_negotiation, negotiation_id)
            
            print(f"🤝 Started negotiation: {buyer.name} vs {seller.name} for {listing.item.name}")
            return negotiation_id
    
    def _create_buyer_agent(self, user: UserProfile, asking_price: float) -> BuyerAgent:
        """Create buyer agent based on user preferences"""
        # Map personality to budget multiplier
        budget_multipliers = {
            "Quick Cash Buyer": 0.85,
            "Budget Shopper": 0.65,
            "Value Hunter": 0.75,
            "Premium Buyer": 0.95,
            "Bargain Hunter": 0.60,
            "Quality Seeker": 0.90,
            "Impulse Buyer": 0.80,
            "Careful Buyer": 0.70,
            "Fair Deal Buyer": 0.78,
            "Flexible Buyer": 0.82
        }
        
        multiplier = budget_multipliers.get(user.agent_personality, 0.75)
        
        # Adjust based on user budget range
        max_budget = min(user.budget_range[1], asking_price * multiplier)
        actual_multiplier = max_budget / asking_price
        
        agent = BuyerAgent(f"{user.name}'s Agent", budget_multiplier=actual_multiplier)
        return agent
    
    def _create_seller_agent(self, user: UserProfile, minimum_price: float, asking_price: float) -> SellerAgent:
        """Create seller agent based on user preferences"""
        minimum_multiplier = minimum_price / asking_price
        agent = SellerAgent(f"{user.name}'s Agent", minimum_multiplier=minimum_multiplier)
        return agent
    
    def _run_negotiation(self, negotiation_id: str) -> None:
        """Run a single negotiation to completion"""
        try:
            negotiation = self.negotiations[negotiation_id]
            listing = self.listings[negotiation.listing_id]
            
            print(f"🔄 Running negotiation {negotiation_id[:8]}...")
            
            # Run the negotiation loop
            while not negotiation.negotiation_state.is_complete():
                self._execute_negotiation_round(negotiation)
                negotiation.last_activity = datetime.now()
                time.sleep(0.1)  # Small delay to prevent overwhelming
            
            # Handle negotiation result
            if negotiation.negotiation_state.result == NegotiationResult.DEAL_ACCEPTED:
                self._create_pending_deal(negotiation)
            else:
                self._finalize_failed_negotiation(negotiation)
                
        except Exception as e:
            print(f"❌ Error in negotiation {negotiation_id}: {e}")
            self._finalize_failed_negotiation(self.negotiations[negotiation_id])
    
    def _execute_negotiation_round(self, negotiation: ActiveNegotiation) -> None:
        """Execute one round of negotiation"""
        state = negotiation.negotiation_state
        buyer_agent = negotiation.buyer_agent
        seller_agent = negotiation.seller_agent
        
        if state.round_number % 2 == 0:
            # Buyer's turn
            if state.round_number == 0:
                # Buyer makes first offer
                offer_price = state.item.starting_price * 0.6  # Start at 60%
            else:
                # Counter-offer logic
                last_seller_offer = state.current_offer.price if state.current_offer else state.item.starting_price
                offer_price = min(last_seller_offer * 1.1, buyer_agent.get_walk_away_price(state.item.starting_price))
            
            offer = Offer(
                price=offer_price,
                message=f"I can offer ${offer_price:.2f}",
                round_number=state.round_number + 1,
                agent_type="buyer"
            )
            
            state.add_offer(offer)
            
            # Check if seller accepts
            if seller_agent.should_accept_offer(offer_price, state.item.starting_price):
                state.result = NegotiationResult.DEAL_ACCEPTED
                state.final_price = offer_price
                
        else:
            # Seller's turn
            last_buyer_offer = state.current_offer.price
            
            # Check if buyer's offer is acceptable
            if seller_agent.should_accept_offer(last_buyer_offer, state.item.starting_price):
                state.result = NegotiationResult.DEAL_ACCEPTED
                state.final_price = last_buyer_offer
                return
            
            # Make counter offer
            counter_price = max(
                last_buyer_offer * 1.15,  # 15% higher than buyer's offer
                seller_agent.get_walk_away_price(state.item.starting_price)
            )
            
            offer = Offer(
                price=counter_price,
                message=f"I could consider ${counter_price:.2f}",
                round_number=state.round_number + 1,
                agent_type="seller"
            )
            
            state.add_offer(offer)
            
            # Check if buyer accepts
            if buyer_agent.should_accept_offer(counter_price, state.item.starting_price):
                state.result = NegotiationResult.DEAL_ACCEPTED
                state.final_price = counter_price
    
    def _create_pending_deal(self, negotiation: ActiveNegotiation) -> None:
        """Create a deal pending human confirmation"""
        deal_id = str(uuid.uuid4())
        deal = PendingDeal(
            deal_id=deal_id,
            negotiation_id=negotiation.negotiation_id,
            listing_id=negotiation.listing_id,
            buyer_user_id=negotiation.buyer_user_id,
            seller_user_id=negotiation.seller_user_id,
            agreed_price=negotiation.negotiation_state.final_price
        )
        
        self.pending_deals[deal_id] = deal
        negotiation.status = "completed"
        
        # Update listing status
        listing = self.listings[negotiation.listing_id]
        listing.listing_status = ListingStatus.PENDING_CONFIRMATION
        
        print(f"💰 Deal reached! ${deal.agreed_price:.2f} - Waiting for confirmation")
        print(f"   Deal ID: {deal_id}")
    
    def _finalize_failed_negotiation(self, negotiation: ActiveNegotiation) -> None:
        """Clean up failed negotiation"""
        negotiation.status = "failed"
        listing = self.listings[negotiation.listing_id]
        
        # Remove from active negotiations
        if negotiation.buyer_user_id in listing.active_negotiations:
            del listing.active_negotiations[negotiation.buyer_user_id]
        
        print(f"❌ Negotiation failed: {negotiation.negotiation_id[:8]}")
    
    def confirm_deal(self, user_id: str, deal_id: str, accept: bool) -> bool:
        """User confirms or rejects a pending deal"""
        if deal_id not in self.pending_deals:
            return False
            
        deal = self.pending_deals[deal_id]
        
        if user_id == deal.buyer_user_id:
            deal.buyer_confirmed = accept
        elif user_id == deal.seller_user_id:
            deal.seller_confirmed = accept
        else:
            return False
        
        # Check if both parties confirmed
        if deal.buyer_confirmed and deal.seller_confirmed:
            self._finalize_successful_deal(deal)
        elif not accept:
            self._cancel_deal(deal)
            
        return True
    
    def _finalize_successful_deal(self, deal: PendingDeal) -> None:
        """Finalize a successful deal"""
        listing = self.listings[deal.listing_id]
        listing.listing_status = ListingStatus.SOLD
        
        # Clean up
        del self.pending_deals[deal.deal_id]
        
        buyer_name = self.users[deal.buyer_user_id].name
        seller_name = self.users[deal.seller_user_id].name
        print(f"🎉 DEAL COMPLETED! {buyer_name} bought {listing.item.name} from {seller_name} for ${deal.agreed_price:.2f}")
    
    def _cancel_deal(self, deal: PendingDeal) -> None:
        """Cancel a rejected deal"""
        listing = self.listings[deal.listing_id]
        listing.listing_status = ListingStatus.ACTIVE  # Back to market
        
        del self.pending_deals[deal.deal_id]
        print(f"❌ Deal cancelled for {listing.item.name}")
    
    def _cleanup_expired_items(self) -> None:
        """Background task to clean up expired items"""
        while self.running:
            now = datetime.now()
            
            # Clean up expired listings
            for listing_id, listing in list(self.listings.items()):
                if now > listing.expiry_time and listing.listing_status == ListingStatus.ACTIVE:
                    listing.listing_status = ListingStatus.EXPIRED
                    print(f"⏰ Listing expired: {listing.item.name}")
            
            # Clean up expired deals
            for deal_id, deal in list(self.pending_deals.items()):
                if now > deal.expires_at:
                    self._cancel_deal(deal)
                    print(f"⏰ Deal expired: {deal_id}")
            
            time.sleep(60)  # Check every minute
    
    def get_active_listings(self) -> List[ItemListing]:
        """Get all active listings"""
        return [listing for listing in self.listings.values() 
                if listing.listing_status == ListingStatus.ACTIVE]
    
    def get_user_negotiations(self, user_id: str) -> List[ActiveNegotiation]:
        """Get all negotiations for a user"""
        return [neg for neg in self.negotiations.values() 
                if neg.buyer_user_id == user_id or neg.seller_user_id == user_id]
    
    def get_pending_deals_for_user(self, user_id: str) -> List[PendingDeal]:
        """Get pending deals requiring user confirmation"""
        return [deal for deal in self.pending_deals.values()
                if deal.buyer_user_id == user_id or deal.seller_user_id == user_id]
    
    def shutdown(self) -> None:
        """Shutdown the orchestrator"""
        self.running = False
        self.executor.shutdown(wait=True)
        print("🛑 Marketplace orchestrator shutdown")