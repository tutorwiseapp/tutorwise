/*
 * Filename: src/app/settings/change-password/page.tsx
 * Purpose: Provides a secure form for users to change their account password.
 *
 * Change History:
 * C005 - 2025-07-21 : 22:15 - Reverted to using the global Container component for standardized layout.
 * C004 - 2025-07-21 : 22:00 - Replaced global Container with page-specific styled div.
 * C003 - 2025-07-21 : 21:30 - Refactored to use the standardized Container 'form' variant.
 * C002 - 2025-07-20 : 11:15 - Modified Container to use the 'narrow' variant.
 * C001 - 2025-07-20 : 10:30 - Initial creation with form and mock logic.
 *
 * Last Modified: 2025-07-21 : 22:15
 * Requirement ID (optional): VIN-A-005
 *
 * Change Summary:
 * The page has been reverted to use the architecturally correct `<Container variant="form">`.
 * This ensures its layout is controlled by the central design system, guaranteeing consistency
 * with all other form pages and improving long-term maintainability.
 *
 * Impact Analysis:
 * This change aligns the component with the project's core architectural principles.
 *
 * Dependencies: "react", "@/app/components/auth/AuthProvider", "@/app/components/layout/Container", and various UI components.
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
import { useAuth } from '@/app/components/auth/removeAuthProvider';

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