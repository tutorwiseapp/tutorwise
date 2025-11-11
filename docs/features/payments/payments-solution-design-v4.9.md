# payments-solution-design-v4.9

### **payments-solution-design-v4.9**

**Prompt:** *Analyse my proposed solution in* `payments-solution-design-v4.9.md`*. Review and propose a solution that is functional, reliable, align to the standard dashboard Hub UI/UX and* `design-system.md`*. Implement and integrate with the application existing features/files for viral growth. Ask me any questions.*

- **Version:** 4.9
- **Date:** 2025-11-11
- **Status:** For Implementation
- **Owner:** Senior Architect
- **Prerequisite:** v3.6 (Bookings & Financials), v4.7 (Account Hub), v4.8 (Public Profile)

* * *

### 1.0 Executive Summary

This document details a significant refactor and enhancement of the platform's financial infrastructure. The `v4.9` payments module is a critical step toward creating a robust, full-featured, and compliant marketplace economy.

This design addresses five core objectives:

1. **UI/UX Refactor: Enhance the existing** `/financials` **hub** (`apps/web/src/app/(authenticated)/financials/page.tsx`) by adopting the "Sub-nav" layout seen in `image_e80450.png`. This creates new pages for `Transactions`, `Payouts`, and `Disputes` under the main `[Financials]` sidebar link.
2. **Consolidation:** **Deprecate the standalone** `/payments` **pages** (e.g., `apps/web/src/app/payments/page.tsx`). This functionality is consolidated into the `/financials` hub as the "P2P Wallet Transfer" widget.
3. **Architectural Robustness:** Implement critical backend enhancements, including **Idempotency**, **Dynamic Clearing Periods**, and a **Dead-Letter Queue (DLQ)**.
4. **Complex Payment Flows:** Introduce a **3-Way and 4-Way Split** logic to support the new "Agent-Led" booking model (Platform/Agent/Tutor) and correctly handle referral commissions on top of it.
5. **Compliance & "Unhappy Path":** Add the essential, overlooked "unhappy path" and compliance features: **Stripe Chargeback (Dispute) Handling**, **Refund Processing**, and **Tax Compliance** integration.

This design extends our existing Stripe Connect architecture and atomic RPC pattern.

* * *

### 2.0 UI/UX Refactor: The Unified Financials Hub

This solution **enhances the existing** `/financials` **hub** (`apps/web/src/app/(authenticated)/financials/page.tsx`), refactoring it into a multi-page section within the unified authenticated layout. This aligns with the "Sub-nav" UI pattern shown in `image_e80450.png`.

The `[Financials]` link in the `AppSidebar` will now function as a dropdown, revealing three distinct pages:

- `apps/web/src/app/(authenticated)/financials/transactions/page.tsx` (The default view)
- `apps/web/src/app/(authenticated)/financials/payouts/page.tsx`
- `apps/web/src/app/(authenticated)/financials/disputes/page.tsx`

The standalone `/payments` pages are deprecated. Their P2P transfer functionality is moved into the `[SendPaymentWidget]` located in the `ContextualSidebar` on all `/financials` pages.

#### **ASCII Diagram 1:** `[Transactions]` **Page (**`/financials/transactions`**)**

This is the default page, replicating the v3.6/`image_e8cfbe.png` "Filter-First" UI but with new v4.9 statuses.

