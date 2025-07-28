from pydantic import BaseModel
from typing import List, Optional
from enum import Enum


class FurnitureType(str, Enum):
    COUCH = "couch"
    DINING_TABLE = "dining_table"
    BOOKSHELF = "bookshelf"


class FurnitureItem(BaseModel):
    name: str
    furniture_type: FurnitureType
    starting_price: float
    condition: str = "used"
    description: str = ""


class Offer(BaseModel):
    price: float
    message: str
    round_number: int
    agent_type: str  # "buyer" or "seller"


class NegotiationResult(str, Enum):
    DEAL_ACCEPTED = "deal_accepted"
    NO_DEAL = "no_deal"
    IN_PROGRESS = "in_progress"


class NegotiationState(BaseModel):
    item: FurnitureItem
    current_offer: Optional[Offer] = None
    offers_history: List[Offer] = []
    round_number: int = 0
    max_rounds: int = 10
    result: NegotiationResult = NegotiationResult.IN_PROGRESS
    final_price: Optional[float] = None
    
    def add_offer(self, offer: Offer) -> None:
        """Add a new offer to the negotiation history"""
        self.offers_history.append(offer)
        self.current_offer = offer
        self.round_number += 1
        
    def is_complete(self) -> bool:
        """Check if negotiation is complete"""
        return (
            self.result != NegotiationResult.IN_PROGRESS or 
            self.round_number >= self.max_rounds
        )
        
    def get_last_offer_by_agent(self, agent_type: str) -> Optional[Offer]:
        """Get the last offer made by a specific agent"""
        for offer in reversed(self.offers_history):
            if offer.agent_type == agent_type:
                return offer
        return None