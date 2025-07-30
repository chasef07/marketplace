# 🤖 AI Agent Marketplace

An intelligent web-based marketplace where AI agents with distinct personalities negotiate automatically between buyers and sellers, featuring user authentication, real-time negotiations, and database persistence.

## ✨ Major Features

### 🎭 **AI Personality System**
- **4 Seller Personalities**: Aggressive, Flexible, Quick Sale, Premium
- **5 Buyer Personalities**: Bargain Hunter, Fair, Quick, Premium, Student
- **Intelligent Negotiation**: AI agents negotiate back-and-forth automatically
- **Real-time Updates**: Watch negotiations progress in real-time

### 🔐 **User Authentication & Database**
- **User Registration & Login** with secure password hashing
- **SQLite Database** with persistent data storage
- **Profile Management** with AI personality settings
- **Session-based Authentication** with Flask-Login

### 🏪 **Web-Based Marketplace**
- **Flask Web Interface** - modern, responsive design
- **Smart Photo Upload** with AI-powered furniture analysis
- **Auto-Generated Listings** - AI creates titles, descriptions, and pricing
- **Browse Items** from other users with filtering
- **Real-time Negotiation Pages** with auto-refresh

### 📸 **AI Image Analysis (NEW!)**
- **GPT-4 Vision Integration** - analyzes uploaded furniture photos instantly
- **Furniture Recognition** - identifies type, brand, style, materials, condition
- **Smart Pricing** - estimates original retail price and current market value
- **Professional Listings** - generates compelling titles and descriptions
- **One-Click Enhancement** - apply AI suggestions or keep manual input

### 🤝 **Smart Negotiation System**
- **Automatic AI Responses** - AI agents respond within seconds
- **Multi-round Negotiations** - up to 10 rounds per negotiation
- **Personality-based Behavior** - different AI styles create varied negotiations
- **Deal Completion** - automatic finalization when agreement is reached

## 🚀 Quick Start

