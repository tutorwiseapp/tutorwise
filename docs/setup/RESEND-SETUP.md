# Resend Email Service Setup Guide

**Service:** [Resend](https://resend.com/)
**Purpose:** Professional transactional email delivery for Network feature
**Free Tier:** 3,000 emails/month, 100 emails/day

---

## Step 1: Create Resend Account

1. Go to [https://resend.com/signup](https://resend.com/signup)
2. Sign up with:
   - **Email:** (use your tutorwise email)
   - **Password:** (create a strong password)

   OR

   - **GitHub:** (quick OAuth signup)

3. Verify your email address (check inbox)

---

## Step 2: Get API Key

1. After login, you'll be on the Resend Dashboard
2. Click **API Keys** in the left sidebar
3. Click **Create API Key** button
4. Fill in the form:
   - **Name:** `Tutorwise Production`
   - **Permission:** Select **Sending access**
   - **Domain:** Leave as "All Domains" (for now)
5. Click **Add**
6. **IMPORTANT:** Copy the API key immediately (starts with `re_`)
   - It will look like: `re_123abc456def789ghi012jkl345mno678pqr901stu234vwx567yz`
   - You won't be able to see it again!

---

## Step 3: Add to Environment Variables

1. Open `apps/web/.env.local` in your text editor
2. Add the following lines:

```bash
# Resend Email Service
RESEND_API_KEY=re_123abc456def789ghi012jkl345mno678pqr901stu234vwx567yz
RESEND_FROM_EMAIL=Tutorwise <noreply@tutorwise.io>
RESEND_REPLY_TO_EMAIL=support@tutorwise.io

# Application URL (for email links)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

3. Replace `re_123abc456def789ghi012jkl345mno678pqr901stu234vwx567yz` with your actual API key
4. Save the file

---

## Step 4: Test Email Delivery (Development)

**Using the default sender:**

For development, Resend allows you to send from `onboarding@resend.dev` without domain verification.

**Test Script:**

```bash
# 1. Start the dev server (if not already running)
npm run dev

# 2. In another terminal, test the invite endpoint
curl -X POST http://localhost:3000/api/network/invite-by-email \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat .session-cookie)" \
  -d '{
    "emails": ["your-personal-email@gmail.com"]
  }'
```

**Check Results:**
1. Go to [Resend Dashboard → Emails](https://resend.com/emails)
2. You should see the email in the list
3. Status should be "Delivered"
4. Check your personal inbox for the invitation email

---

## Step 5: Domain Verification (Production Only)

**⚠️ Skip this for development - only needed for production!**

When you're ready to deploy to production with a custom domain:

1. Go to [Resend Dashboard → Domains](https://resend.com/domains)
2. Click **Add Domain**
3. Enter your domain: `tutorwise.io`
4. Add the following DNS records to your domain provider:

**DNS Records to Add:**

```
Type: TXT
Name: @
Value: [Resend will show you the verification code]
TTL: 3600

Type: MX
Name: @
Value: feedback-smtp.us-east-1.amazonses.com
Priority: 10
TTL: 3600

Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none
TTL: 3600
```

5. Wait for DNS propagation (up to 48 hours, usually 15-30 minutes)
6. Click **Verify** in Resend dashboard
7. Once verified, update `.env.local`:

```bash
RESEND_FROM_EMAIL=Tutorwise <noreply@tutorwise.io>
```

---

## Step 6: Verify Integration

**Check 1: Environment Variables**
```bash
# Run this in terminal
cd apps/web
cat .env.local | grep RESEND
```

Expected output:
```
RESEND_API_KEY=re_***************************
RESEND_FROM_EMAIL=Tutorwise <noreply@tutorwise.io>
RESEND_REPLY_TO_EMAIL=support@tutorwise.io
```

**Check 2: Code Integration**
```bash
# Check email service is imported correctly
grep -r "import.*sendConnectionInvitation" apps/web/src/app/api/network/
```

Expected output:
```
apps/web/src/app/api/network/invite-by-email/route.ts:import { sendConnectionInvitation } from '@/lib/email';
```

**Check 3: Send Test Email**

1. Login to your Tutorwise account (local dev server)
2. Go to [http://localhost:3001/network](http://localhost:3001/network)
3. Click **+ Connect** button
4. Switch to **Invite by Email** tab
5. Enter your personal email
6. Click **Send Invitations**
7. Check:
   - ✅ Toast notification appears
   - ✅ Resend dashboard shows email sent
   - ✅ Personal inbox receives email

---

## Troubleshooting

### Error: "Invalid API key"

**Problem:** Resend API key is incorrect or missing

**Solution:**
1. Check `.env.local` has `RESEND_API_KEY=re_...`
2. Verify API key starts with `re_`
3. Make sure there are no extra spaces
4. Restart the dev server: `npm run dev`

### Error: "Invalid from address"

**Problem:** `RESEND_FROM_EMAIL` uses unverified domain

**Solution:**
- **Development:** Use `Tutorwise <onboarding@resend.dev>`
- **Production:** Verify domain first (see Step 5)

### Emails not arriving

**Check:**
1. Resend Dashboard → Emails → Check status
2. If status is "Delivered", check spam folder
3. If status is "Bounced", email address is invalid
4. If status is "Failed", check Resend logs for error

**Common Issues:**
- **Spam folder:** Add `noreply@resend.dev` to contacts
- **Invalid email:** Check for typos in email address
- **Rate limit:** Free tier is 100 emails/day

### Rate Limit Exceeded

**Problem:** Sent more than 100 emails in a day (free tier)

**Solution:**
- Wait 24 hours for reset
- **OR** Upgrade to Resend Pro ($20/month for 50,000 emails/month)

---

## Monitoring & Analytics

**Resend Dashboard:**
- [https://resend.com/emails](https://resend.com/emails) - View sent emails
- [https://resend.com/analytics](https://resend.com/analytics) - Email stats

**Key Metrics:**
- **Delivery Rate:** Should be >98%
- **Bounce Rate:** Should be <2%
- **Complaint Rate:** Should be <0.1%

---

## Cost Estimation

**Free Tier (Current):**
- 3,000 emails/month
- 100 emails/day
- Good for development and early testing

**Pro Tier ($20/month):**
- 50,000 emails/month
- Unlimited daily sends
- Upgrade when you have:
  - >100 daily invitations
  - >3,000 monthly emails
  - Need custom domain

**Enterprise (Custom Pricing):**
- >100,000 emails/month
- Dedicated IP
- White-glove support

---

## Next Steps

After Resend is configured:

1. ✅ Test email invitations locally
2. ✅ Verify deliverability (check spam score at [Mail Tester](https://www.mail-tester.com/))
3. ✅ Test on multiple email clients (Gmail, Outlook, Apple Mail)
4. ⏳ Configure domain for production (when ready to deploy)
5. ⏳ Monitor email analytics in Resend dashboard

---

## Support

**Resend Documentation:**
- [Getting Started](https://resend.com/docs/introduction)
- [API Reference](https://resend.com/docs/api-reference/emails/send-email)
- [Domain Setup](https://resend.com/docs/dashboard/domains/introduction)

**Tutorwise Documentation:**
- [Email Integration Guide](../features/network/RESEND-EMAIL-INTEGRATION.md)
- [Network v4.6 Enhancements](../features/network/NETWORK-V4.6-ENHANCEMENTS.md)

**Resend Support:**
- [Discord Community](https://resend.com/discord)
- [Email Support](mailto:support@resend.com)

---

**Setup Status:** ⏳ Pending API Key Configuration
**Last Updated:** 2025-11-07
**Next Review:** After first test email sent
