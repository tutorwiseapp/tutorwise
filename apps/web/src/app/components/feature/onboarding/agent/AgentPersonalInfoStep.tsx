// apps/web/src/app/components/feature/onboarding/agent/AgentPersonalInfoStep.tsx

'use client';

import React from 'react';
import TutorPersonalInfoStep from '../tutor/TutorPersonalInfoStep';
import { PersonalInfoData } from '../tutor/TutorOnboardingWizard';

interface AgentPersonalInfoStepProps {
  onNext: (data: PersonalInfoData) => void;
  onSkip?: () => void;
  isLoading?: boolean;
}

const AgentPersonalInfoStep: React.FC<AgentPersonalInfoStepProps> = ({
  onNext,
  onSkip,
  isLoading = false
}) => {
  return (
    <TutorPersonalInfoStep
      onNext={onNext}
      onSkip={onSkip}
      isLoading={isLoading}
      userRole="agent"
    />
  );
};

export default AgentPersonalInfoStep;
