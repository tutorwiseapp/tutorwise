/*
 * Filename: src/app/signup/page.tsx
 * Purpose: Renders the user sign-up page supporting email/password and Google.
 */
'use client';

import { RegisterLink, LoginLink } from '@kinde-oss/kinde-auth-nextjs/components';
import Link from 'next/link';
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import authStyles from '@/app/styles/auth.module.css';
import Button from '@/app/components/ui/Button';

const SignUpPage = () => {
  const googleConnectionId = process.env.NEXT_PUBLIC_KINDE_GOOGLE_CONNECTION_ID;

  return (
    <Container variant="form">
      <PageHeader title="Create Your Account" />
      <p className="page-tagline">Join to start referring and earning rewards.</p>
      <div className={authStyles.authCard}>
        {/* This link handles the email/password flow by going to the main Kinde page */}
        <RegisterLink>
            <Button variant="primary" fullWidth>Sign Up with Email</Button>
        </RegisterLink>
        
        {/* This link handles the Google social login flow directly */}
        {googleConnectionId && (
            <>
                <div className={authStyles.separator}>or</div>
                <LoginLink authUrlParams={{ connection_id: googleConnectionId }}>
                    <Button variant='google' fullWidth>Sign Up with Google</Button>
                </LoginLink>
            </>
        )}
      </div>
      <div className={authStyles.authSwitch}>
        Already have an account? <Link href="/api/auth/login">Log In</Link>
      </div>
    </Container>
  );
};

export default SignUpPage;