# Conductor Enterprise SaaS — Solution Design

**Version:** 1.0
**Date:** 2026-03-12
**Status:** Design
**Author:** Michael Quan, Tutorwise

---

## 1. Executive Summary

Conductor is the AI agent orchestration control plane built inside Tutorwise. It has reached production maturity (Phases 0–9 complete) with capabilities that map directly to the enterprise AI orchestration gap identified in the investor thesis: agent registry, team coordination (3 patterns), shadow-before-live deployment, conformance checking, episodic memory, MCP integration, and 15 intelligence domains.

This document designs the extraction of Conductor into a standalone, multi-tenant enterprise SaaS product — **Conductor Cloud** — while preserving Tutorwise as Tenant #1 (dogfooding).

### 1.1 Strategic Thesis

The founding insight remains unchanged: **AI agents are to business automation what containers are to software delivery.** The enterprise market needs a control plane, not more models. Conductor is that control plane, currently proven on a live marketplace with real workflows.

The spin-off thesis: **Conductor's value as a horizontal platform exceeds its value as a Tutorwise feature.** The same orchestration patterns that run tutor approval and commission payouts can run any enterprise's agent fleet — HR onboarding, incident response, procurement, compliance review.

### 1.2 Product Positioning

```
┌─────────────────────────────────────────────────────────────────┐
│                    Conductor Cloud                               │
│                                                                  │
│  "The Kubernetes for AI Agents"                                  │
│                                                                  │
│  Enterprise AI orchestration platform with:                      │
│  - Agent Registry (define, version, catalogue)                   │
│  - Team Patterns (supervisor, pipeline, swarm)                   │
│  - Shadow → Live Promotion (safe deployment)                     │
│  - MCP Connectors (plug into any data source)                    │
│  - Intelligence Pipeline (automated operational insight)         │
│  - Process Mining (conformance, bottleneck detection)            │
│  - HITL Controls (human approval gates)                          │
│  - Episodic Memory (agents learn from past runs)                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Competitive Landscape

| Competitor | What They Do | What They Lack |
|---|---|---|
| **Temporal** | Durable workflow execution | No AI-native concepts, no agent registry, no shadow mode |
| **LangGraph Cloud** | LangGraph hosting | No multi-tenant control plane, no intelligence pipeline, no conformance |
| **CrewAI** | Multi-agent framework | No shadow/live, no process mining, no MCP, no enterprise isolation |
| **Microsoft Copilot Studio** | Low-code agent builder | Vendor-locked, no container-engineering mental model, no self-hosted option |
| **n8n / Make** | Visual workflow automation | Not agent-native, no team patterns, no autonomy calibration |

**Conductor's moat:** Production-proven shadow-before-live model + container engineering vocabulary that resonates with platform teams + MCP-based extensibility.

---

## 2. Architecture Overview

### 2.1 Current State (Tutorwise-Embedded)

```
┌──────────────────────────────────────────────────┐
│  Tutorwise Next.js App                           │
│  ├── /admin/conductor  (UI)                      │
│  ├── /api/admin/*      (API routes)              │
│  ├── lib/agent-studio/ (SpecialistAgentRunner)   │
│  ├── lib/workflow/     (TeamRuntime, PlatformWF)  │
│  ├── lib/mcp/          (MCPClientManager)         │
│  ├── lib/conductor/    (IntentDetector, etc.)     │
│  └── lib/ai/           (6-tier AI service)        │
│                                                   │
│  Supabase PostgreSQL (shared DB, single tenant)   │
└──────────────────────────────────────────────────┘
```

### 2.2 Target State (Conductor Cloud)

```
┌──────────────────────────────────────────────────────────┐
│                   Conductor Cloud                         │
│                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  Web App     │  │  API Gateway  │  │  Worker Fleet  │  │
│  │  (Next.js)   │  │  (REST + WS)  │  │  (Execution)   │  │
│  └──────┬───────┘  └──────┬───────┘  └───────┬────────┘  │
│         │                 │                   │           │
│  ┌──────┴─────────────────┴───────────────────┴────────┐ │
│  │              Core Orchestration Engine                │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │ │
│  │  │ Agent    │ │ Team     │ │ Workflow  │ │ MCP    │ │ │
│  │  │ Registry │ │ Runtime  │ │ Runtime   │ │ Router │ │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────┘ │ │
│  └─────────────────────────────────────────────────────┘ │
│                          │                                │
│  ┌───────────────────────┴─────────────────────────────┐ │
│  │              Multi-Tenant Data Layer                  │ │
│  │  PostgreSQL + pgvector (tenant_id on every table)    │ │
│  │  RLS policies scoped to authenticated tenant          │ │
│  └──────────────────────────────────────────────────────┘ │
│                          │                                │
│  ┌───────────────────────┴─────────────────────────────┐ │
│  │              Connector Layer (MCP + API)              │ │
│  │  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐ │ │
│  │  │ Tenant's │ │ Hosted   │ │ Built  │ │Community │ │ │
│  │  │ MCP Svr  │ │ SQL Conn │ │ -in    │ │ MCP Svrs │ │ │
│  │  └──────────┘ └──────────┘ └────────┘ └──────────┘ │ │
│  └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘

         ▲                    ▲                    ▲
         │                    │                    │
    ┌────┴─────┐     ┌───────┴────────┐    ┌─────┴──────┐
    │ Tenant 1 │     │ Tenant 2       │    │ Tutorwise  │
    │ (Acme)   │     │ (HealthCorp)   │    │ (Tenant 0) │
    │          │     │                │    │ Dogfood    │
    │ MCP:Jira │     │ MCP:ServiceNow │    │ 15 built-in│
    │ MCP:HRIS │     │ MCP:Epic       │    │ tools      │
    └──────────┘     └────────────────┘    └────────────┘
```

---

## 3. Multi-Tenancy

### 3.1 Data Isolation Strategy

**Approach: Shared database, tenant-scoped RLS** (same pattern as Supabase's own multi-tenancy model).

Rationale:
- DB-per-tenant is operationally expensive and makes cross-tenant analytics (for us) impossible
- Schema-per-tenant adds migration complexity without meaningful security benefit over RLS
- Shared DB + RLS is proven at scale (Supabase, Neon, every major SaaS)
- pgvector indexes are shared — acceptable since vector search is always tenant-filtered

### 3.2 Tenant Model

```sql
CREATE TABLE tenants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text NOT NULL UNIQUE,  -- URL-safe identifier
  plan          text NOT NULL DEFAULT 'starter',  -- starter | team | enterprise
  status        text NOT NULL DEFAULT 'active',   -- active | suspended | cancelled

  -- AI Provider Configuration
  ai_config     jsonb NOT NULL DEFAULT '{}',  -- provider keys, model preferences, fallback chain

  -- Limits
  max_agents         int NOT NULL DEFAULT 10,
  max_teams          int NOT NULL DEFAULT 3,
  max_spaces         int NOT NULL DEFAULT 2,
  max_runs_per_month int NOT NULL DEFAULT 1000,
  max_mcp_connections int NOT NULL DEFAULT 5,

  -- Branding (enterprise plan)
  branding      jsonb DEFAULT NULL,  -- logo_url, accent_color, company_name

  -- Billing
  stripe_customer_id    text,
  stripe_subscription_id text,

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Every user belongs to a tenant
CREATE TABLE tenant_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'operator',  -- owner | admin | operator | viewer
  invited_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);
```

### 3.3 Tenant-Scoping Existing Tables

Every Conductor table gains a `tenant_id` column:

| Table | Current Scope | Change |
|---|---|---|
| `specialist_agents` | Global (`built_in` flag) | Add `tenant_id` (NULL for built-in templates) |
| `agent_teams` | Global | Add `tenant_id NOT NULL` |
| `agent_spaces` | `created_by` user | Replace with `tenant_id NOT NULL` |
| `agent_run_outputs` | Global | Add `tenant_id NOT NULL` |
| `agent_team_run_outputs` | Global | Add `tenant_id NOT NULL` |
| `workflow_processes` | Global | Add `tenant_id NOT NULL` |
| `workflow_executions` | Global | Add `tenant_id NOT NULL` |
| `workflow_tasks` | Via execution | Add `tenant_id NOT NULL` (denormalised for RLS perf) |
| `workflow_exceptions` | Global | Add `tenant_id NOT NULL` |
| `analyst_tools` | Global (`built_in` flag) | Add `tenant_id` (NULL for built-in) |
| `platform_knowledge_chunks` | Global | Add `tenant_id NOT NULL` |
| `memory_episodes` | Via agent_slug | Add `tenant_id NOT NULL` |
| `memory_facts` | Via agent_slug | Add `tenant_id NOT NULL` |
| `mcp_connections` | Global | Add `tenant_id NOT NULL` |
| `mcp_tool_catalog` | Via connection | Add `tenant_id NOT NULL` |
| `mcp_tool_executions` | Via tool | Add `tenant_id NOT NULL` |
| `decision_outcomes` | Via execution | Add `tenant_id NOT NULL` |
| `process_autonomy_config` | Global | Add `tenant_id NOT NULL` |
| `conformance_deviations` | Via execution | Add `tenant_id NOT NULL` |
| `process_patterns` | Via process | Add `tenant_id NOT NULL` |
| `platform_notifications` | Global | Add `tenant_id NOT NULL` |

### 3.4 RLS Policy Pattern

```sql
-- Helper function: get current user's tenant
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS uuid AS $$
  SELECT tenant_id FROM tenant_members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: check role within tenant
CREATE OR REPLACE FUNCTION has_tenant_role(required_role text) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_members
    WHERE user_id = auth.uid()
    AND tenant_id = current_tenant_id()
    AND role = ANY(
      CASE required_role
        WHEN 'viewer'   THEN ARRAY['viewer','operator','admin','owner']
        WHEN 'operator' THEN ARRAY['operator','admin','owner']
        WHEN 'admin'    THEN ARRAY['admin','owner']
        WHEN 'owner'    THEN ARRAY['owner']
      END
    )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Example: specialist_agents RLS
ALTER TABLE specialist_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON specialist_agents
  USING (
    tenant_id = current_tenant_id()
    OR tenant_id IS NULL  -- built-in templates visible to all
  );

CREATE POLICY tenant_write ON specialist_agents
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_tenant_role('operator')
  );
```

### 3.5 Tenant Provisioning Flow

```
1. User signs up → Supabase auth creates user
2. POST /api/tenants/provision
   → Create tenants row (slug from company name)
   → Create tenant_members row (role: owner)
   → Seed default spaces (operations, analytics)
   → Seed 3 starter agents (analyst, planner, monitor)
   → Create Stripe customer
3. User lands on Conductor dashboard — empty canvas, ready to build
```

---

## 4. Connector Framework — MCP + API Gateway

This is the critical abstraction that decouples Conductor from Tutorwise-specific data.

### 4.1 The Problem

Today, `executor.ts` contains 32 hardcoded tools that query Tutorwise's Supabase tables directly:

```typescript
// Current: tightly coupled to Tutorwise schema
query_booking_health: async (input) => {
  const svc = createServiceRoleClient();
  const { data } = await svc.from('bookings_platform_metrics_daily')...
  return data;
}
```

For Conductor Cloud, each tenant has their own data sources. We need a pluggable connector layer.

### 4.2 Three Connector Types

```
┌──────────────────────────────────────────────────────────────┐
│                    Tool Execution Router                      │
│                                                               │
│  executeTool(slug, input, tenantId)                           │
│    │                                                          │
│    ├── No ":" in slug → Built-in tool (TOOL_EXECUTORS)        │
│    │   └── Only available to Tutorwise tenant (Tenant 0)      │
│    │       OR tenant has opted into built-in tool set          │
│    │                                                          │
│    ├── "mcp:" prefix → MCP tool (existing MCPClientManager)   │
│    │   └── Resolve tenant's MCP connection → call remote tool │
│    │                                                          │
│    └── "api:" prefix → API Connector (new)                    │
│        └── Call tenant's registered API endpoint              │
│           with standard request/response contract              │
└──────────────────────────────────────────────────────────────┘
```

### 4.3 Connector Type 1: MCP Servers (Primary Path)

Already built (Phase 8). The existing MCP framework becomes the primary connector pattern for enterprise tenants:

```
Tenant registers MCP server URL + credentials
  → Conductor discovers tools via listTools()
  → Tools appear in agent's available tool list
  → Agent calls tools via MCPClientManager
  → Results flow back into ReAct loop
```

**What changes for multi-tenancy:**
- `mcp_connections.tenant_id` scopes connections per tenant
- `MCPClientManager` becomes tenant-aware (connection pool per tenant)
- Tool discovery runs per-tenant on sync
- Credential vault stores tenant secrets encrypted at rest

**MCP Server Marketplace (future):**
- Conductor publishes a catalogue of verified MCP servers (Jira, Salesforce, ServiceNow, Slack, etc.)
- One-click install: tenant provides credentials → auto-syncs tools
- Revenue: Conductor takes referral fee from MCP server vendors OR charges for hosted connectors

### 4.4 Connector Type 2: API Connectors (Simple Path)

For tenants who don't want to run an MCP server, we provide a simpler REST-based connector:

```sql
CREATE TABLE api_connectors (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id),
  slug          text NOT NULL,           -- e.g., 'bookings', 'hr-data'
  name          text NOT NULL,
  description   text,

  -- Endpoint
  base_url      text NOT NULL,           -- e.g., 'https://acme.com/api/conductor'
  auth_type     text NOT NULL DEFAULT 'bearer',  -- bearer | api_key | basic | oauth2
  auth_config   jsonb NOT NULL DEFAULT '{}',     -- encrypted credentials

  -- Schema
  request_schema  jsonb,                 -- JSON Schema for input
  response_schema jsonb,                 -- JSON Schema for output

  -- Health
  last_health_check timestamptz,
  health_status     text DEFAULT 'unknown',

  status        text NOT NULL DEFAULT 'active',
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);
```

**How it works:**

1. Tenant registers an API endpoint: `POST /connectors`
2. Conductor wraps it as a tool: `api:acme-bookings`
3. When an agent calls the tool, Conductor proxies the request:

```typescript
// Conductor sends:
POST https://acme.com/api/conductor/bookings
Authorization: Bearer <tenant_token>
Content-Type: application/json

{
  "tool": "query_bookings",
  "input": { "days": 30, "status": "completed" },
  "context": {
    "agent_slug": "operations-monitor",
    "team_slug": "ops-team",
    "run_id": "abc-123"
  }
}

// Tenant returns (standard contract):
{
  "success": true,
  "data": { ... },            // arbitrary JSON
  "metadata": {
    "source": "internal-api",
    "freshness": "2026-03-12T04:00:00Z"
  }
}
```

### 4.5 Connector Type 3: Hosted SQL Connector (Zero-Code Path)

For tenants who want intelligence without building APIs or MCP servers:

```
Tenant provides:
  - Database connection string (encrypted, stored in vault)
  - Schema mapping file (YAML/JSON)

Conductor generates:
  - Virtual MCP server (in-process, no separate deployment)
  - Tools derived from schema mapping
  - Auto-discovered metrics queries
```

**Schema Mapping Example:**

```yaml
# Tenant maps their tables to Conductor's standard domains
domain: bookings
source_table: appointments
columns:
  id: appointment_id
  status: booking_status
  created_at: created_date
  amount: price_cents          # Conductor normalises to decimal
  provider_id: therapist_id    # maps to "tutor" concept
  client_id: patient_id

status_mapping:
  completed: ["completed", "finished"]
  cancelled: ["cancelled", "no_show"]
  pending: ["scheduled", "confirmed"]

metrics:
  - name: completion_rate
    query: "SELECT COUNT(*) FILTER (WHERE booking_status IN ('completed','finished'))::float / NULLIF(COUNT(*),0) FROM appointments WHERE created_date > now() - interval '30 days'"
```

Conductor generates a virtual tool `sql:bookings:completion_rate` that agents can call.

**Security:**
- Read-only database user enforced
- Query allow-list (only pre-mapped queries execute)
- Connection via SSH tunnel or IP allowlist
- No raw SQL from agents — only pre-defined metrics queries

### 4.6 Tutorwise as Tenant #0

Tutorwise itself runs as the first tenant of Conductor Cloud:

```
Tenant #0: Tutorwise
  - Built-in tools: All 32 existing tools in executor.ts
  - MCP connections: Google Classroom, Jira/Confluence
  - Intelligence pipeline: 15 daily metrics tables + pg_cron
  - 11 specialist agents, 3 teams, 4 spaces
```

The existing `executor.ts` tools become a **built-in tool pack** that ships with Conductor as a reference implementation. Other tenants cannot use Tutorwise-specific tools but can see them as templates when building their own.

### 4.7 Intelligence Pipeline Abstraction

Today's intelligence pipeline (15 daily metrics tables + pg_cron functions) is Tutorwise-specific. For enterprise:

**Option A: Tenant-Owned Intelligence (recommended)**
- Tenant runs their own metrics compute (via their own cron/ETL)
- Results pushed to Conductor via API connector or MCP tool
- Conductor's IntelligencePanel renders whatever data the connector returns
- Standard response contract with `funnel`, `alerts`, `metrics` shape

**Option B: Hosted Intelligence (enterprise plan)**
- Tenant provides SQL connector (Type 3 above)
- Conductor runs nightly compute jobs against tenant's data
- Results stored in tenant-scoped `*_metrics_daily` tables
- Requires deep schema mapping — higher setup cost, higher value

**Phase 1: Option A only.** Option B is a premium feature for later.

---

## 5. Authentication & Access Control

### 5.1 Current State → Target State

| Aspect | Current (Tutorwise) | Target (Conductor Cloud) |
|---|---|---|
| Auth provider | Supabase Auth | Supabase Auth (keep) |
| Admin check | `profiles.is_admin` boolean | `tenant_members.role` (owner/admin/operator/viewer) |
| SSO | None | SAML/OIDC via WorkOS (enterprise plan) |
| API keys | None | Per-tenant API keys for programmatic access |
| MFA | Optional | Required for owner/admin roles (enterprise plan) |

### 5.2 Role-Based Access Control (RBAC)

```
┌──────────┬──────────────────────────────────────────────────────────┐
│ Role     │ Permissions                                              │
├──────────┼──────────────────────────────────────────────────────────┤
│ Owner    │ Everything + billing + delete tenant + transfer ownership│
│ Admin    │ CRUD agents/teams/spaces + manage members + connectors   │
│ Operator │ Run agents/teams + view results + manage workflows       │
│ Viewer   │ Read-only access to dashboards and run outputs           │
└──────────┴──────────────────────────────────────────────────────────┘
```

**Space-Level Permissions (enterprise plan):**
- Admin can restrict operator/viewer access to specific spaces
- E.g., "Sarah can operate agents in the HR space but not Finance"

```sql
CREATE TABLE space_permissions (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  space_id  uuid NOT NULL REFERENCES agent_spaces(id),
  user_id   uuid NOT NULL REFERENCES auth.users(id),
  role      text NOT NULL DEFAULT 'operator',  -- operator | viewer
  UNIQUE (space_id, user_id)
);
```

### 5.3 API Key Management

```sql
CREATE TABLE api_keys (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  name        text NOT NULL,
  key_hash    text NOT NULL,     -- bcrypt hash of the key
  key_prefix  text NOT NULL,     -- first 8 chars for identification
  scopes      text[] NOT NULL DEFAULT '{}',  -- 'agents:read', 'teams:execute', etc.
  last_used   timestamptz,
  expires_at  timestamptz,
  created_by  uuid NOT NULL REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

API keys authenticate via `Authorization: Bearer cnd_<key>` header. Middleware extracts `tenant_id` from key and sets it in request context.

### 5.4 SSO Integration (Enterprise Plan)

```
Enterprise tenant → configures SAML/OIDC in tenant settings
  → WorkOS handles IdP integration (Okta, Azure AD, Google Workspace)
  → User signs in via SSO → WorkOS callback → Supabase auth session
  → auto-provisioned into tenant_members with default role
```

WorkOS is preferred over building custom SAML because:
- Handles 40+ IdPs out of the box
- SCIM provisioning for user sync
- Audit-ready compliance (SOC 2 Type II)
- ~$500/mo for enterprise-grade SSO — well below build cost

---

## 6. Billing & Usage Metering

### 6.1 Pricing Tiers

| Feature | Starter (Free) | Team ($99/mo) | Enterprise (Custom) |
|---|---|---|---|
| Agents | 5 | 25 | Unlimited |
| Teams | 1 | 10 | Unlimited |
| Spaces | 1 | 5 | Unlimited |
| Agent runs/month | 100 | 5,000 | Custom |
| MCP connections | 2 | 10 | Unlimited |
| Team patterns | Supervisor only | All 3 | All 3 |
| Shadow mode | No | Yes | Yes |
| Episodic memory | No | Yes | Yes |
| HITL approval | No | Yes | Yes |
| Knowledge base | 100 chunks | 5,000 chunks | Unlimited |
| Process mining | No | Basic | Full |
| Intelligence pipeline | No | 5 domains | Unlimited |
| Members | 1 | 10 | Unlimited |
| SSO/SAML | No | No | Yes |
| Space-level RBAC | No | No | Yes |
| SLA | None | 99.5% | 99.9% + dedicated support |
| AI provider | Conductor-provided | Conductor or BYOK | BYOK required |

### 6.2 Usage Metering

```sql
CREATE TABLE usage_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id),
  event_type text NOT NULL,  -- 'agent_run' | 'team_run' | 'mcp_call' | 'knowledge_query' | 'ai_tokens'
  quantity   int NOT NULL DEFAULT 1,
  metadata   jsonb DEFAULT '{}',  -- agent_slug, model_used, token_count, etc.
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Materialised view for billing period aggregation
CREATE MATERIALIZED VIEW usage_summary AS
SELECT
  tenant_id,
  date_trunc('month', created_at) AS billing_month,
  event_type,
  SUM(quantity) AS total,
  COUNT(*) AS event_count
FROM usage_events
GROUP BY tenant_id, date_trunc('month', created_at), event_type;
```

### 6.3 Stripe Integration

```
Usage metering → Stripe Usage Records (daily sync)
Subscription management → Stripe Billing Portal
Overage billing → Stripe Metered Billing (per-run beyond plan limit)
Invoice generation → Stripe Invoicing
```

Stripe webhook handles: `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`.

### 6.4 BYOK (Bring Your Own Keys)

Enterprise tenants provide their own AI provider API keys:

```sql
-- Stored in tenant's ai_config JSONB (encrypted at rest)
{
  "providers": {
    "anthropic": { "api_key": "vault:///tenants/acme/anthropic_key" },
    "openai":    { "api_key": "vault:///tenants/acme/openai_key" }
  },
  "fallback_chain": ["anthropic", "openai"],
  "default_model": "claude-sonnet-4-6"
}
```

For Starter/Team plans: Conductor provides shared AI access (cost included in subscription, with per-run token limits).

---

## 7. AI Provider Abstraction

### 7.1 Current State

Tutorwise uses a 6-tier fallback chain: xAI Grok 4 Fast → Gemini Flash → DeepSeek R1 → Claude Sonnet 4.6 → OpenAI GPT-4o → Rules-based.

### 7.2 Enterprise Abstraction

```typescript
interface AIProviderConfig {
  providers: {
    [key: string]: {
      api_key_ref: string;      // vault reference
      model_id?: string;        // override default model
      max_tokens?: number;      // per-request limit
      rate_limit?: number;      // requests per minute
    };
  };
  fallback_chain: string[];     // ordered provider list
  default_model: string;
}

// At execution time:
function getAIServiceForTenant(tenantId: string): AIService {
  const config = await loadTenantAIConfig(tenantId);
  return new AIService(config);  // tenant-scoped provider chain
}
```

**Key design decision:** AI service instantiation becomes tenant-scoped. The singleton `getAIService()` pattern must be replaced with a factory that takes `tenantId`.

---

## 8. Extraction Plan — Decoupling from Tutorwise

### 8.1 Module Dependency Map

```
┌─────────────────────────────────────────────────────────────┐
│  Modules to Extract (Conductor Core)                         │
│                                                              │
│  lib/agent-studio/                                           │
│    ├── SpecialistAgentRunner.ts    ✓ Generic                 │
│    ├── AgentMemoryService.ts       ✓ Generic                 │
│    └── tools/executor.ts           ✗ Tutorwise-coupled       │
│                                                              │
│  lib/workflow/                                               │
│    ├── team-runtime/TeamRuntime.ts ✓ Generic                 │
│    ├── team-runtime/AgentTeamState ✓ Generic                 │
│    ├── team-runtime/CircuitBreaker ✓ Generic                 │
│    ├── team-runtime/RetryUtility   ✓ Generic                 │
│    └── runtime/PlatformWorkflowRT  ~ Partially generic       │
│                                                              │
│  lib/mcp/                                                    │
│    ├── MCPClientManager.ts         ✓ Generic                 │
│    ├── credential-resolver.ts      ✗ Tutorwise-coupled       │
│    └── types.ts                    ✓ Generic                 │
│                                                              │
│  lib/conductor/                                              │
│    ├── IntentDetector.ts           ✓ Generic                 │
│    └── ConformanceChecker.ts       ✓ Generic                 │
│                                                              │
│  lib/ai/                                                     │
│    └── AIService                   ✓ Generic (needs factory) │
│                                                              │
│  UI components/feature/conductor/  ✓ Mostly generic          │
│  UI components/feature/workflow/   ✓ Mostly generic          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Tutorwise-Specific (stays in Tutorwise, becomes Tenant #0) │
│                                                              │
│  tools/executor.ts TOOL_EXECUTORS   (32 hardcoded tools)     │
│  15 *_platform_metrics_daily tables  (domain intelligence)   │
│  15 compute_*_platform_metrics() fn  (pg_cron functions)     │
│  credential-resolver.ts              (student_integration)   │
│  process-studio/ webhook handlers    (Tutorwise DB webhooks) │
│  growth-agent/                       (Tutorwise product)     │
│  sage/, lexi/                        (Tutorwise products)    │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 executor.ts Refactoring

The central change: replace the monolithic `TOOL_EXECUTORS` record with a pluggable tool router.

```typescript
// BEFORE (current):
const TOOL_EXECUTORS: Record<string, ToolExecutor> = {
  query_booking_health: async (input) => { /* Supabase query */ },
  query_listing_health: async (input) => { /* Supabase query */ },
  // ... 30 more
};

