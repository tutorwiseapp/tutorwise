# Client Professional Info Form - Complete Specification

**Date:** 2025-10-27
**Status:** ✅ Implementation Complete
**Based on:** Week 2 Specification + SEN Support

---

## Overview

The Client Professional Info form collects comprehensive learning profile data to enable intelligent tutor-client matching. All fields are designed to align with tutor professional details for optimal matching engine performance.

---

## Field-to-Field Matching Matrix

| Client Field | Tutor Field | Matching Purpose |
|--------------|-------------|------------------|
| `subjects` (multi-select) | `subjects` (multi-select) | **Primary Match**: Direct subject overlap |
| `education_level` (select) | `key_stages` (multi-select) | **Level Match**: Tutor teaches client's level |
| `learning_goals` (multi-select) | N/A | **Intent Match**: Filters tutors by client goals |
| `special_needs` (multi-select) | `sen_experience` (future) | **SEN Match**: Tutors with SEN experience |
| `budget_range` (min-max) | `hourly_rate` | **Price Match**: Tutors within budget |
| `sessions_per_week` (select) | `availability` | **Frequency Match**: Tutor can accommodate |
| `session_duration` (select) | `session_types` | **Duration Match**: Tutor offers this length |
| `learning_preferences` (multi-select) | `teaching_style` (future) | **Style Match**: Teaching style alignment |
| `availability` (calendar) | `availability` (calendar) | **Schedule Match**: Overlapping time slots |

---

## Complete Field Specification

### 1. **Subjects** (Required)
**Field Name:** `subjects`
**Type:** Multi-select (minimum 1)
**Options:** 14 subjects (matches tutor subjects exactly)

```typescript
[
  'Mathematics',
  'English',
  'Science',
  'History',
  'Geography',
  'Languages',
  'Computer Science',
  'Physics',
  'Chemistry',
  'Biology',
  'Economics',
  'Business Studies',
  'Art & Design',
  'Music'
]
```

**Matching:** Direct overlap with tutor subjects
**UI:** Multi-select chips
**Database:** `professional_details.client.subjects: string[]`

---

### 2. **Education Level** (Required)
**Field Name:** `education_level`
**Type:** Single select
**Options:** 7 levels (maps to tutor key_stages)

```typescript
[
  'Primary Education (KS1-KS2) - Age 5 to 11',
  'Secondary Education (KS3) - Age 11 to 14',
  'Secondary Education (KS4) - Age 14 to 16',
  'A-Levels - Age 16 to 18',
  'University/Undergraduate',
  'Postgraduate',
  'Adult Education'
]
```

**Matching:** Client level must be in tutor's `key_stages` array
**UI:** Dropdown select
**Database:** `professional_details.client.education_level: string`

---

### 3. **Learning Goals** (Required)
**Field Name:** `learning_goals`
**Type:** Multi-select (minimum 1)
**Options:** 8 goals

```typescript
[
  'Improve grades',
  'Exam preparation',
  'Catch up on missed work',
  'Advanced learning',
  'Build confidence',
  'Homework help',
  'Career preparation',
  'Personal development'
]
```

**Matching:** Filters tutors by specialization/experience with these goals
**UI:** Multi-select chips
**Database:** `professional_details.client.learning_goals: string[]`

---

### 4. **Learning Preferences** (Optional)
**Field Name:** `learning_preferences`
**Type:** Multi-select
**Options:** 7 learning styles

```typescript
[
  'Visual learning',
  'Auditory learning',
  'Hands-on practice',
  'Group discussions',
  'One-on-one attention',
  'Structured lessons',
  'Flexible approach'
]
```

**Matching:** Aligns with tutor's teaching style (future)
**UI:** Multi-select chips
**Database:** `professional_details.client.learning_preferences: string[]`

---

### 5. **Special Educational Needs (SEN)** (Optional)
**Field Name:** `special_needs`
**Type:** Multi-select
**Options:** 12 SEN categories

```typescript
[
  'Dyslexia',
  'Dyscalculia',
  'ADHD',
  'Autism Spectrum Disorder (ASD)',
  'Dyspraxia',
  'Speech and Language Difficulties',
  'Visual Impairment',
  'Hearing Impairment',
  'Physical Disability',
  'English as Additional Language (EAL)',
  'Gifted and Talented',
  'Other'
]
```

**Matching:** Prioritizes tutors with SEN training/experience
**UI:** Multi-select chips
**Database:** `professional_details.client.special_needs: string[]`
**Importance:** Critical for vulnerable learners

---

### 6. **Budget Range** (Optional)
**Field Names:** `budget_min`, `budget_max`
**Type:** Number inputs (£/hour)
**Format:** Stored as `"min-max"` string (e.g., "25-50")

**Matching:** Filters tutors where `tutor.hourly_rate` falls within range
**UI:** Two number inputs side-by-side
**Database:** `professional_details.client.budget_range: string`
**Example:** "25-50" means £25-50/hour

---

### 7. **Sessions Per Week** (Optional)
**Field Name:** `sessions_per_week`
**Type:** Single select
**Options:** 5 frequency options

```typescript
[
  '1 session per week',
  '2 sessions per week',
  '3 sessions per week',
  '4 sessions per week',
  '5+ sessions per week'
]
```

**Matching:** Ensures tutor can accommodate desired frequency
**UI:** Dropdown select
**Database:** `professional_details.client.sessions_per_week: string`

