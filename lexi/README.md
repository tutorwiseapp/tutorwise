# Lexi - TutorWise AI Help Bot

**Version:** 2.0.0 (Enhanced with Guest Mode & Analytics)
**Type:** AI-Powered Platform Assistant
**Status:** Active Production
**Part of:** [TutorWise AI Ecosystem](../README.md) | See also: [Sage](../sage/README.md) | [CAS](../cas/README.md)

---

## 🎯 What is Lexi?

Lexi is TutorWise's **AI-Powered Platform Assistant** that helps users navigate the platform, manage bookings, find tutors, track progress, and handle common tasks. It provides instant, context-aware support across all user roles (students, tutors, parents, agents, and organisations) with 24/7 availability.

**Core Innovation:** Role-Based Sub-Personas + RAG Knowledge + Tool Execution
**Key Differentiator:** Guest mode support and seamless handoff to human agents when needed

---

## 🚀 Key Features

### 🎭 Role-Aware Assistance
- **5 Primary Personas:** Student, Tutor, Client (Parent), Agent, Organisation
- **Specialized Sub-Personas:** New user guide, earnings expert, matching helper, org admin
- **Guest Mode:** Unauthenticated users get Rules-only provider (zero API cost)
- **Context Switching:** Adapts to user role automatically

### 🔧 Task Automation
- **Booking Management:** Create, reschedule, cancel sessions
- **Tutor Search:** Find and filter tutors by subject, location, price
- **Progress Tracking:** View student progress and analytics
- **Payment Handling:** Earnings, wallet balance, payment methods
- **Resource Access:** Links to articles, help docs, and tools

### 🧠 Intelligent Support
- **RAG Knowledge Base:** Semantic search across platform documentation
- **Tool Execution:** 20+ function calls for platform actions
- **Deep Links:** Direct navigation to relevant pages
- **Analytics Integration:** Feeds CAS Marketer for UX improvements

### 🌐 Multi-Provider Architecture
- **Primary:** Gemini (Google) - Best performance/cost ratio
- **Fallback:** Claude (Anthropic) - Complex reasoning
- **DeepSeek:** Cost-efficient alternative
- **Rules-Based:** Offline/guest mode support

---

## 📁 Architecture

```
lexi/
├── core/                           # 🧠 Core Orchestration
│   ├── orchestrator.ts             # Main conversation management
│   └── index.ts                    # Public API exports
│
├── providers/                      # 🔌 LLM Provider Integrations
│   ├── gemini-provider.ts          # Google Gemini (primary)
│   ├── claude-provider.ts          # Anthropic Claude (fallback)
│   ├── deepseek-provider.ts        # DeepSeek (cost-efficient)
│   ├── rules-provider.ts           # Offline/guest mode support
│   └── base-provider.ts            # Provider abstraction layer
│
├── personas/                       # 🎭 Role-Based Personas
│   ├── student/                    # Student assistance
│   ├── tutor/                      # Tutor dashboard support
│   ├── client/                     # Parent/client portal
│   ├── agent/                      # Agent support
│   ├── organisation/               # Organisation management
│   ├── base-persona.ts             # Persona base class
│   └── sub-personas/               # Specialized sub-personas
│       ├── new-user-guide.ts       # Onboarding assistant
│       ├── tutor-earnings-expert.ts # Earnings & payouts
│       ├── client-matching-helper.ts # Tutor matching
│       └── organisation-admin.ts   # Org management
│
├── tools/                          # 🔧 Function Calling Tools
│   ├── definitions.ts              # 20+ tool definitions
│   ├── executor.ts                 # Tool execution engine
│   └── types.ts                    # Tool type definitions
│
├── knowledge/                      # 🔍 RAG System
│   └── retriever.ts                # Platform knowledge retrieval
│
├── services/                       # 🛠️ Support Services
│   └── [Analytics, integrations]
│
├── utils/                          # 🔨 Utilities
│   └── deep-links.ts               # Platform navigation helpers
│
└── types/                          # 📝 Type Definitions
    └── index.ts                    # Core types
```

---

## 🎭 Personas

Lexi adapts to 5 primary user roles with specialized capabilities:

### 1. **Student Persona** - Learning Assistant
**Role:** Help students navigate their learning journey
**Capabilities:**
- Schedule lessons with tutors
- Access homework help (redirects to Sage)
- Track learning progress
- Access saved resources
- Submit feedback on sessions

**Tone:** Supportive and encouraging
**Example:** "I can help you book a session with your tutor. What subject are you studying?"

