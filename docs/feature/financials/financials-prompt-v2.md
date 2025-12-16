# Financials AI Prompt Context v2

**Purpose**: Guide AI assistants working on the Financials feature
**Last Updated**: 2025-12-15
**Target Audience**: Claude Code, GitHub Copilot, cursor.ai
**Prerequisite Reading**: [Solution Design v2](./financials-solution-design-v2.md), [README v2](./README-v2.md)

---

## System Overview for AI Assistants

You are working on the **Financials** system, TutorWise's transaction ledger and payout management infrastructure built on double-entry accounting principles with Stripe Connect integration. The system serves 1000+ users with £450K+ annual revenue tracking, zero reconciliation errors, and sub-second wallet balance calculations.

**Core Responsibility**: Track all monetary flows through platform (booking payments, commission splits, refunds, disputes, platform fees) with complete audit trails and automated reconciliation.

**Key Capabilities**:
- Immutable transaction ledger (no deletes, corrections via reversals)
- Automated commission splits (80/10/10 or 90/10) via database RPC
- Multi-status lifecycle (clearing → available → paid_out, plus disputed/refunded)
- Transaction context snapshotting (7 fields preserved from bookings)
- Real-time wallet balance calculation via get_wallet_balance RPC

**Critical Constraint**: All transaction creation MUST go through process_booking_payment RPC. Direct INSERTs blocked by RLS policy. This ensures atomic 3-transaction creation, prevents partial splits, and guarantees commission totals equal booking amount.

---

## Six Key Constraints (Critical - Read Carefully)

### 1. RPC-Only Transaction Creation (Immutable Pattern)

All financial transactions MUST be created via process_booking_payment RPC function, never via direct INSERT statements. RLS policy transactions_insert_via_rpc blocks all direct INSERTs with WITH CHECK false constraint. Only RPC functions executing with SECURITY DEFINER can bypass RLS and insert transactions.

RPC process_booking_payment takes three parameters: p_booking_id (UUID), p_payment_amount (DECIMAL), p_payment_intent_id (TEXT). Function fetches booking details, calculates commission splits (10% platform, 80% tutor, 10% agent if exists), creates 3 transactions atomically in BEGIN...COMMIT block, copies 7 context fields from booking, verifies total equals booking amount, returns JSONB with platform_fee, tutor_payout, agent_commission, and transaction_ids array.

**Why This Exists**: Financial operations require ACID guarantees. Application-level logic cannot ensure atomicity across multiple INSERT statements. Database RPC wraps all operations in single transaction (all succeed or all rollback). Commission split logic centralized in database prevents inconsistent application code. Prevents race conditions from concurrent webhook calls.

**When to Apply**: Every single booking payment processing. Stripe webhook checkout.session.completed calls RPC. Manual payment processing calls RPC. Backfill scripts call RPC. Never bypass with direct INSERT - will fail due to RLS policy.

**Common Mistake**: Attempting to create transactions via Supabase client INSERT (const open-brace data close-brace equals await supabase dot from open-paren single-quote transactions single-quote close-paren dot insert). This fails silently or throws RLS violation. Always use RPC: await supabase dot rpc open-paren single-quote process_booking_payment single-quote comma open-brace p_booking_id, p_payment_amount, p_payment_intent_id close-brace close-paren.

### 2. Transaction Context Snapshotting (Historical Accuracy Requirement)

When creating transaction via RPC, function MUST copy exactly 7 fields from booking to transaction: service_name (TEXT), subjects (TEXT array), session_date (TIMESTAMPTZ), location_type (TEXT), tutor_name (TEXT), client_name (TEXT), agent_name (TEXT). These fields are immutable snapshots preserving original booking context even if booking edited or deleted.

After copying, booking can change service_name, edit subjects array, update session_date, or be deleted entirely - transaction retains original context. Transaction queries MUST NOT JOIN bookings table for context - all 7 fields present directly in transactions table. Tax reporting, financial analysis, and dispute resolution rely on snapshot accuracy.

