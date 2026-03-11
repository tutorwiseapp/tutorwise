# AI Digital Workforce Architecture Blueprint

**Document type:** Platform Architecture Blueprint
**Status:** Living document — v1.0
**Author:** Michael Quan, Tutorwise
**Date:** 2026-03-11

---

## 1. Executive Summary

Tutorwise is not a tutoring marketplace with AI bolted on. It is an **AI-native labour platform** built on an agent orchestration substrate called **iPOM** — the Intelligent Platform Orchestration Model.

iPOM solves the hardest problem in applied AI: moving from a single capable AI agent to a coordinated, auditable, production-grade system of agents that operate reliably at the scale of a real business. The architectural DNA of iPOM is drawn directly from container engineering — the discipline that solved the same problem for software services a decade ago.

This document captures the conceptual foundation, two-layer architecture, and engineering vocabulary of iPOM for technical audiences, design partners, and future engineering teams.

---

## 2. The Problem — Orchestrating AI at Scale

Single AI agents are powerful. They are also unpredictable, stateless, and difficult to operate at scale. The enterprise AI market is converging on a well-understood gap:

> **The gap is not model capability. The gap is orchestration infrastructure.**

Organisations can now access frontier AI capability through any major provider. What they cannot buy off the shelf is:

- A structured way to define *what agents exist* and what they are responsible for
- A runtime that coordinates agents according to reliable patterns (sequential, parallel, delegating)
- An operational plane to monitor, audit, promote, and roll back agent behaviour
- A separation of concerns between agent *definition* (what it can do) and agent *execution* (what it is currently doing)

Container engineering solved an identical set of problems for software services between 2013 and 2018. iPOM applies the same proven engineering patterns to AI agents.

---

## 3. The Founding Insight — DevOps as the Design Pattern

The iPOM architecture was conceived by the platform's founder, who was among the first engineers in the United Kingdom to build a production **Container as a Service (CaaS)** platform — encompassing Docker Registry, Docker Swarm, Kubernetes, and OpenShift — before these became mainstream enterprise offerings.

That experience surfaces a direct and non-obvious structural isomorphism:

> **AI agents are to business automation what containers are to software delivery.**

Both are discrete, portable units of capability. Both need registries, schedulers, namespaces, and health monitoring. Both require a control plane to manage their lifecycle without operators touching individual instances.

### The Translation Table

| Container / DevOps Concept | iPOM Equivalent | Notes |
|---|---|---|
| **Container image** | **Agent definition** (`specialist_agents`) | Immutable description of what the agent is and can do |
| **Docker Registry / ECR** | **Agent Registry** (Agents + Teams + Spaces trio) | The authoritative catalogue of available agents |
| **Private Registry** | **AI Agent Studio** | User-facing workspace to build, configure, and store custom agents |
| **Public Registry (Docker Hub)** | **Marketplace** | Published, discoverable agents available to all platform users |
| **Namespace** | **Space** (`agent_spaces`) | Domain/departmental boundary — isolates scope, owned by a function |
| **Pod** | **Team** (`agent_teams`) | A co-located group of agents with a shared task and coordination pattern |
| **Container instance** | **Agent run** (`agent_run_outputs`) | One execution of one agent, with logs and output |
| **Docker Swarm** | **Swarm pattern** | Dynamic routing — agents self-select tasks via `NEXT_AGENT` |
| **Pipeline / CI-CD** | **Pipeline pattern** | Topological sort, sequential handoffs, deterministic flow |
| **Supervisord / PID 1** | **Supervisor pattern** | One coordinator delegates to workers, synthesises results |
| **Kubernetes** | **Conductor** (`/admin/conductor`) | The control plane — schedules, monitors, promotes, audits |
| **Helm Chart / Compose file** | **Build Canvas** | Declarative visual editor for composing agent topologies |
| **K8s Deployment / ReplicaSet** | **Workflow process** | The desired state specification for a multi-step business process |
| **Atomic OS / Container runtime** | **Sage** | The end-user AI runtime — thin, immutable, purpose-built per session |
| **kubectl / K9s** | **Conductor dashboard** | The operator interface to inspect, debug, and manage the fleet |
| **RBAC / Namespaces** | **Space permissions** | Multi-tenant isolation — RLS + `created_by`, space-scoped access |
| **Health probes** | **Monitoring agents** | retention-monitor, operations-monitor — scheduled checks on platform health |
| **Rolling deployment** | **Shadow → Live promotion** | Run new process in shadow mode, validate conformance, then promote |

