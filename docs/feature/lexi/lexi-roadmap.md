# Lexi Roadmap 2026
**User Support & Help AI Agent**
**Last updated**: February 15, 2026
**Owner**: Michael Quan
**Current Phase**: Early Production (multi-provider, basic personas)

---

## Vision

Lexi is TutorWise's omnipresent AI assistant that helps users navigate the platform, answers questions, and provides contextual support. Unlike Sage (the teaching AI), Lexi focuses on platform operations, bookings, payments, and general help.

**Lexi** = Platform expert + Role-aware support + Proactive assistance

---

## Current Status (February 2026)

### Implementation Level: 85%
- Core orchestrator with intent detection operational
- 5 main personas + 4 sub-personas active
- 3 LLM providers configured (Rules, Claude, Gemini)
- Streaming responses via SSE working
- Session management with Redis (24hr TTL)
- Conversation history persisted to PostgreSQL
- Rate limiting enforced (60 msg/min, 10 sessions/hr)

### Active Personas
| Persona | Target Users | Primary Capabilities |
|---------|--------------|---------------------|
| Student | Students | Learning buddy, homework help, progress tracking |
| Tutor | Tutors | Schedule management, earnings, analytics |
| Client | Parents/Guardians | Tutor search, bookings, student progress |
| Agent | Support Staff | User lookup, issue resolution, escalation |
| Organisation | Admins | Analytics, compliance, management |

### Sub-Personas (Specialised Experts)
| Sub-Persona | Function |
|-------------|----------|
| TutorEarningsExpert | Payment and commission guidance |
| ClientMatchingHelper | Tutor discovery and matching |
| OrganisationAdmin | Dashboard and reporting |
| NewUserGuide | Onboarding and setup assistance |

### Key Metrics
- **Providers Available:** 3 (Rules, Claude, Gemini)
- **Rate Limit:** 60 messages/minute per user
- **Session TTL:** 24 hours
- **Response Target:** <2s for streaming start
- **Resolution Rate:** TBD (tracking pending)

---

## 2026 Roadmap

### Q1 2026 – Foundation & Integration
**Target: Full production deployment with CAS integration**

#### Platform Integration
- [ ] Omnipresent FAB widget on all authenticated pages
- [ ] Proactive prompts based on user context (stuck on page, first visit)
- [ ] Deep link support (open Lexi with pre-filled query)
- [ ] Mobile-optimised modal with touch gestures

#### Persona Enhancement
- [ ] Expand to 6 specialised personas (add PaymentsExpert, OnboardingGuide)
- [ ] Cross-persona handoff for complex queries
- [ ] Persona confidence scoring (route to best match)
- [ ] Guest user persona with conversion prompts

#### CAS Integration
- [ ] Full feedback loop → CAS message bus (shared with Sage)
- [ ] CAS status awareness (feature timelines, Sage readiness, maintenance windows)
- [ ] Standardised JSON message envelope (shared format)
- [ ] Capability manifests per persona
- [ ] OpenAI-compatible tool calling interface

#### Cost & Performance
- [ ] Basic response caching for repeated queries
- [ ] Provider cost routing (Rules first, LLM fallback)
- [ ] Token usage tracking per user/session
- [ ] Response time monitoring

---

### Q1–Q2 2026 – Intelligence & Self-Improvement
**Target: Adaptive, learning assistant**

#### DSPy Integration
- [ ] DSPy signatures for intent classification
- [ ] Weekly optimisation pipeline (shared with Sage)
- [ ] A/B testing for response variants
- [ ] Prompt versioning and rollback

#### Context-Aware Routing
- [ ] Page URL-based context injection
- [ ] User role automatic detection via `context/resolver.ts`
- [ ] Booking/session state awareness
- [ ] Recent activity context (last 5 actions)

#### Self-Healing Knowledge
- [ ] Auto-detect recurring questions (>5 same query)
- [ ] Generate FAQ entries from common patterns
- [ ] Knowledge base suggestions for gaps
- [ ] Escalation pattern analysis

#### Role-Aware Behaviour
- [ ] Tutor context: earnings, schedule, student management
- [ ] Agent context: ticket queue, user lookup, escalation paths
- [ ] Client context: booking status, tutor matching, payments
- [ ] Student context: homework, sessions, progress

#### Cross-AI Coordination
- [ ] Detect tutoring questions → seamless handoff to Sage
- [ ] Context transfer protocol (session state, user context)
- [ ] Unified onboarding: introduce both Lexi and Sage to new users
- [ ] First-time usage prompts explaining when to use each assistant

