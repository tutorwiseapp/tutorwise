# Referral Email Automation System

## Overview

The referral email automation system automatically sends email notifications to team members when key referral events occur. It uses a queue-based architecture with Resend for reliable email delivery.

## Architecture

### Components

1. **Email Templates** (`/src/lib/referral-emails.ts`)
   - 4 pre-built email templates with responsive HTML design
   - Uses existing Resend integration from `/src/lib/email.ts`

2. **Database Triggers** (Migration 157)
   - Automatically queue emails when events occur
   - Stores metadata for template rendering
   - Prevents duplicate sends

3. **Email Queue** (`referral_email_queue` table)
   - Stores pending, sent, and failed emails
   - Tracks delivery status and errors
   - Enables retry logic

4. **Queue Processor** (`/api/referrals/process-email-queue`)
   - Processes up to 50 emails per run
   - Runs every 5 minutes via Vercel Cron
   - Updates email status after sending

## Email Templates

### 1. New Referral Email
**Trigger:** When a new referral is created
**Recipient:** Referrer (team member who shared the link)
**Subject:** "🎉 New Referral: [Name] joined through your link!"

**Content:**
- Purple gradient header
- Referred person's name and email
- Next steps (contact, schedule meeting)
- CTA to view referral pipeline

**Metadata Required:**
```json
{
  "template": "new_referral",
  "referrer_name": "John Smith",
  "organisation_name": "Acme Tutoring",
  "referred_name": "Jane Doe",
  "referred_email": "jane@example.com",
  "referral_id": "uuid"
}
```

### 2. Stage Change Email
**Trigger:** When a referral moves through the conversion pipeline
**Recipient:** Referrer
**Subject:** "📈 Referral Update: [Name] → [New Stage]"

**Content:**
- Stage-specific colored header
- Progress visualization (old stage → new stage)
- Estimated deal value (if available)
- Special congratulations section if converted
- CTA to view full details

**Metadata Required:**
```json
{
  "template": "stage_change",
  "referrer_name": "John Smith",
  "organisation_name": "Acme Tutoring",
  "referred_name": "Jane Doe",
  "old_stage": "meeting",
  "new_stage": "proposal",
  "estimated_value": 5000,
  "referral_id": "uuid"
}
```

**Stages:**
- `referred` → `contacted` → `meeting` → `proposal` → `negotiating` → `converted`

### 3. Commission Earned Email
**Trigger:** When `commission_paid` is set to `true`
**Recipient:** Referrer
**Subject:** "💰 You earned £[Amount] commission!"

**Content:**
- Gold gradient header
- Large commission amount display
- Referred person's name
- Total lifetime commissions
- CTA to view earnings

**Metadata Required:**
```json
{
  "template": "commission_earned",
  "referrer_name": "John Smith",
  "organisation_name": "Acme Tutoring",
  "referred_name": "Jane Doe",
  "commission_amount": 250.00,
  "total_commission": 1500.00,
  "referral_id": "uuid"
}
```

### 4. Achievement Unlocked Email
**Trigger:** When a new achievement is earned
**Recipient:** Member who earned the achievement
**Subject:** "🏆 Achievement Unlocked: [Achievement Name]!"

**Content:**
- Tier-specific gradient header (bronze/silver/gold/platinum/diamond)
- Trophy icon and achievement badge
- Achievement description
- Points earned and total points
- CTA to view all achievements

**Metadata Required:**
```json
{
  "template": "achievement_unlocked",
  "referrer_name": "John Smith",
  "organisation_name": "Acme Tutoring",
  "achievement_name": "10 Referrals",
  "achievement_description": "Made 10 referrals",
  "achievement_tier": "silver",
  "achievement_points": 50,
  "total_points": 150
}
```

## Database Schema

### `referral_email_queue`

```sql
CREATE TABLE referral_email_queue (
    id UUID PRIMARY KEY,
    automation_id UUID,              -- Optional link to automation rule
    recipient_email VARCHAR(255),     -- Email address to send to
    recipient_name VARCHAR(255),      -- Recipient's name
    subject TEXT,                     -- Template type (not actual subject)
    body TEXT,                        -- Empty (template generates body)
    metadata JSONB,                   -- Template data
    status VARCHAR(20),               -- 'pending', 'sent', 'failed'
    sent_at TIMESTAMPTZ,             -- When email was sent
    error_message TEXT,               -- Error if failed
    created_at TIMESTAMPTZ
);
```

## Database Triggers

### 1. `trigger_queue_new_referral_email`
**Event:** `AFTER INSERT ON referrals`
**Condition:** `NEW.referrer_member_id IS NOT NULL`

**Logic:**
1. Get referrer email/name from profiles
2. Get organisation name
3. Get referred person details
4. Insert into email queue with metadata

### 2. `trigger_queue_stage_change_email`
**Event:** `AFTER UPDATE OF conversion_stage ON referrals`
**Condition:** `NEW.referrer_member_id IS NOT NULL`

**Logic:**
1. Check if stage actually changed (OLD vs NEW)
2. Get referrer and org details
3. Insert into queue with old/new stage comparison

### 3. `trigger_queue_commission_email`
**Event:** `AFTER UPDATE OF commission_paid ON referrals`
**Condition:** `NEW.referrer_member_id IS NOT NULL AND NEW.member_commission > 0`

**Logic:**
1. Check if commission was just paid (OLD.commission_paid = FALSE, NEW.commission_paid = TRUE)
2. Calculate total commissions for member
3. Insert into queue with commission amounts

### 4. `trigger_queue_achievement_email`
**Event:** `AFTER INSERT ON member_achievements`

