# Onboarding Implementation Guide

## Document Information
- **Created**: September 29, 2025
- **Version**: 1.0
- **Status**: Draft
- **Related Documents**:
  - `user-onboarding-flow-specification.md` - Requirements and specifications
  - `onboarding-ux-design.md` - Design and UX guidelines
  - `role-management-implementation-plan.md` - Overall project plan

## Overview

This guide provides detailed technical implementation instructions for the user onboarding flow system. It includes code examples, architecture patterns, and integration steps with the existing Tutorwise codebase.

## Prerequisites

### Existing System Integration Points
- **UserProfileContext**: `/apps/web/src/app/contexts/UserProfileContext.tsx`
- **RoleSwitcher**: `/apps/web/src/app/components/layout/RoleSwitcher.tsx`
- **Database Schema**: Supabase with existing `profiles` table
- **Type Definitions**: `/apps/web/src/types/index.ts`

### Required Dependencies
```json
{
  "react": "^18.0.0",
  "react-hook-form": "^7.45.0",
  "zod": "^3.22.0",
  "@hookform/resolvers": "^3.3.0",
  "framer-motion": "^10.16.0",
  "zustand": "^4.4.0"
}
```

## Architecture Overview

### Component Hierarchy
```
OnboardingFlow (Container)
├── OnboardingProvider (Context)
├── ProgressIndicator (Shared)
├── StepContainer (Layout)
│   ├── RoleSelection (Step 0)
│   ├── SubjectSelection (Step 1)
│   ├── SkillAssessment (Step 2)
│   ├── GoalsAndPreferences (Step 3)
│   ├── SchedulingSetup (Step 4)
│   └── ProfileCompletion (Step 5)
├── StepNavigation (Shared)
└── CompletionScreen (Final)
```

### State Management Architecture
```
OnboardingProvider (Zustand Store)
├── Flow State (current step, progress)
├── Form Data (user responses)
├── Validation State (errors, warnings)
├── Persistence (auto-save, resume)
└── Integration (role activation)
```

## Implementation Steps

### Phase 1: Core Infrastructure

#### 1.1 Database Schema Setup

```sql
-- Create migration file: 001_add_onboarding_tables.sql

-- Extend profiles table for onboarding tracking
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_completed JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS onboarding_progress JSONB DEFAULT '{}';

-- Create role-specific details table
CREATE TABLE IF NOT EXISTS role_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL CHECK (role_type IN ('seeker', 'provider', 'agent')),

  -- Common fields
  subjects TEXT[] DEFAULT '{}',
  skill_levels JSONB DEFAULT '{}',
  goals TEXT[] DEFAULT '{}',

  -- Seeker-specific
  learning_style TEXT,
  budget_range JSONB,
  schedule_preferences JSONB,
  previous_experience BOOLEAN DEFAULT false,

  -- Provider-specific
  teaching_experience JSONB,
  qualifications JSONB DEFAULT '{}',
  availability JSONB,
  hourly_rate INTEGER,
  teaching_methods TEXT[] DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  UNIQUE(profile_id, role_type)
);

-- Create indexes
CREATE INDEX idx_role_details_profile ON role_details(profile_id);
CREATE INDEX idx_role_details_role ON role_details(role_type);
CREATE INDEX idx_role_details_subjects ON role_details USING GIN(subjects);

-- Progress tracking table
CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL,
  current_step INTEGER DEFAULT 0,
  responses JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  UNIQUE(profile_id, role_type)
);
```

#### 1.2 Type Definitions

