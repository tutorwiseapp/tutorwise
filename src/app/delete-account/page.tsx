/*
 * Filename: src/app/delete-account/page.tsx
 * Purpose: Provides a UI for users to permanently delete their account with comprehensive Stripe cleanup.
 * Change History:
 * C005 - 2025-09-09 : Enhanced to support complete Stripe account/customer deletion.
 * C004 - 2025-08-26 : 14:00 - Replaced Clerk's useUser hook with Kinde's useKindeBrowserClient.
 * C003 - 2025-07-26 : 22:45 - Replaced useAuth with Clerk's useUser hook.
 * Last Modified: 2025-09-09
 * Requirement ID: VIN-AUTH-MIG-02
 * Change Summary: Enhanced the deletion flow to provide clear feedback about the comprehensive 
 * data cleanup process, including Stripe payment methods and payout accounts.
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
    
    setIsDeleting(true);
    
    try {
      const response = await fetch('/api/user/delete', {
        method: 'POST',
      });

      if (!response.ok) {
        let errorMessage = 'An unexpected server error occurred. Please try again.';
        // Check if the server sent a JSON error message before trying to parse it.
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const result = await response.json();
          errorMessage = result.error || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      
      // On success, log the user out and redirect.
      await fetch('/api/auth/logout', { method: 'POST' });
      
      // Show success message briefly before redirect
      window.alert(result.message || 'Your account has been successfully deleted.');
      window.location.href = '/';

    } catch (err) {
      // This will now catch network errors and provide a useful message for non-JSON server responses.
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

  // Check if user has any Stripe accounts
  const hasStripeCustomer = !!profile.stripe_customer_id;
  const hasStripeAccount = !!profile.stripe_account_id;
  const hasStripeData = hasStripeCustomer || hasStripeAccount;

  return (
    <Container variant="form">
      <PageHeader
        title="Delete Account"
        subtitle="This action is permanent and cannot be undone."
      />
      <Card>
        <Message type="error" className={styles.warningMessage}>
          You are about to permanently delete your account and all associated data, including:
          <br /><br />
          • Your profile information and referral links
          • All referral activity and earnings history
          {hasStripeCustomer && <><br />• Your saved payment methods and customer data</>}
          {hasStripeAccount && <><br />• Your connected payout account and transaction history</>}
          {hasStripeData && <><br /><br /><strong>Note:</strong> This will also delete all your data from Stripe's systems.</>}
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
              placeholder="Type DELETE to confirm"
            />
          </FormGroup>

          {error && <p className={styles.errorText}>{error}</p>}

          <Button
            type="submit"
            fullWidth
            className={styles.dangerButton}
            disabled={confirmationText !== 'DELETE' || isDeleting}
          >
            {isDeleting ? 'Deleting Account and All Data...' : 'Delete My Account Permanently'}
          </Button>
        </form>
      </Card>
    </Container>
  );
};

export default DeleteAccountPage;