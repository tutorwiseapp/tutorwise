/**
 * Filename: apps/web/src/app/resources/category/[category]/page.tsx
 * Purpose: Category page showing all blog articles in a specific category
 * Created: 2026-01-15
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import styles from './page.module.css';

interface BlogArticle {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  author_name: string;
  published_at: string;
  read_time: string;
  view_count: number;
}

const CATEGORY_INFO: Record<
  string,
  { label: string; description: string; icon: string }
> = {
  'for-clients': {
    label: 'For Clients',
    description: 'Guides for parents and students finding tutors, booking sessions, and exam prep.',
    icon: '👨‍👩‍👧‍👦',
  },
  'for-tutors': {
    label: 'For Tutors',
    description:
      'Tips for tutors on growing your business, pricing strategies, and marketing yourself.',
    icon: '👩‍🏫',
  },
  'for-agents': {
    label: 'For Agents',
    description: 'Strategies for tutoring agencies to build teams, recruit tutors, and scale.',
    icon: '🏢',
  },
  'education-insights': {
    label: 'Education Insights',
    description: 'In-depth analysis of tutoring industry trends, research, and market data.',
    icon: '📊',
  },
  'company-news': {
    label: 'Company News',
    description: 'Latest updates about Tutorwise platform features and announcements.',
    icon: '📰',
  },
};

// Fetch articles by category
async function getCategoryArticles(category: string): Promise<BlogArticle[]> {
  const supabase = await createClient();

  const { data: articles, error } = await supabase
    .from('blog_articles')
    .select('*')
    .eq('category', category)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Error fetching category articles:', error);
    return [];
  }

  return articles || [];
}

export async function generateMetadata({
  params,
}: {
  params: { category: string };
}): Promise<Metadata> {
  const categoryInfo = CATEGORY_INFO[params.category];

  if (!categoryInfo) {
    return {
      title: 'Category Not Found',
    };
  }

  return {
    title: `${categoryInfo.label} Articles | Tutorwise Blog`,
    description: categoryInfo.description,
    keywords: ['tutoring', 'education', categoryInfo.label.toLowerCase()],
    openGraph: {
      title: `${categoryInfo.label} Articles | Tutorwise Blog`,
      description: categoryInfo.description,
      url: `https://tutorwise.com/resources/category/${params.category}`,
      siteName: 'Tutorwise',
      type: 'website',
    },
    alternates: {
      canonical: `https://tutorwise.com/resources/category/${params.category}`,
    },
  };
}

export default async function BlogCategoryPage({ params }: { params: { category: string } }) {
  const categoryInfo = CATEGORY_INFO[params.category];

  if (!categoryInfo) {
    notFound();
  }

  // Fetch articles from database
  const articles = await getCategoryArticles(params.category);

  return (
    <div className={styles.categoryPage}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link href="/resources" className={styles.breadcrumbLink}>
          Blog
        </Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span className={styles.breadcrumbCurrent}>{categoryInfo.label}</span>
      </nav>

      {/* Category Header */}
      <header className={styles.header}>
        <div className={styles.icon}>{categoryInfo.icon}</div>
        <h1 className={styles.title}>{categoryInfo.label}</h1>
        <p className={styles.description}>{categoryInfo.description}</p>
        <div className={styles.count}>
          {articles.length} {articles.length === 1 ? 'article' : 'articles'}
        </div>
      </header>

      {/* Articles Grid */}
      {articles.length > 0 ? (
        <div className={styles.articlesGrid}>
          {articles.map((article) => {
            const formattedDate = new Date(article.published_at).toLocaleDateString('en-GB', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });

            return (
              <Link
                key={article.id}
                href={`/resources/${article.slug}`}
                className={styles.articleCard}
              >
                <div className={styles.articleHeader}>
                  <span className={styles.categoryBadge} data-category={article.category}>
                    {categoryInfo.label}
                  </span>
                  <span className={styles.readTime}>{article.read_time}</span>
                </div>

                <h2 className={styles.articleTitle}>{article.title}</h2>
                <p className={styles.articleDescription}>{article.description}</p>

                <div className={styles.articleFooter}>
                  <div className={styles.author}>
                    <span className={styles.authorName}>{article.author_name}</span>
                  </div>
                  <span className={styles.date}>{formattedDate}</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className={styles.noArticles}>
          <p>No articles available in this category yet.</p>
          <Link href="/resources" className={styles.backLink}>
            ← Back to all articles
          </Link>
        </div>
      )}
    </div>
  );
}