**Common Queries:**
- "How do I book a lesson?"
- "When is my next session?"
- "Show me my progress"
- "Find a maths tutor near me"

---

### 2. **Tutor Persona** - Professional Dashboard
**Role:** Support tutors in managing their practice
**Capabilities:**
- Schedule management (view, create, update availability)
- Student overview (progress, notes, session history)
- Resource creation (lesson plans, materials)
- Earnings tracking (wallet, payouts, invoices)
- Analytics access (session stats, student engagement)
- Calendar integration (Google, Outlook)

**Tone:** Professional and efficient
**Example:** "You have 3 sessions tomorrow. Would you like to review your schedule or update your availability?"

**Common Queries:**
- "Show me my earnings this month"
- "What's my availability next week?"
- "How do I create a lesson plan?"
- "Connect my Google Calendar"

---

### 3. **Client (Parent) Persona** - Parent Portal
**Role:** Help parents manage their children's education
**Capabilities:**
- Tutor search and matching
- Booking management (create, reschedule, cancel)
- Payment handling (add card, view invoices, track spending)
- Progress monitoring (session reports, tutor feedback)
- Review submission (rate tutors and sessions)

**Tone:** Friendly and reassuring
**Example:** "I can help you find a great tutor for your child. What subject and level are they studying?"

**Common Queries:**
- "Find a Science tutor for GCSE"
- "How much have I spent this month?"
- "Cancel my Thursday session"
- "Show my child's progress"

---

### 4. **Agent Persona** - Agent Support
**Role:** Support TutorWise agents with user assistance
**Capabilities:**
- User support and troubleshooting
- Booking coordination (multi-party bookings)
- Tutor assistance (onboarding, policies)
- Platform navigation
- Technical support escalation

**Tone:** Professional and helpful
**Example:** "I can help you assist this user. What do they need help with?"

---

### 5. **Organisation Persona** - Organisation Management
**Role:** Support schools and tutoring agencies
**Capabilities:**
- Team management (invite users, assign roles)
- Bulk booking management
- Analytics dashboard (team performance, revenue)
- Billing and subscriptions
- Compliance reporting

**Tone:** Business-oriented and efficient
**Example:** "Welcome! I can help you manage your team, bookings, and analytics. What would you like to do?"

**Common Queries:**
- "Add a new tutor to our team"
- "Show this month's revenue"
- "Export session reports"
- "Manage subscription"

---

## 🎭 Sub-Personas

Specialized assistants for specific tasks:

### New User Guide
**Trigger:** User with < 3 sessions or incomplete onboarding
**Purpose:** Platform onboarding and feature discovery
**Features:**
- Step-by-step walkthroughs
- Feature introductions
- Best practices
- Quick start guides

---

### Tutor Earnings Expert
**Trigger:** Queries about money, earnings, payouts, wallet
**Purpose:** Financial management for tutors
**Features:**
- Earnings breakdown
- Payout schedules
- Tax information
- Pricing strategies

---

### Client Matching Helper
**Trigger:** "Find a tutor" or search queries
**Purpose:** Intelligent tutor matching
**Features:**
- Preference collection (subject, level, budget, location)
- Smart filtering and ranking
- Availability checking
- Booking assistance

---

### Organisation Admin
**Trigger:** Organisation users with admin permissions
**Purpose:** Team and business management
**Features:**
- User management
- Analytics dashboards
- Billing management
- Policy configuration

---

## 🔧 Tools & Capabilities

Lexi has 20+ function calling tools organized by persona:

### Student Tools
- `schedule_lesson` - Book a session with a tutor
- `view_schedule` - See upcoming sessions
- `access_resources` - Get saved materials
- `track_progress` - View learning analytics
- `submit_feedback` - Rate sessions

### Tutor Tools
- `manage_schedule` - Update availability
- `view_student_progress` - Student analytics
- `create_resource` - Lesson planning
- `check_earnings` - Financial dashboard
- `calendar_sync` - Integration management

### Client Tools
- `search_tutors` - Find and filter tutors
- `book_session` - Create bookings
- `manage_payments` - Card and billing
- `view_child_progress` - Student reports
- `submit_review` - Rate tutors

### Organisation Tools
- `manage_team` - User administration
- `view_analytics` - Business intelligence
- `bulk_booking` - Multi-session creation
- `billing_management` - Subscriptions

### Universal Tools
- `get_help_article` - Knowledge base search
- `navigate_to` - Deep link navigation
- `escalate_to_human` - Agent handoff
- `platform_status` - System health

---

## 🔌 LLM Providers

Multi-provider architecture with intelligent fallback:

