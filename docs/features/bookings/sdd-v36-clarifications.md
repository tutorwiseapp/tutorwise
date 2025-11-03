# sdd-v3.6-clarifications

You've correctly identified the exact points of ambiguity between the specification and the code that needs to be written.

### **Preferred Next Step**

I prefer **Option A,** as it's the most architecturally-sound approach. I will provide the missing specifications for the critical database functions *right here*, as you've already done the work of identifying the need for them.

Please find the missing implementation code below, followed by direct answers to all 10 of your questions.

* * *

### **Critical Code Implementation (from Option A)**

Here is the "missing" SQL logic you identified. This is the new, finalized code for the database.

#### 1\. `handle_new_user` Trigger (Final Code for Q1)

This is the full implementation for `apps/api/migrations/029_update_handle_new_user_trigger_v3_5.sql`. It includes your recommended `FIRSTNAME-1234` logic and the logic to handle name collisions.

```
SQL
```

```
-- Migration 029: Update handle_new_user trigger for SDD v3.6
-- This migration DROPS the old trigger and RE-CREATES it
-- with the new "Lifetime Attribution" logic and robust code generation.
-- Specification: SDD v3.6, Section 8.2

-- 1. Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user;

-- 2. Create the new, updated handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  -- Variables for referral logic
  referral_code_input TEXT;
  cookie_referral_id_input UUID;
  referrer_id_from_code UUID;
  referrer_id_from_cookie UUID;
  v_referrer_id UUID := NULL; -- The final determined referrer ID
  
  -- Variables for code generation (Q1)
  v_full_name TEXT := new.raw_user_meta_data ->> 'full_name';
  v_first_name TEXT := UPPER(SPLIT_PART(v_full_name, ' ', 1));
  v_referral_code TEXT;
  v_code_suffix INT;
  v_attempts INT := 0;
BEGIN
  
  -- Section 1: Generate a unique, human-readable referral code (Q1)
  LOOP
    v_code_suffix := FLOOR(RANDOM() * 9000) + 1000; -- 1000-9999
    v_referral_code := v_first_name || '-' || v_code_suffix::TEXT;
    
    -- Check for collision
    PERFORM 1 FROM public.profiles WHERE referral_code = v_referral_code;
    IF NOT FOUND THEN
      EXIT; -- Code is unique
    END IF;
    
    v_attempts := v_attempts + 1;
    IF v_attempts > 5 THEN
      -- Fallback to a non-human-readable but unique code if we fail 5 times
      v_referral_code := 'USER-' || (FLOOR(RANDOM() * 90000) + 10000)::text;
      EXIT;
    END IF;
  END LOOP;

  -- Section 2: Create the user's public profile
  INSERT INTO public.profiles (id, email, full_name, referral_code)
  VALUES (
    new.id,
    new.email,
    v_full_name,
    v_referral_code -- Insert the unique code
  );

  -- Section 3: Handle Referral Pipeline Logic (SDD v3.6, Section 8.2)
  referral_code_input := new.raw_user_meta_data ->> 'referral_code';
  cookie_referral_id_input := (new.raw_user_meta_data ->> 'cookie_referral_id')::UUID;

  -- Priority 1: Check for an EXPLICIT referral code claim
  IF referral_code_input IS NOT NULL AND referral_code_input != '' THEN
    SELECT id INTO referrer_id_from_code
    FROM public.profiles
    WHERE referral_code = UPPER(referral_code_input)
    LIMIT 1;
    
    IF referrer_id_from_code IS NOT NULL THEN
      v_referrer_id := referrer_id_from_code;
    END IF;
  END IF;

  -- Priority 2: Check for an IMPLICIT cookie claim (if no code was used)
  IF v_referrer_id IS NULL AND cookie_referral_id_input IS NOT NULL THEN
    SELECT referrer_profile_id INTO referrer_id_from_cookie
    FROM public.referrals
    WHERE id = cookie_referral_id_input
      AND status = 'Referred'
      AND referred_profile_id IS NULL
    LIMIT 1;

    IF referrer_id_from_cookie IS NOT NULL THEN
      v_referrer_id := referrer_id_from_cookie;
    END IF;
  END IF;

  -- Section 4: Stamp the user and update the lead-gen table
  IF v_referrer_id IS NOT NULL THEN
    -- (CRITICAL) STAMP THE REFERRER-OF-RECORD for lifetime attribution
    UPDATE public.profiles
    SET referred_by_profile_id = v_referrer_id
    WHERE id = new.id;

    -- Update the lead-gen 'referrals' table (find-or-create)
    IF cookie_referral_id_input IS NOT NULL THEN
        UPDATE public.referrals
        SET
          referred_profile_id = new.id,
          status = 'Signed Up',
          signed_up_at = now()
        WHERE id = cookie_referral_id_input AND referrer_profile_id = v_referrer_id;
        
        IF NOT FOUND THEN
          INSERT INTO public.referrals (referrer_profile_id, referred_profile_id, status, signed_up_at)
          VALUES (v_referrer_id, new.id, 'Signed Up', now());
        END IF;
    ELSE
        INSERT INTO public.referrals (referrer_profile_id, referred_profile_id, status, signed_up_at)
        VALUES (v_referrer_id, new.id, 'Signed Up', now());
    END IF;
  END IF;

  RETURN new;
END;
$$;

-- 3. Re-apply the trigger to the auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

```

