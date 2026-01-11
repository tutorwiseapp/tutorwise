'use client';

import React, { useState } from 'react';
import styles from '../OnboardingWizard.module.css';
import professionalStyles from '../../account/ProfessionalInfoForm.module.css';
import { WizardActionButtons } from '../shared/WizardButton';
import { HubForm } from '@/app/components/hub/form/HubForm';
import UnifiedMultiSelect from '@/app/components/ui/forms/UnifiedMultiSelect';
import DatePicker from '@/app/components/ui/forms/DatePicker';
import CustomTimePicker from '@/app/components/feature/listings/wizard-steps/CustomTimePicker';
import { formatMultiSelectLabel } from '@/app/utils/formHelpers';
import InlineProgressBadge from '../shared/InlineProgressBadge';
import { useOnboardingAutoSave } from '@/hooks/useAutoSave';
import { useDifferentiatedSave } from '../shared/useDifferentiatedSave';
import { saveOnboardingProgress, getOnboardingProgress } from '@/lib/api/onboarding';
import { useUserProfile } from '@/app/contexts/UserProfileContext';

interface ProgressData {
  currentPoints: number;
  totalPoints: number;
  currentStepPoints: number;
  requiredPoints: number;
  steps: Array<{
    name: string;
    points: number;
    completed: boolean;
    current: boolean;
  }>;
}

interface TutorAvailabilityStepProps {
  onNext: (availability: AvailabilityData) => void;
  onBack?: (availability: AvailabilityData) => void;
  isLoading: boolean;
  progressData?: ProgressData;
}

export interface AvailabilityData {
  // Section 1: General Availability (Required)
  generalDays: string[];
  generalTimes: string[];

  // Section 2: Detailed Schedule (Optional)
  availabilityPeriods?: AvailabilityPeriod[];
  unavailabilityPeriods?: UnavailabilityPeriod[];
}

export interface AvailabilityPeriod {
  id: string;
  type: 'recurring' | 'one-time';
  days?: string[];
  fromDate: string;
  toDate?: string;
  startTime: string;
  endTime: string;
}

export interface UnavailabilityPeriod {
  id: string;
  fromDate: string;
  toDate: string;
}

type AvailabilityType = 'recurring' | 'one-time';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const dayOptions = DAYS_OF_WEEK.map(day => ({ value: day, label: day }));

const timeOptions = [
  { value: 'morning', label: 'Morning (6am-12pm)' },
  { value: 'afternoon', label: 'Afternoon (12pm-5pm)' },
  { value: 'evening', label: 'Evening (5pm-10pm)' },
  { value: 'all_day', label: 'All day (6am-10pm)' }
];

