"""
AI-Powered Search API endpoints
"""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel

from ..core.database import get_db
from ..models import Item, User
from ..schemas.item import ItemResponse, SellerInfo
from ..services.ai_search_service import (
    semantic_search_items,
    get_search_suggestions
)

router = APIRouter()

class SearchQuery(BaseModel):
    query: str
    limit: int = 20
    offset: int = 0

class SearchResponse(BaseModel):
    success: bool
    items: List[ItemResponse]
    total_count: int
    query_interpretation: str

class SearchSuggestionsResponse(BaseModel):
    suggestions: List[str]

@router.post("/ai", response_model=SearchResponse)
async def ai_search(
    search_request: SearchQuery,
    db: Session = Depends(get_db)
):
    """
    AI-powered semantic search for furniture items using embeddings
    """
    try:
        # Get all available items from database
        items = db.query(Item).join(User, Item.seller_id == User.id).filter(Item.is_available == True).all()
        
        # Convert to dictionaries for processing
        items_data = []
        for item in items:
            seller = db.query(User).filter(User.id == item.seller_id).first()
            item_dict = {
                'id': item.id,
                'name': item.name,
                'description': item.description,
                'furniture_type': item.furniture_type,
                'starting_price': str(item.starting_price),
                'condition': item.condition,
                'image_filename': item.image_filename,
                'seller_id': item.seller_id,
                'created_at': item.created_at,
                'updated_at': item.updated_at,
                'is_available': item.is_available,
                'seller': {
                    'id': item.seller_id,
                    'username': seller.username if seller else 'Unknown'
                }
            }
            items_data.append(item_dict)
        
        # Use semantic search to find matching items
        matching_items, interpretation = semantic_search_items(
            search_request.query, 
            items_data, 
            limit=search_request.limit
        )
        
        # Convert to ItemResponse objects
        response_items = []
        for item_dict in matching_items:
            response_items.append(ItemResponse.model_validate(item_dict))
        
        return SearchResponse(
            success=True,
            items=response_items,
            total_count=len(response_items),
            query_interpretation=interpretation
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Search failed: {str(e)}"
        )

@router.get("/suggestions", response_model=SearchSuggestionsResponse)
async def get_search_suggestions_endpoint():
    """
    Get example search queries to help users
    """
    suggestions = get_search_suggestions()
    return SearchSuggestionsResponse(suggestions=suggestions)

