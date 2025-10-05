# CAS - Full-Stack Application Architecture

**Vision:** CAS as a standalone full-stack DevOps platform
**Similar to:** Docker Desktop, Kubernetes Dashboard, Vercel CLI + Dashboard
**Status:** Architectural design

---

## 🎯 What CAS Will Become

A **complete full-stack application** for development automation:

1. **Backend API** - Service orchestration, health checks, task execution
2. **Frontend Dashboard** - Web UI for monitoring and control
3. **CLI** - Command-line interface
4. **Agent** - Autonomous background worker
5. **SADD** - Application discovery and migration tool
6. **Database** - SQLite/Postgres for state management
7. **Docs** - Documentation website

---

## 🏗️ Proper Full-Stack Structure

```
cas/
├── apps/                           # Applications
│   ├── web/                        # Frontend dashboard (Next.js)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── services/
│   │   │   │   ├── agent/
│   │   │   │   └── sadd/
│   │   │   ├── components/
│   │   │   └── lib/
│   │   ├── public/
│   │   └── package.json
│   │
│   ├── api/                        # Backend API (Node.js/Express)
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── services.js
│   │   │   │   ├── agent.js
│   │   │   │   └── sadd.js
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   └── db/
│   │   ├── server.js
│   │   └── package.json
│   │
│   ├── cli/                        # CLI application
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── start.js
│   │   │   │   ├── stop.js
│   │   │   │   ├── sadd.js
│   │   │   │   └── agent.js
│   │   │   └── index.js
│   │   ├── bin/
│   │   │   └── cas
│   │   └── package.json
│   │
│   └── docs/                       # Documentation site (Nextra/Docusaurus)
│       ├── pages/
│       ├── public/
│       └── package.json
│
├── packages/                       # Shared libraries
│   ├── core/                       # Core business logic
│   │   ├── src/
│   │   │   ├── service-orchestrator/
│   │   │   ├── context-engine/
│   │   │   ├── health-monitor/
│   │   │   └── config/
│   │   └── package.json
│   │
│   ├── agent/                      # Agent logic
│   │   ├── src/
│   │   │   ├── executor/
│   │   │   ├── scheduler/
│   │   │   └── integrations/
│   │   └── package.json
│   │
│   ├── sadd/                       # SADD logic
│   │   ├── src/
│   │   │   ├── discovery/
│   │   │   ├── migration/
│   │   │   └── adaptation/
│   │   ├── bin/
│   │   └── package.json
│   │
│   ├── ui/                         # Shared UI components
│   │   ├── src/
│   │   │   ├── components/
│   │   │   └── hooks/
│   │   └── package.json
│   │
│   └── types/                      # Shared TypeScript types
│       ├── src/
│       └── package.json
│
├── config/                         # Configuration
│   ├── service-registry.json
│   ├── projects.json
│   └── cas.config.js
│
├── database/                       # Database files
│   ├── migrations/
│   ├── seeds/
│   └── cas.db
│
├── scripts/                        # Build/deployment scripts
│   ├── build.sh
│   ├── deploy.sh
│   └── dev.sh
│
├── docs/                          # Documentation (markdown)
│   ├── guides/
│   ├── api/
│   └── architecture/
│
├── package.json                   # Root workspace
├── tsconfig.json                  # TypeScript config
├── .env.example
└── README.md
```

---

## 📱 CAS Applications (apps/)

### 1. Web Dashboard (`apps/web/`)
**Tech:** Next.js 14, React, TypeScript, Tailwind
**Purpose:** Visual control panel for CAS

**Features:**
- Service status monitoring
- Start/stop services
- Agent task queue
- SADD migration history
- Real-time logs
- Health metrics

**Pages:**
```
/                    → Dashboard overview
/services            → Service management
/agent               → Agent control & history
/sadd                → Application discovery & migration
/projects            → Multi-project management
/settings            → Configuration
```

---

### 2. Backend API (`apps/api/`)
**Tech:** Express.js, Node.js, TypeScript, SQLite/Postgres
**Purpose:** Backend for web dashboard + CLI

**Endpoints:**
```
GET  /api/services              → List all services
POST /api/services/:id/start    → Start service
POST /api/services/:id/stop     → Stop service
GET  /api/services/:id/health   → Health check

GET  /api/agent/status          → Agent status
POST /api/agent/start           → Start agent
GET  /api/agent/tasks           → Task queue

GET  /api/sadd/features         → List features
POST /api/sadd/extract          → Extract feature
POST /api/sadd/mirror           → Mirror to platform

GET  /api/projects              → List projects
GET  /api/health                → Overall health
```

---

### 3. CLI (`apps/cli/`)
**Tech:** Commander.js, TypeScript
**Purpose:** Command-line interface

**Commands:**
```bash
# Service management
cas start [service]
cas stop [service]
cas status
cas restart [service]

# Agent
cas agent start
cas agent stop
cas agent status

# SADD
cas sadd discover
cas sadd extract <feature>
cas sadd mirror <feature> <platform>

# Project management
cas project add <path>
cas project list
cas project switch <name>
```

---

### 4. Documentation Site (`apps/docs/`)
**Tech:** Nextra or Docusaurus
**Purpose:** Public documentation website

