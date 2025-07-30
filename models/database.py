from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from enum import Enum

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
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    seller_personality = db.Column(db.String(50), default='flexible')  # AI seller personality
    buyer_personality = db.Column(db.String(50), default='fair')      # AI buyer personality
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    items = db.relationship('Item', backref='owner', lazy=True, cascade='all, delete-orphan')
    negotiations_as_seller = db.relationship('Negotiation', foreign_keys='Negotiation.seller_id', backref='seller', lazy=True)
    negotiations_as_buyer = db.relationship('Negotiation', foreign_keys='Negotiation.buyer_id', backref='buyer', lazy=True)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self):
        return f'<User {self.username}>'

class Item(db.Model):
    __tablename__ = 'items'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    furniture_type = db.Column(db.Enum(FurnitureType), nullable=False)
    starting_price = db.Column(db.Float, nullable=False)
    min_price = db.Column(db.Float, nullable=False)
    condition = db.Column(db.String(50), default='good')
    image_path = db.Column(db.String(200))
    is_sold = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    negotiations = db.relationship('Negotiation', backref='item', lazy=True, cascade='all, delete-orphan')
    
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
    item_id = db.Column(db.Integer, db.ForeignKey('items.id'), nullable=False)
    seller_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    buyer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.Enum(NegotiationStatus), default=NegotiationStatus.ACTIVE)
    current_offer = db.Column(db.Float)
    final_price = db.Column(db.Float)
    round_number = db.Column(db.Integer, default=0)
    max_rounds = db.Column(db.Integer, default=10)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    
    # Relationships
    offers = db.relationship('Offer', backref='negotiation', lazy=True, cascade='all, delete-orphan')
    
    def is_complete(self):
        return self.status in [NegotiationStatus.COMPLETED, NegotiationStatus.CANCELLED] or self.round_number >= self.max_rounds
    
    def __repr__(self):
        return f'<Negotiation {self.id}>'

class OfferType(str, Enum):
    BUYER = "buyer"
    SELLER = "seller"

class Offer(db.Model):
    __tablename__ = 'offers'
    
    id = db.Column(db.Integer, primary_key=True)
    negotiation_id = db.Column(db.Integer, db.ForeignKey('negotiations.id'), nullable=False)
    offer_type = db.Column(db.Enum(OfferType), nullable=False)
    price = db.Column(db.Float, nullable=False)
    message = db.Column(db.Text)
    round_number = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Offer {self.price}>'