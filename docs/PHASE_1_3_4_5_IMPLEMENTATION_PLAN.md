# Phases 1, 3, 4, 5 Implementation Plan
**Created:** 2025-12-31
**Status:** In Progress
**Scope:** Referral Integration, Conversion Flow, Landing Pages, Advanced Features

---

## 🎯 Executive Summary

**Current Progress:**
- ✅ Phase 0: Organisation Profiles (100% Complete)
- 🔄 Phase 1: Referral Integration (40% Complete - Database Done, Frontend In Progress)
- ⏳ Phase 3: Conversion + Portal (0% - Ready to Start)
- ⏳ Phase 4: Referral Landing Pages (0% - Ready to Start)
- ⏳ Phase 5: Advanced Features (0% - Ready to Start)

**Phase 2 (CRM Pipeline):** Deferred to last as requested

---

## ✅ Phase 1: Referral Integration (IN PROGRESS)

### Status: 40% Complete

**What's Done:**
1. ✅ Database schema designed and implemented
2. ✅ Migration 155 created and applied
3. ✅ Materialized views for stats
4. ✅ RPC functions for calculations
5. ✅ Auto-commission calculation trigger
6. ✅ ReferralSettingsCard component (TSX + CSS)
7. ✅ TeamReferralLeaderboard component (TSX started)

**What's Remaining:**
1. ⏳ Complete TeamReferralLeaderboard CSS
2. ⏳ Build MemberReferralDashboard component
3. ⏳ Create referral link generation logic
4. ⏳ Implement QR code generation
5. ⏳ Build payout export functionality
6. ⏳ Add referral tracking to booking flow
7. ⏳ Test end-to-end referral attribution
8. ⏳ Integrate into organisation dashboard

### Database Schema (COMPLETE)

**Tables Created:**
```sql
-- 1. organisation_referral_config
- Configuration per organisation
- Commission percentages
- Split ratios (org vs member)
- Activation rules
- Payout thresholds

-- 2. Referrals Table Extensions
- organisation_id (which org this belongs to)
- referrer_member_id (which team member referred)
- commission_amount (total commission)
- organisation_commission (org's share)
- member_commission (member's share)
- commission_paid (payment status)
```

**Materialized Views:**
```sql
-- organisation_referral_stats
- Aggregated stats per organisation
- Total referrals, conversions, commission
- Top 10 performers
- Conversion rates

-- member_referral_stats
- Individual member performance
- Rankings within organisation
- This month vs all-time stats
- Pending vs paid earnings
```

**RPC Functions:**
```sql
-- calculate_referral_commission(referral_id, booking_value)
- Calculates total commission
- Applies org/member split
- Checks minimum booking value
- Returns split amounts

-- get_member_referral_dashboard(member_id, org_id)
- Comprehensive dashboard data
- Recent referrals (last 10)
- Rankings and stats
- Earnings breakdown
```

**Triggers:**
```sql
-- auto_calculate_referral_commission
- Fires on referral conversion
- Automatically calculates commission
- Updates all commission fields
- No manual intervention needed
```

### Frontend Components (60% COMPLETE)

#### 1. ReferralSettingsCard (✅ COMPLETE)

**File:** `apps/web/src/components/feature/organisation/referrals/ReferralSettingsCard.tsx`

**Features:**
- Enable/disable referral program toggle
- Total commission percentage slider (0-30%)
- Commission split sliders (org vs member)
- Visual split preview bar
- Minimum booking value input
- Payment completion requirement toggle
- Payout threshold setting
- Save settings with validation
- Success/error messaging
- Real-time split calculation display

**Example Configuration:**
```
Enabled: ✓
Total Commission: 10%
Org Split: 50% (£5.00 per £100 booking)
Member Split: 50% (£5.00 per £100 booking)
Min Booking: £0
Require Payment: ✓
Payout Threshold: £50
```

#### 2. TeamReferralLeaderboard (🔄 80% COMPLETE)

**File:** `apps/web/src/components/feature/organisation/referrals/TeamReferralLeaderboard.tsx`

