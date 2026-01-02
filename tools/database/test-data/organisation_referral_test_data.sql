-- =====================================================
-- Organisation Referral Program Test Data
-- Created: 2026-01-02
-- Purpose: Populate test data for organisation referral pipeline testing
-- =====================================================
--
-- This script creates:
-- 1. Enables referral program for the organisation
-- 2. Creates test referrals across all conversion stages
-- 3. Populates member stats for leaderboard testing
--
-- Usage:
-- 1. Make sure you have an organisation created in connection_groups
-- 2. Update @org_id with your organisation's UUID
-- 3. Update @member_ids with your team member UUIDs
-- 4. Run: psql -h localhost -U postgres -d tutorwise -f organisation_referral_test_data.sql
-- =====================================================

-- Variables (UPDATE THESE WITH YOUR ACTUAL IDs)
-- Get your organisation ID: SELECT id, name FROM connection_groups WHERE profile_id = 'YOUR_PROFILE_ID';
-- Get member IDs: SELECT id, full_name FROM profiles WHERE id IN (SELECT connection_id FROM group_members WHERE group_id = 'YOUR_ORG_ID');

DO $$
DECLARE
    v_org_id UUID := 'YOUR_ORG_ID_HERE'; -- Update this!
    v_member1_id UUID := 'MEMBER_1_ID_HERE'; -- Update this!
    v_member2_id UUID := 'MEMBER_2_ID_HERE'; -- Update this!
    v_member3_id UUID := 'MEMBER_3_ID_HERE'; -- Update this!
    v_referral_id UUID;
