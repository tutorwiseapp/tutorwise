/**
 * Filename: wiselists.ts
 * Purpose: API utilities for Wiselists (v5.7)
 * Created: 2025-11-15
 */

import { createClient } from '@/utils/supabase/client';
import type {
  Wiselist,
  WiselistItem,
  WiselistCollaborator,
  WiselistWithDetails,
  WiselistVisibility,
  WiselistRole,
} from '@/types';

/**
 * Get all wiselists for the current user (owned + collaborated)
 * Returns wiselists with is_owner flag for [My Lists] / [Shared With Me] filtering
 */
export async function getMyWiselists(): Promise<Wiselist[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get owned lists
  const { data: ownedLists, error: ownedError } = await supabase
    .from('wiselists')
    .select('*, owner:profiles!profile_id(id, full_name, avatar_url)')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false });

  if (ownedError) throw ownedError;

  // Get collaborated lists
  const { data: collaboratedLists, error: collabError } = await supabase
    .from('wiselist_collaborators')
    .select(`
      wiselists:wiselist_id (
        *,
        owner:profiles!profile_id(id, full_name, avatar_url)
      )
    `)
    .eq('profile_id', user.id);

  if (collabError) throw collabError;

  // Mark owned lists with is_owner flag
  const ownedListsWithFlag = (ownedLists || []).map(list => ({
    ...list,
    is_owner: true,
  }));

  // Mark collaborated lists with is_owner flag
  const collaboratedListsWithFlag = ((collaboratedLists || [])
    .map((c: any) => c.wiselists)
    .filter(Boolean) as Wiselist[])
    .map(list => ({
      ...list,
      is_owner: false,
    }));

  // Combine and return
  const allLists = [
    ...ownedListsWithFlag,
    ...collaboratedListsWithFlag,
  ];

  return allLists as Wiselist[];
}

/**
 * Get a single wiselist by ID with items and collaborators
 * Uses API route to avoid RLS issues with complex joins
 */
