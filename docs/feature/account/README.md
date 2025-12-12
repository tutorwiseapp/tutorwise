# Account

**Status**: Active
**Last Code Update**: 2025-12-12
**Last Doc Update**: 2025-12-12
**Priority**: High (Tier 1 - Critical)
**Architecture**: Hub Layout with Tabbed Navigation

## Quick Links
- [Implementation Guide](./account-implementation.md)
- [AI Prompt Context](./account-ai-prompt.md)
- [Solution Design](./solution-design.md)

## Overview

The account feature is a comprehensive profile and settings management system for Tutorwise users. Features role-specific profile editing, inline edit functionality, trust verification document uploads, availability management, and account preferences. Built with Hub Layout architecture and context-aware forms that adapt to user roles (tutor, client, agent).

## Key Features

- **Personal Information Management**: Edit name, contact details, address, emergency contact
- **Professional Profile Editing**: Role-specific forms (2000+ lines for tutors)
- **Inline Editing**: Click-to-edit with auto-save (150ms delay)
- **Avatar Upload**: Click-to-upload with instant preview
- **Trust Verification**: DBS, ID, and proof of address document uploads
- **Availability Management**: Recurring and one-time availability periods
- **Settings Management**: Free help toggle, password change, account deletion
- **Profile Completeness**: Progress tracking (0-100%)

## Component Architecture

### Main Hub Pages
- [account/page.tsx](../../../apps/web/src/app/(authenticated)/account/page.tsx) - Redirects to personal-info
- [account/personal-info/page.tsx](../../../apps/web/src/app/(authenticated)/account/personal-info/page.tsx) - Personal details
- [account/professional-info/page.tsx](../../../apps/web/src/app/(authenticated)/account/professional-info/page.tsx) - Role-specific professional info
- [account/settings/page.tsx](../../../apps/web/src/app/(authenticated)/account/settings/page.tsx) - Account preferences

### Core Components (5 total)
- **PersonalInfoForm.tsx** - Personal information inline editing
- **ProfessionalInfoForm.tsx** - Role-specific professional details (2000+ lines)
- **AccountCard.tsx** - Profile completeness widget with avatar upload
- **AccountHelpWidget.tsx** - Help and tips
- **AccountVideoWidget.tsx** - Video tutorials

## Routes

### Main Routes
- `/account` - Redirects to `/account/personal-info` (authenticated)
- `/account/personal-info` - Personal information tab
- `/account/professional-info` - Professional information tab
- `/account/settings` - Settings and preferences

### API Endpoints
1. `POST /api/presence/free-help/online` - Enable free help availability
2. `POST /api/presence/free-help/offline` - Disable free help availability
3. `POST /api/user/delete` - Delete account
4. Direct Supabase updates via `updateProfile()` function

## Database Tables

### Primary Table: `profiles`

**Personal Information**:
```sql
- id, email, first_name, last_name, full_name
- phone, gender, date_of_birth
- address_line1, town, city, country, postal_code
- emergency_contact_name, emergency_contact_email
```

**Avatar & Media**:
```sql
- avatar_url, cover_photo_url, bio_video_url
```

**Identity Verification**:
```sql
- identity_verification_document_url, identity_verification_document_name
- identity_verified, identity_verified_at
- identity_document_number, identity_issue_date, identity_expiry_date

- dbs_certificate_number, dbs_certificate_date, dbs_certificate_url
- dbs_certificate_document_name, dbs_verified, dbs_verified_at

- proof_of_address_url, proof_of_address_type, address_document_issue_date
- proof_of_address_verified
```

**Professional & Role-Based**:
```sql
- bio, qualifications[], teaching_experience, degree_level
- credibility_score, available_free_help
- stripe_account_id, stripe_customer_id
- referral_id, referral_code, referred_by_agent_id, slug
```

**Complex Nested Data** (`professional_details` JSONB):
```typescript
{
  tutor?: {
    status, academic_qualifications[], key_stages[], subjects[],
    teaching_professional_qualifications[], teaching_experience,
    session_types[], tutoring_experience, one_on_one_rate,
    group_session_rate, delivery_mode[], availability[], unavailability[]
  },
  client?: {
    subjects[], education_level, learning_goals[],
    learning_preferences[], budget_range, sessions_per_week,
    session_duration, special_needs[], additional_info,
    availability[], unavailability[]
  },
  agent?: {
    agency_name, agency_size, years_in_business, description,
    services[], commission_rate, service_areas[], student_capacity,
    subject_specializations[], education_levels[], coverage_areas[],
    number_of_tutors, certifications[], website, additional_info
  }
}
```

## Key Features by Tab

### Personal Info Tab

**Sections**:
1. **Name & Demographics**: first_name, last_name, gender, date_of_birth
2. **Contact Information**: email, phone
3. **Address**: address_line1, town, city, country, postal_code
4. **Emergency Contact**: name, email

**UX Features**:
- Inline editing with click-to-edit
- Auto-save on blur (150ms delay)
- Keyboard shortcuts: `Escape` to cancel, `Enter` to save
- Success/error toasts
- Grouped sections with visual hierarchy

### Professional Info Tab

**For Tutors** (2000+ lines):
- Bio & Video intro (30-second CaaS video)
- Status (Professional/Solo/Part-time)
- Academic & Teaching Qualifications
- Key Stages & Subjects expertise
- Teaching & Tutoring Experience
- Rates (one-on-one, group sessions)
- Session Type & Delivery Mode
- Availability Management (recurring/one-time)
- Unavailability Periods
- Trust & Verification (DBS, ID, Proof of Address)

