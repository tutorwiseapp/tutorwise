/**
 * Marketplace Autocomplete API Route
 *
 * Multi-type suggestions: subjects, locations, tutors, listings.
 * Semantic suggestions use search_listings_semantic RPC (no JS cosine loop).
 *
 * GET /api/marketplace/autocomplete?q=gcse+mat&types=subject,location&limit=10
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/server';
import { generateEmbedding } from '@/lib/services/embeddings';

// Canonical subject list
const SUBJECTS = [
  'Mathematics', 'English Language', 'English Literature', 'Physics',
  'Chemistry', 'Biology', 'Combined Science', 'Computer Science',
  'History', 'Geography', 'French', 'Spanish', 'German',
  'Business Studies', 'Economics', 'Psychology', 'Sociology',
  'Art & Design', 'Music', 'Drama', 'Physical Education',
  'Religious Studies', 'Design & Technology',
];

const LEVELS = [
  'Primary', 'Key Stage 3', 'GCSE', 'A-Level', 'IB',
  'University', 'Adult Learning', 'Professional',
];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const types = searchParams.get('types')?.split(',') || ['subject', 'location', 'tutor', 'listing'];
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const suggestions: AutocompleteSuggestion[] = [];
    const supabase = createServiceRoleClient();

    // 1. Subject suggestions (exact and fuzzy matching)
    if (types.includes('subject')) {
      suggestions.push(...getSubjectSuggestions(query, Math.min(5, limit)));
    }

    // 2. Level suggestions
    if (types.includes('level')) {
      suggestions.push(...getLevelSuggestions(query, Math.min(3, limit)));
    }

    // 3. Location suggestions (cities)
    if (types.includes('location')) {
      const { data: locations } = await supabase
        .from('listings')
        .select('location_city')
        .not('location_city', 'is', null)
        .ilike('location_city', `%${query}%`)
        .limit(5);

      if (locations) {
        const uniqueCities = [...new Set(locations.map(l => l.location_city))];
        suggestions.push(...uniqueCities.slice(0, Math.min(5, limit)).map(city => ({
          type: 'location' as const,
          value: city,
          display: city,
          icon: '📍',
        })));
      }
    }

    // 4. Tutor name suggestions
    if (types.includes('tutor')) {
      const { data: tutors } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .ilike('full_name', `%${query}%`)
        .limit(5);

      if (tutors) {
        suggestions.push(...tutors.map(tutor => ({
          type: 'tutor' as const,
          value: tutor.id,
          display: tutor.full_name,
          icon: '👤',
          metadata: { avatar_url: tutor.avatar_url },
        })));
      }
    }

    // 5. Listing title suggestions
    if (types.includes('listing')) {
      const { data: listings } = await supabase
        .from('listings')
        .select('id, title, slug')
        .eq('status', 'published')
        .ilike('title', `%${query}%`)
        .limit(5);

      if (listings) {
        suggestions.push(...listings.map(listing => ({
          type: 'listing' as const,
          value: listing.id,
          display: listing.title,
          icon: '📚',
          metadata: { slug: listing.slug },
        })));
      }
    }

    // 6. Semantic suggestions via RPC (replaces JS cosine loop)
    if (query.length > 5) {
      try {
        const queryEmbedding = await generateEmbedding(query);
        const embeddingParam = `[${queryEmbedding.join(',')}]`;

        const { data: semanticResults } = await supabase.rpc('search_listings_semantic', {
          query_embedding: embeddingParam,
          match_count: 3,
          match_threshold: 0.5,
        });

        if (semanticResults) {
          const existingIds = new Set(suggestions.filter(s => s.type === 'listing').map(s => s.value));
          semanticResults
            .filter((r: any) => !existingIds.has(r.id))
            .forEach((listing: any) => {
              suggestions.push({
                type: 'semantic' as const,
                value: listing.id,
                display: listing.title,
                icon: '🔍',
                metadata: { subjects: listing.subjects, similarity: listing.similarity },
              });
            });
        }
      } catch (error) {
        console.error('Semantic autocomplete error:', error);
      }
    }

    // 7. Sort by relevance and deduplicate
    const uniqueSuggestions = deduplicateSuggestions(suggestions);
    const sortedSuggestions = sortByRelevance(uniqueSuggestions, query);

    return NextResponse.json({
      query,
      suggestions: sortedSuggestions.slice(0, limit),
      total: Math.min(sortedSuggestions.length, limit),
    });
  } catch (error) {
    console.error('Autocomplete error:', error);
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

interface AutocompleteSuggestion {
  type: 'subject' | 'level' | 'location' | 'tutor' | 'listing' | 'semantic';
  value: string;
  display: string;
  icon?: string;
  metadata?: any;
}

function getSubjectSuggestions(query: string, limit: number): AutocompleteSuggestion[] {
  const lowerQuery = query.toLowerCase();

  const startsWithMatch = SUBJECTS
    .filter(s => s.toLowerCase().startsWith(lowerQuery))
    .map(s => ({ type: 'subject' as const, value: s, display: s, icon: '📖' }));

  const containsMatch = SUBJECTS
    .filter(s => !s.toLowerCase().startsWith(lowerQuery) && s.toLowerCase().includes(lowerQuery))
    .map(s => ({ type: 'subject' as const, value: s, display: s, icon: '📖' }));

  const fuzzyMatch = SUBJECTS
    .filter(s => !s.toLowerCase().includes(lowerQuery) && levenshteinDistance(lowerQuery, s.toLowerCase()) <= 3)
    .map(s => ({ type: 'subject' as const, value: s, display: s, icon: '📖' }));

  return [...startsWithMatch, ...containsMatch, ...fuzzyMatch].slice(0, limit);
}

function getLevelSuggestions(query: string, limit: number): AutocompleteSuggestion[] {
  const lowerQuery = query.toLowerCase();
  return LEVELS
    .filter(l => l.toLowerCase().includes(lowerQuery))
    .slice(0, limit)
    .map(l => ({ type: 'level' as const, value: l, display: l, icon: '🎓' }));
}

function deduplicateSuggestions(suggestions: AutocompleteSuggestion[]): AutocompleteSuggestion[] {
  const seen = new Set<string>();
  return suggestions.filter(s => {
    const key = `${s.type}:${s.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortByRelevance(suggestions: AutocompleteSuggestion[], query: string): AutocompleteSuggestion[] {
  const lowerQuery = query.toLowerCase();
  const typePriority: Record<string, number> = {
    subject: 1, level: 2, listing: 3, tutor: 4, location: 5, semantic: 6,
  };

  return suggestions.sort((a, b) => {
    const aPri = typePriority[a.type] || 99;
    const bPri = typePriority[b.type] || 99;
    if (aPri !== bPri) return aPri - bPri;

    const aStarts = a.display.toLowerCase().startsWith(lowerQuery);
    const bStarts = b.display.toLowerCase().startsWith(lowerQuery);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;

    return a.display.length - b.display.length;
  });
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}
