// apps/web/src/app/components/feature/onboarding/agent/AgentPersonalInfoStep.tsx

'use client';

import React from 'react';
import TutorPersonalInfoStep from '../tutor/TutorPersonalInfoStep';
import { PersonalInfoData } from '../tutor/TutorOnboardingWizard';

interface AgentPersonalInfoStepProps {
  onBack?: () => void;
  onNext: (data: PersonalInfoData) => void;
  isLoading?: boolean;
}

const AgentPersonalInfoStep: React.FC<AgentPersonalInfoStepProps> = ({
  onBack,
  onNext,
  isLoading = false
}) => {
  return (
    <TutorPersonalInfoStep
      onNext={onNext}
      onBack={onBack}
      isLoading={isLoading}
      userRole="agent"
    />
  );
};

export default AgentPersonalInfoStep;
