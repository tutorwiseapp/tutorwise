// apps/web/src/app/components/feature/onboarding/agent/AgentPersonalInfoStep.tsx

'use client';

import React from 'react';
import TutorPersonalInfoStep from '../tutor/TutorPersonalInfoStep';
import { PersonalInfoData } from '../tutor/TutorOnboardingWizard';

interface AgentPersonalInfoStepProps {
  onBack?: () => void;
  onNext: (data: PersonalInfoData) => void;
  onSkip?: () => void;
  isLoading?: boolean;
}

const AgentPersonalInfoStep: React.FC<AgentPersonalInfoStepProps> = ({
  onBack,
  onNext,
  onSkip,
  isLoading = false
}) => {
  return (
    <TutorPersonalInfoStep
      onNext={onNext}
      onBack={onBack}
      onSkip={onSkip}
      isLoading={isLoading}
      userRole="agent"
    />
  );
};

export default AgentPersonalInfoStep;
