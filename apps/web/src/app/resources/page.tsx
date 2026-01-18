/**
 * Filename: apps/web/src/app/resources/page.tsx
 * Purpose: Resources landing page with featured articles and categories
 * Created: 2026-01-15
 * Updated: 2026-01-18 - Migrated to React Query pattern (consistent with Help Centre)
 *
 * Architecture Changes:
 * - Replaced manual useState + useEffect with React Query hooks
 * - Added placeholderData to prevent skeleton flickering
 * - Implemented 5min caching strategy (consistent with Help Centre)
 * - Enhanced loading states with proper skeleton UI
 */

'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFeaturedArticles, useLatestArticles, useSearchArticles } from '@/lib/hooks/useResources';
import type { ResourceArticle } from '@/lib/hooks/useResources';
import styles from './page.module.css';

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

/**
 * Article Card Skeleton
 * Shows while loading articles - prevents layout shift
 */
function ArticleCardSkeleton() {
  return (
    <div className={styles.articleCardSkeleton}>
      <div className={styles.skeletonHeader}>
        <div className={styles.skeletonCategory}></div>
        <div className={styles.skeletonReadTime}></div>
      </div>
      <div className={styles.skeletonTitle}></div>
      <div className={styles.skeletonDescription}></div>
      <div className={styles.skeletonDescriptionShort}></div>
      <div className={styles.skeletonFooter}>
        <div className={styles.skeletonAuthor}></div>
        <div className={styles.skeletonDate}></div>
      </div>
    </div>
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
  const [searchInput, setSearchInput] = useState('');

  // React Query hooks - replaces manual useState + useEffect pattern
  // Features: caching, placeholderData (no flickering), automatic refetch management
  const { data: featuredArticles = [], isLoading: isFeaturedLoading } = useFeaturedArticles(4);
  const { data: latestArticles = [], isLoading: isLatestLoading } = useLatestArticles({
    limit: 12,
    category: categoryFilter,
    searchQuery: searchQuery,
  });
  const { data: searchResults = [], isLoading: isSearchLoading } = useSearchArticles(searchQuery);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (trimmed) {
      router.push(`/resources?q=${encodeURIComponent(trimmed)}`);
    }
  };

  // Show search results if query exists
  if (searchQuery) {
    return (
      <>
        {/* Search Header */}
        <div className={styles.searchHeader}>
          <h1 className={styles.searchTitle}>Search Results for &ldquo;{searchQuery}&rdquo;</h1>
          {!isSearchLoading && (
            <p className={styles.searchSubtitle}>
              {searchResults.length} {searchResults.length === 1 ? 'article' : 'articles'} found
            </p>
          )}
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

        {/* Search Results */}
        <div className={styles.searchResults}>
          {isSearchLoading ? (
            <div className={styles.resultsGrid}>
              {[1, 2, 3, 4].map((i) => (
                <ArticleCardSkeleton key={i} />
              ))}
            </div>
          ) : searchResults.length > 0 ? (
            <div className={styles.resultsGrid}>
              {searchResults.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <div className={styles.noResults}>
              <h2>No results found</h2>
              <p>Try different keywords or browse our categories below.</p>
            </div>
          )}
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
      </>
    );
  }

  // Show landing page if no search query
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
      <div className={styles.featuredSection}>
        <h2 className={styles.sectionTitle}>Featured Articles</h2>
        {isFeaturedLoading ? (
          <div className={styles.featuredGrid}>
            {[1, 2, 3, 4].map((i) => (
              <ArticleCardSkeleton key={i} />
            ))}
          </div>
        ) : featuredArticles.length > 0 ? (
          <div className={styles.featuredGrid}>
            {featuredArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <p className={styles.noArticles}>No featured articles available.</p>
        )}
      </div>

      {/* Latest Articles Section */}
      <div className={styles.latestSection}>
        <div className={styles.latestHeader}>
          <h2 className={styles.sectionTitle}>
            {categoryFilter ? `Latest in ${CATEGORY_LABELS[categoryFilter] || categoryFilter}` : 'Latest Articles'}
          </h2>
          {categoryFilter && (
            <Link href="/resources" className={styles.clearFilter}>
              Clear filter
            </Link>
          )}
        </div>
        {isLatestLoading ? (
          <div className={styles.latestGrid}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ArticleCardSkeleton key={i} />
            ))}
          </div>
        ) : latestArticles.length > 0 ? (
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
