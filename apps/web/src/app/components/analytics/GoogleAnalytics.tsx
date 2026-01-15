/**
 * Filename: apps/web/src/app/components/analytics/GoogleAnalytics.tsx
 * Purpose: Google Analytics 4 integration component
 * Created: 2026-01-15
 *
 * Setup Instructions:
 * 1. Get GA4 Measurement ID from https://analytics.google.com
 * 2. Add to .env.local: NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
 * 3. Import and add <GoogleAnalytics /> to root layout
 */

'use client';

import Script from 'next/script';
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  // Don't load analytics in development or if no measurement ID
  if (process.env.NODE_ENV === 'development' || !measurementId) {
    return null;
  }

  useEffect(() => {
    if (pathname && typeof window.gtag === 'function') {
      window.gtag('config', measurementId, {
        page_path: pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : ''),
      });
    }
  }, [pathname, searchParams, measurementId]);

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${measurementId}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}

// Helper function to track custom events
export function trackEvent(eventName: string, eventParams?: Record<string, any>) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, eventParams);
  }
}

// Blog-specific tracking helpers
export function trackArticleView(article: {
  id: string;
  title: string;
  category: string;
  author_name: string;
}) {
  trackEvent('article_view', {
    article_id: article.id,
    article_title: article.title,
    category: article.category,
    author: article.author_name,
  });
}

export function trackScrollDepth(articleId: string, percentScrolled: number) {
  trackEvent('scroll_depth', {
    article_id: articleId,
    percent_scrolled: percentScrolled,
  });
}

export function trackNewsletterSignup(source: string) {
  trackEvent('newsletter_signup', {
    source,
  });
}

export function trackSocialShare(platform: string, articleId: string) {
  trackEvent('social_share', {
    platform,
    article_id: articleId,
  });
}