// AFTER (Conductor Cloud):
interface ToolRouter {
  execute(slug: string, input: Record<string, unknown>, ctx: ExecutionContext): Promise<unknown>;
  listAvailableTools(tenantId: string): Promise<ToolDefinition[]>;
}

class ConductorToolRouter implements ToolRouter {
  async execute(slug: string, input: Record<string, unknown>, ctx: ExecutionContext) {
    // 1. Check built-in tools (tenant #0 only, or shared utilities)
    if (this.builtinTools.has(slug) && this.canAccessBuiltin(ctx.tenantId, slug)) {
      return this.builtinTools.get(slug)!(input);
    }

    // 2. Check MCP tools (slug contains ":")
    if (slug.includes(':')) {
      return this.mcpClient.executeTool(slug, input, ctx.tenantId);
    }

    // 3. Check API connectors
    const connector = await this.findApiConnector(ctx.tenantId, slug);
    if (connector) {
      return this.executeApiConnector(connector, slug, input, ctx);
    }

    // 4. Check SQL connectors
    const sqlConnector = await this.findSqlConnector(ctx.tenantId, slug);
    if (sqlConnector) {
      return this.executeSqlQuery(sqlConnector, slug, input);
    }

    throw new Error(`Tool not found: ${slug}`);
  }
}
```

### 8.3 Package Structure (Target)

```
conductor-cloud/
├── packages/
│   ├── core/                    # Engine (zero UI dependency)
│   │   ├── agent-runner/        # SpecialistAgentRunner
│   │   ├── team-runtime/        # TeamRuntime + patterns
│   │   ├── workflow-runtime/    # PlatformWorkflowRuntime
│   │   ├── memory/              # AgentMemoryService
│   │   ├── mcp/                 # MCPClientManager
│   │   ├── conformance/         # ConformanceChecker
│   │   ├── tools/               # ToolRouter (pluggable)
│   │   └── ai/                  # AIService factory
│   │
│   ├── web/                     # Next.js dashboard
│   │   ├── app/                 # Pages + API routes
│   │   └── components/          # Canvas, panels, forms
│   │
│   ├── connectors/              # Connector packages
│   │   ├── mcp-jira/
│   │   ├── mcp-salesforce/
│   │   ├── mcp-servicenow/
│   │   ├── sql-postgres/
│   │   └── sql-mysql/
│   │
│   └── sdk/                     # Public SDK for tenant integrations
│       ├── connector-sdk/       # Build custom MCP servers for Conductor
│       └── webhook-sdk/         # Receive Conductor events
│
├── tutorwise-tenant/            # Tutorwise-specific (Tenant #0)
│   ├── tools/                   # 32 built-in tools
│   ├── intelligence/            # 15 daily metrics pipelines
│   └── webhooks/                # Tutorwise DB webhook handlers
│
└── infra/
    ├── docker/
    ├── terraform/
    └── migrations/
