# Profile Graph

**Status**: Active (v4.6)
**Last Updated**: 2025-12-13
**Priority**: High (Tier 1 - Foundation for Network, Students, Referrals, Reviews)
**Architecture**: Unified Relationship Management with Graph Structure

---

## How to Navigate This Documentation

**We have 4 documents**. Choose your reading path based on your role:

### 🎯 For Product Managers / Stakeholders
**Goal**: Understand business value and system architecture

**Recommended Path** (25 min read):
1. **Start here** → [README.md](./README.md) (this file) - Overview and use cases
2. [Solution Design v2](./profile-graph-solution-design-v2.md) ⭐ - Read sections:
   - Executive Summary
   - Problem Statement (Before/After)
   - Five Relationship Types Explained
   - Integration Points

**Skip**: Database schema details, RLS policies, migration strategy

---

### 👨‍💻 For Backend Engineers
**Goal**: Understand implementation and extend the system

**Recommended Path** (1.5 hour read):
1. **Start here** → [README.md](./README.md) - Quick overview
2. [Solution Design v2](./profile-graph-solution-design-v2.md) ⭐ - Complete architecture
3. [Implementation Guide v2](./profile-graph-implementation-v2.md) ⭐ - Architecture patterns and extension guide
4. **Optional**: [Solution Design v1](./profile-graph-solution-design.md) 📦 - Code implementation details

**Focus on**: Architecture patterns, how to add relationship types, testing strategies, deployment checklist

---

### 🤖 For AI Assistants (Claude Code, Copilot)
**Goal**: Generate accurate code and understand constraints

**Recommended Path** (12 min read):
1. **Start here** → [AI Prompt Context v2](./profile-graph-prompt-v2.md) ⭐ - Quick reference + DO/DON'Ts
2. [README.md](./README.md) - Use case examples
3. **Optional**: [AI Prompt Context v1](./profile-graph-prompt.md) 📦 - Code snippets

**Focus on**: Relationship types, DO/DON'T section, common patterns, file references

---

### 📊 Document Index

| # | Document | Purpose | Length | Audience |
|---|----------|---------|--------|----------|
| 1 | [README.md](./README.md) | Overview + use cases + navigation | ~450 lines | Everyone |
| 2 | [Solution Design v2](./profile-graph-solution-design-v2.md) ⭐ | Complete architecture (hybrid descriptive) | ~1,450 lines | PM, Engineers |
| 3 | [Implementation Guide v2](./profile-graph-implementation-v2.md) ⭐ | Developer guide (pattern-focused) | ~650 lines | Engineers |
| 4 | [AI Prompt Context v2](./profile-graph-prompt-v2.md) ⭐ | AI assistant reference (simplified) | ~450 lines | AI tools |
| 5 | [Documentation Review](./profile-graph-documentation-review.md) | Quality audit + v2 roadmap | ~800 lines | Documentation maintainers |
| 6 | [Solution Design v1](./profile-graph-solution-design.md) 📦 | Legacy architecture (code snippets) | ~728 lines | Reference only |
| 7 | [Implementation Guide v1](./profile-graph-implementation.md) 📦 | Legacy developer guide | ~259 lines | Reference only |
| 8 | [AI Prompt Context v1](./profile-graph-prompt.md) 📦 | Legacy AI reference | ~401 lines | Reference only |

⭐ = **Recommended v2 documentation** (created 2025-12-13, hybrid descriptive approach)
📦 = **Legacy v1 documentation** (retained for code snippet reference only)

**Total**: 4 v2 documents + 3 v1 legacy + 1 review document

---

## Quick Links by Document Type

### ⭐ Recommended Documentation (v2 - Descriptive Style)
- [Solution Design v2](./profile-graph-solution-design-v2.md) ⭐ - Comprehensive architecture with worked examples, tables, and ASCII diagrams
- [Implementation Guide v2](./profile-graph-implementation-v2.md) ⭐ - Pattern-focused developer guide with practical scenarios
- [AI Prompt Context v2](./profile-graph-prompt-v2.md) ⭐ - Simplified AI assistant guidance with DO/DON'Ts

### 📊 Documentation Quality
- [Documentation Review](./profile-graph-documentation-review.md) - Quality audit and v2 roadmap (2025-12-13)

