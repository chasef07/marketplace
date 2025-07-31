"""
Authentication API routes
"""

from flask import request, jsonify
from flask_login import login_user, logout_user, current_user, login_required

from . import api
from ..models import User
from ..core.database import db


@api.route('/auth/login', methods=['POST'])
def login():
    """User login endpoint"""
    if current_user.is_authenticated:
        return jsonify({'error': 'Already authenticated'}), 400
    
    data = request.get_json()
    if not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Missing username or password'}), 400
        
    user = User.query.filter_by(username=data.get('username')).first()
    if user and user.check_password(data.get('password')):
        login_user(user)
        user.update_last_login()
        return jsonify({'message': 'Login successful', 'user': user.to_dict()}), 200
    else:
        return jsonify({'error': 'Invalid username or password'}), 401


@api.route('/auth/register', methods=['POST'])
def register():
    """User registration endpoint"""
    if current_user.is_authenticated:
        return jsonify({'error': 'Already authenticated'}), 400
    
    data = request.get_json()
    
    # Basic validation
    if not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing required fields'}), 400
        
    # Check if user already exists
    if User.query.filter_by(username=data.get('username')).first():
        return jsonify({'error': 'Username already exists'}), 400
    if User.query.filter_by(email=data.get('email')).first():
        return jsonify({'error': 'Email already exists'}), 400
    
    # Create new user
    user = User(
        username=data.get('username'),
        email=data.get('email'),
        seller_personality=data.get('seller_personality', 'flexible'),
        buyer_personality=data.get('buyer_personality', 'fair')
    )
    user.set_password(data.get('password'))
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'message': 'Registration successful', 'user': user.to_dict()}), 201


@api.route('/auth/logout', methods=['POST'])
@login_required
def logout():
    """User logout endpoint"""
    logout_user()
    return jsonify({'message': 'Logout successful'}), 200


@api.route('/auth/me')
@login_required
def get_current_user():
    """Get current authenticated user"""
    return jsonify({'user': current_user.to_dict()}), 200