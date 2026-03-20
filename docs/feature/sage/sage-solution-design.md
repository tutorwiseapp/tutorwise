# Sage Solution Design
**AI Tutor Agent — UK Primary to University, IB, AP — 15+ Subjects with SEN/SEND Support**
**Version:** 3.1
**Created:** 2026-02-14
**Last Updated:** 2026-03-20
**Status:** Approved for Implementation | Subscription Model: Free + Pro (£10/month)
**Owner:** Michael Quan

---

## Table of Contents

1. [Vision & Objectives](#1-vision--objectives)
2. [Subscription Model](#2-subscription-model)
3. [Sage vs Lexi](#3-sage-vs-lexi)
4. [Core Architecture](#4-core-architecture)
5. [Role-Aware Personas](#5-role-aware-personas)
6. [Knowledge Architecture (RAG)](#6-knowledge-architecture-rag)
7. [Upload Pipeline](#7-upload-pipeline)
8. [Subject Engines](#8-subject-engines)
   - 8.1 [Curriculum Matrix](#81-curriculum-matrix)
   - 8.2 [Exam Board Coverage](#82-exam-board-coverage)
9. [DSPy Integration](#9-dspy-integration-full-implementation)
10. [SEN/SEND Support](#10-sensend-support)
11. [Platform Integration](#11-platform-integration)
12. [Future-Proofing Components](#12-future-proofing-components)
13. [Progress Tracking](#13-progress-tracking)
13A. [Virtual Space & AI Canvas Whiteboard](#13a-virtual-space--ai-canvas-whiteboard)
14. [API Specification](#14-api-specification)
15. [AI Provider Chain](#15-ai-provider-chain)
16. [Competitive Positioning](#16-competitive-positioning)
17. [UI Components](#17-ui-components)
18. [Database Schema](#18-database-schema)
19. [Design Tokens](#19-design-tokens)
20. [Implementation Phases](#20-implementation-phases)
21. [Success Metrics](#21-success-metrics)
22. [Guiding Principles](#22-guiding-principles)
23. [Related Documentation](#23-related-documentation)

---

## 1. Vision & Objectives

Sage is Tutorwise's specialised AI tutor that acts as a 24/7 personal teaching assistant. Unlike Lexi (the platform support assistant), Sage focuses exclusively on teaching and learning. Sage covers the full UK education pipeline from KS1 through University, plus international curricula including IB, AP, SQA, and CIE, with built-in SEN/SEND adaptations compliant with the UK GDPR Children's Code.

Sage must be:
- **Curriculum-expert** – Grounded in UK KS1 through University + IB + AP + SQA + CIE specifications, with SEN/SEND adaptations
- **Role-aware** – Different behaviour for Tutor / Agent / Client / Student
- **Personalised** – Uses uploaded teaching materials, homework, notes, and episodic memory
- **Safe & accurate** – No hallucinations on exam content; safeguarding-first for under-18s
- **Continuously improving** – Via DSPy + Conductor feedback loop + agent episodic memory
- **Inclusive** – 11 SEN/SEND categories with privacy-preserving prompt adaptation
- **Future-proof** – Light A2A readiness, tool calling, capability discovery, Conductor integration

**Key differentiator:** Sage learns and teaches in the user's own voice (especially tutors' PowerPoints) while staying strictly aligned to official specs across 15+ subjects and all major UK/international exam boards.

---

## 2. Subscription Model

Sage operates on a freemium model with direct upgrade path from free tier to Pro.

### 2.1 Free Tier

| Feature | Limit | Implementation |
|---------|-------|----------------|
| **Questions** | 10 per day (rolling 24h window) | Redis rate limiter (`lib/ai-agents/rate-limiter.ts`) |
| **Storage** | 50 MB for uploaded materials | PostgreSQL function `sage_check_storage_quota` |
| **Subjects** | Mathematics only | UI restriction + fallback to rules |
| **Conversation History** | 10 messages | Session limit in database |
| **Fallback** | Rules-based responses when quota exceeded | `lexi/providers/rules-provider.ts` |

**Cost Control:**
- Free tier users consume ~0.45p per question (via 6-tier fallback chain)
- 10 questions/day = £1.35/month average cost per active user
- Storage costs negligible: 50 MB x £0.021/GB = £0.001/month

### 2.2 Sage Pro - £10/month

| Feature | Limit | Value |
|---------|-------|-------|
| **Questions** | 5,000 per month (~167/day) | 500x more than free tier |
| **Storage** | 1 GB for materials | 20x more than free tier |
| **Subjects** | All 15+ subjects across all levels (Maths, English, Science, Computing, Humanities, Languages, Social Sciences, Business & Economics, Arts & Creative, General) | Full subject access including IB, AP, SQA, CIE |
| **Conversation History** | 100 messages | 10x longer sessions |
| **SEN/SEND Adaptations** | All 11 categories | Personalised learning support |
| **Advanced Features** | Priority responses, progress analytics, PDF transcripts | Pro-only capabilities |

**Pricing Strategy:**
- £10/month positions Sage as accessible learning tool
- Revenue per Pro user: £10/month
- Cost per Pro user: ~£2.25/month (5,000 questions @ £0.45p each)
- Gross margin: 77.5%
- Storage cost: £0.021/month (1 GB)
- **Net margin: ~77%**

### 2.3 Trial & Upgrade Model

**No Trial Period:**
- Free tier provides extensive testing (10 questions/day = 300/month)
- Users can experience all core features before upgrading
- Direct upgrade path from free to Pro
- Simpler UX than traditional trial model

**Subscription Management:**
- Stripe integration for payments
- Customer Portal for self-service management
- Database: `sage_pro_subscriptions` table
- Quota tracking: `sage_usage_log` and `sage_storage_files` tables

**Migration Note:**
- Previous plan included 14-day trial, now deprecated for new signups
- Existing trial users still supported for backwards compatibility
- Trial handling in billing page remains for legacy subscribers

---

## 3. Sage vs Lexi

| Aspect | Lexi | Sage |
|--------|------|------|
| **Purpose** | Platform navigation & support | Teaching & learning |
| **Personas** | 5 role-based (Support, Earnings Expert, etc.) | 4 role-based (Tutor, Agent, Client, Student) |
| **Knowledge** | Platform features, help content | Curriculum specs, user uploads, tutoring materials |
| **Tone** | Professional, helpful | Patient, encouraging, educational |
| **Context** | User role, permissions, bookings | Subject, level, learning style, progress, SEN profile |
| **Output** | Actions, suggestions, navigation | Explanations, examples, practice problems |
| **Entry Points** | FAB on all authenticated pages | Tutor/Agent dashboard, Client/Student profile |
| **Curriculum** | None | UK KS1-University, IB, AP, SQA, CIE |

**Shared Infrastructure:**
- `context/resolver.ts` – Role detection & context switching
- `ai_feedback` table – Unified feedback storage
- CAS message bus – Standardized JSON envelope
- DSPy pipeline – Weekly optimization (shared job)
- AI provider chain – 6-tier fallback (xAI Grok 4 Fast primary)
- PlatformUserContext – Enriched user context (from Conductor Phase 4C)

---

## 4. Core Architecture

```
sage/
├── core/                      # Shared orchestration
│   ├── orchestrator.ts        # Message routing
│   └── index.ts
├── providers/                 # LLM providers (shared AI service)
│   ├── types.ts
│   └── index.ts
├── context/                   # Role & session context
│   ├── resolver.ts            # Role detection & mode switching
│   └── index.ts
├── personas/                  # Four role-based personas
│   ├── tutor/
│   │   ├── index.ts
│   │   └── capabilities.json
│   ├── agent/
│   │   ├── index.ts
│   │   └── capabilities.json
│   ├── client/
│   │   ├── index.ts
│   │   └── capabilities.json
│   └── student/
│       ├── index.ts
│       └── capabilities.json
├── subjects/                  # Domain logic per subject (10 subject configs)
│   ├── index.ts               # SUBJECT_CONFIGS registry (10 entries)
│   ├── types.ts               # SubjectConfig, TopicNode, etc.
│   ├── dspy-types.ts          # DSPy integration types
│   ├── engine-executor.ts     # Engine routing
│   ├── maths/
│   │   ├── engine.ts          # DSPy Chain-of-Thought solver
│   │   ├── topics.ts
│   │   ├── curriculum.ts
│   │   └── index.ts
│   ├── english/
│   │   ├── engine.ts
│   │   └── index.ts
│   ├── science/
│   │   ├── engine.ts
│   │   └── index.ts
│   └── general/
│       ├── engine.ts          # Fallback engine for new subjects
│       └── index.ts
├── curriculum/                # Structured curriculum data
│   ├── types.ts               # CurriculumTopic, ExamBoard, etc.
│   ├── resolver.ts            # Topic resolution
│   ├── content-generator.ts   # Dynamic content generation
│   └── data/                  # 22 curriculum data files (~467 topics)
│       ├── index.ts           # Centralised exports + query helpers
│       ├── primary.ts         # KS1-KS2 core subjects
│       ├── ks3-maths.ts       # KS3 Mathematics
│       ├── ks3-science.ts     # KS3 Science
│       ├── ks3-english.ts     # KS3 English
│       ├── ks3-humanities.ts  # KS3 History & Geography
│       ├── maths.ts           # GCSE Maths
│       ├── science.ts         # GCSE Science (Combined + Triple)
│       ├── english.ts         # GCSE English Language & Literature
│       ├── humanities.ts      # GCSE History & Geography
│       ├── computing.ts       # GCSE Computer Science
│       ├── social-sciences.ts # GCSE Psychology, Sociology, RE
│       ├── languages.ts       # GCSE French, Spanish, German, etc.
│       ├── business-economics.ts # GCSE Business, Economics
│       ├── creative-practical.ts # GCSE Music, Art, D&T, PE, Drama
│       ├── a-level-maths.ts   # A-Level Pure, Mechanics, Statistics
│       ├── a-level-sciences.ts # A-Level Biology, Chemistry, Physics
│       ├── a-level-humanities.ts # A-Level History, Geography
│       ├── a-level-other.ts   # A-Level Psychology, Economics, CS, Business
│       ├── ib.ts              # IB Maths AA/AI, English, Sciences, ToK
│       ├── ap.ts              # AP Calculus, Statistics, Sciences, English
│       ├── sqa.ts             # SQA National 5 + Higher
│       └── cie.ts             # CIE IGCSE core subjects
├── sen/                       # SEN/SEND support module
│   ├── types.ts               # SENCategory, SENProfile, SENAdaptation
│   ├── adapter.ts             # SEN_ADAPTATIONS record, prompt generation
│   └── index.ts               # Public API exports
├── safety/                    # Safeguarding & content safety
│   ├── types.ts
│   ├── input-classifier.ts    # Input content classification
│   ├── output-validator.ts    # Output content validation
│   ├── wellbeing-detector.ts  # Student wellbeing detection
│   ├── age-adapter.ts         # Age-appropriate content adaptation
│   └── index.ts
├── teaching/                  # Teaching mode strategies
│   └── modes.ts               # Socratic, direct, adaptive, supportive
├── assessment/                # Quiz and assessment tools
│   ├── quiz-generator.ts      # Dynamic quiz generation
│   └── answer-evaluator.ts    # Answer evaluation & feedback
├── math/                      # Advanced maths tooling
│   ├── hybrid-solver.ts       # Multi-strategy solver
│   └── test-solver.ts
├── rendering/                 # Output rendering
│   └── math-renderer.ts       # LaTeX/MathJax rendering
├── knowledge/                 # Role-aware RAG storage
│   ├── global/                # Platform-wide resources
│   ├── users/{user_id}/       # Personal uploads
│   ├── shared/{owner_id}/     # Tutor → Student sharing
│   ├── types.ts               # Knowledge types
│   ├── index.ts               # RAG retrieval
│   ├── retriever.ts           # Base retriever
│   ├── enhanced-retriever.ts  # Enhanced retrieval with re-ranking
│   ├── enhanced-rag.ts        # RAG pipeline
│   └── access-control.ts      # Visibility rules
├── upload/                    # Ingestion pipeline
│   ├── processor.ts           # PPTX/PDF/DOCX extraction
│   ├── embedder.ts            # pgvector embedding
│   ├── index.ts
│   └── config/
│       ├── allowed-types.ts
│       ├── tutor.json
│       ├── agent.json
│       ├── client.json
│       └── student.json
├── services/
│   ├── session.ts             # Redis sessions (sage: prefix)
│   ├── progress.ts            # Mastery scores, topic queue
│   ├── report.ts              # Role-specific reports
│   ├── access-control.ts      # Access control service
│   ├── student-model.ts       # Student modelling
│   ├── feedback-service.ts    # Feedback collection
│   └── index.ts
├── agents/                    # AI agent integration
│   ├── base/
│   │   ├── BaseAgent.ts       # Base agent class
│   │   ├── types.ts
│   │   └── index.ts
│   ├── MarketplaceAIAgent.ts  # Marketplace AI tutor
│   ├── PlatformAIAgent.ts     # Platform AI agent
│   ├── index.ts
│   └── README.md
├── links/                     # Cross-platform links
│   └── index.ts
├── messages/                  # CAS message bus integration
│   ├── envelope.ts            # Standardized JSON schema
│   ├── validator.ts           # Envelope validation
│   └── publisher.ts           # Send to CAS
├── tools/                     # OpenAI-compatible tool calling
│   ├── types.ts
│   ├── executor.ts            # Tool execution
│   ├── registry.ts            # Tool registration
│   └── index.ts
├── extensions/                # Future role-specific overrides
│   └── index.ts
├── types/
│   └── index.ts               # All Sage types (SageSubject, SENCategory, etc.)
└── index.ts
```

---

## 5. Role-Aware Personas

### 5.1 Role Detection

```typescript
// context/resolver.ts

interface RoleContext {
  role: 'tutor' | 'agent' | 'client' | 'student';
  mode: 'teaching' | 'learning' | 'managing';
  userId: string;
  organisationId?: string;
  linkedStudents?: string[];  // For tutors/agents/clients
  linkedTutors?: string[];    // For students
  senCategories?: SENCategory[];  // SEN/SEND profile
}

function resolveContext(user: UserInfo): RoleContext {
  // Detect role from profile.active_role
  // Determine mode based on context (viewing student? teaching? managing?)
  // Handle hybrid users (tutor who is also a student)
  // Load SEN profile from sage_student_profiles if student role
}
```

### 5.2 Persona Behaviours

| Persona | Mode | Capabilities | Tone |
|---------|------|--------------|------|
| **Tutor** | Teaching | Create materials, review student work, get teaching tips | Professional, authoritative |
| **Agent** | Managing | Overview of students, suggest resources, track progress | Supportive, coordinating |
| **Client** | Managing | Monitor child's progress, understand topics, help at home | Encouraging, accessible |
| **Student** | Learning | Ask questions, practice problems, track mastery | Patient, encouraging |

### 5.3 Capability Manifests

Each persona has a `capabilities.json` for future A2A discovery:

```json
// personas/tutor/capabilities.json
{
  "name": "Sage Tutor Persona",
  "version": "1.0.0",
  "capabilities": [
    "create_lesson_plan",
    "review_student_work",
    "generate_worksheet",
    "explain_for_student",
    "track_student_progress"
  ],
  "subjects": [
    "maths", "english", "science", "computing",
    "humanities", "languages", "social-sciences",
    "business", "arts", "general"
  ],
  "levels": ["KS1", "KS2", "KS3", "GCSE", "A-Level", "IB", "AP", "SQA", "CIE", "University"],
  "input_types": ["text", "image", "document"],
  "tool_calling": true,
  "sen_support": true
}
```

---

## 6. Knowledge Architecture (RAG)

### 6.1 Knowledge Sources (Priority Order)

1. **User's own uploads** – Highest priority, personal context
2. **Shared from tutor/agent** – Materials shared with specific students
3. **Platform knowledge base** – Conductor Phase 4A knowledge chunks (768-dim vector, 18 categories)
4. **Global platform resources** – Curriculum specs, verified content

### 6.2 Access Control

```typescript
// knowledge/access-control.ts

interface KnowledgeAccess {
  global: boolean;           // Can access global resources
  personal: boolean;         // Can access own uploads
  shared: string[];          // Can access shared/{owner_id}/ for these owners
  studentData: string[];     // Can access users/{student_id}/ for these students
  platformKnowledge: boolean; // Can access platform_knowledge_chunks via RAG
}

function getAccessControl(context: RoleContext): KnowledgeAccess {
  switch (context.role) {
    case 'tutor':
      return {
        global: true,
        personal: true,
        shared: [],                              // Own shares visible elsewhere
        studentData: context.linkedStudents,     // Can see linked students' uploads
        platformKnowledge: true,
      };
    case 'student':
      return {
        global: true,
        personal: true,
        shared: context.linkedTutors,            // Can see tutor's shared materials
        studentData: [],
        platformKnowledge: false,                // Students access via tutor
      };
    // ... agent, client
  }
}
```

### 6.3 RAG Retrieval Flow

```
User asks question
        │
        ▼
┌───────────────────┐
│ Resolve Context   │ → Role, mode, linked users, SEN profile
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Get Access Rules  │ → What knowledge is visible
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Query pgvector    │ → Search across allowed namespaces
│ with access       │   (768-dim, gemini-embedding-001)
│ filtering         │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Rank & Return     │ → User uploads > Shared > Platform > Global
└───────────────────┘
```

---

## 7. Upload Pipeline

### 7.1 Supported Formats

| Format | Extraction Method |
|--------|-------------------|
| PPTX | Slide text + speaker notes + images (OCR) |
| PDF | Text extraction + OCR for scanned |
| DOCX | Full text + tables |
| Images | OCR + vision model description |

### 7.2 Role-Specific Upload Config

```json
// upload/config/tutor.json
{
  "max_file_size_mb": 50,
  "allowed_types": ["pptx", "pdf", "docx", "png", "jpg"],
  "auto_share": false,
  "chunk_size": 512,
  "overlap": 50,
  "metadata": {
    "source_type": "tutor_material",
    "visibility": "private",
    "shareable": true
  }
}
```

### 7.3 Upload Flow

```
Tutor uploads PowerPoint
        │
        ▼
┌───────────────────┐
│ processor.ts      │ → Extract text, notes, images
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ embedder.ts       │ → Chunk + embed with pgvector
└─────────┬─────────┘   (gemini-embedding-001, 768-dim)
          │
          ▼
┌───────────────────┐
│ Store in          │ → knowledge/users/{tutor_id}/
│ user namespace    │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Optionally share  │ → Copy refs to shared/{tutor_id}/
│ with students     │    (students gain access)
└───────────────────┘
```

---

## 8. Subject Engines

### 8.0 Architecture

Sage uses a registry of 10 subject configs with 4 dedicated DSPy-powered engines and 6 subject configs that currently fall back to the general engine. Each subject config declares supported levels and exam boards.

**Dedicated engines (full DSPy pipeline):**

| Engine | Location | Capabilities |
|--------|----------|-------------|
| **Maths** | `subjects/maths/engine.ts` | Chain-of-Thought solver, error diagnosis, practice generation |
| **English** | `subjects/english/engine.ts` | Reading comprehension, writing feedback, literary analysis |
| **Science** | `subjects/science/engine.ts` | Experiment explanation, equation solving, concept mapping |
| **General** | `subjects/general/engine.ts` | Study skills, exam prep, cross-subject support |

**Extended subjects (general engine fallback):**

| Subject Config | Location | Description |
|----------------|----------|-------------|
| **Computing** | `subjects/index.ts` | Computer Science, programming, digital literacy |
| **Humanities** | `subjects/index.ts` | History, Geography |
| **Languages** | `subjects/index.ts` | French, Spanish, German, Latin, Mandarin |
| **Social Sciences** | `subjects/index.ts` | Psychology, Sociology, Religious Education |
| **Business & Economics** | `subjects/index.ts` | Business Studies, Economics, Accounting |
| **Arts & Creative** | `subjects/index.ts` | Music, Art & Design, D&T, PE, Drama |

```typescript
// subjects/maths/engine.ts

import { dspy } from '@/sage/dspy';

const MathsSolver = dspy.ChainOfThought({
  signature: `
    question: str ->
    working: str,
    answer: str,
    confidence: float
  `,
  description: "Solve maths problems step-by-step across KS1 to University level"
});

const ErrorDiagnosis = dspy.Predict({
  signature: `
    student_answer: str,
    correct_answer: str,
    working: str ->
    misconception: str,
    explanation: str,
    next_steps: list[str]
  `
});

export class MathsEngine {
  async solve(question: string, level: string): Promise<Solution>;
  async diagnoseError(studentWork: string, correct: string): Promise<Diagnosis>;
  async generatePractice(topic: string, count: number): Promise<Problem[]>;
}
```

### 8.1 Curriculum Matrix

Sage covers ~467 topics across 22 curriculum data files. The following matrix shows Level x Subject x Exam Board coverage:

| Level | Subjects | Exam Boards | Data Files |
|-------|----------|-------------|------------|
| **KS1-KS2** | Primary Maths, Primary English, Primary Science | None (National Curriculum) | `primary.ts` |
| **KS3** | Maths, Science, English, Humanities (History, Geography) | None (National Curriculum) | `ks3-maths.ts`, `ks3-science.ts`, `ks3-english.ts`, `ks3-humanities.ts` |
| **GCSE** | Maths, English Language & Literature, Biology, Chemistry, Physics, Combined Science, History, Geography, Computer Science, French, Spanish, German, Psychology, Sociology, RE, Business Studies, Economics, Music, Art & Design, D&T, PE, Drama | AQA, Edexcel, OCR, WJEC, CCEA | `maths.ts`, `english.ts`, `science.ts`, `humanities.ts`, `computing.ts`, `languages.ts`, `social-sciences.ts`, `business-economics.ts`, `creative-practical.ts` |
| **A-Level** | Maths (Pure, Mechanics, Statistics), Biology, Chemistry, Physics, History, Geography, Psychology, Economics, Computer Science, Business | AQA, Edexcel, OCR, WJEC, CCEA | `a-level-maths.ts`, `a-level-sciences.ts`, `a-level-humanities.ts`, `a-level-other.ts` |
| **IB** | Maths AA (Analysis & Approaches), Maths AI (Applications & Interpretation), English Language & Literature, English Literature, Biology, Chemistry, Physics, Theory of Knowledge | IBO (SL/HL) | `ib.ts` |
| **AP** | Calculus AB, Calculus BC, Statistics, English Language, English Literature, Biology, Chemistry, Physics 1, Physics 2, Physics C (Mechanics), Physics C (E&M) | College Board | `ap.ts` |
| **SQA** | National 5 + Higher: Maths, English, Biology, Chemistry, Physics | SQA | `sqa.ts` |
| **CIE** | IGCSE: Maths, English, Biology, Chemistry, Physics, Combined Science | CIE | `cie.ts` |

**GCSE Tier Support:**
- **Foundation** (Grades 1-5) and **Higher** (Grades 4-9) tiers are tracked per topic
- Tier-specific content, worked examples, and difficulty calibration
- `CurriculumTier` type: `'foundation' | 'higher' | 'both' | 'single' | 'sl' | 'hl'`

**Difficulty Progression:**
- Primary: `year-1-2`, `year-3-4`, `year-5-6`
- KS3: `ks3-developing`, `ks3-secure`, `ks3-extending`
- GCSE: `grade-1-2` through `grade-9`
- A-Level: `a-level-as`, `a-level-a2`
- SQA: `sqa-n5`, `sqa-higher`
- IB: `ib-sl`, `ib-hl`
- AP: `ap-intro`, `ap-core`, `ap-advanced`

### 8.2 Exam Board Coverage

Sage's curriculum data is tagged by exam board, enabling specification-accurate teaching for each board's unique content and assessment style.

| Board | Full Name | Coverage | Notes |
|-------|-----------|----------|-------|
| **AQA** | Assessment and Qualifications Alliance | All GCSE subjects + A-Level | Largest UK exam board by entries |
| **Edexcel** | Edexcel (Pearson) | All GCSE subjects + A-Level | Part of Pearson; strong in Maths and Sciences |
| **OCR** | Oxford, Cambridge and RSA | All GCSE subjects + A-Level | Computer Science market leader |
| **WJEC** | Welsh Joint Education Committee | Welsh + English GCSE/A-Level | Primary board for Wales |
| **CCEA** | Council for the Curriculum, Examinations & Assessment | Northern Irish GCSE/A-Level | Sole board for Northern Ireland |
| **SQA** | Scottish Qualifications Authority | National 5 + Higher (Maths, English, Sciences) | Scottish education system |
| **CIE** | Cambridge International Examinations | IGCSE core subjects | International schools worldwide |
| **IBO** | International Baccalaureate Organization | SL/HL across Maths, English, Sciences, ToK | Diploma programme (16-19) |
| **CollegeBoard** | The College Board | AP courses (Calculus, Statistics, English, Sciences, Physics) | US Advanced Placement |

**Board-specific features:**
- Topic data includes `examBoards: ExamBoard[]` field per topic
- Board-specific misconceptions, vocabulary, and assessment weightings
- Content filtered by selected exam board in session context
- Past paper question alignment (where available)

---

## 9. DSPy Integration (Full Implementation)

### 9.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRODUCTION (TypeScript)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Sage/Lexi sessions → ai_feedback table → sage_sessions         │
│                                                                  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                         Weekly export
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   OPTIMIZATION (Python)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  cas/optimization/                                               │
│  ├── run_dspy.py           # Weekly cron job                    │
│  ├── signatures/                                                 │
│  │   ├── maths_solver.py                                        │
│  │   ├── english_helper.py                                      │
│  │   ├── science_explainer.py                                   │
│  │   ├── explain_concept.py                                     │
│  │   └── diagnose_error.py                                      │
│  ├── metrics/                                                    │
│  │   └── tutoring_metrics.py  # Accuracy, helpfulness           │
│  ├── data/                                                       │
│  │   └── loader.py            # Load from Supabase              │
│  └── output/                                                     │
│      └── optimized_prompts.json  # Exported for TypeScript      │
│                                                                  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                         Deploy prompts
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PRODUCTION (TypeScript)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  sage/prompts/optimized.json  ← Loaded at runtime               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 File Structure

```
cas/optimization/
├── __init__.py
├── run_dspy.py                    # Main optimization runner
├── config.py                      # Environment & settings
├── signatures/
│   ├── __init__.py
│   ├── base.py                    # Base signature class
│   ├── maths_solver.py            # Maths problem solving
│   ├── english_helper.py          # English/writing assistance
│   ├── science_explainer.py       # Science explanations
│   ├── explain_concept.py         # Generic concept explanation
│   ├── diagnose_error.py          # Error diagnosis
│   └── generate_practice.py       # Practice problem generation
├── metrics/
│   ├── __init__.py
│   ├── tutoring_metrics.py        # Core tutoring metrics
│   ├── accuracy_metrics.py        # Answer accuracy
│   └── engagement_metrics.py      # Session engagement
├── data/
│   ├── __init__.py
│   ├── loader.py                  # Supabase data loader
│   ├── preprocessor.py            # Data cleaning
│   └── sampler.py                 # Training data sampling
├── output/
│   ├── optimized_prompts.json     # Current optimized prompts
│   └── history/                   # Previous versions
│       └── 2026-02-14.json
├── tests/
│   ├── test_signatures.py
│   └── test_metrics.py
└── requirements.txt
```

### 9.3 DSPy Signatures (Python)

```python
# cas/optimization/signatures/maths_solver.py
import dspy

class MathsSolver(dspy.Signature):
    """Solve maths problems with step-by-step working across all levels.

    The solution must be pedagogically sound, showing each step clearly
    so students can follow the reasoning. Adapts to the curriculum level
    from KS1 primary through to A-Level and international qualifications.
    """

    question = dspy.InputField(desc="The maths problem to solve")
    level = dspy.InputField(desc="KS1, KS2, KS3, GCSE, A-Level, IB, AP, SQA, or University")
    student_context = dspy.InputField(
        desc="What the student has tried or where they're stuck",
        default=""
    )

    thinking = dspy.OutputField(desc="Your reasoning process (hidden from student)")
    working = dspy.OutputField(desc="Step-by-step working shown to student")
    answer = dspy.OutputField(desc="The final answer, clearly formatted")
    explanation = dspy.OutputField(desc="Why this method works")
    check = dspy.OutputField(desc="How to verify the answer is correct")


class DiagnoseError(dspy.Signature):
    """Identify the misconception behind a student's incorrect answer.

    Focus on understanding WHY they made the mistake, not just WHAT
    the mistake was. This enables targeted remediation.
    """

    question = dspy.InputField(desc="The original question")
    correct_answer = dspy.InputField(desc="The correct answer")
    student_answer = dspy.InputField(desc="What the student answered")
    student_working = dspy.InputField(desc="The student's working (if available)")

    misconception = dspy.OutputField(desc="The underlying misunderstanding")
    why_wrong = dspy.OutputField(desc="Explanation of why this approach fails")
    remediation = dspy.OutputField(desc="How to correct the understanding")
    practice_suggestion = dspy.OutputField(desc="A similar problem to try")


class ExplainConcept(dspy.Signature):
    """Explain a curriculum concept at the appropriate level.

    Adapt the explanation to the student's learning style and level.
    Use analogies, examples, and clear structure.
    """

    topic = dspy.InputField(desc="The concept to explain")
    subject = dspy.InputField(desc="Subject area (maths, english, science, etc.)")
    level = dspy.InputField(desc="KS1 through University, IB, AP, SQA, CIE")
    learning_style = dspy.InputField(
        desc="visual, auditory, reading, or kinesthetic",
        default="visual"
    )
    prior_knowledge = dspy.InputField(
        desc="What the student already knows",
        default=""
    )

    hook = dspy.OutputField(desc="An engaging opening to capture interest")
    explanation = dspy.OutputField(desc="Clear, structured explanation")
    examples = dspy.OutputField(desc="2-3 concrete examples")
    analogy = dspy.OutputField(desc="A relatable analogy if helpful")
    summary = dspy.OutputField(desc="Key takeaways in 2-3 bullet points")
    practice_prompt = dspy.OutputField(desc="A question to test understanding")


class GeneratePractice(dspy.Signature):
    """Generate practice problems for a specific topic and level."""

    topic = dspy.InputField(desc="The topic to practice")
    level = dspy.InputField(desc="Difficulty level")
    count = dspy.InputField(desc="Number of problems to generate", default="3")
    avoid_patterns = dspy.InputField(
        desc="Problem patterns to avoid (already practiced)",
        default=""
    )

    problems = dspy.OutputField(desc="List of practice problems")
    hints = dspy.OutputField(desc="Hints for each problem (hidden initially)")
    solutions = dspy.OutputField(desc="Full solutions (hidden)")
```

### 9.4 Metrics (Python)

```python
# cas/optimization/metrics/tutoring_metrics.py
import re
from typing import Optional

def tutoring_quality_metric(
    example,
    pred,
    trace=None
) -> float:
    """
    Composite metric for tutoring quality.
    Returns a score between 0 and 1.
    """
    scores = []

    # 1. Has step-by-step structure
    step_patterns = [
        r'step \d', r'first', r'then', r'next', r'finally',
        r'1\.', r'2\.', r'3\.'
    ]
    has_steps = any(
        re.search(p, pred.working.lower())
        for p in step_patterns
    )
    scores.append(1.0 if has_steps else 0.0)

    # 2. Has clear answer
    has_answer = len(pred.answer.strip()) > 0
    scores.append(1.0 if has_answer else 0.0)

    # 3. Appropriate length (not too short, not too long)
    working_length = len(pred.working.split())
    if 50 <= working_length <= 500:
        length_score = 1.0
    elif 20 <= working_length < 50 or 500 < working_length <= 800:
        length_score = 0.5
    else:
        length_score = 0.0
    scores.append(length_score)

    # 4. Uses encouraging language
    encouraging_patterns = [
        r"let's", r"great", r"well done", r"you can",
        r"try", r"think about", r"consider"
    ]
    encouragement_count = sum(
        1 for p in encouraging_patterns
        if re.search(p, pred.working.lower())
    )
    scores.append(min(encouragement_count / 3, 1.0))

    # 5. Matches expected answer (if available)
    if hasattr(example, 'expected_answer') and example.expected_answer:
        pred_answer = normalize_answer(pred.answer)
        expected = normalize_answer(example.expected_answer)
        answer_match = 1.0 if pred_answer == expected else 0.0
        scores.append(answer_match)

    return sum(scores) / len(scores)


def normalize_answer(answer: str) -> str:
    """Normalize answer for comparison."""
    answer = answer.lower().strip()
    answer = re.sub(r'\s+', ' ', answer)
    answer = re.sub(r'[£$€]', '', answer)
    return answer


def explanation_clarity_metric(example, pred, trace=None) -> float:
    """Metric for explanation clarity."""
    scores = []

    has_hook = len(pred.hook.strip()) > 10
    scores.append(1.0 if has_hook else 0.0)

    has_examples = len(pred.examples.strip()) > 20
    scores.append(1.0 if has_examples else 0.0)

    has_summary = len(pred.summary.strip()) > 10
    scores.append(1.0 if has_summary else 0.0)

    has_structure = bool(re.search(r'[-•]\s|^\d+\.', pred.explanation))
    scores.append(1.0 if has_structure else 0.0)

    return sum(scores) / len(scores)
```

### 9.5 Data Loader (Python)

```python
# cas/optimization/data/loader.py
import os
from supabase import create_client
from typing import List
import dspy

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_KEY']

def get_supabase():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def load_training_data(
    agent_type: str = 'sage',
    min_rating: str = 'thumbs_up',
    limit: int = 1000
) -> List[dspy.Example]:
    """
    Load training examples from production feedback.
    Returns examples with positive feedback for optimization.
    """
    supabase = get_supabase()

    response = supabase.table('ai_feedback') \
        .select('''
            *,
            session:sage_sessions(
                id,
                subject,
                level,
                messages,
                topics_covered
            )
        ''') \
        .eq('agent_type', agent_type) \
        .eq('rating', min_rating) \
        .order('created_at', desc=True) \
        .limit(limit) \
        .execute()

    examples = []
    for item in response.data:
        session = item.get('session')
        if not session or not session.get('messages'):
            continue

        messages = session['messages']

        for i in range(len(messages) - 1):
            if messages[i]['role'] == 'user' and messages[i+1]['role'] == 'assistant':
                example = dspy.Example(
                    question=messages[i]['content'],
                    level=session.get('level', 'GCSE'),
                    subject=session.get('subject', 'general'),
                    response=messages[i+1]['content'],
                ).with_inputs('question', 'level', 'subject')

                examples.append(example)

    return examples


def load_negative_examples(
    agent_type: str = 'sage',
    limit: int = 500
) -> List[dspy.Example]:
    """Load examples with negative feedback for contrast learning."""
    supabase = get_supabase()

    response = supabase.table('ai_feedback') \
        .select('*, session:sage_sessions(*)') \
        .eq('agent_type', agent_type) \
        .eq('rating', 'thumbs_down') \
        .order('created_at', desc=True) \
        .limit(limit) \
        .execute()

    # Process similarly to positive examples
    # Used for contrastive learning
    return [...]
```

### 9.6 Optimization Runner (Python)

```python
# cas/optimization/run_dspy.py
#!/usr/bin/env python3
"""
DSPy Optimization Runner for Sage/Lexi

Run weekly to optimize prompts based on production feedback.
Exports optimized prompts to JSON for TypeScript consumption.

Usage:
    python run_dspy.py --agent sage --signatures maths_solver,explain_concept
    python run_dspy.py --agent lexi --all
"""

import argparse
import json
import os
from datetime import datetime
from pathlib import Path

import dspy
from dspy.teleprompt import BootstrapFewShot, BootstrapFewShotWithRandomSearch

from data.loader import load_training_data, load_negative_examples
from signatures import (
    MathsSolver,
    DiagnoseError,
    ExplainConcept,
    GeneratePractice,
)
from metrics.tutoring_metrics import (
    tutoring_quality_metric,
    explanation_clarity_metric,
)

OUTPUT_DIR = Path(__file__).parent / 'output'
HISTORY_DIR = OUTPUT_DIR / 'history'

SIGNATURES = {
    'maths_solver': (MathsSolver, tutoring_quality_metric),
    'diagnose_error': (DiagnoseError, tutoring_quality_metric),
    'explain_concept': (ExplainConcept, explanation_clarity_metric),
    'generate_practice': (GeneratePractice, tutoring_quality_metric),
}


def setup_dspy():
    """Configure DSPy with LLM provider."""
    lm = dspy.Google(
        model='gemini-1.5-flash',
        api_key=os.environ['GOOGLE_AI_API_KEY'],
    )
    dspy.settings.configure(lm=lm)


def optimize_signature(
    name: str,
    signature_class,
    metric,
    training_data,
    max_demos: int = 8,
) -> dict:
    """Optimize a single signature using BootstrapFewShot."""
    print(f"\n{'='*50}")
    print(f"Optimizing: {name}")
    print(f"Training examples: {len(training_data)}")
    print(f"{'='*50}")

    module = dspy.ChainOfThought(signature_class)

    teleprompter = BootstrapFewShotWithRandomSearch(
        metric=metric,
        max_bootstrapped_demos=max_demos,
        max_labeled_demos=max_demos,
        num_candidate_programs=10,
        num_threads=4,
    )

    optimized = teleprompter.compile(
        module,
        trainset=training_data,
    )

    config = {
        'name': name,
        'signature': signature_class.__name__,
        'version': datetime.now().isoformat(),
        'optimized_at': datetime.now().isoformat(),
        'training_examples_count': len(training_data),
        'max_demos': max_demos,
        'demos': [],
        'instructions': '',
    }

    if hasattr(optimized, 'demos'):
        config['demos'] = [
            {
                'inputs': {k: getattr(d, k) for k in signature_class.input_fields()},
                'outputs': {k: getattr(d, k) for k in signature_class.output_fields()},
            }
            for d in optimized.demos
        ]

    if hasattr(optimized, 'extended_signature'):
        config['instructions'] = str(optimized.extended_signature.instructions)

    return config


def export_prompts(optimized_configs: dict):
    """Export optimized prompts to JSON for TypeScript."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)

    output = {
        'generated_at': datetime.now().isoformat(),
        'generator': 'cas/optimization/run_dspy.py',
        'signatures': optimized_configs,
    }

    with open(OUTPUT_DIR / 'optimized_prompts.json', 'w') as f:
        json.dump(output, f, indent=2)

    timestamp = datetime.now().strftime('%Y-%m-%d_%H%M%S')
    with open(HISTORY_DIR / f'{timestamp}.json', 'w') as f:
        json.dump(output, f, indent=2)

    print(f"\nExported to: {OUTPUT_DIR / 'optimized_prompts.json'}")


def main():
    parser = argparse.ArgumentParser(description='DSPy Optimization Runner')
    parser.add_argument('--agent', choices=['sage', 'lexi'], default='sage')
    parser.add_argument('--signatures', type=str, help='Comma-separated signature names')
    parser.add_argument('--all', action='store_true', help='Optimize all signatures')
    parser.add_argument('--max-demos', type=int, default=8)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    setup_dspy()

    if args.all:
        sig_names = list(SIGNATURES.keys())
    elif args.signatures:
        sig_names = [s.strip() for s in args.signatures.split(',')]
    else:
        sig_names = ['maths_solver', 'explain_concept']

    print("Loading training data...")
    training_data = load_training_data(agent_type=args.agent)
    print(f"Loaded {len(training_data)} training examples")

    if len(training_data) < 10:
        print("WARNING: Not enough training data for optimization.")
        print("Need at least 10 examples with positive feedback.")
        if not args.dry_run:
            return

    optimized_configs = {}
    for name in sig_names:
        if name not in SIGNATURES:
            print(f"Unknown signature: {name}")
            continue

        sig_class, metric = SIGNATURES[name]

        if args.dry_run:
            print(f"[DRY RUN] Would optimize: {name}")
            continue

        config = optimize_signature(
            name=name,
            signature_class=sig_class,
            metric=metric,
            training_data=training_data,
            max_demos=args.max_demos,
        )
        optimized_configs[name] = config

    if not args.dry_run and optimized_configs:
        export_prompts(optimized_configs)

    print("\nDone!")


if __name__ == '__main__':
    main()
```

### 9.7 TypeScript Integration

```typescript
// sage/prompts/types.ts
export interface OptimizedDemo {
  inputs: Record<string, string>;
  outputs: Record<string, string>;
}

export interface OptimizedSignature {
  name: string;
  signature: string;
  version: string;
  optimized_at: string;
  training_examples_count: number;
  max_demos: number;
  demos: OptimizedDemo[];
  instructions: string;
}

export interface OptimizedPrompts {
  generated_at: string;
  generator: string;
  signatures: Record<string, OptimizedSignature>;
}
```

```typescript
// sage/prompts/loader.ts
import { OptimizedPrompts, OptimizedSignature } from './types';
import optimizedData from './optimized.json';

class PromptLoader {
  private prompts: OptimizedPrompts;
  private fallbacks: Map<string, OptimizedSignature> = new Map();

  constructor() {
    this.prompts = optimizedData as OptimizedPrompts;
    this.initFallbacks();
  }

  private initFallbacks() {
    this.fallbacks.set('maths_solver', {
      name: 'maths_solver',
      signature: 'MathsSolver',
      version: '0.0.0',
      optimized_at: '',
      training_examples_count: 0,
      max_demos: 0,
      demos: [],
      instructions: `You are Sage, a patient and encouraging maths tutor.
Solve problems step-by-step, showing clear working.
Explain your reasoning so students can follow along.`,
    });
    // ... other fallbacks
  }

  getSignature(name: string): OptimizedSignature {
    const optimized = this.prompts.signatures[name];
    if (optimized && optimized.demos.length > 0) {
      return optimized;
    }
    return this.fallbacks.get(name) || this.fallbacks.get('maths_solver')!;
  }

  buildMessages(
    signatureName: string,
    userInput: Record<string, string>
  ): Array<{ role: string; content: string }> {
    const sig = this.getSignature(signatureName);
    const messages: Array<{ role: string; content: string }> = [];

    messages.push({
      role: 'system',
      content: sig.instructions || this.getDefaultInstructions(signatureName),
    });

    for (const demo of sig.demos) {
      messages.push({
        role: 'user',
        content: this.formatInputs(demo.inputs),
      });
      messages.push({
        role: 'assistant',
        content: this.formatOutputs(demo.outputs),
      });
    }

    messages.push({
      role: 'user',
      content: this.formatInputs(userInput),
    });

    return messages;
  }

  private formatInputs(inputs: Record<string, string>): string {
    return Object.entries(inputs)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  }

  private formatOutputs(outputs: Record<string, string>): string {
    return Object.entries(outputs)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n\n');
  }

  private getDefaultInstructions(name: string): string {
    const defaults: Record<string, string> = {
      maths_solver: 'You are Sage, a patient maths tutor. Solve step-by-step.',
      explain_concept: 'You are Sage. Explain concepts clearly with examples.',
      diagnose_error: 'You are Sage. Identify misconceptions kindly.',
    };
    return defaults[name] || 'You are Sage, an AI tutor.';
  }
}

export const promptLoader = new PromptLoader();
```

```typescript
// sage/subjects/maths/engine.ts
import { promptLoader } from '@/sage/prompts/loader';
import { getAIService } from '@/lib/ai';

export class MathsEngine {
  async solve(
    question: string,
    level: string,
    studentContext?: string
  ): Promise<MathsSolution> {
    const messages = promptLoader.buildMessages('maths_solver', {
      question,
      level,
      student_context: studentContext || '',
    });

    const ai = getAIService();
    const response = await ai.generate(
      messages.map(m => m.content).join('\n'),
      { temperature: 0.3 }
    );

    return this.parseResponse(response);
  }

  async diagnoseError(
    question: string,
    correctAnswer: string,
    studentAnswer: string,
    studentWorking?: string
  ): Promise<ErrorDiagnosis> {
    const messages = promptLoader.buildMessages('diagnose_error', {
      question,
      correct_answer: correctAnswer,
      student_answer: studentAnswer,
      student_working: studentWorking || '',
    });

    const ai = getAIService();
    const response = await ai.generate(
      messages.map(m => m.content).join('\n'),
      { temperature: 0.3 }
    );
    return this.parseErrorDiagnosis(response);
  }

  private parseResponse(response: string): MathsSolution {
    const sections = this.extractSections(response);
    return {
      thinking: sections.thinking || '',
      working: sections.working || response,
      answer: sections.answer || '',
      explanation: sections.explanation || '',
      check: sections.check || '',
    };
  }

  private extractSections(text: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const patterns = ['thinking', 'working', 'answer', 'explanation', 'check'];

    for (const pattern of patterns) {
      const regex = new RegExp(`${pattern}:\\s*([\\s\\S]*?)(?=\\n\\w+:|$)`, 'i');
      const match = text.match(regex);
      if (match) {
        sections[pattern] = match[1].trim();
      }
    }

    return sections;
  }
}
```

### 9.8 GitHub Actions Workflow

```yaml
# .github/workflows/dspy-optimize.yml
name: DSPy Prompt Optimization

on:
  schedule:
    - cron: '0 3 * * 0'  # Every Sunday at 3am UTC
  workflow_dispatch:
    inputs:
      agent:
        description: 'Agent to optimize (sage/lexi)'
        required: true
        default: 'sage'
      signatures:
        description: 'Signatures to optimize (comma-separated, or "all")'
        required: false
        default: 'all'

jobs:
  optimize:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install dependencies
        run: |
          pip install -r cas/optimization/requirements.txt

      - name: Run DSPy optimization
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          GOOGLE_AI_API_KEY: ${{ secrets.GOOGLE_AI_API_KEY }}
        run: |
          cd cas/optimization
          python run_dspy.py \
            --agent ${{ github.event.inputs.agent || 'sage' }} \
            --${{ github.event.inputs.signatures == 'all' && 'all' || format('signatures {0}', github.event.inputs.signatures) }}

      - name: Copy optimized prompts to Sage
        run: |
          cp cas/optimization/output/optimized_prompts.json sage/prompts/optimized.json

      - name: Check for changes
        id: changes
        run: |
          git diff --quiet sage/prompts/optimized.json || echo "changed=true" >> $GITHUB_OUTPUT

      - name: Commit and push
        if: steps.changes.outputs.changed == 'true'
        run: |
          git config user.name "CAS Optimization Bot"
          git config user.email "cas@tutorwise.com"
          git add sage/prompts/optimized.json
          git add cas/optimization/output/history/
          git commit -m "chore(sage): Update DSPy optimized prompts

          Optimized signatures based on $(date +%Y-%m-%d) feedback data.

          Co-Authored-By: CAS Optimization <cas@tutorwise.com>"
          git push

      - name: Notify on failure
        if: failure()
        run: |
          echo "DSPy optimization failed. Check logs for details."

  notify-success:
    needs: optimize
    runs-on: ubuntu-latest
    if: success()
    steps:
      - name: Success notification
        run: |
          echo "DSPy optimization completed successfully"
```

### 9.9 Requirements

```
# cas/optimization/requirements.txt
dspy-ai>=2.4.0
supabase>=2.0.0
python-dotenv>=1.0.0
```

---

## 10. SEN/SEND Support

### 10.1 Overview

Sage provides built-in support for 11 Special Educational Needs and Disabilities (SEN/SEND) categories, compliant with the UK GDPR Children's Code (Age Appropriate Design Code). The SEN module is orthogonal to age adaptation — a 7-year-old with dyslexia receives both primary age bracket adaptations AND dyslexia-specific prompt modifications.

### 10.2 Supported Categories

| Category | Key | Display Name | Recommended Modes |
|----------|-----|-------------|-------------------|
| Dyslexia | `dyslexia` | Dyslexia | Direct, Supportive |
| Dyscalculia | `dyscalculia` | Dyscalculia | Direct, Supportive |
| Dyspraxia | `dyspraxia` | Dyspraxia (DCD) | Direct, Adaptive |
| ADHD | `adhd` | ADHD | Adaptive, Supportive |
| Autism Spectrum | `asd` | Autism Spectrum | Direct, Adaptive |
| Visual Impairment | `visual-impairment` | Visual Impairment | Direct, Adaptive |
| Hearing Impairment | `hearing-impairment` | Hearing Impairment | Direct, Adaptive |
| Speech & Language | `speech-language` | Speech & Language | Direct, Supportive |
| SEMH | `social-emotional` | Social, Emotional & Mental Health | Supportive, Adaptive |
| MLD | `moderate-learning` | Moderate Learning Difficulty | Direct, Supportive |
| SpLD | `specific-learning` | Specific Learning Difficulty | Adaptive, Supportive |

### 10.3 Privacy Architecture

**Critical constraint:** SEN category labels are **never** sent to the LLM. Only behavioural instructions are injected into the system prompt. This complies with the UK GDPR Children's Code which requires data minimisation for under-18 users.

```
Student has SEN profile
        │
        ▼
┌───────────────────────┐
│ Load SENProfile from  │ → categories: ['dyslexia', 'adhd']
│ sage_student_profiles │
└─────────┬─────────────┘
          │
          ▼
┌───────────────────────┐
│ getSENAdaptations()   │ → Resolve adaptation profiles
│ (adapter.ts)          │    (prompt guidelines, forbidden patterns)
└─────────┬─────────────┘
          │
          ▼
┌───────────────────────┐
│ getSENSystemPrompt()  │ → Generate combined prompt block
│                       │   "### LEARNING SUPPORT ADAPTATIONS"
│                       │   - DO: [merged guidelines]
│                       │   - DO NOT: [merged forbidden patterns]
│                       │   NO category labels included
└─────────┬─────────────┘
          │
          ▼
┌───────────────────────┐
│ Inject into LLM       │ → System prompt includes behavioural
│ system prompt          │   instructions only
└───────────────────────┘
```

### 10.4 Module Structure

```
sage/sen/
├── types.ts               # SENCategory, SENProfile, SENAdaptation interfaces
├── adapter.ts             # SEN_ADAPTATIONS record (11 entries), public API
└── index.ts               # Re-exports
```

**Key types:**

```typescript
// sage/sen/types.ts

type SENCategory =
  | 'dyslexia' | 'dyscalculia' | 'dyspraxia' | 'adhd' | 'asd'
  | 'visual-impairment' | 'hearing-impairment' | 'speech-language'
  | 'social-emotional' | 'moderate-learning' | 'specific-learning';

interface SENAdaptation {
  category: SENCategory;
  displayName: string;
  promptGuidelines: string[];      // Injected into LLM system prompt
  contentAdaptations: string[];    // Post-processing rules
  forbiddenPatterns: string[];     // Patterns to avoid in output
  recommendedModes: ('socratic' | 'direct' | 'adaptive' | 'supportive')[];
}

interface SENProfile {
  categories: SENCategory[];
  notes?: string;                  // Free-text from parent/tutor
  adaptationLevel: 'mild' | 'moderate' | 'significant';
}
```

**Public API:**

```typescript
// sage/sen/adapter.ts

/** Get SEN adaptations for one or more categories */
function getSENAdaptations(categories: SENCategory[]): SENAdaptation[];

/** Generate combined system prompt block (no category labels) */
function getSENSystemPrompt(categories: SENCategory[]): string;

/** Get recommended teaching modes sorted by frequency */
function getRecommendedModes(categories: SENCategory[]): ('socratic' | 'direct' | 'adaptive' | 'supportive')[];
```

### 10.5 Teaching Mode Adaptation

SEN categories influence the teaching mode selection. When a student has SEN categories set, `getRecommendedModes()` aggregates the recommended modes across all active categories and sorts by frequency, giving the most commonly recommended mode the highest priority.

| Teaching Mode | Description | Typical SEN Match |
|---------------|-------------|-------------------|
| **Direct** | Explicit instruction, clear steps, minimal ambiguity | Dyslexia, Dyscalculia, ASD, MLD |
| **Supportive** | Warm, encouraging, growth mindset, celebrates effort | SEMH, Speech & Language, ADHD |
| **Adaptive** | Varies format, multi-sensory, responds to engagement | ADHD, SpLD, Dyspraxia |
| **Socratic** | Guided questioning (used sparingly with SEN) | Typically not recommended for SEN |

### 10.6 Example: Dyslexia + ADHD Combined Prompt

When a student has both dyslexia and ADHD, `getSENSystemPrompt(['dyslexia', 'adhd'])` produces:

```
### LEARNING SUPPORT ADAPTATIONS

This student has specific learning needs. Follow these guidelines strictly:

**DO:**
- Use short paragraphs (2-3 sentences maximum)
- Present information in bullet points rather than dense prose
- Bold key terms when first introduced
- Avoid walls of text — use clear visual spacing
- Provide phonetic pronunciation for complex vocabulary in brackets
- Use concrete, familiar words before introducing technical terms
- Never rush — allow time to process without pressure
- Offer structured vocabulary support (word → definition → example)
- Keep responses SHORT and focused (3-5 sentences per section)
- Use numbered steps for all procedures
- Include frequent check-in questions ("Does that make sense so far?")
- Provide clear structure with headers and visual breaks
- Offer gamified progress markers ("Great — 2 out of 3 steps done!")
- Vary the format between explanations (text, examples, questions)
- Use positive reinforcement frequently
- Minimise distractions — stay focused on one concept at a time

**DO NOT:**
- Timed exercises or countdown pressure
- Dense blocks of unbroken text
- Multiple instructions in a single sentence
- Long unbroken explanations
- Multiple topics in one response
- Passive or monotonous tone
```

Note: No mention of "dyslexia" or "ADHD" appears in the prompt sent to the LLM.

---

## 11. Platform Integration

### 11.1 PlatformUserContext Enrichment

Sage integrates with the Conductor Phase 4C PlatformUserContext system. When a Sage session starts, the context resolver enriches the session with:

```typescript
// Integration with apps/web/src/lib/platform/user-context.ts

interface EnrichedSageContext {
  // Core role context
  role: SagePersona;
  userId: string;

  // Platform enrichment (from PlatformUserContext)
  growthScores?: GrowthScores;        // From growth_scores table
  referralStats?: ReferralStats;      // Referral activity
  marketplaceActivity?: MarketplaceActivity;  // Booking history
  platformSignals?: PlatformSignal[];  // Engagement signals

  // Sage-specific
  senProfile?: SENProfile;
  learningContext: LearningContext;
  episodicMemory?: MemoryBlock;       // From agent memory
}
```

### 11.2 Agent Episodic Memory

Sage leverages the Phase 7 agent episodic memory system (`memory_episodes` + `memory_facts` tables) to remember previous interactions and build a longitudinal understanding of each student's learning journey.

**Integration points:**
- `AgentMemoryService.fetchMemoryBlock()` — retrieves relevant past episodes and facts at session start
- Episodes are recorded after each session via `AgentMemoryService.recordEpisode()` (fire-and-forget)
- Facts are extracted from longer sessions (>200 chars output) via `AgentMemoryService.extractAndStoreFacts()`
- Memory is injected as a `PAST EXPERIENCE` section in the system prompt

**Example memory facts for a student:**
- "StudentA | struggles-with | quadratic-factoring" (valid_from: 2026-03-01)
- "StudentA | mastered | simultaneous-equations" (valid_from: 2026-03-10)
- "StudentA | prefers | visual-explanations" (valid_from: 2026-02-28)

### 11.3 Conductor Ecosystem

Sage operates within the Conductor ecosystem as both a consumer and producer:

| Integration | Direction | Description |
|------------|-----------|-------------|
| **Knowledge Base** | Consumer | Queries `platform_knowledge_chunks` via RAG for curriculum content |
| **Intelligence Layer** | Producer | Session data feeds into intelligence daily tables for analytics |
| **Agent Teams** | Participant | Can be invoked as a specialist within team workflows |
| **Process Studio** | Trigger | Booking lifecycle processes can trigger Sage onboarding sessions |

### 11.4 Growth Agent Handoff

When Sage detects that a user's query falls outside the teaching domain (e.g., pricing strategy, referral questions, business setup), it performs a seamless handoff to the Growth Agent via the `agent-handoff.ts` cross-agent handoff service:

```
Student asks about tutoring rates
        │
        ▼
┌───────────────────┐
│ Sage detects      │ → Not a teaching question
│ off-domain query  │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ agent-handoff.ts  │ → Transfer context to Growth Agent
│ handoff service   │
└───────────────────┘
```

---

## 12. Future-Proofing Components

### 12.1 Standardized Message Envelope

Shared with Lexi and CAS for inter-agent communication:

```typescript
// messages/envelope.ts

interface MessageEnvelope {
  id: string;                    // UUID
  from: string;                  // "sage" | "lexi" | "cas:planner" | etc.
  to: string;                    // Target agent/service
  type: string;                  // "feedback" | "request" | "response"
  payload: unknown;              // Typed per message type
  correlation_id?: string;       // For request/response matching
  timestamp: string;             // ISO 8601
  version: string;               // Protocol version (e.g., "1.0.0")
  protocol?: string;             // Future: "a2a" | "mcp" when external
}

// Example: Feedback to CAS
{
  "id": "msg_abc123",
  "from": "sage",
  "to": "cas:feedback",
  "type": "feedback",
  "payload": {
    "session_id": "sage_xyz",
    "rating": "thumbs_down",
    "comment": "Explanation was too complex",
    "context": { "subject": "maths", "level": "GCSE", "role": "student" }
  },
  "correlation_id": null,
  "timestamp": "2026-02-14T10:30:00Z",
  "version": "1.0.0"
}
```

### 12.2 OpenAI-Compatible Tool Calling

Expose Sage actions as tools for external integration:

```typescript
// tools/registry.ts

const sageTools = [
  {
    type: "function",
    function: {
      name: "solve_maths",
      description: "Solve a maths problem with step-by-step working at any level",
      parameters: {
        type: "object",
        properties: {
          question: { type: "string", description: "The maths problem" },
          level: { type: "string", enum: ["KS1", "KS2", "KS3", "GCSE", "A-Level", "IB", "AP", "University"] },
          show_working: { type: "boolean", default: true }
        },
        required: ["question"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "explain_concept",
      description: "Explain a curriculum concept at the appropriate level",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string" },
          subject: { type: "string", enum: ["maths", "english", "science", "computing", "humanities", "languages", "social-sciences", "business", "arts"] },
          level: { type: "string", enum: ["KS1", "KS2", "KS3", "GCSE", "A-Level", "IB", "AP", "SQA", "CIE"] }
        },
        required: ["topic", "subject", "level"]
      }
    }
  },
  // ... more tools
];
```

### 12.3 A2A/MCP Compatibility Markers

Version field allows future protocol negotiation:

```typescript
// When external A2A agents emerge
if (message.protocol === 'a2a') {
  // Handle A2A protocol specifics
} else if (message.protocol === 'mcp') {
  // Handle MCP protocol (Conductor Phase 8)
} else {
  // Internal Tutorwise protocol
}
```

---

## 13. Progress Tracking

### 13.1 Data Model

```typescript
interface StudentProgress {
  studentId: string;
  subject: SageSubject;
  level: SageLevel;

  // Topic mastery
  topics: {
    [topicId: string]: {
      mastery: number;           // 0-100
      lastPracticed: Date;
      practiceCount: number;
      errorPatterns: string[];
    };
  };

  // Spaced repetition
  topicQueue: string[];          // Next topics to review

  // Overall stats
  totalSessions: number;
  totalQuestions: number;
  averageAccuracy: number;
  streak: number;

  // SEN tracking
  senCategories?: SENCategory[];
  adaptationEffectiveness?: number; // 0-100, tracked over time
}
```

### 13.2 Role-Specific Views

| Role | Progress View |
|------|---------------|
| **Student** | Personal dashboard: mastery, streak, next topics, XP/badges |
| **Client** | Child summary: overall progress, recent activity, areas to focus |
| **Tutor** | Student overview: all linked students, group patterns, SEN notes |
| **Agent** | Portfolio view: all assigned students, aggregate metrics |

---

## 13A. Virtual Space & AI Canvas Whiteboard

The Virtual Space is Sage's live collaborative whiteboard, shared between tutor and student(s) during a session. The AI canvas subsystem allows Sage to autonomously draw subject-specific diagrams directly onto the whiteboard in response to student questions.

### 13A.1 Technology Stack

| Component | Technology | Version | Notes |
|-----------|-----------|---------|-------|
| Whiteboard engine | [tldraw](https://tldraw.dev) | **4.5.3** | Upgraded from 4.3.0 in Phase 8 |
| AI canvas pattern | TLDraw Agent Starter Kit | — | Adopted pattern: `BaseActionUtil`, `AgentActionRegistry`, `PromptPartUtil` |
| Custom shapes | 24 `ShapeUtil` classes | — | Subject-specific: maths, science, data viz, English/humanities, computing, plus tldraw built-in `geo` |
| Zod validation | Zod v3 | — | Per-type schema dispatch with `z.preprocess` for LLM array coercion |
| Streaming protocol | Server-Sent Events (SSE) | — | `readSSEStream()` shared helper; `AbortController` for cancel |

### 13A.2 Architecture Overview

```
VirtualSpaceClient.tsx
        │
        │  extraContextFn()  ← multi-student signals + lesson plan phase
        ▼
useSageVirtualSpace.ts  ─────────────── AbortController cancel()
        │
        │  SSE streaming  /api/sage/virtualspace/message
        │                 /api/sage/virtualspace/observe
        │                 /api/sage/virtualspace/session
        │                 /api/sage/virtualspace/deactivate
        ▼
  API Route (server)
        │
        │  getCanvasSystemPrompt()  ─────────── CanvasSystemPromptPart.ts
        │                                            │
        │                                            ▼
        │                                   AgentActionRegistry
        │                                            │  lazy-loads on first call
        │                                            ▼
        │                               ┌─────────────────────────┐
        │                               │     ActionUtils (6)      │
        │                               │  MathActionUtil          │
        │                               │  ScienceActionUtil       │
        │                               │  DataVizActionUtil       │
        │                               │  ComputingActionUtil     │
        │                               │  EnglishHumanitiesUtil   │
        │                               │  GeoShapeActionUtil      │
        │                               └─────────────────────────┘
        │
        │  LLM response (SSE stream)
        ▼
  parseStreamingBuffer()  ──── canvasBlockParser.ts
        │
        ├── displayText  →  chat UI (markdown + LaTeX)
        └── shapes[]     →  stampShapesOnEditor()
                                    │
                                    ▼
                            applyAgentActions()
                                    │
                                    ▼
                        AgentActionRegistry.applySpec()
                                    │
                                    ▼
                         ActionUtil.applyToEditor()  (async, dynamic imports)
                                    │
                         ┌──────────┴──────────┐
                         │ Attribution frame    │  dashed teal geo rectangle
                         │ (meta: sageFrame)    │  4px outside main shape
                         └──────────────────────┘
                                    │
                         ┌──────────┴──────────┐
                         │ Main custom shape    │  opacity: 0.85
                         │ (meta: sageAttributed│  validated props via Zod
                         └──────────────────────┘
```

### 13A.3 Agent Starter Kit Adaptation

Sage adopts the architectural patterns from the [TLDraw Agent Starter Kit](https://tldraw.dev/docs/ai) with modifications for server-side safety and multi-subject dispatch:

| Starter Kit Concept | Sage Implementation | Location |
|--------------------|--------------------|--------------------|
| `AgentActionUtil` | `BaseActionUtil<TSchema>` | `agent/BaseActionUtil.ts` |
| `AgentModeDefinitions` | `AgentActionRegistry` (lazy singleton) | `agent/AgentActionRegistry.ts` |
| `PromptPartUtil` | `CanvasSystemPromptPart` / `getCanvasSystemPrompt()` | `agent/prompt-parts/CanvasSystemPromptPart.ts` |
| Tool-use loop | `[CANVAS]{JSON}[/CANVAS]` in-stream protocol | `canvas/canvasBlockParser.ts` |
| Per-action schema | Per-type Zod schema map (`MATH_SCHEMAS`, etc.) | Each ActionUtil file |

**Server-safety rule:** ActionUtil files must not import `tldraw` or `SageCanvasWriter` at the top level. API routes evaluate these modules server-side, where `React.createContext()` is unavailable. All tldraw imports are deferred with `await Promise.all([import('tldraw'), import('...')])` inside `applyToEditor()`.

### 13A.4 [CANVAS] Block Protocol

The LLM emits canvas instructions inline with its streamed response:

```
[CANVAS]
{"type":"graph-axes","props":{"xMin":-5,"xMax":5,"yMin":-5,"yMax":5,"showGrid":true}}
[/CANVAS]
```

**Rules enforced in system prompt:**
- JSON must have exactly `"type"` and `"props"` — never flatten props to top level
- At most one `[CANVAS]` block per response
- Block must not appear inside a markdown code fence
- For array fields (`segments`, `bars`, `events`, `stages`, `branches`, `functions`, `shells`, `forces`): value must be a JSON-serialised string
- Use subject-specific shapes **only** for subject-specific problems; use `geo` for generic drawing requests ("draw a box", "draw a line")

**Parsing failure modes handled:**

| Failure | Handling |
|---------|----------|
| Missing `"type"` key | Warn + skip block |
| Flat JSON (props at top level, no `"props"` key) | Auto-promote all non-`type` keys into `props` |
| Block inside code fence | Skip (treated as literal text) |
| Invalid JSON | Warn + skip |
| LLM sends array literal for array field | `z.preprocess` coerces to JSON string |
| Incomplete block during streaming | Hidden from display; accumulated in `remainingBuffer` until `[/CANVAS]` arrives |

**Display replacement:** Each `[CANVAS]...[/CANVAS]` block is replaced in chat with `*↗ Added to canvas*`.

### 13A.5 Custom Shape Types (24 Shapes)

All custom shapes extend `ShapeUtil<any>` (tldraw v4.5.x constraint — `TLBaseShape` types do not satisfy `extends TLShape` without full module augmentation).

#### Maths (MathActionUtil — 10 types)

| Shape Type | Key Props | Use Case |
|------------|-----------|----------|
| `math-equation` | `latex`, `displayMode`, `color`, `fontSize` | Any algebraic expression, formula |
| `number-line` | `min`, `max`, `step`, `markers[]`, `showFractions` | Number sense, ordering, fractions |
| `fraction-bar` | `numerator`, `denominator`, `showEquivalent` | Fraction visualisation |
| `graph-axes` | `xMin`, `xMax`, `yMin`, `yMax`, `showGrid`, `title` | Blank coordinate grid |
| `pythagoras` | `sideA`, `sideB`, `showWorking`, `showAngles` | Right-triangle diagram |
| `protractor` | `angle`, `showArm`, `showLabels` | Angle measurement |
| `unit-circle` | `angleDeg`, `showCoords`, `showSpecialAngles` | Trigonometry reference |
| `line-segment` | `x1`, `y1`, `x2`, `y2`, `labelA`, `labelB`, `showGrid` | Coordinate geometry only |
| `function-plot` | `xMin/Max`, `yMin/Max`, `functions` (JSON string) | Plot linear, quadratic, trig curves |
| `trig-triangle` | `angleDeg`, `hypotenuse`, `showSOHCAHTOA` | SOH-CAH-TOA working |

#### Science (ScienceActionUtil — 5 types)

| Shape Type | Key Props | Use Case |
|------------|-----------|----------|
| `chemical-equation` | `reactants`, `products`, `arrow`, `conditions`, `isReversible`, `showStateSymbols` | Balanced equations |
| `wave-diagram` | `amplitude`, `frequency`, `waveType` (transverse/longitudinal), `showLabels` | Wave properties |
| `forces-diagram` | `bodyLabel`, `forces` (JSON string: label/direction/magnitude/color) | Free-body diagrams |
| `bohr-atom` | `symbol`, `protons`, `neutrons`, `shells` (JSON string), `showNumbers` | Atomic structure |
| `circuit-component` | `componentType`, `label`, `value`, `showLabel` | Circuit diagram component |

#### Data Visualisation (DataVizActionUtil — 4 types)

| Shape Type | Key Props | Use Case |
|------------|-----------|----------|
| `pie-chart` | `segments` (JSON string: label/value/color), `title`, `showPercentages` | Data proportions |
| `bar-chart` | `bars` (JSON string), `xLabel`, `yLabel`, `showValues`, `showGrid` | Categorical data |
| `venn-diagram` | `leftLabel`, `rightLabel`, `leftContent`, `centerContent`, `rightContent` | Set relationships |
| `probability-tree` | `branches` (JSON string: label/prob/color/children) | Probability calculations |

#### English & Humanities (EnglishHumanitiesActionUtil — 3 types)

| Shape Type | Key Props | Use Case |
|------------|-----------|----------|
| `story-mountain` | `title`, `stages` (JSON string: label/description) | Plot structure analysis |
| `annotation` | `text`, `highlightColor`, `annotationType`, `showBadge` | Text markup, glossary |
| `timeline` | `events` (JSON string: label/date/color), `title`, `lineColor` | Historical chronology |

#### Computing (ComputingActionUtil — 1 type)

| Shape Type | Key Props | Use Case |
|------------|-----------|----------|
| `flowchart` | `steps` (JSON string), `title` | Algorithm / pseudocode flow |

#### Built-in tldraw Shapes (GeoShapeActionUtil — `geo` type)

Used for all **generic** drawing requests. LLM selects via `props.geo`:

`rectangle` · `ellipse` · `triangle` · `diamond` · `star` · `pentagon` · `hexagon` · `octagon` · `arrow-right` · `arrow-left` · `arrow-up` · `arrow-down` · `cloud` · `trapezoid` · `heart`

**Routing rule:** LLM is instructed to use `geo` for any generic request ("draw a box", "draw a line from A to B") and reserve subject-specific types for subject problems only. `line-segment` is explicitly annotated as "coordinate geometry only — NOT generic drawing".

### 13A.6 ActionUtil Pattern

Each ActionUtil extends `BaseActionUtil<TSchema>` and provides:

```typescript
abstract class BaseActionUtil<TSchema extends z.ZodTypeAny> {
  abstract readonly types: string[];        // shape type(s) handled
  abstract readonly schema: TSchema;         // fallback Zod schema
  abstract buildPromptSnippet(): string;     // contributes to LLM system prompt

  validateProps(rawProps, type?): output;    // dispatches to per-type schema
  applyToEditor(editor, spec, index): Promise<void>;  // stamps shape on canvas
}
```

**Per-type schema dispatch** (used by `MathActionUtil`, `ScienceActionUtil`, `DataVizActionUtil`, `EnglishHumanitiesActionUtil`, `ComputingActionUtil`):

```typescript
const MATH_SCHEMAS: Record<string, z.ZodTypeAny> = {
  'math-equation': mathEquationSchema,
  'number-line':   numberLineSchema,
  // ...
};

override validateProps(rawProps, type?) {
  const schema = type ? MATH_SCHEMAS[type] : undefined;
  if (schema) {
    try { return schema.parse(rawProps ?? {}); }
    catch { return schema.parse({}); }  // fallback to defaults
  }
  return rawProps ?? {};
}
```

**Attribution frame** (`BaseActionUtil.applyToEditor`): Every Sage-stamped shape receives a dashed teal `geo` rectangle 4px outside its bounds, marked `meta: { sageFrame: true }`. The main shape is marked `meta: { sageAttributed: true }` with `opacity: 0.85`.

### 13A.7 System Prompt Generation

`CanvasSystemPromptPart` / `getCanvasSystemPrompt()` generates the full canvas instruction block by concatenating each ActionUtil's `buildPromptSnippet()`. The result is module-level cached (safe in Next.js — hot-reload resets it in dev; it lives for the process lifetime in production, which is acceptable since the prompt only changes with code deployments).

`AgentActionRegistry.buildSystemPrompt()` also injects top-level rules before the per-util snippets:
- JSON structure rule (`"type"` + `"props"` required)
- One block per response
- Array field serialisation rule
- Shape selection routing rule

### 13A.8 Hook Architecture (useSageVirtualSpace)

```typescript
useSageVirtualSpace(options: {
  sageSessionId?: string;
  extraContextFn?: () => string;   // injected on every sendMessage — multi-student signals + lesson plan phase
}) → {
  messages, isLoading, isObserving,
  sendMessage(text): void,
  observe(): void,
  cancel(): void,           // AbortController-based cancel of in-flight SSE
  deactivate(): void,
}
```

**`extraContextFn` pattern:** `VirtualSpaceClient.tsx` passes a stable ref callback that returns a runtime string containing multi-student intelligence signals and the current lesson plan phase. This is appended to the API body as `extraContext` on every `sendMessage`, injected after `CANVAS_INSTRUCTIONS` in the system prompt — decoupling the hook from the multi-student and lesson plan modules.

**SSE streaming:** Both `sendMessage` and `observe` use a shared `readSSEStream(reader, { onChunk, onDone, onError })` helper. Each request creates a fresh `AbortController`; the previous controller is aborted before starting a new request. `AbortError` is caught silently.

### 13A.9 Virtualspace API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sage/virtualspace/session` | GET/POST | Create or retrieve a virtualspace Sage session |
| `/api/sage/virtualspace/message` | POST | Send student message — SSE stream with [CANVAS] blocks |
| `/api/sage/virtualspace/observe` | POST | Tutor-initiated canvas observation mode — SSE stream |
| `/api/sage/virtualspace/deactivate` | POST | End session, generate recap with misconceptions from `recentMessages` |

**`message` body:**
```json
{
  "sageSessionId": "sage_vs_abc123",
  "message": "Can you draw the graph of y = x²?",
  "conversationHistory": [...],
  "extraContext": "Multi-student context: 3 students active. Lesson plan: Quadratic functions (Phase 2/4)."
}
```

**`observe` system prompt:** Built via `buildObserveSystemPrompt()` which calls `await getCanvasSystemPrompt()` — the tutor observe mode gets the same canvas capability as student chat mode.

### 13A.10 tldraw v4.5.3 Upgrade Notes

- Upgraded from `^4.3.0` to `^4.5.3` in `apps/web/package.json`
- `ShapeUtil<T>` in v4.5.x constrains `T extends TLShape`. Custom shapes defined via `TLBaseShape<type, props>` are not in the `TLShape` union without full module augmentation. All 24 custom `ShapeUtil` files use `ShapeUtil<any>` at the class level — specific types are preserved in method signatures only.
- tldraw built-in `geo` shape: `props.label` replaces `props.text` (v4 breaking change); no `richText` needed for attribution frames
- `createShapeId()` imported dynamically inside `applyToEditor()` (not at module level)

---

## 14. API Specification

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sage/session` | GET/POST | Start or retrieve session (subject, level, role context, SEN profile) |
| `/api/sage/message` | POST | Send message (non-streaming response) |
| `/api/sage/stream` | POST | Send message (streaming response) |
| `/api/sage/capabilities` | GET | List capabilities for role |
| `/api/sage/history` | GET | Session history for current user |
| `/api/sage/materials` | GET/POST | Teaching materials management |
| `/api/sage/progress` | GET | Get progress for student(s) |
| `/api/sage/mastery` | GET | Mastery tracking per topic |
| `/api/sage/assessment` | POST | Assessment/quiz generation |
| `/api/sage/grade` | POST | Grading/marking student work |
| `/api/sage/feedback` | POST | Student feedback collection |
| `/api/sage/gamification` | GET | Gamification metrics (XP, badges, streaks) |
| `/api/sage/growth-report` | GET | Student growth reports |
| `/api/sage/image-solve` | POST | Solve problems from uploaded images |
| `/api/sage/ocr` | POST | Optical character recognition for handwriting |
| `/api/sage/transcribe` | POST | Audio transcription for voice input |
| `/api/sage/subscription` | GET | Sage Pro subscription status |
| `/api/sage/usage` | GET | Usage statistics (questions remaining, storage) |
| `/api/sage/admin-metrics` | GET | Admin analytics dashboard data |
| `/api/sage/virtualspace/session` | GET/POST | Create or retrieve a Virtual Space Sage session |
| `/api/sage/virtualspace/message` | POST | Student message in Virtual Space — SSE stream, supports [CANVAS] blocks and `extraContext` |
| `/api/sage/virtualspace/observe` | POST | Tutor observe mode — SSE stream with canvas capability |
| `/api/sage/virtualspace/deactivate` | POST | End Virtual Space session, generate recap with observed misconceptions |

### POST /api/sage/session

**Request:**
```json
{
  "subject": "maths",
  "level": "GCSE",
  "sessionGoal": "homework_help",
  "examBoard": "AQA"
}
```

**Response:**
```json
{
  "sessionId": "sage_abc123",
  "persona": "student",
  "tutorName": "Sage (Maths Tutor)",
  "greeting": "Hi! I'm Sage, your maths tutor. What would you like to work on today?",
  "capabilities": ["solve_problems", "explain_concepts", "generate_practice"],
  "context": {
    "level": "GCSE",
    "examBoard": "AQA",
    "learningStyle": "visual",
    "linkedTutors": ["tutor_xyz"],
    "senAdaptationsActive": true
  },
  "expiresAt": "2026-02-15T08:33:00Z"
}
```

---

## 15. AI Provider Chain

Sage uses the shared AI service (`apps/web/src/lib/ai/`) with a 6-tier fallback chain. The `getAIService()` singleton manages provider selection and automatic failover.

| Tier | Provider | Model | Role | Env Var |
|------|----------|-------|------|---------|
| 1 | xAI | Grok 4 Fast | Primary | `XAI_AI_API_KEY` |
| 2 | Google | Gemini Flash | Fast fallback | `GOOGLE_AI_API_KEY` |
| 3 | DeepSeek | R1 | Reasoning fallback | `DEEPSEEK_AI_API_KEY` |
| 4 | Anthropic | Claude Sonnet 4.6 | Quality fallback | `ANTHROPIC_AI_API_KEY` |
| 5 | OpenAI | GPT-4o | Broad fallback | `OPENAI_AI_API_KEY` |
| 6 | Rules-based | N/A | Offline fallback | None (hardcoded) |

**Key behaviours:**
- All providers check both `*_AI_API_KEY` and `*_API_KEY` naming conventions
- Automatic failover on provider error, rate limit, or timeout
- Rules-based fallback ensures Sage never returns an error to the student
- Embedding model: `gemini-embedding-001` with `outputDimensionality: 768`
- Shared singleton: `getAIService()` from `apps/web/src/lib/ai/`

**Methods:**
- `generate(prompt, options)` — Single-turn generation
- `generateJSON<T>(prompt, options)` — Structured JSON output
- `stream(prompt, options)` — Streaming response for chat UI

---

## 16. Competitive Positioning

### 16.1 Market Landscape

| Competitor | Strengths | Limitations | Sage Advantage |
|-----------|-----------|-------------|----------------|
| **Century Tech** | AI adaptive learning, real-time pathway adjustment, strong UK school adoption | Closed ecosystem, no marketplace, limited SEN support, expensive per-seat licensing | Marketplace integration, tutor-created content via RAG, 11 SEN categories, £10/month flat |
| **Quizlet** | Massive flashcard library, AI-powered study modes, brand recognition | No tutoring capability, no curriculum alignment, no UK exam board specificity | Full UK curriculum alignment (AQA/Edexcel/OCR/WJEC/CCEA), step-by-step teaching, not just recall |
| **Numerade** | Video + AI step-by-step, strong STEM coverage, large content library | US-focused, no UK curriculum, no SEN support, no marketplace integration | UK-first design, SEN/SEND compliant, connects AI tutoring with human tutor marketplace |
| **Khanmigo** (Khan Academy) | Strong pedagogy research, Socratic method, free tier | US curriculum bias, limited exam board specificity, no tutor marketplace | UK exam board precision, tutor-uploaded materials, marketplace revenue loop |
| **Seneca Learning** | Good GCSE/A-Level coverage, spaced repetition, free for students | No AI tutoring (pre-scripted), no personalisation, no SEN adaptations | AI-powered personalisation, SEN support, dynamic responses, tutor voice integration |

### 16.2 Sage's Unique Value Proposition

1. **Marketplace integration** — Sage is the only AI tutor embedded within a tutoring marketplace, creating a flywheel: AI tutoring drives platform engagement, which drives human tutor bookings
2. **Tutor-created content** — RAG pipeline ingests tutors' own PowerPoints and materials, teaching in the tutor's voice even when they are offline
3. **SEN/SEND compliance** — 11 categories with UK GDPR Children's Code privacy, no competitor offers this at scale
4. **Full UK curriculum alignment** — Every topic tagged to exam board specifications (AQA, Edexcel, OCR, WJEC, CCEA) plus international (IB, AP, SQA, CIE)
5. **6-tier AI resilience** — Never fails; rules-based fallback ensures 100% availability

---

## 17. UI Components

### Component Hierarchy

```
apps/web/src/components/feature/sage/
├── index.ts
├── SageChat.tsx               # Main chat interface
├── SageChat.module.css        # Purple/indigo theme
├── SageMarkdown.tsx           # Markdown with LaTeX support
├── SageMarkdown.module.css
├── SageProUpgradeModal.tsx    # Pro upgrade prompt
├── SageProUpgradeModal.module.css
├── SageQuotaDisplay.tsx       # Usage quota display
├── SageQuotaDisplay.module.css
├── useSageChat.ts             # Chat hook (session management, streaming)
├── sidebar/                   # Sidebar widgets
│   ├── SageHelpWidget.tsx     # Help/tips panel
│   ├── SageStatsWidget.tsx    # Statistics display
│   ├── SageTipWidget.tsx      # Learning tips
│   └── SageVideoWidget.tsx    # Video tutorials
└── widgets/                   # Feature widgets
    ├── index.ts
    ├── SageHelpWidget.tsx     # Contextual help
    ├── SageProgressWidget.tsx # Progress display
    ├── SageSubscriptionWidget.tsx  # Subscription status
    ├── SageTipsWidget.tsx     # Tips collection
    └── SageVideoWidget.tsx    # Video library
```

### Entry Points by Role

| Role | Entry Point | Location |
|------|-------------|----------|
| **Tutor** | "Ask Sage" button | Tutor dashboard |
| **Agent** | "Ask Sage" button | Agent dashboard |
| **Client** | "Help my child learn" | Client profile, child's page |
| **Student** | "Learn with Sage" | Student dashboard, mobile app |
| **Tutor + Student** | Virtual Space | `/virtualspace/[sessionId]` — live collaborative whiteboard |

### Virtual Space Component Tree

```
apps/web/src/components/feature/virtualspace/
├── EmbeddedWhiteboard.tsx         # tldraw 4.5.3 wrapper — registers all custom shapes
├── VirtualSpaceLayout.tsx         # Session layout + sidebar
│
├── agent/                         # AI Canvas — TLDraw Agent Starter Kit pattern
│   ├── BaseActionUtil.ts          # Abstract base: validateProps, applyToEditor (async, server-safe)
│   ├── AgentActionRegistry.ts     # Lazy singleton: getUtil, buildSystemPrompt, applySpec
│   ├── applyAgentActions.ts       # Thin wrapper: sequential spec application
│   ├── prompt-parts/
│   │   └── CanvasSystemPromptPart.ts  # getCanvasSystemPrompt() — module-cached
│   └── actions/
│       ├── index.ts               # registerActionUtils() — import order = prompt order
│       ├── MathActionUtil.ts      # 10 types: math-equation, number-line, fraction-bar…
│       ├── ScienceActionUtil.ts   # 5 types: chemical-equation, wave-diagram…
│       ├── DataVizActionUtil.ts   # 4 types: pie-chart, bar-chart, venn-diagram, probability-tree
│       ├── ComputingActionUtil.ts # 1 type: flowchart
│       ├── EnglishHumanitiesActionUtil.ts  # 3 types: story-mountain, annotation, timeline
│       └── GeoShapeActionUtil.ts  # tldraw built-in geo (generic shapes)
│
├── canvas/
│   ├── canvasBlockParser.ts       # [CANVAS]…[/CANVAS] parser (streaming + complete)
│   ├── SageCanvasWriter.tsx       # stampShapesOnEditor → AgentActionRegistry, findStampPosition
│   └── __tests__/
│       └── canvasBlockParser.test.ts
│
├── hooks/
│   ├── useSageVirtualSpace.ts     # Core hook: sendMessage, observe, cancel, extraContextFn
│   ├── useLessonPlan.ts           # Lesson plan phase tracking
│   ├── useMultiStudentIntelligence.ts  # Multi-student signals (feeds extraContextFn)
│   ├── useSageStuckDetector.ts    # Detect when student is stuck
│   └── useCopilotWhispers.ts      # Tutor copilot whispers
│
└── whiteboard/
    ├── panels/
    │   └── SubjectToolsPanel.tsx  # Manual shape insertion panel
    └── shapes/                    # 24 custom ShapeUtil files (all extends ShapeUtil<any>)
        ├── MathEquationShapeUtil.tsx
        ├── NumberLineShapeUtil.tsx
        ├── FractionBarShapeUtil.tsx
        ├── GraphAxesShapeUtil.tsx
        ├── PythagorasShapeUtil.tsx
        ├── ProtractorShapeUtil.tsx
        ├── UnitCircleShapeUtil.tsx
        ├── LineShapeUtil.tsx
        ├── FunctionPlotShapeUtil.tsx
        ├── TrigTriangleShapeUtil.tsx
        ├── ChemicalEquationShapeUtil.tsx
        ├── WaveDiagramShapeUtil.tsx
        ├── ForcesDiagramShapeUtil.tsx
        ├── BohrAtomShapeUtil.tsx
        ├── CircuitShapeUtil.tsx
        ├── PieChartShapeUtil.tsx
        ├── BarChartShapeUtil.tsx
        ├── VennDiagramShapeUtil.tsx
        ├── ProbabilityTreeShapeUtil.tsx
        ├── FlowchartShapeUtil.tsx
        ├── StoryMountainShapeUtil.tsx
        ├── AnnotationShapeUtil.tsx
        ├── TimelineShapeUtil.tsx
        └── EmbedShapeUtil.tsx
```

---

## 18. Database Schema

### sage_sessions
```sql
CREATE TABLE sage_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  persona TEXT NOT NULL,           -- 'tutor', 'agent', 'client', 'student'
  subject TEXT,                    -- 'maths', 'english', 'science', 'computing', etc.
  level TEXT,                      -- 'KS1', 'KS2', 'KS3', 'GCSE', 'A-Level', 'IB', 'AP', etc.
  exam_board TEXT,                 -- 'AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA', 'SQA', 'CIE', 'IBO', 'CollegeBoard'
  session_goal TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  topics_covered TEXT[],
  status TEXT DEFAULT 'active',
  metadata JSONB
);
```

### sage_progress
```sql
CREATE TABLE sage_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id),
  subject TEXT NOT NULL,
  level TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  mastery_score INTEGER DEFAULT 0,  -- 0-100
  practice_count INTEGER DEFAULT 0,
  last_practiced_at TIMESTAMPTZ,
  error_patterns JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, subject, level, topic_id)
);
```

### sage_student_profiles
```sql
CREATE TABLE sage_student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  sen_categories TEXT[],             -- SEN/SEND category keys
  sen_notes TEXT,                    -- Free-text notes from parent/tutor
  sen_adaptation_level TEXT DEFAULT 'mild',  -- 'mild', 'moderate', 'significant'
  preferred_learning_style TEXT,     -- 'visual', 'auditory', 'kinesthetic', 'mixed'
  preferred_exam_board TEXT,         -- Default exam board preference
  current_level TEXT,               -- Current curriculum level
  overall_mastery INTEGER DEFAULT 0, -- 0-100 aggregate
  total_xp INTEGER DEFAULT 0,       -- Gamification XP
  streak_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### sage_curriculum_topics
```sql
CREATE TABLE sage_curriculum_topics (
  id TEXT PRIMARY KEY,               -- e.g., 'maths-number-fractions-001'
  name TEXT NOT NULL,
  description TEXT,
  parent_id TEXT REFERENCES sage_curriculum_topics(id),
  subject TEXT NOT NULL,
  level TEXT NOT NULL,
  exam_boards TEXT[],
  tier TEXT DEFAULT 'both',          -- 'foundation', 'higher', 'both', 'single', 'sl', 'hl'
  difficulty TEXT,
  learning_objectives JSONB,
  prerequisites TEXT[],
  misconceptions JSONB,
  vocabulary JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### sage_safeguarding_events
```sql
CREATE TABLE sage_safeguarding_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT REFERENCES sage_sessions(id),
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,          -- 'wellbeing_concern', 'inappropriate_content', 'safeguarding_flag'
  severity TEXT NOT NULL,            -- 'low', 'medium', 'high', 'critical'
  details JSONB,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### sage_student_xp
```sql
CREATE TABLE sage_student_xp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  xp_amount INTEGER NOT NULL,
  reason TEXT NOT NULL,              -- 'session_complete', 'topic_mastered', 'streak_bonus', etc.
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### sage_badges
```sql
CREATE TABLE sage_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  badge_type TEXT NOT NULL,          -- 'first_session', 'maths_master', '7_day_streak', etc.
  badge_name TEXT NOT NULL,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  UNIQUE(user_id, badge_type)
);
```

### ai_feedback (shared with Lexi)
```sql
CREATE TABLE ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT NOT NULL,        -- 'sage' | 'lexi'
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  rating TEXT,                     -- 'thumbs_up' | 'thumbs_down'
  comment TEXT,
  context JSONB,                   -- Subject, level, role, exam board, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### sage_uploads
```sql
CREATE TABLE sage_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id),
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  namespace TEXT NOT NULL,         -- 'users/{id}' or 'shared/{id}' or 'global'
  chunk_count INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 19. Design Tokens

| Property | Token | Value |
|----------|-------|-------|
| Primary colour | `--color-sage-primary` | `#4f46e5` (indigo) |
| Secondary colour | `--color-sage-secondary` | `#7c3aed` (purple) |
| Gradient | — | `linear-gradient(135deg, #4f46e5, #7c3aed)` |
| User message bg | — | `#4f46e5` |
| Sage message bg | — | `#f5f3ff` |
| FAB shadow | — | `0 4px 14px rgba(79, 70, 229, 0.4)` |
| Chat width | — | `420px` |
| Chat height | — | `600px` |

---

## 20. Implementation Phases

### Phase 0 – Foundation (COMPLETE)
- [x] Fork Lexi to Sage with optimum structure
- [x] Implement `context/resolver.ts` (role detection)
- [x] Create 4 persona folders with `capabilities.json`
- [x] Set up `messages/envelope.ts` + validation
- [x] Create `tools/registry.ts` with OpenAI format
- [x] Database migration: `sage_sessions`, `sage_progress`, `ai_feedback`
- [x] Basic API routes: session, stream

### Phase 1 – Core Engine (COMPLETE)
- [x] Build `subjects/maths/engine.ts` with DSPy solver
- [x] Create `upload/processor.ts` (PPTX extraction)
- [x] Build `upload/embedder.ts` (pgvector)
- [x] Implement `knowledge/access-control.ts`
- [x] Basic RAG retrieval with role filtering
- [x] UI: SageChat, SageSubjectPicker
- [x] "Ask Sage" buttons on tutor/agent/client/student dashboards

### Phase 2 – Intelligence (COMPLETE)
- [x] Add English & Science engines
- [x] Implement progress tracking with mastery scores
- [x] Role-specific progress views
- [x] Feed sessions to CAS feedback loop
- [x] First DSPy optimization run
- [x] Upload sharing (tutor to student)

### Phase 3 – Curriculum Expansion (COMPLETE)
- [x] Expand from 4 to 10 subject configs
- [x] Build 22 curriculum data files (~467 topics)
- [x] Add KS1-KS2 Primary, KS3, IB, AP, SQA, CIE data
- [x] Implement curriculum resolver + content generator
- [x] Exam board tagging across all topics
- [x] Update Subject Picker UI for expanded subjects/levels

### Phase 4 – SEN/SEND & Safety (COMPLETE)
- [x] Build `sage/sen/` module (types, adapter, index)
- [x] Implement 11 SEN category adaptations
- [x] Privacy-preserving prompt injection (no category labels to LLM)
- [x] SEN-aware teaching mode selection
- [x] `sage_student_profiles` table with SEN fields
- [x] Safety module: input classifier, output validator, wellbeing detector, age adapter

### Phase 5 – Platform Integration (COMPLETE)
- [x] PlatformUserContext enrichment in sessions
- [x] Agent episodic memory integration
- [x] Conductor ecosystem connection
- [x] Growth Agent handoff for off-domain queries
- [x] 6-tier AI provider fallback chain

### Phase 6 – Maturity (Q3-Q4 2026)
- [ ] Dedicated engines for Computing, Humanities, Languages
- [ ] Voice input/output
- [ ] Full CAS autonomy ("Maintain Sage")
- [ ] Prepare for external A2A protocols
- [ ] XP/badge gamification system
- [ ] Past paper integration per exam board

---

## 21. Success Metrics

| Metric | Target |
|--------|--------|
| Session completion rate | >60% have 5+ messages |
| Student return rate | >40% use Sage again within 7 days |
| Topic mastery growth | Average +10% mastery per month |
| Satisfaction rating | >4.0/5 average |
| Human tutor complement | 30% of Sage users also book human tutors |
| DSPy improvement | 5% accuracy gain per optimization cycle |
| SEN session quality | >4.2/5 average for SEN-adapted sessions |
| Curriculum coverage | >90% of GCSE topics with board-specific content |
| Provider availability | >99.9% uptime via 6-tier fallback |

---

## 22. Guiding Principles

1. **Inherit Lexi maturity** – Multi-LLM (6-tier fallback), lazy sessions, feedback loop
2. **Strict role separation** – Tutor / Agent / Client / Student with shared core
3. **Knowledge access controlled** – By role & relationship
4. **No model training** – Only RAG + DSPy optimization
5. **Single Conductor loop** – Sage improvements feed into intelligence layer
6. **Light future-proofing** – Standardized messages, capability manifests, OpenAI tools
7. **Full UK curriculum alignment** – KS1 through University, all major exam boards
8. **SEN/SEND first** – Privacy-preserving adaptations, never send labels to LLM
9. **Safeguarding priority** – Age-appropriate content, wellbeing detection, event logging

---

## 23. Related Documentation

- [Lexi Solution Design](../lexi/lexi-solution-design.md)
- [Conductor Solution Design](../../../conductor/conductor-solution-design.md)
- [CAS Architecture](../../architecture/cas.md)
- [Growth Agent](../../../apps/web/src/lib/growth-agent/)
- [Curriculum Expansion Notes](../../../sage/docs/CURRICULUM-EXPANSION.md)
- [SEN/SEND Module](../../../sage/sen/)
- [AI Service Layer](../../../apps/web/src/lib/ai/)
- [Student Features](../students/README.md)
- [Wisespace](../wisespace/README.md)

---

## Appendix A: Message Bus Integration

### Feedback Flow (Sage to CAS)

```
Student gives thumbs-down
        │
        ▼
┌───────────────────┐
│ Create envelope   │ → Standardized format
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Validate schema   │ → messages/validator.ts
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Publish to CAS    │ → messages/publisher.ts
│ message bus       │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ CAS processes     │ → Conductor intelligence layer
│ feedback          │    processes quality signals
└───────────────────┘
```

---

## Appendix B: Topic Count Summary

| Data File | Level | Topics |
|-----------|-------|--------|
| `primary.ts` | KS1-KS2 | 21 |
| `ks3-maths.ts` | KS3 | 24 |
| `ks3-science.ts` | KS3 | 25 |
| `ks3-english.ts` | KS3 | 15 |
| `ks3-humanities.ts` | KS3 | 15 |
| `maths.ts` | GCSE | 22 |
| `science.ts` | GCSE | 21 |
| `english.ts` | GCSE | 12 |
| `humanities.ts` | GCSE | 23 |
| `computing.ts` | GCSE | 14 |
| `social-sciences.ts` | GCSE | 33 |
| `languages.ts` | GCSE | 30 |
| `business-economics.ts` | GCSE | 22 |
| `creative-practical.ts` | GCSE | 20 |
| `a-level-maths.ts` | A-Level | 12 |
| `a-level-sciences.ts` | A-Level | 20 |
| `a-level-humanities.ts` | A-Level | 20 |
| `a-level-other.ts` | A-Level | 20 |
| `ib.ts` | IB | 28 |
| `ap.ts` | AP | 37 |
| `sqa.ts` | SQA | 16 |
| `cie.ts` | CIE | 17 |
| **Total** | | **467** |

**Previous version (v2.1):** 131 topics across 5 data files (GCSE Maths, Science, Humanities only).

---

## Appendix C: Changelog

### v3.0 (2026-03-16)
- Expanded curriculum from GCSE/A-Level to full UK KS1 through University + IB + AP + SQA + CIE
- Added 6 new subject configs (Computing, Humanities, Languages, Social Sciences, Business & Economics, Arts & Creative) for a total of 10
- Expanded topic count from ~131 to ~467 across 22 curriculum data files
- Added SEN/SEND support module (11 categories, privacy-preserving)
- Updated AI provider chain from Gemini-only to 6-tier fallback
- Added Platform Integration section (PlatformUserContext, Agent Memory, Conductor, Growth Agent)
- Added Competitive Positioning section (vs Century Tech, Quizlet, Numerade, Khanmigo, Seneca)
- Added Curriculum Matrix and Exam Board Coverage sections
- Added `sage_student_profiles`, `sage_curriculum_topics`, `sage_safeguarding_events`, `sage_student_xp`, `sage_badges` to database schema
- Updated implementation phases to reflect completed work

### v2.1 (2026-02-22)
- Added DSPy integration with full Python optimization pipeline
- Added GitHub Actions workflow for weekly prompt optimization
- Updated subject coverage table

### v2.0 (2026-02-18)
- Initial subject engines (Maths, English, Science, General)
- RAG pipeline with role-aware access control
- Upload pipeline for PPTX/PDF/DOCX

### v1.0 (2026-02-14)
- Initial design: personas, knowledge architecture, API specification
