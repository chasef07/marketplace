# CLAUDE.md

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Development Commands (from apps/web/)
All commands should be run from the `apps/web/` directory:
- **Development server**: `npm run dev` (with Turbopack enabled for fast HMR)
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
- **AI**: OpenAI GPT-4o-mini with Vercel AI SDK v5 for agent system
- **Maps**: Leaflet for interactive location mapping (currently minimal implementation)
- **Analytics**: Vercel Analytics and Speed Insights for performance monitoring
- **Animations**: Framer Motion for smooth UI transitions
- **Data Fetching**: SWR for client-side data management with real-time subscriptions
- **Image Optimization**: Sharp for server-side image processing with Next.js Image
- **Deployment**: Vercel with serverless functions and comprehensive bundle analysis

### High-Level Architecture
This is a serverless AI-powered furniture marketplace built as a Next.js monorepo with advanced AI agent capabilities:

1. **Frontend (Next.js App Router)**
   - Located in `/apps/web/`
   - Uses App Router with route structure in `/app/`
   - Modern shadcn/ui component library for consistent, accessible UI
   - Supabase client handles authentication and data access
   - Real-time updates via Supabase Realtime subscriptions

2. **API Routes (Next.js Serverless Functions)**
   - Located in `/apps/web/app/api/`
   - Serverless functions deployed on Vercel Edge Runtime
   - Direct integration with Supabase for database operations
   - OpenAI integration for AI services and autonomous agents
   - Rate limiting with Upstash Redis for production security

3. **Database & Backend Services (Supabase)**
   - PostgreSQL database with comprehensive Row Level Security (RLS)
   - Built-in authentication with JWT tokens and social logins
   - File storage for images with signed URLs and public buckets
   - Real-time subscriptions for live marketplace updates

4. **AI Agent System (Autonomous Negotiations)**
   - **Core**: Immediate processing system in `/lib/agent/`
   - **Tools**: 6 working AI tools for market intelligence and actions
   - **Strategy**: Context-aware negotiation with real Supabase data
   - **Processing**: Real-time offer analysis and response (no queuing)

### Key Data Flow
1. **Authentication**: Supabase Auth with JWT → RLS policies secure data → Real-time auth state
2. **Image Analysis**: Frontend upload → Supabase Storage → AI analysis → Structured data storage
3. **Marketplace**: Data flows through Supabase client → RLS policies → Real-time updates
4. **AI Negotiations**: Buyer offers → Immediate AI processing → Strategic response → Database logging
5. **Browse & Search**: API routes with caching → Optimized queries → Real-time item updates

### Database Architecture (Supabase)

#### Core Tables
- **profiles**: Enhanced user data with location, activity tracking, and agent preferences
- **items**: Furniture listings with AI-analyzed metadata, JSONB images array, and comprehensive status system
- **negotiations**: Advanced negotiation system with proper seller/buyer relationships and status progression
- **offers**: Individual offers within negotiations with agent support and detailed tracking

#### AI Agent Tables (Advanced System)
- **agent_decisions**: Logs all AI negotiation decisions with reasoning, tool results, and performance metrics
- **agent_processing_queue**: Manages immediate processing workflow for real-time responses
- **buyer_behavior_profiles**: Analyzes buyer patterns for strategic AI decision-making
- **seller_agent_profile**: Seller preferences and AI agent configuration settings

#### Enhanced Database Features
- **Comprehensive Enums**: 
  - `furniture_type`: 11 categories from couches to cabinets
  - `item_status`: 10 lifecycle states from draft to removed
  - `negotiation_status`: 5 states including deal_pending and picked_up
  - `offer_type`: Buyer/seller distinction with agent_generated flag
- **Advanced Functions**: 
  - `increment_views()`, `handle_new_user()`, `get_primary_image()`
  - `create_offer_transaction()`, `get_next_agent_task()`, `complete_agent_task()`
- **Performance Indexes**: 20+ optimized indexes for marketplace queries, negotiations, and AI processing
- **Enhanced Views**: `negotiations_enhanced` with complete context data for dashboards

### API Architecture

#### RESTful Endpoints
- **Items Management**: Full CRUD with search, filtering, and image upload
- **Negotiations**: Complete offer system with three-phase acceptance flow
- **AI Services**: Image analysis, chat assistance, and autonomous agent monitoring
- **User Management**: Profiles, authentication, and social features
- **Agent System**: Monitoring, processing, and decision logging

