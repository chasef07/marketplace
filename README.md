# 🏪 AI-Powered Furniture Marketplace

A production-ready full-stack marketplace application with AI-powered image analysis for buying and selling furniture. Modern architecture with **FastAPI backend** and **Next.js frontend**.

## ✨ Features

### 📸 **AI Image Analysis**
- **GPT-4 Vision Integration** - analyzes uploaded furniture photos instantly
- **Furniture Recognition** - identifies type, brand, style, materials, condition
- **Smart Pricing** - estimates retail and market values with market analysis
- **Auto-Generated Listings** - creates professional titles and descriptions

### 🔐 **User Management**
- **JWT Authentication** - secure token-based authentication
- **User Profiles** - manage account settings and preferences
- **Session Management** - FastAPI security with Bearer tokens

### 🏪 **Marketplace Features**
- **Item Listings** - create, view, and manage furniture listings
- **Image Upload** - secure photo storage and processing
- **Browse Marketplace** - view available items with filtering
- **Responsive Design** - works on desktop and mobile

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- OpenAI API Key

### Installation & Setup

1. **Clone and setup:**
   ```bash
   git clone <your-repo-url>
   cd marketplace
   ```

2. **Backend setup:**
   ```bash
   # Create virtual environment
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   
   # Install dependencies
   pip install -r requirements.txt
   
   # Configure environment
   cp backend/.env.example backend/.env
   # Edit backend/.env and add your OpenAI API key
   ```

3. **Frontend setup:**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Run the application:**
   
   **Terminal 1 - Backend:**
   ```bash
   cd backend
   python3 main.py
   ```
   ✅ Backend running at: http://localhost:8000
   📚 API Documentation: http://localhost:8000/docs
   
   **Terminal 2 - Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```
   ✅ Frontend running at: http://localhost:3000

## 🎯 How to Use

1. **Visit** http://localhost:3000
2. **Upload Image** - take or upload a furniture photo for AI analysis
3. **Review Analysis** - view AI-generated furniture details and pricing
4. **Create Account** - register with the analysis results
5. **Browse Marketplace** - explore all available listings
6. **Manage Listings** - view and manage your items

## 🛠️ Tech Stack

### Backend
- **FastAPI** - Modern, fast web framework for building APIs
- **SQLAlchemy** - Database ORM with SQLite (dev) / PostgreSQL (production)
- **JWT Authentication** - Secure token-based authentication
- **OpenAI GPT-4 Vision** - AI image analysis and furniture recognition
- **Uvicorn** - ASGI server for high performance

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript development
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Smooth animations and transitions

### AI & Processing
- **GPT-4 Vision** - Advanced image analysis and understanding
- **Pillow** - Image processing and optimization
- **Pydantic** - Data validation and serialization

## 📁 Project Structure

```
marketplace/
├── backend/                    # FastAPI Backend
│   ├── app/
│   │   ├── api/               # API routes (auth, items, users)
│   │   ├── core/              # Configuration & database
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas  
│   │   └── services/          # AI analysis & file handling
│   ├── uploads/               # User uploaded images
│   ├── main.py               # FastAPI application entry point
│   ├── marketplace.db        # SQLite database
│   └── .env                  # Environment variables
├── frontend/                  # Next.js Frontend
│   ├── src/
│   │   ├── app/              # Next.js app router pages
│   │   ├── components/       # React components
│   │   └── lib/              # API client & utilities
│   └── package.json
├── requirements.txt          # Python dependencies
└── README.md
```

## 🔧 Configuration

Create `backend/.env` with your configuration:
```env
OPENAI_API_KEY=your_openai_api_key_here
DATABASE_URL=sqlite:///./marketplace.db
SECRET_KEY=your-secure-jwt-secret-key
```

## 🔒 Security Features

- **JWT Authentication** - Secure token-based auth with configurable expiration
- **Password Hashing** - bcrypt password hashing with salt
- **Input Validation** - Pydantic schemas for request/response validation
- **CORS Protection** - Configurable CORS middleware
- **File Upload Security** - File type validation and secure storage

## 📚 API Documentation

Once the backend is running, visit:
- **Interactive API Docs**: http://localhost:8000/docs (Swagger UI)
- **Alternative Docs**: http://localhost:8000/redoc (ReDoc)

### Key Endpoints:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/items/analyze-image` - AI image analysis
- `GET /api/items/` - List marketplace items
- `POST /api/items/` - Create new listing

## 🧪 Development

### Running Tests
```bash
# Backend tests (when implemented)
cd backend
pytest

# Frontend tests (when implemented)
cd frontend
npm test
```

### Database Management
```bash
# View database contents
sqlite3 marketplace.db
.tables
.schema users
.schema items
```

## 🚀 Production Deployment

### Environment Variables
```env
DATABASE_URL=postgresql://user:pass@host:port/db
OPENAI_API_KEY=your_production_openai_key
SECRET_KEY=your_very_secure_jwt_secret
```

### Backend Deployment
- Use production ASGI server (Gunicorn + Uvicorn)
- Configure PostgreSQL database
- Set up proper logging and monitoring
- Enable HTTPS and secure headers

### Frontend Deployment
- Build with `npm run build`
- Deploy to Vercel, Netlify, or similar platform
- Configure environment variables for API URL

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 🐛 Known Issues

- Username generation uses email prefix which can cause duplicates
- Some database files need consolidation (cleanup in progress)
- Image serving path needs standardization

## 📝 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ using FastAPI + Next.js + AI**