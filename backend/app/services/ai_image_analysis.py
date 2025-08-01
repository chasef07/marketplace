"""
AI Image Analysis Service using GPT-4 Vision
Analyzes furniture images to extract details like type, brand, condition, and pricing recommendations
"""

import base64
import os
from openai import OpenAI
from dotenv import load_dotenv
import json
from PIL import Image
import io

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

def encode_image_to_base64(image_path):
    """Convert image file to base64 string for GPT-4 Vision"""
    try:
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    except Exception as e:
        raise Exception(f"Error encoding image: {str(e)}")

def analyze_furniture_image(image_path):
    """
    Analyze furniture image using GPT-4 Vision
    Returns structured data about the furniture piece
    """
    try:
        # Encode image
        base64_image = encode_image_to_base64(image_path)
        
        # Create the prompt for furniture analysis
        analysis_prompt = """
        Analyze this furniture image and provide detailed information in JSON format. Be as specific and accurate as possible.

        Return a JSON object with these exact fields:
        {
            "furniture_type": "specific type (e.g., sectional sofa, dining chair, coffee table)",
            "category": "general category (couch, chair, table, dresser, bookshelf, other)",
            "brand": "brand name if recognizable, otherwise 'Unknown'",
            "style": "design style (e.g., modern, mid-century, traditional, industrial)",
            "material": "primary materials (e.g., leather, fabric, wood, metal)",
            "color": "primary color description",
            "condition_score": "number from 1-10 based on visible condition",
            "condition_notes": "specific observations about wear, damage, or condition",
            "estimated_dimensions": "approximate size description (e.g., '3-seat sofa, ~84 inches wide')",
            "key_features": ["list", "of", "notable", "features"],
            "estimated_original_price": "estimated original retail price range (e.g., '$800-1200')",
            "current_market_value": "current used market value estimate (e.g., '$300-500')",
            "pricing_factors": ["factors", "affecting", "current", "value"],
            "suggested_title": "compelling listing title",
            "suggested_description": "detailed listing description highlighting key selling points"
        }

        Focus on furniture identification, condition assessment, and realistic market pricing based on what you can observe.
        """

        # Make API call to GPT-4 Vision
        response = client.chat.completions.create(
            model="gpt-4o",  # Use gpt-4o which has vision capabilities
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": analysis_prompt
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}",
                                "detail": "high"
                            }
                        }
                    ]
                }
            ],
            max_tokens=1000,
            temperature=0.3  # Lower temperature for more consistent analysis
        )
        
        # Parse the response
        analysis_text = response.choices[0].message.content
        
        # Try to extract JSON from the response
        try:
            # Find JSON block in the response
            start_idx = analysis_text.find('{')
            end_idx = analysis_text.rfind('}') + 1
            
            if start_idx != -1 and end_idx != -1:
                json_str = analysis_text[start_idx:end_idx]
                analysis_data = json.loads(json_str)
                
                # Validate required fields
                required_fields = [
                    'furniture_type', 'category', 'brand', 'style', 'material',
                    'color', 'condition_score', 'condition_notes', 'estimated_dimensions',
                    'key_features', 'estimated_original_price', 'current_market_value',
                    'pricing_factors', 'suggested_title', 'suggested_description'
                ]
                
                for field in required_fields:
                    if field not in analysis_data:
                        analysis_data[field] = "Not determined"
                
                return True, analysis_data
            else:
                return False, "Could not parse JSON from AI response"
                
        except json.JSONDecodeError as e:
            return False, f"JSON parsing error: {str(e)}"
            
    except Exception as e:
        return False, f"Image analysis failed: {str(e)}"

def suggest_pricing(analysis_data, user_max_price=None):
    """
    Generate pricing suggestions based on analysis data and user preferences
    """
    try:
        # Extract current market value
        market_value = analysis_data.get('current_market_value', '')
        condition_score = analysis_data.get('condition_score', 5)
        
        # Parse market value range if possible
        import re
        price_match = re.findall(r'\$?(\d+)', market_value)
        
        if len(price_match) >= 2:
            low_price = int(price_match[0])
            high_price = int(price_match[1])
            avg_price = (low_price + high_price) / 2
        elif len(price_match) == 1:
            avg_price = int(price_match[0])
            low_price = int(avg_price * 0.8)
            high_price = int(avg_price * 1.2)
        else:
            # Fallback pricing based on condition
            if condition_score >= 8:
                avg_price = 400
            elif condition_score >= 6:
                avg_price = 250
            else:
                avg_price = 150
            low_price = int(avg_price * 0.7)
            high_price = int(avg_price * 1.3)
        
        # Generate suggestions
        suggestions = {
            'quick_sale_price': int(low_price * 0.9),
            'market_price': int(avg_price),
            'premium_price': int(high_price),
            'suggested_starting_price': int(avg_price * 1.1),
            'pricing_explanation': f"Based on {condition_score}/10 condition and current market analysis"
        }
        
        return suggestions
        
    except Exception as e:
        # Fallback pricing
        return {
            'quick_sale_price': 100,
            'market_price': 200,
            'premium_price': 350,
            'suggested_starting_price': 220,
            'pricing_explanation': f"Default pricing due to analysis error: {str(e)}"
        }

def generate_listing_content(analysis_data, pricing_suggestions):
    """
    Generate optimized listing title and description
    """
    try:
        title = analysis_data.get('suggested_title', 'Furniture Item')
        description = analysis_data.get('suggested_description', 'Quality furniture piece')
        
        # Enhance description with pricing context
        enhanced_description = f"{description}\n\n"
        enhanced_description += f"📏 Estimated Size: {analysis_data.get('estimated_dimensions', 'See photos')}\n"
        enhanced_description += f"🎨 Style: {analysis_data.get('style', 'Classic')} {analysis_data.get('material', 'construction')}\n"
        enhanced_description += f"⭐ Condition: {analysis_data.get('condition_score', 'N/A')}/10 - {analysis_data.get('condition_notes', 'Good condition')}\n"
        
        if analysis_data.get('key_features'):
            enhanced_description += f"\n✨ Key Features:\n"
            for feature in analysis_data['key_features'][:3]:  # Limit to top 3 features
                enhanced_description += f"• {feature}\n"
        
        enhanced_description += f"\n💰 Priced to sell at ${pricing_suggestions['suggested_starting_price']} (Market value: {analysis_data.get('current_market_value', 'N/A')})"
        
        return {
            'title': title,
            'description': enhanced_description,
            'furniture_type': analysis_data.get('category', 'other').lower()
        }
        
    except Exception as e:
        return {
            'title': 'Quality Furniture Item',
            'description': f'Well-maintained furniture piece. See photos for details.\n\nCondition: Good\nReady for pickup.\n\nGeneration error: {str(e)}',
            'furniture_type': 'other'
        }