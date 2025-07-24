/*
 * Filename: src/app/delete-account/page.tsx
 * Purpose: Provides a UI for users to permanently delete their account.
 *
 * Change History:
 * C002 - 2025-07-22 : 15:00 - Refactored to call a secure API endpoint for deletion.
 * C001 - [Date] : [Time] - Initial creation.
 *
 * Last Modified: 2025-07-22 : 15:00
 * Requirement ID (optional): VIN-A-006
 *
 * Change Summary:
 * The component no longer attempts to call a mock `logout` function. The `handleDelete` function
 * is now `async` and makes a `POST` request to our new secure `/api/auth/delete-user` endpoint.
 * This aligns the component with the live backend and implements user deletion securely.
 *
 * Impact Analysis:
 * This change fixes a critical deployment blocker and makes the feature functional.
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient'; // Import the Supabase client

// VDL Component Imports
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import FormGroup from '@/app/components/ui/form/FormGroup';
import Input from '@/app/components/ui/form/Input';
import Button from '@/app/components/ui/Button';
import Message from '@/app/components/ui/Message';
import { useAuth } from '@/app/components/auth/removeAuthProvider';
import styles from './page.module.css';

const DeleteAccountPage = () => {
  const { user, isLoading: isAuthLoading } = useAuth(); // `logout` is no longer provided
  const router = useRouter();
  
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // This effect correctly redirects if the user is not logged in.
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmationEmail !== user?.email) { 
      setError('The email you entered does not match your account email.'); 
      return; 
    }
    
    setIsLoading(true);
    setError('');

    try {
      // Call our new secure, server-side API route
      const response = await fetch('/api/auth/delete-user', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to delete account.');
      }

      // The deletion was successful on the server. The AuthProvider's
      // onAuthStateChange listener will automatically detect the user is gone.
      // We can then redirect.
      alert('Your account has been successfully deleted.');
      router.push('/?message=account-deleted');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setIsLoading(false);
    }
  };
  
  if (isAuthLoading || !user) {
    return <Container><p>Loading...</p></Container>;
  }

  const isConfirmationMatch = confirmationEmail === user.email;

  return (
    <Container variant="form">
      <PageHeader title="Delete Your Account" subtitle="This is a permanent action." />
      <Card>
        <Message type="error" className={styles.warningMessage}>
          <strong>Warning:</strong> You are about to permanently delete your Vinite account. This cannot be undone.
        </Message>
        <form onSubmit={handleDelete} className={styles.form}>
          <FormGroup label={`To confirm, please type your email address: ${user.email}`} htmlFor="confirmationEmail">
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