**For Clients**:
- Bio & Learning Goals
- Subjects & Education Level
- Learning Preferences
- Budget Range
- Sessions per Week & Duration
- Special Needs
- Availability & Unavailability

**For Agents**:
- Agency Information (name, size, years in business)
- Business Description & Services
- Commission Rate & Website
- Student Capacity & Number of Tutors
- Subject Specializations & Coverage Areas
- Certifications
- Trust & Verification

### Settings Tab

**Categories**:
1. **Offer Free Help** (Tutors only, v5.9)
   - Toggle to enable/disable 30-minute free sessions
   - Helps build reputation

2. **Change Password**
   - Link to password change page

3. **Student Integrations** (Students only)
   - Third-party service connections

4. **Notification Preferences** (Coming Soon)
   - Email and push notification management

5. **Privacy Settings** (Coming Soon)
   - Profile visibility controls

6. **Delete Account**
   - Permanent account deletion

## Inline Editing System

### Features
- Click field to edit
- Auto-save on blur (150ms delay)
- Keyboard navigation (`Escape`, `Enter`)
- Visual feedback (focus states, loading indicators)
- Error handling with toast notifications

### Implementation Pattern
```typescript
const [isEditing, setIsEditing] = useState(false);
const [value, setValue] = useState(initialValue);

const handleBlur = async () => {
  setIsEditing(false);
  // 150ms delay before saving
  setTimeout(async () => {
    await updateProfile({ field: value });
  }, 150);
};
```

## Avatar Upload System

### Features
- Click-to-upload 160x160px circular avatar
- Hover effect shows upload overlay
- Auto-refresh profile after upload
- Default fallback: `/default-avatar.png`
- Integration with `getProfileImageUrl()` utility

### Upload Flow
```
1. User clicks avatar
2. File picker opens
3. User selects image
4. Upload to Supabase Storage
5. Update profile avatar_url
6. Refresh UserProfileContext
7. Avatar displays new image
```

## Profile Completeness Calculation

**Scoring** (0-100%):
- Avatar uploaded: +20%
- Bio filled: +15%
- Contact info complete: +15%
- Professional details filled: +30%
- Verification documents uploaded: +20%

**Display**:
- Progress bar in AccountCard
- Color-coded: Red (<30%), Yellow (30-70%), Green (>70%)

## Settings Categories

### Offer Free Help (v5.9)

**Purpose**: Tutors offer 30-minute free sessions to build reputation

**Toggle States**:
- **Online**: Accepting free help requests
- **Offline**: Not accepting free help requests

**API Integration**:
- Enable: `POST /api/presence/free-help/online`
- Disable: `POST /api/presence/free-help/offline`

**Database Field**: `available_free_help` (boolean)

## Integration Points

- **UserProfileContext**: Global profile state management
- **Supabase**: Direct database updates
- **Supabase Storage**: Avatar and document uploads
- **Onboarding**: Progress tracking
- **Hub Layout**: Consistent UI pattern
- **Free Help**: Real-time availability status

## UI Components Architecture

**Hub Layout**:
- `HubPageLayout` - Main container
- `HubHeader` - Top navigation
- `HubTabs` - Personal Info | Professional Info | Settings
- `HubSidebar` - AccountCard, Help, Tips, Video widgets

**Form Components**:
- `HubForm.Root`, `HubForm.Section`, `HubForm.Grid`, `HubForm.Field`
- `MultiSelectDropdown`, `DatePicker`, `CustomTimePicker`
- Shared inputs and buttons from design system

**Sidebar Widgets**:
1. `AccountCard` - Profile completeness (0-100%)
2. `AccountHelpWidget` - Account tips
3. `AccountTipWidget` - Security recommendations
4. `AccountVideoWidget` - Video tutorials
5. `AccountHeroHeader` - Profile display (avatar, name, role, score)

## Design System

**Colors**:
- Primary: `#006c67` (teal)
- Light teal header: `#E6F0F0`
- Border: `#e5e7eb`
- Text primary: `#1f2937`
- Text secondary: `#6b7280`

**Spacing**:
- `--space-1` to `--space-5` (4px to 40px)

**Border Radius**:
- `--radius-sm` (4px) to `--radius-lg` (12px)

**Responsive**:
- Settings grid: `repeat(auto-fill, minmax(300px, 1fr))`
- Mobile: Single column layout
- Avatar: 136px (desktop), scales responsively

## Recent Changes

### v5.9 - Free Help Feature
- Added "Offer Free Help" toggle in settings
- API endpoints for online/offline status
- Real-time presence tracking

### Professional Info Enhancements
- Expanded tutor form to 2000+ lines
- Added bio video field for CaaS integration
- Enhanced availability management with recurring periods
- Added unavailability period support

## User Roles

### All Roles
- Edit personal information
- Upload avatar
- Change password
- Delete account

### Tutors
- Professional qualifications
- Teaching experience
- Rates and availability
- Offer free help toggle
- DBS and verification documents

### Clients (Students)
- Learning goals
- Budget preferences
- Special needs
- Learning preferences

### Agents
- Agency information
- Commission rates
- Coverage areas
- Tutor capacity
- Certifications

## Status

- [x] Personal info form complete
- [x] Professional info forms (all roles)
- [x] Settings page structure
- [x] Inline editing system
- [x] Avatar upload
- [x] Profile completeness tracking
- [x] Free help toggle (v5.9)
- [ ] Notification preferences (coming soon)
- [ ] Privacy settings (coming soon)

---

**Last Updated**: 2025-12-12
**Version**: v5.9 (Free Help Support)
**Architecture**: Hub Layout with Role-Aware Forms
**For Questions**: See [account-implementation.md](./account-implementation.md)
