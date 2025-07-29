#!/usr/bin/env python3

"""
INTERACTIVE MARKETPLACE TESTING INTERFACE

This provides a hands-on interface to test and understand the marketplace system:

🎮 INTERACTIVE FEATURES:
1. Create custom furniture listings with your own prices
2. Select specific AI buyers to negotiate 
3. Monitor negotiations in real-time
4. Manually confirm or reject deals
5. Run automated demos to see full system capabilities

🔧 PERFECT FOR:
- Understanding how the system works step-by-step
- Testing edge cases and different scenarios  
- Learning how different buyer personalities behave
- Experimenting with pricing strategies
- Debugging and development

Use this when you want full control over the marketplace testing process!
"""

from scalable_orchestrator import ScalableMarketplaceOrchestrator, UserRole
from models import FurnitureItem, FurnitureType
import time

def interactive_marketplace_test():
    """Interactive test where you can control the marketplace"""
    
    print("🎮 INTERACTIVE MARKETPLACE TEST")
    print("="*50)
    
    orchestrator = ScalableMarketplaceOrchestrator(max_concurrent_negotiations=20)
    
    # Pre-register some users for quick testing
    print("Setting up test users...")
    seller_id = orchestrator.register_user("Your Seller", UserRole.SELLER, "Standard Seller")
    
    buyer_personalities = [
        ("Premium Buyer", "Premium Buyer", (800, 3000)),
        ("Budget Shopper", "Budget Shopper", (100, 800)),
        ("Value Hunter", "Value Hunter", (300, 1200)),
        ("Quick Cash", "Quick Cash Buyer", (500, 2000)),
        ("Bargain Hunter", "Bargain Hunter", (100, 600))
    ]
    
    buyer_ids = {}
    for name, personality, budget in buyer_personalities:
        user_id = orchestrator.register_user(name, UserRole.BUYER, personality, budget)
        buyer_ids[name] = user_id
        print(f"   ✅ {name} registered")
    
    while True:
        print(f"\n🎯 MARKETPLACE MENU")
        print("1. Create a furniture listing")
        print("2. Show active listings") 
        print("3. Start negotiations for a listing")
        print("4. Check negotiation status")
        print("5. Confirm pending deals")
        print("6. Run full auto-demo")
        print("7. Exit")
        
        choice = input("\nChoose option (1-7): ").strip()
        
        if choice == "1":
            # Create listing
            print(f"\nCreate a new listing:")
            name = input("Item name: ") or "Test Item"
            price = float(input("Asking price ($): ") or "500")
            min_price = float(input("Minimum price ($): ") or str(price * 0.6))
            
            item = FurnitureItem(
                name=name,
                furniture_type=FurnitureType.COUCH,
                starting_price=price,
                condition="good",
                description=f"A nice {name.lower()}"
            )
            
            listing_id = orchestrator.create_listing(seller_id, item, price, min_price)
            print(f"✅ Created listing: {name} for ${price}")
            
        elif choice == "2":
            # Show listings
            listings = orchestrator.get_active_listings()
            if listings:
                print(f"\n📋 ACTIVE LISTINGS ({len(listings)}):")
                for i, listing in enumerate(listings, 1):
                    interested = len(listing.interested_buyers)
                    active_negs = len(listing.active_negotiations)
                    print(f"   {i}. {listing.item.name} - ${listing.asking_price}")
                    print(f"      Status: {listing.listing_status.value}")
                    print(f"      Interested: {interested}, Active negotiations: {active_negs}")
            else:
                print("No active listings")
                
        elif choice == "3":
            # Start negotiations
            listings = orchestrator.get_active_listings()
            if not listings:
                print("No active listings to negotiate for")
                continue
                
            print(f"\nSelect listing to negotiate for:")
            for i, listing in enumerate(listings, 1):
                print(f"   {i}. {listing.item.name} - ${listing.asking_price}")
            
            try:
                listing_idx = int(input("Listing number: ")) - 1
                listing = listings[listing_idx]
                
                print(f"\nSelect buyers to negotiate:")
                for i, (name, buyer_id) in enumerate(buyer_ids.items(), 1):
                    print(f"   {i}. {name}")
                print(f"   {len(buyer_ids)+1}. All buyers")
                
                buyer_choice = input("Buyer selection: ").strip()
                
                if buyer_choice == str(len(buyer_ids)+1):
                    # All buyers
                    selected_buyers = list(buyer_ids.values())
                else:
                    # Single buyer
                    buyer_idx = int(buyer_choice) - 1
                    buyer_name = list(buyer_ids.keys())[buyer_idx]
                    selected_buyers = [buyer_ids[buyer_name]]
                
                print(f"\nStarting negotiations...")
                for buyer_id in selected_buyers:
                    orchestrator.express_interest(buyer_id, listing.listing_id)
                    neg_id = orchestrator.start_negotiation(buyer_id, listing.listing_id)
                    if neg_id:
                        buyer_name = orchestrator.users[buyer_id].name
                        print(f"   🤝 Started with {buyer_name}")
                        
            except (ValueError, IndexError):
                print("Invalid selection")
                
        elif choice == "4":
            # Check status
            negotiations = list(orchestrator.negotiations.values())
            if negotiations:
                print(f"\n🔄 ACTIVE NEGOTIATIONS ({len(negotiations)}):")
                for neg in negotiations:
                    buyer_name = orchestrator.users[neg.buyer_user_id].name
                    listing = orchestrator.listings[neg.listing_id]
                    rounds = neg.negotiation_state.round_number
                    print(f"   {buyer_name} → {listing.item.name} ({neg.status}, {rounds} rounds)")
            else:
                print("No active negotiations")
                
            pending = list(orchestrator.pending_deals.values())
            if pending:
                print(f"\n💰 PENDING DEALS ({len(pending)}):")
                for deal in pending:
                    buyer_name = orchestrator.users[deal.buyer_user_id].name
                    listing = orchestrator.listings[deal.listing_id]
                    print(f"   {buyer_name} → {listing.item.name}: ${deal.agreed_price:.2f}")
                    
        elif choice == "5":
            # Confirm deals
            pending = list(orchestrator.pending_deals.values())
            if not pending:
                print("No pending deals")
                continue
                
            print(f"\n💰 PENDING DEALS:")
            for i, deal in enumerate(pending, 1):
                buyer_name = orchestrator.users[deal.buyer_user_id].name
                listing = orchestrator.listings[deal.listing_id]
                print(f"   {i}. {buyer_name} → {listing.item.name}: ${deal.agreed_price:.2f}")
            
            try:
                deal_idx = int(input("Deal to confirm (number): ")) - 1
                deal = pending[deal_idx]
                
                confirm = input("Accept deal? (y/n): ").lower() == 'y'
                
                # Auto-confirm from both sides for demo
                orchestrator.confirm_deal(deal.buyer_user_id, deal.deal_id, confirm)
                orchestrator.confirm_deal(deal.seller_user_id, deal.deal_id, confirm)
                
                if confirm:
                    print("✅ Deal confirmed!")
                else:
                    print("❌ Deal rejected")
                    
            except (ValueError, IndexError):
                print("Invalid selection")
                
        elif choice == "6":
            # Auto demo
            print(f"\n🤖 Running auto-demo...")
            
            # Create sample item
            item = FurnitureItem(
                name="Demo Couch",
                furniture_type=FurnitureType.COUCH,
                starting_price=800.0,
                condition="excellent",
                description="Beautiful demo couch"
            )
            
            listing_id = orchestrator.create_listing(seller_id, item, 800.0, 500.0)
            
            # All buyers express interest and negotiate
            negotiations = []
            for buyer_id in buyer_ids.values():
                orchestrator.express_interest(buyer_id, listing_id)
                neg_id = orchestrator.start_negotiation(buyer_id, listing_id)
                if neg_id:
                    negotiations.append(neg_id)
            
            print(f"   Started {len(negotiations)} negotiations")
            print("   Waiting for completion...")
            
            # Monitor
            completed = 0
            while completed < len(negotiations):
                time.sleep(1)
                
                for neg_id in negotiations:
                    if neg_id in orchestrator.negotiations:
                        nego = orchestrator.negotiations[neg_id]
                        if nego.status in ["completed", "failed"]:
                            buyer_name = orchestrator.users[nego.buyer_user_id].name
                            if nego.status == "completed":
                                price = nego.negotiation_state.final_price
                                print(f"   ✅ {buyer_name}: ${price:.2f}")
                            else:
                                print(f"   ❌ {buyer_name}: No deal")
                            completed += 1
            
            # Auto-confirm all pending deals
            pending = list(orchestrator.pending_deals.values())
            for deal in pending:
                orchestrator.confirm_deal(deal.buyer_user_id, deal.deal_id, True)
                orchestrator.confirm_deal(deal.seller_user_id, deal.deal_id, True)
            
            print(f"   ✅ Demo completed!")
            
        elif choice == "7":
            print("👋 Shutting down...")
            orchestrator.shutdown()
            break
            
        else:
            print("Invalid choice")

if __name__ == "__main__":
    interactive_marketplace_test()