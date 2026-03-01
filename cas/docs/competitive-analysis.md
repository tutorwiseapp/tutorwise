# TutorWise AI Stack vs Fuschia: Competitive Analysis

**Version:** 2.0
**Date:** February 28, 2026
**Scope:** Full AI stack comparison with CAS AI-Native upgrade complete

---

## Executive Summary

TutorWise and Fuschia are fundamentally different platforms with different architectural approaches:

- **TutorWise** is a **domain-specific education platform** with a deeply integrated AI stack (Sage, Lexi, CAS, AI Agents) purpose-built for tutoring, adaptive learning, and curriculum-aligned knowledge delivery. Its strength is vertical depth.

- **Fuschia** is a **horizontal enterprise automation platform** designed for multi-tenant workflow orchestration, knowledge graph management (Neo4j), and IT service management (ServiceNow). Its strength is breadth and configurability.

**Key Differentiators:**

| Dimension | TutorWise | Fuschia |
|-----------|-----------|---------|
| Domain | Education (tutoring) | Enterprise automation |
| Architecture | Next.js monorepo + Supabase | Flask API + Vite React SPA |
| Database | PostgreSQL (Supabase) + pgvector | Neo4j (graph) + PostgreSQL |
| AI Focus | Teaching methodology + RAG | Workflow automation + chat |
| Multi-tenancy | Single tenant | Multi-tenant (organizations) |
| Agent purpose | Internal dev ops (CAS) + user-facing tutors | Enterprise process automation |
| Agent architecture | Two-loop product team (9 agents, AI-native) | Dynamic template-based orchestrator |

---

## 1. Architecture

### TutorWise

**Stack:** Next.js 16 monorepo (`apps/web/`, `sage/`, `lexi/`, `cas/`)

```
User Request → Next.js Server Components → AI Adapter
                                            ├── Sage (AI Tutor) — Teaching engine
                                            ├── Lexi (Help Bot) — Platform support
                                            └── AI Agents (Marketplace) — User-created tutors

CAS (Internal) → LangGraph PlanningGraph → Two-Loop Workflow → 9 AI-Native Agents
```

- **Server-side rendering** with React Server Components
- **Single codebase** — frontend and backend in one repo
- **Supabase** for auth, database, real-time, storage
- **No separate API server** — Next.js API routes + direct Supabase queries

### Fuschia

**Stack:** Flask (Python backend) + Vite/React (frontend SPA)

```
User Request → React SPA → Flask REST API → LLM Providers (OpenAI/Anthropic/xAI)
                                           → Neo4j (Knowledge Graph)
                                           → Agent Orchestrator
                                           → ServiceNow Integration
```

- **Separated frontend/backend** — traditional client-server architecture
- **Flask** with blueprint-based routing (7 blueprints: chat, servicenow, agents, workflows, integrations, auth, admin)
- **Neo4j** as primary data store for graph relationships
- **PostgreSQL** for workflow templates and structured data
- **Socket.IO** for real-time communication

### Verdict

TutorWise has a more modern architecture (SSR, server components, monorepo). Fuschia's separated architecture is more traditional but simpler to scale independently. TutorWise's single-codebase approach is better for a single-product team; Fuschia's separation suits a platform with multiple deployment targets.

---

## 2. Agent Architecture

### TutorWise CAS (AI-Native)

**9 AI-native agents** orchestrated by a LangGraph StateGraph with **two-loop architecture**:

| Agent | Roles | Maturity | AI Method | Key Capabilities |
|-------|-------|----------|-----------|------------------|
| Director | PM + Strategist + CTO + Cofounder | High | Reason with AI | Dynamic `.ai/` doc parsing, LLM semantic alignment scoring, PROCEED/ITERATE/DEFER |
| Analyst | BA + Three Amigos Facilitator | High | Reason with AI | LLM-powered feature briefs, Three Amigos synthesis (Business/Technical/Quality) |
| Planner | Scrum Master + Flow Manager | High | Reason + Rules | Kanban board via `cas_planner_tasks`, WIP limits (max 3), LLM backlog prioritisation |
| Developer | Tech Lead + Architect | High | Reason with AI | LLM-powered feasibility review, structured implementation plans |
| Tester | QA + Test Automation Engineer | High | Execute with tools | Real Jest execution (`npx jest --json`), real build verification |
| QA | Release Manager + Quality Gate | High | Reason + Rules | Structured APPROVE/REWORK/BLOCK, LLM semantic criteria validation, regression detection |
| Security | Security + Compliance | High | Execute + AI | 10+ scan patterns, npm audit, LLM false positive filtering |
| Engineer | DevOps + SRE + Build Engineer | High | Execute + AI | Real `npm run build`, LLM failure analysis, pre-deployment checklist |
| Marketer | Analytics + Growth + Feedback | High | Reason with AI | Real metrics from `cas_metrics_timeseries`, LLM feedback analysis, backlog generation |

