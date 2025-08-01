"""
User schemas
"""

from pydantic import BaseModel
from typing import Optional


class UserSettings(BaseModel):
    seller_personality: str
    buyer_personality: str


class UserSettingsUpdate(BaseModel):
    seller_personality: Optional[str] = None
    buyer_personality: Optional[str] = None


class PublicUserResponse(BaseModel):
    id: int
    username: str
    created_at: str
    is_active: bool

    class Config:
        from_attributes = True