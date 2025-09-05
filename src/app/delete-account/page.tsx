/*
 * Filename: src/app/delete-account/page.tsx
 * Purpose: Provides a UI for users to permanently delete their account, migrated to Kinde.
 * Change History:
 * C004 - 2025-08-26 : 14:00 - Replaced Clerk's useUser hook with Kinde's useKindeBrowserClient.
 * C003 - 2025-07-26 : 22:45 - Replaced useAuth with Clerk's useUser hook.
 * Last Modified: 2025-08-26 : 14:00
 * Requirement ID: VIN-AUTH-MIG-02
 * Change Summary: This component has been migrated from Clerk to Kinde. The `useUser` hook was replaced with `useKindeBrowserClient`. The email confirmation now uses the `user.email` property from Kinde. The API call to delete the user is a placeholder, as this requires a new Kinde-specific backend implementation. This change resolves the "Module not found" build error.
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import Container from '@/app/components/layout/Container';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import PageHeader from '@/app/components/ui/PageHeader';
import Message from '@/app/components/ui/Message';
import FormGroup from '@/app/components/ui/form/FormGroup';
import Input from '@/app/components/ui/form/Input';
import styles from './page.module.css';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';

const DeleteAccountPage = () => {
  const { profile, user, isLoading: isProfileLoading } = useUserProfile();
  const router = useRouter();
  const [confirmationText, setConfirmationText] = useState('');
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isProfileLoading && !profile) {
      router.push('/login');
    }
  }, [isProfileLoading, profile, router]);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (confirmationText !== 'DELETE') {
      setError('Please type DELETE to confirm.');
      return;
    }

    const isConfirmed = window.confirm(
      'Are you absolutely sure you want to permanently delete your account? This action cannot be undone.'
    );

    if (!isConfirmed) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      // --- THIS IS THE FIX ---
      // Pass the authenticated user's ID in the request body
      const response = await fetch('/api/user/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete account.');
      }

      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';

    } catch (err) {
      setError(getErrorMessage(err));
      setIsDeleting(false);
    }
  };

  if (isProfileLoading || !profile) {
    return (
      <Container>
        <p>Loading...</p>
      </Container>
    );
  }

  return (
    <Container variant="form">
      <PageHeader
        title="Delete Account"
        subtitle="This action is permanent and cannot be undone."
      />
      <Card>
        <Message type="error" className={styles.warningMessage}>
          You are about to permanently delete your account, including all of your profile information, referral links, and earnings history.
        </Message>
        <form onSubmit={handleDelete} className={styles.form}>
          <FormGroup
            label={`To confirm, please type "DELETE" in the box below.`}
            htmlFor="confirmation"
          >
            <Input
              id="confirmation"
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              required
              autoComplete="off"
            />
          </FormGroup>

          {error && <p className={styles.errorText}>{error}</p>}

          <Button
            type="submit"
            fullWidth
            className={styles.dangerButton}
            disabled={confirmationText !== 'DELETE' || isDeleting}
          >
            {isDeleting ? 'Deleting Account...' : 'Delete My Account Permanently'}
          </Button>
        </form>
      </Card>
    </Container>
  );
};

export default DeleteAccountPage;