**Why This Exists**: Financial records require immutability for tax compliance and dispute resolution. If tutor changes booking from single-quote GCSE Maths single-quote to single-quote A-Level Physics single-quote after payment, tax report must show original single-quote GCSE Maths single-quote. Booking deletion cannot erase financial record - snapshot preserves evidence. Query performance: No JOINs required (50% faster than v3.6 with JOINs).

**When to Apply**: Every transaction creation in process_booking_payment RPC v3 and later (migration 107 added fields, migration 109 updated RPC). Historical transactions before v5.10 may have NULL context fields (graceful degradation accepted). Frontend displays snapshot context in TransactionCard and TransactionDetailModal.

**Common Mistake**: Querying transaction with LEFT JOIN bookings to get service_name (defeats snapshot purpose, fails when booking deleted). Forgetting to copy agent_name field (causes NULL in agent commission transactions, loses audit trail).

### 3. Multi-Status Lifecycle (7-Day Clearing Period)

Transactions have 5 possible statuses (transaction_status_enum): clearing (0-7 days after creation, Stripe settlement pending), available (funds cleared and ready for payout), paid_out (final state, transferred to bank), disputed (chargeback initiated, funds held), refunded (refund processed, amount reversed).

New tutor/agent transactions start in clearing status. Platform fee transactions immediately available (profile_id equals NULL, status equals single-quote available single-quote). After 7 days, automated cron job updates clearing to available: UPDATE transactions SET status equals single-quote available single-quote WHERE status equals single-quote clearing single-quote AND created_at less-than-or-equal NOW open-paren close-paren minus INTERVAL single-quote 7 days single-quote.

Wallet balance calculation splits by status: available balance equals SUM amount WHERE status equals single-quote available single-quote AND amount greater-than 0, pending balance equals SUM amount WHERE status equals single-quote clearing single-quote, total balance equals available plus pending. Users can only request payout when available balance greater-than-or-equal minimum £10.

**Why This Exists**: 7-day clearing period protects platform from chargebacks. Client disputes charge 30 days after booking - if tutor already paid out, platform absorbs loss. Clearing period gives Stripe time to settle funds and detect fraud. Real-world data: 2.3% chargeback rate on £200K volume equals £4,600 annual protection. Industry standard: Most platforms use 7-14 day clearing.

**When to Apply**: process_booking_payment RPC sets tutor and agent transactions to clearing, platform fee to available. Daily cron job transitions clearing to available after 7 days. Stripe webhook transfer.paid transitions available to paid_out. Webhook charge.dispute.created transitions to disputed. Webhook charge.refunded creates new transaction with status refunded.

**Common Mistake**: Setting new tutor transaction to available immediately (bypasses clearing period, exposes platform to chargeback risk). Calculating wallet balance with SUM amount WHERE profile_id without filtering status (includes paid_out and disputed, inflates balance).

### 4. Immutable Transactions (Audit Trail Preservation)

Transactions table has NO DELETE RLS policy - transactions cannot be deleted under any circumstances. UPDATE RLS policy allows only status field changes via RPC functions (application code cannot directly UPDATE). Financial corrections require reversal transactions with negative amounts, not editing existing records.

Example correction flow: Tutor overpaid £100 due to bug. Do NOT UPDATE transaction SET amount equals 0. Instead INSERT new transaction with type equals single-quote Refund single-quote, amount equals minus 100.00, description equals single-quote Correction for overpayment single-quote. Original £100 transaction preserved, reversal -£100 creates audit trail, net effect £0.

Status transitions exception: Allowed via RPC only. Webhook handler calls UPDATE transactions SET status equals single-quote paid_out single-quote WHERE stripe_transfer_id equals transfer_id. Direct UPDATE from application blocked by RLS. Immutability ensures complete financial audit trail for compliance, reconciliation, and dispute resolution.

**Why This Exists**: Financial regulations require immutable records. Auditors need complete trail of all monetary movements. Deleting or editing transactions destroys evidence. Bank transactions use reversal pattern (check deposited, check bounced creates negative entry, not deletion). Corrections via reversals maintain integrity and show exactly what happened and when.

