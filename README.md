# Furniture Negotiation MVP

A simple multi-agent system where two LangChain agents negotiate furniture prices autonomously.

## Features

- **Two AI Agents**: Buyer and Seller with distinct personalities and strategies
- **Realistic Negotiation**: Agents start with different price points and negotiate toward a deal
- **Conversation Memory**: Each agent maintains context throughout the negotiation
- **Detailed Logging**: Color-coded console output and JSON logs for analysis
- **Multiple Items**: Support for couches, dining tables, and bookshelves

## Quick Start

1. **Install Dependencies**
```bash
pip install -r requirements.txt
```

2. **Set Up Environment**
```bash
cp .env.example .env
# Edit .env and add your OpenAI API key
```

3. **Run a Negotiation**
```bash
python main.py
```

## Project Structure

```
furniture-negotiation-mvp/
├── agents/              # AI agent classes
│   ├── base_agent.py   # Base agent with common functionality
│   ├── buyer_agent.py  # Buyer agent implementation
│   └── seller_agent.py # Seller agent implementation
├── models/             # Data models and state management
│   └── negotiation_state.py
├── utils/              # Logging and helper functions
│   └── conversation_logger.py
└── main.py            # Main orchestration and entry point
```

## How It Works

1. **Initialization**: Create buyer and seller agents with different strategies
2. **Item Setup**: Define furniture item with starting price and details
3. **Negotiation Loop**: 
   - Seller starts with asking price
   - Buyer and seller take turns making offers
   - Each agent considers their constraints (budget/minimum price)
   - Agents can accept, counter-offer, or walk away
4. **Resolution**: Deal accepted or negotiation fails after max rounds

## Agent Strategies

**Buyer Agent**:
- Starts with low offers (60-70% of asking price)
- Gradually increases offers in small increments
- Has a maximum budget (80% of asking price by default)
- Emphasizes any flaws or reasons for lower price

**Seller Agent**:
- Starts at or near asking price
- Reluctantly comes down in price
- Highlights positive features and quality
- Has a minimum acceptable price (70% of asking price by default)

## Customization

### Adjust Agent Behavior
```python
buyer = BuyerAgent("Alice", budget_multiplier=0.9)  # More generous budget
seller = SellerAgent("Bob", minimum_multiplier=0.6)  # More flexible seller
```

### Add New Furniture Types
```python
class FurnitureType(str, Enum):
    COUCH = "couch"
    DINING_TABLE = "dining_table"
    BOOKSHELF = "bookshelf"
    BED = "bed"  # Add new type
```

### Modify LLM Settings
Edit `.env` file:
```
MODEL_NAME=gpt-4  # Use GPT-4 instead of GPT-3.5
TEMPERATURE=0.8   # More creative responses
MAX_TOKENS=200    # Longer responses
```

## Logs and Analysis

- **Console Output**: Color-coded negotiation progress
- **JSON Logs**: Detailed negotiation data saved to `logs/` directory
- **Summary Stats**: Success rate, average rounds, etc.

## Cost Estimation

- **GPT-3.5 Turbo**: ~$0.002 per negotiation
- **GPT-4**: ~$0.05 per negotiation
- **Budget Recommendation**: $10-20 for development

## Next Steps

- Add more complex negotiation factors (delivery, warranty, etc.)
- Implement different agent personalities
- Add reinforcement learning for strategy optimization
- Create web interface for human vs AI negotiations