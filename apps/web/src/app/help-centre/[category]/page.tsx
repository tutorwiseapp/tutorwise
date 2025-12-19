/**
 * Filename: apps/web/src/app/help-centre/[category]/page.tsx
 * Purpose: Category listing page for Help Centre
 * Created: 2025-01-19
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getArticlesByCategory, getCategories } from '@/lib/help-centre/articles';
import styles from './page.module.css';

interface CategoryPageProps {
  params: {
    category: string;
  };
}

const CATEGORY_INFO: Record<string, { title: string; description: string }> = {
  'getting-started': {
    title: 'Getting Started',
    description: 'New to Tutorwise? Start here to learn the basics',
  },
  features: {
    title: 'Features',
    description: 'Learn how to use Tutorwise features effectively',
  },
  account: {
    title: 'Account',
    description: 'Manage your profile, settings, and preferences',
  },
  billing: {
    title: 'Billing & Payments',
    description: 'Everything about payments, payouts, and pricing',
  },
  troubleshooting: {
    title: 'Troubleshooting',
    description: 'Common issues and how to resolve them',
  },
};

export default function CategoryPage({ params }: CategoryPageProps) {
  const { category } = params;
  const articles = getArticlesByCategory(category);

  if (articles.length === 0) {
    notFound();
  }

  const categoryInfo = CATEGORY_INFO[category] || {
    title: category.charAt(0).toUpperCase() + category.slice(1),
    description: `Articles about ${category}`,
  };

  return (
    <div className={styles.categoryPage}>
      {/* Category Header */}
      <header className={styles.categoryHeader}>
        <h1 className={styles.categoryTitle}>{categoryInfo.title}</h1>
        <p className={styles.categoryDescription}>{categoryInfo.description}</p>
        <div className={styles.articleCount}>
          {articles.length} {articles.length === 1 ? 'article' : 'articles'}
        </div>
      </header>

      {/* Articles Grid */}
      <div className={styles.articlesGrid}>
        {articles.map((article) => (
          <Link
            key={article.slug}
            href={`/help-centre/${category}/${article.slug}`}
            className={styles.articleCard}
          >
            <h2 className={styles.articleTitle}>{article.title}</h2>
            <p className={styles.articleDescription}>{article.description}</p>
            <div className={styles.articleMeta}>
              {article.readTime && (
                <span className={styles.readTime}>{article.readTime} read</span>
              )}
              {article.audience && article.audience !== 'all' && (
                <span className={styles.audience}>
                  For {article.audience.charAt(0).toUpperCase() + article.audience.slice(1)}s
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Back to Help Centre */}
      <div className={styles.backLink}>
        <Link href="/help-centre">← Back to Help Centre</Link>
      </div>
    </div>
  );
}

// Generate static params for all categories
export async function generateStaticParams() {
  const categories = getCategories();

  return categories.map((category) => ({
    category,
  }));
}

// Generate metadata for SEO
export async function generateMetadata({ params }: CategoryPageProps) {
  const { category } = params;
  const categoryInfo = CATEGORY_INFO[category] || {
    title: category.charAt(0).toUpperCase() + category.slice(1),
    description: `Articles about ${category}`,
  };

  return {
    title: `${categoryInfo.title} | Tutorwise Help Centre`,
    description: categoryInfo.description,
  };
}
