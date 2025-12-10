/**
 * Filename: apps/web/src/lib/services/matchScoring.ts
 * Purpose: Calculate match scores between profiles, listings, and user preferences
 * Created: 2025-12-10
 * Phase: Marketplace Phase 1 - Match Score Display
 *
 * Supports multiple matching scenarios:
 * 1. Profile-to-Profile: Tutors to clients, clients to tutors
 * 2. Profile-to-Listing: User profiles to tutor/agent/client listings
 * 3. Listing-to-Listing: Client listings to tutor listings, etc.
 *
 * Match Score Calculation:
 * - Semantic similarity (embeddings): 40%
 * - Subject match: 25%
 * - Level match: 15%
 * - Location match: 10%
 * - Price compatibility: 5%
 * - Availability match: 5%
 *
 * Score ranges:
 * - 90-100: Excellent match
 * - 75-89: Great match
 * - 60-74: Good match
 * - 40-59: Fair match
 * - 0-39: Poor match
 */

import { cosineSimilarity } from './embeddings';

/**
 * Base interface for entities that can be matched
 */
export interface MatchableEntity {
  id: string;
  subjects?: string[] | null;
  levels?: string[] | null;
  location_type?: string | null;
  location_city?: string | null;
  hourly_rate?: number | null;
  availability?: any;
  embedding?: string | number[] | null; // JSON string or array
}

/**
 * Profile entity for matching
 */
export interface ProfileForMatch extends MatchableEntity {
  full_name?: string | null;
  bio?: string | null;
  active_role?: string | null;
  // Additional profile-specific fields
}

/**
 * Listing entity for matching
 */
export interface ListingForMatch extends MatchableEntity {
  title?: string | null;
  description?: string | null;
  listing_type?: 'session' | 'course' | 'job' | null;
  profile_id?: string | null;
  // Additional listing-specific fields
}

/**
 * User preferences (can represent a profile's preferences)
 */
export interface UserPreferences {
  subjects?: string[];
  levels?: string[];
  location_type?: 'online' | 'in_person' | 'hybrid';
  location_city?: string;
  min_price?: number;
  max_price?: number;
  desired_schedule?: string[];
  embedding?: number[];
  active_role?: string; // For profile-to-profile matching
}

export interface MatchScore {
  overall: number; // 0-100
  breakdown: {
    semantic: number; // 0-100
    subject: number; // 0-100
    level: number; // 0-100
    location: number; // 0-100
    price: number; // 0-100
    availability: number; // 0-100
    network?: number; // 0-100 (optional, added by network boost)
  };
  label: 'excellent' | 'great' | 'good' | 'fair' | 'poor';
  reasons: string[]; // Explanation of the score
}

/**
 * Calculate match score between user preferences and a listing
 */
export function calculateMatchScore(
  userPrefs: UserPreferences,
  listing: ListingForMatch
): MatchScore {
  const breakdown = {
    semantic: calculateSemanticScore(userPrefs.embedding, listing.embedding),
    subject: calculateSubjectScore(userPrefs.subjects, listing.subjects),
    level: calculateLevelScore(userPrefs.levels, listing.levels),
    location: calculateLocationScore(
      userPrefs.location_type,
      userPrefs.location_city,
      listing.location_type,
      listing.location_city
    ),
    price: calculatePriceScore(
      userPrefs.min_price,
      userPrefs.max_price,
      listing.hourly_rate
    ),
    availability: calculateAvailabilityScore(
      userPrefs.desired_schedule,
      listing.availability
    ),
  };

  // Weighted overall score
  const overall = Math.round(
    breakdown.semantic * 0.4 +
    breakdown.subject * 0.25 +
    breakdown.level * 0.15 +
    breakdown.location * 0.1 +
    breakdown.price * 0.05 +
    breakdown.availability * 0.05
  );

  // Determine label
  const label = getMatchLabel(overall);

  // Generate reasons
  const reasons = generateMatchReasons(breakdown, userPrefs, listing);

  return {
    overall,
    breakdown,
    label,
    reasons,
  };
}