**Two-loop workflow:**
```
OUTER LOOP (Strategy):
  Director → Three Amigos (Analyst facilitates) → Planner

INNER LOOP (CI/CD):
  Developer → Engineer Build → Tester → QA → Security → Engineer Deploy → Marketer
                                         ↑                                    │
                                         └── REWORK ──────────────────────────┘
FEEDBACK LOOP:
  Marketer → cas_planner_tasks → next workflow → Director
```

**AI-Native Design Principle:**
- **Reason with AI:** LLM for judgements, synthesis, analysis (6 agents)
- **Execute with tools:** Deterministic for build, test, scan (3 agents)
- **Validate with rules:** Thresholds and gates (QA, Security, Planner)
- **Graceful degradation:** Every LLM call returns `null` on failure → rules-based fallback

**Three Amigos Methodology:**
- Analyst facilitates, gets Developer + Tester perspectives
- Single LLM synthesis produces structured report: acceptance criteria, technical constraints, edge cases, test strategy, definition of done
- Mirrors a real meeting — one conversation, three viewpoints

**Kanban Continuous Delivery:**
- Planner manages Kanban board via `cas_planner_tasks`
- WIP limit: max 3 in-progress tasks
- LLM-powered backlog prioritisation and bottleneck detection
- No sprints — continuous flow

**Resilience:**
- CircuitBreaker (225 lines) — CLOSED/OPEN/HALF_OPEN state machine
- RetryUtility (251 lines) — Exponential backoff with jitter
- Supabase checkpointing for state persistence
- LangSmith tracing for observability
- Event persistence at every workflow node

### Fuschia Agents

**Dynamic agent system** with orchestrator pattern:

- Agents defined via YAML templates and loaded at runtime
- Hierarchical structure: Level 0 (entry), Level 1 (supervisors), Level 2 (specialists)
- `get_orchestrator()` factory creates per-organization orchestrators
- Agent routing via `route_to_next_agent()` with LLM-powered decisions
- Agent properties: id, label, level, prompt, tools, name
- Chat-based interaction (`/agents/chat` endpoint)

**Key differences:**

| Feature | TutorWise CAS | Fuschia |
|---------|---------------|---------|
| Agent count | 9 fixed, multi-role, AI-native | Dynamic, template-based |
| Orchestration | LangGraph StateGraph (two-loop) | Custom Python orchestrator |
| Agent AI | Shared CAS AI Client (Gemini) | Per-agent LLM calls |
| Routing | Conditional (deterministic + QA loop) | LLM-powered (dynamic) |
| Methodology | Three Amigos + Kanban | None (generic routing) |
| Execution | Real (Jest, npm build, scans) | Simulated/chat-based |
| State management | LangGraph + Supabase checkpointing | Per-session state |
| Resilience | CircuitBreaker + RetryUtility | Basic try/catch |
| Self-improvement | DSPy optimization + QA rework loop | DSPy evaluation panel (UI) |
| Feedback loop | Marketer → cas_planner_tasks → Director | None |
| Event persistence | Every node via cas-events.ts | None |
| Graceful degradation | LLM → rules-based fallback | None |

### Verdict

TutorWise CAS is significantly more mature for its specific domain (SDLC automation) with AI-native agents, real execution, production-grade resilience, and a structured two-loop workflow. Fuschia's dynamic agent system is more flexible — agents can be created, modified, and organized visually by users. CAS is an opinionated, high-performance pipeline; Fuschia is a configurable platform.

---

## 3. Knowledge Management

### TutorWise

**pgvector** (PostgreSQL) with hybrid search (vector + BM25):

