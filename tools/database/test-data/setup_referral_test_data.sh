#!/bin/bash
# =====================================================
# Setup Organisation Referral Test Data
# Created: 2026-01-02
# Purpose: Automatically populate referral test data
# =====================================================

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Organisation Referral Test Data Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Database connection details
export PGPASSWORD="8goRkJd6cPkPGyIY"
DB_HOST="aws-0-eu-west-2.pooler.supabase.com"
DB_PORT="6543"
DB_NAME="postgres"
DB_USER="postgres.zdfuicukklezjnxbpkhb"

echo "Step 1: Fetching your organisation..."
ORG_QUERY="SELECT id, name FROM connection_groups WHERE profile_id IN (SELECT id FROM profiles WHERE email LIKE '%@%') LIMIT 1;"
ORG_RESULT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -A -F'|' -c "$ORG_QUERY" 2>/dev/null)

if [ -z "$ORG_RESULT" ]; then
    echo "❌ No organisation found. Please create an organisation first."
    exit 1
fi

ORG_ID=$(echo $ORG_RESULT | cut -d'|' -f1)
ORG_NAME=$(echo $ORG_RESULT | cut -d'|' -f2)

echo "✅ Found organisation: $ORG_NAME"
echo "   Organisation ID: $ORG_ID"
echo ""

echo "Step 2: Fetching team members..."
MEMBERS_QUERY="SELECT gm.connection_id, p.full_name FROM group_members gm JOIN profiles p ON gm.connection_id = p.id WHERE gm.group_id = '$ORG_ID' ORDER BY gm.created_at LIMIT 3;"
MEMBERS_RESULT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -A -F'|' -c "$MEMBERS_QUERY" 2>/dev/null)

if [ -z "$MEMBERS_RESULT" ]; then
    echo "❌ No team members found. Please add team members to your organisation first."
    exit 1
fi