**Features Implemented:**
- Fetch data from `member_referral_stats` view
- Display top N members (configurable limit)
- All-time vs This Month toggle
- Rank badges (1st/2nd/3rd medals, numbered for rest)
- Member avatars with fallbacks
- Referral and conversion counts
- Conversion rate percentage
- Total earnings display
- Pending earnings indicator
- Top performer achievement badge
- Summary totals (optional)

**Pending:**
- CSS module creation
- Responsive mobile layout
- Click-through to member details
- Export leaderboard functionality

#### 3. MemberReferralDashboard (⏳ NOT STARTED)

**Planned Features:**
- Personal referral link display
- Copy link button
- QR code generation
- Total earnings display
- Pending vs paid breakdown
- Referral history table
- Conversion tracking
- Monthly earnings chart
- Rank in organisation
- Share to social media

**Technical Approach:**
```typescript
// Use RPC function to get all data
const { data } = await supabase.rpc('get_member_referral_dashboard', {
  p_member_id: currentUserId,
  p_organisation_id: organisationId
});

// Generate referral link
const referralLink = `https://tutorwise.io/join/${organisationSlug}?ref=${memberReferralCode}`;

// Generate QR code
import QRCode from 'qrcode';
const qrCodeDataUrl = await QRCode.toDataURL(referralLink);
```

### Integration Points

**1. Booking Flow Integration**
```typescript
// When creating booking from organisation referral
const { data: booking } = await supabase.from('bookings').insert({
  client_id: clientId,
  student_id: studentId,
  tutor_id: tutorId,
  // ... other fields
});

// Create referral record if from team member link
if (referralCode) {
  const { data: member } = await supabase
    .from('profiles')
    .select('id, organisation_memberships(*)')
    .eq('referral_code', referralCode)
    .single();

  await supabase.from('referrals').insert({
    agent_id: member.id,
    organisation_id: member.organisation_memberships[0].organisation_id,
    referrer_member_id: member.id,
    booking_id: booking.id,
    status: 'Converted',
    // Commission will be auto-calculated by trigger
  });
}
```

**2. Organisation Dashboard Widget**
```tsx
// In organisation dashboard page
<TeamReferralLeaderboard
  organisationId={organisationId}
  limit={5}
  showFullStats={false}
/>

<ReferralSettingsCard
  organisationId={organisationId}
  isOwner={isOwner}
/>
```

**3. Member Profile Widget**
```tsx
// In team member profile/dashboard
<MemberReferralDashboard
  memberId={currentUserId}
  organisationId={organisationId}
/>
```

### Remaining Work (Estimated: 8-10 hours)

1. **Complete TeamReferralLeaderboard CSS** (1 hour)
   - Rank badges styling
   - Avatar layouts
   - Earnings display
   - Responsive design

2. **Build MemberReferralDashboard** (3-4 hours)
   - Component structure
   - Referral link generation
   - QR code integration
   - History table
   - CSS styling

3. **Referral Link System** (2 hours)
   - Generate unique codes per member
   - Link tracking middleware
   - Cookie/session attribution
   - Test attribution flow

4. **Payout Export** (1 hour)
   - CSV export of pending commissions
   - Filter by date range
   - Include member details
   - Download functionality

5. **Testing & Integration** (2-3 hours)
   - End-to-end referral flow
   - Commission calculation accuracy
   - Dashboard data accuracy
   - Performance testing

---

## ⏳ Phase 3: Conversion + Portal (NOT STARTED)

### Estimated Duration: 2 weeks

### Objectives

Build the lead-to-booking conversion flow with branded client portal for organisations.

### Deliverables

#### 1. Lead Conversion Flow

**Database:**
```sql
-- Extend organisation_leads table (from Phase 2)
ALTER TABLE organisation_leads
ADD COLUMN conversion_started_at TIMESTAMPTZ,
ADD COLUMN conversion_completed_at TIMESTAMPTZ,
ADD COLUMN assigned_tutor_id UUID REFERENCES profiles(id),
ADD COLUMN booking_id UUID REFERENCES bookings(id);

