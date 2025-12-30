/**
 * Filename: src/services/seo/internal-linking.ts
 * Purpose: Intelligent internal linking suggestions
 * Created: 2025-12-29
 *
 * Analyzes content and suggests relevant internal links
 * Identifies orphaned pages and link distribution issues
 */

import { createClient } from '@/utils/supabase/server';

interface InternalLinkSuggestion {
  targetId: string;
  targetTitle: string;
  targetUrl: string;
  targetType: 'hub' | 'spoke';
  relevanceScore: number;
  suggestedAnchor: string;
  reason: string;
}

interface OrphanedPage {
  id: string;
  title: string;
  url: string;
  type: 'hub' | 'spoke';
  createdAt: string;
}

/**
 * Calculate text similarity using simple keyword overlap
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const words2 = text2.toLowerCase().split(/\s+/).filter((w) => w.length > 3);

  const set1 = new Set(words1);
  const set2 = new Set(words2);

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Extract keywords from content (simple TF-IDF approximation)
 */
function extractKeywords(content: string, topN: number = 10): string[] {
  const stopWords = new Set([
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
    'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
    'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
    'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
  ]);

  const words = content
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w));

  // Count word frequency
  const freq: Record<string, number> = {};
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1;
  }

  // Sort by frequency and take top N
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);
}

/**
 * Get linking suggestions for a hub or spoke
 */
export async function getLinkingSuggestions(
  contentId: string,
  contentType: 'hub' | 'spoke',
  currentContent: string,
  currentTitle: string,
  maxSuggestions: number = 5
): Promise<InternalLinkSuggestion[]> {
  const supabase = await createClient();

  // Extract keywords from current content
  const keywords = extractKeywords(currentContent, 20);

  // Get all other published hubs and spokes
  const { data: hubs } = await supabase
    .from('seo_hubs')
    .select('id, title, slug, content')
    .eq('status', 'published')
    .neq('id', contentType === 'hub' ? contentId : 'never-match');

  const { data: spokes } = await supabase
    .from('seo_spokes')
    .select('id, title, slug, content, hub_id')
    .eq('status', 'published')
    .neq('id', contentType === 'spoke' ? contentId : 'never-match');

  const suggestions: InternalLinkSuggestion[] = [];

  // Analyze hubs
  if (hubs) {
    for (const hub of hubs) {
      const similarity = calculateSimilarity(currentContent, hub.content || '');

      if (similarity > 0.05) {
        // At least 5% similarity
        // Find best matching keyword for anchor text
        const hubKeywords = extractKeywords(hub.content || '', 10);
        const commonKeywords = keywords.filter((kw) => hubKeywords.includes(kw));
        const suggestedAnchor = commonKeywords[0] || hub.title;

        suggestions.push({
          targetId: hub.id,
          targetTitle: hub.title,
          targetUrl: `/guides/${hub.slug}`,
          targetType: 'hub',
          relevanceScore: Math.round(similarity * 100),
          suggestedAnchor,
          reason: `Content similarity: ${Math.round(similarity * 100)}%`,
        });
      }
    }
  }

  // Analyze spokes
  if (spokes) {
    for (const spoke of spokes) {
      const similarity = calculateSimilarity(currentContent, spoke.content || '');

      if (similarity > 0.05) {
        // Find best matching keyword
        const spokeKeywords = extractKeywords(spoke.content || '', 10);
        const commonKeywords = keywords.filter((kw) => spokeKeywords.includes(kw));
        const suggestedAnchor = commonKeywords[0] || spoke.title;

        // Get hub slug for URL
        const { data: hubData } = await supabase
          .from('seo_hubs')
          .select('slug')
          .eq('id', spoke.hub_id)
          .single();

        suggestions.push({
          targetId: spoke.id,
          targetTitle: spoke.title,
          targetUrl: `/guides/${hubData?.slug}/${spoke.slug}`,
          targetType: 'spoke',
          relevanceScore: Math.round(similarity * 100),
          suggestedAnchor,
          reason: `Content similarity: ${Math.round(similarity * 100)}%`,
        });
      }
    }
  }

  // Sort by relevance and return top N
  return suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, maxSuggestions);
}

