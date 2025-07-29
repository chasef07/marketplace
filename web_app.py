#!/usr/bin/env python3

"""
FLASK WEB INTERFACE FOR MARKETPLACE

Simple web UI replacing the terminal interface with:
1. Create custom furniture listings with your own prices
2. Select specific AI buyers to negotiate 
3. Manually confirm or reject deals
"""

from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from scalable_orchestrator import ScalableMarketplaceOrchestrator, UserRole
from models import FurnitureItem, FurnitureType
import time
import json
import os
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'marketplace-secret-key'  # Change in production

# Global orchestrator instance (in-memory for simplicity)
orchestrator = ScalableMarketplaceOrchestrator(max_concurrent_negotiations=20)

# Pre-register seller and buyers
seller_id = None
buyer_ids = {}

def initialize_users():
    """Initialize users if not already done"""
    global seller_id, buyer_ids
    
    if seller_id is None:
        seller_id = orchestrator.register_user("Your Seller", UserRole.SELLER, "Standard Seller")
        
        buyer_personalities = [
            ("Premium Buyer", "Premium Buyer", (800, 3000)),
            ("Budget Shopper", "Budget Shopper", (100, 800)),
            ("Value Hunter", "Value Hunter", (300, 1200)),
            ("Quick Cash", "Quick Cash Buyer", (500, 2000)),
            ("Bargain Hunter", "Bargain Hunter", (100, 600))
        ]
        
        for name, personality, budget in buyer_personalities:
            user_id = orchestrator.register_user(name, UserRole.BUYER, personality, budget)
            buyer_ids[name] = user_id

@app.route('/')
def homepage():
    """Main marketplace dashboard"""
    initialize_users()
    
    listings = orchestrator.get_active_listings()
    negotiations = list(orchestrator.negotiations.values())
    pending_deals = list(orchestrator.pending_deals.values())
    
    return render_template('dashboard.html', 
                         listings=listings,
                         negotiations=negotiations, 
                         pending_deals=pending_deals,
                         orchestrator=orchestrator)

@app.route('/create-listing', methods=['GET', 'POST'])
def create_listing():
    """Create new furniture listing"""
    initialize_users()
    
    if request.method == 'POST':
        name = request.form.get('name', 'Test Item')
        price = float(request.form.get('price', 500))
        min_price = float(request.form.get('min_price', price * 0.6))
        condition = request.form.get('condition', 'good')
        description = request.form.get('description', f'A nice {name.lower()}')
        
        item = FurnitureItem(
            name=name,
            furniture_type=FurnitureType.COUCH,  # Simplified for now
            starting_price=price,
            condition=condition,
            description=description
        )
        
        listing_id = orchestrator.create_listing(seller_id, item, price, min_price)
        flash(f'✅ Created listing: {name} for ${price}', 'success')
        return redirect(url_for('homepage'))
    
    return render_template('create_listing.html')

@app.route('/negotiate/<listing_id>')
def negotiate_page(listing_id):
    """Page to start negotiations for a listing"""
    initialize_users()
    
    listing = orchestrator.listings.get(listing_id)
    if not listing:
        flash('❌ Listing not found', 'error')
        return redirect(url_for('homepage'))
    
    return render_template('negotiate.html', listing=listing, buyer_ids=buyer_ids, orchestrator=orchestrator)

@app.route('/start-negotiation', methods=['POST'])
def start_negotiation():
    """Start negotiation with selected buyers"""
    initialize_users()
    
    listing_id = request.form.get('listing_id')
    selected_buyer_names = request.form.getlist('buyers')
    
    if not listing_id:
        flash('❌ No listing selected', 'error')
        return redirect(url_for('homepage'))
    
    if not selected_buyer_names:
        flash('❌ No buyers selected', 'error')
        return redirect(url_for('negotiate_page', listing_id=listing_id))
    
    # Start negotiations
    negotiations_started = 0
    for buyer_name in selected_buyer_names:
        if buyer_name in buyer_ids:
            buyer_id = buyer_ids[buyer_name]
            orchestrator.express_interest(buyer_id, listing_id)
            neg_id = orchestrator.start_negotiation(buyer_id, listing_id)
            if neg_id:
                negotiations_started += 1
    
    flash(f'🤝 Started {negotiations_started} negotiations', 'success')
    return redirect(url_for('homepage'))

@app.route('/confirm-deal/<deal_id>')
def confirm_deal_page(deal_id):
    """Page to confirm or reject a deal"""
    initialize_users()
    
    deal = orchestrator.pending_deals.get(deal_id)
    if not deal:
        flash('❌ Deal not found', 'error')
        return redirect(url_for('homepage'))
    
    buyer_name = orchestrator.users[deal.buyer_user_id].name
    listing = orchestrator.listings[deal.listing_id]
    
    return render_template('confirm_deal.html', 
                         deal=deal, 
                         buyer_name=buyer_name, 
                         listing=listing)

@app.route('/handle-deal/<deal_id>/<action>')
def handle_deal(deal_id, action):
    """Confirm or reject a deal"""
    initialize_users()
    
    deal = orchestrator.pending_deals.get(deal_id)
    if not deal:
        flash('❌ Deal not found', 'error')
        return redirect(url_for('homepage'))
    
    confirm = action == 'confirm'
    
    # Auto-confirm from both sides for demo
    orchestrator.confirm_deal(deal.buyer_user_id, deal_id, confirm)
    orchestrator.confirm_deal(deal.seller_user_id, deal_id, confirm)
    
    if confirm:
        flash('✅ Deal confirmed!', 'success')
    else:
        flash('❌ Deal rejected', 'info')
    
    return redirect(url_for('homepage'))

@app.route('/logs')
def view_logs():
    """View negotiation log history"""
    logs_dir = 'logs'
    logs = []
    
    if os.path.exists(logs_dir):
        for filename in sorted(os.listdir(logs_dir), reverse=True):
            if filename.endswith('.json'):
                filepath = os.path.join(logs_dir, filename)
                try:
                    with open(filepath, 'r') as f:
                        log_data = json.load(f)
                        # Extract timestamp from filename
                        timestamp_str = filename.replace('negotiation_', '').replace('.json', '')
                        try:
                            timestamp = datetime.strptime(timestamp_str, '%Y%m%d_%H%M%S')
                            log_data['timestamp'] = timestamp.strftime('%Y-%m-%d %H:%M:%S')
                        except:
                            log_data['timestamp'] = timestamp_str
                        log_data['filename'] = filename
                        logs.append(log_data)
                except Exception as e:
                    print(f"Error reading log {filename}: {e}")
    
    return render_template('logs.html', logs=logs)

@app.route('/api/status')
def api_status():
    """API endpoint for live status updates"""
    initialize_users()
    
    negotiations = list(orchestrator.negotiations.values())
    pending_deals = list(orchestrator.pending_deals.values())
    
    return jsonify({
        'negotiations': len(negotiations),
        'pending_deals': len(pending_deals),
        'active_listings': len(orchestrator.get_active_listings())
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000)