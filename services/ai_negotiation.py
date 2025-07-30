"""
AI Negotiation Service - Connects database negotiations to AI agents
"""

from models.database import db, Negotiation, Offer, Item, User, NegotiationStatus, OfferType
from agents.seller_agent import SellerAgent
from agents.buyer_agent import BuyerAgent
from agents.seller_personalities import (
    AggressiveSellerAgent, FlexibleSellerAgent, 
    QuickSaleSellerAgent, PremiumSellerAgent
)
from agents.buyer_personalities import (
    BargainHunterBuyerAgent, FairBuyerAgent,
    QuickBuyerAgent, PremiumBuyerAgent, StudentBuyerAgent
)
from models.negotiation_state import NegotiationState, FurnitureItem, FurnitureType
from models.negotiation_state import Offer as StateOffer
import time
import threading
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def cancel_other_negotiations(item_id: int, accepted_negotiation_id: int):
    """Cancel all other active and pending negotiations for an item when one is accepted"""
    other_negotiations = Negotiation.query.filter(
        Negotiation.item_id == item_id,
        Negotiation.id != accepted_negotiation_id,
        Negotiation.status.in_([NegotiationStatus.ACTIVE, NegotiationStatus.DEAL_PENDING])
    ).all()
    
    for negotiation in other_negotiations:
        was_pending = negotiation.status == NegotiationStatus.DEAL_PENDING
        negotiation.status = NegotiationStatus.CANCELLED
        
        # Add a system message explaining the cancellation
        if was_pending:
            message = "Sorry, this item has been sold to another buyer. Your pending deal has been cancelled."
        else:
            message = "This item has been sold to another buyer. Thank you for your interest!"
            
        cancellation_offer = Offer(
            negotiation_id=negotiation.id,
            offer_type=OfferType.SELLER,
            price=negotiation.current_offer,
            message=message,
            round_number=negotiation.round_number + 1
        )
        db.session.add(cancellation_offer)
    
    db.session.commit()
    logger.info(f"Cancelled {len(other_negotiations)} other negotiations for item {item_id}")

def get_seller_agent(personality: str) -> SellerAgent:
    """Get seller agent based on personality"""
    agents = {
        'aggressive': AggressiveSellerAgent,
        'flexible': FlexibleSellerAgent,
        'quick_sale': QuickSaleSellerAgent,
        'premium': PremiumSellerAgent,
    }
    agent_class = agents.get(personality, FlexibleSellerAgent)
    return agent_class()

def get_buyer_agent(personality: str) -> BuyerAgent:
    """Get buyer agent based on personality"""
    agents = {
        'bargain_hunter': BargainHunterBuyerAgent,
        'fair': FairBuyerAgent,
        'quick': QuickBuyerAgent,
        'premium': PremiumBuyerAgent,
        'student': StudentBuyerAgent,
    }
    agent_class = agents.get(personality, FairBuyerAgent)
    return agent_class()

class AISearchBuyer:
    """Simulates an AI buyer that finds and negotiates on items"""
    
    def __init__(self, name: str, personality: str, budget_range: tuple):
        self.name = name
        self.personality = personality
        self.min_budget, self.max_budget = budget_range
        self.agent = BuyerAgent(name, budget_multiplier=0.8)
        
    def is_interested_in_item(self, item: Item) -> bool:
        """Determine if this AI buyer is interested in an item"""
        # Check budget
        if item.starting_price > self.max_budget:
            return False
        if item.starting_price < self.min_budget * 0.5:
            return False
            
        # Different personalities prefer different items
        if "premium" in self.personality.lower():
            return item.starting_price >= 500 and item.condition == "excellent"
        elif "budget" in self.personality.lower():
            return item.starting_price <= 800
        elif "vintage" in self.personality.lower():
            return "vintage" in item.name.lower() or "antique" in item.description.lower()
        
        return True
        
    def calculate_initial_offer(self, item: Item) -> float:
        """Calculate initial offer based on personality"""
        if "aggressive" in self.personality.lower():
            return item.starting_price * 0.6  # Start low
        elif "premium" in self.personality.lower():
            return item.starting_price * 0.85  # Start high, wants quality
        else:
            return item.starting_price * 0.75  # Standard offer

