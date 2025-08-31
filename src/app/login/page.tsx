/*
 * Filename: src/app/login/page.tsx
 * Purpose: Renders the user sign-in page supporting email/password and Google.
 */
'use client';

import { LoginLink } from '@kinde-oss/kinde-auth-nextjs/components';
import Link from 'next/link';
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import authStyles from '@/app/styles/auth.module.css';
import Button from '@/app/components/ui/Button';

const LoginPage = () => {
  const googleConnectionId = process.env.NEXT_PUBLIC_KINDE_GOOGLE_CONNECTION_ID;

  return (
    <Container variant="form">
      <PageHeader title="Log In to Your Account" />
      <div className={authStyles.authCard}>
        {/* This link handles the email/password flow by going to the main Kinde page */}
        <LoginLink>
            <Button variant="primary" fullWidth>Sign In with Email</Button>
        </LoginLink>
        
        {/* This link handles the Google social login flow directly */}
        {googleConnectionId && (
            <>
                <div className={authStyles.separator}>or</div>
                <LoginLink authUrlParams={{ connection_id: googleConnectionId }}>
                    <Button variant='google' fullWidth>Sign In with Google</Button>
                </LoginLink>
            </>
        )}
      </div>
      <div className={authStyles.authSwitch}>
        Don't have an account? <Link href="/api/auth/register">Sign Up</Link>
      </div>
    </Container>
  );
};

export default LoginPage;