/*
 * Filename: src/app/login/page.tsx
 * Purpose: Renders the user login page, now with robust, state-driven redirection.
 *
 * Change History:
 * C006 - 2025-07-22 : 16:00 - Fixed redirection race condition by using a state-driven useEffect.
 * C005 - 2025-07-22 : 15:15 - Refactore handleLogin to use Supabase client.
 * C004 - 2025-07-22 : 03:00 - Changed Google button variant for better clarity.
 * C003 - 2025-07-21 : 22:45 - Reverted to use page-specific .authContainer.
 * C002 - 2025-07-21 : 21:30 - Refactored to use Container 'form' variant.
 * C001 - [Date] : [Time] - Initial creation.
 *
 * Last Modified: 2025-07-22 : 16:00
 * Requirement ID (optional): VIN-B-03.2
 *
 * Change Summary:
 * A new `useEffect` has been added to listen for changes to the `user` object from `useAuth`.
 * The `router.push('/dashboard')` call has been moved from `handleLogin` into this new effect.
 * This resolves a critical race condition where the page would redirect back to `/login`
 * before the auth state was fully updated.
 *
 * Impact Analysis:
 * This change makes the login flow robust and reliable.
 */
'use client';

import { useState, useEffect } from 'react'; // useEffect is now needed
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// VDL Component Imports
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import FormGroup from '@/app/components/ui/form/FormGroup';
import Input from '@/app/components/ui/form/Input';
import Button from '@/app/components/ui/Button';
import Message from '@/app/components/ui/Message';
import { useAuth } from '@/app/components/auth/AuthProvider';
import authStyles from '@/app/styles/auth.module.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth(); // We now get the user state to watch for changes

  // --- THIS IS THE FIX ---
  // This effect listens for the auth state to change.
  // If the user object becomes available (i.e., not null), it means login was
  // successful, and we can safely redirect.
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    setIsLoading(false);

    if (error) {
      setError(error.message);
    }
    // We no longer redirect here. We let the useEffect handle it.
  };

  return (
    <Container variant="form">
      <PageHeader title="Log In to Your Account" />
      <Card className={authStyles.authCard}>
        {error && <Message type="error">{error}</Message>}
        <form onSubmit={handleLogin}>
          <FormGroup label="Email" htmlFor="email">
            <Input
              variant="quiet"
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </FormGroup>
          <FormGroup label="Password" htmlFor="password">
            <Input
              variant="quiet"
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </FormGroup>
          <Link href="/forgot-password" className={authStyles.forgotPasswordLink}>
            Forgot password?
          </Link>
          <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
            {isLoading ? 'Logging In...' : 'Log In'}
          </Button>
        </form>
        <div className={authStyles.separator}>OR</div>
        <Button type="button" variant="google" fullWidth disabled={isLoading}>
          Continue with Google
        </Button>
      </Card>
      <div className={authStyles.authSwitch}>
        Don't have an account? <Link href="/signup">Sign Up</Link>
      </div>
    </Container>
  );
};

export default LoginPage;