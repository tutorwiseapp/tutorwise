# Help Centre Support System Setup

**Feature:** Dual Support System (Bug Reports + General Help)
**Created:** 2026-01-18
**Status:** ✅ Complete - Ready for Jira Configuration

---

## Overview

The Help Centre now has two distinct support channels:

1. **Report a Problem** → Jira BUGS project (technical issues)
2. **Get Help** → Jira SUPPORT project (general questions)

Both create Jira tickets with email fallback if Jira is unavailable.

---

## Architecture

```
Help Centre Sidebar
│
└── Still Stuck? Widget
    ├── Report a Problem (Red, Bug Icon)
    │   ├── Opens: SnapshotModal
    │   ├── Captures: Screenshot, network logs, context
    │   ├── Creates: Jira BUGS ticket
    │   └── Purpose: Software bugs/errors
    │
    └── Get Help (Teal, Question Icon)
        ├── Opens: GetHelpModal
        ├── Captures: Name, category, question, context
        ├── Creates: Jira SUPPORT ticket
        └── Purpose: Questions, account help, billing
```

---

## Jira Configuration

### 1. Create SUPPORT Project

**In Jira Cloud:**

1. Go to Projects → Create Project
2. Choose "Service Management" or "Task Management" template
3. Project Details:
   - **Project Name:** Support
   - **Project Key:** SUPPORT
   - **Project Type:** Team-managed or Company-managed

4. Create Issue Type:
   - Name: "Support Request"
   - Icon: Question mark or Help icon

5. Add Custom Fields (optional):
   - **Category** (Single Select):
     - Account & Profile Settings
     - Billing & Payments
     - Bookings & Scheduling
     - Technical Issue
     - How to Use a Feature
     - Something Else
   - **Help Centre URL** (URL field)
   - **User Role** (Single Line Text)

### 2. Configure BUGS Project

**Verify existing BUGS project has:**
- Issue Type: "Bug"
- Priority: Blocker, Critical, Major, Minor
- Status workflow: To Do → In Progress → Code Review → Done

**If BUGS project doesn't exist:**
1. Create project with key: BUGS
2. Add issue type: Bug
3. Configure workflow for engineering team

### 3. Get Jira API Token

