# Help Centre Phase 3: Snapshot Modal - Testing Results

**Date:** 2025-12-21
**Phase:** Phase 3 - Context-driven bug reporting
**Status:** ✅ Infrastructure Setup Complete

## Summary

The Snapshot Modal feature has been successfully deployed with all database and storage infrastructure in place. The system is ready for end-to-end testing.

## ✅ Completed Setup

### 1. Database Migration

**Status:** ✅ Successfully executed

**Migration File:** `tools/database/migrations/094_create_help_support_snapshots.sql`

**Verification:**
```sql
psql "$POSTGRES_URL_NON_POOLING" -c "\d help_support_snapshots"
```

**Results:**
- ✅ Table created: `help_support_snapshots`
- ✅ All 21 columns present
- ✅ 6 indexes created
- ✅ 3 check constraints applied
- ✅ Foreign key to `profiles` table
- ✅ 3 RLS policies active
- ✅ Trigger for `updated_at` timestamp

**Schema Verification:**
```
                         Table "public.help_support_snapshots"
      Column      |           Type           | Collation | Nullable |      Default
------------------+--------------------------+-----------+----------+-------------------
 id               | uuid                     |           | not null | gen_random_uuid()
 user_id          | uuid                     |           | not null |
 action           | text                     |           | not null |
 issue            | text                     |           | not null |
 impact           | text                     |           | not null |
 capture_level    | text                     |           | not null |
 page_url         | text                     |           | not null |
 page_title       | text                     |           | not null |
 user_role        | text                     |           |          |
 screenshot_url   | text                     |           |          |
 network_logs     | jsonb                    |           |          |
 console_logs     | jsonb                    |           |          |
 user_agent       | text                     |           |          |
 viewport_size    | text                     |           |          |
 jira_ticket_key  | text                     |           |          |
 jira_ticket_url  | text                     |           |          |
 jira_sync_status | text                     |           |          | 'pending'::text
 jira_synced_at   | timestamp with time zone |           |          |
 jira_error       | text                     |           |          |
 created_at       | timestamp with time zone |           |          | now()
 updated_at       | timestamp with time zone |           |          | now()
```

**RLS Policies:**
1. `Users can view own snapshots` - SELECT using `auth.uid() = user_id`
2. `Users can create snapshots` - INSERT with check `auth.uid() = user_id`
3. `System can update jira sync status` - UPDATE using `true` (service role)

### 2. Storage Bucket

**Status:** ✅ Successfully created

**Bucket Name:** `support-snapshots`

**Configuration:**
```json
{
  "id": "support-snapshots",
  "name": "support-snapshots",
  "owner": "",
  "public": false,
  "type": "STANDARD",
  "file_size_limit": 10485760,
  "allowed_mime_types": ["image/png", "image/jpeg"],
  "created_at": "2025-12-21T03:23:50.264Z",
  "updated_at": "2025-12-21T03:23:50.264Z"
}
```

**Verification:**
```bash
curl -X GET "https://lvsmtgmpoysjygdwcrir.supabase.co/storage/v1/bucket" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | jq '.[] | select(.name == "support-snapshots")'
```

### 3. API Endpoint

**Status:** ✅ Implemented

**Endpoint:** `POST /api/help-centre/support/snapshot`

**Location:** `apps/web/src/app/api/help-centre/support/snapshot/route.ts`

**Features:**
- ✅ User authentication required
- ✅ Screenshot upload to Supabase storage
- ✅ Database record creation
- ✅ User context capture (role, page, user agent)
- ✅ Error handling with proper status codes
- ✅ Base64 image processing

### 4. Jira Integration

**Status:** ✅ Implemented (awaiting activation)

**Location:** `apps/web/src/lib/integrations/jira-snapshot-sync.ts`

**Features:**
- ✅ Automatic ticket creation from snapshots
- ✅ Impact to priority mapping (blocking → Highest, degraded → High, minor → Medium)
- ✅ Atlassian Document Format (ADF) descriptions
- ✅ Labels and metadata
- ✅ Database sync tracking
- ✅ Background job support via `syncPendingSnapshotsToJira()`

**Jira Credentials (from .env.local):**
```
JIRA_BASE_URL=https://tutorwise.atlassian.net
JIRA_EMAIL=tutorwiseapp@gmail.com
JIRA_PROJECT_KEY=TUTOR
```

