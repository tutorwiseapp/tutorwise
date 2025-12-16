# [Feature Name] Documentation Review

**Review Date**: [YYYY-MM-DD]
**Reviewer**: [Name/Team]
**Scope**: Code analysis + documentation audit
**Feature Version**: [v1.0, v2.0, etc.]

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Code Analysis (PRIMARY SOURCE OF TRUTH)](#code-analysis-primary-source-of-truth)
3. [Documentation Accuracy Assessment](#documentation-accuracy-assessment)
4. [Gap Analysis](#gap-analysis)
5. [Recommendations](#recommendations)
6. [Implementation Roadmap](#implementation-roadmap)

---

## Executive Summary

### Quick Assessment

| Aspect | Rating | Notes |
|--------|--------|-------|
| **Code Quality** | =/=/=4 | [Brief assessment] |
| **Implementation Completeness** | [X]% | Based on code analysis |
| **Documentation Completeness** | [X]% | Based on v2 standards |
| **Documentation Accuracy** | =/=/=4 | Docs match code reality? |
| **v2 Compliance** | =/=/=4 | Follows hybrid descriptive approach? |

**Key Finding**: [1-2 sentence summary of most important discovery]

**Primary Recommendation**: [Create new docs / Update existing / No action needed]

---

## Code Analysis (PRIMARY SOURCE OF TRUTH)

> **CRITICAL**: Always analyze code FIRST before reviewing documentation
> Code is the source of truth, not documentation

### 1. Database Layer

**Migration Files**:
```bash
# Command used to find migrations
ls -la apps/api/migrations/ | grep [feature]
```

**Found Migrations**:
| File | Date Created | Purpose | Status |
|------|--------------|---------|--------|
| `XXX_create_[table].sql` | YYYY-MM-DD | Create main table |  Applied |
| `XXX_add_[column].sql` | YYYY-MM-DD | Add column |  Applied |

**Database Objects Created**:
- Tables: [count] ([table names])
- Indexes: [count]
- RLS Policies: [count]
- Functions/Triggers: [count]

**Assessment**:  Complete / = Partial / L Missing

---

### 2. TypeScript Types

**Type Definition Files**:
```bash
# Command used
grep -r "interface [FeatureName]" apps/web/src/types/
```

**Found Types**:
| Interface/Type | File | Purpose |
|----------------|------|---------|
| `[TypeName]` | `types/index.ts` | [Purpose] |

**Assessment**:  Complete / = Partial / L Missing

---

### 3. API Service Layer

**Service Files**:
```bash
# Command used
find apps/web/src/lib/api -name "*[feature]*"
```

**Found Services**:
| File | Lines | Functions | Purpose |
|------|-------|-----------|---------|
| `lib/api/[feature].ts` | [count] | [count] | [Purpose] |

**Key Functions Implemented**:
- `get[Feature]()`
- `create[Feature]()`
- `update[Feature]()`
- `delete[Feature]()`
- [Other functions]

**Assessment**:  Complete / = Partial / L Missing

---

### 4. REST API Endpoints

**API Route Files**:
```bash
# Command used
find apps/web/src/app/api -path "*[feature]*"
```

**Found Endpoints**:
| Route | File | Methods | Purpose |
|-------|------|---------|---------|
| `/api/[feature]` | `route.ts` | GET, POST | List/Create |
| `/api/[feature]/[id]` | `[id]/route.ts` | GET, PATCH, DELETE | CRUD single item |

**Assessment**:  Complete / = Partial / L Missing

---

### 5. UI Components

**Component Files**:
```bash
# Command used
find apps/web/src/app/components -path "*[feature]*" -name "*.tsx"
```

**Found Components**:
| Component | File | Purpose |
|-----------|------|---------|
| `[Name]Card.tsx` | `components/feature/[feature]/` | [Purpose] |
| `[Name]Modal.tsx` | `components/feature/[feature]/` | [Purpose] |

**Total Components**: [count]

**Assessment**:  Complete / = Partial / L Missing

---

### 6. Pages/Routes

**Page Files**:
```bash
# Command used
find apps/web/src/app -path "*[feature]*" -name "page.tsx"
```

**Found Pages**:
| Route | File | Purpose |
|-------|------|---------|
| `/[route]` | `(authenticated)/[feature]/page.tsx` | Main page |
| `/[route]/[id]` | `(authenticated)/[feature]/[id]/page.tsx` | Detail page |

**Assessment**:  Complete / = Partial / L Missing

---

### 7. Integration Points

**Integrations with Other Features**:
| Feature | Integration Type | Evidence |
|---------|------------------|----------|
| [Feature A] | [Database FK / API call / etc] | [File location] |
| [Feature B] | [Type] | [File location] |

**Assessment**:  Complete / = Partial / L Missing

---

### Overall Implementation Status

**Based on Code Analysis**:
- Database Layer: [X]% complete
- Service Layer: [X]% complete
- API Endpoints: [X]% complete
- UI Components: [X]% complete
- Pages: [X]% complete
- Integrations: [X]% complete

**ACTUAL IMPLEMENTATION STATUS**: **[X]% complete**

---

## Documentation Accuracy Assessment

> Compare existing documentation claims vs code reality

### Current Documentation Inventory

| Document | Lines | Status | Last Updated |
|----------|-------|--------|--------------|
| README.md | [count] | /L | YYYY-MM-DD |
| [feature]-solution-design-v2.md | [count] | /L | YYYY-MM-DD |
| [feature]-implementation-v2.md | [count] | /L | YYYY-MM-DD |
| [feature]-prompt-v2.md | [count] | /L | YYYY-MM-DD |
| IMPLEMENTATION_STATUS.md | [count] | /L | YYYY-MM-DD |

---

### Accuracy Check: Documentation vs Code Reality

#### Claim 1: [Specific claim from docs]
- **Documentation Says**: "[Quote from docs]"
- **Code Reality**: [What the code actually shows]
- **Accurate?**:  Yes / L No (outdated)

#### Claim 2: [Another claim]
- **Documentation Says**: "[Quote]"
- **Code Reality**: [Actual state]
- **Accurate?**:  Yes / L No

**Continue for all major claims...**

---

### Critical Discrepancies Found

| Issue | Documentation Claim | Code Reality | Impact |
|-------|---------------------|--------------|--------|
| 1 | "30% complete" | Actually 80-90% complete | High - misleading status |
| 2 | "No UI components" | 10 components exist | High - missing info |

---

## Gap Analysis

### Missing Documentation

**Required v2 Documents (Not Found)**:
- [ ] README.md - Navigation hub
- [ ] [feature]-solution-design-v2.md - Architecture
- [ ] [feature]-implementation-v2.md - Developer guide
- [ ] [feature]-prompt-v2.md - AI reference

**Explanation**: [Why these are needed]

---

### Outdated Documentation

**Documents Needing Updates**:
- [ ] IMPLEMENTATION_STATUS.md - Claims 30%, actually 80-90%
- [ ] [Other docs needing updates]

**Explanation**: [Impact of outdated info]

---

### v2 Compliance Issues

**Does NOT Follow v2 Standards**:
- [ ] Too many code blocks (47 vs target of 5-8)
- [ ] No role-based navigation
- [ ] Code-heavy instead of WHY-focused
- [ ] No DO/DON'T section in prompt

**Explanation**: [Impact on usability]

---

## Recommendations

### Priority 1: Critical Updates (Do First)

1. **Update IMPLEMENTATION_STATUS.md**
   - **Current**: Claims 30% complete
   - **Should be**: 80-90% complete based on code analysis
   - **Effort**: 15 minutes
   - **Impact**: High - corrects misleading info

2. **[Other critical updates]**

---

### Priority 2: Create Missing v2 Documentation

1. **Create README.md**
   - **Purpose**: Navigation hub + feature overview
   - **Effort**: 1 hour
   - **Template**: Use `/feature/templates/README.md`

2. **Create [feature]-solution-design-v2.md**
   - **Purpose**: Architecture + design decisions
   - **Effort**: 4 hours
   - **Template**: Use `/feature/templates/feature-solution-design.md`
   - **Key sections**: Business context, design decisions, integration points

3. **Create [feature]-implementation-v2.md**
   - **Purpose**: Developer patterns guide
   - **Effort**: 3 hours
   - **Key sections**: How to extend, common patterns, pitfalls

4. **Create [feature]-prompt-v2.md**
   - **Purpose**: AI assistant reference
   - **Effort**: 2 hours
   - **Key sections**: Quick reference, DO/DON'Ts, file references

---

### Priority 3: Refactor Legacy Documentation (Optional)

1. **Deprecate v1 documentation**
   - Mark with = Legacy symbol
   - Add deprecation notice
   - Keep for reference only

2. **Clean up redundant files**
   - Merge duplicate content
   - Remove outdated files

---

## Implementation Roadmap

### Phase 1: Fix Critical Issues (Day 1)
**Effort**: 2 hours

- [ ] Update IMPLEMENTATION_STATUS.md to reflect 80-90% completion
- [ ] Add deprecation notices to outdated docs
- [ ] Create placeholder README.md

---

### Phase 2: Create v2 Documentation (Day 2-3)
**Effort**: 10 hours

- [ ] Create README.md (1 hour)
- [ ] Create solution-design-v2.md (4 hours)
- [ ] Create implementation-v2.md (3 hours)
- [ ] Create prompt-v2.md (2 hours)

---

### Phase 3: Review & Validation (Day 4)
**Effort**: 2 hours

- [ ] Review with stakeholders (PM, Engineers)
- [ ] Validate accuracy against code
- [ ] Get approval for architectural decisions

---

### Total Effort Estimate
- Critical updates: 2 hours
- v2 documentation: 10 hours
- Review & validation: 2 hours
- **Total: 14 hours** (~2 days)

---

## Benefits of Completing v2 Documentation

### Benefit 1: Avoid Implementation Mistakes
- **Without docs**: Developers guess intent  Implement incorrectly  Refactor
- **With docs**: Developers read design  Implement correctly first time

**ROI**: Saves 20+ hours of rework

---

### Benefit 2: Faster Developer Onboarding
- **Without docs**: Read code  Reverse engineer  2 weeks to understand
- **With docs**: Read README + solution design  2 hours to understand

**ROI**: 90% reduction in onboarding time

---

### Benefit 3: AI Code Generation Accuracy
- **Without prompt**: AI guesses patterns  60% accuracy
- **With prompt-v2.md**: AI reads patterns  90%+ accuracy

**ROI**: Fewer manual code reviews

---

## Success Metrics

**After documentation complete, measure**:

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Developer onboarding time | < 2 hours | Time to understand from docs |
| Architecture questions | < 5 per week | Slack/GitHub discussion count |
| Implementation rework | < 10% of code | Git changes after initial PR |
| AI code generation accuracy | > 85% | Manual review of Claude Code output |
| Documentation maintenance | < 30 min/sprint | Time updating docs |

---

## Appendix

### Commands Used for Code Analysis

```bash
# Database migrations
ls -la apps/api/migrations/ | grep [feature]

# TypeScript types
grep -r "interface [Feature]" apps/web/src/types/

# Service layer
find apps/web/src/lib/api -name "*[feature]*"

# API routes
find apps/web/src/app/api -path "*[feature]*"

# Components
find apps/web/src/app/components -path "*[feature]*" -name "*.tsx"

# Pages
find apps/web/src/app -path "*[feature]*" -name "page.tsx"

# All files
find apps/web/src -name "*[feature]*" -type f
```

---

### Related Documentation

- [Documentation Best Practices](./README.md)
- [Solution Design Template](./feature-solution-design.md)
- [Implementation Guide Template](./feature-implementation.md)
- [AI Prompt Template](./feature-prompt.md)

---

**Document Status**: Template v2.0
**Last Updated**: 2025-12-14
**Owner**: Documentation Team

---

## Key Learnings from This Review

**What We Learned**:
1. [Key insight about code vs docs]
2. [Important discovery]
3. [Process improvement]

**What to Do Differently Next Time**:
1. [Process change]
2. [Best practice to follow]

---

**End of Review**
