/**
 * Filename: ChangeRoleModal.tsx
 * Purpose: Modal for changing an admin user's role
 * Created: 2025-12-23
 */

'use client';

import React, { useState } from 'react';
import Button from '@/app/components/ui/actions/Button';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import type { AdminRole } from '@/lib/rbac/types';
import { ROLE_HIERARCHY } from '@/lib/rbac/types';
import { useAdminProfile } from '@/lib/rbac';
import styles from './GrantAdminModal.module.css';
import toast from 'react-hot-toast';

interface ChangeRoleModalProps {
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

export default function ChangeRoleModal({ isOpen, onClose, onSuccess, user }: ChangeRoleModalProps) {
  const { profile: currentAdmin } = useAdminProfile();
  const [newRole, setNewRole] = useState<AdminRole | ''>('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !user) return null;

  // Get roles that current admin can grant
  const availableRoles: AdminRole[] = currentAdmin?.admin_role
    ? ROLE_HIERARCHY[currentAdmin.admin_role].canManage
    : [];

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

    if (!newRole) {
      toast.error('Please select a new role');
      return;
    }

    if (newRole === user.admin_role) {
      toast.error('User already has this role');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/users/manage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          newRole,
          reason: reason.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change admin role');
      }

      toast.success(data.message || 'Admin role changed successfully');
      setNewRole('');
      setReason('');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Change role error:', error);
      toast.error(error.message || 'Failed to change admin role');
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
          <h2 className={styles.modalTitle}>Change Admin Role</h2>
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

            {/* New Role Selection */}
            <div className={styles.formGroup}>
              <label htmlFor="newRole" className={styles.label}>
                New Admin Role <span className={styles.required}>*</span>
              </label>
              <UnifiedSelect
                value={newRole}
                onChange={(value) => setNewRole(value as AdminRole)}
                options={availableRoles.map((role) => ({
                  value: role,
                  label: `${role.charAt(0).toUpperCase() + role.slice(1)} - ${ROLE_HIERARCHY[role].description}${role === user.admin_role ? ' (Current)' : ''}`
                }))}
                placeholder="Select a role..."
                disabled={isSubmitting}
              />
              <p className={styles.helpText}>
                You can only grant roles at or below your current level.
              </p>
            </div>

            {/* Reason */}
            <div className={styles.formGroup}>
              <label htmlFor="reason" className={styles.label}>
                Reason for Change (Optional)
              </label>
              <textarea
                id="reason"
                className={styles.textarea}
                placeholder="Why is this user's role being changed?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
              <p className={styles.helpText}>
                This reason will be logged in the audit trail.
              </p>
            </div>

            {/* Info */}
            <div className={styles.info}>
              <strong>ℹ️ Note:</strong> The user will receive an email notification about this role change and their permissions will be updated immediately.
            </div>
          </div>

          <div className={styles.modalFooter}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Changing Role...' : 'Change Role'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
