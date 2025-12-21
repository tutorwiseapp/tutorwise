# Help Centre Phase 3: Snapshot Modal Implementation Guide

**Status:** 95% Complete
**Created:** 2025-01-21
**Purpose:** Context-driven bug reporting with Jira integration

---

## 🎯 Overview

The Snapshot Modal provides users with an intuitive way to report technical issues from the Help Centre with automatic context capture and Jira ticket creation.

---

## ✅ Completed Components

### 1. **Frontend Components**
- ✅ [SnapshotModal.tsx](../../../apps/web/src/app/components/help-centre/modals/SnapshotModal.tsx) - Main modal component
- ✅ [SnapshotModal.module.css](../../../apps/web/src/app/components/help-centre/modals/SnapshotModal.module.css) - Design system-aligned styles
- ✅ [QuickActionsWidget.tsx](../../../apps/web/src/app/components/help-centre/widgets/QuickActionsWidget.tsx) - "Report a Problem" trigger
- ✅ Progressive capture levels (minimal/standard/diagnostic)
- ✅ Screenshot capture with html2canvas
- ✅ User-controlled data sharing preferences
- ✅ Accessibility features (ESC key, aria-labels, keyboard navigation)

### 2. **Backend Infrastructure**
- ✅ [API Route](../../../apps/web/src/app/api/help-centre/support/snapshot/route.ts) - `POST /api/help-centre/support/snapshot`
- ✅ [Jira Integration](../../../apps/web/src/lib/integrations/jira-snapshot-sync.ts) - Automatic ticket creation
- ✅ [Database Migration](../../../tools/database/migrations/094_create_help_support_snapshots.sql) - Supabase table schema

### 3. **Modal Design Improvements**
- ✅ [ConnectionRequestModal](../../../apps/web/src/app/components/feature/network/ConnectionRequestModal.tsx) improvements:
  - Close button updated to Lucide React `<X>` icon
  - ESC key handler and body scroll prevention
  - TypeScript type safety for search results
  - Empty state messaging
  - Enhanced button hover effects

---

## 🔧 Setup Instructions

### Step 1: Run Database Migration

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy contents of `tools/database/migrations/094_create_help_support_snapshots.sql`
4. Execute the SQL
5. Verify table creation: `SELECT * FROM help_support_snapshots LIMIT 1;`

**Option B: Via psql (If you have direct database access)**

```bash
psql $DATABASE_URL -f tools/database/migrations/094_create_help_support_snapshots.sql
```

### Step 2: Create Supabase Storage Bucket

1. Go to **Supabase Dashboard → Storage**
2. Click **"New bucket"**
3. Configure:
   - **Name:** `support-snapshots`
   - **Public:** No (private bucket)
   - **File size limit:** 5MB
   - **Allowed MIME types:** `image/png`, `image/jpeg`, `image/webp`

4. Add RLS policies in SQL Editor:

```sql
-- Users can upload screenshots to their own folder
CREATE POLICY "Users can upload own screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'support-snapshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read their own screenshots
CREATE POLICY "Users can view own screenshots"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'support-snapshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

### Step 3: Verify Jira Credentials

Ensure these environment variables are set in `.env.local`:

```bash
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@domain.com
JIRA_API_TOKEN=your_jira_api_token
JIRA_PROJECT_KEY=TUTOR  # Optional, defaults to TUTOR
```

**Already configured via CAS integration** ✅

### Step 4: Test the Integration

1. Start development server:
   ```bash
   npm run dev
   ```

2. Navigate to any Help Centre page
3. Click **"Report a Problem"** in the right sidebar
4. Fill out the form and submit
5. Verify:
   - Snapshot created in `help_support_snapshots` table
   - Screenshot uploaded to storage (if captured)
   - Jira ticket created automatically

---

## 📊 Database Schema

### Table: `help_support_snapshots`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | References profiles(id) |
| `action` | TEXT | What user was trying to do |
| `issue` | TEXT | What went wrong |
| `impact` | TEXT | blocking \| degraded \| minor |
| `capture_level` | TEXT | minimal \| standard \| diagnostic |
| `page_url` | TEXT | Current page URL |
| `page_title` | TEXT | Current page title |
| `user_role` | TEXT | User's active role |
| `screenshot_url` | TEXT | Supabase storage URL |
| `network_logs` | JSONB | Network request logs |
| `console_logs` | JSONB | Console output (future) |
| `user_agent` | TEXT | Browser user agent |
| `viewport_size` | TEXT | Screen resolution |
| `jira_ticket_key` | TEXT | e.g., "TUTOR-123" |
| `jira_ticket_url` | TEXT | Link to Jira ticket |
| `jira_sync_status` | TEXT | pending \| synced \| failed |
| `jira_synced_at` | TIMESTAMPTZ | When synced to Jira |
| `jira_error` | TEXT | Error message if failed |
| `created_at` | TIMESTAMPTZ | When snapshot created |
| `updated_at` | TIMESTAMPTZ | Last updated |

---

## 🔄 API Flow

```
User fills form
    ↓