| System | Knowledge Source | Search Method |
|--------|-----------------|---------------|
| **Sage** | 4-tier RAG: user uploads → shared → links → global | Hybrid (vector + BM25) |
| **Lexi** | Help Centre articles (`lexi_knowledge_chunks`) | Vector similarity |
| **AI Agents** | 3-tier: materials → links → Sage fallback | Hybrid (vector + BM25) |

- **Embedding model:** `gemini-embedding-001` (768 dimensions)
- **HNSW indexes** on all knowledge tables for fast similarity search
- **Quality scoring:** Relevance (40%), Authority (30%), Topic Alignment (20%), Recency (10%)
- **RPCs:** `search_ai_agent_materials_hybrid()`, `search_ai_agent_link_chunks_hybrid()`, `match_lexi_knowledge_chunks()`
- **Document processing:** PDF/text chunking, embedding, storage in Supabase
- **Audience filtering:** Student, tutor, parent personas for Lexi

### Fuschia

**Neo4j** (graph database) with visual exploration:

- Full Neo4j service (`neo4j_service.py`, 176 lines) — CRUD, relationships, Cypher queries
- **Knowledge Graph UI** (`KnowledgeGraph.tsx`) — ReactFlow-based visual graph browser
- **Neo4j Browser** (`Neo4jBrowser.tsx`) — Direct Cypher query interface
- **Neo4j Visualization** (`Neo4jVisualization.tsx`) — D3-powered graph rendering
- **Node types:** Entity, Process, System, Document, Person, Department
- **Data Import** (`DataImport.tsx`) — Import knowledge from external sources
- **Node Properties Drawer** — Edit node properties inline

**Key differences:**

| Feature | TutorWise | Fuschia |
|---------|-----------|---------|
| Database | pgvector (SQL + vectors) | Neo4j (graph) |
| Search | Hybrid vector + BM25 | Graph traversal + Cypher |
| Embeddings | Gemini 768d, HNSW indexed | None (graph relationships) |
| RAG | Multi-tier with quality scoring | Not implemented |
| Visual | None (API only) | Full ReactFlow graph browser |
| Relationships | Flat tables with foreign keys | Native graph edges |
| Strength | Semantic similarity search | Relationship discovery |

### Verdict

TutorWise has superior RAG and semantic search capabilities — critical for education where finding the right content matters. Fuschia has superior relationship modeling and visualization — critical for enterprise knowledge graphs where understanding connections matters. These are complementary approaches for different domains.

---

## 4. Workflow System

### TutorWise CAS

**LangGraph StateGraph** — two-loop architecture:

- `PlanningGraph.ts` defining the 9-agent two-loop workflow
- **Outer loop:** Director → Three Amigos → Planner (strategy and refinement)
- **Inner loop:** Developer → Engineer Build → Tester → QA → Security → Engineer Deploy → Marketer (CI/CD)
- **QA rework loop:** QA REWORK routes back to Developer
- **Feedback loop:** Marketer writes backlog items to `cas_planner_tasks` for next workflow
- Conditional routing: `routeFromDirector()`, `routeFromQA()`, `routeFromSecurity()`, `routeFromEngineerBuild()`
- DynamicStructuredTool wrappers for each agent
- `executePlanningWorkflow(featureQuery)` — single entry point
- `getWorkflowStructure()` — returns graph for visualization
- **Workflow Visualizer** with fullscreen demo execution mode
- 3 pre-built workflows: content-strategy, feature-development, security-audit

### Fuschia

**ReactFlow Visual Builder** — user-configurable, visual:

- `WorkflowDesigner.tsx` (1,200 lines) — full drag-and-drop workflow builder
- Node types: trigger, action, condition, end
- Template system — save/load workflows from PostgreSQL database
- **Workflow execution** via `workflowExecutionService`
- **Memory enhancement** toggle for context retention across steps
- Save to PostgreSQL with local backup fallback
- Template loader with category filtering
- `WorkflowExecutions.tsx` — execution monitoring
- `WorkflowTemplates.tsx` — template management
- **YAML import/export** for workflow definitions

**Key differences:**

| Feature | TutorWise CAS | Fuschia |
|---------|---------------|---------|
| Architecture | Two-loop (strategy + CI/CD) | Linear workflows |
| Definition | Code (LangGraph StateGraph) | Visual (ReactFlow builder) |
| User-facing | Admin visualization only | Full designer + templates |
| Customization | Requires code changes | Drag-and-drop by users |
| Execution | LangGraph runtime | Custom execution service |
| Quality gates | QA APPROVE/REWORK/BLOCK loop | None |
| Feedback loop | Marketer → backlog → Director | None |
| Templates | 3 pre-built | Database-stored, user-created |
| Import/Export | None | YAML/JSON files |
| Node types | 12 specialized agent nodes | 4 generic types |