**Sections:**
- Getting Started
- Service Orchestration
- Autonomous Agent
- SADD Guide
- API Reference
- Architecture

---

## 📦 Shared Packages (packages/)

### 1. Core (`packages/core/`)
**Purpose:** Core business logic shared by all apps

**Exports:**
- ServiceOrchestrator
- HealthMonitor
- ContextEngine
- ConfigManager

**Used by:** API, CLI, Web

---

### 2. Agent (`packages/agent/`)
**Purpose:** Autonomous agent logic

**Exports:**
- TaskExecutor
- TaskScheduler
- JiraIntegration
- GitHubIntegration

**Used by:** API, CLI

---

### 3. SADD (`packages/sadd/`)
**Purpose:** Application discovery & migration

**Exports:**
- FeatureExtractor
- AdaptationEngine
- RepoDiscovery

**Used by:** API, CLI

---

### 4. UI (`packages/ui/`)
**Purpose:** Shared React components

**Exports:**
- ServiceCard
- HealthIndicator
- LogViewer
- TaskQueue

**Used by:** Web

---

### 5. Types (`packages/types/`)
**Purpose:** Shared TypeScript types

**Exports:**
```typescript
export interface Service {
  name: string
  status: 'running' | 'stopped' | 'degraded'
  port?: number
  health?: HealthStatus
}

export interface Task {
  id: string
  type: 'jira' | 'github' | 'manual'
  status: 'pending' | 'running' | 'completed' | 'failed'
}
```

**Used by:** All apps and packages

---

## 🔄 Data Flow

```
User Action (CLI or Web)
    ↓
Backend API (apps/api)
    ↓
Core Logic (packages/core)
    ↓
Service Orchestrator
    ↓
Docker/System Services
    ↓
Health Monitor
    ↓
Database + WebSocket
    ↓
Web Dashboard (real-time updates)
```

---

## 🗄️ Database Schema

**Technology:** SQLite (dev) / Postgres (production)

```sql
-- Services
CREATE TABLE services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  port INTEGER,
  last_started TIMESTAMP,
  health_status TEXT
);

-- Agent Tasks
CREATE TABLE agent_tasks (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  source TEXT,
  status TEXT NOT NULL,
  created_at TIMESTAMP,
  completed_at TIMESTAMP,
  result JSON
);

-- SADD Migrations
CREATE TABLE sadd_migrations (
  id TEXT PRIMARY KEY,
  feature TEXT NOT NULL,
  source_platform TEXT NOT NULL,
  target_platform TEXT NOT NULL,
  version TEXT,
  status TEXT,
  created_at TIMESTAMP
);

-- Projects
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  framework TEXT,
  services JSON,
  created_at TIMESTAMP
);
```

---

## 🚀 Development Workflow

```bash
# Install all apps and packages
npm install

# Start all CAS services in development
npm run dev

# This starts:
# - Web dashboard: http://localhost:3000
# - Backend API: http://localhost:8080
# - Docs site: http://localhost:3001

# Build for production
npm run build

# Deploy
npm run deploy
```

---

## 📊 Comparison: Current vs Full-Stack

| Aspect | Current | Full-Stack Vision |
|--------|---------|-------------------|
| **Structure** | Loose scripts in packages/ | Proper apps/ + packages/ |
| **Frontend** | None | Next.js dashboard |
| **Backend** | None | Express API |
| **Database** | JSON files | SQLite/Postgres |
| **CLI** | Bash scripts | Professional Node CLI |
| **Documentation** | Markdown only | Interactive docs site |
| **Real-time** | None | WebSockets |
| **Authentication** | None | User auth |
| **Multi-user** | No | Yes |

---

## 🎯 Migration Plan

### Phase 1: Restructure (Now)
- Move current code to proper app/package structure
- Create apps/ and packages/ folders
- Reorganize existing code

### Phase 2: Backend API (Q1 2026)
- Build Express API
- Add SQLite database
- RESTful endpoints
- Health monitoring

### Phase 3: Web Dashboard (Q2 2026)
- Build Next.js frontend
- Service management UI
- Real-time monitoring
- Agent control panel

### Phase 4: Enhanced CLI (Q2 2026)
- Professional CLI with Commander
- Interactive prompts
- Better error handling
- Auto-completion

### Phase 5: Documentation Site (Q3 2026)
- Nextra/Docusaurus site
- API documentation
- Guides and tutorials
- Examples

---

## 🏁 End State

**CAS becomes:**
- ✅ Full-stack DevOps platform
- ✅ Web dashboard for visual control
- ✅ REST API for integrations
- ✅ Professional CLI
- ✅ Database-backed state
- ✅ Multi-project support
- ✅ Real-time monitoring
- ✅ Autonomous agent
- ✅ Application migration (SADD)

**Similar to:**
- Docker Desktop (service management + UI)
- Vercel (CLI + Dashboard)
- Kubernetes Dashboard
- PM2 + PM2 Web

---

## 📋 Next Steps

1. **Immediate:** Restructure cas/ to apps/ + packages/
2. **Short-term:** Build basic API
3. **Medium-term:** Build web dashboard
4. **Long-term:** Full platform launch

---

**Status:** Architectural design complete
**Ready to:** Restructure cas/ folder
**Goal:** Transform CAS into full-stack application platform
