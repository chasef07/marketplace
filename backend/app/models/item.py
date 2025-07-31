"""
Item model for marketplace listings
"""

from enum import Enum
from datetime import datetime, timezone
from sqlalchemy import CheckConstraint, Index

from ..core.database import db


class FurnitureType(str, Enum):
    COUCH = "couch"
    DINING_TABLE = "dining_table"
    BOOKSHELF = "bookshelf"
    CHAIR = "chair"
    DRESSER = "dresser"
    OTHER = "other"


class Item(db.Model):
    __tablename__ = 'items'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False, index=True)
    description = db.Column(db.Text)
    furniture_type = db.Column(db.Enum(FurnitureType), nullable=False, index=True)
    starting_price = db.Column(db.Numeric(10, 2), nullable=False)
    min_price = db.Column(db.Numeric(10, 2), nullable=False)
    condition = db.Column(db.String(50), default='good')
    image_path = db.Column(db.String(500))
    is_sold = db.Column(db.Boolean, default=False, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    sold_at = db.Column(db.DateTime)
    views_count = db.Column(db.Integer, default=0)
    
    # Additional metadata
    dimensions = db.Column(db.String(100))
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