-- Conversion funnel tracking
CREATE TABLE lead_conversion_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES organisation_leads(id),
  step TEXT, -- 'details_collected', 'tutor_assigned', 'payment_initiated', 'booking_confirmed'
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);
```

**RPC Function:**
```sql
CREATE FUNCTION convert_lead_to_booking(
  p_lead_id UUID,
  p_tutor_id UUID,
  p_session_details JSONB
) RETURNS UUID AS $$
-- Creates booking from lead
-- Links to assigned tutor
-- Updates lead status
-- Returns booking_id
$$;
```

**Frontend Components:**
- `LeadConversionWizard` - Step-by-step conversion
- `TutorAssignmentCard` - Select from matched tutors
- `SessionScheduler` - Pick date/time
- `PaymentCollector` - Stripe integration
- `BookingConfirmation` - Success page

#### 2. Branded Client Portal

**URL Structure:**
```
/portal/[organisationSlug]
├── /dashboard - Client overview
├── /bookings - Upcoming sessions
├── /tutors - Assigned tutors
├── /billing - Invoices & payments
└── /support - Help & contact
```

**Branding System:**
```sql
-- Organisation branding config
ALTER TABLE connection_groups
ADD COLUMN portal_theme JSONB DEFAULT '{
  "primary_color": "#667eea",
  "logo_url": null,
  "welcome_message": "Welcome to our tutoring portal",
  "support_email": null,
  "support_phone": null
}'::jsonb;
```

**Components:**
- `BrandedPortalLayout` - Org-specific theming
- `ClientDashboard` - Session history, upcoming
- `TutorProfiles` - View assigned tutors
- `InvoiceList` - Payment history
- `SupportChat` - Org-specific help

#### 3. Payment Integration

**Stripe Connect for Organisations:**
```typescript
// Organisation gets Stripe Connect account
const account = await stripe.accounts.create({
  type: 'standard',
  email: organisation.email,
  metadata: {
    organisation_id: organisation.id
  }
});

// Payments go to organisation's account
const paymentIntent = await stripe.paymentIntents.create({
  amount: bookingAmount,
  currency: 'gbp',
  transfer_data: {
    destination: organisation.stripe_account_id,
  },
  application_fee_amount: platformFee,
});
```

**Commission Handling:**
```typescript
// On payment success
- Update referral.commission_paid = true
- Credit member's earnings balance
- Update organisation revenue
- Trigger payout if threshold met
```

### Technical Approach

**Leverage Existing:**
- ✅ Three-party booking model (client, student, tutor)
- ✅ Stripe integration infrastructure
- ✅ Booking session management
- ✅ Profile graph relationships

**Build New:**
- 🔨 Organisation portal routes
- 🔨 Branded theming system
- 🔨 Lead conversion wizard
- 🔨 Multi-step payment flow
- 🔨 Commission automation

---

## ⏳ Phase 4: Referral Landing Pages (NOT STARTED)

### Estimated Duration: 2 weeks

### Objectives

Create public-facing referral landing pages for organisations to drive sign-ups and conversions.

### Deliverables

#### 1. Public Join Pages

**URL Structure:**
```
/join/[organisationSlug]
├── Default landing page (no ref param)
└── ?ref=[memberCode] - Member-specific tracking
```

**Features:**
- Organisation branding (logo, colors)
- Hero section with value proposition
- Team member highlight (if ref code)
- Benefits list
- Trust indicators
- Simple lead capture form
- CTA buttons (Book Session, Get Matched)

**Component:**
```tsx
<OrganisationJoinPage
  organisation={org}
  referringMember={member} // if ref code
  config={joinPageConfig}
/>
```

#### 2. QR Code System

**Generation:**
```typescript
import QRCode from 'qrcode';

