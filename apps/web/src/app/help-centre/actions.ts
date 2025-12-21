/**
 * Filename: apps/web/src/app/help-centre/actions.ts
 * Purpose: Server actions for Help Centre search functionality
 * Created: 2025-01-21
 */

'use server';

import { searchArticles as searchArticlesLib, type Article } from '@/lib/help-centre/articles';

export type ArticleSearchResult = Omit<Article, 'content'>;

/**
 * Server action to search articles
 * This runs on the server and can use fs module
 */
export async function searchArticles(query: string): Promise<ArticleSearchResult[]> {
  const articles = searchArticlesLib(query);

  // Remove content to reduce payload size
  return articles.map(({ content, ...metadata }) => metadata);
}
