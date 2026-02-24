-- Migration: Add referral, transaction, payout, and dispute metrics to platform_statistics_daily
-- Created: 2025-12-31
-- Purpose: Enable real-time metrics for admin dashboard

-- Referral metrics
ALTER TABLE platform_statistics_daily ADD COLUMN IF NOT EXISTS referrals_total integer DEFAULT 0;
ALTER TABLE platform_statistics_daily ADD COLUMN IF NOT EXISTS referrals_active integer DEFAULT 0;
ALTER TABLE platform_statistics_daily ADD COLUMN IF NOT EXISTS referrals_converted integer DEFAULT 0;
ALTER TABLE platform_statistics_daily ADD COLUMN IF NOT EXISTS referrals_conversion_rate real DEFAULT 0;
ALTER TABLE platform_statistics_daily ADD COLUMN IF NOT EXISTS referrals_clicks_total integer DEFAULT 0;
ALTER TABLE platform_statistics_daily ADD COLUMN IF NOT EXISTS referrals_signups_total integer DEFAULT 0;
ALTER TABLE platform_statistics_daily ADD COLUMN IF NOT EXISTS referrals_commissions_total real DEFAULT 0;
ALTER TABLE platform_statistics_daily ADD COLUMN IF NOT EXISTS referrals_avg_commission real DEFAULT 0;

-- Transaction metrics (already exist based on useAdminMetric types, but adding IF NOT EXISTS for safety)
ALTER TABLE platform_statistics_daily ADD COLUMN IF NOT EXISTS transactions_total integer DEFAULT 0;
ALTER TABLE platform_statistics_daily ADD COLUMN IF NOT EXISTS transactions_clearing integer DEFAULT 0;
ALTER TABLE platform_statistics_daily ADD COLUMN IF NOT EXISTS transactions_available integer DEFAULT 0;
ALTER TABLE platform_statistics_daily ADD COLUMN IF NOT EXISTS transactions_paid_out integer DEFAULT 0;
ALTER TABLE platform_statistics_daily ADD COLUMN IF NOT EXISTS transactions_disputed integer DEFAULT 0;
ALTER TABLE platform_statistics_daily ADD COLUMN IF NOT EXISTS transactions_refunded integer DEFAULT 0;

-- Payout metrics
ALTER TABLE platform_statistics_daily ADD COLUMN IF NOT EXISTS payouts_total integer DEFAULT 0;
ALTER TABLE platform_statistics_daily ADD COLUMN IF NOT EXISTS payouts_pending integer DEFAULT 0;
ALTER TABLE platform_statistics_daily ADD COLUMN IF NOT EXISTS payouts_in_transit integer DEFAULT 0;
ALTER TABLE platform_statistics_daily ADD COLUMN IF NOT EXISTS payouts_completed integer DEFAULT 0;
ALTER TABLE platform_statistics_daily ADD COLUMN IF NOT EXISTS payouts_failed integer DEFAULT 0;
ALTER TABLE platform_statistics_daily ADD COLUMN IF NOT EXISTS payouts_total_value real DEFAULT 0;

-- Dispute metrics
ALTER TABLE platform_statistics_daily ADD COLUMN IF NOT EXISTS disputes_total integer DEFAULT 0;
ALTER TABLE platform_statistics_daily ADD COLUMN IF NOT EXISTS disputes_action_required integer DEFAULT 0;
ALTER TABLE platform_statistics_daily ADD COLUMN IF NOT EXISTS disputes_under_review integer DEFAULT 0;
ALTER TABLE platform_statistics_daily ADD COLUMN IF NOT EXISTS disputes_won integer DEFAULT 0;
ALTER TABLE platform_statistics_daily ADD COLUMN IF NOT EXISTS disputes_lost integer DEFAULT 0;

-- Review metrics - Agent parity (agents should have same metrics as clients/tutors)
ALTER TABLE platform_statistics_daily ADD COLUMN IF NOT EXISTS reviews_agents_reviewed integer DEFAULT 0;

-- Comment on purpose
COMMENT ON COLUMN platform_statistics_daily.referrals_total IS 'Total number of referrals created';
COMMENT ON COLUMN platform_statistics_daily.referrals_active IS 'Number of active referrals (not yet converted or expired)';
COMMENT ON COLUMN platform_statistics_daily.referrals_converted IS 'Number of converted referrals (resulted in booking)';
COMMENT ON COLUMN platform_statistics_daily.referrals_conversion_rate IS 'Conversion rate as percentage (converted/total * 100)';
COMMENT ON COLUMN platform_statistics_daily.referrals_clicks_total IS 'Total clicks on referral links';
COMMENT ON COLUMN platform_statistics_daily.referrals_signups_total IS 'Total signups from referral links';
COMMENT ON COLUMN platform_statistics_daily.referrals_commissions_total IS 'Total commissions paid to referrers';
COMMENT ON COLUMN platform_statistics_daily.referrals_avg_commission IS 'Average commission per referral';
COMMENT ON COLUMN platform_statistics_daily.reviews_agents_reviewed IS 'Number of unique agents who have received reviews (parity with tutors/clients)';
