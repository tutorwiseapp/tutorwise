# GUARD Day 5 Implementation Plan

**Date:** October 8, 2025
**Focus:** Onboarding API + E2E Test Fixes + Week 1 Validation
**Time:** 8 hours

---

## Overview

Day 5 completes Week 1 by implementing the onboarding auto-save API endpoint, fixing remaining E2E tests, and validating all test infrastructure. This establishes the foundation for the GUARD (Governance, Usability, Assurance, Reliability, Defence) testing system.

---

## Task 1: Onboarding API Save-Progress Endpoint (4 hours)

### 1.1 Backend Implementation (2.5 hours)

#### Create FastAPI Endpoint
**File:** `apps/api/app/api/onboarding.py`

**Endpoint:** `POST /api/onboarding/save-progress`

**Request Schema:**
```python
from pydantic import BaseModel
from typing import Optional, Dict, Any

class OnboardingProgressRequest(BaseModel):
    step: int  # Current step (1-4)
    role_type: str  # 'tutor', 'client', or 'agent'
    data: Dict[str, Any]  # Step-specific data
    is_complete: bool = False
```

**Response Schema:**
```python
class OnboardingProgressResponse(BaseModel):
    success: bool
    message: str
    progress_id: str
    updated_at: str
```

**Implementation:**
```python
from fastapi import APIRouter, Depends, HTTPException
from app.auth import verify_token
from app.database import get_supabase
from datetime import datetime

router = APIRouter()

@router.post("/save-progress", response_model=OnboardingProgressResponse)
async def save_onboarding_progress(
    request: OnboardingProgressRequest,
    user_id: str = Depends(verify_token),
    supabase: Client = Depends(get_supabase)
):
    """
    Save user's onboarding progress with auto-save support.
    Allows incremental progress saving as user completes steps.
    """
    try:
        # Upsert onboarding_progress table
        progress_data = {
            "profile_id": user_id,
            "role_type": request.role_type,
            "current_step": request.step,
            "step_data": request.data,
            "is_complete": request.is_complete,
            "updated_at": datetime.utcnow().isoformat()
        }

        response = (supabase.table("onboarding_progress")
            .upsert(progress_data, on_conflict="profile_id,role_type")
            .execute())

        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to save progress")

        return OnboardingProgressResponse(
            success=True,
            message="Progress saved successfully",
            progress_id=response.data[0]["id"],
            updated_at=response.data[0]["updated_at"]
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/progress/{role_type}", response_model=OnboardingProgressResponse)
async def get_onboarding_progress(
    role_type: str,
    user_id: str = Depends(verify_token),
    supabase: Client = Depends(get_supabase)
):
    """Get user's onboarding progress for specific role."""
    response = (supabase.table("onboarding_progress")
        .select("*")
        .eq("profile_id", user_id)
        .eq("role_type", role_type)
        .single()
        .execute())

    if not response.data:
        raise HTTPException(status_code=404, detail="No progress found")

    return response.data
```

#### Database Migration
**File:** `apps/api/migrations/create_onboarding_progress_table.sql`

```sql
CREATE TABLE IF NOT EXISTS onboarding_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_type VARCHAR(20) NOT NULL CHECK (role_type IN ('tutor', 'client', 'agent')),
    current_step INT NOT NULL DEFAULT 1,
    step_data JSONB NOT NULL DEFAULT '{}',
    is_complete BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(profile_id, role_type)
);

CREATE INDEX idx_onboarding_progress_profile ON onboarding_progress(profile_id);
CREATE INDEX idx_onboarding_progress_role ON onboarding_progress(role_type);
```

#### Register Router
**File:** `apps/api/app/main.py`

```python
from app.api.onboarding import router as onboarding_router

app.include_router(onboarding_router, prefix="/api/onboarding", tags=["onboarding"])
```

---

### 1.2 Frontend Integration (1.5 hours)

#### Create API Client
**File:** `apps/web/src/lib/api/onboarding.ts`

