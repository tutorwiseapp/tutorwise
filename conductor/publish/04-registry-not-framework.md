# Why Your AI Agent Framework Needs a Registry, Not a Framework

**Author:** Michael Quan
**Type:** Thought leadership article
**Target:** LinkedIn, The New Stack, InfoQ
**Length:** ~1,500 words

---

Every week, a new AI agent framework launches. New abstractions for chaining LLM calls. New ways to define tools. New orchestration patterns. The community celebrates, benchmarks are posted, and everyone migrates their prototypes to the latest thing.

Meanwhile, every enterprise I talk to asks the same question: "We have twelve agents built by three different teams. None of them know about each other. How do we manage this?"

The answer is not another framework. The answer is a registry.

---

## The Framework Trap

Frameworks solve the wrong problem at the wrong layer.

When a team builds an AI agent, the framework handles the mechanics: prompt construction, tool dispatch, memory management, LLM API calls. This is important work. But it is *build-time* work. It ends when the agent is deployed.

The hard problems start after deployment:

- **How many agents do we have?** Nobody knows. They are scattered across repositories, serverless functions, and notebook experiments.
- **What can each agent do?** The answer is buried in code — in system prompts, tool lists, and configuration files that only the original author understands.
- **Which agents are running right now?** Some are on cron jobs. Some are triggered by webhooks. Some are manually invoked. There is no single view.
- **How do agents relate to each other?** Two agents might operate on the same data, serve the same business function, or conflict with each other. Nobody has mapped the relationships.
- **Who is responsible for each agent?** The developer who built it may have left. The team that owns the business function may not know the agent exists.

These are not framework problems. These are *registry* problems. And they are the same problems that container engineering solved a decade ago.

---

## What Container Registries Taught Us

Before container registries, software deployment was chaos. Every team had their own build scripts, their own artifact storage, their own deployment procedures. You could not answer basic questions: "What versions of this service exist? Who published the latest one? What dependencies does it have?"

Container registries (Docker Registry, ECR, GCR, Harbor) solved this by establishing a single source of truth for *what exists*. Not how to build it — what exists, where it is, what version it is, and what it contains.

The registry did not replace the build tool. Docker builds still used Dockerfiles. But the registry gave the organisation a *catalogue* — a shared, searchable, versioned record of every deployable unit.

This is exactly what AI agents need.

---

## The Agent Registry

An Agent Registry is the authoritative catalogue of every AI agent in your organisation. It answers the five questions that frameworks cannot:

### 1. What agents exist?

Every agent is registered with a unique identifier, a human-readable name, a role description, and a department assignment. The registry is the single source of truth.

```
┌─────────────────────────────────────────────────────┐
│ Agent Registry                                       │
├──────────────┬───────────────┬───────────┬──────────┤
│ Slug         │ Role          │ Department│ Status   │
├──────────────┼───────────────┼───────────┼──────────┤
│ ops-monitor  │ Monitors SLAs │ Operations│ Active   │
│ rev-analyst  │ Revenue report│ Finance   │ Active   │
│ onboard-bot  │ New hire setup│ HR        │ Shadow   │
│ code-review  │ PR review     │ Eng       │ Paused   │
└──────────────┴───────────────┴───────────┴──────────┘
```

No more hidden agents. No more "I didn't know that existed."

### 2. What can each agent do?

The registry stores the agent's tool manifest — the list of tools it is authorised to use, with their schemas. This is not buried in a prompt template. It is a first-class, inspectable property of the agent definition.

An agent that can query your CRM, read your support tickets, and post to Slack has a different risk profile than one that can only read a metrics dashboard. The registry makes this visible.

### 3. How are agents organised?

Agents do not operate in isolation. They work in teams — coordinated groups with a shared task and a coordination pattern. And teams belong to spaces — departmental or domain boundaries that provide scope and access control.

```
Space: Operations
  └── Team: Incident Response (supervisor pattern)
      ├── Agent: triage-classifier
      ├── Agent: log-analyser
      ├── Agent: runbook-executor
      └── Coordinator: triage-classifier

Space: Finance
  └── Team: Revenue Analysis (pipeline pattern)
      ├── Agent: data-collector → Agent: analyst → Agent: report-writer
```

