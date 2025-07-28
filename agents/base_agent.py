from abc import ABC, abstractmethod
from langchain.memory import ConversationBufferMemory
from langchain.schema import HumanMessage, AIMessage
from langchain_openai import ChatOpenAI
from models import NegotiationState, Offer
import os
from dotenv import load_dotenv

load_dotenv()


class BaseAgent(ABC):
    def __init__(self, name: str, agent_type: str):
        self.name = name
        self.agent_type = agent_type
        self.memory = ConversationBufferMemory(return_messages=True)
        
        # Initialize LLM
        self.llm = ChatOpenAI(
            model_name=os.getenv("MODEL_NAME", "gpt-3.5-turbo"),
            temperature=float(os.getenv("TEMPERATURE", 0.7)),
            max_tokens=int(os.getenv("MAX_TOKENS", 150))
        )
        
    @abstractmethod
    def get_system_prompt(self) -> str:
        """Return the system prompt for this agent"""
        pass
        
    @abstractmethod
    def should_accept_offer(self, current_offer: float, item_price: float) -> bool:
        """Determine if the agent should accept the current offer"""
        pass
        
    @abstractmethod
    def get_walk_away_price(self, item_price: float) -> float:
        """Get the price at which this agent will walk away"""
        pass
        
    def generate_response(self, negotiation_state: NegotiationState) -> Offer:
        """Generate a response based on the current negotiation state"""
        
        # Build context from negotiation history
        context = self._build_context(negotiation_state)
        
        # Get system prompt
        system_prompt = self.get_system_prompt()
        
        # Create the full prompt
        full_prompt = f"{system_prompt}\n\n{context}\n\nYour response (price and message):"
        
        # Generate response
        response = self.llm.invoke([HumanMessage(content=full_prompt)])
        
        # Parse response into offer
        offer = self._parse_response(response.content, negotiation_state.round_number + 1)
        
        # Add to memory
        self.memory.chat_memory.add_message(HumanMessage(content=context))
        self.memory.chat_memory.add_message(AIMessage(content=response.content))
        
        return offer
        
    def _build_context(self, negotiation_state: NegotiationState) -> str:
        """Build context string from negotiation state"""
        item = negotiation_state.item
        context = f"Item: {item.name} ({item.condition})\n"
        context += f"Description: {item.description}\n"
        context += f"Starting price: ${item.starting_price}\n"
        context += f"Round: {negotiation_state.round_number + 1}/{negotiation_state.max_rounds}\n\n"
        
        if negotiation_state.offers_history:
            context += "Negotiation history:\n"
            for offer in negotiation_state.offers_history:
                agent_name = "Buyer" if offer.agent_type == "buyer" else "Seller"
                context += f"{agent_name}: ${offer.price} - {offer.message}\n"
        
        return context
        
    def _parse_response(self, response: str, round_number: int) -> Offer:
        """Parse LLM response into an Offer object"""
        lines = response.strip().split('\n')
        
        # Try to extract price (look for $ or number)
        price = None
        message = response.strip()
        
        for line in lines:
            # Look for price patterns
            import re
            price_match = re.search(r'\$?(\d+(?:\.\d{2})?)', line)
            if price_match:
                price = float(price_match.group(1))
                # Remove price from message
                message = re.sub(r'\$?\d+(?:\.\d{2})?', '', response).strip()
                break
                
        if price is None:
            # Default fallback price logic
            price = 0.0
            
        return Offer(
            price=price,
            message=message,
            round_number=round_number,
            agent_type=self.agent_type
        )