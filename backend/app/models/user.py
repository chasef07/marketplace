"""
User model for authentication and user management
"""

from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone
from sqlalchemy import CheckConstraint

from ..core.database import db


class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    seller_personality = db.Column(db.String(50), default='flexible')
    buyer_personality = db.Column(db.String(50), default='fair')
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