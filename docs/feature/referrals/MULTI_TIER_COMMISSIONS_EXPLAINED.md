# Multi-Tier Commission Structures (Referral Chains)

**Document Version**: 1.0
**Date**: 2025-12-16
**Status**: Educational Reference
**Implementation Status**: Infrastructure ready, 1-tier ACTIVE, 2-3 tiers DISABLED

---

## Table of Contents

1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [Practical Examples](#practical-examples)
4. [Platform Revenue Analysis](#platform-revenue-analysis)
5. [Who Makes More Money?](#who-makes-more-money)
6. [Legal Analysis](#legal-analysis)
7. [Competitive Landscape](#competitive-landscape)
8. [Database Structure](#database-structure)
9. [Implementation Algorithm](#implementation-algorithm)
10. [Risks & Considerations](#risks--considerations)

---

## Overview

Multi-tier commissions create a referral chain where agents earn from multiple levels of referrals, similar to MLM (multi-level marketing) structures. This document explains the concept, legality, and implementation considerations for TutorWise.

**Key Concept**: Instead of only earning from direct referrals (single-tier), agents earn from referrals made by their recruits (multi-tier), creating passive income streams and viral growth incentives.

---

## How It Works

### Traditional Single-Tier (Current System)

```
Agent A → Tutor B → Client C books lesson
```

**Commission Flow**:
- Agent A earns 10% (direct referral of Tutor B)
- That's it. Single tier.

### Multi-Tier System

```
Agent A → Agent B → Tutor C → Client D books lesson
```

**Commission Flow (3-tier example)**:
- **Tier 1**: Agent B earns 10% (direct referral of Tutor C)
- **Tier 2**: Agent A earns 3% (referred Agent B, who referred Tutor C)
- Platform keeps 10%
- Tutor gets 77%

**Total**: 13% in commissions (vs 10% single-tier), difference paid by tutor

---

## Practical Examples

### Example 1: Single-Tier (Current)

**Scenario**: Agent A refers Tutor B, Client books Tutor B for £100

**Split**:
```
£100 booking
├─ Tutor B: £80 (80%)
├─ Agent A: £10 (10%)
└─ Platform: £10 (10%)
```

### Example 2: Multi-Tier (3 levels deep)

**Scenario**: Agent A → Agent B → Tutor C, Client books Tutor C for £100

**Split**:
```
£100 booking
├─ Tutor C: £77 (77%)
├─ Agent B: £10 (10% - Tier 1, direct referrer)
├─ Agent A: £3 (3% - Tier 2, referred the referrer)
└─ Platform: £10 (10%)
```

### Example 3: Deeper Chain (5 levels)

**Scenario**: Agent A → Agent B → Agent C → Agent D → Tutor E, Client books for £100

**Split**:
```
£100 booking
├─ Tutor E: £74 (74%)
├─ Agent D: £10 (Tier 1: 10%)
├─ Agent C: £5 (Tier 2: 5%)
├─ Agent B: £3 (Tier 3: 3%)
├─ Agent A: £2 (Tier 4: 2%)
└─ Platform: £6 (6%)
```

**Note**: TutorWise caps at 3 tiers initially to stay conservative and legally defensible.

---

## Platform Revenue Analysis

### Does Multi-Tier Increase Platform Revenue?

**Short Answer**: No per-booking, but YES through volume growth.

### Revenue Comparison

#### Scenario 1: No Agent (Organic Tutor)

**Single-Tier**:
```
£100 booking
├─ Tutor: £90 (no commission to pay)
└─ Platform: £10
```

**Multi-Tier**:
```
£100 booking
├─ Tutor: £90 (no commission to pay)
└─ Platform: £10
```

**Result**: Same revenue

#### Scenario 2: Direct Referral (1 agent)

**Single-Tier**:
```
£100 booking
├─ Tutor: £80
├─ Agent: £10
└─ Platform: £10
```

**Multi-Tier**:
```
£100 booking
├─ Tutor: £80
├─ Agent: £10
└─ Platform: £10
```

**Result**: Same revenue

#### Scenario 3: Chain Referral (2+ agents)

**Single-Tier**:
```
£100 booking
├─ Tutor: £80
├─ Agent A (direct): £10
└─ Platform: £10
```

**Multi-Tier**:
```
£100 booking
├─ Tutor: £77
├─ Agent B (Tier 1): £10
├─ Agent A (Tier 2): £3
└─ Platform: £10
```

**Result**: Platform revenue SAME (£10), tutors lose £3

### The Real Revenue Impact: Volume Growth

**Single-Tier System (Year 1)**:
```
1,000 tutors × 10 bookings/month = 10,000 bookings
Platform earns: 10,000 × £10 = £100,000/month (£1.2M/year)
```

**Multi-Tier System (Year 1 with viral growth)**:
```
10,000 tutors × 10 bookings/month = 100,000 bookings
Platform earns: 100,000 × £10 = £1,000,000/month (£12M/year)
```

**Result**: 10x revenue from volume growth, not fee increases!

### Who Benefits?

| Party | Single-Tier | Multi-Tier | Outcome |
|-------|-------------|------------|---------|
| **Platform** | £10/booking | £10/booking | Same per-booking, but 10x volume = 10x total revenue |
| **Tutors** | £80 or £90 | £77-£80 | **LOSE** £3/booking with chains |
| **Agents** | £10 direct only | £10 + £3 passive | **WIN** through passive income |

### Year 1 Financial Model (Multi-Tier)

**Assumptions**:
- 1 Super Agent → 100 Network Agents → 1,000 Direct Agents → 10,000 Tutors
- Each tutor: 10 bookings/month at £100

**Platform Income**:
```
Monthly Bookings: 100,000
Gross Booking Value: £10,000,000/month
Platform Fee (10%): £1,000,000/month
Annual Revenue: £12,000,000/year
```

**Platform Costs**:
```
Payment Processing (2%): £2,400,000/year
Infrastructure/Hosting: £600,000/year
Support/Operations: £1,200,000/year
Fraud Prevention: £300,000/year
Total Costs: £4,500,000/year
```

**Platform Net Profit**:
```
Revenue: £12,000,000/year
Costs: £4,500,000/year
Net Profit: £7,500,000/year (62.5% margin)
```

**Commission Payouts**:
```
Tier 1 Commissions: £1,000,000/month (1,000 agents × £1,000 avg)
Tier 2 Commissions: £300,000/month (100 agents × £3,000 avg)
Total Agent Payouts: £1,300,000/month (£15.6M/year)
Tutor Payouts: £7,700,000/month (£92.4M/year)
```

**Money Flow Summary**:
```
Clients Pay: £10,000,000/month (100%)
├─ Tutors Get: £7,700,000 (77%)
├─ Agents Get: £1,300,000 (13%)
└─ Platform Gets: £1,000,000 (10%)
```

---

## Who Makes More Money?

### The Misconception: "Top Agent Earns Most"

**Wrong**. Agent A (top of chain) makes LESS per booking than Agent B (direct referrer).

### Earnings Per Booking

**Scenario**: Agent A → Agent B → Tutor C → Client books £100 lesson

```
Agent B (Tier 1 - Direct referrer): £10 (10%)
Agent A (Tier 2 - Referred Agent B): £3 (3%)
```

**Result**: Agent B earns £10, Agent A earns only £3 (3.3x less)

### When Does "Top Agent" Earn More?

**Agent A only earns more through SCALE at Tier 2**.

This is what most people mean when they say multi-tier benefits "early adopters" - not because the rate is higher, but because they can build larger networks.

### Example: Scale Advantage

**Agent B's Strategy**: Recruit tutors directly
```
10 tutors × 10 bookings × £10 = £1,000/month
```

**Agent A's Strategy**: Recruit agents who recruit tutors
```
10 agents × 10 tutors each × 10 bookings × £3 = £30,000/month
```

**Result**: Agent A earns 30x more through scale, not higher rates.

### The Math Formula

**Per-Booking Earnings**:
- Tier 1 (Direct): Always earns MORE (£10)
- Tier 2 (Indirect): Always earns LESS (£3)

**Total Monthly Earnings**:
- Agent A (Tier 2) = Number of downline tutors × bookings × £3
- Agent B (Tier 1) = Number of direct tutors × bookings × £10

**Agent A earns more IF**:
```
(Downline tutors) × £3 > (Direct tutors) × £10
Downline tutors > 3.3 × Direct tutors
```

### Real-World Example: The "Super Agent"

**Setup**:
- Agent A recruits 100 agents
- Each recruits 10 tutors
- Each tutor: 10 bookings/month

**Agent A's Income**:
```
Tier 1: 100 agents × 0 bookings = £0 (agents don't book lessons)
Tier 2: 1,000 tutors × 10 bookings × £3 = £30,000/month
Total: £30,000/month (£360k/year) - PASSIVE INCOME
```

**Individual Agent B's Income**:
```
Tier 1: 10 tutors × 10 bookings × £10 = £1,000/month
Total: £1,000/month (£12k/year) - ACTIVE INCOME
```

**Result**: Agent A earns 30x more through network building.

### Key Insight

This is the standard MLM mechanic and exactly what people mean when they say:

> "Agent A only earns more through scale at Tier 2"

It's not a misconception - it's how the system is designed to work. The controversy is whether this creates sustainable growth or problematic incentives.

---

## Legal Analysis

### Is Multi-Tier a Pyramid Scheme?

**Short Answer**: It CAN be, but doesn't have to be. The legality depends on specific implementation details.

### Pyramid Scheme vs Legal MLM

#### ❌ ILLEGAL Pyramid Scheme

**Characteristics**:
- **Primary income from recruitment** - Agents earn mainly by recruiting other agents
- **No real product/service** - Money flows from new recruits, not customers
- **Inventory loading** - Forcing purchases to qualify for commissions
- **Unsustainable** - Collapses when recruitment slows

**Example (ILLEGAL)**:
```
Agent A recruits Agent B for £500 fee
Agent A earns £200 commission on recruitment
Agent B must recruit 3 more agents to break even
No tutoring services actually sold - just recruitment fees
```

#### ✅ LEGAL Multi-Level Marketing (MLM)

**Characteristics**:
- **Primary income from product sales** - Commissions from actual bookings
- **Real service provided** - Tutoring lessons are delivered
- **No recruitment fees** - Free to become an agent
- **Sustainable** - Can continue even without new recruits

**Example (LEGAL)**:
```
Agent A recruits Tutor B (FREE)
Tutor B provides tutoring services
Client C books lessons with Tutor B
Agent A earns commission on those bookings
Real service delivered, no recruitment fees
```

### TutorWise Multi-Tier Analysis

#### ✅ LEGAL Elements

- ✅ **Free to join** - No agent signup fees
- ✅ **Real service** - Tutoring lessons delivered to real clients
- ✅ **Commission from bookings** - Agents earn from actual transactions, not recruitment
- ✅ **No purchase requirements** - Tutors don't need to buy anything
- ✅ **Value to end customer** - Students get real tutoring
- ✅ **70% rule** - 100% of revenue from client bookings (exceeds FTC 70% threshold)

#### ⚠️ RISK Elements

- ⚠️ **Chain commissions** - Resembles MLM structure
- ⚠️ **Passive income from recruitment** - Could incentivize recruitment over quality
- ⚠️ **Reduced tutor earnings** - Tutors subsidize upline commissions (£77 vs £80)
- ⚠️ **Income concentration** - Top agents earn disproportionately

### Legal Requirements (UK/EU)

#### UK Consumer Protection Regulations

To stay legal, TutorWise must:

1. **No recruitment fees** ✅
   - Agents join for free

2. **Primary value from product** ✅
   - Commissions come from tutoring bookings
   - Not from recruiting agents

3. **Transparent disclosure** ⚠️
   - Must clearly explain commission structure
   - Tutors must know their earnings are reduced
   - Income claims must be realistic (not "earn £10k/month!")

4. **70% rule (FTC guidance)** ✅
   - At least 70% of revenue from retail customers
   - Not from agent self-consumption
   - TutorWise: 100% from client bookings ✅

5. **Refund policy** ✅
   - No inventory to return (service-based)

#### Example of Compliant Disclosure

```
"As a TutorWise agent, you earn:
- 10% commission on tutors you directly recruit (Tier 1)
- 3% commission on tutors recruited by your agents (Tier 2)

Commissions are paid only when tutoring services are delivered
to real clients. No earnings from recruitment itself.

Tutors' base earnings are 77-80% of booking value. Platform
takes 10%. Remaining 10-13% is distributed across agent chain.

Average agent earnings (Q1 2026):
- New agents (0-3 months): £120/month
- Active agents (3-12 months): £450/month
- Super agents (12+ months, top 10%): £2,100/month

These earnings are NOT guaranteed and depend on your recruiting
efforts and the performance of tutors you refer."
```

### Case Studies: Legal Precedents

#### ❌ Illegal Examples

**Herbalife (2016)** - Fined $200M
- Focused on recruitment over product sales
- 73% of distributors earned nothing
- Misled income claims

**Vemma (2015)** - Shut down by FTC
- Recruitment fees disguised as product purchases
- Income mainly from recruiting

**Forsage (2022)** - Crypto MLM, $340M fraud
- Pure pyramid scheme using blockchain
- No real product, only recruitment

**OneCoin (2017)** - $4B+ Ponzi scheme
- Fake cryptocurrency
- Multi-tier recruitment structure
- Founders arrested

#### ✅ Legal Examples

**Avon, Mary Kay, Tupperware**
- Real products sold to end customers
- Commissions from sales, not recruitment
- Transparent earnings disclosure

**eXp Realty** (Closest Comp)
- Real estate brokerage
- Up to 7-tier commission structure
- $4.2B revenue, 89,000 agents
- Publicly traded (NASDAQ: EXPI)
- Highly regulated and legal

### How to Keep TutorWise Legal

#### Implementation Safeguards

1. **Cap commission tiers at 2-3 levels**
   - More levels = higher pyramid risk
   - 2-3 tiers is defensible
   - eXp uses 7, but we're more conservative

2. **Track revenue sources**
   ```sql
   -- Ensure >70% revenue from client bookings, not internal
   SELECT
     SUM(amount) FILTER (WHERE customer_type = 'external_client') AS external_revenue,
     SUM(amount) FILTER (WHERE customer_type = 'agent_self_purchase') AS internal_revenue
   FROM transactions;
   ```

3. **Ban agent self-dealing**
   - Agents can't book their own tutors for fake commissions
   - Fraud detection flags suspicious patterns

4. **Transparent disclosure**
   - Show commission structure clearly
   - No misleading income claims
   - Publish average earnings data

5. **Legal review required**
   - Consult UK/EU MLM attorney before launch (estimated £50k)
   - File regulatory disclosures if needed
   - Monitor for regulatory changes

### Recommendation

#### ✅ Green Light Scenarios (Legal)

- **2-tier maximum** - Agent A → Tutor B (10%+3%)
- **Clear disclosure** - Tutors know they earn less
- **No recruitment pressure** - Quality over quantity
- **Strong fraud detection** - Block self-dealing
- **Real service delivery** - 100% from actual bookings

#### ❌ Red Light Scenarios (Illegal Risk)

- **5+ tiers** - Looks too much like pyramid
- **Recruitment bonuses** - Pay agents for signing up agents
- **Inventory requirements** - Force tutors to buy materials
- **Income misrepresentation** - "Earn £10k/month easily!"
- **Self-dealing** - Agents book their own tutors

### Final Legal Answer

**Is it a pyramid scheme?**
Not inherently, but it could become one if implemented poorly.

**Is it legal?**
**YES**, IF:
- ✅ No recruitment fees
- ✅ Commissions from real bookings (not recruitment)
- ✅ Transparent disclosure
- ✅ Capped at 2-3 tiers
- ✅ Legal review completed

**NO**, IF:
- ❌ Income mainly from recruiting
- ❌ Hidden or misleading terms
- ❌ 5+ tier chains
- ❌ Self-dealing encouraged

**Recommendation**: Proceed with 2-tier only + legal review before launch. The current single-tier + commission delegation model is much safer legally.

---

## Competitive Landscape

### Direct Competitors (Tutoring Platforms)

**None** that I'm aware of. Traditional tutoring platforms use single-tier or no referrals:

| Platform | Referral Model | Tiers | Status |
|----------|----------------|-------|--------|
| Tutor.com | None | 0 | No referrals |
| Wyzant | Single-tier affiliate | 1 | $25 one-time bonus |
| Preply | Single-tier referral | 1 | €20 credit |
| Chegg Tutors | None | 0 | No public referral program |
| **TutorWise** | Multi-tier MLM | 1 (launch) → 3 (future) | **UNIQUE** |

**TutorWise would be the first tutoring platform with multi-tier MLM structure.**

### Similar Multi-Tier Models (Other Industries)

#### 1. Gig Economy / Marketplaces

**Uber (Limited Multi-Tier)**:
- Driver A refers Driver B: £250 bonus
- Driver B refers Driver C: £250 bonus to Driver B
- Driver A gets: £0 from Driver C
- **Only 1-tier**, not true MLM

**DoorDash, Lyft, Instacart**: Similar to Uber - single-tier referral bonuses

**Why no multi-tier?**
- Regulatory concerns
- Driver satisfaction (want high earnings)
- Simplicity

#### 2. Creator Economy / Education

**Teachable / Thinkific**:
- Affiliate Program: 30% recurring commission (Tier 1)
- Their students: 0% (no Tier 2)
- **Single-tier only**

**Kajabi**:
- Affiliate Program: 30% recurring for 12 months
- **No multi-tier**
- Passive income, but 1-tier

#### 3. True Multi-Tier MLM (Legal)

**Amway** (Largest MLM globally):
- Products: Household goods, nutrition
- Structure: Up to 6 tiers
- Revenue: $8.9B (2022)
- Earnings: Top 1% earn $150k+/year, bottom 50% earn <$1k/year
- Commission rates:
  - Tier 1: 25%
  - Tier 2: 6%
  - Tier 3: 3%
  - Tier 4-6: 1-2%

**Herbalife** (Nutrition/Wellness):
- Products: Protein shakes, supplements
- Structure: Up to 5 tiers
- Revenue: $5.8B (2022)
- Controversy: $200M FTC settlement in 2016 for pyramid concerns

**Mary Kay** (Cosmetics):
- Products: Makeup, skincare
- Structure: 2-3 tiers (more conservative)
- Revenue: $3.25B (2022)
- Model: Beauty consultants recruit consultants
- More sustainable than Amway/Herbalife

**Avon** (Beauty Products):
- Products: Cosmetics, jewelry
- Structure: 2 tiers
- Commission:
  - Tier 1: 20-50% on sales
  - Tier 2: 3-13% on downline sales
- One of the oldest MLMs (founded 1886)

#### 4. Real Estate (Closest Comp)

**eXp Realty** (Public: NASDAQ EXPI):
- Model: Real estate brokerage with multi-tier agent recruiting
- Structure:
  - Agent A recruits Agent B (gets revenue share)
  - Agent B recruits Agent C (A gets Tier 2 revenue share)
  - Up to **7 tiers deep**
- Commission:
  - Tier 1: Agent gets 3.5% of company revenue from direct recruit
  - Tier 2: Agent gets 3.5% of Tier 1's revenue share
  - Tiers 3-7: Smaller percentages
- Revenue: $4.2B (2022)
- Agents: 89,000+ worldwide
- Legal: Yes, highly regulated by real estate boards

**This is the CLOSEST model to what TutorWise would be**:
- Service marketplace (real estate vs tutoring)
- Multi-tier commission structure
- Legal and publicly traded
- Agents recruit agents who recruit agents
- Passive income from downline

**Keller Williams**:
- Similar model to eXp
- Profit sharing from agent recruitment
- Not as aggressive on multi-tier (2-3 levels)

#### 5. SaaS Multi-Tier Referrals

**Dropbox** (Historical):
- Early days: Refer user → 500MB free
- Viral growth engine
- But: No multi-tier, no cash commissions, just credits

**Revolut, N26** (Fintech):
- Refer friend: £5-50 bonus (both parties)
- No multi-tier
- Single referral reward

**Stripe Atlas Referral**:
- Refer startup: $200-500 commission
- No multi-tier
- Professional referral, not MLM

### Why Most Platforms Avoid Multi-Tier

#### Tech Companies (Uber, Airbnb, etc.)

**Reasons**:
- **Regulatory risk** - Don't want MLM/pyramid scrutiny
- **Brand reputation** - MLM perceived as scammy
- **User trust** - Drivers/hosts want high base earnings
- **Complexity** - Hard to explain, debug, support
- **Legal costs** - Expensive compliance requirements

#### Traditional MLM Industries

**Who uses it**:
- Nutrition/wellness (Herbalife, Amway)
- Beauty/cosmetics (Mary Kay, Avon)
- Essential oils (doTERRA, Young Living)
- Tupperware
- Pampered Chef

**Why they can**:
- Established legal frameworks
- Physical products (not services)
- Long regulatory history
- Consumer expectation (people know it's MLM)

### Summary Answer

**Who else is doing multi-tier in similar markets?**

| Industry | Companies | Tiers | Legal Status |
|----------|-----------|-------|--------------|
| **Tutoring** | None | - | - |
| **Gig Economy** | None (Uber/Lyft are 1-tier) | 1 | Legal |
| **EdTech** | None (Teachable/Kajabi are 1-tier) | 1 | Legal |
| **Real Estate** | eXp Realty, Keller Williams | 3-7 | Legal ✅ |
| **Traditional MLM** | Amway, Herbalife, Mary Kay | 3-6 | Legal (regulated) |
| **Crypto MLM** | Forsage, OneCoin | 5-10 | Illegal ❌ |

**Closest comp**: eXp Realty - multi-tier service marketplace, publicly traded, legal

**TutorWise would be**: First multi-tier tutoring platform (uncharted territory)

---

## Database Structure

### Profiles Table Enhancement

```sql
ALTER TABLE profiles
ADD COLUMN referral_depth INTEGER DEFAULT 0;
-- 0 = organic user
-- 1 = referred by another user
-- 2 = referred by someone who was referred
-- etc.
```

### Commission Tiers Configuration

```sql
CREATE TABLE commission_tier_config (
  tier INTEGER PRIMARY KEY CHECK (tier BETWEEN 1 AND 7),
  commission_rate NUMERIC(5,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  legal_status TEXT DEFAULT 'pending_review',
  -- Values: 'approved', 'pending_review', 'requires_legal_clearance', 'prohibited'
  allowed_countries TEXT[] DEFAULT '{}',
  activated_at TIMESTAMPTZ,
  activated_by UUID REFERENCES profiles(id),
  notes TEXT
);

-- Initial configuration: Tier 1 ACTIVE, others DISABLED
INSERT INTO commission_tier_config VALUES
  (1, 10.00, TRUE, 'approved', '{}', NOW(), NULL, 'Direct referral commission - ACTIVE'),
  (2, 3.00, FALSE, 'requires_legal_clearance', '{}', NULL, NULL, 'Level 2 indirect referrals - DISABLED pending legal review'),
  (3, 1.50, FALSE, 'requires_legal_clearance', '{}', NULL, NULL, 'Level 3 indirect referrals - DISABLED'),
  (4, 0.00, FALSE, 'prohibited', '{}', NULL, NULL, 'Reserved for future expansion'),
  (5, 0.00, FALSE, 'prohibited', '{}', NULL, NULL, 'Reserved for future expansion'),
  (6, 0.00, FALSE, 'prohibited', '{}', NULL, NULL, 'Reserved for future expansion'),
  (7, 0.00, FALSE, 'prohibited', '{}', NULL, NULL, 'Reserved for future expansion');
```

---

## Implementation Algorithm

### Calculate Chain Commissions Function

```sql
CREATE OR REPLACE FUNCTION calculate_multi_tier_commissions(
  p_booking_id UUID,
  p_tutor_id UUID,
  p_booking_amount NUMERIC
)
RETURNS JSONB AS $$
DECLARE
  v_current_agent_id UUID;
  v_tier INTEGER := 1;
  v_max_active_tier INTEGER;
  v_commission_rate NUMERIC;
  v_commission_amount NUMERIC;
  v_total_commission NUMERIC := 0;
  v_chain JSONB := '[]'::JSONB;
BEGIN
  -- Get maximum active tier (initially 1)
  SELECT MAX(tier) INTO v_max_active_tier
  FROM commission_tier_config
  WHERE is_active = TRUE;

  -- Start with tutor's direct referrer
  SELECT referred_by_profile_id INTO v_current_agent_id
  FROM profiles
  WHERE id = p_tutor_id;

  -- Walk up the chain (max configured tiers)
  WHILE v_current_agent_id IS NOT NULL AND v_tier <= v_max_active_tier LOOP
    -- Get commission rate for this tier
    SELECT commission_rate INTO v_commission_rate
    FROM commission_tier_config
    WHERE tier = v_tier
      AND is_active = TRUE;

    IF v_commission_rate IS NULL THEN
      EXIT; -- Tier not active
    END IF;

    -- Calculate commission
    v_commission_amount := p_booking_amount * (v_commission_rate / 100);
    v_total_commission := v_total_commission + v_commission_amount;

    -- Create transaction
    INSERT INTO transactions (
      profile_id,
      booking_id,
      type,
      status,
      amount,
      metadata
    )
    VALUES (
      v_current_agent_id,
      p_booking_id,
      'Referral Commission',
      'pending',
      v_commission_amount,
      jsonb_build_object(
        'tier', v_tier,
        'commission_rate', v_commission_rate,
        'tutor_id', p_tutor_id
      )
    );

    -- Add to chain record
    v_chain := v_chain || jsonb_build_object(
      'tier', v_tier,
      'agent_id', v_current_agent_id,
      'commission', v_commission_amount
    );

    -- Move up the chain
    SELECT referred_by_profile_id INTO v_current_agent_id
    FROM profiles
    WHERE id = v_current_agent_id;

    v_tier := v_tier + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'total_tiers', v_tier - 1,
    'total_commission', v_total_commission,
    'chain', v_chain
  );
END;
$$ LANGUAGE plpgsql;
```

### Admin Tier Activation Function

```sql
CREATE OR REPLACE FUNCTION activate_commission_tier(
  p_tier INTEGER,
  p_activated_by UUID,
  p_legal_clearance_notes TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_current_status TEXT;
BEGIN
  -- Check current status
  SELECT legal_status INTO v_current_status
  FROM commission_tier_config
  WHERE tier = p_tier;

  IF v_current_status = 'prohibited' THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Cannot activate prohibited tier. Requires board approval.'
    );
  END IF;

  -- Activate tier
  UPDATE commission_tier_config
  SET
    is_active = TRUE,
    legal_status = 'approved',
    activated_at = NOW(),
    activated_by = p_activated_by,
    notes = notes || E'\n\nLegal Clearance: ' || p_legal_clearance_notes
  WHERE tier = p_tier;

  -- Create audit log
  INSERT INTO referral_attribution_audit (
    event_type,
    metadata,
    created_at
  )
  VALUES (
    'tier_activated',
    jsonb_build_object(
      'tier', p_tier,
      'activated_by', p_activated_by,
      'notes', p_legal_clearance_notes
    ),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'tier', p_tier,
    'activated_at', NOW()
  );
END;
$$ LANGUAGE plpgsql;
```

---

## Risks & Considerations

### Pros

✅ **Incentivizes agent recruitment**
- Agents motivated to build networks
- Passive income creates long-term commitment

✅ **Creates passive income streams**
- Top agents earn from downline activity
- Reduces churn (agents stay for passive income)

✅ **Accelerates viral growth**
- Exponential tutor acquisition
- 10x faster growth than single-tier

✅ **Competitive moat**
- First tutoring platform with multi-tier
- Hard for competitors to replicate (legal/technical complexity)

### Cons

❌ **Reduces tutor earnings**
- From £80 to £77 (3.75% reduction)
- Could hurt tutor satisfaction and retention

❌ **Complexity in tracking/debugging**
- Chain commissions harder to audit
- Support tickets more complex

❌ **Legal concerns (MLM regulations)**
- Requires £50k+ legal review
- Ongoing compliance costs
- Regulatory risk if rules change

❌ **Can attract pyramid scheme behavior**
- Agents may prioritize recruitment over quality
- Risk of fraud (self-dealing, fake bookings)
- Brand reputation risk ("MLM tutoring platform")

❌ **Income concentration**
- Top 1% earn 88% of commissions (typical MLM)
- Bottom 73% may earn nothing
- Creates "haves" and "have-nots"

### Why Not Implemented Yet

Multi-tier was excluded from initial launch because:

1. **Legal review needed** - MLM structures have strict regulations
2. **Complexity** - Harder to debug attribution issues
3. **User trust** - Tutors may resist reduced earnings
4. **Phase prioritization** - Single-tier proves model first
5. **Conservative approach** - Gather 6-12 months data before expansion

**Would need careful market testing and legal approval before rollout.**

---

## Implementation Status

**Current State** (2025-12-16):
- ✅ Database infrastructure complete (Migration 123)
- ✅ Commission tier configuration table created
- ✅ Multi-tier calculation function implemented
- ✅ Admin tier activation controls in place
- ✅ Comprehensive legal documentation
- ✅ Financial model and projections complete

**Active Configuration**:
- Tier 1: 10% (ACTIVE)
- Tier 2: 3% (DISABLED - requires legal clearance)
- Tier 3: 1.5% (DISABLED - requires legal clearance)
- Tiers 4-7: 0% (PROHIBITED - future expansion)

**Next Steps**:
1. Monitor Tier 1 performance (6-12 months)
2. Collect earnings data for legal review
3. Retain MLM specialist law firm (estimated £50k)
4. Prepare income disclosure documentation
5. A/B test plan for Tier 2 rollout
6. Legal clearance before Tier 2 activation

---

## Conclusion

Multi-tier commissions offer significant growth potential but require careful implementation to remain legal and sustainable. The configurable system allows TutorWise to:

1. **Launch conservatively** with 1-tier (legally safe)
2. **Gather operational data** (6-12 months)
3. **Obtain legal clearance** (MLM attorney review)
4. **Expand gradually** (A/B test Tier 2 rollout)
5. **Monitor continuously** (fraud detection, earnings disclosure)

The key to success is transparency, legal compliance, and maintaining real value delivery through actual tutoring services.

---

**Document Version**: 1.0
**Last Updated**: 2025-12-16
**Status**: Educational Reference
**For Implementation**: See [MULTI_TIER_DECISION_RATIONALE.md](MULTI_TIER_DECISION_RATIONALE.md)
**For Technical Details**: See Migration 123 and [referrals-solution-design-v2.md](referrals-solution-design-v2.md)
