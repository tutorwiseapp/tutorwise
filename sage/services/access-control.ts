/**
 * Sage Access Control Service
 *
 * Manages knowledge access permissions based on user role
 * and relationships (tutor-student, parent-child).
 *
 * @module sage/services
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { SagePersona } from '../types';
import type { KnowledgeSource } from '../context';

// --- Access Control Types ---

export interface UserRelationship {
  sourceUserId: string;
  targetUserId: string;
  relationshipType: 'TUTOR' | 'AGENT' | 'GUARDIAN' | 'STUDENT';
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE';
}

export interface AccessDecision {
  allowed: boolean;
  reason?: string;
  sources: KnowledgeSource[];
}

// --- Access Control Service ---

export class AccessControlService {
  private supabase: SupabaseClient | null = null;

  /**
   * Initialize with Supabase client.
   */
  initialize(supabaseClient?: SupabaseClient): void {
    if (supabaseClient) {
      this.supabase = supabaseClient;
    } else {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (url && key) {
        this.supabase = createClient(url, key);
      }
    }
  }

  /**
   * Get knowledge sources accessible to a user based on their role
   * and relationships.
   */
  async getAccessibleSources(
    userId: string,
    persona: SagePersona
  ): Promise<KnowledgeSource[]> {
    const sources: KnowledgeSource[] = [];

    // Priority 1: User's own uploads (always accessible)
    sources.push({
      type: 'user_upload',
      namespace: `users/${userId}`,
      priority: 1,
      ownerId: userId,
    });

    // Priority 2: Shared content based on relationships
    const sharedSources = await this.getSharedSources(userId, persona);
    sources.push(...sharedSources);

    // Priority 3: Global resources (always accessible)
    sources.push({
      type: 'global',
      namespace: 'global',
      priority: 3,
    });

    return sources;
  }

  /**
   * Get shared knowledge sources based on relationships.
   */
  private async getSharedSources(
    userId: string,
    persona: SagePersona
  ): Promise<KnowledgeSource[]> {
    const sources: KnowledgeSource[] = [];

    if (!this.supabase) return sources;

    // Get active relationships
    const relationships = await this.getActiveRelationships(userId);

    for (const rel of relationships) {
      // Determine who's sharing with whom
      let sharedByUserId: string | null = null;

      if (persona === 'student') {
        // Students can access content shared by their tutors/agents
        if (rel.relationshipType === 'TUTOR' || rel.relationshipType === 'AGENT') {
          sharedByUserId = rel.sourceUserId;
        }
      } else if (persona === 'client') {
        // Clients can access content shared with their children's tutors
        if (rel.relationshipType === 'GUARDIAN') {
          // Get the child's tutor relationships
          const childTutors = await this.getActiveRelationships(rel.targetUserId);
          for (const tutorRel of childTutors) {
            if (tutorRel.relationshipType === 'TUTOR' || tutorRel.relationshipType === 'AGENT') {
              sources.push({
                type: 'shared',
                namespace: `shared/${tutorRel.sourceUserId}`,
                priority: 2,
                ownerId: tutorRel.sourceUserId,
              });
            }
          }
        }
      } else if (persona === 'tutor' || persona === 'agent') {
        // Tutors/Agents can access content they've shared (for review)
        // They can also see their students' uploaded homework
        if (rel.relationshipType === 'TUTOR' || rel.relationshipType === 'AGENT') {
          // Student's uploads (with permission)
          sources.push({
            type: 'shared',
            namespace: `users/${rel.targetUserId}`,
            priority: 2,
            ownerId: rel.targetUserId,
          });
        }
      }

      if (sharedByUserId) {
        sources.push({
          type: 'shared',
          namespace: `shared/${sharedByUserId}`,
          priority: 2,
          ownerId: sharedByUserId,
        });
      }
    }

    return sources;
  }

  /**
   * Get active relationships for a user.
   */
  async getActiveRelationships(userId: string): Promise<UserRelationship[]> {
    if (!this.supabase) return [];

    // Get relationships where user is either source or target
    const { data, error } = await this.supabase
      .from('profile_graph')
      .select('source_profile_id, target_profile_id, relationship_type, status')
      .or(`source_profile_id.eq.${userId},target_profile_id.eq.${userId}`)
      .eq('status', 'ACTIVE');

    if (error || !data) return [];

    return data.map(row => ({
      sourceUserId: row.source_profile_id,
      targetUserId: row.target_profile_id,
      relationshipType: row.relationship_type,
      status: row.status,
    }));
  }

  /**
   * Check if a user can access a specific namespace.
   */
  async canAccessNamespace(
    userId: string,
    persona: SagePersona,
    namespace: string
  ): Promise<AccessDecision> {
    const sources = await this.getAccessibleSources(userId, persona);

    const matchingSource = sources.find(s => s.namespace === namespace);

    if (matchingSource) {
      return {
        allowed: true,
        sources: [matchingSource],
      };
    }

    return {
      allowed: false,
      reason: 'No access to this namespace',
      sources: [],
    };
  }

  /**
   * Check if user can share content with another user.
   */
  async canShareWith(
    ownerId: string,
    ownerPersona: SagePersona,
    targetUserId: string
  ): Promise<boolean> {
    // Only tutors and agents can share
    if (ownerPersona !== 'tutor' && ownerPersona !== 'agent') {
      return false;
    }

    // Check if there's an active relationship
    const relationships = await this.getActiveRelationships(ownerId);

    return relationships.some(
      rel =>
        rel.targetUserId === targetUserId &&
        (rel.relationshipType === 'TUTOR' || rel.relationshipType === 'AGENT')
    );
  }

  /**
   * Get list of users that content can be shared with.
   */
  async getShareableUsers(
    ownerId: string,
    ownerPersona: SagePersona
  ): Promise<{ userId: string; name?: string }[]> {
    if (ownerPersona !== 'tutor' && ownerPersona !== 'agent') {
      return [];
    }

    const relationships = await this.getActiveRelationships(ownerId);

    // Filter to students/clients linked to this tutor
    const shareableUserIds = relationships
      .filter(
        rel =>
          rel.sourceUserId === ownerId &&
          (rel.relationshipType === 'TUTOR' || rel.relationshipType === 'AGENT')
      )
      .map(rel => rel.targetUserId);

    // Get user details (simplified - just return IDs for now)
    return shareableUserIds.map(userId => ({ userId }));
  }
}

// --- Singleton Export ---

export const accessControl = new AccessControlService();

export default AccessControlService;
