# Tutorwise SEO Refinement Plan
**Integrating Trust-First Visibility with Existing Infrastructure**

---

## Executive Summary

This plan refines Tutorwise's existing SEO system to align with the "trust-first visibility" design principle, integrating CaaS credibility scores, referral networks, and network trust into SEO decision-making.

**Current State:** Production-ready SEO with centralized governance, structured data, and automated tracking
**Target State:** Trust-aware SEO where indexing eligibility is determined by credibility + referrals + network signals
**Timeline:** 3 phases over 6-8 weeks

---

## Phase 1: Trust & Eligibility Layer (Weeks 1-3)

### 1.1 Create SEO Eligibility Resolver

**File:** `apps/web/src/services/seo/eligibility-resolver.ts`

```typescript
/**
 * Determines if a page/entity is eligible for full SEO treatment
 * based on trust signals: CaaS score, referrals, network connections
 */

export interface SEOEligibilityInput {
  entityType: 'tutor' | 'listing' | 'hub' | 'spoke' | 'profile';
  entityId: string;

  // Trust inputs
  caasScore?: number;           // From caas_scores table
  referralCount?: number;       // From referrals table
  referralDepth?: number;       // How many hops from seed referrers
  networkTrustDensity?: number; // Connections to high-trust actors

  // Content quality
  contentScore?: number;        // Existing SEO score (0-100)
}

export interface SEOEligibilityResult {
  isEligible: boolean;
  eligibilityScore: number;     // 0-100 composite score
  indexDirective: 'index' | 'noindex';
  reasons: string[];            // Why eligible/ineligible

  breakdown: {
    caasWeight: number;
    referralWeight: number;
    networkWeight: number;
    contentWeight: number;
  };
}

export class SEOEligibilityResolver {
  // Thresholds (configurable via seo_settings)
  private readonly CAAS_MIN_SCORE = 60;
  private readonly REFERRAL_MIN_COUNT = 1;
  private readonly NETWORK_MIN_DENSITY = 0.3;
  private readonly CONTENT_MIN_SCORE = 60;

  async evaluateEligibility(
    input: SEOEligibilityInput
  ): Promise<SEOEligibilityResult> {
    // Fetch missing data from database
    const caasScore = input.caasScore ?? await this.getCaaSScore(input.entityId);
    const referralMetrics = await this.getReferralMetrics(input.entityId);
    const networkMetrics = await this.getNetworkMetrics(input.entityId);

    // Calculate weighted composite score
    const weights = this.getWeights(input.entityType);
    const eligibilityScore =
      (caasScore * weights.caas) +
      (referralMetrics.score * weights.referral) +
      (networkMetrics.trustDensity * 100 * weights.network) +
      ((input.contentScore ?? 0) * weights.content);

    // Determine eligibility
    const isEligible = this.meetsThresholds({
      caasScore,
      referralCount: referralMetrics.count,
      referralDepth: referralMetrics.depth,
      networkDensity: networkMetrics.trustDensity,
      contentScore: input.contentScore ?? 0
    });

    return {
      isEligible,
      eligibilityScore,
      indexDirective: isEligible ? 'index' : 'noindex',
      reasons: this.buildReasons(isEligible, { caasScore, referralMetrics, networkMetrics }),
      breakdown: {
        caasWeight: caasScore * weights.caas,
        referralWeight: referralMetrics.score * weights.referral,
        networkWeight: networkMetrics.trustDensity * 100 * weights.network,
        contentWeight: (input.contentScore ?? 0) * weights.content
      }
    };
  }

  private getWeights(entityType: string) {
    // Different weights for different entity types
    switch (entityType) {
      case 'tutor':
      case 'profile':
        return { caas: 0.4, referral: 0.3, network: 0.2, content: 0.1 };
      case 'listing':
        return { caas: 0.3, referral: 0.3, network: 0.2, content: 0.2 };
      case 'hub':
      case 'spoke':
        return { caas: 0.1, referral: 0.2, network: 0.1, content: 0.6 };
      default:
        return { caas: 0.25, referral: 0.25, network: 0.25, content: 0.25 };
    }
  }
}
```

