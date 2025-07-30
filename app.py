#!/usr/bin/env python3

"""
DATABASE-POWERED FLASK WEB INTERFACE FOR MARKETPLACE

Enhanced web UI with user authentication and database storage:
1. User registration and login system
2. Database-backed item listings with image uploads
3. Real user accounts and persistent data
4. AI agents that read from database
"""

from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, Blueprint
from flask_login import LoginManager, login_required, current_user
from flask_migrate import Migrate
from models.database import db, User, Item, Negotiation, Offer, FurnitureType, NegotiationStatus, OfferType
from forms import ItemForm, PersonalityForm
from auth import auth
from utils.file_handler import save_image, delete_image
from services.ai_negotiation import schedule_ai_response
import os
from datetime import datetime

# Create Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = 'marketplace-secret-key-change-in-production'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///marketplace.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db.init_app(app)
migrate = Migrate(app, db)

# Setup Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth.login'
login_manager.login_message = 'Please log in to access this page.'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Register blueprints
app.register_blueprint(auth)

# Create main blueprint
main = Blueprint('main', __name__)

@main.route('/')
def homepage():
    """Main marketplace dashboard"""
    items = Item.query.filter_by(is_sold=False).order_by(Item.created_at.desc()).all()
    
    if current_user.is_authenticated:
        user_items = Item.query.filter_by(user_id=current_user.id).order_by(Item.created_at.desc()).all()
        active_negotiations = Negotiation.query.filter(
            (Negotiation.seller_id == current_user.id) | (Negotiation.buyer_id == current_user.id),
            Negotiation.status == NegotiationStatus.ACTIVE
        ).all()
    else:
        user_items = []
        active_negotiations = []
    
    return render_template('dashboard.html', 
                         items=items,
                         user_items=user_items,
                         active_negotiations=active_negotiations)

@main.route('/create-listing', methods=['GET', 'POST'])
@login_required
def create_listing():
    """Create new furniture listing"""
    form = ItemForm()
    
    if form.validate_on_submit():
        # Handle image upload
        image_filename = None
        if form.image.data:
            success, result = save_image(form.image.data)
            if success:
                image_filename = result
            else:
                flash(f'Image upload failed: {result}', 'error')
                return render_template('create_listing.html', form=form)
        
        # Create new item
        item = Item(
            user_id=current_user.id,
            name=form.name.data,
            description=form.description.data,
            furniture_type=FurnitureType(form.furniture_type.data),
            starting_price=form.starting_price.data,
            min_price=form.min_price.data,
            condition=form.condition.data,
            image_path=image_filename
        )
        
        db.session.add(item)
        db.session.commit()
        
        # No auto-generation - humans will start negotiations
        
        flash(f'✅ Created listing: {item.name} for ${item.starting_price}', 'success')
        return redirect(url_for('main.homepage'))
    
    return render_template('create_listing.html', form=form)

@main.route('/item/<int:item_id>')
def view_item(item_id):
    """View individual item details"""
    item = Item.query.get_or_404(item_id)
    return render_template('item_detail.html', item=item)

@main.route('/negotiate/<int:item_id>')
@login_required
def negotiate_page(item_id):
    """Page to start negotiations for an item"""
    item = Item.query.get_or_404(item_id)
    
    if item.user_id == current_user.id:
        flash('❌ You cannot negotiate on your own item', 'error')
        return redirect(url_for('main.homepage'))
    
    if item.is_sold:
        flash('❌ This item has already been sold', 'error')
        return redirect(url_for('main.homepage'))
    
    # Check if negotiation already exists (active or pending)
    existing_negotiation = Negotiation.query.filter(
        Negotiation.item_id == item_id,
        Negotiation.buyer_id == current_user.id,
        Negotiation.status.in_([NegotiationStatus.ACTIVE, NegotiationStatus.DEAL_PENDING])
    ).first()
    
    return render_template('negotiate.html', item=item, existing_negotiation=existing_negotiation)