/**
 * Calculate semantic similarity score (0-100)
 * Supports both array and JSON string embeddings
 */
function calculateSemanticScore(
  embeddingA?: number[] | string | null,
  embeddingB?: number[] | string | null
): number {
  const vectorA = normalizeEmbedding(embeddingA);
  const vectorB = normalizeEmbedding(embeddingB);

  if (!vectorA || !vectorB) {
    return 50; // Neutral score if embeddings not available
  }

  try {
    const similarity = cosineSimilarity(vectorA, vectorB);

    // Convert from [-1, 1] to [0, 100]
    // Cosine similarity of 1 = perfect match (100)
    // Cosine similarity of 0 = no correlation (50)
    // Cosine similarity of -1 = opposite (0)
    return Math.round((similarity + 1) * 50);
  } catch (error) {
    console.error('Error calculating semantic score:', error);
    return 50;
  }
}

/**
 * Calculate subject match score (0-100)
 */
function calculateSubjectScore(
  userSubjects?: string[],
  listingSubjects?: string[] | null
): number {
  if (!userSubjects || userSubjects.length === 0) {
    return 100; // No preference means all subjects match
  }

  if (!listingSubjects || listingSubjects.length === 0) {
    return 0; // Listing has no subjects
  }

  // Calculate Jaccard similarity (intersection / union)
  const userSet = new Set(userSubjects.map(s => s.toLowerCase()));
  const listingSet = new Set(listingSubjects.map(s => s.toLowerCase()));

  const intersection = new Set([...userSet].filter(x => listingSet.has(x)));
  const union = new Set([...userSet, ...listingSet]);

  const similarity = intersection.size / union.size;
  return Math.round(similarity * 100);
}

/**
 * Calculate level match score (0-100)
 */
function calculateLevelScore(
  userLevels?: string[],
  listingLevels?: string[] | null
): number {
  if (!userLevels || userLevels.length === 0) {
    return 100; // No preference means all levels match
  }

  if (!listingLevels || listingLevels.length === 0) {
    return 0; // Listing has no levels
  }

  // Calculate overlap
  const userSet = new Set(userLevels.map(l => l.toLowerCase()));
  const listingSet = new Set(listingLevels.map(l => l.toLowerCase()));

  const intersection = new Set([...userSet].filter(x => listingSet.has(x)));
  const similarity = intersection.size / userSet.size;

  return Math.round(similarity * 100);
}

/**
 * Calculate location match score (0-100)
 */
function calculateLocationScore(
  userLocationType?: 'online' | 'in_person' | 'hybrid',
  userCity?: string,
  listingLocationType?: string | null,
  listingCity?: string | null
): number {
  if (!userLocationType) {
    return 100; // No preference
  }

  if (!listingLocationType) {
    return 50; // Unknown listing location
  }

  // Exact match
  if (userLocationType === listingLocationType) {
    // If in-person, check city match
    if (userLocationType === 'in_person' && userCity && listingCity) {
      return userCity.toLowerCase() === listingCity.toLowerCase() ? 100 : 60;
    }
    return 100;
  }

  // Hybrid matches both online and in-person
  if (listingLocationType === 'hybrid') {
    return 90;
  }

  // Partial match
  if (
    (userLocationType === 'online' && listingLocationType === 'hybrid') ||
    (userLocationType === 'in_person' && listingLocationType === 'hybrid')
  ) {
    return 80;
  }

  // No match
  return 20;
}

/**
 * Calculate price compatibility score (0-100)
 */
