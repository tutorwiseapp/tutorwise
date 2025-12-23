-- =====================================================================
-- Database Tests for RPC Functions (SDD v3.6)
-- =====================================================================
-- Purpose: Validates handle_new_user and handle_successful_payment functions
-- Run with: psql -f test_rpc_functions.sql
-- All tests should complete without errors for successful validation
-- =====================================================================

\echo '=== TEST SUITE 1: handle_new_user Trigger ==='

-- Test 1.1: Referral code generation (FIRSTNAME-1234 format)
\echo 'Test 1.1: Referral code generation...'
DO $$
DECLARE
  v_user_id UUID := gen_random_uuid();
  v_referral_code TEXT;
BEGIN
  -- Simulate new user insertion
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
  VALUES (
    v_user_id,
    'test1@example.com',
    'encrypted',
    now(),
    jsonb_build_object('full_name', 'Jane Doe')
  );

  -- Check that profile was created with referral code
  SELECT referral_code INTO v_referral_code
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_referral_code IS NULL THEN
    RAISE EXCEPTION 'FAIL: Referral code not generated';
  END IF;

  IF v_referral_code !~ '^[A-Z]+-[0-9]{4}$' THEN
    RAISE EXCEPTION 'FAIL: Referral code does not match FIRSTNAME-1234 pattern. Got: %', v_referral_code;
  END IF;

  RAISE NOTICE '✓ PASS: Referral code generated with correct format: %', v_referral_code;

  -- Cleanup
  DELETE FROM public.profiles WHERE id = v_user_id;
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

-- Test 1.2: Referral code uniqueness (collision handling)
\echo 'Test 1.2: Referral code uniqueness...'
DO $$
DECLARE
  v_user1_id UUID := gen_random_uuid();
  v_user2_id UUID := gen_random_uuid();
  v_code1 TEXT;
  v_code2 TEXT;
BEGIN
  -- Create two users with same first name
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
  VALUES (
    v_user1_id,
    'alice1@example.com',
    'encrypted',
    now(),
    jsonb_build_object('full_name', 'Alice Smith')
  );

  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
  VALUES (
    v_user2_id,
    'alice2@example.com',
    'encrypted',
    now(),
    jsonb_build_object('full_name', 'Alice Jones')
  );

  SELECT referral_code INTO v_code1 FROM public.profiles WHERE id = v_user1_id;
  SELECT referral_code INTO v_code2 FROM public.profiles WHERE id = v_user2_id;

  IF v_code1 = v_code2 THEN
    RAISE EXCEPTION 'FAIL: Same referral code generated for different users: %', v_code1;
  END IF;

  RAISE NOTICE '✓ PASS: Unique referral codes generated: % and %', v_code1, v_code2;

  -- Cleanup
  DELETE FROM public.profiles WHERE id IN (v_user1_id, v_user2_id);
  DELETE FROM auth.users WHERE id IN (v_user1_id, v_user2_id);
END;
$$;

-- Test 1.3: Explicit referral code claim (Priority 1)
\echo 'Test 1.3: Explicit referral code claim...'
DO $$
DECLARE
  v_referrer_id UUID := gen_random_uuid();
  v_new_user_id UUID := gen_random_uuid();
  v_referrer_code TEXT;
  v_referred_by UUID;
  v_referral_status referral_status_enum;
BEGIN
  -- Create referrer
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
  VALUES (
    v_referrer_id,
    'referrer@example.com',
    'encrypted',
    now(),
    jsonb_build_object('full_name', 'Bob Referrer')
  );

  SELECT referral_code INTO v_referrer_code FROM public.profiles WHERE id = v_referrer_id;

  -- Create new user with explicit referral code
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
  VALUES (
    v_new_user_id,
    'newuser@example.com',
    'encrypted',
    now(),
    jsonb_build_object('full_name', 'Charlie New', 'referral_code', v_referrer_code)
  );

  -- Check that referred_by_profile_id is stamped
  SELECT referred_by_profile_id INTO v_referred_by
  FROM public.profiles
  WHERE id = v_new_user_id;

  IF v_referred_by != v_referrer_id THEN
    RAISE EXCEPTION 'FAIL: Referrer not stamped correctly. Expected: %, Got: %', v_referrer_id, v_referred_by;
  END IF;

  -- Check that referrals table has "Signed Up" status
  SELECT status INTO v_referral_status
  FROM public.referrals
  WHERE referred_profile_id = v_new_user_id;

  IF v_referral_status != 'Signed Up' THEN
    RAISE EXCEPTION 'FAIL: Referral status incorrect. Expected: Signed Up, Got: %', v_referral_status;
  END IF;

  RAISE NOTICE '✓ PASS: Explicit referral code claim works correctly';

  -- Cleanup
  DELETE FROM public.referrals WHERE referred_profile_id = v_new_user_id;
  DELETE FROM public.profiles WHERE id IN (v_referrer_id, v_new_user_id);
  DELETE FROM auth.users WHERE id IN (v_referrer_id, v_new_user_id);
