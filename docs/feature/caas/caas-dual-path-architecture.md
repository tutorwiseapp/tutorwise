# CaaS Dual-Path Architecture

**Date:** 2026-01-07
**Version:** 2.0 (Entity-Based Scoring Added)
**Status:** Implemented

---

## Overview

The CaaS (Credibility as a Service) system now implements a **dual-path architecture** to handle two fundamentally different types of scoreable entities:

1. **PROFILE-based scoring** - For user profiles (Tutor, Client, Agent, Student)
2. **ENTITY-based scoring** - For non-user entities (Organisation, Team, Group)

This architecture provides clean separation of concerns, type safety, and extensibility for future entity types.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      CaaSService                            │
│                   (Dual-Path Router)                        │
└─────────────────────────────────────────────────────────────┘
                    │                    │
        ┌───────────┴──────────┐    ┌───┴──────────────────┐
        │  PROFILE PATH        │    │  ENTITY PATH         │
        │                      │    │                      │
        │ calculateProfileCaaS │    │ calculateEntityCaaS  │
        │      (userId)        │    │     (entityId)       │
        └───────┬──────────────┘    └──────┬───────────────┘
                │                           │
    ┌───────────┴──────────┐    ┌──────────┴──────────────┐
    │ IProfileCaaSStrategy │    │ IEntityCaaSStrategy     │
    └───────┬──────────────┘    └──────┬──────────────────┘
            │                           │
    ┌───────┴────────┐          ┌───────┴────────────────┐
    │ TutorStrategy  │          │ OrganisationStrategy   │
    │ ClientStrategy │          │ TeamStrategy (future)  │
    │ AgentStrategy  │          │ GroupStrategy (future) │
    └────────┬───────┘          └────────┬───────────────┘
             │                            │
    ┌────────┴────────┐          ┌────────┴───────────────┐
    │ caas_scores     │          │ entity's own table     │
    │ table           │          │ (e.g., connection_     │
    │                 │          │  groups.caas_score)    │
    └─────────────────┘          └────────────────────────┘
```

---

## Interface Hierarchy

### Base Interface

```typescript
/**
 * Base interface for all CaaS calculation strategies
 */
interface IBaseCaaSStrategy<T = CaaSScoreData> {
  calculate(supabase: SupabaseClient): Promise<T>;
}
```

### Profile-Based Interface

```typescript
/**
 * For scoring user profiles (Tutor, Client, Agent, Student)
 * Scores stored in caas_scores table
 */
interface IProfileCaaSStrategy extends IBaseCaaSStrategy {
  calculate(userId: string, supabase: SupabaseClient): Promise<CaaSScoreData>;
}
```

**Implementations:**
- `TutorCaaSStrategy`
- `ClientCaaSStrategy`
- `AgentCaaSStrategy`
- `StudentCaaSStrategy` (future)

### Entity-Based Interface

```typescript
/**
 * For scoring non-user entities (Organisation, Team, Group)
 * Scores stored in entity's own table
 */
interface IEntityCaaSStrategy<TEntity extends string = string> extends IBaseCaaSStrategy {
  calculate(entityId: string, supabase: SupabaseClient): Promise<CaaSScoreData>;
  getEntityType(): TEntity;
  getStorageTable(): string;
  getStorageColumn(): string;
}
```

**Implementations:**
- `OrganisationCaaSStrategy` (entity type: 'organisation')
- `TeamCaaSStrategy` (future)
- `GroupCaaSStrategy` (future)

---

## Service Methods

### Profile Path

```typescript
// Modern API (recommended)
CaaSService.calculateProfileCaaS(userId: string, supabase): Promise<CaaSScoreData>

// Legacy API (deprecated but functional)
CaaSService.calculate_caas(profileId: string, supabase): Promise<CaaSScoreData>
```

**Behavior:**
1. Fetches profile from `profiles` table
2. Determines role (TUTOR, CLIENT, AGENT, STUDENT)
3. Routes to appropriate profile strategy
4. Saves score to `caas_scores` table

**Storage:** `caas_scores` table
```sql
INSERT INTO caas_scores (profile_id, role_type, total_score, score_breakdown, ...)
```

### Entity Path

```typescript
// Generic entity scoring
CaaSService.calculateEntityCaaS<T>(
  entityId: string,
  strategy: T extends IEntityCaaSStrategy,
  supabase
): Promise<CaaSScoreData>

// Convenience method for organisations
CaaSService.calculateOrganisationCaaS(orgId: string, supabase): Promise<CaaSScoreData>

// Legacy API (deprecated but functional)
CaaSService.calculate_organisation_caas(orgId: string, supabase): Promise<CaaSScoreData>
```

**Behavior:**
1. Strategy calculates score for entity
2. Strategy specifies where to store score (via metadata methods)
3. Saves score to entity's own table

**Storage:** Entity's table (strategy-defined)
```sql
-- For organisations
UPDATE connection_groups SET caas_score = X WHERE id = orgId

