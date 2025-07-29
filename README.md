# 🤖 AI Agent Marketplace MVP

A production-ready, scalable marketplace system where AI agents negotiate on behalf of real users. Multiple buyers can compete for items simultaneously while humans maintain control over final decisions.

## 🔥 Major Features

### **Scalable Concurrent Processing**
- Handle **100+ simultaneous negotiations** using ThreadPoolExecutor
- Real-time monitoring of all active negotiations
- Thread-safe operations with proper resource management

### **Multi-Agent Competition**
- **10 distinct buyer personalities** (Premium, Budget, Bargain Hunter, etc.)
- Multiple buyers negotiate for same item creating market pressure
- Realistic human-like negotiation behaviors and strategies

### **Complete User Management**
- User registration as buyers/sellers with personalized preferences
- Agent personality selection and budget configuration
- Human confirmation layer for all final deals

### **Production Architecture**
- Automatic cleanup of expired listings and deals
- Background monitoring and status tracking  
- Comprehensive error handling and logging
- Database-ready data structures (currently in-memory)

## 🚀 Quick Start

1. **Install Dependencies**
```bash
pip install -r requirements.txt
```

2. **Set Up Environment**
```bash
# Create .env file with your OpenAI API key
echo "OPENAI_API_KEY=your_key_here" > .env
```

3. **Run the Marketplace**

### **Option 1: Full Marketplace Demo (Recommended)**
```bash
python agent_marketplace_demo.py
```
- 5 sellers with different furniture items
- 10 buyers with distinct AI personalities  
- 15-20 concurrent negotiations
- Complete deal lifecycle demonstration

### **Option 2: Interactive Testing**
```bash
python interactive_test.py
```
- Create custom listings with your own prices
- Select specific buyers to negotiate
- Monitor negotiations in real-time
- Manually confirm or reject deals

### **Option 3: Component Testing**
```bash
python test_orchestrator.py
```
- Step-by-step system component verification
- Detailed logging of each operation

### **Option 4: Original Simple Version**
```bash
python main.py
```
- Single negotiation between one buyer and seller

## 📁 Project Structure

```
ai-agent-marketplace/
├── 🏗️ CORE SYSTEM
│   ├── scalable_orchestrator.py    # Production marketplace orchestrator  
│   ├── agents/                     # AI agent implementations
│   │   ├── base_agent.py          # Enhanced base agent with market awareness
│   │   ├── buyer_agent.py         # Buyer agent with personality profiles
│   │   └── seller_agent.py        # Seller agent with pricing strategies
│   ├── models/                    # Data structures and state management
│   │   └── negotiation_state.py   # Negotiation lifecycle management
│   └── utils/                     # Utilities and logging
│       └── conversation_logger.py # Enhanced logging with analytics
│
├── 🧪 TESTING & DEMOS  
│   ├── agent_marketplace_demo.py   # Full marketplace demonstration
│   ├── interactive_test.py         # Manual testing interface
│   ├── test_orchestrator.py        # Component unit testing
│   └── main.py                     # Original simple negotiation
│
├── 📊 DATA & LOGS
│   └── logs/                       # Negotiation history and analytics
│
└── 📋 CONFIGURATION
    ├── requirements.txt            # Python dependencies
    ├── .env                       # Environment variables (API keys)
    └── README.md                  # This file
```

## 🔄 How the Marketplace Works

### **1. User Registration & Setup**
```python
# Users register with preferences
seller_id = orchestrator.register_user("John", UserRole.SELLER, "Standard Seller")
buyer_id = orchestrator.register_user("Alice", UserRole.BUYER, "Premium Buyer", budget=(500, 2000))
```

### **2. Item Listing**
```python  
# Sellers create listings with pricing parameters
listing_id = orchestrator.create_listing(
    seller_user_id=seller_id,
    item=furniture_item,
    asking_price=800.0,
    minimum_price=500.0
)
```

### **3. Buyer Interest & Competition**
- Multiple buyers express interest in same item
- System manages concurrent negotiations automatically
- Buyers compete through AI agents with distinct personalities

### **4. Autonomous Negotiation**
- AI agents negotiate using LangChain/OpenAI with realistic strategies
- Buyer personalities determine negotiation approach (aggressive vs conservative)
- Seller agents balance profit margins with deal completion

### **5. Human Confirmation**
- When agents reach agreement, deal enters "pending" status
- Both buyer and seller humans have 24 hours to confirm
- Only confirmed deals are finalized

### **6. Market Intelligence**
- System tracks successful deal prices for market awareness
- Future agents can use historical data for smarter negotiations
- Analytics provide insights into buyer/seller behavior patterns

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

## Winner Selection & Competition

The system currently uses **Option A: Highest Price Wins** - the first buyer to successfully negotiate gets the item immediately, with other negotiations cancelled.

### Future Competition Models

**🏆 Option B: Competition Window + Seller Choice**
- When first negotiation succeeds, start 30-60 second competition window
- Collect all successful negotiations during window period
- Seller gets 24 hours to choose from top 3 offers (price + buyer profile)
- Enables seller preference beyond pure price maximization

**🎯 Option C: Final Sealed-Bid Auction**  
- Competition window collects initial successful negotiations
- Top bidders enter sealed-bid final round (single best offer)
- Most competitive option - encourages buyers to bid their true maximum
- Automatic selection of highest sealed bid after deadline

**Implementation Status:**
- ✅ **Option A**: Highest price wins (current implementation)
- 🚧 **Option B**: Competition window framework in place, needs seller UI
- 🚧 **Option C**: Requires sealed-bid negotiation round implementation

## Next Steps

- **Competition Enhancement**: Implement Options B & C for more realistic bidding
- **Market Intelligence**: Add historical price data for smarter agent strategies  
- **Complex Negotiations**: Add delivery, warranty, condition factors
- **Web Interface**: Create human vs AI negotiation portal
- **Reinforcement Learning**: Strategy optimization based on success patterns