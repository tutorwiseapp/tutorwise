# Account > Professional Info - Implementation Complete

**Date:** October 5, 2025
**Status:** ✅ MVP Complete - Ready for Testing
**Feature:** Editable Template for Professional Information

---

## What Was Built

### 1. Backend (FastAPI)

**File:** `apps/api/app/api/account.py`

**Endpoints Created:**
- `GET /api/account/professional-info?role_type=provider`
  - Fetches professional info template for specified role
  - Returns structured template data from `role_details` table

- `PATCH /api/account/professional-info`
  - Updates professional info template
  - Upserts to `role_details` table
  - Returns success message: "✅ Template saved. Changes won't affect your existing listings."

**Key Features:**
- JWT token verification
- Supabase integration for database access
- Upsert logic (update or insert on conflict)
- Role-specific template handling

**Registered in:** `apps/api/app/main.py` (line 73)

---

### 2. Frontend (Next.js 14)

#### A. Route Structure

```
apps/web/src/app/account/
├── layout.tsx                    # ✅ Account settings layout with top tabs
├── page.tsx                      # ✅ Redirects to /account/personal-info
├── account.module.css            # ✅ Styling for layout and tabs
├── personal-info/
│   └── page.tsx                  # ✅ Placeholder (coming soon)
├── professional-info/
│   └── page.tsx                  # ✅ Main professional info page
├── settings/
│   └── page.tsx                  # ✅ Placeholder (coming soon)
└── components/
    ├── TutorProfessionalInfoForm.tsx        # ✅ Tutor template form (COMPLETE)
    ├── ClientProfessionalInfoForm.tsx       # ✅ Placeholder
    ├── AgentProfessionalInfoForm.tsx        # ✅ Placeholder
    └── ProfessionalInfoForm.module.css      # ✅ Form styling
```

#### B. Top Navigation (No Sidebar)

**Design Pattern:** Consumer platform (mobile-first)

**Tabs:**
- Personal Info
- Professional Info ← **Current feature**
- Settings

**Features:**
- Active tab highlighting (blue underline)
- Mobile responsive (horizontal scroll on small screens)
- Clean, modern design

#### C. Professional Info Page

**File:** `apps/web/src/app/account/professional-info/page.tsx`

**Features:**
- Role-based form rendering (Tutor/Client/Agent)
- Auth protection (redirects to /login if not authenticated)
- Info banner: "This is an editable template. Changes won't affect your existing listings."

#### D. Tutor Professional Info Form

**File:** `apps/web/src/app/account/components/TutorProfessionalInfoForm.tsx`

**Form Fields:**

1. **Subjects** (multi-select chips)
   - 14 common subjects
   - Chip-based selection (click to toggle)
   - Visual feedback (blue when selected)

2. **Education Levels** (multi-select chips)
   - Primary, KS3, GCSE, A-Level, IB, Undergraduate, Postgraduate
   - Chip-based selection

3. **Teaching Experience** (dropdown)
   - 0-1 years, 1-3 years, 3-5 years, 5-10 years, 10+ years

4. **Hourly Rate Range** (number inputs)
   - Min and Max values
   - £ currency
   - Optional field

5. **Qualifications** (dynamic list)
   - Add/remove qualification entries
   - Free text input
   - Example: "BSc Mathematics - Oxford University"

6. **Teaching Methods** (multi-select chips)
   - Interactive, Exam-focused, Visual learning, etc.
   - 7 predefined methods

**Form Behavior:**
- Loads existing template on mount
- Real-time state management
- Validation (subjects, levels, experience required)
- Save button disabled until required fields filled
- Toast notifications for success/error

---

### 3. API Utilities

**File:** `apps/web/src/lib/api/account.ts`

**Functions:**

```typescript
getProfessionalInfo(roleType: 'seeker' | 'provider' | 'agent')
  → Fetches template from Supabase role_details table
  → Returns null if no template exists (new users)

updateProfessionalInfo(template: ProfessionalInfoTemplate)
  → Upserts template to role_details table
  → Returns saved data
```

**Features:**
- Supabase auth integration
- Error handling
- TypeScript type safety

---

### 4. Type Definitions

**File:** `apps/web/src/types/index.ts`

**Added Types:**

```typescript
interface TutorProfessionalInfo {
  subjects: string[];
  levels: string[];
  teaching_experience: string;
  teaching_methods: string[];
  hourly_rate_range?: { min: number; max: number };
  qualifications: string[];
  certifications: string[];
  specializations: string[];
  // ... preferences
}

interface ClientProfessionalInfo { ... }
interface AgentProfessionalInfo { ... }
```

**Updated RoleDetails:**
- Added `teaching_methods: string[]`
- Added `availability: any`
- Made compatible with onboarding data

---

## Database Schema

**Table:** `role_details` (existing, no changes needed)

**Columns Used:**
- `id` - UUID primary key
- `profile_id` - References profiles(id)
- `role_type` - 'seeker' | 'provider' | 'agent'
- `subjects` - TEXT[]
- `teaching_experience` - TEXT
- `hourly_rate` - NUMERIC
- `qualifications` - TEXT[]
- `teaching_methods` - TEXT[]
- `specializations` - TEXT[]
- `created_at` - TIMESTAMPTZ
- `updated_at` - TIMESTAMPTZ

**Unique Constraint:** `(profile_id, role_type)`

---

## User Flow