### Verdict

Fuschia's workflow system is far more user-friendly and flexible — users can design, save, share, and execute custom workflows visually. TutorWise CAS is more powerful for its specific pipeline with two-loop architecture, quality gates, rework loops, and feedback mechanisms — but requires developer intervention to modify. For an enterprise SaaS product, Fuschia's approach is better. For an internal development tool, CAS's approach is superior.

---

## 5. AI Provider Integration

### TutorWise

**3 providers** with automatic fallback chain:

| Provider | Use Case | Models |
|----------|----------|--------|
| Gemini (default) | Sage, Lexi, Embeddings, CAS agents | gemini-2.0-flash, gemini-embedding-001 |
| DeepSeek (fallback 1) | Sage, Lexi | deepseek-chat |
| Claude (fallback 2) | Sage, Lexi | claude-3.5-sonnet |

- Graceful provider fallback: Gemini → DeepSeek → Claude → Rules-based
- **CAS AI Client** uses `gemini-2.0-flash` at temperature 0.3 for agent reasoning
- `gemini-embedding-001` for all embeddings (768 dimensions)
- Streaming support for real-time responses
- No OpenAI dependency

### Fuschia

**3 providers** with user selection:

| Provider | Models Available |
|----------|----------------|
| OpenAI (default) | GPT-4o, GPT-4 Turbo, GPT-4, GPT-3.5 Turbo |
| Anthropic | Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Sonnet, Claude 3 Haiku |
| xAI | Grok Beta, Grok Vision Beta |

- Provider/model selection via `LLMSettings.tsx` admin panel
- Per-user API key configuration
- Temperature and max token controls
- Model capability metadata (chat, vision, function calling, streaming)
- Pricing information per model
- **OpenAI as primary dependency** (chat routes use OpenAI SDK directly)

### Verdict

TutorWise has better resilience with automatic fallback chains and graceful degradation in CAS agents (LLM → rules-based). Fuschia offers more user choice and model diversity. TutorWise avoids OpenAI dependency; Fuschia defaults to it. Both approaches are valid for their domains.

---

## 6. User-Facing AI Features

### TutorWise

**Sage (AI Tutor):**
- 4 teaching modes: Socratic, Direct, Adaptive, Supportive
- Mode selection algorithm based on intent, struggle level, persona
- Adaptive practice with SM-2 spaced repetition
- Gap detection from performance metrics (accuracy < 60%, mastery < 50%)
- Subject engines: Maths, English, Science, General
- DSPy signatures: ProblemSolver, HintGenerator, ErrorAnalyzer, PracticeGenerator
- Session management (24h TTL, dual memory/DB storage)

**AI Agents (Marketplace):**
- 5 agent types: Tutor, Coursework, Study Buddy, Research Assistant, Exam Prep Coach
- User-created agents with custom knowledge bases
- 3-tier RAG: agent materials → agent links → Sage fallback
- Subscription-based access for marketplace agents
- Unified agent architecture (`BaseAgent` → `PlatformAIAgent` / `MarketplaceAIAgent`)

**Lexi (Help Bot):**
- 5 personas: Student, Tutor, Client, Agent, Organisation
- Pluggable providers: Rules-based, Claude, Gemini, DeepSeek
- Platform knowledge RAG (Help Centre articles)
- Audience-aware filtering
- Response caching and rate limiting

### Fuschia

**Chat Interface:**
- General-purpose chat via OpenAI
- Context-aware prompts (process modeling, agent organization)
- Session-based conversation
- No domain-specific teaching methodology

**Agent Interaction:**
- User selects or gets routed to appropriate agent
- Chat-based interaction with agent
- No adaptive learning or teaching modes

### Verdict

TutorWise's user-facing AI is vastly more sophisticated — it has purpose-built teaching methodology, adaptive learning, spaced repetition, gap detection, and domain-specific knowledge delivery. Fuschia's chat is generic and lacks domain expertise. This is TutorWise's core competitive advantage.

---

