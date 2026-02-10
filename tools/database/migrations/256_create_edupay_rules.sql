-- Migration: 256_create_edupay_rules.sql
-- Purpose: Create edupay_rules table — configurable EP rate per event type + seed defaults
-- Rules are versioned and never hardcoded in application code
-- Created: 2026-02-10

CREATE TABLE IF NOT EXISTS edupay_rules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type   TEXT NOT NULL,
  multiplier   DECIMAL(5,2) NOT NULL DEFAULT 100,  -- EP per £1
  pass_through DECIMAL(3,2) DEFAULT 0.90,           -- 90% to user
  platform_fee DECIMAL(3,2) DEFAULT 0.10,           -- 10% to Tutorwise
  valid_from   DATE NOT NULL,
  valid_until  DATE,
  is_active    BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_edupay_rules_active
  ON edupay_rules(event_type, valid_from)
  WHERE is_active = true;

-- Seed default EP earning rules (see solution design Section 8)
-- tutoring_income:  100 EP/£1 — funded by user's own earnings
-- referral_income:  150 EP/£1 — funded by user's own commission
-- affiliate_spend:   90 EP/£1 — funded by merchant via Awin/CJ
-- gift_reward:       90 EP/£1 — funded by retailer via Tillo
-- caas_threshold:     1 EP/£1 — platform digital perk, zero cost
INSERT INTO edupay_rules (event_type, multiplier, pass_through, platform_fee, valid_from) VALUES
  ('tutoring_income',  100.00, 0.90, 0.10, CURRENT_DATE),
  ('referral_income',  150.00, 0.90, 0.10, CURRENT_DATE),
  ('affiliate_spend',   90.00, 0.90, 0.10, CURRENT_DATE),
  ('gift_reward',       90.00, 0.90, 0.10, CURRENT_DATE),
  ('caas_threshold',     1.00, 1.00, 0.00, CURRENT_DATE);
