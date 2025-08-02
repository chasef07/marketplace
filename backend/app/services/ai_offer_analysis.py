"""
AI Offer Analysis Service using OpenAI
Analyzes offers and messages for an item to provide seller insights
"""

import os
from openai import OpenAI
from dotenv import load_dotenv
import json
from typing import List, Dict, Any
from datetime import datetime, timezone

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

def analyze_item_offers(item_data: Dict[str, Any], negotiations: List[Dict[str, Any]], all_offers: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Analyze all offers and messages for an item to provide seller insights
    
    Args:
        item_data: Dict with item info (name, starting_price, etc.)
        negotiations: List of negotiation objects with buyer info
        all_offers: List of all offers with messages
    
    Returns:
        Dict with categorized insights and recommendations
    """
    try:
        # Prepare the data for AI analysis
        analysis_data = {
            "item": {
                "name": item_data.get("name"),
                "starting_price": item_data.get("starting_price"),
                "condition": item_data.get("condition"),
                "furniture_type": item_data.get("furniture_type")
            },
            "offers_summary": {
                "total_offers": len(all_offers),
                "total_buyers": len(negotiations),
                "price_range": {
                    "highest": max([offer["price"] for offer in all_offers]) if all_offers else 0,
                    "lowest": min([offer["price"] for offer in all_offers]) if all_offers else 0
                }
            },
            "detailed_offers": []
        }
        
        # Group offers by buyer and analyze patterns
        buyer_offers = {}
        for negotiation in negotiations:
            buyer_id = negotiation["buyer_id"]
            buyer_offers[buyer_id] = {
                "negotiation_id": negotiation["id"],
                "buyer_info": f"Buyer {buyer_id}",  # We could add more buyer info if available
                "status": negotiation["status"],
                "round_number": negotiation["round_number"],
                "current_offer": negotiation["current_offer"],
                "offers": []
            }
        
        # Add offers to buyer groups
        for offer in all_offers:
            buyer_id = None
            # Find which buyer this offer belongs to
            for negotiation in negotiations:
                if offer["negotiation_id"] == negotiation["id"]:
                    buyer_id = negotiation["buyer_id"]
                    break
            
            if buyer_id and buyer_id in buyer_offers:
                buyer_offers[buyer_id]["offers"].append({
                    "price": offer["price"],
                    "message": offer.get("message", ""),
                    "offer_type": offer["offer_type"],
                    "round_number": offer["round_number"],
                    "created_at": offer["created_at"].isoformat() if isinstance(offer["created_at"], datetime) else str(offer["created_at"])
                })
        
        analysis_data["buyer_negotiations"] = list(buyer_offers.values())
        
        # Create the prompt for offer analysis
        analysis_prompt = f"""
        You are an AI assistant helping furniture sellers analyze offers on their items. 
        Analyze the following offer data and provide strategic insights.

        Item Details:
        - Name: {analysis_data['item']['name']}
        - Starting Price: ${analysis_data['item']['starting_price']}
        - Condition: {analysis_data['item']['condition']}
        - Type: {analysis_data['item']['furniture_type']}

        Offer Summary:
        - Total Offers: {analysis_data['offers_summary']['total_offers']}
        - Total Buyers: {analysis_data['offers_summary']['total_buyers']}
        - Price Range: ${analysis_data['offers_summary']['price_range']['lowest']} - ${analysis_data['offers_summary']['price_range']['highest']}

        Detailed Buyer Negotiations:
        {json.dumps(analysis_data['buyer_negotiations'], indent=2)}

        Analyze this data and return a JSON response with these exact fields:
        {{
            "priority_offers": [
                {{
                    "buyer_info": "Brief buyer description",
                    "current_offer": 850,
                    "percentage_of_asking": 94,
                    "reason": "Why this is priority (high offer, good communication, etc.)"
                }}
            ],
            "fair_offers": [
                {{
                    "buyer_info": "Brief buyer description", 
                    "current_offer": 750,
                    "percentage_of_asking": 83,
                    "reason": "Why this is fair (reasonable offer, responsive, etc.)"
                }}
            ],
            "lowball_offers": [
                {{
                    "buyer_info": "Brief buyer description",
                    "current_offer": 400, 
                    "percentage_of_asking": 44,
                    "reason": "Why this is lowball (very low offer, poor communication, etc.)"
                }}
            ],
            "recommendations": [
                "Specific actionable advice for the seller",
                "Which buyers to prioritize and why",
                "Suggested counter-offers or strategies"
            ],
            "market_insights": {{
                "average_offer_percentage": 78,
                "buyer_engagement_level": "high/medium/low",
                "pricing_strategy": "Your current pricing appears to be competitive/high/low based on offer patterns"
            }}
        }}

        Guidelines for categorization:
        - Priority Offers: 85%+ of asking price, good communication, multiple rounds showing serious interest
        - Fair Offers: 70-84% of asking price, decent communication, reasonable negotiation behavior  
        - Lowball Offers: Below 70% of asking price, poor/no communication, or unrealistic expectations

        Be specific and actionable in your recommendations. Focus on helping the seller make the best decision.
        """

        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {
                    "role": "system", 
                    "content": "You are an expert marketplace advisor helping sellers optimize their negotiations. Provide clear, actionable insights based on offer patterns and buyer behavior."
                },
                {
                    "role": "user",
                    "content": analysis_prompt
                }
            ],
            temperature=0.3,
            max_tokens=2000
        )
        
        # Parse the response
        analysis_result = json.loads(response.choices[0].message.content)
        
        # Add metadata
        analysis_result["analysis_metadata"] = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "total_offers_analyzed": len(all_offers),
            "total_buyers_analyzed": len(negotiations)
        }
        
        return analysis_result
        
    except Exception as e:
        print(f"AI Analysis Error: {str(e)}")  # Debug logging
        
        # Provide basic categorization as fallback
        starting_price = item_data.get("starting_price", 0)
        if starting_price > 0:
            priority_offers = []
            fair_offers = []
            lowball_offers = []
            
            # Simple categorization based on percentage
            for offer in all_offers:
                percentage = (offer["price"] / starting_price) * 100
                buyer_info = f"Buyer {offer.get('buyer_id', 'Unknown')}"
                
                offer_item = {
                    "buyer_info": buyer_info,
                    "current_offer": offer["price"],
                    "percentage_of_asking": int(percentage),
                    "reason": f"{percentage:.1f}% of asking price"
                }
                
                if percentage >= 85:
                    priority_offers.append(offer_item)
                elif percentage >= 70:
                    fair_offers.append(offer_item)
                else:
                    lowball_offers.append(offer_item)
            
            avg_percentage = sum(o["price"] for o in all_offers) / len(all_offers) / starting_price * 100 if all_offers else 0
            
            return {
                "error": f"AI analysis temporarily unavailable: {str(e)}",
                "priority_offers": priority_offers,
                "fair_offers": fair_offers,
                "lowball_offers": lowball_offers,
                "recommendations": [
                    f"Found {len(priority_offers)} high-value offers above 85%",
                    f"Found {len(fair_offers)} reasonable offers between 70-84%",
                    f"Found {len(lowball_offers)} low offers below 70%",
                    "Consider responding to higher percentage offers first"
                ],
                "market_insights": {
                    "average_offer_percentage": int(avg_percentage),
                    "buyer_engagement_level": "high" if len(all_offers) > 20 else "medium" if len(all_offers) > 10 else "low",
                    "pricing_strategy": f"Average offer is {avg_percentage:.1f}% of asking price"
                },
                "analysis_metadata": {
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                    "total_offers_analyzed": len(all_offers),
                    "total_buyers_analyzed": len(negotiations)
                }
            }
        
        # Return basic error response
        return {
            "error": f"Analysis failed: {str(e)}",
            "priority_offers": [],
            "fair_offers": [],
            "lowball_offers": [],
            "recommendations": ["Unable to analyze offers at this time. Please try again later."],
            "market_insights": {
                "average_offer_percentage": 0,
                "buyer_engagement_level": "unknown",
                "pricing_strategy": "Analysis unavailable"
            },
            "analysis_metadata": {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "total_offers_analyzed": len(all_offers),
                "total_buyers_analyzed": len(negotiations)
            }
        }