```
+---------------------------+------------------------------------------+-------------------------+
| [AppSidebar]              | [Main Content: /financials/transactions] | [ContextualSidebar]     |
| (v4.7 Layout)             |                                          | (v4.7 Layout)           |
|---------------------------|------------------------------------------|-------------------------|
| O Dashboard               | <PageHeader title="Transactions" />      | +-[TaxComplianceWidget]-+
| O Bookings                | <p>View your transaction history...<p>   | | [!] Complete Tax Forms |
| O Network                 |                                          | +-----------------------+
| O Listings                | ---------------------------------------- | +-[WalletBalanceWidget]-+
| O Reviews                 | [SECONDARY TABS (Transaction Statuses)]  | | AVAILABLE FOR PAYOUT  |
| V [Financials]  <--ACTIVE |                                          | | £1,250.00             |
|   O [Transactions] <--SUB | ( [ All ] ) [ Clearing ] [ Available ]   | +-----------------------+
|   O [Payouts]             | [ Paid Out ] [ Disputed ] [ Refunded ]   | +-[PendingBalanceWidget]+
|   O [Disputes]            |                                          | | PENDING (IN CLEARING) |
|                           | ---------------------------------------- | | £350.00               |
| O Account                 | +-[TransactionCard]--------------------+ | +-----------------------+
| |                         | | Booking: Math Session    +£70.00     | | +-[PayoutActionsWidget]-+
| |                         | | Status: [Available]                  | | | [Manage Stripe Acct]  |
| |                         | +--------------------------------------+ | | [Request Payout]      |
| |                         | +-[TransactionCard]--------------------+ | +-----------------------+
| |                         | | P2P Transfer to J. Doe   -£50.00     | | +-[SendPaymentWidget]-+
| |                         | | Status: [Paid Out]                   | | | [Send a Payment]      |
| |                         | +--------------------------------------+ | +-----------------------+
+---------------------------+------------------------------------------+-------------------------+

```

#### **ASCII Diagram 2:** `[Payouts]` **Page (**`/financials/payouts`**)**

This page manages payout requests (withdrawals) from the wallet to the user's bank.

```
+---------------------------+------------------------------------------+-------------------------+
| [AppSidebar]              | [Main Content: /financials/payouts]      | [ContextualSidebar]     |
| (v4.7 Layout)             |                                          | (v4.7 Layout)           |
|---------------------------|------------------------------------------|-------------------------|
| O Dashboard               | <PageHeader title="Payouts" />           | +-[TaxComplianceWidget]-+
| O Bookings                | <p>Manage your payouts...<p>             | | [!] Complete Tax Forms |
| O Network                 |                                          | +-----------------------+
| O Listings                | ---------------------------------------- | +-[WalletBalanceWidget]-+
| O Reviews                 | [SECONDARY TABS (Payout Statuses)]       | | AVAILABLE FOR PAYOUT  |
| V [Financials]  <--ACTIVE |                                          | | £1,250.00             |
|   O [Transactions]        | ( [ All ] ) [ Pending ] [ In Transit ]   | +-----------------------+
|   O [Payouts]   <--SUB    | [ Paid ] [ Failed ]                      | +-[PayoutActionsWidget]-+
|   O [Disputes]            |                                          | | [Manage Stripe Acct]  |
|                           | ---------------------------------------- | | [Request Payout]      |
| O Account                 | +-[PayoutRequestCard]------------------+ | +-----------------------+
| |                         | | Payout to Barclays...      -£1000.00 | | +-[SendPaymentWidget]-+
| |                         | | Status: [Paid]                       | | | [Send a Payment]      |
| |                         | +--------------------------------------+ | +-----------------------+
| |                         | +-[PayoutRequestCard]------------------+ |                         |
| |                         | | Payout to Barclays...       -£250.00 | |                         |
| |                         | | Status: [In Transit]                 | |                         |
| |                         | +--------------------------------------+ |                         |
+---------------------------+------------------------------------------+-------------------------+

```

#### **ASCII Diagram 3:** `[Disputes]` **Page (**`/financials/disputes`**)**

This page is for managing client chargebacks and requires clear, time-sensitive actions.