@main.route('/start-negotiation', methods=['POST'])
@login_required
def start_negotiation():
    """Start negotiation with AI seller"""
    item_id = request.form.get('item_id')
    initial_offer = float(request.form.get('initial_offer', 0))
    
    item = Item.query.get_or_404(item_id)
    
    if item.user_id == current_user.id:
        flash('❌ You cannot negotiate on your own item', 'error')
        return redirect(url_for('main.homepage'))
    
    # Check if buyer already has an active or pending negotiation for this item
    existing_negotiation = Negotiation.query.filter(
        Negotiation.item_id == item_id,
        Negotiation.buyer_id == current_user.id,
        Negotiation.status.in_([NegotiationStatus.ACTIVE, NegotiationStatus.DEAL_PENDING])
    ).first()
    
    if existing_negotiation:
        flash('❌ You already have an active negotiation for this item', 'error')
        return redirect(url_for('main.negotiate_page', item_id=item_id))
    
    # Create new negotiation
    negotiation = Negotiation(
        item_id=item_id,
        seller_id=item.user_id,
        buyer_id=current_user.id,
        current_offer=initial_offer
    )
    
    db.session.add(negotiation)
    db.session.commit()
    
    # Add initial offer
    offer = Offer(
        negotiation_id=negotiation.id,
        offer_type=OfferType.BUYER,
        price=initial_offer,
        message=f"I'd like to offer ${initial_offer} for your {item.name}",
        round_number=1
    )
    
    db.session.add(offer)
    negotiation.round_number = 1
    db.session.commit()
    
    # Schedule AI seller response
    try:
        schedule_ai_response(negotiation.id, is_seller_turn=True, delay_seconds=3)
    except Exception as e:
        print(f"Error scheduling AI response: {e}")
    
    flash(f'🤝 Started negotiation with offer of ${initial_offer}', 'success')
    return redirect(url_for('main.view_negotiation', negotiation_id=negotiation.id))

@main.route('/negotiation/<int:negotiation_id>')
@login_required
def view_negotiation(negotiation_id):
    """View negotiation details and history"""
    negotiation = Negotiation.query.get_or_404(negotiation_id)
    
    # Check if user is part of this negotiation
    if negotiation.seller_id != current_user.id and negotiation.buyer_id != current_user.id:
        flash('❌ You are not authorized to view this negotiation', 'error')
        return redirect(url_for('main.homepage'))
    
    offers = Offer.query.filter_by(negotiation_id=negotiation_id).order_by(Offer.created_at.asc()).all()
    
    return render_template('negotiation_detail.html', negotiation=negotiation, offers=offers)

@main.route('/profile')
@login_required
def profile():
    """User profile page"""
    user_items = Item.query.filter_by(user_id=current_user.id).order_by(Item.created_at.desc()).all()
    
    # Get negotiations where user is seller or buyer
    negotiations = Negotiation.query.filter(
        (Negotiation.seller_id == current_user.id) | (Negotiation.buyer_id == current_user.id)
    ).order_by(Negotiation.created_at.desc()).all()
    
    return render_template('profile.html', user_items=user_items, negotiations=negotiations)

@main.route('/settings', methods=['GET', 'POST'])
@login_required
def settings():
    """User settings - AI personality configuration"""
    form = PersonalityForm()
    
    if form.validate_on_submit():
        current_user.seller_personality = form.seller_personality.data
        current_user.buyer_personality = form.buyer_personality.data
        db.session.commit()
        flash('✅ AI personality settings updated!', 'success')
        return redirect(url_for('main.profile'))
    
    # Pre-populate form with current settings
    form.seller_personality.data = current_user.seller_personality
    form.buyer_personality.data = current_user.buyer_personality
    
    return render_template('settings.html', form=form)

@main.route('/api/negotiation/<int:negotiation_id>/status')
@login_required
def negotiation_status(negotiation_id):
    """API endpoint to check negotiation status"""
    negotiation = Negotiation.query.get_or_404(negotiation_id)
    
    # Check if user is part of this negotiation
    if negotiation.seller_id != current_user.id and negotiation.buyer_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    offers = Offer.query.filter_by(negotiation_id=negotiation_id).order_by(Offer.created_at.asc()).all()
    
    return jsonify({
        'status': negotiation.status.value,
        'round_number': negotiation.round_number,
        'current_offer': negotiation.current_offer,
        'final_price': negotiation.final_price,
        'total_offers': len(offers),
        'is_complete': negotiation.is_complete(),
        'last_updated': negotiation.offers[0].created_at.isoformat() if negotiation.offers else None
    })

