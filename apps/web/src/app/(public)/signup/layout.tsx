/**
 * Filename: apps/web/src/app/signup/layout.tsx
 * Purpose: Layout wrapper for Signup page with SEO metadata
 * Created: 2025-12-21
 */

import { ReactNode } from 'react';
import { Metadata } from 'next';

// SEO Metadata for Signup page
export const metadata: Metadata = {
  title: 'Sign Up | Tutorwise - Join as a Tutor, Student, or Agent',
  description: 'Create your free Tutorwise account to connect with credible tutors, find students, or manage educational services. Join our community of verified educators and learners today.',
  keywords: [
    'tutorwise sign up',
    'create account',
    'join tutorwise',
    'tutor registration',
    'student registration',
    'agent registration',
    'become a tutor',
    'find tutors',
    'tutoring platform registration',
    'free account',
  ],
  openGraph: {
    title: 'Sign Up | Tutorwise - Join as a Tutor, Student, or Agent',
    description: 'Create your free Tutorwise account to connect with credible tutors or find students.',
    url: 'https://tutorwise.com/signup',
    siteName: 'Tutorwise',
    type: 'website',
    locale: 'en_GB',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://tutorwise.com/signup',
  },
};

interface SignupLayoutProps {
  children: ReactNode;
}

export default function SignupLayout({ children }: SignupLayoutProps) {
  return <>{children}</>;
}
