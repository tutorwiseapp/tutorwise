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

import React, { useState } from 'react';
import { Booking } from '@/types';
import HubComplexModal from '@/app/components/hub/modal/HubComplexModal/HubComplexModal';
import Button from '@/app/components/ui/actions/Button';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { DEFAULT_SCHEDULING_RULES, getPlatformTimezoneDisplay } from '@/lib/scheduling/rules';
import { Calendar, Clock, Info } from 'lucide-react';
import { formatIdForDisplay } from '@/lib/utils/formatId';
import styles from './SchedulingModal.module.css';
import pickerStyles from '@/app/components/ui/forms/Pickers.module.css';

interface SchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  onScheduleProposed?: (date: Date) => void;
  onScheduleConfirmed?: () => void;
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

// TODO: Replace with actual availability check from backend/tutor availability data
const isDateAvailable = (date: Date | null): boolean => {
  if (!date) return false;

  const now = new Date();
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // If the date is in the past (before today), it's not available
  if (compareDate < today) return false;

  // If the date is today, check if there are any slots available later today
  if (compareDate.getTime() === today.getTime()) {
    // Calculate the earliest available time (now + minimum notice hours)
    const earliestTime = new Date();
    earliestTime.setTime(earliestTime.getTime() + DEFAULT_SCHEDULING_RULES.minimumNoticeHours * 60 * 60 * 1000);

    // Check if earliest available time is still within today (before midnight)
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Today is available if we can still book slots later today
    return earliestTime <= endOfDay;
  }

  // Future dates are available
  return true;
};

export default function SchedulingModal({
  isOpen,
  onClose,
  booking,
  onScheduleProposed,
  onScheduleConfirmed,
}: SchedulingModalProps) {
  const { profile } = useUserProfile();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCounterPropose, setShowCounterPropose] = useState(false);

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
        throw new Error(data.error || `Failed to ${isRescheduling ? 'reschedule' : 'propose time'}`);
      }

      onScheduleProposed?.(proposedDateTime);
      onClose();
      // Reload to show updated state
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isRescheduling ? 'reschedule' : 'propose time'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle confirm time
  const handleConfirmTime = async () => {
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
      onClose();
      window.location.reload();
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

  // Footer actions
  const footer = (
    <div className={styles.footer}>
      <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
        Cancel
      </Button>
      {canConfirm && (
        <Button
          variant="primary"
          onClick={handleConfirmTime}
          disabled={isSubmitting}
          title={isSubmitting ? 'Processing...' : ''}
        >
          {isSubmitting ? 'Processing...' :
            isFreeSession ? 'Confirm Time' : `Confirm & Pay £${booking.amount.toFixed(2)}`}
        </Button>
      )}
      {(canPropose || showCounterPropose) && (
        <Button
          variant="primary"
          onClick={handleProposeTime}
          disabled={isSubmitting || !selectedDate || !selectedTime}
          title={!selectedDate || !selectedTime ? 'Select date and time first' : ''}
        >
          {isSubmitting
            ? (isRescheduling ? 'Requesting Reschedule...' : 'Proposing...')
            : (isRescheduling ? 'Request Reschedule' : 'Propose This Time')}
        </Button>
      )}
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
              ? `All times shown in ${getPlatformTimezoneDisplay()}`
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
                {isSubmitting ? 'Processing...' :
                  isFreeSession ? 'Confirm Time' : `Confirm & Pay £${booking.amount.toFixed(2)}`}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowCounterPropose(true)}
                disabled={isSubmitting}
                size="sm"
              >
                Suggest Different Time
              </Button>
            </div>
          )}
          {isProposer && !canConfirm && (
            <p className={styles.waitingText}>
              Waiting for the other party to confirm...
            </p>
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
                <h4>Select Date</h4>
              </div>

              {/* DayPicker Inline Calendar */}
              <div className={styles.calendarContainer}>
                <DayPicker
                  mode="single"
                  selected={selectedDate || undefined}
                  onSelect={(date) => {
                    setSelectedDate(date || null);
                    setSelectedTime(null); // Reset time when date changes
                  }}
                  disabled={(date) => !isDateAvailable(date)}
                  captionLayout="dropdown"
                  fromYear={new Date().getFullYear()}
                  toYear={new Date().getFullYear() + 2}
                  className={pickerStyles.datePickerCalendar}
                  modifiersClassNames={{
                    selected: styles.calendarDaySelected,
                    disabled: styles.calendarDayDisabled,
                  }}
                />
              </div>
            </div>

            {/* Right Column: Time Picker */}
            <div className={styles.timePickerColumn}>
              <div className={styles.columnHeader}>
                <Clock size={18} />
                <h4>Select Time</h4>
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
                  <div className={styles.timeSlotGroups}>
                    {TIME_SLOT_GROUPS.map((group) => (
                      <div key={group.label} className={styles.timeGroup}>
                        <h5 className={styles.timeGroupLabel}>{group.label}</h5>
                        <div className={styles.timeSlotGrid}>
                          {group.slots.map((time) => (
                            <label key={time} className={styles.timeSlotLabel}>
                              <input
                                type="radio"
                                name="time-slot"
                                value={time}
                                checked={selectedTime === time}
                                onChange={() => setSelectedTime(time)}
                                className={styles.timeSlotRadio}
                              />
                              <span className={styles.timeSlotText}>{time}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </HubComplexModal>
  );
}
