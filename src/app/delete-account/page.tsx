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
  const { profile, isLoading: isProfileLoading } = useUserProfile();
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

    // --- THIS IS THE FIX ---
    // Add a browser confirmation dialog as a final safety check.
    const isConfirmed = window.confirm(
      'Are you absolutely sure you want to permanently delete your account? This action cannot be undone.'
    );

    // If the user clicks "Cancel", stop the deletion process.
    if (!isConfirmed) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      const response = await fetch('/api/user/delete', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete account.');
      }

      // If successful, redirect to the logout route to clear the session
      // which will then redirect to the homepage.
      router.push('/api/auth/logout');

    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
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