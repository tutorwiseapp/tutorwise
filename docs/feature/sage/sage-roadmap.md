# Sage Roadmap 2026
**Specialised AI Tutor – Maths, English, Science, General Subjects**
**Last updated**: February 15, 2026
**Owner**: Michael Quan
**Current Phase**: Pre-development (Lexi fork + optimum role-aware structure planned)

---

## Vision

Sage is TutorWise's specialised AI tutor that acts as a 24/7 personal teaching assistant. Unlike Lexi (platform support), Sage focuses exclusively on teaching and learning with curriculum expertise and personalisation.

**Sage** = Curriculum expert + Role-aware teaching + Personalised knowledge

---

## Current Status (February 2026)

### Implementation Level: 40% (Architecture Complete, LLM Integration Pending)
- Core orchestrator with session management implemented
- 4 role-based personas defined (Student, Tutor, Client/Parent, Agent)
- Context resolver for role/mode switching operational
- Knowledge retrieval architecture designed (pgvector ready)
- Upload pipeline structure in place
- API routes implemented with placeholder responses
- UI components built (chat, materials, progress, history)
- GCSE Maths curriculum topics loaded

### Role-Based Personas
| Persona | Target Users | Primary Capabilities |
|---------|--------------|---------------------|
| Student | Students | Explain concepts, solve problems, practice exercises, homework help |
| Tutor | Tutors | Lesson planning, resource creation, progress review, assessments |
| Client | Parents/Guardians | Progress explanation, learning support tips, curriculum overview |
| Agent | Support Staff | Tutoring info, curriculum queries, student/tutor support |

### Subject Coverage
| Subject | Status | Key Features |
|---------|--------|--------------|
| Maths | 🟡 Structure Ready | GCSE topics, step-by-step solving, error diagnosis |
| English | 🔴 Planned | Grammar, writing, literature analysis |
| Science | 🔴 Planned | Physics, chemistry, biology |
| General | 🔴 Planned | Cross-subject support |

### Key Limitations (To Address in Q1)
- All responses are placeholders (no LLM integration)
- File extraction not functional (PDF/PowerPoint stubbed)
- Embeddings not generated (pgvector search returns empty)
- Intent detection is basic keyword matching only

---

## 2026 Roadmap

### Q1 2026 – Skeleton, Role Separation & Core Engine
**Target: Functional AI tutor with Maths subject**

#### Architecture & Structure
- [ ] Fork Lexi architecture → `/sage` with optimum structure
- [ ] Clear separation: `personas/tutor/`, `personas/agent/`, `personas/client/`, `personas/student/`
- [ ] Role-aware knowledge partitioning: `global/`, `users/{user_id}/`, `shared/{owner_id}/`
- [ ] Upload pipeline with role-specific configs (`upload/config/`)
- [ ] Access control enforcement via `access-control.ts`

#### LLM Integration (Critical Path)
- [ ] Implement Gemini provider (primary) with Claude fallback
- [ ] Connect orchestrator to provider for real responses
- [ ] Intent detection via LLM (replace keyword matching)
- [ ] Streaming responses via SSE (connect to real LLM stream)
- [ ] Token usage tracking and cost routing

#### Subject Engine (Maths First)
- [ ] Step-by-step problem solving with working shown
- [ ] Error diagnosis with remediation suggestions
- [ ] Practice problem generation with marking criteria
- [ ] Progressive hint system (guide without giving answers)
- [ ] LaTeX rendering for mathematical expressions

#### Knowledge Pipeline
- [ ] Ingest tutor/agent PowerPoint materials → pgvector embeddings
- [ ] Implement actual file extraction (pptx, pdf-parse, mammoth)
- [ ] Embedding generation via OpenAI/Gemini embedding models
- [ ] RAG layer with strict role-based access control
- [ ] Priority scoring: user uploads > shared > global

#### UI Integration
- [ ] "Ask Sage" buttons on tutor/agent dashboard
- [ ] "Ask Sage" buttons on client/student profile
- [ ] Subject selector in chat header
- [ ] Level selector (GCSE, A-Level)
- [ ] Mobile-optimised chat interface

#### Future-Proofing
- [ ] Standardised JSON message envelope (shared with Lexi)
- [ ] Capability manifests per persona
- [ ] OpenAI-compatible tool calling interface
- [ ] Protocol version field for A2A compatibility

---

### Q1–Q2 2026 – Subject Depth, Intelligence & Role-Aware Personalisation
**Target: Full curriculum coverage with adaptive learning**