### 5. Frontend Integration

**Status:** ✅ Connected to real API

**Components:**
- ✅ `SnapshotModal.tsx` - Updated to use `/api/help-centre/support/snapshot`
- ✅ `QuickActionsWidget.tsx` - "Report a Problem" button integration
- ✅ Screenshot capture via `html2canvas`
- ✅ Progressive capture levels (minimal/standard/diagnostic)
- ✅ Form validation
- ✅ Success/error feedback

## 🧪 Manual Testing Guide

### Prerequisites

1. ✅ Dev server running on `http://localhost:3001`
2. ✅ User must be authenticated
3. ✅ Browser with screenshot capture support

### Testing Steps

1. **Navigate to Help Centre**
   - URL: `http://localhost:3001/help-centre`
   - Ensure you are logged in

2. **Open Snapshot Modal**
   - Scroll to "Still Stuck?" section
   - Click "Report a Problem" button
   - Modal should appear

3. **Fill Out Form**
   - **Action:** "Submit a booking"
   - **Issue:** "Button does not respond when clicked"
   - **Impact:** Select "I can't continue" (blocking)
   - **Include Screenshot:** ✓ Checked
   - **Include Network logs:** ☐ Unchecked (optional)

4. **Capture Screenshot**
   - Click "Capture Screenshot" button
   - Wait for screenshot to render
   - Preview should appear

5. **Submit Report**
   - Click "Send Report"
   - Wait for success message
   - Modal should close

### Expected Results

✅ **UI Feedback:**
- Success alert: "Bug report submitted successfully! Our team will review it shortly."
- Modal closes automatically
- Form resets

✅ **Database Record:**
```sql
SELECT
  id,
  action,
  issue,
  impact,
  capture_level,
  screenshot_url IS NOT NULL as has_screenshot,
  jira_sync_status,
  created_at
FROM help_support_snapshots
ORDER BY created_at DESC
LIMIT 5;
```

Expected output:
- New record with `action = "Submit a booking"`
- `issue = "Button does not respond when clicked"`
- `impact = "blocking"`
- `capture_level = "standard"` (screenshot included)
- `has_screenshot = true`
- `jira_sync_status = "pending"`

✅ **Storage Upload:**
- Screenshot uploaded to `support-snapshots` bucket
- Path: `{user_id}/{timestamp}.png`
- File size < 10MB
- Content type: `image/png`

### Verification Commands

**1. Check Database Records:**
```bash
psql "$POSTGRES_URL_NON_POOLING" -c "
SELECT
  id,
  action,
  issue,
  impact,
  capture_level,
  screenshot_url IS NOT NULL as has_screenshot,
  jira_sync_status,
  created_at
FROM help_support_snapshots
ORDER BY created_at DESC
LIMIT 5;"
```

**2. Check Storage Files:**
```bash
curl -X GET "https://lvsmtgmpoysjygdwcrir.supabase.co/storage/v1/object/list/support-snapshots" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | jq
```

**3. View Full Snapshot Details:**
```bash
psql "$POSTGRES_URL_NON_POOLING" -c "
SELECT * FROM help_support_snapshots
ORDER BY created_at DESC
LIMIT 1;"
```

## 📋 Future Testing Tasks

### Phase 3A: Jira Ticket Creation (Pending)

**To activate automatic Jira integration:**

1. Uncomment line 147 in `apps/web/src/app/api/help-centre/support/snapshot/route.ts`:
   ```typescript
   // TODO: Trigger Jira ticket creation via background job
   // await createJiraTicketFromSnapshot(snapshot);
   ```

2. Test Jira integration:
   ```typescript
   import { createJiraTicketFromSnapshot } from '@/lib/integrations/jira-snapshot-sync';

   // After snapshot creation:
   await createJiraTicketFromSnapshot(snapshot);
   ```

3. Verify ticket creation:
   - Check `jira_ticket_key` and `jira_ticket_url` in database
   - Visit Jira: `https://tutorwise.atlassian.net/browse/TUTOR-XXX`
   - Verify priority, labels, and description

### Phase 3B: Background Sync Job (Future)

**Setup cron job or Edge Function:**

