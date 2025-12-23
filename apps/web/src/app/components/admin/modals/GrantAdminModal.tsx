/**
 * Filename: GrantAdminModal.tsx
 * Purpose: Modal for granting admin access to a user
 * Created: 2025-12-23
 */

'use client';

import React, { useState } from 'react';
import Button from '@/app/components/ui/actions/Button';
import type { AdminRole } from '@/lib/rbac/types';
import { ROLE_HIERARCHY } from '@/lib/rbac/types';
import { useAdminProfile } from '@/lib/rbac';
import styles from './GrantAdminModal.module.css';
import toast from 'react-hot-toast';

interface GrantAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function GrantAdminModal({ isOpen, onClose, onSuccess }: GrantAdminModalProps) {
  const { profile: currentAdmin } = useAdminProfile();
  const [userEmail, setUserEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<AdminRole>('supportadmin');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Get roles that current admin can grant
  const availableRoles: AdminRole[] = currentAdmin?.admin_role
    ? ROLE_HIERARCHY[currentAdmin.admin_role].canManage
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userEmail.trim()) {
      toast.error('Please enter a user email');
      return;
    }

    if (!selectedRole) {
      toast.error('Please select a role');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/users/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: userEmail.trim(),
          role: selectedRole,
          reason: reason.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to grant admin access');
      }

      toast.success(data.message || 'Admin access granted successfully');
      setUserEmail('');
      setSelectedRole('supportadmin');
      setReason('');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Grant admin error:', error);
      toast.error(error.message || 'Failed to grant admin access');
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
          <h2 className={styles.modalTitle}>Grant Admin Access</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {/* User Email Input */}
            <div className={styles.formGroup}>
              <label htmlFor="userEmail" className={styles.label}>
                User Email <span className={styles.required}>*</span>
              </label>
              <input
                type="email"
                id="userEmail"
                className={styles.input}
                placeholder="user@example.com"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                required
                autoFocus
              />
              <p className={styles.helpText}>
                Enter the email address of the user you want to grant admin access to.
              </p>
            </div>

            {/* Role Selection */}
            <div className={styles.formGroup}>
              <label htmlFor="role" className={styles.label}>
                Admin Role <span className={styles.required}>*</span>
              </label>
              <select
                id="role"
                className={styles.select}
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as AdminRole)}
                required
              >
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)} - {ROLE_HIERARCHY[role].description}
                  </option>
                ))}
              </select>
              <p className={styles.helpText}>
                You can only grant roles at or below your current level.
              </p>
            </div>

            {/* Reason (Optional) */}
            <div className={styles.formGroup}>
              <label htmlFor="reason" className={styles.label}>
                Reason (Optional)
              </label>
              <textarea
                id="reason"
                className={styles.textarea}
                placeholder="Why is this user being granted admin access?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>

            {/* Warning */}
            <div className={styles.warning}>
              <strong>⚠️ Important:</strong> The user will receive an email notification and will be able to access the admin dashboard immediately.
            </div>
          </div>

          <div className={styles.modalFooter}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Granting Access...' : 'Grant Admin Access'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
