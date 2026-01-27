/*
 * Filename: src/app/(public)/reset-password/page.tsx
 * Purpose: Password reset page - allows users to set a new password after clicking email link
 * Created: 2026-01-27
 */
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/data-display/PageHeader';
import FormGroup from '@/app/components/ui/forms/FormGroup';
import Input from '@/app/components/ui/forms/Input';
import Button from '@/app/components/ui/actions/Button';
import Message from '@/app/components/ui/feedback/Message';
import authStyles from '@/app/styles/auth.module.css';

function ResetPasswordContent() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Check if user has a valid recovery session
  useEffect(() => {
    const checkSession = async () => {
      // Get the code from URL if present
      const code = searchParams?.get('code');

      if (code) {
        // Exchange the code for a session
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('Error exchanging code:', error);
          setError('This password reset link is invalid or has expired. Please request a new one.');
          setIsValidSession(false);
          return;
        }
      }

      // Check if there's an active session
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setIsValidSession(true);
      } else {
        setError('No valid session found. Please request a new password reset link.');
        setIsValidSession(false);
      }
    };

    checkSession();
  }, [searchParams, supabase.auth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      setIsLoading(false);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login?message=Password updated successfully. Please log in.');
      }, 3000);
    } catch (err) {
      console.error('Password update error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  // Loading state while checking session
  if (isValidSession === null) {
    return (
      <Container variant="form">
        <PageHeader title="Reset Password" subtitle="Verifying your reset link..." />
        <div className={authStyles.authCard}>
          <p style={{ textAlign: 'center', color: '#666' }}>Please wait...</p>
        </div>
      </Container>
    );
  }

  // Invalid or expired link
  if (isValidSession === false) {
    return (
      <Container variant="form">
        <PageHeader title="Reset Password" subtitle="Unable to reset password" />
        <div className={authStyles.authCard}>
          <Message type="error">{error || 'Invalid or expired reset link.'}</Message>
          <div style={{ marginTop: '1rem' }}>
            <Button
              variant="primary"
              fullWidth
              onClick={() => router.push('/forgot-password')}
            >
              Request New Reset Link
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <Container variant="form">
        <PageHeader title="Password Updated" subtitle="Your password has been changed successfully" />
        <div className={authStyles.authCard}>
          <Message type="success">
            Your password has been updated. Redirecting to login...
          </Message>
        </div>
      </Container>
    );
  }

  // Password reset form
  return (
    <Container variant="form">
      <PageHeader title="Reset Password" subtitle="Enter your new password below" />
      <div className={authStyles.authCard}>
        {error && <Message type="error">{error}</Message>}
        <form onSubmit={handleSubmit}>
          <FormGroup label="New Password" htmlFor="password">
            <div className={authStyles.passwordInputWrapper}>
              <Input
                id="password"
                name="new-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ fontSize: '16px', paddingRight: '60px' }}
                required
                disabled={isLoading}
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={authStyles.togglePasswordButton}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </FormGroup>
          <FormGroup label="Confirm New Password" htmlFor="confirmPassword">
            <Input
              id="confirmPassword"
              name="confirm-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ fontSize: '16px' }}
              required
              disabled={isLoading}
              minLength={8}
            />
          </FormGroup>
          <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
            {isLoading ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </div>
    </Container>
  );
}

// Loading fallback for Suspense
function ResetPasswordLoading() {
  return (
    <Container variant="form">
      <PageHeader title="Reset Password" subtitle="Loading..." />
      <div className={authStyles.authCard}>
        <p style={{ textAlign: 'center', color: '#666' }}>Please wait...</p>
      </div>
    </Container>
  );
}

// Main page component wrapped in Suspense for useSearchParams
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordLoading />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