### 📦 Legacy Reference (v1 - Code Snippets)
- [Solution Design v1](./profile-graph-solution-design.md) 📦 - Architecture with TypeScript/SQL code examples
- [Implementation Guide v1](./profile-graph-implementation.md) 📦 - Developer guide with code blocks
- [AI Prompt Context v1](./profile-graph-prompt.md) 📦 - AI guidance with code snippets

⭐ = **Recommended v2 documentation** (created 2025-12-13, hybrid descriptive approach)
📦 = **Legacy v1 documentation** (retained for code snippet reference only)

**Note**: v2 documents focus on concepts and patterns; v1 documents provide code implementation details

---

## Overview

**Profile Graph** is TutorWise's unified relationship management system. It consolidates all user-to-user relationships (Social, Guardian, Booking, Agent) into a single `profile_graph` table using a flexible relationship_type enum pattern.

This system powers:
- **Social Links**: User connections and networking (Network v4.4)
- **Guardian Links**: Parent → Student relationships (Student Onboarding v5.0)
- **Booking Links**: Client → Tutor completed bookings (Reviews v4.5)
- **Agent Links**: Referrals and commission delegation (Referrals v4.3)

**Replaces**: The old isolated `connections` table

---

## Architecture

### Core Principles

1. **Single Source of Truth**: One table (`profile_graph`) for all relationships
2. **Directed Graph**: Relationships have source → target directionality
3. **Typed Relationships**: 5 relationship types via PostgreSQL enum
4. **Lifecycle States**: 4 status values (PENDING, ACTIVE, BLOCKED, COMPLETED)
5. **Flexible Metadata**: JSONB column for relationship-specific context
6. **Performance-First**: 6 indexes for common query patterns

### Relationship Types

```typescript
type RelationshipType =
  | 'GUARDIAN'         // Parent → Student (authority relationship)
  | 'SOCIAL'           // User ↔ User (mutual connection)
  | 'BOOKING'          // Client → Tutor (completed booking)
  | 'AGENT_DELEGATION' // Tutor → Agent (commission sharing)
  | 'AGENT_REFERRAL';  // Agent → Client (referral attribution)
```

### Relationship Statuses

```typescript
type RelationshipStatus =
  | 'PENDING'   // Awaiting acceptance (e.g., connection request)
  | 'ACTIVE'    // Currently valid relationship
  | 'BLOCKED'   // User blocked the other
  | 'COMPLETED'; // Past event (e.g., completed booking)
```

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                 Profile Graph (v4.6)                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │           profile_graph TABLE                       │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │ id (UUID)                                     │  │    │
│  │  │ source_profile_id → profiles(id)             │  │    │
│  │  │ target_profile_id → profiles(id)             │  │    │
│  │  │ relationship_type (ENUM)                     │  │    │
│  │  │ status (ENUM)                                │  │    │
│  │  │ metadata (JSONB)                             │  │    │
│  │  │ created_at, updated_at                       │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  │                                                      │    │
│  │  CONSTRAINTS:                                       │    │
│  │  - no_self_links (source ≠ target)                 │    │
│  │  - unique_relationship_path (source, target, type) │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │           ProfileGraphService (TypeScript)          │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │ Core Methods:                                 │  │    │
│  │  │ - createLink(params)                         │  │    │
│  │  │ - getUserLinks(profileId, type?, status?)   │  │    │
│  │  │ - getOutgoingLinks(profileId)               │  │    │
│  │  │ - getIncomingLinks(profileId)               │  │    │
│  │  │ - updateLink(linkId, status)                │  │    │
│  │  │ - deleteLink(linkId)                        │  │    │
│  │  │ - linkExists(source, target, type)          │  │    │
│  │  │                                              │  │    │
│  │  │ Domain-Specific Helpers:                     │  │    │
│  │  │ - getGuardianLinks(parentId)                │  │    │
│  │  │ - getSocialLinks(userId)                    │  │    │
│  │  │ - sendConnectionRequest(from, to)           │  │    │
│  │  │ - acceptConnectionRequest(linkId)           │  │    │
│  │  │ - blockUser(linkId)                         │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Example Use Cases

### Use Case 1: Social Networking (Network v4.4)

**Scenario**: User A wants to connect with User B

```typescript
// 1. User A sends connection request
await ProfileGraphService.sendConnectionRequest(userAId, userBId);
// Creates: { source: A, target: B, type: 'SOCIAL', status: 'PENDING' }

// 2. User B views pending requests
const requests = await ProfileGraphService.getPendingSocialRequests(userBId);

// 3. User B accepts request
await ProfileGraphService.acceptConnectionRequest(requestId);
// Updates: { status: 'ACTIVE' }

// 4. Both users can now see each other in their connections
const connectionsA = await ProfileGraphService.getSocialLinks(userAId);
const connectionsB = await ProfileGraphService.getSocialLinks(userBId);
```

