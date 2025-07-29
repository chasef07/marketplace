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
        
        # Enhanced attributes for market awareness
        self.risk_tolerance = 0.5  # 0-1 scale, affects decision making
        self.negotiation_style = "balanced"  # aggressive, balanced, conservative
        self.market_awareness = 0.7  # How much market conditions affect decisions
        
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
    
    def get_market_adjusted_prompt(self, market_pressure: float = 1.0, 
                                 time_pressure: float = 1.0) -> str:
        """Get system prompt adjusted for market and time conditions"""
        base_prompt = self.get_system_prompt()
        
        # Add market context
        if market_pressure > 1.05:
            market_context = "\n\nMARKET CONDITIONS: The market is favorable to you. You can be more assertive with pricing."
        elif market_pressure < 0.95:
            market_context = "\n\nMARKET CONDITIONS: The market is challenging. Consider being more flexible with pricing."
        else:
            market_context = "\n\nMARKET CONDITIONS: Normal market conditions."
        
        # Add time pressure context
        if time_pressure > 1.15:
            time_context = "\n\nTIME PRESSURE: High urgency! You need to make decisions quickly and be more flexible."
        elif time_pressure > 1.05:
            time_context = "\n\nTIME PRESSURE: Some time pressure. Consider moving toward a deal."
        else:
            time_context = "\n\nTIME PRESSURE: No rush. Take your time to negotiate."
        
        return base_prompt + market_context + time_context
        
    def generate_response(self, negotiation_state: NegotiationState, 
                         market_pressure: float = 1.0, 
                         time_pressure: float = 1.0) -> Offer:
        """Generate a response based on the current negotiation state with market context"""
        
        # Build context from negotiation history
        context = self._build_context(negotiation_state, market_pressure, time_pressure)
        
        # Get market-adjusted system prompt
        system_prompt = self.get_market_adjusted_prompt(market_pressure, time_pressure)
        
        # Create the full prompt
        full_prompt = f"{system_prompt}\n\n{context}\n\nYour response (price and message):"
        
        # Generate response
        response = self.llm.invoke([HumanMessage(content=full_prompt)])
        
        # Parse response into offer
        offer = self._parse_response(response.content, negotiation_state.round_number + 1)
        
        # Apply market adjustments to price if needed
        offer.price = self._apply_market_adjustments(
            offer.price, negotiation_state.item.starting_price, 
            market_pressure, time_pressure
        )
        
        # Add to memory
        self.memory.chat_memory.add_message(HumanMessage(content=context))
        self.memory.chat_memory.add_message(AIMessage(content=response.content))
        
        return offer
        
    def _build_context(self, negotiation_state: NegotiationState, 
                      market_pressure: float = 1.0, 
                      time_pressure: float = 1.0) -> str:
        """Build context string from negotiation state with market indicators"""
        item = negotiation_state.item
        context = f"Item: {item.name} ({item.condition})\n"
        context += f"Description: {item.description}\n"
        context += f"Starting price: ${item.starting_price}\n"
        context += f"Round: {negotiation_state.round_number + 1}/{negotiation_state.max_rounds}\n"
        
        # Add market indicators
        if market_pressure != 1.0:
            market_indicator = "🔥 Hot Market" if market_pressure > 1.0 else "❄️ Cold Market"
            context += f"Market: {market_indicator} (pressure: {market_pressure:.2f})\n"
        
        if time_pressure > 1.05:
            time_indicator = "⏰ Time Pressure" if time_pressure < 1.15 else "🚨 HIGH URGENCY"
            context += f"Time: {time_indicator} (pressure: {time_pressure:.2f})\n"
        
        context += "\n"
        
        if negotiation_state.offers_history:
            context += "Negotiation history:\n"
            for offer in negotiation_state.offers_history:
                agent_name = "Buyer" if offer.agent_type == "buyer" else "Seller"
                context += f"{agent_name}: ${offer.price} - {offer.message}\n"
        
        return context
    
    def _apply_market_adjustments(self, base_price: float, starting_price: float,
                                market_pressure: float, time_pressure: float) -> float:
        """Apply market and time pressure adjustments to the proposed price"""
        
        # Calculate adjustment factor based on agent type and market conditions
        if self.agent_type == "seller":
            # Sellers benefit from hot markets and can resist time pressure initially
            market_adjustment = 1.0 + (market_pressure - 1.0) * self.market_awareness
            time_adjustment = 1.0 - (time_pressure - 1.0) * 0.5 * (1 - self.risk_tolerance)
        else:  # buyer
            # Buyers benefit from cold markets and are more affected by time pressure
            market_adjustment = 1.0 - (market_pressure - 1.0) * self.market_awareness * 0.5
            time_adjustment = 1.0 + (time_pressure - 1.0) * 0.3 * self.risk_tolerance
        
        # Apply adjustments
        adjusted_price = base_price * market_adjustment * time_adjustment
        
        # Keep price within reasonable bounds
        min_price = starting_price * 0.3
        max_price = starting_price * 1.5
        
        return max(min_price, min(max_price, adjusted_price))
        
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
    
    def calculate_risk_adjusted_threshold(self, base_threshold: float, 
                                        market_pressure: float, 
                                        time_pressure: float) -> float:
        """Calculate risk-adjusted threshold for decision making"""
        
        # Risk tolerance affects how much pressure influences decisions
        risk_factor = 1.0 + (self.risk_tolerance - 0.5) * 0.4
        
        # Market and time pressures
        pressure_adjustment = (market_pressure * time_pressure - 1.0) * risk_factor
        
        if self.agent_type == "seller":
            # Sellers lower their threshold under pressure
            return base_threshold * (1.0 - pressure_adjustment * 0.1)
        else:
            # Buyers raise their threshold under pressure
            return base_threshold * (1.0 + pressure_adjustment * 0.1)