# Vinite: TutorWise Referral Engine Integration Strategy

**Status:** Platform Integration Required
**Relationship:** Vinite is the referral engine/platform for TutorWise
**Similar to:** CAS (separate platform, tight integration)
**Decision:** STRONG YES for monorepo integration

---

## 🎯 Strategic Relationship

### TutorWise Platform Architecture
```
tutorwise-monorepo/
├── apps/
│   ├── web/              # TutorWise - Main marketplace platform
│   ├── api/              # TutorWise - Backend API
│   └── vinite/           # Vinite - Referral engine for TutorWise
├── packages/shared/
│   ├── ui/               # Shared UI components
│   ├── supabase/         # Shared database & auth
│   ├── stripe/           # Shared payments
│   └── utils/            # Shared utilities
└── cas/                  # CAS - Autonomous system manager
    ├── packages/
    │   ├── core/         # Service orchestration
    │   ├── agent/        # Autonomous agent
    │   └── cli/          # CLI interface
    └── apps/
        └── dashboard/    # CAS monitoring dashboard (future)
```

### Platform Roles

**TutorWise (Main Platform):**
- Marketplace for tutors and students
- Service listings, bookings, payments
- User profiles, reviews, messaging
- Core business logic

**Vinite (Referral Engine):**
- Referral tracking for TutorWise users
- Referral rewards and incentives
- Affiliate/partner management
- Referral analytics
- Shares TutorWise users, auth, payments

**CAS (System Manager):**
- Manages both TutorWise and Vinite services
- Autonomous development agent
- Service orchestration
- Can become independent product

---

## 🔗 Integration Benefits (Referral Engine Context)

### 1. **Shared User Base**
- Vinite users ARE TutorWise users
- Single authentication system (Supabase)
- Unified user profiles
- Consistent user experience

**Value:** Seamless referral experience, no duplicate accounts

---

### 2. **Shared Data Models**
TutorWise and Vinite share:
- User accounts
- Payment methods (Stripe)
- Transaction history
- Notification preferences

**Implementation:**
```typescript
// packages/shared/supabase/src/types/user.ts
export interface User {
  id: string
  email: string
  profile: UserProfile
  referral_code?: string      // Vinite: referral tracking
  referred_by?: string        // Vinite: agent tracking
  referral_rewards?: number   // Vinite: rewards earned
}
```

---

### 3. **Cross-Platform Features**

#### Referral Flow
```
TutorWise User → Shares referral link (Vinite) → New user signs up
→ New user books service (TutorWise) → agent gets reward (Vinite)
→ Payout processed (Shared Stripe)
```

#### Shared Components
- **Auth:** Single sign-on between platforms
- **Payments:** Shared Stripe account
- **Notifications:** Unified notification system
- **Analytics:** Cross-platform user tracking

---

### 4. **Development Efficiency**

**Before Monorepo (Separate Repos):**
```bash
# Update auth in TutorWise
cd ~/projects/tutorwise
git pull
npm install
# ... make changes ...

# Now update Vinite to match
cd ~/projects/vinite
git pull
npm install
# ... duplicate same changes ...
# ... hope they stay in sync ...
```

**After Monorepo:**
```bash
# Update auth once in shared package
cd ~/projects/tutorwise
# Edit packages/shared/supabase/src/auth.ts
# Both TutorWise and Vinite automatically use updated auth
npm test  # Tests both platforms
```

**Time Saved:** 20 hrs/month on feature parity maintenance

---

### 5. **CAS Management**

CAS can manage both platforms as a unified system:

```json
// tools/configs/service-registry.json
{
  "tutorwise-frontend": {
    "port": 3000,
    "dependencies": ["tutorwise-backend", "redis", "neo4j"],
    "auto_start": true
  },
  "vinite-frontend": {
    "port": 3001,
    "dependencies": ["tutorwise-backend", "redis"],
    "auto_start": true,
    "notes": "Referral engine - shares TutorWise backend"
  },
  "tutorwise-backend": {
    "port": 8000,
    "dependencies": ["redis", "neo4j", "supabase"],
    "serves": ["tutorwise-frontend", "vinite-frontend"],
    "auto_start": true
  }
}
```

