"""
Negotiation schemas
"""

from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal


class NegotiationResponse(BaseModel):
    id: int
    item_id: int
    buyer_id: int
    seller_id: int
    status: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class OfferResponse(BaseModel):
    id: int
    negotiation_id: int
    offer_type: str
    amount: Decimal
    message: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class NegotiationDetailResponse(BaseModel):
    negotiation: NegotiationResponse
    offers: List[OfferResponse]