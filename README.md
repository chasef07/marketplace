# 🏪 SnapNest - AI-Powered Furniture Marketplace

A modern, serverless full-stack marketplace application with AI-powered image analysis, intelligent negotiations, and seamless user experience. Built with **Next.js 15**, **Supabase**, **OpenAI**, and **shadcn/ui**.

## ✨ Key Features

### 🤖 **AI-Powered Intelligence**
- **GPT-4o Vision Analysis** - Instant furniture recognition, pricing, and condition assessment
- **Smart Pricing Engine** - Market-based pricing with retail/resale value analysis
- **AI Negotiation Assistant** - Intelligent offer recommendations and market insights
- **Auto-Generated Listings** - Professional titles, descriptions, and metadata from photos

### 🎨 **Modern UI/UX with shadcn/ui**
- **Clean Design System** - Consistent blue/slate color scheme with accessible components
- **Responsive Layout** - Mobile-first design with seamless desktop experience
- **Interactive Animations** - Smooth transitions with Framer Motion
- **Professional Components** - Cards, badges, tabs, avatars, forms, and dialogs
- **Enhanced Item Details** - Modernized layouts with improved typography and spacing

### 🔐 **Secure User Management**
- **Supabase Authentication** - Email/password with optional social logins
- **Enhanced Profile System** - Rich user profiles with avatars, bios, and location
- **Row Level Security** - Database-level access control
- **Real-time Presence** - Live user status and activity indicators

### 🏪 **Advanced Marketplace**
- **Rich Item Listings** - Multiple images, detailed metadata, and condition tracking
- **Smart Search & Filtering** - AI-powered semantic search with filters
- **Interactive Maps** - Location visualization with radius-based browsing
- **Performance Analytics** - View counts, engagement metrics, and insights

### 🤝 **Three-Phase Negotiation System**
- **Structured Acceptance Flow** - Buyer accepts → Seller confirms → Deal completes
- **Action Required Notifications** - Clear alerts when seller confirmation needed
- **Organized Offer Management** - Tabbed interface (Active/Accepted/Other)
- **Real-time Updates** - Instant notifications via Supabase Realtime
- **Highest Offer Visibility** - Green badges showing top offers on item cards

### ⚡ **Performance & Optimization**
- **Next.js 15 with Turbopack** - Lightning-fast development and builds
- **Image Optimization** - WebP/AVIF with blur placeholders and lazy loading
- **Rate Limiting** - Upstash Redis-based API protection
- **Bundle Analysis** - Advanced webpack bundle optimization
- **Web Vitals Tracking** - Performance monitoring with analytics

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** - Latest LTS version
- **Supabase Account** - For database, auth, and storage
- **OpenAI API Key** - For AI image analysis
- **Upstash Redis** - For rate limiting (production)

### Installation & Setup

1. **Clone and Install:**
   ```bash
   git clone <your-repo-url>
   cd marketplace/apps/web
   npm install
   ```

2. **Environment Configuration:**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your credentials:
   ```
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   
   # AI Services
   OPENAI_API_KEY=your_openai_api_key
   
   # Rate Limiting (Production)
   UPSTASH_REDIS_REST_URL=your_upstash_redis_url
   UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
   ```

3. **Supabase Database Setup:**
   ```bash
   # Create new Supabase project at https://supabase.com
   # Copy URL and keys from Settings > API
   # Run SQL schema in Supabase SQL Editor:
   ```
   - Execute `/supabase/schema.sql` in SQL Editor
   - Create storage bucket named 'furniture-images' (public access)
   - Enable Realtime for tables: negotiations, offers

4. **Development Server:**
   ```bash
   npm run dev          # Start with Turbopack
   npm run build        # Production build
   npm run type-check   # TypeScript validation
   npm run lint         # ESLint checking
   ```

   ✅ **Application running at:** http://localhost:3000

## 🛠️ Technology Stack

### **Frontend & UI**
- **Next.js 15.4.5** - App Router, API Routes, Server Components
- **React 19.1.0** - Latest React with concurrent features
- **TypeScript** - Full type safety with generated Supabase types
- **shadcn/ui** - Modern, accessible component library
- **Tailwind CSS** - Utility-first styling with custom design tokens
- **Framer Motion** - Smooth animations and micro-interactions

### **Backend & Database**
- **Supabase** - PostgreSQL, Authentication, Storage, Realtime
- **Row Level Security** - Fine-grained access control
- **JSONB Support** - Flexible data structures for images and metadata
- **Real-time Subscriptions** - Live updates for negotiations

### **AI & Intelligence**
- **OpenAI GPT-4o** - Advanced image analysis and understanding
- **OpenAI Embeddings** - Semantic search capabilities
- **Structured Data Generation** - Type-safe AI responses

### **Performance & DevOps**
- **Vercel Deployment** - Serverless edge functions
- **Upstash Redis** - Rate limiting and caching
- **Web Vitals** - Performance monitoring
- **Bundle Analyzer** - Optimization insights

