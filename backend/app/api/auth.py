"""
FastAPI Authentication routes
"""

from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..models import User
from ..schemas.auth import LoginRequest, RegisterRequest, AuthResponse, UserResponse
from ..auth import create_access_token, get_password_hash, verify_password, ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user

router = APIRouter()


@router.post("/login", response_model=AuthResponse)
async def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """User login endpoint"""
    user = db.query(User).filter(User.username == login_data.username).first()
    
    if not user or not user.check_password(login_data.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    # Update last login
    user.update_last_login()
    db.commit()
    
    return AuthResponse(
        message="Login successful",
        user=UserResponse.model_validate(user),
        access_token=access_token
    )


@router.post("/register", response_model=AuthResponse)
async def register(register_data: RegisterRequest, db: Session = Depends(get_db)):
    """User registration endpoint"""
    
    # Check if user already exists
    if db.query(User).filter(User.username == register_data.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    if db.query(User).filter(User.email == register_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )
    
    # Create new user
    user = User(
        username=register_data.username,
        email=register_data.email,
        seller_personality=register_data.seller_personality,
        buyer_personality=register_data.buyer_personality
    )
    user.set_password(register_data.password)
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return AuthResponse(
        message="Registration successful",
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user"""
    return UserResponse.model_validate(current_user)