## 7. Authentication & Multi-Tenancy

### TutorWise

- **Supabase Auth** (built-in, managed)
- **Single tenant** — one instance, one organization
- **RLS policies** with `is_admin()` function
- **Role-based:** Admin, Tutor, Student, Parent, Agent, Organisation
- **CaaS score** system for marketplace limitations

### Fuschia

- **Custom JWT auth** (`auth.py`, 495 lines)
- **Multi-tenant** — organizations with isolated data
- **3 roles:** SuperAdmin, OrgAdmin, EndUser
- **4 subscription tiers:** Free, Starter, Professional, Enterprise
- **Organization-scoped data** with `same_org_required` decorator
- **Module-level RBAC** — `canAccessModule(role, moduleId)` restricts UI access
- **User management UI** (`UserManagement.tsx`, `RoleManagement.tsx`)
- **14-day trial** on free tier

### Verdict

Fuschia has a significantly more mature auth system with real multi-tenancy, subscription tiers, and granular RBAC. TutorWise relies on Supabase's managed auth which is simpler but sufficient for single-tenant. If TutorWise needed multi-tenancy, significant work would be required.

---

## 8. Visual Builder & UI

### TutorWise

- **Admin dashboard** (`/admin/cas`) — 5 tabs
- **Workflow visualizer** — read-only graph of two-loop agent pipeline + fullscreen demo
- **No visual builder** for workflows
- **CSS Modules** with custom design system
- **Next.js 16** with server components

### Fuschia

- **ReactFlow builders** for multiple domains:
  - `WorkflowDesigner.tsx` — workflow step builder
  - `AgentDesigner.tsx` — agent organization builder
  - `KnowledgeGraph.tsx` — knowledge graph explorer
  - `ValueStreamDesigner.tsx` — value stream mapper
- **Process Mining module** — ConformanceChecking, ProcessAnalysis, ProcessDiscovery
- **Analytics module** — AgentAnalytics, DashboardOverview, PerformanceReports, WorkflowAnalytics
- **Monitoring module** — AgentOrganizationVisualization, ThoughtsActionsVisualization, WorkflowExecutionVisualization, MCPMonitor, GmailMonitor
- **Tailwind CSS** with Radix UI components
- **Vite + React 18** SPA

### Verdict

Fuschia has far more visual tooling — multiple ReactFlow builders, analytics, monitoring, and process mining. TutorWise's UI is focused on the education product rather than internal tooling. For a platform product (SaaS), Fuschia's approach creates significantly more value.

---

## 9. MCP (Model Context Protocol)

### TutorWise

- **Not implemented** for CAS or user-facing systems
- Message bus uses custom JSON envelope format
- No MCP server or client

### Fuschia

- **Full MCP client** (`mcpClientService.ts`) with UI (`MCPToolsSelector.tsx`, 573 lines)
- Server lifecycle management (create, start, stop, delete)
- Tool discovery and selection per agent
- Default server configurations (Filesystem, Slack, ServiceNow)
- `MCPToolNode.tsx` — MCP tool nodes in workflow builder
- `MCPMonitor.tsx` — real-time MCP server monitoring

### Verdict

Fuschia has full MCP integration; TutorWise has none. MCP is valuable for enterprise integrations (ServiceNow, Slack, etc.) but less critical for an education platform. If TutorWise needed external tool integration, MCP adoption would be recommended.

---

## 10. DSPy / Self-Improvement

### TutorWise CAS

- **Python DSPy pipeline** (`cas/optimization/run_dspy.py`)
- **Prompt loader** (`prompt-loader.ts`, 323 lines) — loads optimized prompts from JSON
- **3 signatures** implemented: Maths, Explain, Diagnose
- **Integration:** Base Provider and Marketplace Agent check for recent optimization
- **Subject-specific signatures** for Maths, English, Science, General
- **Feedback-driven:** `ai_feedback` table feeds optimization
- **AI-Native agents:** All 9 agents use `casGenerate()` with graceful degradation — prompts are candidates for DSPy optimization

### Fuschia

- **DSPy Evaluation Panel** (`DSPyEvaluationPanel.tsx`, 616 lines) — full UI for DSPy
- **Service layer** (`dspyEvaluationService`) — config, examples, results, optimization
- **Metrics:** Accuracy, Semantic Similarity, BLEU, ROUGE, F1, Precision, Recall
- **Strategies:** Bootstrap Few-Shot, COPRO, MIPRO
- **Per-task optimization** — each workflow task can have its own DSPy config
- **Example management** — add/remove training examples via UI
- **Optimization progress** tracking with status indicators
- **Evaluation history** with trend analysis

