# External Publishing Plan — AI Digital Workforce Papers

**Owner:** Michael Quan
**Created:** 2026-03-11
**Status:** In progress — papers written, conductor docs updated (2026-03-11), not yet published

---

## What We Are Doing and Why

Michael has built an AI agent orchestration architecture (iPOM) inspired directly by his early DevOps work building one of the UK's first Container as a Service platforms using Docker Registry, Swarm, Kubernetes, and OpenShift.

The architecture is live in production on the Tutorwise platform. The goal of publishing is **not** developer mindshare. It is:

1. **Enterprise credibility** — CTOs and Heads of Engineering at enterprise accounts should be able to read a technically precise document, recognise the container engineering patterns, and conclude: "These people know what they are doing."
2. **Investor narrative** — VCs and angels should read a tight founder thesis that frames the market problem, explains the structural moat, and positions Tutorwise as the infrastructure winner in the enterprise AI orchestration space.

---

## The Two-Paper Strategy

The insight and the audience do not overlap enough to serve both with a single document. We write two separate papers that cross-reference each other.

### Paper 1 — Technical White Paper (enterprise audience)
**File:** `conductor/publish/01-technical-white-paper.md`
**Title:** *AI Digital Workforce Architecture: Applying Container Engineering Patterns to Enterprise AI Orchestration*
**Audience:** CTOs, Heads of Engineering, Platform Architects, VP Engineering
**Length:** ~8 pages
**Structure:**
- Abstract
- 1. Introduction — the orchestration gap
- 2. The container-to-agent isomorphism (full translation table)
- 3. Two-layer architecture (user layer + platform layer)
- 4. iPOM hierarchy — Space > Team > Agent
- 5. Shadow-before-live operational model
- 6. Vocabulary (Agent Registry, Digital Workforce, Digital Force, Conductor, Build Canvas)
- 7. Why this architecture is defensible
- 8. Conclusion

**What it must NOT contain:** internal file paths, table names, migration numbers, Supabase references, any Tutorwise-specific product names. It should read as an architecture paper, not a product doc.

**Key claims it makes:**
- The orchestration gap is real and documented (85% enterprise AI failure rate — Gartner)
- Container engineering patterns map directly to AI agent patterns (translation table)
- The shadow/live promotion model solves the "how do you safely deploy AI to production" problem
- The vocabulary is a competitive asset (engineers understand it without explanation)

### Paper 2 — Investor Thesis (investor/board audience)
**File:** `conductor/publish/02-investor-thesis.md`
**Title:** *The Missing Infrastructure Layer for Enterprise AI*
**Audience:** VCs, angel investors, board members, strategic partners
**Length:** ~4 pages
**Structure:**
- The Insight (the DevOps parallel)
- The Market Timing (3 converging forces)
- The Architecture (condensed translation table)
- The Moat (orchestration > models, vocabulary, flywheel)
- Why Tutorwise (founder credentials, platform is live)
- The Ask (PLACEHOLDER — to be completed with round details)

**Key claims it makes:**
- Model capability is commoditised. Orchestration infrastructure is the moat.
- The marketplace flywheel mirrors Docker Hub's network effect
- The founder has first-principles expertise, not pattern-borrowed insight
- The platform is live — this is not a pitch for something to be built

---

## Internal Reference Document
**File:** `conductor/AI-Digital-Workforce-Blueprint.md`
**Purpose:** Internal engineering reference. Contains the full architecture with implementation details, file paths, DB schema references, and migration history. This is NOT for external publication. It is the source of truth from which the two published papers were derived.

---

## What Still Needs to Be Done Before Publishing

### Paper 1 (White Paper) — Remaining Work
- [ ] **Diagrams** — ASCII diagrams in the current draft need to be replaced with proper visuals before formal publication. Recommended tools: Excalidraw (free, exportable) or Figma. Key diagrams needed:
  - Two-layer architecture (user layer + platform layer)
  - iPOM hierarchy (Space > Team > Agent)
  - Shadow-before-live promotion flow
- [ ] **Add real data points** — the Gartner 85% stat is cited; verify the current figure and add 1–2 additional analyst citations to strengthen the "why now" framing
- [ ] **Legal/IP review** — confirm no IP conflict with naming conventions (Agent Registry, Conductor, Digital Workforce) before publication
- [ ] **Format for venue** — convert from Markdown to PDF (for email distribution) or to the target publication's format

