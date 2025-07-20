/*
 * Filename: src/app/settings/change-password/page.tsx
 * Purpose: Provides a secure form for users to change their account password.
 *
 * Change History:
 * C001 - 2025-07-20 : 10:30 - Initial creation with form and mock logic.
 *
 * Last Modified: 2025-07-20 : 10:30
 * Requirement ID (optional): VIN-A-005
 *
 * Change Summary:
 * Created the Change Password page, including a form for old password, new password, and confirmation.
 * Implemented mock logic to simulate a successful password change with appropriate user feedback.
 *
 * Impact Analysis:
 * This is a new feature. It depends on the AuthProvider to ensure only authenticated users can access it.
 *
 * Dependencies: "react", "@/app/components/auth/AuthProvider", and various UI components.
 * Props (if applicable): None.
 * TODO (if applicable): Replace mock logic with a real Supabase Auth API call to update the user's password.
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// VDL Component Imports
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import FormGroup from '@/app/components/ui/form/FormGroup';
import Input from '@/app/components/ui/form/Input';
import Button from '@/app/components/ui/Button';
import Message from '@/app/components/ui/Message';
import Breadcrumb from '@/app/components/ui/nav/Breadcrumb';
import { useAuth } from '@/app/components/auth/AuthProvider';
import styles from './page.module.css';

const ChangePasswordPage = () => {
  const { user } = useAuth();
  const router = useRouter();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ text: 'New password and confirmation do not match.', type: 'error' });
      return;
    }
    if (newPassword.length < 8) {
        setMessage({ text: 'New password must be at least 8 characters long.', type: 'error' });
        return;
    }

    setIsLoading(true);

    // MOCK API CALL
    console.log(`Attempting password change for ${user?.email}`);
    setTimeout(() => {
      // In a real app, you would have logic to check if the old password is correct.
      // For now, we'll simulate success.
      setIsLoading(false);
      setMessage({ text: 'Password updated successfully! Redirecting...', type: 'success' });
      setTimeout(() => router.push('/settings'), 2000);
    }, 1500);
  };

  const breadcrumbs = [
    { label: 'Settings', href: '/settings' },
    { label: 'Change Password' }
  ];

  return (
    <Container className={styles.container}>
      <Breadcrumb crumbs={breadcrumbs} />
      <PageHeader
        title="Change Password"
        subtitle="Choose a new, strong password for your account."
      />
      <Card>
        {message && <Message type={message.type}>{message.text}</Message>}
        <form onSubmit={handleSubmit}>
          <FormGroup label="Old Password" htmlFor="oldPassword">
            <Input
              id="oldPassword"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </FormGroup>
          <FormGroup label="New Password" htmlFor="newPassword">
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </FormGroup>
          <FormGroup label="Confirm New Password" htmlFor="confirmPassword">
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </FormGroup>
          <Button type="submit" variant="primary" disabled={isLoading} fullWidth>
            {isLoading ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </Card>
    </Container>
  );
};

export default ChangePasswordPage;