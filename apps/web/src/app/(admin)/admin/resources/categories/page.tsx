/**
 * Filename: apps/web/src/app/(admin)/admin/resources/categories/page.tsx
 * Purpose: Admin resource - Manage categories
 * Created: 2026-01-15
 */
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import Button from '@/app/components/ui/actions/Button';
import styles from './page.module.css';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const CATEGORIES = [
  { name: 'For Clients', slug: 'for-clients', count: 3, color: '#dbeafe' },
  { name: 'For Tutors', slug: 'for-tutors', count: 3, color: '#d1fae5' },
  { name: 'For Agents', slug: 'for-agents', count: 3, color: '#fce7f3' },
  { name: 'For Organisations', slug: 'for-organisations', count: 0, color: '#e0e7ff' },
  { name: 'Getting Started', slug: 'getting-started', count: 0, color: '#ccfbf1' },
  { name: 'FAQs', slug: 'faqs', count: 0, color: '#f3e8ff' },
  { name: 'Best Practices', slug: 'best-practices', count: 0, color: '#fef9c3' },
  { name: 'Success Stories', slug: 'success-stories', count: 0, color: '#fee2e2' },
  { name: 'Product Updates', slug: 'product-updates', count: 0, color: '#dbeafe' },
  { name: 'Pricing & Billing', slug: 'pricing-billing', count: 0, color: '#fef3c7' },
  { name: 'Safety & Trust', slug: 'safety-trust', count: 0, color: '#dcfce7' },
  { name: 'Education Insights', slug: 'education-insights', count: 3, color: '#fef3c7' },
  { name: 'Content Marketing', slug: 'content-marketing', count: 0, color: '#fbcfe8' },
  { name: 'About Tutorwise', slug: 'about-tutorwise', count: 0, color: '#bfdbfe' },
  { name: 'Company News', slug: 'company-news', count: 2, color: '#e9d5ff' },
];

export default function BlogCategoriesPage() {
  const router = useRouter();

  return (
    <ErrorBoundary>
      <HubPageLayout
      header={
        <HubHeader
          title="Resource Categories"
          subtitle="Organize articles by audience and topic"
          actions={
            <Button variant="primary" size="sm" disabled>
              Add Category
            </Button>
          }
          className={styles.blogHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'categories', label: 'All Categories', count: 15, active: true },
          ]}
          onTabChange={() => {}}
          className={styles.blogTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="Category Statistics"
            stats={[
              { label: 'Total Categories', value: 15 },
              { label: 'Active Categories', value: 15 },
              { label: 'Total Articles', value: 14 },
              { label: 'Avg per Category', value: 0.9 },
            ]}
          />
          <AdminHelpWidget
            title="Categories Help"
            items={[
              { question: 'What are categories?', answer: 'Categories help organize articles by target audience (clients, tutors, agents) and content type.' },
              { question: 'Can articles have multiple categories?', answer: 'Yes, articles can belong to multiple categories for better discoverability.' },
              { question: 'Should I delete unused categories?', answer: 'Archive unused categories instead of deleting to preserve article history.' },
            ]}
          />
          <AdminTipWidget
            title="Category Tips"
            tips={[
              'Keep category names clear and audience-focused',
              'Use consistent naming conventions',
              'Assign distinctive colors for visual identification',
              'Review category performance quarterly',
            ]}
          />
        </HubSidebar>
      }
    >
      <div className={styles.container}>
        <div className={styles.categoriesGrid}>
          {CATEGORIES.map((category) => (
            <div
              key={category.slug}
              className={styles.categoryCard}
              style={{ backgroundColor: category.color }}
            >
              <div className={styles.categoryName}>{category.name}</div>
              <div className={styles.categorySlug}>Slug: {category.slug}</div>
              <div className={styles.categoryCount}>{category.count} articles</div>
            </div>
          ))}
        </div>

        <HubEmptyState
          title="Category Management Coming Soon"
          description="Full category management interface with add, edit, delete, color configuration, descriptions, and SEO settings."
        />
      </div>
      </HubPageLayout>
    </ErrorBoundary>
  );
}
