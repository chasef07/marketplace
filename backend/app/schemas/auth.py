"""
Authentication schemas
"""

from pydantic import BaseModel, field_serializer
from typing import Optional
from datetime import datetime


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    seller_personality: Optional[str] = "flexible"
    buyer_personality: Optional[str] = "fair"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    seller_personality: str
    buyer_personality: str
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True
    
    @field_serializer('created_at')
    def serialize_created_at(self, value: datetime) -> str:
        return value.isoformat()
    
    @field_serializer('last_login')
    def serialize_last_login(self, value: Optional[datetime]) -> Optional[str]:
        return value.isoformat() if value else None


class AuthResponse(BaseModel):
    message: str
    user: UserResponse
    access_token: Optional[str] = None