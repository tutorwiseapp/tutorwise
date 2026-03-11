# MCP Integration Framework — Solution Design

**Version:** 1.0
**Date:** 2026-03-11
**Status:** Design
**Phase:** 8 (Post-Agent Episodic Memory)

---

## 1. Overview

### 1.1 Goal

Build a generic MCP (Model Context Protocol) framework that allows Conductor agents to discover and call tools exposed by external platforms — starting with **Google Classroom** and **Atlassian Jira/Confluence** as the first two adapters.

### 1.2 Why MCP (not raw REST)

| Concern | Raw REST integration | MCP framework |
|---------|---------------------|---------------|
| Adding a new platform | Write custom service file, custom types, custom executor entry | Register server URL + credentials; tools auto-discovered |
| Tool visibility to agents | Hard-coded in `executor.ts` | Dynamic — agents see MCP tools alongside built-in tools |
| Schema drift | Manual sync when API changes | MCP servers publish their own schemas |
| Community ecosystem | N/A | Growing library of official + community MCP servers |

### 1.3 Use Cases

**Google Classroom** — student-facing, per-user OAuth:
- Tutors see their students' class rosters, assignments, and submission status
- Intelligence agents correlate assignment deadlines with booking patterns
- Growth Agent references classroom context when advising tutors

**Jira/Confluence** — org-wide, API token:
- Engineering agents (developer, tester, qa) query project boards, create issues
- DevOps Team reads runbooks from Confluence before incident response
- Operations monitor tracks open bug count as a platform health signal

---

## 2. Background — Existing Infrastructure

### 2.1 Tool Execution (executor.ts)

```
executeTool(slug, input) → Promise<unknown>
```

- 24+ tools in `TOOL_EXECUTORS` record (slug → async function)
- All tools return plain JSON; ReAct loop `JSON.stringify`s the result
- Tool definitions stored in `analyst_tools` table (slug, name, description, input_schema)

### 2.2 ReAct Loop (SpecialistAgentRunner.ts)

```
TOOL_CALL: query_booking_trends {"days": 30}
TOOL_RESULT: query_booking_trends
{"data": [...]}
```

- Up to 5 rounds of tool calls per run
- Tools listed in system prompt from `analyst_tools` table
- Agent dispatches by matching slug against `TOOL_EXECUTORS`

### 2.3 OAuth Infrastructure

- `student_integration_links` table — stores per-user OAuth tokens (migration 064)
- Connect route: `POST /api/integrations/connect/[platform]`
- Callback route: `GET /api/integrations/callback/[platform]`
- Google OAuth client ID/secret already in `.env.local`
- Scopes: `classroom.courses.readonly`, `classroom.coursework.me.readonly`

### 2.4 Jira Integration

- `apps/web/src/lib/integrations/jira-service-desk-sync.ts` — existing REST integration
- Basic Auth: `JIRA_EMAIL` + `JIRA_API_TOKEN`
- `JIRA_BASE_URL=https://tutorwise.atlassian.net`
- Currently used for: Service Desk sync, Lexi chat sync, support snapshots

---

## 3. Architecture

### 3.1 High-Level Flow

```
                                        ┌─────────────────────┐
                                        │  Google Classroom    │
                                        │  MCP Server (remote) │
                                        └─────────┬───────────┘
                                                  │ HTTP+SSE
┌──────────────┐    ┌───────────────┐    ┌────────┴────────┐
│ Specialist   │───>│ Tool Dispatch │───>│ MCPClientManager │
│ AgentRunner  │    │ (executor.ts) │    │ (singleton)      │
└──────────────┘    └───────────────┘    └────────┬────────┘
                           │                      │ HTTP+SSE
                    ┌──────┴──────┐      ┌────────┴───────────┐
                    │ Built-in    │      │  Atlassian          │
                    │ tools (24+) │      │  MCP Server (remote) │
                    └─────────────┘      └─────────────────────┘
```

### 3.2 Transport

MCP supports two transports:
- **stdio** — local subprocess (not applicable; we run in Next.js server)
- **HTTP + SSE (Streamable HTTP)** — remote servers over HTTPS

All MCP connections use **HTTP + SSE** transport. The `@modelcontextprotocol/sdk` TypeScript package provides `StreamableHTTPClientTransport` for this.