const TutorAvailabilityStep: React.FC<TutorAvailabilityStepProps> = ({
  onNext,
  onBack,
  isLoading,
  progressData
}) => {
  const { user } = useUserProfile();

  // Section 1: General Availability (Required)
  const [generalDays, setGeneralDays] = useState<string[]>([]);
  const [generalTimes, setGeneralTimes] = useState<string[]>([]);

  // Section 2: Detailed Schedule (Optional) - State from ProfessionalInfoForm
  const [availabilityType, setAvailabilityType] = useState<AvailabilityType>('recurring');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [availFromDate, setAvailFromDate] = useState('');
  const [availToDate, setAvailToDate] = useState('');
  const [startTime, setStartTime] = useState('9:00 AM');
  const [endTime, setEndTime] = useState('5:00 PM');
  const [availabilityPeriods, setAvailabilityPeriods] = useState<AvailabilityPeriod[]>([]);
  const [availErrors, setAvailErrors] = useState<{ days?: string; dates?: string; times?: string }>({});

  // Unavailability state
  const [unavailFromDate, setUnavailFromDate] = useState('');
  const [unavailToDate, setUnavailToDate] = useState('');
  const [unavailabilityPeriods, setUnavailabilityPeriods] = useState<UnavailabilityPeriod[]>([]);
  const [unavailErrors, setUnavailErrors] = useState<{ dates?: string }>({});
  const [isRestored, setIsRestored] = useState(false);

  // Restore saved onboarding progress on mount
  React.useEffect(() => {
    if (!isRestored && user?.id) {
      getOnboardingProgress('tutor')
        .then(savedProgress => {
          const savedData = savedProgress?.progress?.tutor?.availability;

          if (savedData) {
            console.log('[TutorAvailabilityStep] ✅ Restored saved progress:', savedData);

            // Restore general availability
            if (savedData.generalDays) setGeneralDays(savedData.generalDays);
            if (savedData.generalTimes) setGeneralTimes(savedData.generalTimes);

            // Restore detailed schedule
            if (savedData.availabilityPeriods) setAvailabilityPeriods(savedData.availabilityPeriods);
            if (savedData.unavailabilityPeriods) setUnavailabilityPeriods(savedData.unavailabilityPeriods);
          }

          setIsRestored(true);
        })
        .catch(error => {
          console.error('[TutorAvailabilityStep] Error loading saved progress:', error);
          setIsRestored(true);
        });
    }
  }, [user?.id, isRestored]);

  // Save strategies
  const { saveOnNavigate, saveOnContinue } = useDifferentiatedSave<AvailabilityData>();

  // Build availability data for auto-save
  const availabilityData: AvailabilityData = {
    generalDays,
    generalTimes,
    availabilityPeriods: availabilityPeriods.length > 0 ? availabilityPeriods : undefined,
    unavailabilityPeriods: unavailabilityPeriods.length > 0 ? unavailabilityPeriods : undefined,
  };

  // Auto-save with 5-second debounce (only after restoration)
  const { saveStatus, lastSaved, error } = useOnboardingAutoSave(
    availabilityData,
    async (data) => {
      if (!user?.id) throw new Error('User not authenticated');

      await saveOnboardingProgress({
        userId: user.id,
        progress: {
          tutor: {
            availability: data
          }
        }
      });
    },
    {
      enabled: isRestored, // Only auto-save after restoration
    }
  );

  // Validation - Only Section 1 is required
  const isValid = generalDays.length > 0 && generalTimes.length > 0;

  // Helper functions (copied from ProfessionalInfoForm)
  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
    if (availErrors.days) {
      setAvailErrors(prev => ({ ...prev, days: undefined }));
    }
  };

  const validateAvailability = () => {
    const newErrors: { days?: string; dates?: string; times?: string } = {};

    if (availabilityType === 'recurring' && selectedDays.length === 0) {
      newErrors.days = 'Please select at least one day';
    }

    if (!availFromDate) {
      newErrors.dates = 'Please select a start date';
    }

    if (availabilityType === 'recurring' && !availToDate) {
      newErrors.dates = 'Please select an end date for recurring availability';
    }

    if (startTime >= endTime) {
      newErrors.times = 'End time must be after start time';
    }

    setAvailErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateUnavailability = () => {
    const newErrors: { dates?: string } = {};

    if (!unavailFromDate) {
      newErrors.dates = 'Please select a start date';
    }

    if (!unavailToDate) {
      newErrors.dates = 'Please select an end date';
    }

    setUnavailErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddAvailability = () => {
    if (!validateAvailability()) return;

    const newPeriod: AvailabilityPeriod = {
      id: Date.now().toString(),
      type: availabilityType,
      days: availabilityType === 'recurring' ? selectedDays : undefined,
      fromDate: availFromDate,
      toDate: availabilityType === 'recurring' ? availToDate : undefined,
      startTime,
      endTime
    };

    setAvailabilityPeriods([...availabilityPeriods, newPeriod]);

    // Reset form
    setSelectedDays([]);
    setAvailFromDate('');
    setAvailToDate('');
    setStartTime('9:00 AM');
    setEndTime('5:00 PM');
    setAvailErrors({});
  };

  const handleAddUnavailability = () => {
    if (!validateUnavailability()) return;

    const newPeriod: UnavailabilityPeriod = {
      id: Date.now().toString(),
      fromDate: unavailFromDate,
      toDate: unavailToDate
    };

    setUnavailabilityPeriods([...unavailabilityPeriods, newPeriod]);

    // Reset form
    setUnavailFromDate('');
    setUnavailToDate('');
    setUnavailErrors({});
  };

  const handleRemoveAvailability = (id: string) => {
    setAvailabilityPeriods(availabilityPeriods.filter(p => p.id !== id));
  };

  const handleRemoveUnavailability = (id: string) => {
    setUnavailabilityPeriods(unavailabilityPeriods.filter(p => p.id !== id));
  };

  const formatAvailabilityText = (period: AvailabilityPeriod) => {
    if (period.type === 'recurring') {
      const daysList = period.days?.join(', ');
      return `Every ${daysList}, ${period.startTime} - ${period.endTime}`;
    } else {
      return `${period.fromDate}, ${period.startTime} - ${period.endTime}`;
    }
  };

  const formatUnavailabilityText = (period: UnavailabilityPeriod) => {
    return `${period.fromDate} - ${period.toDate}`;
  };

  const recurringPeriods = availabilityPeriods.filter(p => p.type === 'recurring');
  const oneTimePeriods = availabilityPeriods.filter(p => p.type === 'one-time');

  const handleContinue = async () => {
    if (!user?.id) {
      console.error('[TutorAvailabilityStep] User not authenticated');
      return;
    }

    // Use blocking save strategy for manual continue
    const success = await saveOnContinue({
      data: availabilityData,
      onSave: async (data) => {
        await saveOnboardingProgress({
          userId: user.id,
          progress: {
            tutor: {
              availability: data
            }
          }
        });
      },
    });

    if (success) {
      onNext(availabilityData);
    }
  };

  const handleBack = () => {
    if (!user?.id || !onBack) return;

    // Use optimistic save strategy for navigation
    saveOnNavigate({
      data: availabilityData,
      onSave: async (data) => {
        await saveOnboardingProgress({
          userId: user.id,
          progress: {
            tutor: {
              availability: data
            }
          }
        });
      },
    });

    // Navigate immediately and pass data to wizard (optimistic)
    onBack(availabilityData);
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <div>
          <h2 className={styles.stepTitle}>
            Set your availability
          </h2>
          <p className={styles.stepSubtitle}>
            Tutor Onboarding • Let students know when you&apos;re available
          </p>
        </div>
      </div>

      <div className={styles.stepBody}>
        <HubForm.Root>
          {/* Section 1: General Availability (Required) */}
          <HubForm.Section title="General Availability">
            {/* Progress Badge - Top Right Corner of Form */}
            {progressData && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginBottom: '24px',
                  marginTop: '-8px',
                }}
              >
                <InlineProgressBadge
                  currentPoints={progressData.currentPoints}
                  totalPoints={progressData.totalPoints}
                  currentStepPoints={progressData.currentStepPoints}
                  requiredPoints={progressData.requiredPoints}
                  steps={progressData.steps}
                />
              </div>
            )}

            {/* Auto-save Indicator */}

            <HubForm.Grid>
              <HubForm.Field label="Days of the week" required>
                <UnifiedMultiSelect
                  triggerLabel={formatMultiSelectLabel(generalDays, 'Select days')}
                  options={dayOptions}
                  selectedValues={generalDays}
                  onSelectionChange={setGeneralDays}
                />
              </HubForm.Field>

              <HubForm.Field label="Times of day" required>
                <UnifiedMultiSelect
                  triggerLabel={formatMultiSelectLabel(generalTimes, 'Select times')}
                  options={timeOptions}
                  selectedValues={generalTimes}
                  onSelectionChange={setGeneralTimes}
                />
              </HubForm.Field>
            </HubForm.Grid>

            <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                💡 This gives students a general idea of your schedule. You can add detailed availability below (optional).
              </p>
            </div>
          </HubForm.Section>

          {/* Section 2: Detailed Schedule (Optional) - Copied from ProfessionalInfoForm */}
          <HubForm.Section title="Detailed Availability (Optional)">
            <div className={professionalStyles.availabilityGrid}>
              {/* Left Column: Availability Periods */}
              <div>
                {/* Availability Type */}
                <div className={professionalStyles.formGroup}>
                  <label className={professionalStyles.formLabel}>Availability Periods</label>
                  <div className={professionalStyles.dateGrid}>
                    <button
                      type="button"
                      className={`${professionalStyles.checkboxItem} ${availabilityType === 'recurring' ? professionalStyles.selected : ''}`}
                      onClick={() => setAvailabilityType('recurring')}
                    >
                      Recurring
                    </button>
                    <button
                      type="button"
                      className={`${professionalStyles.checkboxItem} ${availabilityType === 'one-time' ? professionalStyles.selected : ''}`}
                      onClick={() => setAvailabilityType('one-time')}
                    >
                      One-time
                    </button>
                  </div>
                </div>

                {/* Days of Week (only for recurring) */}
                {availabilityType === 'recurring' && (
                  <div className={professionalStyles.formGroup}>
                    <label className={professionalStyles.formLabel}>Days of Week</label>
                    {availErrors.days && (
                      <p className={professionalStyles.errorText} style={{ marginTop: '8px', marginBottom: '8px' }}>
                        {availErrors.days}
                      </p>
                    )}
                    <div className={professionalStyles.daysGrid}>
                      {DAYS_OF_WEEK.map(day => (
                        <button
                          key={day}
                          type="button"
                          className={`${professionalStyles.checkboxItem} ${selectedDays.includes(day) ? professionalStyles.selected : ''}`}
                          onClick={() => toggleDay(day)}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Date Pickers */}
                <div className={professionalStyles.formGroup}>
                  {availErrors.dates && (
                    <p className={professionalStyles.errorText} style={{ marginTop: '8px', marginBottom: '8px' }}>
                      {availErrors.dates}
                    </p>
                  )}
                  <div className={availabilityType === 'recurring' ? professionalStyles.dateGrid : ''}>
                    <HubForm.Field label="From">
                      <DatePicker
                        selected={availFromDate ? new Date(availFromDate) : undefined}
                        onSelect={(date) => {
                          setAvailFromDate(date ? date.toISOString().split('T')[0] : '');
                          setAvailErrors(prev => ({ ...prev, dates: undefined }));
                        }}
                        placeholder="Select start date"
                      />
                    </HubForm.Field>
                    {availabilityType === 'recurring' && (
                      <HubForm.Field label="To">
                        <DatePicker
                          selected={availToDate ? new Date(availToDate) : undefined}
                          onSelect={(date) => {
                            setAvailToDate(date ? date.toISOString().split('T')[0] : '');
                            setAvailErrors(prev => ({ ...prev, dates: undefined }));
                          }}
                          placeholder="Select end date"
                        />
                      </HubForm.Field>
                    )}
                  </div>
                </div>

                {/* Time Pickers */}
                <div className={professionalStyles.formGroup}>
                  {availErrors.times && (
                    <p className={professionalStyles.errorText} style={{ marginBottom: '8px' }}>
                      {availErrors.times}
                    </p>
                  )}
                  <div className={professionalStyles.timeGrid}>
                    <CustomTimePicker
                      label="Start time"
                      value={startTime}
                      onChange={setStartTime}
                      onClearError={() => setAvailErrors(prev => ({ ...prev, times: undefined }))}
                    />
                    <CustomTimePicker
                      label="End time"
                      value={endTime}
                      onChange={setEndTime}
                      onClearError={() => setAvailErrors(prev => ({ ...prev, times: undefined }))}
                    />
                  </div>
                </div>

                {/* Add Button */}
                <div style={{ marginBottom: '32px' }}>
                  <button
                    type="button"
                    onClick={handleAddAvailability}
                    className={professionalStyles.buttonPrimary}
                    style={{ width: '100%' }}
                  >
                    Add
                  </button>
                </div>

                {/* Summary Sections */}
                {recurringPeriods.length > 0 && (
                  <div className={professionalStyles.formGroup}>
                    <label className={professionalStyles.formLabel}>Recurring Availability</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {recurringPeriods.map(period => (
                        <div
                          key={period.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 16px',
                            backgroundColor: 'var(--color-bg-secondary, #f9fafb)',
                            borderRadius: '8px',
                            border: '1px solid var(--color-border, #dfe1e5)'
                          }}
                        >
                          <span style={{ fontSize: '0.875rem' }}>{formatAvailabilityText(period)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAvailability(period.id)}
                            className={professionalStyles.buttonSecondary}
                            style={{ padding: '4px 12px', fontSize: '0.875rem' }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {oneTimePeriods.length > 0 && (
                  <div className={professionalStyles.formGroup}>
                    <label className={professionalStyles.formLabel}>One-time Availability</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {oneTimePeriods.map(period => (
                        <div
                          key={period.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 16px',
                            backgroundColor: 'var(--color-bg-secondary, #f9fafb)',
                            borderRadius: '8px',
                            border: '1px solid var(--color-border, #dfe1e5)'
                          }}
                        >
                          <span style={{ fontSize: '0.875rem' }}>{formatAvailabilityText(period)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAvailability(period.id)}
                            className={professionalStyles.buttonSecondary}
                            style={{ padding: '4px 12px', fontSize: '0.875rem' }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Unavailability Periods */}
              <div>
                {/* Date Pickers */}
                <div className={professionalStyles.formGroup}>
                  <label className={professionalStyles.formLabel}>Unavailability Periods</label>
                  {unavailErrors.dates && (
                    <p className={professionalStyles.errorText} style={{ marginTop: '8px', marginBottom: '8px' }}>
                      {unavailErrors.dates}
                    </p>
                  )}
                  <div className={professionalStyles.dateGrid}>
                    <HubForm.Field label="From">
                      <DatePicker
                        selected={unavailFromDate ? new Date(unavailFromDate) : undefined}
                        onSelect={(date) => {
                          setUnavailFromDate(date ? date.toISOString().split('T')[0] : '');
                          setUnavailErrors(prev => ({ ...prev, dates: undefined }));
                        }}
                        placeholder="Select start date"
                      />
                    </HubForm.Field>
                    <HubForm.Field label="To">
                      <DatePicker
                        selected={unavailToDate ? new Date(unavailToDate) : undefined}
                        onSelect={(date) => {
                          setUnavailToDate(date ? date.toISOString().split('T')[0] : '');
                          setUnavailErrors(prev => ({ ...prev, dates: undefined }));
                        }}
                        placeholder="Select end date"
                      />
                    </HubForm.Field>
                  </div>
                </div>

                {/* Add Button */}
                <div style={{ marginBottom: '32px' }}>
                  <button
                    type="button"
                    onClick={handleAddUnavailability}
                    className={professionalStyles.buttonPrimary}
                    style={{ width: '100%' }}
                  >
                    Add
                  </button>
                </div>

                {/* Summary Section */}
                {unavailabilityPeriods.length > 0 && (
                  <div className={professionalStyles.formGroup}>
                    <label className={professionalStyles.formLabel}>Unavailable Period</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {unavailabilityPeriods.map(period => (
                        <div
                          key={period.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 16px',
                            backgroundColor: 'var(--color-bg-secondary, #f9fafb)',
                            borderRadius: '8px',
                            border: '1px solid var(--color-border, #dfe1e5)'
                          }}
                        >
                          <span style={{ fontSize: '0.875rem' }}>{formatUnavailabilityText(period)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveUnavailability(period.id)}
                            className={professionalStyles.buttonSecondary}
                            style={{ padding: '4px 12px', fontSize: '0.875rem' }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </HubForm.Section>
        </HubForm.Root>

        <p className={styles.progressIndicator}>
          {isValid ? '✓ All set! Ready to continue' : 'Please complete the required fields in General Availability'}
        </p>
      </div>

      {/* Action Buttons using shared component */}
      <WizardActionButtons
        onContinue={handleContinue}
        continueEnabled={isValid}
        onBack={handleBack}
        isLoading={isLoading}
      />
    </div>
  );
};

export default TutorAvailabilityStep;