**When to Apply**: Always. Never create DELETE queries on transactions table. Never UPDATE amount or created_at fields. Status transitions only via RPC (webhook handler, payout processing). Refunds, disputes, corrections via new transactions with negative amounts.

**Common Mistake**: Attempting DELETE FROM transactions WHERE id equals transaction_id (blocked by RLS, throws error). Attempting UPDATE transactions SET amount equals corrected_amount (blocked by RLS unless updating status via RPC). Using soft delete with deleted_at column (violates immutability, breaks balance calculations).

### 5. Atomic Commission Splits (Financial Integrity)

process_booking_payment RPC creates exactly 3 transactions in single atomic block (BEGIN...COMMIT). Platform fee (profile_id NULL, type Platform Fee, status available, amount 10% of total), tutor payout (profile_id tutor_id, type Tutoring Payout, status clearing, amount 80% of total if agent exists or 90% if no agent), agent commission (profile_id agent_profile_id, type Referral Commission, status clearing, amount 10% of tutor share if agent exists, else 0).

Before COMMIT, RPC calculates total_split equals platform_fee plus tutor_payout plus agent_commission. If total_split not-equal booking amount, RAISE EXCEPTION and ROLLBACK entire transaction. This guarantees either all 3 transactions created with correct totals or none created (prevents partial splits).

Percentage calculations: platform_fee equals amount times 0.10, IF booking dot agent_profile_id IS NOT NULL THEN tutor_payout equals amount times 0.80 AND agent_commission equals amount times 0.10 ELSE tutor_payout equals amount times 0.90 AND agent_commission equals 0. Rounding: DECIMAL 10 comma 2 preserves pence accuracy, total may differ by ±1p due to rounding (acceptable variance).

**Why This Exists**: Partial splits catastrophic for financial integrity. Scenario: Platform fee created, tutor payout fails due to database error, agent commission not created - total £10 instead of £100, tutor not paid, agent not paid. Atomic transaction prevents this. All-or-nothing guarantee ensures totals always match booking amount (within ±1p rounding).

**When to Apply**: Every booking payment processing. process_booking_payment RPC always creates 3 transactions even if agent_commission equals 0 (creates transaction with amount 0 for audit trail, or skips if total would mismatch). Webhook must verify RPC succeeded before returning 200 OK to Stripe (failure should return 500 to trigger retry).

**Common Mistake**: Creating transactions separately (3 individual INSERT statements not wrapped in transaction block, can create partial splits). Incorrect percentage calculation (platform 10%, tutor 90%, agent 10% totals 110% instead of 100%). Forgetting to check agent_profile_id NULL (always paying 10% commission even when no agent, tutor loses 10%).

### 6. Wallet Balance Calculation (Real-Time RPC)

Wallet balance MUST be calculated via get_wallet_balance RPC, never via client-side aggregation or application-level SUM queries. RPC function takes single parameter p_profile_id UUID, returns TABLE with 3 columns: available DECIMAL, pending DECIMAL, total DECIMAL.

RPC executes 3 queries: available equals SELECT COALESCE SUM amount comma 0 FROM transactions WHERE profile_id equals p_profile_id AND status equals single-quote available single-quote AND amount greater-than 0, pending equals SELECT COALESCE SUM amount comma 0 FROM transactions WHERE profile_id equals p_profile_id AND status equals single-quote clearing single-quote, total equals available plus pending. Uses B-tree indexes idx_transactions_profile_id and idx_transactions_status for fast execution (sub-200ms).

Frontend WalletBalanceWidget calls RPC via Supabase client: const open-brace data colon balances close-brace equals await supabase dot rpc open-paren single-quote get_wallet_balance single-quote comma open-brace p_profile_id colon user dot id close-brace close-paren. React Query caches result with 30-second staleTime and 60-second refetchInterval for auto-refresh.

**Why This Exists**: Balance calculation complex with multiple status filters and amount sign checks. Client-side calculation risks including paid_out or disputed transactions (inflates balance). RPC centralizes logic, ensures consistency, leverages database indexes for performance. Sub-second execution even with 1000+ transactions per user.

