"""
Negotiation and Offer models
"""

from enum import Enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric, CheckConstraint, Index, Boolean, Text, Enum as SQLEnum

from ..core.database import Base


class NegotiationStatus(str, Enum):
    ACTIVE = "active"
    DEAL_PENDING = "deal_pending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class OfferType(str, Enum):
    BUYER = "buyer"
    SELLER = "seller"


class Negotiation(Base):
    __tablename__ = 'negotiations'
    
    id = Column(Integer, primary_key=True)
    item_id = Column(Integer, ForeignKey('items.id', ondelete='CASCADE'), nullable=False, index=True)
    seller_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    buyer_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    status = Column(SQLEnum(NegotiationStatus), default=NegotiationStatus.ACTIVE, nullable=False, index=True)
    current_offer = Column(Numeric(10, 2))
    final_price = Column(Numeric(10, 2))
    round_number = Column(Integer, default=0, nullable=False)
    max_rounds = Column(Integer, default=10, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime)
    expires_at = Column(DateTime)
    
    # Constraints
    __table_args__ = (
        CheckConstraint('round_number >= 0', name='non_negative_round_number'),
        CheckConstraint('max_rounds > 0', name='positive_max_rounds'),
        CheckConstraint('current_offer > 0', name='positive_current_offer'),
        CheckConstraint('final_price > 0', name='positive_final_price'),
        CheckConstraint('seller_id != buyer_id', name='different_seller_buyer'),
        Index('idx_negotiation_status_created', 'status', 'created_at'),
        Index('idx_negotiation_item_status', 'item_id', 'status'),
    )
    
    def is_complete(self):
        """Check if negotiation is complete."""
        return (self.status in [NegotiationStatus.COMPLETED, NegotiationStatus.CANCELLED, NegotiationStatus.DEAL_PENDING] 
                or self.round_number >= self.max_rounds
                or (self.expires_at and datetime.now(timezone.utc) > self.expires_at))
    
    def is_expired(self):
        """Check if negotiation has expired."""
        return self.expires_at and datetime.now(timezone.utc) > self.expires_at
    
    def to_dict(self):
        """Convert negotiation to dictionary for API responses."""
        return {
            'id': self.id,
            'item_id': self.item_id,
            'seller_id': self.seller_id,
            'buyer_id': self.buyer_id,
            'status': self.status.value,
            'current_offer': float(self.current_offer) if self.current_offer else None,
            'final_price': float(self.final_price) if self.final_price else None,
            'round_number': self.round_number,
            'max_rounds': self.max_rounds,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_complete': self.is_complete(),
            'is_expired': self.is_expired()
        }
    
    def __repr__(self):
        return f'<Negotiation {self.id}>'


class Offer(Base):
    __tablename__ = 'offers'
    
    id = Column(Integer, primary_key=True)
    negotiation_id = Column(Integer, ForeignKey('negotiations.id', ondelete='CASCADE'), nullable=False, index=True)
    offer_type = Column(SQLEnum(OfferType), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    message = Column(Text)
    round_number = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    is_counter_offer = Column(Boolean, default=False)
    response_time_seconds = Column(Integer)
    
    # Constraints
    __table_args__ = (
        CheckConstraint('price > 0', name='positive_price'),
        CheckConstraint('round_number > 0', name='positive_round_number'),
        Index('idx_offer_negotiation_round', 'negotiation_id', 'round_number'),
        Index('idx_offer_created', 'created_at'),
    )
    
    def to_dict(self):
        """Convert offer to dictionary for API responses."""
        return {
            'id': self.id,
            'negotiation_id': self.negotiation_id,
            'offer_type': self.offer_type.value,
            'price': float(self.price),
            'message': self.message,
            'round_number': self.round_number,
            'created_at': self.created_at.isoformat(),
            'is_counter_offer': self.is_counter_offer,
            'response_time_seconds': self.response_time_seconds
        }
    
    def __repr__(self):
        return f'<Offer {self.price}>'