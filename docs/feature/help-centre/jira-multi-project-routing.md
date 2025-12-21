# Jira Multi-Project Routing for Help Centre Snapshots

**Date:** 2025-12-21
**Feature:** Help Centre Phase 3 - Jira Integration
**Status:** ✅ Configured

## Overview

The Help Centre Snapshot Modal now supports routing bug reports to different Jira projects based on configurable logic. This allows you to separate user-reported issues from internal development work.

## Configuration

### Environment Variables

Add both project keys to your `.env.local`:

```bash
# Main development project (for internal bugs and features)
JIRA_PROJECT_KEY=TUTOR

# Support project (for user-reported issues from Help Centre)
JIRA_SUPPORT_PROJECT_KEY=SUPPORT

# Shared credentials
JIRA_BASE_URL=https://tutorwise.atlassian.net
JIRA_EMAIL=tutorwiseapp@gmail.com
JIRA_API_TOKEN=your_token_here
```

## Default Routing Logic

**Current behavior:**
- All Help Centre snapshots → **SUPPORT** (Support project)
- Tickets created at: `https://tutorwise.atlassian.net/browse/SUPPORT-XXX`

## Customizing Routing Logic

You can customize which project receives tickets by editing the `getJiraProjectKey()` function in:
[apps/web/src/lib/integrations/jira-snapshot-sync.ts](apps/web/src/lib/integrations/jira-snapshot-sync.ts#L57-L66)

### Example 1: Route by Impact Level

Send blocking issues to the main dev team:

```typescript
function getJiraProjectKey(snapshot: SnapshotData): string {
  const {
    JIRA_PROJECT_KEY = 'TUTOR',
    JIRA_SUPPORT_PROJECT_KEY = 'SUPPORT',
  } = process.env;

  // Blocking issues go to dev team for immediate attention
  if (snapshot.impact === 'blocking') {
    return JIRA_PROJECT_KEY; // TUTOR
  }

  // Minor and degraded issues go to support
  return JIRA_SUPPORT_PROJECT_KEY; // SUPPORT
}
```

### Example 2: Route by Page URL

Send admin page issues to dev team:

```typescript
function getJiraProjectKey(snapshot: SnapshotData): string {
  const {
    JIRA_PROJECT_KEY = 'TUTOR',
    JIRA_SUPPORT_PROJECT_KEY = 'SUPPORT',
  } = process.env;

  // Admin pages → dev team
  if (snapshot.page_url.includes('/admin') ||
      snapshot.page_url.includes('/dashboard')) {
    return JIRA_PROJECT_KEY; // TUTOR
  }

  // Public-facing pages → support
  return JIRA_SUPPORT_PROJECT_KEY; // SUPPORT
}
```

### Example 3: Route by User Role

Handle tutor and agent issues differently:

```typescript
function getJiraProjectKey(snapshot: SnapshotData): string {
  const {
    JIRA_PROJECT_KEY = 'TUTOR',
    JIRA_SUPPORT_PROJECT_KEY = 'SUPPORT',
  } = process.env;

  // Tutors and agents → support team
  if (snapshot.user_role === 'tutor' || snapshot.user_role === 'agent') {
    return JIRA_SUPPORT_PROJECT_KEY; // SUPPORT
  }

  // Students and others → dev team (might be product issues)
  return JIRA_PROJECT_KEY; // TUTOR
}
```

### Example 4: Combined Logic

Use multiple criteria:

```typescript
function getJiraProjectKey(snapshot: SnapshotData): string {
  const {
    JIRA_PROJECT_KEY = 'TUTOR',
    JIRA_SUPPORT_PROJECT_KEY = 'SUPPORT',
  } = process.env;

  // Critical blocking issues always go to dev team
  if (snapshot.impact === 'blocking') {
    return JIRA_PROJECT_KEY; // TUTOR
  }

  // Payment/billing issues go to support
  if (snapshot.page_url.includes('/payment') ||
      snapshot.page_url.includes('/billing')) {
    return JIRA_SUPPORT_PROJECT_KEY; // SUPPORT
  }

  // Admin/internal tools go to dev team
  if (snapshot.page_url.includes('/admin')) {
    return JIRA_PROJECT_KEY; // TUTOR
  }

  // Default: support team handles everything else
  return JIRA_SUPPORT_PROJECT_KEY; // SUPPORT
}
```

## Overriding Project Per Call

You can also override the project when calling the function directly:

```typescript
import { createJiraTicketFromSnapshot } from '@/lib/integrations/jira-snapshot-sync';

// Force a specific project
await createJiraTicketFromSnapshot(snapshot, {
  projectKey: 'TUTOR' // Override to use TUTOR instead of SUPPORT
});
```

## Ticket Format

### SUPPORT Project Tickets

Tickets created in the SUPPORT (Support) project:

**URL:** `https://tutorwise.atlassian.net/browse/SUPPORT-123`

**Summary:** `[Help Centre] {action}`
- Example: `[Help Centre] Submit a booking`

**Labels:**
- `help-centre-bug-report`
- `user-submitted`
- `impact-blocking` (or `impact-degraded`, `impact-minor`)
- `capture-standard` (or `capture-minimal`, `capture-diagnostic`)

**Priority:** Based on impact
- `blocking` → Highest
- `degraded` → High
- `minor` → Medium

### TUTOR Project Tickets

Same format but created in the TUTOR project:

**URL:** `https://tutorwise.atlassian.net/browse/TUTOR-456`

## Testing Multi-Project Routing

### Test 1: Verify SUPPORT Project

1. Submit a snapshot from Help Centre
2. Check database:
   ```sql
   SELECT jira_ticket_key, jira_ticket_url
   FROM help_support_snapshots
   ORDER BY created_at DESC
   LIMIT 1;
   ```
3. Verify ticket key starts with `SUPPORT-`
4. Visit URL and confirm it's in SUPPORT project

### Test 2: Verify TUTOR Project (if using custom routing)

1. Change routing logic to return `JIRA_PROJECT_KEY`
2. Submit another snapshot
3. Verify ticket key starts with `TUTOR-`

### Test 3: Verify Impact-Based Routing

If using Example 1 (routing by impact):

1. Submit snapshot with `impact: 'blocking'` → should go to TUTOR
2. Submit snapshot with `impact: 'minor'` → should go to SUPPORT
3. Check `jira_ticket_key` in database to verify

## Monitoring

### View Tickets by Project

**SUPPORT Project:**
```sql
SELECT
  jira_ticket_key,
  action,
  impact,
  created_at
FROM help_support_snapshots
WHERE jira_ticket_key LIKE 'SUPPORT-%'
ORDER BY created_at DESC;
```

**TUTOR Project:**
```sql
SELECT
  jira_ticket_key,
  action,
  impact,
  created_at
FROM help_support_snapshots
WHERE jira_ticket_key LIKE 'TUTOR-%'
ORDER BY created_at DESC;
```

### Project Distribution

```sql
SELECT
  CASE
    WHEN jira_ticket_key LIKE 'SUPPORT-%' THEN 'SUPPORT (Support)'
    WHEN jira_ticket_key LIKE 'TUTOR-%' THEN 'TUTOR (Dev)'
    ELSE 'Unknown'
  END as project,
  COUNT(*) as ticket_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM help_support_snapshots
WHERE jira_ticket_key IS NOT NULL
GROUP BY
  CASE
    WHEN jira_ticket_key LIKE 'SUPPORT-%' THEN 'SUPPORT (Support)'
    WHEN jira_ticket_key LIKE 'TUTOR-%' THEN 'TUTOR (Dev)'
    ELSE 'Unknown'
  END;
```

## Benefits

### 1. Team Separation
- Support team handles user-reported issues (SUPPORT)
- Dev team focuses on internal bugs and features (TUTOR)

### 2. Priority Routing
- Critical blocking issues can bypass support and go straight to dev
- Minor issues handled by support first-line

### 3. Context-Based Routing
- Admin/internal tools → dev team
- User-facing features → support team
- Payment/billing → specialized support

### 4. Flexible Configuration
- No code changes needed to adjust routing
- Easy to test different routing strategies
- Can override on a per-call basis

## Next Steps

1. **Test Current Setup**
   - Submit test snapshot from Help Centre
   - Verify ticket created in SUPPORT project

2. **Customize Routing (Optional)**
   - Edit `getJiraProjectKey()` function
   - Implement routing logic for your team's workflow
   - Test new routing rules

3. **Enable Auto-Sync**
   - Uncomment Jira integration in API endpoint
   - Set up background job for pending snapshots
   - Monitor ticket creation success rate

4. **Team Training**
   - Document which issues go to which project
   - Train support team on SUPPORT ticket triage
   - Set up Jira automation rules if needed

## Troubleshooting

### Issue: Tickets not being created

**Check:**
1. Both `JIRA_PROJECT_KEY` and `JIRA_SUPPORT_PROJECT_KEY` exist in .env.local
2. API token has access to both projects
3. Projects use same issue type (Bug)

**Verify project access:**
```bash
# Test SUPPORT project
curl -X GET "https://tutorwise.atlassian.net/rest/api/3/project/SUPPORT" \
  -u "tutorwiseapp@gmail.com:$JIRA_API_TOKEN"

# Test TUTOR project
curl -X GET "https://tutorwise.atlassian.net/rest/api/3/project/TUTOR" \
  -u "tutorwiseapp@gmail.com:$JIRA_API_TOKEN"
```

### Issue: Wrong project receiving tickets

**Check:**
1. Review `getJiraProjectKey()` logic
2. Check snapshot data matches expected conditions
3. Verify no override in API call

**Debug:**
Add logging to `getJiraProjectKey()`:
```typescript
function getJiraProjectKey(snapshot: SnapshotData): string {
  // ... existing code ...

  console.log('Routing snapshot to project:', projectKey, {
    impact: snapshot.impact,
    pageUrl: snapshot.page_url,
    userRole: snapshot.user_role,
  });

  return projectKey;
}
```

---

**Summary:**
- ✅ Multi-project routing configured
- ✅ Default: All snapshots → SUPPORT project
- ✅ Customizable routing logic available
- ✅ Can override per call if needed
