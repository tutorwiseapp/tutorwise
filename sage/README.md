# Sage - AI GCSE Tutor

**Version:** 2.0.0 (Enhanced with Multimodal Input & Feedback Loop)
**Type:** AI-Powered Educational Tutor
**Status:** Active Production
**Part of:** [TutorWise AI Ecosystem](../README.md) | See also: [Lexi](../lexi/README.md) | [CAS](../cas/README.md)

---

## 🎯 What is Sage?

Sage is an **AI-Powered GCSE Tutor** that provides personalized, adaptive learning support for UK GCSE students, teachers, and parents. It combines advanced LLM reasoning with curriculum-specific knowledge, mathematical computation, and multimodal input to deliver a comprehensive tutoring experience.

**Core Innovation:** Hybrid RAG + Computational Engine + Feedback Loop
**Key Differentiator:** Subject-aware personas with role-based capabilities and continuous improvement through feedback analysis

---

## 🚀 Key Features

### 🎓 Personalized Learning
- **Role-Aware Personas:** Student, Tutor, Parent, and Agent modes
- **Subject Specialization:** Maths, English, Science, and General studies
- **Adaptive Difficulty:** Tailors explanations to GCSE Foundation/Higher tiers
- **Learning Context Tracking:** Remembers progress, preferences, and goals

### 🧮 Advanced Capabilities
- **Mathematical Problem Solving:** Hybrid solver (SymPy + Algebrite + LLM reasoning)
- **Enhanced RAG System:** Semantic search across 500+ GCSE topics with hybrid scoring
- **Multimodal Input:** Voice transcription and handwriting OCR (in progress)
- **Step-by-Step Explanations:** Socratic method with worked examples

### 📊 Continuous Improvement
- **Feedback Collection:** Thumbs up/down on every response
- **Curriculum Gap Detection:** Automated analysis of negative feedback patterns
- **Content Regeneration:** Auto-update knowledge base based on feedback insights
- **Analytics Integration:** Feeds CAS Marketer for growth tracking

---

## 📁 Architecture

```
sage/
├── core/                           # 🧠 Core Orchestration
│   ├── orchestrator.ts             # Main session management
│   └── index.ts                    # Public API exports
│
├── providers/                      # 🔌 LLM Provider Integrations
│   ├── gemini-provider.ts          # Google Gemini (primary)
│   ├── claude-provider.ts          # Anthropic Claude (fallback)
│   ├── deepseek-provider.ts        # DeepSeek (cost-efficient)
│   ├── rules-provider.ts           # Offline rules-based fallback
│   └── base-provider.ts            # Provider abstraction layer
│
├── curriculum/                     # 📚 Curriculum Knowledge
│   ├── content-generator.ts        # Auto-generate knowledge chunks
│   ├── resolver.ts                 # Subject/level detection
│   ├── types.ts                    # Curriculum type definitions
│   └── data/
│       └── maths.ts                # GCSE Maths topics (110 chunks)
│
├── knowledge/                      # 🔍 RAG System
│   ├── enhanced-rag.ts             # Hybrid semantic + keyword search
│   ├── enhanced-retriever.ts       # Context-aware retrieval
│   ├── types.ts                    # Knowledge types
│   ├── global/                     # Shared curriculum knowledge
│   ├── shared/                     # Multi-user knowledge
│   └── users/                      # User-specific knowledge
│
├── math/                           # 🧮 Mathematical Engine
│   ├── hybrid-solver.ts            # SymPy + Algebrite solver
│   └── test-solver.ts              # Solver testing utilities
│
├── personas/                       # 🎭 Role-Based Personas
│   ├── student/                    # Student learning persona
│   ├── tutor/                      # Tutor teaching persona
│   ├── client/                     # Parent support persona
│   └── agent/                      # Agent support persona
│
├── services/                       # 🛠️ Support Services
│   └── feedback-service.ts         # Feedback analysis & gap detection
│
├── subjects/                       # 📖 Subject Engines
│   ├── maths/                      # Mathematics specialist
│   ├── english/                    # English specialist
│   ├── science/                    # Science specialist
│   └── general/                    # General knowledge
│
├── tools/                          # 🔧 Function Calling Tools
│   ├── definitions.ts              # Tool definitions
│   ├── executor.ts                 # Tool execution engine
│   └── types.ts                    # Tool type definitions
│
├── context/                        # 📋 Context Management
│   └── resolver.ts                 # Learning context resolution
│
├── teaching/                       # 👨‍🏫 Teaching Strategies
│   └── [Pedagogical methods]
│
└── upload/                         # 📤 File Upload Support
    └── config/                     # Upload configuration
```

