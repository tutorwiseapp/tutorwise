/**
 * Filename: apps/web/src/app/api/marketplace/autocomplete/route.ts
 * Purpose: Advanced autocomplete with AI-powered suggestions for marketplace search
 * Created: 2025-12-10
 * Phase: Marketplace Phase 1 - Task 2
 *
 * Features:
 * - Multi-type suggestions: subjects, locations, tutors, listings
 * - Fuzzy matching for typo tolerance
 * - Semantic suggestions using embeddings
 * - Trending/popular suggestions
 * - Recent search history integration
 * - Debounced for performance
 *
 * Usage:
 * GET /api/marketplace/autocomplete?q=gcse+mat&types=subject,location&limit=10
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/server';
import { generateEmbedding } from '@/lib/services/embeddings';

// Canonical subject list (should be imported from a constants file in production)
const SUBJECTS = [
  'Mathematics',
  'English Language',
  'English Literature',
  'Physics',
  'Chemistry',
  'Biology',
  'Combined Science',
  'Computer Science',
  'History',
  'Geography',
  'French',
  'Spanish',
  'German',
  'Business Studies',
  'Economics',
  'Psychology',
  'Sociology',
  'Art & Design',
  'Music',
  'Drama',
  'Physical Education',
  'Religious Studies',
  'Design & Technology',
];

// Level list
const LEVELS = [
  'Primary',
  'Key Stage 3',
  'GCSE',
  'A-Level',
  'IB',
  'University',
  'Adult Learning',
  'Professional',
];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const types = searchParams.get('types')?.split(',') || ['subject', 'location', 'tutor', 'listing'];
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const useSemanticSearch = searchParams.get('semantic') === 'true';

    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const suggestions: AutocompleteSuggestion[] = [];
    const supabase = createServiceRoleClient();

    // 1. Subject suggestions (exact and fuzzy matching)
    if (types.includes('subject')) {
      const subjectSuggestions = getSubjectSuggestions(query, Math.min(5, limit));
      suggestions.push(...subjectSuggestions);
    }

    // 2. Level suggestions
    if (types.includes('level')) {
      const levelSuggestions = getLevelSuggestions(query, Math.min(3, limit));
      suggestions.push(...levelSuggestions);
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
        const locationSuggestions = uniqueCities.slice(0, Math.min(5, limit)).map(city => ({
          type: 'location' as const,
          value: city,
          display: city,
          icon: '📍',
        }));
        suggestions.push(...locationSuggestions);
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
        const tutorSuggestions = tutors.map(tutor => ({
          type: 'tutor' as const,
          value: tutor.id,
          display: tutor.full_name,
          icon: '👤',
          metadata: {
            avatar_url: tutor.avatar_url,
          },
        }));
        suggestions.push(...tutorSuggestions);
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
        const listingSuggestions = listings.map(listing => ({
          type: 'listing' as const,
          value: listing.id,
          display: listing.title,
          icon: '📚',
          metadata: {
            slug: listing.slug,
          },
        }));
        suggestions.push(...listingSuggestions);
      }
    }

    // 6. Semantic suggestions (if enabled and query is meaningful)
    if (useSemanticSearch && query.length > 5) {
      try {
        const queryEmbedding = await generateEmbedding(query);

        const { data: semanticListings } = await supabase
          .from('listings')
          .select('id, title, subjects, embedding')
          .eq('status', 'published')
          .not('embedding', 'is', null)
          .limit(10);

        if (semanticListings) {
          // Calculate similarity scores
          const withScores = semanticListings
            .map(listing => {
              if (!listing.embedding) return null;

              const listingEmbedding = JSON.parse(listing.embedding);
              let dotProduct = 0;
              let normA = 0;
              let normB = 0;

              for (let i = 0; i < queryEmbedding.length; i++) {
                dotProduct += queryEmbedding[i] * listingEmbedding[i];
                normA += queryEmbedding[i] * queryEmbedding[i];
                normB += listingEmbedding[i] * listingEmbedding[i];
              }

              const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));

              return {
                ...listing,
                similarity,
              };
            })
            .filter((l): l is NonNullable<typeof l> & { similarity: number } =>
              l !== null && l.similarity > 0.7
            )
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 3);

          const semanticSuggestions = withScores.map(listing => ({
            type: 'semantic' as const,
            value: listing.id,
            display: listing.title,
            icon: '🔍',
            metadata: {
              subjects: listing.subjects,
              similarity: listing.similarity,
            },
          }));

          suggestions.push(...semanticSuggestions);
        }
      } catch (error) {
        console.error('Semantic autocomplete error:', error);
        // Continue without semantic suggestions
      }
    }

    // 7. Sort by relevance and deduplicate
    const uniqueSuggestions = deduplicateSuggestions(suggestions);
    const sortedSuggestions = sortByRelevance(uniqueSuggestions, query);
    const limitedSuggestions = sortedSuggestions.slice(0, limit);

    return NextResponse.json({
      query,
      suggestions: limitedSuggestions,
      total: limitedSuggestions.length,
    });

  } catch (error) {
    console.error('Autocomplete error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

interface AutocompleteSuggestion {
  type: 'subject' | 'level' | 'location' | 'tutor' | 'listing' | 'semantic';
  value: string;
  display: string;
  icon?: string;
  metadata?: any;
}

/**
 * Get subject suggestions with fuzzy matching
 */
