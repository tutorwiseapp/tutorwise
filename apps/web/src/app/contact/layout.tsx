/**
 * Filename: apps/web/src/app/contact/layout.tsx
 * Purpose: Layout wrapper for Contact page with SEO metadata
 * Created: 2025-12-21
 */

import { ReactNode } from 'react';
import { Metadata } from 'next';

// SEO Metadata for Contact page
export const metadata: Metadata = {
  title: 'Contact Us | Tutorwise Support',
  description: 'Get in touch with the Tutorwise team. We\'re here to help with questions about tutoring, educational services, and platform support.',
  keywords: [
    'contact tutorwise',
    'tutorwise support',
    'get in touch',
    'customer support',
    'help desk',
    'contact support',
    'tutorwise contact',
    'support team',
  ],
  openGraph: {
    title: 'Contact Us | Tutorwise Support',
    description: 'Get in touch with the Tutorwise team. We\'re here to help with your questions.',
    url: 'https://tutorwise.com/contact',
    siteName: 'Tutorwise',
    type: 'website',
    locale: 'en_GB',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://tutorwise.com/contact',
  },
};

interface ContactLayoutProps {
  children: ReactNode;
}

export default function ContactLayout({ children }: ContactLayoutProps) {
  return <>{children}</>;
}
