/**
 * Filename: apps/web/src/app/resources/[slug]/page.tsx
 * Purpose: Individual resource article page with author, social sharing, and related articles
 * Created: 2026-01-15
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import ArticleStructuredData from '@/app/components/resources/ArticleStructuredData';
import SaveArticleButton from '@/app/components/resources/SaveArticleButton';
import styles from './page.module.css';

interface BlogArticle {
  id: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  author_id: string;
  author_name: string;
  featured_image_url?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string[];
  status: string;
  published_at: string;
  read_time: string;
  view_count: number;
  created_at: string;
  updated_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  'for-clients': 'For Clients',
  'for-tutors': 'For Tutors',
  'for-agents': 'For Agents',
  'education-insights': 'Education Insights',
  'company-news': 'Company News',
};

// Fetch article from database
async function getArticle(slug: string): Promise<BlogArticle | null> {
  const supabase = await createClient();

  const { data: article, error } = await supabase
    .from('resource_articles')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .single();

  if (error || !article) {
    return null;
  }

  return article;
}

// Generate metadata with full SEO support
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const article = await getArticle(params.slug);

  if (!article) {
    return {
      title: 'Article Not Found',
    };
  }

  // Use custom meta fields if available, otherwise fallback to defaults
  const title = article.meta_title || article.title;
  const description = article.meta_description || article.description;
  const keywords = article.meta_keywords || [];

  return {
    title: `${title} | Tutorwise Blog`,
    description: description,
    keywords: keywords,
    authors: [{ name: article.author_name }],
    openGraph: {
      title: title,
      description: description,
      type: 'article',
      publishedTime: article.published_at,
      modifiedTime: article.updated_at,
      authors: [article.author_name],
      tags: article.tags || [],
      images: article.featured_image_url
        ? [
            {
              url: article.featured_image_url,
              alt: article.title,
            },
          ]
        : [],
      url: `https://tutorwise.com/resources/${article.slug}`,
      siteName: 'Tutorwise',
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: article.featured_image_url ? [article.featured_image_url] : [],
    },
    alternates: {
      canonical: `https://tutorwise.com/resources/${article.slug}`,
    },
  };
}

export default async function BlogArticlePage({ params }: { params: { slug: string } }) {
  const article = await getArticle(params.slug);

  if (!article) {
    notFound();
  }

  const categoryLabel = CATEGORY_LABELS[article.category] || article.category;

  // Format date
  const formattedDate = new Date(article.published_at).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Increment view count (fire-and-forget)
  fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/resources/articles/${article.slug}`, {
    method: 'GET',
    cache: 'no-store',
  }).catch(() => {});

  return (
    <>
      <ArticleStructuredData article={article} />
      <article className={styles.article}>
        {/* Breadcrumb */}
        <nav className={styles.breadcrumb}>
          <Link href="/resources" className={styles.breadcrumbLink}>
            Blog
          </Link>
          <span className={styles.breadcrumbSeparator}>/</span>
          <Link href={`/resources/category/${article.category}`} className={styles.breadcrumbLink}>
            {categoryLabel}
        </Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span className={styles.breadcrumbCurrent}>{article.title}</span>
      </nav>

      {/* Article Header */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.categoryBadge} data-category={article.category}>
            {categoryLabel}
          </div>
          <SaveArticleButton
            article={{
              id: article.id,
              title: article.title,
              slug: article.slug,
              description: article.description,
              featured_image_url: article.featured_image_url,
            }}
            variant="icon"
          />
        </div>
        <h1 className={styles.title}>{article.title}</h1>
        <p className={styles.description}>{article.description}</p>

        <div className={styles.meta}>
          <div className={styles.author}>
            <div className={styles.authorAvatar}>
              <div className={styles.avatarPlaceholder}>
                {article.author_name.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className={styles.authorInfo}>
              <div className={styles.authorName}>{article.author_name}</div>
            </div>
          </div>

          <div className={styles.publishInfo}>
            <div className={styles.publishDate}>{formattedDate}</div>
            <div className={styles.readTime}>{article.read_time}</div>
          </div>
        </div>
      </header>

      {/* Featured Image */}
      {article.featured_image_url && (
        <div className={styles.featuredImage}>
          <img src={article.featured_image_url} alt={article.title} />
        </div>
      )}

      {/* Article Content */}
      <div className={styles.content}>
        {/* TODO: Replace with MDX rendering */}
        <div dangerouslySetInnerHTML={{ __html: article.content?.replace(/\n/g, '<br />') || '' }} />
      </div>

      {/* Tags */}
      {article.tags && article.tags.length > 0 && (
        <div className={styles.tags}>
          {article.tags.map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Social Share */}
      <div className={styles.share}>
        <h3 className={styles.shareTitle}>Share this article</h3>
        <div className={styles.shareButtons}>
          <button className={styles.shareButton} data-platform="twitter">
            Twitter
          </button>
          <button className={styles.shareButton} data-platform="linkedin">
            LinkedIn
          </button>
          <button className={styles.shareButton} data-platform="facebook">
            Facebook
          </button>
          <button className={styles.shareButton} data-platform="copy">
            Copy Link
          </button>
        </div>
      </div>

      {/* Related Articles */}
      <div className={styles.related}>
        <h3 className={styles.relatedTitle}>Related Articles</h3>
        <div className={styles.relatedGrid}>
          {/* TODO: Implement actual related articles logic */}
          <p className={styles.placeholder}>Related articles coming soon...</p>
        </div>
      </div>
      </article>
    </>
  );
}
