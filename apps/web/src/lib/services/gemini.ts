/**
 * Gemini AI Service
 * Handles natural language query parsing for marketplace search
 */

export interface ParsedSearchQuery {
  subjects?: string[];
  levels?: string[];
  location?: string;
  locationType?: 'online' | 'in_person' | 'hybrid';
  minPrice?: number;
  maxPrice?: number;
  availability?: string;
  freeTrialOnly?: boolean;
  intent: 'search' | 'browse' | 'specific_request';
  confidence: number;
  interpretedQuery: string;
}

/**
 * Parse natural language query using Gemini AI
 */
export async function parseSearchQuery(query: string): Promise<ParsedSearchQuery> {
  try {
    const response = await fetch('/api/ai/parse-query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error('Failed to parse query');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error parsing search query:', error);

    // Fallback to basic keyword extraction
    return fallbackQueryParser(query);
  }
}

/**
 * Fallback parser for when AI service is unavailable
 * Basic keyword extraction and pattern matching
 */
function fallbackQueryParser(query: string): ParsedSearchQuery {
  const lowerQuery = query.toLowerCase();

  // Extract subjects using common keywords
  const subjects: string[] = [];
  const subjectKeywords: Record<string, string> = {
    'math': 'Mathematics',
    'maths': 'Mathematics',
    'mathematics': 'Mathematics',
    'english': 'English',
    'science': 'Science',
    'physics': 'Physics',
    'chemistry': 'Chemistry',
    'biology': 'Biology',
    'history': 'History',
    'geography': 'Geography',
    'spanish': 'Languages',
    'french': 'Languages',
    'german': 'Languages',
    'music': 'Music',
    'piano': 'Music',
    'guitar': 'Music',
    'art': 'Art',
  };

  for (const [keyword, subject] of Object.entries(subjectKeywords)) {
    if (lowerQuery.includes(keyword)) {
      if (!subjects.includes(subject)) {
        subjects.push(subject);
      }
    }
  }

  // Extract levels
  const levels: string[] = [];
  const levelKeywords: Record<string, string> = {
    'gcse': 'GCSE',
    'a-level': 'A-Level',
    'a level': 'A-Level',
    'alevel': 'A-Level',
    'primary': 'Primary',
    'ks3': 'KS3',
    'university': 'University',
    'degree': 'University',
    'adult': 'Adult Learning',
  };

  for (const [keyword, level] of Object.entries(levelKeywords)) {
    if (lowerQuery.includes(keyword)) {
      if (!levels.includes(level)) {
        levels.push(level);
      }
    }
  }

  // Extract location type
  let locationType: 'online' | 'in_person' | 'hybrid' | undefined;
  if (lowerQuery.includes('online') || lowerQuery.includes('remote') || lowerQuery.includes('virtual')) {
    locationType = 'online';
  } else if (lowerQuery.includes('in person') || lowerQuery.includes('in-person') || lowerQuery.includes('face to face')) {
    locationType = 'in_person';
  } else if (lowerQuery.includes('hybrid') || lowerQuery.includes('both')) {
    locationType = 'hybrid';
  }

  // Extract location (city)
  let location: string | undefined;
  const locationPattern = /(?:in|near|around)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/;
  const locationMatch = query.match(locationPattern);
  if (locationMatch) {
    location = locationMatch[1];
  }

  // Check for free trial
  const freeTrialOnly = lowerQuery.includes('free trial') || lowerQuery.includes('trial lesson');

  // Extract price range
  let minPrice: number | undefined;
  let maxPrice: number | undefined;
  const pricePattern = /£?(\d+)\s*(?:-|to)\s*£?(\d+)/;
  const priceMatch = query.match(pricePattern);
  if (priceMatch) {
    minPrice = parseInt(priceMatch[1], 10);
    maxPrice = parseInt(priceMatch[2], 10);
  }

  return {
    subjects: subjects.length > 0 ? subjects : undefined,
    levels: levels.length > 0 ? levels : undefined,
    location,
    locationType,
    minPrice,
    maxPrice,
    freeTrialOnly,
    intent: 'search',
    confidence: 0.6, // Lower confidence for fallback parser
    interpretedQuery: query,
  };
}

/**
 * Convert parsed query to search filters
 */
export function queryToFilters(parsed: ParsedSearchQuery) {
  return {
    subjects: parsed.subjects,
    levels: parsed.levels,
    location_type: parsed.locationType,
    location_city: parsed.location,
    min_price: parsed.minPrice,
    max_price: parsed.maxPrice,
    free_trial_only: parsed.freeTrialOnly,
  };
}
