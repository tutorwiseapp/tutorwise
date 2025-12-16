# [Feature Name] - Implementation Guide v2

**Version**: v2.0
**Date**: [YYYY-MM-DD]
**Status**: = Active | = Draft | =4 Deprecated
**Owner**: [Team/Person]
**Last Updated**: [YYYY-MM-DD]

---

## Table of Contents
1. [Overview](#overview)
2. [Architecture Patterns](#architecture-patterns)
3. [How to Extend This Feature](#how-to-extend-this-feature)
4. [Common Usage Patterns](#common-usage-patterns)
5. [Integration Patterns](#integration-patterns)
6. [Testing Strategies](#testing-strategies)
7. [Deployment Checklist](#deployment-checklist)
8. [Common Pitfalls & Solutions](#common-pitfalls--solutions)

---

## Overview

### Purpose of This Guide

This document provides **pattern-focused implementation guidance** for developers working with [Feature Name]. Instead of showing complete implementations, we focus on:
- **HOW to extend** the feature with new capabilities
- **PATTERNS** that work well in this codebase
- **PITFALLS** to avoid based on real-world experience

### Who Should Read This

**=h= Backend Engineers**: Read sections 1-8 (full guide)
**< Frontend Engineers**: Focus on sections 3-4 (usage patterns)
**=' DevOps**: Focus on section 7 (deployment)

**Estimated Reading Time**: 1-2 hours

---

### Quick Links

- **Solution Design**: See [[feature]-solution-design-v2.md](./ [feature]-solution-design-v2.md) for architecture
- **AI Prompt**: See [[feature]-prompt-v2.md](./ [feature]-prompt-v2.md) for quick reference
- **Code Files**: See [References](#references) section for file locations

---

## Architecture Patterns

### Pattern 1: [Core Architectural Pattern Name]

**What it is**: [Brief description of the pattern]

**Why we use it**: [Business/technical rationale]

**When to use it**:
-  Use when [scenario 1]
-  Use when [scenario 2]
- L Don't use when [anti-pattern scenario]

**Example Structure**:
```
[High-level ASCII diagram or file structure]
Service Layer
   Domain Helpers
   Data Access
Database Layer
```

**Key Files**:
- `lib/api/[feature].ts` - Service layer
- `app/api/[feature]/route.ts` - API endpoints
- [File reference:line number]

---

### Pattern 2: [Another Important Pattern]

[Follow same structure as Pattern 1]

---

## How to Extend This Feature

### Extension 1: How to Add a New [Entity Type/Property/etc]

**Scenario**: You need to add [specific new capability]

**Estimated Effort**: [X hours]

**Prerequisites**:
- [ ] Understanding of [concept A]
- [ ] Access to [resource B]
- [ ] Read [related doc C]

---

#### Step 1: Update Database Schema ([X] minutes)

**File**: Create new migration `XXX_add_[description].sql`

**What to change**:
- Add new column/table/enum value
- Create indexes
- Update RLS policies if needed

**Decision Checklist**:
- [ ] Do I need a new table or just a column?
- [ ] What should the foreign key constraints be?
- [ ] Do I need to backfill existing data?

**Example**: [File reference or conceptual example]

---

#### Step 2: Update TypeScript Types ([X] minutes)

**File**: `apps/web/src/types/index.ts`

**What to add**:
- New interface or extend existing
- Update enums
- Add validation types if using Zod

**Gotcha**: Remember to update both the database type AND the API response type

---

#### Step 3: Update Service Layer ([X] minutes)

**File**: `lib/api/[feature].ts`

**What to add**:
- New CRUD function
- Update existing functions to handle new field
- Add validation logic

**Pattern to follow**: [Explain the pattern]

---

#### Step 4: Update API Endpoints ([X] minutes)

**File**: `app/api/[feature]/route.ts`

**What to add**:
- Handle new parameter in POST/PATCH
- Validate input
- Return updated response

---

#### Step 5: Update UI Components ([X] minutes)

**Files**: `app/components/feature/[feature]/*.tsx`

**What to add**:
- Display new field
- Add form input if editable
- Update validation

---

#### Step 6: Testing ([X] minutes)

**Tests to write**:
- [ ] Unit test for service function
- [ ] Integration test for API endpoint
- [ ] Component test for UI changes

**Where**: `__tests__/[feature].test.ts`

---

### Extension 2: How to [Another Common Extension]

[Follow same step-by-step structure]

---

## Common Usage Patterns

### Pattern 1: [Common Use Case Name]

**Scenario**: When you need to [describe use case]

**Real-World Example**:
> User story: As a [role], I want to [action] so that [benefit]

**Implementation Approach**:

1. **Frontend Flow**:
   - User clicks [button]
   - Component calls `[functionName]()`
   - Optimistic UI update

2. **Backend Flow**:
   - API validates input
   - Service layer processes business logic
   - Database transaction commits
   - Return success response

**Code Example** (Conceptual):
```typescript
// High-level pattern (not full implementation)
async function [patternName]() {
  // 1. Validate
  // 2. Process
  // 3. Persist
  // 4. Return
}
```

**Error Handling**:
- Handle [error type 1]: [How to handle]
- Handle [error type 2]: [How to handle]

**Performance Considerations**:
- Use caching for [scenario]
- Paginate if [condition]

---

### Pattern 2: [Another Common Pattern]

[Follow same structure]

---

### Pattern 3: [Quick Operation Pattern]

**One-liner description**: [Brief description]

**When to use**: [Scenario]

**Example**: `[functionName]({ param1, param2 })`

**Returns**: [Return type description]

---

## Integration Patterns

### Integration 1: [Feature A] Integration

**Purpose**: How [Feature Name] integrates with [Feature A]

**Integration Type**: Database FK / API Call / Event / Shared State

**Data Flow**:
```
[Feature Name]  >  [Integration Point]  >  [Feature A]
```

**Implementation**:

1. **Trigger Point**: [When does integration happen?]
2. **Data Passed**: [What data is exchanged?]
3. **Error Handling**: [How are failures handled?]

**Example Use Case**:
> When [event happens in Feature Name], we [action in Feature A]

**Code Location**: [File reference:line number]

---

### Integration 2: [Feature B] Integration

[Follow same structure]

---

## Testing Strategies

### Unit Tests

**What to test**:
- [ ] Service layer functions (pure business logic)
- [ ] Utility functions
- [ ] Data transformations

**Testing Pattern**:
```typescript
// Arrange: Set up test data
// Act: Call function
// Assert: Verify result
```

**Mock Strategy**:
- Mock Supabase client
- Mock external APIs
- Don't mock utility functions (test real implementations)

**Coverage Target**: > 80% for service layer

---

### Integration Tests

**What to test**:
- [ ] API endpoints (full request/response cycle)
- [ ] Database queries (with test database)
- [ ] RLS policies (permission checks)

**Testing Pattern**:
- Use test database or database transactions that rollback
- Test both success and error cases
- Test edge cases (empty data, invalid IDs, etc.)

**Coverage Target**: All API endpoints

---

### E2E Tests

**What to test**:
- [ ] Critical user flows
- [ ] Multi-step processes
- [ ] Error recovery flows

**Testing Pattern**:
- Use Playwright or Cypress
- Test against staging environment
- Focus on happy path + most common errors

**Coverage Target**: Critical paths only (don't over-test)

---

### Performance Testing

**What to test**:
- [ ] Page load time < 2s
- [ ] API response time < 500ms (p95)
- [ ] Database query time < 100ms (p95)

**Tools**:
- Lighthouse for frontend
- k6 or Artillery for API load testing
- Explain plans for database queries

---

## Deployment Checklist

### Pre-Deployment

**Code Review**:
- [ ] All tests passing
- [ ] No console.logs or debug code
- [ ] TypeScript errors resolved
- [ ] Linter warnings addressed

**Database**:
- [ ] Migrations tested on staging
- [ ] Rollback plan documented
- [ ] Backfill scripts ready (if needed)

**Configuration**:
- [ ] Environment variables set
- [ ] Feature flags configured
- [ ] API keys rotated (if needed)

---

### Deployment Steps

**Phase 1: Database Migration**
1. Backup production database
2. Run migration in transaction
3. Verify schema changes
4. Test rollback (if possible)

**Phase 2: Code Deployment**
1. Deploy to staging first
2. Run smoke tests
3. Deploy to production (gradual rollout if possible)
4. Monitor error rates

**Phase 3: Verification**
1. Check monitoring dashboards
2. Test critical flows manually
3. Monitor for 24 hours

---

### Post-Deployment

**Monitoring**:
- [ ] Error rate < 0.1%
- [ ] Response times within SLA
- [ ] No spike in resource usage

**Rollback Triggers**:
- Error rate > 1%
- Response time > 2x normal
- Database deadlocks
- Customer complaints > threshold

**Rollback Plan**:
1. Revert code deployment
2. Roll back database migration (if safe)
3. Clear caches
4. Notify stakeholders

---

## Common Pitfalls & Solutions

### Pitfall 1: [Common Mistake Name]

**What happens**: [Describe the problem]

**Why it happens**: [Root cause]

**How to avoid**:
-  DO: [Correct approach]
- L DON'T: [What not to do]

**Example**:
```typescript
// L BAD: [Bad code pattern]
[bad example]

//  GOOD: [Correct code pattern]
[good example]
```

**How to fix if you hit this**: [Remediation steps]

---

### Pitfall 2: [Another Common Issue]

[Follow same structure]

---

### Pitfall 3: [Performance Pitfall]

**Problem**: [Describe performance issue]

**Symptoms**:
- Slow page loads
- High database CPU
- Timeout errors

**Solution**: [How to optimize]

**Monitoring**: [What metrics to watch]

---

## References

### Related Documentation
| Document | Path | Purpose |
|----------|------|---------|
| Solution Design | [[feature]-solution-design-v2.md](./ [feature]-solution-design-v2.md) | Architecture details |
| AI Prompt | [[feature]-prompt-v2.md](./ [feature]-prompt-v2.md) | Quick reference |
| README | [README.md](./README.md) | Feature overview |

### Code Files & Locations

#### Service Layer
| File | Purpose |
|------|---------|
| [lib/api/[feature].ts](../../apps/web/src/lib/api/[feature].ts) | Core service functions |

#### API Routes
| Route | File |
|-------|------|
| `/api/[feature]` | [app/api/[feature]/route.ts](../../apps/web/src/app/api/[feature]/route.ts) |

#### Components
| Component | File |
|-----------|------|
| `[Feature]Card.tsx` | [components/feature/[feature]/[Feature]Card.tsx](../../apps/web/src/app/components/feature/[feature]/[Feature]Card.tsx) |

#### Database
| Migration | Purpose |
|-----------|---------|
| `XXX_create_[table].sql` | Initial schema |

See [references-section-template.md](./references-section-template.md) for complete references structure.

---

## Appendix

### Decision Log

| Date | Decision | Rationale | Alternatives Considered |
|------|----------|-----------|------------------------|
| YYYY-MM-DD | [Decision made] | [Why] | [What else we considered] |

### Performance Benchmarks

| Operation | Target | Current | Last Tested |
|-----------|--------|---------|-------------|
| [Operation] | < X ms | Y ms | YYYY-MM-DD |

### Known Limitations

| Limitation | Impact | Workaround | Planned Fix |
|------------|--------|------------|-------------|
| [Issue] | [Impact level] | [How to work around] | [When we'll fix] |

---

**Document Status**: = Active
**Next Review**: [YYYY-MM-DD]
**Maintainer**: [Team/Person]

---

**End of Implementation Guide**
