"""
FastAPI Items routes
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..models import Item, User
from ..schemas.item import ItemResponse, ItemCreate, AIAnalysisResult, SellerInfo
from ..auth import get_current_user
from ..services.ai_image_analysis import analyze_furniture_image
from ..services.file_handler import save_image

router = APIRouter()


@router.get("/", response_model=List[ItemResponse])
async def get_items(db: Session = Depends(get_db)):
    """Get all available items"""
    items = db.query(Item).join(User, Item.seller_id == User.id).filter(Item.is_available == True).all()
    
    result = []
    for item in items:
        # Get seller info
        seller = db.query(User).filter(User.id == item.seller_id).first()
        item_dict = ItemResponse.model_validate(item).model_dump()
        if seller:
            item_dict['seller'] = SellerInfo.model_validate(seller).model_dump()
        result.append(ItemResponse.model_validate(item_dict))
    
    return result


@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(item_id: int, db: Session = Depends(get_db)):
    """Get specific item"""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Get seller info
    seller = db.query(User).filter(User.id == item.seller_id).first()
    item_dict = ItemResponse.model_validate(item).model_dump()
    if seller:
        item_dict['seller'] = SellerInfo.model_validate(seller).model_dump()
    
    return ItemResponse.model_validate(item_dict)


@router.post("/", response_model=ItemResponse)
async def create_item(
    item_data: ItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new item"""
    item = Item(
        seller_id=current_user.id,
        name=item_data.name,
        description=item_data.description,
        furniture_type=item_data.furniture_type,
        starting_price=item_data.starting_price,
        min_price=item_data.min_price,
        condition=item_data.condition,
        image_filename=item_data.image_filename
    )
    
    db.add(item)
    db.commit()
    db.refresh(item)
    
    return ItemResponse.model_validate(item)


@router.post("/analyze-image", response_model=AIAnalysisResult)
async def analyze_image(
    image: UploadFile = File(...)
):
    """Analyze uploaded furniture image"""
    try:
        # Save image
        filename = save_image(image)
        
        # Analyze with AI
        success, analysis_data = analyze_furniture_image(f"uploads/{filename}")
        
        if not success:
            raise HTTPException(
                status_code=500,
                detail=f"AI analysis failed: {analysis_data}"
            )
        
        # Generate pricing suggestions
        from ..services.ai_image_analysis import suggest_pricing, generate_listing_content
        pricing_suggestions = suggest_pricing(analysis_data)
        listing_content = generate_listing_content(analysis_data, pricing_suggestions)
        
        return AIAnalysisResult(
            success=True,
            analysis={
                "furniture_type": analysis_data.get('furniture_type', 'Unknown'),
                "style": analysis_data.get('style', 'Unknown'),
                "condition_score": analysis_data.get('condition_score', 5),
                "condition_notes": analysis_data.get('condition_notes', 'No notes'),
                "material": analysis_data.get('material', 'Unknown'),
                "brand": analysis_data.get('brand', 'Unknown'),
                "color": analysis_data.get('color', 'Unknown'),
                "estimated_dimensions": analysis_data.get('estimated_dimensions', 'Unknown'),
                "key_features": analysis_data.get('key_features', [])
            },
            pricing=pricing_suggestions,
            listing=listing_content,
            image_filename=filename
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Image analysis failed: {str(e)}"
        )