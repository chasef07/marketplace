from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Index, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
import uuid

db = SQLAlchemy()

class FurnitureType(str, Enum):
    COUCH = "couch"
    DINING_TABLE = "dining_table"
    BOOKSHELF = "bookshelf"
    CHAIR = "chair"
    DRESSER = "dresser"
    OTHER = "other"

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)  # Increased length for stronger hashing
    seller_personality = db.Column(db.String(50), default='flexible')  # AI seller personality
    buyer_personality = db.Column(db.String(50), default='fair')      # AI buyer personality
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    last_login = db.Column(db.DateTime)
    
    # Constraints
    __table_args__ = (
        CheckConstraint('LENGTH(username) >= 3', name='username_min_length'),
        CheckConstraint('LENGTH(username) <= 80', name='username_max_length'),
    )
    
    # Relationships
    items = db.relationship('Item', backref='owner', lazy='dynamic', cascade='all, delete-orphan')
    negotiations_as_seller = db.relationship('Negotiation', foreign_keys='Negotiation.seller_id', backref='seller', lazy='dynamic')
    negotiations_as_buyer = db.relationship('Negotiation', foreign_keys='Negotiation.buyer_id', backref='buyer', lazy='dynamic')
    
    def set_password(self, password):
        """Hash and set password using stronger hashing."""
        self.password_hash = generate_password_hash(password, method='pbkdf2:sha256:150000')
    
    def check_password(self, password):
        """Check password against hash."""
        return check_password_hash(self.password_hash, password)
    
    def update_last_login(self):
        """Update last login timestamp."""
        self.last_login = datetime.now(timezone.utc)
        db.session.commit()
    
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

class Item(db.Model):
    __tablename__ = 'items'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False, index=True)
    description = db.Column(db.Text)
    furniture_type = db.Column(db.Enum(FurnitureType), nullable=False, index=True)
    starting_price = db.Column(db.Numeric(10, 2), nullable=False)  # Precise decimal for money
    min_price = db.Column(db.Numeric(10, 2), nullable=False)
    condition = db.Column(db.String(50), default='good')
    image_path = db.Column(db.String(500))  # Increased for cloud storage URLs
    is_sold = db.Column(db.Boolean, default=False, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    sold_at = db.Column(db.DateTime)
    views_count = db.Column(db.Integer, default=0)
    
    # Additional metadata
    dimensions = db.Column(db.String(100))  # e.g., "L x W x H"
    material = db.Column(db.String(100))
    brand = db.Column(db.String(100))
    color = db.Column(db.String(50))
    
    # Constraints
    __table_args__ = (
        CheckConstraint('starting_price > 0', name='positive_starting_price'),
        CheckConstraint('min_price > 0', name='positive_min_price'),
        CheckConstraint('min_price <= starting_price', name='min_price_le_starting_price'),
        Index('idx_item_user_created', 'user_id', 'created_at'),
        Index('idx_item_type_sold', 'furniture_type', 'is_sold'),
    )
    
    # Relationships
    negotiations = db.relationship('Negotiation', backref='item', lazy='dynamic', cascade='all, delete-orphan')
    
    def mark_as_sold(self):
        """Mark item as sold."""
        self.is_sold = True
        self.sold_at = datetime.now(timezone.utc)
        db.session.commit()
    
    def increment_views(self):
        """Increment view count."""
        self.views_count += 1
        db.session.commit()
    
    def to_dict(self):
        """Convert item to dictionary for API responses."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'description': self.description,
            'furniture_type': self.furniture_type.value,
            'starting_price': float(self.starting_price),
            'min_price': float(self.min_price),
            'condition': self.condition,
            'image_path': self.image_path,
            'is_sold': self.is_sold,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'sold_at': self.sold_at.isoformat() if self.sold_at else None,
            'views_count': self.views_count,
            'dimensions': self.dimensions,
            'material': self.material,
            'brand': self.brand,
            'color': self.color,
            'seller_name': self.owner.username if self.owner else 'Unknown'
        }
    
    def __repr__(self):
        return f'<Item {self.name}>'

class NegotiationStatus(str, Enum):
    ACTIVE = "active"
    DEAL_PENDING = "deal_pending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

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
    expires_at = db.Column(db.DateTime)  # Auto-expire negotiations
    
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

class OfferType(str, Enum):
    BUYER = "buyer"
    SELLER = "seller"

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
    response_time_seconds = db.Column(db.Integer)  # Time taken to respond
    
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