#### DSPy Integration
- [ ] DSPy signatures for reasoning chains (role-specific tone)
- [ ] Error diagnosis signatures with pattern matching
- [ ] Feedback generation signatures
- [ ] Weekly optimisation on tutoring sessions (shared pipeline with Lexi)
- [ ] A/B testing for pedagogical approaches

#### Progress & Mastery System
- [ ] Topic mastery tracking (0-100 scores)
- [ ] Spaced repetition scheduling
- [ ] Learning streak tracking
- [ ] Role-specific progress views:
  - Student: personal dashboard with achievements
  - Tutor: student overview with intervention alerts
  - Client: child progress summary
  - Agent: aggregate analytics

#### Curriculum Expansion
- [ ] Full GCSE Maths coverage (all exam boards: AQA, Edexcel, OCR)
- [ ] GCSE English (grammar, writing, literature)
- [ ] GCSE Science (physics, chemistry, biology)
- [ ] A-Level Maths and Further Maths
- [ ] Specification-aligned content (exam board specific)

#### Knowledge Layer Enhancement
- [ ] Tutor/agent upload processing with quality validation
- [ ] Client/student homework submission handling
- [ ] Shared content approval workflow
- [ ] Role-specific upload visibility controls
- [ ] Knowledge gap detection from usage patterns

#### Context System
- [ ] `context/resolver.ts` for hybrid users (switch teaching/learning mode)
- [ ] Session goal tracking (homework, exam prep, concept review)
- [ ] Prior knowledge assessment
- [ ] Error pattern memory across sessions
- [ ] Strength identification and celebration

#### Cross-AI Coordination
- [ ] Detect platform questions → seamless handoff to Lexi
- [ ] Context transfer protocol (session state, user context)
- [ ] Unified onboarding: introduce both Sage and Lexi to new users
- [ ] First-time usage prompts explaining when to use each assistant

#### Future-Proofing
- [ ] Versioned message bus protocol field
- [ ] Extensible A2A compatibility markers
- [ ] Tool schema versioning

---

### Q2 2026 – Reliability, Visibility & Safety
**Target: Production-grade quality with guardrails**

#### Educational Guardrails
- [ ] Curriculum accuracy validation (no hallucination on exam content)
- [ ] Role-aware risk checks (student vs tutor information)
- [ ] Age-appropriate content filtering
- [ ] Source citation for knowledge-based answers
- [ ] Confidence thresholds with "let me check" responses

#### Session Quality
- [ ] Session summaries (what was learned)
- [ ] Topic completion tracking
- [ ] Learning outcome verification
- [ ] Intervention triggers (stuck detection)
- [ ] Escalation to human tutor when needed

#### Dashboard Integration
- [ ] Unified CAS dashboard view (Lexi + Sage metrics)
- [ ] Metrics by role: Tutor/Agent/Client/Student
- [ ] Subject usage distribution
- [ ] Mastery progression visualisation
- [ ] Knowledge gap heat maps

#### Self-Healing Knowledge
- [ ] Auto-detect recurring student errors
- [ ] Identify knowledge gaps from wrong answers
- [ ] Suggest content additions for tutors/agents
- [ ] Flag outdated or incorrect materials

#### Role-Specific Reporting
- [ ] Client: weekly child progress summary email
- [ ] Tutor: student cohort analytics
- [ ] Agent: platform-wide tutoring metrics
- [ ] Student: achievement and streak reports

---

### Q3–Q4 2026 – Maturity, Ecosystem & Autonomy
**Target: Self-maintaining, extensible tutoring platform**

#### Plugin System
- [ ] Pluggable subject modules (community extensions)
- [ ] Third-party curriculum integrations
- [ ] Custom assessment types
- [ ] Extension marketplace foundation
- [ ] `extensions/` folder for role-specific additions (e.g., agent commission tools)

#### Multimodal Support
- [ ] Voice input for explaining problems
- [ ] Voice output for step-by-step explanations
- [ ] Image understanding (handwritten maths, diagrams)
- [ ] Whiteboard integration (VirtualSpace sync)
- [ ] Role-aware multimodal permissions

#### Autonomous Operations
- [ ] Fully autonomous maintenance via dedicated CAS track ("Maintain Sage")
- [ ] Self-updating curriculum data
- [ ] Auto-scaling embedding generation
- [ ] Knowledge base quality monitoring

