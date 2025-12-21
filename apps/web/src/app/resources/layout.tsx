/**
 * Filename: apps/web/src/app/resources/layout.tsx
 * Purpose: Layout wrapper for Resources page with SEO metadata
 * Created: 2025-12-21
 */

import { ReactNode } from 'react';
import { Metadata } from 'next';

// SEO Metadata for Resources page
export const metadata: Metadata = {
  title: 'Educational Resources | Tutorwise',
  description: 'Explore educational resources, guides, and tools for tutors, students, and agents on the Tutorwise platform.',
  keywords: [
    'tutorwise resources',
    'educational resources',
    'tutoring resources',
    'learning resources',
    'tutor guides',
    'student resources',
    'education tools',
    'tutoring guides',
  ],
  openGraph: {
    title: 'Educational Resources | Tutorwise',
    description: 'Explore educational resources, guides, and tools on Tutorwise.',
    url: 'https://tutorwise.com/resources',
    siteName: 'Tutorwise',
    type: 'website',
    locale: 'en_GB',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://tutorwise.com/resources',
  },
};

interface ResourcesLayoutProps {
  children: ReactNode;
}

export default function ResourcesLayout({ children }: ResourcesLayoutProps) {
  return <>{children}</>;
}