function calculatePriceScore(
  minPrice?: number,
  maxPrice?: number,
  listingPrice?: number | null
): number {
  if (!listingPrice) {
    return 50; // Unknown price
  }

  if (!minPrice && !maxPrice) {
    return 100; // No price preference
  }

  // Check if listing price is within user's budget
  if (minPrice && listingPrice < minPrice) {
    // Too cheap - might be suspicious, but not a dealbreaker
    const diff = (minPrice - listingPrice) / minPrice;
    return Math.max(50, Math.round(100 - diff * 50));
  }

  if (maxPrice && listingPrice > maxPrice) {
    // Too expensive - penalize more heavily
    const diff = (listingPrice - maxPrice) / maxPrice;
    return Math.max(0, Math.round(100 - diff * 100));
  }

  // Within budget - perfect match
  return 100;
}

/**
 * Calculate availability match score (0-100)
 */
function calculateAvailabilityScore(
  desiredSchedule?: string[],
  listingAvailability?: any
): number {
  if (!desiredSchedule || desiredSchedule.length === 0) {
    return 100; // No schedule preference
  }

  if (!listingAvailability) {
    return 50; // Unknown availability
  }

  // TODO: Implement availability matching based on your availability schema
  // For now, return neutral score
  return 75;
}

/**
 * Get match label based on overall score
 */