```typescript
// Supabase Edge Function or Vercel Cron
import { syncPendingSnapshotsToJira } from '@/lib/integrations/jira-snapshot-sync';

// Run every 5 minutes
await syncPendingSnapshotsToJira();
```

**Verify:**
- Pending snapshots are processed
- `jira_sync_status` changes from `pending` → `synced`
- Failed syncs marked with `jira_error`

### Phase 3C: Network Logs Capture (Future)

**Implement client-side network capture:**

1. Update `SnapshotModal.tsx` to capture network logs via Performance API
2. Update API endpoint to process network logs
3. Include in Jira ticket description

## 🎯 Success Criteria

- [x] Database migration executed
- [x] Storage bucket created
- [x] API endpoint implemented
- [x] Frontend connected to API
- [x] Jira integration code ready
- [ ] End-to-end manual test completed
- [ ] Jira ticket creation verified
- [ ] Background sync job configured

## 🔧 Troubleshooting

### Issue: Screenshot fails to capture

**Symptoms:** Error message "Failed to capture screenshot"

**Solution:**
1. Check browser console for errors
2. Verify `html2canvas` loaded correctly
3. Check for CORS issues with images
4. Reduce screenshot scale in `SnapshotModal.tsx:119`

### Issue: API returns 401 Unauthorized

**Symptoms:** Modal shows "Unauthorized" error

**Solution:**
1. Verify user is logged in
2. Check Supabase session is active
3. Verify `auth.uid()` matches in RLS policies

### Issue: Screenshot upload fails

**Symptoms:** Snapshot created but `screenshot_url` is null

**Solution:**
1. Check storage bucket exists
2. Verify storage permissions
3. Check image size < 10MB
4. Verify MIME type is `image/png` or `image/jpeg`

### Issue: Jira ticket not created

**Symptoms:** `jira_sync_status` remains "pending"

**Solution:**
1. Verify Jira credentials in `.env.local`
2. Check Jira API token has not expired
3. Verify project key `TUTOR` exists
4. Check `jira_error` column for error message
5. Test Jira API manually:
   ```bash
   curl -X GET "https://tutorwise.atlassian.net/rest/api/3/project/TUTOR" \
     -u "tutorwiseapp@gmail.com:$JIRA_API_TOKEN"
   ```

## 📊 Monitoring

### Key Metrics to Track

1. **Snapshot Submission Rate**
   ```sql
   SELECT
     DATE(created_at) as date,
     COUNT(*) as submissions,
     COUNT(DISTINCT user_id) as unique_users
   FROM help_support_snapshots
   GROUP BY DATE(created_at)
   ORDER BY date DESC;
   ```

2. **Impact Distribution**
   ```sql
   SELECT
     impact,
     COUNT(*) as count,
     ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
   FROM help_support_snapshots
   GROUP BY impact;
   ```

3. **Jira Sync Success Rate**
   ```sql
   SELECT
     jira_sync_status,
     COUNT(*) as count,
     ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
   FROM help_support_snapshots
   GROUP BY jira_sync_status;
   ```

4. **Screenshot Capture Rate**
   ```sql
   SELECT
     capture_level,
     COUNT(*) as count,
     COUNT(CASE WHEN screenshot_url IS NOT NULL THEN 1 END) as with_screenshot,
     ROUND(COUNT(CASE WHEN screenshot_url IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) as screenshot_percentage
   FROM help_support_snapshots
   GROUP BY capture_level;
   ```

## 📝 Next Steps

1. **Manual Testing** - Complete end-to-end test following the guide above
2. **Jira Activation** - Enable automatic Jira ticket creation
3. **Background Job** - Set up cron job for pending snapshots
4. **Monitoring** - Track submission metrics and success rates
5. **User Feedback** - Gather feedback on the reporting experience
6. **Iteration** - Refine based on usage patterns

---

**Testing Checklist:**
- [ ] Submit test snapshot with screenshot
- [ ] Verify database record created
- [ ] Verify screenshot uploaded to storage
- [ ] Activate Jira integration
- [ ] Verify Jira ticket created
- [ ] Test with different impact levels
- [ ] Test with/without screenshot
- [ ] Test with network logs enabled
- [ ] Verify RLS policies working
- [ ] Monitor for errors in production

**Status:** Infrastructure complete, ready for manual testing and Jira activation.