**Logic:**
1. Get member email/name
2. Get achievement details (name, description, tier, points)
3. Calculate total points
4. Insert into queue

## Queue Processor API

### Endpoint
`POST /api/referrals/process-email-queue`

### Authentication
Optional: Set `CRON_SECRET` environment variable and pass as Bearer token:
```
Authorization: Bearer your-secret-here
```

### Processing Logic

1. Fetch up to 50 pending emails (oldest first)
2. For each email:
   - Read metadata.template to determine email type
   - Call appropriate email function from `/src/lib/referral-emails.ts`
   - Send via Resend
   - Update status to 'sent' with timestamp
   - On error: Update status to 'failed' with error message
3. Return processing summary

### Response Format

```json
{
  "success": true,
  "message": "Processed 15 emails",
  "processed": 14,
  "failed": 1,
  "total": 15
}
```

## Vercel Cron Configuration

### `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/referrals/process-email-queue",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Schedule:** Every 5 minutes
**Max Duration:** 60 seconds
**Batch Size:** 50 emails per run

## Environment Variables

### Required
- `RESEND_API_KEY` - Resend API key (already configured)
- `RESEND_FROM_EMAIL` - From email address (default: noreply@tutorwise.io)
- `RESEND_REPLY_TO_EMAIL` - Reply-to address

### Optional
- `CRON_SECRET` - Secret for authenticating cron requests

## Setup Instructions

### 1. Apply Migration
```bash
# Apply migration 157 to create tables and triggers
psql $DATABASE_URL -f tools/database/migrations/157_referral_analytics_gamification.sql
```

### 2. Configure Environment Variables
```bash
# In Vercel dashboard or .env.local
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Tutorwise <noreply@tutorwise.io>
RESEND_REPLY_TO_EMAIL=support@tutorwise.io
CRON_SECRET=your-secret-here  # Optional but recommended
```

### 3. Deploy Vercel Cron
- Deploy to Vercel
- Vercel Cron will automatically start based on `vercel.json` config
- Monitor cron executions in Vercel dashboard → Settings → Cron Jobs

### 4. Test Email Queue
```bash
# Manual test via API
curl -X POST https://your-app.vercel.app/api/referrals/process-email-queue \
  -H "Authorization: Bearer your-secret-here"
```

## Monitoring & Troubleshooting

### Check Queue Status
```sql
-- View pending emails
SELECT * FROM referral_email_queue WHERE status = 'pending' ORDER BY created_at;

-- View failed emails
SELECT * FROM referral_email_queue WHERE status = 'failed' ORDER BY created_at DESC;

-- Count emails by status
SELECT status, COUNT(*) FROM referral_email_queue GROUP BY status;
```

### Retry Failed Emails
```sql
-- Reset failed emails to pending (will be retried on next cron run)
UPDATE referral_email_queue
SET status = 'pending', error_message = NULL
WHERE status = 'failed' AND created_at > NOW() - INTERVAL '24 hours';
```

### Common Issues

**1. Emails not sending**
- Check Resend API key is valid
- Verify `RESEND_FROM_EMAIL` domain is verified in Resend
- Check Vercel cron logs for errors
- Manually trigger: `curl -X POST /api/referrals/process-email-queue`

**2. Duplicate emails**
- Database triggers use UNIQUE constraints to prevent duplicates
- Achievement emails have `UNIQUE(member_id, achievement_id, organisation_id)`
- Queue processor marks emails as 'sent' to prevent re-sending

**3. Template errors**
- Check email queue metadata structure matches template requirements
- View failed emails error_message column for details
- Test templates directly via email functions

## Email Design

All emails use responsive HTML with:
- 600px width for optimal rendering
- Mobile-friendly design
- Gradient headers matching brand colors
- Clear CTAs linking back to platform
- Consistent footer with notification settings

**Color Palette:**
- Purple gradient: `#667eea` → `#764ba2` (primary actions)
- Gold gradient: `#fbbf24` → `#f59e0b` (commissions)
- Tier-specific gradients for achievements:
  - Bronze: `#cd7f32` → `#8b5a2b`
  - Silver: `#c0c0c0` → `#808080`
  - Gold: `#ffd700` → `#ff8c00`
  - Platinum: `#e5e4e2` → `#a8a9ad`
  - Diamond: `#b9f2ff` → `#4fc3f7`

## Future Enhancements

### Planned Features
- [ ] Email preference management (per-event opt-in/out)
- [ ] Digest emails (daily/weekly summary instead of instant)
- [ ] Email templates customization per organisation
- [ ] SMS notifications integration
- [ ] Slack/Teams webhook notifications
- [ ] Email analytics (open rates, click rates)
- [ ] A/B testing for email templates

### Database Tables (Already Created)
- `referral_email_automations` - For customizable automation rules
- `referral_sms_notifications` - For SMS integration
- `referral_webhook_integrations` - For Slack/Teams webhooks

## Testing Checklist

- [ ] Create test referral → New referral email queued
- [ ] Update conversion stage → Stage change email queued
- [ ] Mark commission paid → Commission email queued
- [ ] Earn achievement → Achievement email queued
- [ ] Run queue processor → Emails sent via Resend
- [ ] Check email rendering in Gmail
- [ ] Check email rendering in Outlook
- [ ] Test mobile email rendering
- [ ] Verify unsubscribe links work
- [ ] Test error handling (invalid email, Resend API failure)

## Support

For issues or questions:
1. Check Vercel function logs
2. Query `referral_email_queue` for failed emails
3. Test email templates directly via `/src/lib/referral-emails.ts`
4. Contact Resend support for delivery issues

---

**Last Updated:** 2025-12-31
**Migration:** 157
**Status:** Production Ready