---

## 🎓 Personas

Sage adapts to different user roles with specialized capabilities:

### 1. **Student Persona** - Learning Assistant
**Role:** Personalized tutor for GCSE students
**Capabilities:**
- Explain concepts in simple terms
- Solve problems step-by-step
- Generate practice exercises
- Help with homework
- Exam preparation support
- Progress tracking

**Tone:** Encouraging and patient
**Example:** "Let's break this down together. First, what do you already know about quadratic equations?"

---

### 2. **Tutor Persona** - Teaching Assistant
**Role:** Professional support for educators
**Capabilities:**
- Lesson planning
- Resource creation
- Student progress review
- Teaching strategies
- Worksheet generation
- Assessment ideas

**Tone:** Professional and collaborative
**Example:** "I can help you create a differentiated lesson plan. What topic are you covering?"

---

### 3. **Client (Parent) Persona** - Parent Assistant
**Role:** Learning support for parents
**Capabilities:**
- Progress explanation
- Learning support tips
- Resource recommendations
- Curriculum overview

**Tone:** Supportive and clear
**Example:** "Your child is working on algebra. Here's how you can support them at home..."

---

### 4. **Agent Persona** - Support Assistant
**Role:** Internal support for TutorWise agents
**Capabilities:**
- Tutoring information
- Curriculum queries
- Student support
- Tutor support

**Tone:** Friendly and helpful

---

## 🔌 LLM Providers

Sage supports multiple LLM providers with automatic fallback:

| Provider | Status | Cost | Use Case |
|----------|--------|------|----------|
| **Gemini** | ✅ Primary | Low | General tutoring, RAG, reasoning |
| **Claude** | ✅ Fallback | Medium | Complex explanations, essay feedback |
| **DeepSeek** | ✅ Available | Very Low | Cost-efficient alternative |
| **Rules** | ✅ Offline | Free | Basic questions, system offline |

**Fallback Chain:** Gemini → Claude → DeepSeek → Rules-Based

**Provider Selection Logic:**
- Default: Gemini (best balance of quality/cost)
- Rate limit hit: Auto-switch to Claude
- All APIs down: Rules-based fallback
- User preference: Override via session config

---

## 📚 Curriculum Coverage

### GCSE Subjects

**Mathematics:**
- ✅ **110 knowledge chunks** ingested (verified from database)
- 📚 **22 GCSE topics** covered
- Algebra, Geometry, Statistics, Probability, Trigonometry
- Foundation and Higher tier support
- Step-by-step worked examples
- 🎯 **Target:** 500+ topics by Q2 2026

**English:**
- 🟡 In Progress
- Literature analysis, essay writing, language techniques

**Science:**
- 🟡 In Progress
- Biology, Chemistry, Physics

**General:**
- ✅ Active
- Cross-curricular support, study skills, exam techniques

### Knowledge Types (Per Topic)

Each topic includes 6 specialized chunks:
1. **Definition** - Core concept explanation
2. **Concepts** - Learning objectives breakdown
3. **Examples** - Worked problems with solutions
4. **Misconceptions** - Common mistakes to avoid
5. **Vocabulary** - Subject-specific terminology
6. **Prerequisites** - Required prior knowledge

---

## 🧮 Mathematical Capabilities

### Hybrid Solver Architecture

```
Problem Input
     ↓
Pattern Detection (Regex + NLP)
     ↓
┌─────────────┬─────────────┬─────────────┐
│   SymPy     │  Algebrite  │  LLM Model  │
│  (Python)   │    (JS)     │  (Gemini)   │
└─────────────┴─────────────┴─────────────┘
     ↓              ↓              ↓
Confidence Scoring & Best Solution Selection
     ↓
Step-by-Step Explanation
```

**Supported Operations:**
- Algebraic simplification
- Equation solving (linear, quadratic, simultaneous)
- Calculus (differentiation, integration)
- Trigonometry
- Statistics
- Graph plotting (planned)

---

## 🔍 RAG System

### Enhanced Hybrid Search

