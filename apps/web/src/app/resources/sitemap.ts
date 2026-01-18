/**
 * Filename: apps/web/src/app/resources/sitemap.ts
 * Purpose: Generate dynamic sitemap for blog articles
 * Created: 2026-01-15
 */

import { MetadataRoute } from 'next';
import { createClient } from '@/utils/supabase/server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  // Fetch all published articles
  const { data: articles, error } = await supabase
    .from('blog_articles')
    .select('slug, updated_at, published_at')
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false });

  if (error || !articles) {
    console.error('Error fetching articles for sitemap:', error);
    return [];
  }

  const baseUrl = 'https://tutorwise.com';

  // Main blog pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/resources`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/resources/category/for-clients`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/resources/category/for-tutors`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/resources/category/for-agents`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/resources/category/education-insights`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/resources/category/company-news`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  // Individual article pages
  const articlePages: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${baseUrl}/resources/${article.slug}`,
    lastModified: new Date(article.updated_at),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...articlePages];
}
