'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { Profile } from '@/types'; // Using the snake_case Profile type

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
import { useData } from '@/app/components/data/DataProvider';
import styles from './page.module.css';

const roleOptions = [
  { value: 'agent', label: 'Refer & earn rewards (Become an Agent)' },
  { value: 'seeker', label: 'Seek recommendations (Become a Seeker)' },
  { value: 'provider', label: 'Accept referrals & payments (Become a Provider)' },
];

const SignupPage = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('agent');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { addUser } = useData();

  useEffect(() => {
    const claimId = searchParams.get('claimId');
    if (claimId) {
      setMessage({ text: `You are claiming a reward. Complete signup to continue.`, type: 'success' });
    }
  }, [searchParams]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const claimId = searchParams.get('claimId');
    
    const displayName = `${firstName} ${lastName}`;
    const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    const agentId = `A1-${initials}${Math.floor(100000 + Math.random() * 900000)}`;

    // --- FIX: Create a `Profile` object with snake_case properties ---
    const newUser: Profile = {
      id: String(Math.floor(Math.random() * 10000)), // Using number for mock data
      first_name: firstName,
      last_name: lastName,
      display_name: displayName,
      email: email,
      agent_id: agentId,
      created_at: new Date().toISOString(),
      roles: [selectedRole as 'agent' | 'seeker' | 'provider'],
    };

    let redirectPath = '/dashboard';

    if (claimId) {
        // Claim logic...
    }
    
    addUser(newUser);
    login(newUser); // AuthProvider needs to accept Profile type

    setMessage({ text: 'Account created successfully! Redirecting...', type: 'success' });
    setTimeout(() => router.push(redirectPath), 1500);
  };

  return (
    <Container>
      {/* --- FIX: Apply CSS Modules correctly to all elements --- */}
      <div className={styles.authContainer}>
        <PageHeader 
          title="Create Your Account" 
          subtitle="Join to start referring and earning rewards."
        />
        <Card className={styles.authCard}>
          {message && <Message type={message.type}>{message.text}</Message>}
          <form onSubmit={handleSignup}>
            <div className={styles.twoColGrid}>
              <FormGroup label="First Name" htmlFor="firstName"><Input id="firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></FormGroup>
              <FormGroup label="Last Name" htmlFor="lastName"><Input id="lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required /></FormGroup>
            </div>
            <FormGroup label="Email Address" htmlFor="email"><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></FormGroup>
            <FormGroup label="Password" htmlFor="password"><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></FormGroup>
            
            <FormGroup label="What do you want to do first?">
                <RadioGroup
                    name="role"
                    options={roleOptions}
                    selectedValue={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                />
            </FormGroup>

            <Button type="submit" variant="primary" fullWidth style={{ marginTop: '16px' }}>Create Account</Button>
          </form>
          <div className={styles.separator}>OR</div>
          <Button type="button" variant="google" fullWidth>Continue with Google</Button>
        </Card>
        <div className={styles.authSwitch}>Already have an account? <Link href="/login">Log In</Link></div>
      </div>
    </Container>
  );
};

export default SignupPage;