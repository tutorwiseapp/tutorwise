# User Onboarding Flow Specification

## Document Information
- **Created**: September 29, 2025
- **Version**: 1.0
- **Status**: Draft
- **Related Documents**:
  - `role-management.md` - Core role management system
  - `role-management-implementation-plan.md` - Overall implementation strategy

## Executive Summary

This specification defines a comprehensive user onboarding flow for Tutorwise that guides users through role-specific setup when they become a client (seeker) or tutor (provider). The system is designed following UX best practices from leading platforms like Airbnb, emphasizing progressive disclosure, personalization, and value-first experiences.

## Problem Statement

### Current State
- Users can switch roles via `RoleSwitcher.tsx` but receive no guidance
- No information gathering about user needs, experience, or preferences
- No role-specific setup or personalization
- Missing opportunity to improve matching and recommendations

### User Pain Points
- **New seekers**: Don't know how to effectively find tutors
- **New providers**: Unclear how to set up their tutoring profile
- **All users**: Generic experience without personalization
- **Platform**: Suboptimal matching due to lack of user preferences

## Requirements

### Functional Requirements

#### FR1: Role Activation Flow
- **FR1.1**: User can initiate becoming a seeker (student) or provider (tutor)
- **FR1.2**: Clear value proposition presentation for each role
- **FR1.3**: Single-click activation with immediate onboarding start
- **FR1.4**: Integration with existing role management system

#### FR2: Progressive Information Gathering

**For Seekers (Students):**
- **FR2.1**: Subject areas of interest (multi-select with search)
- **FR2.2**: Current skill level assessment (beginner to advanced)
- **FR2.3**: Learning goals and objectives (structured options + free text)
- **FR2.4**: Preferred learning style (visual, auditory, kinesthetic, reading/writing)
- **FR2.5**: Budget range (sliding scale with market context)
- **FR2.6**: Scheduling preferences (interactive calendar widget)
- **FR2.7**: Previous tutoring experience (optional)

**For Providers (Tutors):**
- **FR2.8**: Subject expertise mapping (subjects + confidence levels)
- **FR2.9**: Teaching experience assessment (years + environments)
- **FR2.10**: Qualification upload and verification prompts
- **FR2.11**: Availability schedule setup (drag-and-drop calendar)
- **FR2.12**: Rate setting with market guidance
- **FR2.13**: Teaching methodology preferences
- **FR2.14**: Professional background and credentials

#### FR3: User Experience Features
- **FR3.1**: Multi-step process with clear progress indication
- **FR3.2**: Optional vs required information clearly marked
- **FR3.3**: Ability to skip non-essential steps
- **FR3.4**: Save progress between sessions
- **FR3.5**: Resume incomplete onboarding on role switch

#### FR4: Personalization & Recommendations
- **FR4.1**: Role-specific dashboard customization based on responses
- **FR4.2**: Personalized content and feature recommendations
- **FR4.3**: Smart matching suggestions using onboarding data
- **FR4.4**: Adaptive UI based on user preferences

### Non-Functional Requirements

#### NFR1: User Experience
- **NFR1.1**: Maximum 5-7 steps for essential onboarding
- **NFR1.2**: Mobile-responsive design (mobile-first approach)
- **NFR1.3**: < 3 minutes to complete core information
- **NFR1.4**: Engaging, conversational tone throughout
- **NFR1.5**: Smooth animations and transitions (< 300ms)

#### NFR2: Performance & Reliability
- **NFR2.1**: Real-time form validation and feedback
- **NFR2.2**: Offline capability for partial completion
- **NFR2.3**: Auto-save every 30 seconds
- **NFR2.4**: < 2 second load time for each step

#### NFR3: Data & Security
- **NFR3.1**: GDPR compliance for all data collection
- **NFR3.2**: Secure storage integration with existing Profile schema
- **NFR3.3**: Data encryption for sensitive information
- **NFR3.4**: Audit trail for onboarding completion

## Use Cases

