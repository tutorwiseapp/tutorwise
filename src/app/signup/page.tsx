/*
 * Filename: src/app/signup/page.tsx
 * Purpose: Renders the user signup page, connected to the live Supabase backend.
 *
 * Change History:
 * C018 - 2025-07-22 : 22:00 - Reverted to a single-file component, removing the unnecessary Suspense boundary.
 * ... (previous history)
 *
 * Last Modified: 2025-07-22 : 22:00
 * Requirement ID (optional): VIN-A-004
 *
 * Change Summary:
 * The component has been reverted to its final, correct single-file structure. The logic from the
 * now-deleted `SignupForm.tsx` has been consolidated back into this file. This simplifies the
 * architecture and removes the need for a Suspense boundary, which is no longer required.
 *
 * Impact Analysis:
 * This change simplifies the component structure and prepares it for the upcoming NextAuth.js migration.
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { useAuth } from '@/app/components/auth/AuthProvider';
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
  const searchParams = useSearchParams();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    const claimId = searchParams.get('claimId');
    if (claimId) {
      setMessage({ text: `You are claiming a reward. Complete signup to continue.`, type: 'success' });
    }
  }, [searchParams]);

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