// apps/web/src/app/components/feature/onboarding/client/ClientPersonalInfoStep.tsx

'use client';

import React from 'react';
import TutorPersonalInfoStep from '../tutor/TutorPersonalInfoStep';
import { PersonalInfoData } from '../tutor/TutorOnboardingWizard';

interface ClientPersonalInfoStepProps {
  onBack?: () => void;
  onNext: (data: PersonalInfoData) => void;
  onSkip?: () => void;
  isLoading?: boolean;
}

const ClientPersonalInfoStep: React.FC<ClientPersonalInfoStepProps> = ({
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
      userRole="client"
    />
  );
};

export default ClientPersonalInfoStep;
