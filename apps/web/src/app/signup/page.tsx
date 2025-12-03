/*
 * Filename: src/app/signup/page.tsx
 * Purpose: Renders the user sign-up page with a Supabase-native form.
 * Change History:
 * C003 - 2025-09-02 : 16:00 - Rebuilt with a stateful form for Supabase Auth.
 * Last Modified: 2025-09-25 : 21:00 - Added metadata and name attributes for E2E testing
 * Requirement ID: VIN-AUTH-MIG-04
 * Change Summary: This page has been migrated from Kinde to Supabase Auth. It now contains a stateful form that uses the Supabase Browser Client to handle user registration via email/password and Google OAuth.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/data-display/PageHeader';
import authStyles from '@/app/styles/auth.module.css';
import Button from '@/app/components/ui/actions/Button';
import Input from '@/app/components/ui/forms/Input';
import FormGroup from '@/app/components/ui/forms/FormGroup';
import Message from '@/app/components/ui/feedback/Message';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    document.title = 'Sign Up - Tutorwise';

    // Check if there's a referral code in the cookie
    const cookies = document.cookie.split(';');
    const referralCookie = cookies.find(cookie => cookie.trim().startsWith('referral_code='));
    if (referralCookie) {
      const code = referralCookie.split('=')[1];
      setReferralCode(code);
    }
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${location.origin}/onboarding`,
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`.trim(),
            referral_code: referralCode || undefined, // Pass referral code to handle_new_user trigger
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setIsLoading(false);
        return;
      }

      console.log('Signup response:', { data, hasSession: !!data.session, hasUser: !!data.user });

      // If we have a session, user is auto-logged in
      if (data.session) {
        console.log('Session created, redirecting to onboarding...');
        router.push('/onboarding');
      } else if (data.user && !data.user.email_confirmed_at) {
        // Email confirmation is enabled
        setMessage("Check your email for a confirmation link!");
        setIsLoading(false);
      } else {
        // Edge case: user created but no session yet
        setMessage("Account created! Redirecting...");
        setTimeout(() => {
          router.push('/login?message=Please log in with your new account');
        }, 1500);
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
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
      <p className="page-tagline">Join Tutorwise Free: Start Tutoring Now!</p>
      <div className={authStyles.authCard}>
        {message && <Message type="success">{message}</Message>}
        {error && <Message type="error">{error}</Message>}
        <form onSubmit={handleSignUp}>
          <FormGroup label="First Name" htmlFor="firstName">
            <Input id="firstName" name="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" required />
          </FormGroup>
          <FormGroup label="Last Name" htmlFor="lastName">
            <Input id="lastName" name="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Smith" required />
          </FormGroup>
          <FormGroup label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="johnsmith@gmail.com" required />
          </FormGroup>
          <FormGroup label="Password" htmlFor="password">
            <Input id="password" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </FormGroup>
          <FormGroup label="Referral Code (Optional)" htmlFor="referralCode">
            <Input
              id="referralCode"
              name="referralCode"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              placeholder="Enter referral code if you have one"
            />
          </FormGroup>
          <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Sign Up'}
          </Button>
        </form>
        <div className={authStyles.separator}>or</div>
        <Button variant='secondary' fullWidth onClick={handleGoogleSignUp}>Sign Up with Google</Button>
      </div>
      <div className={authStyles.authSwitch}>
        Already have an account? <Link href="/login">Log In</Link>
      </div>
    </Container>
  );
}