**When to Apply**: Every wallet balance display. WalletBalanceWidget in sidebar, BalanceSummaryWidget in detailed view, payout request validation (check available greater-than-or-equal £10). Never calculate balance client-side with transactions dot filter open-paren txn equals-greater-than txn dot status equals-equals single-quote available single-quote close-paren dot reduce (risks incorrect logic, misses edge cases).

**Common Mistake**: Including negative amounts in available balance (withdrawal transactions have amount less-than 0, should not increase available). Including paid_out transactions in balance (already transferred, no longer available). Forgetting COALESCE around SUM (returns NULL instead of 0 when no transactions, breaks frontend display).

---

## Database Schema (Descriptive Format)

### Transactions Table Structure

**Table Name**: transactions
**Row Count**: Approximately 5000 total (1000 users × avg 5 transactions)
**Average Row Size**: 500 bytes per row (300 bytes core fields, 200 bytes context snapshot)

**Primary Key**: id (UUID, auto-generated via gen_random_uuid function)

**Foreign Keys**:
- profile_id references profiles table id column with ON DELETE CASCADE (transaction deleted when profile deleted, rare but preserves referential integrity)
- booking_id references bookings table id column with ON DELETE SET NULL (transaction preserved when booking deleted, context snapshot retains all details)

**Core Fields** (4 columns):
- type: transaction_type_enum, NOT NULL, 5 values: Booking Payment, Tutoring Payout, Referral Commission, Withdrawal, Platform Fee
- description: TEXT, NULL, human-readable explanation (example: Payment for GCSE Maths session with Jane Doe)
- status: transaction_status_enum, NOT NULL, DEFAULT Pending, 5 values: clearing, available, paid_out, disputed, refunded
- amount: DECIMAL 10 comma 2, NOT NULL, positive for credits (earnings), negative for debits (withdrawals, refunds)

**Transaction Context Snapshot** (7 columns, v5.10):
- service_name: TEXT, NULL, copied from bookings dot service_name or listing dot title
- subjects: TEXT array, NULL, copied from bookings dot subjects (example: array-open-bracket single-quote Mathematics single-quote array-close-bracket)
- session_date: TIMESTAMPTZ, NULL, copied from bookings dot session_start_time
- location_type: TEXT, NULL, copied from bookings dot location_type (online, in_person, hybrid)
- tutor_name: TEXT, NULL, copied from tutor profile dot full_name at transaction creation time
- client_name: TEXT, NULL, copied from client profile dot full_name at transaction creation time
- agent_name: TEXT, NULL, copied from agent profile dot full_name if booking dot agent_profile_id NOT NULL

**Timestamps** (1 column):
- created_at: TIMESTAMPTZ, NOT NULL, DEFAULT NOW function, immutable for audit trail

### Indexes (8 total)

**B-tree Indexes** (7 standard):
- transactions_pkey: PRIMARY KEY index on id column
- idx_transactions_profile_id: B-tree on profile_id for wallet balance queries (most frequent)
- idx_transactions_status: B-tree on status for tab filtering
- idx_transactions_created_at: B-tree DESC on created_at for date sorting
- idx_transactions_booking_id: B-tree on booking_id for transaction lookup by booking
- idx_transactions_type: B-tree on type for type filtering
- idx_transactions_service_name: B-tree on service_name for service-based reporting
- idx_transactions_session_date: B-tree on session_date for date range financial reports

**GIN Index** (1 array):
- idx_transactions_subjects: GIN on subjects array for tax reporting by subject (example: total Mathematics income for tax year)

---

## Common AI Tasks with Step-by-Step Guidance

### Task 1: Process Booking Payment (Most Common)

**Scenario**: Stripe webhook receives checkout.session.completed event with booking payment.

**Step-by-Step Process**:

Step 1: Extract metadata from Stripe webhook event. Webhook body contains event dot data dot object dot metadata with booking_id (UUID string), tutor_id (UUID string), agent_profile_id (UUID string or null). Extract amount from event dot data dot object dot amount_total divided by 100 (Stripe uses pence). Extract payment_intent_id from event dot data dot object dot payment_intent.