This is not a loose metaphor. The API surface, data model, and operational UX of iPOM were consciously designed so that an engineer who has operated Kubernetes can orient to iPOM within minutes.

---

## 4. Two-Layer Architecture

iPOM is structured in two distinct layers with different audiences.

### Layer 1 — User-Facing AI Layer

This layer is what platform users (tutors, clients, agents, organisations) interact with. It provides AI capability as a service.

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER-FACING AI LAYER                        │
├──────────────────┬──────────────────┬───────────────────────────┤
│       Sage       │  AI Agent Studio │       Marketplace         │
│                  │                  │                           │
│  Docker +        │  Build Tool +    │  Public Registry          │
│  Atomic OS       │  Private Registry│  (Docker Hub equivalent)  │
│                  │                  │                           │
│  Thin, immutable │  Build, name,    │  Browse, deploy, and      │
│  AI runtime      │  configure, and  │  monetise published       │
│  per session     │  store custom    │  agent products           │
│                  │  agents          │                           │
└──────────────────┴──────────────────┴───────────────────────────┘
```

- **Sage** is the AI tutor runtime. Like a container runtime on an Atomic OS, it is thin, stateless, and purpose-built. It does not carry business logic — it runs what it is given.
- **AI Agent Studio** is the user's private build environment. Users define custom AI agents, configure their skills, and store them privately — exactly as engineers push custom images to a private ECR repository.
- **Marketplace** is the public catalogue. Agents published to the Marketplace are discoverable by all platform users — the public Docker Hub of the platform.

### Layer 2 — Platform Orchestration Layer

This layer is invisible to end users. It is operated by the platform team via the **Conductor** admin dashboard.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                       PLATFORM ORCHESTRATION LAYER (iPOM)                    │
├──────────────────────┬───────────────────────┬───────────────────────────────┤
│     Conductor        │    Agent Registry     │       Build Canvas            │
│                      │                       │                               │
│  Kubernetes          │  ECR / Service        │  Helm Chart / Compose         │
│  Control Plane       │  Registry             │  Visual editor for            │
│                      │                       │  agent topologies             │
│  Schedules, audits,  │  Agents  + Teams +   │                               │
│  promotes, monitors  │  Spaces  (the trio)   │  Drag-and-drop agent          │
│  all agent activity  │                       │  composition inside           │
│                      │  Authoritative source │  Teams and Spaces             │
│  Shadow → Live       │  of what agents exist │                               │
│  promotion model     │  and are available    │  Save → PUT teams/{id}        │
│                      │  to run               │                               │
└──────────────────────┴───────────────────────┴───────────────────────────────┘
```

- **Conductor** is the Kubernetes equivalent. It exposes a full operational dashboard: agent run history, process execution timelines, conformance checking, shadow mode monitoring, intelligence dashboards, and go-live checklists.
- **Agent Registry** is the service registry — the trio of Agents, Teams, and Spaces tabs. It is the authoritative source of what agents exist, what teams they belong to, and what business domain (Space) owns them.
- **Build Canvas** is the visual declarative editor. Like Helm or Docker Compose, it lets operators compose agent topologies without writing code — drag an agent from the left palette onto a team canvas, wire relationships, save.

---

## 5. iPOM Hierarchy — Space > Team > Agent

The three-level hierarchy is the core data model of iPOM.

```
Space (Namespace / Department)
 └── Team (Pod / Service group)
      └── Agent (Container / Microservice)
```

### Space

A Space is a domain boundary. It maps to a business department or function: Engineering, Marketing, Operations, Analytics, Go-to-Market. Like a Kubernetes namespace, it provides:

