#!/usr/bin/env python3

"""Test full AI negotiation chain"""

from app import app
from models.database import db, Item, User, Negotiation, Offer, FurnitureType, NegotiationStatus, OfferType
from services.ai_negotiation import schedule_ai_response, AITurns
import time

def test_full_negotiation():
    with app.app_context():
        # Create test negotiation with $750 initial offer
        negotiation = Negotiation.query.filter_by(id=6).first()
        if not negotiation:
            print("❌ No test negotiation found")
            return
            
        print(f"🎯 Testing full negotiation chain for ID: {negotiation.id}")
        print(f"📊 Starting: Round {negotiation.round_number}, Status: {negotiation.status.value}")
        
        # Run multiple rounds
        for round_num in range(6):  # Test 6 rounds max
            db.session.refresh(negotiation)
            
            if negotiation.status != NegotiationStatus.ACTIVE:
                print(f"✅ Negotiation ended with status: {negotiation.status.value}")
                break
                
            print(f"\n--- Round {negotiation.round_number + 1} ---")
            
            # Determine whose turn it is based on last offer
            last_offer = Offer.query.filter_by(negotiation_id=negotiation.id).order_by(Offer.round_number.desc()).first()
            
            if last_offer.offer_type == OfferType.BUYER:
                print("🤖 AI Seller's turn...")
                AITurns.process_ai_seller_response(negotiation.id)
            else:
                print("🤖 AI Buyer's turn...")  
                AITurns.process_ai_buyer_response(negotiation.id)
            
            # Check results
            db.session.refresh(negotiation)
            print(f"📊 After AI: Round {negotiation.round_number}, Offer: ${negotiation.current_offer}, Status: {negotiation.status.value}")
            
            time.sleep(1)  # Small delay
        
        # Show final results
        offers = Offer.query.filter_by(negotiation_id=negotiation.id).order_by(Offer.round_number).all()
        print(f"\n🏁 Final Results:")
        print(f"   Status: {negotiation.status.value}")
        print(f"   Final Price: ${negotiation.final_price if negotiation.final_price else negotiation.current_offer}")
        print(f"   Total Rounds: {len(offers)}")
        
        print(f"\n📝 Full Negotiation History:")
        for offer in offers:
            print(f"   Round {offer.round_number}: {offer.offer_type.value.upper()} - ${offer.price} - {offer.message}")

if __name__ == '__main__':
    test_full_negotiation()