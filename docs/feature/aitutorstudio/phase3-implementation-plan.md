# AI Tutor Studio - Phase 3 Implementation Plan

**Created:** 2026-02-24
**Status:** 🚧 Planning
**Goal:** Scale to 1,000+ AI tutors with enterprise features and advanced monetization

---

## Phase 3 Scope Overview

### Completed in Phase 2 ✅
From Open Beta, we already have:
- ✅ AI Quality Score (0-100 scoring system)
- ✅ Custom Skills (predefined + user-created skills)
- ✅ Analytics Dashboard (heatmaps, skill performance)
- ✅ Material Skill-Tagging (JSONB skills for RAG)
- ✅ Owner Notifications (escalation, low ratings, quality drops)
- ✅ URL Link UI (full CRUD interface)
- ✅ Organisation Integration (AI tutors as team members)

### Phase 3 Features 🚧

| Feature | Status | Priority | Effort | Revenue Impact |
|---------|--------|----------|--------|----------------|
| **1. VirtualSpace Integration** | ❌ Not Started | High | 10 days | Medium |
| **2. Bundle Pricing** | ❌ Not Started | High | 5 days | High |
| **3. Client Subscriptions** | ❌ Not Started | High | 8 days | Very High |
| **4. Material Marketplace** | ❌ Not Started | Medium | 12 days | High |
| **5. White-Label AI for Organisations** | ❌ Not Started | High | 10 days | Very High |
| **6. Advanced RAG** | ❌ Not Started | Medium | 15 days | Medium |

**Total Estimated Effort:** ~60 days (12 weeks)

---

## Feature 1: VirtualSpace Integration

### Overview
Enable AI tutors to join live video sessions in VirtualSpace, providing real-time tutoring with screen sharing and collaboration features.

### Business Goals
- Increase session value (AI + video = premium experience)
- Reduce tutor burden (AI handles basics, human joins for complex questions)
- Enable hybrid learning model (AI practice → human feedback in same session)

### Database Schema
```sql
-- Add VirtualSpace session tracking
ALTER TABLE ai_tutor_sessions ADD COLUMN virtualspace_session_id UUID REFERENCES virtualspace_sessions(id);
ALTER TABLE ai_tutor_sessions ADD COLUMN session_mode VARCHAR(20) DEFAULT 'chat'; -- 'chat' | 'video' | 'hybrid'
ALTER TABLE ai_tutor_sessions ADD COLUMN video_duration_seconds INTEGER DEFAULT 0;

-- Track AI participation in VirtualSpace
CREATE TABLE ai_tutor_virtualspace_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_tutor_session_id UUID NOT NULL REFERENCES ai_tutor_sessions(id) ON DELETE CASCADE,
  virtualspace_session_id UUID NOT NULL REFERENCES virtualspace_sessions(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'ai_joined', 'ai_left', 'human_joined', 'screen_shared', etc.
  event_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_virtualspace_events_session ON ai_tutor_virtualspace_events(ai_tutor_session_id);
CREATE INDEX idx_ai_virtualspace_events_type ON ai_tutor_virtualspace_events(event_type);
```

### API Endpoints
```typescript
// POST /api/ai-tutors/sessions/[sessionId]/join-video
// Start VirtualSpace session with AI tutor
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { ai_tutor_id, client_id } = await request.json();

  // Create VirtualSpace session
  const { data: vsSession } = await supabase
    .from('virtualspace_sessions')
    .insert({
      title: `AI Tutor Session`,
      host_id: client_id,
      session_type: 'ai_tutor',
      metadata: { ai_tutor_session_id: params.sessionId }
    })
    .select()
    .single();

  // Link to AI tutor session
  await supabase
    .from('ai_tutor_sessions')
    .update({
      virtualspace_session_id: vsSession.id,
      session_mode: 'video'
    })
    .eq('id', params.sessionId);

  // Log event
  await supabase
    .from('ai_tutor_virtualspace_events')
    .insert({
      ai_tutor_session_id: params.sessionId,
      virtualspace_session_id: vsSession.id,
      event_type: 'ai_joined',
      event_data: { timestamp: new Date().toISOString() }
    });

  return NextResponse.json({
    virtualspace_session_id: vsSession.id,
    join_url: `/virtualspace/${vsSession.id}`
  });
}

// POST /api/ai-tutors/sessions/[sessionId]/handoff-to-human
// Seamless handoff from AI to human tutor in same VirtualSpace session
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { human_tutor_id } = await request.json();

  // Get VirtualSpace session
  const { data: aiSession } = await supabase
    .from('ai_tutor_sessions')
    .select('virtualspace_session_id, ai_tutor_id')
    .eq('id', params.sessionId)
    .single();

  // Invite human tutor to VirtualSpace
  const { data: invitation } = await supabase
    .from('virtualspace_invitations')
    .insert({
      session_id: aiSession.virtualspace_session_id,
      invitee_id: human_tutor_id,
      role: 'tutor'
    })
    .select()
    .single();

  // Update session mode
  await supabase
    .from('ai_tutor_sessions')
    .update({ session_mode: 'hybrid' })
    .eq('id', params.sessionId);

  // Log handoff event
  await supabase
    .from('ai_tutor_virtualspace_events')
    .insert({
      ai_tutor_session_id: params.sessionId,
      virtualspace_session_id: aiSession.virtualspace_session_id,
      event_type: 'human_joined',
      event_data: { human_tutor_id, invitation_id: invitation.id }
    });

  return NextResponse.json({ invitation });
}
```

