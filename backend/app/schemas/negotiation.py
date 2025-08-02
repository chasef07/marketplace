"""
Pydantic schemas for negotiations and offers
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from decimal import Decimal


class OfferCreate(BaseModel):
    price: float
    message: Optional[str] = None


class OfferResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    negotiation_id: int
    offer_type: str
    price: float
    message: Optional[str] = None
    round_number: int
    created_at: datetime
    is_counter_offer: bool
    response_time_seconds: Optional[int] = None


class NegotiationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    item_id: int
    seller_id: int
    buyer_id: int
    status: str
    current_offer: Optional[float] = None
    final_price: Optional[float] = None
    round_number: int
    max_rounds: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None


class OfferAnalysisItem(BaseModel):
    buyer_info: str
    current_offer: float
    percentage_of_asking: int
    reason: str


class MarketInsights(BaseModel):
    average_offer_percentage: int
    buyer_engagement_level: str
    pricing_strategy: str


class AnalysisMetadata(BaseModel):
    generated_at: str
    total_offers_analyzed: int
    total_buyers_analyzed: int


class OfferAnalysisResponse(BaseModel):
    priority_offers: List[OfferAnalysisItem]
    fair_offers: List[OfferAnalysisItem]
    lowball_offers: List[OfferAnalysisItem]
    recommendations: List[str]
    market_insights: MarketInsights
    analysis_metadata: AnalysisMetadata
    error: Optional[str] = None