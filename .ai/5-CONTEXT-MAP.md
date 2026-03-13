# Tutorwise Context Map

**Document Version**: 3.0
**Last Updated**: 2026-03-11
**Purpose**: Maps how all context files interconnect to enable autonomous AI development

---

## AI Context System Overview

This document maps the complete AI context engineering system for Tutorwise, showing how all files work together to enable autonomous development.

### Context File Structure

```
.ai/
├── 0-TUTORWISE.md               # Project overview & index
├── 1-ROADMAP.md                  # Development roadmap & completion status
├── 2-PLATFORM-SPECIFICATION.md   # Complete technical + strategic specification
├── 3-SYSTEM-NAVIGATION.md        # Complete codebase navigation & user flows
├── 4-PATTERNS.md                 # Code patterns & conventions
├── 5-CONTEXT-MAP.md              # This file - how everything connects
├── 6-DESIGN-SYSTEM.md            # UI/UX component library & design tokens
├── 7-PROMPT.md                   # Universal AI context & development guidelines
├── 8-USER-JOURNEY-MAP.md         # User journey maps across roles
├── 9-UPDATE-PACKAGES.md          # Package update procedures
├── 10-SHARED-FIELDS.md           # Shared Fields System (23 fields, 106 mappings)
├── 11-QUICK-START.md             # Quick start guide
└── 12-DEVELOPER-SETUP.md         # Developer setup instructions
```

### Conductor & Operations Context Files

```
conductor/
├── conductor-solution-design.md         # Conductor solution design v4.2 (primary reference)
├── process-execution-solution-design.md # Process Execution Engine design v3.2
├── workflow-solution-design.md          # Workflow system design
├── process-discovery-solution-design.md # Process discovery design
├── content-factory-solution-design.md   # Content factory design
├── AI-Digital-Workforce-Blueprint.md    # Internal blueprint (NOT for external use)
├── conductor-gdpr-retention-policy.md   # GDPR retention policies
├── conductor-v3-audit.md               # v3 audit results
├── mcp-solution-design.md              # MCP integration design
├── lexi-enhancement-proposal.md        # Lexi bot enhancement proposal
└── *-intelligence-spec.md              # 14 intelligence domain specs

ipom/
└── process-execution-solution-design.md # Process execution design (folder renamed from fuchsia/)
```

---

## How Context Files Interconnect

### 1. PROMPT.md -> Universal AI Context (Entry Point)
**Priority**: P0 - Read First
**Last Updated**: 2026-01-14

**Purpose**: Primary AI context file providing project overview, development guidelines, and context retrieval protocol

**Contains**:
- Current project status
- Tech stack (Next.js 16, TypeScript 5.x, Supabase)
- Context retrieval protocol (what to read when)
- Development workflows
- AI behavior guidelines

**Used For**:
- Understanding project scope and current state
- Knowing which specialized files to reference
- Development workflow and preferences
- Tech stack decisions

**Connects To**:
- **PLATFORM-SPECIFICATION.md** (primary reference for implementation)
- **SYSTEM-NAVIGATION.md** (find where code lives)
- **ROADMAP.md** (current priorities)
- **PATTERNS.md** (code conventions)
- **conductor-solution-design.md** (Conductor architecture)

**When to Read**: Always first - provides navigation to all other context

---

### 2. SYSTEM-NAVIGATION.md -> Complete Codebase Navigation & User Flows
**Priority**: P0 - Essential for Navigation
**Last Updated**: 2026-01-14

**Purpose**: Complete navigation map for developers and stakeholders to understand where everything lives and how users flow through the platform

**Contains**:
- Quick start guide for new developers
- Documentation map (where to find what)
- Feature -> File location map
- User journey flows (Tutor, Client, Agent)
- Complete codebase structure
- "I Want To..." quick reference guide

**Used For**:
- Finding where specific features are implemented
- Understanding user flows through the platform
- Locating components, services, API routes
- Understanding how features interconnect