| Provider | Status | Cost | Use Case |
|----------|--------|------|----------|
| **Gemini** | ✅ Primary | Low | General queries, RAG, tool execution |
| **Claude** | ✅ Fallback | Medium | Complex reasoning, ambiguous queries |
| **DeepSeek** | ✅ Available | Very Low | Cost-efficient alternative |
| **Rules** | ✅ Always On | Free | Guest mode, basic FAQs, offline mode |

**Guest Mode Behavior:**
- Unauthenticated users → **Rules-only provider** (zero API cost)
- Basic FAQs and platform information
- Encourages sign-up for full features
- No sensitive data access

**Authenticated Mode:**
- Gemini (primary) → Claude (fallback) → DeepSeek → Rules
- Full tool execution
- Personalized responses
- Session history

---

## 🔍 Knowledge Base (RAG)

### Platform Documentation Retrieval

**Knowledge Sources:**
- Help centre articles (30+ topics)
- Feature documentation
- Policy guides (cancellation, refunds, etc.)
- FAQ database
- Tutorial videos (metadata)

**Search Strategy:**
```
User Query
     ↓
Intent Detection (booking, payment, navigation, etc.)
     ↓
Knowledge Retrieval (semantic search)
     ↓
Context Filtering (role-specific)
     ↓
Relevance Ranking
     ↓
Injected into LLM Context
```

**Embedding Model:** `gemini-embedding-001` (768 dimensions)
**Index:** pgvector HNSW (Supabase)

---

## 📊 Analytics Integration

### CAS Marketer Feedback Loop

```
Lexi Sessions
     ↓
Metrics Collection (daily)
     ↓
Usage Analytics
├── Session count
├── Message volume
├── Tool execution rates
├── Feedback (👍/👎)
└── Common queries
     ↓
Growth Insights
├── Feature adoption
├── Drop-off points
├── UX improvements
└── Content gaps
     ↓
CAS Planner (strategic planning)
```

**Metrics Tracked:**
- Total sessions per day
- Unique users
- Average session length
- Messages per session
- Tool execution success rate
- Thumbs up/down ratio
- Escalation to human rate

**Automated Alerts:**
- High negative feedback (< 60% positive)
- Frequent escalations (indicates missing features)
- Common unanswered queries (knowledge gaps)

---

## 🚀 Quick Start

### Usage (via Web App)

```typescript
import { LexiOrchestrator } from '@/lexi/core';

// Initialize with user context
const lexi = new LexiOrchestrator();
await lexi.initialize({
  userId: 'user-123', // or null for guest
  persona: 'student',
  provider: 'gemini', // optional
});

// Start a conversation
const session = await lexi.startSession();

// Send a message
const response = await lexi.sendMessage(session.id, {
  content: 'How do I book a lesson?',
});

// If response includes tool calls
if (response.toolCalls) {
  // Tools are executed automatically
  // Results included in response
}

// Submit feedback
await lexi.submitFeedback(session.id, response.messageId, {
  rating: 'thumbs_up',
});
```

### Guest Mode Example

```typescript
// Guest user (no authentication)
const lexi = new LexiOrchestrator();
await lexi.initialize({
  userId: null, // Guest mode
  persona: 'student',
});

// Uses Rules-only provider (zero API cost)
const response = await lexi.sendMessage(sessionId, {
  content: 'What is TutorWise?',
});

// Suggests sign-up for advanced features
```

---

## 🛠️ Development

### Running Locally

```bash
# Start development server (part of main app)
npm run dev

# Test Lexi provider
npm run test:lexi

# Seed knowledge base
curl -X POST http://localhost:3000/api/lexi/knowledge/seed
```

### Configuration

```typescript
// Environment variables
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GOOGLE_API_KEY=your-gemini-key
ANTHROPIC_API_KEY=your-claude-key
DEEPSEEK_API_KEY=your-deepseek-key
```

---

## 🔗 Integration Points

### Frontend Routes
- `/help` - Main Lexi chat interface
- `/help-centre` - Knowledge base articles
- `/help-centre/[category]/[slug]` - Individual articles

### API Routes
- `/api/lexi/session` - Session management
- `/api/lexi/message` - Send message
- `/api/lexi/stream` - Streaming responses
- `/api/lexi/feedback` - Submit feedback
- `/api/lexi/history` - Conversation history
- `/api/lexi/knowledge/seed` - Seed knowledge base
- `/api/lexi/provider` - Switch provider

### Database Tables
- `lexi_sessions` - Session records
- `lexi_messages` - Message history
- `lexi_knowledge` - RAG knowledge base
- `ai_feedback` - User feedback

