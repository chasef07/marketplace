"""
Item model for marketplace listings
"""

from enum import Enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Numeric, CheckConstraint, Index

from ..core.database import Base


class FurnitureType(str, Enum):
    COUCH = "couch"
    DINING_TABLE = "dining_table"
    BOOKSHELF = "bookshelf"
    COFFEE_TABLE = "coffee_table"
    CHAIR = "chair"
    DESK = "desk"
    DRESSER = "dresser"
    WARDROBE = "wardrobe"
    BED = "bed"
    NIGHTSTAND = "nightstand"
    LAMP = "lamp"
    OTHER = "other"


class Item(Base):
    __tablename__ = 'items'
    
    id = Column(Integer, primary_key=True)
    seller_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(String(1000))
    furniture_type = Column(String(50), nullable=False, index=True)
    starting_price = Column(Numeric(10, 2), nullable=False)
    min_price = Column(Numeric(10, 2), nullable=True)  # Deprecated - keeping for DB compatibility
    condition = Column(String(50), default='good')
    image_filename = Column(String(500))
    is_available = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    sold_at = Column(DateTime)
    views_count = Column(Integer, default=0)
    
    # Additional metadata
    dimensions = Column(String(100))
    material = Column(String(100))
    brand = Column(String(100))
    color = Column(String(50))
    
    # Constraints
    __table_args__ = (
        CheckConstraint('starting_price > 0', name='positive_starting_price'),
        Index('idx_item_type_availability', 'furniture_type', 'is_available'),
        Index('idx_item_seller_availability', 'seller_id', 'is_available'),
        Index('idx_item_created_at', 'created_at'),
    )
    
    def to_dict(self):
        """Convert item to dictionary for API responses."""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'furniture_type': self.furniture_type,
            'starting_price': float(self.starting_price),
            'min_price': float(self.min_price) if self.min_price else None,
            'condition': self.condition,
            'image_filename': self.image_filename,
            'seller_id': self.seller_id,
            'is_available': self.is_available,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'views_count': self.views_count,
            'dimensions': self.dimensions,
            'material': self.material,
            'brand': self.brand,
            'color': self.color
        }
    
    def __repr__(self):
        return f'<Item {self.name} (${self.starting_price})>'