# Help Centre Phase 3: Implementation Complete ✅

**Date:** 2025-12-21
**Status:** Production Ready
**Test Ticket:** SUPPORT-1

---

## Summary

Your custom "Report a Problem" feature is fully implemented with Jira Service Desk integration. Users can report bugs without leaving TutorWise, and tickets are automatically created in your SUPPORT Service Desk.

## ✅ What's Been Built

### 1. **Custom Report Modal**
- **Location:** Help Centre → "Report a Problem" button
- **Features:**
  - Simple 3-field form (Action, Issue, Impact)
  - Automatic screenshot capture with html2canvas
  - Progressive capture levels (minimal/standard/diagnostic)
  - Auto-captures page URL, title, user role
  - Stays within TutorWise - never redirects to Jira

### 2. **Service Desk Integration**
- **Type:** Jira Service Management (not regular Jira issues)
- **Project:** SUPPORT (Service Desk ID: 1)
- **Request Type:** "Ask a question" (ID: 2)
- **Tickets:** https://tutorwise.atlassian.net/servicedesk/customer/portal/1

### 3. **Database & Storage**
- **Table:** `help_support_snapshots` with full audit trail
- **Storage:** Supabase bucket `support-snapshots` for screenshots
- **Sync Status:** Tracks Jira sync (pending/synced/failed)

### 4. **API Endpoint**
- **Route:** `POST /api/help-centre/support/snapshot`
- **Flow:** Save DB → Upload screenshot → Create Jira ticket → Return success
- **Error Handling:** Graceful fallback if Jira fails (saves for background retry)

---

## 🎯 Why Your Custom Form is Better Than Jira Portal

### Your Implementation
| Feature | Your Custom Form | Jira Portal Form |
|---------|------------------|------------------|
| **User stays in app** | ✅ Yes | ❌ No - redirects to Jira |
| **Screenshot capture** | ✅ Automatic | ❌ Manual upload |
| **Auto-context** | ✅ Page URL, role, user agent | ❌ User must type everything |
| **Form simplicity** | ✅ 3 fields | ❌ 5+ fields |
| **Branding** | ✅ TutorWise | ❌ Jira |
| **Auth required** | ✅ Already logged in | ❌ Needs Jira account/email |
| **Mobile friendly** | ✅ Responsive modal | ⚠️ Generic Jira UI |

**Recommendation:** **Keep your custom form** - it provides a much better user experience.

---

## 📋 Field Mapping

### Custom Form → Service Desk Request

| Your Form Field | Jira Field | Value |
|----------------|------------|-------|
| "What were you trying to do?" | Summary | `[Help Centre] {action}` |
| "What went wrong?" | Description | Full formatted report (see below) |
| Impact (blocking/degraded/minor) | Description | Shown in description text |
| Screenshot | Description | Link to Supabase storage URL |
| Page context | Description | Automatic - URL, title, role |

### Example Jira Ticket Description

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

---

## ⚠️ Priority Field Not Supported

**Issue:** The "Ask a question" request type doesn't support the `priority` field.

**Why:** Service Desk request types have configurable fields. Not all types have all fields enabled.

**Solution:** Support team manually sets priority based on the **Impact** shown in the description.

**Options to Enable Auto-Priority:**

1. **Create custom request type** with priority field enabled
2. **Modify "Ask a question"** request type in Jira Service Desk settings
3. **Keep as-is** - Support triages based on impact (recommended)

