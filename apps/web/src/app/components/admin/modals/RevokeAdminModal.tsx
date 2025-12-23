/**
 * Filename: RevokeAdminModal.tsx
 * Purpose: Modal for revoking admin access from a user
 * Created: 2025-12-23
 */

'use client';

import React, { useState } from 'react';
import Button from '@/app/components/ui/actions/Button';
import type { AdminRole } from '@/lib/rbac/types';
import styles from './GrantAdminModal.module.css';
import toast from 'react-hot-toast';

interface RevokeAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: {
    id: string;
    email: string;
    full_name?: string;
    admin_role: AdminRole;
  } | null;
}

export default function RevokeAdminModal({ isOpen, onClose, onSuccess, user }: RevokeAdminModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !user) return null;

  const getRoleBadgeColor = (role: AdminRole) => {
    switch (role) {
      case 'superadmin':
        return styles.badgeSuperadmin;
      case 'admin':
        return styles.badgeAdmin;
      case 'systemadmin':
        return styles.badgeSystemadmin;
      case 'supportadmin':
        return styles.badgeSupportadmin;
      default:
        return '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/users/manage', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          reason: reason.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to revoke admin access');
      }

      toast.success(data.message || 'Admin access revoked successfully');
      setReason('');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Revoke admin error:', error);
      toast.error(error.message || 'Failed to revoke admin access');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={handleBackdropClick}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Revoke Admin Access</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {/* User Info */}
            <div className={styles.userInfo}>
              <div className={styles.userInfoRow}>
                <span className={styles.userInfoLabel}>Email</span>
                <span className={styles.userInfoValue}>{user.email}</span>
              </div>
              {user.full_name && (
                <div className={styles.userInfoRow}>
                  <span className={styles.userInfoLabel}>Name</span>
                  <span className={styles.userInfoValue}>{user.full_name}</span>
                </div>
              )}
              <div className={styles.userInfoRow}>
                <span className={styles.userInfoLabel}>Current Role</span>
                <span className={`${styles.roleBadge} ${getRoleBadgeColor(user.admin_role)}`}>
                  {user.admin_role}
                </span>
              </div>
            </div>

            {/* Warning */}
            <div className={styles.danger}>
              <strong>⚠️ Warning:</strong> This user will immediately lose access to the admin dashboard. They will receive an email notification about this change.
            </div>

            {/* Reason */}
            <div className={styles.formGroup}>
              <label htmlFor="reason" className={styles.label}>
                Reason for Revocation (Optional)
              </label>
              <textarea
                id="reason"
                className={styles.textarea}
                placeholder="Why is this user's admin access being revoked?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
              <p className={styles.helpText}>
                This reason will be logged in the audit trail.
              </p>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={isSubmitting}>
              {isSubmitting ? 'Revoking Access...' : 'Revoke Admin Access'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