### Verdict

Fuschia has a more user-friendly DSPy integration with a full UI for managing examples, metrics, and optimization. TutorWise's DSPy is backend-only (CLI + prompt loader) but is more tightly integrated into the actual AI teaching stack. Fuschia's approach is more accessible; TutorWise's is more purpose-built.

---

## 11. Integrations

### TutorWise

- **Supabase** (database, auth, real-time, storage)
- **Google AI** (Gemini, embeddings, CAS AI Client)
- **Anthropic** (Claude)
- **DeepSeek** (fallback LLM)
- **LangSmith** (observability)
- **Sage Bridge** — connects AI tutor feedback to CAS
- **Lexi Bridge** — connects help bot feedback to CAS

### Fuschia

- **ServiceNow** — incident management, CMDB, knowledge base
- **Neo4j** — knowledge graph database
- **Socket.IO** — real-time communication
- **MCP Protocol** — extensible tool integrations
- **Gmail Monitor** — email monitoring
- **PostgreSQL** — workflow storage
- **OpenAI, Anthropic, xAI** — LLM providers

### Verdict

Different integration priorities reflecting different domains. TutorWise integrates deeply with education-specific tools. Fuschia integrates with enterprise IT tools. Fuschia's MCP support makes it more extensible for new integrations.

---

## 12. Testing & Quality

### TutorWise

- **Real Jest execution** via CAS Tester agent (`npx jest --json --coverage --forceExit`)
- **Real build verification** via CAS Engineer agent (`npm run build`)
- **Pre-commit hooks** running tests, lint, full build
- **Structured QA verdicts** — APPROVE/REWORK/BLOCK with LLM semantic criteria validation
- **QA rework loop** — REWORK routes back to Developer for re-planning
- **Regression detection** — QA compares against previous test runs via `cas_agent_events`
- **Acceptance criteria validation** — QA validates against Three Amigos output
- **Security scanning** — npm audit + 10+ regex patterns + LLM false positive filtering
- **Build failure analysis** — LLM-powered root cause identification

### Fuschia

- **Test files exist** but minimal:
  - `test_intent_agent.py` — single test file
  - `test_workflow_upsert.py` — single test file
  - `test_template_service.ts` — single test file
- **No CI/CD pipeline** visible
- **No pre-commit hooks**
- **No automated testing infrastructure**

### Verdict

TutorWise has significantly stronger testing and quality gates with real test execution, build verification, structured QA verdicts with rework loops, regression detection, and LLM-powered analysis. Fuschia has minimal testing infrastructure.

---

## 13. Real-time & Communication

### TutorWise

- **Supabase Realtime** (Postgres CDC) for live dashboard updates
- **Streaming LLM responses** for Sage and Lexi
- **CAS Message Bus** with JSON envelope format
- **Event sourcing** via `cas_agent_events` with persistence at every workflow node

### Fuschia

- **Socket.IO** client (`socket.io-client` in dependencies)
- **Streaming LLM** support (configured per model)
- **No event sourcing**

### Verdict

TutorWise has more robust real-time infrastructure with Supabase Realtime, event sourcing, and comprehensive audit trail at every workflow node. Fuschia's Socket.IO is simpler but functional for chat-style updates.

---

## 14. Summary Comparison Matrix

