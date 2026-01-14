# Tutorwise AI Development Context

> **Universal AI Context File** - Compatible with Claude, Cursor, Copilot, and other AI tools
> **Last Updated**: 2026-01-14
> **Context Engineering**: Autonomous development enabled
> **Project Status**: 95% Complete - Beta Release Feb 1, 2026

---

## ⚡ CAS Prompt Design
When the user starts a prompt with these triggers, activate specific agent subsets to optimize token usage and focus:

| Trigger | Active Agents | Purpose |
| :--- | :--- | :--- |
| `CAS Team:` | **All 8 Agents** | Full architectural review for major features. |
| `CAS Plan:` | **Planner** | Scope definition, prioritization, and roadmap updates. |
| `CAS BA:` | **Analyst** | Requirements gathering, user stories, and edge case analysis. |
| `CAS Dev:` | **Developer** | Pure code implementation. Skips planning/analysis phases. |
| `CAS Test:` | **Tester** | Writing unit/E2E tests and verifying bug fixes. |
| `CAS QA:` | **QA** | Visual regression, accessibility (WCAG), and browser testing. |
| `CAS DevOps:` | **Engineer** | Infrastructure, CI/CD, database performance, and deployment. |
| `CAS Market:` | **Marketer** | User value proposition, UX copy review, and feature positioning. |
| `CAS 3Amigos:` | **Analyst + Developer + Tester** | Agile refinement: Defining "What", "How", and "Checks". |

**Behavior Rule:**
When a specific subset is triggered (e.g., `CAS Dev:`), explicitly **SKIP** the preamble for all inactive agents to save tokens. Proceed directly to the active agent's output.

---

## 🤖 **AI Behavior Mode Configuration**

### **CURRENT MODE: AUTONOMOUS** ✅
<!-- Switch: Change to COLLABORATIVE to disable autonomous mode -->
<!-- Available modes: AUTONOMOUS | COLLABORATIVE -->

### **Autonomous Mode (ACTIVE)**
When AUTONOMOUS mode is enabled:
- ✅ Make technical decisions independently using project context
- ✅ Choose best implementation approach without asking for options
- ✅ Follow established patterns and conventions automatically
- ✅ Implement solutions immediately based on requirements
- ✅ Provide explanation AFTER implementing, not before
- ✅ Only ask for clarification on business requirements, not technical details

### **Collaborative Mode (INACTIVE)**
When COLLABORATIVE mode is enabled:
- 🔄 Provide multiple implementation options (1, 2, 3)
- 🔄 Ask for user preference before implementing
- 🔄 Explain approaches before taking action
- 🔄 Seek confirmation on technical decisions

### **Decision Framework (Autonomous Mode)**
**Priority Order for Independent Decisions:**
1. **Existing Codebase Patterns** (highest priority) - Follow established conventions
2. **Tutorwise Architecture** (see PLATFORM-SPECIFICATION.md) - Align with system design
3. **Best Practices** - Apply industry standards for Next.js 15/TypeScript/Supabase
4. **Performance & Maintainability** - Optimize for long-term code health
5. **Documentation** - Document decisions made autonomously

### **When to Ask vs Decide Autonomously**
**✅ Decide Autonomously:**
- Technical implementation details
- Code structure and organization
- Testing strategies and approaches
- Performance optimizations
- Bug fixes and refactoring
- Component design and styling
- Database queries and non-breaking schema updates

**❓ Ask for Input:**
- Business logic requirements and rules
- UI/UX design decisions and user flows
- Breaking database schema changes
- New external service integrations
- Feature prioritization and scope changes
- Payment and security policy changes

### **Autonomous Communication Style**
- **Action-Oriented**: "Implementing X using Y approach because Z"
- **Results-Focused**: Show what was accomplished, not what could be done
- **Context-Driven**: Reference specific project patterns and conventions used
- **Proactive**: Suggest next steps and related improvements
- **Concise**: Brief explanations, detailed implementation

