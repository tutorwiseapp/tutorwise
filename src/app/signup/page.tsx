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
import { customAlphabet } from 'nanoid'; // --- 1. IMPORT customAlphabet ---

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

  // --- 2. CREATE A CUSTOM ID GENERATOR ---
  // Define the characters you want to use (URL-safe, no ambiguous characters)
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  // Create a function that generates a 10-character ID
  const generateRandomPart = customAlphabet(alphabet, 10);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    // --- 3. GENERATE THE NEW AGENT ID ---
    // Get user's initials, defaulting to 'U' if no name is provided
    const initials = fullName.match(/\b(\w)/g)?.join('').substring(0, 2).toUpperCase() || 'U';
    const randomPart = generateRandomPart(); // e.g., "7zL8bE1wX9"
    const agentId = `A1-${initials}${randomPart}`; // e.g., "A1-JS7zL8bE1wX9"

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          // --- 4. SAVE THE NEW ID TO THE DATABASE ---
          // This is passed to the Supabase function that creates the user profile
          agent_id: agentId, 
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
};