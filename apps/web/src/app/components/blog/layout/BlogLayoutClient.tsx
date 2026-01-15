/**
 * Filename: apps/web/src/app/components/blog/layout/BlogLayoutClient.tsx
 * Purpose: Client-side wrapper for Blog layout with sidebar management
 * Created: 2026-01-15
 */

'use client';

import { ReactNode } from 'react';
import BlogLayout from './BlogLayout';
import BlogLeftSidebar from './BlogLeftSidebar';
import PopularArticlesWidget from '../widgets/PopularArticlesWidget';
import NewsletterWidget from '../widgets/NewsletterWidget';
import CategoriesWidget from '../widgets/CategoriesWidget';

interface BlogLayoutClientProps {
  children: ReactNode;
}

export default function BlogLayoutClient({ children }: BlogLayoutClientProps) {
  return (
    <BlogLayout
      leftSidebar={(onClose) => <BlogLeftSidebar onLinkClick={onClose} />}
      rightSidebar={
        <>
          <CategoriesWidget />
          <PopularArticlesWidget />
          <NewsletterWidget />
        </>
      }
    >
      {children}
    </BlogLayout>
  );
}