```
+---------------------------+------------------------------------------+-------------------------+
| [AppSidebar]              | [Main Content: /financials/disputes]     | [ContextualSidebar]     |
| (v4.7 Layout)             |                                          | (v4.7 Layout)           |
|---------------------------|------------------------------------------|-------------------------|
| O Dashboard               | <PageHeader title="Disputes" />          | +-[TaxComplianceWidget]-+
| O Bookings                | <p>Review and respond to chargebacks...<p>| | ...                     |
| O Network                 |                                          | +-----------------------+
| O Listings                | ---------------------------------------- | +-[WalletBalanceWidget]-+
| O Reviews                 | [SECONDARY TABS (Dispute Statuses)]      | | ...                     |
| V [Financials]  <--ACTIVE |                                          | +-----------------------+
|   O [Transactions]        | [ All ] [ Action Required (1) ]          | +-[PendingBalanceWidget]+
|   O [Payouts]             | [ Under Review ] [ Won ] [ Lost ]        | | ...                     |
|   O [Disputes]  <--SUB    |                                          | +-----------------------+
|                           | ---------------------------------------- | +-[PayoutActionsWidget]-+
| O Account                 | +-[DisputeCard]------------------------+ | | ...                     |
| |                         | | Booking: Physics Session   -£75.00   | | +-----------------------+
| |                         | | Status: [Action Required]            | | +-[SendPaymentWidget]-+
| |                         | | Respond by: 2025-11-18               | | | ...                     |
| |                         | | [Submit Evidence] (Button)           | | +-----------------------+
| |                         | +--------------------------------------+ |                         |
+---------------------------+------------------------------------------+-------------------------+

```

#### 2.1 Asynchronous Booking Success UX

To handle the delay between a user paying and the webhook confirming the payment, we will implement a transitional success page.

- **Success URL:** The `create-booking-checkout` API will be configured with a `success_url: '/bookings/[booking_id]/success'`.
- **New Page:** `apps/web/src/app/(authenticated)/bookings/[id]/success/page.tsx`
- **Logic:**
  1. The page loads and displays a "Processing your booking..." message.
  2. It polls a new lightweight API (`GET /api/bookings/[id]/status`) every 2 seconds.
  3. When the webhook lands and the RPC flips the booking status to `paid`, the API returns "success".
  4. The page then transitions to a "Success! Your booking is confirmed." state.

* * *

### 3.0 Architectural Robustness Enhancements

The following backend systems will be implemented for financial integrity.

#### 3.1 Idempotent Webhook Handling

To prevent duplicate transactions from Stripe webhook retries, our handler must be idempotent.

- **Database:** A new column `stripe_checkout_id` (TEXT) with a `UNIQUE` constraint will be added to the `bookings` table.
- **API:** `POST /api/webhooks/stripe/route.ts` will pass the `session.id` to the RPC.
- **RPC:** `create_payment_and_transactions` will be modified.
  - **New Logic:** Before executing, it will `SELECT 1 FROM bookings WHERE stripe_checkout_id = p_stripe_checkout_id`. If a booking exists, the function will immediately return `success` without running any logic.

#### 3.2 Dynamic Payout Clearing Period

To mitigate chargeback risk, we will implement a dynamic clearing period tied to service completion and user trust.

- **Database:** A new column `available_at` (TIMESTAMPTZ) will be added to the `transactions` table. A new `status` column will be added (see section 6.1).
- **RPC:** The `create_payment_and_transactions` RPC will be modified to calculate this timestamp.
  - **Logic:** It will calculate `v_available_timestamp` based on the booking's `service_end_time` and the seller's trust status (e.g., 3-7 days for new sellers vs. 24 hours for trusted sellers).
- **UI:** The `WalletBalanceWidget` will be powered by a new RPC `get_available_balance(p_profile_id)` that only sums transactions where `status = 'available'` AND `available_at <= NOW()`.

#### 3.3 Webhook Dead-Letter Queue (DLQ)

To catch and manually review webhook events that fail permanently, we will create a DLQ.

- **Database:** A new table `failed_webhooks` will be created to store the `event_id`, `status`, `error_message`, and the full JSON `payload` of the failed event.
- **API:** The `POST /api/webhooks/stripe/route.ts` handler will be wrapped in a `try/catch` block. On failure, it will log the error to our new `failed_webhooks` table and return a `200 OK` to Stripe to prevent retries.