### Prerequisites
- Python 3.7+
- Git

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd marketplace
   ```

2. **Create and activate virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up the database:**
   ```bash
   python fix_database.py
   ```

5. **Start the marketplace:**
   ```bash
   python app.py
   ```

6. **Open your browser:**
   ```
   http://localhost:8000
   ```

## 🎯 How to Use

### 1. Create Your Account
- Go to http://localhost:8000
- Click "Register" 
- Choose your AI seller and buyer personalities
- Complete registration

### 2. Create a Listing (Enhanced with AI!)
- Click "Create Listing"
- Upload a photo of your furniture
- **AI analyzes your photo instantly** - detects type, brand, condition, style
- **Review AI suggestions** - pricing, title, description automatically generated
- **Choose**: Use AI suggestions or keep your manual input
- Submit your enhanced listing

### 3. Start Negotiating
- Browse available items
- Click "Start Negotiation" on items you want
- Make your initial offer
- Watch your AI buyer negotiate automatically!

### 4. Manage Your AI
- Go to "AI Settings" to change personalities anytime
- View "My Profile" to see your current AI settings
- Monitor negotiations in real-time

## 🤖 AI Personality Guide

### Seller Personalities
- **🔥 Aggressive**: Holds firm on prices, emphasizes value
- **🤝 Flexible**: Willing to negotiate, balanced approach *(Recommended)*
- **⚡ Quick Sale**: Motivated to sell fast, more flexible on price
- **💎 Premium**: Focuses on quality and craftsmanship

### Buyer Personalities  
- **💰 Bargain Hunter**: Aggressive about getting the best deals
- **⚖️ Fair**: Balanced negotiator seeking win-win deals *(Recommended)*
- **🚀 Quick**: Ready to buy fast at reasonable prices
- **👑 Premium**: Values quality, willing to pay more
- **🎓 Student**: Budget-conscious but polite

## 🛠️ Technical Details

### Built With
- **Backend**: Flask, SQLAlchemy, Flask-Login
- **Database**: SQLite with automatic schema creation
- **AI**: OpenAI GPT-4 Vision for image analysis + GPT-3.5 for negotiations
- **Frontend**: HTML, CSS, JavaScript with real-time updates
- **Images**: Pillow for upload processing and resizing
- **Computer Vision**: GPT-4 Vision API for furniture recognition

### Project Structure
```
marketplace/
├── agents/                 # AI agent personalities
│   ├── base_agent.py      # Base AI agent class
│   ├── buyer_agent.py     # Buyer agent logic
│   ├── seller_agent.py    # Seller agent logic
│   ├── buyer_personalities.py  # 5 buyer personality types
│   └── seller_personalities.py # 4 seller personality types
├── models/                 # Database models
│   ├── database.py        # SQLAlchemy models
│   └── negotiation_state.py # Legacy state management
├── services/              # Business logic
│   ├── ai_negotiation.py  # AI negotiation service
│   └── ai_image_analysis.py # GPT-4 Vision image analysis
├── templates/             # HTML templates
│   ├── auth/             # Login/register pages
│   ├── *.html           # Main application pages
├── static/               
│   └── uploads/          # User uploaded images
├── utils/                # Utilities
│   └── file_handler.py   # Image upload handling
├── app.py               # Main Flask application
├── auth.py              # Authentication routes
├── forms.py             # WTF forms
├── fix_database.py      # Database setup script
└── requirements.txt     # Python dependencies
```

## 🎮 Enhanced Seller Experience Flow

### 📸 AI-Powered Listing Creation
1. **Upload Photo** → Seller uploads furniture image
2. **AI Analysis** → GPT-4 Vision identifies: "Mid-Century Modern Teak Dining Table, 6-seat, Excellent condition (8/10)"
3. **Smart Pricing** → AI suggests: Quick Sale $650, Market $850, Premium $1100
4. **Auto-Generation** → Creates title: "Beautiful Mid-Century Teak Dining Table - Seats 6, Excellent Condition"
5. **One-Click Apply** → Seller reviews and accepts AI suggestions

### 🤝 Negotiation Example
1. **AI-Enhanced Listing** created with optimal pricing and description
2. **Human Buyer** makes initial offer of $750 (Fair personality)
3. **AI Flexible Seller** responds: *"$800 - This is a genuine mid-century piece in excellent condition"*
4. **AI Fair Buyer** responds: *"$775 - I appreciate the quality, meeting in the middle?"*
5. **Deal reached** at $775 after 3 efficient rounds

## 🔧 Configuration

### Environment Variables
The marketplace uses your OpenAI API key from the `.env` file:
```
OPENAI_API_KEY=your_openai_api_key_here
MODEL_NAME=gpt-3.5-turbo
TEMPERATURE=0.7
MAX_TOKENS=150
```

### Database Schema
- **Users**: Authentication info + AI personality preferences  
- **Items**: Marketplace listings with images and pricing
- **Negotiations**: Active negotiation sessions between users
- **Offers**: Individual offers within negotiations

## 🐛 Troubleshooting

### Database Issues
If you see "no such column" errors:
```bash
python fix_database.py
python app.py
```

### Port Already in Use
If port 8000 is busy, the app will show a warning but still work:
```
Go to: http://localhost:8000
```

### Missing Dependencies
```bash
pip install -r requirements.txt
```

### OpenAI API Key
Make sure your `.env` file has a valid OpenAI API key:
```bash
echo "OPENAI_API_KEY=your_key_here" > .env
```

## 🚀 What's New in This Version

### 🆕 Latest Features (v2.1)
- ✅ **GPT-4 Vision Integration** - AI analyzes furniture photos instantly
- ✅ **Smart Listing Generation** - Auto-creates titles, descriptions, pricing
- ✅ **Furniture Recognition** - Detects type, brand, style, condition automatically
- ✅ **Market-Based Pricing** - AI estimates retail and current market values
- ✅ **One-Click Enhancement** - Apply AI suggestions or keep manual input
- ✅ **Real-Time Analysis** - Image processing during upload

### Major Updates (v2.0)
- ✅ **Multiple AI Personalities** - Choose from 9 different AI agent types
- ✅ **Web-Based Interface** - Full Flask web application with modern UI
- ✅ **User Authentication** - Secure login/registration system
- ✅ **Database Integration** - Persistent SQLite storage
- ✅ **Image Upload System** - Upload and resize photos for listings
- ✅ **Real-time Negotiation** - Watch AI agents negotiate with auto-refresh
- ✅ **Settings Management** - Change AI personalities anytime
- ✅ **Profile System** - Manage your listings and negotiations

### Technical Improvements
- ✅ **Flask Architecture** - Professional web application structure
- ✅ **SQLAlchemy ORM** - Proper database relationships and queries
- ✅ **Form Validation** - Secure input handling with WTF forms
- ✅ **File Management** - Secure image processing with Pillow
- ✅ **Session Management** - Flask-Login for user sessions
- ✅ **Background Processing** - AI responses in separate threads
- ✅ **Auto-refresh UI** - Real-time updates without manual refresh

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**🎉 Ready to start trading with AI agents? Follow the Quick Start guide above!**