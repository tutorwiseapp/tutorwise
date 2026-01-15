/**
 * Filename: apps/web/src/app/blog/layout.tsx
 * Purpose: Blog layout wrapper with SEO metadata
 * Created: 2026-01-15
 */

import { ReactNode } from 'react';
import { Metadata } from 'next';
import BlogLayoutClient from '@/app/components/blog/layout/BlogLayoutClient';

// SEO Metadata for Blog
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.com'),
  title: 'Blog | Tutorwise - Tutoring Insights & Education Guides',
  description: 'Expert guides, industry insights, and practical tips for tutors, parents, and educational agencies. Learn how to succeed in the tutoring industry.',
  keywords: [
    'tutoring blog',
    'education blog',
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
    title: 'Blog | Tutorwise - Tutoring Insights & Education Guides',
    description: 'Expert guides, industry insights, and practical tips for tutors, parents, and educational agencies.',
    url: 'https://tutorwise.com/blog',
    siteName: 'Tutorwise',
    type: 'website',
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog | Tutorwise',
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
    canonical: 'https://tutorwise.com/blog',
    types: {
      'application/rss+xml': 'https://tutorwise.com/blog/rss.xml',
    },
  },
};

interface BlogLayoutProps {
  children: ReactNode;
}

export default function BlogLayout({ children }: BlogLayoutProps) {
  return <BlogLayoutClient>{children}</BlogLayoutClient>;
}