/**
 * Find orphaned pages (no incoming internal links)
 */
export async function findOrphanedPages(): Promise<OrphanedPage[]> {
  const supabase = await createClient();

  const orphans: OrphanedPage[] = [];

  // Get all published hubs
  const { data: hubs } = await supabase
    .from('seo_hubs')
    .select('id, title, slug, created_at, content')
    .eq('status', 'published');

  // Get all published spokes
  const { data: spokes } = await supabase
    .from('seo_spokes')
    .select('id, title, slug, created_at, hub_id, content')
    .eq('status', 'published');

  // Check each hub for incoming links
  if (hubs) {
    for (const hub of hubs) {
      const hubUrl = `/guides/${hub.slug}`;
      let hasIncomingLinks = false;

      // Check all other hubs for links to this hub
      for (const otherHub of hubs) {
        if (otherHub.id !== hub.id && otherHub.content?.includes(hubUrl)) {
          hasIncomingLinks = true;
          break;
        }
      }

      // Check spokes for links to this hub
      if (!hasIncomingLinks && spokes) {
        for (const spoke of spokes) {
          if (spoke.content?.includes(hubUrl)) {
            hasIncomingLinks = true;
            break;
          }
        }
      }

      if (!hasIncomingLinks) {
        orphans.push({
          id: hub.id,
          title: hub.title,
          url: hubUrl,
          type: 'hub',
          createdAt: hub.created_at,
        });
      }
    }
  }

  // Check each spoke for incoming links
  if (spokes) {
    for (const spoke of spokes) {
      // Get hub slug
      const { data: hubData } = await supabase
        .from('seo_hubs')
        .select('slug')
        .eq('id', spoke.hub_id)
        .single();

      const spokeUrl = `/guides/${hubData?.slug}/${spoke.slug}`;
      let hasIncomingLinks = false;

      // Check hubs for links to this spoke
      if (hubs) {
        for (const hub of hubs) {
          if (hub.content?.includes(spokeUrl)) {
            hasIncomingLinks = true;
            break;
          }
        }
      }

      // Check other spokes for links
      for (const otherSpoke of spokes) {
        if (otherSpoke.id !== spoke.id && otherSpoke.content?.includes(spokeUrl)) {
          hasIncomingLinks = true;
          break;
        }
      }

      if (!hasIncomingLinks) {
        orphans.push({
          id: spoke.id,
          title: spoke.title,
          url: spokeUrl,
          type: 'spoke',
          createdAt: spoke.created_at,
        });
      }
    }
  }

  return orphans.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Get internal link distribution stats
 */
export async function getInternalLinkStats(): Promise<{
  totalHubs: number;
  totalSpokes: number;
  avgLinksPerHub: number;
  avgLinksPerSpoke: number;
  orphanedPages: number;
  wellLinkedPages: number;
}> {
  const supabase = await createClient();

  const { data: hubs } = await supabase
    .from('seo_hubs')
    .select('id, content, internal_links_count')
    .eq('status', 'published');

  const { data: spokes } = await supabase
    .from('seo_spokes')
    .select('id, content, internal_links_count')
    .eq('status', 'published');

  const totalHubs = hubs?.length || 0;
  const totalSpokes = spokes?.length || 0;

  const avgLinksPerHub =
    totalHubs > 0
      ? Math.round(hubs!.reduce((sum, h) => sum + (h.internal_links_count || 0), 0) / totalHubs)
      : 0;

  const avgLinksPerSpoke =
    totalSpokes > 0
      ? Math.round(spokes!.reduce((sum, s) => sum + (s.internal_links_count || 0), 0) / totalSpokes)
      : 0;

  const orphans = await findOrphanedPages();
  const orphanedPages = orphans.length;

  const wellLinkedPages =
    (hubs?.filter((h) => (h.internal_links_count || 0) >= 3).length || 0) +
    (spokes?.filter((s) => (s.internal_links_count || 0) >= 3).length || 0);

  return {
    totalHubs,
    totalSpokes,
    avgLinksPerHub,
    avgLinksPerSpoke,
    orphanedPages,
    wellLinkedPages,
  };
}
