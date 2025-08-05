/*
 * Filename: src/app/sign-in/[[...sign-in]]/page.tsx
 * Purpose: Renders the user sign-in page using Clerk's pre-built component.
 * Change History:
 * C001 - 2025-07-27 : 22:15 - Initial creation following Clerk's catch-all route convention.
 * Last Modified: 2025-07-27 : 22:15
 * Requirement ID: VIN-A-004
 * Change Summary: This file was created to resolve a 404 error. It establishes the correct
 * route for `/sign-in` and uses Clerk's `<SignIn>` component. The catch-all structure
 * allows Clerk to handle its internal routing for features like social login callbacks.
 * Impact Analysis: This is an additive change that makes the sign-in page and links to it
 * fully functional without affecting any other part of the application.
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