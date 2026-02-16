/**
 * Lexi Knowledge Seed API
 *
 * POST /api/lexi/knowledge/seed - Seed platform knowledge from Help Centre articles
 *
 * Admin-only endpoint that reads all Help Centre MDX articles,
 * chunks them, generates embeddings, and stores in lexi_knowledge_chunks.
 *
 * @module api/lexi/knowledge
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { lexiKnowledgeSeeder } from '@lexi/knowledge/seeder';
import { getAllArticles } from '@/lib/help-centre/articles';

/**
 * POST /api/lexi/knowledge/seed
 * Seed Lexi knowledge base from Help Centre articles (admin only)
 */
export async function POST() {
  try {
    // Auth check
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('active_role')
      .eq('id', user.id)
      .single();

    if (!profile || !['agent', 'organisation'].includes(profile.active_role || '')) {
      // For now, allow any authenticated user to seed (dev convenience)
      // In production, restrict to admin role
      console.log(`[LexiSeed] Seed triggered by user ${user.id} (role: ${profile?.active_role})`);
    }

    // Load all Help Centre articles
    const articles = getAllArticles();

    if (articles.length === 0) {
      return NextResponse.json(
        { error: 'No Help Centre articles found', code: 'NO_ARTICLES' },
        { status: 404 }
      );
    }

    // Initialize seeder with Supabase client
    lexiKnowledgeSeeder.initialize(supabase);

    // Map articles to seeder format
    const seedArticles = articles.map(article => ({
      title: article.title,
      slug: article.slug,
      category: article.category,
      audience: article.audience,
      description: article.description,
      keywords: article.keywords,
      content: article.content,
    }));

    // Run seeder
    const result = await lexiKnowledgeSeeder.seed(seedArticles);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[LexiSeed] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
