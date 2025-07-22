/*
 * Filename: src/app/login/page.tsx
 * Purpose: Renders the user login page.
 *
 * Change History:
 * C004 - 2025-07-22 : 00:30 - Refactored to use the standardized Container and shared auth stylesheet.
 * C003 - 2025-07-21 : 22:45 - Reverted to use page-specific .authContainer.
 * C002 - 2025-07-21 : 21:30 - Refactored to use Container 'form' variant.
 * C001 - [Date] : [Time] - Initial creation.
 *
 * Last Modified: 2025-07-22 : 00:30
 * Requirement ID (optional): VIN-A-004
 *
 * Change Summary:
 * The page now uses `<Container variant="form">` for its main layout and imports all specific
 * styles from the new shared `auth.module.css` file. This completes its standardization.
 *
 * Impact Analysis:
 * This change aligns the login page perfectly with the application's design system.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import authStyles from '@/app/styles/auth.module.css'; // The new shared stylesheet

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const users: User[] = JSON.parse(localStorage.getItem('vinite_users') || '[]');
    const user = users.find(
      (u: User) => u.email === email && u.password === password
    );

    if (user) {
      login(user); 
      router.push('/dashboard');
    } else {
      setError('Invalid email or password.');
    }
  };

  return (
    <Container variant="form">
      <PageHeader title="Log In to Your Account" />
      <Card className={authStyles.authCard}>
        {error && <Message type="error">{error}</Message>}
        <form onSubmit={handleLogin}>
          <FormGroup label="Email" htmlFor="email">
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
          <Link href="/forgot-password" className={authStyles.forgotPasswordLink}>
            Forgot password?
          </Link>
          <Button type="submit" variant="primary" fullWidth>
            Log In
          </Button>
        </form>
        <div className={authStyles.separator}>OR</div>
        <Button type="button" variant="google" fullWidth>
          Continue with Google
        </Button>
      </Card>
      <div className={authStyles.authSwitch}>
        Don't have an account? <Link href="/signup">Sign Up</Link>
      </div>
    </Container>
  );
};

export default LoginPage;