### UC1: New User Becomes Student
**Primary Actor**: Unregistered user
**Goal**: Complete student onboarding to find tutors
**Preconditions**: User has valid email address
**Postconditions**: User has seeker role with personalized preferences

**Main Success Scenario:**
1. User lands on platform homepage
2. User clicks "Find a Tutor" CTA button
3. System presents authentication options (email/social login)
4. User completes registration/authentication
5. System initiates onboarding flow with welcome screen
6. User confirms role intent (seeker)
7. **Step 1**: Subject selection via visual grid with search
8. **Step 2**: Skill level assessment using interactive slider
9. **Step 3**: Learning goals selection (multiple choice + custom)
10. **Step 4**: Budget and scheduling preferences setup
11. **Step 5**: Profile completion (optional photo, bio)
12. System saves preferences and activates seeker role
13. User redirected to personalized dashboard with tutor recommendations
14. Optional guided tour of key platform features

**Alternative Flows:**
- **2a**: User already has account → Skip registration, go to step 5
- **7a**: User skips optional steps → System uses default values
- **9a**: User exits flow → System saves progress, allows resume later

### UC2: Existing User Becomes Tutor
**Primary Actor**: Registered user (existing agent or seeker)
**Goal**: Add provider role and complete tutor setup
**Preconditions**: User has verified account in good standing
**Postconditions**: User has provider role pending approval

**Main Success Scenario:**
1. User clicks "Become a Tutor" in role switcher dropdown
2. System performs eligibility check (account verification, standing)
3. System displays benefits overview and requirements
4. User confirms intent to proceed
5. **Step 1**: Subject expertise mapping with confidence levels
6. **Step 2**: Teaching experience assessment and validation
7. **Step 3**: Qualification upload with verification prompts
8. **Step 4**: Rate setting with market guidance and recommendations
9. **Step 5**: Availability setup using drag-and-drop calendar
10. **Step 6**: Enhanced profile creation (photo, bio, teaching philosophy)
11. System submits application for review
12. User redirected to provider dashboard with setup checklist
13. System sends confirmation email with next steps

**Alternative Flows:**
- **2a**: User fails eligibility → Show requirements and improvement path
- **11a**: Additional verification required → System prompts for documents

### UC3: Role Switch with Incomplete Onboarding
**Primary Actor**: Existing user with multiple roles
**Goal**: Complete setup for previously incomplete role
**Preconditions**: User has role but incomplete onboarding
**Postconditions**: Role onboarding completed, full functionality unlocked

**Main Success Scenario:**
1. User switches to role with incomplete onboarding
2. System detects missing onboarding data
3. System shows progress indicator and remaining steps
4. User chooses to complete now or later
5. If completing now: Resume from last completed step
6. User completes remaining requirements
7. System unlocks full role functionality
8. User sees role-specific features and recommendations

## Technical Specification

### Component Architecture

```
/apps/web/src/app/components/onboarding/
├── OnboardingFlow.tsx              // Main orchestrator component
├── providers/
│   └── OnboardingProvider.tsx      // Context for onboarding state
├── steps/
│   ├── RoleSelection.tsx           // Step 0: Role intent confirmation
│   ├── SubjectSelection.tsx        // Step 1: Subject areas
│   ├── SkillAssessment.tsx         // Step 2: Skill level evaluation
│   ├── GoalsAndPreferences.tsx     // Step 3: Learning/teaching goals
│   ├── SchedulingSetup.tsx         // Step 4: Availability and budget
│   └── ProfileCompletion.tsx       // Step 5: Enhanced profile
├── shared/
│   ├── ProgressIndicator.tsx       // Progress bar with step navigation
│   ├── StepNavigation.tsx          // Previous/Next/Skip buttons
│   ├── SkipConfirmation.tsx        // Modal for skipping important steps
│   └── SaveProgress.tsx            // Auto-save indicator
├── widgets/
│   ├── SubjectGrid.tsx            // Interactive subject selection grid
│   ├── SkillSlider.tsx            // Animated skill level slider
│   ├── BudgetRange.tsx            // Budget selection with market data
│   ├── CalendarWidget.tsx         // Availability scheduling interface
│   └── FileUpload.tsx             // Document upload for qualifications
└── completion/
    ├── SuccessScreen.tsx          // Completion celebration
    ├── DashboardPreview.tsx       // Preview of personalized features
    └── NextStepsGuide.tsx         // Guided tour initiation
```

