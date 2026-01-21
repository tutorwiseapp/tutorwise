# Week 1 Implementation Roadmap: Profile + Professional Info

**Date:** October 8, 2025
**Goal:** Complete Profile and Professional Info features to production-ready state
**Duration:** 5 days (40 hours)
**Status:** Day 1 In Progress

---

## Overview

This week focuses on completing two critical user-facing features:
1. **Profile Editing** - User profile management with avatar upload
2. **Professional Info Templates** - Role-specific professional information forms

**Success Criteria:**
- ✅ All E2E tests passing (100% pass rate)
- ✅ Unit test coverage ≥70%
- ✅ API integration fully functional and tested
- ✅ Avatar upload working or gracefully disabled
- ✅ Form validation comprehensive
- ✅ Error handling user-friendly
- ✅ Production deployment ready

---

## Day 1: Professional Info - API Verification & E2E Test Completion

**Date:** October 8, 2025
**Hours:** 8 hours
**Focus:** Verify API works end-to-end, complete failing E2E tests

### Morning (4 hours): API Verification

#### Task 1.1: Verify Backend API Endpoints (2 hours)
**Status:** ✅ Backend API EXISTS and is complete

**Files Verified:**
- ✅ [apps/api/app/api/account.py](apps/api/app/api/account.py) - 175 lines, fully functional
  - `GET /api/account/professional-info?role_type={type}` - Fetches template
  - `PATCH /api/account/professional-info` - Updates/creates template
  - JWT authentication with Supabase
  - Proper error handling (404, 401, 500)
  - Upsert logic with `on_conflict`

**API Features:**
```python
# GET endpoint returns:
{
  "id": "uuid",
  "profile_id": "user-id",
  "role_type": "provider|seeker|agent",
  "subjects": ["Mathematics", "Physics"],
  "teaching_experience": "5-10 years",
  "hourly_rate": 45.0,
  "qualifications": ["BSc Mathematics"],
  "teaching_methods": ["Interactive", "Exam-focused"],
  "specializations": ["GCSE", "A-Level"],
  "created_at": "...",
  "updated_at": "..."
}

# PATCH endpoint accepts UpdateProfessionalInfoRequest
# Returns: { "success": true, "message": "...", "data": {...} }
```

**Next Steps:**
- [ ] Test API manually with curl/Postman
- [ ] Verify database schema matches API expectations

#### Task 1.2: Verify Frontend API Client (1 hour)
**Status:** ✅ Frontend API client EXISTS and is complete

**File Verified:**
- ✅ [apps/web/src/lib/api/account.ts](apps/web/src/lib/api/account.ts) - 92 lines
  - `getProfessionalInfo(roleType)` - Fetches template from role_details table
  - `updateProfessionalInfo(template)` - Upserts template
  - Proper authentication (Supabase client)
  - Error handling for auth failures

**Usage in Components:**
```typescript
// TutorProfessionalInfoForm.tsx already uses:
const templateData = await getProfessionalInfo('provider');
await updateProfessionalInfo({ role_type: 'provider', subjects, ... });
```

**Next Steps:**
- [ ] Test API calls in browser DevTools
- [ ] Verify Supabase RLS policies allow operations

#### Task 1.3: Database Schema Verification (1 hour)
**Action Required:** Verify `role_details` table exists in Supabase

**Expected Schema:**
```sql
CREATE TABLE role_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role_type TEXT CHECK (role_type IN ('seeker', 'provider', 'agent')),
  subjects TEXT[],
  teaching_experience TEXT,
  hourly_rate DECIMAL(10,2),
  qualifications TEXT[],
  teaching_methods TEXT[],
  availability JSONB,
  specializations TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(profile_id, role_type)  -- Important for upsert!
);
```

**Checklist:**
- [ ] Table `role_details` exists
- [ ] UNIQUE constraint on `(profile_id, role_type)` exists
- [ ] RLS policies allow authenticated users to CRUD their own data
- [ ] Test data can be inserted/updated

### Afternoon (4 hours): E2E Test Completion

#### Task 1.4: Run Full E2E Test Suite (30 minutes)
**Command:**
```bash
npx playwright test tests/e2e/account/professional-info.spec.ts \
  --config=tools/playwright/playwright.config.ts \
  --reporter=html
```

**Expected:**
- 14 total tests in file
- Current status: Some passing, some failing (need to identify which)

**Test Breakdown:**
1. Authenticated Tests (9 tests)
   - Layout and navigation
   - Info banner
   - Form rendering
   - Chip selection
   - Validation
   - Qualification add/remove
   - Form submission
   - Mobile responsive
   - Figma design compliance

2. Unauthenticated (1 test)
   - Redirect to login

