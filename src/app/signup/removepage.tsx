/*
 * Filename: src/app/signup/page.tsx
 * Purpose: Renders the user signup page, connected to the live Supabase backend.
 *
 * Change History:
 * C020 - 2025-07-22 : 22:30 - Removed useSearchParams and claimId logic to fix build error.
 * C019 - 2025-07-22 : 22:15 - Reverted to a single-file component.
 * ... (previous history)
 *
 * Last Modified: 2025-07-22 : 22:30
 * Requirement ID (optional): VIN-A-004
 *
 * Change Summary:
 * The `useSearchParams` hook and the associated `useEffect` for handling `claimId` have been
 * temporarily removed. This is a strategic decision to eliminate the root cause of the
 * Vercel build error, simplifying the component and unblocking deployment.
 *
 * Impact Analysis:
 * This change fixes the critical deployment blocker. The "claim reward on signup" feature
 * is temporarily disabled and will be re-implemented in a future task.
 
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // useSearchParams is removed
import { supabase } from '@/lib/supabaseClient';
import type { Profile } from '@/types';

// VDL Component Imports
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import FormGroup from '@/app/components/ui/form/FormGroup';
import Input from '@/app/components/ui/form/Input';
import Button from '@/app/components/ui/Button';
import Message from '@/app/components/ui/Message';
import { RadioGroup } from '@/app/components/ui/form/Radio';
import { useAuth } from '@/app/components/auth/removeAuthProvider';
import authStyles from '@/app/styles/auth.module.css';

const roleOptions = [
  { value: 'agent', label: 'Agent - Earn Rewards' },
  { value: 'seeker', label: 'Seeker - Access Opportunities' },
  { value: 'provider', label: 'Provider - Be Discovered' },
];

const SignupPage = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('agent');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  // The useEffect for useSearchParams has been removed.
  // TODO: Re-implement the "claim reward" feature using a server-side method.

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (authError || !authData.user) {
      setMessage({ text: authError?.message || 'Could not sign up user. Please try again.', type: 'error' });
      setIsLoading(false);
      return;
    }

    const displayName = `${firstName} ${lastName}`;
    const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    const agentId = `A1-${initials}${Math.floor(100000 + Math.random() * 900000)}`;

    const response = await fetch('/api/auth/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: authData.user.id,
            first_name: firstName,
            last_name: lastName,
            display_name: displayName,
            agent_id: agentId,
            roles: [selectedRole],
        })
    });

    if (!response.ok) {
        const { error } = await response.json();
        setMessage({ text: `Database error: ${error}`, type: 'error' });
        setIsLoading(false);
    } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        setIsLoading(false);
        if (loginError) {
            setMessage({ text: `Account created, but login failed: ${loginError.message}`, type: 'error' });
        } else {
            setMessage({ text: 'Account created! Redirecting...', type: 'success' });
            router.push('/dashboard');
        }
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) {
      setMessage({ text: `Google login failed: ${error.message}`, type: 'error' });
      setIsLoading(false);
    }
  };

  return (
    <Container variant="form">
      <PageHeader 
        title="Create Your Account" 
      />
      <p className="page-tagline">Join to start referring and earning rewards.</p>
      <Card className={authStyles.authCard}>
        {message && <Message type={message.type}>{message.text}</Message>}
        <form onSubmit={handleSignup}>
          <div className={authStyles.twoColGrid}>
            <FormGroup label="First Name" htmlFor="firstName"><Input id="firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required disabled={isLoading} /></FormGroup>
            <FormGroup label="Last Name" htmlFor="lastName"><Input id="lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required disabled={isLoading} /></FormGroup>
          </div>
          <FormGroup label="Email Address" htmlFor="email"><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} /></FormGroup>
          <FormGroup label="Password" htmlFor="password"><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} /></FormGroup>
          
          <FormGroup label="What do you want to do first?">
              <RadioGroup
                  name="role"
                  options={roleOptions}
                  selectedValue={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
              />
          </FormGroup>

          <Button type="submit" variant="primary" fullWidth style={{ marginTop: '16px' }} disabled={isLoading}>
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>
        <div className={authStyles.separator}>OR</div>
        <Button type="button" variant="google" fullWidth onClick={handleGoogleLogin} disabled={isLoading}>
          Continue with Google
        </Button>
      </Card>
      <div className={authStyles.authSwitch}>Already have an account? <Link href="/login">Log In</Link></div>
    </Container>
  );
};

export default SignupPage;

*/