### State Management

```typescript
interface OnboardingState {
  // Flow control
  currentStep: number;
  totalSteps: number;
  roleType: 'seeker' | 'provider';
  isComplete: boolean;
  canSkip: boolean;

  // User responses
  responses: {
    // Common fields
    subjects?: string[];
    skillLevel?: SkillLevel;
    goals?: string[];

    // Seeker-specific
    learningStyle?: LearningStyle;
    budget?: BudgetRange;
    schedule?: SchedulePreference[];
    previousExperience?: boolean;

    // Provider-specific
    teachingExperience?: TeachingExperience;
    qualifications?: Qualification[];
    availability?: AvailabilitySchedule;
    hourlyRate?: number;
    teachingMethodology?: string[];
    professionalBackground?: string;
  };

  // Progress tracking
  stepCompletion: Record<number, boolean>;
  lastSavedAt: Date;
  startedAt: Date;

  // Error handling
  errors: Record<string, string>;
  warnings: string[];
}

interface OnboardingContextType {
  state: OnboardingState;
  actions: {
    setCurrentStep: (step: number) => void;
    updateResponse: (key: string, value: any) => void;
    saveProgress: () => Promise<void>;
    completeOnboarding: () => Promise<void>;
    skipStep: (step: number) => void;
    resetOnboarding: () => void;
  };
}
```

### Database Schema Extensions

```sql
-- Extend existing profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed JSONB DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}';

-- New table for detailed role-specific information
CREATE TABLE IF NOT EXISTS role_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL CHECK (role_type IN ('seeker', 'provider', 'agent')),

  -- Common fields
  subjects TEXT[],
  skill_level TEXT,
  goals TEXT[],

  -- Seeker-specific fields
  learning_style TEXT,
  budget_min INTEGER,
  budget_max INTEGER,
  schedule_preferences JSONB,
  previous_tutoring_experience BOOLEAN,

  -- Provider-specific fields
  teaching_experience_years INTEGER,
  teaching_environments TEXT[],
  qualifications JSONB,
  availability_schedule JSONB,
  hourly_rate INTEGER,
  teaching_methodology TEXT[],
  professional_background TEXT,

  -- Metadata
  onboarding_completed_at TIMESTAMP WITH TIME ZONE,
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(profile_id, role_type)
);

-- Onboarding progress tracking
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL,
  current_step INTEGER DEFAULT 0,
  completed_steps INTEGER[] DEFAULT '{}',
  responses JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  UNIQUE(profile_id, role_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_role_details_profile_role ON role_details(profile_id, role_type);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_profile ON onboarding_progress(profile_id);
CREATE INDEX IF NOT EXISTS idx_role_details_subjects ON role_details USING GIN(subjects);
```

### API Endpoints

```typescript
// Onboarding management endpoints
interface OnboardingAPI {
  // Start new onboarding flow
  'POST /api/onboarding/start': {
    body: { roleType: 'seeker' | 'provider' };
    response: { sessionId: string; currentStep: number };
  };

  // Save progress
  'PUT /api/onboarding/progress': {
    body: {
      sessionId: string;
      step: number;
      responses: Record<string, any>
    };
    response: { success: boolean; nextStep?: number };
  };

  // Get current progress
  'GET /api/onboarding/progress/:roleType': {
    response: OnboardingState;
  };

  // Complete onboarding
  'POST /api/onboarding/complete': {
    body: { sessionId: string; roleType: string };
    response: {
      success: boolean;
      roleActivated: boolean;
      redirectUrl: string;
    };
  };

  // Get role-specific recommendations
  'GET /api/onboarding/recommendations/:roleType': {
    response: {
      subjects: string[];
      budgetSuggestions: BudgetRange;
      popularGoals: string[];
    };
  };
}
```

### Integration Points

