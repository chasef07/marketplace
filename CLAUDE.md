# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Development Commands (from apps/web/)
All commands should be run from the `apps/web/` directory:
- **Development server**: `npm run dev` (with Turbopack enabled)
- **Build**: `npm run build`
- **Production server**: `npm start`
- **Lint**: `npm run lint`
- **Type check**: `npm run type-check`

### Environment Setup
- Copy `apps/web/.env.local.example` to `apps/web/.env.local` and configure:
  - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key  
  - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
  - `OPENAI_API_KEY` - Your OpenAI API key

## Project Architecture

### Technology Stack
- **Structure**: Single Next.js app in `apps/web/`
- **Frontend & Backend**: Next.js 15 with App Router and API routes
- **Database & Auth**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **AI**: OpenAI GPT-4o for image analysis and embeddings for search
- **Deployment**: Vercel with serverless functions

### High-Level Architecture
This is a serverless AI-powered furniture marketplace built as a Next.js monorepo:

1. **Frontend (Next.js App Router)**
   - Located in `/apps/web/`
   - Uses App Router with components in `/components/`
   - Supabase client handles authentication and data access
   - Real-time updates via Supabase Realtime subscriptions

2. **API Routes (Next.js API Routes)**
   - Located in `/apps/web/app/api/`
   - Serverless functions deployed on Vercel Edge
   - Direct integration with Supabase for database operations
   - OpenAI integration for AI services

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
- **profiles**: User data extending auth.users with personality traits
- **items**: Furniture listings with AI-analyzed metadata and pricing
- **negotiations**: Complex offer system with round limits and status tracking  
- **offers**: Individual buyer/seller offers with timing and counter-offer flags
- **RLS Policies**: Secure data access - users only see/modify their own data
- **Database Functions**: Custom functions like `increment_views()` for atomic operations

### API Architecture
- **RESTful endpoints** under `/api/` deployed as serverless functions
- **AI Services**: `/api/ai/analyze-image`, `/api/ai/search`
- **CRUD Operations**: `/api/items/*`, `/api/negotiations/*`, `/api/auth/me`
- **Advanced Features**: `/api/negotiations/items/{itemId}/offer-analysis` for AI insights
- **Authentication**: Handled by Supabase Auth, checked in API routes
- **File Uploads**: Direct to Supabase Storage with signed URLs

### Component Architecture
- **App Router**: Uses `app/` directory structure
- **Components**: Organized by feature in `components/`
  - `auth/` - Enhanced authentication UI
  - `home/` - Home page components (HeroSection, HomePage, ListingPreview, etc.)
  - `marketplace/` - Marketplace views and item details
  - `search/` - AI-powered search functionality
  - `seller/` - Seller dashboard with offer analysis
  - `ui/` - Reusable UI components
- **API Client**: Modern Supabase-based client in `src/lib/api-client-new.ts`
- **Type Safety**: Full TypeScript with Supabase-generated types

### Critical Integration Points
- **Supabase Client**: Both browser and server clients for different contexts
- **Authentication State**: Real-time auth state changes via Supabase listeners
- **File Storage**: Supabase Storage with public bucket and access policies
- **Real-time**: Supabase Realtime for live negotiations and marketplace updates
- **AI Pipeline**: OpenAI API → Structured data → Database → Frontend display

## Database Schema

Run the SQL in `/supabase/schema.sql` in your Supabase project to create:

### Key Tables
- `profiles` - User data with seller/buyer personalities
- `items` - Furniture listings with rich AI-generated metadata
- `negotiations` - Complex negotiation system with status tracking
- `offers` - Individual offers within negotiations

### Important Functions
- `increment_views(item_id)` - Atomically increment item view counts
- `handle_new_user()` - Auto-create profile on user signup
- `handle_updated_at()` - Auto-update timestamps

## Development Notes

### Supabase Integration
- Uses `@supabase/supabase-js` package for Next.js
- Server-side client for API routes, browser client for components
- Row Level Security policies secure all data access
- Real-time subscriptions for live updates

### AI Services
- OpenAI GPT-4o for image analysis with structured output
- Text embeddings for semantic search with cosine similarity
- AI offer analysis for strategic seller insights
- Fallback error handling for all AI operations

### File Handling
- Supabase Storage replaces local filesystem
- Images uploaded to 'furniture-images' bucket
- Signed URLs for secure access
- Automatic file type validation

### Authentication Flow
- Supabase Auth with email/password and social logins
- JWT tokens automatically managed by Supabase client
- Auth state changes trigger UI updates
- Protected API routes check authentication

### Deployment Configuration
- Vercel deployment via `vercel.json`
- Environment variables configured in Vercel dashboard
- Monorepo structure with workspace-based builds
- Edge functions for optimal performance

## Setup Instructions

1. **Create Supabase Project**: https://supabase.com
2. **Run Database Schema**: Execute `/supabase/schema.sql` in SQL editor
3. **Configure Storage**: Create 'furniture-images' bucket (public)
4. **Set Environment Variables**: Copy from `.env.local.example`
5. **Install Dependencies**: `npm install` from `apps/web/`
6. **Run Development**: `npm run dev`

## Current Project Status

### Recent Changes
- Streamlined authentication system with enhanced UI components
- Removed deprecated landing page components (ai-showcase, features, hero)
- Consolidated home page functionality with improved components
- Simplified API structure by removing unused suggestion endpoints
- Updated search functionality with AI-powered semantic search
- Enhanced seller dashboard with offer analysis capabilities

### Clean Architecture
- Removed legacy components and unused API routes
- Focused on core marketplace functionality
- Streamlined component structure for better maintainability
- Enhanced type safety with updated TypeScript definitions

## Migration Notes
- Successfully migrated from Python FastAPI to Next.js API routes
- All backend functionality preserved in TypeScript
- Supabase replaces custom JWT and SQLite database
- Enhanced with real-time capabilities and better security
- No Python dependencies required - pure Node.js/TypeScript stack
- Recent cleanup focused on core marketplace features