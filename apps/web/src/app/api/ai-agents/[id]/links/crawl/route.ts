/**
 * Filename: api/ai-agents/[id]/links/crawl/route.ts
 * Purpose: Trigger crawling and indexing of agent links
 * Created: 2026-02-28
 *
 * Crawls link URLs, extracts text, chunks, embeds, and stores
 * for hybrid vector+BM25 search in Tier 2 RAG.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { indexLink } from '@/lib/ai-agents/link-indexer';

/**
 * POST /api/ai-agents/[id]/links/crawl
 * Crawl and index all pending links for an agent.
 *
 * Body: { linkId?: string } — optional specific link to crawl
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: agent } = await supabase
      .from('ai_agents')
      .select('id, owner_id')
      .eq('id', agentId)
      .single();

    if (!agent || agent.owner_id !== user.id) {
      return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const specificLinkId = body.linkId;

    // Get links to crawl
    let query = supabase
      .from('ai_agent_links')
      .select('id, url, title')
      .eq('agent_id', agentId)
      .eq('status', 'active');

    if (specificLinkId) {
      query = query.eq('id', specificLinkId);
    } else {
      query = query.in('crawl_status', ['pending', 'failed']);
    }

    const { data: links, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!links || links.length === 0) {
      return NextResponse.json({ message: 'No links to crawl', results: [] });
    }

    // Crawl and index each link
    const results = await Promise.all(
      links.map(async (link) => {
        const result = await indexLink(link.id, agentId, link.url);
        return {
          linkId: link.id,
          url: link.url,
          title: link.title,
          ...result,
        };
      })
    );

    const successCount = results.filter(r => r.success).length;
    const totalChunks = results.reduce((sum, r) => sum + r.chunksCreated, 0);

    return NextResponse.json({
      message: `Crawled ${successCount}/${results.length} links, created ${totalChunks} chunks`,
      results,
    });
  } catch (error) {
    console.error('[Link Crawl] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
