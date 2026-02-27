/**
 * Sage Links Module
 *
 * Provides URL reference management for Sage (similar to AI Tutor Links).
 * Allows Sage to reference external resources with priority ordering.
 */

import { createClient } from '@/utils/supabase/server';

export interface SageLink {
  id: string;
  title: string;
  url: string;
  description?: string;
  skills?: string[];
  subject?: string; // 'maths', 'english', 'science', 'general'
  level?: string; // 'foundation', 'higher', 'a-level'
  priority: number; // Lower number = higher priority
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

/**
 * Retrieve Sage links by subject and relevance
 */
export async function retrieveSageLinks(params: {
  query: string;
  subject?: string;
  level?: string;
  topK?: number;
}): Promise<SageLink[]> {
  const { query, subject, level, topK = 5 } = params;
  const supabase = await createClient();

  try {
    // Build query
    let linksQuery = supabase
      .from('sage_links')
      .select('*')
      .eq('status', 'active')
      .order('priority', { ascending: true });

    // Filter by subject if provided
    if (subject) {
      linksQuery = linksQuery.or(`subject.eq.${subject},subject.eq.general`);
    }

    // Filter by level if provided
    if (level) {
      linksQuery = linksQuery.or(`level.eq.${level},level.is.null`);
    }

    linksQuery = linksQuery.limit(topK * 2); // Get more for filtering

    const { data: links, error } = await linksQuery;

    if (error || !links || links.length === 0) {
      return [];
    }

    // Filter by keyword relevance
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const relevantLinks = links.filter(link => {
      const text = `${link.title || ''} ${link.description || ''} ${(link.skills || []).join(' ')}`.toLowerCase();
      return queryWords.some(word => text.includes(word));
    });

    // Return relevant links or top priority links
    const linksToReturn = relevantLinks.length > 0
      ? relevantLinks.slice(0, topK)
      : links.slice(0, Math.min(2, topK));

    return linksToReturn as SageLink[];
  } catch (error: any) {
    console.error('[Sage Links] Error retrieving links:', error);
    return [];
  }
}

/**
 * Add a new Sage link
 */
export async function addSageLink(link: Omit<SageLink, 'id' | 'created_at' | 'updated_at'>): Promise<SageLink | null> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('sage_links')
      .insert(link)
      .select()
      .single();

    if (error) throw error;
    return data as SageLink;
  } catch (error: any) {
    console.error('[Sage Links] Error adding link:', error);
    return null;
  }
}

/**
 * Update a Sage link
 */
export async function updateSageLink(id: string, updates: Partial<SageLink>): Promise<SageLink | null> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('sage_links')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as SageLink;
  } catch (error: any) {
    console.error('[Sage Links] Error updating link:', error);
    return null;
  }
}

/**
 * Delete a Sage link (soft delete by setting status to inactive)
 */
export async function deleteSageLink(id: string): Promise<boolean> {
  return !!(await updateSageLink(id, { status: 'inactive' }));
}

/**
 * Get all Sage links (for admin management)
 */
export async function getAllSageLinks(filters?: {
  subject?: string;
  level?: string;
  status?: 'active' | 'inactive';
}): Promise<SageLink[]> {
  const supabase = await createClient();

  try {
    let query = supabase
      .from('sage_links')
      .select('*')
      .order('priority', { ascending: true });

    if (filters?.subject) {
      query = query.eq('subject', filters.subject);
    }
    if (filters?.level) {
      query = query.eq('level', filters.level);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as SageLink[];
  } catch (error: any) {
    console.error('[Sage Links] Error getting all links:', error);
    return [];
  }
}
