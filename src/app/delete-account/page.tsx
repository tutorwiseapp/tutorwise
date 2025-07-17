'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/types'; // This is now used

import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import FormGroup from '@/app/components/ui/form/FormGroup';
import Input from '@/app/components/ui/form/Input';
import Button from '@/app/components/ui/Button';
import Message from '@/app/components/ui/Message';
import { useAuth } from '@/app/components/auth/AuthProvider';
import styles from './page.module.css';

const DeleteAccountPage = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // --- THIS IS THE FIX ---
    // We check the user object directly.
    const loggedInUser: User | null = JSON.parse(localStorage.getItem('vinite_loggedin_user') || 'null');
    if (!loggedInUser) {
      router.push('/login');
    }
  }, [router]);

  if (!user) return <Container><p>Loading...</p></Container>;

  const isConfirmationMatch = confirmationEmail === user.email;

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmationMatch) { setError('The email you entered does not match your account email.'); return; }
    setIsLoading(true);
    setError('');
    console.log(`DELETING USER: ${user.email}`);
    setTimeout(() => {
      logout();
      router.push('/?message=account-deleted');
    }, 2000);
  };

  return (
    <Container className={styles.container}>
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