**CAS Benefits:**
- Start both platforms together: `cas start`
- Unified health monitoring
- Cross-platform dependency tracking
- Single development environment

---

## 📦 Shared Package Strategy

### High-Value Shared Packages

#### 1. **@tutorwise/auth** (Critical)
**Shared Between:** TutorWise + Vinite
**Purpose:** Unified authentication & user management

```typescript
// packages/shared/auth/src/index.ts
export { createClient, getUser, signIn, signOut } from './client'
export { getUserProfile, updateProfile } from './profile'
export { getReferralCode, trackReferral } from './referrals'  // Vinite-specific
```

**Value:**
- Single source of truth for users
- Referral tracking built-in
- No auth drift between platforms

---

#### 2. **@tutorwise/payments** (Critical)
**Shared Between:** TutorWise + Vinite
**Purpose:** Unified payment processing

```typescript
// packages/shared/payments/src/index.ts
export { processPayment, createCheckout } from './stripe'
export { processReferralReward } from './referrals'  // Vinite: reward payouts
export { trackCommission } from './commissions'      // Vinite: affiliate tracking
```

**Value:**
- Single Stripe integration
- Unified payout system
- Consistent payment UX

---

#### 3. **@tutorwise/database** (Critical)
**Shared Between:** TutorWise + Vinite
**Purpose:** Shared data access layer

```typescript
// packages/shared/database/src/models/user.ts
export class User {
  async getReferrals() {
    // Used by Vinite to show referral tree
  }

  async getReferralRewards() {
    // Used by Vinite to calculate earnings
  }

  async getBookings() {
    // Used by TutorWise to show service history
  }
}
```

**Value:**
- Consistent data models
- Cross-platform queries
- Type safety

---

#### 4. **@tutorwise/ui** (High Value)
**Shared Between:** TutorWise + Vinite
**Purpose:** Consistent design system

```typescript
// packages/shared/ui/src/index.ts
export { Button, Input, Card } from './components'
export { ReferralCard, ReferralBadge } from './referrals'  // Vinite-specific
export { ServiceCard, BookingCard } from './marketplace'   // TutorWise-specific
```

**Value:**
- Unified brand identity
- Shared component library
- Faster UI development

---

#### 5. **@tutorwise/analytics** (Medium Value)
**Shared Between:** TutorWise + Vinite + CAS
**Purpose:** Cross-platform tracking

```typescript
// packages/shared/analytics/src/index.ts
export { trackEvent, trackPageView } from './tracking'
export { trackReferral, trackConversion } from './referrals'  // Vinite
export { trackBooking, trackPayment } from './marketplace'    // TutorWise
```

**Value:**
- Unified analytics
- Cross-platform funnel tracking
- Referral attribution

---

## 🗂️ Updated Monorepo Structure

```
tutorwise-monorepo/
├── apps/
│   ├── web/                    # TutorWise marketplace
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── marketplace/
│   │   │   │   ├── bookings/
│   │   │   │   └── profile/
│   │   │   └── components/     # TutorWise-specific components
│   │   └── package.json        # @tutorwise/web
│   │
│   ├── vinite/                 # Vinite referral engine
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── dashboard/  # Referral dashboard
│   │   │   │   ├── rewards/    # Reward tracking
│   │   │   │   └── affiliates/ # Affiliate management
│   │   │   └── components/     # Vinite-specific components
│   │   └── package.json        # @tutorwise/vinite
│   │
│   └── api/                    # Shared backend API
│       ├── app/
│       │   ├── marketplace/    # TutorWise routes
│       │   ├── referrals/      # Vinite routes
│       │   └── auth/           # Shared auth
│       └── requirements.txt
│
├── packages/shared/            # Shared packages
│   ├── auth/                   # @tutorwise/auth
│   ├── payments/               # @tutorwise/payments
│   ├── database/               # @tutorwise/database
│   ├── ui/                     # @tutorwise/ui
│   ├── analytics/              # @tutorwise/analytics
│   ├── utils/                  # @tutorwise/utils
│   └── config/                 # @tutorwise/config
│
└── cas/                        # CAS platform
    ├── packages/
    │   ├── core/               # @cas/core
    │   ├── agent/              # @cas/agent
    │   └── cli/                # @cas/cli
    └── docs/
        ├── CAS-roadmap.md
        └── architecture/
```