Step 2: Call process_booking_payment RPC via Supabase client. const open-brace data comma error close-brace equals await supabase dot rpc open-paren single-quote process_booking_payment single-quote comma open-brace p_booking_id colon booking_id comma p_payment_amount colon amount comma p_payment_intent_id colon payment_intent_id close-brace close-paren. Check error object - if NOT NULL, log to failed_webhooks table and return 500 to Stripe (triggers retry).

Step 3: Verify RPC result data. RPC returns JSONB with platform_fee (DECIMAL), tutor_payout (DECIMAL), agent_commission (DECIMAL), transaction_ids (UUID array with 3 elements). Verify platform_fee plus tutor_payout plus agent_commission equals original amount within ±1p rounding tolerance.

Step 4: Return 200 OK to Stripe webhook. Response body open-brace success colon true comma transaction_count colon 3 close-brace. Stripe considers webhook successful, will not retry. If error occurred in Steps 2-3, return 500 error - Stripe retries up to 3 times with exponential backoff.

**Expected Behavior**:
- 3 transactions created atomically (all succeed or all rollback)
- Platform fee: profile_id NULL, status available, amount 10%
- Tutor payout: profile_id tutor_id, status clearing, amount 80% (or 90% if no agent)
- Agent commission: profile_id agent_profile_id, status clearing, amount 10% (or 0 if no agent)
- All 7 context fields copied from booking
- Wallet balances updated automatically (RPC called shows new pending balance)

### Task 2: Calculate Wallet Balance

**Scenario**: User navigates to /financials, frontend needs to display available, pending, and total balance.

**Step-by-Step Process**:

Step 1: Authenticate user via Supabase Auth. const open-brace data colon open-brace user close-brace close-brace equals await supabase dot auth dot getUser open-paren close-paren. If user NULL, return 401 Unauthorized.

Step 2: Call get_wallet_balance RPC. const open-brace data colon balances comma error close-brace equals await supabase dot rpc open-paren single-quote get_wallet_balance single-quote comma open-brace p_profile_id colon user dot id close-brace close-paren. Check error - if NOT NULL, return 500 Internal Server Error with error message.

Step 3: Extract balance values from RPC result. balances is array with single object: balances array-open-bracket 0 array-close-bracket contains open-brace available comma pending comma total close-brace. All values DECIMAL type, convert to number for frontend display.

Step 4: Return balance to frontend. Response dot json open-paren open-brace balances colon open-brace available colon balances array-open-bracket 0 array-close-bracket dot available comma pending colon balances array-open-bracket 0 array-close-bracket dot pending comma total colon balances array-open-bracket 0 array-close-bracket dot total close-brace close-brace close-paren.

**Expected Behavior**:
- available: Sum of transactions with status available and amount greater-than 0
- pending: Sum of transactions with status clearing
- total: available plus pending
- Sub-200ms execution time
- NULL-safe (returns 0 if no transactions)

### Task 3: Create Refund Transaction

**Scenario**: Stripe webhook receives charge.refunded event, need to create reversal transaction.

**Step-by-Step Process**:

Step 1: Find original transaction by payment_intent_id. const open-brace data colon transactions close-brace equals await supabase dot from open-paren single-quote transactions single-quote close-paren dot select open-paren single-quote star single-quote close-paren dot eq open-paren single-quote stripe_payment_intent_id single-quote comma payment_intent_id close-paren. Should return 3 transactions (platform, tutor, agent).

Step 2: For tutor and agent transactions, create reversal. WARNING: Cannot use direct INSERT (RLS blocks). Must use RPC or admin Supabase client with service_role key. Example using service_role: const supabaseAdmin equals createClient open-paren url comma service_role_key close-paren. Then supabaseAdmin dot from open-paren single-quote transactions single-quote close-paren dot insert.

Step 3: Insert reversal transaction. For each original transaction (tutor, agent), create new transaction with profile_id same, booking_id same, type single-quote Refund single-quote, description single-quote Refund for original-description single-quote, status single-quote refunded single-quote, amount equals minus original dot amount (negative to reverse credit).

