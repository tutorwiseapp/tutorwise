# CAS DESIGN AND IMPLEMENTATION

**Master Design and Implementation Document**
**Version**: 1.0
**Date**: 2025-11-01
**Status**: Active
**Type**: Single Source of Truth

---

## Table of Contents

1. [Introduction](#introduction)
2. [Architecture Overview](#architecture-overview)
3. [System Design](#system-design)
4. [Agent Implementation](#agent-implementation)
5. [Workflow Orchestration](#workflow-orchestration)
6. [Technology Stack](#technology-stack)
7. [Implementation Details](#implementation-details)
8. [Agent Documentation Reference](#agent-documentation-reference)
9. [Integration Points](#integration-points)
10. [Maintenance and Operations](#maintenance-and-operations)

---

## Introduction

### Purpose

This document serves as the **single source of truth** for the CAS (Contextual Autonomous System) design and implementation. It provides a comprehensive overview of how CAS is architected, how it works, and how all components integrate together.

**This document continues from [CAS-USER-GUIDE.md](CAS-USER-GUIDE.md)** which covers user-facing workflows and daily usage patterns.

### What is CAS?

**CAS (Contextual Autonomous System)** is an AI-powered development framework that models a complete software product team through 8 specialized autonomous agents working together to deliver production-quality software.

### Evolution

```
Phase 1: Framework Mode (Current - Oct 2025)
  ├─ Mental model for development
  ├─ Manual workflows with automation
  └─ 8 agent personas guide thinking

Phase 2: Partial Automation (Planned - Q2 2025)
  ├─ Auto-update plans from git commits
  ├─ Auto-generate reports
  └─ Cost: ~$100/month

Phase 3: Hybrid Automation (Planned - Q3 2025)
  ├─ Auto-draft PRs (human approval)
  ├─ Auto-run test suites
  └─ Cost: ~$500/month

Phase 4: Full Autonomy (Vision - 2026)
  ├─ Overnight development
  ├─ 8 agents fully operational
  ├─ Claude API integration
  └─ Cost: ~$3,000/month
```

**Current State**: CAS operates in **Framework Mode** (also called "Hybrid Mode"), serving as a mental model and quality framework rather than an autonomous system.

---

## Architecture Overview

### System Layers

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│        (CAS Commands, NPM Scripts, Claude Code)         │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              Planner Orchestration Layer                 │
│     (Coordination, Workflow, Blocker Detection)         │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                  Agent Execution Layer                   │
│  Planner │ Analyst │ Developer │ Tester │ QA │ etc.    │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              Shared Context & Communication              │
│        (Auto-maintained plans, todos, reports)          │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    Tools & Services                      │
│     Testing │ Database │ API │ Deployment │ etc.       │
└─────────────────────────────────────────────────────────┘
```

### Directory Structure

```
cas/
├── agents/                          # 8 Agent implementations
│   ├── planner/                     # Project Manager
│   │   ├── README.md               # Role definition
│   │   └── workflows/              # Coordination workflows
│   ├── analyst/                    # Business Analyst
│   │   ├── README.md               # Role definition
│   │   ├── requirements/           # Requirements docs
│   │   └── planning/
│   │       └── cas-feature-req-plan.md
│   ├── developer/                   # Software Developer
│   │   ├── README.md               # Role definition
│   │   ├── implementation/         # Code implementation
│   │   └── planning/
│   │       └── cas-feature-dev-plan.md  # ← AUTO-MAINTAINED
│   ├── tester/                      # QA Tester
│   │   ├── README.md               # Role definition
│   │   └── planning/
│   │       └── cas-feature-test-plan.md
│   ├── qa/                          # QA Engineer
│   │   ├── README.md               # Role definition
│   │   └── planning/
│   │       └── cas-feature-qa-plan.md
│   ├── security/                    # Security Engineer
│   │   ├── README.md               # Role definition
│   │   └── planning/
│   │       └── cas-feature-sec-plan.md
│   ├── engineer/                    # System Engineer
│   │   ├── README.md               # Role definition
│   │   └── planning/
│   │       └── cas-system-imp-plan.md  # ← AUTO-MAINTAINED
│   └── marketer/                    # Product Marketing
│       ├── README.md               # Role definition
│       └── planning/
│           └── cas-marketing-plan.md
│
├── docs/                            # Shared documentation
│   ├── cas-architecture-detailed.md  # Detailed architecture
│   ├── proven-patterns.md          # Code patterns library
│   ├── design-system.md            # UI design system
│   ├── feature-development-checklist.md # Quality gates
│   └── guides/
│       ├── cas-overview.md         # High-level overview
│       └── cas-implementation-tracker.md # Feature tracking
│
├── scripts/                         # Automation scripts
│   └── update-dev-plan.sh          # Plan timestamp updater
│
├── CAS-USER-GUIDE.md               # User guide (prerequisite)
├── CAS-DESIGN-AND-IMPLEMENTATION.md # This document
└── package.json                    # CAS commands
```

---

## System Design

### Core Principles

1. **Simplification Through Unification**
   - Merged CAS + GUARD into unified system
   - Clear agent responsibilities
   - Single source of truth

2. **Enterprise Team Model**
   - Models real product team structure
   - Specialized roles with clear boundaries
   - Natural workflow handoffs

3. **Autonomous Coordination** (Future)
   - Agents share context automatically
   - Self-organizing work distribution
   - Blocker detection without human intervention

4. **Auto-Maintained Documentation**
   - Plans update from todos and reports
   - Always reflect current state
   - No manual sync required

5. **Scalability**
   - Add new agent types as needed
   - Grows with platform
   - Modular architecture

### The 8 Agents

```
                    ┌─────────────┐
                    │   Planner   │
                    │     (PM)    │
                    └──────┬──────┘
                           │
            ┌──────────────┼──────────────┐
            ↓              ↓              ↓
      ┌─────────┐    ┌──────────┐   ┌─────────┐
      │ Analyst │    │Developer │   │ Tester  │
      │  (BA)   │ →  │  (SWE)   │ → │  (QA)   │
      └─────────┘    └──────────┘   └────┬────┘
                                          │
                           ┌──────────────┼──────────────┐
                           ↓              ↓              ↓
                     ┌─────────┐    ┌──────────┐   ┌─────────┐
                     │   QA    │    │ Security │   │Engineer │
                     │(QA Lead)│    │ (SecEng) │   │(SysEng) │
                     └─────────┘    └──────────┘   └────┬────┘
                                                         │
                                                         ↓
                                                   ┌─────────┐
                                                   │Marketer │
                                                   │  (PMM)  │
                                                   └─────────┘
```

**Agent Mapping:**

| Agent | Role | GUARD Pillar | Responsibilities |
|-------|------|--------------|------------------|
| **Planner** | Product Manager | - | Sprint planning, coordination, blocker detection |
| **Analyst** | Business Analyst | Governance | Requirements, user research, acceptance criteria |
| **Developer** | Software Engineer | - | Feature implementation, unit tests, code review |
| **Tester** | QA Tester | Assurance | Test implementation, coverage reports |
| **QA** | QA Lead | Usability | Accessibility, visual regression, quality gates |
| **Security** | Security Engineer | Defence | Auth testing, vulnerability scans, security |
| **Engineer** | Systems Engineer | Reliability | API implementation, infrastructure, deployment |
| **Marketer** | Product Marketing | - | Analytics, user behavior, adoption metrics |

---

## Agent Implementation

### 1. Planner Agent

**Reference**: [agents/planner/README.md](agents/planner/README.md)

**Role**: Autonomous project manager and team coordinator

**Key Responsibilities**:
- Sprint planning and goal setting
- Agent task assignment and coordination
- Blocker detection and resolution
- Progress tracking and reporting
- Inter-agent workflow orchestration

**Typical Workflow**:
1. Define sprint goals
2. Break down features into tasks
3. Assign tasks to agents
4. Monitor progress continuously
5. Detect and resolve blockers
6. Generate status reports

**Key Decisions**:
- Which features to prioritize
- When to defer work
- How to resolve blockers
- Resource allocation across agents

### 2. Analyst Agent

**Reference**: [agents/analyst/README.md](agents/analyst/README.md)

**Role**: Requirements analysis and user research

**Key Responsibilities**:
- Gather and document requirements
- Conduct user research
- Create user stories and acceptance criteria
- Validate feature completeness
- Maintain product roadmap alignment

**Typical Workflow**:
1. Receive feature request from Planner
2. Research user needs
3. Document requirements
4. Create acceptance criteria
5. Hand off to Developer

**Deliverables**:
- Requirements documents
- User stories
- Acceptance criteria
- Research findings

### 3. Developer Agent

**Reference**: [agents/developer/README.md](agents/developer/README.md)

**Role**: Feature implementation and code quality

**Key Responsibilities**:
- Implement features from requirements
- Write unit tests
- Create Storybook stories
- Perform code reviews
- **Auto-maintain cas-feature-dev-plan.md**

**Typical Workflow**:
1. Receive task from Planner
2. Read requirements from Analyst
3. Implement feature (TodoWrite tracks tasks)
4. Write tests
5. **Auto-update feature plan** from todos
6. Hand off to Tester

**Auto-Maintained Plan**: [agents/developer/planning/cas-feature-dev-plan.md](agents/developer/planning/cas-feature-dev-plan.md)

**Plan Structure**:
```markdown
# CAS Feature Development Plan

**Auto-maintained by Developer Agent**
**Last Updated:** 2025-10-08

## Current Sprint: Week N

### Feature: [Name] [Status]
Status: [Complete | In Progress | Blocked | Deferred]

#### Implementation Todos (Auto-tracked)
- [x] Component structure
- [x] Form validation
- [ ] Edge case handling

#### Test Results (from Tester Agent)
✅ Unit Tests: X/Y passing (Z%)
✅ Coverage: XX.XX%

#### QA Review (from QA Agent)
✅ Accessibility: [Status]
✅ Visual Regression: [Status]
```

### 4. Tester Agent

**Reference**: [agents/tester/README.md](agents/tester/README.md)

**Role**: Test implementation and validation

**Key Responsibilities**:
- Write unit tests
- Write integration tests
- Write E2E tests
- Generate coverage reports
- Report test results to Developer and Planner

**Typical Workflow**:
1. Receive code from Developer
2. Write comprehensive tests
3. Run test suites
4. Generate coverage reports
5. Report failures/blockers to Planner
6. Update Developer's feature plan with results

**Deliverables**:
- Unit test suites
- Integration tests
- E2E test scenarios
- Coverage reports
- Test results summary

### 5. QA Agent

**Reference**: [agents/qa/README.md](agents/qa/README.md)

**Role**: Quality assurance and usability validation

**Key Responsibilities**:
- Accessibility testing (WCAG 2.1 AA)
- Visual regression testing (Percy)
- Usability testing
- Cross-browser compatibility
- Performance testing

**Typical Workflow**:
1. Receive passing tests from Tester
2. Run accessibility scans
3. Create Percy snapshots
4. Test cross-browser
5. Approve or reject for production

**Deliverables**:
- Accessibility reports
- Visual regression snapshots
- Cross-browser test results
- Quality approval/rejection

### 6. Security Agent

**Reference**: [agents/security/README.md](agents/security/README.md)

**Role**: Security validation and vulnerability management

**Key Responsibilities**:
- Authentication/authorization testing
- Vulnerability scanning
- Security best practices enforcement
- Dependency security audits
- Penetration testing

**Typical Workflow**:
1. Receive feature from QA
2. Run security scans
3. Test authentication flows
4. Check for vulnerabilities
5. Report security issues to Planner

**Deliverables**:
- Security scan reports
- Vulnerability assessments
- Auth/authz test results
- Security clearance approval

### 7. Engineer Agent

**Reference**: [agents/engineer/README.md](agents/engineer/README.md)

**Role**: Infrastructure and system implementation

**Key Responsibilities**:
- API implementation
- Database design and migrations
- Infrastructure as code
- Performance monitoring
- Deployment automation
- **Auto-maintain cas-system-imp-plan.md**

**Typical Workflow**:
1. Receive deployment request from Planner
2. Implement API endpoints
3. Create database migrations
4. Deploy to production
5. **Auto-update system plan**
6. Monitor performance

**Auto-Maintained Plan**: [agents/engineer/planning/cas-system-imp-plan.md](agents/engineer/planning/cas-system-imp-plan.md)

**Plan Structure**:
```markdown
# CAS System Implementation Plan

**Auto-maintained by Engineer Agent**
**Last Updated:** 2025-10-08

## Backend API Services

### [Service Name]
Status: [Operational | In Development | Degraded]

#### Endpoints Implemented
✅ POST /api/endpoint
✅ GET /api/endpoint

#### Performance Metrics
- Average Response Time: Xms
- Error Rate: X.XX%
- Uptime: XX.X%

## Database Infrastructure

### Tables
✅ table_name
  - Columns: [list]
  - Indexes: [list]

### Migrations Applied
✅ 001_migration_name.sql
```

### 8. Marketer Agent

**Reference**: [agents/marketer/README.md](agents/marketer/README.md)

**Role**: Analytics and user engagement

**Key Responsibilities**:
- Usage analytics tracking
- User behavior analysis
- A/B testing coordination
- Feature adoption metrics
- Marketing campaign tracking

**Typical Workflow**:
1. Receive feature launch from Engineer
2. Set up analytics tracking
3. Monitor user adoption
4. Report metrics to Planner

**Deliverables**:
- Analytics setup
- User behavior reports
- Adoption metrics
- A/B test results

---

## Workflow Orchestration

### Feature Implementation Flow

```
1. Planner assigns feature
        ↓
2. Analyst creates requirements
        ↓
3. Developer implements feature
        ↓ (TodoWrite tracks tasks)
        ↓ (cas-feature-dev-plan.md auto-updates)
        ↓
4. Tester writes and runs tests
        ↓ (Updates Developer's plan with results)
        ↓
5. QA validates quality
        ↓ (Accessibility, visual regression)
        ↓ (Updates Developer's plan with approval)
        ↓
6. Security scans for vulnerabilities
        ↓ (Reports to Planner)
        ↓
7. Engineer deploys to production
        ↓ (cas-system-imp-plan.md auto-updates)
        ↓
8. Marketer sets up analytics
        ↓
Feature Complete ✅
```

### Blocker Detection and Resolution

**Blocker Types**:

1. **Developer Blocker**: Incomplete implementation blocks Tester
   - Detection: Tester waiting, Developer has incomplete tasks
   - Resolution: Planner reassigns work to Developer

2. **Test Failure Blocker**: Failing tests block QA
   - Detection: Tester reports failures, QA waiting
   - Resolution: Planner routes back to Developer

3. **Security Blocker**: Vulnerabilities block deployment
   - Detection: Security reports issues, Engineer waiting
   - Resolution: Planner routes back to Developer/Engineer

4. **Infrastructure Blocker**: System issues block development
   - Detection: Engineer reports infrastructure problems
   - Resolution: Planner prioritizes infrastructure work

### Sprint Planning Process

**Planner's Sprint Creation**:

1. Load roadmap
2. Select features for sprint
3. Break down features into tasks
4. Estimate effort
5. Assign tasks to agents
6. Define goals and success criteria
7. Notify all agents

**Example Sprint**:
```markdown
## Week 1 Sprint

**Goals**:
1. Complete Profile editing feature
2. Complete Professional Info template (Tutor)
3. Establish testing infrastructure
4. Onboarding auto-save API

**Duration**: 5 days (40 hours capacity)

**Assignments**:
- Analyst: Requirements (1h)
- Developer: Implementation (16h)
- Tester: Testing (4h)
- QA: Visual regression (3h)
- Engineer: API implementation (3h)
- Security: Security scans (1h)

**Success Criteria**:
- ProfilePage: Production-ready
- TutorProfessionalInfoForm: >80% test coverage
- Percy: Visual regression integrated
- OnboardingAPI: Functional
```

---

## Technology Stack

### Current Implementation

**Languages**:
- TypeScript (main development language)
- Bash (automation scripts)
- Markdown (documentation)

**Frameworks**:
- Node.js (runtime)
- npm workspaces (monorepo structure)

**Tools**:
- Claude Code (AI assistant with TodoWrite)
- Git (version control)
- Jest (unit testing)
- Playwright (E2E testing)
- Percy (visual regression)

### Future Enhancements

**Phase 2** (Planned):
- Express.js (backend API)
- SQLite/Postgres (database)
- WebSockets (real-time communication)

**Phase 3** (Planned):
- Next.js (web dashboard)
- Recharts (visualization)
- Docker (containerization)

**Phase 4** (Vision):
- Claude API (AI-to-AI communication)
- ML models (predictive analysis)
- Multi-cloud deployment

---

## Implementation Details

### Auto-Maintained Plans

**Two Core Plans**:

1. **cas-feature-dev-plan.md** (Developer Agent)
   - Location: `cas/agents/developer/planning/cas-feature-dev-plan.md`
   - Auto-updated from: Claude Code TodoWrite, test results, QA reviews
   - Updates: Feature implementation progress

2. **cas-system-imp-plan.md** (Engineer Agent)
   - Location: `cas/agents/engineer/planning/cas-system-imp-plan.md`
   - Auto-updated from: System implementation todos, deployment reports
   - Updates: Infrastructure and API status

**Update Mechanism** (Future):

```typescript
// cas/core/plan-updater.ts

export interface PlanUpdate {
  feature: string;
  todos: Todo[];
  source: 'claude_code' | 'report' | 'agent';
  timestamp: Date;
}

export abstract class PlanUpdater {
  abstract planPath: string;

  async updatePlan(update: PlanUpdate): Promise<void> {
    // 1. Load current plan
    const plan = await this.loadPlan();

    // 2. Parse plan structure
    const parsed = this.parsePlan(plan);

    // 3. Update relevant sections
    const updated = this.updateSections(parsed, update);

    // 4. Generate markdown
    const markdown = this.generateMarkdown(updated);

    // 5. Save plan
    await this.savePlan(markdown);

    // 6. Notify Planner
    await this.notifyPlanner(update);
  }
}
```

### Communication Patterns (Future)

**Message Types**:

```typescript
export enum MessageType {
  // Assignment messages (Planner → Agent)
  TASK_ASSIGNED = 'task_assigned',

  // Status messages (Agent → Planner)
  TASK_STARTED = 'task_started',
  TASK_COMPLETED = 'task_completed',
  TASK_BLOCKED = 'task_blocked',

  // Handoff messages (Agent → Agent)
  CODE_READY = 'code_ready',              // Developer → Tester
  TESTS_PASSING = 'tests_passing',         // Tester → QA
  QUALITY_APPROVED = 'quality_approved',   // QA → Security/Engineer
  SECURITY_CLEARED = 'security_cleared',   // Security → Engineer
  DEPLOYED = 'deployed',                   // Engineer → Marketer
}
```

### Configuration

**System Configuration**:
```typescript
// cas/config/cas.config.ts

export const casConfig = {
  system: {
    name: 'Enhanced CAS',
    version: '2.0',
    environment: process.env.NODE_ENV
  },

  agents: {
    planner: {
      enabled: true,
      sprintDuration: 5, // days
      dailyCapacity: 8, // hours
    },
    developer: {
      enabled: true,
      autoUpdatePlan: true,
      planPath: 'cas/agents/developer/planning/cas-feature-dev-plan.md',
      testCoverageThreshold: 80
    },
    engineer: {
      enabled: true,
      autoUpdatePlan: true,
      planPath: 'cas/agents/engineer/planning/cas-system-imp-plan.md',
    }
  }
};
```

---

## Agent Documentation Reference

### Complete Agent Documentation

Each agent has detailed documentation in their respective README files:

1. **[Planner Agent](agents/planner/README.md)**
   - Sprint planning workflows
   - Coordination strategies
   - Blocker detection algorithms

2. **[Analyst Agent](agents/analyst/README.md)**
   - Requirements gathering process
   - User research methodologies
   - Acceptance criteria templates

3. **[Developer Agent](agents/developer/README.md)**
   - Implementation standards
   - Code review guidelines
   - Auto-plan update mechanism

4. **[Tester Agent](agents/tester/README.md)**
   - Unit test strategies
   - Integration test patterns
   - E2E test scenarios

5. **[QA Agent](agents/qa/README.md)**
   - Accessibility testing (WCAG 2.1 AA)
   - Visual regression setup (Percy)
   - Cross-browser testing

6. **[Security Agent](agents/security/README.md)**
   - Security scan procedures
   - Vulnerability assessment
   - Auth/authz testing

7. **[Engineer Agent](agents/engineer/README.md)**
   - API implementation patterns
   - Database migration strategies
   - Deployment procedures

8. **[Marketer Agent](agents/marketer/README.md)**
   - Analytics setup
   - User behavior tracking
   - A/B testing coordination

### Supporting Documentation

**Pattern Libraries**:
- [docs/proven-patterns.md](docs/proven-patterns.md) - Code patterns and best practices
- [docs/design-system.md](docs/design-system.md) - UI component patterns

**Quality Standards**:
- [docs/feature-development-checklist.md](docs/feature-development-checklist.md) - Quality gates

**Architecture Details**:
- [docs/cas-architecture-detailed.md](docs/cas-architecture-detailed.md) - Complete architecture (2,400 lines)

**Implementation Tracking**:
- [docs/guides/cas-implementation-tracker.md](docs/guides/cas-implementation-tracker.md) - Feature tracking

---

## Integration Points

### Claude Code Integration

**TodoWrite Tool**:
- Developer agent monitors Claude Code todos
- Completed todos automatically update cas-feature-dev-plan.md
- Provides real-time feature progress tracking

**Workflow**:
```
Claude Code TodoWrite
        ↓
Developer completes task
        ↓
Developer agent extracts todos
        ↓
cas-feature-dev-plan.md updated
        ↓
Planner notified of changes
```

### Git Integration

**Plan Timestamp Updates**:
```bash
# Update Developer Plan
cd cas && npm run cas:update-plan

# Script: scripts/update-dev-plan.sh
# - Updates Last Updated timestamp
# - Shows recent git commits
# - No manual editing required
```

### Testing Infrastructure Integration

**Jest** (Unit Tests):
- Tester agent writes unit tests
- Developer runs: `npm test`
- Coverage reports feed into cas-feature-dev-plan.md

**Playwright** (E2E Tests):
- Tester agent writes E2E scenarios
- Developer runs: `npx playwright test`
- Results feed into test reports

**Percy** (Visual Regression):
- QA agent creates snapshots
- Automated comparison on CI/CD
- Results feed into QA reports

---

## Maintenance and Operations

### Daily Operations

**Start of Day**:
```bash
# Check current plan
cd cas && npm run cas:view-plan

# Review patterns
cat cas/docs/proven-patterns.md

# Check agent status
cd cas && npm run cas:status
```

**During Development**:
- Use TodoWrite in Claude Code sessions
- Follow quality checklists from session-template.md
- Think through agent perspectives (Planner, Analyst, etc.)

**End of Day**:
```bash
# Update plan timestamp
cd cas && npm run cas:update-plan

# Manually edit plan if needed
vim cas/agents/developer/planning/cas-feature-dev-plan.md
```

### Weekly Maintenance

**Review Tasks**:
1. Update Developer Plan:
   ```bash
   vim cas/agents/developer/planning/cas-feature-dev-plan.md
   npm run cas:update-plan
   ```

2. Review Quality Metrics:
   - Test coverage trends
   - Features completed vs planned
   - Lessons learned section

### Monthly Maintenance

**Review Tasks**:
1. Review Agent Documentation:
   - Update agent READMEs if roles change
   - Refresh proven patterns based on learnings
   - Archive old features in plan

2. Update Architecture:
   - Review this document for accuracy
   - Update diagrams if structure changes
   - Document new patterns

### Success Metrics

**Quality**:
- [ ] Features consistently well-tested (>80% coverage)
- [ ] Fewer bugs reaching production
- [ ] Consistent code patterns across features

**Velocity**:
- [ ] Faster feature completion
- [ ] Less time debugging
- [ ] Clear next steps at session end

**Documentation**:
- [ ] Plans reflect reality
- [ ] Easy to onboard new devs
- [ ] Patterns documented and reused

---

## AI Infrastructure (Lexi, Sage, DSPy)

### Overview

CAS orchestrates three AI systems:

1. **Lexi** - Platform support assistant (help, navigation)
2. **Sage** - AI tutor (teaching, learning)
3. **DSPy** - Automatic prompt optimization

```
┌─────────────────────────────────────────────────────────────────┐
│                         CAS CORE                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │      Lexi       │  │      Sage       │  │      DSPy       │ │
│  │   (Support)     │  │    (Tutor)      │  │  (Optimizer)    │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           │                    │                    │          │
│           └──────────┬─────────┴────────────────────┘          │
│                      ▼                                          │
│           ┌─────────────────────┐                              │
│           │   Message Bus       │                              │
│           │ (Standardized JSON) │                              │
│           └─────────┬───────────┘                              │
│                     ▼                                           │
│           ┌─────────────────────┐                              │
│           │    ai_feedback      │                              │
│           │   (Unified table)   │                              │
│           └─────────────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

### Message Bus Architecture

All AI agents communicate via standardized message envelopes:

```typescript
// cas/messages/envelope.ts

interface MessageEnvelope {
  id: string;                    // UUID
  from: string;                  // "sage" | "lexi" | "cas:planner"
  to: string;                    // Target agent/service
  type: string;                  // "feedback" | "request" | "response"
  payload: unknown;              // Typed per message type
  correlation_id?: string;       // Request/response matching
  timestamp: string;             // ISO 8601
  version: string;               // Protocol version
}
```

### DSPy Optimization Pipeline

Weekly automated prompt optimization:

```
┌─────────────────────────────────────────────────────────────────┐
│                   DSPy OPTIMIZATION PIPELINE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. COLLECT (Production)                                        │
│     ai_feedback table → sage_sessions → lexi_sessions           │
│                                                                  │
│  2. OPTIMIZE (Python - Weekly Cron)                             │
│     cas/optimization/run_dspy.py                                │
│     - Load training data from Supabase                          │
│     - Run DSPy BootstrapFewShot                                 │
│     - Export optimized prompts to JSON                          │
│                                                                  │
│  3. DEPLOY (GitHub Actions)                                     │
│     - Commit optimized_prompts.json                             │
│     - TypeScript loads at runtime                               │
│     - Hot-swap without restart                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**File Structure:**
```
cas/optimization/
├── run_dspy.py              # Weekly optimization runner
├── signatures/              # DSPy signature definitions
│   ├── maths_solver.py
│   ├── explain_concept.py
│   └── diagnose_error.py
├── metrics/                 # Quality metrics
│   └── tutoring_metrics.py
├── data/                    # Data loading
│   └── loader.py
└── output/
    └── optimized_prompts.json
```

### Capability Manifests

Each Lexi/Sage persona has a capability manifest for discovery:

```json
// sage/personas/tutor/capabilities.json
{
  "name": "Sage Tutor Persona",
  "version": "1.0.0",
  "capabilities": [
    "create_lesson_plan",
    "review_student_work",
    "generate_worksheet",
    "explain_for_student"
  ],
  "subjects": ["maths", "english", "science", "general"],
  "tiers": ["GCSE", "A-Level"],
  "tool_calling": true
}
```

### Database Schema (Shared)

```sql
-- ai_feedback (shared between Lexi & Sage)
CREATE TABLE ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT NOT NULL,        -- 'sage' | 'lexi'
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  rating TEXT,                     -- 'thumbs_up' | 'thumbs_down'
  comment TEXT,
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback"
  ON ai_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can read all"
  ON ai_feedback FOR SELECT
  USING (auth.role() = 'service_role');
```

### GitHub Actions Workflow

```yaml
# .github/workflows/dspy-optimize.yml
name: DSPy Prompt Optimization

on:
  schedule:
    - cron: '0 3 * * 0'  # Weekly Sunday 3am
  workflow_dispatch:

jobs:
  optimize:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install -r cas/optimization/requirements.txt

      - name: Run optimization
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          GOOGLE_AI_API_KEY: ${{ secrets.GOOGLE_AI_API_KEY }}
        run: python cas/optimization/run_dspy.py --all

      - name: Commit results
        run: |
          git config user.name "CAS Bot"
          git config user.email "cas@tutorwise.com"
          git add sage/prompts/optimized.json
          git commit -m "chore: Update DSPy optimized prompts" || true
          git push
```

---

## Migration Path: Framework to Full Autonomy

### Evolution Overview

CAS can evolve from a **framework/mental model** to a **fully autonomous system** through 4 distinct phases. Each phase adds capabilities while increasing cost and complexity.

```
Framework Mode → Plan Automation → Hybrid Automation → Full Autonomy
     $0/mo           $100/mo           $500/mo           $3,000/mo
   (Current)      (Q2 2025)         (Q3 2025)          (2026)
```

### Phase 1: Framework Mode (CURRENT - Oct 2025)

**Status**: ✅ ACTIVE

**What CAS Does**:
- ✅ **Mental Model**: 8 agent personas guide thinking
- ✅ **Quality Framework**: Checklists ensure completeness
- ✅ **Pattern Library**: Proven patterns and design system
- ✅ **Plan Tracking**: Manual updates with automated timestamps
- ✅ **Session Structure**: Templates for consistent workflow

**What CAS Does NOT Do**:
- ❌ **No Autonomous Execution**: Won't run overnight
- ❌ **No Auto-PR Creation**: Manual git commits required
- ❌ **No Jira/GitHub Integration**: No task polling
- ❌ **No Claude API Calls**: No AI-to-AI communication

**How It Works**:
1. Developer thinks through agent perspectives manually
2. Uses TodoWrite tool in Claude Code sessions
3. Follows quality checklists from templates
4. Manually updates plans at end of day
5. Reviews patterns before coding

**Cost**: **$0/month** (manual execution only)

**Time Investment**:
- Initial Setup: 6 hours (COMPLETE ✅)
- Weekly Maintenance: 15-30 mins (manual plan updates)
- Per-Session Overhead: 5 mins (check plan, review patterns)

**Benefits**:
- Zero cost
- Full control
- Proven to improve code quality
- Reduces bugs through systematic thinking

**Limitations**:
- Requires manual discipline
- No overnight development
- Human must drive all workflows

---

### Phase 2: Plan Automation (PLANNED - Q2 2025)

**Status**: 📋 Planned

**New Capabilities**:
- ✅ **Auto-update plans** from git commits
- ✅ **Auto-generate morning reports** (what was done, what's next)
- ✅ **Plan sync** across agents automatically
- ✅ **Basic metrics tracking** (velocity, coverage trends)
- ✅ **Automated reminders** (stale plans, missing tests)

**Still Manual**:
- ❌ Feature implementation (human writes code)
- ❌ PR creation (human creates PRs)
- ❌ Test writing (human writes tests)
- ❌ Deployment decisions (human approves)

**Technical Implementation**:
```typescript
// Auto-update plans from git
export class GitPlanSync {
  async syncFromGitCommits() {
    const commits = await git.log({ since: '1 day ago' });
    const features = extractFeaturesFromCommits(commits);

    for (const feature of features) {
      await featurePlanUpdater.updatePlan({
        feature: feature.name,
        todos: feature.completedTasks,
        source: 'git',
        timestamp: new Date()
      });
    }
  }
}

// Generate morning report
export class MorningReporter {
  async generateReport() {
    const yesterday = await this.analyzeYesterday();
    const today = await this.planToday();

    return {
      completed: yesterday.features,
      inProgress: today.features,
      blockers: await this.detectBlockers(),
      velocity: this.calculateVelocity(yesterday)
    };
  }
}
```

**Cost**: **~$100/month** (limited Claude API calls)
- ~50 API calls/day for plan updates
- ~30 API calls/day for report generation

**Time Saved**: ~5 hours/week (no manual plan updates)

**Benefits**:
- Plans always current
- Morning standup automated
- Better visibility into progress
- Pattern recognition from git history

**Limitations**:
- Still no autonomous coding
- No automated PR creation
- Human must review all updates

---

### Phase 3: Hybrid Automation (PLANNED - Q3 2025)

**Status**: 📋 Planned

**New Capabilities**:
- ✅ **Auto-draft PRs** (human approval required)
- ✅ **Auto-run test suites** (on code changes)
- ✅ **Intelligent blocker detection** (predict before they happen)
- ✅ **Auto-generate test stubs** (human fills in logic)
- ✅ **Code review assistance** (suggest improvements)
- ✅ **Automated documentation updates** (from code changes)

**Still Manual**:
- ❌ Final PR approval (human reviews)
- ❌ Production deployment (human approves)
- ❌ Complex architectural decisions (human decides)
- ❌ Breaking change decisions (human decides)

**Technical Implementation**:
```typescript
// Auto-draft PRs
export class PRDrafter {
  async draftPR(branch: string) {
    const diff = await git.diff('main', branch);
    const analysis = await claude.analyze(diff);

    const pr = {
      title: analysis.suggestedTitle,
      body: analysis.generatedDescription,
      labels: analysis.suggestedLabels,
      reviewers: analysis.suggestedReviewers
    };

    // Create draft PR (not published)
    await github.createDraftPR(pr);

    // Notify human for review
    await this.notifyHuman(pr);
  }
}

// Predictive blocker detection
export class PredictiveBlockers {
  async predictBlockers() {
    const patterns = await this.analyzeHistoricalBlockers();
    const currentState = await this.getCurrentState();

    // ML model predicts likely blockers
    const predictions = await this.mlModel.predict({
      patterns,
      currentState,
      timeOfDay: new Date().getHours(),
      velocity: this.currentVelocity
    });

    return predictions.filter(p => p.confidence > 0.7);
  }
}
```

**Cost**: **~$500/month** (moderate Claude API usage)
- ~200 API calls/day for PR drafting
- ~100 API calls/day for code analysis
- ~50 API calls/day for blocker prediction

**Time Saved**: ~10 hours/week (automated PR drafts, test stubs, reviews)

**Benefits**:
- Faster PR creation
- Better code review coverage
- Proactive blocker prevention
- Automated test coverage

**Limitations**:
- Human must review all PRs
- No autonomous deployment
- No overnight development
- Limited architectural decisions

---

### Phase 4: Full Autonomy (VISION - 2026)

**Status**: 🔮 Vision

**New Capabilities**:
- ✅ **Overnight development** (wake up to completed features)
- ✅ **8 agents fully operational** (autonomous coordination)
- ✅ **Claude API integration** (AI-to-AI communication)
- ✅ **Autonomous bug fixing** (detect and fix automatically)
- ✅ **Self-optimizing workflows** (learns from patterns)
- ✅ **Predictive architecture** (suggests improvements)
- ✅ **Automated deployment** (to staging, human approves production)

**Still Manual** (5% of work):
- ❌ Business logic decisions (strategic direction)
- ❌ Major architecture changes (fundamental redesign)
- ❌ Compliance policy changes (legal requirements)
- ❌ Emergency overrides (critical incidents)

**How It Works**:

**Evening (6pm)**:
```
Human: "CAS, please implement the notification badge component"

Planner:
  ├─ Analyzes request
  ├─ Creates sprint plan
  ├─ Assigns to Analyst
  └─ Sets deadline: tomorrow 9am

Analyst (6:05pm):
  ├─ Researches notification patterns
  ├─ Creates requirements doc
  ├─ Defines acceptance criteria
  └─ Hands off to Developer

Developer (6:15pm):
  ├─ Implements component
  ├─ Writes unit tests
  ├─ Creates Storybook stories
  ├─ Auto-updates cas-feature-dev-plan.md
  └─ Hands off to Tester

Tester (7:30pm):
  ├─ Runs test suite (15/15 passing)
  ├─ Generates coverage report (85%)
  ├─ Updates Developer's plan
  └─ Hands off to QA

QA (7:45pm):
  ├─ Runs accessibility scan (WCAG AA: PASS)
  ├─ Creates Percy snapshots (4 created)
  ├─ Cross-browser test (PASS)
  └─ Hands off to Security

Security (8:00pm):
  ├─ Scans for XSS vulnerabilities (NONE)
  ├─ Validates input sanitization (PASS)
  ├─ Security clearance: APPROVED
  └─ Hands off to Engineer

Engineer (8:10pm):
  ├─ Deploys to staging
  ├─ Monitors performance
  ├─ Auto-updates cas-system-imp-plan.md
  └─ Creates draft PR

Planner (8:30pm):
  ├─ Reviews all agent work
  ├─ Marks feature COMPLETE
  └─ Sends morning summary email
```

**Morning (9am)**:
```
Human receives email:
  ✅ Notification badge component complete
  ✅ All tests passing (15/15, 85% coverage)
  ✅ Deployed to staging
  ✅ Draft PR ready for review

  Review PR: https://github.com/.../pull/123
  Staging URL: https://staging.app.com

  Suggested next steps:
  1. Review PR (estimated 15 mins)
  2. Approve for production
  3. Merge and deploy
```

**Technical Implementation**:
```typescript
// Full autonomous orchestration
export class AutonomousOrchestrator {
  async processRequest(request: FeatureRequest) {
    // 1. Planner creates plan
    const sprint = await this.planner.createMiniSprint(request);

    // 2. Execute full workflow autonomously
    const result = await this.executeWorkflow({
      phases: [
        { agent: 'analyst', hours: 0.5 },
        { agent: 'developer', hours: 6 },
        { agent: 'tester', hours: 1 },
        { agent: 'qa', hours: 1 },
        { agent: 'security', hours: 0.5 },
        { agent: 'engineer', hours: 1 }
      ],
      timeline: 'overnight',
      autonomy: 'full'
    });

    // 3. Create PR and notify human
    const pr = await this.createPR(result);
    await this.notifyHuman({
      pr,
      summary: result.summary,
      nextSteps: result.suggestedActions
    });
  }
}

// AI-to-AI communication
export class ClaudeIntegration {
  async executeAgentTask(agent: AgentType, task: Task) {
    const prompt = this.buildAgentPrompt(agent, task);

    // Call Claude API
    const response = await claude.complete({
      prompt,
      model: 'claude-3-opus',
      maxTokens: 10000
    });

    // Parse agent output
    const result = this.parseAgentResponse(response);

    // Update plans
    await this.updatePlans(agent, result);

    // Notify next agent
    await this.handoffToNextAgent(agent, result);

    return result;
  }
}
```

**Cost**: **~$3,000/month** (extensive Claude API usage)
- ~1,000 API calls/day for autonomous development
- ~500 API calls/day for agent coordination
- ~200 API calls/day for code generation
- ~100 API calls/day for analysis and optimization

**ROI Calculation**:
- Developer salary: ~$10,000/month
- CAS cost: $3,000/month
- CAS handles: ~30% of routine development
- Net savings: ~$0 (quality improvement is main benefit)
- **Value**: Consistent quality, overnight development, no human bottlenecks

**Benefits**:
- **24/7 Development**: Wake up to completed features
- **Consistent Quality**: Every feature follows same rigorous process
- **No Human Bottlenecks**: Agents work in parallel
- **Predictive**: Prevents issues before they occur
- **Self-Improving**: Learns from every feature

**Limitations**:
- **Cost**: $3,000/month ongoing
- **Trust**: Requires confidence in autonomous decisions
- **Oversight**: Still need human review of critical changes
- **Complexity**: More moving parts to maintain

---

### Decision Matrix: Which Phase Is Right?

| Criteria | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|----------|---------|---------|---------|---------|
| **Cost** | $0 | $100 | $500 | $3,000 |
| **Time Saved/Week** | 0 hrs | 5 hrs | 10 hrs | 15 hrs |
| **Setup Effort** | 6 hrs ✅ | 20 hrs | 40 hrs | 80 hrs |
| **Autonomy Level** | 0% | 30% | 60% | 95% |
| **Quality Improvement** | ✅ High | ✅ High | ✅ Very High | ✅ Very High |
| **Risk** | None | Low | Medium | High |
| **Best For** | Solo dev, tight budget | Small team | Growing team | Enterprise |

**Recommendations**:

- **Phase 1** (Current): ✅ STAY HERE if:
  - Solo developer or small team
  - Tight budget ($0 preferred)
  - Want quality improvements without cost
  - Comfortable with manual workflows

- **Phase 2**: ⏭️ UPGRADE if:
  - Plan updates taking >30 mins/week
  - Want automated morning reports
  - Budget: $100/month available
  - Ready for light automation

- **Phase 3**: ⏭️ UPGRADE if:
  - Creating >5 PRs/week manually
  - Want predictive blocker detection
  - Budget: $500/month available
  - Team growing, need efficiency

- **Phase 4**: ⏭️ UPGRADE if:
  - Want overnight development
  - Enterprise-scale project
  - Budget: $3,000/month available
  - Trust in autonomous systems

**Current Recommendation for TutorWise**: **Stay in Phase 1**
- Proven to work at $0/month
- Quality improvements achieved
- Solo developer context
- Can revisit Phase 2 in Q2 2025 if needed

---

## Appendix

### Command Reference

**View CAS Documentation**:
```bash
cd cas && npm run cas:help          # Full user guide
cd cas && npm run cas:request       # Task request methods
cd cas && npm run cas:view-plan     # Current plan
cd cas && npm run cas:status        # Plan file status
```

**Update Plans**:
```bash
cd cas && npm run cas:update-plan   # Update timestamp
```

**View Agent Documentation**:
```bash
cat cas/agents/planner/README.md
cat cas/agents/analyst/README.md
cat cas/agents/developer/README.md
cat cas/agents/tester/README.md
cat cas/agents/qa/README.md
cat cas/agents/security/README.md
cat cas/agents/engineer/README.md
cat cas/agents/marketer/README.md
```

**View Supporting Documentation**:
```bash
cat cas/docs/proven-patterns.md
cat cas/docs/design-system.md
cat cas/docs/feature-development-checklist.md
cat cas/docs/cas-architecture-detailed.md
```

### Glossary

- **CAS**: Contextual Autonomous System - AI product team framework
- **Agent**: Autonomous role (planner, developer, tester, etc.)
- **Auto-maintained plan**: Self-updating documentation (future)
- **Blocker**: Task preventing progress
- **Planner**: Project manager agent
- **Orchestration**: Multi-agent workflow coordination
- **Framework Mode**: Current CAS implementation (manual workflows)
- **Hybrid Mode**: Same as Framework Mode
- **GUARD**: Testing framework (merged into CAS agents)

### Related Documentation

**Prerequisites**:
- [CAS-USER-GUIDE.md](CAS-USER-GUIDE.md) - User guide and daily workflows

**Detailed Architecture**:
- [docs/cas-architecture-detailed.md](docs/cas-architecture-detailed.md) - Full architecture details

**Implementation Tracking**:
- [docs/guides/cas-implementation-tracker.md](docs/guides/cas-implementation-tracker.md) - Feature tracking

**High-Level Overview**:
- [docs/guides/cas-overview.md](docs/guides/cas-overview.md) - System overview

**Agent Documentation**:
- Individual agent README files in `cas/agents/*/README.md`

### File Dependencies

```
CAS-USER-GUIDE.md (user-facing)
        ↓
CAS-DESIGN-AND-IMPLEMENTATION.md (this document - design/architecture)
        ↓
        ├─→ agents/*/README.md (individual agent details)
        ├─→ docs/cas-architecture-detailed.md (detailed architecture)
        ├─→ docs/proven-patterns.md (pattern library)
        ├─→ docs/design-system.md (UI patterns)
        └─→ docs/guides/* (supporting guides)
```

---

**Document Version**: 1.0
**Created By**: Claude Code
**Date**: 2025-11-01
**Status**: Active
**Purpose**: Single source of truth for CAS design and implementation
**Prerequisite**: [CAS-USER-GUIDE.md](CAS-USER-GUIDE.md)

---

**Next Steps**:

1. Read [CAS-USER-GUIDE.md](CAS-USER-GUIDE.md) first for daily usage
2. Review this document for architecture understanding
3. Explore individual agent README files for detailed responsibilities
4. Reference [docs/cas-architecture-detailed.md](docs/cas-architecture-detailed.md) for deep technical details
5. Check [docs/proven-patterns.md](docs/proven-patterns.md) before coding
