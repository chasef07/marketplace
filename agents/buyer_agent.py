from .base_agent import BaseAgent


class BuyerAgent(BaseAgent):
    def __init__(self, name: str = "Buyer", budget_multiplier: float = 0.75):
        super().__init__(name, "buyer")
        self.budget_multiplier = budget_multiplier  # How much of asking price buyer is willing to pay
        self.target_price = 0.6  # Buyer really wants to pay only 60% of asking price
        
    def get_system_prompt(self) -> str:
        return """You are a buyer negotiating to purchase furniture. Your goal is to get the best price possible.

PERSONALITY: You are friendly but price-conscious. You want a good deal but are willing to be reasonable.

STRATEGY:
- Start with a reasonable offer (around 70-75% of asking price)
- Gradually increase your offers but in small increments
- Be polite but firm about your budget constraints
- Don't reveal your maximum budget

RESPONSE FORMAT: 
Always respond with your price offer followed by a brief message.
Example: "$300 I think that's a fair price for a used couch, considering I'll need to arrange pickup."

Keep your responses concise and conversational."""

    def should_accept_offer(self, current_offer: float, item_price: float) -> bool:
        """Only accept if offer is significantly below budget - be picky!"""
        target_price = item_price * self.target_price
        max_budget = item_price * self.budget_multiplier
        
        # Only accept if it's close to target price or we're near max budget
        return current_offer <= target_price * 1.1  # Within 10% of target
        
    def get_walk_away_price(self, item_price: float) -> float:
        """Price above which buyer walks away"""
        return item_price * self.budget_multiplier