export async function getWiselist(id: string): Promise<WiselistWithDetails | null> {
  const response = await fetch(`/api/wiselists/${id}`);

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Failed to fetch wiselist: ${response.statusText}`);
  }

  const { wiselist } = await response.json();
  return wiselist as WiselistWithDetails;
}

/**
 * Get a wiselist by slug (for public links /w/[slug])
 */
export async function getWiselistBySlug(slug: string): Promise<WiselistWithDetails | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('wiselists')
    .select(`
      *,
      owner:profiles!profile_id(id, full_name, avatar_url),
      items:wiselist_items(*,
        profile:profiles(id, full_name, avatar_url, bio, city, slug),
        listing:listings(id, title, description, hourly_rate, slug),
        added_by:profiles!added_by_profile_id(id, full_name)
      ),
      collaborators:wiselist_collaborators(*,
        profile:profiles!profile_id(id, full_name, avatar_url),
        invited_by:profiles!invited_by_profile_id(id, full_name)
      )
    `)
    .eq('slug', slug)
    .eq('visibility', 'public')
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data as WiselistWithDetails | null;
}

/**
 * Create a new wiselist
 */
export async function createWiselist(data: {
  name: string;
  description?: string;
  visibility?: WiselistVisibility;
  slug?: string;
}): Promise<Wiselist> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: wiselist, error } = await supabase
    .from('wiselists')
    .insert({
      profile_id: user.id,
      name: data.name,
      description: data.description || null,
      visibility: data.visibility || 'private',
      slug: data.slug || null,
    })
    .select()
    .single();

  if (error) throw error;
  return wiselist as Wiselist;
}

/**
 * Update a wiselist
 */
export async function updateWiselist(
  id: string,
  updates: Partial<Pick<Wiselist, 'name' | 'description' | 'visibility' | 'slug'>>
): Promise<Wiselist> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('wiselists')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Wiselist;
}

/**
 * Delete a wiselist
 */
export async function deleteWiselist(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('wiselists')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Add an item to a wiselist
 */
export async function addWiselistItem(data: {
  wiselistId: string;
  profileId?: string;
  listingId?: string;
  notes?: string;
}): Promise<WiselistItem> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: item, error } = await supabase
    .from('wiselist_items')
    .insert({
      wiselist_id: data.wiselistId,
      profile_id: data.profileId || null,
      listing_id: data.listingId || null,
      notes: data.notes || null,
      added_by_profile_id: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return item as WiselistItem;
}

/**
 * Remove an item from a wiselist
 */
export async function removeWiselistItem(itemId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('wiselist_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
}

/**
 * Add a collaborator to a wiselist
 */
export async function addCollaborator(data: {
  wiselistId: string;
  profileId: string;
  role?: WiselistRole;
}): Promise<WiselistCollaborator> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: collaborator, error } = await supabase
    .from('wiselist_collaborators')
    .insert({
      wiselist_id: data.wiselistId,
      profile_id: data.profileId,
      role: data.role || 'EDITOR',
      invited_by_profile_id: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return collaborator as WiselistCollaborator;
}

/**
 * Remove a collaborator from a wiselist
 */
export async function removeCollaborator(collaboratorId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('wiselist_collaborators')
    .delete()
    .eq('id', collaboratorId);

  if (error) throw error;
}

/**
 * Generate a unique slug for a public wiselist
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

/**
 * Get or create the "My Saves" default wiselist for quick saves
 * This is the auto-list that gets created when users click the heart icon
 */
export async function getOrCreateMySavesWiselist(): Promise<Wiselist> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Try to find existing "My Saves" list
  const { data: existing, error: fetchError } = await supabase
    .from('wiselists')
    .select('*')
    .eq('profile_id', user.id)
    .eq('name', 'My Saves')
    .maybeSingle();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError;
  }

  // If exists, return it
  if (existing) {
    return existing as Wiselist;
  }

  // Otherwise, create it
  const { data: newList, error: createError } = await supabase
    .from('wiselists')
    .insert({
      profile_id: user.id,
      name: 'My Saves',
      description: 'Items you\'ve saved for quick access',
      visibility: 'private',
      slug: null,
    })
    .select()
    .single();

  if (createError) throw createError;
  return newList as Wiselist;
}

/**
 * Quick save/unsave an item (profile or listing) to "My Saves"
 * This is used by the heart icon on profiles and listings
 */
export async function quickSaveItem(data: {
  profileId?: string;
  listingId?: string;
}): Promise<{ saved: boolean; itemId?: string }> {
  // Get or create "My Saves" wiselist
  const mySaves = await getOrCreateMySavesWiselist();

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check if item already exists in "My Saves"
  const { data: existingItem } = await supabase
    .from('wiselist_items')
    .select('id')
    .eq('wiselist_id', mySaves.id)
    .eq('profile_id', data.profileId || null)
    .eq('listing_id', data.listingId || null)
    .maybeSingle();

  // If exists, remove it (unsave)
  if (existingItem) {
    await removeWiselistItem(existingItem.id);
    return { saved: false };
  }

  // Otherwise, add it (save)
  const newItem = await addWiselistItem({
    wiselistId: mySaves.id,
    profileId: data.profileId,
    listingId: data.listingId,
  });

  return { saved: true, itemId: newItem.id };
}

/**
 * Check if an item is saved in "My Saves"
 */
export async function isItemSaved(data: {
  profileId?: string;
  listingId?: string;
}): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Get "My Saves" list
  const { data: mySaves } = await supabase
    .from('wiselists')
    .select('id')
    .eq('profile_id', user.id)
    .eq('name', 'My Saves')
    .maybeSingle();

  if (!mySaves) return false;

  // Check if item exists
  const { data: item } = await supabase
    .from('wiselist_items')
    .select('id')
    .eq('wiselist_id', mySaves.id)
    .eq('profile_id', data.profileId || null)
    .eq('listing_id', data.listingId || null)
    .maybeSingle();

  return !!item;
}