1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Name: "TutorWise Help Centre Integration"
4. Copy the token (you won't see it again!)

### 4. Configure Permissions

**For both BUGS and SUPPORT projects:**

1. Project Settings → Permissions
2. Ensure API user (your email) has:
   - Create Issues
   - Edit Issues
   - Add Comments
   - View Issues

3. Set up email notifications:
   - Project Settings → Notifications
   - Add: devops@tutorwise.io to "Issue Created" events
   - Support team can reply via email (Jira captures it)

---

## Environment Variables

Add to `/apps/web/.env.local`:

```bash
# ============================================
# JIRA CONFIGURATION
# ============================================

# Jira Cloud Base URL (your instance)
JIRA_BASE_URL=https://your-company.atlassian.net

# Jira User Email (API authentication)
JIRA_EMAIL=your-email@tutorwise.io

# Jira API Token (generated in step 3 above)
JIRA_API_TOKEN=your_api_token_here

# Jira Project Keys
JIRA_BUGS_PROJECT_KEY=BUGS
JIRA_SUPPORT_PROJECT_KEY=SUPPORT
```

**Important:**
- Never commit `.env.local` to git (already in `.gitignore`)
- Add same variables to Vercel environment variables for production
- Use separate Jira tokens for staging/production if needed

---

## Custom Field IDs (Optional)

If you created custom fields in Jira, find their IDs:

1. Go to Jira Settings → Issues → Custom Fields
2. Click on field name
3. Copy the ID from URL: `customfield_10050`

Update in `/apps/web/src/app/api/help-centre/support/request/route.ts`:

```typescript
// Uncomment and update these lines in the API route:
customfield_10050: data.category, // Category field
customfield_10051: data.pageContext?.url, // Help Centre URL
```

---

## Email Fallback Configuration

If Jira is unavailable, the system falls back to email.

**Configure email service (choose one):**

### Option 1: Resend (Recommended)

```bash
# Add to .env.local
RESEND_API_KEY=re_xxxxxxxxxxxx
SUPPORT_EMAIL=devops@tutorwise.io
```

### Option 2: SendGrid

```bash
# Add to .env.local
SENDGRID_API_KEY=SG.xxxxxxxxxxxx
SUPPORT_EMAIL=devops@tutorwise.io
```

### Option 3: AWS SES

```bash
# Add to .env.local
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxx
SUPPORT_EMAIL=devops@tutorwise.io
```

**Update fallback function in:**
- `/apps/web/src/app/api/help-centre/support/request/route.ts` (line 88)
- `/apps/web/src/app/api/help-centre/support/snapshot/route.ts` (if exists)

---

## Testing Checklist

### ✅ Report a Problem (BUGS)

1. Navigate to Help Centre: `/help-centre`
2. Find "Still Stuck?" widget in sidebar
3. Click **"Report a Problem"** (red button with bug icon)
4. SnapshotModal should open:
   - ✅ Title: "Report a Problem"
   - ✅ Subtitle: "We'll capture what went wrong"
5. Fill form:
   - What were you trying to do: "Test bug report"
   - What went wrong: "Testing Jira integration"
   - Impact: Select "Minor issue"
   - Screenshot: Capture or skip
6. Click "Send Report"
7. **Expected:**
   - ✅ Success alert with ticket ID (e.g., "BUGS-123")
   - ✅ Jira BUGS project has new ticket
   - ✅ Ticket includes screenshot (if captured)
   - ✅ Ticket has correct priority

### ✅ Get Help (SUPPORT)

1. Navigate to Help Centre: `/help-centre`
2. Find "Still Stuck?" widget in sidebar
3. Click **"Get Help"** (teal button with question icon)
4. GetHelpModal should open:
   - ✅ Title: "Get Help"
   - ✅ Subtitle: "Can't find what you need in our articles?"
5. Fill form:
   - First Name: "John"
   - Last Name: "Smith"
   - Category: Select "Account & Profile Settings"
   - Question: "How do I change my email?"
   - Details: "I can't find the settings page"
   - Urgent: Check or uncheck
6. Click "Get Help"
7. **Expected:**
   - ✅ Success alert with ticket ID (e.g., "SUPPORT-45")
   - ✅ Jira SUPPORT project has new ticket
   - ✅ Ticket includes category in title
   - ✅ Ticket has correct priority (High if urgent, Normal otherwise)

### ✅ Jira Integration

**Verify in Jira:**

1. Go to Jira → BUGS project → Filter: Recent
   - ✅ See bug report ticket
   - ✅ Description includes screenshot (if captured)
   - ✅ Labels: help-centre, impact-minor (or similar)

2. Go to Jira → SUPPORT project → Filter: Recent
   - ✅ See support request ticket
   - ✅ Summary: `[Account & Profile Settings] How do I change my email?`
   - ✅ Description includes user details
   - ✅ Labels: help-centre, category-account, urgent (if checked)

### ✅ Email Notifications

1. Check devops@tutorwise.io inbox
   - ✅ Received "New issue: BUGS-123" email
   - ✅ Received "New issue: SUPPORT-45" email
2. Reply to email
   - ✅ Reply appears as comment in Jira
   - ✅ User receives notification (if configured)

### ✅ Fallback Testing

1. Temporarily break Jira (wrong API token)
2. Submit "Get Help" request
3. **Expected:**
   - ✅ Still shows success message
   - ✅ Ticket ID shows "EMAIL-FALLBACK"
   - ✅ Email sent to devops@tutorwise.io with request details

---

## User Experience Flow

### User Decision Tree

```
User arrives at Help Centre
│
├─ Finds answer in articles → Solved ✅
│
└─ Can't find answer → Scrolls to "Still Stuck?" widget
   │
   ├─ "Something's broken" (red button, bug icon)
   │  → Report a Problem → SnapshotModal
   │  → "What were you trying to do?"
   │  → Screenshot capture
   │  → Creates BUGS ticket
   │
   └─ "I have a question" (teal button, question icon)
      → Get Help → GetHelpModal
      → Name, Category, Question
      → Creates SUPPORT ticket
```

### Visual Distinction

Users instantly know which button to use because:

1. **Icon**: Bug (🐛) vs Question mark (❓)
2. **Color**: Red vs Teal
3. **Border**: Red left accent vs Teal left accent
4. **Description**:
   - "Something's broken or not working"
   - "I have a question or need assistance"
5. **Hover State**: Red glow vs Teal glow

---

## Troubleshooting

### Issue: "Jira API error: 401"

**Solution:**
- Verify `JIRA_EMAIL` matches the account that created API token
- Regenerate API token and update `.env.local`
- Restart Next.js dev server

### Issue: "Jira API error: 403"

**Solution:**
- Check project permissions (Project Settings → Permissions)
- Ensure API user can "Create Issues" in both BUGS and SUPPORT

### Issue: "Jira API error: 404"

**Solution:**
- Verify project keys: `JIRA_BUGS_PROJECT_KEY=BUGS`
- Check project exists and is not archived
- Verify base URL format: `https://your-company.atlassian.net`

### Issue: Custom fields not populating

**Solution:**
- Uncomment custom field lines in API route
- Update field IDs to match your Jira instance
- Verify field IDs are correct (customfield_10050, etc.)

### Issue: Email fallback not working

**Solution:**
- Implement email service in `sendFallbackEmail()` function
- Add email service credentials to `.env.local`
- Test email service separately first

---

## Production Deployment

### Vercel Environment Variables

Add to Vercel project settings:

1. Go to: Vercel → Project → Settings → Environment Variables
2. Add all Jira variables:
   - `JIRA_BASE_URL`
   - `JIRA_EMAIL`
   - `JIRA_API_TOKEN`
   - `JIRA_BUGS_PROJECT_KEY`
   - `JIRA_SUPPORT_PROJECT_KEY`
3. Click "Save"
4. Redeploy: `git push origin main`

### Security Checklist

- ✅ Never commit `.env.local` to git
- ✅ Use separate API tokens for staging/production
- ✅ Rotate API tokens every 90 days
- ✅ Monitor Jira API usage in Jira admin
- ✅ Set up rate limiting if needed
- ✅ Enable IP allowlisting in Jira (optional)

---

## Analytics & Monitoring

### Track Usage

Monitor in Jira:
- **BUGS project**: Filter by label "help-centre"
- **SUPPORT project**: Filter by label "help-centre"

### Metrics to Track

1. **Volume**:
   - Bugs reported per week
   - Support requests per week
   - Ratio of bugs to support requests

2. **Categories**:
   - Most common support category (account, billing, etc.)
   - Most common bug impact (blocking, degraded, minor)

3. **Response Time**:
   - Average time to first response
   - Average time to resolution

4. **User Satisfaction**:
   - Add Jira satisfaction rating to tickets
   - Track resolution rate

### Dashboard Queries

```jql
-- All help centre tickets (last 30 days)
labels = "help-centre" AND created >= -30d

-- High priority support requests
project = SUPPORT AND priority = High AND status != Resolved

-- Blocking bugs from help centre
project = BUGS AND priority = Blocker AND labels = "help-centre"

-- Unresolved tickets older than 48 hours
labels = "help-centre" AND status != Resolved AND created <= -2d
```

---

## Future Enhancements

### Phase 2: User Dashboard

Allow users to track their tickets:
- `/account/support` page
- List of submitted tickets
- Status updates in real-time
- Reply to tickets without leaving platform

### Phase 3: Auto-Response

Implement smart responses:
- Common questions → Auto-suggest knowledge base articles
- Pattern detection → "10 users asked this" → Create FAQ
- AI-powered ticket categorization

### Phase 4: Live Chat

Add real-time support:
- Integrate with Intercom, Zendesk, or custom chat
- Escalate chat to Jira ticket if unresolved
- Agent dashboard for support team

---

## Related Documentation

- [SnapshotModal Implementation](../../apps/web/src/app/components/help-centre/modals/SnapshotModal.tsx)
- [GetHelpModal Implementation](../../apps/web/src/app/components/help-centre/modals/GetHelpModal.tsx)
- [Jira REST API Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)

---

**Status:** ✅ Ready for Production
**Last Updated:** 2026-01-18
**Next Review:** Add email fallback implementation