class AIMatchmaker:
    """Matches AI buyers to new listings and starts negotiations"""
    
    def __init__(self):
        self.ai_buyers = [
            AISearchBuyer("Premium Collector", "premium_buyer", (800, 3000)),
            AISearchBuyer("Budget Hunter", "budget_shopper", (100, 800)),
            AISearchBuyer("Vintage Lover", "vintage_enthusiast", (300, 1500)),
            AISearchBuyer("Quick Flipper", "quick_cash_buyer", (200, 1200)),
            AISearchBuyer("Student Buyer", "budget_student", (50, 400)),
        ]
        
    def find_interested_buyers(self, item: Item) -> list:
        """Find AI buyers interested in an item"""
        interested = []
        for buyer in self.ai_buyers:
            if buyer.is_interested_in_item(item):
                interested.append(buyer)
        
        # Return 1-3 random interested buyers
        import random
        num_buyers = min(random.randint(1, 3), len(interested))
        return random.sample(interested, num_buyers) if interested else []

class AITurns:
    """Handles AI turns in negotiations"""
    
    @staticmethod
    def process_ai_seller_response(negotiation_id: int):
        """Process AI seller response to buyer offer"""
        try:
            negotiation = Negotiation.query.get(negotiation_id)
            if not negotiation or negotiation.status != NegotiationStatus.ACTIVE:
                return
                
            # Convert to old format for AI agents
            negotiation_state = AITurns._convert_to_negotiation_state(negotiation)
            
            # Get seller's personality and create appropriate agent
            seller = User.query.get(negotiation.seller_id)
            seller_agent = get_seller_agent(seller.seller_personality)
            
            # Check if seller should accept
            current_offer = negotiation.current_offer
            should_accept = seller_agent.should_accept_offer(current_offer, negotiation.item.starting_price)
            
            if should_accept:
                # Accept the deal
                negotiation.status = NegotiationStatus.COMPLETED
                negotiation.final_price = current_offer
                negotiation.completed_at = datetime.now()
                # Mark item as sold and cancel other negotiations
                negotiation.item.is_sold = True
                cancel_other_negotiations(negotiation.item_id, negotiation.id)
                
                # Add acceptance offer
                offer = Offer(
                    negotiation_id=negotiation_id,
                    offer_type=OfferType.SELLER,
                    price=current_offer,
                    message=f"Deal! I accept your offer of ${current_offer}.",
                    round_number=negotiation.round_number + 1
                )
                db.session.add(offer)
                
            else:
                # Check if we've exceeded max rounds
                if negotiation.round_number > negotiation.max_rounds:
                    negotiation.status = NegotiationStatus.CANCELLED
                    db.session.commit()
                    return
                
                # Generate counter-offer
                ai_offer = seller_agent.generate_response(negotiation_state)
                
                # Create database offer
                offer = Offer(
                    negotiation_id=negotiation_id,
                    offer_type=OfferType.SELLER,
                    price=ai_offer.price,
                    message=ai_offer.message,
                    round_number=negotiation.round_number + 1
                )
                
                # Update negotiation
                negotiation.current_offer = ai_offer.price
                negotiation.round_number += 1
                
                db.session.add(offer)
                
                # Only schedule buyer response if we haven't reached max rounds
                if negotiation.round_number <= negotiation.max_rounds:
                    schedule_ai_response(negotiation_id, is_seller_turn=False, delay_seconds=4)
            
            db.session.commit()
            logger.info(f"AI seller responded to negotiation {negotiation_id}")
            
        except Exception as e:
            logger.error(f"Error in AI seller response: {e}")
            db.session.rollback()
    
    @staticmethod
    def process_ai_buyer_response(negotiation_id: int):
        """Process AI buyer response to seller counter-offer"""
        try:
            negotiation = Negotiation.query.get(negotiation_id)
            if not negotiation or negotiation.status != NegotiationStatus.ACTIVE:
                return
                
            # Convert to old format for AI agents
            negotiation_state = AITurns._convert_to_negotiation_state(negotiation)
            
            # Get buyer's personality and create appropriate agent
            if negotiation.buyer_id:
                buyer = User.query.get(negotiation.buyer_id)
                buyer_agent = get_buyer_agent(buyer.buyer_personality)
            else:
                buyer_agent = get_buyer_agent('fair')  # Default for AI buyers
            
            # Check if buyer should accept
            current_offer = negotiation.current_offer
            should_accept = buyer_agent.should_accept_offer(current_offer, negotiation.item.starting_price)
            
            if should_accept:
                # Buyer accepts - but item isn't sold until seller confirms
                negotiation.status = NegotiationStatus.DEAL_PENDING
                negotiation.final_price = current_offer
                negotiation.completed_at = datetime.now()
                
                # Add acceptance offer
                offer = Offer(
                    negotiation_id=negotiation_id,
                    offer_type=OfferType.BUYER,
                    price=current_offer,
                    message=f"Perfect! I'll take it for ${current_offer}.",
                    round_number=negotiation.round_number + 1
                )
                db.session.add(offer)
                
            else:
                # Check if we've exceeded max rounds
                if negotiation.round_number > negotiation.max_rounds:
                    negotiation.status = NegotiationStatus.CANCELLED
                    db.session.commit()
                    return
                
                # Generate counter-offer
                ai_offer = buyer_agent.generate_response(negotiation_state)
                
                # Create database offer
                offer = Offer(
                    negotiation_id=negotiation_id,
                    offer_type=OfferType.BUYER,
                    price=ai_offer.price,
                    message=ai_offer.message,
                    round_number=negotiation.round_number + 1
                )
                
                # Update negotiation
                negotiation.current_offer = ai_offer.price
                negotiation.round_number += 1
                
                db.session.add(offer)
                
                # Only schedule seller response if we haven't reached max rounds
                if negotiation.round_number <= negotiation.max_rounds:
                    schedule_ai_response(negotiation_id, is_seller_turn=True, delay_seconds=4)
            
            db.session.commit()
            logger.info(f"AI buyer responded to negotiation {negotiation_id}")
            
        except Exception as e:
            logger.error(f"Error in AI buyer response: {e}")
            db.session.rollback()
    
    @staticmethod
    def _convert_to_negotiation_state(negotiation: Negotiation) -> NegotiationState:
        """Convert database negotiation to NegotiationState for AI agents"""
        
        # Convert item
        furniture_item = FurnitureItem(
            name=negotiation.item.name,
            furniture_type=FurnitureType.COUCH,  # Simplified
            starting_price=negotiation.item.starting_price,
            condition=negotiation.item.condition,
            description=negotiation.item.description or ""
        )
        
        # Convert offers
        offers_history = []
        for offer in negotiation.offers:
            state_offer = StateOffer(
                price=offer.price,
                message=offer.message,
                round_number=offer.round_number,
                agent_type="buyer" if offer.offer_type == OfferType.BUYER else "seller"
            )
            offers_history.append(state_offer)
        
        # Create negotiation state
        return NegotiationState(
            item=furniture_item,
            offers_history=offers_history,
            round_number=negotiation.round_number,
            max_rounds=negotiation.max_rounds
        )

