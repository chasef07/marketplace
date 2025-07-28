#!/usr/bin/env python3

import os
import time
from dotenv import load_dotenv

from models import FurnitureItem, FurnitureType, NegotiationState, NegotiationResult
from agents import BuyerAgent, SellerAgent
from utils import ConversationLogger

load_dotenv()


class NegotiationOrchestrator:
    def __init__(self):
        self.logger = ConversationLogger()
        self.buyer = BuyerAgent("Alice")
        self.seller = SellerAgent("Bob")
        
    def create_sample_items(self):
        """Create sample furniture items for negotiation"""
        return [
            FurnitureItem(
                name="Vintage Leather Couch",
                furniture_type=FurnitureType.COUCH,
                starting_price=800.0,
                condition="good",
                description="Comfortable 3-seat leather couch, minor wear on armrests"
            ),
            FurnitureItem(
                name="Oak Dining Table",
                furniture_type=FurnitureType.DINING_TABLE,
                starting_price=400.0,
                condition="excellent",
                description="Solid oak dining table, seats 6 people"
            ),
            FurnitureItem(
                name="Modern Bookshelf",
                furniture_type=FurnitureType.BOOKSHELF,
                starting_price=200.0,
                condition="like new",
                description="5-shelf bookcase, white finish, barely used"
            )
        ]
        
    def run_negotiation(self, item: FurnitureItem) -> NegotiationState:
        """Run a single negotiation between buyer and seller"""
        
        # Initialize negotiation state
        negotiation = NegotiationState(item=item)
        
        # Start logging
        self.logger.print_negotiation_start(item.name, item.starting_price)
        
        # Seller starts with asking price
        seller_opening = self.seller.generate_response(negotiation)
        negotiation.add_offer(seller_opening)
        
        self.logger.print_offer(
            self.seller.name, 
            seller_opening.price, 
            seller_opening.message, 
            is_buyer=False
        )
        
        # Main negotiation loop
        while not negotiation.is_complete():
            current_agent = self.buyer if negotiation.round_number % 2 == 1 else self.seller
            other_agent = self.seller if current_agent == self.buyer else self.buyer
            
            # Generate offer
            offer = current_agent.generate_response(negotiation)
            negotiation.add_offer(offer)
            
            # Log the offer
            self.logger.print_offer(
                current_agent.name,
                offer.price,
                offer.message,
                is_buyer=(current_agent == self.buyer)
            )
            
            # Check if other agent accepts
            if other_agent.should_accept_offer(offer.price, item.starting_price):
                negotiation.result = NegotiationResult.DEAL_ACCEPTED
                negotiation.final_price = offer.price
                break
                
            # Check if offer is below walk-away price
            walk_away_price = other_agent.get_walk_away_price(item.starting_price)
            if (other_agent == self.seller and offer.price < walk_away_price) or \
               (other_agent == self.buyer and offer.price > walk_away_price):
                negotiation.result = NegotiationResult.NO_DEAL
                break
                
            # Add small delay for readability
            time.sleep(1)
            
        # Handle negotiation end
        if negotiation.result == NegotiationResult.IN_PROGRESS:
            negotiation.result = NegotiationResult.NO_DEAL
            
        # Log results
        self.logger.print_negotiation_end(
            negotiation.result, 
            negotiation.final_price
        )
        
        # Save to file
        negotiation_data = {
            "item": negotiation.item.dict(),
            "offers": [offer.dict() for offer in negotiation.offers_history],
            "result": negotiation.result,
            "final_price": negotiation.final_price,
            "rounds": negotiation.round_number
        }
        self.logger.log_negotiation(negotiation_data)
        
        return negotiation
        
    def run_multiple_negotiations(self, num_negotiations: int = 3):
        """Run multiple negotiations and show summary stats"""
        items = self.create_sample_items()
        results = []
        
        for i in range(num_negotiations):
            item = items[i % len(items)]  # Cycle through items
            print(f"\n🔄 Starting negotiation {i+1}/{num_negotiations}")
            result = self.run_negotiation(item)
            results.append(result)
            
        # Calculate summary stats
        successful_deals = len([r for r in results if r.result == NegotiationResult.DEAL_ACCEPTED])
        avg_rounds = sum(r.round_number for r in results) / len(results)
        
        self.logger.print_summary_stats(
            len(results),
            successful_deals,
            avg_rounds
        )
        
        return results


def main():
    """Main entry point"""
    
    # Check for API key
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ Error: OPENAI_API_KEY not found in environment variables")
        print("Please create a .env file with your OpenAI API key")
        return
        
    print("🤖 Furniture Negotiation MVP")
    print("Two AI agents will negotiate furniture prices")
    print("-" * 50)
    
    orchestrator = NegotiationOrchestrator()
    
    # Run single negotiation
    items = orchestrator.create_sample_items()
    orchestrator.run_negotiation(items[0])
    
    # Uncomment to run multiple negotiations
    # orchestrator.run_multiple_negotiations(3)


if __name__ == "__main__":
    main()