```typescript
// apps/web/src/types/onboarding.ts
export interface OnboardingState {
  // Flow control
  currentStep: number;
  totalSteps: number;
  roleType: 'seeker' | 'provider';
  isComplete: boolean;
  sessionId?: string;

  // Form data
  responses: OnboardingResponses;

  // Progress tracking
  stepCompletion: Record<number, boolean>;
  errors: Record<string, string>;

  // Metadata
  startedAt: Date;
  lastSavedAt?: Date;
}

export interface OnboardingResponses {
  // Common fields
  subjects?: string[];
  skillLevels?: Record<string, number>;
  goals?: string[];

  // Seeker-specific
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  budgetRange?: { min: number; max: number };
  schedulePreferences?: {
    days: string[];
    times: string[];
    format: 'online' | 'in-person' | 'both';
  };
  previousExperience?: boolean;

  // Provider-specific
  teachingExperience?: {
    years: number;
    environments: string[];
    ageGroups: string[];
  };
  qualifications?: Array<{
    title: string;
    institution: string;
    year: number;
    verified: boolean;
  }>;
  availability?: Record<string, string[]>;
  hourlyRate?: number;
  teachingMethods?: string[];

  // Profile enhancement
  bio?: string;
  photoUrl?: string;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<StepProps>;
  isRequired: boolean;
  canSkip: boolean;
  validationSchema: any; // Zod schema
}

export interface StepProps {
  data: OnboardingResponses;
  onUpdate: (updates: Partial<OnboardingResponses>) => void;
  onNext: () => void;
  onPrevious: () => void;
  errors: Record<string, string>;
}
```

#### 1.3 Onboarding Provider (Zustand Store)

```typescript
// apps/web/src/stores/onboardingStore.ts
import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import type { OnboardingState, OnboardingResponses } from '@/types/onboarding';

interface OnboardingActions {
  // Flow control
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;

  // Data management
  updateResponses: (updates: Partial<OnboardingResponses>) => void;
  setError: (field: string, message: string) => void;
  clearError: (field: string) => void;

  // Persistence
  saveProgress: () => Promise<void>;
  loadProgress: (profileId: string, roleType: string) => Promise<void>;

  // Completion
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => void;
}

interface OnboardingStore extends OnboardingState, OnboardingActions {}

export const useOnboardingStore = create<OnboardingStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state
        currentStep: 0,
        totalSteps: 6,
        roleType: 'seeker',
        isComplete: false,
        responses: {},
        stepCompletion: {},
        errors: {},
        startedAt: new Date(),

        // Actions
        setCurrentStep: (step) =>
          set({ currentStep: Math.max(0, Math.min(step, get().totalSteps - 1)) }),

        nextStep: () => {
          const { currentStep, totalSteps } = get();
          if (currentStep < totalSteps - 1) {
            set({
              currentStep: currentStep + 1,
              stepCompletion: { ...get().stepCompletion, [currentStep]: true }
            });
            get().saveProgress();
          }
        },

        previousStep: () => {
          const { currentStep } = get();
          if (currentStep > 0) {
            set({ currentStep: currentStep - 1 });
          }
        },

        updateResponses: (updates) =>
          set((state) => ({
            responses: { ...state.responses, ...updates },
            lastSavedAt: new Date()
          })),

        setError: (field, message) =>
          set((state) => ({
            errors: { ...state.errors, [field]: message }
          })),

        clearError: (field) =>
          set((state) => {
            const { [field]: removed, ...rest } = state.errors;
            return { errors: rest };
          }),

        saveProgress: async () => {
          const state = get();
          try {
            await fetch('/api/onboarding/progress', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: state.sessionId,
                currentStep: state.currentStep,
                responses: state.responses,
                stepCompletion: state.stepCompletion
              })
            });
            set({ lastSavedAt: new Date() });
          } catch (error) {
            console.error('Failed to save onboarding progress:', error);
          }
        },

        loadProgress: async (profileId, roleType) => {
          try {
            const response = await fetch(`/api/onboarding/progress/${roleType}`);
            if (response.ok) {
              const data = await response.json();
              set({
                ...data,
                roleType,
                startedAt: new Date(data.startedAt)
              });
            }
          } catch (error) {
            console.error('Failed to load onboarding progress:', error);
          }
        },

        completeOnboarding: async () => {
          const state = get();
          try {
            const response = await fetch('/api/onboarding/complete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: state.sessionId,
                roleType: state.roleType,
                responses: state.responses
              })
            });

            if (response.ok) {
              set({ isComplete: true });
              return response.json();
            }
          } catch (error) {
            console.error('Failed to complete onboarding:', error);
            throw error;
          }
        },

        resetOnboarding: () =>
          set({
            currentStep: 0,
            isComplete: false,
            responses: {},
            stepCompletion: {},
            errors: {},
            startedAt: new Date(),
            lastSavedAt: undefined,
            sessionId: undefined
          })
      }),
      {
        name: 'onboarding-storage',
        partialize: (state) => ({
          currentStep: state.currentStep,
          responses: state.responses,
          stepCompletion: state.stepCompletion,
          startedAt: state.startedAt,
          roleType: state.roleType
        })
      }
    )
  )
);

// Auto-save subscription
useOnboardingStore.subscribe(
  (state) => state.responses,
  () => {
    const { saveProgress, isComplete } = useOnboardingStore.getState();
    if (!isComplete) {
      // Debounced auto-save
      setTimeout(saveProgress, 1000);
    }
  }
);
```

