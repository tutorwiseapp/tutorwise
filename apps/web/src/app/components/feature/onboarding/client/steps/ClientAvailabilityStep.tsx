'use client';

import React, { useState } from 'react';
import styles from '../../OnboardingWizard.module.css';
import professionalStyles from '../../../account/ProfessionalInfoForm.module.css';
import { WizardActionButtons } from '../../shared/WizardButton';
import { HubForm } from '@/app/components/hub/form/HubForm';
import UnifiedMultiSelect from '@/app/components/ui/forms/UnifiedMultiSelect';
import DatePicker from '@/app/components/ui/forms/DatePicker';
import CustomTimePicker from '@/app/components/feature/listings/create/shared-components/CustomTimePicker';
import { formatMultiSelectLabel } from '@/app/utils/formHelpers';
import InlineProgressBadge from '../../shared/InlineProgressBadge';
import HubListItem from '@/app/components/hub/content/HubListItem/HubListItem';
import { getOnboardingProgress, saveOnboardingProgress } from '@/lib/api/onboarding';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import Button from '@/app/components/ui/actions/Button';
import { useOnboardingAutoSave } from '@/hooks/useAutoSave';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { hasUnsavedChanges as checkUnsavedChanges } from '@/lib/offlineQueue';
import { useFormConfigs } from '@/hooks/useFormConfig';

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

