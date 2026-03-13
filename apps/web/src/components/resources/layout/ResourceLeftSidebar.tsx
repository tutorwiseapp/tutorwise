/**
 * Filename: apps/web/src/components/resources/layout/ResourceLeftSidebar.tsx
 * Purpose: Left sidebar navigation (320px) for resource categories — dynamic from DB
 * Created: 2026-01-15
 * Updated: 2026-03-12 — replaced hardcoded placeholder articles with real DB data
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './ResourceLeftSidebar.module.css';

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

interface ResourceLeftSidebarProps {
  onLinkClick?: () => void;
}

const CATEGORY_META: Record<string, string> = {
  'for-clients': 'For Clients',
  'for-tutors': 'For Tutors',
  'for-agents': 'For Agents',
  'education-insights': 'Education Insights',
  'company-news': 'Company News',
  'thought-leadership': 'Thought Leadership',
};

const AUDIENCE_MAP: Record<string, string[]> = {
  clients: ['for-clients'],
  tutors: ['for-tutors'],
  agents: ['for-agents'],
};

export default function ResourceLeftSidebar({ onLinkClick }: ResourceLeftSidebarProps = {}) {
  const pathname = usePathname();
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/resources/articles')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.articles) return;
        const articles = data.articles as { title: string; slug: string; category: string }[];

        // Group by category
        const grouped: Record<string, Article[]> = {};
        for (const a of articles) {
          if (!grouped[a.category]) grouped[a.category] = [];
          grouped[a.category].push({ title: a.title, slug: a.slug });
        }

        // Build categories in display order, only include those with articles
        const orderedSlugs = Object.keys(CATEGORY_META);
        const cats: Category[] = orderedSlugs
          .filter((slug) => grouped[slug] && grouped[slug].length > 0)
          .map((slug) => ({
            name: CATEGORY_META[slug] || slug,
            slug,
            articles: grouped[slug],
          }));

        setCategories(cats);
        setExpandedCategories(new Set(cats.map((c) => c.slug)));
      })
      .catch(() => {});
  }, []);

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

  const isArticleActive = (_categorySlug: string, articleSlug: string) => {
    return pathname === `/resources/${articleSlug}`;
  };

  // Filter categories by audience
  const filteredCategories =
    audienceFilter === 'all'
      ? categories
      : categories.filter((cat) => AUDIENCE_MAP[audienceFilter]?.includes(cat.slug));

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
            className={`${styles.audiencePill} ${audienceFilter === 'agents' ? styles.active : ''}`}
            onClick={() => setAudienceFilter('agents')}
          >
            Agents
          </button>
        </div>
      </div>

      {/* Category Navigation */}
      <nav className={styles.categoryNav}>
        {filteredCategories.map((category) => {
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
                    href={`/resources/${article.slug}`}
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
