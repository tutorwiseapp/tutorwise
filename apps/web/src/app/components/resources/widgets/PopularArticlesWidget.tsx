/**
 * Filename: apps/web/src/app/components/resources/widgets/PopularArticlesWidget.tsx
 * Purpose: Right sidebar widget displaying popular resource articles
 * Created: 2026-01-15
 */

'use client';

import Link from 'next/link';
import styles from './PopularArticlesWidget.module.css';

const POPULAR_ARTICLES = [
  {
    title: 'How to Find the Perfect Tutor for Your Child',
    slug: 'how-to-find-perfect-tutor',
    readTime: '8 min read',
    category: 'For Clients',
  },
  {
    title: 'Building a Successful Tutoring Business in 2026',
    slug: 'building-successful-tutoring-business',
    readTime: '12 min read',
    category: 'For Tutors',
  },
  {
    title: 'UK Tutoring Market Trends 2026',
    slug: 'uk-tutoring-market-2026',
    readTime: '10 min read',
    category: 'Education Insights',
  },
  {
    title: 'How to Price Your Tutoring Services',
    slug: 'how-to-price-tutoring-services',
    readTime: '6 min read',
    category: 'For Tutors',
  },
  {
    title: 'Growing Your Tutoring Agency',
    slug: 'growing-tutoring-agency',
    readTime: '15 min read',
    category: 'For Agents',
  },
];

export default function PopularArticlesWidget() {
  return (
    <div className={styles.widget}>
      <h3 className={styles.widgetTitle}>Popular Articles</h3>
      <div className={styles.articleList}>
        {POPULAR_ARTICLES.map((article) => (
          <Link key={article.slug} href={`/resources/${article.slug}`} className={styles.articleItem}>
            <div className={styles.articleTitle}>{article.title}</div>
            <div className={styles.articleMeta}>
              <span className={styles.category}>{article.category}</span>
              <span className={styles.separator}>•</span>
              <span className={styles.readTime}>{article.readTime}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