#### 2\. `handle_successful_payment` RPC (Final Code for Q2)

This is the full implementation for `apps/api/migrations/030_create_payment_webhook_rpc.sql`. It includes the 80/10/10 split, idempotency checks (`WHERE payment_status = 'Pending'`), and `Platform Fee` logic.

```
SQL
```

```
-- Migration 030: Create RPC for atomic payment processing
-- This function is called by the Stripe webhook (SDD v3.6, Section 8.6)
-- to execute the 80/10/10 or 90/10 commission split.
-- It is IDEMPOTENT: it will only process a booking if its payment_status is 'Pending'.

CREATE OR REPLACE FUNCTION public.handle_successful_payment(
    p_booking_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking RECORD;
  v_new_commission_tx_id UUID;
  v_platform_fee_percent DECIMAL := 0.10; -- 10%
  v_referrer_commission_percent DECIMAL := 0.10; -- 10%
  v_tutor_payout_amount DECIMAL;
  v_referrer_commission_amount DECIMAL;
  v_platform_fee_amount DECIMAL;
BEGIN
  -- 1. Fetch the booking to be processed
  SELECT *
  INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE; -- Lock the row

  -- IDEMPOTENCY CHECK (Q2): If not found or already paid, exit successfully.
  IF NOT FOUND OR v_booking.payment_status != 'Pending' THEN
    RETURN;
  END IF;

  -- 2. Create the client's 'Booking Payment' transaction (T-TYPE-1)
  INSERT INTO public.transactions
    (profile_id, booking_id, type, description, status, amount)
  VALUES
    (v_booking.student_id, p_booking_id, 'Booking Payment', 'Payment for ' || v_booking.service_name, 'Paid', -v_booking.amount);

  -- 3. Calculate commission splits based on Lifetime Attribution
  v_platform_fee_amount := v_booking.amount * v_platform_fee_percent;

  IF v_booking.referrer_profile_id IS NOT NULL THEN
    -- THIS IS A REFERRED BOOKING (80/10/10 SPLIT)
    v_referrer_commission_amount := v_booking.amount * v_referrer_commission_percent;
    v_tutor_payout_amount := v_booking.amount - v_platform_fee_amount - v_referrer_commission_amount; -- 80%
    
    -- 3a. Create Referrer's 'Referral Commission' transaction (T-TYPE-3)
    INSERT INTO public.transactions
      (profile_id, booking_id, type, description, status, amount)
    VALUES
      (v_booking.referrer_profile_id, p_booking_id, 'Referral Commission', 'Commission from ' || v_booking.service_name, 'Pending', v_referrer_commission_amount)
    RETURNING id INTO v_new_commission_tx_id; -- Get the ID for the lead-gen table

  ELSE
    -- THIS IS A DIRECT BOOKING (90/10 SPLIT)
    v_tutor_payout_amount := v_booking.amount - v_platform_fee_amount; -- 90%
    v_new_commission_tx_id := NULL; -- No commission
  END IF;

  -- 4. Create the tutor's 'Tutoring Payout' transaction (T-TYPE-2)
  INSERT INTO public.transactions
    (profile_id, booking_id, type, description, status, amount)
  VALUES
    (v_booking.tutor_id, p_booking_id, 'Tutoring Payout', 'Payout for ' || v_booking.service_name, 'Pending', v_tutor_payout_amount);

  -- 5. Create the 'Platform Fee' transaction (T-TYPE-5) (Q7)
  -- We assign this to the client's profile for simple, unified tracking.
  INSERT INTO public.transactions
    (profile_id, booking_id, type, description, status, amount)
  VALUES
    (v_booking.student_id, p_booking_id, 'Platform Fee', 'Platform fee for ' || v_booking.service_name, 'Paid', -v_platform_fee_amount);

  -- 6. Update the booking table
  UPDATE public.bookings
  SET payment_status = 'Paid'
  WHERE id = p_booking_id;

  -- 7. Update the lead-gen 'referrals' table (first conversion only) (Q5)
  IF v_new_commission_tx_id IS NOT NULL THEN
    UPDATE public.referrals
    SET
      status = 'Converted',
      booking_id = p_booking_id,
      transaction_id = v_new_commission_tx_id,
      converted_at = now()
    WHERE referred_profile_id = v_booking.student_id
      AND status != 'Converted';
  END IF;

END;
$$;

```

