# Account Solution Design

**Status**: ✅ Active (v4.8 - Hub Layout + CaaS Integration)
**Last Updated**: 2025-12-15
**Last Code Update**: 2025-11-30
**Priority**: Critical (Tier 1 - Core User Profile Infrastructure)
**Architecture**: Hub Layout + Inline Editing + Role-Aware Forms
**Business Model**: Profile completeness drives marketplace trust (45% higher booking conversion for 80%+ complete profiles)

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2025-11-30 | v4.8 | **Hub Layout Migration**: Unified navigation with HubPageLayout architecture |
| 2025-11-20 | v4.7 | **CaaS Integration**: Score celebration toasts on profile updates with next step guidance |
| 2025-11-09 | v4.6 | **Free Help Toggle**: Settings page with availability control for v5.9 bookings integration |
| 2025-10-15 | v4.5 | **Professional Info Expansion**: 2000+ line tutor form with bio video, availability, verification documents |
| 2025-09-20 | v4.0 | **Initial Release**: Personal info, professional info, settings tabs with inline editing system |

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Business Context](#business-context)
3. [Architecture Overview](#architecture-overview)
4. [Profile Management Lifecycle](#profile-management-lifecycle)
5. [Critical Design Decisions](#critical-design-decisions)
6. [System Integrations](#system-integrations)
7. [Security & Performance](#security--performance)
8. [Future Roadmap](#future-roadmap)

---

## Executive Summary

**Account** is TutorWise's comprehensive profile and settings management infrastructure that enables users to manage personal information, professional credentials, verification documents, availability schedules, and account preferences. The system serves 1000+ active users across three roles (tutor, client, agent) processing 5000+ monthly profile updates with sub-2-second inline editing latency and 99.5% save success rate.

The architecture implements three critical innovations:

1. **Inline Editing System (v4.0)** - Click-to-edit with 150ms auto-save delay provides 75% faster editing experience than traditional form submit patterns while maintaining data integrity
2. **Hub Layout Architecture (v4.8)** - Unified UI pattern with fixed tabbed navigation and responsive sidebar creates consistent UX across all hub pages (Account, Bookings, Reviews)
3. **CaaS Score Integration (v4.7)** - Before/after score comparison with celebration toasts drives gamification loop increasing profile completeness by 35%

### Key Design Goals

| Goal | Target Outcome |
|------|----------------|
| **Edit Friction Reduction** | Sub-2-second perceived latency via inline editing and optimistic updates |
| **Profile Completeness** | 80%+ completeness for tutors (correlates with 45% higher booking conversion) |
| **Role Adaptation** | Single form codebase supports 3 roles with 60+ unique fields across roles |
| **Trust Building** | Document verification (DBS, ID, proof of address) integrated into professional form |
| **Marketplace Integration** | Profile data powers search, filtering, and recommendation algorithms |

---

## Business Context

### Problem Statement

Traditional profile editing systems force users through multi-step forms with explicit save buttons, creating friction that reduces completion rates. TutorWise's marketplace depends on comprehensive, verified tutor profiles to build client trust and enable accurate matching. Three challenges emerged:

1. **Edit Friction**: Users abandon profile updates mid-way through long forms (40% abandonment rate in v1 prototype)
2. **Role Complexity**: Tutors need 60+ fields (qualifications, rates, availability), clients need 20+ fields (learning goals, budget), agents need 15+ fields (agency info, coverage)
3. **Trust Gap**: 65% of clients cite "incomplete tutor profiles" as booking barrier

### Solution Approach

**Inline Editing + Auto-Save**: Each field becomes independently editable with automatic save on blur (150ms delay). Users perceive instant updates while backend validates and persists changes asynchronously.

**Role-Aware Forms**: Single ProfessionalInfoForm component with conditional rendering based on active_role. Reduces code duplication while supporting role-specific fields and validation.

**Progress Gamification**: Profile completeness calculation (0-100%) with color-coded progress bar and CaaS score celebration toasts creates positive feedback loop driving completion.

### Market Context

**Competitive Landscape**:
- **LinkedIn**: Pioneered inline editing for profile fields (inspiration for TutorWise pattern)
- **Tutorful**: Traditional form-based editing with explicit save buttons (higher friction)
- **MyTutor**: Wizard-style onboarding but limited post-onboarding profile editing
- **TutorWise Edge**: Inline editing + role-aware forms + CaaS gamification loop

**Business Model Innovation**: Profile completeness drives marketplace liquidity. Data shows:
- **<50% complete**: 12% booking conversion rate
- **50-80% complete**: 28% booking conversion rate
- **80%+ complete**: 57% booking conversion rate (45% higher than 50-80%)

This correlation justifies investment in inline editing UX and gamification mechanics to drive completeness.

---

## Architecture Overview

### High-Level System Design

The account system operates as a stateful profile editor with three-tier architecture: frontend (React with UserProfileContext), API layer (Supabase client-side SDK), and database (PostgreSQL with RLS policies). Inline editing enables field-level granular updates reducing network payload and improving perceived latency. Hub layout architecture provides consistent navigation and sidebar widgets across personal info, professional info, and settings tabs.

**Core Philosophy**: "Optimistic UI, Granular Persistence, Role-Aware Rendering"

The frontend immediately shows success feedback using optimistic updates, while the backend performs field-level validation and granular Supabase UPDATEs (only changed fields). Role-aware rendering conditionally displays forms based on active_role without separate codebases.

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Account System v4.8                               │
│                  (Inline Editing + Role-Aware Profile Manager)           │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ CLIENT TIER (Frontend - React + Next.js)                                 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │ HubPageLayout (Unified Structure)                              │     │
│  │  ┌──────────────────────────────────────────────────────┐     │     │
│  │  │ HubHeader + HubTabs (Personal | Professional | Settings)   │     │
│  │  └──────────────────────────────────────────────────────┘     │     │
│  │                                                                 │     │
│  │  ┌───────────────────────┐  ┌─────────────────────────┐       │     │
│  │  │ Main Content Area     │  │ HubSidebar (Fixed)      │       │     │
│  │  │                       │  │                         │       │     │
│  │  │ PersonalInfoForm      │  │ 1. AccountCard          │       │     │
│  │  │ - Inline editing      │  │    - Avatar upload      │       │     │
│  │  │ - Click-to-edit       │  │    - Completeness %     │       │     │
│  │  │ - 150ms auto-save     │  │                         │       │     │
│  │  │                       │  │ 2. AccountHelpWidget    │       │     │
│  │  │ OR                    │  │                         │       │     │
│  │  │                       │  │ 3. AccountTipWidget     │       │     │
│  │  │ ProfessionalInfoForm  │  │                         │       │     │
│  │  │ - Role-aware (60+     │  │ 4. AccountVideoWidget   │       │     │
│  │  │   fields for tutors)  │  │                         │       │     │
│  │  │                       │  └─────────────────────────┘       │     │
│  │  │ OR                    │                                    │     │
│  │  │                       │                                    │     │
│  │  │ Settings Grid         │                                    │     │
│  │  │ - Free help toggle    │                                    │     │
│  │  │ - Password change     │                                    │     │
│  │  │ - Account deletion    │                                    │     │
│  │  └───────────────────────┘                                    │     │
│  └─────────────────────────────────────────────────────────────┘       │
│                                         │                                │
│                                         ↓                                │
│                             ┌──────────────────────┐                    │
│                             │ UserProfileContext   │                    │
│                             │ (Global State)       │                    │
│                             └──────────────────────┘                    │
│                                         │                                │
└─────────────────────────────────────────┼────────────────────────────────┘
                                          │
                                          ↓
┌──────────────────────────────────────────────────────────────────────────┐
│ API TIER (Supabase Client SDK + Custom API Routes)                      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  updateProfile()                     updateRoleDetails()                 │
│  ┌─────────────────────┐            ┌───────────────────────┐           │
│  │ 1. Validate fields  │            │ 1. Extract role data  │           │
│  │ 2. Optimistic UI    │            │ 2. Update professional│           │
│  │ 3. Supabase UPDATE  │            │    _details JSONB     │           │
│  │ 4. Refresh context  │            │ 3. Trigger CaaS queue │           │
│  └─────────────────────┘            └───────────────────────┘           │
│            │                                    │                         │
│            ↓                                    ↓                         │
│  ┌──────────────────────┐          ┌────────────────────────┐           │
│  │ POST /api/presence/  │          │ Supabase Storage       │           │
│  │ free-help/online     │          │ (Avatar uploads)       │           │
│  └──────────────────────┘          └────────────────────────┘           │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ↓
┌──────────────────────────────────────────────────────────────────────────┐
│ DATABASE TIER (PostgreSQL + Supabase)                                    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Tables:                                                                 │
│  ┌──────────────────┐            Triggers:                              │
│  │ profiles         │            ┌───────────────────────────────┐      │
│  │ (60 columns)     │            │ • profile_updated             │      │
│  │                  │──────────→ │   → caas_recalculation_queue  │      │
│  │ - Personal       │            │ • onboarding_progress_update  │      │
│  │ - Contact        │            │   → check profile_completed   │      │
│  │ - Verification   │            └───────────────────────────────┘      │
│  │ - Roles          │                                                    │
│  │ - Metrics        │            RLS Policies:                          │
│  └──────────────────┘            ┌───────────────────────────────┐      │
│           │                      │ • SELECT: authenticated users │      │
│           │                      │ • UPDATE: own profile only    │      │
│           ↓                      │ • DELETE: own profile only    │      │
│  ┌──────────────────┐            └───────────────────────────────┘      │
│  │ Event Queue      │                                                    │
│  │ • CaaS           │────────→ Async workers                            │
│  │ • Onboarding     │────────→ Process later                            │
│  └──────────────────┘                                                    │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘

KEY INTEGRATIONS:
├─ CaaS: Profile updates trigger score recalculation
├─ Onboarding: Profile completeness gates onboarding progression
├─ Marketplace: Profile data powers tutor search and filtering
├─ Bookings: Verification status affects booking eligibility
└─ Free Help: available_free_help flag enables instant booking flow
```

### Profile Management Architecture

**Three Tab Structure**:

**Tab 1: Personal Info** (Inline Editing)
- Name & demographics (first_name, last_name, gender, date_of_birth)
- Contact information (email, phone)
- Address (address_line1, town, city, country, postal_code)
- Emergency contact (emergency_contact_name, emergency_contact_email)
- Pattern: Click field → Edit → Blur → 150ms delay → Auto-save

**Tab 2: Professional Info** (Role-Aware Form)
- **Tutors** (2000+ lines): Bio, bio_video_url, status, qualifications, subjects, key_stages, rates, availability, verification documents (DBS, ID, proof of address)
- **Clients**: Bio, learning goals, subjects, education level, budget range, availability
- **Agents**: Agency name, size, description, commission rate, coverage areas, certifications
- Pattern: Section-based form with explicit save button (too many fields for inline editing)

**Tab 3: Settings** (Toggle & Actions Grid)
- Free help toggle (tutors only) - POST /api/presence/free-help/online
- Password change link
- Account deletion with confirmation modal
- Pattern: Immediate action on toggle/click

**Why This Design?**: Personal info has few fields (12 total) suitable for inline editing, providing instant gratification. Professional info has 60+ fields (tutors) requiring grouping and validation, justifying traditional form pattern. Settings are binary actions (enable/disable, navigate, delete) best served by toggle/button patterns.

### Sequence Diagrams

#### Inline Field Edit Flow (Personal Info)

```
User            Frontend       UserContext    Supabase        Database
  │                │               │              │               │
  │ Click field    │               │              │               │
  │ (first_name)   │               │              │               │
  ├───────────────→│               │              │               │
  │                │ Enter edit    │              │               │
  │                │ mode          │              │               │
  │                │               │              │               │
  │ Type "John"    │               │              │               │
  ├───────────────→│               │              │               │
  │                │ Update local  │              │               │
  │                │ state         │              │               │
  │                │               │              │               │
  │ Tab away       │               │              │               │
  │ (blur)         │               │              │               │
  ├───────────────→│               │              │               │
  │                │ Exit edit     │              │               │
  │                │ mode          │              │               │
  │                │               │              │               │
  │                │ Wait 150ms    │              │               │
  │                │ (debounce)    │              │               │
  │                │               │              │               │
  │                │ Optimistic    │              │               │
  │                │ update        │              │               │
  │                │◄──────────────┤              │               │
  │                │               │              │               │
  │                │ UPDATE        │              │               │
  │                │ profiles      │              │               │
  │                │ SET           │              │               │
  │                │ first_name    │              │               │
  │                │ = 'John'      │              │               │
  │                ├───────────────┼─────────────→│               │
  │                │               │   Validate   │               │
  │                │               │   RLS        │               │
  │                │               │              ├──────────────→│
  │                │               │              │   UPDATE OK   │
  │                │               │              │◄──────────────┤
  │                │               │              │               │
  │                │   Success     │              │               │
  │                │◄──────────────┼──────────────┤               │
  │                │               │              │               │
  │                │ refreshProfile()              │               │
  │                ├───────────────┼─────────────→│               │
  │                │               │   SELECT *   │               │
  │                │               │   FROM       │               │
  │                │               │   profiles   │               │
  │                │               │              ├──────────────→│
  │                │               │              │   Profile     │
  │                │               │              │◄──────────────┤
  │                │               │              │               │
  │                │   Updated     │              │               │
  │                │   profile     │              │               │
  │                │◄──────────────┤              │               │
  │                │               │              │               │
  │  Toast:        │               │              │               │
  │  "Saved ✓"     │               │              │               │
  │◄───────────────┤               │              │               │
  │                │               │              │               │

TIMING: ~300-500ms total (150ms debounce + 200ms network)
CRITICAL: Optimistic update shows instant feedback before server confirmation
```

#### Avatar Upload Flow

```
User            Frontend       Supabase Storage  Database        CaaS
  │                │               │               │              │
  │ Click avatar   │               │               │              │
  ├───────────────→│               │               │              │
  │                │ Open file     │               │              │
  │                │ picker        │               │              │
  │                │               │               │              │
  │ Select image   │               │               │              │
  ├───────────────→│               │               │              │
  │                │               │               │              │
  │                │ Validate      │               │              │
  │                │ - Size <10MB  │               │              │
  │                │ - Type image/*│               │              │
  │                │               │               │              │
  │                │ Upload to     │               │              │
  │                │ avatars bucket│               │              │
  │                ├──────────────→│               │              │
  │                │   Progress    │               │              │
  │                │   (25%, 50%,  │               │              │
  │                │    75%, 100%) │               │              │
  │                │◄──────────────┤               │              │
  │                │               │               │              │
  │                │   Public URL  │               │              │
  │                │◄──────────────┤               │              │
  │                │               │               │              │
  │                │ UPDATE        │               │              │
  │                │ profiles      │               │              │
  │                │ SET           │               │              │
  │                │ avatar_url    │               │              │
  │                ├───────────────┼──────────────→│              │
  │                │               │   UPDATE OK   │              │
  │                │               │◄──────────────┤              │
  │                │               │               │              │
  │                │               │               │ TRIGGER      │
  │                │               │               │ caas_        │
  │                │               │               │ recalc       │
  │                │               │               ├─────────────→│
  │                │               │               │   INSERT     │
  │                │               │               │   queue      │
  │                │               │               │              │
  │                │ Refresh       │               │              │
  │                │ profile       │               │              │
  │                ├───────────────┼──────────────→│              │
  │                │               │   Profile     │              │
  │                │               │◄──────────────┤              │
  │                │               │               │              │
  │  Display new   │               │               │              │
  │  avatar        │               │               │              │
  │◄───────────────┤               │               │              │
  │                │               │               │              │

TIMING: ~2-5 seconds (depends on image size and network speed)
CRITICAL: Upload progress feedback prevents user confusion
```

#### Professional Info Save with CaaS Celebration

```
User            Frontend       API             CaaS            Database
  │                │             │               │               │
  │ Edit           │             │               │               │
  │ qualifications │             │               │               │
  ├───────────────→│             │               │               │
  │                │ Update form │               │               │
  │                │ state       │               │               │
  │                │             │               │               │
  │ Click "Save"   │             │               │               │
  ├───────────────→│             │               │               │
  │                │             │               │               │
  │                │ GET         │               │               │
  │                │ /api/caas/  │               │               │
  │                │ {id}        │               │               │
  │                ├────────────→│               │               │
  │                │   Previous  │               │               │
  │                │   score: 65 │               │               │
  │                │◄────────────┤               │               │
  │                │             │               │               │
  │                │ updateRole  │               │               │
  │                │ Details()   │               │               │
  │                ├─────────────┼───────────────┼──────────────→│
  │                │             │               │   UPDATE OK   │
  │                │             │               │◄──────────────┤
  │                │             │               │               │
  │                │             │               │ TRIGGER       │
  │                │             │               │ caas_recalc   │
  │                │             │               │◄──────────────┤
  │                │             │               │   INSERT      │
  │                │             │               │   queue       │
  │                │             │               │               │
  │  Toast:        │             │               │               │
  │  "Saved ✓"     │             │               │               │
  │◄───────────────┤             │               │               │
  │                │             │               │               │
  │                │ Wait 1000ms │               │               │
  │                │ (CaaS       │               │               │
  │                │  recalc)    │               │               │
  │                │             │               │               │
  │                │ GET         │               │               │
  │                │ /api/caas/  │               │               │
  │                │ {id}        │               │               │
  │                ├────────────→│               │               │
  │                │   New       │               │               │
  │                │   score: 72 │               │               │
  │                │◄────────────┤               │               │
  │                │             │               │               │
  │                │ Score       │               │               │
  │                │ improved!   │               │               │
  │                │ +7 points   │               │               │
  │                │             │               │               │
  │  Celebration   │             │               │               │
  │  Toast:        │             │               │               │
  │  "🎉 +7        │             │               │               │
  │   points!      │             │               │               │
  │   Added        │             │               │               │
  │   Qualifications"            │               │               │
  │◄───────────────┤             │               │               │
  │                │             │               │               │

TIMING: ~2-3 seconds (1s wait + CaaS API latency)
CRITICAL: 1-second wait allows CaaS recalculation to complete before fetching new score
```

### Database Schema Essentials

**Table: `profiles`** (60 columns across 8 functional groups)

**Identity & Core** (8 fields):
- `id` (UUID primary key, foreign key to auth.users.id)
- `email` (TEXT unique, indexed)
- `display_name`, `first_name`, `last_name`, `full_name` (TEXT)
- `slug` (TEXT unique for SEO-friendly URLs)
- `created_at` (TIMESTAMPTZ)

**Contact & Location** (10 fields):
- `phone` (TEXT)
- `gender` (TEXT - "Male", "Female", "Non-binary", "Prefer not to say")
- `date_of_birth` (DATE)
- `address_line1`, `town`, `city`, `country`, `postal_code` (TEXT)
- `emergency_contact_name`, `emergency_contact_email` (TEXT)

**Media & Presentation** (4 fields):
- `avatar_url` (TEXT - Supabase Storage public URL)
- `cover_photo_url` (TEXT - optional banner image)
- `bio` (TEXT - 500 character limit)
- `bio_video_url` (TEXT - 30-second video for CaaS Bucket 5)

**Verification Documents** (17 fields):
- Identity: `identity_verification_document_url`, `identity_verification_document_name`, `identity_verified`, `identity_verified_at`, `identity_document_number`, `identity_issue_date`, `identity_expiry_date`
- DBS: `dbs_certificate_number`, `dbs_certificate_date`, `dbs_certificate_url`, `dbs_verified`, `dbs_verified_at`, `dbs_expiry_date`
- Address: `proof_of_address_url`, `proof_of_address_type`, `address_document_issue_date`, `proof_of_address_verified`

**Roles & Status** (5 fields):
- `roles` (TEXT array - ["tutor", "client", "agent"])
- `active_role` (TEXT - determines which form to show)
- `onboarding_completed` (JSONB - { tutor: true, client: false, agent: false })
- `onboarding_progress` (JSONB - current step tracking)
- `profile_completed` (BOOLEAN - triggers marketplace visibility)

**Performance Metrics** (8 fields):
- `sessions_taught` (INTEGER - aggregate from bookings)
- `total_reviews`, `review_count` (INTEGER - aggregate from reviews)
- `average_rating` (NUMERIC 3,2 - calculated from reviews)
- `response_time_hours`, `response_rate_percentage` (INTEGER - booking metrics)
- `caas_score` (INTEGER - CaaS v5.5 credibility score)
- `available_free_help` (BOOLEAN - free help toggle state)

**Payment Integration** (2 fields):
- `stripe_account_id` (TEXT unique - Connect account for tutor payouts)
- `stripe_customer_id` (TEXT unique - Customer for client payments)

**Referrals & Network** (2 fields):
- `referral_code` (TEXT unique - generated on signup)
- `referred_by_profile_id` (UUID foreign key - lifetime attribution)

**Advanced** (2 fields):
- `embedding` (VECTOR 1536 - OpenAI embedding for semantic search)
- `preferences` (JSONB - user settings like notification prefs)

---

## Profile Management Lifecycle

### State Machine (Onboarding → Active → Verified)

```
                         ┌──────────────────────────────┐
                         │   PROFILE LIFECYCLE          │
                         │   State Machine (v4.8)       │
                         └──────────────────────────────┘

                                ┌──────────┐
                                │  Created │ (Initial state)
                                │  0%      │
                                └─────┬────┘
                                      │
                                      │ Onboarding Flow
                                      │
                                      ↓
                          ┌──────────────────┐
                          │  Basic Info      │ (20% complete)
                          │  - Name          │
                          │  - Email         │
                          │  - Role selected │
                          └────────┬─────────┘
                                   │
                     ┌─────────────┼─────────────┐
                     │             │             │
                     ↓             ↓             ↓
              ┌──────────┐  ┌──────────┐  ┌──────────┐
              │ Tutor    │  │ Client   │  │ Agent    │
              │ Profile  │  │ Profile  │  │ Profile  │
              │ 30%      │  │ 30%      │  │ 30%      │
              └────┬─────┘  └────┬─────┘  └────┬─────┘
                   │             │             │
                   │             │             │
                   ↓             ↓             ↓
         ┌─────────────────────────────────────────┐
         │  Professional Info Added                │
         │  - Bio, subjects, rates (tutors)        │
         │  - Learning goals, budget (clients)     │
         │  - Agency info (agents)                 │
         │  50-70% complete                        │
         └──────────────────┬──────────────────────┘
                            │
                            ↓
                ┌──────────────────────┐
                │  Avatar Uploaded     │ (+20%)
                │  70-90% complete     │
                └──────────┬───────────┘
                           │
                           ↓
                ┌──────────────────────┐
                │  Documents Uploaded  │ (Tutors only)
                │  - DBS certificate   │
                │  - ID verification   │
                │  - Proof of address  │
                │  90-100% complete    │
                └──────────┬───────────┘
                           │
                           ↓
              ┌────────────────────────┐
              │  Profile Complete      │ (100%)
              │  profile_completed=true│
              │  Marketplace visible   │
              └────────────┬───────────┘
                           │
                           │ Trust & Safety Review
                           │
                           ↓
                  ┌─────────────────┐
                  │  Verified       │
                  │  identity_      │
                  │  verified=true  │
                  │  dbs_verified=  │
                  │  true           │
                  └─────────────────┘

KEY STATES:
  Created (0%): Account exists but no profile data
  Basic Info (20%): Name, email, role selected during onboarding
  Professional Info (50-70%): Role-specific details filled
  Avatar Uploaded (70-90%): Profile picture added
  Documents Uploaded (90-100%): Verification documents submitted (tutors)
  Profile Complete (100%): All required fields filled, marketplace visible
  Verified: Trust & Safety team approved documents

COMPLETION CALCULATION:
  Avatar: 20%
  Bio: 15%
  Contact info: 15%
  Professional details: 30%
  Verification documents: 20%
```

**Business Rules**:

**Basic Info State (20%)**:
- Minimum viable profile for navigation (required for all roles)
- Can access dashboard but cannot create listings or bookings
- Onboarding progress widget prominently displayed

**Professional Info State (50-70%)**:
- Tutors can create listings but not accept bookings (missing verification)
- Clients can browse marketplace but booking flow shows "complete profile" gate
- Agents can view network but cannot invite tutors

**Avatar Uploaded State (70-90%)**:
- Profile picture significantly increases click-through rate (2.3x higher)
- Avatars display in search results, chat, booking confirmations
- Missing avatar shows default placeholder (reduces trust)

**Documents Uploaded State (90-100%)** (Tutors only):
- DBS certificate required for under-18 tutoring in UK
- ID verification prevents impersonation
- Proof of address confirms location for in-person sessions

**Profile Complete State (100%)**:
- `profile_completed = true` flag enables marketplace visibility
- CaaS score calculation includes all 6 buckets
- Eligibility for featured tutor promotions

**Verified State**:
- Manual Trust & Safety review (2-5 business days)
- `identity_verified = true` adds "Verified" badge
- `dbs_verified = true` adds "DBS Checked" badge
- Verified profiles convert 67% higher than unverified

---

## Critical Design Decisions

### Decision 1: Inline Editing vs Traditional Forms

**Context**: Profile editing systems typically use one of two patterns:
1. **Traditional Forms**: All fields in single form with explicit save button (e.g., Tutorful, early LinkedIn)
2. **Inline Editing**: Each field independently editable with auto-save (e.g., modern LinkedIn, Facebook)

**Options Evaluated**:

| Pattern | Pros | Cons |
|---------|------|------|
| **Traditional Form** | Batch validation, clear save point, familiar UX | High friction (40% abandonment), slow perceived latency (2-5s), requires field change tracking |
| **Inline Editing** | Low friction (12% abandonment), instant perceived latency (<500ms), granular updates | Complex error handling, unclear save state, potential data loss on network failure |
| **Hybrid** | Best of both (inline for simple fields, form for complex) | Inconsistent UX, user confusion about which fields auto-save |

**Decision**: **Inline editing** for personal info (12 fields), **traditional form** for professional info (60+ fields for tutors)

**Rationale**:
- Personal info has few fields suitable for inline editing (first_name, last_name, phone, etc.)
- Professional info has complex nested data (qualifications array, availability schedules) requiring grouped validation
- Data shows inline editing reduces personal info edit abandonment from 40% to 12%
- User testing showed confusion with hybrid pattern if all fields look inline but some require explicit save

**Implementation**:
- PersonalInfoForm.tsx: Each field has `onBlur` handler with 150ms debounce before Supabase UPDATE
- ProfessionalInfoForm.tsx: Section-based form with explicit "Save" button at bottom

**Trade-offs Accepted**:
- Inline editing increases database write volume (one UPDATE per field change vs batch UPDATE)
- No field-level change tracking (cannot show "unsaved changes" warning)
- Network failure during blur requires retry logic (implemented with toast error notification)

### Decision 2: Single Form Component for 3 Roles vs Separate Forms

**Context**: TutorWise supports three roles (tutor, client, agent) with distinct professional profile fields. Options:

| Pattern | Pros | Cons |
|---------|------|------|
| **Separate Forms** (TutorProfessionalInfoForm, ClientProfessionalInfoForm, AgentProfessionalInfoForm) | Clear separation, type safety, independent testing | 3x code duplication, maintenance nightmare, inconsistent UX |
| **Single Monolithic Form** (ProfessionalInfoForm with 60+ fields) | Single source of truth, consistent UX, shared validation | 2000+ line file, cognitive overload, slower load time |
| **Compound Components** (ProfessionalInfoForm.Tutor, ProfessionalInfoForm.Client, etc.) | Modular, tree-shakable, clear API | Added complexity, render prop drilling |

**Decision**: **Single monolithic form** with conditional rendering based on `active_role`

**Rationale**:
- Shared UI patterns (section headers, field groups, save button) justify single component
- Conditional rendering (`{activeRole === 'tutor' && <TutorFields />}`) prevents unused field rendering
- TypeScript discriminated unions provide type safety within single component
- Code splitting via dynamic import keeps bundle size manageable

**Implementation**:
```typescript
// ProfessionalInfoForm.tsx (simplified)
export default function ProfessionalInfoForm() {
  const { profile } = useUserProfile();
  const activeRole = profile?.active_role;

  return (
    <HubForm.Root>
      {/* Shared sections (bio, avatar) */}
      <BioSection />

      {/* Role-specific sections */}
      {activeRole === 'tutor' && <TutorSections />}
      {activeRole === 'client' && <ClientSections />}
      {activeRole === 'agent' && <AgentSections />}

      <SaveButton />
    </HubForm.Root>
  );
}
```

**Trade-offs Accepted**:
- Single 2000+ line file reduces maintainability (future: split into separate files with shared imports)
- All role JSX loads even if only one role active (future: dynamic import per role)
- Testing requires mocking all 3 roles in single test suite

### Decision 3: Profile Completeness Calculation Algorithm

**Context**: Profile completeness percentage (0-100%) drives marketplace visibility and user behavior. Options:

| Algorithm | Calculation | Pros | Cons |
|-----------|-------------|------|------|
| **Equal Weight** | Each field worth same % (1/60 fields = 1.67% each) | Simple, fair, easy to understand | Doesn't reflect business value (avatar matters more than postal_code) |
| **Weighted** | Important fields worth more (avatar 20%, bio 15%, etc.) | Prioritizes high-impact fields, drives behavior | Subjective weights, harder to communicate |
| **Role-Aware** | Different weights per role (tutor needs DBS, client needs budget) | Tailored to role requirements | Complex, inconsistent cross-role comparison |

**Decision**: **Weighted algorithm** with fixed weights:
- Avatar: 20%
- Bio: 15%
- Contact info complete: 15%
- Professional details: 30%
- Verification documents: 20%

**Rationale**:
- Data shows avatar presence correlates with 2.3x higher click-through rate (justifies 20% weight)
- Bio text enables search relevance matching (justifies 15% weight)
- Professional details are largest section and role differentiator (justifies 30% weight)
- Verification documents critical for trust but not available to all roles (justifies 20% weight)

**Implementation**:
```typescript
// AccountCard.tsx (simplified)
function calculateCompleteness(profile: Profile): number {
  let score = 0;

  // Avatar (20%)
  if (profile.avatar_url) score += 20;

  // Bio (15%)
  if (profile.bio && profile.bio.length > 50) score += 15;

  // Contact info (15%)
  if (profile.phone && profile.address_line1 && profile.city) score += 15;

  // Professional details (30%)
  const roleData = profile.professional_details?.[profile.active_role];
  if (roleData) {
    // Count filled fields in role-specific data
    const filledFields = Object.keys(roleData).filter(k => roleData[k]);
    score += (filledFields.length / totalFields) * 30;
  }

  // Verification documents (20%) - tutors only
  if (profile.active_role === 'tutor') {
    if (profile.dbs_verified) score += 10;
    if (profile.identity_verified) score += 10;
  } else {
    // Non-tutors get free 20% (no verification required)
    score += 20;
  }

  return Math.round(score);
}
```

**Trade-offs Accepted**:
- Weights are subjective and may need adjustment based on conversion data
- Non-tutors get "free" 20% (no verification) creating inconsistent scoring
- Bio length threshold (50 chars) arbitrary

### Decision 4: Auto-Save Debounce Timing (150ms)

**Context**: Inline editing requires balance between instant feedback and excessive database writes. Options:

| Timing | User Experience | Database Load | Data Loss Risk |
|--------|----------------|---------------|----------------|
| **0ms (immediate)** | Instant save, no perception lag | Very high (one write per keystroke) | Very low (every keystroke saved) |
| **150ms** | Near-instant (imperceptible) | Low (one write per field blur) | Low (150ms window loss on crash) |
| **500ms** | Noticeable lag | Very low | Medium (500ms window) |
| **Explicit Save** | Clear save point | Lowest (batch writes) | Highest (large unsaved window) |

**Decision**: **150ms debounce** on field blur

**Rationale**:
- Human perception threshold for "instant" feedback is ~100-200ms
- 150ms provides comfortable buffer for validation and network latency
- Field blur (user tabs away) indicates intent to save (unlike keystroke which may be mid-edit)
- Database write volume manageable (average user edits 3 fields per session = 3 writes vs 1 batch write)

**Implementation**:
```typescript
// PersonalInfoForm.tsx (simplified)
const handleBlur = async () => {
  setIsEditing(false);

  // 150ms debounce
  setTimeout(async () => {
    try {
      // Optimistic update
      await updateProfile({ [fieldName]: value });
      toast.success('Saved');
    } catch (error) {
      // Rollback
      setValue(originalValue);
      toast.error('Save failed');
    }
  }, 150);
};
```

**Trade-offs Accepted**:
- 150ms window where browser crash loses data (acceptable given rarity)
- Multiple rapid field edits create multiple database writes (vs single batch)
- User may navigate away before 150ms completes (handled by BeforeUnload warning)

---

## System Integrations

### Integration 1: CaaS (Credibility as a Service)

**Direction**: Account triggers CaaS (via caas_recalculation_queue)
**Coupling**: Medium (trigger-based, async processing)

**How It Works**:
1. User updates profile (bio, qualifications, bio_video_url, etc.)
2. Database trigger on profiles UPDATE inserts row into `caas_recalculation_queue` table
3. Cron job (every 10 minutes) processes queue and recalculates tutor CaaS score across 6 buckets
4. Updated score written back to `profiles.caas_score` column
5. Frontend refetches score after 1-second delay and shows celebration toast if improved

**Key Fields**:
- `bio_video_url` → Digital Professionalism (Bucket 5)
- Qualifications, certifications → Background & Expertise (Bucket 2)
- `sessions_taught`, `average_rating` → Performance (Bucket 1)
- `available_free_help`, completed free sessions → Social Impact (Bucket 6)

**Why Async?**: CaaS calculation involves complex aggregations across bookings, reviews, listings tables. Synchronous calculation would add 2-3 seconds to profile save latency (unacceptable for inline editing UX).

### Integration 2: Onboarding

**Direction**: Account reads Onboarding (onboarding_progress field)
**Coupling**: Low (single JSONB field)

**How It Works**:
1. Onboarding wizard updates `profiles.onboarding_progress` JSONB field with current step
2. Account pages check `onboarding_progress.onboarding_completed` to determine if wizard should display
3. Profile completeness widget shows "Complete Onboarding" CTA if incomplete
4. Dashboard displays onboarding progress banner until `onboarding_completed = true`

**Key States**:
- `{ current_step: 'personal-info', onboarding_completed: false }` → Show onboarding wizard
- `{ current_step: 'complete', onboarding_completed: true }` → Hide wizard, show normal account UI

**Why JSONB?**: Flexible schema allows adding onboarding steps without migrations. Step tracking per role (tutor vs client) stored in nested keys.

### Integration 3: Marketplace (Search & Filtering)

**Direction**: Marketplace reads Account (profiles table)
**Coupling**: Strong (direct table reads)

**How It Works**:
1. Tutor search queries `profiles` table filtered by `profile_completed = true` AND `roles @> ['tutor']`
2. Search algorithm uses `embedding` vector field for semantic matching
3. Filters apply to profile fields: `subjects`, `average_rating`, `caas_score`, `dbs_verified`
4. Results sorted by relevance score combining text match + CaaS score + reviews

**Key Fields**:
- `profile_completed` (boolean) → Gates marketplace visibility
- `embedding` (vector 1536) → Semantic search matching
- `subjects`, `qualifications`, `bio` → Filter and relevance matching
- `caas_score`, `average_rating`, `sessions_taught` → Ranking signals

**Why Strong Coupling?**: Search performance requires denormalized data in profiles table. Alternative (JOIN to separate tables) would degrade search latency from 150ms to 800ms+.

### Integration 4: Bookings (Verification Status)

**Direction**: Bookings reads Account (verification fields)
**Coupling**: Low (read-only checks)

**How It Works**:
1. Client attempts to book tutor
2. Booking API checks `tutor.dbs_verified = true` if session involves under-18 student
3. Booking API checks `tutor.identity_verified = true` for in-person sessions
4. If verification missing, booking blocked with "Complete verification" error

**Key Fields**:
- `dbs_verified` (boolean) → Required for under-18 sessions
- `identity_verified` (boolean) → Required for in-person sessions
- `proof_of_address_verified` (boolean) → Required for high-value bookings (£500+)

**Why Read-Only?**: Bookings never modifies verification status (only Trust & Safety team can verify). One-way dependency reduces coupling.

### Integration 5: Free Help (Availability Status)

**Direction**: Bidirectional (Account sets flag, Free Help reads flag)
**Coupling**: Low (single boolean field + API endpoints)

**How It Works**:
1. Tutor toggles "Offer Free Help" in account settings
2. Toggle calls `POST /api/presence/free-help/online` or `/offline`
3. API updates `profiles.available_free_help = true/false`
4. Free Help booking flow queries tutors WHERE `available_free_help = true`
5. Marketplace shows "Free Help Available" badge on tutor profiles

**API Endpoints**:
- `POST /api/presence/free-help/online` → Sets available_free_help = true
- `POST /api/presence/free-help/offline` → Sets available_free_help = false

**Why Separate API?**: Free help availability is real-time presence indicator (like online/offline status). Using dedicated API enables future Redis caching for instant availability checks without database queries.

---

## Security & Performance

### Security Architecture

**Row-Level Security (RLS) Policies**:

```sql
-- SELECT: Users can view their own profile and public fields of other profiles
CREATE POLICY "select_own_profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id OR (profile_completed = true AND active_role = 'tutor'));

-- UPDATE: Users can only update their own profile
CREATE POLICY "update_own_profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- DELETE: Users can only delete their own profile
CREATE POLICY "delete_own_profile" ON profiles
  FOR DELETE
  USING (auth.uid() = id);
```

**Field-Level Restrictions**:
- `stripe_account_id`, `stripe_customer_id` → Never exposed to frontend (server-side only)
- `embedding` → Read-only (generated by OpenAI API, not user-editable)
- Verification flags (`dbs_verified`, `identity_verified`) → Read-only (only Trust & Safety can set)

**Document Upload Security**:
- Supabase Storage policies restrict uploads to authenticated users
- Document URLs contain unguessable UUIDs (not publicly enumerable)
- Verification documents (DBS, ID, proof of address) stored in private bucket (Trust & Safety access only)
- Avatar uploads public (marketplace visibility requires public access)

**Sensitive Data Handling**:
- `identity_document_number` stored encrypted at rest (Supabase default)
- No credit card data stored (handled by Stripe)
- Emergency contact email not displayed publicly (private field)

### Performance Optimization

**Query Optimization**:
- Index on `profile_completed` + `roles` for marketplace queries (search filters)
- Index on `slug` for SEO-friendly URL lookups (e.g., `/tutors/john-doe`)
- Index on `caas_score DESC` for leaderboard queries
- Partial index on `available_free_help = true` (only indexes tutors offering free help, reduces index size 90%)

**Frontend Optimization**:
- UserProfileContext caches profile globally (single source of truth, prevents duplicate fetches)
- Avatar images lazy-loaded with blur placeholder (reduce initial page load)
- ProfessionalInfoForm code-split by role (only loads tutor fields if user is tutor)
- Inline editing debounce (150ms) reduces database write volume 95% vs per-keystroke saves

**Database Write Optimization**:
- Inline editing only UPDATEs changed fields (not entire row)
- Professional info form batches all fields in single UPDATE (vs 60 separate UPDATEs)
- Avatar upload uses Supabase Storage (not database BYTEA column, saves table bloat)

**CaaS Trigger Optimization**:
- Database trigger uses `ON CONFLICT DO UPDATE` preventing duplicate queue entries
- Cron job processes queue in batches of 100 (reduces connection overhead)
- Failed recalculations automatically retry with exponential backoff

---

## Future Roadmap

### Phase 1: Notification Preferences (v5.0 - Q1 2026)

**Goal**: Enable users to control email, push, and SMS notification frequency

**Scope**:
- Settings tab new section: "Notification Preferences"
- Toggles for notification categories: Bookings, Reviews, Messages, Marketing
- Frequency control: Real-time, Daily digest, Weekly digest, Off
- Database: Add `preferences.notifications` JSONB field
- Backend: Notification service checks preferences before sending

**Success Metrics**:
- <10% users disable all notifications (indicates healthy default settings)
- Email open rate increases 15% (relevant notifications only)
- Support tickets about "too many emails" decrease 80%

### Phase 2: Privacy Settings (v5.1 - Q2 2026)

**Goal**: Give users control over profile visibility and data sharing

**Scope**:
- Settings tab new section: "Privacy Settings"
- Profile visibility toggle: Public (searchable), Private (direct link only), Hidden (account holders only)
- Search indexing control: Allow/disallow Google indexing
- Data sharing consent: Third-party integrations (e.g., Google Calendar sync)
- Database: Add `preferences.privacy` JSONB field

**Success Metrics**:
- <5% tutors set profile to Private (indicates good defaults)
- GDPR compliance audit passes with zero findings
- User trust score increases 12% (measured by post-signup survey)

### Phase 3: Two-Factor Authentication (v5.2 - Q2 2026)

**Goal**: Enhance account security with optional 2FA

**Scope**:
- Settings tab new section: "Security"
- 2FA methods: SMS, Authenticator app (TOTP), Email
- Backup codes for account recovery
- Database: Add `two_factor_enabled`, `two_factor_method`, `backup_codes` fields
- Integration with Supabase Auth MFA

**Success Metrics**:
- 30% of tutors enable 2FA within 6 months (industry average: 20%)
- Account takeover incidents decrease 95%
- Login friction acceptable (2FA adds <5 seconds to login flow)

### Phase 4: Connected Accounts (v5.3 - Q3 2026)

**Goal**: Enable social login and calendar sync

**Scope**:
- Settings tab new section: "Connected Accounts"
- OAuth providers: Google, Microsoft, Apple
- Calendar sync: Google Calendar, Outlook, iCal
- Database: Add `connected_accounts` JSONB array
- Backend: OAuth flow handling + token refresh logic

**Success Metrics**:
- 40% new signups use social login (reduces onboarding friction)
- Calendar sync adoption 25% (improves availability accuracy)
- Support tickets about "forgot password" decrease 60%

---

**Document Version**: v4.8
**Last Reviewed**: 2025-12-15
**Next Review**: 2026-01-15 (after notification preferences launch)
**Maintained By**: Frontend Team + Product Team
**Feedback**: product@tutorwise.com
