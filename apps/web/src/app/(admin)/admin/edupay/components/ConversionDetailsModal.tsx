/**
 * Filename: ConversionDetailsModal.tsx
 * Purpose: Admin modal for viewing EduPay conversion details
 * Created: 2026-02-12
 * Pattern: Follows HubComplexModal pattern with detail sections
 */

'use client';

import React from 'react';
import HubComplexModal from '@/app/components/hub/modal/HubComplexModal/HubComplexModal';
import Button from '@/app/components/ui/actions/Button';
import { formatIdForDisplay } from '@/lib/utils/formatId';
import {
  CreditCard,
  User,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  PoundSterling,
  Percent,
} from 'lucide-react';
import styles from './ConversionDetailsModal.module.css';

interface ConversionWithUser {
  id: string;
  user_id: string;
  ep_amount: number;
  gbp_amount_pence: number;
  platform_fee_pence: number;
  net_amount_pence: number;
  destination: 'student_loan' | 'isa' | 'savings';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  failure_reason: string | null;
  truelayer_payment_id: string | null;
  created_at: string;
  completed_at: string | null;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
}

interface ConversionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversion: ConversionWithUser | null;
  onMarkCompleted: (conversion: ConversionWithUser) => void;
  onRetry: (conversion: ConversionWithUser) => void;
}

