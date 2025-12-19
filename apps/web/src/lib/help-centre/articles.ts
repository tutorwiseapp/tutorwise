/**
 * Filename: apps/web/src/lib/help-centre/articles.ts
 * Purpose: Article metadata loader and utilities for Help Centre
 * Created: 2025-01-19
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface ArticleMetadata {
  title: string;
  slug: string;
  category: string;
  audience?: 'all' | 'tutor' | 'student' | 'agent';
  description: string;
  keywords?: string[];
  author?: string;
  lastUpdated: string;
  readTime?: string;
  relatedArticles?: string[];
}

export interface Article extends ArticleMetadata {
  content: string;
}

const CONTENT_DIR = path.join(process.cwd(), 'src/content/help-centre');

/**
 * Get all article files recursively
 */
function getArticleFiles(dir: string = CONTENT_DIR): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getArticleFiles(fullPath));
    } else if (entry.name.endsWith('.mdx') || entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Parse article frontmatter and content
 */
export function parseArticle(filePath: string): Article {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(fileContent);

  // Extract category from file path
  const relativePath = path.relative(CONTENT_DIR, filePath);
  const category = path.dirname(relativePath).split(path.sep)[0];

  return {
    title: data.title,
    slug: data.slug,
    category: data.category || category,
    audience: data.audience || 'all',
    description: data.description,
    keywords: data.keywords,
    author: data.author,
    lastUpdated: data.lastUpdated,
    readTime: data.readTime,
    relatedArticles: data.relatedArticles,
    content,
  };
}

/**
 * Get all articles metadata
 */
export function getAllArticles(): Article[] {
  const files = getArticleFiles();
  return files.map(parseArticle);
}

/**
 * Get article by category and slug
 */
export function getArticleBySlug(category: string, slug: string): Article | null {
  const articles = getAllArticles();
  return articles.find(
    (article) => article.category === category && article.slug === slug
  ) || null;
}

/**
 * Get all articles in a category
 */
export function getArticlesByCategory(category: string): Article[] {
  const articles = getAllArticles();
  return articles.filter((article) => article.category === category);
}

/**
 * Get all unique categories
 */
export function getCategories(): string[] {
  const articles = getAllArticles();
  const categories = new Set(articles.map((article) => article.category));
  return Array.from(categories);
}

/**
 * Get article metadata (without content)
 */
export function getArticleMetadata(category: string, slug: string): ArticleMetadata | null {
  const article = getArticleBySlug(category, slug);
  if (!article) return null;

  const { content, ...metadata } = article;
  return metadata;
}

/**
 * Search articles by query
 */
export function searchArticles(query: string): Article[] {
  const articles = getAllArticles();
  const lowerQuery = query.toLowerCase();

  return articles.filter((article) => {
    const searchText = [
      article.title,
      article.description,
      article.content,
      ...(article.keywords || []),
    ].join(' ').toLowerCase();

    return searchText.includes(lowerQuery);
  });
}
