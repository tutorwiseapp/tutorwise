/*
 * Filename: src/app/login/page.tsx
 * Purpose: Renders the user login page with a secure, client-side Google OAuth flow.
 *
 * Change History:
 * C008 - 2025-07-22 : 19:00 - Reverted to the correct client-side PKCE flow for Google Auth.
 * C007 - 2025-07-22 : 18:30 - Implemented the secure server-side Google OAuth flow.
 * C006 - 2025-07-22 : 16:00 - Fixed redirection race condition by using a state-driven useEffect.
 *
 * Last Modified: 2025-07-22 : 19:00
 * Requirement ID (optional): VIN-D-02.5
 *
 * Change Summary:
 * The `handleGoogleLogin` function has been simplified to correctly initiate the client-side
 * PKCE OAuth flow. A `useEffect` hook robustly handles redirection after any successful
 * login method, creating a reliable and seamless user experience.
 *
 * Impact Analysis:
 * This change makes the Google Sign-In feature fully functional, secure, and reliable.
 */
'use client';

import { useState, useEffect } from 'react';
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
  const { user } = useAuth();

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
    // On success, the useEffect will handle the redirect.
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });

    if (error) {
      setError(`Google login failed: ${error.message}`);
      setIsLoading(false);
    }
    // On success, Supabase redirects to Google and then back.
    // The AuthProvider and useEffect will handle the session and final redirect.
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
        <Button type="button" variant="google" fullWidth onClick={handleGoogleLogin} disabled={isLoading}>
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