/**
 * Filename: networkBoost.ts
 * Purpose: Graph-based match boosting using network connections
 * Created: 2025-12-10
 * Phase: Marketplace Phase 2 - Graph-based Match Boosting
 *
 * Features:
 * - Boost scores based on mutual connections
 * - Second-degree connection discovery
 * - Trust network amplification
 * - Collaborative filtering signals
 */

import type { MatchScore } from './matchScoring';

export interface NetworkConnection {
  id: string;
  profile_id: string;
  connected_profile_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface NetworkBoostFactors {
  directConnection: boolean;
  mutualConnectionsCount: number;
  secondDegreeConnectionsCount: number;
  sharedGroupsCount: number;
  trustScore: number; // 0-100
}

/**
 * Calculate network-based boost to match score
 *
 * Boosting logic:
 * - Direct connection: +15 points
 * - Mutual connections: +2 points per mutual (max +10)
 * - Second-degree: +1 point per connection (max +5)
 * - Shared groups: +3 points per group (max +10)
 * - Trust score: +0-5 points based on trust level
 */
export function calculateNetworkBoost(
  baseScore: MatchScore,
  factors: NetworkBoostFactors
): MatchScore {
  let boostPoints = 0;
  const reasons: string[] = [];

  // Direct connection boost
  if (factors.directConnection) {
    boostPoints += 15;
    reasons.push('Already in your network');
  }

  // Mutual connections boost
  if (factors.mutualConnectionsCount > 0) {
    const mutualBoost = Math.min(factors.mutualConnectionsCount * 2, 10);
    boostPoints += mutualBoost;
    reasons.push(`${factors.mutualConnectionsCount} mutual connection${factors.mutualConnectionsCount > 1 ? 's' : ''}`);
  }

  // Second-degree connections boost
  if (factors.secondDegreeConnectionsCount > 0) {
    const secondDegreeBoost = Math.min(factors.secondDegreeConnectionsCount * 1, 5);
    boostPoints += secondDegreeBoost;
    reasons.push(`${factors.secondDegreeConnectionsCount} connection${factors.secondDegreeConnectionsCount > 1 ? 's' : ''} of connections`);
  }

  // Shared groups boost
  if (factors.sharedGroupsCount > 0) {
    const groupBoost = Math.min(factors.sharedGroupsCount * 3, 10);
    boostPoints += groupBoost;
    reasons.push(`${factors.sharedGroupsCount} shared group${factors.sharedGroupsCount > 1 ? 's' : ''}`);
  }

  // Trust score boost (0-5 points based on 0-100 trust score)
  if (factors.trustScore > 0) {
    const trustBoost = Math.round((factors.trustScore / 100) * 5);
    boostPoints += trustBoost;
    if (trustBoost >= 3) {
      reasons.push('Highly trusted in network');
    }
  }

  // Apply boost to overall score (max 100)
  const boostedOverall = Math.min(baseScore.overall + boostPoints, 100);

  // Determine new label based on boosted score
  let label: 'excellent' | 'great' | 'good' | 'fair' | 'poor';
  if (boostedOverall >= 90) label = 'excellent';
  else if (boostedOverall >= 75) label = 'great';
  else if (boostedOverall >= 60) label = 'good';
  else if (boostedOverall >= 40) label = 'fair';
  else label = 'poor';

  return {
    overall: boostedOverall,
    breakdown: {
      ...baseScore.breakdown,
      network: boostPoints, // Add network as a new breakdown category
    },
    label,
    reasons: [...baseScore.reasons, ...reasons],
  };
}

/**
 * Fetch network boost factors for a given profile/listing
 */
export async function fetchNetworkBoostFactors(
  supabase: any,
  currentUserId: string,
  targetProfileId: string
): Promise<NetworkBoostFactors> {
  // Fetch direct connection
  const { data: directConnection } = await supabase
    .from('network_connections')
    .select('*')
    .eq('status', 'accepted')
    .or(`and(profile_id.eq.${currentUserId},connected_profile_id.eq.${targetProfileId}),and(profile_id.eq.${targetProfileId},connected_profile_id.eq.${currentUserId})`)
    .maybeSingle();

  // Fetch current user's connections
  const { data: myConnections } = await supabase
    .from('network_connections')
    .select('connected_profile_id, profile_id')
    .eq('status', 'accepted')
    .or(`profile_id.eq.${currentUserId},connected_profile_id.eq.${currentUserId}`);

  const myConnectionIds = new Set(
    (myConnections || []).map((conn: any) =>
      conn.profile_id === currentUserId ? conn.connected_profile_id : conn.profile_id
    )
  );

  // Fetch target's connections
  const { data: targetConnections } = await supabase
    .from('network_connections')
    .select('connected_profile_id, profile_id')
    .eq('status', 'accepted')
    .or(`profile_id.eq.${targetProfileId},connected_profile_id.eq.${targetProfileId}`);

  const targetConnectionIds = new Set(
    (targetConnections || []).map((conn: any) =>
      conn.profile_id === targetProfileId ? conn.connected_profile_id : conn.profile_id
    )
  );

  // Calculate mutual connections
  const mutualConnections = Array.from(myConnectionIds).filter(id =>
    targetConnectionIds.has(id)
  );

  // Calculate second-degree connections (connections of target that aren't mutual)
  const secondDegreeConnections = Array.from(targetConnectionIds).filter(
    id => !myConnectionIds.has(id) && id !== currentUserId
  );

  // Fetch shared groups
  const { data: myGroups } = await supabase
    .from('network_group_members')
    .select('group_id')
    .eq('profile_id', currentUserId);

  const { data: targetGroups } = await supabase
    .from('network_group_members')
    .select('group_id')
    .eq('profile_id', targetProfileId);

  const myGroupIds = new Set((myGroups || []).map((g: any) => g.group_id));
  const sharedGroups = (targetGroups || []).filter((g: any) =>
    myGroupIds.has(g.group_id)
  );

  // Calculate trust score (simplified: based on network size and engagement)
  const trustScore = calculateTrustScore(
    targetConnectionIds.size,
    sharedGroups.length,
    mutualConnections.length
  );

  return {
    directConnection: !!directConnection,
    mutualConnectionsCount: mutualConnections.length,
    secondDegreeConnectionsCount: Math.min(secondDegreeConnections.length, 10), // Cap for performance
    sharedGroupsCount: sharedGroups.length,
    trustScore,
  };
}

/**
 * Calculate a trust score based on network metrics
 */
function calculateTrustScore(
  connectionCount: number,
  sharedGroupCount: number,
  mutualConnectionCount: number
): number {
  // Scoring factors:
  // - Connection count: up to 40 points (1 point per connection, max 40)
  // - Shared groups: up to 30 points (10 points per group, max 30)
  // - Mutual connections: up to 30 points (3 points per mutual, max 30)

  const connectionScore = Math.min(connectionCount, 40);
  const groupScore = Math.min(sharedGroupCount * 10, 30);
  const mutualScore = Math.min(mutualConnectionCount * 3, 30);

  return connectionScore + groupScore + mutualScore;
}

/**
 * Batch fetch network boost factors for multiple profiles
 * More efficient for recommendations lists
 */
export async function batchFetchNetworkBoosts(
  supabase: any,
  currentUserId: string,
  targetProfileIds: string[]
): Promise<Map<string, NetworkBoostFactors>> {
  const results = new Map<string, NetworkBoostFactors>();

  // Fetch all in parallel for performance
  await Promise.all(
    targetProfileIds.map(async (targetId) => {
      const factors = await fetchNetworkBoostFactors(supabase, currentUserId, targetId);
      results.set(targetId, factors);
    })
  );

  return results;
}
