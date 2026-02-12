/**
 * Filename: MarkCompletedModal.tsx
 * Purpose: Admin modal for manually marking a conversion as completed
 * Created: 2026-02-12
 * Pattern: Follows confirmation modal pattern with required justification
 */

'use client';

import React, { useState, useEffect } from 'react';
import HubComplexModal from '@/app/components/hub/modal/HubComplexModal/HubComplexModal';
import Button from '@/app/components/ui/actions/Button';
import { formatIdForDisplay } from '@/lib/utils/formatId';
import { AlertTriangle, CheckCircle2, FileText } from 'lucide-react';
import styles from './MarkCompletedModal.module.css';

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

interface MarkCompletedModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversion: ConversionWithUser | null;
  onSuccess: () => void;
}

export default function MarkCompletedModal({
  isOpen,
  onClose,
  conversion,
  onSuccess,
}: MarkCompletedModalProps) {
  const [reason, setReason] = useState('');
  const [externalReference, setExternalReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setReason('');
      setExternalReference('');
      setError('');
    }
  }, [isOpen]);

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

  // Validate form
  const validateForm = (): string | null => {
    if (!reason.trim()) {
      return 'Completion reason is required';
    }

    if (reason.trim().length < 20) {
      return 'Reason must be at least 20 characters';
    }

    return null;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!conversion) return;

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/admin/edupay/conversions/mark-completed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversion_id: conversion.id,
          reason: reason.trim(),
          external_reference: externalReference.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark conversion as completed');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!conversion) return null;

  return (
    <HubComplexModal
      isOpen={isOpen}
      onClose={onClose}
      title="Mark Conversion Completed"
      subtitle="Manual completion requires justification"
      size="md"
      isLoading={isSubmitting}
      loadingText="Marking as completed..."
      footer={
        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
            <CheckCircle2 size={16} />
            Mark Completed
          </Button>
        </div>
      }
    >
      <div className={styles.content}>
        {/* Warning Banner */}
        <div className={styles.warningBanner}>
          <AlertTriangle size={20} />
          <div className={styles.warningContent}>
            <span className={styles.warningTitle}>Manual Completion Warning</span>
            <span className={styles.warningText}>
              This action should only be used when the payment has been verified outside the system.
              This will mark the conversion as completed and cannot be undone.
            </span>
          </div>
        </div>

        {/* Conversion Summary */}
        <div className={styles.summarySection}>
          <h4 className={styles.sectionTitle}>Conversion Summary</h4>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Conversion ID</span>
              <span className={styles.summaryValueMono}>{formatIdForDisplay(conversion.id)}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>User</span>
              <span className={styles.summaryValue}>
                {conversion.profiles?.full_name || 'Unknown'}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>EP Amount</span>
              <span className={styles.summaryValue}>{formatEP(conversion.ep_amount)} EP</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Net Amount</span>
              <span className={styles.summaryValueSuccess}>
                {formatCurrency(conversion.net_amount_pence)}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Destination</span>
              <span className={styles.summaryValue}>
                {getDestinationLabel(conversion.destination)}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Current Status</span>
              <span className={styles.summaryValueStatus}>{conversion.status}</span>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className={styles.formSection}>
          <div className={styles.formGroup}>
            <label htmlFor="reason" className={styles.label}>
              <FileText size={14} />
              Completion Reason <span className={styles.required}>*</span>
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={styles.textarea}
              placeholder="Explain why this conversion is being manually marked as completed (e.g., 'Payment confirmed via bank statement dated...')"
              rows={3}
              disabled={isSubmitting}
            />
            <span className={styles.helpText}>
              Provide a detailed reason for manual completion. This will be logged for audit purposes.
              Minimum 20 characters.
            </span>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="externalReference" className={styles.label}>
              External Reference (Optional)
            </label>
            <input
              type="text"
              id="externalReference"
              value={externalReference}
              onChange={(e) => setExternalReference(e.target.value)}
              className={styles.input}
              placeholder="e.g., Bank transaction ID, support ticket number"
              disabled={isSubmitting}
            />
            <span className={styles.helpText}>
              Optional reference to external verification (bank statement, support ticket, etc.)
            </span>
          </div>

          {/* Error Message */}
          {error && (
            <div className={styles.errorMessage}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </HubComplexModal>
  );
}
