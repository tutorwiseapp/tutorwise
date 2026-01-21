/**
 * Filename: apps/web/src/app/terms-of-service/layout.tsx
 * Purpose: Layout wrapper for Terms of Service page with SEO metadata
 * Created: 2025-12-21
 */

import { ReactNode } from 'react';
import { Metadata } from 'next';

// SEO Metadata for Terms of Service page
export const metadata: Metadata = {
  title: 'Terms of Service | Tutorwise',
  description: 'Review Tutorwise\'s terms of service to understand the rules and guidelines for using our tutoring platform and educational services.',
  keywords: [
    'tutorwise terms of service',
    'terms and conditions',
    'user agreement',
    'service terms',
    'platform rules',
    'tutorwise terms',
    'legal terms',
    'user terms',
  ],
  openGraph: {
    title: 'Terms of Service | Tutorwise',
    description: 'Review Tutorwise\'s terms of service and user agreement.',
    url: 'https://tutorwise.com/terms-of-service',
    siteName: 'Tutorwise',
    type: 'website',
    locale: 'en_GB',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://tutorwise.com/terms-of-service',
  },
};

interface TermsOfServiceLayoutProps {
  children: ReactNode;
}

export default function TermsOfServiceLayout({ children }: TermsOfServiceLayoutProps) {
  return <>{children}</>;
}
