/**
 * Filename: DeleteUserModal.tsx
 * Purpose: Admin modal for deleting user accounts with soft/hard delete options
 * Created: 2026-01-13
 * Pattern: Single modal with progressive disclosure (soft vs hard delete)
 *
 * Features:
 * - Soft Delete: Account deactivation + PII anonymization (default)
 * - Hard Delete: Complete data purge (GDPR compliance only)
 * - Progressive disclosure: Additional fields shown based on selection
 * - User information display section
 * - Form validation for both deletion types
 */

'use client';

import React, { useState } from 'react';
import HubComplexModal from '@/app/components/hub/modal/HubComplexModal/HubComplexModal';
import Button from '@/app/components/ui/actions/Button';
import { AlertTriangle, User as UserIcon, Mail, Calendar, Shield } from 'lucide-react';
import styles from './DeleteUserModal.module.css';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  active_role: string | null;
  is_admin: boolean;
  admin_role: string | null;
  created_at: string;
}

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onDeleteComplete: () => void;
}

type DeletionType = 'soft' | 'hard';

export default function DeleteUserModal({
  isOpen,
  onClose,
  user,
  onDeleteComplete,
}: DeleteUserModalProps) {
  const [deletionType, setDeletionType] = useState<DeletionType>('soft');
  const [reason, setReason] = useState('');
  const [gdprReference, setGdprReference] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens/closes
  const handleClose = () => {
    setDeletionType('soft');
    setReason('');
    setGdprReference('');
    setConfirmationText('');
    setError('');
    onClose();
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Get user type label
  const getUserTypeLabel = () => {
    if (!user) return 'Unknown';
    if (user.is_admin) return user.admin_role || 'Admin';
    if (user.active_role) return user.active_role.charAt(0).toUpperCase() + user.active_role.slice(1);
    return 'Unknown';
  };

  // Validate form
  const validateForm = (): string | null => {
    if (!reason.trim()) {
      return 'Deletion reason is required';
    }

    if (reason.trim().length < 10) {
      return 'Reason must be at least 10 characters';
    }

    if (deletionType === 'hard') {
      if (!gdprReference.trim()) {
        return 'GDPR reference is required for hard delete';
      }
      if (confirmationText !== 'DELETE') {
        return 'Please type "DELETE" to confirm';
      }
    }

    return null;
  };

  // Handle delete submission
  const handleDelete = async () => {
    if (!user) return;

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const response = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          deletionType,
          reason: reason.trim(),
          gdprReference: deletionType === 'hard' ? gdprReference.trim() : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      // Success - close modal and refresh
      onDeleteComplete();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setIsDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <HubComplexModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Delete User Account"
      subtitle="Choose deletion type and provide required information"
      size="lg"
      isLoading={isDeleting}
      loadingText={deletionType === 'soft' ? 'Deactivating account...' : 'Permanently deleting all data...'}
      footer={
        <div className={styles.footer}>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleDelete}
            disabled={isDeleting}
            className={deletionType === 'hard' ? styles.dangerButton : undefined}
          >
            {deletionType === 'soft' ? 'Deactivate Account' : 'Permanently Delete'}
          </Button>
        </div>
      }
    >
      <div className={styles.content}>
        {/* User Information Section */}
        <div className={styles.userInfoSection}>
          <div className={styles.sectionHeader}>
            <UserIcon size={18} />
            <h3>User Information</h3>
          </div>
          <div className={styles.userInfoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>
                <UserIcon size={14} />
                Name
              </span>
              <span className={styles.infoValue}>{user.full_name || 'Not provided'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>
                <Mail size={14} />
                Email
              </span>
              <span className={styles.infoValue}>{user.email}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>
                <Shield size={14} />
                Type
              </span>
              <span className={styles.infoValue}>{getUserTypeLabel()}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>
                <Calendar size={14} />
                Joined
              </span>
              <span className={styles.infoValue}>{formatDate(user.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Deletion Type Selection */}
        <div className={styles.deletionTypeSection}>
          <div className={styles.sectionHeader}>
            <AlertTriangle size={18} />
            <h3>Deletion Type</h3>
          </div>

          <div className={styles.radioCards}>
            {/* Soft Delete Option */}
            <label
              className={`${styles.radioCard} ${deletionType === 'soft' ? styles.radioCardActive : ''}`}
              htmlFor="soft-delete"
            >
              <input
                type="radio"
                id="soft-delete"
                name="deletionType"
                value="soft"
                checked={deletionType === 'soft'}
                onChange={() => setDeletionType('soft')}
                className={styles.radioInput}
              />
              <div className={styles.radioCardContent}>
                <div className={styles.radioCardHeader}>
                  <div className={styles.radioCircle}>
                    {deletionType === 'soft' && <div className={styles.radioCircleInner} />}
                  </div>
                  <span className={styles.radioCardTitle}>Soft Delete (Recommended)</span>
                </div>
                <p className={styles.radioCardDescription}>
                  Deactivates the account and anonymizes personal information while preserving transaction history and referral relationships. This maintains data integrity and audit trails.
                </p>
                <ul className={styles.featureList}>
                  <li>Account is deactivated and cannot log in</li>
                  <li>Personal information is anonymized</li>
                  <li>Transaction history is preserved</li>
                  <li>Referral chains remain intact</li>
                  <li>Maintains compliance audit trail</li>
                </ul>
              </div>
            </label>

            {/* Hard Delete Option */}
            <label
              className={`${styles.radioCard} ${styles.radioCardDanger} ${deletionType === 'hard' ? styles.radioCardActive : ''}`}
              htmlFor="hard-delete"
            >
              <input
                type="radio"
                id="hard-delete"
                name="deletionType"
                value="hard"
                checked={deletionType === 'hard'}
                onChange={() => setDeletionType('hard')}
                className={styles.radioInput}
              />
              <div className={styles.radioCardContent}>
                <div className={styles.radioCardHeader}>
                  <div className={styles.radioCircle}>
                    {deletionType === 'hard' && <div className={styles.radioCircleInner} />}
                  </div>
                  <span className={styles.radioCardTitle}>Hard Delete (GDPR Only)</span>
                </div>
                <p className={styles.radioCardDescription}>
                  Completely removes all user data from the system. Only use this for GDPR &quot;Right to be Forgotten&quot; requests. This action cannot be reversed.
                </p>
                <ul className={styles.featureList}>
                  <li>All user data is permanently deleted</li>
                  <li>Breaks referral chains and relationships</li>
                  <li>May affect financial reporting</li>
                  <li>Cannot be undone</li>
                  <li>Requires GDPR justification</li>
                </ul>
              </div>
            </label>
          </div>
        </div>

        {/* Form Fields */}
        <div className={styles.formSection}>
          {/* Reason Field (Always shown) */}
          <div className={styles.formGroup}>
            <label htmlFor="reason" className={styles.label}>
              Deletion Reason <span className={styles.required}>*</span>
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={styles.textarea}
              placeholder="Provide a detailed reason for this deletion (min 10 characters)"
              rows={3}
              disabled={isDeleting}
            />
            <span className={styles.charCount}>{reason.length} / 500</span>
          </div>

          {/* Progressive Disclosure: Hard Delete Fields */}
          {deletionType === 'hard' && (
            <>
              <div className={styles.formGroup}>
                <label htmlFor="gdpr-reference" className={styles.label}>
                  GDPR Reference / Ticket Number <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  id="gdpr-reference"
                  value={gdprReference}
                  onChange={(e) => setGdprReference(e.target.value)}
                  className={styles.input}
                  placeholder="e.g., GDPR-2026-0123, TICKET-456"
                  disabled={isDeleting}
                />
                <span className={styles.helpText}>
                  Enter the GDPR request ticket number or reference ID
                </span>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="confirmation" className={styles.label}>
                  Confirmation <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  id="confirmation"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  className={styles.input}
                  placeholder="Type &quot;DELETE&quot; to confirm"
                  disabled={isDeleting}
                />
                <span className={styles.helpText}>
                  Type <strong>DELETE</strong> exactly as shown to confirm
                </span>
              </div>
            </>
          )}

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
