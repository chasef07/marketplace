"""
Item schemas
"""

from pydantic import BaseModel, field_serializer
from typing import Optional, List
from decimal import Decimal
from datetime import datetime


class ItemCreate(BaseModel):
    name: str
    description: str
    furniture_type: str
    starting_price: Decimal
    condition: str
    image_filename: Optional[str] = None


class ItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    furniture_type: Optional[str] = None
    starting_price: Optional[Decimal] = None
    condition: Optional[str] = None


class SellerInfo(BaseModel):
    id: int
    username: str
    
    class Config:
        from_attributes = True


class ItemResponse(BaseModel):
    id: int
    name: str
    description: str
    furniture_type: str
    starting_price: Decimal
    condition: str
    image_filename: Optional[str] = None
    seller_id: int
    seller: Optional[SellerInfo] = None
    created_at: datetime
    updated_at: datetime
    is_available: bool

    class Config:
        from_attributes = True
    
    @field_serializer('created_at')
    def serialize_created_at(self, value: datetime) -> str:
        return value.isoformat()
    
    @field_serializer('updated_at')
    def serialize_updated_at(self, value: datetime) -> str:
        return value.isoformat()


class AIAnalysisResult(BaseModel):
    success: bool
    analysis: dict
    pricing: dict
    listing: dict
    image_filename: str