"""
AI-Powered Semantic Search Service
Uses OpenAI embeddings to find furniture items based on semantic similarity
"""

import json
import re
import math
from typing import Dict, List, Optional, Tuple
from openai import OpenAI
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """
    Calculate cosine similarity between two vectors
    """
    # Calculate dot product
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    
    # Calculate magnitudes
    magnitude1 = math.sqrt(sum(a * a for a in vec1))
    magnitude2 = math.sqrt(sum(a * a for a in vec2))
    
    # Avoid division by zero
    if magnitude1 == 0 or magnitude2 == 0:
        return 0
    
    return dot_product / (magnitude1 * magnitude2)

def get_embedding(text: str) -> List[float]:
    """
    Get OpenAI embedding for text
    """
    try:
        response = client.embeddings.create(
            model="text-embedding-3-small",  # Cheaper and faster than ada-002
            input=text
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"Error getting embedding: {e}")
        return []

def create_item_search_text(item: dict) -> str:
    """
    Create searchable text from item data combining all relevant fields
    """
    parts = []
    
    # Add name and description (most important)
    if item.get('name'):
        parts.append(item['name'])
    if item.get('description'):
        parts.append(item['description'])
    
    # Add furniture type and condition
    if item.get('furniture_type'):
        parts.append(f"furniture type: {item['furniture_type']}")
    if item.get('condition'):
        parts.append(f"condition: {item['condition']}")
    
    # Add price context
    if item.get('starting_price'):
        price = float(item['starting_price'])
        parts.append(f"price: ${price}")
        # Add price context words
        if price < 100:
            parts.append("cheap affordable budget inexpensive")
        elif price < 300:
            parts.append("moderate reasonable mid-range")
        elif price < 600:
            parts.append("expensive premium quality")
        else:
            parts.append("luxury high-end expensive premium")
    
    # Add seller info if available
    if item.get('seller', {}).get('username'):
        parts.append(f"seller: {item['seller']['username']}")
    
    return " ".join(parts)

def semantic_search_items(query: str, items: List[dict], limit: int = 20, min_similarity: float = 0.35) -> Tuple[List[dict], str]:
    """
    Search items using semantic similarity with OpenAI embeddings
    Returns (matching_items, interpretation)
    """
    try:
        if not items:
            return [], f"Searched for: '{query}' but no items available"
        
        # Get embedding for search query
        query_embedding = get_embedding(query)
        if not query_embedding:
            return [], f"Failed to process search query: '{query}'"
        
        # Create embeddings for all items
        item_similarities = []
        
        for item in items:
            # Create comprehensive search text for this item
            item_text = create_item_search_text(item)
            
            # Get embedding for item
            item_embedding = get_embedding(item_text)
            if item_embedding:
                # Calculate cosine similarity
                similarity = cosine_similarity(query_embedding, item_embedding)
                
                item_similarities.append({
                    'item': item,
                    'similarity': similarity,
                    'search_text': item_text  # For debugging
                })
        
        # Filter by minimum similarity and sort by similarity (highest first)
        filtered_similarities = [item_sim for item_sim in item_similarities if item_sim['similarity'] >= min_similarity]
        filtered_similarities.sort(key=lambda x: x['similarity'], reverse=True)
        
        # Return top results
        top_items = [item_sim['item'] for item_sim in filtered_similarities[:limit]]
        
        # Create interpretation
        if top_items:
            top_similarity = filtered_similarities[0]['similarity']
            interpretation = f"Found {len(top_items)} items matching '{query}' (best match: {top_similarity:.2f} similarity)"
        else:
            total_items = len(item_similarities)
            if total_items > 0:
                best_similarity = max(item_similarities, key=lambda x: x['similarity'])['similarity']
                interpretation = f"No close matches found for '{query}' (best available: {best_similarity:.2f} similarity, minimum required: {min_similarity:.2f})"
            else:
                interpretation = f"No items found matching '{query}'"
        
        return top_items, interpretation
        
    except Exception as e:
        print(f"Semantic search error: {e}")
        return [], f"Search failed for '{query}': {str(e)}"

def get_search_suggestions() -> List[str]:
    """
    Return example search queries to help users
    """
    return [
        "cheap table",
        "comfortable chair", 
        "modern couch under $500",
        "vintage wooden furniture",
        "black leather office chair",
        "dining table for 6 people",
        "small bookshelf",
        "king size bed",
        "affordable dresser",
        "industrial style desk"
    ]