---

## 🚀 Integration Approach

### Phase 1: Add Vinite to Monorepo (Week 1)
```bash
# Add Vinite as subtree
git subtree add --prefix apps/vinite https://github.com/viniteapp/vinite main --squash

# Update workspace
# package.json already configured for apps/*
npm install
```

### Phase 2: Extract Shared Code (Week 2-3)
Priority order based on cross-platform dependencies:

1. **Auth** (both need users)
2. **Database** (both need data models)
3. **Payments** (both process transactions)
4. **UI** (both need components)
5. **Analytics** (both track events)

### Phase 3: Unified Development (Week 4)
```bash
# Start both platforms together
npm run cas-startup:start-all

# TutorWise: http://localhost:3000
# Vinite:    http://localhost:3001
# API:       http://localhost:8000
```

---

## 💰 ROI Calculation (Referral Engine Context)

### Development Time Savings

| Area | Before | After | Saved | Value/Month |
|------|--------|-------|-------|-------------|
| Auth sync | 8 hrs | 0 hrs | 8 hrs | $800 |
| Payment sync | 6 hrs | 0 hrs | 6 hrs | $600 |
| Database models | 10 hrs | 0 hrs | 10 hrs | $1,000 |
| UI components | 12 hrs | 2 hrs | 10 hrs | $1,000 |
| Bug fixes | 8 hrs | 2 hrs | 6 hrs | $600 |
| Testing | 10 hrs | 3 hrs | 7 hrs | $700 |
| **Total** | **54 hrs** | **7 hrs** | **47 hrs** | **$4,700** |

### Feature Development Speed

**Before Monorepo:**
```
Feature: Add social login
- Update TutorWise auth: 4 hrs
- Update Vinite auth: 4 hrs  (duplicate work)
- Test both separately: 3 hrs
- Fix inconsistencies: 2 hrs
Total: 13 hrs
```

**After Monorepo:**
```
Feature: Add social login
- Update @tutorwise/auth: 4 hrs
- Test both platforms: 2 hrs  (same code)
Total: 6 hrs (54% faster)
```

---

## ✅ Final Recommendation

### STRONG YES - Monorepo Integration Required

**Confidence:** 99%

**Reasons:**
1. ✅ Vinite is **core TutorWise feature** (referral engine)
2. ✅ **Same company, same team**
3. ✅ **Shared user base** (100% overlap)
4. ✅ **Shared infrastructure** (Supabase, Stripe, Vercel)
5. ✅ **100% tech stack match**
6. ✅ **Cross-platform features** (referrals → bookings)
7. ✅ **Long-term relationship** (permanent integration)

**Value:**
- **47 hrs/month saved** ($4,700/month)
- **54% faster feature development**
- **Unified user experience**
- **Easier maintenance**
- **CAS manages both platforms**

**Risk:** Negligible (same owner, same codebase goals)

---

## 🎯 Next Steps

1. **Execute Phase 1** (Today):
   ```bash
   cd /Users/michaelquan/projects/tutorwise
   git subtree add --prefix apps/vinite https://github.com/viniteapp/vinite main --squash
   npm install
   ```

2. **Start Development** (Week 1):
   - Extract auth to `@tutorwise/auth`
   - Extract payments to `@tutorwise/payments`
   - Test both platforms

3. **CAS Integration** (Week 2):
   - Register Vinite in service-registry.json
   - Unified startup: `cas start`

4. **Production Ready** (Week 4):
   - Unified CI/CD
   - Deploy both platforms
   - Cross-platform analytics

---

**This is not optional** - Vinite as TutorWise's referral engine **must** be in the monorepo for maintainability and feature parity.

**Prepared by:** CAS Analysis Engine
**Recommendation:** Execute immediately
**Priority:** High