3. Visual Regression (4 tests)
   - Desktop screenshot
   - Tablet screenshot
   - Mobile screenshot
   - Form with selections screenshot

#### Task 1.5: Fix Failing E2E Tests (3.5 hours)

**Test Failure Pattern Analysis:**

**Issue 1: Form Submission Test Failing**
**Symptom:** Success toast not appearing after save
**Root Cause:** API call may be failing or toast selector incorrect
**Fix:**
```typescript
// Update test to wait for toast with correct selector
await expect(page.getByText(/Template saved/)).toBeVisible({ timeout: 10000 });

// Or check for react-hot-toast specific selector
await expect(page.locator('[role="status"]')).toContainText(/Template saved/);
```

**Issue 2: Visual Regression Tests Failing**
**Symptom:** Screenshots don't match baselines
**Root Cause:** No baseline snapshots exist yet OR legitimate UI changes
**Fix:**
```bash
# Generate baseline snapshots
npx playwright test tests/e2e/account/professional-info.spec.ts \
  --config=tools/playwright/playwright.config.ts \
  --update-snapshots
```

**Issue 3: Qualification Add/Remove Test**
**Symptom:** Count assertion fails
**Root Cause:** Variable `finalCount` not defined (typo in test)
**Fix:**
```typescript
// Line 149 has typo
- expect(finalCount).toBe(initialCount);
+ const finalCount = await qualInputs.count();
+ expect(finalCount).toBe(initialCount);
```

**Systematic Fix Approach:**
1. Run tests one by one to isolate failures
2. Add detailed logging/screenshots on failure
3. Verify API responses in Network tab
4. Update selectors if needed
5. Generate snapshots for visual tests

---

## Day 2: Profile Feature Completion

**Date:** October 9, 2025
**Hours:** 8 hours
**Focus:** Avatar upload + Form validation + Error handling

### Morning (4 hours): Avatar Upload Implementation

#### Task 2.1: Implement Supabase Storage Upload (3 hours)

**File:** [apps/web/src/app/profile/page.tsx](apps/web/src/app/profile/page.tsx)

**Current Code (Non-functional):**
```typescript
const handleAvatarUpload = async () => {
  setMessage({ text: 'Avatar upload functionality is being migrated.', type: 'warning' });
};
```

**Implementation:**
```typescript
const [uploading, setUploading] = useState(false);
const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);

const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  // Validate file
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    setMessage({ text: 'Image must be less than 5MB', type: 'error' });
    return;
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    setMessage({ text: 'Only JPEG, PNG, and WebP images allowed', type: 'error' });
    return;
  }

  setUploading(true);
  setMessage(null);

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from('avatars')  // Create this bucket in Supabase
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true  // Replace if exists
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    // Update profile with avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id);

    if (updateError) throw updateError;

    setAvatarUrl(publicUrl);
    setMessage({ text: 'Avatar uploaded successfully!', type: 'success' });
  } catch (err) {
    console.error('Avatar upload error:', err);
    setMessage({ text: `Failed to upload avatar: ${(err as Error).message}`, type: 'error' });
  } finally {
    setUploading(false);
  }
};
```

**Supabase Storage Setup Required:**
1. Create `avatars` bucket in Supabase Dashboard
2. Set bucket to public or authenticated access
3. Configure RLS policies for uploads

**Alternative (If Time-Constrained):**
Disable avatar upload with better UX:
```typescript
const handleAvatarUpload = async () => {
  setMessage({
    text: 'Avatar upload coming soon! For now, use your initials.',
    type: 'warning'
  });
  // Show initials-based avatar instead
};
```

#### Task 2.2: Add Image Preview (1 hour)

**UI Component:**
```tsx
<div className={styles.avatarSection}>
  {avatarUrl ? (
    <img
      src={avatarUrl}
      alt="Profile avatar"
      className={styles.avatarPreview}
    />
  ) : (
    <div className={styles.avatarPlaceholder}>
      {profile?.name?.charAt(0) || 'U'}
    </div>
  )}
  <input
    ref={avatarFileRef}
    type="file"
    accept="image/jpeg,image/png,image/webp"
    onChange={handleAvatarUpload}
    style={{ display: 'none' }}
  />
  <Button
    onClick={() => avatarFileRef.current?.click()}
    disabled={uploading}
  >
    {uploading ? 'Uploading...' : 'Change Avatar'}
  </Button>
</div>
```

### Afternoon (4 hours): Form Validation & Error Handling

#### Task 2.3: Client-Side Validation (2 hours)

**Add Validation Library:**
```bash
npm install zod
```

**Create Validation Schema:**
```typescript
import { z } from 'zod';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number').optional(),
  bio: z.string().max(500, 'Bio must be 500 characters or less').optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;
```