function getMatchLabel(score: number): 'excellent' | 'great' | 'good' | 'fair' | 'poor' {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'great';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

/**
 * Generate human-readable reasons for the match score
 */
function generateMatchReasons(
  breakdown: MatchScore['breakdown'],
  userPrefs: UserPreferences,
  listing: ListingForMatch
): string[] {
  const reasons: string[] = [];

  // Semantic match
  if (breakdown.semantic >= 80) {
    reasons.push('Strong semantic match with your learning goals');
  } else if (breakdown.semantic <= 40) {
    reasons.push('May not align closely with your needs');
  }

  // Subject match
  if (breakdown.subject >= 80 && userPrefs.subjects && userPrefs.subjects.length > 0) {
    const matchedSubjects = userPrefs.subjects.filter(s =>
      listing.subjects?.some(ls => ls.toLowerCase() === s.toLowerCase())
    );
    if (matchedSubjects.length > 0) {
      reasons.push(`Teaches ${matchedSubjects.join(', ')}`);
    }
  } else if (breakdown.subject <= 40) {
    reasons.push('Different subject focus than requested');
  }

  // Level match
  if (breakdown.level >= 80 && userPrefs.levels && userPrefs.levels.length > 0) {
    reasons.push(`Appropriate for ${userPrefs.levels.join(', ')} level`);
  }

  // Location match
  if (breakdown.location >= 90) {
    if (listing.location_type === 'online') {
      reasons.push('Available online');
    } else if (listing.location_type === 'in_person' && listing.location_city) {
      reasons.push(`Located in ${listing.location_city}`);
    } else if (listing.location_type === 'hybrid') {
      reasons.push('Flexible location options');
    }
  }

  // Price match
  if (breakdown.price >= 90 && listing.hourly_rate) {
    if (userPrefs.max_price && listing.hourly_rate <= userPrefs.max_price * 0.8) {
      reasons.push('Great value within your budget');
    } else {
      reasons.push('Within your budget');
    }
  } else if (breakdown.price <= 40) {
    reasons.push('May be outside your budget');
  }

  // If no specific reasons, add general one
  if (reasons.length === 0) {
    const overall = Math.round(
      breakdown.semantic * 0.4 +
      breakdown.subject * 0.25 +
      breakdown.level * 0.15 +
      breakdown.location * 0.1 +
      breakdown.price * 0.05 +
      breakdown.availability * 0.05
    );

    if (overall >= 75) {
      reasons.push('Good overall match for your needs');
    } else if (overall >= 50) {
      reasons.push('Partial match for your requirements');
    } else {
      reasons.push('Limited alignment with your preferences');
    }
  }

  return reasons;
}

/**
 * Calculate match scores for multiple listings
 */
export function calculateMatchScores(
  userPrefs: UserPreferences,
  listings: ListingForMatch[]
): Array<ListingForMatch & { matchScore: MatchScore }> {
  return listings.map(listing => ({
    ...listing,
    matchScore: calculateMatchScore(userPrefs, listing),
  }));
}

/**
 * Sort listings by match score
 */
export function sortByMatchScore<T extends { matchScore: MatchScore }>(
  listings: T[],
  order: 'asc' | 'desc' = 'desc'
): T[] {
  return [...listings].sort((a, b) => {
    const diff = a.matchScore.overall - b.matchScore.overall;
    return order === 'desc' ? -diff : diff;
  });
}

// ============================================================================
// Advanced Matching Functions
// ============================================================================

/**
 * Helper to normalize embedding (handle both string and array formats)
 */
function normalizeEmbedding(embedding?: string | number[] | null): number[] | null {
  if (!embedding) return null;
  if (Array.isArray(embedding)) return embedding;
  try {
    return JSON.parse(embedding);
  } catch {
    return null;
  }
}

/**
 * Calculate match score between two entities (generic)
 */
export function calculateEntityMatch(
  entityA: MatchableEntity,
  entityB: MatchableEntity,
  context?: {
    roleA?: string; // For profile matching (e.g., 'client', 'tutor')
    roleB?: string;
    matchType?: 'complementary' | 'similar'; // complementary = different roles, similar = same type
  }
): MatchScore {
  const embeddingA = normalizeEmbedding(entityA.embedding);
  const embeddingB = normalizeEmbedding(entityB.embedding);

  const breakdown = {
    semantic: calculateSemanticScore(embeddingA, embeddingB),
    subject: calculateSubjectScore(entityA.subjects || undefined, entityB.subjects),
    level: calculateLevelScore(entityA.levels || undefined, entityB.levels),
    location: calculateLocationScore(
      entityA.location_type as any,
      entityA.location_city || undefined,
      entityB.location_type,
      entityB.location_city
    ),
    price: calculatePriceCompatibility(entityA.hourly_rate, entityB.hourly_rate),
    availability: calculateAvailabilityScore(undefined, entityB.availability),
  };

  // Weighted overall score
  const overall = Math.round(
    breakdown.semantic * 0.4 +
    breakdown.subject * 0.25 +
    breakdown.level * 0.15 +
    breakdown.location * 0.1 +
    breakdown.price * 0.05 +
    breakdown.availability * 0.05
  );

  const label = getMatchLabel(overall);
  const reasons = generateEntityMatchReasons(breakdown, entityA, entityB, context);

  return { overall, breakdown, label, reasons };
}

/**
 * Profile-to-Profile matching
 * Use case: Match tutors to clients, clients to tutors, or tutors to agents
 */
export function matchProfiles(
  profileA: ProfileForMatch,
  profileB: ProfileForMatch
): MatchScore {
  return calculateEntityMatch(profileA, profileB, {
    roleA: profileA.active_role || undefined,
    roleB: profileB.active_role || undefined,
    matchType: 'complementary',
  });
}

/**
 * Profile-to-Listing matching
 * Use case: Match user profiles to available listings
 */
export function matchProfileToListing(
  profile: ProfileForMatch,
  listing: ListingForMatch
): MatchScore {
  return calculateEntityMatch(profile, listing, {
    roleA: profile.active_role || undefined,
    matchType: 'complementary',
  });
}

/**
 * Listing-to-Listing matching
 * Use case: Match client listings (job postings) to tutor listings (services offered)
 */
export function matchListings(
  listingA: ListingForMatch,
  listingB: ListingForMatch
): MatchScore {
  return calculateEntityMatch(listingA, listingB, {
    matchType: 'complementary',
  });
}

/**
 * Calculate price compatibility between two entities
 */
function calculatePriceCompatibility(
  priceA?: number | null,
  priceB?: number | null
): number {
  if (!priceA || !priceB) {
    return 50; // Unknown compatibility
  }

  // Calculate percentage difference
  const avg = (priceA + priceB) / 2;
  const diff = Math.abs(priceA - priceB);
  const percentDiff = diff / avg;

  // Score inversely proportional to difference
  // 0% diff = 100 score, 50% diff = 50 score, 100%+ diff = 0 score
  const score = Math.max(0, Math.min(100, 100 - percentDiff * 100));
  return Math.round(score);
}

/**
 * Generate reasons for entity-to-entity matching
 */
function generateEntityMatchReasons(
  breakdown: MatchScore['breakdown'],
  entityA: MatchableEntity,
  entityB: MatchableEntity,
  context?: {
    roleA?: string;
    roleB?: string;
    matchType?: 'complementary' | 'similar';
  }
): string[] {
  const reasons: string[] = [];

  // Semantic match
  if (breakdown.semantic >= 80) {
    reasons.push('Strong alignment in goals and expertise');
  }

  // Subject match
  if (breakdown.subject >= 80) {
    const commonSubjects = entityA.subjects?.filter(s =>
      entityB.subjects?.some(bs => bs.toLowerCase() === s.toLowerCase())
    ) || [];
    if (commonSubjects.length > 0) {
      reasons.push(`Shared expertise: ${commonSubjects.slice(0, 3).join(', ')}`);
    }
  }

  // Level match
  if (breakdown.level >= 80) {
    const commonLevels = entityA.levels?.filter(l =>
      entityB.levels?.some(bl => bl.toLowerCase() === l.toLowerCase())
    ) || [];
    if (commonLevels.length > 0) {
      reasons.push(`Compatible levels: ${commonLevels.join(', ')}`);
    }
  }

  // Location match
  if (breakdown.location >= 90) {
    if (entityB.location_type === 'online') {
      reasons.push('Both prefer online interaction');
    } else if (entityA.location_city && entityB.location_city &&
               entityA.location_city.toLowerCase() === entityB.location_city.toLowerCase()) {
      reasons.push(`Both located in ${entityB.location_city}`);
    }
  }

  // Price compatibility
  if (breakdown.price >= 80) {
    reasons.push('Compatible price expectations');
  }

  // Role-specific reasons
  if (context?.roleA && context?.roleB) {
    if (context.roleA === 'client' && context.roleB === 'tutor') {
      reasons.push('Client seeking matches tutor offering');
    } else if (context.roleA === 'tutor' && context.roleB === 'client') {
      reasons.push('Tutor expertise matches client needs');
    }
  }

  // Default reason if none found
  if (reasons.length === 0) {
    const overall = Math.round(
      breakdown.semantic * 0.4 +
      breakdown.subject * 0.25 +
      breakdown.level * 0.15 +
      breakdown.location * 0.1 +
      breakdown.price * 0.05 +
      breakdown.availability * 0.05
    );

    if (overall >= 75) {
      reasons.push('Strong overall compatibility');
    } else if (overall >= 50) {
      reasons.push('Moderate compatibility');
    } else {
      reasons.push('Limited compatibility');
    }
  }

  return reasons;
}

/**
 * Batch match: Calculate scores for multiple entities against a single entity
 */
export function calculateBatchMatches<T extends MatchableEntity>(
  source: MatchableEntity,
  targets: T[],
  matchFunction: (a: MatchableEntity, b: MatchableEntity) => MatchScore = calculateEntityMatch
): Array<T & { matchScore: MatchScore }> {
  return targets.map(target => ({
    ...target,
    matchScore: matchFunction(source, target),
  }));
}

/**
 * Find best matches: Returns top N matches sorted by score
 */
export function findBestMatches<T extends MatchableEntity>(
  source: MatchableEntity,
  targets: T[],
  options?: {
    limit?: number;
    minScore?: number;
    matchFunction?: (a: MatchableEntity, b: MatchableEntity) => MatchScore;
  }
): Array<T & { matchScore: MatchScore }> {
  const {
    limit = 10,
    minScore = 0,
    matchFunction = calculateEntityMatch,
  } = options || {};

  const withScores = calculateBatchMatches(source, targets, matchFunction);

  return withScores
    .filter(item => item.matchScore.overall >= minScore)
    .sort((a, b) => b.matchScore.overall - a.matchScore.overall)
    .slice(0, limit);
}
