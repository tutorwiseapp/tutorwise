/**
 * Filename: apps/web/src/components/resources/widgets/PopularArticlesWidget.tsx
 * Purpose: Right sidebar widget displaying popular resource articles — dynamic from DB
 * Created: 2026-01-15
 * Updated: 2026-03-12 — replaced hardcoded placeholder articles with real DB data (sorted by views)
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './PopularArticlesWidget.module.css';

const CATEGORY_LABELS: Record<string, string> = {
  'for-clients': 'For Clients',
  'for-tutors': 'For Tutors',
  'for-agents': 'For Agents',
  'education-insights': 'Education Insights',
  'company-news': 'Company News',
  'thought-leadership': 'Thought Leadership',
};

interface PopularArticle {
  title: string;
  slug: string;
  read_time: string;
  category: string;
  view_count: number;
}

export default function PopularArticlesWidget() {
  const [articles, setArticles] = useState<PopularArticle[]>([]);

  useEffect(() => {
    fetch('/api/resources/articles')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.articles) return;
        const all = data.articles as PopularArticle[];
        // Sort by views descending, take top 5
        const top = [...all]
          .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
          .slice(0, 5);
        setArticles(top);
      })
      .catch(() => {});
  }, []);

  if (articles.length === 0) return null;

  return (
    <div className={styles.widget}>
      <h3 className={styles.widgetTitle}>Popular Articles</h3>
      <div className={styles.articleList}>
        {articles.map((article) => (
          <Link key={article.slug} href={`/resources/${article.slug}`} className={styles.articleItem}>
            <div className={styles.articleTitle}>{article.title}</div>
            <div className={styles.articleMeta}>
              <span className={styles.category}>{CATEGORY_LABELS[article.category] || article.category}</span>
              <span className={styles.separator}>•</span>
              <span className={styles.readTime}>{article.read_time}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