#### 1.4 Main Onboarding Flow Component

```typescript
// apps/web/src/app/components/onboarding/OnboardingFlow.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useUserProfile } from '@/app/contexts/UserProfileContext';

// Step components
import { RoleSelection } from './steps/RoleSelection';
import { SubjectSelection } from './steps/SubjectSelection';
import { SkillAssessment } from './steps/SkillAssessment';
import { GoalsAndPreferences } from './steps/GoalsAndPreferences';
import { SchedulingSetup } from './steps/SchedulingSetup';
import { ProfileCompletion } from './steps/ProfileCompletion';
import { CompletionScreen } from './steps/CompletionScreen';

// Shared components
import { ProgressIndicator } from './shared/ProgressIndicator';
import { StepNavigation } from './shared/StepNavigation';

const ONBOARDING_STEPS = [
  {
    id: 'role-selection',
    title: 'Welcome',
    component: RoleSelection,
    isRequired: true,
    canSkip: false
  },
  {
    id: 'subject-selection',
    title: 'Subjects',
    component: SubjectSelection,
    isRequired: true,
    canSkip: false
  },
  {
    id: 'skill-assessment',
    title: 'Your Level',
    component: SkillAssessment,
    isRequired: true,
    canSkip: false
  },
  {
    id: 'goals-preferences',
    title: 'Goals',
    component: GoalsAndPreferences,
    isRequired: false,
    canSkip: true
  },
  {
    id: 'scheduling-setup',
    title: 'Schedule & Budget',
    component: SchedulingSetup,
    isRequired: false,
    canSkip: true
  },
  {
    id: 'profile-completion',
    title: 'Profile',
    component: ProfileCompletion,
    isRequired: false,
    canSkip: true
  }
];

interface OnboardingFlowProps {
  roleType: 'seeker' | 'provider';
  onComplete?: (data: any) => void;
  onExit?: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  roleType,
  onComplete,
  onExit
}) => {
  const router = useRouter();
  const { profile } = useUserProfile();
  const {
    currentStep,
    totalSteps,
    responses,
    errors,
    isComplete,
    setCurrentStep,
    nextStep,
    previousStep,
    updateResponses,
    loadProgress,
    completeOnboarding,
    resetOnboarding
  } = useOnboardingStore();

  // Load existing progress on mount
  useEffect(() => {
    if (profile?.id) {
      loadProgress(profile.id, roleType);
    }
  }, [profile?.id, roleType, loadProgress]);

  // Handle completion
  useEffect(() => {
    if (isComplete) {
      onComplete?.(responses);
    }
  }, [isComplete, responses, onComplete]);

  const handleStepComplete = async () => {
    if (currentStep === ONBOARDING_STEPS.length - 1) {
      try {
        const result = await completeOnboarding();
        router.push(result.redirectUrl || '/dashboard');
      } catch (error) {
        console.error('Failed to complete onboarding:', error);
      }
    } else {
      nextStep();
    }
  };

  const handleExit = () => {
    if (onExit) {
      onExit();
    } else {
      router.push('/dashboard');
    }
  };

  const currentStepConfig = ONBOARDING_STEPS[currentStep];
  const CurrentStepComponent = currentStepConfig?.component;

  if (isComplete) {
    return <CompletionScreen roleType={roleType} responses={responses} />;
  }

  return (
    <div className="onboarding-container min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={previousStep}
              disabled={currentStep === 0}
              className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              ← Back
            </button>

            <div className="text-center">
              <h1 className="text-lg font-semibold text-gray-900">
                {currentStepConfig?.title}
              </h1>
            </div>

            <button
              onClick={handleExit}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <ProgressIndicator
            currentStep={currentStep}
            totalSteps={totalSteps}
            className="mt-4"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {CurrentStepComponent && (
              <CurrentStepComponent
                data={responses}
                onUpdate={updateResponses}
                onNext={handleStepComplete}
                onPrevious={previousStep}
                errors={errors}
                roleType={roleType}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <StepNavigation
            currentStep={currentStep}
            totalSteps={totalSteps}
            canSkip={currentStepConfig?.canSkip}
            onNext={handleStepComplete}
            onPrevious={previousStep}
            onSkip={nextStep}
            isLastStep={currentStep === ONBOARDING_STEPS.length - 1}
          />
        </div>
      </footer>
    </div>
  );
};
```

