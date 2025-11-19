/**
 * Filename: OrganisationInviteWidget.tsx
 * Purpose: Invite members to organisation sidebar widget (v6.1)
 * Created: 2025-11-19
 * Design: context-sidebar-ui-design-v2.md Section 2.12
 *
 * Uses SidebarComplexWidget (zero padding wrapper) + internal form
 */

'use client';

import React, { useState } from 'react';
import SidebarComplexWidget from '@/app/components/layout/sidebars/components/SidebarComplexWidget';
import Button from '@/app/components/ui/Button';
import toast from 'react-hot-toast';
import styles from './OrganisationInviteWidget.module.css';

interface OrganisationInviteWidgetProps {
  organisationId: string;
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

  return (
    <SidebarComplexWidget className={className}>
      <div className={styles.container}>
        <h3 className={styles.title}>Invite Member</h3>

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className={styles.input}
            disabled={isLoading}
            required
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isLoading}
            className={styles.button}
          >
            {isLoading ? 'Sending...' : 'Send Invite'}
          </Button>
        </form>
      </div>
    </SidebarComplexWidget>
  );
}
