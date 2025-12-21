/**
 * Filename: apps/web/src/app/components/help-centre/layout/LeftSidebar.tsx
 * Purpose: Left sidebar navigation (320px) with filters and category navigation
 * Created: 2025-01-19
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './LeftSidebar.module.css';

type AudienceFilter = 'all' | 'tutor' | 'student' | 'agent';

interface Article {
  title: string;
  slug: string;
}

interface Category {
  name: string;
  slug: string;
  articles: Article[];
}

interface LeftSidebarProps {
  onLinkClick?: () => void;
}

const CATEGORIES: Category[] = [
  {
    name: 'Getting Started',
    slug: 'getting-started',
    articles: [
      { title: 'For Tutors', slug: 'for-tutors' },
      { title: 'For Clients', slug: 'for-clients' },
      { title: 'For Agents', slug: 'for-agents' },
      { title: 'For Organisations', slug: 'for-organisations' },
    ],
  },
  {
    name: 'Features',
    slug: 'features',
    articles: [
      { title: 'Create a Listing', slug: 'create-listing' },
      { title: 'How Bookings Work', slug: 'bookings' },
      { title: 'Refer & Earn Commission', slug: 'referrals' },
    ],
  },
  {
    name: 'Billing',
    slug: 'billing',
    articles: [
      { title: 'How to Get Paid', slug: 'how-to-get-paid' },
      { title: 'Stripe Account Setup', slug: 'stripe-setup' },
      { title: 'Pricing', slug: 'pricing' },
    ],
  },
  {
    name: 'Account',
    slug: 'account',
    articles: [
      { title: 'Profile Setup', slug: 'profile-setup' },
    ],
  },
  {
    name: 'Troubleshooting',
    slug: 'troubleshooting',
    articles: [{ title: 'Common Issues', slug: 'common-issues' }],
  },
];

export default function LeftSidebar({ onLinkClick }: LeftSidebarProps = {}) {
  const pathname = usePathname();
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(CATEGORIES.map((cat) => cat.slug))
  );

  const toggleCategory = (categorySlug: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categorySlug)) {
        next.delete(categorySlug);
      } else {
        next.add(categorySlug);
      }
      return next;
    });
  };

  const isArticleActive = (categorySlug: string, articleSlug: string) => {
    return pathname === `/help-centre/${categorySlug}/${articleSlug}`;
  };

  return (
    <div className={styles.sidebar}>
      {/* Audience Filter Pills */}
      <div className={styles.audienceFilter}>
        <div className={styles.audienceFilterLabel}>Show articles for</div>
        <div className={styles.audiencePills}>
          <button
            className={`${styles.audiencePill} ${audienceFilter === 'all' ? styles.active : ''}`}
            onClick={() => setAudienceFilter('all')}
          >
            All
          </button>
          <button
            className={`${styles.audiencePill} ${audienceFilter === 'tutor' ? styles.active : ''}`}
            onClick={() => setAudienceFilter('tutor')}
          >
            Tutors
          </button>
          <button
            className={`${styles.audiencePill} ${audienceFilter === 'student' ? styles.active : ''}`}
            onClick={() => setAudienceFilter('student')}
          >
            Students
          </button>
          <button
            className={`${styles.audiencePill} ${audienceFilter === 'agent' ? styles.active : ''}`}
            onClick={() => setAudienceFilter('agent')}
          >
            Agents
          </button>
        </div>
      </div>

      {/* Category Navigation */}
      <nav className={styles.categoryNav}>
        {CATEGORIES.map((category) => {
          const isExpanded = expandedCategories.has(category.slug);

          return (
            <div key={category.slug} className={styles.categorySection}>
              <button
                className={styles.categoryHeader}
                onClick={() => toggleCategory(category.slug)}
              >
                <span className={styles.categoryTitle}>
                  <span>{category.name}</span>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className={styles.articleCount}>{category.articles.length}</span>
                  <span className={`${styles.expandIcon} ${isExpanded ? styles.expanded : ''}`}>
                    ▶
                  </span>
                </div>
              </button>

              <div className={`${styles.articleList} ${!isExpanded ? styles.collapsed : ''}`}>
                {category.articles.map((article) => (
                  <Link
                    key={article.slug}
                    href={`/help-centre/${category.slug}/${article.slug}`}
                    className={`${styles.articleLink} ${
                      isArticleActive(category.slug, article.slug) ? styles.active : ''
                    }`}
                    onClick={onLinkClick}
                  >
                    {article.title}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