#### Advanced Features
- **Three-Phase Offer System**: `active` → `buyer_accepted` → `deal_pending` → `completed`
- **AI Agent Integration**: Real-time processing with tool orchestration
- **Smart Caching**: Differentiated cache strategies for public vs private data
- **Rate Limiting**: Upstash Redis-based protection with user-specific limits
- **Error Handling**: Comprehensive error boundaries and user feedback

### Component Architecture

#### App Router Structure (`/app/`)
- **browse/**: Complete marketplace browsing with search and filtering
- **marketplace/[id]/**: Detailed item views with negotiation capabilities  
- **profile/[username]/**: Public profile pages with listings and activity
- **profile/edit/**: Profile management and preferences
- **api/**: Comprehensive API routes organized by feature

#### Component Organization (`/components/`)
- **auth/**: Enhanced authentication with social login support
- **browse/**: Modern marketplace browsing (BrowsePage, ItemCard, ItemGrid, SearchHeader, FilterSidebar)
- **buyer/**: Buyer offer management with notifications and confirmation flows
- **seller/**: Seller dashboard with agent notifications and status management
- **marketplace/**: Item details with QuickActionsOverlay and comprehensive views
- **profile/**: Tabbed profile system with offers, listings, and activity tracking
- **agent/**: AI agent components including NegotiationTimeline and monitoring
- **navigation/**: MainNavigation with responsive design and auth integration
- **home/**: Landing page with HeroSection, InteractiveUploadZone, and ListingPreview
- **ui/**: Complete shadcn/ui component library with 15+ components

#### Key Integration Libraries
- **API Client**: Modern Supabase-based client in `lib/api-client-new.ts`
- **AI Agent System**: Core processing in `lib/agent/immediate-processor.ts`
- **Type Safety**: Complete TypeScript with Supabase-generated types in `lib/database.types.ts`
- **Performance**: Web Vitals tracking and optimization utilities
- **Utilities**: Profile management, authentication helpers, and shared hooks

### AI Agent System (Production-Ready)

#### Core Features
- **Status**: ✅ **ACTIVE** - Real-time immediate processing system
- **Processing Model**: Immediate response (no queuing) for instant buyer interaction
- **Intelligence**: 6 working AI tools providing comprehensive market context
- **Strategy**: Human-like negotiation patterns with momentum-based decision making
- **Logging**: Complete decision tracking with reasoning and performance metrics

#### Agent Tools & Capabilities
1. **getNegotiationHistoryTool**: Analyzes complete offer history and buyer behavior patterns
2. **analyzeOfferTool**: Provides contextual offer assessment without price suggestions
3. **counterOfferTool**: Executes strategic counter-offers with market-aware pricing
4. **decideOfferTool**: Accepts or rejects offers based on comprehensive analysis
5. **getListingAgeTool**: Provides market timing context for urgency-based decisions
6. **getCompetingOffersTool**: Analyzes competitive landscape for strategic positioning

#### Strategic Decision Framework
- **Context Gathering**: Uses all 6 tools to understand complete market situation
- **AI Reasoning**: GPT-4o-mini applies strategic thinking without hardcoded formulas
- **Execution**: Single action per offer (counter OR accept/reject) to prevent conflicts
- **Learning**: Tracks decision outcomes for continuous improvement

## Database Schema

Run the SQL in `/supabase/schema.sql` in your Supabase project to create the complete schema with AI agent support.

### Key Tables & Functions
- **Core Tables**: profiles, items, negotiations, offers with comprehensive relationships
- **Agent Tables**: agent_decisions, agent_processing_queue, buyer_behavior_profiles, seller_agent_profile
- **Functions**: 15+ optimized functions for marketplace operations and AI processing
- **Views**: negotiations_enhanced for dashboard queries with complete context
- **Security**: Row Level Security (RLS) policies securing all data access

## UI Component System (shadcn/ui)

### Available Components (15+ Production-Ready)
- **Layout**: Card, Separator, Sheet, Tabs with TabsContent/List/Trigger
- **Forms**: Button, Input, Label, Textarea, Select, Checkbox, Slider
- **Display**: Avatar, Badge, Dialog, Progress, Skeleton, ScrollArea
- **Navigation**: Collapsible components with proper ARIA support
- **Custom**: ImageCarousel, ThemedLoading for marketplace-specific needs

### Design System
- **Color Scheme**: Professional blue/slate theme throughout (no purple/bright colors)
- **Typography**: Consistent font sizing and hierarchy with proper contrast
- **Accessibility**: Full ARIA support, keyboard navigation, screen reader compatibility
- **Responsive**: Mobile-first design with seamless desktop scaling
- **Performance**: Tree-shaking enabled, minimal bundle impact

### Modern UI Patterns
- **Tabbed Interfaces**: Organized content sections with proper state management
- **Status Badges**: Color-coded indicators for negotiations, items, and offers
- **Interactive Cards**: Clickable navigation with hover states and loading indicators
- **Modal Systems**: Dialog components for confirmations and detailed actions
- **Loading States**: Skeleton components and themed loading animations

## Development Guidelines

### Code Style & Patterns
- **TypeScript First**: Full type safety with Supabase-generated types
- **Component Architecture**: Focused, reusable components with clear prop interfaces
- **Error Handling**: Comprehensive error boundaries and user feedback
- **Performance**: Strategic use of React.memo, useMemo, useCallback for optimization
- **Accessibility**: Proper ARIA labels, keyboard navigation, semantic HTML

### API Development
- **RESTful Design**: Consistent endpoint patterns with proper HTTP methods
- **Authentication**: JWT validation with Supabase Auth integration
- **Rate Limiting**: Production-ready rate limiting with Redis backend
- **Caching**: Strategic cache headers based on data sensitivity
- **Error Responses**: Structured error handling with user-friendly messages

### Database Interactions
- **RLS Policies**: Secure data access with comprehensive row-level security
- **Optimized Queries**: Performance-tuned indexes for common query patterns
- **Real-time**: Supabase subscriptions for live data updates
- **Transactions**: Atomic operations for critical business logic
- **Migration Management**: Versioned schema changes with rollback support

## Recent Major Updates

### Browse Page Overhaul (v3.0 - Latest)
**Status**: ✅ **COMPLETED** - Complete marketplace browsing functionality
- **New Features**: Advanced search, price sorting, proper item detail routes
- **API Enhancements**: Enhanced `/api/items` with search and sort parameters
- **UI Improvements**: Streamlined interface focusing on essential information
- **Architecture**: Consolidated profile system with shared utilities and hooks
- **Performance**: Removed 400+ lines of duplicate code, improved build times

### AI Agent System (v2.3 - Production)
**Status**: ✅ **ACTIVE** - Real-time immediate processing with 6 working tools
- **Fixed Issues**: Tool conflicts, data extraction problems, database cleanup
- **Current Architecture**: Immediate processing, comprehensive debugging, terminal logging
- **Strategic Framework**: Context-aware decisions using complete market intelligence
- **Performance**: Sub-15s response times with detailed execution logging

### Three-Phase Offer System (v2.1)
**Status**: ✅ **COMPLETED** - Structured acceptance flow with seller confirmation
- **Flow**: Buyer accepts → Seller confirms → Deal completes with pickup coordination
- **Database**: Enhanced negotiation_status enum with buyer_accepted intermediate state
- **UI Components**: Status badges, notifications, and confirmation workflows
- **API Endpoints**: New seller-confirm endpoint with proper authentication

### Profile & UI Modernization (v2.0)
**Status**: ✅ **COMPLETED** - Modern shadcn/ui components throughout
- **Components**: Professional avatars, tabbed interfaces, status management
- **Performance**: 38% CSS bundle reduction, faster rendering, better UX
- **Navigation**: Linked profile system with clickable cards and seamless routing
- **Design**: Clean blue/gray theme replacing inconsistent colors

## Setup Instructions

1. **Create Supabase Project**: https://supabase.com with proper configuration
2. **Run Database Schema**: Execute `/supabase/schema.sql` in SQL editor
3. **Configure Storage**: Create 'furniture-images' bucket (public access)
4. **Set Environment Variables**: Copy from `.env.local.example` to `.env.local` in `apps/web/`
5. **Install Dependencies**: `npm install` from `apps/web/`
6. **Configure Redis**: Create Upstash Redis instance (required for production rate limiting)
7. **Configure OpenAI**: Add API key for AI agent system and image analysis
8. **Run Development**: `npm run dev` from `apps/web/`

## Production Readiness

### Current Status: 🟡 **PRODUCTION-READY WITH OPTIMIZATIONS**

**Strengths**:
- ✅ Excellent Next.js 15 App Router architecture
- ✅ Comprehensive Supabase integration with RLS security
- ✅ Working AI agent system with real-time processing
- ✅ Modern shadcn/ui component system
- ✅ Strategic caching and performance optimizations
- ✅ Complete database schema with advanced features

**Recommended Optimizations** (1-2 weeks):
- **Performance**: Implement React.memo patterns for reduced re-renders
- **Images**: Convert remaining `<img>` tags to Next.js Image components
- **Bundle**: Remove unused dependencies and optimize imports
- **Testing**: Add critical path testing for core user flows
- **Monitoring**: Enhanced performance tracking beyond console logging

### Security & Performance
- **Security Headers**: Comprehensive CSP policies for external services
- **Authentication**: JWT-based auth with social login support
- **Rate Limiting**: Production-ready with Upstash Redis backend
- **Caching**: Strategic cache headers (30s-1h based on data sensitivity)
- **Image Optimization**: Next.js Image with WebP/AVIF formats
- **Bundle Analysis**: Integrated bundle analyzer for optimization tracking

## Troubleshooting

### Common Issues
- **Database Connections**: Verify Supabase credentials and RLS policies
- **AI Agent Issues**: Check `/api/agent/monitor` endpoint for system status
- **Build Errors**: Run `npm run type-check` to identify TypeScript issues
- **Performance**: Use `npm run build:analyze` for bundle size analysis
- **Images**: Ensure Supabase storage bucket is properly configured

### Debug Resources
- **AI Agent Logs**: Comprehensive terminal logging for decision tracking
- **API Monitoring**: Built-in monitoring endpoints for system health
- **Performance Tracking**: Web Vitals integration with Vercel Analytics
- **Database Views**: Enhanced views for debugging complex queries

## Advanced Features

### AI-Powered Capabilities
- **Autonomous Negotiations**: Real-time AI agents handling buyer offers
- **Image Analysis**: OpenAI GPT-4 Vision for furniture item analysis
- **Smart Recommendations**: Context-aware pricing and negotiation strategies
- **Behavior Analysis**: Buyer pattern recognition for strategic decision making

### Real-Time Features
- **Live Negotiations**: Instant updates via Supabase Realtime
- **Status Changes**: Real-time item and negotiation status updates
- **Notifications**: Immediate alerts for offers, acceptances, and confirmations
- **Agent Activity**: Live monitoring of AI decision-making processes

### Analytics & Monitoring
- **Performance Tracking**: Core Web Vitals and user experience metrics
- **Business Intelligence**: Negotiation success rates and pricing analytics
- **AI Decision Logging**: Complete audit trail of agent reasoning and outcomes
- **User Behavior**: Profile-based analytics for marketplace optimization

## Important Notes

### Critical Dependencies
- **Supabase**: Database, auth, storage, and realtime functionality
- **OpenAI**: AI agent system and image analysis capabilities
- **Upstash Redis**: Production rate limiting (critical for deployment)
- **Vercel**: Deployment platform with analytics and performance monitoring

### Integration Points
- **Authentication**: Seamless Supabase Auth with JWT token management
- **File Storage**: Direct Supabase Storage with secure signed URLs
- **Real-Time**: Live subscriptions for negotiations and marketplace updates
- **AI Processing**: Immediate agent responses with comprehensive tool integration

### Best Practices
- **Type Safety**: Comprehensive TypeScript with database-generated types
- **Error Handling**: Graceful degradation with user-friendly error messages
- **Performance**: Strategic optimization with minimal impact on development velocity
- **Security**: Multiple layers including RLS, CSP headers, and input validation
- **Accessibility**: Full ARIA support and keyboard navigation throughout

This marketplace represents a production-ready, AI-enhanced furniture trading platform with modern architecture, comprehensive security, and advanced user experience capabilities. The codebase is well-structured, thoroughly documented, and ready for scaling to production deployment.