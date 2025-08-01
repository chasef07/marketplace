"""
FastAPI Users routes
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..models import User
from ..schemas.user import UserSettings, UserSettingsUpdate, PublicUserResponse
from ..schemas.auth import UserResponse
from ..auth import get_current_user

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    return UserResponse.model_validate(current_user)


@router.get("/{user_id}", response_model=PublicUserResponse)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get public user information"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return PublicUserResponse.model_validate(user)


@router.get("/me/settings", response_model=UserSettings)
async def get_user_settings(current_user: User = Depends(get_current_user)):
    """Get user settings"""
    return UserSettings(
        seller_personality=current_user.seller_personality,
        buyer_personality=current_user.buyer_personality
    )


@router.put("/me/settings", response_model=UserSettings)
async def update_user_settings(
    settings: UserSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user settings"""
    if settings.seller_personality:
        current_user.seller_personality = settings.seller_personality
    if settings.buyer_personality:
        current_user.buyer_personality = settings.buyer_personality
    
    db.commit()
    
    return UserSettings(
        seller_personality=current_user.seller_personality,
        buyer_personality=current_user.buyer_personality
    )