```

---

## 9. Audit & Compliance

### 9.1 Audit Log

Every significant action is logged:

```sql
CREATE TABLE audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  actor_id    uuid REFERENCES auth.users(id),       -- NULL for system actions
  actor_type  text NOT NULL DEFAULT 'user',          -- user | agent | system | api_key
  action      text NOT NULL,                         -- e.g., 'agent.created', 'team.run.started'
  resource_type text NOT NULL,                       -- e.g., 'agent', 'team', 'workflow'
  resource_id uuid,
  details     jsonb DEFAULT '{}',
  ip_address  inet,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Partitioned by month for performance
-- Retention: 90 days (starter), 1 year (team), 7 years (enterprise)
```

### 9.2 SOC 2 Readiness

| Control | Implementation |
|---|---|
| Access control | RBAC + space-level permissions + API key scopes |
| Data isolation | RLS per tenant + encrypted secrets |
| Audit trail | `audit_log` table with actor/action/resource |
| Change management | Shadow → Live promotion model |
| Incident response | Workflow exceptions + alerting + monitoring agents |
| Encryption | At rest (Supabase default) + in transit (TLS) + secrets vault |
| Availability | Health checks + circuit breakers + retry utilities |

### 9.3 GDPR

- Data export: `GET /api/tenants/{id}/export` — full tenant data dump
- Data deletion: `DELETE /api/tenants/{id}` — cascade delete all tenant data (30-day grace period)
- Data residency: EU-hosted option (Supabase EU region) for enterprise plan
- Existing Conductor GDPR policy (`conductor-gdpr-retention-policy.md`) applies per-tenant

---

## 10. Infrastructure & Deployment

### 10.1 Phase 1: Shared Infrastructure

```
Vercel (Web App)
  └── Next.js dashboard + API routes

