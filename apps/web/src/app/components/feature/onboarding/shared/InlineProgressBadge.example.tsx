/**
 * Filename: InlineProgressBadge.example.tsx
 * Purpose: Example integration guide for InlineProgressBadge component
 * Shows how to integrate the progress badge into onboarding step headers
 */

import React from 'react';
import InlineProgressBadge from './InlineProgressBadge';
import styles from '../OnboardingWizard.module.css';

/**
 * EXAMPLE 1: Integration in Step Header
 *
 * Position: Right side of step title to save vertical space
 * Layout: Title on left, progress badge on right
 */
function ExampleStepHeader() {
  // These values would come from TutorOnboardingWizard state
  const currentPoints = 35; // Points earned so far
  const totalPoints = 55; // Total possible points
  const requiredPoints = 45; // Points needed to complete (excluding optional)
  const currentStepPoints = 10; // Points for current step (Verification)

  const steps = [
    { name: 'Personal Info', points: 15, completed: true, current: false },
    { name: 'Professional Details', points: 20, completed: true, current: false },
    { name: 'Verification', points: 10, completed: false, current: true },
    { name: 'Availability', points: 10, completed: false, current: false },
  ];

  return (
    <div className={styles.stepHeader}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
      }}>
        {/* Left: Step Title */}
        <div>
          <h2 className={styles.stepTitle}>
            Trust and Verification
          </h2>
          <p className={styles.stepSubtitle}>
            Tutor Onboarding • Upload your verification documents
          </p>
        </div>

        {/* Right: Progress Badge */}
        <InlineProgressBadge
          currentPoints={currentPoints}
          totalPoints={totalPoints}
          currentStepPoints={currentStepPoints}
          requiredPoints={requiredPoints}
          steps={steps}
        />
      </div>
    </div>
  );
}

/**
 * EXAMPLE 2: Integration in TutorOnboardingWizard.tsx
 *
 * This shows how to calculate and pass the props to InlineProgressBadge
 */
function ExampleWizardIntegration() {
  // Define point values for each step
  const STEP_POINTS = {
    personal: 15,
    professional: 20,
    verification: 10, // Optional
    availability: 10,
  };

  const REQUIRED_POINTS = 45; // personal + professional + availability
  const TOTAL_POINTS = 55; // includes optional verification

  // Track which steps are completed (this would be real state in the wizard)
  const completedSteps = new Set(['personal', 'professional']);
  const currentStep = 'verification';

  // Calculate current points
  const currentPoints = Array.from(completedSteps).reduce(
    (sum, step) => sum + (STEP_POINTS[step as keyof typeof STEP_POINTS] || 0),
    0
  );

  // Get current step points
  const currentStepPoints = STEP_POINTS[currentStep as keyof typeof STEP_POINTS] || 0;

  // Build steps array for progress indicator
  const steps = [
    {
      name: 'Personal Info',
      points: STEP_POINTS.personal,
      completed: completedSteps.has('personal'),
      current: currentStep === 'personal',
    },
    {
      name: 'Professional Details',
      points: STEP_POINTS.professional,
      completed: completedSteps.has('professional'),
      current: currentStep === 'professional',
    },
    {
      name: 'Verification',
      points: STEP_POINTS.verification,
      completed: completedSteps.has('verification'),
      current: currentStep === 'verification',
    },
    {
      name: 'Availability',
      points: STEP_POINTS.availability,
      completed: completedSteps.has('availability'),
      current: currentStep === 'availability',
    },
  ];

  return (
    <InlineProgressBadge
      currentPoints={currentPoints}
      totalPoints={TOTAL_POINTS}
      currentStepPoints={currentStepPoints}
      requiredPoints={REQUIRED_POINTS}
      steps={steps}
    />
  );
}

/**
 * EXAMPLE 3: Visual Output States
 *
 * Step 1 (Personal Info - 15 pts):
 * "Earn +15 pts · ◐○○○ · 0/55 · 0% ›"
 *
 * Step 2 (Professional - 20 pts):
 * "Earn +20 pts · ●◐○○ · 15/55 · 33% ›"
 *
 * Step 3 (Verification - 10 pts):
 * "Earn +10 pts · ●●◐○ · 35/55 · 78% ›"
 *
 * Step 4 (Availability - 10 pts):
 * "Earn +10 pts · ●●●◐ · 45/55 · 100% ›"
 *
 * All Complete:
 * "All done! · ●●●● · 55/55 · 100% ›"
 *
 * Legend:
 * ● = Completed step (green)
 * ◐ = Current step (primary blue)
 * ○ = Pending step (gray)
 */

/**
 * EXAMPLE 4: Integration Code for Each Step Component
 *
 * Add this import at the top of each step file:
 * import InlineProgressBadge from '../shared/InlineProgressBadge';
 *
 * Then update the stepHeader div to include the badge:
 */
/*
<div className={styles.stepHeader}>
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap',
  }}>
    <div>
      <h2 className={styles.stepTitle}>
        {stepTitle}
      </h2>
      <p className={styles.stepSubtitle}>
        {stepSubtitle}
      </p>
    </div>

    <InlineProgressBadge
      currentPoints={currentPoints}
      totalPoints={totalPoints}
      currentStepPoints={currentStepPoints}
      requiredPoints={requiredPoints}
      steps={steps}
    />
  </div>
</div>
*/

export { ExampleStepHeader, ExampleWizardIntegration };
