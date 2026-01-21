/**
 * Filename: apps/web/src/app/forgot-password/layout.tsx
 * Purpose: Layout wrapper for Forgot Password page with SEO metadata
 * Created: 2025-12-21
 */

import { ReactNode } from 'react';
import { Metadata } from 'next';

// SEO Metadata for Forgot Password page
export const metadata: Metadata = {
  title: 'Reset Password | Tutorwise',
  description: 'Reset your Tutorwise account password. Enter your email address to receive password reset instructions and regain access to your tutoring account.',
  keywords: [
    'reset password',
    'forgot password',
    'tutorwise password reset',
    'recover account',
    'password recovery',
    'account recovery',
    'reset tutorwise password',
  ],
  openGraph: {
    title: 'Reset Password | Tutorwise',
    description: 'Reset your Tutorwise account password and regain access to your account.',
    url: 'https://tutorwise.com/forgot-password',
    siteName: 'Tutorwise',
    type: 'website',
    locale: 'en_GB',
  },
  robots: {
    index: false, // Password reset pages typically shouldn't be indexed
    follow: true,
  },
  alternates: {
    canonical: 'https://tutorwise.com/forgot-password',
  },
};

interface ForgotPasswordLayoutProps {
  children: ReactNode;
}

export default function ForgotPasswordLayout({ children }: ForgotPasswordLayoutProps) {
  return <>{children}</>;
}
