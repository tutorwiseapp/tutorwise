# CAS Roadmap 2026-2030
**Contextual Autonomous System** – AI-powered continuous delivery platform
**Last updated**: February 15, 2026
**Owner**: Michael Quan
**Current Phase**: Phase 2 (Partial Automation & Intelligence)

---

## Vision

Transform CAS from a TutorWise development tool into an AI-powered autonomous development environment that eliminates manual DevOps overhead, enabling developers to focus purely on building products while CAS handles orchestration, monitoring, and self-healing autonomously.

**CAS** = Contextual intelligence + Autonomous execution + System-wide integration

---

## Current Status (February 2026)

### Autonomy Level: 45%
- All 8 agents active (Security & Marketer activated Feb 13, 2026)
- Hybrid mode fully operational
- Documentation restructured & centralised paths
- Sage fork from Lexi initiated – role-aware structure (Tutor/Agent/Client/Student) planned
- Project detection, service orchestration, and basic health monitoring complete

### Active Agents
| Agent | Status | Primary Function |
|-------|--------|------------------|
| Planner | Active | Task breakdown, sprint planning |
| Analyst | Active | Requirements analysis, research |
| Developer | Active | Code generation, implementation |
| Tester | Active | Test creation, quality assurance |
| QA | Active | Integration testing, bug verification |
| Engineer | Active | Infrastructure, DevOps |
| Security | Active | Vulnerability scanning, compliance |
| Marketer | Active | Beta traction, analytics |

### Key Metrics
- **Projects Managed:** 1 (TutorWise)
- **Services Managed:** 18+ types
- **AI Assistants:** 2 (Lexi, Sage)
- **Platform Status:** Internal tool (production)

---

## 2026 Roadmap

### Q1 2026 – Phase 2: Partial Automation & Intelligence
**Target Autonomy:** 60%

#### Core Infrastructure
- [ ] Git commit auto-plan updater (real-time plan syncing)
- [ ] Lightweight message bus with standardised JSON envelope (shared with Sage/Lexi)
- [ ] Version/protocol field on message bus for future A2A/MCP compatibility
- [ ] Capability manifests for all 8 agents

#### AI Integration
- [ ] OpenAI-compatible tool calling interface for internal actions
- [ ] DSPy framework integration (optimised prompting for Lexi & Sage)
- [ ] One-time ingestion pipeline for tutor/agent PowerPoint materials → Sage knowledge layer (pgvector)

#### Intelligence Features
- [ ] Predictive failure prevention using historical data (including role-specific student errors)
- [ ] Weekly self-optimisation retrospective task
- [ ] Pattern recognition in agent logs

**Next Milestone (End Feb 2026):**
- First auto-plan update from git commit
- Standardised message envelope implementation
- PowerPoint → pgvector seeding complete

---

### Q2 2026 – Phase 3: Reliability & Visibility
**Target Autonomy:** 70%

#### Monitoring & Dashboards
- [ ] CAS monitoring dashboard (real-time agent status, message history)
- [ ] Lexi + Sage metrics by role (Tutor/Agent/Client/Student)
- [ ] Service dependency graph visualisation
- [ ] Alert management & routing

#### Guardrails & Security
- [ ] Full predictive guardrails across all agents
- [ ] Tutoring accuracy validation per role
- [ ] Automated security gating in deployment pipeline
- [ ] Compliance audit logging

#### Analytics
- [ ] Expanded analytics for Marketer agent:
  - Beta traction metrics
  - Referral/conversion tracking
  - Sage usage by Tutor/Agent/Client/Student roles
- [ ] Time-series data collection (InfluxDB integration)
- [ ] Centralised provider cost dashboard (Lexi + Sage token usage)
- [ ] AI accuracy monitoring (Lexi resolution rate + Sage curriculum accuracy)

---

### Q3-Q4 2026 – Phase 4: Full Autonomy & Ecosystem
**Target Autonomy:** 85%

#### Autonomous Operations
- [ ] Near-zero human orchestration (agents self-assign and execute)
- [ ] Self-healing workflows (auto-fix recurring blocker patterns)
- [ ] Tutoring pattern auto-correction by role
- [ ] Intelligent retry with exponential backoff
- [ ] Auto-restart failed services

#### Ecosystem & Extensibility
- [ ] Public plugin system for community/third-party agents
- [ ] Sage role/subject extensions API
- [ ] Integration marketplace foundation

#### Advanced Features
- [ ] Multimodal monitoring (voice summaries, visual dashboards)
- [ ] AI-powered root cause analysis (Claude API integration)
- [ ] Natural language error explanations
- [ ] Prepare for external A2A protocols (MCP/A2A spec compatibility)

---

## 2027+ Vision

### Phase 5: AI-Powered Platform (2027)
**Target Autonomy:** 95%

#### Advanced AI Capabilities
- Natural language interface: "CAS, optimise my API for traffic spike"
- Automatic performance tuning (cache strategies, query optimisation)
- Security vulnerability auto-patching
- Cost optimisation (auto-scale, resource right-sizing)
- Predictive development workflow (detect issues pre-deploy)

