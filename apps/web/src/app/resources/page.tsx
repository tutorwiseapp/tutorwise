/**
 * Filename: apps/web/src/app/resources/page.tsx
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
import { useSearchParams, useRouter } from 'next/navigation';
import styles from './page.module.css';

interface ResourceArticle {
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

function ArticleCard({ article }: { article: ResourceArticle }) {
  const formattedDate = new Date(article.published_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Link href={`/resources/${article.slug}`} className={styles.articleCard}>
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

function ResourcesLandingPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryFilter = searchParams?.get('category') ?? null;
  const searchQuery = searchParams?.get('q') ?? null;
  const [featuredArticles, setFeaturedArticles] = useState<ResourceArticle[]>([]);
  const [latestArticles, setLatestArticles] = useState<ResourceArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (trimmed) {
      router.push(`/resources?q=${encodeURIComponent(trimmed)}`);
    }
  };

  useEffect(() => {
    async function fetchArticles() {
      try {
        setLoading(true);

        // Fetch featured articles (top 4 by view count)
        const featuredResponse = await fetch('/api/resources/articles?limit=4');
        const featuredData = await featuredResponse.json();
        setFeaturedArticles(featuredData.articles || []);

        // Fetch latest articles
        const latestUrl = categoryFilter
          ? `/api/resources/articles?category=${categoryFilter}&limit=8`
          : '/api/resources/articles?limit=8';
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
          <h1 className={styles.heroTitle}>Welcome to Tutorwise Resources</h1>
          <p className={styles.heroDescription}>
            Expert guides and insights to help you succeed. Whether you&apos;re a tutor, parent, or agency,
            find practical tips and industry knowledge to grow your tutoring journey.
          </p>

          <form onSubmit={handleSearch} className={styles.heroSearch}>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search resources..."
              className={styles.searchInput}
              aria-label="Search resources"
            />
            <button type="submit" className={styles.searchButton}>
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Categories Section */}
      <div className={styles.categoriesSection}>
        <h2 className={styles.sectionTitle}>Browse by Category</h2>
        <div className={styles.categoriesGrid}>
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/resources/category/${cat.slug}`}
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
            <Link href="/resources" className={styles.clearFilter}>
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

export default function ResourcesLandingPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading...</div>}>
      <ResourcesLandingPageContent />
    </Suspense>
  );
}