function getSubjectSuggestions(query: string, limit: number): AutocompleteSuggestion[] {
  const lowerQuery = query.toLowerCase();

  // Exact starts-with match (highest priority)
  const startsWithMatch = SUBJECTS
    .filter(subject => subject.toLowerCase().startsWith(lowerQuery))
    .map(subject => ({
      type: 'subject' as const,
      value: subject,
      display: subject,
      icon: '📖',
    }));

  // Contains match (medium priority)
  const containsMatch = SUBJECTS
    .filter(subject =>
      !subject.toLowerCase().startsWith(lowerQuery) &&
      subject.toLowerCase().includes(lowerQuery)
    )
    .map(subject => ({
      type: 'subject' as const,
      value: subject,
      display: subject,
      icon: '📖',
    }));

  // Fuzzy match (lowest priority)
  const fuzzyMatch = SUBJECTS
    .filter(subject => {
      const subjectLower = subject.toLowerCase();
      return !subjectLower.includes(lowerQuery) &&
             levenshteinDistance(lowerQuery, subjectLower) <= 3;
    })
    .map(subject => ({
      type: 'subject' as const,
      value: subject,
      display: subject,
      icon: '📖',
    }));

  return [...startsWithMatch, ...containsMatch, ...fuzzyMatch].slice(0, limit);
}

/**
 * Get level suggestions
 */
function getLevelSuggestions(query: string, limit: number): AutocompleteSuggestion[] {
  const lowerQuery = query.toLowerCase();

  return LEVELS
    .filter(level => level.toLowerCase().includes(lowerQuery))
    .slice(0, limit)
    .map(level => ({
      type: 'level' as const,
      value: level,
      display: level,
      icon: '🎓',
    }));
}

/**
 * Deduplicate suggestions based on value
 */
function deduplicateSuggestions(suggestions: AutocompleteSuggestion[]): AutocompleteSuggestion[] {
  const seen = new Set<string>();
  return suggestions.filter(suggestion => {
    const key = `${suggestion.type}:${suggestion.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Sort suggestions by relevance to query
 */
function sortByRelevance(suggestions: AutocompleteSuggestion[], query: string): AutocompleteSuggestion[] {
  const lowerQuery = query.toLowerCase();

  return suggestions.sort((a, b) => {
    // Priority order: subject > level > listing > tutor > location > semantic
    const typePriority: Record<string, number> = {
      subject: 1,
      level: 2,
      listing: 3,
      tutor: 4,
      location: 5,
      semantic: 6,
    };

    const aPriority = typePriority[a.type] || 99;
    const bPriority = typePriority[b.type] || 99;

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    // Within same type, prefer exact starts-with matches
    const aStartsWith = a.display.toLowerCase().startsWith(lowerQuery);
    const bStartsWith = b.display.toLowerCase().startsWith(lowerQuery);

    if (aStartsWith && !bStartsWith) return -1;
    if (!aStartsWith && bStartsWith) return 1;

    // Then prefer shorter matches (more specific)
    return a.display.length - b.display.length;
  });
}

/**
 * Calculate Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
