/**
 * Filename: apps/web/src/app/login/layout.tsx
 * Purpose: Layout wrapper for Login page with SEO metadata
 * Created: 2025-12-21
 */

import { ReactNode } from 'react';
import { Metadata } from 'next';

// SEO Metadata for Login page
export const metadata: Metadata = {
  title: 'Login | Tutorwise',
  description: 'Sign in to your Tutorwise account to access your dashboard, manage bookings, connect with tutors, and track your learning progress.',
  keywords: [
    'tutorwise login',
    'sign in',
    'tutor login',
    'student login',
    'agent login',
    'tutorwise account',
    'member login',
    'tutoring platform login',
  ],
  openGraph: {
    title: 'Login | Tutorwise',
    description: 'Sign in to your Tutorwise account to access your dashboard and manage your tutoring services.',
    url: 'https://tutorwise.com/login',
    siteName: 'Tutorwise',
    type: 'website',
    locale: 'en_GB',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://tutorwise.com/login',
  },
};

interface LoginLayoutProps {
  children: ReactNode;
}

export default function LoginLayout({ children }: LoginLayoutProps) {
  return <>{children}</>;
}