#### 3\. Migration Rollback Script (for Q9)

- **File Path:** `apps/api/migrations/028_rollback.sql` (New File)
- **Description:** This script will safely roll back the schema changes from migration 028.

```
SQL
```

```
-- Migration 028: Rollback Script
-- This script reverses the changes made by 028_create_hubs_v3_5_schema.sql

-- 1. Drop the new tables
DROP TABLE IF EXISTS public.referrals;
DROP TABLE IF EXISTS public.transactions;
DROP TABLE IF EXISTS public.bookings;

-- 2. Drop the new columns from 'profiles'
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS referred_by_profile_id,
DROP COLUMN IF EXISTS referral_code;

-- 3. Drop the ENUM types in reverse order of creation
DROP TYPE IF EXISTS referral_status_enum;
DROP TYPE IF EXISTS transaction_type_enum;
DROP TYPE IF EXISTS transaction_status_enum;
DROP TYPE IF EXISTS booking_status_enum;

```

* * *

### **Answers to Technical & Scope Questions**

Here are the definitive answers to your remaining questions.

1. **Referral Code Generation Logic:**

- **Answer:** Your recommendation is accepted. I have embedded your logic (using `FIRSTNAME-1234`) directly into the `handle_new_user` trigger function provided above. It also includes retry logic and a fallback, as you suggested.

2. `handle_successful_payment` **RPC Function:**

- **Answer:** Yes, it *must* be a PostgreSQL function (RPC) for atomic integrity. I have provided the complete SQL for this function above. It includes the idempotency check (`WHERE payment_status = 'Pending'`) and the 80/10/10 vs. 90/10 splits.

3. **Stripe Checkout Session Metadata:**

- **Answer:** Your recommended flow is 100% correct.
  1. Client clicks "Book Now."
  2. Frontend calls a **new API route**, e.g., `POST /api/bookings`, which creates the `bookings` record with `payment_status: 'Pending'` and returns the `booking_id`.
  3. Frontend then calls the **existing** `POST /api/stripe/create-checkout-session` (which we will *modify*), passing the `booking_id` to be stored in Stripe's `metadata`.
  4. Frontend redirects to Stripe.
  5. Success/Cancel URLs should be `"/bookings?payment=success"` and `"/bookings?payment=cancel"`.