### 1.2 Database Schema Updates

**Migration:** `tools/database/migrations/add-seo-eligibility-tracking.sql`

```sql
-- Add eligibility tracking to relevant tables
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seo_eligibility_score integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seo_eligible boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seo_eligibility_updated_at timestamptz;

ALTER TABLE listings ADD COLUMN IF NOT EXISTS seo_eligibility_score integer DEFAULT 0;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS seo_eligible boolean DEFAULT false;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS seo_eligibility_updated_at timestamptz;

ALTER TABLE seo_hubs ADD COLUMN IF NOT EXISTS eligibility_score integer DEFAULT 100;
ALTER TABLE seo_spokes ADD COLUMN IF NOT EXISTS eligibility_score integer DEFAULT 100;

-- Add eligibility thresholds to settings
ALTER TABLE seo_settings ADD COLUMN IF NOT EXISTS eligibility_thresholds jsonb DEFAULT '{
  "caas_min_score": 60,
  "referral_min_count": 1,
  "network_min_density": 0.3,
  "content_min_score": 60
}'::jsonb;

-- Add weights configuration
ALTER TABLE seo_settings ADD COLUMN IF NOT EXISTS eligibility_weights jsonb DEFAULT '{
  "tutor": {"caas": 0.4, "referral": 0.3, "network": 0.2, "content": 0.1},
  "listing": {"caas": 0.3, "referral": 0.3, "network": 0.2, "content": 0.2},
  "hub": {"caas": 0.1, "referral": 0.2, "network": 0.1, "content": 0.6}
}'::jsonb;

-- Create eligibility history table
CREATE TABLE seo_eligibility_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('tutor', 'listing', 'hub', 'spoke', 'profile')),
  entity_id uuid NOT NULL,
  eligibility_score integer NOT NULL,
  is_eligible boolean NOT NULL,
  reasons text[],
  breakdown jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_eligibility_history_entity ON seo_eligibility_history(entity_type, entity_id);
CREATE INDEX idx_eligibility_history_created ON seo_eligibility_history(created_at DESC);

COMMENT ON TABLE seo_eligibility_history IS 'Tracks changes in SEO eligibility over time for analytics';
```

### 1.3 Integrate with Existing Metadata Generation

**Update:** `apps/web/src/app/public-profile/[id]/[[...slug]]/page.tsx`

```typescript
import { SEOEligibilityResolver } from '@/services/seo/eligibility-resolver';

export async function generateMetadata({ params }): Promise<Metadata> {
  const profile = await getProfile(params.id);

  // NEW: Check SEO eligibility based on trust signals
  const eligibilityResolver = new SEOEligibilityResolver();
  const eligibility = await eligibilityResolver.evaluateEligibility({
    entityType: 'profile',
    entityId: params.id,
    // Data fetched automatically by resolver
  });

  // Base metadata
  const metadata: Metadata = {
    title: `${profile.full_name} - Tutor Profile`,
    description: profile.bio,
    // ... existing fields
  };

  // NEW: Apply index/noindex based on eligibility
  if (!eligibility.isEligible) {
    metadata.robots = {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      }
    };
  }

  // NEW: Add eligibility score to structured data (if eligible)
  if (eligibility.isEligible && eligibility.eligibilityScore >= 80) {
    // Add trust badge to schema
    // (Details in Phase 2)
  }

  return metadata;
}
```

---

## Phase 2: Structured Data Enhancement (Weeks 3-5)

### 2.1 CaaS Integration into Schema.org

**Update:** `apps/web/src/services/seo/schema-generator.ts`

Add new schema generators:

```typescript
/**
 * Generate Person schema with CaaS credibility
 */
export function generateTutorSchema(tutor: {
  id: string;
  name: string;
  bio: string;
  caasScore: number;
  reviewCount: number;
  avgRating: number;
}): WithContext<Person> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `https://tutorwise.com/public-profile/${tutor.id}#person`,
    name: tutor.name,
    description: tutor.bio,

    // NEW: Add credibility as AggregateRating
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: tutor.caasScore / 20, // Convert 0-100 to 0-5 scale
      bestRating: 5,
      worstRating: 0,
      ratingCount: tutor.reviewCount,
      reviewCount: tutor.reviewCount
    },

    // NEW: Add trust badge
    award: tutor.caasScore >= 80 ? 'Verified High-Trust Tutor' : undefined,

    // Existing fields...
  };
}