| Capability | TutorWise (AI-Native) | Fuschia | Winner |
|-----------|----------------------|---------|--------|
| **Teaching AI** | 4 modes, adaptive learning, spaced repetition | Generic chat | TutorWise |
| **RAG / Knowledge Retrieval** | Multi-tier hybrid search, quality scoring | None (graph queries) | TutorWise |
| **Knowledge Visualization** | None | ReactFlow graph browser | Fuschia |
| **Agent Architecture** | 9 AI-native agents, two-loop, Three Amigos, Kanban | Dynamic orchestrator with routing | TutorWise (depth) / Fuschia (flexibility) |
| **Agent Maturity** | All 9 High (real execution, LLM reasoning) | Template-based | TutorWise |
| **Workflow Architecture** | Two-loop with QA rework + feedback loop | Linear visual workflows | TutorWise |
| **Visual Workflow Builder** | Read-only visualizer | Full ReactFlow designer | Fuschia |
| **Multi-Tenancy** | Single tenant | Full org-based isolation | Fuschia |
| **RBAC** | Basic admin/user | Module-level, role-based | Fuschia |
| **MCP Integration** | None | Full client with UI | Fuschia |
| **DSPy Optimization** | Backend pipeline + prompt loader | Full UI with per-task config | Fuschia (UX) / TutorWise (depth) |
| **Testing / QA** | Real Jest + structured QA verdicts + rework loop | Minimal test files | TutorWise |
| **Build Verification** | Real npm build + LLM failure analysis | None | TutorWise |
| **Resilience** | CircuitBreaker, RetryUtility, checkpointing, graceful degradation | Basic error handling | TutorWise |
| **Event Sourcing / Audit** | Full via `cas_agent_events` at every node | None | TutorWise |
| **Enterprise Integrations** | Education-focused | ServiceNow, Slack, MCP | Fuschia |
| **Provider Fallback** | Automatic chain (Gemini → DeepSeek → Claude → rules) | User selection only | TutorWise |
| **Process Mining** | None | Full module (discovery, conformance) | Fuschia |
| **User-Created Agents** | 5 types with marketplace | Template-based agent design | TutorWise (depth) |
| **Real-time** | Supabase Realtime + event sourcing | Socket.IO | TutorWise |
| **CI/CD** | Pre-commit hooks + CAS Engineer (real builds) | None visible | TutorWise |
| **Feedback Loop** | Marketer → backlog → Director (closed loop) | None | TutorWise |

---

## 15. Strategic Insights

### What TutorWise Does Better

1. **Domain expertise** — Teaching methodology (Socratic, adaptive, spaced repetition) is deeply embedded and cannot be replicated by a generic platform
2. **RAG quality** — Multi-tier hybrid search with quality scoring delivers more relevant educational content
3. **AI-native agent pipeline** — Two-loop architecture with Three Amigos methodology, Kanban delivery, QA rework loops, and feedback mechanisms models a real high-performance product team
4. **Production resilience** — CircuitBreaker, RetryUtility, graceful degradation (LLM → rules-based), and event sourcing at every node provide enterprise-grade reliability
5. **Automated QA pipeline** — Real Jest tests, structured QA verdicts, regression detection, LLM-powered criteria validation, and build failure analysis
6. **Closed feedback loop** — Marketer insights feed back to Planner/Director for continuous improvement across workflow runs
7. **Provider resilience** — Automatic fallback ensures AI never goes down

### What Fuschia Does Better

1. **Visual tooling** — ReactFlow builders for workflows, agents, knowledge graphs, and value streams make the platform accessible to non-developers
2. **Multi-tenancy** — Organization-based isolation with subscription tiers is ready for SaaS
3. **MCP integration** — Extensible tool connectivity for enterprise systems
4. **User configurability** — Agents, workflows, and LLM settings can all be customized without code changes
5. **Process Mining** — Discovery, analysis, and conformance checking for business process improvement

### Opportunities for Cross-Pollination

| From Fuschia | Into TutorWise | Value |
|-------------|---------------|-------|
| Visual workflow builder | CAS admin | Allow non-developers to modify CAS pipeline |
| MCP integration | Sage/Lexi | Connect to external educational tools (LMS, Google Classroom) |
| Multi-tenancy patterns | Platform-wide | Support multiple schools/organizations |
| DSPy evaluation UI | CAS admin dashboard | Make optimization accessible to admins |
| Process mining concepts | Learning analytics | Discover student learning patterns |

| From TutorWise | Into Fuschia | Value |
|---------------|-------------|-------|
| Multi-tier RAG | Knowledge module | Add semantic search to graph database |
| Teaching methodology | Agent prompts | Domain-specific AI behaviors |
| CircuitBreaker/RetryUtility | Agent execution | Production-grade resilience |
| Event sourcing | Workflow execution | Full audit trail |
| Two-loop architecture | Workflow system | Quality gates and feedback loops |
| Three Amigos methodology | Agent coordination | Structured multi-perspective analysis |
| Graceful degradation | Agent resilience | LLM → rules-based fallback pattern |

---

**END OF DOCUMENT**
