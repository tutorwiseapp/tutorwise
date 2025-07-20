'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@/types';

// VDL Component Imports
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import FormGroup from '@/app/components/ui/form/FormGroup';
import Input from '@/app/components/ui/form/Input';
import Button from '@/app/components/ui/Button';
import Message from '@/app/components/ui/Message';
import { RadioGroup } from '@/app/components/ui/form/Radio';
import { useAuth } from '@/app/components/auth/AuthProvider'; // FIX: Corrected import path
import { useData } from '@/app/components/data/DataProvider'; // Import useData hook
import styles from 'react-day-picker/style.css';

const roleOptions = [
  { value: 'agent', label: 'Earn rewards by referring others (Become an Agent)' },
  { value: 'seeker', label: 'Pay for services from a provider (Become a Seeker)' },
  { value: 'provider', label: 'Accept referrals and payments (Become a Provider)' },
];

const SignupPage = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState('agent');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { addUser } = useData(); // Get the addUser function from our new context

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

    const newUser: Partial<User> = {
      id: Math.floor(Math.random() * 10000).toString(), // FIX: Type 'number' is not assignable to type 'string'.
      first_name: firstName, last_name: lastName, display_name: displayName, email, password, agent_id: agentId,
      created_at: new Date().toISOString(),
      roles: [selectedRole as 'agent' | 'seeker' | 'provider'],
    };

    let redirectPath = '/dashboard';

    if (claimId) {
        const { data: rewardData } = await supabase.from('PendingRewards').select('*').eq('temp_agent_id', claimId).limit(1);
        if (rewardData && rewardData.length > 0) {
            const rewardToClaim = rewardData[0];
            const claimDetails = { userName: displayName, serviceName: rewardToClaim.service_name };
            sessionStorage.setItem('vinite_claim_details', JSON.stringify(claimDetails));
            await supabase.from('PendingRewards').delete().eq('id', rewardToClaim.id);
            await supabase.from('ClickLog').update({ agent_id: newUser.agent_id }).eq('agent_id', claimId);
            redirectPath = '/claim-success';
        }
    }
    
    // Use the centralized addUser function from context instead of manipulating localStorage directly
    addUser(newUser as User);

    login(newUser as User);

    setMessage({ text: 'Account created successfully! Redirecting...', type: 'success' });
    setTimeout(() => router.push(redirectPath), 1500);
  };

  return (
    <Container>
      <div className="authContainer"> {/* FIX: Removed styles.authContainer as it's not defined in the imported CSS module */}
        <PageHeader title="Create Your Account" />
        <p className="page-tagline">Join to start referring and earning rewards.</p> {/* FIX: Removed styles.authCard as it's not defined in the imported CSS module */}
        <Card className="authCard">
          {message && <Message type={message.type}>{message.text}</Message>}
          <form onSubmit={handleSignup}>
            <div className="twoColGrid">
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
          <div className="separator">OR</div>
          <Button type="button" variant="google" fullWidth>Continue with Google</Button>
        </Card>
        <div className="authSwitch">Already have an account? <Link href="/login">Log In</Link></div>
      </div>
    </Container>
  );
};

export default SignupPage;