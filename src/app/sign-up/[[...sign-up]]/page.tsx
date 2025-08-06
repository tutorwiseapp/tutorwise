/*
 * Filename: src/app/sign-up/[[...sign-up]]/page.tsx
 * Purpose: Renders the user sign-up page using Clerk's pre-built component.
 * Change History:
 * C001 - 2025-07-26 : 10:30 - Adopted Clerk's standard file and path convention.
 * Last Modified: 2025-07-26 : 10:30
 * Requirement ID: VIN-A-004
 * Change Summary: This page now uses the conventional '/sign-up' path and a catch-all
 * route structure '[[...sign-up]]'. This aligns with Clerk's documentation and best practices,
 * allowing it to correctly handle internal SSO callbacks and other auth flows.
 * Impact Analysis: This is a foundational change that makes the registration flow robust and
 * maintainable. All links pointing to the old '/signup' path must be updated.
 * Dependencies: "@clerk/nextjs", "next/link", and VDL UI components.
 */
'use client';

import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import authStyles from '@/app/styles/auth.module.css';

const SignUpPage = () => {
  return (
    <Container variant="form">
      <PageHeader title="Create Your Account" />
      <p className="page-tagline">Join to start referring and earning rewards.</p>
      <div className={authStyles.authCard}>
        <SignUp
          path="/sign-up"
          routing="path"
          signInUrl="/sign-in"
          afterSignUpUrl="/dashboard"
        />
      </div>
      <div className={authStyles.authSwitch}>
        Already have an account? <Link href="/sign-in">Log In</Link>
      </div>
    </Container>
  );
};

export default SignUpPage;