interface ClientAvailabilityStepProps {
  onNext: (availability: AvailabilityData) => void;
  onBack?: () => void;
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

const ClientAvailabilityStep: React.FC<ClientAvailabilityStepProps> = ({
  onNext,
  onBack,
  isLoading,
  progressData
}) => {
  const { user } = useUserProfile();

  // Section 1: General Availability (Required)
  const [generalDays, setGeneralDays] = useState<string[]>([]);
  const [generalTimes, setGeneralTimes] = useState<string[]>([]);

  // Fetch dynamic form configs (with fallback to hardcoded values)
  const { configs } = useFormConfigs([
    {
      fieldName: 'availabilityDays',
      context: 'onboarding.client',
      fallback: {
        label: 'Days of Week',
        placeholder: 'Select days',
        options: dayOptions
      }
    },
    {
      fieldName: 'availabilityTimes',
      context: 'onboarding.client',
      fallback: {
        label: 'Time of Day',
        placeholder: 'Select times',
        options: timeOptions
      }
    }
  ]);

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
  const [periodConflicts, setPeriodConflicts] = useState<Map<string, string[]>>(new Map());
  const [isSaving, setIsSaving] = useState(false);

  // Build availability data to pass to wizard
  const availabilityData: AvailabilityData = {
    generalDays,
    generalTimes,
    availabilityPeriods: availabilityPeriods.length > 0 ? availabilityPeriods : undefined,
    unavailabilityPeriods: unavailabilityPeriods.length > 0 ? unavailabilityPeriods : undefined,
  };

  // Offline sync - auto-sync when connection restored
  useOfflineSync(user?.id);

  // Auto-save with 3-second debounce (runs in background, doesn't block Next button)
  const { saveStatus } = useOnboardingAutoSave(
    availabilityData,
    async (data) => {
      if (!user?.id) throw new Error('User not authenticated');

      await saveOnboardingProgress({
        userId: user.id,
        progress: {
          client: {
            availability: data
          }
        }
      });
    },
    {
      enabled: isRestored && !isLoading,
    }
  );

  // Immediate save function for multiselect changes
  const handleImmediateSave = React.useCallback(() => {
    if (!user?.id) return;

    console.log('[ClientAvailabilityStep] Immediate save triggered');
    saveOnboardingProgress({
      userId: user.id,
      progress: {
        client: {
          availability: availabilityData
        }
      }
    })
      .then(() => console.log('[ClientAvailabilityStep] ✓ Immediate save completed'))
      .catch((error) => console.error('[ClientAvailabilityStep] ❌ Immediate save failed:', error));
  }, [user?.id, availabilityData]);

  // Restore saved onboarding progress on mount
  React.useEffect(() => {
    console.log('[ClientAvailabilityStep] Restoration useEffect triggered', {
      isRestored,
      hasUserId: !!user?.id,
      userId: user?.id
    });

    if (!isRestored && user?.id) {
      console.log('[ClientAvailabilityStep] Starting getOnboardingProgress call...');

      getOnboardingProgress('client')
        .then(savedProgress => {
          console.log('[ClientAvailabilityStep] getOnboardingProgress returned:', savedProgress);

          const savedData = savedProgress?.progress?.client?.availability;
          console.log('[ClientAvailabilityStep] Extracted availability data:', savedData);

          if (savedData) {
            console.log('[ClientAvailabilityStep] ✅ Restoring saved progress');

            // Restore general availability
            if (savedData.generalDays) {
              console.log('[ClientAvailabilityStep] Setting generalDays:', savedData.generalDays);
              setGeneralDays(savedData.generalDays);
            } else {
              console.log('[ClientAvailabilityStep] No generalDays to restore');
            }

            if (savedData.generalTimes) {
              console.log('[ClientAvailabilityStep] Setting generalTimes:', savedData.generalTimes);
              setGeneralTimes(savedData.generalTimes);
            } else {
              console.log('[ClientAvailabilityStep] No generalTimes to restore');
            }

            // Restore detailed schedule
            if (savedData.availabilityPeriods) {
              console.log('[ClientAvailabilityStep] Setting availabilityPeriods:', savedData.availabilityPeriods);
              setAvailabilityPeriods(savedData.availabilityPeriods);
            }
            if (savedData.unavailabilityPeriods) {
              console.log('[ClientAvailabilityStep] Setting unavailabilityPeriods:', savedData.unavailabilityPeriods);
              setUnavailabilityPeriods(savedData.unavailabilityPeriods);
            }
          } else {
            console.log('[ClientAvailabilityStep] ⚠️ No saved availability data found');
          }

          console.log('[ClientAvailabilityStep] Setting isRestored to true');
          setIsRestored(true);
        })
        .catch(error => {
          console.error('[ClientAvailabilityStep] ❌ Error loading saved progress:', error);
          setIsRestored(true);
        });
    } else {
      if (isRestored) {
        console.log('[ClientAvailabilityStep] Skipping restoration - already restored');
      }
      if (!user?.id) {
        console.log('[ClientAvailabilityStep] Skipping restoration - no user ID');
      }
    }
  }, [user?.id, isRestored]);

  // beforeunload warning - prevent accidental close with unsaved changes
  React.useEffect(() => {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      const hasUnsaved = await checkUnsavedChanges();
      if (saveStatus === 'saving' || isSaving || hasUnsaved) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus, isSaving]);

  // Validation - Only Section 1 is required
  const isValid = generalDays.length > 0 && generalTimes.length > 0;

  // Detect conflicts whenever periods change
  React.useEffect(() => {
    const conflicts = detectConflicts(availabilityPeriods, unavailabilityPeriods);
    setPeriodConflicts(conflicts);
  }, [availabilityPeriods, unavailabilityPeriods]);

  // Conflict detection helpers
  const convertTimeToMinutes = (timeStr: string): number => {
    const match = timeStr.match(/^(\d+):(\d+)\s(AM|PM)$/);
    if (!match) return 0;

    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3];

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
  };

  const doTimeRangesOverlap = (start1: string, end1: string, start2: string, end2: string): boolean => {
    const s1 = convertTimeToMinutes(start1);
    const e1 = convertTimeToMinutes(end1);
    const s2 = convertTimeToMinutes(start2);
    const e2 = convertTimeToMinutes(end2);

    return s1 < e2 && s2 < e1;
  };

  const doDateRangesOverlap = (from1: string, to1: string | undefined, from2: string, to2: string | undefined): boolean => {
    const d1Start = new Date(from1);
    const d1End = to1 ? new Date(to1) : new Date(from1);
    const d2Start = new Date(from2);
    const d2End = to2 ? new Date(to2) : new Date(from2);

    return d1Start <= d2End && d2Start <= d1End;
  };

  const doDaysOverlap = (days1: string[] | undefined, days2: string[] | undefined): boolean => {
    if (!days1 || !days2) return true; // one-time periods always considered overlapping
    return days1.some(day => days2.includes(day));
  };

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

    // Convert time strings to comparable values (handles AM/PM)
    const parseTime = (timeStr: string) => {
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      let hour24 = hours;
      if (period === 'PM' && hours !== 12) hour24 += 12;
      if (period === 'AM' && hours === 12) hour24 = 0;
      return hour24 * 60 + minutes;
    };