### UI Components
```tsx
// AITutorVideoSession.tsx
export default function AITutorVideoSession({ sessionId }: { sessionId: string }) {
  const [showVideo, setShowVideo] = useState(false);
  const { data: session } = useQuery(['ai-tutor-session', sessionId]);

  const startVideoSession = async () => {
    const res = await fetch(`/api/ai-tutors/sessions/${sessionId}/join-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ai_tutor_id: session.ai_tutor_id,
        client_id: session.client_id
      })
    });
    const { join_url } = await res.json();
    window.location.href = join_url;
  };

  return (
    <div className="video-session-controls">
      <button onClick={startVideoSession}>
        <VideoIcon />
        Start Video Session with AI
      </button>
      <p className="hint">
        Join a live video session where the AI tutor can see your screen and help in real-time
      </p>
    </div>
  );
}
```

### Acceptance Criteria
- [ ] AI tutor sessions can be escalated to VirtualSpace video sessions
- [ ] AI continues to respond in chat while video is active
- [ ] Human tutor can seamlessly join ongoing AI video session
- [ ] Session duration and mode tracked in database
- [ ] Client billed correctly for video time (different rate)

---

## Feature 2: Bundle Pricing

### Overview
Package deals combining AI and human sessions to increase perceived value and reduce cannibalization.

### Business Goals
- Reduce revenue cannibalization (AI doesn't replace human, it complements)
- Increase average order value (£50 bundle vs £15 single session)
- Encourage clients to try both AI and human tutoring

### Database Schema
```sql
-- Bundle pricing configurations
CREATE TABLE ai_tutor_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_tutor_id UUID NOT NULL REFERENCES ai_tutors(id) ON DELETE CASCADE,
  bundle_name VARCHAR(100) NOT NULL,
  ai_sessions_count INTEGER NOT NULL,
  human_sessions_count INTEGER NOT NULL,
  total_price_pence INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_tutor_bundles_active ON ai_tutor_bundles(ai_tutor_id, is_active);

-- Bundle purchases
CREATE TABLE ai_tutor_bundle_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES ai_tutor_bundles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ai_sessions_remaining INTEGER NOT NULL,
  human_sessions_remaining INTEGER NOT NULL,
  total_paid_pence INTEGER NOT NULL,
  stripe_payment_intent_id VARCHAR(255),
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ, -- Optional expiration date
  status VARCHAR(20) DEFAULT 'active' -- 'active', 'expired', 'consumed'
);

CREATE INDEX idx_bundle_purchases_client ON ai_tutor_bundle_purchases(client_id, status);
CREATE INDEX idx_bundle_purchases_bundle ON ai_tutor_bundle_purchases(bundle_id);

COMMENT ON TABLE ai_tutor_bundles IS 'Pricing bundles that combine AI and human sessions (e.g., 3 AI + 1 human = £50)';
COMMENT ON TABLE ai_tutor_bundle_purchases IS 'Tracks client purchases of session bundles and remaining balance';
```

### API Endpoints
```typescript
// POST /api/ai-tutors/[id]/bundles
// Create bundle pricing
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { bundle_name, ai_sessions_count, human_sessions_count, total_price_pence, description } = await request.json();

  const { data: bundle } = await supabase
    .from('ai_tutor_bundles')
    .insert({
      ai_tutor_id: params.id,
      bundle_name,
      ai_sessions_count,
      human_sessions_count,
      total_price_pence,
      description
    })
    .select()
    .single();

  return NextResponse.json({ bundle });
}

// POST /api/ai-tutors/bundles/[bundleId]/purchase
// Purchase a bundle
export async function POST(
  request: NextRequest,
  { params }: { params: { bundleId: string } }
) {
  const { client_id, stripe_payment_intent_id } = await request.json();

  const { data: bundle } = await supabase
    .from('ai_tutor_bundles')
    .select('*')
    .eq('id', params.bundleId)
    .single();

  const { data: purchase } = await supabase
    .from('ai_tutor_bundle_purchases')
    .insert({
      bundle_id: params.bundleId,
      client_id,
      ai_sessions_remaining: bundle.ai_sessions_count,
      human_sessions_remaining: bundle.human_sessions_count,
      total_paid_pence: bundle.total_price_pence,
      stripe_payment_intent_id
    })
    .select()
    .single();

  return NextResponse.json({ purchase });
}

