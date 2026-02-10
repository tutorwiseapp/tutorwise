# EduPay Product Roadmap

**Document Purpose**: Strategic roadmap for EduPay feature development and market expansion.

**Created**: 2026-02-10
**Status**: Draft for Review

---

## Executive Summary

EduPay transforms tutoring earnings into student loan repayments. This roadmap outlines the path from current MVP to full-featured platform, potential market expansion, and revenue opportunities.

**Current State**: Phase 1-3 complete (EP earning, wallet, projections, TrueLayer PISP stub)
**Next Priority**: Go live with TrueLayer, then expand features and market

### The Strategic 3-Step Framework

| Step | Timeframe | Focus | Goal |
|------|-----------|-------|------|
| **1. Psychological EduPay** | 0-6 months | EP points, dashboards, projections, narrative | Create identity, not fintech |
| **2. Functional EduPay** | 6-12 months | TrueLayer payments, conversion flow, cashback | First real payments to SLC |
| **3. Ecosystem EduPay** | 12-24 months | B2B, universities, banks, credit data layer | Platform infrastructure |

### Valuation Impact

| Metric | EdTech Only | With EduPay |
|--------|-------------|-------------|
| LTV per user | 1x | 3-10x |
| Retention | 1-3 years | 10-20 years |
| Multiple | 3-8x (EdTech) | 10-25x (Fintech) |

**EduPay shifts Tutorwise from EdTech valuation to Fintech valuation.**

---

## Current Implementation (Phases 1-3)

### Completed Features

| Feature | Status | Description |
|---------|--------|-------------|
| EP Wallet | ✅ Complete | Track total, available, pending, converted EP |
| EP Earning | ✅ Complete | Earn EP from tutoring sessions (10 EP/£1) |
| EP Ledger | ✅ Complete | Full transaction history with filters |
| Loan Profile | ✅ Complete | Plan type, balance, salary, graduation year, SLC reference |
| Projection Widget | ✅ Complete | Years saved, interest saved, debt-free date |
| Conversion Modal | ✅ Complete | 3-step flow: Amount → Review → Done |
| TrueLayer Integration | ✅ Stub Ready | Code complete, awaiting credentials |

### Database Schema (6 Tables)

1. `edupay_wallets` - User EP balances
2. `edupay_ledger` - Transaction history
3. `edupay_loan_profiles` - Loan details
4. `edupay_conversions` - Conversion requests
5. `edupay_projections` - Cached calculations
6. `edupay_settings` - User preferences

### API Routes (11 Endpoints)

- Wallet: GET/POST
- Ledger: GET with filters
- Loan Profile: GET/POST
- Projection: GET (with recalculation)
- Conversion: POST request, GET callback, GET status
- Webhook: POST TrueLayer events

---

## Phase 4: Go Live (Q1 2026)

### Objective
Enable real TrueLayer payments from EP wallet to SLC.

### Tasks

| Task | Priority | Complexity |
|------|----------|------------|
| Obtain TrueLayer sandbox credentials | P0 | Low |
| Complete TrueLayer onboarding | P0 | Medium |
| Test end-to-end payment flow in sandbox | P0 | Medium |
| Move to TrueLayer production | P0 | Medium |
| Monitor first real conversions | P0 | Low |

### Success Metrics

- [ ] First successful sandbox payment
- [ ] First successful production payment
- [ ] 10 users complete conversion flow
- [ ] Zero payment failures

### Timeline
2-4 weeks from credentials received

---

## Phase 5: Enhanced Projections (Q1-Q2 2026)

### Objective
Make projections smarter and more actionable.

### Features

**5.1 Scenario Comparison**
- Show "Let it write off" vs "Pay off early" paths
- Compare interest paid in each scenario
- Recommend optimal strategy based on income trajectory

**5.2 Salary Growth Modelling**
- Input expected salary progression
- Adjust projections for career advancement
- Show impact of promotion on debt-free date

