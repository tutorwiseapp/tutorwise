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
          path="/signup" // This must match the folder name
          routing="path"
          signInUrl="/login"
          afterSignUpUrl="/dashboard"
        />
      </div>
      <div className={authStyles.authSwitch}>
        Already have an account? <Link href="/login">Log In</Link>
      </div>
    </Container>
  );
};
export default SignUpPage;