#### Multi-Environment Orchestration
- Manage dev/staging/prod environments
- Configuration drift detection
- Safe deployment pipelines with automatic rollback
- Environment parity enforcement

#### Self-Learning System
- Reinforcement learning loop for optimal strategies
- Auto-tune monitoring thresholds
- A/B test recovery strategies
- Learn from entire TutorWise usage patterns

---

### Phase 6: Platform Evolution (2028+)
**Target Autonomy:** 99%

#### Platform Options
If CAS proves valuable beyond TutorWise:
- **Option A:** Open-source CAS Agent (community tool)
- **Option B:** CAS Cloud Dashboard (SaaS offering)
- **Option C:** Plugin marketplace with revenue sharing

#### Advanced Platform Features (if pursued)
- Multi-tenant architecture
- Team collaboration features
- REST & GraphQL APIs
- SSO/SAML authentication
- Multi-cloud orchestration (AWS/GCP/Azure abstraction)

---

## Guiding Principles

1. **Single source of truth:** Markdown plans in `/cas/agents/*/planning/`
2. **Continuous flow:** No sprints – weekly milestones only
3. **Human-in-the-loop:** Only for strategy & final approval
4. **Leverage TutorWise stack:** Supabase, Ably, pgvector, DSPy
5. **Light future-proofing:** Standardised messages, capability manifests, OpenAI tool interface
6. **Iterative approach:** Start simple, add complexity only when proven necessary

---

## Technical Stack Evolution

### Current (2026)
| Layer | Technology |
|-------|------------|
| Language | TypeScript, Bash |
| Storage | JSON files, Supabase (PostgreSQL) |
| Vectors | pgvector |
| Real-time | Ably |
| AI | Claude API, Gemini API |
| Monitoring | Custom health checks |

### Target (2027)
| Layer | Technology |
|-------|------------|
| Language | TypeScript (primary), Python (ML/DSPy) |
| Storage | Supabase, InfluxDB (metrics) |
| Vectors | pgvector (with DSPy optimisation) |
| Real-time | Ably, WebSockets |
| AI | Claude API, DSPy pipelines |
| Monitoring | Prometheus, custom dashboard |

---

## Key Performance Indicators

### Technical KPIs
| Metric | Current | Q2 2026 | Q4 2026 | 2027 |
|--------|---------|---------|---------|------|
| Autonomy Level | 45% | 60% | 85% | 95% |
| MTTR (Mean Time To Recovery) | 15 min | 5 min | 1 min | 10 sec |
| Uptime SLA | 95% | 99% | 99.5% | 99.9% |
| Issues Prevented | 10% | 50% | 80% | 95% |
| Manual Interventions/Week | 8 | 3 | 1 | 0.1 |

### Agent Performance KPIs
| Metric | Current | Target |
|--------|---------|--------|
| Plan accuracy | 70% | 95% |
| Task completion rate | 80% | 98% |
| Self-healing success | 30% | 90% |
| Cross-agent coordination | Manual | Autonomous |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CAS Platform                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Planner   │  │   Analyst   │  │  Developer  │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│  ┌──────┴────────────────┴────────────────┴──────┐              │
│  │              Message Bus (JSON Envelope)       │              │
│  │         + Capability Manifests + A2A Ready     │              │
│  └──────┬────────────────┬────────────────┬──────┘              │
│         │                │                │                      │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐              │
│  │   Tester    │  │   Engineer  │  │   Security  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │     QA      │  │  Marketer   │  │  Dashboard  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│                    AI Assistants                                 │
│  ┌─────────────────────────┐  ┌─────────────────────────┐       │
│  │         Lexi            │  │          Sage           │       │
│  │   (General Assistant)   │  │    (AI Tutor - Roles)   │       │
│  │                         │  │  Tutor/Agent/Client/    │       │
│  │                         │  │       Student           │       │
│  └─────────────────────────┘  └─────────────────────────┘       │
├─────────────────────────────────────────────────────────────────┤
│                    Infrastructure                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Supabase │  │ pgvector │  │   Ably   │  │   DSPy   │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Appendix: Feature Checklist

### Q1 2026 Features
- [ ] Git commit auto-plan updater
- [ ] Message bus JSON envelope
- [ ] Capability manifests (8 agents)
- [ ] OpenAI-compatible tool interface
- [ ] DSPy framework integration
- [ ] PowerPoint → pgvector pipeline
- [ ] Predictive failure prevention
- [ ] Weekly self-optimisation task
- [ ] A2A/MCP protocol fields

### Q2 2026 Features
- [ ] CAS monitoring dashboard
- [ ] Role-based Sage/Lexi metrics
- [ ] Predictive guardrails
- [ ] Automated security gating
- [ ] Marketer analytics expansion
- [ ] Time-series data collection

### Q3-Q4 2026 Features
- [ ] Agent self-assignment
- [ ] Self-healing workflows
- [ ] Plugin system foundation
- [ ] Multimodal monitoring
- [ ] AI root cause analysis
- [ ] A2A protocol compatibility

---

**Document Version:** 2.0.0
**Supersedes:** cas/docs/guides/cas-roadmap.md, docs/project-management/autonomous-ai-system-summary.md
**Next Review:** April 2026
