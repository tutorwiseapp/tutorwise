/*
 * Filename: src/app/settings/change-password/page.tsx
 * Purpose: Provides a secure form for users to change their account password.
 * Change History:
 * C006 - 2025-07-26 : 23:00 - Replaced `useAuth` with Clerk's `useUser` hook.
 * ... (previous history)
 * Last Modified: 2025-07-26 : 23:00
 * Requirement ID (optional): VIN-A-005
 * Change Summary: Surgically replaced the old `useAuth` hook with `useUser` from Clerk. Added
 * a `useEffect` to handle loading states and redirect unauthenticated users. This resolves
 * the final `AuthProvider` dependency crash and fully integrates the page with Clerk.
 * Impact Analysis: This change completes the migration of the settings pages to the Clerk
 * authentication system, making the feature functional and secure.
 * Dependencies: "@clerk/nextjs", "next/navigation", and various VDL UI components.
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

// VDL Component Imports
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import FormGroup from '@/app/components/ui/form/FormGroup';
import Input from '@/app/components/ui/form/Input';
import Button from '@/app/components/ui/Button';
import Message from '@/app/components/ui/Message';
import Breadcrumb from '@/app/components/ui/nav/Breadcrumb';

const ChangePasswordPage = () => {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in');
    }
  }, [isLoaded, user, router]);

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
    if (!user) {
        setMessage({ text: 'You must be logged in to change your password.', type: 'error' });
        return;
    }

    setIsLoading(true);

    try {
        await user.updatePassword({
            currentPassword: oldPassword,
            newPassword: newPassword,
        });
        setIsLoading(false);
        setMessage({ text: 'Password updated successfully! Redirecting...', type: 'success' });
        setTimeout(() => router.push('/settings'), 2000);
    } catch (err) {
        const error = err as { errors?: { message: string }[] };
        setIsLoading(false);
        setMessage({ text: error.errors?.[0]?.message || 'An unknown error occurred.', type: 'error' });
    }
  };

  if (!isLoaded || !user) {
      return <Container><p>Loading...</p></Container>;
  }

  const breadcrumbs = [
    { label: 'Settings', href: '/settings' },
    { label: 'Change Password' }
  ];

  return (
    <Container variant="form">
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