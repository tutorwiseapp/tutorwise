/*
 * Filename: src/app/signup/page.tsx
 * Purpose: Renders the user sign-up page supporting passwordless and Google.
 * Change History:
 * C002 - 2025-08-26 : 22:00 - Updated button text to reflect 'Email + code' flow.
 * C001 - 2025-08-26 : 16:30 - Initial creation and migration to Kinde.
 * Last Modified: 2025-08-26 : 22:00
 * Requirement ID: VIN-AUTH-MIG-05
 * Change Summary: The text on the primary sign-up button has been changed from "Sign Up with Email" to "Sign Up with a Code". This accurately reflects the `Email + code` passwordless authentication method enabled in the Kinde dashboard, ensuring a clear and consistent user experience.
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
        {/* --- THIS IS THE FIX: Updated button text for clarity --- */}
        <RegisterLink>
            <Button variant="primary" fullWidth>Sign Up with a Code</Button>
        </RegisterLink>
        
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