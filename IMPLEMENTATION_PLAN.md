# Production-Ready Onboarding Implementation Plan

## ✅ Completed Infrastructure

### 1. Unified Save Infrastructure ✓
- **File**: `/hooks/useOnboardingSave.ts`
- **Features**:
  - Multi-strategy save (auto, blur, navigation, manual)
  - Automatic retry with exponential backoff (2s, 4s, 8s)
  - Save state tracking (idle, saving, saved, error)
  - Unsaved changes detection

### 2. Offline Queue System ✓
- **File**: `/lib/offlineQueue.ts`
- **Features**:
  - IndexedDB for persistent offline storage
  - Automatic queue processing on connection restore
  - Retry mechanism (max 3 attempts)
  - Failed item tracking

### 3. Offline Sync Hook ✓
- **File**: `/hooks/useOfflineSync.ts`
- **Features**:
  - Auto-sync on connection restore
  - Process pending queue on mount
  - Online/offline event listeners

### 4. Auto-Save Enhancement ✓
- **File**: `/hooks/useAutoSave.ts`
- **Change**: Debounce reduced from 5s → 3s
- **Benefit**: Better data protection, faster saves

---

## 🚧 Remaining Implementation

### Phase 1: Update All Step Components (4 files)

#### Files to Update:
1. `TutorPersonalInfoStep.tsx`
2. `TutorProfessionalDetailStep.tsx`
3. `TutorProfessionalVerificationStep.tsx`
4. `TutorAvailabilityStep.tsx`

#### Changes Per Component:

```typescript
// Add imports
import { useOnboardingSave } from '@/hooks/useOnboardingSave';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { hasUnsavedChanges } from '@/lib/offlineQueue';

// Add state tracking
const [editingField, setEditingField] = useState<string | null>(null);
const [isSaving, setIsSaving] = useState(false);

// Add unified save hook
const { saveState, save, debouncedSave, hasUnsavedChanges: hasChanges } = useOnboardingSave(
  'professionalDetails', // step name
  formData,
  user?.id,
  {
    enabled: isRestored && !isLoading,
    onSuccess: () => console.log('[Step] ✓ Saved'),
    onError: (error) => console.error('[Step] ❌ Save failed:', error)
  }
);

// Add offline sync
useOfflineSync(user?.id);

// Add onBlur handler (150ms delay like ProfessionalInfoForm)
const handleBlur = (fieldName: string) => {
  if (!fieldName || isSaving) return;

  setTimeout(() => {
    if (editingField !== fieldName) return;

    setIsSaving(true);
    save(formData, { type: 'blur', retry: 3 })
      .finally(() => {
        setIsSaving(false);
        setEditingField(null);
      });
  }, 150);
};

// Add onChange handler for selects (immediate save)
const handleSelectChange = (field: string, value: any) => {
  const newData = { ...formData, [field]: value };
  setFormData(newData);

  // Immediate save for selects
  save(newData, { type: 'manual', retry: 3 });
};

// Add beforeunload warning (internal, no UI)
useEffect(() => {
  const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
    const unsaved = await hasUnsavedChanges();
    if (saveState === 'saving' || hasChanges || unsaved) {
      e.preventDefault();
      e.returnValue = '';
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [saveState, hasChanges]);

// Update form fields to use onBlur
<textarea
  value={formData.bio}
  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
  onFocus={() => setEditingField('bio')}
  onBlur={() => handleBlur('bio')}
  disabled={isSaving}
/>

<UnifiedSelect
  value={formData.status}
  onChange={(value) => handleSelectChange('status', value)}
  disabled={isSaving}
/>
```

---

### Phase 2: Update All Page Routes (4 files)

#### Files to Update:
1. `/onboarding/tutor/personal-info/page.tsx`
2. `/onboarding/tutor/professional-details/page.tsx`
3. `/onboarding/tutor/verification/page.tsx`
4. `/onboarding/tutor/availability/page.tsx`

#### Changes Per Page:

```typescript
// Import save hook
import { useOnboardingSave } from '@/hooks/useOnboardingSave';

// Add hook in component
const { save } = useOnboardingSave(
  'professionalDetails',
  {} as ProfessionalDetailsData, // formData managed by step component
  user?.id,
  { enabled: true }
);

// Update handleBack with explicit save
const handleBack = async () => {
  console.log('[Page] Back clicked - triggering save...');
  setIsPageLoading(true);

  try {
    // Get current form data from step component
    // (This will be passed via ref or state lifting)
    const result = await save(currentFormData, { type: 'navigation', retry: 3 });

    if (result.success) {
      console.log('[Page] ✓ Data saved, navigating back');
      router.push('/onboarding/tutor/personal-info');
    } else {
      throw new Error('Save failed');
    }
  } catch (error) {
    console.error('[Page] ❌ Save failed:', error);

    const proceed = confirm(
      'Failed to save changes. Go back anyway? (Unsaved changes will be lost)'
    );

    if (proceed) {
      router.push('/onboarding/tutor/personal-info');
    }
  } finally {
    setIsPageLoading(false);
  }
};

// Pass save function to step component
<TutorProfessionalDetailStep
  onNext={handleNext}
  onBack={handleBack}
  isLoading={isPageLoading}
  progressData={progressData}
/>
```

---

### Phase 3: Write-Through Persistence (Database Layer)

#### File to Update:
`/app/api/save-onboarding-progress/route.ts`

#### Changes:

```typescript
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const payload: SaveProgressPayload = await request.json();

    // 1. Save to onboarding_progress (draft/audit trail)
    const { data: currentProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('onboarding_progress')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 });
    }

    // Deep merge
    const existingProgress = currentProfile?.onboarding_progress || {};
    const mergedProgress = {
      ...existingProgress,
      ...payload.progress,
      tutor: {
        ...existingProgress.tutor,
        ...payload.progress.tutor,
      },
      last_updated: new Date().toISOString(),
    };

    // Update onboarding_progress
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ onboarding_progress: mergedProgress })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ success: false, error: 'Failed to save' }, { status: 500 });
    }

    // 2. WRITE-THROUGH: Also update role_details table
    if (payload.progress.tutor?.professionalDetails) {
      const details = payload.progress.tutor.professionalDetails;

      // Get current role_details to preserve fields we're not updating
      const { data: currentRoleDetails } = await supabase
        .from('role_details')
        .select('*')
        .eq('profile_id', user.id)
        .eq('role_type', 'tutor')
        .single();

      const roleDetailsData = {
        profile_id: user.id,
        role_type: 'tutor' as const,
        subjects: details.subjects || currentRoleDetails?.subjects || [],
        qualifications: {
          bio: details.bio || currentRoleDetails?.qualifications?.bio || '',
          experience_level: details.tutoringExperience || currentRoleDetails?.qualifications?.experience_level || '',
          education: details.academicQualifications?.[0] || currentRoleDetails?.qualifications?.education || '',
          certifications: details.teachingProfessionalQualifications || currentRoleDetails?.qualifications?.certifications || [],
        },
        hourly_rate: details.oneOnOneRate || currentRoleDetails?.hourly_rate || 0,
        // Preserve existing availability if not updating
        availability: currentRoleDetails?.availability || {},
        updated_at: new Date().toISOString(),
      };

      await supabase.from('role_details').upsert(roleDetailsData, {
        onConflict: 'profile_id,role_type'
      });
    }

    // Similarly handle verification and availability steps

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('Save error:', error);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
```

---

## 📊 Implementation Checklist

### Infrastructure (Completed ✅)
- [x] Create `/hooks/useOnboardingSave.ts`
- [x] Create `/lib/offlineQueue.ts`
- [x] Create `/hooks/useOfflineSync.ts`
- [x] Update `/hooks/useAutoSave.ts` (5s → 3s)

### Step Components (Pending)
- [ ] Update `TutorPersonalInfoStep.tsx`
  - [ ] Add onBlur save handler
  - [ ] Add offline sync
  - [ ] Add beforeunload warning
  - [ ] Update all form fields with onBlur
- [ ] Update `TutorProfessionalDetailStep.tsx`
  - [ ] Add onBlur save handler
  - [ ] Add offline sync
  - [ ] Add beforeunload warning
  - [ ] Update all form fields with onBlur
- [ ] Update `TutorProfessionalVerificationStep.tsx`
  - [ ] Add onBlur save handler
  - [ ] Add offline sync
  - [ ] Add beforeunload warning
  - [ ] Update all form fields with onBlur
- [ ] Update `TutorAvailabilityStep.tsx`
  - [ ] Add onBlur save handler
  - [ ] Add offline sync
  - [ ] Add beforeunload warning
  - [ ] Update all form fields with onBlur

### Page Routes (Pending)
- [ ] Update `/onboarding/tutor/personal-info/page.tsx`
  - [ ] Add save-on-back functionality
  - [ ] Add error handling with user prompt
- [ ] Update `/onboarding/tutor/professional-details/page.tsx`
  - [ ] Add save-on-back functionality
  - [ ] Add error handling with user prompt
- [ ] Update `/onboarding/tutor/verification/page.tsx`
  - [ ] Add save-on-back functionality
  - [ ] Add error handling with user prompt
- [ ] Update `/onboarding/tutor/availability/page.tsx`
  - [ ] Add save-on-back functionality
  - [ ] Add error handling with user prompt

### Database Layer (Pending)
- [ ] Update `/app/api/save-onboarding-progress/route.ts`
  - [ ] Implement write-through for professionalDetails
  - [ ] Implement write-through for verification
  - [ ] Implement write-through for availability
  - [ ] Add error handling and logging

### Dependencies (Required)
- [ ] Install Dexie: `npm install dexie`
- [ ] Add types: `npm install -D @types/dexie`

---

## 🎯 Benefits Summary

### Zero Data Loss
- ✅ Auto-save every 3 seconds
- ✅ Save on blur (150ms delay)
- ✅ Save on back button
- ✅ Save on Next button
- ✅ Offline queue for network failures
- ✅ beforeunload warning (internal)

### Network Resilience
- ✅ IndexedDB offline storage
- ✅ Automatic retry (3 attempts)
- ✅ Exponential backoff (2s, 4s, 8s)
- ✅ Auto-sync when connection restored
- ✅ Failed item tracking

### Consistent Architecture
- ✅ Write-through pattern (draft + production)
- ✅ onboarding_progress = audit trail
- ✅ role_details = production data
- ✅ Always in sync, no migration needed

### User Experience
- ✅ No visual clutter (no save indicators)
- ✅ No blocking notifications
- ✅ Silent data protection
- ✅ Instant navigation (saves in background)

---

## 📝 Next Steps

**Would you like me to proceed with implementing:**

1. **Option A: Complete All Changes (Recommended)**
   - Update all 4 step components
   - Update all 4 page routes
   - Update API route with write-through
   - Install dependencies
   - **Time**: ~4-6 hours
   - **Result**: Production-ready, zero data loss

2. **Option B: Incremental (One Step at a Time)**
   - Start with TutorProfessionalDetailStep only
   - Test thoroughly
   - Then apply to other steps
   - **Time**: ~6-8 hours total
   - **Result**: Lower risk, slower rollout

3. **Option C: Review First**
   - Review this plan thoroughly
   - Make adjustments
   - Then implement
   - **Time**: Varies

**My recommendation**: Option A - Complete all changes in one sweep for consistency.

Shall I proceed?