---

### Q2 2026 – Reliability & Visibility
**Target: Production-grade observability**

#### Predictive Guardrails
- [ ] Hallucination detection for platform-specific info
- [ ] Confidence thresholds with "I'm not sure" responses
- [ ] Harmful content filtering
- [ ] PII detection and redaction in logs

#### Unified Dashboard
- [ ] CAS dashboard integration (Lexi + Sage metrics)
- [ ] Metrics by role: Tutor/Agent/Client/Student
- [ ] Intent distribution visualisation
- [ ] Provider usage and cost breakdown
- [ ] Feedback sentiment tracking

#### Quality Targets
- [ ] 80%+ resolution rate for common queries
- [ ] <5% escalation rate to human support
- [ ] 4.0+ average satisfaction rating
- [ ] <500ms time to first token

#### Protocol Evolution
- [ ] Versioned message bus protocol field
- [ ] A2A/MCP compatibility preparation
- [ ] Tool schema versioning
- [ ] Backward-compatible API changes

---

### Q3–Q4 2026 – Maturity & Autonomy
**Target: Self-maintaining, extensible platform**

#### Plugin System
- [ ] Community persona marketplace
- [ ] Third-party service integrations
- [ ] Custom tool definitions
- [ ] Persona template sharing

#### School System Integrations (Fuschia MCP Pattern)
- [ ] MCP tool protocol for school management systems
- [ ] Student timetable queries
- [ ] Homework deadline lookups
- [ ] Parent notification triggers
- [ ] Intervention logging

#### Multimodal Support
- [ ] Voice input (speech-to-text)
- [ ] Voice output (text-to-speech)
- [ ] Image understanding for screenshots
- [ ] File attachment handling (homework, receipts)

#### Autonomous Operations
- [ ] Fully autonomous maintenance via CAS
- [ ] Self-updating knowledge base
- [ ] Auto-scaling provider selection
- [ ] Predictive session management

#### Advanced Features
- [ ] Multi-language support (i18n)
- [ ] Conversation summarisation
- [ ] Proactive outreach (booking reminders, payment due)
- [ ] Cross-session context memory

---

## Shared Infrastructure with Sage

### Common Components
| Component | Location | Shared By |
|-----------|----------|-----------|
| Context Resolver | `context/resolver.ts` | Lexi, Sage |
| Feedback Table | `ai_feedback` | Lexi, Sage |
| Message Bus | CAS JSON envelope | Lexi, Sage, CAS Agents |
| DSPy Pipeline | Weekly optimisation | Lexi, Sage |
| Provider Routing | Gemini → Claude fallback | Lexi, Sage |

### Divergent Implementations
| Aspect | Lexi | Sage |
|--------|------|------|
| **Purpose** | Platform support | Teaching & learning |
| **Personas** | 5 role-based | 4 subject-based |
| **Knowledge** | Platform features, help | Curriculum, user materials |
| **Output** | Actions, navigation | Explanations, problems |
| **Entry** | FAB on all pages | Dashboard, profile |

---

## Guiding Principles

1. **Reuse TutorWise stack**: Supabase sessions, Ably real-time, Redis caching
2. **Single feedback loop**: Shared pipeline with Sage via CAS message bus
3. **Continuous improvement**: DSPy optimisation, pattern learning
4. **Light future-proofing**: Standardised messages, capability manifests, OpenAI tool interface
5. **Role-aware context**: Tutor/Agent/Client/Student detection and adaptation
6. **Cost efficiency**: Rules provider first, LLM only when needed
7. **Graceful degradation**: Fallback chain, offline-capable Rules provider

---

## Technical Stack

### Current (February 2026)
| Layer | Technology |
|-------|------------|
| Orchestrator | TypeScript, `/lexi/core/orchestrator.ts` |
| Providers | Rules (offline), Claude, Gemini |
| Sessions | Redis (24hr TTL) |
| History | Supabase PostgreSQL (RLS) |
| Streaming | Server-Sent Events (SSE) |
| UI | React, CSS Modules, FAB modal |
| Rate Limiting | Redis counters |

### Target (Q4 2026)
| Layer | Technology |
|-------|------------|
| Orchestrator | + DSPy modules for intent |
| Providers | + Cost-aware routing |
| Sessions | + Cross-device sync |
| History | + Vector search (pgvector) |
| Streaming | + Voice I/O |
| UI | + Multimodal, mobile-native |
| Observability | + CAS dashboard integration |

---

## Key Performance Indicators