#### Advanced Features
- [ ] Multi-language support (i18n for international students)
- [ ] Exam board past paper analysis
- [ ] Predicted grade calculation
- [ ] Personalised revision timetables
- [ ] Parent-tutor communication through Sage

#### Proactive Learning Outreach
- [ ] Exam date reminders and countdown
- [ ] Revision schedule suggestions based on mastery gaps
- [ ] Progress milestone alerts and celebrations
- [ ] Streak recovery prompts (re-engage inactive students)

#### Future-Proofing
- [ ] Prepare for external A2A protocols (MCP/A2A spec compatibility)
- [ ] External tutoring service integrations
- [ ] LMS export (Google Classroom, Seesaw)

---

## Shared Infrastructure with Lexi

### Common Components
| Component | Location | Shared By |
|-----------|----------|-----------|
| Context Resolver | `context/resolver.ts` | Lexi, Sage |
| Feedback Table | `ai_feedback` | Lexi, Sage |
| Message Bus | CAS JSON envelope | Lexi, Sage, CAS Agents |
| DSPy Pipeline | Weekly optimisation | Lexi, Sage |
| Provider Routing | Gemini → Claude fallback | Lexi, Sage |
| Session Store | Redis + Supabase | Lexi, Sage |

### Divergent Implementations
| Aspect | Sage | Lexi |
|--------|------|------|
| **Purpose** | Teaching & learning | Platform support |
| **Personas** | 4 role-based (teaching focus) | 5 role-based (support focus) |
| **Knowledge** | Curriculum, user materials | Platform features, help |
| **Output** | Explanations, problems, feedback | Actions, navigation |
| **Entry** | Dashboard, profile buttons | FAB on all pages |

---

## Guiding Principles

1. **Inherit Lexi maturity**: Multi-LLM, lazy sessions, feedback loop, streaming
2. **Strict role separation**: Tutor/Agent/Client/Student with shared core
3. **Knowledge access control**: Role & relationship-based permissions
4. **No model training**: Only RAG + DSPy optimisation (cost-effective)
5. **Single CAS loop**: Shared improvement pipeline with Lexi
6. **Light future-proofing**: Standardised messages, capability manifests, tool interface
7. **UK curriculum alignment**: GCSE/A-Level specs with exam board specificity
8. **Step-by-step pedagogy**: Guide learning, don't just give answers

---

## Technical Stack

### Current (February 2026)
| Layer | Technology | Status |
|-------|------------|--------|
| Orchestrator | TypeScript, `/sage/core/orchestrator.ts` | ✅ Implemented |
| Personas | 4 role-based configs | ✅ Implemented |
| Context | `context/resolver.ts` | ✅ Implemented |
| Providers | Abstract interface | 🔴 Needs implementation |
| Knowledge | pgvector schema | 🟡 Schema ready |
| Embeddings | Embedding queue | 🔴 Needs implementation |
| Sessions | Redis + Supabase | ✅ Implemented |
| API | All routes with auth | 🟡 Placeholder responses |
| UI | Chat, materials, progress | ✅ Implemented |

### Target (Q4 2026)
| Layer | Technology |
|-------|------------|
| Orchestrator | + DSPy modules for pedagogy |
| Providers | Gemini (primary), Claude (fallback) |
| Knowledge | pgvector + semantic chunking |
| Embeddings | OpenAI/Gemini embedding models |
| Curriculum | GCSE + A-Level all subjects |
| Voice | Speech-to-text + text-to-speech |
| Dashboard | CAS integration with metrics |

---

## Key Performance Indicators

### Learning Quality KPIs
| Metric | Q1 2026 | Q2 2026 | Q4 2026 |
|--------|---------|---------|---------|
| Curriculum Accuracy | 90% | 95% | 99% |
| Step Completion Rate | 60% | 75% | 85% |
| Student Satisfaction | 3.5+ | 4.0+ | 4.5+ |
| Mastery Improvement | +10%/month | +15%/month | +20%/month |

### Usage KPIs
| Metric | Q1 2026 | Q2 2026 | Q4 2026 |
|--------|---------|---------|---------|
| Daily Active Students | 100+ | 500+ | 2000+ |
| Sessions per Student/Week | 3+ | 5+ | 7+ |
| Problems Solved/Session | 3+ | 5+ | 8+ |
| Materials Uploaded | 50+ | 200+ | 1000+ |

