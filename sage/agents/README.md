# Unified AI Agent Architecture

**Status:** ✅ Phase 1 Complete
**Date:** 2026-02-27
**Version:** 1.0.0

## Overview

Unified architecture for all AI agents in TutorWise, supporting both **platform agents** (Sage - free) and **marketplace agents** (AI Tutors - paid).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      BaseAgent                              │
│  (Abstract base class with common functionality)            │
│                                                              │
│  - Session management                                        │
│  - Message processing                                        │
│  - Knowledge retrieval                                       │
│  - Configuration                                             │
│  - Rate limiting                                             │
│  - Error handling                                            │
└─────────────────────────────────────────────────────────────┘
                          ↓                ↓
         ┌────────────────────┐   ┌──────────────────────┐
         │ PlatformAIAgent    │   │ MarketplaceAIAgent   │
         │ (Sage)             │   │ (AI Tutors)          │
         │                    │   │                      │
         │ - Free             │   │ - Paid               │
         │ - Platform-owned   │   │ - User-created       │
         │ - Always available │   │ - Subscription-based │
         │ - 4-tier RAG       │   │ - 3-tier RAG         │
         └────────────────────┘   └──────────────────────┘
```

---

## Agent Types

### Supported Agent Types

| Type | Description | Icon | Example Use Case |
|------|-------------|------|------------------|
| **tutor** | General tutoring | 🎓 | Math tutor, English tutor |
| **coursework** | Coursework assistance | 📝 | Essay feedback, project help |
| **study_buddy** | Study companion | 📚 | Flashcards, quizzes, revision |
| **research_assistant** | Research and writing | 🔬 | Literature review, citations |
| **exam_prep** | Exam preparation | 🎯 | Past papers, exam technique |

### Agent Context

| Context | Description | Pricing | Ownership |
|---------|-------------|---------|-----------|
| **platform** | Sage (platform agents) | Free | Platform-owned |
| **marketplace** | AI Tutors (user-created) | Paid (subscription) | User-owned |

---

## Directory Structure

```
sage/agents/
├── base/
│   ├── types.ts              # Unified type system
│   ├── BaseAgent.ts          # Abstract base class
│   └── index.ts              # Exports
├── PlatformAIAgent.ts        # Sage implementation
├── MarketplaceAIAgent.ts     # AI Tutor implementation
├── index.ts                  # Main exports
└── README.md                 # This file
```

---

## Key Files

### 1. **base/types.ts** (280 lines)

Unified type system for all AI agents:

```typescript
// Agent Types
export type AIAgentType = 'tutor' | 'coursework' | 'study_buddy' | 'research_assistant' | 'exam_prep';
export type AIAgentContext = 'platform' | 'marketplace';
export type AIAgentStatus = 'draft' | 'published' | 'unpublished' | 'archived' | 'suspended';

// Base Agent Interface
export interface BaseAIAgent {
  id: string;
  agent_type: AIAgentType;
  agent_context: AIAgentContext;
  subject: string;
  // ...
}

// Session Types
export interface AIAgentSession {
  id: string;
  agent_id: string;
  user_id: string;
  status: 'active' | 'ended' | 'escalated';
  // ...
}

// Message Types
export interface AIAgentMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  // ...
}
```

### 2. **base/BaseAgent.ts** (200 lines)

Abstract base class with common functionality:

```typescript
export abstract class BaseAgent {
  protected agent: BaseAIAgent;
  protected config: AgentConfig;

  // Abstract methods (must be implemented)
  abstract initialize(supabase?: SupabaseClient): Promise<void>;
  abstract startSession(user: UserInfo, options?: any): Promise<AIAgentSession>;
  abstract processMessage(sessionId: string, message: string): Promise<AIAgentMessage>;
  abstract endSession(sessionId: string): Promise<void>;
  abstract getKnowledgeSources(userId: string): Promise<AgentKnowledgeSource[]>;

