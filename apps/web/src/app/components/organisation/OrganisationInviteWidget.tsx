/**
 * Filename: OrganisationInviteWidget.tsx
 * Purpose: Invite members to organisation sidebar widget (v6.2)
 * Created: 2025-11-19
 * Design: context-sidebar-ui-design-v2.md Section 2.12
 *
 * Pattern: Complex Action Card with Form Input
 * Layout:
 * - Teal Header: "Invite Member"
 * - Description
 * - Email Input Field
 * - Primary Button: "Send Invite"
 *
 * NO ICONS - Professional aesthetic
 */

'use client';

import React, { useState } from 'react';
import SidebarComplexWidget from '@/app/components/layout/sidebars/components/SidebarComplexWidget';
import toast from 'react-hot-toast';
import styles from './OrganisationInviteWidget.module.css';

interface OrganisationInviteWidgetProps {
  organisationId?: string; // Optional - undefined when no organisation exists
  className?: string;
  onInviteSent?: () => void;
}

export default function OrganisationInviteWidget({
  organisationId,
  className,
  onInviteSent,
}: OrganisationInviteWidgetProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organisationId) {
      toast.error('Please create an organisation first');
      return;
    }

    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/organisation/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organisationId,
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      toast.success(data.message || 'Invitation sent successfully');
      setEmail('');
      onInviteSent?.();

    } catch (error: any) {
      console.error('[OrganisationInviteWidget] Error:', error);
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = !organisationId || isLoading;

  return (
    <SidebarComplexWidget className={className}>
      <h3 className={styles.title}>Invite Member</h3>

      <p className={styles.description}>
        {organisationId
          ? 'Invite tutors and teachers to join your organisation.'
          : 'Create an organisation first to invite members.'}
      </p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={organisationId ? 'Email address' : 'Create organisation first'}
          className={styles.input}
          disabled={isDisabled}
          required
        />

        <button
          type="submit"
          disabled={isDisabled}
          className={styles.button}
        >
          {isLoading ? 'Sending...' : 'Send Invite'}
        </button>
      </form>
    </SidebarComplexWidget>
  );
}