**5.3 EP Earning Rate Optimization**
- Show how increasing tutoring hours affects payoff
- "Tutor 2 more hours/week = debt-free 3 years earlier"
- Gamification hooks for engagement

**5.4 Plan Type Advisor**
- For Plan 2/5 users, show if overpaying makes sense
- For Plan 1 users, always show benefit
- For Postgrad, show concurrent loan impact

### Technical Requirements

- New projection algorithm with multiple scenarios
- Frontend: Scenario toggle/slider components
- Backend: Cached multi-scenario projections
- Database: Extended projection schema

---

## Phase 6: Cashback Integration (Q2 2026)

### Objective
Mirror Sprive's cashback model for student loan payments.

### Approach

Partner with Tillo (same as Sprive) or similar gift card aggregator to offer:
- 3-15% cashback at major retailers
- Cashback automatically added as EP
- Users can convert EP → GBP → SLC payment

### Target Retailers (Start with Top 10)

1. Amazon (5-7%)
2. Tesco (3-5%)
3. Sainsbury's (3-5%)
4. ASDA (3-5%)
5. Deliveroo (5-10%)
6. ASOS (5-10%)
7. M&S (5-7%)
8. Nike (5-10%)
9. Uber Eats (5-10%)
10. Just Eat (5-10%)

### Revenue Model
- Affiliate commission from retailers
- Keep portion, pass majority to users as EP
- Estimated 20-30% margin on cashback

### Technical Requirements

- Tillo API integration
- Card linking flow (similar to Sprive)
- EP earning from purchases (new ledger type: 'cashback')
- Marketing landing page

---

## Phase 7: Mobile App (Q3 2026)

### Objective
Native mobile experience for higher engagement.

### Features

- Full EP wallet management
- Push notifications for conversions
- Cashback card at retailers
- Tutoring session reminders
- Debt-free countdown timer
- Social sharing (milestones)

### Technology

- React Native or Flutter
- Shared API with web platform
- Biometric authentication
- Apple Pay / Google Pay for cashback

### Success Metrics

- 50% of active users adopt app
- 2x session frequency vs web
- 4.5+ App Store rating

---

## Phase 8: Employer B2B (Q3-Q4 2026)

### Objective
Offer EduPay as employee benefit for graduate-heavy employers.

### Value Proposition

**For Employers:**
- Attract graduate talent with debt relief benefit
- Tax-efficient (potential salary sacrifice scheme)
- Improve retention of younger employees
- CSR/ESG narrative around financial wellbeing

**For Employees:**
- Employer contributions to student loan
- Same EduPay dashboard
- Combined personal EP + employer contributions

### Target Verticals

1. **Big 4 Accounting** (Deloitte, PwC, EY, KPMG) - Heavy graduate recruitment
2. **Law Firms** (Magic Circle, Silver Circle) - High grad debt, high salaries
3. **Tech Companies** (UK startups, FAANG) - Compete on benefits
4. **NHS / Public Sector** - Large graduate workforce
5. **Investment Banks** (Goldman, JP Morgan) - Already offer loan repayment in US

### Pricing Model

| Tier | Features | Price |
|------|----------|-------|
| Basic | Dashboard access for employees | £5/employee/month |
| Standard | + Employer matching contributions | £10/employee/month |
| Premium | + Salary sacrifice integration | £15/employee/month |

### Revenue Potential

- 100 companies × 500 employees × £10/month = £500k ARR
- Target: 10 pilot companies by end of 2026

---

## Phase 9: US Market Expansion (2027)

### Objective
Adapt EduPay for US student loan market (7x larger than UK).

### Market Opportunity

| Metric | UK | US | Multiplier |
|--------|----|----|------------|
| Outstanding Debt | £267B | $1.77T (~£1.4T) | **7x** |
| Borrowers | 5.2M | 43M | **8x** |
| Average Debt | £53k | $39k (~£31k) | 0.6x |
| Time to Payoff | 50s | 40s | Faster |
| Servicer(s) | 1 (SLC) | ~5 (MOHELA, Nelnet, etc.) | More complex |