## 📁 Project Architecture

```
marketplace/
├── apps/web/                           # Next.js Application
│   ├── app/                           # App Router
│   │   ├── (auth)/                    # Auth route group
│   │   ├── api/                       # API Routes (Edge Functions)
│   │   │   ├── ai/analyze-image/      # GPT-4o Vision analysis
│   │   │   ├── auth/me/               # User profile management
│   │   │   ├── geocode/               # Location services
│   │   │   ├── items/                 # Marketplace CRUD
│   │   │   ├── negotiations/          # Advanced offer system
│   │   │   └── profiles/              # User profiles
│   │   ├── marketplace/               # Browse items
│   │   ├── profile/                   # User profiles
│   │   ├── sell/                      # Create listings
│   │   └── page.tsx                   # Home page
│   ├── components/                    # React Components
│   │   ├── auth/                      # Authentication UI
│   │   ├── buyer/                     # Buyer offer management
│   │   ├── home/                      # Landing page components
│   │   ├── marketplace/               # Item browsing
│   │   ├── profile/                   # Profile management
│   │   ├── seller/                    # Seller dashboard
│   │   └── ui/                        # shadcn/ui components
│   ├── src/lib/                       # Core Libraries
│   │   ├── api-client-new.ts          # Modern Supabase client
│   │   ├── database.types.ts          # Generated TypeScript types
│   │   ├── performance.ts             # Web Vitals tracking
│   │   ├── rate-limit.ts              # Rate limiting utilities
│   │   └── supabase.ts                # Supabase configuration
│   └── next.config.ts                 # Advanced Next.js config
├── supabase/
│   └── schema.sql                     # Database schema & RLS policies
├── .claude/                           # Claude Code subagents
│   └── agents/                        # Specialized development assistants
├── CLAUDE.md                          # Development guidance
└── README.md
```

## 🔌 API Endpoints

### **AI Services**
```typescript
POST /api/ai/analyze-image
// GPT-4o Vision analysis with structured furniture data
// Returns: pricing, metadata, listing suggestions

POST /api/chat
// AI marketplace assistant for negotiations and guidance
// Context-aware responses with market insights
```

### **Profile Management**
```typescript
GET /api/profiles/me              // Current user profile
PUT /api/profiles/me              // Update profile
GET /api/profiles/[username]      // Public profile view
// Enhanced with avatars, bios, stats, and listings
```

### **Marketplace Operations**
```typescript
GET /api/items                    // Browse marketplace
POST /api/items                   // Create listing
GET /api/items/[id]              // Item details
PUT /api/items/[id]              // Update listing
// Includes image arrays, metadata, and analytics
```

### **Three-Phase Negotiations**
```typescript
GET /api/negotiations/my-negotiations             // User's offers (organized)
POST /api/negotiations/items/[itemId]/offers     // Create offer
POST /api/negotiations/[negotiationId]/counter   // Counter offer
POST /api/negotiations/[negotiationId]/buyer-accept    // Buyer accepts (Phase 1)
POST /api/negotiations/[negotiationId]/seller-confirm  // Seller confirms (Phase 2)
POST /api/negotiations/[negotiationId]/accept    // Final acceptance (Phase 3)
// Real-time updates with status progression tracking
```

### **Location Services**
```typescript
GET /api/geocode?zipCode={zipCode}
// Convert zip codes to coordinates with caching
// Integrated with interactive maps
```

## 🎨 UI Component Highlights

### **Modern Profile System**
- **Avatar Components** - Professional profile pictures with fallbacks
- **Tabbed Interfaces** - Organized offer management (Active/Accepted/Other)
- **Status Badges** - Color-coded offer and item statuses
- **Linked Navigation** - Seamless transitions between profiles and items

### **Enhanced Marketplace**
- **Card Layouts** - Consistent item display with hover effects
- **Image Galleries** - Multiple image support with optimization
- **Interactive Filters** - Real-time search and filtering
- **Responsive Grids** - Mobile-first responsive layouts

### **Negotiation Interface**
- **Offer Timeline** - Visual negotiation progress
- **Smart Actions** - Context-aware buttons and forms
- **Real-time Updates** - Live status changes and notifications
- **Integrated Messaging** - Offer communication system

## 🔒 Security & Performance

### **Security Features**
- **Row Level Security** - Database-level access control
- **JWT Authentication** - Secure token-based auth
- **Rate Limiting** - API abuse prevention (60 req/min)
- **Input Validation** - Server-side validation for all endpoints
- **Secure File Upload** - Signed URLs with type validation
- **CORS Protection** - Configurable cross-origin policies

### **Performance Optimizations**
- **Edge Functions** - Vercel serverless with global distribution
- **Image Optimization** - Next.js Image with WebP/AVIF
- **Bundle Splitting** - Code splitting with dynamic imports
- **Caching Strategies** - Multi-layer caching (browser, CDN, database)
- **Database Indexing** - Optimized queries for performance

