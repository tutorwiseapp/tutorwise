/**
 * Filename: apps/web/src/app/help-centre/page.tsx
 * Purpose: Help Centre landing page with hero, search results, and categories
 * Created: 2025-01-19
 * Updated: 2025-12-21 - Refactored to use React Query (consistent with home page pattern)
 *
 * Architecture Changes:
 * - Replaced manual useState + useEffect with React Query hooks
 * - Added placeholderData to prevent skeleton flickering
 * - Implemented 5min caching strategy (consistent with home page)
 * - Enhanced loading states with proper skeleton UI
 * - SEO metadata defined in layout.tsx
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import SearchWidget from '@/app/components/help-centre/widgets/SearchWidget';
import { useSearchArticles } from '@/lib/hooks/useHelpCentre';
import type { ArticleSearchResult } from './actions';
import styles from './page.module.css';

interface FeaturedArticle {
  title: string;
  description: string;
  href: string;
  icon: string;
  category: string;
}

interface QuickLink {
  title: string;
  href: string;
  icon: string;
}

const FEATURED_ARTICLES: FeaturedArticle[] = [
  {
    title: 'How to create your first listing',
    description: 'Step-by-step guide to setting up your tutoring services',
    href: '/help-centre/features/create-listing',
    icon: '',
    category: 'Features',
  },
  {
    title: 'Getting paid: Stripe setup',
    description: 'Connect your Stripe account to receive payments',
    href: '/help-centre/billing/stripe-setup',
    icon: '',
    category: 'Billing',
  },
  {
    title: 'Understanding the booking process',
    description: 'Learn how students find and book your services',
    href: '/help-centre/features/bookings',
    icon: '',
    category: 'Features',
  },
  {
    title: 'Managing your profile',
    description: 'Update your information and settings',
    href: '/help-centre/account/profile-setup',
    icon: '',
    category: 'Account',
  },
];

const QUICK_LINKS: QuickLink[] = [
  {
    title: 'Payment FAQ',
    href: '/help-centre/billing/pricing',
    icon: '',
  },
  {
    title: 'Referral System',
    href: '/help-centre/features/referrals',
    icon: '',
  },
  {
    title: 'Common Issues',
    href: '/help-centre/troubleshooting/common-issues',
    icon: '',
  },
  {
    title: 'Profile Setup',
    href: '/help-centre/account/profile-setup',
    icon: '',
  },
];

/**
 * Search Results Skeleton
 * Shows while loading search results - prevents layout shift
 */
function SearchResultsSkeleton() {
  return (
    <div className={styles.resultsGrid}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className={styles.resultCardSkeleton}>
          <div className={styles.skeletonHeader}>
            <div className={styles.skeletonCategory}></div>
            <div className={styles.skeletonReadTime}></div>
          </div>
          <div className={styles.skeletonTitle}></div>
          <div className={styles.skeletonDescription}></div>
          <div className={styles.skeletonDescriptionShort}></div>
        </div>
      ))}
    </div>
  );
}

/**
 * Article Result Card Component
 * Extracted for reusability and consistency
 */
function ArticleResultCard({ article }: { article: ArticleSearchResult }) {
  return (
    <Link
      href={`/help-centre/${article.category}/${article.slug}`}
      className={styles.resultCard}
    >
      <div className={styles.resultHeader}>
        <span className={styles.resultCategory}>
          {article.category.charAt(0).toUpperCase() + article.category.slice(1).replace('-', ' ')}
        </span>
        {article.readTime && <span className={styles.resultReadTime}>{article.readTime}</span>}
      </div>
      <h3 className={styles.resultTitle}>{article.title}</h3>
      <p className={styles.resultDescription}>{article.description}</p>
    </Link>
  );
}

function HelpCentreLandingPageContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q');

  // React Query hook - replaces manual useState + useEffect pattern
  // Features: caching, placeholderData (no flickering), automatic refetch management
  const { data: searchResults = [], isLoading } = useSearchArticles(query);

  // Show search results if query exists
  if (query) {
    return (
      <>
        {/* Search Header */}
        <div className={styles.searchHeader}>
          <h1 className={styles.searchTitle}>Search Results for &ldquo;{query}&rdquo;</h1>
          {!isLoading && (
            <p className={styles.searchSubtitle}>
              {searchResults.length} {searchResults.length === 1 ? 'article' : 'articles'} found
            </p>
          )}
          <div className={styles.heroSearch}>
            <SearchWidget placeholder="Search help articles..." variant="hero" />
          </div>
        </div>

        {/* Search Results */}
        <div className={styles.searchResults}>
          {isLoading ? (
            <SearchResultsSkeleton />
          ) : searchResults.length > 0 ? (
            <div className={styles.resultsGrid}>
              {searchResults.map((article) => (
                <ArticleResultCard
                  key={`${article.category}/${article.slug}`}
                  article={article}
                />
              ))}
            </div>
          ) : (
            <div className={styles.noResults}>
              <h2>No results found</h2>
              <p>Try different keywords or browse our categories below.</p>
              <div className={styles.noResultsSuggestions}>
                <p>Suggestions:</p>
                <ul>
                  <li>Check your spelling</li>
                  <li>Use different keywords</li>
                  <li>Browse our categories</li>
                  <li>Contact support if you need help</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Quick Links Section */}
        <div className={styles.quickLinksSection}>
          <h2 className={styles.sectionTitle}>Popular Articles</h2>
          <div className={styles.quickLinksGrid}>
            {QUICK_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={styles.quickLinkCard}>
                <span className={styles.quickLinkTitle}>{link.title}</span>
                <span className={styles.quickLinkArrow}>→</span>
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
          <h1 className={styles.heroTitle}>How can we help you?</h1>
          <p className={styles.heroDescription}>
            Find answers to your questions about Tutorwise. Browse guides, tutorials, and FAQs.
          </p>

          <div className={styles.heroSearch}>
            <SearchWidget placeholder="Search help articles..." variant="hero" />
          </div>
        </div>
      </div>

      {/* Featured Articles Section */}
      <div className={styles.featuredSection}>
        <h2 className={styles.sectionTitle}>Featured Articles</h2>
        <div className={styles.featuredGrid}>
          {FEATURED_ARTICLES.map((article) => (
            <Link key={article.href} href={article.href} className={styles.featuredCard}>
              <div className={styles.featuredCardHeader}>
                <span className={styles.featuredCategory}>{article.category}</span>
              </div>
              <h3 className={styles.featuredTitle}>{article.title}</h3>
              <p className={styles.featuredDescription}>{article.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Links Section */}
      <div className={styles.quickLinksSection}>
        <h2 className={styles.sectionTitle}>Quick Links</h2>
        <div className={styles.quickLinksGrid}>
          {QUICK_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={styles.quickLinkCard}>
              <span className={styles.quickLinkTitle}>{link.title}</span>
              <span className={styles.quickLinkArrow}>→</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

export default function HelpCentreLandingPage() {
  return (
    <Suspense fallback={<div className={styles.searchLoading}>Loading...</div>}>
      <HelpCentreLandingPageContent />
    </Suspense>
  );
}
