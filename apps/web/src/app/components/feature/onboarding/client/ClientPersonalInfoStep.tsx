// apps/web/src/app/components/feature/onboarding/client/ClientPersonalInfoStep.tsx

'use client';

import React from 'react';
import TutorPersonalInfoStep from '../tutor/TutorPersonalInfoStep';
import { PersonalInfoData } from '../tutor/TutorOnboardingWizard';

interface ClientPersonalInfoStepProps {
  onBack?: () => void;
  onNext: (data: PersonalInfoData) => void;
  isLoading?: boolean;
}

const ClientPersonalInfoStep: React.FC<ClientPersonalInfoStepProps> = ({
  onBack,
  onNext,
  isLoading = false
}) => {
  return (
    <TutorPersonalInfoStep
      onNext={onNext}
      onBack={onBack}
      isLoading={isLoading}
      userRole="client"
    />
  );
};

export default ClientPersonalInfoStep;
