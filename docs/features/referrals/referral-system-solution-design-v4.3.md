# referral-system-solution-design-v4.3

referral-system-solution-design-v4.3

### **Solution Design: Advanced Referral System (v4.3)**

- **Version:** 4.3 (Extends v3.6, v4.0, v4.1)
- **Date:** 2025-11-06
- **Status:** For Implementation
- **Owner:** AI Analysis

### 1.0 Executive Summary

This document details the architecture for the `tutorwise` Advanced Referral System. This design extends the foundational "Lifetime Attribution" model from `SDD v3.6` to support two distinct, parallel referral workflows, solving both online B2C (Business-to-Consumer) and offline B2B (Business-to-Business) use cases.

1. **Workflow 1: "Agent-Led" Model (Online):** This is the primary "anyone (user) can refer anything (profile or listing)" workflow. It leverages the existing `Refer & Earn` button to allow any user (Client, Tutor, or Agent) to generate a tracked link for any page and earn a commission. This model is already 99% complete and requires no new backend code.
2. **Workflow 2: "Tutor-Led" Model (Offline):** This is a new, opt-in feature that solves the "brochure in a store" paradox. It allows a Tutor (e.g., Jane) to print *one* generic QR code on all her brochures, but then "delegate" the commission from that specific listing to an Agent partner (e.g., Store Owner Bob) via a new setting in the "Create Listing" form.

This dual-system model provides maximum flexibility, is practical for real-world business partnerships, and is built directly on top of the powerful, automated payment and attribution logic already specified in `SDD v3.6`.

### 2.0 Foundational Changes (Prerequisites)

Based on our analysis, we will implement two high-level changes to enhance the core referral experience.

#### 2.1 Approved: Adopt Secure Short-Code Format

To ensure the referral system is secure, user-friendly, and future-proof (for potential `vinite` integration), we will replace the `FIRSTNAME-123` format.

- **Change:** The `handle_new_user` trigger (`apps/api/migrations/029_update_handle_new_user_trigger_v3_6.sql`) will be modified.
- **New Logic:** Upon user creation, the trigger will generate a 6-8 character, random, URL-safe **Secure Short-Code** (e.g., `kRz7Bq`, `jAnE7kL`) and store it in the `profiles.referral_code` column. This code is globally unique and impossible to guess, yet short enough to be typed from a brochure.

#### 2.2 Approved: Add `vinite`\-style UI to Onboarding

To equip users immediately, we will surface the new referral assets at the end of the onboarding process.

- **File to Modify:** `apps/web/src/app/components/onboarding/steps/CompletionStep.tsx`.
- **New Feature:** This page will be enhanced to a "Launchpad." It will display a new `<ReferralAssetWidget>` to the user.
- **Widget Content:** This widget will read the user's new `profile.referral_code` (e.g., `kRz7Bq`) and display their three core referral assets (the "vinite-style" UI):
  1. **Referral Link:** `tutorwise.com/a/kRz7Bq` \[Copy\]
  2. **Referral QR Code:**