### 3.3 Tool Namespacing

MCP tools are namespaced to avoid collisions with built-in tools:

```
{connection_slug}:{tool_name}
```

Examples:
- `classroom:classroom_listCourses`
- `classroom:classroom_getCourseWork`
- `jira:jira_listIssues`
- `jira:jira_createIssue`
- `confluence:confluence_searchContent`

The `connection_slug` is the admin-defined slug when registering the MCP server. The `tool_name` is whatever the MCP server reports via `tools/list`.

### 3.4 Credential Types

Two credential models coexist:

| Model | Example | Storage | Resolution |
|-------|---------|---------|------------|
| **Org-wide** | Jira API token | `mcp_connections.credentials` (encrypted) | Direct lookup from connection record |
| **Per-user OAuth** | Google Classroom | `student_integration_links` table | Resolve from user context at call time |

For per-user OAuth, the agent run must include a `context_profile_id` so the credential resolver can look up the correct token from `student_integration_links`.

---

## 4. Data Model

### 4.1 New Table: `mcp_connections`

```sql
CREATE TABLE mcp_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,          -- e.g. 'classroom', 'jira', 'confluence'
  name            TEXT NOT NULL,                 -- e.g. 'Google Classroom', 'Atlassian Jira'
  server_url      TEXT NOT NULL,                 -- MCP server endpoint URL
  transport       TEXT NOT NULL DEFAULT 'http',  -- 'http' (only option for now)
  credential_type TEXT NOT NULL DEFAULT 'api_key', -- 'api_key' | 'oauth_delegated' | 'none'
  credentials     JSONB DEFAULT '{}',            -- encrypted API keys, headers, etc.
  status          TEXT NOT NULL DEFAULT 'active', -- 'active' | 'inactive' | 'error'
  last_heartbeat  TIMESTAMPTZ,
  error_message   TEXT,
  tool_count      INTEGER NOT NULL DEFAULT 0,
  metadata        JSONB DEFAULT '{}',            -- server info, version, capabilities
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: admin only
ALTER TABLE mcp_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_manage_mcp_connections"
  ON mcp_connections FOR ALL USING (is_admin());
```

**credential_type explained:**
- `api_key` — org-wide credentials stored in `credentials` JSONB (Jira, Confluence)
- `oauth_delegated` — per-user tokens stored in `student_integration_links`; `credentials` stores OAuth client config only
- `none` — public MCP server, no auth needed

### 4.2 New Table: `mcp_tool_catalog`

```sql
CREATE TABLE mcp_tool_catalog (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id     UUID NOT NULL REFERENCES mcp_connections(id) ON DELETE CASCADE,
  tool_name         TEXT NOT NULL,                -- name from MCP server (e.g. 'classroom_listCourses')
  qualified_slug    TEXT UNIQUE NOT NULL,          -- '{connection_slug}:{tool_name}'
  description       TEXT NOT NULL DEFAULT '',
  input_schema      JSONB NOT NULL DEFAULT '{}',  -- JSON Schema from MCP server
  enabled           BOOLEAN NOT NULL DEFAULT true, -- admin can disable individual tools
  category          TEXT NOT NULL DEFAULT 'external',
  last_synced_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(connection_id, tool_name)
);

CREATE INDEX idx_mcp_tool_catalog_connection ON mcp_tool_catalog(connection_id);
CREATE INDEX idx_mcp_tool_catalog_slug ON mcp_tool_catalog(qualified_slug);

-- RLS: admin only
ALTER TABLE mcp_tool_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_manage_mcp_tool_catalog"
  ON mcp_tool_catalog FOR ALL USING (is_admin());
```

### 4.3 New Table: `mcp_tool_executions`

