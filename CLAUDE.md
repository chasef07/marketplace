# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Development Commands (from apps/web/)
All commands should be run from the `apps/web/` directory:
- **Development server**: `npm run dev` (with Turbopack enabled)
- **Build**: `npm run build`
- **Bundle analysis**: `npm run build:analyze` (analyze bundle size and composition)
- **Production server**: `npm start`
- **Lint**: `npm run lint`
- **Type check**: `npm run type-check`

### Environment Setup
- Copy `apps/web/.env.local.example` to `apps/web/.env.local` and configure:
  - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key  
  - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
  - `OPENAI_API_KEY` - Your OpenAI API key
  - `UPSTASH_REDIS_REST_URL` - Upstash Redis URL (for rate limiting)
  - `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis token (for rate limiting)

## Project Architecture

### Technology Stack
- **Structure**: Single Next.js app in `apps/web/`
- **Frontend & Backend**: Next.js 15.4.5 with App Router and API routes
- **UI Framework**: React 19.1.0 with shadcn/ui components and Tailwind CSS
- **Database & Auth**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **AI**: OpenAI GPT-4o for image analysis and embeddings for search
- **Maps**: React Leaflet for interactive location mapping
- **Analytics**: Vercel Analytics and Speed Insights for performance monitoring
- **Animations**: Framer Motion for smooth UI transitions
- **Data Fetching**: SWR for client-side data management
- **Image Optimization**: Sharp for server-side image processing
- **Deployment**: Vercel with serverless functions and bundle analysis

### High-Level Architecture
This is a serverless AI-powered furniture marketplace built as a Next.js monorepo:

1. **Frontend (Next.js App Router)**
   - Located in `/apps/web/`
   - Uses App Router with components in `/components/`
   - Modern shadcn/ui component library for consistent, accessible UI
   - Supabase client handles authentication and data access
   - Real-time updates via Supabase Realtime subscriptions

2. **API Routes (Next.js API Routes)**
   - Located in `/apps/web/app/api/`
   - Serverless functions deployed on Vercel Edge
   - Direct integration with Supabase for database operations
   - OpenAI integration for AI services
   - Rate limiting with Upstash Redis

3. **Database & Backend Services (Supabase)**
   - PostgreSQL database with Row Level Security (RLS)
   - Built-in authentication with JWT tokens
   - File storage for images with signed URLs
   - Real-time subscriptions for live updates

### Key Data Flow
1. **Authentication**: Supabase Auth handles signup/login → JWT stored in browser → RLS policies secure data
2. **Image Analysis**: Frontend uploads image → API route calls OpenAI GPT-4 Vision → Returns structured furniture data
3. **Marketplace**: Data flows through Supabase client → RLS policies ensure security → Real-time updates
4. **AI Search**: Query → OpenAI embeddings → Vector similarity search → Ranked results

### Database Architecture (Supabase)
- **profiles**: User data extending auth.users with personality traits, avatars, bios, and location data
- **items**: Furniture listings with AI-analyzed metadata, pricing, and JSONB images array
- **negotiations**: Three-phase offer system with status progression tracking:
  - `active` → `buyer_accepted` → `deal_pending` → `completed` | `cancelled`
- **offers**: Individual buyer/seller offers with timing, counter-offer flags, and message support
- **RLS Policies**: Secure data access - users only see/modify their own data
- **Database Functions**: Custom functions like `increment_views()` for atomic operations
- **Enhanced Enums**: `negotiation_status` includes `buyer_accepted` for three-phase flow

### API Architecture
- **RESTful endpoints** under `/api/` deployed as serverless functions
- **AI Services**: `/api/ai/analyze-image`, `/api/chat` for AI-powered assistance
- **CRUD Operations**: `/api/items/*`, `/api/negotiations/*`, `/api/profiles/*`
- **Location Services**: `/api/geocode` for zip code to coordinates conversion
- **Advanced Features**: `/api/negotiations/items/{itemId}/offers` for offer management
- **Authentication**: Handled by Supabase Auth, checked in API routes
- **File Uploads**: Direct to Supabase Storage with signed URLs
- **Rate Limiting**: Upstash Redis-based rate limiting for API protection

### Component Architecture
- **App Router**: Uses `app/` directory structure with route groups
- **Components**: Organized by feature in `components/`
  - `auth/` - Enhanced authentication UI with social login support
  - `buyer/` - Modern buyer offer management with tabbed interface
  - `home/` - Home page components (HeroSection, HomePage, ListingPreview, etc.)
  - `marketplace/` - Marketplace views and item details with location maps
  - `maps/` - Location mapping components with radius display
  - `profile/` - Enhanced profile management with shadcn/ui components
  - `seller/` - Seller dashboard for managing listings and negotiations
  - `ui/` - shadcn/ui reusable components (Avatar, Tabs, Skeleton, etc.)
- **API Client**: Modern Supabase-based client in `src/lib/api-client-new.ts`
- **Performance Libraries**: Utilities in `src/lib/performance.ts` for Web Vitals tracking
- **Rate Limiting**: Rate limiting utilities in `src/lib/rate-limit.ts`
- **Type Safety**: Full TypeScript with Supabase-generated types

### Critical Integration Points
- **Supabase Client**: Both browser and server clients for different contexts
- **Authentication State**: Real-time auth state changes via Supabase listeners
- **File Storage**: Supabase Storage with public bucket and access policies
- **Real-time**: Supabase Realtime for live negotiations and marketplace updates
- **AI Pipeline**: OpenAI API → Structured data → Database → Frontend display
- **shadcn/ui Integration**: Modern, accessible components throughout the application

## Database Schema

Run the SQL in `/supabase/schema.sql` in your Supabase project to create the initial schema.

### Key Tables
- `profiles` - User data with seller/buyer personalities, enhanced with avatars, bios, location data
- `items` - Furniture listings with rich AI-generated metadata, JSONB images array, and status tracking  
- `negotiations` - Complex negotiation system with proper seller/buyer foreign key relationships
- `offers` - Individual offers within negotiations with timing and counter-offer flags

### Important Enums
- `furniture_type` - Couch, dining_table, bookshelf, chair, desk, bed, dresser, coffee_table, nightstand, cabinet, other
- `item_status` - Draft, pending_review, active, under_negotiation, sold_pending, sold, paused, archived, flagged, removed
- `negotiation_status` - Active, deal_pending, completed, cancelled, picked_up
- `offer_type` - Buyer, seller

### Important Functions
- `increment_views(item_id)` - Atomically increment item view counts
- `handle_new_user()` - Auto-create profile on user signup
- `handle_updated_at()` - Auto-update timestamps

## UI Component System

### shadcn/ui Integration
This project uses shadcn/ui as the primary component library for consistent, accessible UI:

#### Available Components
- **Avatar, AvatarImage, AvatarFallback** - Profile pictures with proper fallbacks
- **Badge** - Status indicators with color-coded variants
- **Button** - Consistent button styling with variants (default, outline, ghost, etc.)
- **Card, CardContent, CardHeader, CardTitle** - Container components
- **Input, Label, Textarea** - Form components with proper accessibility
- **Skeleton** - Loading state placeholders
- **Tabs, TabsContent, TabsList, TabsTrigger** - Organized content sections
- **Separator** - Visual content dividers

#### Design Principles
- **Consistent Color Scheme**: Clean blue/gray theme throughout (no purple/weird colors)
- **Accessibility First**: All components include proper ARIA attributes and keyboard navigation
- **Mobile Responsive**: Mobile-first design with seamless desktop experience
- **Performance Optimized**: Tree-shaking enabled, minimal bundle impact

### Modern Profile System
- **Enhanced Avatars**: Professional profile pictures with fallback handling
- **Tabbed Interfaces**: Organized offer management (Active/Accepted/Other tabs)
- **Status Badges**: Color-coded offer and negotiation statuses
- **Linked Navigation**: Clickable item cards and seller profiles
- **Real-time Updates**: Live status changes and notifications

## Development Notes

### Supabase Integration
- Uses `@supabase/supabase-js` package for Next.js
- Server-side client for API routes, browser client for components
- Row Level Security policies secure all data access
- Real-time subscriptions for live updates
- **Proper Foreign Key Relationships**: Fixed seller/buyer profile lookups

### AI Services
- OpenAI GPT-4o for image analysis with structured output
- Text embeddings for semantic search with cosine similarity
- AI assistant for marketplace guidance and support
- Fallback error handling for all AI operations

### File Handling
- Supabase Storage replaces local filesystem
- Images uploaded to 'furniture-images' bucket
- **JSONB Images Array**: Multiple images per item with primary image support
- Signed URLs for secure access
- Automatic file type validation

### Authentication Flow
- Supabase Auth with email/password and social logins
- JWT tokens automatically managed by Supabase client
- Auth state changes trigger UI updates
- Protected API routes check authentication

### Buyer Offers System (Recently Enhanced)
- **Fixed API Issues**: Proper seller name retrieval and image display
- **Tabbed Organization**: Active, Accepted, and Other offer categories
- **Clickable Navigation**: Items link to marketplace, sellers to profiles
- **Real-time Updates**: Live offer status changes via Supabase Realtime
- **Modern UI**: Clean shadcn/ui components with consistent styling

### Deployment Configuration
- Vercel deployment with Next.js automatic optimization
- Environment variables configured in Vercel dashboard
- Monorepo structure with Next.js app in `apps/web/`
- Serverless functions for API routes with optimal performance
- Advanced Next.js configuration in `next.config.ts`:
  - Bundle analyzer integration with `withBundleAnalyzer`
  - Comprehensive CSP policies for Supabase and OpenAI domains
  - Image optimization with WebP/AVIF formats and external image caching
  - Package import optimizations for performance
  - Security headers including CSP, HSTS, and frame protection

## Setup Instructions

1. **Create Supabase Project**: https://supabase.com
2. **Run Database Schema**: Execute `/supabase/schema.sql` in SQL editor
3. **Configure Storage**: Create 'furniture-images' bucket (public)
4. **Set Environment Variables**: Copy from `.env.local.example` to `.env.local` in `apps/web/`
5. **Install Dependencies**: `npm install` from `apps/web/`
6. **Configure Upstash Redis**: Create Redis instance at https://upstash.com (required for rate limiting)
7. **Run Development**: `npm run dev` from `apps/web/`

## Important Notes

### Key Integrations
- **Singleton Supabase Clients**: Use `createClient()` for browser/components, `createSupabaseServerClient()` for API routes
- **Enhanced Profile System**: Modern shadcn/ui components with avatars, tabs, and linked navigation
- **Performance Monitoring**: Web Vitals tracking via `components/performance-provider.tsx` and `src/lib/performance.ts`
- **Rate Limiting**: Upstash Redis-based rate limiting in `src/lib/rate-limit.ts` - required for production

### Security Implementation
- Row Level Security (RLS) policies secure all database access
- Comprehensive security headers in Next.js configuration
- Input validation in all API routes
- Secure file uploads with signed URLs and content validation
- Rate limiting on all API endpoints

### AI Pipeline Architecture
1. **Image Upload** → Supabase Storage → Secure signed URL
2. **AI Analysis** → OpenAI GPT-4 Vision API → Structured furniture data extraction
3. **Data Processing** → Parse and validate AI response → Store in database
4. **Real-time Updates** → Supabase Realtime → Frontend state updates

### Recent Enhancements

#### Three-Phase Offer System (v2.1) - Latest
1. **Structured Acceptance Flow**: Buyer accepts → Seller confirms → Deal completes
2. **Database Schema Updates**: Added `buyer_accepted` status to negotiation_status enum
3. **New API Endpoints**: 
   - `POST /api/negotiations/[negotiationId]/seller-confirm` - Seller confirmation endpoint
   - Updated `buyer-accept` endpoint to set `buyer_accepted` status (not `completed`)
4. **Enhanced UI Components**:
   - **SellerNotifications** - Action required alerts for `buyer_accepted` negotiations
   - **Status Badges** - "Pending Confirmation" → "Confirmed Sale" → "Completed"
   - **Highest Offer Badges** - Green badges showing top buyer offers on item cards
5. **Authentication Fixes**: Resolved 401 errors in seller-confirm by adding proper auth headers
6. **Three-Phase Status Progression**:
   - Phase 1: `buyer_accepted` (waiting for seller confirmation)
   - Phase 2: `deal_pending` (awaiting pickup/payment)
   - Phase 3: `completed` (fully done)

#### Profile & UI Enhancements (v2.0)
1. **Modern shadcn/ui Components**: Complete UI refresh with consistent, accessible components
2. **Enhanced Profile System**: Professional avatars, stats display, linked navigation
3. **Tabbed Offer Management**: Organized Active/Accepted/Other offers with clean UI
4. **Fixed Backend Issues**: Proper seller names and item photos working correctly
5. **Clean Color Scheme**: Professional blue/gray theme replacing purple gradients
6. **Performance Improvements**: Reduced CSS bundle size by ~38%, faster rendering

## Available Subagents

This project includes specialized Claude Code subagents for specific development tasks:

### shadcn UI Expert (`shadcn-ui-expert`)
- **Purpose**: Design and implement frontend UI components using shadcn/ui
- **Use Cases**: Component layouts, responsive design, shadcn integration, styling optimization
- **Expertise**: Modern React patterns, TypeScript, accessibility, performance optimization
- **Auto-triggers**: UI component work, styling issues, component architecture questions
- **File**: `.claude/agents/shadcn-ui-expert.md`

### Supabase Backend Specialist (`supabase-backend-specialist`)
- **Purpose**: Expert-level Supabase backend optimization, security auditing, and performance troubleshooting
- **Use Cases**: Database schema design, RLS policies, authentication flows, API performance, storage configuration
- **Expertise**: PostgreSQL optimization, security audits, authentication systems, real-time subscriptions
- **Auto-triggers**: Database issues, authentication problems, backend optimization needs
- **File**: `.claude/agents/supabase-backend-specialist.md`

### Vercel Deployment Validator (`vercel-deployment-validator`)
- **Purpose**: Validate deployment readiness and troubleshoot Vercel deployment issues
- **Use Cases**: Pre-deployment checks, build errors, vercel.json configuration, serverless optimization
- **Expertise**: Next.js 15, serverless architecture, build system validation, TypeScript checks
- **Auto-triggers**: Build errors, deployment issues, performance optimization
- **File**: `.claude/agents/vercel-deployment-validator.md`

These subagents can be invoked automatically by Claude Code when their expertise matches your development needs, or you can explicitly request their use for specialized analysis and recommendations.

## Code Style Guidelines

### TypeScript & React Best Practices
- **Full Type Safety**: Use Supabase-generated types for database operations
- **Component Props**: Define clear interfaces for all component props
- **Error Handling**: Implement proper error boundaries and user feedback
- **Performance**: Use React.memo, useMemo, useCallback appropriately

### UI Component Guidelines
- **shadcn/ui First**: Always use shadcn/ui components when available
- **Consistent Styling**: Follow the established blue/gray color scheme
- **Accessibility**: Ensure proper ARIA labels, keyboard navigation, and screen reader support
- **Responsive Design**: Mobile-first approach with seamless desktop scaling

### Database Interaction Patterns
- **API Client**: Use the modern Supabase-based client in `src/lib/api-client-new.ts`
- **Error Handling**: Implement proper error handling for all database operations
- **Real-time**: Use Supabase Realtime subscriptions for live data updates
- **Security**: Always validate permissions and use RLS policies

## Troubleshooting Common Issues

### Database Connection Issues
- Verify Supabase URL and keys in `.env.local`
- Check RLS policies are properly configured
- Ensure proper foreign key relationships in queries

### API Route Errors
- Check authentication token handling
- Verify rate limiting configuration
- Review CORS settings for cross-origin requests

### UI Component Issues
- Ensure shadcn/ui dependencies are installed (`npm install @radix-ui/react-*`)
- Check component imports and usage patterns
- Verify Tailwind CSS configuration

### Build & Deployment Issues
- Run `npm run type-check` to identify TypeScript errors
- Use `npm run build:analyze` to identify bundle size issues
- Verify environment variables in deployment platform

## Performance Optimization

### Frontend Performance
- Use Next.js Image component with proper sizing and formats
- Implement skeleton loading states with shadcn/ui Skeleton
- Optimize bundle size with dynamic imports and code splitting
- Monitor Web Vitals with built-in performance tracking

### Backend Performance
- Implement proper database indexing for frequently queried fields
- Use Supabase connection pooling for high-traffic scenarios
- Cache static data with appropriate TTL values
- Monitor API response times and optimize slow queries

### Recent Optimizations
- **CSS Bundle Reduction**: 38% reduction through shadcn/ui component adoption
- **Component Efficiency**: Modern React patterns with proper memoization
- **Image Handling**: Optimized JSONB image array processing
- **API Efficiency**: Streamlined database queries with proper foreign key relationships