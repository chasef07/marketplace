#!/usr/bin/env python3

import os
import time
import random
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from dotenv import load_dotenv

from models import FurnitureItem, FurnitureType, NegotiationState, NegotiationResult, Offer
from agents import BuyerAgent, SellerAgent
from utils import ConversationLogger

load_dotenv()


@dataclass
class BuyerProfile:
    """Profile for creating diverse buyers"""
    name: str
    budget_multiplier: float  # How much of asking price they can afford
    target_multiplier: float  # What they really want to pay
    negotiation_style: str    # aggressive, balanced, conservative
    patience_level: float     # 0.3-1.0, affects acceptance thresholds
    starting_offer_ratio: float  # How low they start (0.4-0.7 of asking)
    increment_size: float     # How much they increase offers (0.02-0.08)
    max_rounds: int = 6       # How many rounds they'll negotiate


@dataclass
class NegotiationSummary:
    """Summary of a single negotiation"""
    buyer_name: str
    buyer_profile: BuyerProfile
    result: NegotiationResult
    final_price: Optional[float]
    rounds_completed: int
    seller_profit_margin: float
    negotiation_history: List[Offer]
    avg_offer_increment: float  # How much buyer increased offers on average


class MarketplaceOrchestrator:
    def __init__(self):
        self.logger = ConversationLogger()
        self.seller = SellerAgent("Marketplace Seller", minimum_multiplier=0.50)
        self.negotiations_log = []
        
    def create_sample_items(self):
        """Create sample furniture items for the marketplace"""
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
    
    def create_buyer_profiles(self) -> List[BuyerProfile]:
        """Create diverse buyer profiles with realistic human-like characteristics"""
        profiles = [
            BuyerProfile("Quick Cash Buyer", 0.85, 0.70, "aggressive", 0.4, 0.65, 0.08, 4),
            BuyerProfile("Budget Shopper", 0.65, 0.50, "conservative", 0.9, 0.45, 0.05, 6),
            BuyerProfile("Value Hunter", 0.75, 0.60, "balanced", 0.7, 0.55, 0.06, 5),
            BuyerProfile("Premium Buyer", 0.95, 0.85, "conservative", 0.5, 0.75, 0.06, 5),
            BuyerProfile("Bargain Hunter", 0.60, 0.45, "aggressive", 0.8, 0.40, 0.04, 6),
            BuyerProfile("Quality Seeker", 0.90, 0.75, "balanced", 0.6, 0.70, 0.06, 5),
            BuyerProfile("Impulse Buyer", 0.80, 0.65, "aggressive", 0.3, 0.60, 0.10, 4),
            BuyerProfile("Careful Buyer", 0.70, 0.55, "conservative", 0.95, 0.50, 0.05, 6),
            BuyerProfile("Fair Deal Buyer", 0.78, 0.65, "balanced", 0.65, 0.58, 0.07, 5),
            BuyerProfile("Flexible Buyer", 0.82, 0.68, "balanced", 0.55, 0.62, 0.08, 4)
        ]
        
        # Add randomization to make each run unique
        for profile in profiles:
            profile.budget_multiplier += random.uniform(-0.04, 0.04)
            profile.target_multiplier += random.uniform(-0.03, 0.03)
            profile.patience_level += random.uniform(-0.1, 0.1)
            profile.starting_offer_ratio += random.uniform(-0.05, 0.05)
            profile.increment_size += random.uniform(-0.01, 0.01)
            
            # Keep values in reasonable bounds
            profile.budget_multiplier = max(0.5, min(1.0, profile.budget_multiplier))
            profile.patience_level = max(0.2, min(1.0, profile.patience_level))
            profile.starting_offer_ratio = max(0.35, min(0.75, profile.starting_offer_ratio))
            profile.increment_size = max(0.015, min(0.1, profile.increment_size))
            
        return profiles
    
    def create_buyer_from_profile(self, profile: BuyerProfile) -> BuyerAgent:
        """Create a buyer agent with realistic human-like behavior"""
        buyer = BuyerAgent(profile.name, budget_multiplier=profile.budget_multiplier)
        buyer.target_price = profile.target_multiplier
        buyer.negotiation_style = profile.negotiation_style
        buyer.patience_level = profile.patience_level
        buyer.starting_offer_ratio = profile.starting_offer_ratio
        buyer.increment_size = profile.increment_size
        buyer.max_rounds = profile.max_rounds
        
        # Make acceptance criteria more human-like based on patience
        # Patient buyers are pickier, impatient buyers accept sooner
        original_acceptance = buyer.should_accept_offer
        def human_like_acceptance(offer_price, item_price):
            base_acceptance = original_acceptance(offer_price, item_price)
            
            # Impatient buyers (low patience) accept more readily
            if profile.patience_level < 0.4:
                # 30% more likely to accept
                return random.random() < (0.3 if base_acceptance else 0.2)
            elif profile.patience_level > 0.8:
                # Patient buyers are pickier - need better deals
                patience_factor = offer_price / (item_price * profile.target_multiplier)
                return patience_factor <= 1.05  # Within 5% of target
            else:
                return base_acceptance
                
        buyer.should_accept_offer = human_like_acceptance
        return buyer
    
    def create_seller_with_realistic_behavior(self) -> SellerAgent:
        """Create seller with more realistic negotiation behavior"""
        seller = SellerAgent("Marketplace Seller", minimum_multiplier=0.50)
        
        # Make seller more human-like - not accepting too quickly
        original_acceptance = seller.should_accept_offer
        def realistic_seller_acceptance(offer_price, item_price):
            # Seller is more reluctant to accept early offers
            # Wants to see if buyer will go higher
            target_price = item_price * 0.75  # Seller really wants 75%
            minimum_price = item_price * seller.minimum_multiplier
            
            # Only accept if offer is very close to target or significantly above minimum
            if offer_price >= target_price * 0.95:  # Within 5% of target
                return True
            elif offer_price >= minimum_price * 1.15:  # 15% above minimum
                return random.random() < 0.4  # 40% chance to accept good offers
            else:
                return False
                
        seller.should_accept_offer = realistic_seller_acceptance
        return seller
    
    def run_private_negotiation(self, item: FurnitureItem, buyer: BuyerAgent, 
                              buyer_profile: BuyerProfile, show_details: bool = False) -> NegotiationSummary:
        """Run a realistic private negotiation with human-like behavior"""
        
        seller = self.create_seller_with_realistic_behavior()
        negotiation = NegotiationState(item=item, max_rounds=buyer_profile.max_rounds)
        
        if show_details:
            self.logger.print_negotiation_start(f"{item.name} vs {buyer.name}", item.starting_price)
        
        # Seller starts with asking price (maybe slightly negotiable)
        opening_price = item.starting_price * random.uniform(0.95, 1.0)  # 0-5% off asking
        seller_opening = Offer(
            price=opening_price,
            message=f"I'm asking ${opening_price:.2f} for this {item.name}. It's in {item.condition} condition.",
            round_number=1,
            agent_type="seller"
        )
        negotiation.add_offer(seller_opening)
        
        if show_details:
            self.logger.print_offer(seller.name, seller_opening.price, seller_opening.message, is_buyer=False)
        
        # Track buyer's offer progression for realism
        buyer_offers = []
        
        # Negotiation loop with more realistic dynamics
        while not negotiation.is_complete():
            # Buyer's turn - start low and gradually increase
            if len(buyer_offers) == 0:
                # First offer - start low based on profile
                buyer_price = item.starting_price * buyer_profile.starting_offer_ratio
            else:
                # Subsequent offers - increase based on increment size and some randomness
                last_offer = buyer_offers[-1]
                increment = item.starting_price * buyer_profile.increment_size
                # Add some human randomness to increments
                increment *= random.uniform(0.7, 1.3)
                buyer_price = min(last_offer + increment, 
                                buyer.get_walk_away_price(item.starting_price))
            
            buyer_offer = Offer(
                price=buyer_price,
                message=f"I can offer ${buyer_price:.2f}. That seems fair for the condition.",
                round_number=negotiation.round_number + 1,
                agent_type="buyer"
            )
            negotiation.add_offer(buyer_offer)
            buyer_offers.append(buyer_price)
            
            if show_details:
                self.logger.print_offer(buyer.name, buyer_offer.price, buyer_offer.message, is_buyer=True)
            
            # Check if seller accepts (using realistic criteria)
            if seller.should_accept_offer(buyer_offer.price, item.starting_price):
                negotiation.result = NegotiationResult.DEAL_ACCEPTED
                negotiation.final_price = buyer_offer.price
                break
            
            # Check if buyer has reached their limit
            if buyer_offer.price >= buyer.get_walk_away_price(item.starting_price):
                negotiation.result = NegotiationResult.NO_DEAL
                break
            
            # Seller's turn to counter (if there are more rounds)
            if negotiation.round_number < negotiation.max_rounds:
                # Seller gradually comes down but not too fast
                current_seller_price = negotiation.offers_history[-2].price if len(negotiation.offers_history) >= 2 else opening_price
                
                # Seller comes down 2-5% each round, with some randomness
                reduction = current_seller_price * random.uniform(0.02, 0.05)
                seller_price = max(current_seller_price - reduction, 
                                 seller.get_walk_away_price(item.starting_price))
                
                seller_counter = Offer(
                    price=seller_price,
                    message=f"I could consider ${seller_price:.2f}. That's already a good deal.",
                    round_number=negotiation.round_number + 1,
                    agent_type="seller"
                )
                negotiation.add_offer(seller_counter)
                
                if show_details:
                    self.logger.print_offer(seller.name, seller_counter.price, seller_counter.message, is_buyer=False)
                
                # Check if buyer accepts seller's counter
                if buyer.should_accept_offer(seller_counter.price, item.starting_price):
                    negotiation.result = NegotiationResult.DEAL_ACCEPTED
                    negotiation.final_price = seller_counter.price
                    break
                
                # Check if seller has reached minimum
                if seller_counter.price <= seller.get_walk_away_price(item.starting_price):
                    negotiation.result = NegotiationResult.NO_DEAL
                    break
            
            if show_details:
                time.sleep(0.3)
        
        # Handle max rounds reached
        if negotiation.result == NegotiationResult.IN_PROGRESS:
            negotiation.result = NegotiationResult.NO_DEAL
        
        if show_details:
            self.logger.print_negotiation_end(negotiation.result, negotiation.final_price)
        
        # Calculate metrics
        seller_minimum = seller.get_walk_away_price(item.starting_price)
        profit_margin = 0.0
        if negotiation.final_price:
            profit_margin = (negotiation.final_price - seller_minimum) / seller_minimum
        
        avg_increment = 0.0
        if len(buyer_offers) > 1:
            increments = [buyer_offers[i] - buyer_offers[i-1] for i in range(1, len(buyer_offers))]
            avg_increment = sum(increments) / len(increments) if increments else 0.0
        
        return NegotiationSummary(
            buyer_name=buyer.name,
            buyer_profile=buyer_profile,
            result=negotiation.result,
            final_price=negotiation.final_price,
            rounds_completed=negotiation.round_number,
            seller_profit_margin=profit_margin,
            negotiation_history=negotiation.offers_history.copy(),
            avg_offer_increment=avg_increment
        )
    
    def run_bidding_war(self, item: FurnitureItem, competing_buyers: List[Tuple[BuyerAgent, BuyerProfile]], 
                       current_best_price: float) -> Optional[NegotiationSummary]:
        """Run a bidding war when multiple buyers have similar offers"""
        
        print(f"\n🔥 BIDDING WAR! Multiple buyers offered similar prices around ${current_best_price:.2f}")
        print(f"   Asking competing buyers if they want to increase their offers...")
        
        final_bids = []
        
        for buyer, profile in competing_buyers:
            # Give buyer a chance to increase their offer
            max_budget = buyer.get_walk_away_price(item.starting_price)
            
            # Simulate asking buyer if they want to bid higher
            if current_best_price < max_budget * 0.95:  # If they have room to go higher
                # Buyer decides whether to bid higher based on their profile
                will_bid_higher = False
                
                if profile.negotiation_style == "aggressive":
                    will_bid_higher = random.random() < 0.8  # 80% chance
                elif profile.negotiation_style == "balanced":
                    will_bid_higher = random.random() < 0.6  # 60% chance
                else:  # conservative
                    will_bid_higher = random.random() < 0.3  # 30% chance
                
                if will_bid_higher:
                    # Increase bid by 1-4% of original asking price
                    increase = item.starting_price * random.uniform(0.01, 0.04)
                    new_bid = min(current_best_price + increase, max_budget)
                    
                    final_bid = NegotiationSummary(
                        buyer_name=buyer.name,
                        buyer_profile=profile,
                        result=NegotiationResult.DEAL_ACCEPTED,
                        final_price=new_bid,
                        rounds_completed=1,  # Bidding war is quick
                        seller_profit_margin=(new_bid - item.starting_price * 0.5) / (item.starting_price * 0.5),
                        negotiation_history=[],
                        avg_offer_increment=increase
                    )
                    final_bids.append(final_bid)
                    print(f"   💰 {buyer.name} increases bid to ${new_bid:.2f}")
                else:
                    print(f"   🤷 {buyer.name} sticks with original offer")
            else:
                print(f"   💸 {buyer.name} is at their maximum budget")
        
        if final_bids:
            # Return the highest bidder
            winner = max(final_bids, key=lambda x: x.final_price)
            print(f"   🏆 {winner.buyer_name} wins the bidding war at ${winner.final_price:.2f}!")
            return winner
        else:
            print(f"   😐 No one increased their bids")
            return None
    
    def run_marketplace_listing(self, item: FurnitureItem, num_buyers: int = 10) -> Dict:
        """Run marketplace with realistic negotiations and bidding wars"""
        
        print(f"\n🏪 MARKETPLACE LISTING")
        print(f"🪑 Item: {item.name}")
        print(f"💰 Listed Price: ${item.starting_price}")
        print(f"👥 Interested Buyers: {num_buyers}")
        print("="*60)
        
        # Create buyer profiles and agents
        buyer_profiles = self.create_buyer_profiles()[:num_buyers]
        buyers = [self.create_buyer_from_profile(profile) for profile in buyer_profiles]
        
        # Run private negotiations with each buyer
        print(f"🤝 Running private negotiations...")
        negotiations = []
        
        for i, (buyer, profile) in enumerate(zip(buyers, buyer_profiles)):
            print(f"   Negotiating with {buyer.name}... ", end="", flush=True)
            
            summary = self.run_private_negotiation(item, buyer, profile, show_details=False)
            negotiations.append(summary)
            
            # Status with more detail
            if summary.result == NegotiationResult.DEAL_ACCEPTED:
                print(f"✅ Deal at ${summary.final_price:.2f} ({summary.rounds_completed} rounds)")
            else:
                print(f"❌ No deal ({summary.rounds_completed} rounds)")
        
        # Analyze successful deals
        successful_deals = [n for n in negotiations if n.result == NegotiationResult.DEAL_ACCEPTED]
        
        print(f"\n📊 NEGOTIATION RESULTS")
        print("="*60)
        print(f"Total Interested Buyers: {len(negotiations)}")
        print(f"Successful Negotiations: {len(successful_deals)}")
        
        chosen_buyer = None
        if successful_deals:
            # Check for similar offers that might trigger a bidding war
            if len(successful_deals) >= 2:
                # Sort by price
                sorted_deals = sorted(successful_deals, key=lambda x: x.final_price, reverse=True)
                best_price = sorted_deals[0].final_price
                
                # Find deals within 3% of best price
                close_deals = [d for d in sorted_deals if abs(d.final_price - best_price) / best_price <= 0.03]
                
                if len(close_deals) >= 2:
                    # Trigger bidding war
                    competing_pairs = [(self.create_buyer_from_profile(d.buyer_profile), d.buyer_profile) 
                                     for d in close_deals]
                    bidding_winner = self.run_bidding_war(item, competing_pairs, best_price)
                    
                    if bidding_winner:
                        chosen_buyer = bidding_winner
                    else:
                        # No one bid higher, stick with original best
                        chosen_buyer = sorted_deals[0]
                else:
                    chosen_buyer = sorted_deals[0]
            else:
                chosen_buyer = successful_deals[0]
            
            print(f"\n🎯 SELLER'S CHOICE")
            print("="*40)
            print(f"✨ Chosen Buyer: {chosen_buyer.buyer_name}")
            print(f"💰 Final Price: ${chosen_buyer.final_price:.2f}")
            print(f"📈 Seller Profit: {chosen_buyer.seller_profit_margin:.1%} above minimum")
            print(f"🔄 Rounds: {chosen_buyer.rounds_completed}")
            
            # Show pricing analysis
            savings_pct = (item.starting_price - chosen_buyer.final_price) / item.starting_price * 100
            print(f"💸 Buyer Savings: {savings_pct:.1f}% off asking price")
            
            # Show other competitive offers
            other_deals = [d for d in successful_deals if d.buyer_name != chosen_buyer.buyer_name]
            if other_deals:
                print(f"\n📋 Other Competitive Offers:")
                for deal in sorted(other_deals, key=lambda x: x.final_price, reverse=True)[:5]:
                    print(f"   {deal.buyer_name}: ${deal.final_price:.2f} ({deal.rounds_completed} rounds)")
        else:
            print(f"\n😞 NO DEALS MADE")
            print("All negotiations failed - seller keeps the item")
        
        # Store negotiations for later viewing
        self.negotiations_log = negotiations
        
        return {
            "item": item,
            "all_negotiations": negotiations,
            "successful_deals": successful_deals,
            "chosen_buyer": chosen_buyer,
            "total_buyers": len(negotiations),
            "success_rate": len(successful_deals) / len(negotiations) * 100 if negotiations else 0,
            "avg_rounds": sum(n.rounds_completed for n in negotiations) / len(negotiations),
            "price_range": (min(d.final_price for d in successful_deals), max(d.final_price for d in successful_deals)) if successful_deals else None
        }
    
    def show_detailed_negotiations(self):
        """Show detailed view of all negotiations from the last marketplace listing"""
        if not self.negotiations_log:
            print("No negotiations to show. Run a marketplace listing first.")
            return
        
        print(f"\n🔍 DETAILED NEGOTIATION HISTORY")
        print("="*60)
        
        for i, negotiation in enumerate(self.negotiations_log, 1):
            print(f"\n📝 Negotiation #{i}: {negotiation.buyer_name}")
            print("-" * 40)
            profile = negotiation.buyer_profile
            print(f"Profile: {profile.negotiation_style} style, "
                  f"budget {profile.budget_multiplier:.0%}, "
                  f"patience {profile.patience_level:.1f}")
            print(f"Strategy: Start at {profile.starting_offer_ratio:.0%}, "
                  f"increment {profile.increment_size:.1%}")
            print(f"Result: {'✅ DEAL' if negotiation.result == NegotiationResult.DEAL_ACCEPTED else '❌ NO DEAL'}")
            
            if negotiation.final_price:
                print(f"Final Price: ${negotiation.final_price:.2f}")
                print(f"Avg Increment: ${negotiation.avg_offer_increment:.2f}")
            
            print(f"Rounds: {negotiation.rounds_completed}")
            print("\nNegotiation Flow:")
            
            for offer in negotiation.negotiation_history:
                agent_type = "🏪 SELLER" if offer.agent_type == "seller" else "👤 BUYER "
                print(f"  {agent_type}: ${offer.price:.2f} - {offer.message}")
            
            print()