```sql
CREATE TABLE mcp_tool_executions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id   UUID NOT NULL REFERENCES mcp_connections(id),
  tool_name       TEXT NOT NULL,
  qualified_slug  TEXT NOT NULL,
  agent_slug      TEXT,                         -- which agent called this tool
  run_id          UUID,                         -- FK to agent_run_outputs if applicable
  input           JSONB NOT NULL DEFAULT '{}',
  output          JSONB,
  status          TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'success' | 'error'
  error_message   TEXT,
  duration_ms     INTEGER,
  context_profile_id UUID,                      -- for OAuth-delegated calls
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mcp_executions_connection ON mcp_tool_executions(connection_id);
CREATE INDEX idx_mcp_executions_agent ON mcp_tool_executions(agent_slug);
CREATE INDEX idx_mcp_executions_created ON mcp_tool_executions(created_at DESC);

-- RLS: admin only
ALTER TABLE mcp_tool_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_manage_mcp_tool_executions"
  ON mcp_tool_executions FOR ALL USING (is_admin());
```

### 4.4 No Changes to `analyst_tools`

Built-in tools remain in `analyst_tools`. MCP tools live in `mcp_tool_catalog`. The executor routes based on whether a slug contains `:` (namespaced = MCP) or not (built-in).

This avoids polluting the existing table and keeps MCP tools independently manageable (enable/disable, re-sync, delete on disconnect).

---

## 5. Core Components

### 5.1 MCPClientManager

**Location:** `apps/web/src/lib/mcp/MCPClientManager.ts`

Singleton that manages MCP client connections. Each registered connection gets a lazily-initialized `Client` instance from `@modelcontextprotocol/sdk`.

```typescript
interface MCPClientEntry {
  connectionId: string;
  slug: string;
  client: Client;
  transport: StreamableHTTPClientTransport;
  status: 'connected' | 'disconnected' | 'error';
  lastUsed: number;
}

class MCPClientManager {
  private clients: Map<string, MCPClientEntry>;

  // Lazy connect — creates client on first tool call, not at registration
  async getClient(connectionSlug: string): Promise<Client>;

  // Discover tools from server and sync to mcp_tool_catalog
  async syncTools(connectionSlug: string): Promise<MCPToolDefinition[]>;

  // Execute a tool on a specific MCP server
  async callTool(
    connectionSlug: string,
    toolName: string,
    args: Record<string, unknown>,
    context?: { profileId?: string }
  ): Promise<unknown>;

  // Health check — called by cron
  async healthCheck(connectionSlug: string): Promise<boolean>;

  // Disconnect and cleanup
  async disconnect(connectionSlug: string): void;
}
```

**Connection lifecycle:**
1. Admin registers server → row inserted in `mcp_connections`
2. Admin clicks "Sync Tools" → `syncTools()` calls `client.listTools()`, upserts `mcp_tool_catalog`
3. Agent runs → `callTool()` lazily connects, resolves credentials, calls `client.callTool()`
4. Idle timeout (5 min) → client disconnected to free resources
5. Admin deletes connection → cascade deletes catalog entries, client disconnected

### 5.2 CredentialResolver

**Location:** `apps/web/src/lib/mcp/credential-resolver.ts`

Resolves credentials based on `credential_type`:

```typescript
async function resolveCredentials(
  connection: MCPConnection,
  context?: { profileId?: string }
): Promise<Record<string, string>> {
  switch (connection.credential_type) {
    case 'api_key':
      // Return credentials directly from connection record
      return connection.credentials;

    case 'oauth_delegated':
      // Look up user's OAuth token from student_integration_links
      if (!context?.profileId) throw new Error('OAuth requires profile context');
      const link = await supabase
        .from('student_integration_links')
        .select('auth_token, refresh_token')
        .eq('student_profile_id', context.profileId)
        .eq('platform_name', connection.metadata.oauth_platform)
        .single();
      // TODO: token refresh if expired
      return { authorization: `Bearer ${link.auth_token}` };

    case 'none':
      return {};
  }
}
```

### 5.3 Tool Dispatch Extension

**Location:** `apps/web/src/lib/agent-studio/tools/executor.ts` (modified)

```typescript
import { getMCPClientManager } from '../mcp/MCPClientManager';

export async function executeTool(
  slug: string,
  input: Record<string, unknown>,
  context?: { profileId?: string; agentSlug?: string; runId?: string }
): Promise<unknown> {
  // MCP tool — slug contains ':'
  if (slug.includes(':')) {
    const [connectionSlug, ...toolParts] = slug.split(':');
    const toolName = toolParts.join(':');
    const manager = getMCPClientManager();
    return manager.callTool(connectionSlug, toolName, input, context);
  }

  // Built-in tool — existing behavior
  const fn = TOOL_EXECUTORS[slug];
  if (!fn) throw new Error(`Unknown tool: ${slug}`);
  return fn(input);
}
```

