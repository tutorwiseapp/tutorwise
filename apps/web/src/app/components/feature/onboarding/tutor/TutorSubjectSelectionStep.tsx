'use client';

import React, { useState } from 'react';
import styles from '../OnboardingWizard.module.css';
import { WizardActionButtons } from '../shared/WizardButton';
import HubForm from '@/app/components/hub/form/HubForm';
import UnifiedMultiSelect from '@/app/components/ui/forms/UnifiedMultiSelect';

interface TutorSubjectSelectionStepProps {
  onNext: (subjects: string[]) => void;
  onBack?: () => void;
  isLoading: boolean;
}

const subjectOptions = [
  { value: 'Mathematics, English', label: 'Mathematics, English' },
  { value: 'Science', label: 'Science' },
  { value: 'History', label: 'History' },
  { value: 'Geography', label: 'Geography' },
  { value: 'Languages', label: 'Languages' },
  { value: 'Computer Science', label: 'Computer Science' },
  { value: 'Business Studies', label: 'Business Studies' },
  { value: 'Arts & Music', label: 'Arts & Music' },
  { value: 'Physical Education', label: 'Physical Education' },
  { value: 'Religious Studies', label: 'Religious Studies' },
];

const TutorSubjectSelectionStep: React.FC<TutorSubjectSelectionStepProps> = ({
  onNext,
  onBack,
  isLoading
}) => {
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  const handleNext = () => {
    onNext(selectedSubjects);
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>
          What subjects do you teach?
        </h2>
        <p className={styles.stepSubtitle}>
          Tutor Onboarding • Select all subjects you&apos;re qualified to tutor
        </p>
      </div>

      <div className={styles.stepBody}>
        <HubForm.Root>
          <HubForm.Section>
            <HubForm.Grid columns={1}>
              <HubForm.Field
                label="Subjects"
                isEditing={true}
                required
              >
                <UnifiedMultiSelect
                  triggerLabel="Subjects"
                  placeholder="Select subjects you teach..."
                  options={subjectOptions}
                  selectedValues={selectedSubjects}
                  onSelectionChange={setSelectedSubjects}
                  disabled={isLoading}
                />
              </HubForm.Field>
            </HubForm.Grid>
          </HubForm.Section>

          {selectedSubjects.length > 0 && (
            <div style={{
              marginTop: '16px',
              padding: '12px 16px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#6b7280'
            }}>
              {selectedSubjects.length} subject{selectedSubjects.length > 1 ? 's' : ''} selected
            </div>
          )}
        </HubForm.Root>
      </div>

      <WizardActionButtons
        onNext={handleNext}
        nextEnabled={selectedSubjects.length > 0}
        onBack={onBack}
        isLoading={isLoading}
        debug={true}
      />
    </div>
  );
};

export default TutorSubjectSelectionStep;