def main():
    """Main entry point for marketplace negotiations"""
    
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ Error: OPENAI_API_KEY not found in environment variables")
        return
        
    print("🏪 Enhanced Furniture Marketplace System")
    print("Realistic negotiations with bidding wars and human-like behavior")
    print("-" * 60)
    
    orchestrator = MarketplaceOrchestrator()
    items = orchestrator.create_sample_items()
    
    while True:
        print("\n🎮 Choose an option:")
        print("1. Run Marketplace Listing (Seller vs Multiple Buyers)")
        print("2. View Detailed Negotiations from Last Run")
        print("3. Exit")
        
        choice = input("\nEnter choice (1-3): ").strip()
        
        if choice == "1":
            # Choose item
            print("\nSelect an item to list:")
            for i, item in enumerate(items, 1):
                print(f"{i}. {item.name} - ${item.starting_price}")
            
            try:
                item_choice = int(input("Enter item number: ")) - 1
                if 0 <= item_choice < len(items):
                    num_buyers = int(input("Number of buyers (default 10): ") or "10")
                    result = orchestrator.run_marketplace_listing(items[item_choice], num_buyers)
                    
                    # Show summary stats
                    print(f"\n📈 SUMMARY STATS")
                    print(f"Average rounds per negotiation: {result['avg_rounds']:.1f}")
                    if result['price_range']:
                        print(f"Price range: ${result['price_range'][0]:.2f} - ${result['price_range'][1]:.2f}")
                else:
                    print("Invalid item selection")
            except ValueError:
                print("Invalid input")
                
        elif choice == "2":
            orchestrator.show_detailed_negotiations()
                
        elif choice == "3":
            print("👋 Thanks for using the Enhanced Furniture Marketplace!")
            break
            
        else:
            print("Invalid choice. Please enter 1-3.")


if __name__ == "__main__":
    main()