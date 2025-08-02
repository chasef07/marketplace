"""
FastAPI Negotiations routes
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..models import Item, User, Negotiation, Offer
from ..models.negotiation import NegotiationStatus, OfferType
from ..schemas.negotiation import NegotiationResponse, OfferCreate, OfferResponse, OfferAnalysisResponse
from ..auth import get_current_user
from ..services.ai_offer_analysis import analyze_item_offers

router = APIRouter()


@router.post("/items/{item_id}/offers")
async def create_offer(
    item_id: int,
    offer_data: OfferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new offer on an item"""
    # Get the item
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Check if user is trying to make offer on own item
    if item.seller_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot make offer on your own item")
    
    # Allow any positive offer amount
    if offer_data.price <= 0:
        raise HTTPException(
            status_code=400, 
            detail="Offer must be greater than $0"
        )
    
    # Check if there's an existing active negotiation
    existing_negotiation = db.query(Negotiation).filter(
        Negotiation.item_id == item_id,
        Negotiation.buyer_id == current_user.id,
        Negotiation.status == NegotiationStatus.ACTIVE
    ).first()
    
    if existing_negotiation:
        # Add offer to existing negotiation
        round_number = existing_negotiation.round_number + 1
        existing_negotiation.round_number = round_number
        existing_negotiation.current_offer = offer_data.price
        
        offer = Offer(
            negotiation_id=existing_negotiation.id,
            offer_type=OfferType.BUYER,
            price=offer_data.price,
            message=offer_data.message,
            round_number=round_number,
            is_counter_offer=round_number > 1
        )
    else:
        # Create new negotiation
        negotiation = Negotiation(
            item_id=item_id,
            seller_id=item.seller_id,
            buyer_id=current_user.id,
            current_offer=offer_data.price,
            round_number=1
        )
        db.add(negotiation)
        db.flush()  # Get the ID
        
        offer = Offer(
            negotiation_id=negotiation.id,
            offer_type=OfferType.BUYER,
            price=offer_data.price,
            message=offer_data.message,
            round_number=1,
            is_counter_offer=False
        )
    
    db.add(offer)
    db.commit()
    db.refresh(offer)
    
    return OfferResponse.model_validate(offer)


