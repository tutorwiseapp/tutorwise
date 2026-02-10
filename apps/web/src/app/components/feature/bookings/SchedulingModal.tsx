/**
 * Filename: SchedulingModal.tsx
 * Purpose: Modal for scheduling/proposing session times (Stage 3: SCHEDULE)
 * Created: 2026-02-05
 * Updated: 2026-02-06 - Inline month calendar with availability-based date styling
 *
 * Part of the 5-stage booking workflow: Discover > Book > SCHEDULE > Pay > Review
 *
 * Features:
 * - Inline month calendar (always visible, not popover)
 * - Month/Year dropdowns for navigation
 * - Available dates shown in green, unavailable in gray
 * - Time slot selection with radio buttons grouped by Morning/Afternoon/Evening
 * - Two-column fixed layout (date picker + time picker)
 * - Current scheduled time info (plain text, no card)
 * - Timezone notice (UK time)
 * - Propose time / Confirm proposal / Counter-propose / Reschedule
 */

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Booking } from '@/types';
import HubComplexModal from '@/app/components/hub/modal/HubComplexModal/HubComplexModal';
import Button from '@/app/components/ui/actions/Button';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { DEFAULT_SCHEDULING_RULES, getPlatformTimezoneDisplay } from '@/lib/scheduling/rules';
import { PLATFORM_TIMEZONE, detectUserTimezone } from '@/lib/utils/timezone-converter';
import { AlertCircle, Calendar, Clock, Info } from 'lucide-react';
import { formatIdForDisplay } from '@/lib/utils/formatId';
import { useLocalStorageDraft, formatDraftAge } from '@/hooks/useLocalStorageDraft';
import styles from './SchedulingModal.module.css';

interface SchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  onScheduleProposed?: (date: Date) => void;
  onScheduleConfirmed?: () => void;
  onSchedulingComplete?: () => Promise<void>;
}

// Generate time slots grouped by time of day
interface TimeSlotGroup {
  label: string;
  slots: string[];
}

const generateTimeSlots = (): TimeSlotGroup[] => {
  return [
    {
      label: 'Morning',
      slots: ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30'],
    },
    {
      label: 'Afternoon',
      slots: ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'],
    },
    {
      label: 'Evening',
      slots: ['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'],
    },
  ];
};

const TIME_SLOT_GROUPS = generateTimeSlots();

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

// Generate calendar days for a given month/year
const generateCalendarDays = (year: number, month: number): (Date | null)[] => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // Get day of week (0 = Sunday, 1 = Monday, etc.)
  // Adjust so Monday = 0
  let firstDayOfWeek = firstDay.getDay() - 1;
  if (firstDayOfWeek < 0) firstDayOfWeek = 6; // Sunday becomes 6

  const days: (Date | null)[] = [];

  // Add empty cells for days before month starts
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }

  // Add actual days
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }

  // Pad to complete the week grid (6 rows x 7 days = 42 cells)
  while (days.length < 42) {
    days.push(null);
  }

  return days;
};

