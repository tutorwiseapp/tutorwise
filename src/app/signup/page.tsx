'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './page.module.css';
import type { User } from '@/types';

// Import all the necessary reusable components
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import FormGroup from '@/app/components/ui/form/FormGroup';
import Input from '@/app/components/ui/form/Input';
import Button from '@/app/components/ui/Button';
import Message from '@/app/components/ui/Message';

const SignupPage = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const claimId = searchParams.get('claimId');
    if (claimId) {
      setMessage({
        text: `You are claiming a reward. Complete signup to continue.`,
        type: 'success'
      });
    }
  }, [searchParams]);

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    const users: User[] = JSON.parse(localStorage.getItem('vinite_users') || '[]');

    if (users.find(user => user.email === email)) {
      setMessage({ text: 'An account with this email already exists.', type: 'error' });
      return;
    }

    const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    const newUser: User = {
      firstName,
      lastName,
      email,
      password,
      displayName: `${firstName} ${lastName}`,
      agentId: `A1-${initials}${Math.floor(100000 + Math.random() * 900000)}`,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem('vinite_users', JSON.stringify(users));
    localStorage.setItem('vinite_loggedin_user', JSON.stringify(newUser));

    setMessage({ text: 'Account created successfully! Redirecting...', type: 'success' });
    setTimeout(() => router.push('/dashboard'), 2000);
  };

  return (
    <Container>
      <div className={styles.authContainer}>
        <PageHeader title="Create Your Account" />
        <p className="page-tagline">Join to start referring and earning rewards.</p>
        
        <Card className={styles.authCard}>
          {message && <Message type={message.type as 'success' | 'error'}>{message.text}</Message>}
          
          <form onSubmit={handleSignup}>
            <div className={styles.twoColGrid}>
              <FormGroup label="First Name" htmlFor="firstName">
                <Input 
                  variant="quiet" 
                  type="text" 
                  id="firstName" 
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)} 
                  required 
                />
              </FormGroup>
              <FormGroup label="Last Name" htmlFor="lastName">
                <Input 
                  variant="quiet" 
                  type="text" 
                  id="lastName" 
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)} 
                  required 
                />
              </FormGroup>
            </div>
            
            <FormGroup label="Email Address" htmlFor="email">
              <Input 
                variant="quiet" 
                type="email" 
                id="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </FormGroup>

            <FormGroup label="Password" htmlFor="password">
              <Input 
                variant="quiet" 
                type="password" 
                id="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </FormGroup>

            <Button type="submit" variant="primary" fullWidth style={{ marginTop: '16px' }}>
              Create Account
            </Button>
          </form>
          
          <div className={styles.separator}>OR</div>
          
          <Button type="button" variant="google" fullWidth>
            Continue with Google
          </Button>
        </Card>

        <div className={styles.authSwitch}>
          Already have an account? <Link href="/login">Log In</Link>
        </div>
      </div>
    </Container>
  );
};

export default SignupPage;