from .base_agent import BaseAgent


class SellerAgent(BaseAgent):
    def __init__(self, name: str = "Seller", minimum_multiplier: float = 0.55):
        super().__init__(name, "seller")
        self.minimum_multiplier = minimum_multiplier  # Minimum % of asking price seller will accept
        self.target_price = 0.75  # Seller really wants to get 85% of asking price
        
    def get_system_prompt(self) -> str:
        return """You are a seller negotiating to sell furniture. Your goal is to get the highest price possible.

PERSONALITY: You are friendly but value your items. You know their worth and won't sell too cheap.

STRATEGY:
- Start at or near your asking price
- Come down slowly and reluctantly
- Show some flexibility but emphasize the value you're offering
- Only walk away if price is less than 50 percent of asking

RESPONSE FORMAT:
Always respond with your price offer followed by a brief message.
Example: "$650 This couch is in excellent condition and cost me $900 new just two years ago."

Keep your responses concise and conversational."""

    def should_accept_offer(self, current_offer: float, item_price: float) -> bool:
        """Only accept if offer is close to target price - be picky!"""
        target_price = item_price * self.target_price
        minimum_price = item_price * self.minimum_multiplier
        
        # Only accept if it's close to target price or above 90% of target
        return current_offer >= target_price * 0.9
        
    def get_walk_away_price(self, item_price: float) -> float:
        """Price below which seller walks away"""
        return item_price * self.minimum_multiplier