**Connects To**:
- **PLATFORM-SPECIFICATION.md** (what features do)
- **PATTERNS.md** (how code is structured)
- **ROADMAP.md** (what's implemented)
- **DESIGN-SYSTEM.md** (UI components)
- **conductor-solution-design.md** (Conductor navigation)

**When to Read**: When you need to find code, understand user flows, or navigate the codebase

---

### 3. PLATFORM-SPECIFICATION.md -> Complete Technical Reference
**Priority**: P0 - Reference for Implementation
**Last Updated**: 2026-01-14

**Purpose**: Comprehensive technical and strategic specification covering all platform systems

**Contains** (20 sections):
1. Executive Summary & Vision
2. Platform Overview
3. Tech Stack Architecture
4. Database Architecture
5. Authentication & Authorization
6. User Roles & Permissions
7. Core Features (Marketplace, Booking, Payments)
8. Admin Dashboard (12 sections)
9. Forms & Onboarding
10. Referral System
11. Reviews & Ratings
12. Help Centre
13. SEO & Sitemap
14. Testing Strategy
15. Deployment & Infrastructure
16. Security & Compliance
17. Performance Optimization
18. Development Workflow
19. Future Roadmap
20. Appendix (API Endpoints, Database Tables)

**Used For**:
- Understanding complete system architecture
- Implementation details for any feature
- Database schema reference
- API endpoint specifications
- Security policies and RLS

**Connects To**:
- **SYSTEM-NAVIGATION.md** (where features are implemented)
- **PATTERNS.md** (implementation patterns for features)
- **ROADMAP.md** (what's complete vs in-progress)
- **SHARED-FIELDS.md** (forms architecture details)
- **DESIGN-SYSTEM.md** (UI component specifications)
- **conductor-solution-design.md** (Conductor/Operations architecture)

**When to Read**: When implementing features, understanding architecture, or needing technical details

---

### 4. ROADMAP.md -> Development Status & Timeline
**Priority**: P1 - Check for Priorities
**Last Updated**: 2026-01-14

**Purpose**: Current development status, completed features, in-progress work, and future plans

**Used For**:
- Understanding what's complete vs in-progress
- Prioritizing new work
- Checking dependencies before starting features
- Understanding project timeline

**Connects To**:
- **PROMPT.md** (current status summary)
- **SYSTEM-NAVIGATION.md** (where features are located)
- **PLATFORM-SPECIFICATION.md** (feature details)
- **PATTERNS.md** (implementation approach)
- **conductor-solution-design.md** (Conductor phases)

**When to Read**: When planning work, checking feature status, or understanding priorities

---

### 5. PATTERNS.md -> Code Conventions & Patterns
**Priority**: P1 - Read for Implementation
**Last Updated**: 2026-01-14

**Purpose**: Code patterns, component structures, and conventions used throughout the codebase

**Contains** (14 pattern categories):
1. HubComplexModal Pattern (Admin detail modals)
2. UnifiedSelect/UnifiedMultiSelect Pattern (Form components)
3. Shared Fields System Pattern (23 -> 106 -> 9 architecture)
4. Service Role Client Pattern (Admin operations)
5. Server Component Pattern
6. API Route Pattern
7. Form Handling Pattern
8. Database Query Pattern
9. Authentication Pattern
10. Error Handling Pattern
11. File Upload Pattern
12. Pagination Pattern
13. Search/Filter Pattern
14. Real-time Pattern (Supabase Realtime)

**Used For**:
- Writing consistent code
- Following established conventions
- Understanding component structures
- Implementing common functionality

**Connects To**:
- **PLATFORM-SPECIFICATION.md** (technical constraints)
- **SYSTEM-NAVIGATION.md** (file locations)
- **DESIGN-SYSTEM.md** (UI component patterns)
- **SHARED-FIELDS.md** (form field patterns)

**When to Read**: When writing new code, creating components, or implementing features

---

### 6. DESIGN-SYSTEM.md -> UI/UX Component Library & Design Tokens
**Priority**: P1 - Essential for UI Development
**Last Updated**: 2026-01-14

**Purpose**: Complete UI/UX design system with component library, design tokens, and implementation guidelines

**Contains**:
- Design tokens (colors, typography, spacing)
- Component library
- Grid systems and layouts
- Responsive design patterns
- Accessibility guidelines
- Animation and transitions

**Used For**:
- Building consistent UI components
- Implementing design system
- Understanding visual design standards
- Ensuring accessibility compliance

**Connects To**:
- **SYSTEM-NAVIGATION.md** (component file locations)
- **PATTERNS.md** (component code patterns)
- **PLATFORM-SPECIFICATION.md** (UI requirements)

**When to Read**: When building UI components, implementing designs, or ensuring visual consistency

---

### 7. CONTEXT-MAP.md -> This File
**Priority**: P2 - Read for Understanding
**Last Updated**: 2026-03-11

**Purpose**: Maps how all context files interconnect and guides AI decision-making

**Contains**:
- Context file relationships
- Conductor & Operations architecture overview
- AI decision-making framework
- Key codebase directories and paths
- When to read which files

**Connects To**: All other context files

**When to Read**: When understanding the context system or needing guidance on which file to read

---

### 8. SHARED-FIELDS.md -> Shared Fields System Deep Dive
**Priority**: P1 - Essential for Forms Development
**Last Updated**: 2026-01-14

**Purpose**: Complete shared fields architecture (23 global fields -> 106 context mappings -> 9 form contexts)

**Used For**:
- Building forms with shared fields
- Understanding field configuration
- Implementing UnifiedSelect components
- Admin field management

**Connects To**:
- **SYSTEM-NAVIGATION.md** (shared fields file locations)
- **PATTERNS.md** (UnifiedSelect pattern, Shared Fields pattern)
- **PLATFORM-SPECIFICATION.md** (forms architecture)

**When to Read**: When working with forms, field configuration, or onboarding

---

### 9. Conductor Solution Design (v4.2) -> Conductor Architecture
**File**: `conductor/conductor-solution-design.md`
**Priority**: P0 - Essential for Conductor/Operations Development
**Last Updated**: 2026-03-11

**Purpose**: Complete Conductor architecture — the admin control plane for agents, teams, spaces, workflows, and intelligence

**Contains**:
- Conductor tab structure (11 tabs, 4 stages)
- Agent, Team, Space hierarchy
- Specialist agent runner and ReAct loop
- TeamRuntime (LangGraph StateGraph + PostgresSaver)
- Process Execution Engine
- Intelligence Layer (14 domains)
- Process Mining and Conformance
- Knowledge Base and RAG
- Agent Episodic Memory
- HITL (Human-in-the-Loop) patterns

**Conductor Tab Structure** (4 stages, 11 tabs):
```
Design:   workflows, discovery
Build:    build, agents, teams, spaces, knowledge
Execute:  execution
Observe:  monitoring, intelligence, mining
```

**Used For**:
- Understanding Conductor architecture and phases
- Implementing agent/team/space features
- Building intelligence domain integrations
- Process execution and workflow automation

**Connects To**:
- **PLATFORM-SPECIFICATION.md** (platform integration)
- **SYSTEM-NAVIGATION.md** (file locations)
- **process-execution-solution-design.md** (execution engine details)
- **Intelligence spec files** (14 domain-specific specs in `conductor/`)

**When to Read**: When working on Conductor, agents, teams, workflows, intelligence, or operations

---

### 10. Process Execution Solution Design -> Execution Engine
**File**: `conductor/process-execution-solution-design.md` (also `ipom/process-execution-solution-design.md`)
**Priority**: P1 - Essential for Process Execution
**Last Updated**: 2026-03-03

**Purpose**: Process Execution Engine design (v3.2) — runtime for workflow execution with shadow/live modes

**Contains**:
- PlatformWorkflowRuntime architecture
- LangGraph checkpointer (PostgresSaver)
- Execution modes: design, shadow, live
- Webhook integration (Supabase DB webhooks)
- Stripe webhook resume flow
- Shadow monitoring and go-live checklist

**Used For**:
- Understanding process execution
- Shadow vs live mode mechanics
- Webhook-driven workflow triggers

**Connects To**:
- **conductor-solution-design.md** (parent architecture)
- **PLATFORM-SPECIFICATION.md** (platform integration)

**When to Read**: When working on workflow execution, shadow mode, or process automation

---

## Conductor & Operations Architecture

### Conductor Overview

The **Conductor** is the admin control plane at `/admin/conductor`. It replaces the legacy CAS (Conversational Agent SDK) framework and manages the platform's digital workforce.

**Key Terminology**:
- **Agent**: Single specialist agent (stored in `specialist_agents` table)
- **Team**: Multi-agent group (stored in `agent_teams` table) — 3 patterns: Supervisor, Pipeline, Swarm
- **Space**: Program/domain container (stored in `agent_spaces` table) — 4 built-in: go-to-market, engineering, operations, analytics
- **Workflow**: Process definition and execution
- **Conductor**: The admin control plane UI and APIs

**Hierarchy**: Space > Team > Agent (multi-tenant ready with RLS + `created_by`)

### Key Conductor Directories

```
apps/web/src/lib/
├── agent-studio/                  # Agent execution & memory
│   ├── SpecialistAgentRunner.ts   # ReAct loop, tool calls, agent_run_outputs
│   ├── AgentMemoryService.ts      # Episodic memory + fact extraction (vector 768-dim)
│   └── tools/
│       ├── executor.ts            # 24+ analyst tools (14 intelligence + 10 built-in)
│       ├── definitions.ts         # Tool schema definitions
│       └── types.ts               # Tool type definitions
├── conductor/                     # Conductor services
│   └── IntentDetector.ts          # ExecutionCommandBar intent classification
├── platform/                      # Platform context services
│   ├── user-context.ts            # PlatformUserContext (enriched with scores, signals)
│   ├── context-cache.ts           # Redis cache for context
│   └── agent-handoff.ts           # Cross-agent handoff
├── workflow/
│   └── team-runtime/
│       └── TeamRuntime.ts         # LangGraph StateGraph + PostgresSaver (Phase 6A)
├── process-studio/                # Process execution engine
│   ├── runtime/                   # PlatformWorkflowRuntime
│   └── conformance/               # ConformanceChecker
└── growth-agent/                  # Growth Agent (role-adaptive AI advisor) [planned]
```

### Conductor API Routes

```
/api/admin/
├── agents/                        # Agent CRUD, run, chat
├── teams/                         # Team CRUD, run, HITL resume
├── tools/                         # Analyst tools registry
├── conductor/
│   ├── autonomy/                  # Autonomy calibration
│   ├── knowledge/                 # Knowledge base CRUD + RAG
│   └── workflows/[id]/
│       ├── analytics              # Process mining analytics
│       ├── conformance            # Conformance checking
│       ├── shadow                 # Shadow monitoring dashboard
│       └── promote                # Shadow -> live promotion
├── process-studio/
│   ├── execute/                   # Start, resume, task complete
│   └── processes/[id]/execution-mode  # Toggle design/shadow/live
├── network/intelligence           # Network intelligence
└── [domain]/intelligence          # 14 intelligence domain routes:
    # caas, resources, seo, signal, signal/marketplace,
    # listings, bookings, financials, virtualspace, referrals,
    # growth, ai-adoption, org-conversion, ai-studio
```

### Intelligence Pipeline (pg_cron schedule)

14 intelligence domains computed daily via pg_cron:
```
04:30 UTC  resources
04:45 UTC  article_intelligence_scores
05:00 UTC  seo
05:30 UTC  caas
06:00 UTC  marketplace
06:30 UTC  bookings
07:00 UTC  listings
07:30 UTC  financials
08:00 UTC  virtualspace
09:00 UTC  referrals
09:30 UTC  retention + growth_scores
10:00 UTC  ai_adoption
10:30 UTC  org_conversion
11:00 UTC  ai_studio
```

A scheduler has been implemented to replace pg_cron when ready.

### Agent Memory (Phase 7)

- **Tables**: `memory_episodes` (vector 768-dim HNSW) + `memory_facts` (subject/relation/object triples)
- **RPCs**: `match_memory_episodes()` + `match_memory_facts()`
- **Service**: `AgentMemoryService.ts` — `fetchMemoryBlock()`, `recordEpisode()`, `extractAndStoreFacts()`
- Integration: Injected as `PAST EXPERIENCE` section in agent runs; facts extracted post-run via `ai.generateJSON()`

### Legacy CAS

The `cas/` folder contains the original Conversational Agent SDK — now deprecated (soft-deprecated migration 385, hard delete eligible 2026-06-11). CAS functionality has been migrated to Conductor agents and teams. CAS tables (`cas_agent_status`, `cas_agent_events`, `cas_agent_logs`, etc.) remain for backward compatibility.

---

## AI Decision-Making Framework

### When Asked to Build a Feature:

```
1. Start with PROMPT.md
   | Understand current project status and context retrieval protocol

2. Check SYSTEM-NAVIGATION.md
   | Where are related features? What's the file structure?

3. Check ROADMAP.md
   | Is this feature complete? In-progress? Prioritized?

4. Review PLATFORM-SPECIFICATION.md
   | What are the technical requirements? Database schema? API endpoints?

5. Apply PATTERNS.md
   | What patterns should be used? Component structure? Conventions?

6. Check Conductor context if applicable
   | conductor-solution-design.md for agents, teams, workflows, intelligence

7. Check specialized docs if applicable
   | SHARED-FIELDS.md, intelligence specs, process execution design

8. Implement autonomously with full context
```

### Example Decision Flows

#### Example 1: "Add a new intelligence domain"

```
PROMPT.md -> Understand Conductor architecture, AI service setup
conductor-solution-design.md -> Review intelligence layer, 14 existing domains
SYSTEM-NAVIGATION.md -> Find intelligence API routes, intelligence specs
PATTERNS.md -> Follow API route pattern, React Query pattern
conductor/*-intelligence-spec.md -> Reference existing spec format
Result -> Create spec, migration, pg_cron job, API route, IntelligencePanel sub-tab
```

#### Example 2: "Add a new specialist agent"

```
PROMPT.md -> Understand agent architecture
conductor-solution-design.md -> Review Agent/Team/Space hierarchy
SYSTEM-NAVIGATION.md -> Find SpecialistAgentRunner, agent API routes
PATTERNS.md -> Follow agent configuration pattern
Result -> Seed agent in migration, add tools, configure schedule
```

#### Example 3: "Add a new admin hub section"

```
PROMPT.md -> Platform uses HubComplexModal pattern for admin
PLATFORM-SPECIFICATION.md -> Review admin dashboard architecture, database schema
PATTERNS.md -> Apply HubComplexModal pattern, follow conventions
Result -> Autonomous implementation following established patterns
```

#### Example 4: "Add a new form field to onboarding"

```
PROMPT.md -> Onboarding uses page-based approach with Shared Fields
PLATFORM-SPECIFICATION.md -> Review forms architecture, Shared Fields tables
PATTERNS.md -> Apply UnifiedSelect pattern, Shared Fields integration
SHARED-FIELDS.md -> Check 23 -> 106 -> 9 architecture, field customization
Result -> Add field using Shared Fields system, update form_config
```

---

## Codebase Structure Context

### Key Directories

```
tutorwise/
├── apps/
│   └── web/                         # Next.js 16 application
│       ├── src/
│       │   ├── app/                 # App Router pages
│       │   │   ├── (admin)/         # Admin routes (12 sections + Conductor)
│       │   │   │   └── admin/
│       │   │   │       └── conductor/  # Conductor UI (11 tabs, 4 stages)
│       │   │   ├── (auth)/          # Auth routes
│       │   │   ├── (dashboard)/     # User dashboards (4 roles)
│       │   │   ├── api/             # API routes
│       │   │   │   ├── admin/       # Admin APIs (agents, teams, tools, conductor, etc.)
│       │   │   │   ├── cron/        # Cron job endpoints
│       │   │   │   └── webhooks/    # Webhook handlers (process-studio, Stripe)
│       │   │   └── components/      # Page-specific components
│       │   ├── components/          # Shared components
│       │   │   ├── admin/           # Admin-specific (HubComplexModal, Conductor panels)
│       │   │   ├── auth/            # Auth components
│       │   │   ├── feature/         # Feature-specific
│       │   │   └── ui/              # UI primitives
│       │   ├── lib/                 # Utilities and services
│       │   │   ├── ai/             # Shared AI service (6-tier fallback chain)
│       │   │   ├── agent-studio/   # Agent execution, memory, tools
│       │   │   ├── conductor/      # Conductor services (IntentDetector)
│       │   │   ├── platform/       # Platform context, cache, handoff
│       │   │   ├── process-studio/ # Process execution engine + conformance
│       │   │   ├── workflow/       # Team runtime (LangGraph)
│       │   │   ├── api/            # API client functions
│       │   │   ├── hooks/          # Custom React hooks
│       │   │   └── utils/          # Utility functions
│       │   └── utils/
│       │       └── supabase/       # Server & client setup
│       └── public/                 # Static assets
├── sage/                           # AI tutor package
├── lexi/                           # Help bot package
├── cas/                            # Legacy CAS SDK (deprecated — migrated to Conductor)
├── conductor/                      # Solution designs & intelligence specs
│   ├── conductor-solution-design.md   # v4.2 — primary Conductor reference
│   ├── process-execution-solution-design.md
│   └── *-intelligence-spec.md         # 14 intelligence domain specs
├── ipom/                           # Process execution design (renamed from fuchsia/)
├── tools/
│   └── database/
│       └── migrations/             # 400+ Supabase migrations (latest ~401)
├── docs/                           # Documentation (non-AI)
│   ├── feature/                    # Feature implementation docs
│   ├── help-centre/                # User documentation
│   ├── testing/                    # Testing documentation
│   ├── integration/                # Integration guides
│   └── database/                   # Database documentation
└── .ai/                            # AI context files (this folder)
```

### Pattern Recognition

When implementing features, AI analyzes:

```javascript
// Component Naming
AdminSidebar.tsx          // Context + component type
HubComplexModal.tsx       // Pattern name
UnifiedSelect.tsx         // Feature + component type
IntelligencePanel.tsx     // Conductor panel component
MiningPanel.tsx           // Conductor mining panel

// API Routes
/api/admin/accounts/[id]/route.ts    // RESTful naming
/api/admin/agents/route.ts           // Conductor agent routes
/api/admin/conductor/workflows/[id]/analytics  // Conductor analytics

// Database Tables
specialist_agents          // Conductor agents
agent_teams                // Conductor teams
agent_spaces               // Conductor spaces
workflow_executions         // Process execution tracking
memory_episodes             // Agent episodic memory
memory_facts                // Agent fact extraction
platform_knowledge_chunks   // RAG knowledge base

// Key Conventions
// Icons: lucide-react (NOT emoji)
// DB columns: delivery_mode (array), work_location (text), listing_type (varchar)
// Embedding: gemini-embedding-001 with outputDimensionality: 768
// Auth: is_admin() function for RLS policies
```

---

## Context Update Cycle

### When to Update Context Files

| File | Update Trigger | Frequency |
|------|---------------|-----------|
| **PROMPT.md** | Project status change, tech stack change | Monthly or on major milestones |
| **PLATFORM-SPECIFICATION.md** | Architecture change, new major feature | After significant feature completion |
| **ROADMAP.md** | Feature completion, priority shift | Weekly during active development |
| **PATTERNS.md** | New pattern introduced, pattern refinement | When new patterns are established |
| **CONTEXT-MAP.md** | New context file added, structure change | When context system evolves |
| **conductor-solution-design.md** | Conductor phase completion | After each Conductor phase |
| **Specialized docs** | Related system changes | After related feature completion |

### Context Validation Checklist

Before considering context complete:
- [ ] All tech stack references accurate (Next.js 16, TypeScript 5.x, Supabase)
- [ ] No outdated technology references
- [ ] Conductor architecture current (check phase status)
- [ ] Migration numbers accurate (currently 400+)
- [ ] Cross-references between files accurate
- [ ] Intelligence domains up to date (currently 14)
- [ ] Agent/Team/Space hierarchy documented
- [ ] Last updated dates current
- [ ] Examples reflect actual codebase patterns

---

## Context Coverage Assessment

### Current State (March 2026)

| Context Area | Coverage | Quality | File |
|--------------|----------|---------|------|
| Project Overview | Complete | High | PROMPT.md |
| Technical Specification | Complete | High | PLATFORM-SPECIFICATION.md |
| Development Roadmap | Complete | High | ROADMAP.md |
| Code Patterns | Complete | High | PATTERNS.md |
| Context Mapping | Complete | High | CONTEXT-MAP.md (this file) |
| Conductor Architecture | Complete | High | conductor-solution-design.md v4.2 |
| Process Execution | Complete | High | process-execution-solution-design.md |
| Intelligence Specs | Complete | High | conductor/*-intelligence-spec.md (14) |
| Design System | Complete | High | DESIGN-SYSTEM.md |
| Shared Fields System | Complete | High | SHARED-FIELDS.md |
| User Journey Map | Complete | High | USER-JOURNEY-MAP.md |

---

## Best Practices for Using This Context System

### For AI Development

1. **Always start with PROMPT.md** - Understand current project state and context retrieval protocol
2. **Check ROADMAP.md** - Verify feature status and priorities before implementing
3. **Reference PLATFORM-SPECIFICATION.md** - Get complete technical details
4. **Apply PATTERNS.md** - Ensure code consistency and follow established conventions
5. **Check conductor-solution-design.md** - When working on agents, teams, workflows, or intelligence
6. **Use specialized docs** - Intelligence specs, process execution design, SHARED-FIELDS.md
7. **Validate context** - If something seems outdated, check code directly
8. **Update context** - After implementing major features or patterns

### For Human Developers

1. **Read context files** - Before starting new features or making architectural changes
2. **Follow patterns** - Maintain consistency with established conventions
3. **Update documentation** - When introducing new patterns or completing features
4. **Keep roadmap current** - Update priorities and completion status regularly
5. **Validate AI outputs** - Review generated code for correctness and consistency

---

*This context map ensures consistent, autonomous, and high-quality AI-assisted development for Tutorwise*

**Last Updated**: 2026-03-11
**Next Review**: 2026-03-18
**Maintained By**: Platform Architecture Team
