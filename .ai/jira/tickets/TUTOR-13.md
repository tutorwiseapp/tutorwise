# TUTOR-13: Configure Stripe for Payments

**Status**: Done
**Assignee**: Michael Quan
**Priority**: Medium
**Type**: Task

**Created**: 9/15/2025
**Updated**: 9/19/2025



## Description
Set up Stripe for Tutorwise to handle payments and commissions using Stripe Connect.


*Steps*:

# Log into Stripe with [tutorwiseapp@gmail.com|mailto:tutorwiseapp@gmail.com].
# Enable Stripe Connect in Express mode and obtain test keys.
# Add test keys (STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY) to .env.local.
# Test the Vinite payment API endpoint (/api/payments) using curl.
# Stub a referral_fee field in the payment API response.
# Verify webhook logs for a test transaction in Stripe dashboard.

*Acceptance Criteria*:

* Stripe Connect enabled with test keys in .env.local.
* Vinite payment API endpoint responds successfully.
* Webhook logs a test transaction in Stripe dashboard.

## Links
- [View in Jira](https://tutorwise.atlassian.net/browse/TUTOR-13)

---
*Auto-generated from Jira on 2025-09-26T05:45:54.823Z*