- Isolation of ownership and permissions
- A grouping scope for related Teams
- A colour-coded identity for visual navigation

Built-in Spaces: `go-to-market`, `engineering`, `operations`, `analytics`, `marketing`.

### Team

A Team is a co-located group of agents with a defined coordination pattern. Like a Kubernetes Pod, all agents in a Team share context (via `AgentTeamState`) and are scheduled together.

Three coordination patterns (analogous to Docker Swarm, CI pipeline, and supervisor daemons):

| Pattern | Analogy | Behaviour |
|---|---|---|
| **Supervisor** | Supervisord / PID 1 | Coordinator delegates tasks to workers; aggregates and synthesises results |
| **Pipeline** | CI/CD pipeline | Agents execute in topological dependency order; each passes output to the next |
| **Swarm** | Docker Swarm | Dynamic task routing; agents self-select via `NEXT_AGENT` in their output |

### Agent

An Agent is the atomic unit of capability. It maps to a container image: a defined role, a set of tools, a department affiliation, a status (active/inactive), and a configuration. Agents are defined once in the Registry and can be instantiated (run) many times.

Built-in agents: `developer`, `tester`, `qa`, `engineer`, `security`, `marketer`, `analyst`, `planner`, `market-intelligence`, `retention-monitor`, `operations-monitor`.

---

## 6. Vocabulary — Digital Workforce and Agent Registry

### Agent Registry

The trio of Agents, Teams, and Spaces is referred to collectively as the **Agent Registry**. The term is deliberately chosen to align with the engineering mental model:

- Docker Registry / ECR — the source of truth for container images
- Service Registry (Consul, etcd) — the source of truth for running services
- **Agent Registry** — the source of truth for AI agents available on the platform

The Agent Registry is both a *catalogue* (what exists) and a *topology store* (how agents are grouped into teams and spaces).

### Digital Workforce

The collective noun for the AI agents operating on the platform is the **Digital Workforce**. This term positions AI agents as functional workers within the business — not tools, not scripts, but participants in business processes with defined roles, responsibilities, and oversight.

The Digital Workforce is:
- **Defined** in the Agent Registry
- **Composed** in the Build Canvas
- **Scheduled and monitored** by the Conductor
- **Delivered** to users via Sage, AI Agent Studio, and the Marketplace

### Digital Force

**Digital Force** is the external/brand-facing term for the same concept. Where "Digital Workforce" is operational and internal, "Digital Force" is strategic and external — the capability surface that Tutorwise offers to organisations and enterprises: a deployable force of specialised AI workers, coordinated by an enterprise-grade control plane.

---

## 7. The Operational Model — Shadow Before Live

A key architectural property inherited from container operations is the **shadow deployment model**. New business processes are not switched on directly. They are:

1. Deployed in **shadow mode** — they observe real events and execute in parallel with existing logic, but their outputs do not affect production state
2. Monitored for **conformance** — conformance checker compares actual execution paths against the declared process graph, flagging deviations
3. Validated against a **go-live checklist** — 50 clean shadow runs, zero open deviations, coordinator assigned, shadow stats reviewed
4. **Promoted** to live via the Conductor dashboard — a single operator action that flips `execution_mode` from `shadow` to `live`

This mirrors the rolling deployment and canary release patterns from container operations. It provides the same guarantee: operators never flip a switch in the dark.

---

## 8. Competitive Moat

The iPOM architecture provides structural advantages that are difficult for point-solution competitors to replicate:

**1. Orchestration is the moat, not the models.**
Model capability is commoditised. The platform is model-agnostic by design (6-tier fallback: xAI → Gemini → DeepSeek → Claude → GPT-4o → rules-based). The durable advantage is the orchestration infrastructure — the Agent Registry, Conductor, shadow promotion model, conformance checking.

**2. The vocabulary is the UX.**
Spaces, Teams, Agents, Registry, Conductor — these terms are not marketing. They are precise technical terms that experienced engineers immediately understand. This accelerates adoption among technical buyers and reduces onboarding friction.

