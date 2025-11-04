# Create Listing v4.0 - Implementation Summary

**Date**: 2025-11-04
**Status**: In Progress
**Version**: 4.0

## Overview

This document summarizes the implementation of the dynamic multi-service create listing form (v4.0).

## Completed Components

### 1. Type System ✅
**File**: `packages/shared-types/src/listing.ts`

**Added**:
- `ServiceType`: `'one-to-one' | 'group-session' | 'workshop' | 'study-package'`
- `PackageType`: `'pdf' | 'video' | 'bundle'`
- `AvailabilityPeriod`: Structured availability data (reused from profile)
- `UnavailabilityPeriod`: Unavailable time periods
- `BaseListingFields`: Common fields for all service types
- `OneToOneFields`, `GroupSessionFields`, `WorkshopFields`, `StudyPackageFields`: Service-specific fields
- `CreateListingInputV4`: Discriminated union type

### 2. FormSection Component ✅
**Files**:
- `apps/web/src/app/components/ui/form/FormSection.tsx`
- `apps/web/src/app/components/ui/form/FormSection.module.css`

**Features**:
- Reusable section wrapper for form cards
- Consistent title and description styling
- Design system compliant
- Mobile responsive

### 3. AvailabilityFormSection Component ✅
**Files**:
- `apps/web/src/app/components/listings/AvailabilityFormSection.tsx`
- `apps/web/src/app/components/listings/AvailabilityFormSection.module.css`

**Features**:
- Inline-editable (no modal)
- Toggle between "Recurring" and "One-time" availability
- Day selection for recurring (Mon-Sun)
- Date range pickers
- Start/End time pickers
- Multiple availability periods with add/remove
- "Load from Profile" functionality
- Visually identical to profile component
- Design system compliant
- Mobile responsive

## Pending Work

### 4. CreateListings.tsx Refactoring 🔄
**File**: `apps/web/src/app/components/listings/wizard-steps/CreateListings.tsx`

**Current State** (v3.9):
- 605 lines
- Static One-on-One Session form
- Existing fields: title, description, subjects, levels, hourly rate, delivery mode, durations, cancellation policy, booking options, location details, AI tools, photos

**Required Changes**:

#### Phase 1: Add Service Type Selector
- Add `serviceType` state variable
- Create full-width card with service type dropdown
- Options: One-to-One, Group Session, Workshop, Study Package

#### Phase 2: Make Core Details Dynamic
- Keep existing fields: Service Title (title), Description
- Add conditional fields based on service type:
  - **One-to-One**: Session Duration dropdown
  - **Group Session**: Max Attendees (2-10) + Session Duration
  - **Workshop**: Max Participants (10-500)
  - **Study Package**: Package Type dropdown

#### Phase 3: Add Workshop-Specific Card
**Conditional**: Only show when `serviceType === 'workshop'`

Fields:
- Event Date (date input)
- Start Time (time input)
- End Time (time input)
- Speaker Bio (textarea, optional)
- Event Agenda (textarea, optional)

#### Phase 4: Add Study Package Card
**Conditional**: Only show when `serviceType === 'study-package'`

Fields:
- Package Type (PDF/Video/Bundle)
- Material Upload (file upload component)

#### Phase 5: Update Availability Section
**Conditional**: Only show when `serviceType === 'one-to-one' || serviceType === 'group-session'`

- Replace existing availability logic with new `AvailabilityFormSection` component
- Integrate "Load from Profile" functionality
- Store data as `AvailabilityPeriod[]`

#### Phase 6: Update Media Section
- Rename "Photos" to "Hero Image"
- Keep existing `ImageUpload` component
- Refine helper text

### 5. Validation Schema 🔄
**Approach**: Zod dynamic schemas

**Required Schemas**:
```typescript
const baseSchema = z.object({
  service_name: z.string().min(10).max(200),
  description: z.string().min(50).max(2000),
  category: z.string(),
  amount: z.number().min(1),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published']).optional(),
});

const oneToOneSchema = baseSchema.extend({
  service_type: z.literal('one-to-one'),
  session_duration: z.number().min(15).max(180),
  availability: z.array(availabilityPeriodSchema).min(1),
});

const groupSessionSchema = baseSchema.extend({
  service_type: z.literal('group-session'),
  session_duration: z.number().min(15).max(180),
  max_attendees: z.number().min(2).max(10),
  availability: z.array(availabilityPeriodSchema).min(1),
});

const workshopSchema = baseSchema.extend({
  service_type: z.literal('workshop'),
  max_attendees: z.number().min(10).max(500),
  event_date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  speaker_bio: z.string().optional(),
  event_agenda: z.string().optional(),
});

const studyPackageSchema = baseSchema.extend({
  service_type: z.literal('study-package'),
  package_type: z.enum(['pdf', 'video', 'bundle']),
  material_url: z.string().url().optional(),
  material_urls: z.array(z.string().url()).optional(),
});
```

### 6. Database Integration 🔄
**Table**: Existing `listings` table

**Storage Strategy**:
- `listing_type` column: Store `service_type` value
- `details` (JSONB) column: Store service-specific fields

**Example JSONB for Workshop**:
```json
{
  "service_type": "workshop",
  "max_attendees": 100,
  "event_date": "2025-12-15",
  "start_time": "10:00",
  "end_time": "16:00",
  "speaker_bio": "...",
  "event_agenda": "..."
}
```

## Testing Plan

### Test Cases

#### 1. One-to-One Session
- [ ] Service type selection
- [ ] Session duration dropdown appears
- [ ] Availability section appears
- [ ] Can add recurring availability
- [ ] Can add one-time availability
- [ ] Can load from profile
- [ ] Form validates correctly
- [ ] Submits successfully

#### 2. Group Session
- [ ] Service type selection
- [ ] Max Attendees field appears (2-10 range)
- [ ] Session duration dropdown appears
- [ ] Availability section appears
- [ ] Works same as One-to-One for availability
- [ ] Form validates correctly
- [ ] Submits successfully

#### 3. Workshop/Webinar
- [ ] Service type selection
- [ ] Workshop Details card appears
- [ ] Availability section HIDDEN
- [ ] Event date/time fields work
- [ ] Speaker bio and agenda optional
- [ ] Form validates correctly
- [ ] Submits successfully

#### 4. Study Package
- [ ] Service type selection
- [ ] Study Package card appears
- [ ] Availability section HIDDEN
- [ ] Package type dropdown works
- [ ] File upload works
- [ ] Form validates correctly
- [ ] Submits successfully

#### 5. Responsive Design
- [ ] Mobile layout (< 767px)
- [ ] Tablet layout (768px - 1023px)
- [ ] Desktop layout (> 1024px)
- [ ] All cards stack properly on mobile
- [ ] 2-column grid works on desktop

## Next Steps

1. Complete CreateListings.tsx refactoring
2. Add Zod validation
3. Test all 4 service types
4. Update API endpoints to handle new structure
5. Database migration (if needed)
6. E2E testing
7. Documentation updates

## Notes

- Maintained backward compatibility with legacy `CreateListingInput` type
- New code uses `CreateListingInputV4` discriminated union
- All components are design system compliant
- Mobile-first responsive design
- Accessibility features included (ARIA labels, keyboard navigation)
