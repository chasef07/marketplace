# 🏪 AI-Powered Furniture Marketplace

> **A modern, serverless marketplace platform powered by Next.js 15, Supabase, and OpenAI**

[![Next.js](https://img.shields.io/badge/Next.js-15.4.5-black?style=flat&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.1.0-blue?style=flat&logo=react)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=flat&logo=supabase)](https://supabase.com)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-orange?style=flat&logo=openai)](https://openai.com)

An intelligent furniture marketplace that combines AI-powered image analysis, advanced negotiation systems, and modern UI/UX to create a seamless buying and selling experience. Built with cutting-edge technologies and best practices for performance, security, and scalability.

## 🌟 Key Features

### 🤖 **AI Intelligence**
- **GPT-4o Vision Analysis** - Instant furniture recognition with detailed metadata extraction
- **Smart Pricing Engine** - Market-based pricing suggestions with retail/resale analysis  
- **AI Negotiation Assistant** - Intelligent offer recommendations and market insights
- **Autonomous Seller Agent** - Automated negotiation handling with game theory optimization
- **Semantic Search** - Vector embeddings for intelligent item discovery

### 🎨 **Modern UI/UX Design**
- **shadcn/ui Components** - Professional, accessible component library
- **Blue/Slate Theme** - Consistent, modern color scheme throughout
- **Responsive Design** - Mobile-first approach with seamless desktop scaling
- **Interactive Animations** - Smooth transitions powered by Framer Motion
- **Enhanced Typography** - Optimized readability and visual hierarchy

### 🔐 **Advanced Security**
- **Row Level Security** - Database-level access control with Supabase RLS
- **JWT Authentication** - Secure token-based authentication system
- **Rate Limiting** - Redis-based API protection (60 req/min default)
- **Input Validation** - Comprehensive server-side validation with Zod
- **Secure File Uploads** - Signed URLs with content type validation
- **CORS Protection** - Configurable cross-origin resource sharing

### 🏪 **Marketplace Features**
- **Rich Item Listings** - Multiple images, detailed metadata, condition tracking
- **Advanced Search** - Real-time filtering by type, price, location, condition
- **Interactive Maps** - Leaflet integration with radius-based location filtering
- **View Analytics** - Real-time view counts and engagement metrics
- **Quick Actions** - Streamlined item management and bulk operations

### 🤝 **Three-Phase Negotiation System**
- **Phase 1**: Buyer acceptance with seller notification
- **Phase 2**: Seller confirmation with deal pending status  
- **Phase 3**: Final completion with pickup coordination
- **Real-time Updates** - Live negotiation status via Supabase Realtime
- **Smart Notifications** - Context-aware alerts and action prompts
- **Offer Management** - Organized tabbed interface (Active/Accepted/Completed)

### 🚀 **Performance & Scalability**
- **Vercel Edge Functions** - Global serverless deployment
- **Next.js 15 + Turbopack** - Blazing fast development and builds
- **Image Optimization** - WebP/AVIF formats with blur placeholders
- **Bundle Analysis** - Advanced webpack optimization and monitoring
- **Web Vitals Tracking** - Core performance metrics monitoring

## 🛠️ Technology Stack

### **Frontend Technologies**
| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 15.4.5 | Full-stack React framework with App Router |
| **React** | 19.1.0 | UI library with concurrent features |
| **TypeScript** | 5.0+ | Static type checking and enhanced DX |
| **shadcn/ui** | Latest | Modern accessible component library |
| **Tailwind CSS** | 3.4+ | Utility-first CSS framework |
| **Framer Motion** | 12.0+ | Animation and micro-interactions |
| **SWR** | 2.3+ | Data fetching with caching strategies |

### **Backend & Infrastructure**
| Technology | Purpose | Integration |
|------------|---------|-------------|
| **Supabase** | PostgreSQL database, auth, storage, realtime | Primary backend infrastructure |
| **OpenAI API** | GPT-4o Vision, text embeddings, AI chat | AI-powered features |
| **Upstash Redis** | Rate limiting, caching, session storage | Performance optimization |
| **Vercel** | Hosting, serverless functions, analytics | Deployment platform |
| **Sharp** | Image processing and optimization | Server-side image handling |

### **Development Tools**
| Tool | Purpose | Configuration |
|------|---------|---------------|
| **ESLint** | Code linting and quality | Custom Next.js rules |
| **TypeScript** | Static type checking | Strict mode enabled |
| **Bundle Analyzer** | Build optimization | Webpack analysis |
| **Claude Code** | AI development assistance | Specialized subagents |

## 📁 Project Architecture

```
marketplace/
├── 📱 apps/web/                        # Next.js Application
│   ├── 🗂️ app/                         # App Router Structure
│   │   ├── 🔐 (auth)/                  # Auth route group
│   │   ├── ⚡ api/                      # API Routes (Edge Functions)
│   │   │   ├── 🤖 ai/                  # AI services (image analysis, chat)
│   │   │   ├── 👤 auth/                # Authentication endpoints
│   │   │   ├── 🛒 items/               # Marketplace CRUD operations
│   │   │   ├── 🤝 negotiations/        # Advanced offer system
│   │   │   ├── 👥 profiles/            # User profile management
│   │   │   ├── 🤖 agent/               # Autonomous agent endpoints
│   │   │   └── 👨‍💼 admin/               # Admin dashboard APIs
│   │   ├── 🏠 page.tsx                 # Home page with hero section
│   │   ├── 🌐 browse/                  # Marketplace browsing
│   │   ├── 👤 profile/                 # User profiles and settings
│   │   └── 👨‍💼 admin/                  # Admin dashboard (agent monitoring)
│   ├── 🎨 components/                  # React Components
│   │   ├── 🔐 auth/                    # Authentication UI
│   │   ├── 🛍️ buyer/                   # Buyer offer management
│   │   ├── 🏠 home/                    # Landing page components
│   │   ├── 🌐 browse/                  # Marketplace browsing UI
│   │   ├── 🏪 marketplace/             # Item details and management
│   │   ├── 👤 profile/                 # Profile management UI
│   │   ├── 💰 seller/                  # Seller dashboard components
│   │   ├── 🤖 agent/                   # Autonomous agent UI
│   │   ├── 👨‍💼 admin/                  # Admin dashboard components
│   │   └── 🎛️ ui/                      # shadcn/ui reusable components
│   ├── 📚 lib/                         # Core Libraries
│   │   ├── 🔗 api-client-new.ts        # Modern Supabase API client
│   │   ├── 📊 database.types.ts        # Generated TypeScript types
│   │   ├── 🚀 performance.ts           # Web Vitals tracking
│   │   ├── 🛡️ rate-limit.ts            # API rate limiting utilities
│   │   ├── 🤖 agent/                   # Autonomous agent services
│   │   └── 🔧 utils.ts                 # Utility functions
│   └── ⚙️ next.config.ts               # Advanced Next.js configuration
├── 🗄️ supabase/                       # Database Schema & Migrations
│   ├── 📋 schema.sql                   # Main database schema
│   ├── 🔄 migrations/                  # Database migrations
│   ├── 🔔 notifications-schema.sql     # Notification system
│   └── 🤖 agent-functions.sql          # Agent-specific functions
├── 📚 docs/                           # Project Documentation
│   ├── 🤖 ai-agent/                   # Agent implementation guides
│   └── 📊 implementation-reports/      # Technical specifications
├── 🤖 .claude/                        # Claude Code Configuration
│   └── 🎯 agents/                      # Specialized development agents
└── ⚙️ Configuration Files
    ├── 📦 package.json                 # Dependencies and scripts
    ├── 🚀 vercel.json                  # Deployment configuration
    └── 📝 CLAUDE.md                    # Development guidance
```

## 🚀 Quick Start Guide

### **Prerequisites**
- **Node.js 18+** (LTS recommended)
- **Supabase Account** ([supabase.com](https://supabase.com))
- **OpenAI API Key** ([platform.openai.com](https://platform.openai.com))
- **Upstash Redis** ([upstash.com](https://upstash.com)) - for production rate limiting

### **1. Clone and Setup**
```bash
# Clone repository
git clone https://github.com/yourusername/marketplace.git
cd marketplace/apps/web

# Install dependencies
npm install

# Copy environment template
cp .env.local.example .env.local
```

### **2. Environment Configuration**
Edit `.env.local` with your credentials:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anonymous_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI API Configuration  
OPENAI_API_KEY=sk-your-openai-api-key

# Redis Configuration (Production)
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

### **3. Database Setup**
1. Create new Supabase project at [supabase.com](https://supabase.com)
2. Copy project URL and API keys from Settings → API
3. Execute schema in Supabase SQL Editor:

```sql
-- Run the complete schema
-- File: /supabase/schema.sql
-- Includes: tables, RLS policies, functions, triggers
```

4. **Storage Configuration:**
   - Create bucket: `furniture-images` (public access)
   - Enable Realtime on: `negotiations`, `offers`, `items`

### **4. Development Server**
```bash
# Start development server with Turbopack
npm run dev

# Additional commands
npm run build              # Production build
npm run build:analyze      # Bundle analysis  
npm run type-check         # TypeScript validation
npm run lint              # Code quality check
```

🎉 **Application running at:** [http://localhost:3000](http://localhost:3000)

## 🔌 API Reference

### **Authentication**
```typescript
GET    /api/auth/me              # Current user profile
POST   /api/auth/admin-check     # Admin access validation
```

### **AI Services**
```typescript
POST   /api/ai/analyze-images    # GPT-4o Vision analysis
# Request: FormData with images
# Response: Structured furniture metadata

POST   /api/chat                 # AI marketplace assistant  
# Request: { message: string, context?: object }
# Response: { response: string, suggestions?: string[] }
```

### **Marketplace Operations**
```typescript
GET    /api/items                # Browse marketplace
POST   /api/items                # Create new listing
GET    /api/items/[id]           # Item details
PUT    /api/items/[id]           # Update listing
GET    /api/items/my-items       # User's listings

# Query parameters for GET /api/items:
# ?type=couch&minPrice=100&maxPrice=500&location=zipcode&radius=25
```

### **Profile Management**
```typescript
GET    /api/profiles/me          # Current user profile
PUT    /api/profiles/me          # Update profile
GET    /api/profiles/[username]  # Public profile view
```

### **Advanced Negotiation System**
```typescript
# Three-Phase Negotiation Flow
GET    /api/negotiations/my-negotiations           # User's negotiations
POST   /api/negotiations/items/[itemId]/offers    # Create offer
POST   /api/negotiations/[negotiationId]/counter  # Counter offer

# Three-Phase Acceptance Flow
POST   /api/negotiations/[negotiationId]/buyer-accept    # Phase 1: Buyer accepts
POST   /api/negotiations/[negotiationId]/seller-confirm  # Phase 2: Seller confirms  
POST   /api/negotiations/[negotiationId]/accept          # Phase 3: Final completion

GET    /api/negotiations/[negotiationId]/offers    # Offer history
POST   /api/negotiations/[negotiationId]/decline   # Decline negotiation
```

### **Autonomous Agent System**
```typescript
GET    /api/agent/monitor         # Agent activity monitoring
POST   /api/agent/settings        # Configure agent behavior
GET    /api/agent/notifications   # Agent decision logs
POST   /api/agent/cron           # Trigger agent processing

# Admin endpoints
GET    /api/admin/agent/analytics # Performance metrics
GET    /api/admin/agent/decisions # Decision audit trail
GET    /api/admin/agent/queue     # Processing queue status
```

### **Utility Services**
```typescript
GET    /api/marketplace/quick-actions  # Bulk item operations
GET    /api/images/[filename]         # Optimized image serving
```

## 🎨 UI Component System

### **shadcn/ui Integration**
This project leverages the complete shadcn/ui ecosystem for consistent, accessible components:

#### **Core Components**
- **`Avatar`, `AvatarImage`, `AvatarFallback`** - Profile pictures with fallback handling
- **`Button`** - Consistent styling with variants (default, outline, ghost, destructive)
- **`Card`, `CardContent`, `CardHeader`, `CardTitle`** - Content containers
- **`Badge`** - Status indicators with color-coded variants
- **`Dialog`, `DialogContent`, `DialogHeader`** - Modal interactions
- **`Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`** - Organized content sections

#### **Form Components**  
- **`Input`, `Label`, `Textarea`** - Accessible form controls
- **`Select`, `SelectContent`, `SelectItem`** - Dropdown selections
- **`Checkbox`, `Slider`** - Interactive form elements
- **`Progress`** - Loading and completion indicators

#### **Navigation & Layout**
- **`Separator`** - Visual content dividers
- **`ScrollArea`** - Enhanced scrollable regions
- **`Collapsible`** - Expandable content sections
- **`Skeleton`** - Loading state placeholders

### **Custom Component Highlights**

#### **Enhanced Marketplace Components**
```typescript
// Item Detail Page - Modern card-based layout
<Card className="item-detail-container">
  <CardHeader>
    <ImageCarousel images={item.images} />
    <ItemMetadata type={item.type} condition={item.condition} />
  </CardHeader>
  <CardContent>
    <PricingSection currentPrice={item.price} />
    <SellerProfile seller={item.seller} />
    <OfferInterface negotiationId={negotiation.id} />
  </CardContent>
</Card>

// Tabbed Offer Management
<Tabs defaultValue="active" className="offer-tabs">
  <TabsList>
    <TabsTrigger value="active">Active Offers</TabsTrigger>
    <TabsTrigger value="accepted">Accepted</TabsTrigger>
    <TabsTrigger value="completed">Completed</TabsTrigger>
  </TabsList>
  <TabsContent value="active">
    <OfferGrid offers={activeOffers} />
  </TabsContent>
</Tabs>
```

#### **AI-Enhanced Upload Experience**
```typescript
// Interactive Upload Zone with AI Processing
<InteractiveUploadZone
  onImagesSelected={handleImageUpload}
  onAIAnalysisComplete={handleAIResults}
  maxImages={6}
  acceptedFormats={['image/jpeg', 'image/png', 'image/webp']}
>
  <UploadProgress processing={aiProcessing} />
  <ListingPreview aiData={analysisResults} />
</InteractiveUploadZone>
```

### **Design System**
- **Color Palette**: Blue/slate theme with semantic color tokens
- **Typography**: Inter font family with optimized font loading
- **Spacing**: Consistent 8px base unit with Tailwind spacing scale
- **Accessibility**: WCAG 2.1 AA compliance with proper ARIA attributes
- **Responsive Design**: Mobile-first with desktop enhancement

## 🏗️ Database Architecture

### **Core Schema Overview**

#### **User Management**
```sql
-- Enhanced user profiles extending Supabase auth.users
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  zip_code TEXT,
  coordinates POINT,
  personality_type TEXT CHECK (personality_type IN ('casual', 'professional', 'friendly')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **Marketplace Items**
```sql
-- Rich furniture listings with AI-generated metadata
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  furniture_type furniture_type_enum NOT NULL,
  condition item_condition_enum DEFAULT 'good',
  dimensions JSONB, -- {width, height, depth, units}
  images JSONB NOT NULL, -- [{url, alt, isPrimary}]
  ai_metadata JSONB, -- GPT-4o analysis results
  location_data JSONB, -- {zipCode, coordinates, radius}
  status item_status_enum DEFAULT 'active',
  view_count INTEGER DEFAULT 0,
  agent_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **Three-Phase Negotiation System**
```sql
-- Negotiation container with enhanced status tracking
CREATE TABLE negotiations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES profiles(id),
  seller_id UUID NOT NULL REFERENCES profiles(id),
  status negotiation_status_enum DEFAULT 'active',
  final_price DECIMAL(10,2),
  buyer_accepted_at TIMESTAMPTZ,
  seller_confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual offers within negotiations
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id UUID NOT NULL REFERENCES negotiations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  type offer_type_enum NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  message TEXT,
  is_counter_offer BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **Autonomous Agent System**
```sql
-- Agent decision tracking and analytics
CREATE TABLE agent_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id UUID NOT NULL REFERENCES negotiations(id),
  item_id UUID NOT NULL REFERENCES items(id),
  decision_type TEXT NOT NULL, -- 'accept', 'counter', 'decline'
  original_offer DECIMAL(10,2),
  agent_response DECIMAL(10,2),
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  reasoning JSONB, -- AI decision reasoning
  market_data JSONB, -- Supporting market analysis
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent queue for processing negotiations  
CREATE TABLE agent_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id UUID NOT NULL REFERENCES negotiations(id),
  priority INTEGER DEFAULT 0,
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Database Enums**
```sql
CREATE TYPE furniture_type_enum AS ENUM (
  'couch', 'dining_table', 'bookshelf', 'chair', 'desk', 
  'bed', 'dresser', 'coffee_table', 'nightstand', 'cabinet', 'other'
);

CREATE TYPE item_status_enum AS ENUM (
  'draft', 'pending_review', 'active', 'under_negotiation', 
  'sold_pending', 'sold', 'paused', 'archived', 'flagged', 'removed'
);

CREATE TYPE negotiation_status_enum AS ENUM (
  'active', 'buyer_accepted', 'deal_pending', 'completed', 
  'cancelled', 'picked_up'
);

CREATE TYPE offer_type_enum AS ENUM ('buyer', 'seller');
```

### **Row Level Security (RLS) Policies**
```sql
-- Users can only view/edit their own profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles  
  FOR UPDATE USING (auth.uid() = id);

-- Items are publicly viewable, but only editable by owners
CREATE POLICY "Items are publicly viewable" ON items
  FOR SELECT USING (status = 'active');

CREATE POLICY "Users can manage own items" ON items
  FOR ALL USING (auth.uid() = seller_id);

-- Negotiations visible to buyers and sellers only
CREATE POLICY "Negotiation participants access" ON negotiations
  FOR ALL USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
```

### **Database Functions**
```sql
-- Atomic view count increment
CREATE OR REPLACE FUNCTION increment_views(item_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE items SET view_count = view_count + 1 WHERE id = item_uuid;
END;
$$ LANGUAGE plpgsql;

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## 🤖 Autonomous Seller Agent

### **Agent Architecture**
The marketplace includes an advanced autonomous agent system that handles negotiations on behalf of sellers using game theory principles and market analysis.

#### **Core Agent Features**
- **Game Theory Optimization** - Nash equilibrium calculations for optimal pricing
- **Market Intelligence** - Real-time comparable item analysis
- **Behavioral Modeling** - Buyer psychology and negotiation patterns
- **Risk Assessment** - Deal probability scoring and timeline analysis
- **Performance Analytics** - Success rate tracking and strategy optimization

#### **Agent Decision Process**
```typescript
interface AgentDecision {
  negotiationId: string;
  originalOffer: number;
  agentResponse: 'accept' | 'counter' | 'decline';
  counterOffer?: number;
  confidenceScore: number; // 0.00 to 1.00
  reasoning: {
    marketPosition: string;
    buyerProfile: string;
    timeValue: string;
    riskAssessment: string;
  };
  marketData: {
    comparableItems: Item[];
    averageNegotiationLength: number;
    successRate: number;
  };
}
```

#### **Agent Configuration**
```typescript
interface AgentSettings {
  aggressiveness: 'conservative' | 'moderate' | 'aggressive';
  minimumAcceptablePrice: number;
  maxNegotiationRounds: number;
  timeDecayFactor: number;
  acceptanceThreshold: number;
  enableLearning: boolean;
}
```

### **Admin Dashboard**
Comprehensive monitoring and analytics for agent performance:

- **Real-time Metrics** - Active negotiations, success rates, revenue impact
- **Decision Audit Trail** - Complete history of agent decisions with reasoning
- **Performance Analytics** - Charts showing agent effectiveness over time
- **Queue Management** - Processing queue status and error handling
- **Agent Configuration** - Global settings and individual item overrides

## 🔒 Security Implementation

### **Authentication & Authorization**
- **Supabase Auth** - JWT-based authentication with refresh token rotation
- **Row Level Security** - Database-level access control for all operations
- **Role-Based Access** - Admin, seller, buyer roles with granular permissions
- **Session Management** - Secure session handling with automatic cleanup

### **API Security**
```typescript
// Rate limiting implementation
const rateLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(60, '1m'), // 60 requests per minute
  analytics: true
});

// Input validation with Zod
const createItemSchema = z.object({
  title: z.string().min(1).max(200),
  price: z.number().positive().max(1000000),
  type: z.enum(['couch', 'chair', 'table', ...]),
  images: z.array(z.string().url()).min(1).max(6)
});
```

### **Data Protection**
- **Input Sanitization** - All user inputs sanitized and validated
- **SQL Injection Prevention** - Parameterized queries exclusively
- **XSS Protection** - Content Security Policy and output encoding
- **File Upload Security** - Content type validation and virus scanning
- **Audit Logging** - Complete audit trail for sensitive operations

### **Infrastructure Security**
- **HTTPS Enforcement** - Strict transport security headers
- **Environment Isolation** - Separate development, staging, production environments
- **Secret Management** - Environment variables for all sensitive data
- **Database Backups** - Automated encrypted backups with point-in-time recovery

## 📊 Performance Optimization

### **Frontend Performance**
```typescript
// Image optimization with Next.js
<Image
  src={imageUrl}
  alt={altText}
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL={blurDataUrl}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  priority={isPrimaryImage}
/>

// Code splitting and lazy loading  
const LazyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton className="w-full h-48" />,
  ssr: false
});
```

### **Backend Performance**
- **Connection Pooling** - Supabase connection pooling for high concurrency
- **Query Optimization** - Database indexes on frequently queried columns
- **Caching Strategy** - Multi-layer caching (browser, CDN, database, Redis)
- **Edge Functions** - Vercel Edge Runtime for minimal cold starts

### **Bundle Optimization**
```javascript
// next.config.ts - Advanced optimization
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
});

module.exports = withBundleAnalyzer({
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons']
  }
});
```

## 🚀 Deployment Guide

### **Vercel Deployment (Recommended)**

#### **1. Repository Setup**
```bash
# Connect GitHub repository to Vercel
# Automatic deployments on push to main branch
vercel --prod
```

#### **2. Environment Variables**
Configure in Vercel Dashboard → Settings → Environment Variables:

```bash
# Production Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_key

# OpenAI Configuration
OPENAI_API_KEY=sk-your-production-openai-key

# Redis Configuration (Required for Production)
UPSTASH_REDIS_REST_URL=https://your-prod-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_production_redis_token

# Optional: Admin Configuration
ADMIN_EMAIL=admin@yourdomain.com
```

#### **3. Domain Configuration**
```bash
# Custom domain setup
vercel domains add yourdomain.com
vercel domains add www.yourdomain.com

# SSL certificates automatically provisioned
# DNS configuration in domain registrar
```

#### **4. Production Database Setup**
```sql
-- Run in production Supabase SQL Editor
-- 1. Execute /supabase/schema.sql
-- 2. Run any pending migrations from /supabase/migrations/
-- 3. Create storage bucket 'furniture-images' (public access)
-- 4. Enable Realtime on tables: negotiations, offers, items
-- 5. Configure RLS policies for production security
```

### **Alternative Deployment Options**

#### **Self-Hosted with Docker**
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
```

#### **Railway Deployment**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy to Railway  
railway login
railway init
railway deploy
```

### **Production Checklist**
- [ ] Environment variables configured
- [ ] Database schema deployed
- [ ] Storage bucket created and configured
- [ ] Domain and SSL certificates configured
- [ ] Monitoring and analytics enabled
- [ ] Rate limiting configured
- [ ] Backup strategy implemented
- [ ] Load testing completed

## 🤖 Claude Code Integration

This project is optimized for [Claude Code](https://claude.ai/code) development with specialized subagents:

### **🎨 shadcn UI Expert**
**File**: `.claude/agents/shadcn-ui-expert.md`
- **Auto-triggers**: UI component work, styling issues
- **Specialties**: shadcn/ui integration, responsive design, accessibility
- **Use Cases**: Component modernization, design system implementation

### **🗄️ Supabase Backend Specialist** 
**File**: `.claude/agents/supabase-backend-specialist.md`
- **Auto-triggers**: Database issues, authentication problems
- **Specialties**: PostgreSQL optimization, RLS policies, performance tuning
- **Use Cases**: Security audits, schema design, query optimization

### **🚀 Vercel Deployment Validator**
**File**: `.claude/agents/vercel-deployment-validator.md`  
- **Auto-triggers**: Build errors, deployment issues
- **Specialties**: Next.js 15 optimization, serverless functions
- **Use Cases**: Pre-deployment checks, build optimization

### **Development Workflow**
```markdown
# CLAUDE.md Integration
- Development commands and environment setup
- Code style guidelines and conventions
- Database schema and migration procedures
- API endpoint documentation
- Performance optimization strategies
```

## 📋 Development Commands

### **Core Development (from `apps/web/`)**
```bash
# Development
npm run dev                    # Start development server with Turbopack
npm run build                  # Production build with optimization
npm run start                  # Production server
npm run type-check             # TypeScript validation
npm run lint                   # ESLint code quality check

# Advanced Features
npm run build:analyze          # Webpack bundle analysis
npm install @next/bundle-analyzer --save-dev  # Install analyzer

# Database Operations (with Supabase CLI)
supabase start                 # Start local Supabase
supabase db reset             # Reset local database
supabase gen types typescript --local  # Generate TypeScript types
```

### **Testing & Quality Assurance**
```bash
# Type Safety
npm run type-check             # Full TypeScript validation
npx tsc --noEmit --watch       # Watch mode for development

# Code Quality  
npm run lint                   # ESLint checking
npm run lint:fix              # Auto-fix ESLint issues
npx prettier --write .        # Format code with Prettier

# Performance Analysis
npm run build:analyze         # Bundle size analysis
npm run build && npm run start  # Full production test
```

### **Database Management**
```bash
# Local Development
supabase init                 # Initialize Supabase project
supabase start               # Start local containers
supabase db diff --file migration_name  # Create migration
supabase db push            # Push local changes to remote

# Production Management
supabase db push --db-url $DATABASE_URL  # Deploy to production
supabase gen types typescript --project-id $PROJECT_ID  # Generate types
```

## 🤝 Contributing

### **Getting Started**
1. **Fork the Repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/yourusername/marketplace.git
   cd marketplace/apps/web
   ```

2. **Development Setup**
   ```bash
   npm install
   cp .env.local.example .env.local
   # Configure your environment variables
   npm run dev
   ```

3. **Create Feature Branch**
   ```bash
   git checkout -b feature/amazing-new-feature
   ```

### **Development Guidelines**
- **Code Style**: Follow existing patterns and TypeScript conventions
- **Component Design**: Use shadcn/ui components for consistency  
- **API Design**: RESTful endpoints with proper error handling
- **Database Changes**: Create migrations for schema changes
- **Testing**: Include tests for new features
- **Documentation**: Update README and CLAUDE.md as needed

### **Submission Process**
```bash
# Before submitting
npm run type-check           # Ensure no TypeScript errors
npm run lint                # Fix any linting issues
npm run build               # Verify production build works

# Commit and push
git add .
git commit -m "feat: add amazing new feature with AI integration"
git push origin feature/amazing-new-feature

# Create Pull Request with:
# - Clear description of changes
# - Screenshots for UI changes  
# - Testing instructions
# - Migration requirements
```

### **Code Review Process**
- All PRs require review from maintainers
- Automated checks must pass (TypeScript, linting, build)
- Manual testing on preview deployment
- Database migration review for schema changes

## 📝 Release History

### **v2.4 - Autonomous Agent System** *(Latest)*
- ✅ **Autonomous Seller Agent** - Game theory-based negotiation automation
- ✅ **Admin Dashboard** - Comprehensive agent monitoring and analytics  
- ✅ **Agent Queue System** - Reliable processing with error handling
- ✅ **Decision Analytics** - ML-driven insights and performance tracking
- ✅ **Market Intelligence** - Real-time comparable analysis integration

### **v2.3 - Enhanced Upload Experience**
- ✅ **Multiple Image Upload** - Drag-and-drop with preview management
- ✅ **Smart Dimensions Toggle** - Context-aware input fields
- ✅ **Improved Price Editing** - Enhanced number input handling
- ✅ **Professional Type Badges** - Refined furniture type display
- ✅ **Streamlined Interface** - Cleaned UI for better UX

### **v2.2 - UI Modernization**
- ✅ **Item Detail Overhaul** - Complete shadcn/ui Card redesign
- ✅ **Enhanced Typography** - Improved spacing and visual hierarchy
- ✅ **Form Component Updates** - Modern inputs, selects, textareas
- ✅ **Consistent Theming** - Blue/slate color scheme throughout

### **v2.1 - Three-Phase Negotiation**
- ✅ **Structured Acceptance Flow** - Multi-phase deal confirmation
- ✅ **Action Notifications** - Context-aware seller alerts
- ✅ **Highest Offer Badges** - Visual top offer indicators
- ✅ **Enhanced Status Tracking** - Clear progression states

### **v2.0 - Platform Foundation**
- ✅ **shadcn/ui Integration** - Modern component library adoption
- ✅ **Enhanced Profiles** - Rich user profiles with avatars and stats
- ✅ **Organized Offers** - Tabbed interface for offer management
- ✅ **Performance Improvements** - 38% bundle size reduction

## 📄 License

**MIT License** - See [LICENSE](LICENSE) file for details.

---

<div align="center">

**🚀 Built with Next.js 15 + Supabase + OpenAI + shadcn/ui**

*Modern AI-Powered Marketplace Platform*

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/marketplace)

</div>