// POST /api/ai-tutors/bundles/[purchaseId]/redeem
// Redeem a session from bundle
export async function POST(
  request: NextRequest,
  { params }: { params: { purchaseId: string } }
) {
  const { session_type } = await request.json(); // 'ai' or 'human'

  const { data: purchase } = await supabase
    .from('ai_tutor_bundle_purchases')
    .select('*')
    .eq('id', params.purchaseId)
    .single();

  // Check if sessions remaining
  const field = session_type === 'ai' ? 'ai_sessions_remaining' : 'human_sessions_remaining';
  if (purchase[field] <= 0) {
    return NextResponse.json({ error: 'No sessions remaining' }, { status: 400 });
  }

  // Decrement count
  await supabase
    .from('ai_tutor_bundle_purchases')
    .update({ [field]: purchase[field] - 1 })
    .eq('id', params.purchaseId);

  return NextResponse.json({ success: true, remaining: purchase[field] - 1 });
}
```

### UI Components
```tsx
// BundlePricingCard.tsx
export default function BundlePricingCard({ bundle }: { bundle: Bundle }) {
  const savings = (bundle.ai_sessions_count * 10 + bundle.human_sessions_count * 30) - (bundle.total_price_pence / 100);

  return (
    <div className="bundle-card">
      <div className="bundle-badge">Best Value</div>
      <h3>{bundle.bundle_name}</h3>
      <div className="bundle-content">
        <div className="session-breakdown">
          <div className="ai-sessions">
            <RobotIcon />
            <span>{bundle.ai_sessions_count} AI Sessions</span>
          </div>
          <div className="human-sessions">
            <UserIcon />
            <span>{bundle.human_sessions_count} Human Sessions</span>
          </div>
        </div>
        <div className="pricing">
          <div className="original-price">Usually £{((bundle.ai_sessions_count * 10 + bundle.human_sessions_count * 30))}</div>
          <div className="bundle-price">£{(bundle.total_price_pence / 100).toFixed(2)}</div>
          <div className="savings">Save £{savings.toFixed(2)}</div>
        </div>
      </div>
      <button onClick={() => purchaseBundle(bundle.id)}>
        Purchase Bundle
      </button>
    </div>
  );
}
```

### Acceptance Criteria
- [ ] Tutors can create custom bundle packages
- [ ] Bundles display with clear savings calculation
- [ ] Stripe checkout supports bundle purchases
- [ ] Session redemption decrements correct balance
- [ ] Bundle expiration handled correctly (if applicable)

---

## Feature 3: Client Subscriptions

### Overview
£30/month unlimited access to specific AI tutors for predictable revenue and higher client lifetime value.

### Business Goals
- Recurring revenue model (MRR)
- Higher client lifetime value (£30/month vs £10/session)
- Client retention (subscription = commitment)
- Predictable cash flow for platform and creators

### Database Schema
```sql
-- AI Tutor subscription plans
CREATE TABLE ai_tutor_subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_tutor_id UUID NOT NULL REFERENCES ai_tutors(id) ON DELETE CASCADE,
  plan_name VARCHAR(100) NOT NULL,
  price_pence_monthly INTEGER NOT NULL,
  session_limit INTEGER, -- NULL = unlimited
  description TEXT,
  features JSONB DEFAULT '[]'::jsonb, -- ['Unlimited sessions', 'Priority support', etc.]
  is_active BOOLEAN DEFAULT true,
  stripe_price_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_tutor_subscription_plans_active ON ai_tutor_subscription_plans(ai_tutor_id, is_active);

-- Client subscriptions
CREATE TABLE ai_tutor_client_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES ai_tutor_subscription_plans(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ai_tutor_id UUID NOT NULL REFERENCES ai_tutors(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'paused', 'cancelled', 'expired'
  sessions_used_this_month INTEGER DEFAULT 0,
  stripe_subscription_id VARCHAR(255),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, ai_tutor_id, status) -- One active subscription per client per AI tutor
);

CREATE INDEX idx_client_subscriptions_client ON ai_tutor_client_subscriptions(client_id, status);
CREATE INDEX idx_client_subscriptions_tutor ON ai_tutor_client_subscriptions(ai_tutor_id, status);
CREATE INDEX idx_client_subscriptions_period ON ai_tutor_client_subscriptions(current_period_end) WHERE status = 'active';

-- Function to reset monthly usage counters
CREATE OR REPLACE FUNCTION reset_monthly_subscription_usage()
RETURNS void AS $$
BEGIN
  UPDATE ai_tutor_client_subscriptions
  SET sessions_used_this_month = 0,
      current_period_start = current_period_end,
      current_period_end = current_period_end + INTERVAL '1 month'
  WHERE status = 'active'
    AND current_period_end <= NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE ai_tutor_subscription_plans IS 'Subscription plans for AI tutors (e.g., £30/month unlimited access)';
