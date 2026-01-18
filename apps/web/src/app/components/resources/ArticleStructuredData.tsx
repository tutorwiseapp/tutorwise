/**
 * Filename: apps/web/src/app/components/blog/ArticleStructuredData.tsx
 * Purpose: Generate JSON-LD structured data for blog articles (SEO)
 * Created: 2026-01-15
 */

interface ArticleStructuredDataProps {
  article: {
    title: string;
    description: string;
    slug: string;
    author_name: string;
    published_at: string;
    updated_at: string;
    featured_image_url?: string;
    content: string;
  };
}

export default function ArticleStructuredData({ article }: ArticleStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    image: article.featured_image_url || 'https://tutorwise.com/og-image.jpg',
    datePublished: article.published_at,
    dateModified: article.updated_at,
    author: {
      '@type': 'Person',
      name: article.author_name,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Tutorwise',
      logo: {
        '@type': 'ImageObject',
        url: 'https://tutorwise.com/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://tutorwise.com/blog/${article.slug}`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