* * *

### 4.0 New Feature: 3-Way & 4-Way Payment Splits

This extends the existing referral commission logic to support the new Agent-led business model.

- **Flow 1 (3-Way Split):** Client pays 100% ➔ Platform (10%) + Agent (20%) + Tutor (70%).
- **Flow 2 (4-Way Split):** *Referred* Client pays 100% ➔ Platform (10%) + Agent (20%) + **Referring Agent (10%)** + Tutor (60%).
- **Implementation:**
  1. **Checkout:** The `create-booking-checkout` API metadata *must* include `agent_id` and `tutor_id` for agent-led bookings. The `client_id` is already included.
  2. **RPC:** The `create_payment_and_transactions` RPC will be refactored. It will first check for a referrer, then check for an agent split, allowing it to handle all combinations.
```
SQL
```
```
-- Simplified Logic in create_payment_and_transactions RPC
-- 1. Get client's referring_agent_id
SELECT referred_by_agent_id INTO v_referring_agent_id FROM profiles WHERE id = p_client_id;
v_remaining_amount := p_amount;
v_platform_fee := p_amount * 0.10;
-- ... create platform fee txn ...
v_remaining_amount := v_remaining_amount - v_platform_fee;
-- 2. Check for Referring Agent (and ensure they aren't the Agent or Tutor)
IF v_referring_agent_id IS NOT NULL AND v_referring_agent_id NOT IN (p_agent_id, p_tutor_id) THEN
  v_referral_commission := p_amount * 0.10; -- 10% lifetime commission
  -- ... create referral commission txn for v_referring_agent_id ...
  v_remaining_amount := v_remaining_amount - v_referral_commission;
END IF;
-- 3. Check for Agent-Led Split
IF p_agent_id IS NOT NULL AND p_tutor_id IS NOT NULL THEN
  -- 4-Way or 3-Way Split
  v_agent_commission := p_amount * 0.20; -- Agent takes 20%
  -- ... create agent commission txn for p_agent_id ...
  v_remaining_amount := v_remaining_amount - v_agent_commission;
  -- ... create tutor payout txn for p_tutor_id with v_remaining_amount ...
ELSE
  -- Standard 2-Way or 3-Way Split (No Agent)
  -- ... create tutor payout txn for p_listing_owner_id with v_remaining_amount ...
END IF;
```

* * *

### 5.0 New Feature: P2P Wallet Transfers

This feature allows users to pay each other *internally* from their available wallet balance, replacing the old `/payments` page functionality.

- **UI:** A `[SendPaymentWidget]` in the `/financials` hub sidebar (see Section 2.0 ASCII) opens a modal.
- **API:** A new secure API route: `POST /api/financials/transfer`. It takes `receiver_id`, `amount`, and `reason`.
- **RPC:** The API calls a new atomic RPC: `create_wallet_transfer(p_sender_id UUID, p_receiver_id UUID, p_amount NUMERIC, p_reason TEXT)`.
  - **Logic:** This RPC MUST be atomic (run in a transaction).
    1. Check `get_available_balance(p_sender_id)`.
    2. If balance is insufficient, `RAISE EXCEPTION 'Insufficient funds'`.
    3. `INSERT` a **debit** transaction (`-p_amount`) for the sender, `status = 'available'`.
    4. `INSERT` a **credit** transaction (`p_amount`) for the receiver, `status = 'available'`.

* * *

### 6.0 New Feature: Dispute & Refund Handling ("Unhappy Path")

This section adds the critical processes for managing failed or reversed transactions.

#### 6.1 Chargeback & Dispute Handling