### Phase 2: Step Components

#### 2.1 Subject Selection Component

```typescript
// apps/web/src/app/components/onboarding/steps/SubjectSelection.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { StepProps } from '@/types/onboarding';

const POPULAR_SUBJECTS = [
  { id: 'math', name: 'Mathematics', icon: '📊', category: 'STEM' },
  { id: 'science', name: 'Science', icon: '🧪', category: 'STEM' },
  { id: 'english', name: 'English', icon: '📚', category: 'Languages' },
  { id: 'history', name: 'History', icon: '🌍', category: 'Humanities' },
  { id: 'coding', name: 'Programming', icon: '💻', category: 'Technology' },
  { id: 'art', name: 'Art & Design', icon: '🎨', category: 'Creative' },
  { id: 'languages', name: 'Languages', icon: '🗣️', category: 'Languages' },
  { id: 'music', name: 'Music', icon: '🎵', category: 'Creative' },
  { id: 'business', name: 'Business', icon: '💼', category: 'Professional' },
  { id: 'sports', name: 'Sports & Fitness', icon: '⚽', category: 'Physical' }
];

interface SubjectSelectionProps extends StepProps {
  roleType: 'seeker' | 'provider';
}

export const SubjectSelection: React.FC<SubjectSelectionProps> = ({
  data,
  onUpdate,
  onNext,
  errors,
  roleType
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
    data.subjects || []
  );

  const filteredSubjects = useMemo(() => {
    if (!searchTerm) return POPULAR_SUBJECTS;
    return POPULAR_SUBJECTS.filter(subject =>
      subject.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const handleSubjectToggle = (subjectId: string) => {
    const updated = selectedSubjects.includes(subjectId)
      ? selectedSubjects.filter(id => id !== subjectId)
      : [...selectedSubjects, subjectId];

    setSelectedSubjects(updated);
    onUpdate({ subjects: updated });
  };

  const handleAddCustomSubject = () => {
    if (customSubject.trim() && !selectedSubjects.includes(customSubject)) {
      const updated = [...selectedSubjects, customSubject.trim()];
      setSelectedSubjects(updated);
      onUpdate({ subjects: updated });
      setCustomSubject('');
    }
  };

  const handleContinue = () => {
    if (selectedSubjects.length === 0) {
      // Handle validation error
      return;
    }
    onNext();
  };

  const title = roleType === 'seeker'
    ? "What would you like to learn?"
    : "What subjects do you teach?";

  const subtitle = roleType === 'seeker'
    ? "Select all subjects that interest you. You can learn multiple subjects with different tutors."
    : "Select your areas of expertise. You can add more subjects later as you expand your teaching.";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">{title}</h2>
        <p className="text-lg text-gray-600">{subtitle}</p>
      </div>

      {/* Search */}
      <div className="mb-8">
        <div className="relative">
          <input
            type="text"
            placeholder="🔍 Search subjects... (Math, Science, English...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Subject Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {filteredSubjects.map((subject) => (
          <motion.button
            key={subject.id}
            type="button"
            onClick={() => handleSubjectToggle(subject.id)}
            className={`
              relative p-4 border-2 rounded-lg transition-all duration-200
              ${selectedSubjects.includes(subject.id)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }
            `}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {selectedSubjects.includes(subject.id) && (
              <div className="absolute top-2 right-2 text-blue-500 text-sm">
                ✓
              </div>
            )}

            <div className="text-2xl mb-2">{subject.icon}</div>
            <div className="text-sm font-medium text-gray-900">
              {subject.name}
            </div>
          </motion.button>
        ))}
      </div>

      {/* Custom Subject Input */}
      <div className="mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add a custom subject..."
            value={customSubject}
            onChange={(e) => setCustomSubject(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddCustomSubject()}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleAddCustomSubject}
            disabled={!customSubject.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      {/* Selected Subjects Summary */}
      {selectedSubjects.length > 0 && (
        <div className="mb-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">
            Selected Subjects ({selectedSubjects.length}):
          </h3>
          <div className="flex flex-wrap gap-2">
            {selectedSubjects.map((subjectId) => {
              const subject = POPULAR_SUBJECTS.find(s => s.id === subjectId);
              return (
                <span
                  key={subjectId}
                  className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {subject?.name || subjectId}
                  <button
                    type="button"
                    onClick={() => handleSubjectToggle(subjectId)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Validation Error */}
      {errors.subjects && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{errors.subjects}</p>
        </div>
      )}

      {/* Continue Button */}
      <div className="text-center">
        <button
          type="button"
          onClick={handleContinue}
          disabled={selectedSubjects.length === 0}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue →
        </button>
      </div>
    </div>
  );
};
```

