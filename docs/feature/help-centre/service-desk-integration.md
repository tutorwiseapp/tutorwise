# Help Centre - Jira Service Desk Integration

**Date:** 2025-12-21
**Phase:** Phase 3 - Service Desk Integration (Option C - Hybrid Approach)
**Status:** ✅ Implemented and Tested

## Overview

The Help Centre "Report a Problem" feature now creates **Jira Service Desk requests** instead of regular Jira issues. This provides the best of both worlds:

- ✅ **Seamless UX** - Users stay in TutorWise app
- ✅ **Screenshot capture** - Automatic technical context
- ✅ **Service Desk features** - SLA tracking, request types, proper support workflow
- ✅ **User tracking** - Users can optionally view their ticket status in Jira portal

## Configuration

### Environment Variables

```bash
# Jira Base Configuration
JIRA_BASE_URL=https://tutorwise.atlassian.net
JIRA_EMAIL=tutorwiseapp@gmail.com
JIRA_API_TOKEN=your_token_here

# Project Keys
JIRA_PROJECT_KEY=TUTOR                    # Dev team project
JIRA_SUPPORT_PROJECT_KEY=SUPPORT          # Service Desk project

# Service Desk Configuration
JIRA_SERVICE_DESK_ID=1                    # Service Desk ID
JIRA_REQUEST_TYPE_ID=2                    # "Ask a question" request type
```

### Service Desk Details

**Service Desk:** Support (ID: 1)
- **Project Key:** SUPPORT
- **Portal URL:** https://tutorwise.atlassian.net/servicedesk/customer/portal/1
- **Request Type:** "Ask a question" (ID: 2)

**Available Request Types:**
1. Submit a request or incident (ID: 1)
2. **Ask a question (ID: 2)** ← Currently using this
3. Emailed request (ID: 3)

## How It Works

### User Flow

1. User clicks "Report a Problem" in Help Centre
2. Fills out form in TutorWise app:
   - What were you trying to do?
   - What went wrong?
   - Impact level (blocking/degraded/minor)
   - Optional screenshot capture
3. Submits report
4. **Immediately creates Service Desk request** in SUPPORT project
5. User gets success message with optional ticket link

### Technical Flow

```
User submits form
    ↓
POST /api/help-centre/support/snapshot
    ↓
1. Save to database (help_support_snapshots)
2. Upload screenshot to Supabase storage
3. Call createServiceDeskRequestFromSnapshot()
    ↓
Create Service Desk Request via API
    ↓
POST /rest/servicedeskapi/request
    ↓
✅ Service Desk request created: SUPPORT-XXX
    ↓
Update database with ticket key and URL
    ↓
Return success to user
```

### Service Desk Request Format

**Summary:**
```
[Help Centre] {action}
```
Example: `[Help Centre] Submit a booking`

**Description (Markdown):**
```markdown
**User Report**

**Action:** Submit a booking
**Issue:** Payment button does not respond when clicked
**Impact:** blocking

---

**Context**

**Page:** [Confirm Booking](https://tutorwise.io/bookings/confirm)
**User Role:** student
**Capture Level:** standard
**Screenshot:** [View Screenshot](url)

---

*Snapshot ID: `uuid`*
```

