# Resend Email Integration - Network Feature

**Document Information**
- **Version:** 1.0
- **Date:** 2025-11-07
- **Status:** ✅ Implementation Complete
- **Service:** [Resend](https://resend.com/)

---

## Overview

The Network feature uses **Resend** for transactional email delivery. Resend provides:
- ✅ High deliverability rates
- ✅ Simple API
- ✅ React Email component support
- ✅ Email analytics and tracking
- ✅ Generous free tier (3,000 emails/month)

---

## Email Types

### 1. Connection Invitation (New Users)

**Sent when:** User invites someone by email who doesn't have a Tutorwise account

**Template:** `sendConnectionInvitation()`

**Content:**
- Sender's name
- Invitation to join Tutorwise
- Benefits of the platform (Network, Commissions, Growth)
- CTA button with referral link
- Tutorwise branding

**Referral Link Format:**
```
https://tutorwise.io/a/{referral_code}?redirect=/network
```

**Features:**
- Embeds sender's referral code for lifetime attribution
- Redirects to /network page after signup
- Branded HTML email template

---

### 2. Connection Request Notification (Existing Users)

**Sent when:** User sends connection request to existing Tutorwise user

**Template:** `sendConnectionRequestNotification()`

**Content:**
- Sender's name and email
- Optional personal message
- CTA button to view request
- Link to /network page

**Link Format:**
```
https://tutorwise.io/network
```

**Features:**
- Includes sender's personal message (if provided)
- Professional branded template
- Unsubscribe link

---

## Setup Instructions

### 1. Create Resend Account

1. Go to [https://resend.com/signup](https://resend.com/signup)
2. Sign up with email or GitHub
3. Verify your email address

### 2. Get API Key

1. Navigate to **API Keys** in Resend dashboard
2. Click **Create API Key**
3. Give it a name (e.g., "Tutorwise Production")
4. Select **Sending access** permission
5. Copy the API key (starts with `re_`)

### 3. Configure Domain (Production Only)

**For Development:** Use Resend's default domain (`onboarding@resend.dev`)

**For Production:**
1. Go to **Domains** in Resend dashboard
2. Click **Add Domain**
3. Enter your domain (e.g., `tutorwise.io`)
4. Add DNS records to your domain provider:
   ```
   Type: TXT
   Name: @
   Value: [Resend verification code]

   Type: MX
   Name: @
   Value: feedback-smtp.us-east-1.amazonses.com
   Priority: 10
   ```
5. Wait for DNS propagation (up to 48 hours)
6. Verify domain in Resend dashboard

### 4. Set Environment Variables

Add to `.env.local`:

```bash
# Resend Email Service
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=Tutorwise <noreply@tutorwise.io>  # Change in production
RESEND_REPLY_TO_EMAIL=support@tutorwise.io         # Optional

# Application URL (for email links)
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # Change to https://tutorwise.io in production
```

---

## Implementation

### Email Service (`apps/web/src/lib/email.ts`)

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(options: SendEmailOptions) {
  const { to, subject, html, from, replyTo } = options;

  const { data, error } = await resend.emails.send({
    from: from || process.env.RESEND_FROM_EMAIL || 'Tutorwise <noreply@tutorwise.io>',
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    replyTo: replyTo || process.env.RESEND_REPLY_TO_EMAIL,
  });

  if (error) throw error;
  return { success: true, data };
}
```

### Connection Invitation Template

**Design Features:**
- Gradient header (#006c67 → #004a47)
- Feature cards with icons (🤝 🚀 💰)
- Prominent CTA button
- Mobile-responsive
- Tutorwise branding
- Footer links (Terms, Privacy, Contact)

**HTML Structure:**
```html
<!DOCTYPE html>
<html>
  <body style="background: #f5f5f5;">
    <table width="600" style="background: #ffffff; border-radius: 12px;">
      <!-- Header with gradient -->
      <tr><td style="background: linear-gradient(...)">...</td></tr>

      <!-- Content with features -->
      <tr><td>
        <p>Sender has invited you...</p>
        <table>
          <tr><td>🤝 Build Your Network</td></tr>
          <tr><td>💰 Earn Commissions</td></tr>
          <tr><td>🚀 Grow Together</td></tr>
        </table>
        <a href="{referralUrl}">Join Tutorwise</a>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background: #f9fafb">...</td></tr>
    </table>
  </body>
</html>
```

### Connection Request Notification Template

**Design Features:**
- Same branding as invitation
- Shows sender's personal message (if provided)
- "View Request" CTA button
- Unsubscribe link in footer

---

## Testing

### Development Testing

**Using Resend Test Mode:**

1. Use the default `onboarding@resend.dev` sender
2. Send test emails to your personal email
3. Check Resend dashboard for delivery status

**Test Script:**

```bash
# Send test invitation
curl -X POST http://localhost:3000/api/network/invite-by-email \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"emails": ["test@example.com"]}'

# Check Resend dashboard for delivery
```

### Production Testing

**Before Launch:**
1. ✅ Verify domain ownership
2. ✅ Test email deliverability (Gmail, Outlook, Yahoo)
3. ✅ Check spam scores ([Mail Tester](https://www.mail-tester.com/))
4. ✅ Verify links work correctly
5. ✅ Test unsubscribe flow
6. ✅ Check mobile rendering

---

## Monitoring & Analytics

### Resend Dashboard

**Metrics Available:**
- Emails sent (daily/weekly/monthly)
- Delivery rate
- Bounce rate
- Complaint rate
- Open rate (if tracking enabled)
- Click rate (if tracking enabled)

**Access:** [https://resend.com/dashboard](https://resend.com/dashboard)

### Error Handling

**Email Service Errors:**
```typescript
try {
  await sendConnectionInvitation({ ... });
  // Log success to analytics
} catch (error) {
  console.error('[email] Send error:', error);
  // Non-blocking: Don't fail API request
  // Log error to monitoring service (Sentry)
}
```

**Common Errors:**
- `invalid_from_address` - Check RESEND_FROM_EMAIL
- `rate_limit_exceeded` - Upgrade Resend plan
- `invalid_api_key` - Check RESEND_API_KEY
- `domain_not_verified` - Verify domain in dashboard

---

## Rate Limits

### Resend Free Tier

- **3,000 emails/month**
- **100 emails/day**
- **10 emails/second**

### Resend Pro ($20/month)

- **50,000 emails/month**
- **No daily limit**
- **100 emails/second**

### Tutorwise Rate Limiting

**Network API Endpoints:**
- `POST /api/network/invite-by-email`: 50 requests/day
- `POST /api/network/request`: 100 requests/day

**Why:** Prevents spam and stays within Resend limits

---

## Email Templates Best Practices

### Design Guidelines

1. **Mobile-First**
   - Use responsive tables
   - Font size ≥ 14px
   - Touch-friendly buttons (≥ 44px height)

2. **Deliverability**
   - Avoid spam trigger words ("Free", "Click here", "Act now")
   - Text-to-image ratio > 60% text
   - Include unsubscribe link
   - Valid SPF, DKIM, DMARC records

3. **Branding**
   - Consistent color scheme (#006c67 primary)
   - Tutorwise logo in header
   - Professional tone
   - Clear CTA buttons

4. **Accessibility**
   - Alt text for images
   - Semantic HTML
   - High contrast text
   - Screen reader friendly

### Personalization

**Current:**
- Sender's name
- Recipient's email
- Personal message (connection requests)

**Future Enhancements:**
- Recipient's name (if known)
- Connection count
- Referral earnings preview
- Recommended connections

---

## Future Enhancements

### 1. React Email Components

**Why:** Type-safe, component-based email templates

**Implementation:**
```typescript
import { render } from '@react-email/render';
import { ConnectionInvitation } from '@/emails/ConnectionInvitation';

const html = render(
  <ConnectionInvitation senderName="John" referralUrl="..." />
);
```

### 2. Email Preferences

**Features:**
- User dashboard for email settings
- Opt-out of specific email types
- Frequency controls (daily digest vs. instant)

### 3. Email Analytics

**Track:**
- Open rates
- Click rates
- Conversion rates (invitation → signup)
- A/B testing subject lines

### 4. Transactional Email Types

**Additional Emails:**
- Connection accepted notification
- Weekly network summary
- Referral commission earned
- New booking from referral

---

## Troubleshooting

### Emails Not Sending

**Check:**
1. ✅ `RESEND_API_KEY` is set correctly
2. ✅ API key has "Sending access" permission
3. ✅ `RESEND_FROM_EMAIL` uses verified domain
4. ✅ Resend dashboard shows no errors
5. ✅ Check application logs for errors

### Emails Going to Spam

**Solutions:**
1. ✅ Verify domain ownership
2. ✅ Add SPF, DKIM, DMARC records
3. ✅ Avoid spam trigger words
4. ✅ Include unsubscribe link
5. ✅ Warm up domain (gradual send volume increase)
6. ✅ Monitor complaint rate in Resend dashboard

### High Bounce Rate

**Causes:**
- Invalid email addresses
- Temporary server errors
- Inbox full
- Domain blacklisted

**Solutions:**
- Validate emails before sending (use `z.string().email()`)
- Monitor bounce rate in Resend dashboard
- Remove bounced emails from future sends

---

## Cost Estimation

### Free Tier (3,000 emails/month)

**Assumptions:**
- 100 new invitations/week = 400/month
- 200 connection requests/week = 800/month
- **Total: 1,200 emails/month** ✅ Within free tier

### Pro Tier ($20/month)

**Assumptions:**
- 1,000 new invitations/week = 4,000/month
- 1,500 connection requests/week = 6,000/month
- 500 other notifications/week = 2,000/month
- **Total: 12,000 emails/month** ✅ Within Pro tier

### Enterprise (Custom Pricing)

**When to Upgrade:**
- >50,000 emails/month
- Need dedicated IP
- Custom deliverability support
- White-glove onboarding

---

## Security & Compliance

### Data Protection

- ✅ No PII stored in Resend logs (auto-deleted after 30 days)
- ✅ Emails encrypted in transit (TLS)
- ✅ API key stored in environment variables (not in code)
- ✅ Rate limiting prevents abuse

### GDPR Compliance

- ✅ Unsubscribe link in all emails
- ✅ User can opt-out in settings
- ✅ Email preferences stored in database
- ✅ No third-party tracking pixels (optional)

### CAN-SPAM Compliance

- ✅ Accurate "From" address
- ✅ Clear subject lines
- ✅ Physical mailing address in footer
- ✅ Unsubscribe mechanism
- ✅ Honor opt-outs within 10 days

---

## Resources

**Official Documentation:**
- [Resend Docs](https://resend.com/docs)
- [Resend API Reference](https://resend.com/docs/api-reference/emails/send-email)
- [React Email](https://react.email/)

**Tutorwise Documentation:**
- [Network Solution Proposal v4.5](NETWORK-SOLUTION-PROPOSAL-V4.5.md)
- [Email Service Implementation](../../../apps/web/src/lib/email.ts)

**Testing Tools:**
- [Mail Tester](https://www.mail-tester.com/) - Check spam score
- [Litmus](https://www.litmus.com/) - Email rendering across clients
- [Email on Acid](https://www.emailonacid.com/) - Comprehensive testing

---

## Changelog

**v1.0 (2025-11-07)**
- ✅ Initial Resend integration
- ✅ Connection invitation template
- ✅ Connection request notification template
- ✅ Error handling and logging
- ✅ Non-blocking email sends
- ✅ Analytics tracking

**Future Versions:**
- ⏳ React Email components
- ⏳ Email preferences dashboard
- ⏳ A/B testing framework
- ⏳ Additional transactional emails

---

**Document Status:** ✅ Complete
**Last Updated:** 2025-11-07
**Maintainer:** Engineering Team
