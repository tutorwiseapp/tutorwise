/**
 * Filename: apps/web/src/app/components/blog/layout/BlogLeftSidebar.tsx
 * Purpose: Left sidebar navigation (320px) for blog categories
 * Created: 2026-01-15
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './BlogLeftSidebar.module.css';

type AudienceFilter = 'all' | 'clients' | 'tutors' | 'agents';

interface Article {
  title: string;
  slug: string;
}

interface Category {
  name: string;
  slug: string;
  articles: Article[];
}

interface BlogLeftSidebarProps {
  onLinkClick?: () => void;
}

const CATEGORIES: Category[] = [
  {
    name: 'For Clients',
    slug: 'for-clients',
    articles: [
      { title: 'How to Find the Perfect Tutor', slug: 'how-to-find-perfect-tutor' },
      { title: 'GCSE Exam Preparation Guide', slug: 'gcse-exam-prep-guide' },
      { title: 'Choosing Between Online and In-Person', slug: 'online-vs-in-person-tutoring' },
    ],
  },
  {
    name: 'For Tutors',
    slug: 'for-tutors',
    articles: [
      { title: 'Building a Successful Tutoring Business', slug: 'building-successful-tutoring-business' },
      { title: 'How to Price Your Tutoring Services', slug: 'how-to-price-tutoring-services' },
      { title: 'Marketing Yourself as a Tutor', slug: 'marketing-yourself-as-tutor' },
    ],
  },
  {
    name: 'For Agents',
    slug: 'for-agents',
    articles: [
      { title: 'Growing Your Tutoring Agency', slug: 'growing-tutoring-agency' },
      { title: 'Recruiting Quality Tutors', slug: 'recruiting-quality-tutors' },
      { title: 'Managing Multiple Tutors Effectively', slug: 'managing-multiple-tutors' },
    ],
  },
  {
    name: 'Education Insights',
    slug: 'education-insights',
    articles: [
      { title: 'UK Tutoring Market 2026', slug: 'uk-tutoring-market-2026' },
      { title: 'Impact of AI on Education', slug: 'impact-of-ai-on-education' },
      { title: 'Future of Private Tutoring', slug: 'future-of-private-tutoring' },
    ],
  },
  {
    name: 'Company News',
    slug: 'company-news',
    articles: [
      { title: 'Platform Updates', slug: 'platform-updates' },
      { title: 'New Features', slug: 'new-features' },
    ],
  },
];

export default function BlogLeftSidebar({ onLinkClick }: BlogLeftSidebarProps = {}) {
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
    return pathname === `/blog/${articleSlug}`;
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
            className={`${styles.audiencePill} ${audienceFilter === 'clients' ? styles.active : ''}`}
            onClick={() => setAudienceFilter('clients')}
          >
            Clients
          </button>
          <button
            className={`${styles.audiencePill} ${audienceFilter === 'tutors' ? styles.active : ''}`}
            onClick={() => setAudienceFilter('tutors')}
          >
            Tutors
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
                    href={`/blog/${article.slug}`}
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
