# The Missing Infrastructure Layer for Enterprise AI

**A Founder Thesis**
Michael Quan, Tutorwise — 2026

---

## The Insight

In 2013, software engineering had a capability problem that looks familiar today.

Developers could write powerful applications. But deploying, scaling, and operating them reliably was expensive, unpredictable, and required deep specialist knowledge. The gap was not in what software could do. The gap was in the infrastructure to run it consistently at scale.

Docker solved that gap. Not by making better software — by making a better *unit of deployment*. The container. And with it, the entire DevOps ecosystem followed: registries, orchestrators, namespaces, health probes, rolling deployments.

**We are at the exact same inflection point for AI agents.**

Enterprises can access frontier AI capability from a dozen providers today. What they cannot do is *run AI reliably at the scale of a real business*. The gap is not model quality. The gap is orchestration infrastructure — the missing layer between "AI can do this" and "AI does this, in production, auditably, every day."

Tutorwise has built that layer. We call it **iPOM** — the Intelligent Platform Orchestration Model. And we built it the same way the best DevOps engineers would have: by applying container engineering patterns, one-for-one, to AI agents.

---

## The Market Timing

Three forces are converging right now:

**1. Enterprises are drowning in AI point solutions.**
The average enterprise now has 12+ AI tools in use across departments, with no coherent operational model. Gartner estimates that 85% of enterprise AI projects fail to move from pilot to production. The bottleneck is always the same: there is no orchestration layer.

**2. The agent paradigm is crossing the chasm.**
2024–2025 saw the emergence of autonomous AI agents as a credible enterprise category. Every major platform (Microsoft, Salesforce, ServiceNow) is racing to claim the orchestration layer. The market is forming — but the architectural winner is not yet decided.

**3. The DevOps generation is now in enterprise leadership.**
The engineers who built Docker, Kubernetes, and the container ecosystem are now CTOs, VPs of Engineering, and Head of Platform roles. They think in registries, namespaces, and control planes. A solution that speaks their language has a structural sales advantage.

---

## The Architecture

iPOM maps the proven container engineering stack to AI agents with deliberate precision:

```
Container Ecosystem          iPOM Equivalent
─────────────────────────    ────────────────────────────────
Container image          →   Agent definition
Docker Registry / ECR    →   Agent Registry (catalogue + topology)
Private Registry         →   AI Agent Studio (build your own)
Public Registry          →   Marketplace (publish and monetise)
Kubernetes namespace     →   Space (department/domain boundary)
Pod                      →   Team (co-located agents, shared context)
Docker Swarm / CI / PID1 →   Swarm / Pipeline / Supervisor patterns
Kubernetes               →   Conductor (the control plane)
Helm / Compose           →   Build Canvas (visual topology editor)
Rolling deployment       →   Shadow → Live promotion model
```

This is not a loose metaphor. It is the actual data model, API surface, and operational UX of the platform. An engineer who has operated Kubernetes can orient to Conductor within minutes.

---

## The Moat

**The orchestration layer is defensible. The models are not.**

Model capability is commoditised. We are deliberately model-agnostic — our platform runs a six-tier fallback chain across xAI, Gemini, DeepSeek, Claude, GPT-4o, and rules-based logic. When a better model ships, we upgrade the provider. We do not rebuild the platform.

The durable advantage is the infrastructure layer — the Agent Registry, the shadow/live promotion model, conformance checking, and the Build Canvas. These take years to build and operate correctly. A competitor who starts today with a new model still needs to build everything we have already shipped.

**The vocabulary is the competitive moat in the market.**

We named things precisely: Spaces, Teams, Agents, Registry, Conductor. These terms are not marketing. They are the exact terms that experienced platform engineers already use. This accelerates sales cycles with technical buyers and reduces the "translation tax" that most AI vendors pay when selling into engineering-led organisations.

---

## The Flywheel

The two-layer architecture creates a network effect that mirrors the Docker Hub flywheel:

```
Users build custom agents in AI Agent Studio
        ↓
Successful agents published to the Marketplace
        ↓
Marketplace agents discovered and deployed by other users
        ↓
Platform operator curates and quality-gates via Conductor
        ↓
More users build, more agents published, Marketplace grows
```

Every agent published to the Marketplace increases the platform's value to every other user. This is the supply-side flywheel that drove Docker Hub from zero to 100 billion pulls. The same structural dynamic applies here.

---

## Why Tutorwise

The founder is not an AI-first engineer who discovered DevOps. He is a **DevOps-first engineer who applied container patterns to AI** — one of the first engineers in the UK to build a production Container as a Service platform using Docker Registry, Swarm, Kubernetes, and OpenShift.

The iPOM architecture is the product of domain expertise applied in a new context — not a pattern borrowed from an industry analyst report. This matters because:

- The data model is correct at the foundation, not retrofitted
- The operational UX reflects how real platform engineers think
- The vocabulary resonates with technical buyers without requiring explanation

The platform is live. The Agent Registry, Build Canvas, Conductor control plane, shadow/live promotion model, conformance checking, and intelligence dashboards are all in production.

---

## The Ask

*[This section to be completed with current round details, use of funds, and key milestones.]*

---

*This document is a companion to the full technical white paper:*
*"AI Digital Workforce Architecture Blueprint" — available on request.*
