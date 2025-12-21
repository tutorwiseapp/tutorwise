/**
 * Filename: apps/web/src/app/about-tutorwise/layout.tsx
 * Purpose: Layout wrapper for About Tutorwise page with SEO metadata
 * Created: 2025-12-21
 */

import { ReactNode } from 'react';
import { Metadata } from 'next';

// SEO Metadata for About Tutorwise page
export const metadata: Metadata = {
  title: 'About Tutorwise | Connect with Credible Tutors & Educational Experts',
  description: 'Discover how Tutorwise connects clients with verified, credible tutors for personalized learning. Learn about our platform, mission, and commitment to quality education.',
  keywords: [
    'about tutorwise',
    'tutorwise platform',
    'credible tutors',
    'verified tutors',
    'education marketplace',
    'tutoring platform',
    'about us',
    'tutorwise mission',
    'quality education',
    'personalized learning',
    'tutor verification',
  ],
  openGraph: {
    title: 'About Tutorwise | Connect with Credible Tutors',
    description: 'Discover how Tutorwise connects clients with verified, credible tutors for personalized learning.',
    url: 'https://tutorwise.com/about-tutorwise',
    siteName: 'Tutorwise',
    type: 'website',
    locale: 'en_GB',
    images: [{
      url: '/og-image-about.png',
      width: 1200,
      height: 630,
      alt: 'About Tutorwise - Connecting Clients with Credible Tutors',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Tutorwise | Connect with Credible Tutors',
    description: 'Discover how Tutorwise connects clients with verified, credible tutors for personalized learning.',
    images: ['/og-image-about.png'],
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
    canonical: 'https://tutorwise.com/about-tutorwise',
  },
};

interface AboutTutorwiseLayoutProps {
  children: ReactNode;
}

export default function AboutTutorwiseLayout({ children }: AboutTutorwiseLayoutProps) {
  return <>{children}</>;
}