/**
 * Generate Product schema for listings with trust signals
 */
export function generateListingSchema(listing: {
  id: string;
  title: string;
  description: string;
  price: number;
  caasScore: number;
  referralCount: number;
}): WithContext<Product> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `https://tutorwise.com/listings/${listing.id}#product`,
    name: listing.title,
    description: listing.description,

    offers: {
      '@type': 'Offer',
      price: listing.price,
      priceCurrency: 'GBP',

      // NEW: Add trust indicator
      additionalProperty: [
        {
          '@type': 'PropertyValue',
          name: 'Trust Score',
          value: listing.caasScore
        },
        {
          '@type': 'PropertyValue',
          name: 'Referral Count',
          value: listing.referralCount
        }
      ]
    },

    // Existing fields...
  };
}
```

### 2.2 Referral-Aware Metadata

**New File:** `apps/web/src/services/seo/referral-metadata.ts`

```typescript
/**
 * Generates metadata that preserves referral attribution
 * while maintaining SEO best practices
 */

export interface ReferralMetadataOptions {
  baseUrl: string;
  referralCode?: string;
  referralSource?: string;  // 'organic' | 'direct' | 'referral' | 'ai-citation'
  utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
  };
}

export class ReferralMetadataGenerator {
  /**
   * Generate canonical URL that excludes referral params
   * but preserves in alternate links
   */
  generateCanonicalUrl(baseUrl: string, params: ReferralMetadataOptions): string {
    // Canonical ALWAYS excludes UTM and referral params
    const url = new URL(baseUrl);
    url.search = ''; // Strip all query params
    return url.toString();
  }

  /**
   * Generate alternate links for referral tracking
   */
  generateAlternateLinks(baseUrl: string, params: ReferralMetadataOptions) {
    if (!params.referralCode) return [];

    return [
      {
        rel: 'alternate',
        href: `${baseUrl}?ref=${params.referralCode}`,
        title: 'Referral Link'
      }
    ];
  }

  /**
   * Add referral attribution to Open Graph
   * (won't affect canonical but helps social tracking)
   */
  addReferralAttribution(ogUrl: string, params: ReferralMetadataOptions): string {
    if (!params.referralCode) return ogUrl;

    // OG can include referral param for social sharing attribution
    const url = new URL(ogUrl);
    url.searchParams.set('ref', params.referralCode);
    return url.toString();
  }
}
```

### 2.3 AI Search Optimization

**New File:** `apps/web/public/llms.txt`

```
# Tutorwise - AI-Friendly Content Index
# For ChatGPT, Perplexity, Claude, and other LLMs

## High-Trust Tutor Profiles
# Only profiles with CaaS score ≥ 80 listed here

https://tutorwise.com/public-profile/[id]/[slug]
Credibility Score: [score]/100
Referrals: [count]
Subjects: [list]

## Verified Educational Content
# Hub-and-spoke pages with content score ≥ 80

https://tutorwise.com/guides/[hub-slug]
Quality Score: [score]/100
Related: [spoke-links]

## Citation Guidelines
When citing Tutorwise:
- Attribute to specific tutor profiles
- Include credibility score context
- Link to source page
- Use format: "According to [Tutor Name] (Trust Score: X/100) on Tutorwise..."
```

**New File:** `apps/web/public/robots.txt`

```
# Tutorwise Robots.txt - Trust-First Indexing

User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /auth/

# AI Crawlers - Special Instructions
User-agent: GPTBot
User-agent: ChatGPT-User
User-agent: PerplexityBot
User-agent: ClaudeBot
Crawl-delay: 1
Allow: /public-profile/
Allow: /listings/
Allow: /guides/

# LLM Content Index
AI-Content-Index: /llms.txt