## 🚀 Deployment Guide

### **Vercel (Recommended)**
1. **Connect Repository**
   ```bash
   # Connect GitHub repo to Vercel dashboard
   # Automatic deployments on push to main
   ```

2. **Environment Variables**
   ```env
   # Production environment in Vercel dashboard
   NEXT_PUBLIC_SUPABASE_URL=prod_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=prod_anon_key
   SUPABASE_SERVICE_ROLE_KEY=prod_service_key
   OPENAI_API_KEY=openai_api_key
   UPSTASH_REDIS_REST_URL=redis_url
   UPSTASH_REDIS_REST_TOKEN=redis_token
   ```

3. **Domain Configuration**
   ```bash
   # Custom domain setup in Vercel dashboard
   # SSL certificates automatically provisioned
   ```

### **Database Migration**
```sql
-- Run in Supabase SQL Editor for production
-- 1. Execute /supabase/schema.sql
-- 2. Create storage bucket 'furniture-images'
-- 3. Enable Realtime for negotiations, offers tables
-- 4. Configure RLS policies for production data
```

## 🤖 Claude Code Integration

This project includes specialized **Claude Code subagents** for enhanced development workflows:

### **🎨 shadcn UI Expert**
- **Auto-triggers**: UI component work, styling issues, component modernization
- **Specialties**: shadcn/ui integration, responsive design, accessibility, blue/slate theme
- **File**: `.claude/agents/shadcn-ui-expert.md`

### **🗄️ Supabase Backend Specialist**
- **Auto-triggers**: Database issues, authentication, RLS policies
- **Specialties**: PostgreSQL optimization, security auditing, performance
- **File**: `.claude/agents/supabase-backend-specialist.md`

### **🚀 Vercel Deployment Validator**
- **Auto-triggers**: Build errors, deployment issues
- **Specialties**: Next.js 15 optimization, serverless functions
- **File**: `.claude/agents/vercel-deployment-validator.md`

## 📊 Development Commands

```bash
# Core Development (from apps/web/)
npm run dev                 # Development server with Turbopack
npm run build              # Production build
npm run start              # Production server
npm run type-check         # TypeScript validation
npm run lint               # ESLint checking

# Advanced Features
npm run build:analyze      # Bundle analysis and optimization
npm run build:production   # Optimized production build
```

## 🤝 Contributing

1. **Fork Repository**
   ```bash
   git fork https://github.com/yourusername/marketplace
   ```

2. **Development Setup**
   ```bash
   git clone your-fork-url
   cd marketplace/apps/web
   npm install
   cp .env.local.example .env.local
   # Configure environment variables
   ```

3. **Feature Development**
   ```bash
   git checkout -b feature/amazing-feature
   # Develop your feature with AI assistance
   npm run type-check  # Validate TypeScript
   npm run lint        # Check code quality
   ```

4. **Submit Changes**
   ```bash
   git commit -m "feat: add amazing feature with AI integration"
   git push origin feature/amazing-feature
   # Open Pull Request with detailed description
   ```

## 📝 Recent Updates

### **v2.2 - UI Modernization & Item Detail Refresh** *(Latest)*
- ✅ **Item Detail Overhaul** - Complete redesign with shadcn/ui Card components
- ✅ **Enhanced Visual Hierarchy** - Improved spacing, typography, and layout structure
- ✅ **Modern Form Components** - Updated inputs, selects, textareas with proper labels
- ✅ **Consistent Color Scheme** - Blue/slate theme throughout with better contrast
- ✅ **Professional Avatar System** - Improved seller info display with fallback handling
- ✅ **Responsive Error States** - Better error handling with alert components

### **v2.1 - Three-Phase Offer System**
- ✅ **Three-Phase Acceptance Flow** - Buyer accepts → Seller confirms → Deal completes
- ✅ **Seller Action Notifications** - Clear alerts for pending confirmations
- ✅ **Highest Offer Badges** - Green badges on item cards showing top offers
- ✅ **Enhanced Status Tracking** - "Pending Confirmation" → "Confirmed Sale" → "Completed"
- ✅ **Fixed Authentication Issues** - Seller confirm button now works properly
- ✅ **API Enhancements** - New seller-confirm endpoint with proper validation

### **v2.0 - Profile & Negotiation Overhaul**
- ✅ **Modern shadcn/ui Components** - Complete UI refresh
- ✅ **Enhanced Profile System** - Avatars, stats, linked navigation  
- ✅ **Tabbed Offer Management** - Organized Active/Accepted/Other offers
- ✅ **Fixed Backend Issues** - Seller names, item photos working
- ✅ **Clean Color Scheme** - Professional blue/gray theme
- ✅ **Performance Improvements** - Reduced bundle size, faster rendering

## 📄 License

**MIT License** - See LICENSE file for details.

---

**🚀 Built with Next.js 15 + Supabase + OpenAI + shadcn/ui**  
*AI-Powered Marketplace for the Modern Web*