END;
$$;

-- Test 1.4: Implicit cookie claim (Priority 2)
\echo 'Test 1.4: Implicit cookie claim...'
DO $$
DECLARE
  v_referrer_id UUID := gen_random_uuid();
  v_new_user_id UUID := gen_random_uuid();
  v_cookie_referral_id UUID;
  v_referred_by UUID;
BEGIN
  -- Create referrer
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
  VALUES (
    v_referrer_id,
    'referrer2@example.com',
    'encrypted',
    now(),
    jsonb_build_object('full_name', 'Diana Referrer')
  );

  -- Create anonymous referral (simulating click on referral link)
  INSERT INTO public.referrals (referrer_profile_id, referred_profile_id, status)
  VALUES (v_referrer_id, NULL, 'Referred')
  RETURNING id INTO v_cookie_referral_id;

  -- Create new user with cookie_referral_id (no explicit code)
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
  VALUES (
    v_new_user_id,
    'newuser2@example.com',
    'encrypted',
    now(),
    jsonb_build_object('full_name', 'Eve New', 'cookie_referral_id', v_cookie_referral_id::TEXT)
  );

  -- Check that referred_by_profile_id is stamped via cookie
  SELECT referred_by_profile_id INTO v_referred_by
  FROM public.profiles
  WHERE id = v_new_user_id;

  IF v_referred_by != v_referrer_id THEN
    RAISE EXCEPTION 'FAIL: Referrer not stamped via cookie. Expected: %, Got: %', v_referrer_id, v_referred_by;
  END IF;

  RAISE NOTICE '✓ PASS: Implicit cookie claim works correctly';

  -- Cleanup
  DELETE FROM public.referrals WHERE referred_profile_id = v_new_user_id OR id = v_cookie_referral_id;
  DELETE FROM public.profiles WHERE id IN (v_referrer_id, v_new_user_id);
  DELETE FROM auth.users WHERE id IN (v_referrer_id, v_new_user_id);
END;
$$;

\echo ''
\echo '=== TEST SUITE 2: handle_successful_payment RPC ==='

-- Test 2.1: Direct booking (90/10 split)
\echo 'Test 2.1: Direct booking (90/10 split)...'
DO $$
DECLARE
  v_student_id UUID := gen_random_uuid();
  v_tutor_id UUID := gen_random_uuid();
  v_listing_id UUID := gen_random_uuid();
  v_booking_id UUID;
  v_tutor_payout DECIMAL;
  v_platform_fee DECIMAL;
  v_booking_amount DECIMAL := 100.00;
  v_commission_count INT;