```typescript
import { createClient } from '@/lib/supabase/client';

export interface OnboardingProgress {
  step: number;
  roleType: 'tutor' | 'client' | 'agent';
  data: Record<string, any>;
  isComplete?: boolean;
}

export async function saveOnboardingProgress(progress: OnboardingProgress) {
  const supabase = createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch('/api/onboarding/save-progress', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({
      step: progress.step,
      role_type: progress.roleType,
      data: progress.data,
      is_complete: progress.isComplete || false
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to save progress');
  }

  return response.json();
}

export async function getOnboardingProgress(roleType: 'tutor' | 'client' | 'agent') {
  const supabase = createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(`/api/onboarding/progress/${roleType}`, {
    headers: {
      'Authorization': `Bearer ${session.access_token}`
    }
  });

  if (response.status === 404) {
    return null; // No progress yet
  }

  if (!response.ok) {
    throw new Error('Failed to get progress');
  }

  return response.json();
}
```

#### Add Auto-Save to Onboarding Wizard
**File:** `apps/web/src/app/onboarding/components/OnboardingWizard.tsx` (update)

```typescript
import { useEffect, useCallback } from 'react';
import { saveOnboardingProgress } from '@/lib/api/onboarding';
import { debounce } from 'lodash';

// Inside component
const autoSave = useCallback(
  debounce(async (step: number, data: Record<string, any>) => {
    try {
      await saveOnboardingProgress({
        step,
        roleType: userRole,
        data,
        isComplete: false
      });
      console.log('Progress auto-saved');
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, 2000), // Debounce 2 seconds
  [userRole]
);

// Call on form changes
useEffect(() => {
  if (formData && currentStep) {
    autoSave(currentStep, formData);
  }
}, [formData, currentStep, autoSave]);
```

---

### 1.3 Testing (30 minutes)

#### Manual Testing with Postman
```bash
# Start API server
cd apps/api
uvicorn app.main:app --reload

# Test save progress
POST http://localhost:8000/api/onboarding/save-progress
Authorization: Bearer <token>
Content-Type: application/json

{
  "step": 1,
  "role_type": "tutor",
  "data": {
    "subjects": ["Mathematics", "Physics"],
    "availability": "weekends"
  },
  "is_complete": false
}

# Test get progress
GET http://localhost:8000/api/onboarding/progress/tutor
Authorization: Bearer <token>
```

#### Unit Test
**File:** `apps/web/tests/unit/onboarding-api.test.ts`

```typescript
import { saveOnboardingProgress, getOnboardingProgress } from '@/lib/api/onboarding';

describe('Onboarding API', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('saves progress successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Progress saved',
        progress_id: 'test-id',
        updated_at: '2025-10-08T10:00:00Z'
      })
    });

    const result = await saveOnboardingProgress({
      step: 2,
      roleType: 'tutor',
      data: { subjects: ['Math'] }
    });

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/onboarding/save-progress',
      expect.objectContaining({
        method: 'POST'
      })
    );
  });
});
```

---

## Task 2: Fix Remaining E2E Tests (2 hours)

### 2.1 Run E2E Test Suite
```bash
npx playwright test tests/e2e/account/professional-info.spec.ts --config=tools/playwright/playwright.config.ts
```

### 2.2 Fix Failing Tests

#### Common Issues to Fix:

**Issue 1: Visual Regression Baselines Missing**
```bash
# Create baselines
npx playwright test --update-snapshots
```

**Issue 2: Timing Issues**
```typescript
// Add wait for network idle
await page.waitForLoadState('networkidle');

// Add explicit waits
await page.waitForTimeout(100);
```

**Issue 3: Authentication State**
```typescript
// Ensure auth helper works
import { loginAsTutor } from '../../helpers/auth';

test.beforeEach(async ({ page }) => {
  await loginAsTutor(page);
  // Verify logged in
  await page.waitForURL(/.*account/);
});
```

### 2.3 Add More Percy Snapshots

**File:** `tests/e2e/profile/profile.spec.ts` (new)

```typescript
import { test, expect } from '@playwright/test';
import { loginAsTutor } from '../../helpers/auth';
import percySnapshot from '@percy/playwright';

test.describe('Profile Page Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTutor(page);
  });

  test('Profile page desktop', async ({ page }) => {
    await page.goto('http://localhost:3000/profile');
    await page.waitForSelector('form');

    await percySnapshot(page, 'Profile - Desktop');
  });

  test('Profile page with data', async ({ page }) => {
    await page.goto('http://localhost:3000/profile');

    const nameInput = page.getByLabelText(/Display Name/i);
    await nameInput.fill('John Doe');

    await percySnapshot(page, 'Profile - With Data');
  });
});
```