---

## 🧠 Context Retrieval Protocol

Before writing code or planning tasks, you MUST check the following documentation sources in this specific order. Consider these files the **Immutable Source of Truth**.

### 1. Platform Specification (Primary Reference)
* **`.ai/PLATFORM-SPECIFICATION.md`** (3,194 lines, 203KB) - Complete technical + strategic specification
  - System architecture (260 pages, 141 APIs, 353 components)
  - Database schema (237 migrations)
  - Admin Dashboard (12 sections)
  - Shared Fields System (23 fields → 106 mappings)
  - User journeys for all 3 roles
  - Business model and valuation
* **Status**: ✅ Excellent (Updated 2026-01-14)
* **When to use**: Primary reference for all architectural decisions, features, and system design

### 2. Feature-Specific Documentation (Secondary Reference)
* **Admin Dashboard**: `.ai/ADMIN-DASHBOARD.md` (if created - see todos)
* **Shared Fields**: `.ai/SHARED-FIELDS.md` (if created - see todos)
* **Onboarding**: `.ai/ONBOARDING.md` (if created - see todos)
* **Help Centre**: `docs/feature/help-centre/IMPLEMENTATION-COMPLETE.md` (Dec 2025)
* **Referrals**: `docs/feature/referrals/IMPLEMENTATION-COMPLETE.md`
* **Network**: `docs/feature/network/NETWORK-V4.6-ENHANCEMENTS.md`

### 3. Design & Development Standards
* **Project Design System**: `docs/design/DESIGN-SYSTEM.md` (UI patterns, TutorWise-specific)
* **CAS Framework Design**: `cas/docs/cas-design-system.md` (Core components, architecture patterns)
* **Proven Patterns**: `cas/docs/proven-patterns.md` (Copy-paste implementation patterns)
* **Development Standards**: `cas/docs/proven-patterns.md`

### 4. Code Patterns (Check codebase directly)
* **HubComplexModal Pattern**: See `.ai/PATTERNS.md` (once updated)
* **UnifiedSelect/UnifiedMultiSelect**: See admin forms and onboarding
* **Shared Fields Integration**: See `apps/web/src/lib/api/sharedFields.ts`

**Important Note**: Some docs in `docs/` may be outdated. When in doubt, **check the actual codebase** for current implementations.

---

## 📋 **Project Overview**

### **Current Status (Jan 2026)**
- **Version**: 1.0.0-beta
- **Completion**: 95%
- **Beta Release**: February 1, 2026
- **Development Activity**: 1,400 commits (Oct 2025 - Jan 2026)
  - 82 new features implemented
  - 151 bug fixes resolved
  - 63 refactors for code quality
  - 55 documentation updates

### **What is TutorWise?**
TutorWise is a production-grade, full-stack EdTech marketplace and CRM ecosystem designed to unify the fragmented tutoring economy. Built with Next.js 15 (Frontend) + Supabase (Backend), it features a unique "Single Account, Multi-Role" identity system that allows users to seamlessly switch between Student, Tutor, and Agent personas.

Unlike standard marketplaces, TutorWise integrates a sophisticated "Growth Engine" directly into its core, leveraging a proprietary Profile Graph to power viral referrals, network building, and commission tracking.

### **Key Differentiators**
1. **AI-Native Development**: Built for £1,000 in 6 months (2,850x cost advantage vs traditional £2.85M build)
2. **Three-Sided Marketplace**: Agents as distinct supply-side with patent-pending referral system
3. **Career Progression Platform**: Solo tutor → Full-time professional → Agency owner (without switching platforms)
4. **Triple Integration**: Marketplace + CRM + Referrals (competitors structurally locked out)
5. **Transparent Trust**: Open-source CaaS algorithm shows tutors exactly how to grow bookings

### **Core Capabilities**