BEGIN
  -- Create test users
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
  VALUES
    (v_student_id, 'student@example.com', 'encrypted', now(), jsonb_build_object('full_name', 'Student One')),
    (v_tutor_id, 'tutor@example.com', 'encrypted', now(), jsonb_build_object('full_name', 'Tutor One'));

  -- Create test listing
  INSERT INTO public.listings (id, profile_id, title, description, subjects, levels, hourly_rate, location_type)
  VALUES (v_listing_id, v_tutor_id, 'Math Tutoring', 'Math tutoring session', ARRAY['Mathematics'], ARRAY['A-Level'], 50.00, 'online');

  -- Create booking (no referrer = direct booking)
  INSERT INTO public.bookings (id, student_id, tutor_id, listing_id, referrer_profile_id, service_name, session_start_time, session_duration, amount, status, payment_status)
  VALUES (gen_random_uuid(), v_student_id, v_tutor_id, v_listing_id, NULL, 'Math Session', now() + interval '1 day', 60, v_booking_amount, 'Confirmed', 'Pending')
  RETURNING id INTO v_booking_id;

  -- Process payment
  PERFORM public.handle_successful_payment(v_booking_id);

  -- Verify tutor payout (90%)
  SELECT amount INTO v_tutor_payout
  FROM public.transactions
  WHERE booking_id = v_booking_id AND type = 'Tutoring Payout';

  IF v_tutor_payout != 90.00 THEN
    RAISE EXCEPTION 'FAIL: Tutor payout incorrect. Expected: 90.00, Got: %', v_tutor_payout;
  END IF;

  -- Verify platform fee (10%)
  SELECT amount INTO v_platform_fee
  FROM public.transactions
  WHERE booking_id = v_booking_id AND type = 'Platform Fee';

  IF v_platform_fee != 10.00 THEN
    RAISE EXCEPTION 'FAIL: Platform fee incorrect. Expected: 10.00, Got: %', v_platform_fee;
  END IF;

  -- Verify no referral commission exists
  SELECT COUNT(*) INTO v_commission_count
  FROM public.transactions
  WHERE booking_id = v_booking_id AND type = 'Referral Commission';

  IF v_commission_count != 0 THEN
    RAISE EXCEPTION 'FAIL: Referral commission should not exist for direct booking';
  END IF;

  RAISE NOTICE '✓ PASS: Direct booking 90/10 split is correct';

  -- Cleanup
  DELETE FROM public.transactions WHERE booking_id = v_booking_id;
  DELETE FROM public.bookings WHERE id = v_booking_id;
  DELETE FROM public.listings WHERE id = v_listing_id;
  DELETE FROM public.profiles WHERE id IN (v_student_id, v_tutor_id);
  DELETE FROM auth.users WHERE id IN (v_student_id, v_tutor_id);
END;
$$;

-- Test 2.2: Referred booking (80/10/10 split)
\echo 'Test 2.2: Referred booking (80/10/10 split)...'
DO $$
DECLARE
  v_referrer_id UUID := gen_random_uuid();
  v_student_id UUID := gen_random_uuid();
  v_tutor_id UUID := gen_random_uuid();
  v_listing_id UUID := gen_random_uuid();
  v_booking_id UUID;
  v_referrer_code TEXT;
  v_tutor_payout DECIMAL;
  v_referrer_commission DECIMAL;
  v_platform_fee DECIMAL;
  v_booking_amount DECIMAL := 100.00;
  v_referral_status referral_status_enum;