**Labels:** None (Service Desk requests don't use labels the same way)

**Status:** "To Do" (default Service Desk status)

## API Integration

### Location
[apps/web/src/lib/integrations/jira-service-desk-sync.ts](apps/web/src/lib/integrations/jira-service-desk-sync.ts)

### Main Function

```typescript
export async function createServiceDeskRequestFromSnapshot(
  snapshot: SnapshotData
): Promise<{ issueKey: string; issueUrl: string }>
```

**Parameters:**
- `snapshot`: Database record from `help_support_snapshots` table

**Returns:**
- `issueKey`: Ticket key (e.g., "SUPPORT-1")
- `issueUrl`: Portal URL for viewing ticket

**Error Handling:**
- On success: Updates database with `jira_sync_status = 'synced'`
- On failure: Updates database with `jira_sync_status = 'failed'` and error message
- API endpoint returns success even if Jira sync fails (ticket saved for background retry)

### API Endpoint

[apps/web/src/app/api/help-centre/support/snapshot/route.ts](apps/web/src/app/api/help-centre/support/snapshot/route.ts)

```typescript
POST /api/help-centre/support/snapshot

// Request body
{
  action: string;
  issue: string;
  impact: 'blocking' | 'degraded' | 'minor';
  captureLevel: 'minimal' | 'standard' | 'diagnostic';
  includeScreenshot: boolean;
  includeNetwork: boolean;
  screenshot?: string; // Base64 data URL
  pageContext: {
    url: string;
    title: string;
    userRole?: string;
  };
}

// Response (success with Jira sync)
{
  success: true;
  snapshot_id: string;
  jira_ticket_key: string;      // "SUPPORT-1"
  jira_ticket_url: string;       // Portal URL
  message: string;
}

// Response (success but Jira sync failed)
{
  success: true;
  snapshot_id: string;
  message: string;
  warning: "Ticket creation will be retried in background";
}
```

## Differences from Regular Jira Issues

### Service Desk Requests (Current Implementation)

**API Endpoint:**
```
POST /rest/servicedeskapi/request
```

**Payload:**
```json
{
  "serviceDeskId": "1",
  "requestTypeId": "2",
  "requestFieldValues": {
    "summary": "Issue summary",
    "description": "Description text (Markdown supported)"
  }
}
```

**Created Ticket:**
- Type: Service Desk Request
- Appears in: Service Desk portal and agent view
- URL: `https://tutorwise.atlassian.net/servicedesk/customer/portal/1/SUPPORT-1`
- Agent URL: `https://tutorwise.atlassian.net/browse/SUPPORT-1`
- Features: SLA tracking, request lifecycle, customer portal access

### Regular Jira Issues (Old jira-snapshot-sync.ts)

**API Endpoint:**
```
POST /rest/api/3/issue
```

**Payload:**
```json
{
  "fields": {
    "project": { "key": "SUPPORT" },
    "summary": "Issue summary",
    "description": { ... ADF format ... },
    "issuetype": { "name": "Bug" },
    "priority": { "name": "Highest" },
    "labels": ["help-centre-bug-report"]
  }
}
```

**Created Ticket:**
- Type: Bug
- Appears in: Regular Jira project board
- URL: `https://tutorwise.atlassian.net/browse/SUPPORT-1`
- Features: Sprint planning, story points, regular Jira workflow

## Testing

### 1. Test Service Desk Integration

```bash
npx tsx tools/database/test-service-desk-create.ts
```

**Expected Result:**
- ✅ Service Desk request created
- ✅ Ticket key: `SUPPORT-XXX`
- ✅ Can view at portal URL

### 2. Test Full Flow (Manual)

1. Start dev server: `npm run dev`
2. Navigate to: http://localhost:3001/help-centre
3. Click "Report a Problem"
4. Fill out form:
   - Action: "Test booking submission"
   - Issue: "Testing Service Desk integration"
   - Impact: "Minor issue"
   - Include screenshot: ✓
5. Capture screenshot
6. Submit

**Expected Database Record:**
```sql
SELECT
  id,
  action,
  issue,
  jira_ticket_key,
  jira_ticket_url,
  jira_sync_status,
  screenshot_url IS NOT NULL as has_screenshot
FROM help_support_snapshots
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Jira Ticket:**
- Visit: https://tutorwise.atlassian.net/servicedesk/customer/portal/1
- Should see new request with all context

### 3. Verify Database Sync

```sql
-- Check sync status
SELECT
  jira_sync_status,
  COUNT(*) as count
FROM help_support_snapshots
GROUP BY jira_sync_status;

-- View recent tickets
SELECT
  jira_ticket_key,
  action,
  impact,
  jira_ticket_url,
  created_at
FROM help_support_snapshots
WHERE jira_sync_status = 'synced'
ORDER BY created_at DESC
LIMIT 10;
```

## Background Sync Job (Future)

For high-volume scenarios, you can process tickets in the background:

### Option 1: Supabase Edge Function

```typescript
// supabase/functions/sync-service-desk/index.ts
import { syncPendingSnapshotsToServiceDesk } from '@/lib/integrations/jira-service-desk-sync';

Deno.serve(async (req) => {
  await syncPendingSnapshotsToServiceDesk();
  return new Response('Sync complete', { status: 200 });
});
```

### Option 2: Vercel Cron

```typescript
// app/api/cron/sync-service-desk/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { syncPendingSnapshotsToServiceDesk } from '@/lib/integrations/jira-service-desk-sync';

export async function GET(request: NextRequest) {
  // Verify cron secret
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await syncPendingSnapshotsToServiceDesk();
  return NextResponse.json({ success: true });
}
```

**vercel.json:**
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-service-desk",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

## Monitoring

### Success Rate

```sql
SELECT
  jira_sync_status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM help_support_snapshots
GROUP BY jira_sync_status;
```

### Failed Syncs

```sql
SELECT
  id,
  action,
  issue,
  jira_error,
  created_at
FROM help_support_snapshots
WHERE jira_sync_status = 'failed'
ORDER BY created_at DESC;
```

### Recent Service Desk Tickets

```sql
SELECT
  jira_ticket_key,
  action,
  impact,
  jira_ticket_url,
  created_at
FROM help_support_snapshots
WHERE jira_ticket_key LIKE 'SUPPORT-%'
ORDER BY created_at DESC
LIMIT 20;
```

## Troubleshooting

### Issue: Service Desk request creation fails

**Symptoms:** `jira_sync_status = 'failed'`

**Check:**
1. Verify credentials in .env.local
2. Check Service Desk ID and Request Type ID
3. Test API access:
   ```bash
   npx tsx tools/database/test-service-desk-api.ts
   ```

**Common Errors:**
- `400 Bad Request` - Invalid field values or missing required fields
- `401 Unauthorized` - Invalid API token
- `403 Forbidden` - API token lacks permissions
- `404 Not Found` - Invalid Service Desk ID or Request Type ID

### Issue: Description formatting looks wrong

**Solution:**
The Service Desk API supports Markdown in the description field. If formatting issues occur:
1. Check Markdown syntax
2. Avoid complex formatting
3. Use simple bold (**text**) and links ([text](url))

### Issue: Screenshot not appearing in ticket

**Check:**
1. Screenshot uploaded to Supabase storage
2. `screenshot_url` is public or has proper access
3. URL is valid in Jira description

## Benefits Over Regular Jira Issues

### For Users
1. ✅ **Stay in app** - Never leave TutorWise
2. ✅ **Simple form** - Fewer fields than Jira portal
3. ✅ **Track status** - Can view ticket in Service Desk portal (optional)
4. ✅ **Faster** - No Jira account needed

### For Support Team
1. ✅ **SLA tracking** - Automatic time-to-resolution metrics
2. ✅ **Request lifecycle** - To Do → In Progress → Done
3. ✅ **Customer portal** - Professional support interface
4. ✅ **Automation rules** - Service Desk workflows
5. ✅ **Knowledge base** - Link to help articles

### For Dev Team
1. ✅ **Separation** - Support handles Service Desk, dev handles TUTOR project
2. ✅ **Context** - Screenshots and page URLs automatically included
3. ✅ **Priority routing** - Can route blocking issues to TUTOR if needed
4. ✅ **Metrics** - Track user-reported issues separately

## Next Steps

1. **Enable automatic sync** ✅ Already enabled (runs synchronously)
2. **Monitor success rate** - Track `jira_sync_status` distribution
3. **Add user ticket tracking** - Show user their ticket status in app
4. **Customize request type** - Create "Bug Report" request type if needed
5. **Add attachments** - Upload screenshots as Jira attachments (not just URLs)
6. **Set up SLA** - Configure time-to-first-response in Service Desk

## Summary

✅ **Service Desk integration complete**
✅ **Tested and working** (SUPPORT-1 created successfully)
✅ **API endpoint updated** to use Service Desk API
✅ **Database tracking** with sync status
✅ **Error handling** with graceful fallback
✅ **Documentation** complete

**Current Status:**
- Reports create Service Desk requests in SUPPORT project
- Tickets appear in: https://tutorwise.atlassian.net/servicedesk/customer/portal/1
- Support team can manage via Service Desk interface
- Users get professional support experience without leaving TutorWise

---

**Test ticket created:** SUPPORT-1
**Portal URL:** https://tutorwise.atlassian.net/servicedesk/customer/portal/1/SUPPORT-1
**⚠️ Remember to close the test ticket!**