### 5.4 System Prompt Injection

**Location:** `apps/web/src/lib/agent-studio/SpecialistAgentRunner.ts` (modified)

MCP tools are appended to the existing tool list in `buildSystemPrompt()`:

```typescript
// Existing: load built-in tools from analyst_tools
const builtInTools = await supabase.from('analyst_tools').select('*').eq('status', 'active');

// New: load enabled MCP tools from mcp_tool_catalog
const mcpTools = await supabase
  .from('mcp_tool_catalog')
  .select('qualified_slug, description, input_schema, connection:mcp_connections(slug, name)')
  .eq('enabled', true);

// Merge into system prompt
const allTools = [
  ...builtInTools.map(t => `  ${t.slug}: ${t.description}`),
  ...mcpTools.map(t => `  ${t.qualified_slug}: [${t.connection.name}] ${t.description}`),
];
```

Agents see both tool types in a single flat list. The `[Google Classroom]` prefix helps the LLM understand which tools belong to which platform.

---

## 6. Use Case: Google Classroom

### 6.1 MCP Server

Google publishes an official MCP server: `@anthropic/google-classroom-mcp` (community) or via Google's own tooling. The server exposes tools like:

| Tool | Description |
|------|-------------|
| `classroom_listCourses` | List courses the authenticated user teaches or is enrolled in |
| `classroom_getCourse` | Get details of a specific course |
| `classroom_listCourseWork` | List assignments for a course |
| `classroom_getStudentSubmissions` | Get submission status for an assignment |
| `classroom_listStudents` | List students enrolled in a course |

### 6.2 Registration

```json
{
  "slug": "classroom",
  "name": "Google Classroom",
  "server_url": "https://mcp.googleapis.com/classroom",
  "credential_type": "oauth_delegated",
  "credentials": {},
  "metadata": {
    "oauth_platform": "google_classroom",
    "required_scopes": [
      "classroom.courses.readonly",
      "classroom.coursework.me.readonly"
    ]
  }
}
```

### 6.3 Agent Integration

When a tutor-facing agent (e.g., Growth Agent) needs classroom context:

