"""
Negotiations API routes
"""

from flask import request, jsonify
from flask_login import login_required, current_user

from . import api
from ..models import Negotiation, Offer, NegotiationStatus, OfferType
from ..core.database import db


@api.route('/negotiations')
@login_required
def get_negotiations():
    """Get user's negotiations"""
    negotiations = Negotiation.query.filter(
        (Negotiation.seller_id == current_user.id) | (Negotiation.buyer_id == current_user.id)
    ).order_by(Negotiation.created_at.desc()).all()
    
    negotiations_data = []
    for negotiation in negotiations:
        negotiations_data.append(negotiation.to_dict())
    
    return jsonify({'negotiations': negotiations_data})


@api.route('/negotiations/<int:negotiation_id>')
@login_required
def get_negotiation(negotiation_id):
    """Get specific negotiation details"""
    negotiation = Negotiation.query.get_or_404(negotiation_id)
    
    # Check if user is part of this negotiation
    if negotiation.seller_id != current_user.id and negotiation.buyer_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    offers = Offer.query.filter_by(negotiation_id=negotiation_id).order_by(Offer.created_at.asc()).all()
    
    return jsonify({
        'negotiation': negotiation.to_dict(),
        'offers': [offer.to_dict() for offer in offers]
    })


@api.route('/negotiations/<int:negotiation_id>/status')
@login_required
def negotiation_status(negotiation_id):
    """API endpoint to check negotiation status"""
    negotiation = Negotiation.query.get_or_404(negotiation_id)
    
    # Check if user is part of this negotiation
    if negotiation.seller_id != current_user.id and negotiation.buyer_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    return jsonify(negotiation.to_dict())