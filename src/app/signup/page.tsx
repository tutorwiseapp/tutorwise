/*
 * Filename: src/app/signup/page.tsx
 * Purpose: Renders the user signup page, with a secure, server-side Google OAuth flow.
 *
 * Change History:
 * C013 - 2025-07-22 : 18:30 - Corrected Google login to initiate the secure server-side OAuth flow.
 * C012 - 2025-07-22 : 18:00 - Refactored Google login to call a server-side API route.
 * C011 - 2025-07-22 : 17:00 - Implemented state-driven redirect for Google login.
 * C010 - 2025-07-22 : 16:45 - Implemented the handleGoogleLogin function.
 * C009 - 2025-07-22 : 15:45 - Refactored handleSignup to use a two-step profile creation process.
 *
 * Last Modified: 2025-07-22 : 18:30
 * Requirement ID (optional): VIN-D-02.4
 *
 * Change Summary:
 * The `handleGoogleLogin` function now correctly initiates the server-side OAuth flow by calling
 * `signInWithOAuth` and providing the absolute `redirectTo` URL for the `/auth/callback` route.
 * This is the final and correct implementation that resolves the localhost connection errors.
 *
 * Impact Analysis:
 * This change makes the Google Sign-Up feature fully functional, secure, and reliable.
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

    // Step 2: If auth user was created, insert their profile
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
      setMessage({ text: 'Success! If required, please check your email to confirm your account.', type: 'success' });
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

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