/**
 * Filename: apps/web/src/components/resources/widgets/CategoriesWidget.tsx
 * Purpose: Right sidebar widget displaying resource categories — dynamic from DB
 * Created: 2026-01-15
 * Updated: 2026-03-12 — replaced hardcoded counts with real DB data
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './CategoriesWidget.module.css';

const CATEGORY_DEFS = [
  { slug: 'for-clients', name: 'For Clients', description: 'Finding tutors, booking sessions, exam prep' },
  { slug: 'for-tutors', name: 'For Tutors', description: 'Growing your business, pricing, marketing' },
  { slug: 'for-agents', name: 'For Agents', description: 'Building teams, recruitment, scaling' },
  { slug: 'education-insights', name: 'Education Insights', description: 'Industry trends, research, analysis' },
  { slug: 'company-news', name: 'Company News', description: 'Platform updates, new features' },
  { slug: 'thought-leadership', name: 'Thought Leadership', description: 'AI orchestration, DevOps patterns' },
];

export default function CategoriesWidget() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch('/api/resources/articles')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.articles) return;
        const articles = data.articles as { category: string }[];
        const grouped: Record<string, number> = {};
        for (const a of articles) {
          grouped[a.category] = (grouped[a.category] || 0) + 1;
        }
        setCounts(grouped);
      })
      .catch(() => {});
  }, []);

  return (
    <div className={styles.widget}>
      <h3 className={styles.widgetTitle}>Categories</h3>
      <div className={styles.categoryList}>
        {CATEGORY_DEFS.map((category) => (
          <Link
            key={category.slug}
            href={`/resources/category/${category.slug}`}
            className={styles.categoryItem}
          >
            <div className={styles.categoryInfo}>
              <div className={styles.categoryName}>{category.name}</div>
              <div className={styles.categoryDescription}>{category.description}</div>
            </div>
            <div className={styles.categoryCount}>{counts[category.slug] || 0}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