#### 2.2 Shared Components

```typescript
// apps/web/src/app/components/onboarding/shared/ProgressIndicator.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  className = ''
}) => {
  const progress = (currentStep / (totalSteps - 1)) * 100;

  return (
    <div className={`flex items-center ${className}`}>
      {/* Progress Bar */}
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden mr-4">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Step Counter */}
      <div className="text-sm font-medium text-gray-600 whitespace-nowrap">
        {currentStep + 1} of {totalSteps}
      </div>
    </div>
  );
};
```

```typescript
// apps/web/src/app/components/onboarding/shared/StepNavigation.tsx
'use client';

import React from 'react';

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  canSkip?: boolean;
  isLastStep?: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  previousLabel?: string;
}

export const StepNavigation: React.FC<StepNavigationProps> = ({
  currentStep,
  totalSteps,
  canSkip = false,
  isLastStep = false,
  onNext,
  onPrevious,
  onSkip,
  nextLabel,
  previousLabel
}) => {
  return (
    <div className="flex items-center justify-between">
      {/* Previous Button */}
      <button
        type="button"
        onClick={onPrevious}
        disabled={currentStep === 0}
        className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {previousLabel || '← Back'}
      </button>

      {/* Skip Button (if applicable) */}
      <div className="flex items-center gap-4">
        {canSkip && onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="px-4 py-2 text-gray-500 hover:text-gray-700"
          >
            Skip for now
          </button>
        )}

        {/* Next/Complete Button */}
        <button
          type="button"
          onClick={onNext}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
        >
          {nextLabel || (isLastStep ? 'Complete Setup' : 'Continue →')}
        </button>
      </div>
    </div>
  );
};
```

### Phase 3: API Integration

#### 3.1 API Routes

