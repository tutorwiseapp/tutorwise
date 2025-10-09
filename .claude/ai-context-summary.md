# Tutorwise Codebase Context Map
Generated: 2025-10-06T13:03:34.165Z

## Quick Stats
- Components: 49
- API Routes: 21
- Shared Types: 3

## Key Components

### Layout Components
- **layout/Container**: /apps/web/src/app/components/layout/Container.tsx
- **layout/Footer**: /apps/web/src/app/components/layout/Footer.tsx
- **layout/Header**: /apps/web/src/app/components/layout/Header.tsx
- **layout/Layout**: /apps/web/src/app/components/layout/Layout.tsx
- **layout/NavMenu**: /apps/web/src/app/components/layout/NavMenu.tsx
- **layout/RoleSwitcher**: /apps/web/src/app/components/layout/RoleSwitcher.tsx

### UI Components
- **ui/Button**: /apps/web/src/app/components/ui/Button.tsx
- **ui/Card**: /apps/web/src/app/components/ui/Card.tsx
- **ui/Message**: /apps/web/src/app/components/ui/Message.tsx
- **ui/PageHeader**: /apps/web/src/app/components/ui/PageHeader.tsx
- **ui/Pagination**: /apps/web/src/app/components/ui/Pagination.tsx
- **ui/StatusBadge**: /apps/web/src/app/components/ui/StatusBadge.tsx
- **ui/Tabs**: /apps/web/src/app/components/ui/Tabs.tsx
- **ui/form/Checkbox**: /apps/web/src/app/components/ui/form/Checkbox.tsx
- **ui/form/Dropdown**: /apps/web/src/app/components/ui/form/Dropdown.tsx
- **ui/form/FormGroup**: /apps/web/src/app/components/ui/form/FormGroup.tsx

## API Routes
- **GET** `/api/activity`: No description
- **POST** `/api/auth/logout`: No description
- **POST** `/api/avatar/upload`: No description
- **GET** `/api/health`: No description
- **GET** `/api/health/supabase`: No description
- **POST** `/api/links`: No description
- **GET, POST** `/api/profile`: No description
- **GET** `/api/referrals`: No description
- **POST** `/api/save-onboarding-progress`: No description
- **GET** `/api/stripe/connect-account`: No description

## Shared Types
- Interfaces: User, ApiResponse
- Types: UserRole
- Enums: None

## High-Impact Components
- **auth/ProtectedRoute**: 0 dependents
- **layout/Container**: 0 dependents
- **layout/Footer**: 0 dependents
- **layout/Header**: 0 dependents
- **layout/Layout**: 0 dependents

## Architecture
- **Frontend**: Next.js 13+ with App Router
- **Backend**: FastAPI with Python 3.12+
- **Database**: Supabase PostgreSQL + Neo4j + Redis
- **Deployment**: Vercel (frontend) + Railway (backend)

This context map helps AI assistants understand the codebase structure and relationships.
