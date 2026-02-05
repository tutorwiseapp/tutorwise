/**
 * Filename: UserDetailsModal.tsx
 * Purpose: Admin modal to view user details and perform actions
 * Created: 2026-02-01
 * Pattern: Uses HubDetailModal with admin-specific sections and actions
 *
 * Features:
 * - User information (email, name, avatar)
 * - Role/type information
 * - Verification statuses (Identity, DBS, POA, Profile)
 * - Account dates (created, updated)
 * - Quick actions (Reset Password, Impersonate, Delete)
 *
 * Usage:
 * <UserDetailsModal
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   user={user}
 *   onUserUpdated={refreshUsersList}
 * />
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HubDetailModal } from '@/app/components/hub/modal';
import type { DetailSection } from '@/app/components/hub/modal';
import Button from '@/app/components/ui/actions/Button';
import styles from './UserDetailsModal.module.css';

// User type matching UsersTable (extended with more fields)
interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  active_role: string | null;
  profile_completed: boolean | null;
  identity_verified: boolean | null;
  dbs_verified: boolean | null;
  proof_of_address_verified: boolean | null;
  is_admin: boolean;
  admin_role: string | null;
  created_at: string;
  updated_at: string | null;
  // Extended fields
  phone?: string | null;
  bio?: string | null;
  location_city?: string | null;
  location_postcode?: string | null;
  location_country?: string | null;
  timezone?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  last_login_at?: string | null;
  login_count?: number;
  referral_code?: string | null;
  stripe_customer_id?: string | null;
  stripe_connect_id?: string | null;
  onboarding_completed_at?: string | null;
  deactivated_at?: string | null;
}

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUserUpdated?: () => void;
  onDelete?: (user: User) => void;
}

export default function UserDetailsModal({
  isOpen,
  onClose,
  user,
  onUserUpdated,
  onDelete,
}: UserDetailsModalProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!user) return null;

  // Format datetime helper
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get user type label
  const getUserTypeLabel = () => {
    if (user.is_admin) {
      return user.admin_role
        ? user.admin_role.charAt(0).toUpperCase() + user.admin_role.slice(1)
        : 'Admin';
    }
    if (user.active_role) {
      return user.active_role.charAt(0).toUpperCase() + user.active_role.slice(1);
    }
    return 'Not Set';
  };

  // Get verification status with styling
  const getVerificationStatus = (verified: boolean | null) => {
    return (
      <span className={verified ? styles.verified : styles.notVerified}>
        {verified ? '✓ Verified' : '✗ Not Verified'}
      </span>
    );
  };

  // Build subtitle
  const subtitle = `User ID: ${user.id}`;

  // Format short ID
  const formatIdForDisplay = (id: string) => {
    return id.substring(0, 8) + '...';
  };

  // Build sections
  const sections: DetailSection[] = [
    {
      title: 'Account Information',
      fields: [
        { label: 'User ID', value: formatIdForDisplay(user.id) },
        { label: 'Email', value: user.email },
        { label: 'Full Name', value: user.full_name || 'Not Set' },
        { label: 'User Type', value: getUserTypeLabel() },
        { label: 'Admin Status', value: user.is_admin ? 'Yes' : 'No' },
        ...(user.is_admin && user.admin_role ? [{ label: 'Admin Role', value: user.admin_role }] : []),
        ...(user.referral_code ? [{ label: 'Referral Code', value: user.referral_code }] : []),
      ],
    },
    {
      title: 'Contact Information',
      fields: [
        { label: 'Phone', value: user.phone || 'Not provided' },
        { label: 'City', value: user.location_city || 'Not specified' },
        { label: 'Postcode', value: user.location_postcode || 'Not specified' },
        { label: 'Country', value: user.location_country || 'Not specified' },
        { label: 'Timezone', value: user.timezone || 'Not specified' },
      ],
    },
    {
      title: 'Profile Details',
      fields: [
        { label: 'Gender', value: user.gender || 'Not specified' },
        { label: 'Date of Birth', value: user.date_of_birth ? formatDateTime(user.date_of_birth) : 'Not specified' },
        { label: 'Bio', value: user.bio || 'No bio provided' },
      ],
    },
    {
      title: 'Verification Status',
      fields: [
        { label: 'Profile Completed', value: getVerificationStatus(user.profile_completed) },
        { label: 'Identity Verified', value: getVerificationStatus(user.identity_verified) },
        { label: 'DBS Verified', value: getVerificationStatus(user.dbs_verified) },
        { label: 'Proof of Address', value: getVerificationStatus(user.proof_of_address_verified) },
      ],
    },
    {
      title: 'Activity',
      fields: [
        { label: 'Last Login', value: user.last_login_at ? formatDateTime(user.last_login_at) : 'Never logged in' },
        { label: 'Login Count', value: `${user.login_count || 0} logins` },
        { label: 'Onboarding Completed', value: user.onboarding_completed_at ? formatDateTime(user.onboarding_completed_at) : 'Not completed' },
        ...(user.deactivated_at ? [{ label: 'Deactivated At', value: formatDateTime(user.deactivated_at) }] : []),
      ],
    },
    {
      title: 'Payment Integration',
      fields: [
        { label: 'Stripe Customer ID', value: user.stripe_customer_id || 'Not connected' },
        { label: 'Stripe Connect ID', value: user.stripe_connect_id || 'Not connected' },
      ],
    },
    {
      title: 'Timeline',
      fields: [
        { label: 'Account Created', value: formatDateTime(user.created_at) },
        { label: 'Last Updated', value: formatDateTime(user.updated_at) },
      ],
    },
  ];

  // Action handlers
  const handleImpersonate = async () => {
    if (isProcessing) return;

    if (user.is_admin) {
      alert('Cannot impersonate admin users for security reasons.');
      return;
    }

    if (!confirm(`Impersonate ${user.full_name || user.email}?\n\nThis will log you in as this user. You can return to your admin account from the user menu.`)) {
      return;
    }

    setIsProcessing(true);
    try {
      // TODO: Implement impersonation via API
      alert('Impersonation functionality coming soon.\n\nThis will allow you to view the platform as this user.');
    } catch (error) {
      alert('Failed to impersonate user. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetPassword = async () => {
    if (isProcessing) return;

    if (!confirm(`Send password reset email to ${user.email}?\n\nThe user will receive an email with instructions to reset their password.`)) {
      return;
    }

    setIsProcessing(true);
    try {
      // TODO: Implement password reset via API
      alert('Password reset functionality coming soon.\n\nThis will send a password reset email to the user.');
    } catch (error) {
      alert('Failed to send password reset email. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContactUser = () => {
    router.push(`/messages?userId=${user.id}`);
    onClose();
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(user);
      onClose();
    }
  };

  return (
    <HubDetailModal
      isOpen={isOpen}
      onClose={onClose}
      title={user.full_name || user.email}
      subtitle={subtitle}
      size="lg"
      sections={sections}
      actions={
        <div className={styles.actionsWrapper}>
          <Button onClick={handleContactUser} variant="secondary" disabled={isProcessing}>
            Contact User
          </Button>
          {!user.is_admin && (
            <Button onClick={handleImpersonate} variant="secondary" disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Impersonate'}
            </Button>
          )}
          <Button onClick={handleResetPassword} variant="secondary" disabled={isProcessing}>
            {isProcessing ? 'Processing...' : 'Reset Password'}
          </Button>
          {onDelete && (
            <Button onClick={handleDelete} variant="danger" disabled={isProcessing}>
              Delete User
            </Button>
          )}
        </div>
      }
    />
  );
}