export default function ConversionDetailsModal({
  isOpen,
  onClose,
  conversion,
  onMarkCompleted,
  onRetry,
}: ConversionDetailsModalProps) {
  // Format currency
  const formatCurrency = (pence: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
    }).format(pence / 100);
  };

  // Format EP
  const formatEP = (value: number) => {
    return new Intl.NumberFormat('en-GB').format(value);
  };

  // Format date/time
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status info
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { Icon: CheckCircle2, color: '#10b981', label: 'Completed', bg: '#d1fae5' };
      case 'pending':
        return { Icon: Clock, color: '#f59e0b', label: 'Pending', bg: '#fef3c7' };
      case 'processing':
        return { Icon: Clock, color: '#3b82f6', label: 'Processing', bg: '#dbeafe' };
      case 'failed':
        return { Icon: XCircle, color: '#ef4444', label: 'Failed', bg: '#fee2e2' };
      default:
        return { Icon: Clock, color: '#6b7280', label: status, bg: '#f3f4f6' };
    }
  };

  // Get destination label
  const getDestinationLabel = (destination: string) => {
    switch (destination) {
      case 'student_loan':
        return 'Student Loan';
      case 'isa':
        return 'ISA Account';
      case 'savings':
        return 'Savings Account';
      default:
        return destination;
    }
  };

  if (!conversion) return null;

  const statusInfo = getStatusInfo(conversion.status);
  const StatusIcon = statusInfo.Icon;

  return (
    <HubComplexModal
      isOpen={isOpen}
      onClose={onClose}
      title="Conversion Details"
      subtitle={formatIdForDisplay(conversion.id)}
      size="lg"
      footer={
        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {conversion.status === 'failed' && (
            <Button variant="secondary" onClick={() => onRetry(conversion)}>
              Retry Conversion
            </Button>
          )}
          {(conversion.status === 'pending' || conversion.status === 'processing') && (
            <Button variant="primary" onClick={() => onMarkCompleted(conversion)}>
              Mark Completed
            </Button>
          )}
        </div>
      }
    >
      <div className={styles.content}>
        {/* Status Banner */}
        <div className={styles.statusBanner} style={{ backgroundColor: statusInfo.bg }}>
          <StatusIcon size={24} style={{ color: statusInfo.color }} />
          <div className={styles.statusContent}>
            <span className={styles.statusLabel} style={{ color: statusInfo.color }}>
              {statusInfo.label}
            </span>
            {conversion.failure_reason && (
              <span className={styles.failureReason}>{conversion.failure_reason}</span>
            )}
          </div>
        </div>

        {/* User Section */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>
            <User size={16} />
            User Information
          </h4>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Name</span>
              <span className={styles.infoValue}>
                {conversion.profiles?.full_name || 'Unknown User'}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Email</span>
              <span className={styles.infoValue}>
                {conversion.profiles?.email || 'No email'}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>User ID</span>
              <span className={styles.infoValueMono}>
                {formatIdForDisplay(conversion.user_id)}
              </span>
            </div>
          </div>
        </div>

        {/* Conversion Flow */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>
            <ArrowRight size={16} />
            Conversion Flow
          </h4>
          <div className={styles.flowContainer}>
            <div className={styles.flowItem}>
              <div className={styles.flowIcon}>
                <CreditCard size={20} />
              </div>
              <div className={styles.flowContent}>
                <span className={styles.flowLabel}>EP Amount</span>
                <span className={styles.flowValue}>{formatEP(conversion.ep_amount)} EP</span>
              </div>
            </div>

            <div className={styles.flowArrow}>
              <ArrowRight size={20} />
            </div>

            <div className={styles.flowItem}>
              <div className={styles.flowIcon}>
                <PoundSterling size={20} />
              </div>
              <div className={styles.flowContent}>
                <span className={styles.flowLabel}>GBP Value</span>
                <span className={styles.flowValue}>{formatCurrency(conversion.gbp_amount_pence)}</span>
              </div>
            </div>

            <div className={styles.flowArrow}>
              <ArrowRight size={20} />
            </div>

            <div className={styles.flowItem}>
              <div className={styles.flowIconDestination}>
                <CheckCircle2 size={20} />
              </div>
              <div className={styles.flowContent}>
                <span className={styles.flowLabel}>{getDestinationLabel(conversion.destination)}</span>
                <span className={styles.flowValueSuccess}>{formatCurrency(conversion.net_amount_pence)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>
            <Percent size={16} />
            Financial Breakdown
          </h4>
          <div className={styles.breakdownTable}>
            <div className={styles.breakdownRow}>
              <span className={styles.breakdownLabel}>EP Converted</span>
              <span className={styles.breakdownValue}>{formatEP(conversion.ep_amount)} EP</span>
            </div>
            <div className={styles.breakdownRow}>
              <span className={styles.breakdownLabel}>Gross GBP Value</span>
              <span className={styles.breakdownValue}>{formatCurrency(conversion.gbp_amount_pence)}</span>
            </div>
            <div className={styles.breakdownRow}>
              <span className={styles.breakdownLabel}>Platform Fee (10%)</span>
              <span className={styles.breakdownValueNegative}>-{formatCurrency(conversion.platform_fee_pence)}</span>
            </div>
            <div className={styles.breakdownRowTotal}>
              <span className={styles.breakdownLabel}>Net Amount to User</span>
              <span className={styles.breakdownValueTotal}>{formatCurrency(conversion.net_amount_pence)}</span>
            </div>
          </div>
        </div>

        {/* Timestamps */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>
            <Calendar size={16} />
            Timeline
          </h4>
          <div className={styles.timelineGrid}>
            <div className={styles.timelineItem}>
              <span className={styles.timelineLabel}>Created</span>
              <span className={styles.timelineValue}>{formatDateTime(conversion.created_at)}</span>
            </div>
            {conversion.completed_at && (
              <div className={styles.timelineItem}>
                <span className={styles.timelineLabel}>Completed</span>
                <span className={styles.timelineValue}>{formatDateTime(conversion.completed_at)}</span>
              </div>
            )}
          </div>
        </div>

        {/* TrueLayer Reference */}
        {conversion.truelayer_payment_id && (
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>
              <CreditCard size={16} />
              Payment Reference
            </h4>
            <div className={styles.referenceBox}>
              <span className={styles.referenceLabel}>TrueLayer Payment ID</span>
              <code className={styles.referenceValue}>{conversion.truelayer_payment_id}</code>
            </div>
          </div>
        )}

        {/* Warning for pending/processing */}
        {(conversion.status === 'pending' || conversion.status === 'processing') && (
          <div className={styles.warningNotice}>
            <AlertTriangle size={16} />
            <span>
              This conversion is awaiting bank authorization or processing. Manual completion should only be used
              if the payment has been confirmed outside the system.
            </span>
          </div>
        )}
      </div>
    </HubComplexModal>
  );
}
