# [Feature Name] - Solution Design v2

**Version**: v2.0 (Hybrid Descriptive Approach)
**Date**: [YYYY-MM-DD]
**Status**:  Active |  Draft |  Deprecated
**Owner**: [Team/Person]
**Last Updated**: [YYYY-MM-DD]

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Goals & Success Metrics](#goals--success-metrics)
4. [Core Architecture](#core-architecture)
5. [Key Concepts Explained](#key-concepts-explained)
6. [Integration Points](#integration-points)
7. [Security & Privacy](#security--privacy)
8. [Performance Considerations](#performance-considerations)
9. [Design Decisions](#design-decisions)
10. [Future Enhancements](#future-enhancements)
11. [References](#references)

---

## Executive Summary

### What is [Feature Name]?

**One-sentence summary**: [Feature Name] is [concise description in business terms]

**Business Value**:
- **For users**: [Primary user benefit]
- **For business**: [Business impact]
- **For platform**: [Technical/ecosystem benefit]

---

### Key Metrics

| Metric | Target | Current | Impact |
|--------|--------|---------|--------|
| [Metric 1] | [Target value] | [Current value] | [Business impact] |
| [Metric 2] | [Target value] | [Current value] | [Business impact] |

---

### Quick Facts

- **Database Tables**: [count]
- **API Endpoints**: [count]
- **UI Components**: [count]
- **Integration Points**: [count] ([list features])
- **Implementation Status**: [X]% complete

---

## Problem Statement

### Before: What Problem Are We Solving?

**Current State** (Before [Feature Name]):
-  **Problem 1**: [Specific pain point]
-  **Problem 2**: [Another issue]
-  **Problem 3**: [Technical limitation]

**Real-World Example**:
> Scenario: [Describe a concrete user scenario that illustrates the problem]
>
> Pain Point: [What goes wrong in this scenario?]

---

### After: What Does Success Look Like?

**Desired State** (After [Feature Name]):
-  **Solution 1**: [How we solve problem 1]
-  **Solution 2**: [How we solve problem 2]
-  **Solution 3**: [How we solve problem 3]

**Success Scenario**:
> Scenario: [Same scenario as above, but with the feature]
>
> Outcome: [What happens successfully now?]

---

### Why Now?

**Business drivers**:
1. [Driver 1 - e.g., Market demand, competitive pressure]
2. [Driver 2 - e.g., Technical debt reduction, platform growth]
3. [Driver 3 - e.g., Revenue opportunity, user retention]

**Dependencies resolved**:
- [Feature A] is now complete (needed for [reason])
- [System B] has been upgraded (enables [capability])

---

## Goals & Success Metrics

### Primary Goals

1. **Goal 1**: [Specific, measurable objective]
   - **Success metric**: [How we measure]
   - **Target**: [Quantified target]

2. **Goal 2**: [Another objective]
   - **Success metric**: [Measurement approach]
   - **Target**: [Target value]

3. **Goal 3**: [Third objective]
   - **Success metric**: [KPI]
   - **Target**: [Goal]

---

### Non-Goals (Explicitly Out of Scope)

-  **Non-goal 1**: [What we're NOT doing]
  - **Rationale**: [Why not now]
  - **Future consideration**: [When we might revisit]

-  **Non-goal 2**: [Another exclusion]
  - **Rationale**: [Reason for exclusion]

---

## Core Architecture

### High-Level System Design

**Component Overview**:

```
User Interface Layer
  
API Layer (Next.js Routes)
  
Service Layer (Business Logic)
  
Database Layer (PostgreSQL + RLS)
```

**Key Design Principle**: [State your core architectural principle - e.g., "Service layer encapsulates all business logic"]

---

### Database Schema

#### Tables Created

**1. [table_name_1]** - [Purpose]

**Key Fields** (Conceptual):
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to profiles)
- `[key_field_1]` ([type]) - [Purpose/meaning]
- `[key_field_2]` ([type]) - [Purpose/meaning]
- `metadata` (JSONB) - [What goes here]
- Timestamps (created_at, updated_at)

**Design Decisions**:
- **Why UUID instead of integer ID?** [Rationale]
- **Why JSONB for metadata?** [Flexibility reason]
- **Why [specific constraint]?** [Business logic reason]

**File Reference**: [apps/api/migrations/XXX_create_[table].sql](../../apps/api/migrations/XXX_create_[table].sql)

---

**2. [table_name_2]** - [Purpose]

[Follow same structure for other tables]

---

#### Relationships

**[Table A]  [Table B]**:
- **Type**: One-to-Many / Many-to-Many / etc.
- **Business Logic**: [Explain the relationship in business terms]
- **Example**: "Each User can have multiple Wiselists, but each Wiselist belongs to one User"

---

### Security Architecture

#### Row Level Security (RLS) Policies

**Policy Philosophy**: [Explain your RLS approach - e.g., "Users can only see their own data plus public data"]

**Example Policy Explained**:

**Policy Name**: `users_can_read_own_data`

**What it does**: Allows users to read rows where `user_id` matches their authenticated ID

**Why we need it**: [Security justification]

**Edge cases handled**:
- Unauthenticated users: [What they can see]
- Admin users: [Special permissions]
- Public data: [How it's handled]

**Total RLS Policies**: [count] across [count] tables

**File Reference**: See migration files in [apps/api/migrations/](../../apps/api/migrations/)

---

### API Architecture

#### Service Layer Pattern

**Philosophy**: "All business logic lives in the service layer, not in API routes"

**Benefits**:
1. **Testability**: Pure functions, easy to unit test
2. **Reusability**: Same logic for API routes and Server Actions
3. **Maintainability**: Single source of truth

**Example Service Function** (Conceptual):

```typescript
// Service layer encapsulates business logic
export async function create[Feature](data: CreateInput): Promise<Feature> {
  // 1. Validate input
  // 2. Check permissions
  // 3. Process business logic
  // 4. Persist to database
  // 5. Return result
}
```

**File Reference**: [lib/api/[feature].ts](../../apps/web/src/lib/api/[feature].ts)

---

## Key Concepts Explained

### Concept 1: [Important Feature-Specific Concept]

**What is it?**: [Plain English explanation]

**Why do we have it?**: [Business/technical reason]

**How it works**: [Step-by-step explanation with worked example]

**Worked Example**:
> **Scenario**: [Concrete example]
>
> **Step 1**: [First thing that happens]
> - System action: [What the code does]
> - Business logic: [Why we do it]
>
> **Step 2**: [Second thing that happens]
> - System action: [What the code does]
> - Business logic: [Why we do it]
>
> **Result**: [Final outcome]

---

### Concept 2: [Another Key Concept]

[Follow same structure - plain English, worked examples, minimal code]

---

### Concept 3: [Design Pattern Used]

**Pattern Name**: [e.g., "Polymorphic Association Pattern"]

**Problem it solves**: [What problem this pattern addresses]

**How we implement it**: [High-level explanation]

**Example**:
> **Use Case**: [Concrete example]
>
> **Implementation**: [How the pattern works in this context]
>
> **Constraints**: [Database constraints or business rules that enforce the pattern]

**Trade-offs**:
-  **Pros**: [Benefits of this approach]
-  **Cons**: [Drawbacks or complexity introduced]

---

## Integration Points

### Integration 1: [Feature A] Integration

**Purpose**: [Why do these features need to integrate?]

**Integration Type**: Database Foreign Key / API Call / Event / Webhook / etc.

**Data Flow**:
```
[Feature Name]  [Data passed]  [Feature A]
                 [Response] 
```

**Worked Example**:
> **Scenario**: [When does this integration trigger?]
>
> **Step 1**: [Feature Name] detects [event]
> **Step 2**: [Action taken - e.g., "Creates foreign key reference"]
> **Step 3**: [Feature A] receives [data]
> **Step 4**: [Feature A] processes and [result]
> **Step 5**: [Feature Name] handles [response/callback]

**Business Logic**:
- **Why this integration?** [Business reason]
- **What happens if it fails?** [Error handling strategy]
- **Performance impact?** [Query optimization, caching, etc.]

**File References**:
- [Feature Name] side: [file:line]
- [Feature A] side: [file:line]

---

### Integration 2: [Feature B] Integration

[Follow same structure]

---

### Integration 3: [External Service] Integration

**Service**: [Name of external service - e.g., Stripe, Resend, etc.]

**Purpose**: [Why we integrate]

**Authentication**: [API key, OAuth, etc.]

**Webhook Handling**: [If applicable]

**Error Handling**: [How we handle service downtime]

---

## Security & Privacy

### Authentication & Authorization

**Authentication**: [How users are authenticated - e.g., Supabase Auth]

**Authorization Levels**:
| Role | Permissions | Use Case |
|------|-------------|----------|
| Public | [What they can do] | Unauthenticated users |
| User | [What they can do] | Logged-in users |
| Admin | [What they can do] | Platform administrators |

---

### Data Protection

**Personal Data Handled**:
- [Field 1]: [How it's protected]
- [Field 2]: [Encryption/hashing strategy]

**GDPR Compliance**:
- [ ] Data export capability
- [ ] Data deletion capability
- [ ] Consent tracking
- [ ] Privacy policy disclosure

---

### Security Checklist

- [x] Input validation on all user inputs
- [x] SQL injection prevention (parameterized queries via Supabase)
- [x] XSS prevention (React escaping + sanitization where needed)
- [x] CSRF protection (Next.js built-in)
- [x] RLS policies on all tables
- [ ] Rate limiting on API endpoints (TODO)
- [ ] Audit logging for sensitive operations (TODO)

---

## Performance Considerations

### Performance Requirements

| Operation | Target | Rationale |
|-----------|--------|-----------|
| Page Load | < 2 seconds | User experience benchmark |
| API Response (p95) | < 500ms | Acceptable latency |
| Database Query (p95) | < 100ms | Prevents bottlenecks |

---

### Optimization Strategies

**1. Database Indexing**:
- Index on `user_id` (most queries filter by user)
- Index on `status` (common filter, low cardinality)
- Partial index on `created_at WHERE status = 'active'` (optimize hot path)

**Rationale**: [Explain the query patterns these indexes support]

---

**2. Caching Strategy**:
- **Client-side**: React Query with 5-minute stale time
- **Server-side**: Redis cache for [specific data]
- **Edge**: Vercel Edge Network for static assets

**What we cache**: [Specific data that rarely changes]

**What we DON'T cache**: [Real-time or user-specific data]

---

**3. Pagination**:
- Use cursor-based pagination for infinite scroll
- Use offset pagination for numbered pages
- Default page size: [count] items

**Why cursor-based?**: [Advantages for large datasets]

---

### Monitoring

**Dashboards**:
- Vercel Analytics: Page performance
- Supabase Dashboard: Database query performance
- Sentry: Error tracking

**Alerts Set Up For**:
- API error rate > 1%
- Response time > 2x baseline
- Database connection pool > 80%

---

## Design Decisions

### Decision 1: [Major Architectural Decision]

**Context**: [What problem needed solving or choice needed making?]

**Options Considered**:

**Option A: [Approach A]**
-  **Pros**: [Advantage 1], [Advantage 2]
-  **Cons**: [Drawback 1], [Drawback 2]
- **Complexity**: Low / Medium / High
- **Cost**: [Implementation effort]

**Option B: [Approach B]**
-  **Pros**: [Advantage 1], [Advantage 2]
-  **Cons**: [Drawback 1], [Drawback 2]
- **Complexity**: Low / Medium / High
- **Cost**: [Implementation effort]

**Option C: [Approach C]**
-  **Pros**: [Advantage 1], [Advantage 2]
-  **Cons**: [Drawback 1], [Drawback 2]
- **Complexity**: Low / Medium / High
- **Cost**: [Implementation effort]

**Decision**: We chose **Option B**

**Rationale**:
1. [Primary reason - e.g., "Best performance for our query patterns"]
2. [Secondary reason - e.g., "Lowest implementation complexity"]
3. [Tiebreaker reason - e.g., "Team has most experience with this approach"]

**Trade-offs Accepted**:
- We gain: [Benefit from chosen option]
- We lose: [What we gave up from other options]
- We'll revisit if: [Conditions that would make us reconsider]

**Documented**: [Date decision was made]

---

### Decision 2: [Another Major Decision]

[Follow same structure with options, pros/cons, rationale]

---

### Decision 3: [Data Model Decision]

**Context**: [Why this decision was needed]

**What we chose**: [The approach]

**Why**: [Rationale]

**Example**: [Concrete example showing how it works]

---

## Future Enhancements

### Phase 1 (Completed): [What's already done]
-  [Feature 1]
-  [Feature 2]

**Completion Date**: [YYYY-MM-DD]

---

### Phase 2 (In Progress): [Current work]
-  [Feature 3]
-  [Feature 4]

**Estimated Completion**: [YYYY-MM-DD]

---

### Phase 3 (Planned): [Next features]
-  [Feature 5]
-  [Feature 6]

**Why these features?**: [Business justification]

**Dependencies**: [What needs to be done first]

---

### Future Possibilities (Not Committed)

**Enhancement 1**: [Potential feature]
- **Value**: [Business benefit]
- **Effort**: [Implementation estimate]
- **Decision date**: [When we'll decide whether to build]

**Enhancement 2**: [Another possibility]
- **Value**: [Benefit]
- **Effort**: [Estimate]
- **Decision date**: [TBD]

---

### Known Limitations

| Limitation | Impact | Workaround | Planned Fix |
|------------|--------|------------|-------------|
| [Issue 1] | [User impact] | [Temporary solution] | [When we'll fix / Won't fix] |
| [Issue 2] | [Impact] | [Workaround] | [Timeline] |

---

## References

### Related Documentation
| Document | Path | Purpose |
|----------|------|---------|
| Feature README | [README.md](./README.md) | Feature overview & navigation |
| Implementation Guide | [[feature]-implementation-v2.md](./ [feature]-implementation-v2.md) | Developer how-to patterns |
| AI Prompt Context | [[feature]-prompt-v2.md](./ [feature]-prompt-v2.md) | AI assistant reference |

---

### Code Files & Locations

See [references-section-template.md](../templates/references-section-template.md) for complete file reference structure.

**Quick Reference**:
- **Database**: `apps/api/migrations/XXX_[feature].sql`
- **Service Layer**: `apps/web/src/lib/api/[feature].ts`
- **API Routes**: `apps/web/src/app/api/[feature]/route.ts`
- **Components**: `apps/web/src/app/components/feature/[feature]/`
- **Types**: `apps/web/src/types/index.ts`

---

### External References

**Research & Context**:
- [Industry best practice article](https://example.com)
- [Similar implementation](https://example.com)
- [Technical documentation](https://example.com)

**Design Resources**:
- [Figma designs](https://figma.com/...)
- [User research findings](link)

---

## Appendix

### Changelog

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| v2.0 | [YYYY-MM-DD] | Updated to v2 hybrid descriptive format | [Name] |
| v1.0 | [YYYY-MM-DD] | Initial design | [Name] |

---

### Questions & Answers

**Q: [Common question about this feature]?**
A: [Answer with rationale]

**Q: [Another common question]?**
A: [Answer]

---

**Document Status**:  Active
**Next Review**: [YYYY-MM-DD]
**Maintainer**: [Team/Person]

---

**End of Solution Design**
