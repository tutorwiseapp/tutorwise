# Tutorwise User Journey Map

## Overview
This document maps the complete journey for both **developers** joining the project and **end-users** (Tutors, Students, Agents) using the platform.

---

## 👨‍💻 Developer Journey

### New Developer Onboarding

```
1. INITIAL SETUP (5 minutes)
   └─> Read [.ai/QUICK-START.md]
       ├─ Clone repository
       ├─ Run ./tools/scripts/setup/setup-dev-env.sh
       ├─ Configure minimum .env.local variables
       │   ├─ NEXT_PUBLIC_SUPABASE_URL
       │   ├─ NEXT_PUBLIC_SUPABASE_ANON_KEY
       │   └─ DATABASE_URL
       └─> npm run dev → http://localhost:3000

2. COMPLETE SETUP (2 hours)
   └─> Read [.ai/DEVELOPER-SETUP.md]
       ├─ Install development tools
       │   ├─ VSCode + extensions
       │   ├─ Claude Code CLI
       │   ├─ Vercel CLI
       │   ├─ Supabase CLI
       │   └─ Railway CLI
       ├─ Configure databases
       │   ├─ Supabase (PostgreSQL)
       │   ├─ Neo4j (Graph)
       │   └─ Redis (Cache)
       ├─ Set up cloud services
       │   ├─ Stripe (payments)
       │   ├─ Resend (email)
       │   └─ Ably (real-time)
       └─> Set up AI tools
           ├─ Google Gemini API
           └─ Claude Code authentication

3. UNDERSTAND CODEBASE (1 hour)
   └─> Read core documentation
       ├─ [.ai/3 - SYSTEM-NAVIGATION.md] - Find everything in codebase
       ├─ [.ai/2 - PLATFORM-SPECIFICATION.md] - Architecture
       ├─ [.ai/4 - PATTERNS.md] - Coding patterns
       └─> [.ai/1 - ROADMAP.md] - Product roadmap

4. DAILY DEVELOPMENT WORKFLOW
   └─> Morning routine
       ├─ git pull origin main
       ├─ npm install (if package.json changed)
       ├─ npm run sync:env (if .env.example updated)
       ├─ npm run workflow:check
       └─> npm run dev

   └─> Making changes
       ├─ Create feature branch
       ├─ Make changes and test: npm run workflow:test
       ├─ Before commit: npm run workflow:full
       └─> Commit and push

5. ENVIRONMENT MANAGEMENT
   └─> Keeping .env.local updated
       ├─ New developer: setup-dev-env.sh creates .env.local
       ├─ Existing developer: npm run sync:env
       │   ├─ Finds new variables in .env.example
       │   ├─ Adds them to .env.local
       │   ├─ Preserves existing values
       │   └─> Creates backup
       └─> Never use cp to copy .env files (destructive!)
```

### Developer Resources by Stage

| Stage | Time | Resources |
|-------|------|-----------|
| **Getting Running** | 5 min | [.ai/QUICK-START.md] |
| **Complete Setup** | 2 hours | [.ai/DEVELOPER-SETUP.md] |
| **Daily Workflow** | Ongoing | [docs/development/environment-setup.md] |
| **Find Code** | As needed | [.ai/3 - SYSTEM-NAVIGATION.md] |
| **Understand Architecture** | As needed | [.ai/2 - PLATFORM-SPECIFICATION.md] |
| **Learn Patterns** | As needed | [.ai/4 - PATTERNS.md] |
| **See Roadmap** | As needed | [.ai/1 - ROADMAP.md] |

### Troubleshooting

```
Problem: Port 3000 in use
Solution: kill -9 $(lsof -ti:3000)

Problem: Environment variables not loading
Solution: Restart dev server (Ctrl+C, npm run dev)

Problem: Missing dependencies
Solution: npm run workflow:clean

Problem: Database connection error
Solution: Verify SUPABASE_URL in .env.local

Problem: New variables in .env.example
Solution: npm run sync:env
```

### Useful Commands

