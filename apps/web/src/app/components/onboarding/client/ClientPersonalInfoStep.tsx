// apps/web/src/app/components/onboarding/client/ClientPersonalInfoStep.tsx

'use client';

import React from 'react';
import TutorPersonalInfoStep from '../tutor/TutorPersonalInfoStep';
import { PersonalInfoData } from '../tutor/TutorOnboardingWizard';

interface ClientPersonalInfoStepProps {
  onNext: (data: PersonalInfoData) => void;
  onSkip?: () => void;
  isLoading?: boolean;
}

const ClientPersonalInfoStep: React.FC<ClientPersonalInfoStepProps> = ({
  onNext,
  onSkip,
  isLoading = false
}) => {
  return (
    <TutorPersonalInfoStep
      onNext={onNext}
      onSkip={onSkip}
      isLoading={isLoading}
      userRole="seeker"
    />
  );
};

export default ClientPersonalInfoStep;