**3. The two-layer model enables a marketplace flywheel.**
- Platform users build custom agents in AI Agent Studio (private registry)
- Successful agents can be published to the Marketplace (public registry)
- Marketplace agents can be discovered and deployed by other users
- Platform operator curates, monitors, and quality-gates published agents via Conductor
- This creates a supply-side flywheel identical to the container image marketplace that drove Docker Hub's adoption

**4. Enterprise readiness from day one.**
The shadow/live promotion model, conformance checking, RBAC via Spaces, audit logs, and go-live checklists are not features added for enterprise — they are load-bearing structural elements. This means enterprise requirements are met architecturally, not retrofitted.

---

## 9. Roadmap Implications

The DevOps trajectory is a reliable roadmap predictor. The container ecosystem followed a clear evolution:

| Container Era | Timeline | iPOM Equivalent | Status |
|---|---|---|---|
| Image format standardised (OCI) | 2015 | Agent definition schema (`specialist_agents`) | Live |
| Private registries (ECR, GCR) | 2015–16 | AI Agent Studio (private) | Partial |
| Public marketplace (Docker Hub) | 2013–17 | Marketplace | Partial |
| Orchestration wars (Swarm vs K8s) | 2016–18 | Conductor — single opinionated orchestrator | Live |
| Helm / package management | 2016–18 | Build Canvas | Live |
| Service mesh (Istio, Linkerd) | 2018–20 | Agent-to-agent communication layer | Roadmap |
| Observability stack (Prometheus) | 2018–20 | Intelligence dashboards + metrics pipeline | Live |
| GitOps (Flux, ArgoCD) | 2019–21 | Declarative process definitions + shadow promotion | Live (partial) |
| Multi-tenancy / multi-cluster | 2019–22 | Multi-tenant Spaces (RLS + created_by) | Architecture ready |
| Platform engineering (IDP) | 2021–present | Conductor as Internal Developer Platform for AI | Vision |

The next natural evolution in the DevOps trajectory — **service mesh** and **GitOps** — maps to:

- **Agent communication protocol**: A defined interface for agent-to-agent calls, with circuit-breaking, retries, and observability
- **GitOps for processes**: Workflow process definitions stored as version-controlled YAML, promoted through environments via Conductor — eliminating the current UI-only configuration path

---

## 10. Technical Appendix — Key File Locations

| Concept | Location |
|---|---|
| Agent Registry — Agents | `apps/web/src/app/(admin)/admin/conductor/` (Agents tab) |
| Agent Registry — Teams | same page, Teams tab |
| Agent Registry — Spaces | same page, Spaces tab |
| Build Canvas | `apps/web/src/components/feature/conductor/BuildCanvas.tsx` |
| Build Palette (drag-and-drop) | `apps/web/src/components/feature/conductor/BuildPalette.tsx` |
| Build Properties Drawer | `apps/web/src/components/feature/conductor/BuildPropertiesDrawer.tsx` |
| Build Store (Zustand) | `apps/web/src/components/feature/conductor/build-store.ts` |
| Conductor admin page | `apps/web/src/app/(admin)/admin/conductor/page.tsx` |
| TeamRuntime (Pod scheduler) | `apps/web/src/lib/workflow/team-runtime/TeamRuntime.ts` |
| SpecialistAgentRunner (agent executor) | `apps/web/src/lib/agent-studio/SpecialistAgentRunner.ts` |
| PlatformWorkflowRuntime (process engine) | `apps/web/src/lib/process-studio/runtime/` |
| DB schema — agents | `specialist_agents` table |
| DB schema — teams | `agent_teams` table |
| DB schema — spaces | `agent_spaces` table |
| DB schema — executions | `workflow_executions`, `workflow_tasks` tables |
| DB schema — conformance | `conformance_deviations` table |
| Solution design (implementation) | `conductor/conductor-solution-design.md` |

---

*This document captures the conceptual and architectural foundation of iPOM. For implementation details, API routes, database schemas, and migration history, see [conductor-solution-design.md](conductor-solution-design.md).*