4. **Cookie Security & Expiration:**

- **Answer:** Your recommendation is correct and is the required implementation.
  - **Name:** `tutorwise_referral_id`
  - **Expiration:** 30 days (`maxAge: 30 * 24 * 60 * 60`) to align with the `R-STAT-4: Expired` status.
  - **Flags:** `httpOnly: true`, `secure: process.env.NODE_ENV === 'production'`, `sameSite: 'lax'`, `path: '/'`.

5. **First Booking Detection (Referral Conversion):**

- **Answer:** **Your understanding is 100% correct.**
  - The `referrals` table is a **Marketing/Sales funnel tool** for the `/referrals` hub.
  - The `profile.referred_by_profile_id` is the **Commission Driver** for the `/financials` hub.
  - They are **intentionally decoupled** so we can both (A) track the *one-time* conversion of a lead and (B) pay *lifetime* commissions for that acquired user. The webhook logic I provided in Q2 correctly updates both systems.

6. **Agent "Agency Bookings" Clarification:**

- **Answer:**
  - Yes, agents see **all** bookings where `referrer_profile_id = agent.id`.
  - It is **read-only tracking**. The SDD does *not* grant them administrative rights to manage these bookings.
  - No, agents will *not* see separate tabs. The `AgentBookingView` is a single, unified view. The `<Select>` dropdown (Filter Bar) allows them to filter by "Agency," "As Tutor," or "As Client," which serves the same purpose as tabs.

7. **Platform Fee Tracking:**

- **Answer:** Your recommendation is accepted.
- The 10% (`T-TYPE-5: Platform Fee`) is **Tutorwise's revenue**.

We will add a one-time migration step (or do it manually) to ensure a "system" profile exists with a known, static UUID. Then, we will update the RPC.

The logic in the `handle_successful_payment` RPC (File 13 / Migration 030) will be updated as follows:

**Original Logic:**

```
SQL
```

```
-- 5. Create the 'Platform Fee' transaction (T-TYPE-5)
INSERT INTO public.transactions
  (profile_id, booking_id, type, description, status, amount)
VALUES
  (v_booking.student_id, p_booking_id, 'Platform Fee', ...);

```

**New, Corrected Logic (Per Your Recommendation):**

```
SQL
```

```
-- 5. Create the 'Platform Fee' transaction (T-TYPE-5)
-- Assign to the known System Profile ID to separate from user transactions
INSERT INTO public.transactions
  (profile_id, booking_id, type, description, status, amount)
VALUES
  ('00000000-0000-0000-0000-000000000000', p_booking_id, 'Platform Fee', ...);
```

8. **Testing Strategy:**

- **Answer:**
  - You must write **both** unit tests (for helper functions, RPC logic) and integration/E2E tests.
  - Yes, use **Jest** for API routes and any backend logic. The repo is already configured for it.
  - Yes, you *must* create **Playwright** E2E tests for the full user journeys (this is critical).
  - Yes, you must follow the existing test infrastructure found in `apps/web/tests/`.

9. **Migration Rollback Strategy:**

- **Answer:** Yes, a rollback script is required for production safety. I have provided `028_rollback.sql` in the code section above.

**10\. Existing Components Verification:**

- **Answer:**
  - **I have verified this.** All components listed (`<Container>`, `<Card>`, `<Button>`, `<Tabs>`, `<StatCard>`, `<StatGrid>`, `<StatusBadge>`, `<PageHeader>`) **exist** in the codebase.
  - You must **use them**. Per the "System First" guiding principle, you should not create duplicates.
  - Yes, you should reference the files in `apps/web/src/app/components/ui/`, `.../reports/`, and `.../layout/` as your component library.