export default function SchedulingModal({
  isOpen,
  onClose,
  booking,
  onScheduleProposed,
  onScheduleConfirmed,
  onSchedulingComplete,
}: SchedulingModalProps) {
  const { profile } = useUserProfile();

  // Determine user's timezone (v7.0 timezone support)
  const userTimezone = (profile as any)?.timezone || detectUserTimezone();
  const showDualTimezone = userTimezone !== PLATFORM_TIMEZONE;

  // All hooks declared before any early returns (Rules of Hooks)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCounterPropose, setShowCounterPropose] = useState(false);

  // Calendar navigation state
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  // Rate limiting state
  const [lastActionTime, setLastActionTime] = useState<number>(0);
  const ACTION_COOLDOWN_MS = 2000; // 2 seconds between actions

  // Draft state for persistence
  interface SchedulingDraft {
    selectedDate: string | null; // ISO string
    selectedTime: string | null;
    currentMonth: number;
    currentYear: number;
  }

  const draftData: SchedulingDraft = {
    selectedDate: selectedDate?.toISOString() || null,
    selectedTime,
    currentMonth,
    currentYear,
  };

  const { hasDraft, draftAge, loadDraft, clearDraft } = useLocalStorageDraft({
    key: `scheduling-modal-${booking.id}-${profile?.id || ''}`,
    data: draftData,
    enabled: isOpen && !!profile?.id,
  });

  // Load draft on mount
  useEffect(() => {
    if (hasDraft && isOpen) {
      const draft = loadDraft();
      if (draft) {
        const draftTyped = draft as SchedulingDraft;
        if (draftTyped.selectedDate) {
          setSelectedDate(new Date(draftTyped.selectedDate));
        }
        if (draftTyped.selectedTime) {
          setSelectedTime(draftTyped.selectedTime);
        }
        if (draftTyped.currentMonth !== undefined) {
          setCurrentMonth(draftTyped.currentMonth);
        }
        if (draftTyped.currentYear !== undefined) {
          setCurrentYear(draftTyped.currentYear);
        }
        console.log(`[SchedulingModal] Restored draft: ${formatDraftAge(draftAge)}`);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasDraft, isOpen]); // Only run on mount when modal opens

  // Availability API state
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [_isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  // Fetch tutor availability when month/year changes
  useEffect(() => {
    async function fetchAvailability() {
      if (!booking.tutor_id || !isOpen) return;

      setIsLoadingAvailability(true);
      try {
        const response = await fetch(
          `/api/availability?tutorId=${booking.tutor_id}&month=${currentMonth}&year=${currentYear}`
        );

        if (!response.ok) {
          console.error('Failed to fetch availability');
          setAvailableDates([]);
          return;
        }

        const data = await response.json();
        setAvailableDates(data.availableDates || []);
      } catch (_error) {
        console.error('Error fetching availability:', _error);
        setAvailableDates([]);
      } finally {
        setIsLoadingAvailability(false);
      }
    }

    fetchAvailability();
  }, [booking.tutor_id, currentMonth, currentYear, isOpen]);

  // Generate calendar days for current view
  const calendarDays = useMemo(
    () => generateCalendarDays(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

  // Generate year options (current year + next 2 years)
  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let i = 0; i < 3; i++) {
      years.push(today.getFullYear() + i);
    }
    return years;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Early return if profile is not available (after all hooks)
  if (!profile?.id) {
    return (
      <HubComplexModal
        isOpen={isOpen}
        onClose={onClose}
        title="Schedule Your Session"
      >
        <div className={styles.errorBanner}>
          <AlertCircle size={20} />
          <span>Unable to load user profile. Please refresh and try again.</span>
        </div>
        <div className={styles.footer}>
          <Button onClick={onClose}>Close</Button>
        </div>
      </HubComplexModal>
    );
  }

  // Check if a date is available based on API data
  const isDateAvailable = (date: Date | null): boolean => {
    if (!date) return false;

    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Past dates are not available
    if (compareDate < today) return false;

    // Check if date is in the available dates from API
    const dateString = compareDate.toISOString().split('T')[0]; // YYYY-MM-DD
    return availableDates.includes(dateString);
  };

  // Determine user's role in this booking
  const isProposer = booking.proposed_by === profile?.id;
  const isRescheduling = booking.scheduling_status === 'scheduled';
  const canConfirm = booking.scheduling_status === 'proposed' && !isProposer;
  const canPropose = booking.scheduling_status === 'unscheduled' ||
    (booking.scheduling_status === 'proposed' && !isProposer && showCounterPropose) ||
    isRescheduling;

  // Format proposed date for display
  const proposedDateDisplay = booking.session_start_time
    ? new Date(booking.session_start_time).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/London',
      })
    : null;

  // Format selected date for time picker header
  const selectedDateDisplay = selectedDate
    ? selectedDate.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  // Handle propose time (or reschedule if already scheduled)
  const handleProposeTime = async () => {
    if (!selectedDate || !selectedTime) return;

    // Rate limiting check
    const now = Date.now();
    const timeSinceLastAction = now - lastActionTime;
    if (timeSinceLastAction < ACTION_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((ACTION_COOLDOWN_MS - timeSinceLastAction) / 1000);
      setError(`Please wait ${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''} before trying again.`);
      return;
    }

    setLastActionTime(now);
    setIsSubmitting(true);
    setError(null);

    try {
      // Combine date and time
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const proposedDateTime = new Date(selectedDate);
      proposedDateTime.setHours(hours, minutes, 0, 0);

      // Use reschedule endpoint if booking is already scheduled
      const endpoint = isRescheduling
        ? `/api/bookings/${booking.id}/schedule/reschedule`
        : `/api/bookings/${booking.id}/schedule/propose`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposed_date: proposedDateTime.toISOString() }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle conflict (409) separately - refresh availability
        if (response.status === 409) {
          setError(data.error || 'This time slot was just booked. Please select another time.');
          // Clear selected time and refresh available dates
          setSelectedTime(null);
          // Trigger availability refresh by re-fetching
          const availResponse = await fetch(
            `/api/availability?tutorId=${booking.tutor_id}&month=${currentMonth}&year=${currentYear}`
          );
          if (availResponse.ok) {
            const availData = await availResponse.json();
            setAvailableDates(availData.availableDates || []);
          }
          return;
        }
        throw new Error(data.error || `Failed to ${isRescheduling ? 'reschedule' : 'propose time'}`);
      }

      onScheduleProposed?.(proposedDateTime);
      clearDraft(); // Clear draft after successful submission
      await onSchedulingComplete?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isRescheduling ? 'reschedule' : 'propose time'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle withdraw/decline proposal
  const handleWithdrawProposal = async () => {
    // Rate limiting check
    const now = Date.now();
    const timeSinceLastAction = now - lastActionTime;
    if (timeSinceLastAction < ACTION_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((ACTION_COOLDOWN_MS - timeSinceLastAction) / 1000);
      setError(`Please wait ${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''} before trying again.`);
      return;
    }

    if (!window.confirm(
      isProposer
        ? 'Are you sure you want to withdraw your time proposal?'
        : 'Are you sure you want to decline this time proposal?'
    )) {
      return;
    }

    setLastActionTime(now);
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/bookings/${booking.id}/schedule/withdraw`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to withdraw proposal');
      }

      clearDraft(); // Clear draft after successful withdrawal
      await onSchedulingComplete?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to withdraw proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle confirm time
  const handleConfirmTime = async () => {
    // Rate limiting check
    const now = Date.now();
    const timeSinceLastAction = now - lastActionTime;
    if (timeSinceLastAction < ACTION_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((ACTION_COOLDOWN_MS - timeSinceLastAction) / 1000);
      setError(`Please wait ${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''} before trying again.`);
      return;
    }

    setLastActionTime(now);
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/bookings/${booking.id}/schedule/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm time');
      }

      // If payment required, redirect to checkout
      if (data.requires_payment && data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }

      onScheduleConfirmed?.();
      clearDraft(); // Clear draft after successful confirmation
      await onSchedulingComplete?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm time');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine if free session
  const isFreeSession = !booking.amount || booking.amount === 0;

  // Format booking ID for subtitle
  const bookingIdDisplay = formatIdForDisplay(booking.id);

  // Handle date selection
  const handleDateClick = (date: Date | null) => {
    if (!date || !isDateAvailable(date)) return;
    setSelectedDate(date);
    setSelectedTime(null); // Reset time selection when date changes
  };

  // Footer actions
  const footer = (
    <div className={styles.footer}>
      <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
        Cancel
      </Button>

      {/* Confirm & Pay button - always shown, disabled when not applicable */}
      <Button
        variant="primary"
        onClick={handleConfirmTime}
        disabled={isSubmitting || !canConfirm}
        title={
          isSubmitting
            ? 'Processing...'
            : !canConfirm
              ? 'Wait for time proposal to confirm'
              : ''
        }
      >
        {isSubmitting ? 'Processing...' :
          isFreeSession ? 'Confirm Time' : `Confirm & Pay £${booking.amount.toFixed(2)}`}
      </Button>

      {/* Propose/Reschedule button - always shown, disabled when not applicable */}
      <Button
        variant="primary"
        onClick={handleProposeTime}
        disabled={isSubmitting || !selectedDate || !selectedTime || (!canPropose && !showCounterPropose)}
        title={
          isSubmitting
            ? (isRescheduling ? 'Requesting Reschedule...' : 'Proposing...')
            : !selectedDate || !selectedTime
              ? 'Select date and time first'
              : (!canPropose && !showCounterPropose)
                ? 'No proposal needed at this stage'
                : ''
        }
      >
        {isSubmitting
          ? (isRescheduling ? 'Requesting Reschedule...' : 'Proposing...')
          : (isRescheduling ? 'Request Reschedule' : 'Propose This Time')}
      </Button>
    </div>
  );

  return (
    <HubComplexModal
      isOpen={isOpen}
      onClose={onClose}
      title="Schedule Your Session"
      subtitle={`Booking ${bookingIdDisplay}`}
      size="lg"
      footer={footer}
      isLoading={isSubmitting}
    >
      {/* Error Display */}
      {error && (
        <div className={styles.errorBanner}>
          <Info size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Current Scheduled/Proposed Time Info (Plain Text) */}
      {(isRescheduling || (booking.scheduling_status === 'proposed' && !showCounterPropose)) && proposedDateDisplay && (
        <div className={styles.currentTimeInfo}>
          <p className={styles.currentTimeLabel}>
            {isRescheduling ? 'Current Scheduled Time' : 'Proposed Time'}
          </p>
          <p className={styles.currentTimeValue}>{proposedDateDisplay}</p>
          <p className={styles.currentTimeFooter}>
            {isRescheduling
              ? showDualTimezone
                ? `Your timezone: ${userTimezone} (Platform: ${PLATFORM_TIMEZONE})`
                : `All times shown in ${getPlatformTimezoneDisplay()}`
              : `Proposed by ${isProposer ? 'you' : 'the other party'}`}
          </p>
          {canConfirm && (
            <div className={styles.confirmActions}>
              <Button
                variant="primary"
                onClick={handleConfirmTime}
                disabled={isSubmitting}
                size="sm"
              >
                {isSubmitting ? 'Confirming...' :
                  isFreeSession ? 'Confirm Time' : `Confirm & Pay £${booking.amount.toFixed(2)}`}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowCounterPropose(true)}
                disabled={isSubmitting}
                size="sm"
              >
                {isSubmitting ? 'Loading...' : 'Suggest Different Time'}
              </Button>
              <Button
                variant="ghost"
                onClick={handleWithdrawProposal}
                disabled={isSubmitting}
                size="sm"
              >
                {isSubmitting ? 'Declining...' : 'Decline Proposal'}
              </Button>
            </div>
          )}
          {isProposer && !canConfirm && (
            <>
              <p className={styles.waitingText}>
                Waiting for the other party to confirm...
              </p>
              <Button
                variant="ghost"
                onClick={handleWithdrawProposal}
                disabled={isSubmitting}
                size="sm"
                className={styles.withdrawButton}
              >
                {isSubmitting ? 'Withdrawing...' : 'Withdraw Proposal'}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Two-Column Layout: Date Picker + Time Picker */}
      {(canPropose || showCounterPropose) && (
        <>
          {showCounterPropose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCounterPropose(false)}
              className={styles.backButton}
            >
              &larr; Back to proposal
            </Button>
          )}

          <div className={styles.twoColumnLayout}>
            {/* Left Column: Inline Calendar */}
            <div className={styles.datePickerColumn}>
              <div className={styles.columnHeader}>
                <Calendar size={18} />
                <h4>SELECT DATE</h4>
              </div>

              {/* Calendar Grid */}
              <div className={styles.calendarContainer}>
                {/* Month/Year Dropdowns */}
                <div className={styles.monthYearSelector}>
                  <UnifiedSelect
                    options={MONTHS.map((month, index) => ({
                      value: index,
                      label: month,
                    }))}
                    value={currentMonth}
                    onChange={(value) => setCurrentMonth(Number(value))}
                    size="md"
                  />
                  <UnifiedSelect
                    options={yearOptions.map((year) => ({
                      value: year,
                      label: String(year),
                    }))}
                    value={currentYear}
                    onChange={(value) => setCurrentYear(Number(value))}
                    size="md"
                  />
                </div>

                {/* Day headers */}
                <div className={styles.dayHeaders}>
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day} className={styles.dayHeader}>
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar days */}
                <div className={styles.calendarGrid}>
                  {calendarDays.map((date, index) => {
                    if (!date) {
                      return <div key={`empty-${index}`} className={styles.emptyCell} />;
                    }

                    const isAvailable = isDateAvailable(date);
                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                    const isToday = date.toDateString() === new Date().toDateString();

                    return (
                      <button
                        key={date.toISOString()}
                        className={`${styles.calendarDay} ${
                          isAvailable ? styles.available : styles.unavailable
                        } ${isSelected ? styles.selected : ''} ${isToday ? styles.today : ''}`}
                        onClick={() => handleDateClick(date)}
                        disabled={!isAvailable}
                        type="button"
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Time Picker */}
            <div className={styles.timePickerColumn}>
              <div className={styles.columnHeader}>
                <Clock size={18} />
                <h4>SELECT TIME</h4>
              </div>

              {!selectedDate ? (
                <div className={styles.emptyState}>
                  <Calendar size={32} />
                  <p>Select a date to see available times</p>
                </div>
              ) : (
                <>
                  {/* Selected date display */}
                  <div className={styles.selectedDateDisplay}>
                    {selectedDateDisplay}
                  </div>

                  {/* Time slots with radio buttons */}
                  {(() => {
                    // Calculate available time slots
                    const isToday = selectedDate?.toDateString() === new Date().toDateString();
                    const availableSlots = TIME_SLOT_GROUPS.flatMap(group =>
                      group.slots.filter(time => {
                        if (!isToday || !selectedDate) return true;

                        const [hours, minutes] = time.split(':').map(Number);
                        const slotTime = new Date(selectedDate);
                        slotTime.setHours(hours, minutes, 0, 0);
                        const now = new Date();

                        const minNoticeMs = DEFAULT_SCHEDULING_RULES.minimumNoticeHours * 60 * 60 * 1000;
                        return slotTime.getTime() - now.getTime() >= minNoticeMs;
                      })
                    );

                    if (availableSlots.length === 0) {
                      return (
                        <div className={styles.emptyState}>
                          <Clock size={32} />
                          <p>No available times for this date</p>
                          <p className={styles.waitingText}>
                            Please select a different date
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className={styles.timeSlotGroups}>
                        {TIME_SLOT_GROUPS.map((group) => (
                          <div key={group.label} className={styles.timeGroup}>
                            <h5 className={styles.timeGroupLabel}>{group.label}</h5>
                            <div className={styles.timeSlotGrid}>
                              {group.slots.map((time) => {
                                let isPastTime = false;

                                if (isToday && selectedDate) {
                                  const [hours, minutes] = time.split(':').map(Number);
                                  const slotTime = new Date(selectedDate);
                                  slotTime.setHours(hours, minutes, 0, 0);
                                  const now = new Date();

                                  const minNoticeMs = DEFAULT_SCHEDULING_RULES.minimumNoticeHours * 60 * 60 * 1000;
                                  isPastTime = slotTime.getTime() - now.getTime() < minNoticeMs;
                                }

                                return (
                                  <label
                                    key={time}
                                    className={`${styles.timeSlotLabel} ${isPastTime ? styles.timeSlotDisabled : ''}`}
                                  >
                                    <input
                                      type="radio"
                                      name="time-slot"
                                      value={time}
                                      checked={selectedTime === time}
                                      onChange={() => setSelectedTime(time)}
                                      disabled={isPastTime}
                                      className={styles.timeSlotRadio}
                                    />
                                    <span className={styles.timeSlotText}>{time}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </HubComplexModal>
  );
}