### Operational KPIs
| Metric | Q1 2026 | Q2 2026 | Q4 2026 |
|--------|---------|---------|---------|
| Response Latency | <2s | <1s | <500ms |
| Knowledge Retrieval Accuracy | 70% | 85% | 95% |
| Embedding Processing Time | <30s | <10s | <5s |
| Provider Cost/Session | <$0.10 | <$0.05 | <$0.02 |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Sage Platform                            │
├─────────────────────────────────────────────────────────────────┤
│                          UI Layer                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  SageChat │ Materials │ Progress │ History │ "Ask Sage" │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                         API Layer                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ /session │ │ /stream  │ │/materials│ │/progress │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
├─────────────────────────────────────────────────────────────────┤
│                      Orchestrator                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Intent Detection → Persona Routing → Subject Engine    │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                   Role-Based Personas                            │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │ Student │  │  Tutor  │  │ Client  │  │  Agent  │            │
│  │(Learning│  │(Teaching│  │(Support │  │(Coordin │            │
│  │  Mode)  │  │  Mode)  │  │  Mode)  │  │  Mode)  │            │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
├─────────────────────────────────────────────────────────────────┤
│                      Subject Engines                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │  Maths  │  │ English │  │ Science │  │ General │            │
│  │ (GCSE)  │  │ (GCSE)  │  │ (GCSE)  │  │         │            │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
├─────────────────────────────────────────────────────────────────┤
│                      Knowledge Layer                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  global/  │  users/{id}/  │  shared/{owner}/            │    │
│  │  (Specs)  │   (Uploads)   │    (Tutor Materials)        │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   pgvector   │  │  Embeddings  │  │ Access Ctrl  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
├─────────────────────────────────────────────────────────────────┤
│                    Shared with Lexi                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │   Context    │ │  CAS Message │ │     DSPy     │            │
│  │   Resolver   │ │     Bus      │ │   Pipeline   │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Knowledge Namespace Structure

```
knowledge/
├── global/                    # Platform-wide curriculum
│   ├── maths/
│   │   ├── gcse/             # GCSE specs (AQA, Edexcel, OCR)
│   │   └── a-level/
│   ├── english/
│   ├── science/
│   └── general/
├── users/{user_id}/           # User's own materials
│   ├── uploads/              # PowerPoints, PDFs, notes
│   ├── homework/             # Submitted homework
│   └── progress/             # Personal progress data
└── shared/{owner_id}/         # Shared by tutors/agents
    ├── resources/            # Teaching materials
    ├── assessments/          # Practice tests
    └── visibility/           # Access control metadata
```

---

## Appendix: Feature Checklist

### Q1 2026 Features (Critical)
- [ ] Fork Lexi → Sage structure
- [ ] LLM provider implementation (Gemini + Claude)
- [ ] Real response generation
- [ ] Maths step-by-step engine
- [ ] PowerPoint/PDF extraction
- [ ] Embedding generation
- [ ] pgvector RAG search
- [ ] "Ask Sage" button integration
- [ ] Message envelope + manifests

### Q1-Q2 2026 Features
- [ ] DSPy signatures
- [ ] Weekly optimisation pipeline
- [ ] Progress/mastery tracking
- [ ] Spaced repetition
- [ ] Full GCSE coverage
- [ ] English + Science subjects
- [ ] Upload validation
- [ ] Context switching
- [ ] Sage → Lexi handoff for platform questions
- [ ] Unified onboarding (Sage + Lexi introduction)

### Q2 2026 Features
- [ ] Educational guardrails
- [ ] Hallucination detection
- [ ] Session summaries
- [ ] CAS dashboard integration
- [ ] Role-specific reporting
- [ ] Self-healing knowledge

### Q3-Q4 2026 Features
- [ ] Plugin/subject marketplace
- [ ] Voice I/O
- [ ] Image understanding
- [ ] Whiteboard sync
- [ ] Multi-language
- [ ] Exam board past papers
- [ ] Predicted grades
- [ ] A2A/MCP compatibility
- [ ] Proactive learning outreach (exam reminders, revision prompts)

---

## Related Documentation

- [Sage Solution Design](./sage-solution-design.md) - Detailed architecture
- [Lexi Roadmap](../lexi/lexi-roadmap.md) - Support AI roadmap
- [CAS Roadmap](../cas/cas-roadmap.md) - Platform orchestration
- [Context Resolver](../../../context/README.md) - Shared context system

---

**Document Version:** 1.0.0
**Aligned with:** CAS Roadmap 2026-2030, Lexi Roadmap 2026
**Next Review:** April 2026