```bash
# Development
npm run dev                    # Start dev server
npm run workflow:check         # Quick health check
npm run workflow:full          # Complete validation before commit

# Environment
npm run sync:env               # Sync new env variables

# Deployment
npm run deploy:vercel         # Deploy frontend
npm run deploy:railway        # Deploy backend

# Database
./tools/database/apply-migration.sh <file>

# AI Tools
npm run gemini                # Start Gemini CLI
npm run claude:login          # Authenticate Claude Code
```

---

## Journey Flows by User Role

### 🎓 Tutor/Provider Journey

```
1. SIGNUP & AUTH
   └─> /signup → Create account
   └─> Email verification
   └─> /login → Sign in

2. ONBOARDING
   └─> /onboarding → Select "Tutor" role
   └─> /onboarding/tutor → Multi-step form
       ├─ Role Selection
       ├─ Subject Selection
       ├─ Experience & Qualifications
       ├─ Teaching Methods
       ├─ Availability
       └─ Review & Complete

3. DASHBOARD (First Visit)
   └─> /dashboard → Celebration banner
       ├─ "🎉 Onboarding Complete!"
       ├─ "Ready to start teaching? Create your first listing!"
       └─ Highlighted Cards:
           ├─ ⭐ My Listings (view all)
           ├─ ⭐ Create New Listing (primary CTA)
           ├─ Browse Marketplace (preview)
           ├─ My Profile
           └─ Settings

4. CREATE FIRST LISTING
   └─> /listings/create → Full listing form
       ├─ Basic Info (title, description)
       ├─ Teaching Details (subjects, levels, languages)
       ├─ Specializations & Methods
       ├─ Experience & Qualifications
       ├─ Pricing (hourly rate, packages, free trial)
       ├─ Location & Availability
       ├─ Media (images, video)
       └─ Publish

5. MANAGE LISTINGS
   └─> /listings → View all your listings
       ├─ Status indicators (draft/published/paused)
       ├─ Performance metrics (views, inquiries, bookings)
       ├─ Quick actions (edit, pause, delete)
       └─ Create new listing button

6. VIEW ON MARKETPLACE
   └─> /marketplace → Browse as student would see
   └─> /marketplace/[id] → View listing detail page
       ├─ Your listing presentation
       ├─ How students see your profile
       └─ Book/Message buttons (disabled for own listing)
```

### 📚 Student/Seeker Journey

```
1. SIGNUP & AUTH
   └─> /signup → Create account
   └─> /login → Sign in

2. ONBOARDING
   └─> /onboarding → Select "Student" role
   └─> /onboarding/client → Multi-step form
       ├─ Role Selection
       ├─ Subject Interests
       ├─ Learning Goals
       ├─ Preferred Learning Style
       ├─ Budget & Availability
       └─ Review & Complete

3. DASHBOARD (First Visit)
   └─> /dashboard → Welcome message
       ├─ "Find the perfect tutor to achieve your learning goals!"
       └─ Highlighted Cards:
           ├─ ⭐ Find Tutors (primary CTA)
           ├─ My Bookings
           ├─ My Profile
           └─ Settings

4. BROWSE MARKETPLACE
   └─> /marketplace → Search & filter tutors
       ├─ Subject filters
       ├─ Level filters
       ├─ Location type (online/in-person)
       ├─ Price range
       ├─ Sort by (newest, price, rating)
       └─ Listing cards with quick info

5. VIEW TUTOR DETAILS
   └─> /marketplace/[id] → Full tutor profile
       ├─ About section
       ├─ Subjects & levels taught
       ├─ Specializations
       ├─ Teaching methods
       ├─ Qualifications
       ├─ Experience
       ├─ Pricing & packages
       ├─ Availability
       ├─ Location
       ├─ Reviews & ratings
       └─ CTAs: "Book a Lesson" or "Send Message"

6. BOOKING & MESSAGING
   └─> Book session or send inquiry
   └─> /bookings → Manage upcoming sessions
   └─> /messages → Chat with tutor
```