#### 1. AI-Powered Credibility (CaaS)
Built-in Credibility as a Service (CaaS) engine that scores tutor reliability based on verified "Proof of Work" data points—completed sessions, saved artifacts, trust graph positioning—rather than subjective reviews.

#### 2. WiseSpace (Hybrid Virtual Classroom)
Cost-optimized virtual learning environment with collaborative whiteboard (tldraw + real-time sync) alongside Google Meet integration.

#### 3. Collaborative Wiselists
"Airbnb-style" planning tool for curating tutor lists, driving viral acquisition and in-network attribution via tracking cookies and Stripe webhooks.

#### 4. Smart Marketplace & CRM
- **Listings**: 23 global shared fields with dynamic availability and "Free Help" options
- **Bookings & Payments**: Stripe Connect with commission splitting, payouts, dispute management
- **Network**: LinkedIn-style connection graph for Agents managing tutor rosters

#### 5. Admin Dashboard (12 Sections)
Comprehensive platform management with:
- Accounts (soft/hard delete with GDPR compliance)
- Forms (drag-and-drop UI for 23 shared fields → 106 mappings)
- Organisations (team management, subscriptions, verification)
- Listings, Bookings, Referrals, Reviews, Financials, SEO, Settings, Configurations, Action Logging

#### 6. Contextual Autonomous System (CAS)
AI-driven "Product Team" framework with specialized agents (Planner, Analyst, Developer, Tester) for auto-maintaining project plans and enforcing production-ready quality standards.

---

## 🏗️ **System Architecture**

### **Frontend Stack**
- **Framework**: Next.js 15.x with App Router
- **Language**: TypeScript 5.x (strict mode)
- **Styling**: Tailwind CSS + CSS Modules
- **State Management**:
  - React Query (TanStack Query) for server state
  - Zustand for client state
  - React Context for auth/theme
- **UI Components**: Custom design system in `apps/web/src/components/ui/`
- **Key Patterns**:
  - HubComplexModal (admin detail views)
  - UnifiedSelect/UnifiedMultiSelect (form standardization)
  - Shared Fields System (23 global fields)

### **Backend & Data**
- **Primary Database**: Supabase PostgreSQL (auth, profiles, business data)
- **Authentication**: Supabase Auth with Google OAuth
- **Real-time**: Supabase subscriptions and presence tracking
- **Migrations**: 237 migrations (172 numbered + 65 supporting files)
- **Key Tables**: profiles, shared_fields, form_context_fields, onboarding_progress, org_subscriptions, org_tasks, help_support_snapshots, admin_action_logs, referral_links, referral_activities
- **Row-Level Security**: 200+ RLS policies with granular RBAC

### **External Services**
- **Payments**: Stripe Connect (user sending and receiving payments)
- **Support**: Jira Service Desk integration with automatic ticket creation
- **Email**: Resend
- **File Storage**: Supabase Storage

### **Infrastructure**
- **Hosting**: Vercel (Next.js app)
- **Database**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **CDN**: Vercel Edge Network

### **Testing & Quality**
- **Unit Testing**: Jest + React Testing Library (106 passing tests)
- **E2E Testing**: Playwright (multi-browser)
- **Visual Regression**: Percy
- **Component Library**: Storybook
- **Linting**: ESLint + TypeScript strict mode

---

## 📂 **Project Structure & Patterns**