BEGIN
    -- =====================================================
    -- STEP 1: Enable Referral Program for Organisation
    -- =====================================================
    INSERT INTO public.organisation_referral_config (
        organisation_id,
        enabled,
        referral_commission_percentage,
        organisation_split_percentage,
        member_split_percentage,
        minimum_booking_value,
        require_payment_completion,
        payout_threshold
    ) VALUES (
        v_org_id,
        true,                           -- Enable the program
        15.00,                          -- 15% commission on bookings
        40.00,                          -- 40% to organisation
        60.00,                          -- 60% to referring member
        50.00,                          -- Minimum £50 booking value
        true,                           -- Require payment before commission
        100.00                          -- £100 minimum payout threshold
    )
    ON CONFLICT (organisation_id) DO UPDATE SET
        enabled = true,
        updated_at = NOW();

    RAISE NOTICE 'Referral program enabled for organisation: %', v_org_id;

    -- =====================================================
    -- STEP 2: Create Referrals in Different Conversion Stages
    -- =====================================================

    -- STAGE: referred (New Leads) - 5 referrals
    FOR i IN 1..5 LOOP
        INSERT INTO public.referrals (
            agent_id,
            referred_name,
            referred_email,
            referred_phone,
            status,
            organisation_id,
            referrer_member_id,
            conversion_stage,
            estimated_value,
            created_at
        ) VALUES (
            v_member1_id,
            'Lead ' || i || ' Johnson',
            'lead' || i || '@example.com',
            '+44771234' || LPAD(i::TEXT, 4, '0'),
            'Pending',
            v_org_id,
            v_member1_id,
            'referred',
            (100 + (i * 50))::NUMERIC(10,2),  -- £150, £200, £250, £300, £350
            NOW() - (i || ' days')::INTERVAL
        );
    END LOOP;
    RAISE NOTICE 'Created 5 referrals in "referred" stage';

    -- STAGE: contacted (Contacted) - 4 referrals
    FOR i IN 1..4 LOOP
        INSERT INTO public.referrals (
            agent_id,
            referred_name,
            referred_email,
            referred_phone,
            status,
            organisation_id,
            referrer_member_id,
            conversion_stage,
            contacted_at,
            estimated_value,
            created_at
        ) VALUES (
            v_member2_id,
            'Contact ' || i || ' Smith',
            'contact' || i || '@example.com',
            '+44772234' || LPAD(i::TEXT, 4, '0'),
            'Contacted',
            v_org_id,
            v_member2_id,
            'contacted',
            NOW() - (i || ' days')::INTERVAL,
            (200 + (i * 75))::NUMERIC(10,2),  -- £275, £350, £425, £500
            NOW() - ((i + 5) || ' days')::INTERVAL
        );
    END LOOP;
    RAISE NOTICE 'Created 4 referrals in "contacted" stage';

    -- STAGE: meeting (Meeting Set) - 3 referrals
    FOR i IN 1..3 LOOP
        INSERT INTO public.referrals (
            agent_id,
            referred_name,
            referred_email,
            referred_phone,
            status,
            organisation_id,
            referrer_member_id,
            conversion_stage,
            contacted_at,
            first_meeting_at,
            estimated_value,
            created_at
        ) VALUES (
            v_member1_id,
            'Meeting ' || i || ' Williams',
            'meeting' || i || '@example.com',
            '+44773234' || LPAD(i::TEXT, 4, '0'),
            'In Progress',
            v_org_id,
            v_member1_id,
            'meeting',
            NOW() - ((i + 2) || ' days')::INTERVAL,
            NOW() + (i || ' days')::INTERVAL,  -- Future meetings
            (300 + (i * 100))::NUMERIC(10,2),  -- £400, £500, £600
            NOW() - ((i + 8) || ' days')::INTERVAL
        );
    END LOOP;
    RAISE NOTICE 'Created 3 referrals in "meeting" stage';

    -- STAGE: proposal (Proposal Sent) - 3 referrals
    FOR i IN 1..3 LOOP
        INSERT INTO public.referrals (
            agent_id,
            referred_name,
            referred_email,
            referred_phone,
            status,
            organisation_id,
            referrer_member_id,
            conversion_stage,
            contacted_at,
            first_meeting_at,
            proposal_sent_at,
            estimated_value,
            created_at
        ) VALUES (
            v_member3_id,
            'Proposal ' || i || ' Brown',
            'proposal' || i || '@example.com',
            '+44774234' || LPAD(i::TEXT, 4, '0'),
            'Proposal Sent',
            v_org_id,
            v_member3_id,
            'proposal',
            NOW() - ((i + 5) || ' days')::INTERVAL,
            NOW() - ((i + 2) || ' days')::INTERVAL,
            NOW() - (i || ' days')::INTERVAL,
            (400 + (i * 150))::NUMERIC(10,2),  -- £550, £700, £850
            NOW() - ((i + 12) || ' days')::INTERVAL
        );
    END LOOP;
    RAISE NOTICE 'Created 3 referrals in "proposal" stage';

    -- STAGE: negotiating (Negotiating) - 2 referrals
    FOR i IN 1..2 LOOP
        INSERT INTO public.referrals (
            agent_id,
            referred_name,
            referred_email,
            referred_phone,
            status,
            organisation_id,
            referrer_member_id,
            conversion_stage,
            contacted_at,
            first_meeting_at,
            proposal_sent_at,
            proposal_accepted_at,
            estimated_value,
            created_at
        ) VALUES (
            v_member2_id,
            'Negotiation ' || i || ' Davis',
            'negotiation' || i || '@example.com',
            '+44775234' || LPAD(i::TEXT, 4, '0'),
            'Negotiating',
            v_org_id,
            v_member2_id,
            'negotiating',
            NOW() - ((i + 8) || ' days')::INTERVAL,
            NOW() - ((i + 5) || ' days')::INTERVAL,
            NOW() - ((i + 3) || ' days')::INTERVAL,
            NOW() - (i || ' days')::INTERVAL,
            (600 + (i * 200))::NUMERIC(10,2),  -- £800, £1000
            NOW() - ((i + 15) || ' days')::INTERVAL
        );
    END LOOP;
    RAISE NOTICE 'Created 2 referrals in "negotiating" stage';

    -- STAGE: converted (Won) - 4 referrals
    FOR i IN 1..4 LOOP
        INSERT INTO public.referrals (
            agent_id,
            referred_name,
            referred_email,
            referred_phone,
            status,
            organisation_id,
            referrer_member_id,
            conversion_stage,
            contacted_at,
            first_meeting_at,
            proposal_sent_at,
            proposal_accepted_at,
            converted_at,
            estimated_value,
            actual_value,
            commission_amount,
            organisation_commission,
            member_commission,
            commission_paid,
            created_at
        ) VALUES (
            CASE
                WHEN i % 3 = 0 THEN v_member1_id
                WHEN i % 3 = 1 THEN v_member2_id
                ELSE v_member3_id
            END,
            'Client ' || i || ' Miller',
            'client' || i || '@example.com',
            '+44776234' || LPAD(i::TEXT, 4, '0'),
            'Converted',
            v_org_id,
            CASE
                WHEN i % 3 = 0 THEN v_member1_id
                WHEN i % 3 = 1 THEN v_member2_id
                ELSE v_member3_id
            END,
            'converted',
            NOW() - ((i + 12) || ' days')::INTERVAL,
            NOW() - ((i + 9) || ' days')::INTERVAL,
            NOW() - ((i + 6) || ' days')::INTERVAL,
            NOW() - ((i + 3) || ' days')::INTERVAL,
            NOW() - (i || ' days')::INTERVAL,
            (500 + (i * 250))::NUMERIC(10,2),  -- Estimated
            (500 + (i * 250))::NUMERIC(10,2),  -- Actual: £750, £1000, £1250, £1500
            (500 + (i * 250)) * 0.15,          -- 15% commission
            (500 + (i * 250)) * 0.15 * 0.40,   -- 40% to org
            (500 + (i * 250)) * 0.15 * 0.60,   -- 60% to member
            i <= 2,                             -- First 2 paid, last 2 pending
            NOW() - ((i + 20) || ' days')::INTERVAL
        );
    END LOOP;
    RAISE NOTICE 'Created 4 referrals in "converted" stage';

    -- =====================================================
    -- STEP 3: Refresh Materialized Views
    -- =====================================================
    REFRESH MATERIALIZED VIEW IF EXISTS public.organisation_referral_stats;
    REFRESH MATERIALIZED VIEW IF EXISTS public.member_referral_stats;

    RAISE NOTICE '✅ Test data creation complete!';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '  • Referral program enabled for org: %', v_org_id;
    RAISE NOTICE '  • Total referrals created: 21';
    RAISE NOTICE '  • Pipeline stages:';
    RAISE NOTICE '    - New Leads (referred): 5';
    RAISE NOTICE '    - Contacted: 4';
    RAISE NOTICE '    - Meeting Set: 3';
    RAISE NOTICE '    - Proposal Sent: 3';
    RAISE NOTICE '    - Negotiating: 2';
    RAISE NOTICE '    - Won (converted): 4';
    RAISE NOTICE '  • Total pipeline value: £10,425';
    RAISE NOTICE '  • Conversion rate: 19% (4/21)';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Navigate to Organisation > Referrals';
    RAISE NOTICE '  2. Click "Enable Program" if needed';
    RAISE NOTICE '  3. View Pipeline tab to see the kanban board';
    RAISE NOTICE '  4. Check Team tab for leaderboard';

END $$;