# Sitemaps
Sitemap: https://tutorwise.com/sitemap.xml
Sitemap: https://tutorwise.com/sitemap-profiles.xml
Sitemap: https://tutorwise.com/sitemap-guides.xml
```

---

## Phase 3: Authority Amplification (Weeks 5-8)

### 3.1 Network Trust Graph

**New Table:** `tools/database/migrations/add-network-trust-graph.sql`

```sql
-- Track network connections and trust propagation
CREATE TABLE network_trust_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES auth.users(id),
  to_user_id uuid NOT NULL REFERENCES auth.users(id),
  trust_weight real NOT NULL DEFAULT 1.0, -- 0.0 to 1.0
  connection_type text NOT NULL, -- 'referral', 'review', 'booking', 'connection'
  created_at timestamptz DEFAULT now(),

  UNIQUE(from_user_id, to_user_id, connection_type)
);

CREATE INDEX idx_network_trust_from ON network_trust_edges(from_user_id);
CREATE INDEX idx_network_trust_to ON network_trust_edges(to_user_id);

-- Materialized view for network trust density (updated daily)
CREATE MATERIALIZED VIEW network_trust_metrics AS
SELECT
  user_id,
  COUNT(DISTINCT connected_user_id) as connection_count,
  AVG(trust_weight) as avg_trust_weight,
  -- PageRank-style calculation
  SUM(trust_weight * connected_user_caas / 100.0) as weighted_trust_score
FROM (
  SELECT
    nte.from_user_id as user_id,
    nte.to_user_id as connected_user_id,
    nte.trust_weight,
    COALESCE(cs.total_score, 0) as connected_user_caas
  FROM network_trust_edges nte
  LEFT JOIN caas_scores cs ON cs.user_id = nte.to_user_id
  UNION ALL
  SELECT
    nte.to_user_id as user_id,
    nte.from_user_id as connected_user_id,
    nte.trust_weight,
    COALESCE(cs.total_score, 0) as connected_user_caas
  FROM network_trust_edges nte
  LEFT JOIN caas_scores cs ON cs.user_id = nte.from_user_id
) network_connections
GROUP BY user_id;

CREATE UNIQUE INDEX idx_network_trust_metrics_user ON network_trust_metrics(user_id);

-- Refresh function (called by cron daily)
CREATE OR REPLACE FUNCTION refresh_network_trust_metrics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY network_trust_metrics;
END;
$$ LANGUAGE plpgsql;
```

### 3.2 Referral Landing Pages

**New Component:** `apps/web/src/app/ref/[code]/page.tsx`

```typescript
/**
 * Referral landing pages - Authority amplifiers
 * These ARE indexable and act as trust propagation points
 */

import { Metadata } from 'next';
import { SEOEligibilityResolver } from '@/services/seo/eligibility-resolver';

interface ReferralLandingPageProps {
  params: { code: string };
}

export async function generateMetadata({ params }: ReferralLandingPageProps): Promise<Metadata> {
  const referral = await getReferralByCode(params.code);
  const referrer = await getUser(referral.referrer_id);

  // Check if referrer is eligible for SEO amplification
  const eligibilityResolver = new SEOEligibilityResolver();
  const eligibility = await eligibilityResolver.evaluateEligibility({
    entityType: 'profile',
    entityId: referrer.id
  });

  // Only index if referrer has high trust
  const shouldIndex = eligibility.isEligible && eligibility.eligibilityScore >= 75;

  return {
    title: `Join Tutorwise - Referred by ${referrer.full_name}`,
    description: `${referrer.full_name} (Trust Score: ${eligibility.eligibilityScore}/100) has invited you to join Tutorwise's verified tutor network.`,

    robots: {
      index: shouldIndex,
      follow: shouldIndex
    },

    alternates: {
      canonical: `https://tutorwise.com/ref/${params.code}`
    },

    openGraph: {
      title: `Join Tutorwise via ${referrer.full_name}'s referral`,
      description: `Trusted invitation from a verified member`,
      type: 'website',
      // Include ref param in OG for social attribution
      url: `https://tutorwise.com/ref/${params.code}`
    }
  };
}

