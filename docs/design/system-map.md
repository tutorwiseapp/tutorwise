# Tutorwise System Architecture Map

## Overview
Tutorwise is a full-stack educational platform with a monorepo architecture supporting tutors, agents, and clients (students/parents).

## Applications

### Frontend - `apps/web/`
- **Framework**: Next.js 13+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with CSS Modules
- **Purpose**: User-facing web application
- **Key Features**:
  - Multi-role authentication (Agent, Tutor, Client)
  - Role switching functionality
  - Stripe payment integration
  - Real-time features via Supabase
- **Entry Point**: `apps/web/src/app/layout.tsx`
- **Build Output**: `apps/web/.next/`

### Backend - `apps/api/`
- **Framework**: FastAPI
- **Language**: Python 3.12+
- **Purpose**: Business logic and API services
- **Key Features**:
  - JWT authentication
  - Neo4j graph database integration
  - Redis caching
  - Health monitoring endpoints
- **Entry Point**: `apps/api/app/main.py`
- **Configuration**: `apps/api/app/db.py`

## Shared Packages

### `packages/shared-types/`
- **Purpose**: Shared TypeScript type definitions
- **Usage**: Ensures type safety between frontend and backend
- **Import**: `import type { User } from '@tutorwise/shared-types'`

### `packages/ui/` (Future)
- **Purpose**: Shared UI component library
- **Status**: Planned for future implementation

## Data Architecture

### Primary Database - Supabase PostgreSQL
- **Purpose**: User data, transactions, application state
- **Authentication**: Supabase Auth
- **Real-time**: Supabase real-time subscriptions
- **Location**: Cloud-hosted

### Graph Database - Neo4j Aura
- **Purpose**: Relationship mapping, recommendations
- **Connection**: Via Neo4j driver
- **Location**: Cloud-hosted

### Cache Layer - Redis
- **Purpose**: Session storage, performance optimization
- **Connection**: Via Redis client
- **Location**: Railway hosting

### Payment Processing - Stripe
- **Purpose**: Payment handling, subscriptions
- **Integration**: Stripe Connect for agent payouts
- **Webhooks**: Handled in Next.js API routes

## Deployment Architecture

### Frontend Deployment - Vercel
- **Platform**: Vercel (optimized for Next.js)
- **Configuration**: `vercel.json` (monorepo-aware)
- **Build**: `apps/web/.next/` output
- **Domain**: Production domain via Vercel

### Backend Deployment - Railway
- **Platform**: Railway containers
- **Configuration**: `apps/api/Dockerfile`
- **Services**: FastAPI + Redis
- **Monitoring**: Health check endpoints

## Development Workflow

### Local Development
```bash
# Start frontend
npm run dev              # Starts apps/web on port 3000+

# Start backend
npm run dev:api          # Starts apps/api on port 8000

# Build and test
npm run build           # Builds frontend
npm run test:backend    # Runs Python tests
npm run lint            # Lints frontend
npm run lint:backend    # Lints backend
```

### Workspace Structure
```
tutorwise/
├── apps/
│   ├── web/            # Next.js frontend
│   └── api/            # FastAPI backend
├── packages/
│   └── shared-types/   # Shared TypeScript types
├── tests/              # Integration tests
├── .claude/            # AI context and migration scripts
└── docs/               # Documentation
```

## Key Design Decisions

### Monorepo Benefits
- **Shared Types**: Type safety across frontend/backend
- **Unified Commands**: Single place for all development tasks
- **Code Sharing**: Reusable components and utilities
- **Atomic Changes**: Related changes in single commits

### Next.js App Router
- **Server Components**: Better performance and SEO
- **Route Groups**: Organized by authentication state
- **API Routes**: Co-located with frontend code
- **Middleware**: Authentication and role management

### Role-Based Architecture
- **Multi-Role Users**: Users can be Agent, Tutor, or Client
- **Context Switching**: Dynamic role switching in UI
- **Permissions**: Role-based access control
- **State Management**: React Context for role state

## Integration Points

### Authentication Flow
1. User logs in via Supabase Auth
2. JWT token stored in browser
3. Role information fetched from Supabase
4. Context provider manages role state
5. Role switching updates user session

### Payment Flow
1. User initiates payment in frontend
2. Next.js API route creates Stripe session
3. Stripe handles payment processing
4. Webhook updates Supabase records
5. Frontend reflects payment status

### Data Flow
```
Frontend (Next.js) → API Routes → Supabase/Neo4j/Redis
                  → Stripe → Webhooks → Database Updates
```

This architecture provides a scalable, maintainable foundation for the Tutorwise platform.