### US-Specific Considerations

**Regulatory:**
- State-by-state licensing may be required
- Federal loan servicer integration complexity
- Consumer Financial Protection Bureau (CFPB) compliance

**Product Adaptations:**
- Support multiple loan servicers (MOHELA, Nelnet, Aidvantage, etc.)
- Integration with income-driven repayment (IDR) plans
- Public Service Loan Forgiveness (PSLF) tracking
- Private loan consolidation options

**Go-to-Market:**
- Partner with US tutoring platforms (Wyzant, Varsity Tutors, Tutor.com)
- Or launch TutorwiseUS as separate product
- Target recent graduates (under 30) in high-debt professions

### Technical Requirements

- Multi-currency support (USD)
- US payment rails (ACH, FedNow)
- Open Banking via Plaid (US equivalent of TrueLayer)
- Multi-servicer payment routing

### Timeline
- Research & regulatory: Q1-Q2 2027
- MVP development: Q3 2027
- Pilot launch: Q4 2027

---

## Phase 10: Additional Markets (2028+)

### Tier 1 Markets (Similar Structure to UK)

| Country | Debt | Notes |
|---------|------|-------|
| Australia | AUD $81B | HECS-HELP, recent 20% debt relief |
| Canada | CAD $22B | Federal + provincial |
| New Zealand | NZD $16B | StudyLink, income-contingent |

### Tier 2 Markets (Emerging Opportunity)

| Country | Notes |
|---------|-------|
| Netherlands | DUO system, €24B debt |
| Germany | Growing private loans |
| South Korea | High private tutoring culture |

### Expansion Strategy

1. Validate demand with waitlist landing page
2. Partner with local tutoring platforms
3. Adapt payment rails (Open Banking equivalent)
4. Localize projections for local loan rules
5. Regulatory compliance per jurisdiction

---

## Revenue Roadmap

### The 7+ Revenue Stream Model

Unlike Sprive (2-3 streams), Tutorwise + EduPay can monetise across 7+ channels:

| # | Revenue Stream | Phase | Description | Potential |
|---|----------------|-------|-------------|-----------|
| 1 | **Tutoring Commissions** | Now | % of tutoring session fees | Core |
| 2 | **EP Conversion Fees** | Phase 4 | Optional small fee on EP→GBP | Medium |
| 3 | **Cashback Affiliate** | Phase 6 | Retail partnerships (Tillo) | High |
| 4 | **Bank Partnerships** | Phase 6-7 | Graduate banking referrals | High |
| 5 | **Employer B2B** | Phase 8 | Graduate benefits platform | Very High |
| 6 | **University Partnerships** | Phase 8-9 | Embedded in student services | High |
| 7 | **Fintech Referrals** | Phase 7+ | ISAs, pensions, insurance | Medium |

### Revenue Streams by Phase

| Phase | Revenue Stream | ARR Potential |
|-------|----------------|---------------|
| Phase 4-5 | Free (user growth focus) | £0 |
| Phase 6 | Cashback affiliate + bank partnerships | £50-150k |
| Phase 7 | Premium app features + fintech referrals | £50-100k |
| Phase 8 | Employer B2B + university partnerships | £500k-1M |
| Phase 9-10 | US + International (all streams) | £5-10M+ |

### 3-Year Revenue Target

| Year | Revenue | Users | Notes |
|------|---------|-------|-------|
| 2026 | £100-200k | 10,000 | UK cashback + early B2B pilots |
| 2027 | £1-2M | 50,000 | B2B scaling + US pilot |
| 2028 | £5-10M | 250,000+ | Multi-market expansion |

---

## Brand & Positioning Strategy

### Core Positioning

**Wrong** (product-level, Sprive-style):
> ❌ "We help you pay student loans."

**Right** (category-level, unique):
> ✅ "We turn your skills into financial progress."

### Psychological Hook

| Competitor | Hook | Feeling |
|------------|------|---------|
| Sprive | "I'm beating the system" | Outsmarting the bank |
| **EduPay** | "I'm ahead of my future self" | Winning against time |