### **Directory Organization**
```
apps/web/src/
├── app/
│   ├── (admin)/admin/              # 12 admin sections
│   │   ├── accounts/               # User management (soft/hard delete)
│   │   ├── forms/                  # Shared fields admin (drag-and-drop UI)
│   │   ├── organisations/          # Team management
│   │   ├── listings/               # Service listings admin
│   │   ├── bookings/               # Session management
│   │   ├── referrals/              # Commission tracking
│   │   ├── reviews/                # Moderation
│   │   ├── financials/             # Transactions, payouts
│   │   ├── seo/                    # Hub management, trust graph
│   │   ├── settings/               # Platform settings
│   │   ├── configurations/         # System config
│   │   └── action-logging/         # Audit trail (GDPR)
│   ├── (auth)/                     # Authentication routes
│   ├── (dashboard)/                # User dashboards (role-based)
│   ├── api/                        # API routes (141 endpoints)
│   ├── components/                 # Reusable components
│   │   ├── ui/                     # Base design system (353 components)
│   │   ├── admin/                  # Admin-specific components
│   │   ├── feature/                # Feature-specific components
│   │   └── layout/                 # Layout components
│   └── onboarding/                 # Page-based onboarding (5 steps/role)
├── lib/
│   ├── api/                        # API utilities
│   │   ├── formConfig.ts           # Form configuration API
│   │   └── sharedFields.ts         # Shared fields API
│   └── supabase/                   # Supabase clients
│       └── server.ts               # Server-side Supabase client
└── utils/                          # Utility functions

tools/database/migrations/          # 237 database migrations
```

### **Naming Conventions**
- **Files**: PascalCase for components, camelCase for utilities
- **Components**: PascalCase (`<HubComplexModal />`, `<UnifiedSelect />`)
- **Variables**: camelCase (`isLoading`, `userProfile`)
- **Constants**: SCREAMING_SNAKE_CASE (`API_BASE_URL`)
- **CSS Modules**: camelCase (`styles.cardContainer`)

### **Component Patterns**

#### Standard Component Pattern
```typescript
'use client';

import { useState, useEffect } from 'react';
import styles from './ComponentName.module.css';

interface ComponentProps {
  title: string;
  isVisible?: boolean;
  onAction?: () => void;
}

export default function ComponentName({ title, isVisible = true, onAction }: ComponentProps) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Component setup
  }, []);

  const handleClick = () => {
    onAction?.();
  };

  if (!isVisible) return null;

  return (
    <div className={styles.container}>
      <h2>{title}</h2>
      {/* Component JSX */}
    </div>
  );
}
```

#### HubComplexModal Pattern (Admin Details)
Used across all 12 admin sections for detail views. See `apps/web/src/app/(admin)/admin/accounts/components/` for examples.

#### UnifiedSelect/UnifiedMultiSelect Pattern
Standardized form components for shared fields. Used in onboarding, account forms, organisation forms, and listings.

---

## 🛣️ **Development Roadmap & Current Status**

### **✅ Completed (95%)**
- Authentication & Profiles (Supabase Auth, multi-role support)
- Onboarding System (page-based routing, zero data loss, 5 steps per role)
- Admin Dashboard (12 sections with full CRUD + GDPR compliance)
- Shared Fields System (23 fields → 106 mappings → 9 contexts)
- Referral System (Phases 1-3, multi-tier infrastructure)
- Help Centre & Support (Jira Service Desk integration, screenshot capture)
- Marketplace & Listings (141 API endpoints, smart matching, recommendations)
- Payment Processing (Stripe Connect, commission splitting)
- Network & Connections (trust graph, WiseChat messaging)
- Organisations & Teams (subscriptions, tasks, recruitment Phase 1)
- Testing Infrastructure (Jest, Playwright, Percy, Storybook)

### **🔄 In Progress (Final 5%)**
- Agent CaaS implementation (designed, architecture complete)
- Organisation CaaS implementation (designed, 4-bucket scoring ready)
- Recruitment system Phase 2 (Phase 1 complete)
- Final mobile responsiveness polish (80% complete)
- Performance optimization and caching
- Beta testing preparation
- Production environment hardening

### **🎯 Beta Release Scope (Feb 1, 2026)**
- All core marketplace features ✅
- Complete admin dashboard ✅
- Referral system (Tier 1) ✅
- Payment processing ✅
- Help centre & support ✅
- User onboarding flows ✅
- Basic mobile responsiveness
- Production-ready security & compliance

