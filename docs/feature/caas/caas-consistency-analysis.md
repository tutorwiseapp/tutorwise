# CaaS Implementation Consistency Analysis

**Date:** 2026-01-07
**Purpose:** Identify discrepancies across Tutor, Client, Agent, and Organisation CaaS implementations

---

## ✅ Consistencies (Good)

### 1. **Interface Implementation**
All strategies correctly implement `ICaaSStrategy`:
- ✅ TutorCaaSStrategy
- ✅ ClientCaaSStrategy
- ✅ AgentCaaSStrategy
- ✅ OrganisationCaaSStrategy

### 2. **Method Signature (Interface Level)**
All implement: `async calculate(userId: string, supabase: SupabaseClient): Promise<CaaSScoreData>`

### 3. **Return Type**
All return `CaaSScoreData` with:
```typescript
{
  total: number;
  breakdown: Record<string, number | string>;
}
```

### 4. **Safety Gate Pattern**
All have identity/validation gates that return score=0:
- ✅ Tutor: `if (!profile.identity_verified)`
- ✅ Agent: `if (!profile.identity_verified)`
- ⚠️ Client: No identity gate (by design - clients don't need verification)
- ⚠️ Organisation: Minimum 3 members gate (different type of gate)

---

## ⚠️ Discrepancies (Issues Found)

### 1. **Parameter Naming Inconsistency**

**Interface definition** (types.ts:135):
```typescript
calculate(userId: string, supabase: SupabaseClient): Promise<CaaSScoreData>;
```

**Actual implementations**:
| Strategy | Parameter Name | Matches Interface? |
|----------|---------------|-------------------|
| Tutor | `userId` | ✅ YES |
| Client | `userId` | ✅ YES |
| Agent | `profileId` | ❌ NO |
| Organisation | `organisationId` | ❌ NO |

**Impact:** No runtime error (TypeScript structural typing), but confusing for developers.

**Recommendation:**
- Option A: Change Agent to use `userId` (rename `profileId` → `userId`)
- Option B: Update interface to be generic: `calculate(id: string, ...)`
- Option C: Keep as-is (works but inconsistent)

---

### 2. **Safety Gate Message Inconsistency**

**Tutor** (tutor.ts:52):
```typescript
{ total: 0, breakdown: { gate: 'Identity not verified' } }
```

**Agent** (agent.ts:87-91):
```typescript
{
  total: 0,
  breakdown: {
    gate: 'Identity verification required',
    message: 'Complete identity verification to unlock Agent CaaS scoring',
  },
}
```

**Impact:** Agent provides more helpful error message, but inconsistent format.

**Recommendation:** Standardize gate response format across all strategies.

---

### 3. **Organisation Strategy Uses Different ID Type**

**Issue:** Organisation CaaS calculates score for `connection_groups` (not `profiles`), so it takes `organisation_id` instead of `profile_id`.

**Current approach:**
- Organisation has separate method: `CaaSService.calculate_organisation_caas(organisationId)`
- Does NOT go through the standard `CaaSService.calculate_caas(profileId)` router

**Is this correct?** YES - organisations are not profiles, so this separation makes sense.

**Documentation needed:** Make it clear that:
- Profiles (tutor/client/agent) → `CaaSService.calculate_caas(profileId)`
- Organisations → `CaaSService.calculate_organisation_caas(orgId)`

---

### 4. **RPC Function Naming Convention**

**Tutor RPC functions**:
- `get_network_stats(user_id)`
- `get_performance_stats(user_id)`
- `get_digital_stats(user_id)`

**Agent RPC functions**:
- `get_agent_recruitment_stats(agent_id)` ← Includes role prefix
- `get_organisation_business_stats(org_id)` ← Includes role prefix
- `check_org_subscription_active(agent_id)` ← Includes role prefix

**Impact:** Inconsistent naming - older functions use generic names, newer ones use role-prefixed names.

**Recommendation:** Role-prefixed naming is better (prevents conflicts). Consider:
- Renaming old functions: `get_tutor_network_stats`, `get_tutor_performance_stats`
- Or document that generic names are grandfathered in

---

### 5. **Error Handling Consistency**

**Tutor** (tutor.ts:72-92):
Uses `Promise.allSettled` for graceful degradation:
```typescript
const [networkResult, performanceResult, digitalResult] = await Promise.allSettled([
  supabase.rpc('get_network_stats', { user_id: userId }),
  supabase.rpc('get_performance_stats', { user_id: userId }),
  supabase.rpc('get_digital_stats', { user_id: userId }),
]);

// Falls back to default values if RPC fails
const networkStats = networkResult.status === 'fulfilled'
  ? networkResult.value.data
  : defaultNetworkStats;
```

**Agent** (agent.ts:103-139):
Uses direct RPC calls with `.single()` - will throw if fails:
```typescript
const { data: recruitmentStats, error: recruitmentError } = await supabase
  .rpc('get_agent_recruitment_stats', { agent_id: profileId })
  .single<AgentRecruitmentStats>();

if (recruitmentError) {
  console.error('[AgentCaaS] Failed to fetch recruitment stats:', recruitmentError);
  throw recruitmentError; // ← Will propagate error, no graceful degradation
}
```

**Impact:** Tutor is more resilient (scores still calculated if one RPC fails). Agent/Organisation will fail completely if any RPC fails.

**Recommendation:** Implement graceful degradation in Agent/Organisation strategies like Tutor does.

---

### 6. **Score Normalization**

**Tutor** (tutor.ts:30-31):
```typescript
// Note: Total is 110 points. Scores are normalized to /100 scale for consistency.
```
Buckets add up to 110, normalized down to 100.

**Agent** (agent.ts:59-62):
```typescript
// Total: 100 points max
// - Free tier max: 80 points (realistically 60-75 for most solo agents)
// - With organisation: 100 points (requires active feature usage)
```
Buckets add up to exactly 100 (no normalization needed).

**Client** (client.ts:20-23):
```typescript
// 1. Responsiveness (35 max)
// 2. Payment History (35 max)
// 3. Engagement (30 max)
```
Buckets add up to exactly 100 (no normalization needed).

**Organisation** (organisation.ts:13-14):
```typescript
// - Base Score: Weighted team average CaaS score (activity-weighted by sessions in last 90 days)
// - Verification Bonuses: business_verified (+2), safeguarding_certified (+2), ...
```
Base score is average (0-100) + bonuses (max +6), so theoretically could exceed 100.

**Impact:** Inconsistent maximum score handling.

**Recommendation:**
- Document whether scores can exceed 100 or are capped
- Consider capping all scores at 100 in final return

---

## 📊 Summary

### Critical Issues (Fix Required):
1. ❌ **Parameter naming** - Agent/Organisation use different names than interface
2. ❌ **Error handling** - Agent/Organisation lack graceful degradation

### Minor Issues (Best Practice):
3. ⚠️ Safety gate message format inconsistency
4. ⚠️ RPC function naming convention
5. ⚠️ Score normalization approach differs

### By Design (Document):
6. ℹ️ Organisation uses separate calculation method (correct)
7. ℹ️ Client has no identity gate (correct - clients don't need verification)

---

## 🔧 Recommended Fixes

### Priority 1 (High Impact):
1. **Standardize parameter naming** in Agent/Organisation strategies
2. **Add graceful degradation** to Agent/Organisation error handling
3. **Document** the two-path approach (profile vs organisation calculation)

### Priority 2 (Code Quality):
4. **Standardize safety gate** message format
5. **Document** RPC naming convention for future migrations
6. **Clarify** score capping behavior in documentation

### Priority 3 (Future Enhancement):
7. Consider refactoring to unified error handling utility
8. Consider shared validation helpers
9. Add TypeScript strict mode checks for parameter naming

---

## 📝 Files to Update

If fixing inconsistencies:

1. **apps/web/src/lib/services/caas/strategies/agent.ts**
   - Line 69: Rename `profileId` → `userId`
   - Add graceful degradation for RPC calls

2. **apps/web/src/lib/services/caas/strategies/organisation.ts**
   - Line 47: Rename `organisationId` → `orgId` (or keep as-is, but document)
   - Add graceful degradation for RPC calls

3. **apps/web/src/lib/services/caas/strategies/tutor.ts**
   - Standardize safety gate message format

4. **apps/web/src/lib/services/caas/types.ts**
   - Add JSDoc explaining the parameter naming convention
   - Consider adding error handling utility types

---

**Last Updated:** 2026-01-07
**Reviewed By:** Claude Code
**Status:** Analysis complete, fixes recommended
