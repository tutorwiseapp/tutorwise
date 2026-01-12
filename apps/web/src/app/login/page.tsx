/*
 * Filename: src/app/login/page.tsx
 * Purpose: Renders the user sign-in page with a Supabase-native form.
 * Change History:
 * C003 - 2025-09-02 : 16:00 - Rebuilt with a stateful form for Supabase Auth.
 * Last Modified: 2025-09-25 : 21:00 - Added metadata and name attributes for E2E testing
 * Requirement ID: VIN-AUTH-MIG-04
 * Change Summary: This page has been migrated from Kinde to Supabase Auth. It now contains a stateful form that uses the Supabase Browser Client to handle user login via email/password and Google OAuth.
 */

'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/data-display/PageHeader';
import authStyles from '@/app/styles/auth.module.css';
import Button from '@/app/components/ui/actions/Button';
import Input from '@/app/components/ui/forms/Input';
import FormGroup from '@/app/components/ui/forms/FormGroup';
import Message from '@/app/components/ui/feedback/Message';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    document.title = 'Login - Tutorwise';
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      const redirectUrl = searchParams?.get('redirect') || '/dashboard';
      router.push(redirectUrl);
      router.refresh();
    }
  };
  
  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
        queryParams: {
          // This is the key fix to ensure the user can select a different account
          prompt: 'select_account',
        },
      },
    });
  };

  return (
    <Container variant="form">
      <PageHeader title="Log In to Your Account" />
      <div className={authStyles.authCard}>
        {error && <Message type="error">{error}</Message>}
        <form onSubmit={handleSignIn}>
          <FormGroup label="Email" htmlFor="email">
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ fontSize: '16px' }}
              required
            />
          </FormGroup>
          <FormGroup label="Password" htmlFor="password">
            <div className={authStyles.passwordInputWrapper}>
              <Input
                id="password"
                name="current-password"
                autoComplete="current-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ fontSize: '16px', paddingRight: '60px' }}
                required
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
          <Link href="/forgot-password" className={authStyles.forgotPasswordLink}>
            Forgot password?
          </Link>
          <div className={authStyles.buttonGrid}>
            <Button type="submit" variant="primary" fullWidth>Sign In</Button>
            <Button variant='google' fullWidth onClick={handleGoogleSignIn}>Sign In with Google</Button>
          </div>
        </form>
      </div>
      <div className={authStyles.authSwitch}>
        Don&apos;t have an account? <Link href="/signup">Sign Up</Link>
      </div>
    </Container>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Container><div>Loading...</div></Container>}>
      <LoginForm />
    </Suspense>
  );
}