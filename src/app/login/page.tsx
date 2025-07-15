'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import type { User } from '@/types';

// Import all our reusable components
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import FormGroup from '@/app/components/ui/form/FormGroup';
import Input from '@/app/components/ui/form/Input';
import Button from '@/app/components/ui/Button';
import Message from '@/app/components/ui/Message';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const users: User[] = JSON.parse(localStorage.getItem('vinite_users') || '[]');
    const user = users.find(
      (u: User) => u.email === email && u.password === password
    );

    if (user) {
      localStorage.setItem('vinite_loggedin_user', JSON.stringify(user));
      router.push('/dashboard');
    } else {
      setError('Invalid email or password.');
    }
  };

  const handleGoogleLogin = () => {
    alert('Simulating Google Login...');
  };

  return (
    <Container>
      <div className={styles.authContainer}>
        <PageHeader title="Log In to Your Account" />
        <Card className={styles.authCard}>
          {error && <Message type="error">{error}</Message>}
          <form onSubmit={handleLogin}>
            
            <FormGroup label="Email" htmlFor="email">
              <Input
                variant="quiet" // CORRECTED: Added variant prop
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </FormGroup>

            <FormGroup label="Password" htmlFor="password">
              <Input
                variant="quiet" // CORRECTED: Added variant prop
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </FormGroup>

            <Link href="/forgot-password" className={styles.forgotPasswordLink}>
              Forgot password?
            </Link>
            
            <Button type="submit" variant="primary" fullWidth>
              Log In
            </Button>
          </form>
          <div className={styles.separator}>OR</div>
          <Button type="button" variant="google" fullWidth onClick={handleGoogleLogin}>
            Continue with Google
          </Button>
        </Card>
        <div className={styles.authSwitch}>
          Don't have an account? <Link href="/signup">Sign Up</Link>
        </div>
      </div>
    </Container>
  );
};

export default LoginPage;