**Validation on Submit:**
```typescript
const handleSave = async (e: React.FormEvent) => {
  e.preventDefault();

  // Validate
  try {
    profileSchema.parse(formData);
  } catch (err) {
    if (err instanceof z.ZodError) {
      setMessage({
        text: err.errors[0].message,
        type: 'error'
      });
      return;
    }
  }

  // Proceed with save...
};
```

#### Task 2.4: Improve Error Handling (2 hours)

**Enhanced Error Messages:**
```typescript
const handleSave = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSaving(true);
  setMessage(null);

  try {
    const response = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      const errorData = await response.json();

      // Specific error messages
      if (response.status === 400) {
        throw new Error(`Validation error: ${errorData.message}`);
      } else if (response.status === 401) {
        throw new Error('Session expired. Please log in again.');
      } else if (response.status === 500) {
        throw new Error('Server error. Please try again later.');
      } else {
        throw new Error('Failed to update profile.');
      }
    }

    setMessage({ text: 'Profile updated successfully!', type: 'success' });

    // Optimistic update
    if (profile) {
      // Update context with new data
    }
  } catch (err) {
    setMessage({
      text: (err as Error).message,
      type: 'error'
    });
  } finally {
    setIsSaving(false);
    window.scrollTo(0, 0);  // Scroll to show message
  }
};
```

---

## Day 3-4: Unit Tests for All Components

**Date:** October 10-11, 2025
**Hours:** 16 hours
**Focus:** Comprehensive unit test coverage

### Day 3 Morning: Professional Info Form Unit Tests (4 hours)

#### Task 3.1: Setup Jest + React Testing Library

**Install Dependencies:**
```bash
npm install -D @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event jest-environment-jsdom
```

**Create:** `apps/web/jest.config.js` (if not exists)

#### Task 3.2: TutorProfessionalInfoForm Tests (3 hours)

**File:** `apps/web/tests/unit/TutorProfessionalInfoForm.test.tsx`

**Test Coverage:**
```typescript
describe('TutorProfessionalInfoForm', () => {
  // Rendering tests
  it('renders all form sections', () => {});
  it('shows loading state initially', () => {});

  // Interaction tests
  it('allows subject selection via chips', () => {});
  it('allows level selection', () => {});
  it('allows experience selection', () => {});

  // Qualification tests
  it('can add qualifications', () => {});
  it('can remove qualifications', () => {});
  it('filters empty qualifications on submit', () => {});

  // Validation tests
  it('disables save button when required fields empty', () => {});
  it('enables save button when required fields filled', () => {});

  // API tests (mocked)
  it('loads existing template on mount', () => {});
  it('saves template successfully', () => {});
  it('shows error toast on save failure', () => {});
  it('shows success toast on save success', () => {});
});
```

### Day 3 Afternoon: Profile Component Unit Tests (4 hours)

**File:** `apps/web/tests/unit/ProfilePage.test.tsx`

**Test Coverage:**
```typescript
describe('ProfilePage', () => {
  it('shows skeleton loading while fetching', () => {});
  it('renders profile form when loaded', () => {});
  it('updates form state on input change', () => {});
  it('validates email format', () => {});
  it('validates phone number', () => {});
  it('validates bio length', () => {});
  it('disables save button while saving', () => {});
  it('shows success message on successful save', () => {});
  it('shows error message on failed save', () => {});
  it('handles avatar upload', () => {});
  it('shows avatar upload warning when not implemented', () => {});
});
```

### Day 4: Client/Agent Forms + Integration Tests (8 hours)

#### Task 4.1: Client/Agent Form Unit Tests (4 hours)
- ClientProfessionalInfoForm tests
- AgentProfessionalInfoForm tests

#### Task 4.2: API Integration Tests (4 hours)

**File:** `apps/web/tests/integration/professional-info-api.test.ts`

**Tests:**
```typescript
describe('Professional Info API Integration', () => {
  it('fetches template for provider role', () => {});
  it('fetches template for seeker role', () => {});
  it('fetches template for agent role', () => {});
  it('returns null when no template exists', () => {});
  it('creates new template on first save', () => {});
  it('updates existing template on subsequent save', () => {});
  it('handles unauthenticated requests', () => {});
  it('handles network errors gracefully', () => {});
});
```

---

## Day 5: Onboarding Auto-Save API + Final Testing

**Date:** October 12, 2025
**Hours:** 8 hours
**Focus:** Onboarding auto-save endpoint + end-to-end testing

### Morning (4 hours): Onboarding Auto-Save API

#### Task 5.1: Create Backend Endpoint (3 hours)

**File:** `apps/api/app/api/onboarding.py` (new file)

