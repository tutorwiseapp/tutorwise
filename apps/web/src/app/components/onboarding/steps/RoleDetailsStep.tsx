// apps/web/src/app/components/onboarding/steps/RoleDetailsStep.tsx
'use client';

import React, { useState } from 'react';
import { Role, RoleDetails } from '@/types';
import Button from '@/app/components/ui/Button'; 

interface RoleDetailsStepProps {
  role: Role;
  onNext: (details: Partial<RoleDetails>) => Promise<void>;
  onBack: () => void;
}

const RoleDetailsStep: React.FC<RoleDetailsStepProps> = ({ role, onNext, onBack }) => {
  const [details, setDetails] = useState<Partial<RoleDetails>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await onNext(details);
    setIsLoading(false);
  };

  const renderFields = () => {
    switch (role) {
      case 'client':
        return (
          <>
            <input name="learningGoals" onChange={handleChange} placeholder="Learning Goals" />
            <input name="preferredStyle" onChange={handleChange} placeholder="Preferred Learning Style" />
          </>
        );
      case 'tutor':
        return (
          <>
            <input name="experience" onChange={handleChange} placeholder="Years of Experience" />
            <textarea name="methodology" onChange={handleChange} placeholder="Teaching Methodology" />
          </>
        );
      case 'agent':
        return (
          <>
            <input name="agencyName" onChange={handleChange} placeholder="Agency Name" />
            <input name="clientRegions" onChange={handleChange} placeholder="Client Regions" />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Tell us more about your role as a {role}</h2>
      {renderFields()}
      <div>
        <Button onClick={onBack} disabled={isLoading} variant="secondary">Back</Button>
        <Button type="submit" isLoading={isLoading}>Next</Button>
      </div>
    </form>
  );
};

export default RoleDetailsStep;
