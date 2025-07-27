/*
 * Filename: src/app/sign-in/[[...sign-in]]/page.tsx
 * Purpose: Renders the user sign-in page using Clerk's pre-built component.
 * Change History:
 * C001 - 2025-07-26 : 11:45 - Created file according to Clerk's standard file and path convention.
 * Last Modified: 2025-07-26 : 11:45
 * Requirement ID: VIN-A-004
 * Change Summary: This file was created to resolve a 404 error. It uses the conventional
 * '/sign-in' path and a catch-all route structure '[[...sign-in]]', which aligns with
 * Clerk's best practices and allows it to correctly handle all authentication flows.
 * Impact Analysis: This change makes the login page functional. It has no negative impact
 * on other parts of the application.
 * Dependencies: "@clerk/nextjs", "next/link", and VDL UI components.
 */
'use client';

import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import authStyles from '@/app/styles/auth.module.css';

const SignInPage = () => {
  return (
    <Container variant="form">
      <PageHeader title="Log In to Your Account" />
      <div className={authStyles.authCard}>
        <SignIn
          path="/sign-in"
          routing="path"
          signUpUrl="/sign-up"
          afterSignInUrl="/dashboard"
        />
      </div>
      <div className={authStyles.authSwitch}>
        Don't have an account? <Link href="/sign-up">Sign Up</Link>
      </div>
    </Container>
  );
};

export default SignInPage;