BEGIN
  -- Create referrer
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
  VALUES (v_referrer_id, 'referrer@example.com', 'encrypted', now(), jsonb_build_object('full_name', 'Referrer Agent'));

  SELECT referral_code INTO v_referrer_code FROM public.profiles WHERE id = v_referrer_id;

  -- Create student (referred by referrer)
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
  VALUES (v_student_id, 'student2@example.com', 'encrypted', now(), jsonb_build_object('full_name', 'Student Two', 'referral_code', v_referrer_code));

  -- Create tutor
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
  VALUES (v_tutor_id, 'tutor2@example.com', 'encrypted', now(), jsonb_build_object('full_name', 'Tutor Two'));

  -- Create listing
  INSERT INTO public.listings (id, profile_id, title, description, subjects, levels, hourly_rate, location_type)
  VALUES (v_listing_id, v_tutor_id, 'Science Tutoring', 'Science tutoring session', ARRAY['Science'], ARRAY['GCSE'], 50.00, 'online');

  -- Create booking (with referrer_profile_id from student's referred_by_profile_id)
  INSERT INTO public.bookings (id, student_id, tutor_id, listing_id, referrer_profile_id, service_name, session_start_time, session_duration, amount, status, payment_status)
  VALUES (gen_random_uuid(), v_student_id, v_tutor_id, v_listing_id, v_referrer_id, 'Science Session', now() + interval '1 day', 60, v_booking_amount, 'Confirmed', 'Pending')
  RETURNING id INTO v_booking_id;

  -- Process payment
  PERFORM public.handle_successful_payment(v_booking_id);

  -- Verify tutor payout (80%)
  SELECT amount INTO v_tutor_payout
  FROM public.transactions
  WHERE booking_id = v_booking_id AND type = 'Tutoring Payout';

  IF v_tutor_payout != 80.00 THEN
    RAISE EXCEPTION 'FAIL: Tutor payout incorrect. Expected: 80.00, Got: %', v_tutor_payout;
  END IF;

  -- Verify referrer commission (10%)
  SELECT amount INTO v_referrer_commission
  FROM public.transactions
  WHERE booking_id = v_booking_id AND type = 'Referral Commission';

  IF v_referrer_commission != 10.00 THEN
    RAISE EXCEPTION 'FAIL: Referrer commission incorrect. Expected: 10.00, Got: %', v_referrer_commission;
  END IF;

  -- Verify platform fee (10%)
  SELECT amount INTO v_platform_fee
  FROM public.transactions
  WHERE booking_id = v_booking_id AND type = 'Platform Fee';

  IF v_platform_fee != 10.00 THEN
    RAISE EXCEPTION 'FAIL: Platform fee incorrect. Expected: 10.00, Got: %', v_platform_fee;
  END IF;

  -- Verify referral status updated to "Converted"
  SELECT status INTO v_referral_status
  FROM public.referrals
  WHERE referred_profile_id = v_student_id;

  IF v_referral_status != 'Converted' THEN
    RAISE EXCEPTION 'FAIL: Referral status incorrect. Expected: Converted, Got: %', v_referral_status;
  END IF;

  RAISE NOTICE '✓ PASS: Referred booking 80/10/10 split is correct';

  -- Cleanup
  DELETE FROM public.transactions WHERE booking_id = v_booking_id;
  DELETE FROM public.bookings WHERE id = v_booking_id;
  DELETE FROM public.listings WHERE id = v_listing_id;
  DELETE FROM public.referrals WHERE referred_profile_id = v_student_id;
  DELETE FROM public.profiles WHERE id IN (v_referrer_id, v_student_id, v_tutor_id);
  DELETE FROM auth.users WHERE id IN (v_referrer_id, v_student_id, v_tutor_id);
END;
$$;

-- Test 2.3: Idempotency check (double webhook call)
\echo 'Test 2.3: Idempotency check...'
DO $$
DECLARE
  v_student_id UUID := gen_random_uuid();
  v_tutor_id UUID := gen_random_uuid();
  v_listing_id UUID := gen_random_uuid();
  v_booking_id UUID;
  v_transaction_count INT;
BEGIN
  -- Create test users
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
  VALUES
    (v_student_id, 'student3@example.com', 'encrypted', now(), jsonb_build_object('full_name', 'Student Three')),
    (v_tutor_id, 'tutor3@example.com', 'encrypted', now(), jsonb_build_object('full_name', 'Tutor Three'));

  -- Create listing
  INSERT INTO public.listings (id, profile_id, title, description, subjects, levels, hourly_rate, location_type)
  VALUES (v_listing_id, v_tutor_id, 'English Tutoring', 'English tutoring session', ARRAY['English'], ARRAY['A-Level'], 50.00, 'online');

  -- Create booking
  INSERT INTO public.bookings (id, student_id, tutor_id, listing_id, referrer_profile_id, service_name, session_start_time, session_duration, amount, status, payment_status)
  VALUES (gen_random_uuid(), v_student_id, v_tutor_id, v_listing_id, NULL, 'English Session', now() + interval '1 day', 60, 100.00, 'Confirmed', 'Pending')
  RETURNING id INTO v_booking_id;

  -- Process payment first time
  PERFORM public.handle_successful_payment(v_booking_id);

  -- Process payment second time (simulating duplicate webhook)
  PERFORM public.handle_successful_payment(v_booking_id);

  -- Count transactions (should only have 3: client payment, tutor payout, platform fee)
  SELECT COUNT(*) INTO v_transaction_count
  FROM public.transactions
  WHERE booking_id = v_booking_id;

  IF v_transaction_count != 3 THEN
    RAISE EXCEPTION 'FAIL: Idempotency check failed. Expected 3 transactions, Got: %', v_transaction_count;
  END IF;

  RAISE NOTICE '✓ PASS: Idempotency check - no duplicate transactions';

  -- Cleanup
  DELETE FROM public.transactions WHERE booking_id = v_booking_id;
  DELETE FROM public.bookings WHERE id = v_booking_id;
  DELETE FROM public.listings WHERE id = v_listing_id;
  DELETE FROM public.profiles WHERE id IN (v_student_id, v_tutor_id);
  DELETE FROM auth.users WHERE id IN (v_student_id, v_tutor_id);
END;
$$;

\echo ''
\echo '=== ALL TESTS COMPLETED SUCCESSFULLY ==='
\echo 'Phase 1: Database Foundation is validated and ready for Phase 2!'
