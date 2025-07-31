"""
Users API routes
"""

from flask import request, jsonify
from flask_login import login_required, current_user

from . import api
from ..models import User
from ..core.database import db


@api.route('/user')
@login_required
def get_current_user():
    """Get current authenticated user"""
    return jsonify(current_user.to_dict())


@api.route('/users/<int:user_id>')
def get_user(user_id):
    """Get public user information"""
    user = User.query.get_or_404(user_id)
    
    # Return only public information
    return jsonify({
        'id': user.id,
        'username': user.username,
        'created_at': user.created_at.isoformat(),
        'is_active': user.is_active
    })


@api.route('/user/settings', methods=['GET', 'PUT'])
@login_required
def user_settings():
    """Get or update user settings"""
    if request.method == 'GET':
        return jsonify({
            'seller_personality': current_user.seller_personality,
            'buyer_personality': current_user.buyer_personality
        })
    
    # PUT request - update settings
    data = request.get_json()
    
    if 'seller_personality' in data:
        current_user.seller_personality = data['seller_personality']
    if 'buyer_personality' in data:
        current_user.buyer_personality = data['buyer_personality']
    
    db.session.commit()
    
    return jsonify({
        'message': 'Settings updated successfully',
        'settings': {
            'seller_personality': current_user.seller_personality,
            'buyer_personality': current_user.buyer_personality
        }
    })