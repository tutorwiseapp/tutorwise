/**
 * Filename: apps/web/src/app/(admin)/admin/blog/new/page.tsx
 * Purpose: Admin blog - Create new article
 * Created: 2026-01-15
 */
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import ArticleEditorForm from '../components/ArticleEditorForm';
import styles from './page.module.css';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function NewBlogArticlePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const handleSave = async (articleData: any) => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/blog/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(articleData),
      });

      if (response.ok) {
        router.push('/admin/blog');
      } else {
        alert('Failed to create article');
      }
    } catch (error) {
      console.error('Error creating article:', error);
      alert('Error creating article');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/blog');
  };

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="New Article"
          subtitle="Create and publish new blog content"
          className={styles.blogHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'editor', label: 'Article Editor', active: true },
          ]}
          onTabChange={() => {}}
          className={styles.blogTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminHelpWidget
            title="Article Editor"
            items={[
              { question: 'What is MDX?', answer: 'MDX allows you to write markdown with embedded React components for rich, interactive content.' },
              { question: 'How to add images?', answer: 'Upload a featured image for social sharing, and embed images directly in MDX content.' },
              { question: 'SEO best practices?', answer: 'Write descriptive titles, add meta descriptions, use proper headings, and include relevant keywords naturally.' },
            ]}
          />
          <AdminTipWidget
            title="Writing Tips"
            tips={[
              'Start with an attention-grabbing headline',
              'Break content into scannable sections with headings',
              'Include actionable takeaways for readers',
              'Add internal links to related articles',
              'Proofread before publishing',
            ]}
          />
        </HubSidebar>
      }
    >
      <ArticleEditorForm onSave={handleSave} onCancel={handleCancel} isSaving={saving} />
    </HubPageLayout>
  );
}
