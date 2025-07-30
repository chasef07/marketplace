#!/usr/bin/env python3

"""
Debug script to test AI negotiation system
"""

from app import app
from models.database import db, Item, User, Negotiation, Offer, FurnitureType, NegotiationStatus, OfferType
from services.ai_negotiation import schedule_ai_response, AITurns
import time

def test_ai_negotiation():
    with app.app_context():
        # Create or get test users
        seller = User.query.filter_by(username='testseller').first()
        if not seller:
            seller = User(username='testseller', email='seller@test.com')
            seller.set_password('password')
            db.session.add(seller)
        
        buyer = User.query.filter_by(username='testbuyer').first()
        if not buyer:
            buyer = User(username='testbuyer', email='buyer@test.com')
            buyer.set_password('password')
            db.session.add(buyer)
        
        db.session.commit()
        
        # Create test item
        item = Item(
            user_id=seller.id,
            name='Debug Test Couch',
            description='Testing AI negotiation',
            furniture_type=FurnitureType.COUCH,
            starting_price=1000.0,
            min_price=600.0,
            condition='good'
        )
        db.session.add(item)
        db.session.commit()
        
        # Create test negotiation
        negotiation = Negotiation(
            item_id=item.id,
            seller_id=seller.id,
            buyer_id=buyer.id,
            status=NegotiationStatus.ACTIVE,
            current_offer=750.0,
            round_number=1
        )
        db.session.add(negotiation)
        db.session.commit()
        
        # Add initial buyer offer
        initial_offer = Offer(
            negotiation_id=negotiation.id,
            offer_type=OfferType.BUYER,
            price=750.0,
            message="I'd like to offer $750 for your couch",
            round_number=1
        )
        db.session.add(initial_offer)
        db.session.commit()
        
        print(f"✅ Created test negotiation ID: {negotiation.id}")
        print(f"📊 Initial state: Round {negotiation.round_number}, Offer: ${negotiation.current_offer}")
        
        # Test AI seller response
        print("🤖 Testing AI seller response...")
        try:
            AITurns.process_ai_seller_response(negotiation.id)
            
            # Check results
            db.session.refresh(negotiation)
            offers = Offer.query.filter_by(negotiation_id=negotiation.id).order_by(Offer.round_number).all()
            
            print(f"📊 After AI seller: Round {negotiation.round_number}, Offer: ${negotiation.current_offer}")
            print(f"📝 Total offers: {len(offers)}")
            
            for offer in offers:
                print(f"   Round {offer.round_number}: {offer.offer_type.value} - ${offer.price} - {offer.message}")
                
        except Exception as e:
            print(f"❌ Error in AI seller: {e}")
            import traceback
            traceback.print_exc()
        
        # Test AI buyer response if seller responded
        if negotiation.round_number > 1:
            print("🤖 Testing AI buyer response...")
            try:
                time.sleep(1)  # Small delay
                AITurns.process_ai_buyer_response(negotiation.id)
                
                # Check results again
                db.session.refresh(negotiation)
                offers = Offer.query.filter_by(negotiation_id=negotiation.id).order_by(Offer.round_number).all()
                
                print(f"📊 After AI buyer: Round {negotiation.round_number}, Offer: ${negotiation.current_offer}")
                print(f"📝 Total offers: {len(offers)}")
                
                for offer in offers:
                    print(f"   Round {offer.round_number}: {offer.offer_type.value} - ${offer.price} - {offer.message}")
                    
            except Exception as e:
                print(f"❌ Error in AI buyer: {e}")
                import traceback
                traceback.print_exc()

if __name__ == '__main__':
    test_ai_negotiation()