-- For teams (future)
UPDATE teams SET credibility_score = X WHERE id = teamId
```

---

## Key Differences: Profile vs Entity

| Aspect | Profile-Based | Entity-Based |
|--------|---------------|--------------|
| **Examples** | Tutor, Client, Agent | Organisation, Team, Group |
| **Source Table** | `profiles` | `connection_groups`, `teams`, etc. |
| **Score Storage** | `caas_scores` table | Entity's own table |
| **ID Parameter** | `userId` (profile_id) | `entityId` (org_id, team_id) |
| **Strategy Interface** | `IProfileCaaSStrategy` | `IEntityCaaSStrategy` |
| **Storage Location** | Centralized (`caas_scores`) | Distributed (each entity table) |
| **Role Type** | From `profiles.roles` | N/A (entities don't have roles) |
| **Recalc Queue** | `caas_recalculation_queue` | `organisation_caas_queue`, etc. |

---

## Migration Path

### Backwards Compatibility

All existing code continues to work:

```typescript
// Old code still works (uses legacy wrapper)
await CaaSService.calculate_caas(userId, supabase);
await CaaSService.calculate_organisation_caas(orgId, supabase);

// New code is clearer
await CaaSService.calculateProfileCaaS(userId, supabase);
await CaaSService.calculateOrganisationCaaS(orgId, supabase);
```

### Deprecation Timeline

| Phase | Status | Actions |
|-------|--------|---------|
| **Phase 1** (Current) | ✅ Complete | New interfaces added, old ones aliased |
| **Phase 2** (In Progress) | ⏳ Ongoing | Update callers to use new methods |
| **Phase 3** (Future) | 📅 Planned | Mark old methods with `@deprecated` JSDoc |
| **Phase 4** (Future) | 📅 Planned | Remove legacy methods (breaking change) |

---

## Example: Adding a New Entity Type

To add a new entity type (e.g., Team):

### 1. Create the Strategy

```typescript
export class TeamCaaSStrategy implements IEntityCaaSStrategy<'team'> {
  getEntityType(): 'team' {
    return 'team';
  }

  getStorageTable(): string {
    return 'teams';
  }

  getStorageColumn(): string {
    return 'credibility_score';
  }

  async calculate(entityId: string, supabase: SupabaseClient): Promise<CaaSScoreData> {
    const teamId = entityId;

    // Fetch team data
    const { data: team } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    // Calculate score based on team metrics
    const score = /* team-specific logic */;

    return {
      total: score,
      breakdown: { /* ... */ }
    };
  }
}
```

### 2. Add Convenience Method to CaaSService

```typescript
export class CaaSService {
  static async calculateTeamCaaS(
    teamId: string,
    supabase: SupabaseClient
  ): Promise<CaaSScoreData> {
    const strategy = new TeamCaaSStrategy();
    return this.calculateEntityCaaS(teamId, strategy, supabase);
  }
}
```

### 3. Create Queue Table (Optional)

```sql
CREATE TABLE team_caas_queue (
  id SERIAL PRIMARY KEY,
  team_id UUID UNIQUE REFERENCES teams(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. Usage

```typescript
// Calculate team score
const scoreData = await CaaSService.calculateTeamCaaS(teamId, supabase);

// Score automatically saved to teams.credibility_score
```

---

## Benefits of This Architecture

### 1. **Type Safety**
TypeScript enforces correct usage:
```typescript
const profileStrategy: IProfileCaaSStrategy = new TutorCaaSStrategy(); // ✅
const entityStrategy: IEntityCaaSStrategy = new OrganisationCaaSStrategy(); // ✅

// This would fail at compile time:
const wrong: IProfileCaaSStrategy = new OrganisationCaaSStrategy(); // ❌
```

### 2. **Clear Intent**
Method names clearly indicate what's being scored:
```typescript
calculateProfileCaaS(userId) // Obviously for user profiles
calculateOrganisationCaaS(orgId) // Obviously for organisations
```

### 3. **Extensibility**
Easy to add new entity types without modifying existing code:
- Teams, Groups, Projects, Campaigns, etc.
- Each can have custom storage locations
- No risk of breaking existing functionality

### 4. **Separation of Concerns**
- Profile strategies don't need to know about entities
- Entity strategies specify their own storage
- Service layer handles routing cleanly

### 5. **Maintainability**
- Each strategy is self-contained
- Storage logic is encapsulated in strategies
- Easy to test each path independently

---

## Testing Strategy

### Unit Tests

```typescript
describe('CaaSService', () => {
  describe('Profile Path', () => {
    it('should calculate tutor CaaS score', async () => {
      const score = await CaaSService.calculateProfileCaaS(tutorId, supabase);
      expect(score.total).toBeLessThanOrEqual(100);
    });
  });

  describe('Entity Path', () => {
    it('should calculate organisation CaaS score', async () => {
      const score = await CaaSService.calculateOrganisationCaaS(orgId, supabase);
      expect(score.total).toBeLessThanOrEqual(100);
    });

    it('should save score to correct table', async () => {
      await CaaSService.calculateOrganisationCaaS(orgId, supabase);
      const { data } = await supabase
        .from('connection_groups')
        .select('caas_score')
        .eq('id', orgId)
        .single();
      expect(data.caas_score).toBeGreaterThan(0);
    });
  });

  describe('Legacy Compatibility', () => {
    it('should work with old calculate_caas method', async () => {
      const score = await CaaSService.calculate_caas(userId, supabase);
      expect(score).toBeDefined();
    });
  });
});
```

---

## References

- **Implementation PR:** [Link to PR]
- **Design Document:** `/docs/design/agent-caas-subscription-incentive-model.md`
- **Consistency Analysis:** `/docs/implementation/caas-consistency-analysis.md`
- **Migration Files:** `tools/database/migrations/155-161_*.sql`

---

**Last Updated:** 2026-01-07
**Author:** Claude Code
**Status:** Implemented and Documented