### 🏠 Agent Journey

```
1. SIGNUP & AUTH
   └─> /signup → Create account
   └─> /login → Sign in

2. ONBOARDING
   └─> /onboarding → Select "Agent" role
   └─> /onboarding/agent → Multi-step form
       ├─ Role Selection
       ├─ Agency Information
       ├─ Service Areas
       ├─ Commission Structure
       └─ Review & Complete

3. DASHBOARD
   └─> /dashboard → Agent-specific dashboard
       └─ Cards:
           ├─ My Activity (referral tracking)
           ├─ Referral Earnings
           ├─ Payments (Stripe setup)
           ├─ My Profile
           └─ Settings

4. REFERRAL MANAGEMENT
   └─> /referral-activities → Track referral links
   └─> /transaction-history → View earnings
   └─> /payments → Manage payouts
```

## Navigation Access Points

### Global Navigation (NavMenu)
All authenticated users see in the dropdown menu:

**Common for All:**
- Dashboard
- Messages
- My network
- Account
- Help centre
- Log out

**Tutors Only:**
- 📋 My Listings
- ➕ Create Listing

**Students Only:**
- 🔍 Find Tutors

**Role Switching:**
- If user has multiple roles, can switch between them
- If user doesn't have a role, sees "Become a [role]" options

### Direct URLs

| Page | URL | Access |
|------|-----|--------|
| Dashboard | `/dashboard` | All authenticated |
| Onboarding Start | `/onboarding` | Unauthenticated or incomplete |
| Tutor Onboarding | `/onboarding/tutor` | Anyone |
| Student Onboarding | `/onboarding/client` | Anyone |
| Agent Onboarding | `/onboarding/agent` | Anyone |
| My Listings | `/listings` | Tutors only |
| Create Listing | `/listings/create` | Tutors only |
| Marketplace | `/marketplace` | Public |
| Listing Detail | `/marketplace/[id]` | Public |
| My Profile | `/profile` | Authenticated |
| Public Profile | `/profile/[id]` | Public |

## Key UI Components

### Dashboard Welcome Banner
```
🎉 Onboarding Complete!
[Role-specific welcome message]
```

### Recommended Action Cards
Cards with "⭐ Recommended" badge highlighting next steps

### Role Indicators
Throughout the app, users see their active role (Tutor/Student/Agent)

## Progress Indicators

### Profile Completion
- Shows in ProfileCompletenessIndicator component
- Tracks:
  - ✓ Profile picture uploaded
  - ✓ Bio added
  - ✓ Professional info completed
  - ✓ At least one listing created (tutors)

### Listing Status
- Draft → Not visible to students
- Published → Live on marketplace
- Paused → Temporarily hidden
- Archived → Permanently hidden

## Missing Pieces (Future Work)

1. **Booking System** - `/bookings` page doesn't exist yet
2. **Messaging** - `/messages` page is placeholder
3. **My Network** - Social/connection features
4. **Search & Filters** - Advanced filtering on marketplace
5. **Reviews & Ratings** - Rating system for tutors
6. **Payment Processing** - Actual booking payments
7. **Calendar Integration** - Availability management
8. **Notifications** - Email/push notifications for bookings

## Testing the Journey

### Manual Test Flow (Tutor)
1. Sign up at `/signup`
2. Complete tutor onboarding at `/onboarding/tutor`
3. Land on `/dashboard` - verify celebration banner
4. Click "Create New Listing" card
5. Fill out listing form at `/listings/create`
6. Save as draft or publish
7. View your listings at `/listings`
8. Browse marketplace to see your listing
9. Use nav menu to quickly access "My Listings"

### Manual Test Flow (Student)
1. Sign up at `/signup`
2. Complete student onboarding at `/onboarding/client`
3. Land on `/dashboard` - verify "Find Tutors" highlighted
4. Click "Find Tutors" card
5. Browse marketplace at `/marketplace`
6. Click on a listing to view details
7. Use filters to narrow search
8. Use nav menu "🔍 Find Tutors" from any page