@main.route('/make-offer', methods=['POST'])
@login_required
def make_offer():
    """Handle making offers in negotiations"""
    negotiation_id = request.form.get('negotiation_id')
    action = request.form.get('action')
    
    negotiation = Negotiation.query.get_or_404(negotiation_id)
    
    # Check if user is part of this negotiation
    if negotiation.seller_id != current_user.id and negotiation.buyer_id != current_user.id:
        flash('❌ You are not authorized to participate in this negotiation', 'error')
        return redirect(url_for('main.homepage'))
    
    if action == 'accept':
        # Accept the current offer
        negotiation.final_price = negotiation.current_offer
        negotiation.completed_at = datetime.now()
        
        if current_user.id == negotiation.seller_id:
            # Seller accepts - mark as sold and cancel other negotiations
            negotiation.status = NegotiationStatus.COMPLETED
            negotiation.item.is_sold = True
            from services.ai_negotiation import cancel_other_negotiations
            cancel_other_negotiations(negotiation.item_id, negotiation.id)
            flash(f'✅ Deal completed for ${negotiation.final_price}!', 'success')
        else:
            # Buyer accepts - pending seller confirmation
            negotiation.status = NegotiationStatus.DEAL_PENDING
            flash(f'✅ You accepted the offer for ${negotiation.final_price}! Waiting for seller confirmation.', 'success')
        
        db.session.commit()
        
    elif action == 'reject_deal':
        # Seller rejects the pending deal
        if current_user.id == negotiation.seller_id and negotiation.status == NegotiationStatus.DEAL_PENDING:
            negotiation.status = NegotiationStatus.CANCELLED
            
            # Add rejection message
            rejection_offer = Offer(
                negotiation_id=negotiation_id,
                offer_type=OfferType.SELLER,
                price=negotiation.current_offer,
                message="Sorry, I have decided not to accept this deal. Thank you for your interest!",
                round_number=negotiation.round_number + 1
            )
            db.session.add(rejection_offer)
            db.session.commit()
            
            flash('❌ Deal rejected. The buyer has been notified.', 'warning')
        else:
            flash('❌ You cannot reject this deal.', 'error')
        
    elif action == 'offer':
        # Make a new offer
        offer_price = float(request.form.get('offer_price', 0))
        message = request.form.get('message', '')
        
        if offer_price <= 0:
            flash('❌ Invalid offer amount', 'error')
            return redirect(url_for('main.view_negotiation', negotiation_id=negotiation_id))
        
        # Determine offer type
        if current_user.id == negotiation.buyer_id:
            offer_type = OfferType.BUYER
        else:
            offer_type = OfferType.SELLER
        
        # Create new offer
        offer = Offer(
            negotiation_id=negotiation_id,
            offer_type=offer_type,
            price=offer_price,
            message=message,
            round_number=negotiation.round_number + 1
        )
        
        # Update negotiation
        negotiation.current_offer = offer_price
        negotiation.round_number += 1
        
        db.session.add(offer)
        db.session.commit()
        
        # Schedule AI response
        try:
            if current_user.id == negotiation.buyer_id:
                # Human buyer made offer, schedule AI seller response
                schedule_ai_response(negotiation_id, is_seller_turn=True, delay_seconds=3)
            else:
                # Human seller made offer, schedule AI buyer response  
                schedule_ai_response(negotiation_id, is_seller_turn=False, delay_seconds=3)
        except Exception as e:
            print(f"Error scheduling AI response: {e}")
        
        flash(f'✅ Offer of ${offer_price} submitted!', 'success')
    
    return redirect(url_for('main.view_negotiation', negotiation_id=negotiation_id))

@main.route('/delete-item/<int:item_id>', methods=['POST'])
@login_required
def delete_item(item_id):
    """Delete user's item"""
    item = Item.query.get_or_404(item_id)
    
    if item.user_id != current_user.id:
        flash('❌ You can only delete your own items', 'error')
        return redirect(url_for('main.profile'))
    
    # Delete associated image
    if item.image_path:
        delete_image(item.image_path)
    
    # Cancel any active negotiations
    active_negotiations = Negotiation.query.filter_by(item_id=item_id, status=NegotiationStatus.ACTIVE).all()
    for negotiation in active_negotiations:
        negotiation.status = NegotiationStatus.CANCELLED
    
    db.session.delete(item)
    db.session.commit()
    
    flash(f'✅ Deleted item: {item.name}', 'success')
    return redirect(url_for('main.profile'))

# Register main blueprint
app.register_blueprint(main)

# Create database tables
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    # Try different host configurations
    import socket
    hostname = socket.gethostname()
    print(f"Starting server on {hostname}")
    print("Access the app at:")
    print("  - http://localhost:8000")
    print("  - http://127.0.0.1:8000")
    try:
        app.run(debug=True, host='127.0.0.1', port=8000)
    except OSError as e:
        print(f"Port 8000 might be in use: {e}")
        print("Trying port 5000...")
        app.run(debug=True, host='127.0.0.1', port=5000)