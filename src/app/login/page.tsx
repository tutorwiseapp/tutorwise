/*
 * Filename: src/app/login/page.tsx
 * Purpose: Renders the user login page, now connected to the live Supabase backend.
 *
 * Change History:
 * C005 - 2025-07-22 : 15:15 - Refactored handleLogin to use Supabase client, fixing build error.
 * C004 - 2025-07-22 : 03:00 - Changed Google button variant for better clarity and contrast.
 * C003 - 2025-07-21 : 22:45 - Reverted to use page-specific .authContainer for layout consistency.
 * C002 - 2025-07-21 : 21:30 - Refactored to use the standardized Container 'form' variant.
 * C001 - [Date] : [Time] - Initial creation.
 *
 * Last Modified: 2025-07-22 : 15:15
 * Requirement ID (optional): VIN-A-004
 *
 * Change Summary:
 * The component no longer attempts to call the mock `login` function from `useAuth`. The `handleLogin`
 * function is now an `async` function that calls `supabase.auth.signInWithPassword`. This aligns
 * the component with the new live authentication system and resolves the critical build error.
 *
 * Impact Analysis:
 * This change completes the migration of the login page to the live backend.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient'; // Import the Supabase client

// VDL Component Imports
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import FormGroup from '@/app/components/ui/form/FormGroup';
import Input from '@/app/components/ui/form/Input';
import Button from '@/app/components/ui/Button';
import Message from '@/app/components/ui/Message';
import authStyles from '@/app/styles/auth.module.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  // We no longer get `login` from useAuth()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Call Supabase Auth to sign in the user
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    setIsLoading(false);

    if (error) {
      setError(error.message);
    } else {
      // The AuthProvider will automatically detect the sign-in and update the global state.
      // We can then redirect the user to the dashboard.
      router.push('/dashboard');
    }
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