  // Common methods (inherited by all agents)
  getId(): string;
  getName(): string;
  getType(): AIAgentType;
  getGreeting(userName?: string): string;
  isAvailableToUser(userRole: UserRole): boolean;
  requiresSubscription(): boolean;
  // ...
}
```

### 3. **PlatformAIAgent.ts** (180 lines)

Platform agent implementation (Sage):

```typescript
export class PlatformAIAgent extends BaseAgent {
  async startSession(user: UserInfo, options?: any): Promise<AIAgentSession> {
    // Delegates to sageOrchestrator
    const session = await sageOrchestrator.startSession(user, options);
    return session;
  }

  async processMessage(sessionId: string, message: string): Promise<AIAgentMessage> {
    // Uses Sage's orchestrator for message processing
    const response = await sageOrchestrator.processMessage(sessionId, message);
    return response;
  }

  async getKnowledgeSources(userId: string): Promise<AgentKnowledgeSource[]> {
    // 4-tier RAG: uploads → shared → links → global
    return contextResolver.resolve({ userId, ... }).knowledgeSources;
  }
}
```

### 4. **MarketplaceAIAgent.ts** (300 lines)

Marketplace agent implementation (AI Tutors):

```typescript
export class MarketplaceAIAgent extends BaseAgent {
  async startSession(user: UserInfo, options?: any): Promise<AIAgentSession> {
    // Check subscription
    if (this.requiresSubscription()) {
      const hasAccess = await this.checkUserAccess(user.userId);
      if (!hasAccess) throw new Error('Active subscription required');
    }

    // Create session in database
    const session = await this.supabase.from('ai_tutor_sessions').insert({...});
    return session;
  }

  async processMessage(sessionId: string, message: string): Promise<AIAgentMessage> {
    // Retrieve knowledge context using RAG
    const context = await this.retrieveKnowledgeContext(message, userId);

    // Generate response using LLM provider
    const response = await this.generateResponse(message, context);
    return response;
  }

  async getKnowledgeSources(userId: string): Promise<AgentKnowledgeSource[]> {
    // 3-tier RAG: materials → links → Sage fallback
    return [
      { type: 'upload', namespace: `ai_tutor/${this.agent.id}`, priority: 1 },
      { type: 'link', namespace: `ai_tutor_links/${this.agent.id}`, priority: 2 },
      { type: 'global', namespace: 'sage/global', priority: 3 },
    ];
  }
}
```

---

## Usage Examples

### Creating a Platform Agent (Sage)

```typescript
import { createPlatformAgent, createSageAgent } from 'sage';

// Option 1: Using factory function
const mathsTutor = createPlatformAgent('tutor', 'maths', 'GCSE');

// Option 2: Using Sage-specific factory
const studyBuddy = createSageAgent('science', 'A-Level', 'study_buddy');

// Initialize
await mathsTutor.initialize(supabaseClient);

// Start session
const session = await mathsTutor.startSession(user, {
  subject: 'maths',
  level: 'GCSE',
  sessionGoal: 'homework_help'
});

// Process messages
const response = await mathsTutor.processMessage(session.id, 'How do I solve quadratic equations?');

// End session
await mathsTutor.endSession(session.id);
```

### Creating a Marketplace Agent (AI Tutor)

```typescript
import { MarketplaceAIAgent, createAgent } from 'sage';
import type { BaseAIAgent, AgentConfig } from 'sage';

// Load agent from database
const { data: agentData } = await supabase
  .from('ai_tutors')
  .select('*')
  .eq('id', tutorId)
  .single();

// Map to BaseAIAgent
const agent: BaseAIAgent = {
  id: agentData.id,
  agent_type: 'tutor',
  agent_context: 'marketplace',
  subject: agentData.subject,
  // ...
};

// Configuration
const config: AgentConfig = {
  provider: 'gemini',
  enableRAG: true,
  tone: 'professional',
  // ...
};

// Create agent
const tutor = createAgent(agent, config);

// Initialize
await tutor.initialize(supabaseClient);

// Start session (requires subscription)
const session = await tutor.startSession(user, {
  subject: 'english',
  level: 'A-Level',
  sessionGoal: 'exam_prep'
});

