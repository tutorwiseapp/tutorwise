/**
 * Filename: apps/web/src/app/components/blog/layout/ResourceLayoutClient.tsx
 * Purpose: Client-side wrapper for Blog layout with sidebar management
 * Created: 2026-01-15
 */

'use client';

import { ReactNode } from 'react';
import ResourceLayout from './ResourceLayout';
import ResourceLeftSidebar from './ResourceLeftSidebar';
import PopularArticlesWidget from '../widgets/PopularArticlesWidget';
import NewsletterWidget from '../widgets/NewsletterWidget';
import CategoriesWidget from '../widgets/CategoriesWidget';

interface ResourceLayoutClientProps {
  children: ReactNode;
}

export default function ResourceLayoutClient({ children }: ResourceLayoutClientProps) {
  return (
    <ResourceLayout
      leftSidebar={(onClose) => <ResourceLeftSidebar onLinkClick={onClose} />}
      rightSidebar={
        <>
          <CategoriesWidget />
          <PopularArticlesWidget />
          <NewsletterWidget />
        </>
      }
    >
      {children}
    </ResourceLayout>
  );
}
