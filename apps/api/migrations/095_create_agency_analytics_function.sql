/**
 * Migration 095: Create Agency Analytics Function
 * Purpose: Calculate real-time performance metrics for organisation members
 * Created: 2025-11-26
 *
 * Features:
 * - Total revenue from referral/agent commissions
 * - Last session activity tracking
 * - Active student count per tutor
 *
 * Usage:
 * SELECT * FROM get_agency_member_analytics('org-uuid-here');
 */

-- Create function to calculate agency member analytics
CREATE OR REPLACE FUNCTION get_agency_member_analytics(org_id UUID)
RETURNS TABLE (
    member_id UUID,
    total_revenue NUMERIC,
    last_session_at TIMESTAMPTZ,
    active_students INT
) AS $$
BEGIN
    RETURN QUERY
    WITH org_members AS (
        -- Get all member profile IDs from the organisation
        SELECT DISTINCT
            CASE
                WHEN pg.source_profile_id = (SELECT profile_id FROM connection_groups WHERE id = org_id)
                THEN pg.target_profile_id
                ELSE pg.source_profile_id
            END AS tutor_id
        FROM group_members gm
        INNER JOIN profile_graph pg ON gm.connection_id = pg.id
        WHERE gm.group_id = org_id
    ),
    revenue_data AS (
        -- Calculate total revenue from referral commissions
        -- In the future, this could include calculating agency commission
        -- from tutor payouts based on group_members.commission_rate
        SELECT
            om.tutor_id,
            COALESCE(SUM(t.amount), 0) AS total_rev
        FROM org_members om
        LEFT JOIN bookings b ON b.tutor_id = om.tutor_id
        LEFT JOIN transactions t ON t.booking_id = b.id
        WHERE t.type = 'Referral Commission'
            AND t.status = 'Paid'
        GROUP BY om.tutor_id
    ),
    session_data AS (
        -- Find last session date from completed bookings
        SELECT
            om.tutor_id,
            MAX(b.session_start_time) AS last_session
        FROM org_members om
        LEFT JOIN bookings b ON b.tutor_id = om.tutor_id
        WHERE b.status = 'Completed'
        GROUP BY om.tutor_id
    ),
    student_data AS (
        -- Count active students (distinct students with confirmed bookings)
        SELECT
            om.tutor_id,
            COUNT(DISTINCT b.client_id) AS student_count
        FROM org_members om
        LEFT JOIN bookings b ON b.tutor_id = om.tutor_id
        WHERE b.status IN ('Confirmed', 'Completed')
        GROUP BY om.tutor_id
    )
    -- Combine all metrics
    SELECT
        om.tutor_id AS member_id,
        COALESCE(rd.total_rev, 0) AS total_revenue,
        sd.last_session AS last_session_at,
        COALESCE(std.student_count, 0)::INT AS active_students
    FROM org_members om
    LEFT JOIN revenue_data rd ON rd.tutor_id = om.tutor_id
    LEFT JOIN session_data sd ON sd.tutor_id = om.tutor_id
    LEFT JOIN student_data std ON std.tutor_id = om.tutor_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comment for documentation
COMMENT ON FUNCTION get_agency_member_analytics(UUID) IS
'Calculates performance analytics for organisation members including revenue, last activity, and active students';

-- Create index on transactions for faster commission queries
CREATE INDEX IF NOT EXISTS idx_transactions_booking_type_status
ON transactions(booking_id, type, status)
WHERE type = 'Referral Commission';

-- Create index on bookings for faster tutor queries
CREATE INDEX IF NOT EXISTS idx_bookings_tutor_status
ON bookings(tutor_id, status);

-- Verification query (run manually to test):
-- SELECT * FROM get_agency_member_analytics('your-org-id-here');