Step 4: Update original transaction status to refunded. UPDATE transactions SET status equals single-quote refunded single-quote WHERE id IN open-paren original_tutor_txn_id comma original_agent_txn_id close-paren. Platform fee transaction NOT reversed (platform keeps fee on refunds per business model).

**Expected Behavior**:
- Original tutor £80 transaction marked refunded
- New tutor -£80 transaction created with type Refund
- Original agent £10 transaction marked refunded
- New agent -£10 transaction created with type Refund
- Platform fee £10 remains available (not reversed)
- Wallet balances decrease by £90 total (tutor -£80, agent -£10)

### Task 4: Transition Clearing to Available

**Scenario**: Automated cron job runs daily to update transactions after 7-day clearing period.

**Step-by-Step Process**:

Step 1: Query transactions in clearing status older than 7 days. SELECT id comma profile_id comma amount FROM transactions WHERE status equals single-quote clearing single-quote AND created_at less-than-or-equal NOW open-paren close-paren minus INTERVAL single-quote 7 days single-quote.

Step 2: Update status to available. UPDATE transactions SET status equals single-quote available single-quote WHERE id IN open-paren ids_from_step_1 close-paren. Returns count of updated rows.

Step 3: Log status transitions for audit. INSERT INTO transaction_status_log table (if exists) with old_status clearing, new_status available, transaction_ids array, updated_at NOW, updated_by single-quote cron_job single-quote.

Step 4: Invalidate cached wallet balances. If using Redis cache, DELETE keys matching pattern wallet_balance colon asterisk. React Query will refetch on next page load. If no cache, skip this step (RPC always calculates fresh).

**Expected Behavior**:
- All clearing transactions older than 7 days updated to available
- Wallet pending balance decreases by sum of transitioned amounts
- Wallet available balance increases by same amount
- Total balance unchanged (pending moved to available)
- Users can now request payout for newly available funds

---

## DO / DON'T Rules (12 Critical Guidelines)

### Transaction Creation

**DO** call process_booking_payment RPC for all payment processing (Stripe webhooks, manual payments, backfills).
**DON'T** attempt direct INSERT into transactions table (blocked by RLS, will fail).

**DO** verify RPC result totals match booking amount within ±1p tolerance.
**DON'T** ignore RPC errors or assume success without checking return value.

**DO** copy all 7 context fields from booking to transaction via RPC.
**DON'T** leave context fields NULL (breaks historical reporting, reduces audit trail value).

### Status Transitions

**DO** use multi-status lifecycle (clearing → available → paid_out) with 7-day clearing period.
**DON'T** set new tutor transactions to available immediately (bypasses chargeback protection).

**DO** transition clearing to available via automated cron job after 7 days.
**DON'T** allow manual status changes from frontend (security risk, breaks clearing period guarantee).

**DO** handle Stripe webhook events for status updates (transfer.paid → paid_out, charge.dispute.created → disputed).
**DON'T** update status based on application logic only (Stripe is source of truth for payment states).

### Wallet Balance

**DO** calculate balance via get_wallet_balance RPC for all displays.
**DON'T** aggregate transactions client-side (risks incorrect logic, misses edge cases, slow).

**DO** filter available balance by status available AND amount greater-than 0.
**DON'T** include paid_out or disputed transactions in available balance (already transferred or held).

**DO** separate pending balance (status clearing) from available balance (status available) in UI.
**DON'T** show single balance combining pending and available (confuses users about payout eligibility).

### Immutability & Corrections

**DO** preserve all transactions permanently (immutable audit trail for compliance).
**DON'T** delete transactions under any circumstances (violates financial regulations).

**DO** create reversal transactions with negative amounts for corrections.
**DON'T** update existing transaction amounts or created_at fields (destroys audit trail).

**DO** allow status field updates via RPC only (webhook handler, payout processing).
**DON'T** expose status updates to frontend or allow direct UPDATE from application code.

---

## Performance Best Practices

### RPC Execution

**get_wallet_balance RPC**: Uses B-tree indexes on profile_id and status. Query plan: Bitmap Index Scan plus Aggregate. Sub-200ms execution for users with 1000+ transactions. Frontend caching: 30-second staleTime reduces server load, 60-second refetchInterval keeps balance current.

