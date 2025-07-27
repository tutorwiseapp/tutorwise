'use client';

import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import authStyles from '@/app/styles/auth.module.css';

const LoginPage = () => {
  return (
    <Container variant="form">
      <PageHeader title="Log In to Your Account" />
      <div className={authStyles.authCard}>
        <SignIn
          path="/login" // This must match the folder name
          routing="path"
          signUpUrl="/signup"
          afterSignInUrl="/dashboard"
        />
      </div>
      <div className={authStyles.authSwitch}>
        Don't have an account? <Link href="/signup">Sign Up</Link>
      </div>
    </Container>
  );
};
export default LoginPage;