COMMENT ON TABLE ai_tutor_client_subscriptions IS 'Client subscriptions to AI tutors with usage tracking';
```

### API Endpoints
```typescript
// POST /api/ai-tutors/[id]/subscription-plans
// Create subscription plan
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { plan_name, price_pence_monthly, session_limit, description, features } = await request.json();

  // Create Stripe Price
  const stripePrice = await stripe.prices.create({
    product: 'AI Tutor Subscription',
    unit_amount: price_pence_monthly,
    currency: 'gbp',
    recurring: { interval: 'month' }
  });

  const { data: plan } = await supabase
    .from('ai_tutor_subscription_plans')
    .insert({
      ai_tutor_id: params.id,
      plan_name,
      price_pence_monthly,
      session_limit,
      description,
      features,
      stripe_price_id: stripePrice.id
    })
    .select()
    .single();

  return NextResponse.json({ plan });
}

// POST /api/ai-tutors/subscription-plans/[planId]/subscribe
// Subscribe to plan
export async function POST(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  const { client_id } = await request.json();

  const { data: plan } = await supabase
    .from('ai_tutor_subscription_plans')
    .select('*, ai_tutors(owner_id)')
    .eq('id', params.planId)
    .single();

  // Create Stripe subscription
  const stripeSubscription = await stripe.subscriptions.create({
    customer: client_id,
    items: [{ price: plan.stripe_price_id }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent']
  });

  const { data: subscription } = await supabase
    .from('ai_tutor_client_subscriptions')
    .insert({
      plan_id: params.planId,
      client_id,
      ai_tutor_id: plan.ai_tutor_id,
      stripe_subscription_id: stripeSubscription.id,
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 days
    })
    .select()
    .single();

  return NextResponse.json({
    subscription,
    client_secret: stripeSubscription.latest_invoice.payment_intent.client_secret
  });
}

// GET /api/ai-tutors/subscriptions/active
// Get client's active subscriptions
export async function GET(request: NextRequest) {
  const userId = request.headers.get('user-id');

  const { data: subscriptions } = await supabase
    .from('ai_tutor_client_subscriptions')
    .select(`
      *,
      plan:ai_tutor_subscription_plans(*),
      ai_tutor:ai_tutors(id, display_name, avatar_url)
    `)
    .eq('client_id', userId)
    .eq('status', 'active');

  return NextResponse.json({ subscriptions });
}
```

### UI Components
```tsx
// SubscriptionPlanCard.tsx
export default function SubscriptionPlanCard({ plan }: { plan: SubscriptionPlan }) {
  const [subscribing, setSubscribing] = useState(false);

  const handleSubscribe = async () => {
    setSubscribing(true);
    const res = await fetch(`/api/ai-tutors/subscription-plans/${plan.id}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: currentUser.id })
    });
    const { client_secret } = await res.json();
    // Redirect to Stripe checkout
    const stripe = await loadStripe(STRIPE_PUBLIC_KEY);
    await stripe.confirmCardPayment(client_secret);
    setSubscribing(false);
  };

  return (
    <div className="subscription-card">
      <div className="plan-header">
        <h3>{plan.plan_name}</h3>
        <div className="price">
          <span className="amount">£{(plan.price_pence_monthly / 100).toFixed(2)}</span>
          <span className="period">/month</span>
        </div>
      </div>
      <ul className="features-list">
        {plan.features.map((feature, i) => (
          <li key={i}>
            <CheckIcon />
            {feature}
          </li>
        ))}
        {plan.session_limit ? (
          <li>Up to {plan.session_limit} sessions/month</li>
        ) : (
          <li><strong>Unlimited sessions</strong></li>
        )}
      </ul>
      <button
        onClick={handleSubscribe}
        disabled={subscribing}
        className="subscribe-btn"
      >
        {subscribing ? 'Processing...' : 'Subscribe Now'}
      </button>
    </div>
  );
}
```

### Cron Job
```typescript
// /api/cron/reset-subscription-usage
// Run daily to reset monthly usage counters
export async function GET(request: NextRequest) {
  await supabase.rpc('reset_monthly_subscription_usage');
  return NextResponse.json({ success: true });
}
```

### Acceptance Criteria
- [ ] Tutors can create subscription plans with custom pricing
- [ ] Clients can subscribe via Stripe
- [ ] Unlimited sessions work correctly (no booking fee if subscribed)
- [ ] Monthly usage resets automatically
- [ ] Subscription cancellation works
- [ ] Revenue split calculated correctly (Tutorwise commission)

---

## Feature 4: Material Marketplace

### Overview
Allow tutors to share/sell training materials to other AI tutor creators, creating network effects and revenue sharing.

### Business Goals
- Network effects (better materials = better AI tutors = more users)
- Additional revenue stream (platform commission on material sales)
- Reduce creator burden (buy materials instead of creating from scratch)
- Quality improvement (high-quality materials incentivized by marketplace)

### Database Schema
```sql
-- Marketplace material listings
CREATE TABLE marketplace_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'GCSE Maths', 'A-Level Physics', etc.
  subject VARCHAR(100),
  level VARCHAR(100),
  price_pence INTEGER NOT NULL, -- 0 = free
  file_url TEXT NOT NULL,
  file_size_bytes INTEGER,
  file_type VARCHAR(50),
  preview_available BOOLEAN DEFAULT false,
  preview_url TEXT,
  download_count INTEGER DEFAULT 0,
  revenue_generated_pence INTEGER DEFAULT 0,
  rating_avg NUMERIC(3,2),
  review_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketplace_materials_seller ON marketplace_materials(seller_id, is_active);
CREATE INDEX idx_marketplace_materials_category ON marketplace_materials(category, is_active);
CREATE INDEX idx_marketplace_materials_rating ON marketplace_materials(rating_avg DESC, download_count DESC);

-- Material purchases
CREATE TABLE marketplace_material_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES marketplace_materials(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  price_paid_pence INTEGER NOT NULL,
  seller_revenue_pence INTEGER NOT NULL, -- After platform commission
  platform_commission_pence INTEGER NOT NULL,
  stripe_payment_intent_id VARCHAR(255),
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(material_id, buyer_id) -- One purchase per buyer per material
);

CREATE INDEX idx_material_purchases_buyer ON marketplace_material_purchases(buyer_id);
CREATE INDEX idx_material_purchases_material ON marketplace_material_purchases(material_id);

-- Material reviews
CREATE TABLE marketplace_material_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES marketplace_materials(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(material_id, reviewer_id)
);

CREATE INDEX idx_material_reviews_material ON marketplace_material_reviews(material_id);

-- Trigger to update material stats after purchase
CREATE OR REPLACE FUNCTION update_marketplace_material_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE marketplace_materials
  SET
    download_count = download_count + 1,
    revenue_generated_pence = revenue_generated_pence + NEW.price_paid_pence,
    updated_at = NOW()
  WHERE id = NEW.material_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_material_purchase_update_stats
  AFTER INSERT ON marketplace_material_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_material_stats();

COMMENT ON TABLE marketplace_materials IS 'Materials available for purchase/download in the marketplace';
COMMENT ON TABLE marketplace_material_purchases IS 'Tracks material purchases and revenue split';
```

### API Endpoints
```typescript
// POST /api/marketplace/materials
// List material for sale
export async function POST(request: NextRequest) {
  const {
    title, description, category, subject, level,
    price_pence, file_url, file_size_bytes, file_type
  } = await request.json();

  const sellerId = request.headers.get('user-id');

  const { data: material } = await supabase
    .from('marketplace_materials')
    .insert({
      seller_id: sellerId,
      title,
      description,
      category,
      subject,
      level,
      price_pence,
      file_url,
      file_size_bytes,
      file_type
    })
    .select()
    .single();

  return NextResponse.json({ material });
}

// GET /api/marketplace/materials
// Browse marketplace
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const sort = searchParams.get('sort') || 'popular'; // 'popular', 'newest', 'price-low', 'price-high'

  let query = supabase
    .from('marketplace_materials')
    .select('*, seller:profiles(id, full_name, avatar_url)')
    .eq('is_active', true);

  if (category) {
    query = query.eq('category', category);
  }

  // Apply sorting
  if (sort === 'popular') {
    query = query.order('download_count', { ascending: false });
  } else if (sort === 'newest') {
    query = query.order('created_at', { ascending: false });
  } else if (sort === 'price-low') {
    query = query.order('price_pence', { ascending: true });
  } else if (sort === 'price-high') {
    query = query.order('price_pence', { ascending: false });
  }

  const { data: materials } = await query;

  return NextResponse.json({ materials });
}

// POST /api/marketplace/materials/[id]/purchase
// Purchase material
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { buyer_id, stripe_payment_intent_id } = await request.json();

  const { data: material } = await supabase
    .from('marketplace_materials')
    .select('*')
    .eq('id', params.id)
    .single();

  // Calculate revenue split (80% seller, 20% platform)
  const sellerRevenue = Math.floor(material.price_pence * 0.8);
  const platformCommission = material.price_pence - sellerRevenue;

  const { data: purchase } = await supabase
    .from('marketplace_material_purchases')
    .insert({
      material_id: params.id,
      buyer_id,
      price_paid_pence: material.price_pence,
      seller_revenue_pence: sellerRevenue,
      platform_commission_pence: platformCommission,
      stripe_payment_intent_id
    })
    .select()
    .single();

  return NextResponse.json({
    purchase,
    download_url: material.file_url
  });
}
```

### UI Components
```tsx
// MarketplaceMaterialCard.tsx
export default function MarketplaceMaterialCard({ material }: { material: MarketplaceMaterial }) {
  const [purchasing, setPurchasing] = useState(false);

  const handlePurchase = async () => {
    setPurchasing(true);
    // Stripe checkout flow
    const res = await fetch(`/api/marketplace/materials/${material.id}/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buyer_id: currentUser.id })
    });
    const { download_url } = await res.json();
    window.location.href = download_url;
    setPurchasing(false);
  };

  return (
    <div className="marketplace-card">
      <div className="material-header">
        <h4>{material.title}</h4>
        <span className="category-badge">{material.category}</span>
      </div>
      <p className="description">{material.description}</p>
      <div className="material-stats">
        <div className="rating">
          <StarIcon />
          <span>{material.rating_avg?.toFixed(1) || 'N/A'}</span>
        </div>
        <div className="downloads">
          <DownloadIcon />
          <span>{material.download_count} downloads</span>
        </div>
      </div>
      <div className="seller-info">
        <img src={material.seller.avatar_url} alt={material.seller.full_name} />
        <span>{material.seller.full_name}</span>
      </div>
      <div className="purchase-section">
        {material.price_pence === 0 ? (
          <button onClick={handlePurchase} className="download-free-btn">
            Download Free
          </button>
        ) : (
          <>
            <div className="price">£{(material.price_pence / 100).toFixed(2)}</div>
            <button onClick={handlePurchase} disabled={purchasing}>
              {purchasing ? 'Processing...' : 'Purchase'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

### Acceptance Criteria
- [ ] Tutors can upload materials to marketplace
- [ ] Materials browsable by category, subject, level
- [ ] Purchase flow with Stripe integration
- [ ] Revenue split calculated and tracked (80/20 seller/platform)
- [ ] Download access granted after purchase
- [ ] Rating and review system functional

---

## Feature 5: White-Label AI for Organisations

### Overview
£5/month wholesale pricing for schools/agencies to offer branded AI tutors to their students.

### Business Goals
- B2B revenue stream (£5 × 1000 students = £5K MRR per organisation)
- Scale rapidly through institutional partnerships
- Recurring revenue (subscriptions)
- Low marginal cost (same infrastructure, different branding)

### Database Schema
```sql
-- Organisation white-label configurations
CREATE TABLE organisation_whitelabel_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES connection_groups(id) ON DELETE CASCADE UNIQUE,
  is_enabled BOOLEAN DEFAULT false,
  branding JSONB DEFAULT '{}'::jsonb, -- { logo_url, primary_color, secondary_color, name }
  custom_domain VARCHAR(255),
  monthly_price_pence INTEGER DEFAULT 500, -- £5/student/month
  max_students INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_org_whitelabel_enabled ON organisation_whitelabel_config(organisation_id, is_enabled);

-- White-label student access
CREATE TABLE organisation_whitelabel_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES connection_groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ai_tutor_id UUID NOT NULL REFERENCES ai_tutors(id) ON DELETE CASCADE,
  access_granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  access_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(organisation_id, student_id, ai_tutor_id)
);

CREATE INDEX idx_whitelabel_students_org ON organisation_whitelabel_students(organisation_id, is_active);
CREATE INDEX idx_whitelabel_students_student ON organisation_whitelabel_students(student_id, is_active);

-- Function: Get white-label branded session UI
CREATE OR REPLACE FUNCTION get_whitelabel_session_branding(p_session_id uuid)
RETURNS JSONB AS $$
DECLARE
  v_branding JSONB;
BEGIN
  SELECT owc.branding
  INTO v_branding
  FROM ai_tutor_sessions ats
  JOIN organisation_whitelabel_students ows ON ows.student_id = ats.client_id AND ows.ai_tutor_id = ats.ai_tutor_id
  JOIN organisation_whitelabel_config owc ON owc.organisation_id = ows.organisation_id
  WHERE ats.id = p_session_id
    AND ows.is_active = true
    AND owc.is_enabled = true;

  RETURN COALESCE(v_branding, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE organisation_whitelabel_config IS 'White-label branding configuration for organisations (£5/month wholesale)';
COMMENT ON TABLE organisation_whitelabel_students IS 'Student access to white-labeled AI tutors via their organisation';
```

### API Endpoints
```typescript
// POST /api/organisations/[id]/whitelabel/enable
// Enable white-label for organisation
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { branding, max_students } = await request.json();

  const { data: config } = await supabase
    .from('organisation_whitelabel_config')
    .upsert({
      organisation_id: params.id,
      is_enabled: true,
      branding,
      max_students
    })
    .select()
    .single();

  return NextResponse.json({ config });
}

// POST /api/organisations/[id]/whitelabel/grant-access
// Grant student access to white-labeled AI tutor
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { student_id, ai_tutor_id, access_expires_at } = await request.json();

  // Check max students limit
  const { count } = await supabase
    .from('organisation_whitelabel_students')
    .select('*', { count: 'exact', head: true })
    .eq('organisation_id', params.id)
    .eq('is_active', true);

  const { data: config } = await supabase
    .from('organisation_whitelabel_config')
    .select('max_students')
    .eq('organisation_id', params.id)
    .single();

  if (count >= config.max_students) {
    return NextResponse.json({ error: 'Max students limit reached' }, { status: 400 });
  }

  const { data: access } = await supabase
    .from('organisation_whitelabel_students')
    .insert({
      organisation_id: params.id,
      student_id,
      ai_tutor_id,
      access_expires_at
    })
    .select()
    .single();

  return NextResponse.json({ access });
}

// GET /api/ai-tutors/sessions/[sessionId]/branding
// Get white-label branding for session
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { data: branding } = await supabase.rpc('get_whitelabel_session_branding', {
    p_session_id: params.sessionId
  });

  return NextResponse.json({ branding });
}
```

### UI Components
```tsx
// WhiteLabelSessionUI.tsx
export default function WhiteLabelSessionUI({ sessionId }: { sessionId: string }) {
  const { data: branding } = useQuery(['session-branding', sessionId], () =>
    fetch(`/api/ai-tutors/sessions/${sessionId}/branding`).then(r => r.json())
  );

  // Apply branding if available
  const customStyles = branding?.branding ? {
    '--primary-color': branding.branding.primary_color,
    '--secondary-color': branding.branding.secondary_color
  } : {};

  return (
    <div className="session-container" style={customStyles}>
      {branding?.branding?.logo_url && (
        <div className="org-header">
          <img src={branding.branding.logo_url} alt={branding.branding.name} />
        </div>
      )}
      {/* Rest of session UI */}
    </div>
  );
}
```

### Acceptance Criteria
- [ ] Organisations can enable white-label mode
- [ ] Custom branding (logo, colors) applied to sessions
- [ ] Student access granted/revoked by organisation admins
- [ ] Max students limit enforced
- [ ] Monthly billing at £5/student
- [ ] Custom domains supported (optional)

---

## Feature 6: Advanced RAG

### Overview
Fine-tuning on tutor's teaching style and multi-modal support (images, PDFs, video transcripts).

### Business Goals
- Higher quality AI responses (better than generic RAG)
- Personality preservation (AI sounds like the tutor)
- Multi-modal learning (visual learners, equation recognition)
- Competitive differentiation (not just another chatbot)

### Database Schema
```sql
-- Fine-tuning jobs
CREATE TABLE ai_tutor_finetuning_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_tutor_id UUID NOT NULL REFERENCES ai_tutors(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  training_data_url TEXT,
  training_data_size_bytes INTEGER,
  model_version VARCHAR(100),
  fine_tuned_model_id VARCHAR(255),
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_finetuning_jobs_tutor ON ai_tutor_finetuning_jobs(ai_tutor_id, status);

-- Multi-modal material types
ALTER TABLE ai_tutor_materials ADD COLUMN IF NOT EXISTS content_type VARCHAR(50) DEFAULT 'text'; -- 'text', 'image', 'pdf', 'video', 'audio'
ALTER TABLE ai_tutor_materials ADD COLUMN IF NOT EXISTS extracted_text TEXT; -- OCR/transcript text
ALTER TABLE ai_tutor_materials ADD COLUMN IF NOT EXISTS vision_embedding VECTOR(768); -- For image understanding

-- Create HNSW index for vision embeddings
CREATE INDEX IF NOT EXISTS idx_ai_tutor_materials_vision_embedding
  ON ai_tutor_materials
  USING hnsw (vision_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Function: Hybrid search including multi-modal content
CREATE OR REPLACE FUNCTION search_ai_tutor_materials_multimodal(
  p_ai_tutor_id uuid,
  p_query_text text,
  p_query_embedding vector(768),
  p_limit integer DEFAULT 5
)
RETURNS TABLE (
  material_id uuid,
  title text,
  content_type varchar(50),
  relevance_score numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id as material_id,
    m.title,
    m.content_type,
    (
      -- Text embedding similarity (50%)
      (1 - (m.embedding <=> p_query_embedding)) * 0.5 +
      -- Vision embedding similarity (30%, if image/pdf)
      CASE
        WHEN m.content_type IN ('image', 'pdf') AND m.vision_embedding IS NOT NULL
        THEN (1 - (m.vision_embedding <=> p_query_embedding)) * 0.3
        ELSE 0
      END +
      -- Text search (20%)
      CASE
        WHEN m.extracted_text IS NOT NULL AND to_tsvector('english', m.extracted_text) @@ plainto_tsquery('english', p_query_text)
        THEN ts_rank(to_tsvector('english', m.extracted_text), plainto_tsquery('english', p_query_text)) * 0.2
        ELSE 0
      END
    ) as relevance_score
  FROM ai_tutor_materials m
  WHERE m.ai_tutor_id = p_ai_tutor_id
    AND m.status = 'ready'
  ORDER BY relevance_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE ai_tutor_finetuning_jobs IS 'Fine-tuning jobs for personalized AI tutor responses';
COMMENT ON COLUMN ai_tutor_materials.vision_embedding IS 'Embedding for image/visual content understanding';
```

### API Endpoints
```typescript
// POST /api/ai-tutors/[id]/finetune
// Start fine-tuning job
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { training_data_url, model_version } = await request.json();

  // Create fine-tuning job record
  const { data: job } = await supabase
    .from('ai_tutor_finetuning_jobs')
    .insert({
      ai_tutor_id: params.id,
      training_data_url,
      model_version,
      status: 'pending'
    })
    .select()
    .single();

  // Trigger async fine-tuning process (e.g., via queue)
  await triggerFineTuningJob(job.id);

  return NextResponse.json({ job });
}

// POST /api/ai-tutors/materials/[materialId]/extract-content
// Extract text from image/PDF/video
export async function POST(
  request: NextRequest,
  { params }: { params: { materialId: string } }
) {
  const { data: material } = await supabase
    .from('ai_tutor_materials')
    .select('*')
    .eq('id', params.materialId)
    .single();

  let extractedText = '';
  let visionEmbedding = null;

  if (material.content_type === 'image') {
    // OCR using Google Vision API or similar
    extractedText = await performOCR(material.file_url);
    visionEmbedding = await generateVisionEmbedding(material.file_url);
  } else if (material.content_type === 'pdf') {
    extractedText = await extractPDFText(material.file_url);
    visionEmbedding = await generatePDFVisionEmbedding(material.file_url);
  } else if (material.content_type === 'video') {
    extractedText = await transcribeVideo(material.file_url);
  }

  // Update material with extracted content
  await supabase
    .from('ai_tutor_materials')
    .update({
      extracted_text: extractedText,
      vision_embedding: visionEmbedding
    })
    .eq('id', params.materialId);

  return NextResponse.json({
    extracted_text: extractedText,
    vision_embedding: visionEmbedding ? 'generated' : null
  });
}
```

### Acceptance Criteria
- [ ] Fine-tuning jobs can be triggered for AI tutors
- [ ] Multi-modal content (images, PDFs, videos) supported
- [ ] OCR extraction for images and PDFs functional
- [ ] Video transcription working
- [ ] Vision embeddings generated and searchable
- [ ] Hybrid search includes multi-modal content

---

## Success Metrics (Phase 3)

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| AI tutors live | 1,000 | Count of published AI tutors |
| Sessions/month | 20,000 | Monthly session count |
| MRR | £30,000 | Monthly recurring revenue (subscriptions + bundles) |
| ARR | £360,000 | Annual recurring revenue projection |
| Subscription adoption | 20% of active AI tutors | Count of AI tutors with ≥1 active subscription |
| Bundle sales | 15% of transactions | Percentage of bookings using bundles |
| Material marketplace GMV | £5,000/month | Gross merchandise value in marketplace |
| White-label orgs | 10 | Count of organisations with white-label enabled |
| Fine-tuning adoption | 30% | Percentage of AI tutors using fine-tuning |

---

## Implementation Timeline

### Week 1-2: VirtualSpace Integration
- Database schema and API endpoints
- VirtualSpace session linking
- AI → human handoff flow
- Basic UI for video sessions

### Week 3-4: Bundle Pricing
- Bundle configuration schema
- Stripe integration for bundles
- Purchase and redemption logic
- UI for bundle display and purchase

### Week 5-7: Client Subscriptions
- Subscription plan schema
- Stripe recurring billing setup
- Monthly usage tracking
- Subscription management UI

### Week 8-10: Material Marketplace
- Marketplace schema and RPCs
- Upload and listing flow
- Purchase and download logic
- Marketplace browse UI

### Week 11-13: White-Label AI
- White-label configuration schema
- Branding application logic
- Student access management
- Organisation admin UI

### Week 14-16: Advanced RAG
- Fine-tuning job infrastructure
- Multi-modal content processing
- Vision embedding generation
- Enhanced RAG retrieval

---

## Risks & Mitigation

### Risk 1: VirtualSpace Technical Complexity
**Risk:** Integrating AI into video sessions is technically challenging

**Mitigation:**
- Start with simple text chat in video session (phase 1)
- Add screen sharing context later (phase 2)
- Handoff flow more important than AI video presence initially

### Risk 2: Subscription Cannibalization
**Risk:** £30 subscription cannibalizes pay-per-session revenue

**Mitigation:**
- Position subscriptions for high-usage clients only
- Offer tiered plans (e.g., 10 sessions/month vs unlimited)
- Monitor revenue impact closely

### Risk 3: Marketplace Quality Control
**Risk:** Low-quality materials damage platform reputation

**Mitigation:**
- Review system (star ratings + written reviews)
- Admin approval for first-time sellers
- Refund policy for unsatisfactory materials
- Featured/verified seller badges

### Risk 4: White-Label Sales Complexity
**Risk:** B2B sales cycle is long and complex

**Mitigation:**
- Start with 2-3 pilot organisations
- Simple self-service setup (no custom development)
- Clear pricing and onboarding docs
- Success case studies from pilots

### Risk 5: Fine-Tuning Cost
**Risk:** Fine-tuning for 1,000 AI tutors is expensive

**Mitigation:**
- Make fine-tuning optional (premium feature)
- Batch fine-tuning jobs to reduce cost
- Use cheaper models (Gemini Flash vs Pro)
- Only fine-tune for high-usage AI tutors (>100 sessions)

---

## Next Steps

1. **Review and approve** this implementation plan
2. **Prioritize features** (recommend: Bundle Pricing → Client Subscriptions → White-Label → others)
3. **Assign development resources** (frontend, backend, DevOps)
4. **Create detailed task breakdown** for first feature
5. **Set up tracking** for Phase 3 success metrics

---

**Document Status:** ✅ Ready for Review
**Next Action:** Approval and prioritization
**Owner:** Product Team
**Reviewers:** Engineering Lead, Business Stakeholders