#### 1. UserProfileContext Integration
```typescript
// Enhanced context to include onboarding state
interface UserProfileContextType {
  // ... existing properties
  onboardingStatus: Record<string, 'not_started' | 'in_progress' | 'completed'>;
  startOnboarding: (roleType: string) => Promise<void>;
  resumeOnboarding: (roleType: string) => Promise<void>;
}
```

#### 2. Role Switcher Integration
```typescript
// Updated role switcher to detect incomplete onboarding
const handleRoleSwitch = async (role: UserRole) => {
  await switchRole(role);

  // Check if onboarding is incomplete
  if (onboardingStatus[role] !== 'completed') {
    router.push(`/onboarding/${role}/resume`);
  } else {
    router.push('/dashboard');
  }
};
```

#### 3. Dashboard Integration
```typescript
// Dashboard shows onboarding completion status
const DashboardHeader = () => {
  const { onboardingStatus, activeRole } = useUserProfile();
  const isOnboardingComplete = onboardingStatus[activeRole] === 'completed';

  return (
    <div>
      {!isOnboardingComplete && (
        <OnboardingPrompt roleType={activeRole} />
      )}
      {/* ... rest of dashboard */}
    </div>
  );
};
```

## UX Flow Design

### Step-by-Step User Journey

#### Welcome & Role Confirmation
```
┌─────────────────────────────────────┐
│  Welcome to Tutorwise! 🎯          │
│                                     │
│  You're about to become a [Student] │
│                                     │
│  This quick setup will help us:     │
│  ✓ Find perfect tutors for you      │
│  ✓ Personalize your experience      │
│  ✓ Save you time in your search     │
│                                     │
│  [Let's Get Started] [Not Now]      │
└─────────────────────────────────────┘
```

#### Subject Selection (Visual Grid)
```
┌─────────────────────────────────────┐
│  What would you like to learn? 📚   │
│                                     │
│  [🔍 Search subjects...]            │
│                                     │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐    │
│  │Math │ │Eng  │ │Sci  │ │Hist │    │
│  │✓    │ │     │ │✓    │ │     │    │
│  └─────┘ └─────┘ └─────┘ └─────┘    │
│                                     │
│  [+ Add Custom Subject]             │
│                                     │
│  Progress: ████▓▓▓ 2/5              │
│  [← Back]              [Continue →] │
└─────────────────────────────────────┘
```

#### Skill Level Assessment
```
┌─────────────────────────────────────┐
│  What's your current level? 📊      │
│                                     │
│  Math:                              │
│  ●────●────●────●────○ Advanced     │
│  Beginner   Intermediate            │
│                                     │
│  Science:                           │
│  ●────●────○────○────○ Intermediate │
│  Beginner         Advanced          │
│                                     │
│  💡 Don't worry - we'll find tutors │
│     who match your level perfectly! │
│                                     │
│  Progress: ████████▓ 4/5            │
│  [← Back]              [Continue →] │
└─────────────────────────────────────┘
```

### Progressive Disclosure Pattern
- **Step 1**: Essential information only (subjects)
- **Step 2**: Add context (skill levels)
- **Step 3**: Personalization (goals, preferences)
- **Step 4**: Practical setup (budget, schedule)
- **Step 5**: Profile enhancement (optional)

### Responsive Design Considerations
- **Mobile**: Single-column layout, larger touch targets
- **Tablet**: Two-column where appropriate, preserved spacing
- **Desktop**: Optimized for efficiency with keyboard navigation

## Success Metrics

### Primary KPIs
1. **Completion Rate**: % of users who complete full onboarding
   - Target: >75% for essential steps
   - Target: >50% for complete onboarding

2. **Time to Complete**: Average time for full onboarding
   - Target: <5 minutes for essential steps
   - Target: <8 minutes for complete onboarding

3. **User Engagement**: Post-onboarding platform usage
   - Target: >60% of users complete first role-specific action within 24h
   - Target: >40% become active users (3+ sessions per week)

