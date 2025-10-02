# GitHub Actions Scheduled Workflows Setup

## ✅ What's Already Done

The GitHub Actions workflows have been created and pushed:
- `.github/workflows/daily-audit.yml` - Runs at 6 AM & 6 PM UTC
- `.github/workflows/protection-report.yml` - Runs at 6:02 AM & 6:02 PM UTC

## 🔧 Manual Steps Required (5 minutes)

### Step 1: Add GitHub Secrets

You need to add environment variables as GitHub Secrets so the workflows can send emails.

**Go to:** https://github.com/tutorwiseapp/tutorwise/settings/secrets/actions

**Click:** "New repository secret" button

**Add these 4 secrets:**

| Secret Name | Value | Where to Find |
|------------|-------|---------------|
| `RESEND_API_KEY` | `re_dg67mSFp_9qAhdMjyJChbMHdwQhKz8pzw` | From `.env.local` line 22 |
| `RESEND_FROM_EMAIL` | `TutorWise System <onboarding@resend.dev>` | From `.env.local` line 23 |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://lvsmtgmpoysjygdwcrir.supabase.co` | From `.env.local` line 14 |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | From `.env.local` line 19 |

### Step 2: Enable Workflows

1. Go to: https://github.com/tutorwiseapp/tutorwise/actions
2. If you see "Workflows aren't being run on this fork" banner, click **"I understand my workflows, go ahead and enable them"**
3. You should see two new workflows:
   - 📊 Daily Project Audit
   - 🛡️ Critical Files Protection Report

### Step 3: Test Workflows (Optional but Recommended)

Test the workflows manually before waiting for scheduled runs:

1. Go to: https://github.com/tutorwiseapp/tutorwise/actions
2. Click on **"📊 Daily Project Audit"**
3. Click **"Run workflow"** button (top right)
4. Click green **"Run workflow"** button in dropdown
5. Wait 2-3 minutes, refresh page
6. Check if workflow succeeds (green checkmark ✅)
7. Check your email: `tutorwiseapp@gmail.com`

Repeat for **"🛡️ Critical Files Protection Report"**

---

## 📅 Schedule Summary

| Workflow | Time (UTC) | Time (BST) | Frequency |
|----------|-----------|-----------|-----------|
| Daily Audit | 6:00 AM | 7:00 AM | Twice daily |
| Daily Audit | 6:00 PM | 7:00 PM | Twice daily |
| Protection Report | 6:02 AM | 7:02 AM | Twice daily |
| Protection Report | 6:02 PM | 7:02 PM | Twice daily |

**Note:** GitHub Actions may have up to 15-minute delay on scheduled runs during high load.

---

## 🎯 What Happens Automatically

Every day at scheduled times:

1. ✅ Workflow checks out your code
2. ✅ Installs Node.js and dependencies
3. ✅ Creates necessary environment files
4. ✅ Generates audit/protection report
5. ✅ Sends email to `tutorwiseapp@gmail.com`
6. ✅ Uploads reports as artifacts (available for 30 days)
7. ✅ Shows logs in GitHub Actions UI

---

## 📊 Viewing Results

**Check Workflow Status:**
- https://github.com/tutorwiseapp/tutorwise/actions

**Download Artifacts:**
1. Go to Actions → Click on a completed workflow run
2. Scroll to bottom → "Artifacts" section
3. Download `audit-report-XXX` or `protection-report-XXX`

**View Logs:**
1. Go to Actions → Click on a workflow run
2. Click on the job name (e.g., "📋 Generate and Email Audit Report")
3. Expand steps to see detailed logs

---

## 🔄 Keep Local Cron as Backup?

**Recommendation:** Keep local cron running as backup

**Pros:**
- Redundancy if GitHub Actions has issues
- Runs immediately (no 15-min delay)
- Both send emails, so you'll get notified either way

**Cons:**
- Only runs when Mac is awake

**To disable local cron:**
```bash
crontab -e
# Comment out the audit lines by adding # at start:
# 0 6 * * * /Users/michaelquan/projects/tutorwise/tools/scripts/run-daily-audit.sh
# 0 19 * * * /Users/michaelquan/projects/tutorwise/tools/scripts/run-daily-audit.sh
# 2 6 * * * /Users/michaelquan/projects/tutorwise/tools/scripts/run-protection-report.sh
# 2 19 * * * /Users/michaelquan/projects/tutorwise/tools/scripts/run-protection-report.sh
```

---

## ❓ Troubleshooting

### Workflow fails with "Secret not found"
- Make sure you added all 4 secrets in GitHub Settings
- Secret names must match exactly (case-sensitive)

### No email received
- Check GitHub Actions logs for errors
- Verify `RESEND_API_KEY` is correct
- Check spam folder in Gmail

### Workflow doesn't run on schedule
- GitHub Actions can delay scheduled runs up to 15 minutes
- For immediate testing, use "Run workflow" button manually

### Need to change schedule times?
Edit the cron expressions in:
- `.github/workflows/daily-audit.yml` (line 4-7)
- `.github/workflows/protection-report.yml` (line 4-7)

---

## ✅ Success Checklist

- [ ] Added 4 GitHub Secrets
- [ ] Enabled workflows in GitHub Actions
- [ ] Manually tested both workflows
- [ ] Received test emails successfully
- [ ] Decided whether to keep/disable local cron

---

**Questions?** Check workflow logs in GitHub Actions UI or review this documentation.
