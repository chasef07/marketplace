from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from models.database import db, User
from forms import LoginForm, RegistrationForm

auth = Blueprint('auth', __name__, url_prefix='/auth')

@auth.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        # If it's an API request, return JSON
        if request.content_type == 'application/json' or request.headers.get('Content-Type') == 'application/json':
            return jsonify({'error': 'Already authenticated'}), 400
        return redirect(url_for('main.homepage'))
    
    # Handle JSON API requests
    if request.content_type == 'application/json' or request.headers.get('Content-Type') == 'application/json':
        data = request.get_json()
        
        if not data.get('username') or not data.get('password'):
            return jsonify({'error': 'Missing username or password'}), 400
            
        user = User.query.filter_by(username=data.get('username')).first()
        if user and user.check_password(data.get('password')):
            login_user(user)
            return jsonify({'message': 'Login successful', 'user_id': user.id}), 200
        else:
            return jsonify({'error': 'Invalid username or password'}), 401
    
    # Handle form-based requests
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user and user.check_password(form.password.data):
            login_user(user)
            next_page = request.args.get('next')
            flash(f'Welcome back, {user.username}!', 'success')
            return redirect(next_page) if next_page else redirect(url_for('main.homepage'))
        flash('Invalid username or password', 'error')
    
    return render_template('auth/login.html', form=form)

@auth.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        # If it's an API request, return JSON
        if request.content_type == 'application/json' or request.headers.get('Content-Type') == 'application/json':
            return jsonify({'error': 'Already authenticated'}), 400
        return redirect(url_for('main.homepage'))
    
    # Handle JSON API requests
    if request.content_type == 'application/json' or request.headers.get('Content-Type') == 'application/json':
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
        
        return jsonify({'message': 'Registration successful', 'user_id': user.id}), 201
    
    # Handle form-based requests
    form = RegistrationForm()
    if form.validate_on_submit():
        user = User(
            username=form.username.data,
            email=form.email.data,
            seller_personality=form.seller_personality.data,
            buyer_personality=form.buyer_personality.data
        )
        user.set_password(form.password.data)
        
        db.session.add(user)
        db.session.commit()
        
        flash('Registration successful! Please log in.', 'success')
        return redirect(url_for('auth.login'))
    
    return render_template('auth/register.html', form=form)

@auth.route('/logout')
@login_required
def logout():
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('main.homepage'))