/*
 * Filename: src/app/components/referrals/ReferralCard.tsx
 * Purpose: Display referral lead information in card format (SDD v3.6)
 * Created: 2025-11-02
 * Specification: SDD v3.6, Section 4.3 - /referrals hub UI
 */
'use client';

import { Referral, ReferralStatus } from '@/types';
import Card from '@/app/components/ui/Card';

interface ReferralCardProps {
  referral: Referral;
}

export default function ReferralCard({ referral }: ReferralCardProps) {
  // Format date/time
  const createdDate = new Date(referral.created_at);
  const formattedDate = createdDate.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const convertedDate = referral.converted_at
    ? new Date(referral.converted_at).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  // Status badge colors
  const getStatusColor = (status: ReferralStatus) => {
    switch (status) {
      case 'Converted':
        return 'bg-green-100 text-green-800';
      case 'Signed Up':
        return 'bg-blue-100 text-blue-800';
      case 'Expired':
        return 'bg-red-100 text-red-800';
      case 'Referred':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  // Get status description
  const getStatusDescription = (status: ReferralStatus) => {
    switch (status) {
      case 'Referred':
        return 'Link clicked, awaiting signup';
      case 'Signed Up':
        return 'User created account';
      case 'Converted':
        return 'First booking completed';
      case 'Expired':
        return 'Link expired (30 days)';
      default:
        return '';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Header: User Info + Status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {referral.referred_user ? (
              <div className="flex items-center gap-3">
                {referral.referred_user.avatar_url && (
                  <img
                    src={referral.referred_user.avatar_url}
                    alt={referral.referred_user.full_name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                )}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {referral.referred_user.full_name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {getStatusDescription(referral.status)}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Anonymous Click
                </h3>
                <p className="text-sm text-gray-500">
                  {getStatusDescription(referral.status)}
                </p>
              </div>
            )}
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
              referral.status
            )}`}
          >
            {referral.status}
          </span>
        </div>

        {/* Referral Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm border-t border-gray-200 pt-4">
          <div>
            <span className="text-gray-500">Referred:</span>{' '}
            <span className="font-medium text-gray-900">{formattedDate}</span>
          </div>
          {convertedDate && (
            <div>
              <span className="text-gray-500">Converted:</span>{' '}
              <span className="font-medium text-gray-900">{convertedDate}</span>
            </div>
          )}
        </div>

        {/* Conversion Details (if applicable) */}
        {referral.status === 'Converted' && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <h4 className="text-sm font-semibold text-green-900 mb-2">
              Conversion Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {referral.first_booking && (
                <>
                  <div>
                    <span className="text-green-700">Service:</span>{' '}
                    <span className="font-medium text-green-900">
                      {referral.first_booking.service_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-green-700">Booking Amount:</span>{' '}
                    <span className="font-medium text-green-900">
                      £{referral.first_booking.amount.toFixed(2)}
                    </span>
                  </div>
                </>
              )}
              {referral.first_commission && (
                <div className="md:col-span-2">
                  <span className="text-green-700">Your Commission:</span>{' '}
                  <span className="font-bold text-green-900">
                    £{referral.first_commission.amount.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lead Funnel Progress Indicator */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div
              className={`flex items-center ${
                referral.status !== 'Referred' ? 'text-green-600' : ''
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full mr-2 ${
                  referral.status !== 'Referred'
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              />
              Referred
            </div>
            <div className="flex-1 h-0.5 bg-gray-200 mx-2" />
            <div
              className={`flex items-center ${
                referral.status === 'Signed Up' || referral.status === 'Converted'
                  ? 'text-green-600'
                  : ''
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full mr-2 ${
                  referral.status === 'Signed Up' ||
                  referral.status === 'Converted'
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              />
              Signed Up
            </div>
            <div className="flex-1 h-0.5 bg-gray-200 mx-2" />
            <div
              className={`flex items-center ${
                referral.status === 'Converted' ? 'text-green-600' : ''
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full mr-2 ${
                  referral.status === 'Converted' ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
              Converted
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
