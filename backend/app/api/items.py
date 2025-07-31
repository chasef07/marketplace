"""
Items API routes
"""

from flask import request, jsonify
from flask_login import login_required, current_user

from . import api
from ..models import Item, FurnitureType
from ..services.ai_analysis import analyze_furniture_image, suggest_pricing, generate_listing_content
from ..services.file_handler import save_image, delete_image
from ..core.database import db
import os


@api.route('/items')
def get_items():
    """Get all marketplace items"""
    items = Item.query.filter_by(is_sold=False).order_by(Item.created_at.desc()).all()
    
    items_data = []
    for item in items:
        items_data.append(item.to_dict())
    
    return jsonify({'items': items_data})


@api.route('/items/<int:item_id>')
def get_item(item_id):
    """Get specific item details"""
    item = Item.query.get_or_404(item_id)
    
    # Increment view count
    item.increment_views()
    
    return jsonify({'item': item.to_dict()})


@api.route('/items', methods=['POST'])
@login_required
def create_item():
    """Create new item listing"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['name', 'description', 'furniture_type', 'starting_price', 'min_price', 'condition']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    try:
        # Create new item
        item = Item(
            user_id=current_user.id,
            name=data['name'],
            description=data['description'],
            furniture_type=FurnitureType(data['furniture_type']),
            starting_price=float(data['starting_price']),
            min_price=float(data['min_price']),
            condition=data['condition'],
            image_path=data.get('image_path'),
            dimensions=data.get('dimensions'),
            material=data.get('material'),
            brand=data.get('brand'),
            color=data.get('color')
        )
        
        db.session.add(item)
        db.session.commit()
        
        return jsonify({'message': 'Item created successfully', 'item': item.to_dict()}), 201
        
    except Exception as e:
        return jsonify({'error': f'Failed to create item: {str(e)}'}), 500


@api.route('/items/<int:item_id>', methods=['PUT'])
@login_required
def update_item(item_id):
    """Update item listing"""
    item = Item.query.get_or_404(item_id)
    
    # Check ownership
    if item.user_id != current_user.id:
        return jsonify({'error': 'You can only update your own items'}), 403
    
    data = request.get_json()
    
    # Update fields
    if 'name' in data:
        item.name = data['name']
    if 'description' in data:
        item.description = data['description']
    if 'starting_price' in data:
        item.starting_price = float(data['starting_price'])
    if 'min_price' in data:
        item.min_price = float(data['min_price'])
    if 'condition' in data:
        item.condition = data['condition']
    
    db.session.commit()
    
    return jsonify({'message': 'Item updated successfully', 'item': item.to_dict()})


@api.route('/items/<int:item_id>', methods=['DELETE'])
@login_required
def delete_item(item_id):
    """Delete item listing"""
    item = Item.query.get_or_404(item_id)
    
    # Check ownership
    if item.user_id != current_user.id:
        return jsonify({'error': 'You can only delete your own items'}), 403
    
    # Delete associated image
    if item.image_path:
        delete_image(item.image_path)
    
    db.session.delete(item)
    db.session.commit()
    
    return jsonify({'message': 'Item deleted successfully'})


@api.route('/analyze-image', methods=['POST'])
def analyze_image():
    """AI image analysis endpoint"""
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No image selected'}), 400
    
    try:
        # Save the image
        success, result = save_image(file)
        if not success:
            return jsonify({'error': f'Image upload failed: {result}'}), 400
        
        # Analyze the image
        image_path = os.path.join('static/uploads', result)
        analysis_success, analysis_result = analyze_furniture_image(image_path)
        
        if analysis_success:
            # Generate pricing suggestions
            pricing_suggestions = suggest_pricing(analysis_result)
            listing_content = generate_listing_content(analysis_result, pricing_suggestions)
            
            response_data = {
                'success': True,
                'analysis': analysis_result,
                'pricing': pricing_suggestions,
                'listing': listing_content,
                'image_filename': result
            }
            
            return jsonify(response_data)
        else:
            # Clean up failed image
            delete_image(result)
            return jsonify({'error': f'AI analysis failed: {analysis_result}'}), 500
            
    except Exception as e:
        return jsonify({'error': f'Analysis error: {str(e)}'}), 500