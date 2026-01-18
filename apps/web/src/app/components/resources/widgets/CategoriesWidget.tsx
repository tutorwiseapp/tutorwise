/**
 * Filename: apps/web/src/app/components/resources/widgets/CategoriesWidget.tsx
 * Purpose: Right sidebar widget displaying resource categories
 * Created: 2026-01-15
 */

'use client';

import Link from 'next/link';
import styles from './CategoriesWidget.module.css';

const CATEGORIES = [
  {
    name: 'For Clients',
    slug: 'for-clients',
    count: 12,
    description: 'Finding tutors, booking sessions, exam prep',
  },
  {
    name: 'For Tutors',
    slug: 'for-tutors',
    count: 18,
    description: 'Growing your business, pricing, marketing',
  },
  {
    name: 'For Agents',
    slug: 'for-agents',
    count: 8,
    description: 'Building teams, recruitment, scaling',
  },
  {
    name: 'Education Insights',
    slug: 'education-insights',
    count: 15,
    description: 'Industry trends, research, analysis',
  },
  {
    name: 'Company News',
    slug: 'company-news',
    count: 6,
    description: 'Platform updates, new features',
  },
];

export default function CategoriesWidget() {
  return (
    <div className={styles.widget}>
      <h3 className={styles.widgetTitle}>Categories</h3>
      <div className={styles.categoryList}>
        {CATEGORIES.map((category) => (
          <Link
            key={category.slug}
            href={`/resources/category/${category.slug}`}
            className={styles.categoryItem}
          >
            <div className={styles.categoryInfo}>
              <div className={styles.categoryName}>{category.name}</div>
              <div className={styles.categoryDescription}>{category.description}</div>
            </div>
            <div className={styles.categoryCount}>{category.count}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