**Search Strategy:**
1. **Semantic Search** - Vector similarity (pgvector HNSW)
2. **Keyword Search** - Full-text search (PostgreSQL tsvector)
3. **Hybrid Scoring** - Weighted combination (0.7 semantic + 0.3 keyword)

**Retrieval Process:**
```
User Question
     ↓
Intent Detection
     ↓
Context Enhancement (subject, level, persona)
     ↓
Hybrid Search (top 5 chunks)
     ↓
Relevance Filtering (threshold: 0.6)
     ↓
Contextual Ranking
     ↓
Injected into LLM Prompt
```

**Knowledge Base:**
- **Global:** Curriculum content (GCSE topics)
- **Shared:** Community-contributed knowledge
- **User:** Personal notes, saved examples

---

## 📊 Feedback Loop

### Continuous Improvement Cycle

```
User Feedback (👍/👎)
     ↓
Stored in ai_feedback table
     ↓
Daily Processing (Supabase Edge Function)
     ↓
Gap Detection (< 60% positive rate)
     ↓
Severity Classification (critical/high/medium/low)
     ↓
Content Regeneration (auto-fix critical gaps)
     ↓
Publish to CAS Planner (strategic planning)
```

**Metrics Tracked:**
- Thumbs up/down per topic
- Session length and engagement
- Drop-off points
- Common complaints

**Automated Actions:**
- Flag topics with < 60% satisfaction
- Regenerate content for critical gaps (< 30% satisfaction)
- Alert CAS Planner for manual review
- Track improvement over time

---

## 🎤 Multimodal Input (In Progress)

### Voice Transcription
**Endpoint:** `/api/sage/transcribe`
**Status:** 🟡 Placeholder (ready for Google Speech-to-Text)

**Features:**
- WebM, Opus, M4A, MP3 support
- Max 10MB file size
- British English (en-GB) optimized

**Use Cases:**
- Voice questions during study
- Pronunciation practice (future)
- Accessibility for dyslexic students

---

### Handwriting OCR
**Endpoint:** `/api/sage/ocr`
**Status:** 🟡 Placeholder (ready for Google Cloud Vision)

**Features:**
- Handwritten math problems
- Printed textbook pages
- Whiteboard photos
- Max 5MB file size

**Use Cases:**
- Scan homework questions
- Convert handwritten notes
- Analyze textbook problems

---

## 🚀 Quick Start

### Usage (via Web App)

```typescript
import { SageOrchestrator } from '@/sage/core';

// Initialize with user context
const sage = new SageOrchestrator();
await sage.initialize({
  userId: 'user-123',
  persona: 'student',
  subject: 'maths',
  level: 'GCSE',
  provider: 'gemini', // optional
});

// Start a session
const session = await sage.startSession({
  subject: 'maths',
  level: 'GCSE',
  goal: 'exam_prep',
});

// Send a message
const response = await sage.sendMessage(session.id, {
  content: 'How do I solve quadratic equations?',
  context: {
    previousTopics: ['linear_equations'],
    strugglingWith: ['factorization'],
  },
});

// Submit feedback
await sage.submitFeedback(session.id, response.messageId, {
  rating: 'thumbs_up',
  comment: 'Very clear explanation!',
});
```

---

## 🛠️ Development

### Running Feedback Processor

```bash
# Manual processing (dry run)
npm run process:sage-feedback

# Auto-fix critical gaps
npm run process:sage-feedback:auto

# Custom threshold
npx tsx tools/scripts/process-sage-feedback.ts --threshold 0.5
```

### Ingesting Curriculum Content

```bash
# Test with 5 topics (dry run)
npm run ingest:curriculum:test

# Ingest all topics
npm run ingest:curriculum

# Specific subject
npx tsx tools/scripts/ingest-curriculum-content.ts --subject maths

# Limited batch
npx tsx tools/scripts/ingest-curriculum-content.ts --limit 10
```

---

## 📊 Analytics & Monitoring

### Production Metrics (Last 30 Days)

**Current Usage:**
- ✅ **14 sessions** created
- ✅ **110 knowledge chunks** in database (1 curriculum document)
- 🟡 **Early-stage product** (limited user testing)
- 📈 **Scaling target:** 100+ sessions/week by Q2 2026

### Key Metrics Tracked