const generateMemberQRCode = async (member: Profile, org: Organisation) => {
  const url = `https://tutorwise.io/join/${org.slug}?ref=${member.referral_code}`;

  const qrCodeDataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    width: 512,
    margin: 2,
    color: {
      dark: org.portal_theme.primary_color || '#000000',
      light: '#FFFFFF'
    }
  });

  return qrCodeDataUrl;
};
```

**Use Cases:**
- Print on business cards
- Display at events
- Share in marketing materials
- Social media posts

#### 3. Social Sharing Tools

**Share Buttons:**
```tsx
<SocialShareButtons
  url={referralLink}
  title={`Join ${org.name} on Tutorwise`}
  description={org.tagline}
  image={org.cover_image_url}
  platforms={['facebook', 'twitter', 'linkedin', 'whatsapp', 'email']}
/>
```

**Pre-filled Messages:**
```
Facebook: "I'm part of [Org Name] on Tutorwise. Join us to find expert tutors! [link]"
Twitter: "Looking for tutoring? Check out [Org Name] on @TutorWise [link]"
LinkedIn: "Proud to be part of [Org Name]'s team on Tutorwise. We offer [subjects] tutoring. [link]"
WhatsApp: "Hi! I recommend [Org Name] for tutoring. They helped me find a great tutor: [link]"
Email: Subject + body template
```

#### 4. Referral Link Tracking

**Middleware:**
```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const { searchParams, pathname } = request.nextUrl;
  const refCode = searchParams.get('ref');

  if (pathname.startsWith('/join/') && refCode) {
    // Set referral cookie
    const response = NextResponse.next();
    response.cookies.set('referral_code', refCode, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
      httpOnly: true,
    });

    // Track click
    await trackReferralClick(refCode, {
      source: request.headers.get('referer'),
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for'),
    });

    return response;
  }

  return NextResponse.next();
}
```

**Attribution:**
```typescript
// On sign-up or booking
const referralCode = cookies().get('referral_code')?.value;

if (referralCode) {
  const { data: member } = await supabase
    .from('profiles')
    .select('id, organisation_memberships(*)')
    .eq('referral_code', referralCode)
    .single();

  // Create referral record
  await supabase.from('referrals').insert({
    agent_id: member.id,
    organisation_id: member.organisation_memberships[0].organisation_id,
    referrer_member_id: member.id,
    status: 'Signed Up',
    attribution_method: 'join_page',
  });
}
```

#### 5. Customizable Join Pages

**Configuration:**
```sql
CREATE TABLE organisation_join_page_config (
  organisation_id UUID PRIMARY KEY,
  hero_headline TEXT,
  hero_subheadline TEXT,
  hero_image_url TEXT,
  benefits JSONB, -- Array of benefit objects
  testimonials JSONB, -- Array of testimonial objects
  cta_primary_text TEXT DEFAULT 'Book a Session',
  cta_secondary_text TEXT DEFAULT 'Learn More',
  show_team_photos BOOLEAN DEFAULT true,
  show_reviews BOOLEAN DEFAULT true,
  custom_css TEXT
);
```

**Builder Interface:**
```tsx
<JoinPageBuilder
  organisationId={orgId}
  config={config}
  onSave={handleSave}
/>
```

---

## ⏳ Phase 5: Advanced Features (NOT STARTED)

### Estimated Duration: 2+ weeks

### Objectives

Add automation, gamification, and advanced analytics to maximize referral program effectiveness.

### Deliverables

#### 1. Lead Nurturing Automation

**Email Sequences:**
```sql
CREATE TABLE lead_nurture_sequences (
  id UUID PRIMARY KEY,
  organisation_id UUID REFERENCES connection_groups(id),
  name TEXT,
  trigger_event TEXT, -- 'lead_created', 'no_response_7d', 'booking_abandoned'
  enabled BOOLEAN DEFAULT true
);