**process_booking_payment RPC**: Single round-trip creates 3 transactions atomically. Execution time: 15-25ms including validation and context snapshot. Wrapped in BEGIN...COMMIT for ACID guarantees. Idempotency: Check stripe_payment_intent_id before creating duplicates (webhook may fire twice).

### Query Optimization

**Transaction List**: SELECT with ORDER BY created_at DESC uses idx_transactions_created_at index. Pagination: Client-side with 4 items per page (50 total fetched, sliced in memory). No JOINs required - context fields snapshotted in transactions table.

**Status Filtering**: Tab filters use idx_transactions_status B-tree index. Query plan chooses index scan when filtering by status, bitmap heap scan when combining profile_id plus status.

---

## Common Gotchas & Pitfalls

### Gotcha 1: RLS Policy Blocks Direct INSERTs

**Problem**: Application code attempts INSERT INTO transactions, receives no error but row not created.

**Why It Happens**: RLS policy transactions_insert_via_rpc has WITH CHECK false, silently blocks all non-RPC INSERTs. Supabase client returns success but does not create row.

**Solution**: Always use process_booking_payment RPC. Check RPC response for error field. If implementing new transaction type, create dedicated RPC function with SECURITY DEFINER to bypass RLS.

**Prevention**: Add comment to transactions table schema documenting RPC-only INSERT requirement. Code review checklist includes "Are transactions created via RPC?"

### Gotcha 2: Wallet Balance Includes Paid Out Transactions

**Problem**: User has £200 available balance displayed, attempts payout, API returns insufficient funds error.

**Why It Happens**: Client-side balance calculation includes status paid_out transactions (transactions dot filter dot reduce without status check).

**Solution**: Always use get_wallet_balance RPC. RPC filters by status equals single-quote available single-quote AND amount greater-than 0, excludes paid_out and negative amounts.

**Prevention**: Never calculate balance client-side. WalletBalanceWidget must call RPC, not aggregate local transactions array.

### Gotcha 3: Commission Split Rounding Errors

**Problem**: Platform fee £10.00 plus tutor payout £72.00 plus agent commission £9.00 equals £91.00 instead of £100.00.

**Why It Happens**: Floating point arithmetic (100 times 0.10 equals 10.000001, DECIMAL truncates to 10.00, but later calculations accumulate error).

**Solution**: process_booking_payment RPC uses DECIMAL type throughout, calculates splits with proper rounding. Final verification: IF platform_fee plus tutor_payout plus agent_commission not-equal booking_amount THEN RAISE EXCEPTION (rollback entire transaction).

**Prevention**: Never calculate splits in JavaScript (use times 100 to convert to pence integers for accuracy). RPC handles all split logic with DECIMAL precision.

### Gotcha 4: Context Fields NULL After Booking Deletion

**Problem**: Transaction shows NULL service_name after booking deleted, breaks financial reporting.

**Why It Happens**: Transaction created before v5.10 (migration 107 added context fields), or RPC v3 not used (old RPC v2 did not copy context).

**Solution**: Graceful degradation in frontend. Display single-quote Unknown Service single-quote if service_name NULL. Query bookings table as fallback (LEFT JOIN bookings WHERE transactions dot booking_id equals bookings dot id) but accept NULL if booking deleted.

**Prevention**: Ensure all new transactions use process_booking_payment RPC v4 (migration 111). Backfill historical transactions via script copying context from bookings WHERE booking_id NOT NULL.

---

## Testing Checklist

### Unit Tests

**Test 1: RPC Commission Split Accuracy**
- Call process_booking_payment with amount 100.00, agent_profile_id NOT NULL
- Verify platform_fee equals 10.00, tutor_payout equals 80.00, agent_commission equals 10.00
- Verify total equals 100.00 exactly
- Call with amount 100.00, agent_profile_id NULL
- Verify platform_fee equals 10.00, tutor_payout equals 90.00, agent_commission equals 0
- Verify total equals 100.00 exactly