// Process messages
const response = await tutor.processMessage(session.id, 'Can you help with my essay structure?');
```

---

## Key Differences

### Platform vs Marketplace Agents

| Feature | PlatformAIAgent (Sage) | MarketplaceAIAgent (AI Tutors) |
|---------|------------------------|--------------------------------|
| **Pricing** | Free | Paid (subscription-based) |
| **Ownership** | Platform-owned | User-created |
| **Availability** | Always available | Requires active subscription |
| **RAG Tiers** | 4-tier (uploads → shared → links → global) | 3-tier (materials → links → Sage fallback) |
| **Materials** | Shared platform materials | Custom uploaded materials |
| **Links** | Platform curated links | Custom agent links |
| **Implementation** | Delegates to sageOrchestrator | Custom session/message management |
| **Database Tables** | `sage_sessions`, `sage_messages` | `ai_tutor_sessions`, `ai_tutor_messages` |
| **Subjects** | Maths, English, Science, General | Any subject (user-defined) |
| **Levels** | GCSE, A-Level | Any level (user-defined) |

---

## RAG Architecture

### Platform Agent (4-Tier RAG)

```
Priority 1: User uploads (personalized materials)
    ↓
Priority 2: Shared from tutors (collaborative materials)
    ↓
Priority 3: Links (curated external resources)
    ↓
Priority 4: Global (platform-wide knowledge base)
```

### Marketplace Agent (3-Tier RAG)

```
Priority 1: Agent's custom materials
    ↓
Priority 2: Agent's custom links
    ↓
Priority 3: Sage global knowledge (fallback)
```

---

## Agent Configuration

```typescript
export interface AgentConfig {
  // LLM Provider
  provider: 'gemini' | 'deepseek' | 'claude';
  model?: string;
  temperature?: number;
  maxTokens?: number;

  // RAG Configuration
  enableRAG: boolean;
  knowledgeSources: AgentKnowledgeSource[];
  topK?: number;
  minScore?: number;

  // Behavior
  tone: 'encouraging' | 'professional' | 'supportive' | 'friendly';
  detailLevel: 'concise' | 'detailed' | 'comprehensive';
  useExamples: boolean;
  askQuestions: boolean;
  provideHints: boolean;

  // Limits
  maxMessagesPerSession?: number;
  maxSessionDuration?: number;
  rateLimit?: {
    requests: number;
    window: number;
  };
}
```

---

## Benefits

### ✅ Unified Architecture
- Single type system for all agents
- Consistent API across platform and marketplace
- Easy to add new agent types (coursework, research, etc.)

### ✅ Code Reuse
- Common functionality in BaseAgent
- Reduce duplication between Sage and AI Tutors
- Easier maintenance and bug fixes

### ✅ Flexibility
- Support both free (platform) and paid (marketplace) agents
- Different RAG strategies per context
- Customizable behavior and configuration

### ✅ Scalability
- Add new agent types without changing base architecture
- Support future agent contexts (enterprise, custom, etc.)
- Easy to extend capabilities

### ✅ Type Safety
- Full TypeScript support
- Type guards for agent context
- Clear interfaces for all components

---

## Next Steps

### Phase 2: Update Naming Conventions
- Rename `ai_tutors` table → `ai_agents` table
- Update all references to use unified naming
- Migrate existing data

### Phase 3: Database Migration
- Add `agent_type` column to support all types
- Update RLS policies
- Seed with coursework/study_buddy/research agents

### Phase 4: AI Studio UI
- Update "AI Tutor Studio" → "AI Studio"
- Support creating multiple agent types
- Agent type selector in creation flow

---

## Related Files

- **sage/index.ts** - Main Sage exports (includes agents module)
- **sage/core/orchestrator.ts** - Sage orchestrator (used by PlatformAIAgent)
- **sage/context/resolver.ts** - Context resolution for RAG
- **sage/knowledge/retriever.ts** - Knowledge retrieval
- **apps/web/src/lib/ai-tutors/manager.ts** - AI Tutor CRUD operations

---

**Created:** 2026-02-27
**Author:** TutorWise Development Team
**Version:** 1.0.0 (Phase 1 Complete)