    if (startTime && endTime && parseTime(startTime) >= parseTime(endTime)) {
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

  const detectConflicts = (periods: AvailabilityPeriod[], unavailPeriods: UnavailabilityPeriod[]): Map<string, string[]> => {
    const conflicts = new Map<string, string[]>();

    // Check for overlapping availability periods
    for (let i = 0; i < periods.length; i++) {
      for (let j = i + 1; j < periods.length; j++) {
        const p1 = periods[i];
        const p2 = periods[j];

        // Check if date ranges overlap
        if (!doDateRangesOverlap(p1.fromDate, p1.toDate, p2.fromDate, p2.toDate)) continue;

        // For recurring periods, check if days overlap
        if (p1.type === 'recurring' && p2.type === 'recurring') {
          if (!doDaysOverlap(p1.days, p2.days)) continue;
        }

        // Check if time ranges overlap
        if (doTimeRangesOverlap(p1.startTime, p1.endTime, p2.startTime, p2.endTime)) {
          const message = `Overlaps with: ${formatAvailabilityText(p2)}`;

          // Add to p1's conflicts
          if (!conflicts.has(p1.id)) conflicts.set(p1.id, []);
          conflicts.get(p1.id)!.push(message);

          // Add to p2's conflicts
          const message2 = `Overlaps with: ${formatAvailabilityText(p1)}`;
          if (!conflicts.has(p2.id)) conflicts.set(p2.id, []);
          conflicts.get(p2.id)!.push(message2);
        }
      }
    }

    // Check for availability conflicting with unavailability
    for (const availPeriod of periods) {
      for (const unavailPeriod of unavailPeriods) {
        if (doDateRangesOverlap(availPeriod.fromDate, availPeriod.toDate, unavailPeriod.fromDate, unavailPeriod.toDate)) {
          const message = `Conflicts with unavailable period: ${formatUnavailabilityText(unavailPeriod)}`;
          if (!conflicts.has(availPeriod.id)) conflicts.set(availPeriod.id, []);
          conflicts.get(availPeriod.id)!.push(message);
        }
      }
    }

    return conflicts;
  };

  const recurringPeriods = availabilityPeriods.filter(p => p.type === 'recurring');
  const oneTimePeriods = availabilityPeriods.filter(p => p.type === 'one-time');

  const handleNext = () => {
    console.log('[ClientAvailabilityStep] handleNext called');
    console.log('[ClientAvailabilityStep] Form data:', availabilityData);
    console.log('[ClientAvailabilityStep] isValid:', isValid);
    console.log('[ClientAvailabilityStep] Calling onNext...');

    // The WizardActionButtons component ensures this only runs when isValid is true
    // Pass data to wizard - wizard handles all database operations in background
    onNext(availabilityData);

    console.log('[ClientAvailabilityStep] onNext called successfully');
  };


  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <div>
          <h2 className={styles.stepTitle}>
            Set your availability
          </h2>
          <p className={styles.stepSubtitle}>
            Client Onboarding • Let students know when you&apos;re available
          </p>
        </div>
      </div>

      <div className={styles.stepBody}>
        <HubForm.Root>
          {/* Section 1: General Availability (Required) */}
          <HubForm.Section>
            {/* Section Title with Progress Badge */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                General Availability
              </h3>
              {progressData && (
                <InlineProgressBadge
                  currentPoints={progressData.currentPoints}
                  totalPoints={progressData.totalPoints}
                  currentStepPoints={progressData.currentStepPoints}
                  requiredPoints={progressData.requiredPoints}
                  steps={progressData.steps}
                />
              )}
            </div>

            <HubForm.Grid>
              <HubForm.Field label={configs.get('availabilityDays')?.label || 'Days of the week'} required>
                <UnifiedMultiSelect
                  triggerLabel={formatMultiSelectLabel(generalDays, configs.get('availabilityDays')?.placeholder || 'Select days')}
                  options={configs.get('availabilityDays')?.options || dayOptions}
                  selectedValues={generalDays}
                  onSelectionChange={(values) => {
                    setGeneralDays(values);
                    handleImmediateSave();
                  }}
                />
              </HubForm.Field>

              <HubForm.Field label={configs.get('availabilityTimes')?.label || 'Times of day'} required>
                <UnifiedMultiSelect
                  triggerLabel={formatMultiSelectLabel(generalTimes, configs.get('availabilityTimes')?.placeholder || 'Select times')}
                  options={configs.get('availabilityTimes')?.options || timeOptions}
                  selectedValues={generalTimes}
                  onSelectionChange={(values) => {
                    setGeneralTimes(values);
                    handleImmediateSave();
                  }}
                />
              </HubForm.Field>
            </HubForm.Grid>
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
                  <Button variant="primary" size="md" onClick={handleAddAvailability} style={{ width: '100%' }}>
                    Add
                  </Button>
                </div>

                {/* Summary Sections */}
                {recurringPeriods.length > 0 && (
                  <div className={professionalStyles.formGroup}>
                    <label className={professionalStyles.formLabel}>Recurring Availability</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {recurringPeriods.map(period => {
                        const conflicts = periodConflicts.get(period.id);
                        const hasConflict = conflicts && conflicts.length > 0;

                        return (
                          <div key={period.id}>
                            <HubListItem
                              hasError={hasConflict}
                              actions={
                                <Button variant="danger" size="sm" onClick={() => handleRemoveAvailability(period.id)}>
                                  Remove
                                </Button>
                              }
                            >
                              {formatAvailabilityText(period)}
                            </HubListItem>
                            {hasConflict && (
                              <div style={{
                                marginTop: '4px',
                                padding: '8px 12px',
                                backgroundColor: '#FEF3C7',
                                borderRadius: '6px',
                                border: '1px solid #F59E0B'
                              }}>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                                  <span style={{ fontSize: '14px' }}>⚠️</span>
                                  <div style={{ flex: 1 }}>
                                    {conflicts.map((msg, idx) => (
                                      <div key={idx} style={{
                                        color: '#92400E',
                                        fontSize: '13px',
                                        marginBottom: idx < conflicts.length - 1 ? '4px' : '0'
                                      }}>
                                        {msg}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {oneTimePeriods.length > 0 && (
                  <div className={professionalStyles.formGroup}>
                    <label className={professionalStyles.formLabel}>One-time Availability</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {oneTimePeriods.map(period => {
                        const conflicts = periodConflicts.get(period.id);
                        const hasConflict = conflicts && conflicts.length > 0;

                        return (
                          <div key={period.id}>
                            <HubListItem
                              hasError={hasConflict}
                              actions={
                                <Button variant="danger" size="sm" onClick={() => handleRemoveAvailability(period.id)}>
                                  Remove
                                </Button>
                              }
                            >
                              {formatAvailabilityText(period)}
                            </HubListItem>
                            {hasConflict && (
                              <div style={{
                                marginTop: '4px',
                                padding: '8px 12px',
                                backgroundColor: '#FEF3C7',
                                borderRadius: '6px',
                                border: '1px solid #F59E0B'
                              }}>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                                  <span style={{ fontSize: '14px' }}>⚠️</span>
                                  <div style={{ flex: 1 }}>
                                    {conflicts.map((msg, idx) => (
                                      <div key={idx} style={{
                                        color: '#92400E',
                                        fontSize: '13px',
                                        marginBottom: idx < conflicts.length - 1 ? '4px' : '0'
                                      }}>
                                        {msg}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
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
                  <Button variant="primary" size="md" onClick={handleAddUnavailability} style={{ width: '100%' }}>
                    Add
                  </Button>
                </div>

                {/* Summary Section */}
                {unavailabilityPeriods.length > 0 && (
                  <div className={professionalStyles.formGroup}>
                    <label className={professionalStyles.formLabel}>Unavailable Period</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {unavailabilityPeriods.map(period => (
                        <HubListItem
                          key={period.id}
                          actions={
                            <Button variant="danger" size="sm" onClick={() => handleRemoveUnavailability(period.id)}>
                              Remove
                            </Button>
                          }
                        >
                          {formatUnavailabilityText(period)}
                        </HubListItem>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </HubForm.Section>
        </HubForm.Root>
      </div>

      {/* Action Buttons using shared component */}
      <WizardActionButtons
        onNext={handleNext}
        nextEnabled={isValid}
        onBack={onBack}
        isLoading={isLoading}
      />
    </div>
  );
};

export default ClientAvailabilityStep;