**Test 2: Wallet Balance Calculation**
- Create test profile with 3 transactions: £80 clearing, £50 available, £30 paid_out
- Call get_wallet_balance
- Verify available equals 50.00 (excludes clearing and paid_out)
- Verify pending equals 80.00 (only clearing status)
- Verify total equals 130.00 (available plus pending, excludes paid_out)

**Test 3: Transaction Context Snapshot**
- Create booking with service_name single-quote GCSE Maths single-quote, subjects array-open-bracket single-quote Mathematics single-quote array-close-bracket
- Call process_booking_payment RPC
- Update booking service_name to single-quote A-Level Physics single-quote
- Query transaction
- Verify transaction service_name still equals single-quote GCSE Maths single-quote (snapshot preserved)

### Integration Tests

**Test 4: Stripe Webhook End-to-End**
- Trigger test checkout.session.completed webhook with Stripe CLI
- Verify 3 transactions created in database
- Verify wallet balance updated (pending increased by tutor_payout)
- Verify webhook handler returned 200 OK

**Test 5: Status Transition Cron Job**
- Create transaction with status clearing, created_at 8 days ago
- Run status transition cron job
- Verify transaction updated to status available
- Verify wallet balance moved from pending to available

---

## Debugging Common Issues

### Issue 1: Transaction Not Created After Payment

**Symptoms**: Booking paid in Stripe but no transactions in database.

**Debugging Steps**:
1. Check Stripe webhook logs in Stripe dashboard for 400/500 responses
2. Query failed_webhooks table: SELECT asterisk FROM failed_webhooks WHERE booking_id equals :booking_id ORDER BY created_at DESC
3. Check webhook signature verification (STRIPE_WEBHOOK_SECRET environment variable set correctly?)
4. Manually call RPC: SELECT asterisk FROM process_booking_payment open-paren :booking_id comma :amount comma :payment_intent_id close-paren

**Resolution**: If webhook failed, manually call RPC with booking details. If RPC error, check booking exists and has valid tutor_id. If stripe_payment_intent_id duplicate, idempotency check prevented duplicate transactions (success, not error).

### Issue 2: Wallet Balance Shows Incorrect Amount

**Symptoms**: User has £100 pending but wallet shows £0 available.

**Debugging Steps**:
1. Call get_wallet_balance RPC directly: SELECT asterisk FROM get_wallet_balance open-paren :profile_id close-paren
2. Manual verification: SELECT SUM amount FROM transactions WHERE profile_id equals :profile_id AND status equals single-quote available single-quote AND amount greater-than 0
3. Check transaction statuses: SELECT status comma COUNT asterisk FROM transactions WHERE profile_id equals :profile_id GROUP BY status
4. Verify 7-day clearing period: SELECT id comma created_at comma status FROM transactions WHERE profile_id equals :profile_id AND status equals single-quote clearing single-quote

**Resolution**: If all transactions in clearing status, user must wait 7 days for transition to available. If RPC returns different value than manual query, RPC bug (unlikely but report issue). If frontend shows different value than RPC, React Query cache stale (invalidate cache).

### Issue 3: Payout Failed with Insufficient Funds

**Symptoms**: User clicks Request Payout, API returns error available balance below minimum £10.

**Debugging Steps**:
1. Check available balance: SELECT asterisk FROM get_wallet_balance open-paren :profile_id close-paren
2. List available transactions: SELECT id comma amount comma created_at FROM transactions WHERE profile_id equals :profile_id AND status equals single-quote available single-quote
3. Check for negative amounts: SELECT id comma amount comma description FROM transactions WHERE profile_id equals :profile_id AND amount less-than 0

**Resolution**: If available balance less-than £10 due to refunds or disputes (negative transactions), explain to user. If available balance shows £50 but API says insufficient, check payout processing code using correct balance check (RPC call, not client-side calculation).

---

**Last Updated**: 2025-12-15
**Next Review**: When implementing automated payout batches (v6.0)
**Maintained By**: Finance Team + Backend Team
**AI Assistant Version Compatibility**: Claude 3.5 Sonnet, GPT-4, GitHub Copilot, cursor.ai
