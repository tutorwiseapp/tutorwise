/*
 * Filename: src/app/components/financials/TransactionCard.tsx
 * Purpose: Display transaction information in card format (SDD v3.6)
 * Created: 2025-11-02
 * Specification: SDD v3.6, Section 4.2 - /financials hub UI
 */
'use client';

import { Transaction, TransactionType, TransactionStatus } from '@/types';
import Card from '@/app/components/ui/Card';

interface TransactionCardProps {
  transaction: Transaction;
}

export default function TransactionCard({ transaction }: TransactionCardProps) {
  // Format date/time
  const transactionDate = new Date(transaction.created_at);
  const formattedDate = transactionDate.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = transactionDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Status badge colors (v4.9 updated)
  const getStatusColor = (status: TransactionStatus) => {
    switch (status) {
      // v4.9 statuses
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'clearing':
        return 'bg-yellow-100 text-yellow-800';
      case 'paid_out':
        return 'bg-teal-100 text-teal-800';
      case 'disputed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      // Legacy statuses (v3.6)
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Failed':
        return 'bg-red-100 text-red-800';
      case 'Cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'Pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  // Transaction type colors and icons
  const getTypeColor = (type: TransactionType) => {
    switch (type) {
      case 'Booking Payment':
        return 'bg-blue-100 text-blue-800';
      case 'Tutoring Payout':
        return 'bg-green-100 text-green-800';
      case 'Referral Commission':
        return 'bg-purple-100 text-purple-800';
      case 'Agent Commission':
        return 'bg-indigo-100 text-indigo-800';
      case 'Platform Fee':
        return 'bg-gray-100 text-gray-800';
      case 'Withdrawal':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Determine if this is a credit (incoming) or debit (outgoing)
  const isCredit =
    transaction.type === 'Tutoring Payout' ||
    transaction.type === 'Referral Commission' ||
    transaction.type === 'Agent Commission';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Header: Type + Status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(
                  transaction.type
                )}`}
              >
                {transaction.type}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                  transaction.status
                )}`}
              >
                {transaction.status}
              </span>
            </div>
            {transaction.description && (
              <p className="text-sm text-gray-600 mt-2">
                {transaction.description}
              </p>
            )}
          </div>
          <div className="text-right">
            <p
              className={`text-xl font-bold ${
                isCredit ? 'text-green-600' : 'text-gray-900'
              }`}
            >
              {isCredit ? '+' : ''}£{transaction.amount.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Transaction Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Date:</span>{' '}
            <span className="font-medium text-gray-900">{formattedDate}</span>
          </div>
          <div>
            <span className="text-gray-500">Time:</span>{' '}
            <span className="font-medium text-gray-900">{formattedTime}</span>
          </div>
          {transaction.booking && (
            <>
              <div className="md:col-span-2">
                <span className="text-gray-500">Related Booking:</span>{' '}
                <span className="font-medium text-gray-900">
                  {transaction.booking.service_name}
                </span>
              </div>
            </>
          )}
          <div className="md:col-span-2">
            <span className="text-gray-500">Transaction ID:</span>{' '}
            <span className="font-mono text-xs text-gray-600">
              {transaction.id.slice(0, 8)}...
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
