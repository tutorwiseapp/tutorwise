'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import Breadcrumb from '@/app/components/ui/nav/Breadcrumb';
import FormGroup from '@/app/components/ui/form/FormGroup';
import Input from '@/app/components/ui/form/Input';
import Message from '@/app/components/ui/Message';

const ChangePasswordPage = () => {
  // --- THIS IS THE FIX: Get the full 'user' object to check the provider ---
  const { profile, user, isLoading } = useUserProfile();
  const router = useRouter();
  const supabase = createClient();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !profile) {
      router.push('/login');
    }
  }, [isLoading, profile, router]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Your password has been updated successfully.");
      setNewPassword('');
      setConfirmPassword('');
    }
    setIsSaving(false);
  };

  if (isLoading || !profile) {
      return <Container><p>Loading...</p></Container>;
  }

  const breadcrumbs = [
    { label: 'Settings', href: '/settings' },
    { label: 'Change Password' }
  ];
  
  // --- THIS IS THE FIX: Check if the user's provider is Google ---
  const isSocialLogin = user?.app_metadata.provider === 'google';

  return (
    <Container variant="form">
      <Breadcrumb crumbs={breadcrumbs} />
      <PageHeader
        title="Change Password"
        subtitle={isSocialLogin ? "Manage your password via your social provider." : "Choose a new, strong password for your account."}
      />
      <Card>
        {message && <Message type="success">{message}</Message>}
        {error && <Message type="error">{error}</Message>}

        {isSocialLogin ? (
          // If user signed in with Google, show this message
          <div>
            <p style={{ marginBottom: '1.5rem', lineHeight: '1.6' }}>
              You signed in using your Google account. To change your password, you must do so directly with Google.
            </p>
            <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer">
              <Button variant="primary" fullWidth>Go to Google Account Settings</Button>
            </a>
          </div>
        ) : (
          // Otherwise, show the password change form
          <form onSubmit={handleChangePassword}>
            <FormGroup label="New Password" htmlFor="newPassword">
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={isSaving}
              />
            </FormGroup>
            <FormGroup label="Confirm New Password" htmlFor="confirmPassword">
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isSaving}
              />
            </FormGroup>
            <Button type="submit" variant="primary" fullWidth disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        )}
      </Card>
    </Container>
  );
};

export default ChangePasswordPage;