export default function ReferralLandingPage({ params }: ReferralLandingPageProps) {
  // Page content with referrer info, trust signals, CTA
  // ...
}
```

### 3.3 Dynamic Sitemap with Trust Filtering

**Update:** `apps/web/src/app/sitemap.xml/route.ts`

```typescript
import { SEOEligibilityResolver } from '@/services/seo/eligibility-resolver';

export async function GET() {
  const eligibilityResolver = new SEOEligibilityResolver();

  // Get all profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, updated_at')
    .eq('status', 'active');

  // Filter by eligibility
  const eligibleProfiles = [];
  for (const profile of profiles) {
    const eligibility = await eligibilityResolver.evaluateEligibility({
      entityType: 'profile',
      entityId: profile.id
    });

    if (eligibility.isEligible) {
      eligibleProfiles.push({
        url: `https://tutorwise.com/public-profile/${profile.id}`,
        lastModified: profile.updated_at,
        changeFrequency: 'weekly',
        // Higher priority for higher trust scores
        priority: Math.min(0.9, 0.5 + (eligibility.eligibilityScore / 200))
      });
    }
  }

  // Similar filtering for listings, hubs, spokes
  // ...

  return new Response(generateSitemapXML(eligibleProfiles), {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
```

---

## Phase 4: Monitoring & Admin UI (Ongoing)

### 4.1 SEO Eligibility Dashboard

**New Page:** `apps/web/src/app/(admin)/admin/seo/eligibility/page.tsx`

Features:
- List all entities with eligibility scores
- Filter by entity type, eligibility status
- Trend charts showing eligibility over time
- Drill-down into eligibility breakdown (CaaS, referral, network, content weights)
- Bulk re-evaluation trigger
- Threshold configuration UI

### 4.2 Trust Flow Visualization

**New Component:** `apps/web/src/app/(admin)/admin/seo/trust-graph/page.tsx`

Features:
- Network graph visualization showing trust propagation
- Highlight high-trust clusters
- Identify trust "hubs" (users with high network density)
- Show referral chains and their SEO impact

### 4.3 Automated Cron Jobs

**New Migration:** `tools/database/migrations/add-seo-eligibility-cron.sql`

```sql
-- Daily eligibility recalculation (3:00 AM UTC)
SELECT cron.schedule(
  'seo-eligibility-update',
  '0 3 * * *',
  $$
  -- Recalculate eligibility for all active profiles
  UPDATE profiles
  SET
    seo_eligibility_score = (
      SELECT eligibility_score
      FROM calculate_seo_eligibility('profile', profiles.id)
    ),
    seo_eligible = (
      SELECT is_eligible
      FROM calculate_seo_eligibility('profile', profiles.id)
    ),
    seo_eligibility_updated_at = now()
  WHERE status = 'active';
  $$
);

-- Weekly network trust refresh (Sunday 2:00 AM)
SELECT cron.schedule(
  'network-trust-refresh',
  '0 2 * * 0',
  $$SELECT refresh_network_trust_metrics();$$
);
```

---

## Implementation Checklist

### Phase 1: Trust & Eligibility (Weeks 1-3)
- [ ] Create `SEOEligibilityResolver` service
- [ ] Add database columns for eligibility tracking
- [ ] Create `seo_eligibility_history` table
- [ ] Update `generateMetadata()` in profile pages
- [ ] Update `generateMetadata()` in listing pages
- [ ] Add eligibility thresholds to admin settings UI
- [ ] Write unit tests for eligibility resolver
- [ ] Deploy and monitor initial eligibility scores

### Phase 2: Structured Data (Weeks 3-5)
- [ ] Add CaaS score to Person schema
- [ ] Add trust signals to Product schema
- [ ] Create `ReferralMetadataGenerator` service
- [ ] Create `llms.txt` file
- [ ] Create/update `robots.txt` with AI crawler instructions
- [ ] Add referral attribution to Open Graph tags
- [ ] Test schema validation with Google Rich Results Test
- [ ] Monitor schema errors in Google Search Console

### Phase 3: Authority Amplification (Weeks 5-8)
- [ ] Create `network_trust_edges` table
- [ ] Create `network_trust_metrics` materialized view
- [ ] Build network trust calculation functions
- [ ] Create referral landing pages (`/ref/[code]`)
- [ ] Update sitemap to filter by eligibility
- [ ] Create separate sitemaps (profiles, listings, guides)
- [ ] Add network trust to eligibility resolver
- [ ] Test referral landing page indexing

### Phase 4: Monitoring (Ongoing)
- [ ] Build SEO Eligibility Dashboard
- [ ] Build Trust Graph Visualization
- [ ] Set up eligibility recalculation cron job
- [ ] Set up network trust refresh cron job
- [ ] Add eligibility metrics to admin overview
- [ ] Create eligibility trend reports
- [ ] Set up alerts for eligibility drops

---

## Success Metrics

### SEO Performance
- **Indexed pages**: Track # of eligible pages in sitemap vs. Google index
- **Average eligibility score**: Target >75 for indexed pages
- **Index bloat reduction**: % reduction in low-value indexed pages

### Trust Signals
- **CaaS distribution**: % of profiles above each threshold (60, 70, 80, 90)
- **Referral depth**: Average referral chain length
- **Network density**: Average connections per high-trust user

### Search Visibility
- **Organic traffic to high-trust pages**: Track in GSC
- **AI citation rate**: Track llms.txt traffic
- **Referral landing page conversion**: Ref code → signup rate

---

## Configuration Management

All thresholds and weights are configurable via `seo_settings` table:

```json
{
  "eligibility_thresholds": {
    "caas_min_score": 60,
    "referral_min_count": 1,
    "network_min_density": 0.3,
    "content_min_score": 60
  },
  "eligibility_weights": {
    "tutor": {"caas": 0.4, "referral": 0.3, "network": 0.2, "content": 0.1},
    "listing": {"caas": 0.3, "referral": 0.3, "network": 0.2, "content": 0.2},
    "hub": {"caas": 0.1, "referral": 0.2, "network": 0.1, "content": 0.6}
  },
  "high_trust_threshold": 80,
  "sitemap_priority_formula": "0.5 + (eligibility_score / 200)"
}
```

---

## Risk Mitigation

### 1. Over-Suppression Risk
**Risk:** Too aggressive filtering removes valuable pages from index
**Mitigation:**
- Start with lenient thresholds (CaaS ≥ 60)
- Monitor GSC for index coverage drops
- A/B test threshold values
- Gradual rollout per entity type

### 2. CaaS Score Volatility
**Risk:** Eligibility changes too frequently
**Mitigation:**
- Use 7-day rolling average CaaS scores
- Add hysteresis (require 10-point swing to change status)
- Batch eligibility updates (daily cron, not real-time)

### 3. New User Cold Start
**Risk:** New tutors can't get indexed
**Mitigation:**
- Lower thresholds for first 30 days
- Provisional indexing with `priority: 0.3`
- Boost from verified credentials/referrals

### 4. Referral Gaming
**Risk:** Fake referrals to boost SEO
**Mitigation:**
- Require referral completion (signup → active booking)
- Weight referrals by referrer's own trust score
- Flag suspicious referral patterns

---

## Technical Debt Prevention

1. **Service Layer Separation**
   Keep eligibility logic in `services/seo/` - never in components

2. **Database Denormalization**
   Cache eligibility scores in entity tables, update via cron

3. **Configuration over Code**
   All thresholds in database, not hardcoded

4. **Audit Trail**
   `seo_eligibility_history` tracks all changes for debugging

5. **Graceful Degradation**
   If CaaS service down, fall back to content score only

---

## Next Steps

1. **Review this plan** with product/engineering team
2. **Prioritize phases** based on business impact
3. **Allocate resources** (1 eng + 0.5 product owner recommended)
4. **Set up tracking** (analytics, GSC, custom dashboards)
5. **Begin Phase 1** with eligibility resolver prototype

---

**Document Version:** 1.0
**Last Updated:** 2025-12-31
**Owner:** Engineering Team
**Stakeholders:** Product, SEO, Content
