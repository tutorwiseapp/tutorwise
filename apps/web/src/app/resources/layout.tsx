/**
 * Filename: apps/web/src/app/resources/layout.tsx
 * Purpose: Resources layout wrapper with SEO metadata
 * Created: 2026-01-15
 */

import { ReactNode } from 'react';
import { Metadata } from 'next';
import ResourceLayoutClient from '@/app/components/resources/layout/ResourceLayoutClient';

// SEO Metadata for Resources
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.com'),
  title: 'Resources | Tutorwise - Tutoring Insights & Education Guides',
  description: 'Expert guides, industry insights, and practical tips for tutors, parents, and educational agencies. Learn how to succeed in the tutoring industry.',
  keywords: [
    'tutoring resources',
    'education guides',
    'tutoring tips',
    'how to find a tutor',
    'tutoring business',
    'private tutoring',
    'GCSE tutors',
    'A-level tutors',
    'tutoring agency',
    'tutoring industry',
    'education insights',
  ],
  openGraph: {
    title: 'Resources | Tutorwise - Tutoring Insights & Education Guides',
    description: 'Expert guides, industry insights, and practical tips for tutors, parents, and educational agencies.',
    url: 'https://tutorwise.com/resources',
    siteName: 'Tutorwise',
    type: 'website',
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Resources | Tutorwise',
    description: 'Expert guides and insights for the tutoring industry.',
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
    canonical: 'https://tutorwise.com/resources',
    types: {
      'application/rss+xml': 'https://tutorwise.com/resources/rss.xml',
    },
  },
};

interface BlogLayoutProps {
  children: ReactNode;
}

export default function BlogLayout({ children }: BlogLayoutProps) {
  return <ResourceLayoutClient>{children}</ResourceLayoutClient>;
}
