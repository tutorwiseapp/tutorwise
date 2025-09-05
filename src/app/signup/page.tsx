/*
 * Filename: src/app/signup/page.tsx
 * Purpose: Renders the user sign-up page with a Supabase-native form.
 * Change History:
 * C003 - 2025-09-02 : 16:00 - Rebuilt with a stateful form for Supabase Auth.
 * Last Modified: 2025-09-02 : 16:00
 * Requirement ID: VIN-AUTH-MIG-04
 * Change Summary: This page has been migrated from Kinde to Supabase Auth. It now contains a stateful form that uses the Supabase Browser Client to handle user registration via email/password and Google OAuth.
 */
'use client'

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

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Check your email for a confirmation link!");
    }
  };

  const handleGoogleSignUp = async () => {
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
      <PageHeader title="Create Your Account" />
      <p className="page-tagline">Join to start referring and earning rewards.</p>
      <div className={authStyles.authCard}>
        {message && <Message type="success">{message}</Message>}
        {error && <Message type="error">{error}</Message>}
        <form onSubmit={handleSignUp}>
          <FormGroup label="Full Name" htmlFor="fullName">
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </FormGroup>
          <FormGroup label="Email" htmlFor="email">
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </FormGroup>
          <FormGroup label="Password" htmlFor="password">
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </FormGroup>
          <Button type="submit" variant="primary" fullWidth>Sign Up</Button>
        </form>
        <div className={authStyles.separator}>or</div>
        <Button variant='google' fullWidth onClick={handleGoogleSignUp}>Sign Up with Google</Button>
      </div>
      <div className={authStyles.authSwitch}>
        Already have an account? <Link href="/login">Log In</Link>
      </div>
    </Container>
  );
}