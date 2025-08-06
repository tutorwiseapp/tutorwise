/*
 * Filename: src/app/delete-account/page.tsx
 * Purpose: Provides a UI for users to permanently delete their account.
 * Change History:
 * C003 - 2025-07-26 : 22:45 - Replaced `useAuth` with Clerk's `useUser` hook.
 * C002 - 2025-07-22 : 15:00 - Refactored to call a secure API endpoint for deletion.
 * C001 - [Date] : [Time] - Initial creation.
 * Last Modified: 2025-07-26 : 22:45
 * Requirement ID (optional): VIN-A-006
 * Change Summary: Surgically replaced the old `useAuth` hook with `useUser` from Clerk to get the
 * user's email for the confirmation input. This resolves the `AuthProvider` dependency crash.
 * Impact Analysis: This change completes the migration of this page to the Clerk auth system.
 * Dependencies: "@clerk/nextjs", "next/navigation", and VDL UI components.
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import FormGroup from '@/app/components/ui/form/FormGroup';
import Input from '@/app/components/ui/form/Input';
import Button from '@/app/components/ui/Button';
import Message from '@/app/components/ui/Message';
import styles from './page.module.css';

const DeleteAccountPage = () => {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in');
    }
  }, [user, isLoaded, router]);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmationEmail !== user?.emailAddresses[0]?.emailAddress) { 
      setError('The email you entered does not match your account email.'); 
      return; 
    }
    
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/delete-user', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to delete account.');
      }
      
      alert('Your account has been successfully deleted.');
      // After deletion, Clerk will automatically sign the user out.
      // The router push will take them to the homepage.
      router.push('/?message=account-deleted');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setIsLoading(false);
    }
  };
  
  if (!isLoaded || !user) {
    return <Container><p>Loading...</p></Container>;
  }
  
  const userEmail = user.emailAddresses[0]?.emailAddress || '';
  const isConfirmationMatch = confirmationEmail === userEmail;

  return (
    <Container variant="form">
      <PageHeader title="Delete Your Account" subtitle="This is a permanent action." />
      <Card>
        <Message type="error" className={styles.warningMessage}>
          <strong>Warning:</strong> You are about to permanently delete your Vinite account. This cannot be undone.
        </Message>
        <form onSubmit={handleDelete} className={styles.form}>
          <FormGroup label={`To confirm, please type your email address: ${userEmail}`} htmlFor="confirmationEmail">
            <Input id="confirmationEmail" type="email" value={confirmationEmail} onChange={(e) => setConfirmationEmail(e.target.value)} required disabled={isLoading}/>
          </FormGroup>
          {error && <p className={styles.errorText}>{error}</p>}
          <Button type="submit" fullWidth disabled={!isConfirmationMatch || isLoading} className={styles.dangerButton}>
            {isLoading ? 'Deleting...' : 'Permanently Delete My Account'}
          </Button>
        </form>
      </Card>
    </Container>
  );
};

export default DeleteAccountPage;