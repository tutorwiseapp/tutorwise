'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient'; // Import Supabase
import type { User } from '@/types';

// VDL Component Imports
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import FormGroup from '@/app/components/ui/form/FormGroup';
import Input from '@/app/components/ui/form/Input';
import Button from '@/app/components/ui/Button';
import Message from '@/app/components/ui/Message';
import { useAuth } from '@/app/components/auth/AuthProvider';

const SignupPage = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    const claimId = searchParams.get('claimId');
    if (claimId) {
      setMessage({
        text: `You are claiming a reward. Complete signup to continue.`,
        type: 'success'
      });
    }
  }, [searchParams]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const claimId = searchParams.get('claimId');
    
    // --- Create New User ---
    const displayName = `${firstName} ${lastName}`;
    const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    const agentId = `A1-${initials}${Math.floor(100000 + Math.random() * 900000)}`;

    const newUser: Partial<User> = {
      id: Math.floor(Math.random() * 10000), // Mock ID
      firstName, lastName, displayName, email, password, agentId,
      createdAt: new Date().toISOString(),
    };

    // --- Handle Reward Claiming Logic ---
    if (claimId) {
      // 1. Find the pending reward
      const { data: rewardData, error: rewardError } = await supabase
        .from('PendingRewards')
        .select('*')
        .eq('temp_agent_id', claimId)
        .limit(1);

      if (rewardError || !rewardData || rewardData.length === 0) {
        setMessage({ text: 'Error finding the reward to claim. Please contact support.', type: 'error' });
        return;
      }
      
      const rewardToClaim = rewardData[0];

      // 2. Add the reward to the permanent Transactions table
      // In a real app, we would use the real new user ID from the database
      // await supabase.from('Transactions').insert([{ ... }]);

      // 3. Delete the pending reward so it cannot be claimed again
      await supabase.from('PendingRewards').delete().eq('id', rewardToClaim.id);

      // 4. Update the original click log to attribute it to the new user
      await supabase
        .from('ClickLog')
        .update({ agent_id: newUser.agentId })
        .eq('agent_id', claimId);
    }
    
    // For now, we continue using localStorage for the user list
    const users: User[] = JSON.parse(localStorage.getItem('vinite_users') || '[]');
    users.push(newUser as User);
    localStorage.setItem('vinite_users', JSON.stringify(users));

    // Log the user in
    login(newUser as User);

    setMessage({ text: 'Account created successfully! Redirecting...', type: 'success' });
    setTimeout(() => router.push('/dashboard'), 2000);
  };

  return (
    <Container>
      <div className={styles.authContainer}>
        <PageHeader title="Create Your Account" />
        <p className="page-tagline">Join to start referring and earning rewards.</p>
        <Card className={styles.authCard}>
          {message && <Message type={message.type as any}>{message.text}</Message>}
          <form onSubmit={handleSignup}>
            {/* Form inputs remain the same */}
            <div className={styles.twoColGrid}>
              <FormGroup label="First Name" htmlFor="firstName"><Input id="firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></FormGroup>
              <FormGroup label="Last Name" htmlFor="lastName"><Input id="lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required /></FormGroup>
            </div>
            <FormGroup label="Email Address" htmlFor="email"><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></FormGroup>
            <FormGroup label="Password" htmlFor="password"><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></FormGroup>
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