**Session Metrics:**
- Total sessions per day/week
- Average session length (target: 8-12 min)
- Messages per session (target: 6-10)
- Unique users

**Quality Metrics:**
- Thumbs up/down ratio (target: > 70% positive)
- Response time (target: < 3s)
- Context retrieval accuracy
- Math solver success rate

**Curriculum Gaps:**
- Topics with < 60% positive feedback
- High drop-off topics
- Common misconceptions
- Missing content areas

**Integration:** Feeds [CAS Marketer](../cas/agents/marketer/README.md) agent for growth insights via [analytics-collector.ts](../cas/agents/marketer/analytics-collector.ts)

---

## 🔗 Integration Points

### Frontend (Next.js App)
- `/sage` - Main chat interface
- `/sage/history` - Session history
- `/sage/materials` - Saved materials
- `/sage/progress` - Learning progress

### API Routes
- `/api/sage/session` - Session management
- `/api/sage/message` - Send message
- `/api/sage/stream` - Streaming responses
- `/api/sage/feedback` - Submit feedback
- `/api/sage/transcribe` - Voice input
- `/api/sage/ocr` - Handwriting input
- `/api/sage/progress` - Progress tracking

### Database Tables
- `sage_sessions` - Session records
- `sage_messages` - Message history
- `sage_knowledge_chunks` - RAG knowledge base
- `ai_feedback` - User feedback

### CAS Integration

Sage is tightly integrated with the [CAS AI Product Team](../cas/README.md):

- **[CAS Marketer](../cas/agents/marketer/README.md):** Collects daily analytics (sessions, feedback, engagement)
- **[CAS Planner](../cas/agents/planner/README.md):** Strategic curriculum planning and roadmap
- **[CAS Analyst](../cas/agents/analyst/README.md):** Analyzes feedback patterns and identifies gaps
- **[CAS Developer](../cas/agents/developer/README.md):** Implements curriculum improvements

**See:** [CAS Strategic Feedback Loop](../cas/README.md#-strategic-feedback-loop)

---

## 📚 Documentation

**Sage Architecture:**
- [Enhanced RAG System](knowledge/enhanced-rag.ts) - Hybrid search implementation
- [Curriculum Generator](curriculum/content-generator.ts) - Knowledge chunk generation
- [Feedback Service](services/feedback-service.ts) - Gap detection and analysis
- [Hybrid Solver](math/hybrid-solver.ts) - Mathematical computation

**Deployment:**
- [Supabase Edge Functions](../supabase/functions/sage-feedback-processor/) - Automated feedback processing
- [Curriculum Ingestion](../tools/scripts/ingest-curriculum-content.ts) - Knowledge base setup

**Testing:**
- Unit tests: `npm test`
- Integration tests: Coming soon
- Manual testing: Development console

---

## 🎯 Roadmap

### Q1 2026
- [x] Enhanced RAG with hybrid search
- [x] Feedback collection and analysis
- [x] Automated gap detection
- [x] Multimodal input endpoints
- [ ] Google Cloud Vision OCR integration
- [ ] Google Speech-to-Text integration
- [ ] Teacher verification and free tier

### Q2 2026
- [ ] English curriculum (500+ topics)
- [ ] Science curriculum (500+ topics)
- [ ] Graph plotting visualization
- [ ] LaTeX math rendering
- [ ] Voice output (text-to-speech)
- [ ] Spaced repetition system

### Q3 2026
- [ ] Essay grading and feedback
- [ ] Exam paper generation
- [ ] Learning path recommendations
- [ ] Parent dashboard analytics
- [ ] Multi-language support

---

## 🤝 Contributing

Sage is part of the TutorWise monorepo. See main repository for contribution guidelines.

**Key Areas for Contribution:**
- Curriculum content expansion
- Subject-specific teaching strategies
- Mathematical solver improvements
- Feedback analysis algorithms

---

## 📄 License

MIT

---

## 🔗 Related Documentation

- **[Lexi Help Bot](../lexi/README.md)** - Platform assistance and user support
- **[CAS AI Product Team](../cas/README.md)** - Autonomous development and strategic planning
- **[TutorWise Main Repo](../README.md)** - Full platform documentation

---

**Sage - AI GCSE Tutor**
*Personalized. Adaptive. Continuously Improving.*

Version 2.0.0 | 110+ Knowledge Chunks | Built with ❤️ by the TutorWise Team
