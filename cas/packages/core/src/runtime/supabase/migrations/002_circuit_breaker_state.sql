/**
 * Circuit Breaker State Persistence
 *
 * Stores circuit breaker state for each agent to:
 * - Survive runtime restarts
 * - Share state across multiple runtime instances
 * - Track failure patterns over time
 *
 * Run this migration in Supabase SQL Editor
 */

-- ============================================================================
-- Circuit Breaker State
-- ============================================================================

CREATE TABLE IF NOT EXISTS cas_circuit_breaker_state (
  agent_id TEXT PRIMARY KEY,
  state TEXT NOT NULL CHECK (state IN ('CLOSED', 'OPEN', 'HALF_OPEN')),
  failure_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  total_requests INTEGER NOT NULL DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  state_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_attempt_at TIMESTAMPTZ,
  metadata JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_circuit_breaker_state ON cas_circuit_breaker_state(state);
CREATE INDEX idx_circuit_breaker_updated_at ON cas_circuit_breaker_state(updated_at DESC);

COMMENT ON TABLE cas_circuit_breaker_state IS 'Per-agent circuit breaker state for AI API failure protection';

-- ============================================================================
-- Circuit Breaker History (Optional - for analysis)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cas_circuit_breaker_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  reason TEXT,
  failure_count INTEGER,
  success_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_circuit_breaker_history_agent_id ON cas_circuit_breaker_history(agent_id);
CREATE INDEX idx_circuit_breaker_history_created_at ON cas_circuit_breaker_history(created_at DESC);

COMMENT ON TABLE cas_circuit_breaker_history IS 'Historical record of circuit breaker state changes';

-- ============================================================================
-- Helper Function: Update Circuit Breaker State
-- ============================================================================

CREATE OR REPLACE FUNCTION update_circuit_breaker_state(
  p_agent_id TEXT,
  p_state TEXT,
  p_failure_count INTEGER,
  p_success_count INTEGER,
  p_total_requests INTEGER,
  p_last_failure_at TIMESTAMPTZ,
  p_last_success_at TIMESTAMPTZ,
  p_next_attempt_at TIMESTAMPTZ,
  p_metadata JSONB
)
RETURNS void AS $$
DECLARE
  v_old_state TEXT;
BEGIN
  -- Get current state if exists
  SELECT state INTO v_old_state
  FROM cas_circuit_breaker_state
  WHERE agent_id = p_agent_id;

  -- Upsert circuit breaker state
  INSERT INTO cas_circuit_breaker_state (
    agent_id,
    state,
    failure_count,
    success_count,
    total_requests,
    last_failure_at,
    last_success_at,
    next_attempt_at,
    metadata,
    state_changed_at,
    updated_at
  )
  VALUES (
    p_agent_id,
    p_state,
    p_failure_count,
    p_success_count,
    p_total_requests,
    p_last_failure_at,
    p_last_success_at,
    p_next_attempt_at,
    p_metadata,
    CASE WHEN v_old_state IS NULL OR v_old_state != p_state THEN NOW() ELSE (SELECT state_changed_at FROM cas_circuit_breaker_state WHERE agent_id = p_agent_id) END,
    NOW()
  )
  ON CONFLICT (agent_id) DO UPDATE SET
    state = EXCLUDED.state,
    failure_count = EXCLUDED.failure_count,
    success_count = EXCLUDED.success_count,
    total_requests = EXCLUDED.total_requests,
    last_failure_at = EXCLUDED.last_failure_at,
    last_success_at = EXCLUDED.last_success_at,
    next_attempt_at = EXCLUDED.next_attempt_at,
    metadata = EXCLUDED.metadata,
    state_changed_at = CASE WHEN cas_circuit_breaker_state.state != p_state THEN NOW() ELSE cas_circuit_breaker_state.state_changed_at END,
    updated_at = NOW();

  -- Log state change to history
  IF v_old_state IS NOT NULL AND v_old_state != p_state THEN
    INSERT INTO cas_circuit_breaker_history (
      agent_id,
      from_state,
      to_state,
      failure_count,
      success_count
    ) VALUES (
      p_agent_id,
      v_old_state,
      p_state,
      p_failure_count,
      p_success_count
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Success
-- ============================================================================

SELECT 'Circuit Breaker State tables created successfully!' AS status;