CREATE TABLE lead_nurture_emails (
  id UUID PRIMARY KEY,
  sequence_id UUID REFERENCES lead_nurture_sequences(id),
  delay_hours INTEGER, -- Send X hours after trigger
  subject TEXT,
  body_template TEXT,
  send_order INTEGER
);
```

**Automation Rules:**
- New lead → Welcome email (immediate)
- No response after 2 days → Follow-up email
- Matched with tutor → Introduction email
- Booking not completed → Reminder email
- 7 days inactive → Re-engagement email

**Implementation:**
```typescript
// pg_cron job or edge function
async function processLeadNurturing() {
  const leadsDue = await getLeadsDueForNurturing();

  for (const lead of leadsDue) {
    const sequence = await getActiveSequence(lead);
    const nextEmail = await getNextEmail(sequence, lead);

    if (nextEmail) {
      await sendEmail({
        to: lead.email,
        subject: renderTemplate(nextEmail.subject, lead),
        body: renderTemplate(nextEmail.body_template, lead),
      });

      await markEmailSent(lead.id, nextEmail.id);
    }
  }
}
```

#### 2. Gamification System

**Achievements:**
```sql
CREATE TABLE referral_achievements (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE, -- 'first_referral', 'hat_trick', 'top_performer_month'
  name TEXT,
  description TEXT,
  icon_url TEXT,
  criteria JSONB
);

CREATE TABLE member_achievements (
  member_id UUID,
  achievement_id UUID,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (member_id, achievement_id)
);
```

**Achievement Types:**
- **First Referral** - Make your first referral
- **Hat Trick** - 3 conversions in a month
- **Perfect 10** - 10 conversions all-time
- **Top Performer** - #1 in organisation for a month
- **Hot Streak** - 5 conversions in 7 days
- **Century Club** - £100+ earnings
- **Conversion Master** - 80%+ conversion rate (min 10 referrals)

**Badges & Streaks:**
```tsx
<MemberBadges
  memberId={memberId}
  achievements={achievements}
/>

<ReferralStreak
  currentStreak={7}
  longestStreak={14}
  lastReferralDate={new Date()}
/>
```

**Leaderboard Enhancements:**
- Weekly/monthly/all-time tabs
- Department/role filters
- Achievement badges on profiles
- Streak indicators
- Points system (optional)

#### 3. Advanced Analytics Dashboard

**Organisation-Level Analytics:**
```tsx
<ReferralAnalyticsDashboard organisationId={orgId}>
  <MetricsOverview
    totalReferrals={stats.total_referrals}
    conversionRate={stats.conversion_rate}
    totalRevenue={stats.total_revenue}
    avgCommission={stats.avg_commission}
  />

  <ReferralFunnel
    steps={[
      { name: 'Referred', count: 100 },
      { name: 'Signed Up', count: 60 },
      { name: 'Matched', count: 40 },
      { name: 'Converted', count: 25 }
    ]}
  />

  <TopPerformersChart
    data={topPerformers}
    period="month"
  />

  <RevenueBySource
    organic={organicRevenue}
    referrals={referralRevenue}
    marketing={marketingRevenue}
  />

  <ConversionTimeline
    avgDaysToConversion={7.5}
    distributionByDays={distribution}
  />
</ReferralAnalyticsDashboard>
```

**Member-Level Analytics:**
```tsx
<MemberReferralAnalytics memberId={memberId}>
  <EarningsChart
    monthlyEarnings={monthlyData}
    projectedEarnings={projection}
  />

  <ReferralSourceBreakdown
    sources={[
      { name: 'Direct Link', count: 10 },
      { name: 'QR Code', count: 5 },
      { name: 'Social Media', count: 8 }
    ]}
  />

  <ConversionFunnel
    personalFunnel={memberFunnelData}
  />