@router.get("/items/{item_id}/negotiations", response_model=List[NegotiationResponse])
async def get_item_negotiations(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get negotiations for an item (only if you're the seller)"""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Only seller can see negotiations
    if item.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view negotiations")
    
    negotiations = db.query(Negotiation).filter(
        Negotiation.item_id == item_id
    ).all()
    
    return [NegotiationResponse.model_validate(neg) for neg in negotiations]


@router.get("/my-negotiations", response_model=List[NegotiationResponse])
async def get_my_negotiations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all negotiations where user is buyer or seller"""
    negotiations = db.query(Negotiation).filter(
        (Negotiation.buyer_id == current_user.id) | 
        (Negotiation.seller_id == current_user.id)
    ).all()
    
    return [NegotiationResponse.model_validate(neg) for neg in negotiations]


@router.post("/negotiations/{negotiation_id}/accept")
async def accept_offer(
    negotiation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Accept the current offer (sellers only)"""
    negotiation = db.query(Negotiation).filter(Negotiation.id == negotiation_id).first()
    if not negotiation:
        raise HTTPException(status_code=404, detail="Negotiation not found")
    
    # Only seller can accept
    if negotiation.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only seller can accept offers")
    
    # Update negotiation status
    negotiation.status = NegotiationStatus.DEAL_PENDING
    negotiation.final_price = negotiation.current_offer
    
    # Mark item as sold
    item = db.query(Item).filter(Item.id == negotiation.item_id).first()
    if item:
        item.is_available = False
    
    db.commit()
    
    return {"message": "Offer accepted successfully"}


@router.post("/negotiations/{negotiation_id}/counter")
async def counter_offer(
    negotiation_id: int,
    offer_data: OfferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Make a counter offer (sellers only)"""
    negotiation = db.query(Negotiation).filter(Negotiation.id == negotiation_id).first()
    if not negotiation:
        raise HTTPException(status_code=404, detail="Negotiation not found")
    
    # Only seller can counter
    if negotiation.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only seller can make counter offers")
    
    # Update negotiation
    round_number = negotiation.round_number + 1
    negotiation.round_number = round_number
    negotiation.current_offer = offer_data.price
    
    # Create counter offer
    offer = Offer(
        negotiation_id=negotiation.id,
        offer_type=OfferType.SELLER,
        price=offer_data.price,
        message=offer_data.message,
        round_number=round_number,
        is_counter_offer=True
    )
    
    db.add(offer)
    db.commit()
    db.refresh(offer)
    
    return OfferResponse.model_validate(offer)


@router.get("/negotiations/{negotiation_id}/offers", response_model=List[OfferResponse])
async def get_negotiation_offers(
    negotiation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all offers/messages for a negotiation (buyer or seller only)"""
    negotiation = db.query(Negotiation).filter(Negotiation.id == negotiation_id).first()
    if not negotiation:
        raise HTTPException(status_code=404, detail="Negotiation not found")
    
    # Only buyer or seller can see the offers
    if negotiation.buyer_id != current_user.id and negotiation.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view negotiation offers")
    
    offers = db.query(Offer).filter(
        Offer.negotiation_id == negotiation_id
    ).order_by(Offer.created_at.asc()).all()
    
    return [OfferResponse.model_validate(offer) for offer in offers]


@router.get("/items/{item_id}/offer-analysis", response_model=OfferAnalysisResponse)
async def get_offer_analysis(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get AI analysis of all offers for an item (sellers only)"""
    # Get the item
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Only seller can get analysis
    if item.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the seller can view offer analysis")
    
    # Get all negotiations for this item
    negotiations = db.query(Negotiation).filter(
        Negotiation.item_id == item_id
    ).all()
    
    if not negotiations:
        # Return empty analysis if no offers
        return OfferAnalysisResponse(
            priority_offers=[],
            fair_offers=[],
            lowball_offers=[],
            recommendations=["No offers received yet. Consider adjusting your price or improving your listing photos and description."],
            market_insights={
                "average_offer_percentage": 0,
                "buyer_engagement_level": "none",
                "pricing_strategy": "No market data available yet"
            },
            analysis_metadata={
                "generated_at": "2024-01-01T00:00:00Z",
                "total_offers_analyzed": 0,
                "total_buyers_analyzed": 0
            }
        )
    
    # Get all offers for all negotiations
    negotiation_ids = [neg.id for neg in negotiations]
    all_offers = db.query(Offer).filter(
        Offer.negotiation_id.in_(negotiation_ids)
    ).order_by(Offer.created_at.asc()).all()
    
    # Prepare data for AI analysis
    item_data = {
        "name": item.name,
        "starting_price": float(item.starting_price),
        "condition": item.condition,
        "furniture_type": item.furniture_type
    }
    
    negotiations_data = []
    for neg in negotiations:
        negotiations_data.append({
            "id": neg.id,
            "buyer_id": neg.buyer_id,
            "status": neg.status.value if hasattr(neg.status, 'value') else str(neg.status),
            "current_offer": float(neg.current_offer) if neg.current_offer else 0,
            "round_number": neg.round_number
        })
    
    offers_data = []
    for offer in all_offers:
        offers_data.append({
            "id": offer.id,
            "negotiation_id": offer.negotiation_id,
            "offer_type": offer.offer_type.value if hasattr(offer.offer_type, 'value') else str(offer.offer_type),
            "price": float(offer.price),
            "message": offer.message,
            "round_number": offer.round_number,
            "created_at": offer.created_at
        })
    
    # Get AI analysis
    analysis_result = analyze_item_offers(item_data, negotiations_data, offers_data)
    
    # Return structured response
    return OfferAnalysisResponse(**analysis_result)