/*
 * Filename: src/app/signup/page.tsx
 * Purpose: Renders the user signup page, now connected to the live Supabase backend.
 *
 * Change History:
 * C008 - 2025-07-22 : 04:30 - Refactored handleSignup to call Supabase Auth instead of the mock system.
 * C007 - 2025-07-22 : 03:00 - Changed Google button variant for better clarity and contrast.
 * ... (previous history)
 *
 * Last Modified: 2025-07-22 : 04:30
 * Requirement ID (optional): VIN-B-03.1
 *
 * Change Summary:
 * The `handleSignup` function has been completely rewritten. It now calls `supabase.auth.signUp()`,
 * passing the user's first name, last name, and role in the `options.data` field. This metadata
 * is used by a database trigger to automatically create a corresponding row in the `profiles` table.
 * The component no longer uses the mock `useData` or `useAuth` hooks.
 *
 * Impact Analysis:
 * This is the first frontend component to be fully migrated to the live backend. It allows for
 * real user creation.
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

    // Call Supabase Auth to sign up the new user
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        // Pass this metadata to our `handle_new_user` database trigger
        data: {
          first_name: firstName,
          last_name: lastName,
          role: selectedRole
        }
      }
    });

    setIsLoading(false);

    if (error) {
      setMessage({ text: error.message, type: 'error' });
    } else if (data.user) {
      // Supabase sends a confirmation email by default.
      // We show a success message prompting the user to check their inbox.
      setMessage({ text: 'Success! Please check your email to confirm your account.', type: 'success' });
      // We could add logic here to handle the claimId if needed, but for now,
      // the primary action is to confirm the email.
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
        <Button type="button" variant="google" fullWidth disabled={isLoading}>
          Continue with Google
        </Button>
      </Card>
      <div className={authStyles.authSwitch}>Already have an account? <Link href="/login">Log In</Link></div>
    </Container>
  );
};

export default SignupPage;