---

## 💻 **Development Patterns & Best Practices**

### **API Integration Pattern**
```typescript
// API Route Pattern (Next.js 15)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // API logic
    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Client-side fetch pattern (React Query)
import { useQuery } from '@tanstack/react-query';

const { data, isLoading, error } = useQuery({
  queryKey: ['key'],
  queryFn: async () => {
    const response = await fetch('/api/endpoint');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },
});
```

### **Database Patterns**

#### Supabase Integration
```typescript
import { createClient } from '@/utils/supabase/server';

// Standard query
const supabase = await createClient();
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();

if (error) {
  console.error('Database error:', error);
  return { error: error.message };
}
```

#### Service Role Client (Admin Operations)
```typescript
import { createClient as createAdminClient } from '@supabase/supabase-js';

// For operations requiring service role (bypasses RLS)
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Use for admin operations like user deletion
const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
```

### **Authentication Flow**
```typescript
// Middleware for route protection
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}
```

---

## ✅ **Testing Strategy**

### **Testing Framework**
- **Unit Tests**: Jest + React Testing Library (106 passing tests)
- **E2E Tests**: Playwright (multi-browser: Chrome, Firefox, Safari, Mobile)
- **Visual Regression**: Percy
- **Component Library**: Storybook

### **Testing Commands**
```bash
npm test                    # Jest unit tests
npm run test:e2e           # Playwright E2E tests
npm run test:e2e:ui        # Playwright UI mode
npm run quality:check      # Linting + all tests
```

### **Coverage Requirements**
- **Frontend**: 70% minimum, 80% target
- **Backend**: 80% minimum, 90% target for business logic
- **E2E**: Major user journeys and critical paths

---

## 🤖 **AI Development Instructions**

### **Context Engineering Principles**
1. **Read PLATFORM-SPECIFICATION.md** before implementing new features
2. **Follow established patterns** in codebase (HubComplexModal, UnifiedSelect, Shared Fields)
3. **Use existing components** and utilities where possible
4. **Maintain consistent code style** and architecture
5. **Update tests** when adding/modifying functionality
6. **Check actual codebase** when documentation conflicts arise

### **When Building New Features**
1. **Check PLATFORM-SPECIFICATION.md** for architecture and system constraints
2. **Review feature-specific docs** in `docs/feature/` for implementation details
3. **Follow component patterns** for consistent implementation
4. **Add proper TypeScript types** for all new interfaces
5. **Include tests** for critical functionality
6. **Update documentation** for significant changes

### **Code Quality Standards**
- **TypeScript**: Strict mode, proper typing, no `any` without justification
- **Error Handling**: Comprehensive try/catch, user-friendly feedback
- **Performance**: Optimize queries, lazy loading, React Query caching
- **Accessibility**: ARIA labels, keyboard navigation, WCAG compliance
- **Security**: Input validation, RLS policies, authentication checks
- **GDPR Compliance**: Data anonymization, audit trails, right to deletion

### **Testing Requirements**
- **Unit tests** for utility functions and complex logic
- **Integration tests** for API endpoints
- **E2E tests** for user workflows
- **Update existing tests** when modifying functionality

---

## 🔐 **Critical Technical Notes**

### **Authentication**
- **Supabase Auth**: JWT-based with Google OAuth
- **Multi-Role Support**: Tutor, Client, Agent, Organisation Owner
- **Route Protection**: Middleware handles protected routes
- **Service Role**: Use `createAdminClient()` for admin operations only

### **Payment Processing**
- **Stripe Connect**: Never expose secret keys client-side
- **Webhooks**: Handle async payment confirmations
- **Commission Splitting**: Automated through Stripe Connect
- **GDPR**: Delete both Stripe Customer and Connect Account on hard delete

### **Performance**
- **Next.js 15**: Server Components for optimal performance
- **React Query**: Caching and optimistic updates
- **Database**: Proper indexing (see migrations), connection pooling
- **Edge Functions**: For authentication and real-time features

