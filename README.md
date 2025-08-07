# 🏪 AI-Powered Furniture Marketplace (Supabase Edition)

A modern, serverless full-stack marketplace application with AI-powered image analysis for buying and selling furniture. Built with **Next.js**, **Supabase**, and **OpenAI**.

## ✨ Features

### 📸 **AI Image Analysis**
- **GPT-4 Vision Integration** - analyzes uploaded furniture photos instantly
- **Furniture Recognition** - identifies type, brand, style, materials, condition
- **Smart Pricing** - estimates retail and market values with market analysis
- **Auto-Generated Listings** - creates professional titles and descriptions

### 🔐 **User Management**
- **Supabase Authentication** - secure email/password auth with social logins
- **User Profiles** - manage account settings and preferences
- **Row Level Security** - secure data access patterns

### 🏪 **Marketplace Features**
- **Item Listings** - create, view, and manage furniture listings
- **Image Upload** - secure photo storage via Supabase Storage
- **Browse Marketplace** - view available items with filtering
- **Real-time Updates** - live notifications via Supabase Realtime

### 🤝 **Advanced Negotiations**
- **Multi-round Offers** - structured negotiation system with offer tracking
- **AI Offer Analysis** - strategic insights and market intelligence for sellers
- **Real-time Communication** - instant offer updates via Supabase Realtime
- **Smart Analytics** - comprehensive negotiation history and metrics

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase Account
- OpenAI API Key

### Installation & Setup

1. **Clone and setup:**
   ```bash
   git clone <your-repo-url>
   cd marketplace/apps/web
   npm install
   ```

2. **Environment setup:**
   ```bash
   cd apps/web
   cp .env.local.example .env.local
   # Edit .env.local and add your credentials
   ```

3. **Supabase setup:**
   - Create a new Supabase project at https://supabase.com
   - Go to Settings > API and copy your URL and keys
   - Run the SQL from `supabase/schema.sql` in the SQL editor
   - Enable Storage and create a 'furniture-images' bucket

4. **Run the application:**
   ```bash
   # From apps/web/ directory
   npm run dev
   ```
   ✅ Application running at: http://localhost:3000

## 🛠️ Tech Stack

### Frontend & Backend
- **Next.js 15** - React framework with App Router and API routes
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Smooth animations

### Backend Services
- **Supabase** - Database, Authentication, Storage, and Real-time
- **PostgreSQL** - Robust relational database with advanced features
- **Row Level Security** - Secure data access patterns

### AI & Processing
- **OpenAI GPT-4o** - Advanced image analysis and understanding
- **OpenAI Embeddings** - Semantic search capabilities

## 📁 Project Structure

```
marketplace/
├── apps/
│   └── web/                    # Next.js Application
│       ├── app/
│       │   ├── api/           # API routes (serverless functions)
│       │   │   ├── ai/        # AI-powered endpoints
│       │   │   │   ├── analyze-image/  # GPT-4 Vision image analysis
│       │   │   │   └── search/         # Semantic search
│       │   │   ├── auth/      # Authentication endpoints
│       │   │   ├── items/     # Marketplace CRUD operations
│       │   │   ├── negotiations/  # Advanced offer system
│       │   │   └── users/     # User management
│       │   ├── globals.css    # Global styles
│       │   ├── layout.tsx     # Root layout
│       │   └── page.tsx       # Home page
│       ├── components/        # React components
│       │   ├── auth/         # Authentication UI (enhanced-auth.tsx)
│       │   ├── home/         # Home page components
│       │   ├── marketplace/  # Marketplace views
│       │   ├── search/       # AI search functionality
│       │   ├── seller/       # Seller dashboard & analytics
│       │   └── ui/           # Reusable components
│       ├── src/lib/          # Utilities and configurations
│       │   ├── api-client-new.ts  # Modern Supabase client
│       │   ├── database.types.ts  # Generated TypeScript types
│       │   ├── supabase.ts        # Supabase client setup
│       │   └── utils.ts           # Utility functions
│       ├── package.json      # Dependencies and scripts
│       └── next.config.ts    # Next.js configuration
├── supabase/
│   └── schema.sql            # Database schema and policies
├── CLAUDE.md                # Development guidance for Claude
└── README.md
```

## 🔧 API Endpoints

### AI Services
- `POST /api/ai/analyze-image` - GPT-4 Vision image analysis with structured output
- `POST /api/ai/search` - Semantic furniture search using OpenAI embeddings

### Authentication
- Handled automatically by Supabase Auth
- Social logins: Google, GitHub (configurable)

### Marketplace
- `GET /api/items` - List all items
- `POST /api/items` - Create new listing
- `GET /api/items/{id}` - Get item details
- `PUT /api/items/{id}` - Update listing

### Negotiations
- `POST /api/negotiations/items/{itemId}/offers` - Create new offer
- `GET /api/negotiations/my-negotiations` - Get user's negotiations
- `POST /api/negotiations/{negotiationId}/accept` - Accept offer
- `POST /api/negotiations/{negotiationId}/counter` - Counter offer
- `GET /api/negotiations/items/{itemId}/offer-analysis` - AI offer insights

## 🔒 Security Features

- **Row Level Security** - Database-level access control
- **Authentication** - Secure JWT-based auth with Supabase
- **Input Validation** - Server-side validation for all inputs
- **File Upload Security** - Secure image storage with signed URLs
- **CORS Protection** - Configurable CORS policies
- **Environment Variables** - Secure credential management

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production
```
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_key
OPENAI_API_KEY=your_openai_api_key
```

## 📊 Database Management

### Supabase Dashboard
- **Tables**: View and edit data in the table editor
- **Auth**: Manage users and authentication settings  
- **Storage**: Manage uploaded images and files
- **Logs**: Monitor API usage and errors

### Local Development
```bash
# All commands should be run from apps/web/
cd apps/web

# Install dependencies
npm install

# Development server with Turbopack
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ using Next.js + Supabase + AI**