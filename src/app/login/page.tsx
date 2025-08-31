/*
 * Filename: src/app/login/page.tsx
 * Purpose: Renders the user sign-in page supporting passwordless and Google.
 * Change History:
 * C002 - 2025-08-26 : 22:00 - Updated button text to reflect 'Email + code' flow.
 * C001 - 2025-08-26 : 17:00 - Initial creation with Kinde components.
 * Last Modified: 2025-08-26 : 22:00
 * Requirement ID: VIN-AUTH-MIG-05
 * Change Summary: The text on the primary login button has been changed from "Sign In with Email" to "Sign In with a Code". This accurately reflects the `Email + code` passwordless authentication method enabled in the Kinde dashboard, eliminating potential user confusion.
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
        {/* --- THIS IS THE FIX: Updated button text for clarity --- */}
        <LoginLink>
            <Button variant="primary" fullWidth>Sign In with a Code</Button>
        </LoginLink>
        
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