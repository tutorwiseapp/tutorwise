/**
 * Filename: SchedulingModal.tsx
 * Purpose: Modal for scheduling/proposing session times (Stage 3: SCHEDULE)
 * Created: 2026-02-05
 *
 * Part of the 5-stage booking workflow: Discover > Book > SCHEDULE > Pay > Review
 *
 * Features:
 * - Calendar date picker
 * - Time slot selection
 * - Timezone notice (UK time)
 * - Propose time / Confirm proposal / Counter-propose
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Booking, SchedulingStatus } from '@/types';
import Modal from '@/app/components/ui/feedback/Modal';
import Button from '@/app/components/ui/actions/Button';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { DEFAULT_SCHEDULING_RULES, getPlatformTimezoneDisplay } from '@/lib/scheduling/rules';
import styles from './SchedulingModal.module.css';

interface SchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  onScheduleProposed?: (date: Date) => void;
  onScheduleConfirmed?: () => void;
}

// Generate time slots (30-minute intervals from 8am to 9pm)
const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let hour = 8; hour <= 21; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 21) {
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

// Generate next 30 available dates
const generateAvailableDates = (): Date[] => {
  const dates: Date[] = [];
  const now = new Date();
  const minDate = new Date(now.getTime() + DEFAULT_SCHEDULING_RULES.minimumNoticeHours * 60 * 60 * 1000);

  for (let i = 0; i < 30; i++) {
    const date = new Date(minDate);
    date.setDate(minDate.getDate() + i);
    date.setHours(0, 0, 0, 0);
    dates.push(date);
  }
  return dates;
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

  const availableDates = useMemo(() => generateAvailableDates(), []);

  // Determine user's role in this booking
  const isProposer = booking.proposed_by === profile?.id;
  const canConfirm = booking.scheduling_status === 'proposed' && !isProposer;
  const canPropose = booking.scheduling_status === 'unscheduled' ||
    (booking.scheduling_status === 'proposed' && !isProposer && showCounterPropose);

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

  // Handle propose time
  const handleProposeTime = async () => {
    if (!selectedDate || !selectedTime) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Combine date and time
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const proposedDateTime = new Date(selectedDate);
      proposedDateTime.setHours(hours, minutes, 0, 0);

      const response = await fetch(`/api/bookings/${booking.id}/schedule/propose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposed_date: proposedDateTime.toISOString() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to propose time');
      }

      onScheduleProposed?.(proposedDateTime);
      onClose();
      // Reload to show updated state
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to propose time');
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Your Session">
      <div className={styles.modalContent}>
        {/* Session Summary */}
        <div className={styles.sessionSummary}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Service:</span>
            <span className={styles.summaryValue}>{booking.service_name}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Duration:</span>
            <span className={styles.summaryValue}>{booking.session_duration} minutes</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Rate:</span>
            <span className={styles.summaryValue}>
              {isFreeSession ? 'Free' : `£${booking.amount.toFixed(2)}`}
            </span>
          </div>
        </div>

        {/* Timezone Notice */}
        <div className={styles.timezoneNotice}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm0 14.5a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13zm.75-9.75H7.5v4.5l3.75 2.25.75-1.23-3-1.8V4.75z"/>
          </svg>
          <span>All times shown in {getPlatformTimezoneDisplay()}</span>
        </div>

        {/* Error Display */}
        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        {/* Current Proposal Display */}
        {booking.scheduling_status === 'proposed' && proposedDateDisplay && !showCounterPropose && (
          <div className={styles.proposalSection}>
            <h3 className={styles.sectionTitle}>Proposed Time</h3>
            <div className={styles.proposedTime}>
              {proposedDateDisplay}
            </div>
            <p className={styles.proposedBy}>
              Proposed by {isProposer ? 'you' : 'the other party'}
            </p>

            {canConfirm && (
              <div className={styles.confirmActions}>
                <Button
                  variant="primary"
                  onClick={handleConfirmTime}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Processing...' :
                    isFreeSession ? 'Confirm Time' : `Confirm & Pay £${booking.amount.toFixed(2)}`}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowCounterPropose(true)}
                  disabled={isSubmitting}
                >
                  Suggest Different Time
                </Button>
              </div>
            )}

            {isProposer && (
              <p className={styles.waitingText}>
                Waiting for the other party to confirm...
              </p>
            )}
          </div>
        )}

        {/* Date/Time Picker */}
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

            <div className={styles.dateSection}>
              <h3 className={styles.sectionTitle}>Select a Date</h3>
              <div className={styles.dateGrid}>
                {availableDates.slice(0, 14).map((date) => {
                  const isSelected = selectedDate?.toDateString() === date.toDateString();
                  return (
                    <button
                      key={date.toISOString()}
                      className={`${styles.dateButton} ${isSelected ? styles.selected : ''}`}
                      onClick={() => setSelectedDate(date)}
                    >
                      <span className={styles.dateDay}>
                        {date.toLocaleDateString('en-GB', { weekday: 'short' })}
                      </span>
                      <span className={styles.dateNum}>
                        {date.getDate()}
                      </span>
                      <span className={styles.dateMonth}>
                        {date.toLocaleDateString('en-GB', { month: 'short' })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedDate && (
              <div className={styles.timeSection}>
                <h3 className={styles.sectionTitle}>Select a Time</h3>
                <div className={styles.timeGrid}>
                  {TIME_SLOTS.map((time) => {
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        className={`${styles.timeButton} ${isSelected ? styles.selected : ''}`}
                        onClick={() => setSelectedTime(time)}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedDate && selectedTime && (
              <div className={styles.proposeActions}>
                <Button
                  variant="primary"
                  onClick={handleProposeTime}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Proposing...' : 'Propose This Time'}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Modal Actions */}
        <div className={styles.modalActions}>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