### Paper 2 (Investor Thesis) — Remaining Work
- [ ] **Complete the Ask section** — fill in: raise amount, valuation, use of funds, key milestone the raise funds
- [ ] **Add traction metrics** — current platform stats that demonstrate "live in production" (agent runs, workflow executions, team count, etc.)
- [ ] **Founder bio paragraph** — brief (3–4 sentence) bio for Michael emphasising the DevOps CaaS background, to precede or follow the "Why Tutorwise" section

---

## Publication Venues — Recommended Order

### Phase 1 — Soft launch (internal + warm network)
1. Share Paper 2 (Investor Thesis) with warm investor contacts as a pre-pitch conversation starter
2. Share Paper 1 (White Paper) with potential enterprise design partners / pilot customers
3. Collect feedback — does the framing resonate? Do technical readers immediately "get it"?

### Phase 2 — Owned channels
4. Michael publishes Paper 1 as a **LinkedIn Article** (founder byline)
   - Headline: *"I built one of the UK's first container-as-a-service platforms. Here's what I learned about orchestrating AI agents at scale."*
   - This frames the personal story (DevOps → AI) before the architecture
5. Paper 2 circulates in investor networks alongside the pitch deck

### Phase 3 — External publication (enterprise credibility)
6. Submit Paper 1 to **The New Stack** (thenewstack.io) — target audience is platform engineers and DevOps/cloud-native practitioners
7. Alternatively / additionally: **InfoQ** — enterprise architects and engineering leaders
8. Consider **PlatformCon** or **KubeCon** submission if the conference calendar aligns — the K8s/Conductor parallel is a natural fit for those audiences

---

## How the Two Papers Work Together

```
Enterprise CTO reads White Paper
      ↓
Shares internally — "these people understand platform engineering"
      ↓
Opens evaluation / pilot conversation
      ↓
VC reads Investor Thesis
      ↓
Requests White Paper as technical due diligence
      ↓
Platform is already live — validates the thesis
```

Each paper references the other at the footer, so they travel as a pair without duplicating content.

---

## Key Messaging Anchors (do not dilute these)

These are the three claims that must survive in every version of both papers:

1. **"The orchestration gap, not the model gap"** — the problem is infrastructure, not AI capability
2. **"Container engineering patterns applied to AI agents"** — this is the founding insight and the moat
3. **"The Digital Workforce is not a future concept. It is in production."** — this closes both papers

---

## Other Conductor Docs — Pending Updates

The following docs in `conductor/` were reviewed and updated on 2026-03-11:

| Doc | Update done |
|---|---|
| `conductor-professional-assessment.md` | ✅ No changes needed — already current |
| `conductor-v3-audit.md` | ✅ Superseded banner added |
| `conductor-gdpr-retention-policy.md` | ✅ Added 6 missing tables (agent_run_outputs, agent_team_run_outputs, platform_knowledge_chunks, conformance_deviations, process_patterns, cas_agent_events deprecated note) |
| `conductor-growth-score-all-roles.md` | ✅ No changes needed — `role` column confirmed correct |
| `gtm-intelligence-spec.md` | ✅ `conductor-solution-design-v3.md` → `conductor-solution-design.md` (6 references) |
| 14 intelligence spec files | ✅ All `conductor-solution-design-v3.md` refs updated (mass replace — 24 instances) |
| `process-execution-solution-design.md` | ✅ API routes updated (process-studio → workflow), parent doc reference fixed, component path fixed |
| `process-discovery-solution-design.md` | ✅ API routes and component paths updated (process-studio → workflow) |
| `lexi-enhancement-proposal.md` | ✅ No changes needed — already current |

---

## Session Context Note

This plan was created in a working session where:
- The full BuildCanvas feature was implemented (Build tab in Conductor)
- Agent Registry terminology was established (replacing "Agents/Teams/Spaces trio")
- Digital Workforce / Digital Force vocabulary was defined
- The internal blueprint (`AI-Digital-Workforce-Blueprint.md`) was written first
- Then the two external papers were derived from it

The next working session on this topic should start by reviewing this file and checking the "Remaining Work" checkboxes above before writing any new content.