```typescript
// apps/web/src/app/api/onboarding/start/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = createClient();

  try {
    const { roleType } = await request.json();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create or update onboarding session
    const { data, error } = await supabase
      .from('onboarding_sessions')
      .upsert({
        profile_id: user.id,
        role_type: roleType,
        current_step: 0,
        responses: {},
        started_at: new Date().toISOString(),
        last_active: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      sessionId: data.id,
      currentStep: 0,
      roleType
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

```typescript
// apps/web/src/app/api/onboarding/progress/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  const supabase = createClient();

  try {
    const { sessionId, currentStep, responses, stepCompletion } = await request.json();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('onboarding_sessions')
      .update({
        current_step: currentStep,
        responses,
        last_active: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('profile_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const roleType = searchParams.get('roleType');

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('onboarding_sessions')
      .select('*')
      .eq('profile_id', user.id)
      .eq('role_type', roleType)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

```typescript
// apps/web/src/app/api/onboarding/complete/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = createClient();

  try {
    const { sessionId, roleType, responses } = await request.json();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Start transaction
    const { error: sessionError } = await supabase
      .from('onboarding_sessions')
      .update({
        completed_at: new Date().toISOString(),
        current_step: -1 // Mark as completed
      })
      .eq('id', sessionId);

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 400 });
    }

    // Create role details record
    const { error: roleError } = await supabase
      .from('role_details')
      .upsert({
        profile_id: user.id,
        role_type: roleType,
        subjects: responses.subjects || [],
        skill_levels: responses.skillLevels || {},
        goals: responses.goals || [],
        learning_style: responses.learningStyle,
        budget_range: responses.budgetRange,
        schedule_preferences: responses.schedulePreferences,
        previous_experience: responses.previousExperience || false,
        // Provider fields
        teaching_experience: responses.teachingExperience,
        qualifications: responses.qualifications || {},
        availability: responses.availability,
        hourly_rate: responses.hourlyRate,
        teaching_methods: responses.teachingMethods || [],
        completed_at: new Date().toISOString()
      });

    if (roleError) {
      return NextResponse.json({ error: roleError.message }, { status: 400 });
    }

    // Update profile roles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('roles')
      .eq('id', user.id)
      .single();

    if (!profileError && profile) {
      const currentRoles = profile.roles || [];
      if (!currentRoles.includes(roleType)) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            roles: [...currentRoles, roleType],
            onboarding_completed: {
              ...profile.onboarding_completed,
              [roleType]: new Date().toISOString()
            }
          })
          .eq('id', user.id);

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 400 });
        }
      }
    }

    return NextResponse.json({
      success: true,
      roleActivated: true,
      redirectUrl: '/dashboard'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Phase 4: Integration Points

#### 4.1 Update UserProfileContext

```typescript
// Extend existing UserProfileContext.tsx
interface UserProfileContextType {
  // ... existing properties

  // Add onboarding status
  onboardingStatus: Record<string, 'not_started' | 'in_progress' | 'completed'>;
  startOnboarding: (roleType: string) => Promise<void>;
  resumeOnboarding: (roleType: string) => Promise<void>;

  // Enhanced role switching
  switchRole: (role: 'agent' | 'seeker' | 'provider') => Promise<void>;
}

// Add to UserProfileProvider component
const [onboardingStatus, setOnboardingStatus] = useState<Record<string, string>>({});

const checkOnboardingStatus = useCallback(async (profileData: Profile) => {
  if (!profileData.id) return;

  const status: Record<string, string> = {};

  for (const role of profileData.roles) {
    try {
      const response = await fetch(`/api/onboarding/progress?roleType=${role}`);
      if (response.ok) {
        const data = await response.json();
        status[role] = data.completed_at ? 'completed' : 'in_progress';
      } else {
        status[role] = 'not_started';
      }
    } catch {
      status[role] = 'not_started';
    }
  }

  setOnboardingStatus(status);
}, []);

const startOnboarding = useCallback(async (roleType: string) => {
  try {
    const response = await fetch('/api/onboarding/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleType })
    });

    if (response.ok) {
      router.push(`/onboarding/${roleType}`);
    }
  } catch (error) {
    console.error('Failed to start onboarding:', error);
  }
}, [router]);

const resumeOnboarding = useCallback(async (roleType: string) => {
  router.push(`/onboarding/${roleType}/resume`);
}, [router]);

// Enhanced role switching with onboarding check
const switchRole = useCallback(async (role: 'agent' | 'seeker' | 'provider') => {
  if (!profile || !profile.roles.includes(role)) {
    throw new Error(`User does not have access to role: ${role}`);
  }

  setIsRoleSwitching(true);
  try {
    localStorage.setItem('activeRole', role);
    await updateRolePreferences({ lastActiveRole: role });
    setActiveRole(role);

    // Check if onboarding is incomplete
    if (onboardingStatus[role] !== 'completed') {
      router.push(`/onboarding/${role}/resume`);
    }
  } catch (error) {
    console.error('Error switching role:', error);
    throw error;
  } finally {
    setIsRoleSwitching(false);
  }
}, [profile, onboardingStatus, updateRolePreferences, router]);
```

#### 4.2 Update RoleSwitcher Component

```typescript
// Update existing RoleSwitcher.tsx
const { onboardingStatus, startOnboarding } = useUserProfile();

const handleBecomeRole = async (role: 'seeker' | 'provider') => {
  try {
    await startOnboarding(role);
  } catch (error) {
    console.error('Failed to start onboarding:', error);
  }
};

// Add onboarding prompts in dropdown
{availableRoles.map((role) => {
  const config = roleConfig[role];
  const needsOnboarding = onboardingStatus[role] !== 'completed';

  return (
    <button
      key={role}
      type="button"
      className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-50 transition-colors ${
        needsOnboarding ? 'text-orange-600' : ''
      }`}
      onClick={() => handleRoleSwitch(role)}
      disabled={isRoleSwitching}
    >
      {config.label}
      {needsOnboarding && (
        <span className="ml-2 text-xs text-orange-500">• Setup needed</span>
      )}
    </button>
  );
})}
```

## Testing Strategy

### Unit Tests
```typescript
// tests/onboarding/OnboardingStore.test.ts
import { renderHook, act } from '@testing-library/react';
import { useOnboardingStore } from '@/stores/onboardingStore';

describe('OnboardingStore', () => {
  beforeEach(() => {
    useOnboardingStore.getState().resetOnboarding();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useOnboardingStore());

    expect(result.current.currentStep).toBe(0);
    expect(result.current.responses).toEqual({});
    expect(result.current.isComplete).toBe(false);
  });

  it('should update responses correctly', () => {
    const { result } = renderHook(() => useOnboardingStore());

    act(() => {
      result.current.updateResponses({ subjects: ['math', 'science'] });
    });

    expect(result.current.responses.subjects).toEqual(['math', 'science']);
  });

  it('should advance to next step', () => {
    const { result } = renderHook(() => useOnboardingStore());

    act(() => {
      result.current.nextStep();
    });

    expect(result.current.currentStep).toBe(1);
    expect(result.current.stepCompletion[0]).toBe(true);
  });
});
```

### Integration Tests
```typescript
// tests/onboarding/OnboardingFlow.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingFlow } from '@/app/components/onboarding/OnboardingFlow';

describe('OnboardingFlow', () => {
  it('should complete subject selection step', async () => {
    render(<OnboardingFlow roleType="seeker" />);

    // Select subjects
    fireEvent.click(screen.getByText('Mathematics'));
    fireEvent.click(screen.getByText('Science'));

    // Continue to next step
    fireEvent.click(screen.getByText('Continue →'));

    await waitFor(() => {
      expect(screen.getByText('Your Level')).toBeInTheDocument();
    });
  });
});
```

## Deployment Checklist

### Database Migration
- [ ] Run onboarding table migrations
- [ ] Verify indexes are created
- [ ] Test data consistency

### Environment Variables
- [ ] Add any required API keys
- [ ] Configure rate limiting
- [ ] Set up monitoring

### Frontend Deployment
- [ ] Build and test production bundle
- [ ] Verify responsive design
- [ ] Test browser compatibility

### Performance Optimization
- [ ] Implement code splitting for onboarding components
- [ ] Optimize images and assets
- [ ] Add proper caching headers

This implementation guide provides a comprehensive foundation for building the user onboarding flow that integrates seamlessly with the existing Tutorwise architecture while providing an engaging, accessible user experience.