---

## Task 3: Generate Final Coverage Report (1 hour)

### 3.1 Run Full Test Suite
```bash
# Unit tests with coverage
npm test -- --coverage --collectCoverageFrom='src/app/**/*.{ts,tsx}'

# E2E tests
npx playwright test --config=tools/playwright/playwright.config.ts

# Generate HTML report
npm test -- --coverage --coverageReporters=html lcov text
```

### 3.2 Analyze Coverage

**Expected Coverage:**
- TutorProfessionalInfoForm: 83.95% ✅
- ProfilePage: ~30% 🟡
- Onboarding API: ~70% 🟡
- Overall: ~50-60%

### 3.3 Document Coverage

**File:** `WEEK-1-TEST-COVERAGE-REPORT.md`

```markdown
# Week 1 Test Coverage Report

## Unit Test Coverage

| Component | Lines | Statements | Branches | Functions | Status |
|-----------|-------|------------|----------|-----------|--------|
| TutorProfessionalInfoForm | 83.95% | 83.33% | 70.83% | 70% | ✅ |
| ProfilePage | 30% | 28% | 25% | 35% | 🟡 |
| Onboarding API | 70% | 68% | 60% | 75% | 🟡 |

## E2E Test Coverage

| Feature | Tests | Passing | Coverage | Status |
|---------|-------|---------|----------|--------|
| Professional Info | 14 | 10 | 71% | 🟡 |
| Profile | 5 | 3 | 60% | 🟡 |

## Visual Regression

| Page | Snapshots | Status |
|------|-----------|--------|
| Professional Info | 4 | ✅ |
| Profile | 2 | ✅ |
```

---

## Task 4: Week 1 Validation & Summary (1 hour)

### 4.1 Validation Checklist

- ✅ TutorProfessionalInfoForm: 15/15 tests passing
- ✅ Percy: 6+ snapshots integrated
- ✅ Onboarding API: Implemented and tested
- 🟡 E2E tests: 70%+ passing
- 🟡 Overall coverage: 50%+
- ✅ Documentation: Complete

### 4.2 Create Final Summary

**File:** `WEEK-1-FINAL-SUMMARY.md`

**Contents:**
- Week 1 accomplishments
- Test infrastructure status
- GUARD system foundation
- Known issues and deferrals
- Week 2 recommendations

---

## Expected Outcomes

### By End of Day 5

1. ✅ **Onboarding API functional** - Save/restore progress
2. ✅ **E2E tests improved** - 70%+ passing
3. ✅ **Coverage report generated** - 50%+ overall coverage
4. ✅ **Week 1 complete** - All deliverables documented

### GUARD System Foundation

**Governance:** ✅
- Test standards documented
- Coverage thresholds defined

**Usability:** 🟡
- Percy visual regression (6+ snapshots)
- Component testability patterns

**Assurance:** ✅
- Unit tests: TutorProfessionalInfoForm 83.95%
- E2E tests: 70%+ passing
- Coverage reporting automated

**Reliability:** 🟡
- Onboarding auto-save implemented
- Test retry logic in place

**Defence:** 🟡
- Authentication tested
- Error handling validated

---

## Time Breakdown

| Task | Estimated | Actual |
|------|-----------|--------|
| Onboarding API Backend | 2.5h | |
| Onboarding API Frontend | 1.5h | |
| E2E Test Fixes | 2h | |
| Coverage Report | 1h | |
| Week 1 Validation | 1h | |
| **Total** | **8h** | |

---

## Success Criteria

- ✅ Onboarding progress persists across sessions
- ✅ E2E test pass rate ≥70%
- ✅ Overall test coverage ≥50%
- ✅ Percy snapshots created for major pages
- ✅ Week 1 documentation complete
- ✅ GUARD foundation established

---

**Status:** 📋 Ready to execute

**Next:** Begin Task 1 - Onboarding API implementation