### CAS Integration

Lexi is tightly integrated with the [CAS AI Product Team](../cas/README.md):

- **[CAS Marketer](../cas/agents/marketer/README.md):** Collects analytics for UX insights (sessions, tool usage, feedback)
- **[CAS Planner](../cas/agents/planner/README.md):** Feature prioritization based on user needs
- **[CAS Developer](../cas/agents/developer/README.md):** Tool improvements and new capabilities
- **[CAS Analyst](../cas/agents/analyst/README.md):** Analyzes common queries and content gaps
- **Jira Bridge:** Automated ticket creation for complex issues

**See:** [CAS Strategic Feedback Loop](../cas/README.md#-strategic-feedback-loop)

---

## 📊 Performance Metrics

### Production Metrics (Last 30 Days)

**Current Usage:**
- 🟡 **0 sessions** (early-stage, pre-launch)
- 🎯 **20+ function tools** available
- 📈 **Launch target:** Q1 2026

### Projected Stats (Post-Launch)

**Target Metrics:**
- **Sessions:** 100-200/week
- **Unique Users:** 50-80/week
- **Avg Session Length:** 5-8 minutes
- **Messages per Session:** 4-6
- **Satisfaction Rate:** > 75% positive feedback
- **Escalation Rate:** < 15% (handoff to human)

### Tool Execution Forecast

**Expected Most Used Tools:**
  1. `search_tutors` - Tutor discovery (25-30% of sessions)
  2. `view_schedule` - Schedule management (20-25%)
  3. `get_help_article` - Knowledge base (15-20%)
  4. `book_session` - Booking creation (12-18%)
  5. `check_earnings` - Financial tracking (10-15%)

**Target Success Rate:** > 90% (tools execute successfully)

**Integration:** Feeds [CAS Marketer](../cas/agents/marketer/README.md) via [analytics-collector.ts](../cas/agents/marketer/analytics-collector.ts)

---

## 🎯 Roadmap

### Q1 2026
- [x] Guest mode with Rules-only provider
- [x] Enhanced RAG knowledge retrieval
- [x] Analytics collection for CAS Marketer
- [x] Feedback loop integration
- [ ] Voice input support
- [ ] Multi-language support (Spanish, French)

### Q2 2026
- [ ] Proactive notifications (session reminders)
- [ ] Predictive assistance (suggest actions)
- [ ] Advanced tool chaining (multi-step workflows)
- [ ] Integration with CRM (HubSpot, Salesforce)
- [ ] A/B testing framework

### Q3 2026
- [ ] Video tutorial integration
- [ ] Screen sharing for support
- [ ] Automated issue resolution
- [ ] Sentiment analysis
- [ ] Custom personas (white-label)

---

## 📚 Documentation

**Lexi Architecture:**
- [Core Orchestrator](core/orchestrator.ts) - Conversation management
- [Provider System](providers/) - Multi-provider architecture
- [Tool Definitions](tools/definitions.ts) - Function calling
- [Knowledge Retriever](knowledge/retriever.ts) - RAG implementation

**Sub-Personas:**
- [New User Guide](personas/sub-personas/new-user-guide.ts) - Onboarding
- [Earnings Expert](personas/sub-personas/tutor-earnings-expert.ts) - Financial support
- [Matching Helper](personas/sub-personas/client-matching-helper.ts) - Tutor search

**Deployment:**
- [Supabase Edge Functions](../supabase/functions/marketer-analytics/) - Analytics collection
- [API Routes](../apps/web/src/app/api/lexi/) - Backend endpoints

---

## 🤝 Contributing

Lexi is part of the TutorWise monorepo. See main repository for contribution guidelines.

**Key Areas for Contribution:**
- New tool definitions (platform actions)
- Knowledge base expansion (help articles)
- Sub-persona specializations
- Multi-language support

---

## 📄 License

MIT

---

## 🔗 Related Documentation

- **[Sage AI Tutor](../sage/README.md)** - GCSE educational tutoring
- **[CAS AI Product Team](../cas/README.md)** - Autonomous development and strategic planning
- **[TutorWise Main Repo](../README.md)** - Full platform documentation

**Handoff to Sage:**
When users ask educational questions (homework, concepts, exam prep), Lexi redirects to [Sage](../sage/README.md) for specialized tutoring support.

---

**Lexi - TutorWise AI Help Bot**
*Always Available. Always Helpful. Always Learning.*

Version 2.0.0 | 20+ Tools | Built with ❤️ by the TutorWise Team