Supabase (Database + Auth)
  └── Shared PostgreSQL instance
  └── Supabase Auth (all tenants)

Upstash (Redis)
  └── Tenant-scoped caching (context, sessions)

Vercel Cron (or Supabase pg_cron)
  └── Per-tenant scheduled agent runs
```

### 10.2 Phase 2: Dedicated Execution

```
API Gateway (Vercel or Cloudflare Workers)
  └── Rate limiting per tenant
  └── API key validation

Worker Fleet (Railway or Fly.io)
  └── Long-running agent executions
  └── Isolated from web app cold starts
  └── Horizontal scaling per demand

Secrets Vault (Infisical or Doppler)
  └── Tenant AI keys, MCP credentials
  └── Encryption at rest, audit log on access
```

### 10.3 Phase 3: Enterprise-Grade

```
Dedicated Database Option
  └── Supabase Pro per enterprise tenant (data residency)

Private MCP Proxy
  └── Tenant's MCP servers accessed via VPN/private link

Self-Hosted Option
  └── Docker Compose for on-prem deployment
  └── Helm chart for K8s deployment
```

---

## 11. SDK & Developer Experience

### 11.1 Connector SDK

For tenants building custom MCP servers to expose their data to Conductor:

```typescript
import { ConductorMCPServer } from '@conductor-cloud/connector-sdk';

