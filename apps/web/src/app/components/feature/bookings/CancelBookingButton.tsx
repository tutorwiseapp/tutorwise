/**
 * Filename: CancelBookingButton.tsx
 * Purpose: Button component for cancelling bookings with policy preview and confirmation
 * Created: 2026-02-06
 *
 * Features:
 * - Shows refund policy preview based on 24h threshold
 * - Displays Stripe fee deduction notice
 * - Confirmation dialog before cancellation
 * - Handles API call and error states
 */

'use client';

import React, { useState } from 'react';
import Button from '@/app/components/ui/actions/Button';
import { Booking } from '@/types';
import { getCancellationPolicyPreview } from '@/lib/booking-policies/cancellation';

interface CancelBookingButtonProps {
  booking: Booking;
  viewMode: 'client' | 'tutor';
  onCancelled?: () => void; // Callback after successful cancellation
}

export default function CancelBookingButton({
  booking,
  viewMode,
  onCancelled,
}: CancelBookingButtonProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if booking can be cancelled
  const canCancel = booking.status !== 'Cancelled' && booking.status !== 'Completed';

  if (!canCancel) {
    return null; // Don't show button if booking can't be cancelled
  }

  // Calculate hours until session
  const getHoursUntilSession = () => {
    if (!booking.session_start_time) return 0;
    const sessionStart = new Date(booking.session_start_time);
    const now = new Date();
    return (sessionStart.getTime() - now.getTime()) / (1000 * 60 * 60);
  };

  const hoursUntilSession = getHoursUntilSession();

  // Get policy preview (only relevant for clients)
  const policyPreview = viewMode === 'client'
    ? getCancellationPolicyPreview(hoursUntilSession, booking.amount)
    : null;

  const handleCancelClick = () => {
    setShowConfirmation(true);
    setError(null);
  };

  const handleConfirmCancel = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(`/api/bookings/${booking.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'User requested cancellation',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel booking');
      }

      // Success!
      setShowConfirmation(false);

      if (onCancelled) {
        onCancelled();
      } else {
        // Refresh the page to show updated booking status
        window.location.reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel booking');
      setIsProcessing(false);
    }
  };

  const handleCancelDialog = () => {
    setShowConfirmation(false);
    setError(null);
  };

  // Confirmation Dialog
  if (showConfirmation) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}
      >
        <div
          style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>
            Cancel Booking?
          </h3>

          {viewMode === 'client' && policyPreview && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#666' }}>
                Cancellation Policy
              </h4>

              {hoursUntilSession >= 24 ? (
                <div style={{ padding: '1rem', backgroundColor: '#e8f5e9', borderRadius: '4px', marginBottom: '1rem' }}>
                  <p style={{ margin: 0, fontWeight: 500, color: '#2e7d32' }}>
                    ✓ Full refund (minus Stripe processing fee)
                  </p>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#555' }}>
                    You'll receive: £{(booking.amount - (booking.amount * 0.015 + 0.20)).toFixed(2)} (~98% of £{booking.amount.toFixed(2)})
                  </p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#666' }}>
                    Stripe retains 1.5% + 20p processing fee (UK/EU cards)
                  </p>
                </div>
              ) : (
                <div style={{ padding: '1rem', backgroundColor: '#fff3e0', borderRadius: '4px', marginBottom: '1rem' }}>
                  <p style={{ margin: 0, fontWeight: 500, color: '#e65100' }}>
                    ⚠ No refund - within 24 hours
                  </p>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#555' }}>
                    {policyPreview.warning}
                  </p>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#555' }}>
                    The tutor will receive: {policyPreview.tutorPayout}
                  </p>
                </div>
              )}

              <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '1rem' }}>
                Hours until session: <strong>{hoursUntilSession.toFixed(1)}h</strong>
              </p>
            </div>
          )}

          {viewMode === 'tutor' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ padding: '1rem', backgroundColor: '#fff3e0', borderRadius: '4px' }}>
                <p style={{ margin: 0, fontWeight: 500, color: '#e65100' }}>
                  ⚠ Tutor Cancellation Policy
                </p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#555' }}>
                  • Client receives full refund (minus Stripe fee)
                </p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#555' }}>
                  • Your CaaS reputation score will be reduced by 10 points
                </p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#555' }}>
                  • This may affect your search ranking
                </p>
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                padding: '1rem',
                backgroundColor: '#ffebee',
                color: '#c62828',
                borderRadius: '4px',
                marginBottom: '1rem',
                fontSize: '0.9rem',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCancelDialog}
              disabled={isProcessing}
            >
              Keep Booking
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmCancel}
              disabled={isProcessing}
              style={{
                backgroundColor: '#d32f2f',
                borderColor: '#d32f2f',
              }}
            >
              {isProcessing ? 'Cancelling...' : 'Yes, Cancel Booking'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Cancel Button
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleCancelClick}
      style={{
        borderColor: '#d32f2f',
        color: '#d32f2f',
      }}
    >
      Cancel Booking
    </Button>
  );
}