### Use Case 2: Guardian Links (Student Onboarding v5.0)

**Scenario**: Parent manages student accounts

```typescript
// 1. Parent creates guardian link to student
await ProfileGraphService.createLink({
  sourceId: parentId,
  targetId: studentId,
  type: 'GUARDIAN',
  status: 'ACTIVE',
  metadata: {
    student_email: 'student@example.com',
    invitation_sent_at: new Date().toISOString()
  }
});

// 2. Parent retrieves all their students
const myStudents = await ProfileGraphService.getGuardianLinks(parentId);

// 3. System uses links for authorization
// "Can parent book on behalf of student?" → Check GUARDIAN link exists
```

### Use Case 3: Booking Links (Reviews v4.5)

**Scenario**: Track client-tutor booking history

```typescript
// 1. After booking completion, create BOOKING link
await ProfileGraphService.createLink({
  sourceId: clientId,
  targetId: tutorId,
  type: 'BOOKING',
  status: 'COMPLETED',
  metadata: {
    booking_id: bookingId,
    student_id: studentId,
    review_session_id: reviewId
  }
});

// 2. Reviews system checks if client has booked tutor before
const hasBooked = await ProfileGraphService.linkExists(
  clientId,
  tutorId,
  'BOOKING'
);

// Only clients with BOOKING link can leave reviews
if (!hasBooked) {
  throw new Error('You must complete a booking before leaving a review');
}
```

### Use Case 4: Agent Relationships (Referrals v4.3)

**Scenario**: Agent refers a client and receives commission

```typescript
// 1. Agent refers client (referral attribution)
await ProfileGraphService.createLink({
  sourceId: agentId,
  targetId: clientId,
  type: 'AGENT_REFERRAL',
  status: 'ACTIVE',
  metadata: {
    referral_code: 'AGENT123',
    referred_at: new Date().toISOString()
  }
});

// 2. Tutor delegates commission to agent
await ProfileGraphService.createLink({
  sourceId: tutorId,
  targetId: agentId,
  type: 'AGENT_DELEGATION',
  status: 'ACTIVE',
  metadata: {
    commission_percentage: 10
  }
});

// 3. CaaS uses AGENT_REFERRAL for network score
// Tutors with incoming AGENT_REFERRAL links get +8 network bonus
```

---

## Database Schema

### Table: profile_graph

```sql
CREATE TABLE profile_graph (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relationship_type relationship_type NOT NULL,
  status relationship_status NOT NULL DEFAULT 'ACTIVE',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT no_self_links CHECK (source_profile_id <> target_profile_id),
  CONSTRAINT unique_relationship_path UNIQUE (source_profile_id, target_profile_id, relationship_type)
);
```

**Key Constraints**:
- **no_self_links**: Prevents users from linking to themselves
- **unique_relationship_path**: Ensures only one relationship of a given type between two users

**Metadata Examples**:
```json
// GUARDIAN link
{
  "student_email": "student@example.com",
  "invitation_sent_at": "2025-12-12T10:00:00Z"
}

// BOOKING link
{
  "booking_id": "uuid",
  "student_id": "uuid",
  "review_session_id": "uuid"
}

// SOCIAL link
{
  "mutual": true,
  "connected_at": "2025-12-12T10:00:00Z"
}

// AGENT_DELEGATION link
{
  "commission_percentage": 10
}
```

### Performance Indexes

```sql
-- 6 indexes for common query patterns
CREATE INDEX idx_profile_graph_source_id ON profile_graph(source_profile_id);
CREATE INDEX idx_profile_graph_target_id ON profile_graph(target_profile_id);
CREATE INDEX idx_profile_graph_type ON profile_graph(relationship_type);
CREATE INDEX idx_profile_graph_status ON profile_graph(status);
CREATE INDEX idx_profile_graph_composite ON profile_graph(source_profile_id, relationship_type, status);
CREATE INDEX idx_profile_graph_bidirectional ON profile_graph(source_profile_id, target_profile_id);
```

**Query Performance**:
- Source lookup: <5ms (indexed)
- Target lookup: <5ms (indexed)
- Bidirectional lookup: <10ms (composite index)

---

## RLS Policies

