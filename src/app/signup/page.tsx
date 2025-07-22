/*
 * Filename: src/app/signup/page.tsx
 * Purpose: Renders the user signup page, connected to the live Supabase backend.
 *
 * Change History:
 * C009 - 2025-07-22 : 15:45 - Refactored handleSignup to use a two-step profile creation process.
 * C008 - 2025-07-22 : 04:30 - Refactored handleSignup to call Supabase Auth.
 * C007 - 2025-07-22 : 03:00 - Changed Google button variant for better clarity and contrast.
 * C006 - 2025-07-22 : 02:15 - Fully restored component to fix compiler errors.
 * C005 - 2025-07-22 : 01:30 - Removed compact variant from PageHeader.
 * C004 - 2025-07-22 : 01:00 - Refactored to use standardized Container and shared auth styles.
 *
 * Last Modified: 2025-07-22 : 15:45
 * Requirement ID (optional): VIN-B-03.1
 *
 * Change Summary:
 * The `handleSignup` function has been rewritten to follow the correct and secure Supabase
 * profile creation pattern. It now first calls `signUp` and then, on success, performs a
 * second `insert` call to the `profiles` table with the new user's data. This resolves the
 * "Database error saving new user" bug caused by RLS policies.
 *
 * Impact Analysis:
 * This change makes the user signup feature fully functional with the live Supabase backend.
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
        setMessage({ text: 'An unexpected error occurred during signup.', type: 'error' });
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
        id: authData.user.id, // The ID from the newly created auth user
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
      setMessage({ text: 'Success! Please check your email to confirm your account.', type: 'success' });
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) {
      setMessage({ text: error.message, type: 'error' });
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