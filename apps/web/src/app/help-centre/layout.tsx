/**
 * Filename: apps/web/src/app/help-centre/layout.tsx
 * Purpose: Help centre layout wrapper (applies 3-column layout to all help centre pages)
 * Created: 2025-01-19
 * Updated: 2025-12-21 - Enhanced SEO metadata for better discoverability
 */

import { ReactNode } from 'react';
import { Metadata } from 'next';
import HelpCentreLayoutClient from '@/app/components/help-centre/layout/HelpCentreLayoutClient';

// Enhanced SEO Metadata (Critical for help article discoverability)
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.com'),
  title: 'Help Centre | Tutorwise Support',
  description: 'Find answers to your questions about Tutorwise. Browse guides, tutorials, and FAQs for tutors, students, and agents.',
  keywords: [
    'tutorwise help',
    'tutorwise support',
    'tutor help',
    'student help',
    'getting started',
    'how to use tutorwise',
    'tutorwise guide',
    'tutorwise FAQ',
    'payment help',
    'booking help',
    'referral help',
  ],
  openGraph: {
    title: 'Help Centre | Tutorwise Support',
    description: 'Find answers to your questions about Tutorwise. Browse guides, tutorials, and FAQs.',
    url: 'https://tutorwise.com/help-centre',
    siteName: 'Tutorwise',
    type: 'website',
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Help Centre | Tutorwise Support',
    description: 'Find answers to your questions about Tutorwise.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: 'https://tutorwise.com/help-centre',
  },
};

interface HelpCentreLayoutWrapperProps {
  children: ReactNode;
}

export default function HelpCentreLayoutWrapper({ children }: HelpCentreLayoutWrapperProps) {
  return <HelpCentreLayoutClient>{children}</HelpCentreLayoutClient>;
}