"Ahead of my future self" is more addictive because:
- No ceiling (always more to achieve)
- Compounding narrative (each session adds to story)
- Identity-forming (progress, not debt avoidance)
- Shareable ("I'm 2 years ahead" beats "I saved £50")

### Messaging Framework

| Audience | Message | CTA |
|----------|---------|-----|
| Students | "Your degree is earning before you graduate" | Start tutoring |
| Graduates | "Every session gets you closer to debt-free" | Track progress |
| Tutors | "Your knowledge pays twice" | Convert EP |
| Employers | "Help your graduates thrive" | Partner with us |
| Universities | "Graduate outcomes, reimagined" | Embed EduPay |

### Tagline Options

- "Your skills. Your progress."
- "Earn your freedom."
- "Skills become savings."
- "From learning to earning to freedom."

---

## Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| TrueLayer integration delays | Medium | High | Stub mode enables development |
| Payment failures | Low | High | Comprehensive error handling |
| Scalability issues | Low | Medium | Cloud-native architecture |

### Market Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Competitor enters market | Medium | High | First-mover advantage, rapid iteration |
| Government changes loan rules | Medium | Medium | Adaptable projection engine |
| Low user adoption | Medium | High | Embedded in Tutorwise earning flow |

### Regulatory Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| FCA registration required | Low | Medium | Operate within payment exemptions |
| US state licensing | High | Medium | Legal counsel, phased state rollout |

---

## Success Metrics

### Phase 4-5 (Go Live)

- [ ] 100 users complete conversion
- [ ] £10,000 total EP converted to GBP
- [ ] Zero payment failures in production
- [ ] 4.5+ average user satisfaction score

### Phase 6-7 (Growth)

- [ ] 1,000 users with linked cashback card
- [ ] £100,000 cashback generated for users
- [ ] 50% of active users on mobile app
- [ ] 20% week-over-week user growth

### Phase 8 (B2B)

- [ ] 10 employer pilots signed
- [ ] £500k ARR from B2B channel
- [ ] 5,000 employees using EduPay via employer

### Phase 9-10 (International)

- [ ] US waitlist: 10,000 signups
- [ ] US pilot: 1,000 active users
- [ ] Additional market: 1 launch

---

## Key Decisions Needed

### Short-term (Q1 2026)

1. **TrueLayer Onboarding**: Apply now or wait?
2. **Pricing Strategy**: Free forever, freemium, or paid?
3. **Marketing Budget**: Organic only or paid acquisition?

### Medium-term (Q2-Q3 2026)

4. **Cashback Partner**: Tillo vs alternatives?
5. **Mobile Platform**: React Native vs Flutter vs native?
6. **B2B Pilot Targets**: Which companies to approach first?

### Long-term (2027+)

7. **US Entry Mode**: Partner vs build vs acquire?
8. **Funding**: Bootstrap vs raise (if needed for US)?
9. **Team Expansion**: When to hire first dedicated EduPay team member?

---

## Appendix: Competitive Comparison

### vs Sprive (Mortgage)

| Dimension | Sprive | EduPay | Winner |
|-----------|--------|--------|--------|
| Market size | £1.6T | £267B (UK) + $1.77T (US) | EduPay (global) |
| Development cost | £6M+ | £0 | EduPay |
| Time to build | 4 years | 1 day | EduPay |
| Competition | First mover, others entering | None | EduPay |
| Revenue model | Proven (remortgage commission) | TBD | Sprive |
| User engagement | Mortgage lifecycle | Grad → 50s | EduPay (longer) |

### vs US Student Loan Fintechs

| Company | Model | EduPay Advantage |
|---------|-------|------------------|
| Method | B2B API | Consumer app, earning integration |
| Rightfoot | B2B2C API | Direct to consumer, tutoring tie-in |
| FutureFuel | Employer-only | Both consumer + employer |
| Payitoff | Calculator/aggregator | Actual payments + earning |

---

*Last Updated: 2026-02-10*