### Secondary Metrics
4. **Step-by-Step Drop-off**: Identify optimization opportunities
5. **Skip Rates**: Which optional steps are most commonly skipped
6. **Data Quality**: Completeness and usefulness of collected information
7. **User Satisfaction**: Post-onboarding survey scores (>4.0/5.0)

### Business Impact Metrics
8. **Matching Effectiveness**: Improved tutor-student matching accuracy
9. **User Retention**: Onboarded vs non-onboarded user retention rates
10. **Platform Growth**: Role adoption rates and user expansion

## Implementation Phases

### Phase 1: MVP Onboarding (Week 1-2)
**Goal**: Basic functional onboarding flow

**Deliverables**:
- Core component structure
- Essential data collection (subjects, skill level)
- Basic progress saving
- Integration with existing role system

**Success Criteria**:
- Users can complete basic onboarding
- Data saves correctly to database
- Role activation works properly

### Phase 2: Enhanced UX (Week 3-4)
**Goal**: Polished user experience with full feature set

**Deliverables**:
- All onboarding steps implemented
- Interactive widgets and animations
- Mobile-responsive design
- Skip functionality and progress resume

**Success Criteria**:
- >60% completion rate
- <5 minute average completion time
- Positive user feedback

### Phase 3: Personalization (Week 5-6)
**Goal**: Smart recommendations and adaptive experience

**Deliverables**:
- Personalized dashboard setup
- Smart matching suggestions
- Adaptive content recommendations
- Analytics integration

**Success Criteria**:
- Improved matching accuracy
- Increased user engagement
- Reduced time to first booking/listing

### Phase 4: Optimization (Week 7-8)
**Goal**: Performance optimization and feature refinement

**Deliverables**:
- A/B testing implementation
- Performance optimizations
- Advanced analytics
- Documentation and training

**Success Criteria**:
- >75% completion rate
- <3 minute essential onboarding time
- Platform-wide engagement improvement

## Testing Strategy

### Unit Testing
- Component behavior testing
- State management validation
- Form validation logic
- Data persistence functions

### Integration Testing
- Full onboarding flow end-to-end
- Role system integration
- Database operations
- API endpoint functionality

### User Acceptance Testing
- Usability testing with target users
- Accessibility compliance verification
- Cross-device compatibility
- Performance testing

### A/B Testing Opportunities
- Step order optimization
- Question phrasing variations
- Visual design alternatives
- Progress indicator styles

## Risks and Mitigation

### Technical Risks
1. **Risk**: Complex state management across multiple steps
   - **Mitigation**: Robust context architecture with persistence

2. **Risk**: Performance issues with large subject datasets
   - **Mitigation**: Virtualization and search optimization

3. **Risk**: Mobile experience challenges
   - **Mitigation**: Mobile-first design approach

### User Experience Risks
1. **Risk**: High abandonment rates
   - **Mitigation**: Progressive disclosure and skip options

2. **Risk**: Information overload
   - **Mitigation**: Careful question prioritization and chunking

3. **Risk**: Lack of clear value proposition
   - **Mitigation**: Benefits explanation at each step

### Business Risks
1. **Risk**: Low adoption of onboarding feature
   - **Mitigation**: Incentives and clear value demonstration

2. **Risk**: Poor data quality from hurried completion
   - **Mitigation**: Smart defaults and validation

## Future Enhancements

### Phase 2 Considerations
- **AI-Powered Recommendations**: Machine learning for adaptive questioning
- **Social Proof Integration**: Show popular choices and success stories
- **Video Introductions**: Allow users to record video profiles
- **Skill Verification**: Integration with testing platforms
- **Advanced Matching**: Enhanced algorithm based on onboarding data

### Long-term Vision
- **Multi-language Support**: Internationalization for global expansion
- **Advanced Analytics**: Detailed user journey analytics
- **Gamification**: Achievement system for profile completion
- **Integration Ecosystem**: Third-party integrations for qualifications
- **White-label Solution**: Onboarding system for partner platforms

---

This specification provides a comprehensive foundation for implementing the user onboarding flow that will significantly enhance the Tutorwise user experience and improve platform engagement metrics.