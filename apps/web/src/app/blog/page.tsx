/**
 * Filename: apps/web/src/app/blog/page.tsx
 * Purpose: Resources landing page with featured articles and categories
 * Created: 2026-01-15
 *
 * Architecture:
 * - Server-side rendering for SEO
 * - Featured articles section
 * - Category filters
 * - Latest articles grid
 * - Newsletter signup CTA
 */

'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import styles from './page.module.css';

interface BlogArticle {
  id: string;
  title: string;
  description: string;
  slug: string;
  category: string;
  author_name: string;
  published_at: string;
  read_time: string;
  featured_image_url?: string;
  view_count?: number;
}

// Category metadata
const CATEGORY_LABELS: Record<string, string> = {
  'for-clients': 'For Clients',
  'for-tutors': 'For Tutors',
  'for-agents': 'For Agents',
  'education-insights': 'Education Insights',
  'company-news': 'Company News',
};

const CATEGORIES = [
  { slug: 'for-clients', label: 'For Clients', description: 'Finding tutors, booking sessions, exam prep' },
  { slug: 'for-tutors', label: 'For Tutors', description: 'Growing your business, pricing, marketing' },
  { slug: 'for-agents', label: 'For Agents', description: 'Building teams, recruitment, scaling agencies' },
  { slug: 'education-insights', label: 'Education Insights', description: 'Industry trends, research, analysis' },
  { slug: 'company-news', label: 'Company News', description: 'Platform updates, new features, announcements' },
];

function CategoryTag({ category }: { category: string }) {
  return (
    <span className={styles.categoryTag} data-category={category}>
      {CATEGORY_LABELS[category] || category}
    </span>
  );
}

function ArticleCard({ article }: { article: BlogArticle }) {
  const formattedDate = new Date(article.published_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Link href={`/blog/${article.slug}`} className={styles.articleCard}>
      <div className={styles.articleHeader}>
        <CategoryTag category={article.category} />
        <span className={styles.readTime}>{article.read_time}</span>
      </div>
      <h3 className={styles.articleTitle}>{article.title}</h3>
      <p className={styles.articleDescription}>{article.description}</p>
      <div className={styles.articleFooter}>
        <span className={styles.author}>{article.author_name}</span>
        <span className={styles.date}>{formattedDate}</span>
      </div>
    </Link>
  );
}

function BlogLandingPageContent() {
  const searchParams = useSearchParams();
  const categoryFilter = searchParams?.get('category') ?? null;
  const [featuredArticles, setFeaturedArticles] = useState<BlogArticle[]>([]);
  const [latestArticles, setLatestArticles] = useState<BlogArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchArticles() {
      try {
        setLoading(true);

        // Fetch featured articles (top 3 by view count)
        const featuredResponse = await fetch('/api/blog/articles?limit=3');
        const featuredData = await featuredResponse.json();
        setFeaturedArticles(featuredData.articles || []);

        // Fetch latest articles
        const latestUrl = categoryFilter
          ? `/api/blog/articles?category=${categoryFilter}&limit=8`
          : '/api/blog/articles?limit=8';
        const latestResponse = await fetch(latestUrl);
        const latestData = await latestResponse.json();
        setLatestArticles(latestData.articles || []);
      } catch (error) {
        console.error('Error fetching articles:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchArticles();
  }, [categoryFilter]);

  if (loading) {
    return <div className={styles.loading}>Loading articles...</div>;
  }

  return (
    <>
      {/* Hero Section */}
      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>Resources</h1>
          <p className={styles.heroDescription}>
            Insights, guides, and resources for tutors, parents, and educational agencies.
            Learn how to succeed in the tutoring industry.
          </p>
        </div>
      </div>

      {/* Categories Section */}
      <div className={styles.categoriesSection}>
        <h2 className={styles.sectionTitle}>Browse by Category</h2>
        <div className={styles.categoriesGrid}>
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/blog/category/${cat.slug}`}
              className={styles.categoryCard}
            >
              <h3 className={styles.categoryTitle}>{cat.label}</h3>
              <p className={styles.categoryDescription}>{cat.description}</p>
              <span className={styles.categoryArrow}>→</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Featured Articles Section */}
      {featuredArticles.length > 0 && (
        <div className={styles.featuredSection}>
          <h2 className={styles.sectionTitle}>Featured Articles</h2>
          <div className={styles.featuredGrid}>
            {featuredArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </div>
      )}

      {/* Latest Articles Section */}
      <div className={styles.latestSection}>
        <div className={styles.latestHeader}>
          <h2 className={styles.sectionTitle}>Latest Articles</h2>
          {categoryFilter && (
            <Link href="/blog" className={styles.clearFilter}>
              Clear filter
            </Link>
          )}
        </div>
        {latestArticles.length > 0 ? (
          <div className={styles.latestGrid}>
            {latestArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <p className={styles.noArticles}>No articles found.</p>
        )}
      </div>

      {/* Newsletter CTA */}
      <div className={styles.newsletterSection}>
        <div className={styles.newsletterInner}>
          <h2 className={styles.newsletterTitle}>Get Tutoring Insights in Your Inbox</h2>
          <p className={styles.newsletterDescription}>
            Join 1,000+ tutors and parents receiving weekly tips, guides, and industry updates.
          </p>
          <form className={styles.newsletterForm}>
            <input
              type="email"
              placeholder="Enter your email"
              className={styles.newsletterInput}
              required
            />
            <button type="submit" className={styles.newsletterButton}>
              Subscribe
            </button>
          </form>
          <p className={styles.newsletterDisclaimer}>
            We respect your privacy. Unsubscribe anytime.
          </p>
        </div>
      </div>
    </>
  );
}

export default function BlogLandingPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading...</div>}>
      <BlogLandingPageContent />
    </Suspense>
  );
}