const server = new ConductorMCPServer({
  name: 'acme-hr',
  version: '1.0.0',
});

server.tool('query_employee_count', {
  description: 'Returns current headcount by department',
  input: z.object({
    department: z.string().optional(),
  }),
  handler: async (input) => {
    const result = await acmeHRDB.query(
      'SELECT department, COUNT(*) as count FROM employees GROUP BY department'
    );
    return { departments: result.rows };
  },
});

server.tool('query_open_positions', {
  description: 'Returns open job requisitions',
  input: z.object({
    status: z.enum(['open', 'filled', 'cancelled']).default('open'),
  }),
  handler: async (input) => {
    // ...tenant's own data query
  },
});

server.start({ port: 3100 });
```

### 11.2 Webhook SDK

For tenants receiving events from Conductor:

```typescript
import { ConductorWebhook } from '@conductor-cloud/webhook-sdk';

const webhook = new ConductorWebhook({
  secret: process.env.CONDUCTOR_WEBHOOK_SECRET,
});

webhook.on('agent.run.completed', async (event) => {
  console.log(`Agent ${event.agent_slug} completed run ${event.run_id}`);
  console.log(`Output: ${event.output}`);
  // Trigger downstream action in tenant's system
});

webhook.on('team.run.awaiting_approval', async (event) => {
  // Notify via Slack, email, etc.
  await slack.send(`Team run ${event.run_id} needs approval`);
});