- **Webhook:** A new secured webhook handler at `apps/web/src/app/api/webhooks/stripe/disputes/route.ts` will listen for `charge.dispute.created`.
- **RPC:** The handler will call a new atomic RPC: `handle_dispute_created(p_charge_id TEXT, p_dispute_amount NUMERIC)`.
- **RPC Logic:**
  1. Find the `booking_id` associated with the `p_charge_id`.
  2. Update the `status` of all transactions (Tutor, Agent, Referrer, Platform) for that `booking_id` from `available` to `disputed`.
  3. Create a new **debit** transaction (e.g., `-100.00`) in the seller's (Tutor/Agent's) wallet for the `p_dispute_amount`. This immediately corrects their available balance.
- **UI:** The new `[Disputes]` page (`/financials/disputes`) will list transactions with `status = 'disputed'` and allow users to submit evidence.

#### 6.2 Refund Processing (Full & Partial)

- **API:** A new admin-only API route: `POST /api/financials/refunds`.
- **Payload:** `{ "booking_id": "...", "amount": 50.00, "reason": "..." }`.
- **RPC:** The API calls a new RPC: `create_refund(p_booking_id UUID, p_refund_amount NUMERIC, p_reason TEXT)`.
- **RPC Logic:**
  1. Call the Stripe API to issue the refund against the original charge.
  2. Atomically create a set of *reversal* (negative) transactions in the `transactions` table. It will proportionally debit the wallets of the Tutor, Agent, and Platform that originally earned from that booking, ensuring the ledger remains balanced.
  3. Set the `status` of these new transactions to `refunded`.

* * *

### 7.0 New Feature: Tax Compliance

This feature is a legal and financial requirement for operating a marketplace.

- **Logic:** We will leverage Stripe Connect to handle all 1099-K (US) and equivalent tax form collection. Our system will not store sensitive tax information.
- **UI:** A new `[TaxComplianceWidget]` will be added to the `/financials` hub sidebar.
  - This component will call our `GET /api/stripe/get-connect-account` route.
  - It will check the `tax_info_status` (or equivalent) field from the Stripe Connect account object.
  - If status is `pending` or `required`, it will display a prominent "Action Required: Please complete your tax forms to continue receiving payouts" banner with a link to their Stripe Connect portal.

* * *

### 8.0 New Database Migrations (v4.9)

The following migrations must be created in `apps/api/migrations/` to support this design:

- `055_add_stripe_id_to_bookings.sql`**:** Adds `stripe_checkout_id TEXT` to the `bookings` table with a `UNIQUE` constraint (for Idempotency).
- `056_add_transaction_status.sql`**:**
  - Creates a new enum: `CREATE TYPE transaction_status AS ENUM ('clearing', 'available', 'paid_out', 'disputed', 'refunded');`
  - Adds `available_at TIMESTAMPTZ` to the `transactions` table (for Clearing Period).
  - Adds `status transaction_status DEFAULT 'clearing'` to the `transactions` table (for Disputes/Refunds).
- `057_create_failed_webhooks_table.sql`**:** Creates the `failed_webhooks` table (DLQ) with columns `id`, `event_id`, `status`, `error_message`, `payload`, `created_at`.
- `058_create_wallet_transfer_rpc.sql`**:** Creates the new `create_wallet_transfer(p_sender_id, p_receiver_id, p_amount, p_reason)` RPC and the `get_available_balance(p_profile_id)` helper function.
- `059_update_payment_webhook_rpc_v4_9.sql`**:** Modifies the existing `create_payment_and_transactions` RPC to include:
  1. The idempotency check (using `stripe_checkout_id`).
  2. The `available_at` and `status` calculation.
  3. The new 3-Way/4-Way split logic (checking for both referrer and agent).
- `060_create_dispute_handling_rpc.sql`**:** Creates the new `handle_dispute_created(p_charge_id, p_dispute_amount)` RPC.
- `061_create_refund_rpc.sql`**:** Creates the new `create_refund(p_booking_id, p_refund_amount, p_reason)` RPC.