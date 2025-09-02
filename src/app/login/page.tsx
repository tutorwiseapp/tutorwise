/*
 * Filename: src/app/login/page.tsx
 * Purpose: Renders the user sign-in page with a Supabase-native form.
 * Change History:
 * C003 - 2025-09-02 : 16:00 - Rebuilt with a stateful form for Supabase Auth.
 * Last Modified: 2025-09-02 : 16:00
 * Requirement ID: VIN-AUTH-MIG-04
 * Change Summary: This page has been migrated from Kinde to Supabase Auth. It now contains a stateful form that uses the Supabase Browser Client to handle user login via email/password and Google OAuth.
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import authStyles from '@/app/styles/auth.module.css';
import Button from '@/app/components/ui/Button';
import Input from '@/app/components/ui/form/Input';
import FormGroup from '@/app/components/ui/form/FormGroup';
import Message from '@/app/components/ui/Message';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

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
      // Refresh the page to trigger the UserProfileContext to fetch the new user.
      router.refresh();
      router.push('/dashboard');
    }
  };
  
  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
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
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </FormGroup>
          <FormGroup label="Password" htmlFor="password">
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </FormGroup>
          <Button type="submit" variant="primary" fullWidth>Sign In</Button>
        </form>
        <div className={authStyles.separator}>or</div>
        <Button variant='google' fullWidth onClick={handleGoogleSignIn}>Sign In with Google</Button>
      </div>
      <div className={authStyles.authSwitch}>
        Don't have an account? <Link href="/signup">Sign Up</Link>
      </div>
    </Container>
  );
};