### Quality KPIs
| Metric | Current | Q2 2026 | Q4 2026 |
|--------|---------|---------|---------|
| Resolution Rate | TBD | 80% | 90% |
| Escalation Rate | TBD | <5% | <2% |
| Satisfaction Rating | TBD | 4.0+ | 4.5+ |
| First Token Latency | ~1s | <500ms | <300ms |

### Usage KPIs
| Metric | Current | Q2 2026 | Q4 2026 |
|--------|---------|---------|---------|
| Daily Active Users | TBD | 500+ | 2000+ |
| Messages per Session | TBD | 5+ | 8+ |
| Sessions per User/Week | TBD | 3+ | 5+ |
| Provider Cost/Message | TBD | <$0.01 | <$0.005 |

### Reliability KPIs
| Metric | Current | Q2 2026 | Q4 2026 |
|--------|---------|---------|---------|
| Uptime | 99% | 99.5% | 99.9% |
| Error Rate | TBD | <1% | <0.1% |
| Fallback Trigger Rate | TBD | <5% | <2% |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Lexi Platform                           │
├─────────────────────────────────────────────────────────────────┤
│                          UI Layer                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  LexiChatModal (FAB) │ LexiChat │ LexiHistory │ ...     │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                         API Layer                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ /session │  │ /stream  │  │ /message │  │ /feedback│        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
├─────────────────────────────────────────────────────────────────┤
│                      Orchestrator                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Intent Detection → Persona Routing → Tool Execution    │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                        Personas                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ Student │ │  Tutor  │ │ Client  │ │  Agent  │ │   Org   │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
│  ┌───────────────────┐ ┌───────────────────┐                    │
│  │    Sub-Personas   │ │    Experts        │                    │
│  │ Earnings│Matching │ │ Onboard │ Admin   │                    │
│  └───────────────────┘ └───────────────────┘                    │
├─────────────────────────────────────────────────────────────────┤
│                        Providers                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                         │
│  │  Rules  │  │ Claude  │  │ Gemini  │   (Fallback Chain)      │
│  │(Offline)│  │ (Main)  │  │(Backup) │                         │
│  └─────────┘  └─────────┘  └─────────┘                         │
├─────────────────────────────────────────────────────────────────┤
│                        Services                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ SessionStore │ │ RateLimiter  │ │   Feedback   │            │
│  │   (Redis)    │ │   (Redis)    │ │ (PostgreSQL) │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
├─────────────────────────────────────────────────────────────────┤
│                    Shared with Sage                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │   Context    │ │  CAS Message │ │     DSPy     │            │
│  │   Resolver   │ │     Bus      │ │   Pipeline   │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Appendix: Feature Checklist

### Q1 2026 Features
- [ ] Omnipresent FAB widget
- [ ] Proactive contextual prompts
- [ ] 6 specialised personas
- [ ] CAS message bus integration
- [ ] Standardised JSON envelope
- [ ] Capability manifests
- [ ] OpenAI-compatible tool interface
- [ ] Response caching
- [ ] Provider cost routing

### Q1-Q2 2026 Features
- [ ] DSPy intent classification
- [ ] Weekly optimisation pipeline
- [ ] Page URL context injection
- [ ] Role auto-detection
- [ ] Self-healing knowledge base
- [ ] Recurring question detection
- [ ] Role-aware behaviour adaptation
- [ ] Lexi → Sage handoff for tutoring questions
- [ ] Unified onboarding (Lexi + Sage introduction)

### Q2 2026 Features
- [ ] Hallucination detection
- [ ] Confidence thresholds
- [ ] CAS dashboard integration
- [ ] Role-based metrics
- [ ] 80%+ resolution rate
- [ ] Protocol versioning
- [ ] A2A/MCP preparation

### Q3-Q4 2026 Features
- [ ] Plugin/persona marketplace
- [ ] Voice input/output
- [ ] Image understanding
- [ ] File attachments
- [ ] Autonomous CAS maintenance
- [ ] Multi-language support
- [ ] Proactive outreach
- [ ] MCP school system integrations (Fuschia pattern)

---

## Related Documentation

- [Lexi Solution Design](./lexi-solution-design.md) - Detailed architecture
- [Sage Roadmap](../sage/sage-roadmap.md) - Teaching AI roadmap
- [CAS Roadmap](../cas/cas-roadmap.md) - Platform orchestration
- [Context Resolver](../../../context/README.md) - Shared context system

---

**Document Version:** 1.0.0
**Aligned with:** CAS Roadmap 2026-2030, Sage Roadmap 2026
**Next Review:** April 2026