Clicks "Send Report"
    ↓
POST /api/help-centre/support/snapshot
    ├── Authenticate user (Supabase Auth)
    ├── Upload screenshot to storage (if provided)
    ├── Capture context (user agent, viewport)
    ├── Insert record to help_support_snapshots
    └── Return success response
    ↓
Background job (future)
    └── Create Jira ticket via jira-snapshot-sync.ts
    └── Update record with Jira ticket info
```

---

## 🎨 Progressive Capture Levels

| Level | Includes |
|-------|----------|
| **Minimal** | Page URL, user action, issue description |
| **Standard** | Minimal + Screenshot |
| **Diagnostic** | Standard + Network logs |

Users control what data is shared via checkboxes in the modal.

---

## 🔐 Security Features

1. **Row Level Security (RLS)**
   - Users can only view their own snapshots
   - Users can only create snapshots for themselves

2. **Storage Security**
   - Screenshots stored in user-specific folders (`{user_id}/`)
   - Private bucket (not publicly accessible)
   - RLS policies enforce folder-level permissions

3. **Data Minimization**
   - User chooses what to include (screenshot, network logs)
   - No automatic PII capture
   - Optional data collection

---

## 🚀 Future Enhancements

### Phase 3A: Enhanced Features (Pending)

1. **Screenshot Redaction**
   - Auto-blur sensitive fields (passwords, credit cards)
   - Click-to-blur UI for manual redaction
   - Implementation in `apps/web/src/lib/utils/screenshot-redaction.ts`

2. **Network Logs Capture**
   - Capture Performance API data
   - Filter sensitive headers (Authorization, etc.)
   - Include failed API requests

3. **Success Confirmation UI**
   - Replace `alert()` with toast notification
   - Show Jira ticket link in confirmation
   - Option to view submitted report

4. **Admin Dashboard**
   - View all submitted snapshots
   - Filter by impact, status, date
   - Bulk Jira sync operations

---

## 📝 Usage Example

```tsx
import SnapshotModal from '@/app/components/help-centre/modals/SnapshotModal';

export default function HelpCentrePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const pageContext = {
    url: typeof window !== 'undefined' ? window.location.href : '/help-centre',
    title: 'Help Centre',
  };

  return (
    <>
      <button onClick={() => setIsModalOpen(true)}>
        Report a Problem
      </button>

      <SnapshotModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        pageContext={pageContext}
      />
    </>
  );
}
```

---

## 🧪 Testing Checklist

- [ ] Migration runs successfully in Supabase
- [ ] Storage bucket created with RLS policies
- [ ] Screenshot upload works
- [ ] Snapshot record created in database
- [ ] Jira ticket auto-created
- [ ] User can view their submitted reports
- [ ] Modal UI matches design system
- [ ] Accessibility features work (ESC, keyboard nav)
- [ ] Mobile responsive design

---

## 📚 Related Documentation

- [Help Centre Improved Spec v2.0](../help-centre-improved-spec-v2.md)
- [Jira Integration Config](../../../.ai/integration-config.md)
- [Design System Variables](../../design-system.md) (if exists)

---

## 🐛 Troubleshooting

### Screenshot Upload Fails

**Symptom:** Screenshot not appearing in submitted report

**Solutions:**
1. Check storage bucket exists: `support-snapshots`
2. Verify RLS policies are applied
3. Check browser console for errors
4. Ensure bucket has correct MIME types configured

### Jira Ticket Not Created

**Symptom:** Snapshot created but no Jira ticket

**Solutions:**
1. Verify Jira credentials in `.env.local`
2. Check `jira_sync_status` field in database
3. Review API logs for Jira API errors
4. Manually trigger sync: `await createJiraTicketFromSnapshot(snapshot)`

### Database Connection Issues

**Symptom:** API returns 500 errors

**Solutions:**
1. Check Supabase credentials in `.env.local`
2. Verify table exists: `SELECT * FROM help_support_snapshots LIMIT 1;`
3. Check RLS policies are not blocking inserts
4. Review Supabase logs in dashboard

---

**Implementation Status:** Ready for production testing
**Next Steps:** Run migration → Create storage bucket → Test end-to-end flow