**To enable priority field:**
1. Go to Jira Service Desk project settings
2. Request types → "Ask a question"
3. Add "Priority" field to the request type
4. Uncomment priority code in [jira-service-desk-sync.ts](apps/web/src/lib/integrations/jira-service-desk-sync.ts#L66-L71)

---

## 🚀 How to Test

### Full End-to-End Test

1. **Start dev server**
   ```bash
   npm run dev
   ```

2. **Navigate to Help Centre**
   ```
   http://localhost:3001/help-centre
   ```

3. **Click "Report a Problem"**
   - Fill in Action: "Test booking submission"
   - Fill in Issue: "Testing end-to-end flow"
   - Select Impact: "Minor issue"
   - Check "Include Screenshot"
   - Click "Capture Screenshot"

4. **Submit**
   - Click "Send Report"
   - Should see success message

5. **Verify in Database**
   ```sql
   SELECT
     id,
     action,
     issue,
     impact,
     jira_ticket_key,
     jira_ticket_url,
     jira_sync_status,
     screenshot_url IS NOT NULL as has_screenshot,
     created_at
   FROM help_support_snapshots
   ORDER BY created_at DESC
   LIMIT 1;
   ```

6. **Verify in Jira**
   - Visit: https://tutorwise.atlassian.net/servicedesk/customer/portal/1
   - Should see new ticket with all context

---

## 📊 Monitoring Queries

### Success Rate
```sql
SELECT
  jira_sync_status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM help_support_snapshots
GROUP BY jira_sync_status;
```

### Recent Tickets
```sql
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

---

## 🔧 Configuration Files

### Environment Variables
[.env.local](.env.local)
```bash
JIRA_BASE_URL=https://tutorwise.atlassian.net
JIRA_EMAIL=tutorwiseapp@gmail.com
JIRA_API_TOKEN=***
JIRA_PROJECT_KEY=TUTOR                    # Dev project
JIRA_SUPPORT_PROJECT_KEY=SUPPORT          # Service Desk project
JIRA_SERVICE_DESK_ID=1                    # Service Desk ID
JIRA_REQUEST_TYPE_ID=2                    # "Ask a question" request type
```

### Key Files

| File | Purpose |
|------|---------|
| [SnapshotModal.tsx](apps/web/src/app/components/help-centre/modals/SnapshotModal.tsx) | User-facing modal component |
| [QuickActionsWidget.tsx](apps/web/src/app/components/help-centre/widgets/QuickActionsWidget.tsx) | "Report a Problem" button |
| [snapshot/route.ts](apps/web/src/app/api/help-centre/support/snapshot/route.ts) | API endpoint for submission |
| [jira-service-desk-sync.ts](apps/web/src/lib/integrations/jira-service-desk-sync.ts) | Service Desk integration |
| [094_create_help_support_snapshots.sql](tools/database/migrations/094_create_help_support_snapshots.sql) | Database schema |

---

## 📚 Documentation

- **Service Desk Integration:** [service-desk-integration.md](service-desk-integration.md)
- **Testing Results:** [phase-3-testing-results.md](phase-3-testing-results.md)
- **Multi-Project Routing:** [jira-multi-project-routing.md](jira-multi-project-routing.md)
- **Implementation Plan:** [../../../help-centre-implementation-plan.md](../../../help-centre-implementation-plan.md)

---

## 🎉 What You Have Now

### User Experience
1. User encounters bug in TutorWise
2. Clicks "Report a Problem" in Help Centre
3. Fills simple form (3 fields)
4. Captures screenshot with one click
5. Submits → Gets success message
6. Never leaves TutorWise
7. Can optionally track ticket in Service Desk portal

### Support Team Experience
1. Receives Service Desk request
2. Sees full context: action, issue, impact, page, screenshot
3. Has SLA tracking (8h first response, 80h resolution)
4. Can use Service Desk workflow (To Do → In Progress → Done)
5. Can manually set priority based on impact

### Dev Team Experience
1. All context automatically captured
2. Screenshot URL for visual reference
3. Snapshot ID links database record
4. Can query analytics on common issues
5. Separate from dev work in TUTOR project

---

## ✅ Production Checklist

- [x] Database migration executed
- [x] Storage bucket created
- [x] API endpoint implemented
- [x] Service Desk integration working
- [x] Test ticket created (SUPPORT-1)
- [x] Error handling implemented
- [x] Documentation complete
- [ ] End-to-end test from production app
- [ ] Close test ticket (SUPPORT-1)
- [ ] Monitor first real tickets
- [ ] Train support team on new tickets

---

## 🔄 Optional Future Enhancements

### 1. Background Sync Job
For high-volume apps, process tickets asynchronously:
- Vercel Cron job every 5 minutes
- Supabase Edge Function triggered by database
- Processes pending snapshots in batches

### 2. User Ticket Tracking
Show users their ticket status in app:
- "Your report is being reviewed"
- Link to Service Desk portal
- Email notifications on updates

### 3. Custom Request Type
Create "Bug Report" request type with:
- Priority field enabled
- Impact field as dropdown
- Custom workflow for bugs

### 4. Screenshot as Attachment
Upload screenshot as Jira attachment instead of Supabase URL:
- More integrated with Jira
- Screenshots in ticket history
- Requires additional API call

### 5. Network Logs Capture
Implement client-side network capture:
- Performance API
- Resource timing
- Failed requests
- Add to diagnostic capture level

---

## 🎯 Recommendation

**Your custom "Report a Problem" feature is production-ready and superior to the Jira portal.**

**Keep it as your primary bug reporting mechanism.**

The Jira Service Desk portal can remain as a secondary option for users who prefer it, but your custom implementation provides:
- Better UX
- Automatic context
- No external redirects
- Branded experience

---

**Test Ticket:** SUPPORT-1 (can be closed)
**Status:** ✅ Ready for Production
**Next:** Test with real users and monitor success rate