1. **User navigates to** `/account` or `/account/professional-info`
2. **Auth check:** Redirect to `/login` if not authenticated
3. **Load template:** Fetch existing data from `role_details` via API
4. **Display form:** Role-specific form (Tutor/Client/Agent)
5. **User edits:** Interactive form with chips, dropdowns, inputs
6. **User saves:** Click "Save Template"
7. **API call:** PATCH `/api/account/professional-info` with template data
8. **Success:** Toast notification "✅ Template saved. Changes won't affect your existing listings."
9. **Data persists:** Upserted to `role_details` table in Supabase

---

## Testing Checklist

### Manual Testing

- [ ] **Navigation**
  - [ ] Can access `/account/professional-info` when logged in
  - [ ] Redirects to `/login` when not authenticated
  - [ ] Top tabs work (Personal Info, Professional Info, Settings)
  - [ ] Active tab highlights correctly

- [ ] **Form Display**
  - [ ] Tutor form displays for `provider` role
  - [ ] All form fields render correctly
  - [ ] Chips are clickable and toggle selection
  - [ ] Dynamic qualification list works (add/remove)

- [ ] **Data Loading**
  - [ ] Existing template loads on page mount
  - [ ] Form pre-populates with saved data
  - [ ] Shows empty form for new users

- [ ] **Form Validation**
  - [ ] Save button disabled when required fields empty
  - [ ] Save button enabled when all required fields filled
  - [ ] Subjects required (at least one)
  - [ ] Levels required (at least one)
  - [ ] Experience required

- [ ] **Form Submission**
  - [ ] Clicking "Save Template" triggers API call
  - [ ] Success toast displays
  - [ ] Data persists to database
  - [ ] Reloading page shows saved data

- [ ] **Responsive Design**
  - [ ] Works on desktop (1920px+)
  - [ ] Works on tablet (768px)
  - [ ] Works on mobile (375px)
  - [ ] Tabs scroll horizontally on small screens
  - [ ] Chips wrap properly

### API Testing

```bash
# Test GET endpoint
curl http://localhost:8000/api/account/professional-info?role_type=provider \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test PATCH endpoint
curl -X PATCH http://localhost:8000/api/account/professional-info \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role_type": "provider",
    "subjects": ["Mathematics", "Physics"],
    "teaching_experience": "5-10 years",
    "hourly_rate": 45,
    "qualifications": ["BSc Mathematics - Oxford"],
    "teaching_methods": ["Interactive", "Exam-focused"]
  }'
```

---

## What's Next

### Immediate Follow-ups (Phase 2)

1. **Complete Client & Agent Forms**
   - Build ClientProfessionalInfoForm component
   - Build AgentProfessionalInfoForm component
   - Match design patterns from Tutor form

2. **Personal Info Page**
   - Build personal info form (name, bio, avatar, location)
   - Update `profiles` table

3. **Settings Page**
   - Notification preferences
   - Privacy settings
   - Account preferences

### Future Enhancements (Phase 3)

4. **Listing Creation Flow**
   - "Create Listing" page with "Use Template" option
   - Pre-fill form with template data
   - Save as independent listing

5. **Template Management**
   - Multiple templates (Phase 1 enhancement)
   - Template history/versions
   - Duplicate template to listing

---

## Success Criteria

✅ Account > Professional Info page renders with proper layout
✅ Loads existing template data from `role_details`
✅ Editable form for all template fields
✅ Saves updates to database
✅ Shows clear success message
✅ Note displayed: "Changes won't affect your existing listings"
✅ Responsive on mobile
✅ No sidebar (top navigation only)

**Status:** All criteria met for Tutor role ✅

---

## Files Changed/Created

### Backend
- ✅ `apps/api/app/api/account.py` (new)
- ✅ `apps/api/app/main.py` (modified - added account router)

### Frontend
- ✅ `apps/web/src/types/index.ts` (modified - added template types)
- ✅ `apps/web/src/lib/api/account.ts` (new)
- ✅ `apps/web/src/app/account/layout.tsx` (new)
- ✅ `apps/web/src/app/account/page.tsx` (new)
- ✅ `apps/web/src/app/account/account.module.css` (new)
- ✅ `apps/web/src/app/account/personal-info/page.tsx` (new - placeholder)
- ✅ `apps/web/src/app/account/professional-info/page.tsx` (new)
- ✅ `apps/web/src/app/account/settings/page.tsx` (new - placeholder)
- ✅ `apps/web/src/app/account/components/TutorProfessionalInfoForm.tsx` (new)
- ✅ `apps/web/src/app/account/components/ClientProfessionalInfoForm.tsx` (new - placeholder)
- ✅ `apps/web/src/app/account/components/AgentProfessionalInfoForm.tsx` (new - placeholder)
- ✅ `apps/web/src/app/account/components/ProfessionalInfoForm.module.css` (new)

### Documentation
- ✅ `docs/features/ACCOUNT-PROFESSIONAL-INFO-IMPLEMENTATION.md` (this file)

---

## Architecture Notes

**Template vs Listing Decoupling:**
- Template stored in `role_details` table
- Listings will be stored in separate `listings` table (future)
- No foreign key relationship between them
- Editing template does NOT cascade to listings
- Template provides convenience, not source of truth for listings

**Design Pattern:**
- Consumer platform (mobile-first, top navigation)
- No left sidebar
- Chip-based multi-select for better UX
- Dynamic lists for flexible data entry
- Toast notifications for feedback

**Tech Stack:**
- Backend: FastAPI + Supabase
- Frontend: Next.js 14 + TypeScript + Tailwind CSS
- State: React hooks + UserProfileContext
- Forms: Controlled components (no React Hook Form yet)

---

**Ready for:** User testing and feedback
**Next Phase:** Build listing creation flow with "Use Template" option