---

### 8. **Session Duration** (Optional)
**Field Name:** `session_duration`
**Type:** Single select
**Options:** 4 duration options

```typescript
[
  '30 minutes',
  '1 hour',
  '1.5 hours',
  '2 hours'
]
```

**Matching:** Matches tutor's offered session types
**UI:** Dropdown select
**Database:** `professional_details.client.session_duration: string`

---

### 9. **Additional Information** (Optional)
**Field Name:** `additional_info`
**Type:** Textarea (free text)
**Max Length:** 1000 characters

**Matching:** Used for manual review, not algorithmic matching
**UI:** Textarea with character counter
**Database:** `professional_details.client.additional_info: string`

---

### 10. **Availability Calendar** ✅
**Field Name:** `availability`, `unavailability`
**Type:** Calendar widget (reusing tutor's superior design)
**Status:** ✅ **IMPLEMENTED** - Full calendar copied from tutor design

**Matching:** Finds overlapping time slots between client and tutor
**UI:** Calendar picker with recurring/one-time options
**Database:** `professional_details.client.availability: any`

---

## TypeScript Interface

```typescript
export interface ClientProfessionalInfo {
  // Required fields (minimum for matching)
  subjects: string[];                   // Min 1 - Primary matching field
  education_level: string;              // Required - Maps to tutor key_stages
  learning_goals: string[];             // Min 1 - Intent/goals matching

  // Optional enhancement fields
  learning_preferences: string[];       // Learning style preferences
  special_needs: string[];              // SEN requirements
  budget_range: string;                 // Format: "min-max" e.g., "25-50"
  sessions_per_week: string;            // Desired frequency
  session_duration: string;             // Preferred session length
  additional_info: string;              // Free text notes

  // Future fields
  availability?: any;                   // Available time slots
  unavailability?: any;                 // Unavailable periods
}
```

---

## Data Storage Structure

```json
{
  "professional_details": {
    "client": {
      "subjects": ["Mathematics", "Science"],
      "education_level": "Secondary Education (KS4) - Age 14 to 16",
      "learning_goals": ["Exam preparation", "Build confidence"],
      "learning_preferences": ["Visual learning", "One-on-one attention"],
      "special_needs": ["Dyslexia"],
      "budget_range": "30-45",
      "sessions_per_week": "2",
      "session_duration": "60",
      "additional_info": "Prefers afternoon sessions, visual learner",
      "availability": null,
      "unavailability": null
    }
  }
}
```

---

## Matching Engine Algorithm (Conceptual)

### Phase 1: Hard Filters
1. **Subject Match**: Tutor must teach at least one of client's subjects
2. **Level Match**: Tutor must teach client's education level
3. **Budget Match**: Tutor's rate must be within client's budget (if specified)

### Phase 2: Soft Scoring
1. **Subject Overlap**: +10 points per matching subject
2. **Goal Alignment**: +5 points per matching learning goal
3. **SEN Expertise**: +20 points if tutor has SEN experience and client needs it
4. **Availability Overlap**: +15 points per matching time slot
5. **Learning Style**: +5 points per matching preference

### Phase 3: Ranking
- Sort tutors by total score (descending)
- Apply diversity (different teaching styles)
- Apply distance/location preferences
- Return top 10-20 matches

---

## Mobile Optimization

All fields are fully responsive:
- **2-column layout on desktop**: Budget, Sessions/Duration
- **Single column on mobile**: All fields stack vertically
- **Touch-friendly**: Large tap targets for chips/buttons
- **Readable**: Font sizes scale appropriately
- **Form modules**: Use existing `ProfessionalInfoForm.module.css` responsive styles

---

## Implementation Status

✅ **Completed:**
- TypeScript interface updated (`ClientProfessionalInfo`)
- Form UI with all 10 fields implemented
- Comprehensive option lists (8 goals, 7 levels, 12 SEN options)
- Save/load logic for all fields
- Budget range min/max handling
- Mobile-responsive layout
- Field validation (required vs optional)
- **Availability/Unavailability calendar** - Full implementation copied from tutor design
  - Recurring and one-time availability periods
  - Day-of-week selection
  - Date range pickers
  - Time slot selection
  - Unavailability period blocking
  - Summary lists with remove functionality

📅 **Coming Soon:**
- Save availability/unavailability to database
- Matching engine algorithm implementation
- SEN tutor filtering
- Real-time tutor suggestions

---

## Testing Checklist

- [ ] Switch to client role in profile
- [ ] Fill out all required fields (subjects, level, goals)
- [ ] Add optional fields (preferences, SEN, budget)
- [ ] Save form and verify data persists
- [ ] Reload page and verify fields load correctly
- [ ] Test budget range min/max validation
- [ ] Test mobile responsiveness on phone
- [ ] Verify matching with tutor profiles

---

## Next Steps

1. **Test the form** by switching to client role
2. **Verify database schema** supports all fields
3. **Implement availability calendar** using tutor design
4. **Build matching engine** using this data
5. **Add tutor SEN field** to enable SEN matching

---

**Last Updated:** 2025-10-27
**Implementation:** [ProfessionalInfoForm.tsx](apps/web/src/app/components/profile/ProfessionalInfoForm.tsx)
**Type Definition:** [types/index.ts](apps/web/src/types/index.ts)
