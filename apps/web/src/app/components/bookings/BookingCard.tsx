/*
 * Filename: src/app/components/bookings/BookingCard.tsx
 * Purpose: Display booking information in card format (SDD v3.6)
 * Created: 2025-11-02
 * Specification: SDD v3.6, Section 4.1 - /bookings hub UI
 */
'use client';

import { Booking, BookingStatus, PaymentStatus } from '@/types';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';

interface BookingCardProps {
  booking: Booking;
  viewMode: 'student' | 'tutor'; // Role-aware display
  onPayNow?: (bookingId: string) => void;
  onViewDetails?: (bookingId: string) => void;
}

export default function BookingCard({
  booking,
  viewMode,
  onPayNow,
  onViewDetails,
}: BookingCardProps) {
  // Format date/time
  const sessionDate = new Date(booking.session_start_time);
  const formattedDate = sessionDate.toLocaleDateString('en-GB', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = sessionDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Status badge colors
  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case 'Confirmed':
        return 'bg-green-100 text-green-800';
      case 'Completed':
        return 'bg-blue-100 text-blue-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      case 'Pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getPaymentStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Failed':
        return 'bg-red-100 text-red-800';
      case 'Refunded':
        return 'bg-gray-100 text-gray-800';
      case 'Pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  // Determine who the "other party" is based on view mode
  const otherParty = viewMode === 'student' ? booking.tutor : booking.student;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Header: Service Name + Status Badges */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {booking.service_name}
            </h3>
            {otherParty && (
              <p className="text-sm text-gray-600">
                {viewMode === 'student' ? 'Tutor: ' : 'Student: '}
                <span className="font-medium">{otherParty.full_name}</span>
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                booking.status
              )}`}
            >
              {booking.status}
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(
                booking.payment_status
              )}`}
            >
              {booking.payment_status}
            </span>
          </div>
        </div>

        {/* Session Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-sm">
          <div>
            <span className="text-gray-500">Date:</span>{' '}
            <span className="font-medium text-gray-900">{formattedDate}</span>
          </div>
          <div>
            <span className="text-gray-500">Time:</span>{' '}
            <span className="font-medium text-gray-900">{formattedTime}</span>
          </div>
          <div>
            <span className="text-gray-500">Duration:</span>{' '}
            <span className="font-medium text-gray-900">
              {booking.session_duration} mins
            </span>
          </div>
          <div>
            <span className="text-gray-500">Amount:</span>{' '}
            <span className="font-medium text-gray-900">
              £{booking.amount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-gray-200">
          {/* Student-specific: Show "Pay Now" if Pending */}
          {viewMode === 'student' &&
            booking.payment_status === 'Pending' &&
            onPayNow && (
              <Button
                onClick={() => onPayNow(booking.id)}
                variant="primary"
                size="sm"
              >
                Pay Now
              </Button>
            )}

          {/* Always show View Details */}
          {onViewDetails && (
            <Button
              onClick={() => onViewDetails(booking.id)}
              variant="secondary"
              size="sm"
            >
              View Details
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