</MemberReferralAnalytics>
```

#### 4. A/B Testing Framework

**Test Different Strategies:**
```sql
CREATE TABLE referral_experiments (
  id UUID PRIMARY KEY,
  organisation_id UUID,
  name TEXT,
  variant_a_config JSONB,
  variant_b_config JSONB,
  start_date DATE,
  end_date DATE,
  winner TEXT -- 'a', 'b', or NULL
);
```

**Test Scenarios:**
- Commission percentage (5% vs 10% vs 15%)
- Split ratio (50/50 vs 70/30 vs 80/20)
- Minimum booking value (£0 vs £50 vs £100)
- Landing page design (variant A vs B)
- Email subject lines
- CTA button text

**Analytics:**
```typescript
const experimentResults = await analyzeExperiment(experimentId);
// {
//   variant_a: { conversions: 50, revenue: 5000, conversion_rate: 0.25 },
//   variant_b: { conversions: 65, revenue: 6500, conversion_rate: 0.32 },
//   winner: 'b',
//   confidence: 0.95
// }
```

#### 5. Mobile App Support

**React Native Components:**
```tsx
// Referral link sharing
<ShareReferralButton
  link={referralLink}
  qrCode={qrCodeDataUrl}
  onShare={handleShare}
/>

// In-app QR scanner
<QRScanner
  onScan={handleQRScan}
  onSuccess={handleReferralCapture}
/>

// Push notifications
<ReferralNotifications
  onNewReferral={showNotification}
  onConversion={showConversionAlert}
  onEarningsMilestone={celebrateAchievement}
/>
```

---

## 📊 Overall Implementation Timeline

### Week-by-Week Breakdown

**Week 1-2: Phase 1 Completion**
- Days 1-2: Complete TeamReferralLeaderboard CSS
- Days 3-5: Build MemberReferralDashboard
- Days 6-8: Referral link system & QR codes
- Days 9-10: Testing & integration

**Week 3-4: Phase 3 (Conversion + Portal)**
- Days 11-13: Lead conversion flow
- Days 14-16: Branded client portal
- Days 17-19: Payment integration
- Days 20-21: Testing & polish

**Week 5-6: Phase 4 (Landing Pages)**
- Days 22-24: Public join pages
- Days 25-26: QR code system
- Days 27-28: Social sharing tools
- Days 29-30: Link tracking & attribution

**Week 7-8: Phase 5 Part 1 (Automation)**
- Days 31-33: Lead nurturing sequences
- Days 34-36: Email automation
- Days 37-38: Testing & refinement

**Week 9-10: Phase 5 Part 2 (Gamification & Analytics)**
- Days 39-41: Achievement system
- Days 42-44: Advanced analytics dashboard
- Days 45-46: A/B testing framework
- Days 47-48: Mobile app support
- Days 49-50: Final testing & polish

---

## 🎯 Success Metrics

### Phase 1 Success Criteria
- [ ] Organisations can enable/configure referral program
- [ ] Team members see their referral dashboard
- [ ] Commissions calculated automatically on conversion
- [ ] Leaderboard shows accurate rankings
- [ ] Member earnings tracked correctly
- [ ] Payout export functional

### Phase 3 Success Criteria
- [ ] Leads convert to bookings smoothly
- [ ] Client portal fully branded per org
- [ ] Payments collected successfully
- [ ] Commission paid out correctly
- [ ] Booking confirmation automated

### Phase 4 Success Criteria
- [ ] Join pages live for all orgs
- [ ] QR codes generate correctly
- [ ] Social sharing working
- [ ] Referral links tracked accurately
- [ ] Attribution working end-to-end

### Phase 5 Success Criteria
- [ ] Email sequences sending automatically
- [ ] Achievements unlocking correctly
- [ ] Analytics dashboards accurate
- [ ] A/B tests running
- [ ] Mobile app integrated

---

## 📝 Next Steps

**Immediate (This Session):**
1. Complete TeamReferralLeaderboard CSS
2. Create basic MemberReferralDashboard structure
3. Commit Phase 1 progress to GitHub
4. Update overall progress document

**Next Session:**
1. Complete Phase 1 remaining work
2. Start Phase 3 database design
3. Build conversion flow components
4. Integrate with existing booking system

**Future Sessions:**
1. Phase 4 implementation
2. Phase 5 advanced features
3. Comprehensive testing
4. Production deployment

---

**Status:** ACTIVE DEVELOPMENT
**Last Updated:** 2025-12-31
**Next Review:** After Phase 1 completion