- ![Image of QR code](https://tutorwise.atlassian.net/wiki/download/attachments/30834689/licensed-image%3Fq=tbn:ANd9GcQQqzSEhdzAkn-XiU4pzEPd2ia5tgmyRMVmN3Uc0aRz1XSr-Bgbqsh2WjvTbPbYfABWKeaND2QNwWQU2VkTQfhye0ctGltRSFrkVKzRHUGeko_G7OA?api=v2)

\[Copy\]

3. Embed Snippet: <a href="...">...</a> \[Copy\]

Refer to the vinite web page for info [https://www.vinite.com](https://www.vinite.com)

Refer to the vinite repo for the source code [https://github.com/viniteapp/vinite](https://github.com/viniteapp/vinite)

- `src/app/api/links/route.ts` is the backend file that **generates the referral link record** in the database. It is a server-side API endpoint that receives a `destinationUrl` and `agentId`, then inserts them into the `referrals` table.
- `src/app/refer/page.tsx` is just the public-facing marketing page that *describes* the Vinite service; it does not generate any links itself.

![image-20251106-153804.png](https://tutorwise.atlassian.net/wiki/download/attachments/30834689/image-20251106-153804.png?api=v2)

- **User Impact:** This gives a Tutor (Jane) her generic QR code, which she can use for her mass-printed brochures.

* * *

### 3.0 Workflow 1: The "Agent-Led" Model (Online B2C/C2C)

This model covers the primary "anyone refers anything" use case, including Client-to-Client and Tutor-to-Tutor referrals. **This workflow is already supported by existing assets and requires no new development.**

#### 3.1 Specification

This workflow is triggered by the user (the "Agent") *actively* generating a specific link.

1. **Action (Refer):** Any logged-in user (Client Cathy, Agent Bob, or Tutor Jane) navigates to any public listing or profile page (e.g., Mark's listing).
2. They click the `Refer & Earn` button located in the `<ActionCard>`.
3. **Result (Link):** The system generates a unique, tracked URL that combines the *agent's* code with a redirect to the *current page*.
  - **Example Link:** `tutorwise.com/a/cAtHy7bZ?redirect=/listings/[marks-id]`
4. **Process (Sign Up & Convert):** A new user (John) clicks this link. The *existing* `SDD v3.6` backend handles the entire flow automatically:
  - `apps/web/src/app/a/[referral_id]/route.ts` sets the cookie for **Cathy**.
  - `handle_new_user` trigger stamps John's profile: `referred_by_profile_id: [CATHY'S ID]`.
  - `handle_successful_payment` RPC executes the 80/10/10 split and pays the 10% commission to **Cathy**.

* * *

### 4.0 Workflow 2: The "Tutor-Led" Model (Offline B2B)

This new, opt-in workflow solves the "brochure in 50 stores" problem. It allows a Tutor to use *one* QR code but *delegate* the commission to a partner.

#### 4.1 Phase 1: Database (Add 1 Column)

We add a single, nullable foreign key to the `listings` table.

- **File to Create:** `apps/api/migrations/033_add_listing_commission_delegation.sql`
- **Logic:**
```
SQL
```
```
-- Add a column to the listings table to delegate its commission
ALTER TABLE public.listings
ADD COLUMN delegate_commission_to_profile_id UUID
    REFERENCES public.profiles(id)
    ON DELETE SET NULL;
-- Create an index for fast lookups
CREATE INDEX idx_listings_delegate_commission_to
ON public.listings(delegate_commission_to_profile_id);
-- Add a comment
COMMENT ON COLUMN public.listings.delegate_commission_to_profile_id IS
'The profile ID of the user (e.g., an Agent) who should receive any referral commissions generated *by this specific listing*. If NULL, the listing owner (Tutor) receives the commission.';
```

#### 4.2 Phase 2: Frontend (Add 1 Form Section)

We add a new, optional `<FormSection>` card to the existing dynamic "Create Listing" form.

- **File to Modify:** `apps/web/src/app/components/listings/wizard-steps/CreateListings.tsx`.
- **New Feature:** Add a new `<Card>` titled **"Referral Partner (Optional)"**. This card will only be visible to `tutor` or `agent` roles.
- **UI Logic:**
  1. The card contains a `<Select>` component: "Delegate Commissions for this Listing".
  2. This dropdown is populated by a list of the user's "Connections" (other `tutor` and `agent` users they have `Connect`ed with via their public profiles).
  3. The options will be:
    - "No delegation (Pay me)" (default, value is `null`)
    - "Bob's Store (`bObScOdE`)" (value is `[BOB'S ID]`)
    - "Coffee Shop (`cAfEcOdE`)" (value is `[CAFE'S ID]`)
  4. When the Tutor (Jane) saves her listing, this `delegate_commission_to_profile_id` is saved.

#### 4.3 Phase 3: Backend (Refine 1 Function)

This is the final, critical step. We add the "delegation check" to the existing payment RPC to make it "delegation-aware."

- **File to Modify:** `apps/api/migrations/030_create_payment_webhook_rpc.sql` (or a new migration file that runs `CREATE OR REPLACE FUNCTION`).
- **Function:** `public.handle_successful_payment(p_booking_id UUID)`
- **Refined v4.3 Logic:**
```
SQL
```
```
-- (Inside function)
-- ... (v_booking is fetched) ...
-- 1. Get all key IDs
v_direct_referrer_id := v_booking.referrer_profile_id; -- The ID from the user's cookie (e.g., Jane)
SELECT profile_id, delegate_commission_to_profile_id
INTO v_listing_owner_id, v_listing_delegation_id
FROM public.listings
WHERE id = v_booking.listing_id;
-- 2. Set the default recipient
v_final_commission_recipient_id := v_direct_referrer_id;
-- 3. Run the new Delegation Check (Refined v4.2.1)
-- This rule ensures delegation *only* happens when the listing owner is also the agent.
IF v_listing_delegation_id IS NOT NULL AND v_direct_referrer_id = v_listing_owner_id THEN
  -- This is the "Brochure" use case.
  -- The agent was Jane AND she delegated this listing's commission to Bob.
  -- Override the recipient to pay the Agent (Bob).
  v_final_commission_recipient_id := v_listing_delegation_id;
END IF;
-- 4. Pay the final recipient
-- ...
IF v_final_commission_recipient_id IS NOT NULL THEN
  -- ... (calculate 80/10/10 split) ...
  -- This INSERT now pays the correct person (Jane, Cathy, or Bob)
  INSERT INTO public.transactions
    (profile_id, booking_id, type, description, status, amount)
  VALUES
    (v_final_commission_recipient_id, p_booking_id, 'Referral Commission', ...);
-- ... (rest of function) ...
```

* * *

### 5.0 Test Scenarios & Use Cases (Validation)

This combined `v4.3` system is now tested against all key use cases.

#### The Actors:

- **Jane (Tutor):** `referral_code: jAnE7kL`. Owns `listing-JANE`.
- **Bob (Agent):** `referral_code: bObScOdE`. (The Store Owner).
- **Cathy (Client):** `referral_code: cAtHy7bZ`.
- **John (New User):** No account.

|     |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- |
| **Scenario** | **Use Case** | **Setup** | **agent** | **Payout Logic** | **Final Recipient** | **Status** |
| **1: C2C Online** | **Cathy (Client)** refers **John** to **Jane's** listing. | `listing-JANE` has `delegate_commission_to_profile_id = NULL`. | **Cathy** (via `Refer & Earn` button) | `IF (NULL AND [CATHY] = [JANE])` is **FALSE**.<br><br>Pay Direct agent. | **Cathy** | ✅ **PASS** |
| **2: T2C Online** | **Jane (Tutor)** refers **John** to **Mark's** listing. | `listing-MARK` has `delegate_commission_to_profile_id = NULL`. | **Jane** (via `Refer & Earn` button) | `IF (NULL AND [JANE] = [MARK])` is **FALSE**.<br><br>Pay Direct agent. | **Jane** | ✅ **PASS** |
| **3: B2B Offline** (The "Brochure") | **Jane (Tutor)** refers **John** using her *own* brochure from **Bob's** store. | `listing-JANE` has `delegate_commission_to_profile_id = [BOB'S ID]`. | **Jane** (via her generic `.../a/jAnE7kL` QR code) | `IF ([BOB'S ID] AND [JANE] = [JANE])` is **TRUE**.<br><br>Pay Delegate. | **Bob** | ✅ **PASS** |
| **4: Conflict Test** | **Cathy (Client)** refers **John** to **Jane's** listing (which is delegated to Bob). | `listing-JANE` has `delegate_commission_to_profile_id = [BOB'S ID]`. | **Cathy** (via `Refer & Earn` button) | `IF ([BOB'S ID] AND [CATHY] = [JANE])` is **FALSE**.<br><br>Pay Direct agent. | **Cathy** | ✅ **PASS** |

### 6.0 Conclusion

This `v4.3` design is a robust, minimal, and practical enhancement. It formally adopts the superior **Secure Short-Code** format, enhances the **onboarding UI** to provide `vinite`\-style assets, and implements a lightweight **Commission Delegation** feature.

This successfully supports both the primary "Agent-Led" (online) referral model and the scalable "Tutor-Led" (offline) model without conflict, leveraging the entire existing `SDD v3.6/v4.0/v4.1` architecture.