# Parse member IDs
MEMBER_IDS=($(echo "$MEMBERS_RESULT" | cut -d'|' -f1))
MEMBER_NAMES=($(echo "$MEMBERS_RESULT" | cut -d'|' -f2))
MEMBER_COUNT=${#MEMBER_IDS[@]}

echo "✅ Found $MEMBER_COUNT team member(s):"
for i in "${!MEMBER_IDS[@]}"; do
    echo "   ${MEMBER_NAMES[$i]}: ${MEMBER_IDS[$i]}"
done
echo ""

# Use first member 3 times if we don't have 3 members
MEMBER1_ID=${MEMBER_IDS[0]:-$ORG_ID}
MEMBER2_ID=${MEMBER_IDS[1]:-$MEMBER1_ID}
MEMBER3_ID=${MEMBER_IDS[2]:-$MEMBER1_ID}

echo "Step 3: Creating test referral data..."
echo ""

psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<SQL
DO \$\$
DECLARE
    v_org_id UUID := '$ORG_ID';
    v_member1_id UUID := '$MEMBER1_ID';
    v_member2_id UUID := '$MEMBER2_ID';
    v_member3_id UUID := '$MEMBER3_ID';
BEGIN
    -- Enable Referral Program
    INSERT INTO public.organisation_referral_config (
        organisation_id, enabled, referral_commission_percentage,
        organisation_split_percentage, member_split_percentage,
        minimum_booking_value, require_payment_completion, payout_threshold
    ) VALUES (
        v_org_id, true, 15.00, 40.00, 60.00, 50.00, true, 100.00
    ) ON CONFLICT (organisation_id) DO UPDATE SET enabled = true, updated_at = NOW();

    -- Create referrals in "referred" stage (5)
    FOR i IN 1..5 LOOP
        INSERT INTO public.referrals (
            agent_id, referred_name, referred_email, referred_phone, status,
            organisation_id, referrer_member_id, conversion_stage, estimated_value, created_at
        ) VALUES (
            v_member1_id, 'Lead ' || i || ' Johnson', 'lead' || i || '@example.com',
            '+44771234' || LPAD(i::TEXT, 4, '0'), 'Pending', v_org_id, v_member1_id,
            'referred', (100 + (i * 50))::NUMERIC(10,2), NOW() - (i || ' days')::INTERVAL
        );
    END LOOP;

    -- Create referrals in "contacted" stage (4)
    FOR i IN 1..4 LOOP
        INSERT INTO public.referrals (
            agent_id, referred_name, referred_email, referred_phone, status,
            organisation_id, referrer_member_id, conversion_stage, contacted_at, estimated_value, created_at
        ) VALUES (
            v_member2_id, 'Contact ' || i || ' Smith', 'contact' || i || '@example.com',
            '+44772234' || LPAD(i::TEXT, 4, '0'), 'Contacted', v_org_id, v_member2_id,
            'contacted', NOW() - (i || ' days')::INTERVAL, (200 + (i * 75))::NUMERIC(10,2),
            NOW() - ((i + 5) || ' days')::INTERVAL
        );
    END LOOP;

    -- Create referrals in "meeting" stage (3)
    FOR i IN 1..3 LOOP
        INSERT INTO public.referrals (
            agent_id, referred_name, referred_email, referred_phone, status,
            organisation_id, referrer_member_id, conversion_stage, contacted_at, first_meeting_at,
            estimated_value, created_at
        ) VALUES (
            v_member1_id, 'Meeting ' || i || ' Williams', 'meeting' || i || '@example.com',
            '+44773234' || LPAD(i::TEXT, 4, '0'), 'In Progress', v_org_id, v_member1_id,
            'meeting', NOW() - ((i + 2) || ' days')::INTERVAL, NOW() + (i || ' days')::INTERVAL,
            (300 + (i * 100))::NUMERIC(10,2), NOW() - ((i + 8) || ' days')::INTERVAL
        );
    END LOOP;

    -- Create referrals in "proposal" stage (3)
    FOR i IN 1..3 LOOP
        INSERT INTO public.referrals (
            agent_id, referred_name, referred_email, referred_phone, status,
            organisation_id, referrer_member_id, conversion_stage, contacted_at, first_meeting_at,
            proposal_sent_at, estimated_value, created_at
        ) VALUES (
            v_member3_id, 'Proposal ' || i || ' Brown', 'proposal' || i || '@example.com',
            '+44774234' || LPAD(i::TEXT, 4, '0'), 'Proposal Sent', v_org_id, v_member3_id,
            'proposal', NOW() - ((i + 5) || ' days')::INTERVAL, NOW() - ((i + 2) || ' days')::INTERVAL,
            NOW() - (i || ' days')::INTERVAL, (400 + (i * 150))::NUMERIC(10,2),
            NOW() - ((i + 12) || ' days')::INTERVAL
        );
    END LOOP;

    -- Create referrals in "negotiating" stage (2)
    FOR i IN 1..2 LOOP
        INSERT INTO public.referrals (
            agent_id, referred_name, referred_email, referred_phone, status,
            organisation_id, referrer_member_id, conversion_stage, contacted_at, first_meeting_at,
            proposal_sent_at, proposal_accepted_at, estimated_value, created_at
        ) VALUES (
            v_member2_id, 'Negotiation ' || i || ' Davis', 'negotiation' || i || '@example.com',
            '+44775234' || LPAD(i::TEXT, 4, '0'), 'Negotiating', v_org_id, v_member2_id,
            'negotiating', NOW() - ((i + 8) || ' days')::INTERVAL, NOW() - ((i + 5) || ' days')::INTERVAL,
            NOW() - ((i + 3) || ' days')::INTERVAL, NOW() - (i || ' days')::INTERVAL,
            (600 + (i * 200))::NUMERIC(10,2), NOW() - ((i + 15) || ' days')::INTERVAL
        );
    END LOOP;

    -- Create referrals in "converted" stage (4)
    FOR i IN 1..4 LOOP
        INSERT INTO public.referrals (
            agent_id, referred_name, referred_email, referred_phone, status,
            organisation_id, referrer_member_id, conversion_stage, contacted_at, first_meeting_at,
            proposal_sent_at, proposal_accepted_at, converted_at, estimated_value, actual_value,
            commission_amount, organisation_commission, member_commission, commission_paid, created_at
        ) VALUES (
            CASE WHEN i % 3 = 0 THEN v_member1_id WHEN i % 3 = 1 THEN v_member2_id ELSE v_member3_id END,
            'Client ' || i || ' Miller', 'client' || i || '@example.com',
            '+44776234' || LPAD(i::TEXT, 4, '0'), 'Converted', v_org_id,
            CASE WHEN i % 3 = 0 THEN v_member1_id WHEN i % 3 = 1 THEN v_member2_id ELSE v_member3_id END,
            'converted', NOW() - ((i + 12) || ' days')::INTERVAL, NOW() - ((i + 9) || ' days')::INTERVAL,
            NOW() - ((i + 6) || ' days')::INTERVAL, NOW() - ((i + 3) || ' days')::INTERVAL,
            NOW() - (i || ' days')::INTERVAL, (500 + (i * 250))::NUMERIC(10,2),
            (500 + (i * 250))::NUMERIC(10,2), (500 + (i * 250)) * 0.15,
            (500 + (i * 250)) * 0.15 * 0.40, (500 + (i * 250)) * 0.15 * 0.60,
            i <= 2, NOW() - ((i + 20) || ' days')::INTERVAL
        );
    END LOOP;

    REFRESH MATERIALIZED VIEW IF EXISTS public.organisation_referral_stats;
    REFRESH MATERIALIZED VIEW IF EXISTS public.member_referral_stats;

    RAISE NOTICE '✅ Test data creation complete!';
END \$\$;
SQL

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Test Data Created Successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Summary:"
echo "  • Organisation: $ORG_NAME"
echo "  • Total referrals: 21"
echo "  • Pipeline stages:"
echo "    - New Leads: 5 referrals"
echo "    - Contacted: 4 referrals"
echo "    - Meeting Set: 3 referrals"
echo "    - Proposal Sent: 3 referrals"
echo "    - Negotiating: 2 referrals"
echo "    - Won: 4 referrals (2 paid, 2 pending)"
echo ""
echo "Next Steps:"
echo "  1. Open your browser to localhost:3000"
echo "  2. Navigate to Organisation > Referrals"
echo "  3. Click the 'Pipeline' tab to see the kanban board"
echo "  4. Check the 'Team' tab for the leaderboard"
echo ""
