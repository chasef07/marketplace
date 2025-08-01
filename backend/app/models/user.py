"""
User model for authentication and user management
"""

from passlib.context import CryptContext
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Boolean, CheckConstraint

from ..core.database import Base

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    username = Column(String(80), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    seller_personality = Column(String(50), default='flexible')
    buyer_personality = Column(String(50), default='fair')
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, default=True, nullable=False)
    last_login = Column(DateTime)
    
    # Constraints
    __table_args__ = (
        CheckConstraint('LENGTH(username) >= 3', name='username_min_length'),
        CheckConstraint('LENGTH(username) <= 80', name='username_max_length'),
    )
    
    def set_password(self, password):
        """Hash and set password using stronger hashing."""
        self.password_hash = pwd_context.hash(password)
    
    def check_password(self, password):
        """Check password against hash."""
        return pwd_context.verify(password, self.password_hash)
    
    def update_last_login(self):
        """Update last login timestamp."""
        self.last_login = datetime.now(timezone.utc)
    
    def to_dict(self):
        """Convert user to dictionary for API responses."""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'seller_personality': self.seller_personality,
            'buyer_personality': self.buyer_personality,
            'created_at': self.created_at.isoformat(),
            'is_active': self.is_active,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }
    
    def __repr__(self):
        return f'<User {self.username}>'