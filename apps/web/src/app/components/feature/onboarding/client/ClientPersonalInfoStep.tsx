// apps/web/src/app/components/feature/onboarding/client/ClientPersonalInfoStep.tsx

'use client';

import React from 'react';
import PersonalInfoStep, { PersonalInfoData } from '../shared/steps/PersonalInfoStep';

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
    <PersonalInfoStep
      role="client"
      onNext={onNext}
      onBack={onBack}
      isLoading={isLoading}
    />
  );
};

export default ClientPersonalInfoStep;