```python
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])

class SaveProgressRequest(BaseModel):
    current_step: str
    completed_steps: list[str]
    selected_roles: list[str]
    role_specific_progress: Optional[Dict[str, Any]] = None
    last_updated: str

@router.post("/save-progress")
async def save_onboarding_progress(
    data: SaveProgressRequest,
    user_id: str = Depends(verify_token),
    supabase: Client = Depends(get_supabase)
):
    """Save onboarding progress (for auto-save and crash recovery)"""
    try:
        progress_data = {
            "current_step": data.current_step,
            "completed_steps": data.completed_steps,
            "selected_roles": data.selected_roles,
            "role_specific_progress": data.role_specific_progress,
            "last_updated": data.last_updated,
            "abandoned_at": None  # Clear abandoned status
        }

        response = (supabase.table("profiles")
            .update({"onboarding_progress": progress_data})
            .eq("id", user_id)
            .execute())

        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to save progress")

        return {"success": True, "message": "Progress saved"}
    except Exception as e:
        logger.error(f"Error saving onboarding progress: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

#### Task 5.2: Register Route in FastAPI App (30 minutes)

**File:** `apps/api/app/main.py`

```python
from app.api import account, onboarding  # Import new router

app.include_router(account.router)
app.include_router(onboarding.router)  # Add this line
```

#### Task 5.3: Test Auto-Save Endpoint (30 minutes)

**Manual Test:**
```bash
curl -X POST http://localhost:8000/api/onboarding/save-progress \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "current_step": "role-selection",
    "completed_steps": ["welcome"],
    "selected_roles": ["provider"],
    "last_updated": "2025-10-08T12:00:00Z"
  }'
```

### Afternoon (4 hours): End-to-End Testing & Production Readiness

#### Task 5.4: Run All Tests (2 hours)

```bash
# Unit tests
npm run test:unit

# E2E tests
npm run test:e2e

# Backend tests
cd apps/api && python3 -m pytest tests/

# Visual regression (if Percy configured)
npm run test:visual
```

**Target Metrics:**
- Unit test coverage: ≥70%
- E2E test pass rate: 100%
- Backend test pass rate: 100%

#### Task 5.5: Manual QA Testing (2 hours)

**Test Scenarios:**
1. **Profile Editing:**
   - Edit name, email, bio
   - Upload avatar (or verify graceful disable)
   - Submit with invalid data → see errors
   - Submit with valid data → see success

2. **Professional Info:**
   - Select subjects and levels as tutor
   - Add/remove qualifications
   - Save template
   - Switch to agent role → see agent form
   - Save agent template
   - Verify templates persist on page reload

3. **Onboarding:**
   - Start onboarding as new user
   - Navigate through steps
   - Close browser mid-flow
   - Return → verify resume from saved step
   - Complete onboarding
   - Verify redirect to dashboard

---

## Success Criteria Checklist

### Professional Info Feature ✅
- [ ] API endpoints verified and functional
- [ ] GET /api/account/professional-info works for all roles
- [ ] PATCH /api/account/professional-info saves correctly
- [ ] All 14 E2E tests passing
- [ ] Unit test coverage ≥70%
- [ ] Form validation comprehensive
- [ ] Error handling user-friendly
- [ ] Visual regression baselines established

### Profile Feature ✅
- [ ] Avatar upload implemented OR gracefully disabled
- [ ] Form validation works (email, phone, bio)
- [ ] Error messages specific and helpful
- [ ] Success/error toast notifications working
- [ ] Unit tests written and passing
- [ ] E2E test for profile edit flow
- [ ] Optimistic UI updates

### Onboarding Feature ✅
- [ ] /api/onboarding/save-progress endpoint created
- [ ] Auto-save triggers every 30 seconds
- [ ] Crash recovery with sendBeacon works
- [ ] Progress persists to database
- [ ] Resume from saved step functional
- [ ] Backend endpoint tested

---

## Risks & Mitigation

### Risk 1: Supabase Storage Not Configured
**Mitigation:** Disable avatar upload with good UX (initials avatar)

### Risk 2: Database Schema Mismatch
**Mitigation:** Create migration scripts or manual schema verification

### Risk 3: E2E Tests Flaky
**Mitigation:** Increase timeouts, add explicit waits, disable animations

### Risk 4: Unit Test Coverage Low
**Mitigation:** Focus on critical paths first, defer edge cases

---

## Deliverables

By end of Week 1:
1. ✅ Profile editing production-ready
2. ✅ Professional Info templates production-ready
3. ✅ Onboarding auto-save functional
4. ✅ All E2E tests passing
5. ✅ Unit test coverage ≥70%
6. ✅ Documentation updated
7. ✅ Ready for Week 2 (Onboarding completion)

---

**Next Week:** Onboarding Wizard completion (35 hours)
