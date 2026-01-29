/**
 * Filename: apps/web/src/app/privacy-policy/layout.tsx
 * Purpose: Layout wrapper for Privacy Policy page with SEO metadata
 * Created: 2025-12-21
 */

import { ReactNode } from 'react';
import { Metadata } from 'next';
import Footer from '@/app/components/layout/Footer';

// SEO Metadata for Privacy Policy page
export const metadata: Metadata = {
  title: 'Privacy Policy | Tutorwise',
  description: 'Read Tutorwise\'s privacy policy to understand how we collect, use, and protect your personal information on our tutoring platform.',
  keywords: [
    'tutorwise privacy policy',
    'privacy policy',
    'data protection',
    'personal information',
    'GDPR compliance',
    'data privacy',
    'user privacy',
    'tutorwise data policy',
  ],
  openGraph: {
    title: 'Privacy Policy | Tutorwise',
    description: 'Read Tutorwise\'s privacy policy to understand how we protect your data.',
    url: 'https://tutorwise.com/privacy-policy',
    siteName: 'Tutorwise',
    type: 'website',
    locale: 'en_GB',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://tutorwise.com/privacy-policy',
  },
};

interface PrivacyPolicyLayoutProps {
  children: ReactNode;
}

export default function PrivacyPolicyLayout({ children }: PrivacyPolicyLayoutProps) {
  return (
    <>
      {children}
      <Footer />
    </>
  );
}
