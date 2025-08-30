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
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs'; // --- THIS IS THE FIX ---
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import FormGroup from '@/app/components/ui/form/FormGroup';
import Input from '@/app/components/ui/form/Input';
import Button from '@/app/components/ui/Button';
import Message from '@/app/components/ui/Message';
import styles from './page.module.css';

const DeleteAccountPage = () => {
  const { user, isAuthenticated, isLoading: isKindeLoading } = useKindeBrowserClient(); // --- THIS IS THE FIX ---
  const router = useRouter();
  
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isKindeLoading && !isAuthenticated) {
      router.push('/api/auth/login'); // --- THIS IS THE FIX ---
    }
  }, [isAuthenticated, isKindeLoading, router]);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmationEmail !== user?.email) { // --- THIS IS THE FIX ---
      setError('The email you entered does not match your account email.'); 
      return; 
    }
    
    setIsLoading(true);
    setError('');

    try {
      // TODO: Implement a new API endpoint to handle user deletion with Kinde's Management API.
      // const response = await fetch('/api/kinde/delete-user', { method: 'POST' });
      // if (!response.ok) throw new Error('Failed to delete account.');
      
      alert('Account deletion process initiated. Please check your email.');
      // Kinde's logout route will handle the session termination.
      router.push('/api/auth/logout');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setIsLoading(false);
    }
  };
  
  if (isKindeLoading || !isAuthenticated) {
    return <Container><p>Loading...</p></Container>;
  }
  
  const userEmail = user?.email || '';
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