/**
 * Filename: apps/web/src/app/help-centre/page.tsx
 * Purpose: Help Centre landing page with hero, getting started, and categories
 * Created: 2025-01-19
 */

'use client';

import Link from 'next/link';
import SearchWidget from '@/app/components/help-centre/widgets/SearchWidget';
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

export default function HelpCentreLandingPage() {
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
