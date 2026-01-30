# Tutorwise Email Configuration Guide

## Overview

Tutorwise uses a multi-tier email system that supports both user authentication emails (via Supabase) and automated audit notifications. The system tries multiple email providers in order of preference.

## Email Providers (Priority Order)

### 1. Resend (Recommended) ⭐
- **Modern & Reliable**: Built for developers
- **Great Deliverability**: High inbox delivery rates
- **Simple Setup**: Just API key needed
- **Cost Effective**: Generous free tier

### 2. Nodemailer + Custom SMTP
- **Flexible**: Works with any SMTP provider
- **Gmail Support**: Use Gmail App Passwords
- **Backup Option**: Fallback when Resend fails

### 3. Supabase SMTP
- **Unified Setup**: Same SMTP for auth + notifications
- **Centralized**: Configure once in Supabase dashboard

### 4. System Mail (Fallback)
- **Last Resort**: Uses system mail command
- **Limited**: Usually not available on development machines

### 5. Local File Storage (Always Works)
- **Guaranteed**: Never fails
- **Development**: Perfect for testing
- **Manual**: Requires manual email sending

## Setup Instructions

### Option 1: Resend Setup (Recommended)

1. **Create Resend Account**
   - Go to [resend.com](https://resend.com)
   - Sign up for free account
   - Verify your domain (or use their test domain)

2. **Get API Key**
   - Go to API Keys section
   - Create new API key
   - Copy the key (starts with `re_`)

3. **Configure Environment**
   ```bash
   # Add to .env.local
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
   RESEND_FROM_EMAIL=Tutorwise System <noreply@yourdomain.com>
   ```

4. **Test Configuration**
   ```bash
   node tools/scripts/email/send-audit-email.js docs/project-audit/project-audit-2024-09-30.md
   ```

### Option 2: Gmail SMTP Setup

1. **Enable 2-Factor Authentication**
   - Go to Google Account settings
   - Security → 2-Step Verification → Turn On

2. **Create App Password**
   - Security → App passwords
   - Select app: Mail
   - Select device: Other (Custom name)
   - Copy the 16-character password

3. **Configure Environment**
   ```bash
   # Add to .env.local
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=tutorwiseapp@gmail.com
   SMTP_PASSWORD=your-16-char-app-password
   ```

### Option 3: Supabase Unified Setup

1. **Configure in Supabase Dashboard**
   - Go to Authentication → Emails → SMTP Settings
   - Click "Set up custom SMTP server"
   - Use Resend or Gmail credentials

2. **Add Environment Variables**
   ```bash
   # Add to .env.local
   SUPABASE_SMTP_HOST=smtp.resend.com
   SUPABASE_SMTP_PORT=587
   SUPABASE_SMTP_USER=resend
   SUPABASE_SMTP_PASSWORD=your-resend-api-key
   ```

## Testing Email Delivery

### Test Audit Email
```bash
node tools/scripts/email/send-audit-email.js docs/project-audit/project-audit-2024-09-30.md
```

### Expected Output (Success)
```
📧 Preparing to send audit email...
📊 Audit Summary:
   Health Score: 7.2/10
   Critical Issues: 0
   High Issues: 0
📤 Attempting email method 1...
📧 Sending via Resend...
   From: Tutorwise System <noreply@tutorwise.app>
   To: tutorwiseapp@gmail.com
   Subject: 📊 Tutorwise Project Audit - September 30, 2024 (Health: 7.2/10)
✅ Resend success: <message-id>
✅ Email sent successfully!
🎉 Audit email process completed successfully!
```

### Expected Output (Fallback)
```
📤 Attempting email method 1...
❌ Method 1 failed: RESEND_API_KEY not found - trying next method
📤 Attempting email method 2...
❌ Method 2 failed: Missing credentials for "PLAIN"
...
📤 Attempting email method 5...
📁 Email saved locally: logs/emails/audit-email-2025-09-30T17-51-52-604Z.html
✅ Email sent successfully!
```

## Email Content Features

### Professional HTML Design
- **Tutorwise Branding**: Consistent colors and styling
- **Metrics Dashboard**: Visual health score and issue counts
- **Responsive**: Works on mobile and desktop
- **Rich Content**: Achievements, remaining work, attachments

### Email Includes
- ✅ **Health Score**: Project health rating (x.x/10)
- ✅ **Issue Summary**: Critical and high priority issues
- ✅ **Key Achievements**: Recent accomplishments
- ✅ **Remaining Work**: Next steps and priorities
- ✅ **File Attachment**: Complete audit report (Markdown)
- ✅ **Professional Styling**: Tutorwise brand colors

## Automatic Integration

### Audit System Integration
Every time you run the project audit, an email is automatically sent:

```bash
./tools/scripts/project-audit.sh
```

The audit script automatically:
1. ✅ Generates audit report
2. ✅ Extracts key metrics
3. ✅ Sends email notification
4. ✅ Updates audit configuration
5. ✅ Logs results

### Configuration Files
- **Email Script**: `tools/scripts/email/send-audit-email.js`
- **Audit Integration**: `tools/scripts/project-audit.sh`
- **Environment**: `.env.local` (use `.env.example` as template)
- **Email Logs**: `logs/emails/` (HTML and JSON files)

## Troubleshooting

### "RESEND_API_KEY not found"
- ✅ Add `RESEND_API_KEY=re_xxx` to `.env.local`
- ✅ Ensure `.env.local` is in project root
- ✅ Restart any running processes

### "Missing credentials for PLAIN"
- ✅ Check SMTP username/password in `.env.local`
- ✅ Use Gmail App Password, not regular password
- ✅ Verify SMTP host and port settings

### Emails not being received
- ✅ Check spam/junk folder
- ✅ Verify recipient email address
- ✅ Test with different email providers
- ✅ Check email service provider logs

### "Module not found" errors
- ✅ Run `npm install nodemailer`
- ✅ Ensure you're in project root directory
- ✅ Check package.json includes nodemailer

## Security Best Practices

### Environment Variables
- ❌ **Never commit** `.env.local` to git
- ✅ **Use App Passwords** instead of regular passwords
- ✅ **Rotate API keys** regularly
- ✅ **Restrict permissions** to minimum needed

### Email Content
- ✅ **No secrets** in email content
- ✅ **Professional tone** for business communications
- ✅ **Clear subject lines** for easy filtering
- ✅ **Audit trails** logged in Supabase

## Cost Considerations

### Resend (Recommended)
- **Free Tier**: 3,000 emails/month
- **Paid**: $20/month for 50,000 emails
- **Perfect for**: Audit notifications (weekly = ~52 emails/year)

### Gmail SMTP
- **Free**: No additional cost
- **Limits**: 500 emails/day
- **Perfect for**: Development and small-scale usage

### Supabase
- **Depends**: On your configured SMTP provider
- **Unified**: Same cost as your chosen provider
- **Benefit**: Centralized configuration

---

## Quick Start Checklist

- [ ] Install nodemailer: `npm install nodemailer`
- [ ] Copy `.env.example` to `.env.local`
- [ ] Choose email provider (Resend recommended)
- [ ] Add API keys/credentials to `.env.local`
- [ ] Test: `node tools/scripts/email/send-audit-email.js docs/project-audit/project-audit-2024-09-30.md`
- [ ] Verify email received at tutorwiseapp@gmail.com
- [ ] Run full audit: `./tools/scripts/project-audit.sh`

**Next**: Emails will be automatically sent with every audit completion! 🎉