webhook.listen(3200);
```

### 11.3 REST API

All Conductor functionality exposed via versioned REST API:

```
POST   /api/v1/agents                    # Create agent
GET    /api/v1/agents                    # List agents
POST   /api/v1/agents/{slug}/run         # Trigger agent run
GET    /api/v1/agents/{slug}/runs        # List agent runs

POST   /api/v1/teams                     # Create team
POST   /api/v1/teams/{slug}/run          # Trigger team run
POST   /api/v1/teams/{slug}/runs/{id}/resume  # Resume HITL

GET    /api/v1/spaces                    # List spaces
POST   /api/v1/workflows/execute         # Start workflow
GET    /api/v1/connectors                # List MCP/API connectors
POST   /api/v1/connectors               # Register connector
GET    /api/v1/intelligence/{domain}     # Query intelligence data
```

Authentication: `Authorization: Bearer cnd_<api_key>` — scoped to tenant.

---

## 12. Migration Strategy — Tutorwise → Conductor Cloud

### 12.1 Phase 1: Internal Extraction (4 weeks)

**Goal:** Conductor runs as a separate package within the Tutorwise monorepo, with `tenant_id` on all tables. Tutorwise is Tenant #0.

| Task | Effort |
|---|---|
| Create `tenants` + `tenant_members` tables | 2d |
| Add `tenant_id` to all 20 Conductor tables + RLS policies | 5d |
| Refactor `executor.ts` → `ToolRouter` interface | 3d |
| Replace `is_admin` checks with `has_tenant_role()` | 2d |
| Make `getAIService()` tenant-aware | 2d |
| Seed Tutorwise as Tenant #0 + migrate existing data | 1d |
| Update all API routes to extract `tenantId` from auth context | 3d |
| Integration tests with tenant isolation | 2d |

### 12.2 Phase 2: Standalone Deployment (4 weeks)

**Goal:** Conductor Cloud runs on its own domain with signup, billing, and onboarding.

| Task | Effort |
|---|---|
| Separate Next.js app (or route group) for Conductor Cloud | 3d |
| Tenant signup + provisioning flow | 3d |
| Stripe billing integration (3 tiers) | 3d |
| Usage metering + overage tracking | 2d |
| Landing page + docs site | 3d |
| MCP connector marketplace (initial 5 connectors) | 5d |
| API key management UI | 2d |
| Connector SDK package + docs | 3d |

### 12.3 Phase 3: Enterprise Features (6 weeks)

| Task | Effort |
|---|---|
| SSO/SAML via WorkOS | 3d |
| Space-level RBAC | 3d |
| Audit log + compliance dashboard | 3d |
| SQL connector (hosted) | 5d |
| Hosted MCP server templates (Jira, Salesforce, Slack) | 10d |
| BYOK AI provider configuration UI | 2d |
| Data export / deletion (GDPR) | 2d |
| SOC 2 documentation + controls | 5d |

### 12.4 Phase 4: Scale (ongoing)

| Task | Effort |
|---|---|
| Worker fleet for execution isolation | 5d |
| Self-hosted option (Docker/Helm) | 5d |
| Webhook SDK | 3d |
| Advanced analytics (cross-tenant benchmarks, anonymised) | 5d |
| MCP server marketplace (revenue share model) | 5d |

---

## 13. Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| **Extraction breaks Tutorwise** | High — production platform | Tutorwise is Tenant #0; all existing functionality must pass before launch |
| **Multi-tenant data leak** | Critical — trust destroyer | RLS + integration tests that verify cross-tenant isolation; penetration testing before launch |
| **MCP server reliability** | Medium — tenant's infra is outside our control | Circuit breaker per connection; health checks; fallback to cached data |
| **AI cost on shared plans** | High — unprofitable at scale | Per-run token limits; usage metering; BYOK for enterprise |
| **Enterprise sales cycle** | Medium — slow revenue ramp | Start with PLG (self-serve starter/team plans); enterprise as upsell |
| **Competitor speed** | Medium — LangGraph Cloud, CrewAI moving fast | Ship fast; moat is the shadow-before-live model + vocabulary resonance |
| **Naming/IP conflict** | Low — "Conductor" is used by Netflix/Orkes | Legal review before public launch; fallback: "Digital Force" brand |

---

## 14. Success Metrics

### 14.1 Launch (Month 1-3)
- 50 starter tenants signed up
- 5 team plan conversions
- 1 enterprise design partner

### 14.2 Growth (Month 4-12)
- 500 starter tenants
- 50 team plans ($5K MRR)
- 5 enterprise contracts ($25K+ ARR each)
- 20 MCP connectors in marketplace
- 99.5% uptime

### 14.3 Scale (Year 2)
- $500K ARR
- Self-hosted option available
- SOC 2 Type II certified
- 100+ MCP connectors

---

## 15. Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Multi-tenancy model | Shared DB + RLS | Operationally simple, proven at scale, enables cross-tenant analytics |
| Primary connector type | MCP | Industry standard, self-describing schemas, growing ecosystem |
| Auth provider | Supabase Auth + WorkOS | Keep existing auth; WorkOS handles enterprise SSO without custom SAML code |
| Billing | Stripe | Already integrated in Tutorwise; usage-based billing well-supported |
| AI provider strategy | Shared (starter/team) + BYOK (enterprise) | Reduces barrier to entry; enterprise wants control |
| Extraction approach | Monorepo package first → separate deploy later | Minimises risk; keeps Tutorwise working throughout extraction |
| Naming | "Conductor Cloud" (working title) | Matches existing internal naming; legal review needed before public |

---

## 16. Relationship to Existing Documents

| Document | Relationship |
|---|---|
| `conductor-solution-design.md` | Implementation reference for Phases 0–9 (Tutorwise-specific). This doc extends it for multi-tenant extraction |
| `AI-Digital-Workforce-Blueprint.md` | Conceptual foundation — iPOM architecture, vocabulary. Unchanged by this work |
| `publish/01-technical-white-paper.md` | Enterprise-facing narrative. Update with Conductor Cloud product framing |
| `publish/02-investor-thesis.md` | Investor narrative. Update Ask section with Conductor Cloud GTM plan |
| `mcp-solution-design.md` | Phase 8 MCP implementation. Becomes the foundation for Connector Type 1 |
| `conductor-professional-assessment.md` | Competitive analysis. Update with spin-off positioning |

---

*This is a living document. Version history tracked in git.*
