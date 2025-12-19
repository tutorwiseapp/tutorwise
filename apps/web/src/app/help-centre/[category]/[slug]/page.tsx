/**
 * Filename: apps/web/src/app/help-centre/[category]/[slug]/page.tsx
 * Purpose: Dynamic article page for Help Centre
 * Created: 2025-01-19
 */

import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getArticleBySlug, getAllArticles } from '@/lib/help-centre/articles';
import { trackArticleView } from '@/lib/api/help-centre';
import CalloutBox from '@/app/components/help-centre/mdx/CalloutBox';
import CodeBlock from '@/app/components/help-centre/mdx/CodeBlock';
import VideoEmbed from '@/app/components/help-centre/mdx/VideoEmbed';
import Tabs, { Tab } from '@/app/components/help-centre/mdx/Tabs';
import styles from './page.module.css';

interface ArticlePageProps {
  params: {
    category: string;
    slug: string;
  };
}

// MDX components mapping
const mdxComponents = {
  CalloutBox,
  CodeBlock,
  VideoEmbed,
  Tabs,
  Tab,
};

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { category, slug } = params;
  const article = getArticleBySlug(category, slug);

  if (!article) {
    notFound();
  }

  // Track article view (client-side would be better, but this works for now)
  // Note: This will be called on server, we should move to client component for proper tracking
  // trackArticleView(`${category}/${slug}`);

  return (
    <article className={styles.article}>
      {/* Article Header */}
      <header className={styles.articleHeader}>
        <div className={styles.categoryBadge}>
          {category.charAt(0).toUpperCase() + category.slice(1)}
        </div>
        <h1 className={styles.articleTitle}>{article.title}</h1>
        <div className={styles.articleMeta}>
          {article.author && <span>By {article.author}</span>}
          {article.readTime && (
            <>
              <span className={styles.metaDivider}>•</span>
              <span>{article.readTime} read</span>
            </>
          )}
          {article.lastUpdated && (
            <>
              <span className={styles.metaDivider}>•</span>
              <span>Updated {new Date(article.lastUpdated).toLocaleDateString()}</span>
            </>
          )}
        </div>
        {article.description && (
          <p className={styles.articleDescription}>{article.description}</p>
        )}
      </header>

      {/* Article Content */}
      <div className={styles.articleContent}>
        <MDXRemote source={article.content} components={mdxComponents} />
      </div>

      {/* Related Articles */}
      {article.relatedArticles && article.relatedArticles.length > 0 && (
        <aside className={styles.relatedArticles}>
          <h2>Related Articles</h2>
          <ul>
            {article.relatedArticles.map((slug) => (
              <li key={slug}>
                <a href={`/help-centre/${category}/${slug}`}>{slug}</a>
              </li>
            ))}
          </ul>
        </aside>
      )}

      {/* Helpfulness Widget - TODO */}
      <div className={styles.helpfulnessWidget}>
        <h3>Was this article helpful?</h3>
        <div className={styles.helpfulnessButtons}>
          <button className={styles.helpfulButton}>Yes</button>
          <button className={styles.helpfulButton}>No</button>
        </div>
      </div>
    </article>
  );
}

// Generate static params for all articles
export async function generateStaticParams() {
  const articles = getAllArticles();

  return articles.map((article) => ({
    category: article.category,
    slug: article.slug,
  }));
}

// Generate metadata for SEO
export async function generateMetadata({ params }: ArticlePageProps) {
  const { category, slug } = params;
  const article = getArticleBySlug(category, slug);

  if (!article) {
    return {
      title: 'Article Not Found',
    };
  }

  return {
    title: `${article.title} | Tutorwise Help Centre`,
    description: article.description,
    keywords: article.keywords,
  };
}