### **Security**
- **Input Validation**: Server-side validation required (never trust client)
- **HTTPS**: Everywhere, encrypted database connections
- **RLS Policies**: 200+ Row Level Security policies in Supabase
- **CORS**: Proper cross-origin request handling
- **Admin Operations**: Service role client only for trusted operations

---

## 📊 **Current Status**

### **✅ Completed Infrastructure**
- Next.js 15 with TypeScript 5.x ✅
- Supabase authentication and database (237 migrations) ✅
- Stripe Connect payment processing ✅
- Admin Dashboard (12 sections) ✅
- Shared Fields System (23 → 106 mappings) ✅
- Complete testing framework (Jest, Playwright, Percy) ✅
- Help Centre with Jira Service Desk integration ✅
- Referral system with multi-tier infrastructure ✅
- Page-based onboarding (zero data loss) ✅

### **⚡ In Progress**
- Agent/Org CaaS implementation (5% remaining)
- Final mobile responsiveness polish
- Performance optimization
- Beta testing preparation

### **🎯 Next Implementation Priority**
**Beta Launch Preparation** - Final 5% to production-ready:
- Complete Agent/Org CaaS scoring
- Mobile responsiveness final polish
- Performance optimization and caching
- Production environment hardening
- Beta testing with early users

---

## 🤝 **AI Assistant Guidelines**

### **Autonomous Development**
- **Use PLATFORM-SPECIFICATION.md** as primary reference for all architectural decisions
- **Follow established patterns** (HubComplexModal, UnifiedSelect, Shared Fields)
- **Maintain consistency** with existing architecture and conventions
- **Update documentation** when making significant changes
- **Check actual codebase** when documentation may be outdated

### **Decision Making Framework**
1. **Check PLATFORM-SPECIFICATION.md** for platform architecture and requirements
2. **Review feature docs** in `docs/feature/` for specific implementations
3. **Check codebase** for current patterns (don't assume from old docs)
4. **Apply best practices** for Next.js 15, TypeScript 5.x, Supabase
5. **Add appropriate tests** for new functionality

### **Communication Style**
- **Be concise** and direct in responses
- **Focus on solutions** rather than extensive explanations
- **Provide code examples** when implementing features
- **Reference specific files** with line numbers when relevant
- **Update todos** to track progress on complex tasks

---

## 📚 **Key Documentation References**

### **Primary References** (Always Up-to-Date)
- `.ai/PLATFORM-SPECIFICATION.md` - Complete platform specification (Updated 2026-01-14)
- `README.md` - Project overview and quick start (Updated 2026-01-13)
- Actual codebase - Source of truth for current implementations

### **Feature Documentation** (Generally Accurate)
- `docs/feature/help-centre/IMPLEMENTATION-COMPLETE.md` (Dec 2025)
- `docs/feature/referrals/IMPLEMENTATION-COMPLETE.md`
- `docs/feature/network/NETWORK-V4.6-ENHANCEMENTS.md`

### **Development Standards**
- `cas/docs/proven-patterns.md` - Copy-paste implementation patterns
- `cas/docs/cas-design-system.md` - Core components
- `docs/design/DESIGN-SYSTEM.md` - TutorWise-specific UI patterns

### **To Be Created** (See todos)
- `.ai/ADMIN-DASHBOARD.md` - 12 admin sections documentation
- `.ai/SHARED-FIELDS.md` - Shared fields system architecture
- `.ai/ONBOARDING.md` - Page-based onboarding documentation
- `.ai/PATTERNS.md` (updated) - HubComplexModal, UnifiedSelect patterns

---

*This context file enables autonomous AI development with full project understanding.*
*Keep updated as project evolves and new patterns emerge.*
*Last major update: 2026-01-14 (Platform at 95% completion, beta Feb 1, 2026)*
