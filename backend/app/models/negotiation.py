"""
Negotiation and Offer models for marketplace transactions
"""

from enum import Enum
from datetime import datetime, timezone
from sqlalchemy import CheckConstraint, Index

from ..core.database import db


class NegotiationStatus(str, Enum):
    ACTIVE = "active"
    DEAL_PENDING = "deal_pending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class OfferType(str, Enum):
    BUYER = "buyer"
    SELLER = "seller"


class Negotiation(db.Model):
    __tablename__ = 'negotiations'
    
    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('items.id', ondelete='CASCADE'), nullable=False, index=True)
    seller_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    buyer_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    status = db.Column(db.Enum(NegotiationStatus), default=NegotiationStatus.ACTIVE, nullable=False, index=True)
    current_offer = db.Column(db.Numeric(10, 2))
    final_price = db.Column(db.Numeric(10, 2))
    round_number = db.Column(db.Integer, default=0, nullable=False)
    max_rounds = db.Column(db.Integer, default=10, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    completed_at = db.Column(db.DateTime)
    expires_at = db.Column(db.DateTime)
    
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
    
    # Relationships
    offers = db.relationship('Offer', backref='negotiation', lazy='dynamic', cascade='all, delete-orphan', order_by='Offer.created_at')
    
    def is_complete(self):
        """Check if negotiation is complete."""
        return (self.status in [NegotiationStatus.COMPLETED, NegotiationStatus.CANCELLED, NegotiationStatus.DEAL_PENDING] 
                or self.round_number >= self.max_rounds
                or (self.expires_at and datetime.now(timezone.utc) > self.expires_at))
    
    def is_expired(self):
        """Check if negotiation has expired."""
        return self.expires_at and datetime.now(timezone.utc) > self.expires_at
    
    def complete_negotiation(self, final_price=None):
        """Complete the negotiation."""
        self.status = NegotiationStatus.COMPLETED
        self.completed_at = datetime.now(timezone.utc)
        if final_price:
            self.final_price = final_price
        db.session.commit()
    
    def cancel_negotiation(self):
        """Cancel the negotiation."""
        self.status = NegotiationStatus.CANCELLED
        self.completed_at = datetime.now(timezone.utc)
        db.session.commit()
    
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


class Offer(db.Model):
    __tablename__ = 'offers'
    
    id = db.Column(db.Integer, primary_key=True)
    negotiation_id = db.Column(db.Integer, db.ForeignKey('negotiations.id', ondelete='CASCADE'), nullable=False, index=True)
    offer_type = db.Column(db.Enum(OfferType), nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    message = db.Column(db.Text)
    round_number = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    is_counter_offer = db.Column(db.Boolean, default=False)
    response_time_seconds = db.Column(db.Integer)
    
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