def schedule_ai_response(negotiation_id: int, is_seller_turn: bool, delay_seconds: int = 3):
    """Schedule an AI response after a delay"""
    def delayed_response():
        from app import app
        with app.app_context():
            time.sleep(delay_seconds)
            if is_seller_turn:
                AITurns.process_ai_seller_response(negotiation_id)
            else:
                AITurns.process_ai_buyer_response(negotiation_id)
    
    # Run in background thread
    thread = threading.Thread(target=delayed_response, daemon=True)
    thread.start()

def auto_generate_ai_interest(item_id: int):
    """Automatically generate AI buyer interest for new items"""
    try:
        item = Item.query.get(item_id)
        if not item:
            return
            
        matchmaker = AIMatchmaker()
        interested_buyers = matchmaker.find_interested_buyers(item)
        
        for ai_buyer in interested_buyers:
            # Create a negotiation
            negotiation = Negotiation(
                item_id=item_id,
                seller_id=item.user_id,
                buyer_id=None,  # AI buyer - we'll use negative IDs
                status=NegotiationStatus.ACTIVE
            )
            
            db.session.add(negotiation)
            db.session.flush()  # Get the ID
            
            # Make initial offer
            initial_offer = ai_buyer.calculate_initial_offer(item)
            
            offer = Offer(
                negotiation_id=negotiation.id,
                offer_type=OfferType.BUYER,
                price=initial_offer,
                message=f"Hi! I'm interested in your {item.name}. Would you consider ${initial_offer}?",
                round_number=1
            )
            
            negotiation.current_offer = initial_offer
            negotiation.round_number = 1
            
            db.session.add(offer)
            
            # Schedule AI seller response
            schedule_ai_response(negotiation.id, is_seller_turn=True, delay_seconds=5)
        
        db.session.commit()
        logger.info(f"Generated {len(interested_buyers)} AI negotiations for item {item_id}")
        
    except Exception as e:
        logger.error(f"Error generating AI interest: {e}")
        db.session.rollback()