1. Agent run includes `context_profile_id` (the tutor's profile)
2. System prompt includes `classroom:classroom_listCourses`, `classroom:classroom_getCourseWork`, etc.
3. Agent calls: `TOOL_CALL: classroom:classroom_listCourses {}`
4. Executor splits on `:` → routes to MCPClientManager
5. CredentialResolver looks up tutor's Google OAuth token from `student_integration_links`
6. MCPClientManager calls the MCP server with the token
7. Result returned to agent as `TOOL_RESULT`

### 6.4 Prerequisites

- Extend `student_integration_links` to support tutor profiles (currently student-only by column name — semantically fine, the `student_profile_id` column works for any profile UUID)
- Add `classroom.rosters.readonly` scope to the OAuth config for student lists
- Verify Google Classroom MCP server availability (if not available, build a thin custom wrapper using `@modelcontextprotocol/sdk` + Google Classroom REST API)

---

## 7. Use Case: Atlassian Jira / Confluence

### 7.1 MCP Server

Atlassian publishes an official MCP server: `@anthropic/atlassian-mcp` or `@atlassian/mcp-server`. It exposes tools across both Jira and Confluence:

**Jira tools:**
| Tool | Description |
|------|-------------|
| `jira_listIssues` | Search issues with JQL |
| `jira_getIssue` | Get issue details by key |
| `jira_createIssue` | Create a new issue |
| `jira_updateIssue` | Update issue fields |
| `jira_addComment` | Add a comment to an issue |
| `jira_listProjects` | List accessible projects |

**Confluence tools:**
| Tool | Description |
|------|-------------|
| `confluence_searchContent` | Search pages and blog posts |
| `confluence_getPage` | Get page content by ID |
| `confluence_createPage` | Create a new page |
| `confluence_updatePage` | Update page content |
| `confluence_listSpaces` | List accessible spaces |

### 7.2 Registration

```json
{
  "slug": "jira",
  "name": "Atlassian Jira",
  "server_url": "https://mcp.atlassian.com/jira",
  "credential_type": "api_key",
  "credentials": {
    "baseUrl": "https://tutorwise.atlassian.net",
    "email": "tutorwiseapp@gmail.com",
    "apiToken": "ATATT3xF..."
  }
}
```

A second connection can be registered for Confluence with its own slug:

```json
{
  "slug": "confluence",
  "name": "Atlassian Confluence",
  "server_url": "https://mcp.atlassian.com/confluence",
  "credential_type": "api_key",
  "credentials": {
    "baseUrl": "https://tutorwise.atlassian.net/wiki",
    "email": "tutorwiseapp@gmail.com",
    "apiToken": "ATATT3xF..."
  }
}
```

### 7.3 Agent Integration

Engineering agents already have system prompts referencing code quality, testing, and deployment. With MCP:

1. `developer` agent sees `jira:jira_listIssues`, `confluence:confluence_searchContent` in its tool list
2. Agent calls: `TOOL_CALL: jira:jira_listIssues {"jql": "project = TUTOR AND status = Open"}`
3. Executor routes to MCPClientManager → Atlassian MCP server
4. Agent synthesizes Jira data with platform health metrics in its analysis

### 7.4 Migration from Existing Jira Integration

The existing `jira-service-desk-sync.ts`, `jira-lexi-sync.ts`, and `jira-snapshot-sync.ts` files use direct REST calls. These continue to work independently — the MCP integration is additive, not a replacement.

Over time, the direct REST integrations can be retired in favour of MCP tool calls, but this is not a Phase 8 goal.

---

## 8. Admin UI — MCPPanel

### 8.1 Location

New tab in Conductor: **Integrations** (Stage 2 — Build).

**Tab addition to discovery-store.ts:**
```typescript
export type DiscoveryTab = '...' | 'integrations';
```

**Stage mapping:**
```typescript
STAGES[1] = ['build', 'agents', 'teams', 'spaces', 'knowledge', 'integrations']
```

### 8.2 MCPPanel Component

**File:** `apps/web/src/components/feature/conductor/MCPPanel.tsx`

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ MCP Integrations                          [+ Add Server]│
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Google Classroom          oauth_delegated    active │ │
│ │ https://mcp.googleapis.com/classroom               │ │
│ │ 5 tools synced · Last heartbeat: 2 min ago         │ │
│ │ [Sync Tools] [View Tools] [Disable] [Delete]       │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Atlassian Jira            api_key            active │ │
│ │ https://mcp.atlassian.com/jira                     │ │
│ │ 6 tools synced · Last heartbeat: 5 min ago         │ │
│ │ [Sync Tools] [View Tools] [Disable] [Delete]       │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ Tool Catalog (11 tools)                    [filter ▾]   │
│ ┌───────────────────────────────────────────┬────┬────┐ │
│ │ classroom:classroom_listCourses           │ GC │ on │ │
│ │ classroom:classroom_getCourseWork         │ GC │ on │ │
│ │ classroom:classroom_getStudentSubmissions  │ GC │ on │ │
│ │ classroom:classroom_listStudents          │ GC │ on │ │
│ │ classroom:classroom_getCourse             │ GC │ off│ │
│ │ jira:jira_listIssues                      │ JR │ on │ │
│ │ jira:jira_getIssue                        │ JR │ on │ │
│ │ jira:jira_createIssue                     │ JR │ on │ │
│ │ jira:jira_updateIssue                     │ JR │ off│ │
│ │ jira:jira_addComment                      │ JR │ on │ │
│ │ jira:jira_listProjects                    │ JR │ on │ │
│ └───────────────────────────────────────────┴────┴────┘ │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- Connection cards with status indicator (green/yellow/red dot)
- "Add Server" modal: slug, name, URL, credential type, credentials JSON
- "Sync Tools" button: calls `POST /api/admin/mcp/connections/[id]/sync`
- "View Tools" expands inline tool catalog filtered to that connection
- Per-tool enable/disable toggle
- Execution log: recent `mcp_tool_executions` with duration, status, agent

### 8.3 API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/admin/mcp/connections` | List all MCP connections |
| POST | `/api/admin/mcp/connections` | Register new MCP server |
| PATCH | `/api/admin/mcp/connections/[id]` | Update connection (URL, credentials) |
| DELETE | `/api/admin/mcp/connections/[id]` | Delete connection + cascade tools |
| POST | `/api/admin/mcp/connections/[id]/sync` | Discover and sync tools from server |
| GET | `/api/admin/mcp/tools` | List all tools (with connection filter) |
| PATCH | `/api/admin/mcp/tools/[id]` | Enable/disable a tool |
| GET | `/api/admin/mcp/executions` | Recent execution log |

---

## 9. Security

### 9.1 Credential Storage

**Development:** Credentials stored as plaintext JSONB in `mcp_connections.credentials`.

**Production:** Migrate to Supabase Vault (`pgsodium`) for encryption at rest:
```sql
-- Future: encrypt credentials column
SELECT vault.create_secret(credentials::text, 'mcp_cred_' || id::text);
```

Same pattern as `student_integration_links.auth_token` (documented as needing pgsodium in production).

### 9.2 Access Control

- All `mcp_*` tables use RLS with `is_admin()` guard
- MCP tool calls only happen server-side within `SpecialistAgentRunner` or team runtime
- No client-side MCP access — all routed through admin API routes
- OAuth tokens scoped to read-only permissions (no write scopes for Classroom)

### 9.3 Tool Sandboxing

- MCP tools marked as `write` operations (e.g., `jira_createIssue`) can be flagged `enabled: false` by default on sync
- Admin must explicitly enable write tools
- Execution log (`mcp_tool_executions`) provides audit trail for all external calls
- Rate limiting: max 100 MCP tool calls per agent run (configurable)

### 9.4 OAuth Token Refresh

For `oauth_delegated` connections, the CredentialResolver must handle token refresh:
1. Check `auth_token` expiry (Google tokens expire after 1 hour)
2. If expired, use `refresh_token` to get a new access token
3. Update `student_integration_links.auth_token` with the new token
4. If refresh fails, mark connection status as `error` and skip tool call gracefully

---

## 10. Monitoring

### 10.1 Health Check Cron

```sql
-- pg_cron: every 5 minutes
SELECT cron.schedule(
  'mcp-health-check',
  '*/5 * * * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.app_url') || '/api/cron/mcp-health-check',
    headers := jsonb_build_object('x-cron-secret', current_setting('app.settings.cron_secret'))
  )$$
);
```

The cron handler iterates active connections, calls `MCPClientManager.healthCheck()`, updates `last_heartbeat` and `status`.

### 10.2 Execution Metrics

The `mcp_tool_executions` table enables:
- Average latency per tool / per connection
- Error rate tracking
- Most-used tools by agent
- Cost attribution (if MCP servers charge per call)

These metrics can feed into the existing IntelligencePanel as an "Integrations" sub-tab in a future phase.

---

## 11. Migration Plan

### Migration 387: `mcp_connections` + `mcp_tool_catalog`

```sql
-- mcp_connections table
-- mcp_tool_catalog table
-- RLS policies
-- Indexes
```

### Migration 388: `mcp_tool_executions`

```sql
-- mcp_tool_executions table
-- RLS policies
-- Indexes
-- pg_cron health check job
```

---

## 12. File Plan

### New Files

| File | Purpose |
|------|---------|
| `apps/web/src/lib/mcp/MCPClientManager.ts` | Singleton — connection pool, tool sync, tool execution |
| `apps/web/src/lib/mcp/credential-resolver.ts` | Resolve credentials by type (api_key / oauth_delegated) |
| `apps/web/src/lib/mcp/types.ts` | TypeScript interfaces for MCP domain |
| `apps/web/src/components/feature/conductor/MCPPanel.tsx` | Admin UI — connection management + tool catalog |
| `apps/web/src/components/feature/conductor/MCPPanel.module.css` | Styles for MCPPanel |
| `apps/web/src/app/api/admin/mcp/connections/route.ts` | GET (list) + POST (register) |
| `apps/web/src/app/api/admin/mcp/connections/[id]/route.ts` | PATCH (update) + DELETE (remove) |
| `apps/web/src/app/api/admin/mcp/connections/[id]/sync/route.ts` | POST — discover + sync tools |
| `apps/web/src/app/api/admin/mcp/tools/route.ts` | GET (list tools) |
| `apps/web/src/app/api/admin/mcp/tools/[id]/route.ts` | PATCH (enable/disable) |
| `apps/web/src/app/api/admin/mcp/executions/route.ts` | GET (execution log) |
| `apps/web/src/app/api/cron/mcp-health-check/route.ts` | Cron handler for health checks |
| `tools/database/migrations/387_mcp_connections_and_catalog.sql` | Tables + RLS + indexes |
| `tools/database/migrations/388_mcp_tool_executions.sql` | Execution log + cron |

### Modified Files

| File | Change |
|------|--------|
| `apps/web/src/lib/agent-studio/tools/executor.ts` | Add `:` check to route MCP tools |
| `apps/web/src/lib/agent-studio/SpecialistAgentRunner.ts` | Load MCP tools into system prompt; pass context to executeTool |
| `apps/web/src/components/feature/workflow/discovery-store.ts` | Add `'integrations'` to DiscoveryTab |
| `apps/web/src/app/(admin)/admin/conductor/page.tsx` | Add MCPPanel import, tab, stage, render block |
| `package.json` | Add `@modelcontextprotocol/sdk` dependency |

---

## 13. Implementation Order

### Phase 8A — Data Model + Core Library (Day 1)

1. Add `@modelcontextprotocol/sdk` dependency
2. Create `types.ts` with all MCP interfaces
3. Run migrations 387 + 388
4. Build `MCPClientManager` (connect, syncTools, callTool, healthCheck, disconnect)
5. Build `credential-resolver.ts`

### Phase 8B — Executor Integration (Day 1-2)

1. Modify `executor.ts` — add MCP routing on `:` delimiter
2. Modify `SpecialistAgentRunner.ts` — load MCP tools into system prompt
3. Pass `context_profile_id` through the tool call chain

### Phase 8C — API Routes (Day 2)

1. CRUD routes for connections
2. Sync route (calls `MCPClientManager.syncTools`)
3. Tool enable/disable route
4. Execution log route
5. Health check cron route

### Phase 8D — Admin UI (Day 2-3)

1. Build MCPPanel component
2. Add to Conductor Build stage
3. Connection management (add/edit/delete)
4. Tool catalog with enable/disable toggles
5. Execution log viewer

### Phase 8E — Google Classroom Adapter (Day 3)

1. Verify or build Google Classroom MCP server
2. Register as first `oauth_delegated` connection
3. Extend OAuth scopes if needed
4. Test with Growth Agent or tutor-facing context
5. Handle token refresh in CredentialResolver

### Phase 8F — Jira/Confluence Adapter (Day 3-4)

1. Register Atlassian MCP servers as `api_key` connections
2. Sync tools
3. Enable relevant tools for engineering agents
4. Test with `developer` agent querying TUTOR project
5. Verify coexistence with existing jira-*.ts sync files

---

## 14. Future Considerations

### 14.1 Custom MCP Servers

For platforms without official MCP servers (Lessonspace, Pencil Spaces, Stripe), build thin wrappers:

```
apps/web/src/lib/mcp/servers/lessonspace-server.ts
```

Using `@modelcontextprotocol/sdk` `Server` class to wrap their REST APIs as MCP tool handlers. These run as in-process servers (no separate deployment needed) using a custom in-memory transport.

### 14.2 Bidirectional MCP (Resources + Prompts)

MCP servers also expose **resources** (read-only data URIs) and **prompts** (templated prompt snippets). Phase 8 focuses on tools only. Resources and prompts can be added later for richer context injection.

### 14.3 Multi-Tenant MCP

For SaaS deployment, each organisation would have its own `mcp_connections` scoped by `org_id`. The current design uses `created_by` + `is_admin()` RLS which works for single-tenant. Multi-tenant would add an `org_id` column with org-scoped RLS.

### 14.4 MCP Marketplace

Long-term: an admin UI page listing known MCP servers (curated registry) with one-click "Install" that pre-fills the connection form. Similar to Slack's app directory.
