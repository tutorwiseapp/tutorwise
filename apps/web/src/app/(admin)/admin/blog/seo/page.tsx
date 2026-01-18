/**
 * Filename: apps/web/src/app/(admin)/admin/blog/seo/page.tsx
 * Purpose: Admin blog SEO dashboard and analytics
 * Created: 2026-01-15
 */
'use client';

import React, { useState, useEffect } from 'react';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { AdminStatsWidget, AdminHelpWidget } from '@/app/components/admin/widgets';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import styles from './page.module.css';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

type TabType = 'overview' | 'articles' | 'keywords' | 'backlinks';

export default function BlogSEOPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);

  return (
    <ErrorBoundary>
      <HubPageLayout
      header={
        <HubHeader
          title="Resource SEO"
          subtitle="Monitor and optimize resource search engine performance"
          className={styles.blogHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'overview', label: 'Overview', active: activeTab === 'overview' },
            { id: 'articles', label: 'Top Articles', active: activeTab === 'articles' },
            { id: 'keywords', label: 'Keywords', active: activeTab === 'keywords' },
            { id: 'backlinks', label: 'Backlinks', active: activeTab === 'backlinks' },
          ]}
          onTabChange={(tabId) => setActiveTab(tabId as TabType)}
          className={styles.blogTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="SEO Health"
            stats={[
              { label: 'Published Articles', value: 5 },
              { label: 'Avg Search Position', value: '--' },
              { label: 'Total Backlinks', value: '--' },
              { label: 'Monthly Views', value: '--' },
            ]}
          />
          <AdminHelpWidget
            title="SEO Setup"
            items={[
              {
                question: 'How to get started?',
                answer: 'Complete the manual setup tasks: Google Analytics 4, Google Search Console, and submit your sitemap.',
              },
              {
                question: 'What metrics matter most?',
                answer: 'Focus on organic traffic growth, average search position, and click-through rate (CTR) from search results.',
              },
              {
                question: 'How often to check?',
                answer: 'Review SEO metrics weekly. Major changes take 2-4 weeks to reflect in search rankings.',
              },
            ]}
          />
        </HubSidebar>
      }
    >
      <div className={styles.container}>
        {activeTab === 'overview' && (
          <>
            <div className={styles.setupBanner}>
              <div className={styles.bannerContent}>
                <h3 className={styles.bannerTitle}>🚀 Complete SEO Setup</h3>
                <p className={styles.bannerText}>
                  To start tracking SEO metrics, complete the manual setup tasks. See the
                  BLOG_SEO_MONITORING_GUIDE.md file for detailed instructions.
                </p>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Setup Checklist</h3>
              <div className={styles.checklistGrid}>
                <div className={styles.checklistCard}>
                  <div className={styles.checklistIcon}>📊</div>
                  <h4 className={styles.checklistTitle}>Google Analytics 4</h4>
                  <p className={styles.checklistDescription}>
                    Track page views, user behavior, and traffic sources
                  </p>
                  <div className={styles.checklistStatus}>Not configured</div>
                </div>

                <div className={styles.checklistCard}>
                  <div className={styles.checklistIcon}>🔍</div>
                  <h4 className={styles.checklistTitle}>Google Search Console</h4>
                  <p className={styles.checklistDescription}>
                    Monitor search performance, keywords, and indexing
                  </p>
                  <div className={styles.checklistStatus}>Not configured</div>
                </div>

                <div className={styles.checklistCard}>
                  <div className={styles.checklistIcon}>✅</div>
                  <h4 className={styles.checklistTitle}>Sitemaps</h4>
                  <p className={styles.checklistDescription}>
                    Dynamic sitemap generated at /blog/sitemap.xml
                  </p>
                  <div className={styles.checklistStatus}>Configured</div>
                </div>

                <div className={styles.checklistCard}>
                  <div className={styles.checklistIcon}>🤖</div>
                  <h4 className={styles.checklistTitle}>Robots.txt</h4>
                  <p className={styles.checklistDescription}>
                    Search engine crawl directives configured
                  </p>
                  <div className={styles.checklistStatus}>Configured</div>
                </div>

                <div className={styles.checklistCard}>
                  <div className={styles.checklistIcon}>🏷️</div>
                  <h4 className={styles.checklistTitle}>Structured Data</h4>
                  <p className={styles.checklistDescription}>
                    JSON-LD Schema.org markup on all articles
                  </p>
                  <div className={styles.checklistStatus}>Configured</div>
                </div>

                <div className={styles.checklistCard}>
                  <div className={styles.checklistIcon}>📝</div>
                  <h4 className={styles.checklistTitle}>Meta Tags</h4>
                  <p className={styles.checklistDescription}>
                    Custom SEO titles, descriptions, OpenGraph tags
                  </p>
                  <div className={styles.checklistStatus}>Configured</div>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Quick Links</h3>
              <div className={styles.linksGrid}>
                <a
                  href="/blog/sitemap.xml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.linkCard}
                >
                  <span className={styles.linkIcon}>🗺️</span>
                  <span className={styles.linkText}>View Blog Sitemap</span>
                  <span className={styles.linkArrow}>→</span>
                </a>

                <a
                  href="/robots.txt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.linkCard}
                >
                  <span className={styles.linkIcon}>🤖</span>
                  <span className={styles.linkText}>View Robots.txt</span>
                  <span className={styles.linkArrow}>→</span>
                </a>

                <a
                  href="https://search.google.com/search-console"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.linkCard}
                >
                  <span className={styles.linkIcon}>🔍</span>
                  <span className={styles.linkText}>Google Search Console</span>
                  <span className={styles.linkArrow}>↗</span>
                </a>

                <a
                  href="https://analytics.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.linkCard}
                >
                  <span className={styles.linkIcon}>📊</span>
                  <span className={styles.linkText}>Google Analytics</span>
                  <span className={styles.linkArrow}>↗</span>
                </a>
              </div>
            </div>
          </>
        )}

        {activeTab === 'articles' && (
          <HubEmptyState
            title="Article Performance Coming Soon"
            description="Top performing articles by views, search clicks, and engagement will be displayed here once analytics are connected."
          />
        )}

        {activeTab === 'keywords' && (
          <HubEmptyState
            title="Keyword Rankings Coming Soon"
            description="Track keyword positions, search volume, and ranking changes once Google Search Console is integrated."
          />
        )}

        {activeTab === 'backlinks' && (
          <HubEmptyState
            title="Backlink Monitoring Coming Soon"
            description="Monitor external links to your blog articles once Ahrefs or SEMrush integration is configured."
          />
        )}
      </div>
      </HubPageLayout>
    </ErrorBoundary>
  );
}
