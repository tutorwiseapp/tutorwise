/*
 * Filename: src/app/signup/page.tsx
 * Purpose: Renders the user sign-up page using Kinde's components.
 * Change History:
 * C003 - 2025-08-26 : 16:30 - Simplified folder structure and fixed TypeScript error for env variable.
 * C002 - 2025-08-26 : 15:30 - Replaced Clerk's SignUp component with Kinde's RegisterLink.
 * C001 - 2025-07-26 : 10:30 - Initial creation with Clerk convention.
 * Last Modified: 2025-08-26 : 16:30
 * Requirement ID: VIN-AUTH-MIG-02
 * Change Summary: This is the definitive fix for the sign-up page migration. The unnecessary [[...sign-up]] catch-all directory has been removed. The TypeScript error "Type 'string | undefined' is not assignable to type 'string'" has been resolved by conditionally rendering the Google login button only if its corresponding environment variable exists.
 */
'use client';

import { RegisterLink, LoginLink } from '@kinde-oss/kinde-auth-nextjs/components';
import Link from 'next/link';
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import authStyles from '@/app/styles/auth.module.css';
import Button from '@/app/components/ui/Button';

const SignUpPage = () => {
  // --- THIS IS THE FIX: Check for the environment variable first ---
  const googleConnectionId = process.env.NEXT_PUBLIC_KINDE_GOOGLE_CONNECTION_ID;

  return (
    <Container variant="form">
      <PageHeader title="Create Your Account" />
      <p className="page-tagline">Join to start referring and earning rewards.</p>
      <div className={authStyles.authCard}>
        <RegisterLink>
            <Button variant="primary" fullWidth>Sign Up with Email</Button>
        </RegisterLink>
        
        {/* --- THIS IS THE FIX: Only render this section if the ID exists --- */}
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