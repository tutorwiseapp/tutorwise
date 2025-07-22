/*
 * Filename: src/app/signup/page.tsx
 * Purpose: Renders the user signup page, connected to the live Supabase backend for both email and Google OAuth.
 *
 * Change History:
 * C011 - 2025-07-22 : 17:00 - Implemented state-driven redirect for Google login to fix race condition.
 * C010 - 2025-07-22 : 16:45 - Implemented the handleGoogleLogin function for OAuth sign-in.
 * C009 - 2025-07-22 : 15:45 - Refactored handleSignup to use a two-step profile creation process.
 * ... (previous history)
 *
 * Last Modified: 2025-07-22 : 17:00
 * Requirement ID (optional): VIN-D-02
 *
 * Change Summary:
 * A new `useEffect` hook has been added to listen for the `user` state. When a user logs in
 * (via email or Google), this effect will safely redirect them to the dashboard. The `redirectTo`
 * option has been removed from `signInWithOAuth` to create a more robust, state-driven flow
 * that is free of race conditions.
 *
 * Impact Analysis:
 * This change fixes the `ERR_CONNECTION_REFUSED` error and makes the Google login fully functional and reliable.
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

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

  // This effect listens for the auth state to change. If a user successfully
  // logs in (via any method), this will safely redirect them.
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

    // Step 1: Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (authError) {
      setMessage({ text: authError.message, type: 'error' });
      setIsLoading(false);
      return;
    }

    if (!authData.user) {
        setMessage({ text: 'An unexpected error occurred. Please try again.', type: 'error' });
        setIsLoading(false);
        return;
    }

    // Step 2: If auth user was created, insert their profile into the `profiles` table
    const displayName = `${firstName} ${lastName}`;
    const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    const agentId = `A1-${initials}${Math.floor(100000 + Math.random() * 900000)}`;

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        first_name: firstName,
        last_name: lastName,
        display_name: displayName,
        agent_id: agentId,
        roles: [selectedRole as 'agent' | 'seeker' | 'provider'],
      });
    
    setIsLoading(false);

    if (profileError) {
      setMessage({ text: `Database error saving new user: ${profileError.message}`, type: 'error' });
    } else {
      // With email confirmation disabled for development, the user will be logged in,
      // and the useEffect will handle the redirect.
      setMessage({ text: 'Account created successfully! Redirecting...', type: 'success' });
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });

    if (error) {
      setMessage({ text: `Google login failed: ${error.message}`, type: 'error' });
      setIsLoading(false);
    }
    // On success, Supabase redirects to Google and then back. The useEffect will handle
    // the final redirect to the dashboard.
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