#!/usr/bin/env python3

from scalable_orchestrator import ScalableMarketplaceOrchestrator, UserRole
from models import FurnitureItem, FurnitureType
import time

def test_basic_functionality():
    """Test basic orchestrator functionality step by step"""
    
    print("🧪 TESTING SCALABLE ORCHESTRATOR")
    print("="*50)
    
    # Initialize
    orchestrator = ScalableMarketplaceOrchestrator(max_concurrent_negotiations=10)
    
    print("\n1️⃣ Testing User Registration...")
    # Register users
    seller_id = orchestrator.register_user("Test Seller", UserRole.SELLER, "Standard Seller")
    buyer1_id = orchestrator.register_user("Buyer Premium", UserRole.BUYER, "Premium Buyer", (500, 2000))
    buyer2_id = orchestrator.register_user("Buyer Budget", UserRole.BUYER, "Budget Shopper", (100, 800))
    
    print(f"   ✅ Registered seller: {seller_id[:8]}")
    print(f"   ✅ Registered buyer 1: {buyer1_id[:8]}")
    print(f"   ✅ Registered buyer 2: {buyer2_id[:8]}")
    
    print("\n2️⃣ Testing Item Listing...")
    # Create listing
    item = FurnitureItem(
        name="Test Couch",
        furniture_type=FurnitureType.COUCH,
        starting_price=500.0,
        condition="good",
        description="A nice test couch"
    )
    
    listing_id = orchestrator.create_listing(seller_id, item, 500.0, 300.0)
    print(f"   ✅ Created listing: {listing_id[:8]}")
    
    print("\n3️⃣ Testing Buyer Interest...")
    # Express interest
    success1 = orchestrator.express_interest(buyer1_id, listing_id)
    success2 = orchestrator.express_interest(buyer2_id, listing_id)
    
    print(f"   ✅ Buyer 1 interest: {success1}")
    print(f"   ✅ Buyer 2 interest: {success2}")
    
    print("\n4️⃣ Testing Negotiations...")
    # Start negotiations
    neg1_id = orchestrator.start_negotiation(buyer1_id, listing_id)
    neg2_id = orchestrator.start_negotiation(buyer2_id, listing_id)
    
    print(f"   ✅ Started negotiation 1: {neg1_id[:8] if neg1_id else 'Failed'}")
    print(f"   ✅ Started negotiation 2: {neg2_id[:8] if neg2_id else 'Failed'}")
    
    print("\n5️⃣ Monitoring Negotiations...")
    print("   Waiting for negotiations to complete...")
    
    # Wait for completion
    completed = 0
    while completed < 2:
        time.sleep(1)
        
        for neg_id in [neg1_id, neg2_id]:
            if neg_id and neg_id in orchestrator.negotiations:
                nego = orchestrator.negotiations[neg_id]
                if nego.status in ["completed", "failed"]:
                    buyer_name = orchestrator.users[nego.buyer_user_id].name
                    if nego.status == "completed":
                        price = nego.negotiation_state.final_price
                        print(f"   ✅ {buyer_name}: Deal at ${price:.2f}")
                    else:
                        print(f"   ❌ {buyer_name}: No deal")
                    completed += 1
    
    print("\n6️⃣ Testing Deal Confirmation...")
    # Check for pending deals
    pending_deals = orchestrator.get_pending_deals_for_user(seller_id)
    if pending_deals:
        deal = pending_deals[0]
        print(f"   📋 Pending deal: ${deal.agreed_price:.2f}")
        
        # Confirm from both sides
        orchestrator.confirm_deal(deal.buyer_user_id, deal.deal_id, True)
        orchestrator.confirm_deal(deal.seller_user_id, deal.deal_id, True)
        print(f"   ✅ Deal confirmed!")
    
    print("\n7️⃣ Final Status...")
    active_listings = orchestrator.get_active_listings()
    print(f"   Active listings: {len(active_listings)}")
    
    # Cleanup
    orchestrator.shutdown()
    print("\n🎉 Test completed successfully!")

if __name__ == "__main__":
    test_basic_functionality()