**Row-Level Security** ensures users can only access relationships they're part of:

```sql
-- Users can view relationships they're in
CREATE POLICY "Users can view their relationships"
  ON profile_graph FOR SELECT
  USING (auth.uid() = source_profile_id OR auth.uid() = target_profile_id);

-- Users can create relationships where they are the source
CREATE POLICY "Users can create relationships"
  ON profile_graph FOR INSERT
  WITH CHECK (auth.uid() = source_profile_id);

-- Both source and target can update (e.g., target can accept/reject)
CREATE POLICY "Users can update their relationships"
  ON profile_graph FOR UPDATE
  USING (auth.uid() = source_profile_id OR auth.uid() = target_profile_id);

-- Only source can delete relationships
CREATE POLICY "Users can delete relationships they created"
  ON profile_graph FOR DELETE
  USING (auth.uid() = source_profile_id);
```

---

## Integration Points

### 1. Network Feature (v4.4)
- Uses `SOCIAL` relationship type for connections
- Pending requests for mutual connection flow
- Supports blocking via `BLOCKED` status

### 2. Student Onboarding (v5.0)
- Uses `GUARDIAN` relationship type for parent → student links
- Metadata stores student email and invitation details
- Authorization checks for booking on behalf of students

### 3. Reviews Feature (v4.5)
- Uses `BOOKING` relationship type to track booking history
- Only users with `BOOKING` link can leave reviews
- Metadata stores booking_id and review_session_id

### 4. Referrals Feature (v4.3)
- Uses `AGENT_REFERRAL` for attribution (Agent → Client)
- Uses `AGENT_DELEGATION` for commission (Tutor → Agent)
- CaaS reads AGENT_REFERRAL for network scoring

### 5. CaaS (v5.5)
- Reads `SOCIAL` links for connection_count (Bucket 3)
- Reads `AGENT_REFERRAL` (incoming) for is_agent_referred bonus
- Reads `AGENT_REFERRAL` (outgoing) for referral_count
- Triggers score recalculation when relationships change

---

## Common Patterns

### Pattern 1: Bidirectional Relationships (SOCIAL)

```typescript
// SOCIAL links are directional but treated as mutual
// When A sends request to B:
// Row: { source: A, target: B, type: 'SOCIAL', status: 'PENDING' }

// Query all connections (regardless of direction):
const allConnections = await ProfileGraphService.getSocialLinks(userId);
// Returns links where userId is EITHER source OR target
```

### Pattern 2: One-Way Authority (GUARDIAN)

```typescript
// GUARDIAN links are strictly directional
// Parent → Student (not Student → Parent)

// Only source (parent) can:
// - Create the link
// - Delete the link
// - Book on behalf of target (student)

const myStudents = await ProfileGraphService.getGuardianLinks(parentId);
// Returns only links where parentId is the SOURCE
```

### Pattern 3: Historical Record (BOOKING)

```typescript
// BOOKING links are immutable historical records
// Status is always 'COMPLETED' (past tense)

// Created after booking completion, never deleted
await ProfileGraphService.createLink({
  sourceId: clientId,
  targetId: tutorId,
  type: 'BOOKING',
  status: 'COMPLETED',
  metadata: { booking_id: bookingId }
});

// Used for eligibility checks (e.g., can leave review?)
const hasBooked = await ProfileGraphService.linkExists(
  clientId,
  tutorId,
  'BOOKING'
);
```

---

## Migration Notes

**Version**: v4.6
**Migration File**: `061_add_profile_graph_v4_6.sql`

**Breaking Changes**:
- Replaces old `connections` table
- Migration 062 includes data migration script to move existing connections to profile_graph

**Rollback**:
- Rollback scripts available: `061_add_profile_graph_v4_6_rollback.sql`
- Restores old `connections` table structure

---

## Future Enhancements

### Proposed: Connection Strength Weighting

Track interaction frequency to weight connections:

```typescript
// Add to metadata
{
  "interaction_count": 42,
  "last_interaction_at": "2025-12-12T10:00:00Z",
  "strength_score": 0.87 // 0-1 scale
}
```

### Proposed: Graph Visualization

D3.js network graph showing:
- Nodes: Users
- Edges: Relationships (colored by type)
- Edge width: Connection strength
- Clusters: Communities within network

---

**Last Updated**: 2025-12-12
**Version**: v4.6 (Unified Relationship Management)
**Maintainer**: Platform Team (Foundation for Network, Students, Referrals)
