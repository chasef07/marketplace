#!/usr/bin/env python3

"""
AI AGENT MARKETPLACE DEMO

This is a comprehensive demo showing a fully functional AI marketplace where:

🎯 WHAT IT DEMONSTRATES:
- 5 sellers with different furniture items  
- 10 buyers with distinct AI personalities (Premium, Budget, etc.)
- 15-20 concurrent negotiations running simultaneously
- Realistic market dynamics with bidding competition
- Complete deal lifecycle from interest → negotiation → confirmation

🚀 KEY FEATURES SHOWCASED:
- Scalable concurrent processing (18+ simultaneous negotiations)
- Human-like agent behaviors based on personality profiles
- Multi-buyer competition creating market pressure
- Automatic deal confirmation simulation
- Real-time monitoring and progress reporting

📊 EXPECTED RESULTS:
- ~80% success rate for negotiations
- Realistic price settlements (20-30% off asking prices)
- Different buyer personalities showing distinct strategies
- Some failed negotiations (adding realism)

Run this to see the full power of the marketplace system!
"""

import time
import random
from typing import List, Dict
from scalable_orchestrator import ScalableMarketplaceOrchestrator, UserRole
from models import FurnitureItem, FurnitureType


class AgentMarketplaceDemo:
    """Demo interface for the scalable agent marketplace"""
    
    def __init__(self):
        self.orchestrator = ScalableMarketplaceOrchestrator(max_concurrent_negotiations=50)
        self.buyer_personalities = [
            "Quick Cash Buyer",
            "Budget Shopper", 
            "Value Hunter",
            "Premium Buyer",
            "Bargain Hunter",
            "Quality Seeker",
            "Impulse Buyer",
            "Careful Buyer",
            "Fair Deal Buyer",
            "Flexible Buyer"
        ]
        
    def create_sample_users(self) -> Dict[str, str]:
        """Create sample buyers and sellers"""
        users = {}
        
        # Create sellers
        sellers = ["Alice", "Bob", "Carol", "David", "Emma"]
        for seller_name in sellers:
            user_id = self.orchestrator.register_user(
                name=seller_name,
                role=UserRole.SELLER,
                agent_personality="Standard Seller",
                budget_range=(0, 50000)  # Not used for sellers
            )
            users[f"seller_{seller_name.lower()}"] = user_id
            print(f"✅ Registered seller: {seller_name}")
        
        # Create buyers with different personalities
        for i, personality in enumerate(self.buyer_personalities):
            buyer_name = f"Buyer_{i+1}"
            
            # Set budget ranges based on personality
            budget_ranges = {
                "Quick Cash Buyer": (500, 2000),
                "Budget Shopper": (100, 800),
                "Value Hunter": (300, 1200),
                "Premium Buyer": (800, 3000),
                "Bargain Hunter": (100, 600),
                "Quality Seeker": (600, 2500),
                "Impulse Buyer": (400, 1500),
                "Careful Buyer": (200, 1000),
                "Fair Deal Buyer": (400, 1800),
                "Flexible Buyer": (500, 2000)
            }
            
            budget_range = budget_ranges.get(personality, (300, 1500))
            
            user_id = self.orchestrator.register_user(
                name=buyer_name,
                role=UserRole.BUYER,
                agent_personality=personality,
                budget_range=budget_range
            )
            users[f"buyer_{personality.lower().replace(' ', '_')}"] = user_id
            print(f"✅ Registered buyer: {buyer_name} ({personality})")
        
        return users
    
    def create_sample_listings(self, users: Dict[str, str]) -> List[str]:
        """Create sample furniture listings"""
        listings = []
        
        # Sample furniture items
        furniture_items = [
            {
                "name": "Vintage Leather Couch",
                "type": FurnitureType.COUCH,
                "asking_price": 800.0,
                "minimum_price": 500.0,
                "condition": "good",
                "description": "Comfortable 3-seat leather couch, minor wear on armrests"
            },
            {
                "name": "Modern Queen Bed Frame",
                "type": FurnitureType.COUCH,  # Using couch as placeholder
                "asking_price": 600.0,
                "minimum_price": 350.0,
                "condition": "excellent",
                "description": "Sleek modern bed frame, barely used"
            },
            {
                "name": "Oak Dining Table",
                "type": FurnitureType.DINING_TABLE,
                "asking_price": 400.0,
                "minimum_price": 250.0,
                "condition": "good",
                "description": "Solid oak dining table, seats 6 people"
            },
            {
                "name": "Antique Wooden Bookshelf",
                "type": FurnitureType.BOOKSHELF,
                "asking_price": 300.0,
                "minimum_price": 180.0,
                "condition": "fair",
                "description": "Classic wooden bookshelf with character marks"
            },
            {
                "name": "Designer Office Chair",
                "type": FurnitureType.COUCH,  # Using couch as placeholder
                "asking_price": 250.0,
                "minimum_price": 150.0,
                "condition": "like new",
                "description": "Ergonomic office chair with lumbar support"
            }
        ]
        
        # Create listings with different sellers
        seller_keys = [k for k in users.keys() if k.startswith("seller_")]
        
        for i, item_data in enumerate(furniture_items):
            seller_key = seller_keys[i % len(seller_keys)]  # Rotate through sellers
            seller_id = users[seller_key]
            
            item = FurnitureItem(
                name=item_data["name"],
                furniture_type=item_data["type"],
                starting_price=item_data["asking_price"],
                condition=item_data["condition"],
                description=item_data["description"]
            )
            
            listing_id = self.orchestrator.create_listing(
                seller_user_id=seller_id,
                item=item,
                asking_price=item_data["asking_price"],
                minimum_price=item_data["minimum_price"],
                duration_days=7
            )
            
            listings.append(listing_id)
            print(f"📋 Listed: {item.name} for ${item_data['asking_price']:.2f}")
        
        return listings
    
    def simulate_marketplace_activity(self, users: Dict[str, str], listings: List[str]) -> None:
        """Simulate realistic marketplace activity"""
        
        print(f"\n🏪 MARKETPLACE SIMULATION")
        print(f"📊 {len(listings)} active listings")
        print(f"👥 {len([k for k in users.keys() if k.startswith('buyer_')])} potential buyers")
        print("="*60)
        
        # Get buyer user IDs
        buyer_ids = [users[k] for k in users.keys() if k.startswith("buyer_")]
        
        # Simulate buyer interest and negotiations
        active_negotiations = []
        
        for listing_id in listings:
            listing = self.orchestrator.listings[listing_id]
            print(f"\n🪑 {listing.item.name} (${listing.asking_price:.2f})")
            
            # Random number of interested buyers (2-6)
            num_interested = random.randint(2, min(6, len(buyer_ids)))
            interested_buyers = random.sample(buyer_ids, num_interested)
            
            print(f"   👀 {num_interested} buyers interested")
            
            # Express interest and start negotiations
            for buyer_id in interested_buyers:
                buyer_name = self.orchestrator.users[buyer_id].name
                personality = self.orchestrator.users[buyer_id].agent_personality
                
                # Express interest
                if self.orchestrator.express_interest(buyer_id, listing_id):
                    print(f"   📩 {buyer_name} ({personality}) expressed interest")
                    
                    # Start negotiation with some probability
                    if random.random() < 0.8:  # 80% chance to start negotiation
                        negotiation_id = self.orchestrator.start_negotiation(buyer_id, listing_id)
                        if negotiation_id:
                            active_negotiations.append(negotiation_id)
                            print(f"   🤝 Started negotiation with {buyer_name}")
        
        print(f"\n⚡ {len(active_negotiations)} concurrent negotiations started!")
        print("   Negotiations running in background...")
        
        # Wait for negotiations to complete
        self._monitor_negotiations(active_negotiations)
    
    def _monitor_negotiations(self, negotiation_ids: List[str]) -> None:
        """Monitor ongoing negotiations"""
        completed = set()
        
        print(f"\n🔄 MONITORING NEGOTIATIONS")
        print("="*40)
        
        while len(completed) < len(negotiation_ids):
            time.sleep(2)  # Check every 2 seconds
            
            for neg_id in negotiation_ids:
                if neg_id in completed:
                    continue
                    
                if neg_id not in self.orchestrator.negotiations:
                    completed.add(neg_id)
                    continue
                
                negotiation = self.orchestrator.negotiations[neg_id]
                
                if negotiation.status in ["completed", "failed"]:
                    completed.add(neg_id)
                    
                    listing = self.orchestrator.listings[negotiation.listing_id]
                    buyer_name = self.orchestrator.users[negotiation.buyer_user_id].name
                    
                    if negotiation.status == "completed":
                        final_price = negotiation.negotiation_state.final_price
                        print(f"✅ {buyer_name} → {listing.item.name}: ${final_price:.2f}")
                    else:
                        print(f"❌ {buyer_name} → {listing.item.name}: No deal")
        
        print(f"\n🏁 All negotiations completed!")
        self._show_marketplace_summary()
    
    def _show_marketplace_summary(self) -> None:
        """Show final marketplace summary"""
        print(f"\n📈 MARKETPLACE SUMMARY")
        print("="*50)
        
        # Pending deals
        pending_deals = list(self.orchestrator.pending_deals.values())
        if pending_deals:
            print(f"\n💰 PENDING DEALS ({len(pending_deals)} awaiting confirmation):")
            for deal in pending_deals:
                listing = self.orchestrator.listings[deal.listing_id]
                buyer_name = self.orchestrator.users[deal.buyer_user_id].name
                seller_name = self.orchestrator.users[deal.seller_user_id].name
                
                print(f"   🤝 {buyer_name} ↔ {seller_name}")
                print(f"      Item: {listing.item.name}")
                print(f"      Price: ${deal.agreed_price:.2f}")
                print(f"      Deal ID: {deal.deal_id}")
                
                # Auto-confirm for demo (in reality, users would do this)
                print(f"      🤖 Auto-confirming for demo...")
                self.orchestrator.confirm_deal(deal.buyer_user_id, deal.deal_id, True)
                self.orchestrator.confirm_deal(deal.seller_user_id, deal.deal_id, True)
        
        # Final stats
        total_listings = len(self.orchestrator.listings)
        sold_listings = len([l for l in self.orchestrator.listings.values() 
                           if l.listing_status.value == "sold"])
        
        print(f"\n📊 FINAL STATISTICS:")
        print(f"   Total Listings: {total_listings}")
        print(f"   Items Sold: {sold_listings}")
        print(f"   Success Rate: {(sold_listings/total_listings)*100:.1f}%")
        
        if sold_listings > 0:
            print(f"\n🎉 SUCCESSFUL SALES:")
            for listing in self.orchestrator.listings.values():
                if listing.listing_status.value == "sold":
                    seller_name = self.orchestrator.users[listing.seller_user_id].name
                    print(f"   ✨ {listing.item.name} sold by {seller_name}")


def main():
    """Run the marketplace demo"""
    print("🏪 AI AGENT MARKETPLACE DEMO")
    print("="*50) 
    
    demo = AgentMarketplaceDemo()
    
    # Setup
    print("\n1️⃣ Creating users...")
    users = demo.create_sample_users()
    
    print(f"\n2️⃣ Creating listings...")
    listings = demo.create_sample_listings(users)
    
    print(f"\n3️⃣ Starting marketplace simulation...")
    demo.simulate_marketplace_activity(users, listings)
    
    # Cleanup
    demo.orchestrator.shutdown()
    print(f"\n👋 Demo completed!")


if __name__ == "__main__":
    main()