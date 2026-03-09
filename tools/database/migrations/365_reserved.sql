-- Migration 365: Referral Network Stats (Materialized View)
-- Phase: Conductor Phase 3 — Referral Intelligence (Phase 4 full network page)
-- View: referral_network_stats — graph depth, hub nodes, ghost rate, delegation adoption
-- Spec: conductor/referral-intelligence-spec.md §8C
-- Agent: Retention Monitor (query_referral_funnel tool)
-- Refresh: hourly at :30

CREATE MATERIALIZED VIEW IF NOT EXISTS referral_network_stats AS
WITH RECURSIVE rc AS (
  -- Anchor: root users (not referred by anyone)
  SELECT id AS user_id, 0 AS depth
  FROM profiles WHERE referred_by_profile_id IS NULL

  UNION ALL

  -- Recursive: users referred by someone
  SELECT p.id, rc.depth + 1
  FROM profiles p
  JOIN rc ON rc.user_id = p.referred_by_profile_id
  WHERE rc.depth < 10   -- guard against runaway recursion
),
chain AS (
  SELECT * FROM rc
),
hub_nodes AS (
  SELECT agent_id, COUNT(*) AS referral_count
  FROM referrals
  GROUP BY agent_id
  HAVING COUNT(*) >= 10
),
metrics AS (
  SELECT
    (SELECT ROUND(AVG(depth)::numeric, 2)
       FROM chain WHERE depth > 0)                                         AS avg_depth,
    (SELECT MAX(depth) FROM chain)                                         AS max_depth,
    (SELECT COUNT(*) FROM hub_nodes)                                       AS hub_count,
    -- Ghost rate: referred but no signup after 7 days (last 30d cohort)
    (SELECT ROUND(
       COUNT(CASE WHEN status = 'Referred'
                   AND created_at < now() - interval '7 days' THEN 1 END)::numeric
       / NULLIF(COUNT(*), 0) * 100, 1
     ) FROM referrals
       WHERE created_at > now() - interval '30 days')                      AS ghost_rate_pct,
    -- Delegation adoption: % of orgs with at least 1 delegated referral
    (SELECT ROUND(
       COUNT(DISTINCT organisation_id)::numeric
       / NULLIF((SELECT COUNT(*) FROM connection_groups WHERE type = 'organisation'), 0) * 100, 1
     ) FROM referrals WHERE organisation_id IS NOT NULL)                    AS delegation_adoption_pct,
    -- Multi-hop users (depth ≥ 2)
    (SELECT COUNT(*) FROM chain WHERE depth >= 2)                          AS multi_hop_users,
    -- Total referred users (depth > 0)
    (SELECT COUNT(*) FROM chain WHERE depth > 0)                           AS total_referred_users
)
SELECT *, now() AS refreshed_at FROM metrics;

-- Single-row unique index for CONCURRENTLY refresh
CREATE UNIQUE INDEX IF NOT EXISTS referral_network_stats_singleton
  ON referral_network_stats ((1));

-- Refresh every hour at :30 — CONCURRENTLY so reads are non-blocking
SELECT cron.schedule(
  'refresh-referral-network-stats',
  '30 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY referral_network_stats'
);