This is the AI equivalent of Kubernetes namespaces (spaces) and pods (teams). The registry gives you a topology — not just a flat list of agents, but a structured map of how they relate.

### 4. What is the operational status?

Every agent in the registry has a lifecycle state: active, paused, shadow, deprecated. The registry tracks when each agent last ran, how long it took, whether it succeeded or failed, and what tools it called.

This is the difference between "we have AI agents" and "we operate AI agents." Frameworks tell you how to build. The registry tells you what is running.

### 5. Who owns each agent?

The registry associates every agent with an owner (team or individual), a space (department), and access controls. When an agent misbehaves, you know who to call. When a department is audited, you know which agents operate in their scope.

---

## Why Frameworks Cannot Do This

Frameworks are build tools. They optimise for developer experience at creation time. They are not designed to answer organisational questions at operation time.

Consider the parallel with containers again. A Dockerfile tells you how to build an image. But it does not tell you:
- How many times this image has been deployed
- Which clusters are running it right now
- Whether it passed security scanning
- Who approved the latest version

That is the registry's job. And no amount of Dockerfile improvement will solve it.

Similarly, no amount of LangChain, CrewAI, or AutoGen improvement will tell you how many agents your organisation runs, what data they access, or whether they conflict with each other. Those are registry concerns, and they require registry infrastructure.

---

## The Three-Level Hierarchy

A production-grade Agent Registry organises agents into three levels:

**Level 1: Agents** — Individual units of capability. Each has a role, tools, knowledge, and memory. This is the container image equivalent.

**Level 2: Teams** — Coordinated groups of agents with a shared task. A team has a coordination pattern:
- **Supervisor**: One agent delegates to specialists, then synthesises results. (80% of enterprise use cases.)
- **Pipeline**: Agents execute in sequence, each building on the previous output. Deterministic, auditable.
- **Swarm**: Agents self-select tasks dynamically, handing off to each other based on context. Flexible but harder to predict.

**Level 3: Spaces** — Department or domain boundaries. A space owns teams and agents, controls access, and provides isolation. The finance space cannot see the HR space's agents unless explicitly granted access.

This hierarchy is not arbitrary. It maps directly to how enterprises already think about their organisations:
- Departments (spaces) contain functional teams (teams) staffed by specialists (agents).
- The hierarchy provides natural boundaries for access control, audit, and compliance.

---

## What Changes When You Have a Registry

**Onboarding accelerates.** A new team member opens the registry, sees every agent in their department, understands what each one does, and knows who owns it. No archaeology through codebases.

**Duplication disappears.** Before building a new agent, you search the registry. The compliance monitoring agent you were about to spend three weeks building already exists in the Legal space — and it has a 94% conformance rate across six months of production use.

**Governance becomes possible.** The CISO can see every agent that accesses customer data. The compliance team can audit which agents operate in regulated domains. The CFO can see how many AI runs each department consumes. None of this is possible when agents are scattered across repositories.

**Composition becomes natural.** Need to build a new workflow? Browse the registry for existing agents, compose them into a team, assign a coordination pattern, and deploy. The registry becomes a component catalogue, and teams become the assembly layer.

---

## The Uncomfortable Truth

The AI agent ecosystem is infatuated with frameworks because frameworks are fun to build. Registries are not fun. They are infrastructure. They are the boring, essential, unsexy layer that makes everything else work.

But if you look at the history of every successful platform — containers, packages, APIs — the registry always wins. npm is more durable than any JavaScript framework. Docker Hub outlasted Docker Swarm. The Python Package Index will outlive every ML framework built on top of it.

The same will be true for AI agents. Frameworks will keep churning. The registry will endure.

If you are building AI agents for your enterprise, stop asking "which framework should we use?" and start asking "where is our registry?"

---

*Michael Quan is the founder of Tutorwise, the first AI Tutor Marketplace — where a production-grade agent orchestration system, built on the same engineering patterns as Kubernetes, runs real business operations daily. He was among the first engineers in the UK to build a Container as a Service (CaaS) platform.*
