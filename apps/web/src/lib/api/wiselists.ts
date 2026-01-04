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
  console.log('[getMyWiselists] Starting...');
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  console.log('[getMyWiselists] User:', user.id);

  // Get owned lists
  const { data: ownedLists, error: ownedError } = await supabase
    .from('wiselists')
    .select('*, owner:profiles!profile_id(id, full_name, avatar_url)')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false });

  if (ownedError) {
    console.error('[getMyWiselists] Owned lists error:', ownedError);
    throw ownedError;
  }
  console.log('[getMyWiselists] Owned lists found:', ownedLists?.length || 0, ownedLists?.map(l => ({ id: l.id, name: l.name })));

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

  console.log('[getMyWiselists] Total lists:', allLists.length, allLists.map(l => ({ id: l.id, name: l.name })));
  return allLists as Wiselist[];
}

/**
 * Get a single wiselist by ID with items and collaborators
 * Uses API route to avoid RLS issues with complex joins
 */
export async function getWiselist(id: string): Promise<WiselistWithDetails | null> {
  console.log('[getWiselist] Fetching wiselist:', id);
  const response = await fetch(`/api/wiselists/${id}`);
  console.log('[getWiselist] Response status:', response.status, response.statusText);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[getWiselist] Error response:', errorText);
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Failed to fetch wiselist: ${response.statusText}`);
  }

  const { wiselist } = await response.json();
  console.log('[getWiselist] Wiselist fetched:', wiselist.id, wiselist.name, 'items:', wiselist.items?.length || 0);
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
  organisationId?: string;
  notes?: string;
}): Promise<WiselistItem> {
  console.log('[addWiselistItem] Starting with data:', data);
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  console.log('[addWiselistItem] User:', user.id);

  const insertData = {
    wiselist_id: data.wiselistId,
    profile_id: data.profileId || null,
    listing_id: data.listingId || null,
    organisation_id: data.organisationId || null,
    notes: data.notes || null,
    added_by_profile_id: user.id,
  };
  console.log('[addWiselistItem] Inserting:', insertData);

  const { data: item, error } = await supabase
    .from('wiselist_items')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('[addWiselistItem] Error:', error);
    throw error;
  }
  console.log('[addWiselistItem] Item inserted successfully:', item);
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
 * Helper: Get temp saves from localStorage (for non-logged-in users)
 */
function getTempSaves(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('temp_saves');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

/**
 * Helper: Migrate temp saves from localStorage to database after login
 */
export async function migrateTempSaves(): Promise<void> {
  if (typeof window === 'undefined') return;

  const tempSaves = getTempSaves();
  if (tempSaves.length === 0) return;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Get or create "My Saves" wiselist
  const mySaves = await getOrCreateMySavesWiselist();

  // Migrate each temp save
  for (const itemKey of tempSaves) {
    const [type, id] = itemKey.split('-');
    try {
      await addWiselistItem({
        wiselistId: mySaves.id,
        profileId: type === 'profile' ? id : undefined,
        listingId: type === 'listing' ? id : undefined,
      });
    } catch (error) {
      console.error(`Failed to migrate temp save: ${itemKey}`, error);
    }
  }

  // Clear temp saves after migration
  localStorage.removeItem('temp_saves');
}

/**
 * Get or create the "My Saves" default wiselist for quick saves
 * This is the auto-list that gets created when users click the heart icon
 */
export async function getOrCreateMySavesWiselist(): Promise<Wiselist> {
  console.log('[getOrCreateMySavesWiselist] Starting...');
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  console.log('[getOrCreateMySavesWiselist] User:', user.id);

  // Try to find existing "My Saves" list
  console.log('[getOrCreateMySavesWiselist] Checking for existing My Saves...');
  const { data: existing, error: fetchError } = await supabase
    .from('wiselists')
    .select('*')
    .eq('profile_id', user.id)
    .eq('name', 'My Saves')
    .maybeSingle();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('[getOrCreateMySavesWiselist] Fetch error:', fetchError);
    throw fetchError;
  }

  // If exists, return it
  if (existing) {
    console.log('[getOrCreateMySavesWiselist] Found existing My Saves:', existing.id);
    return existing as Wiselist;
  }

  // Otherwise, create it
  console.log('[getOrCreateMySavesWiselist] Creating new My Saves...');
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

  if (createError) {
    console.error('[getOrCreateMySavesWiselist] Create error:', createError);
    throw createError;
  }
  console.log('[getOrCreateMySavesWiselist] Created new My Saves:', newList.id);
  return newList as Wiselist;
}

/**
 * Quick save/unsave an item (profile or listing) to "My Saves"
 * This is used by the heart icon on profiles and listings
 * Supports temp storage for non-logged-in users via localStorage
 */
export async function quickSaveItem(data: {
  profileId?: string;
  listingId?: string;
  organisationId?: string;
}): Promise<{ saved: boolean; itemId?: string }> {
  console.log('[quickSaveItem] Starting with data:', data);
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  console.log('[quickSaveItem] User authenticated:', !!user, user?.id);

  // For non-logged-in users: Use localStorage
  if (!user) {
    console.log('[quickSaveItem] No user, using localStorage');
    const itemKey = data.profileId ? `profile-${data.profileId}` : data.listingId ? `listing-${data.listingId}` : `organisation-${data.organisationId}`;
    const tempSaves = getTempSaves();

    if (tempSaves.includes(itemKey)) {
      // Remove from temp saves
      const updated = tempSaves.filter(k => k !== itemKey);
      localStorage.setItem('temp_saves', JSON.stringify(updated));
      console.log('[quickSaveItem] Removed from localStorage');
      return { saved: false };
    } else {
      // Add to temp saves
      tempSaves.push(itemKey);
      localStorage.setItem('temp_saves', JSON.stringify(tempSaves));
      console.log('[quickSaveItem] Added to localStorage');
      return { saved: true };
    }
  }

  // For logged-in users: Use database
  // Get or create "My Saves" wiselist
  console.log('[quickSaveItem] Getting or creating My Saves wiselist...');
  const mySaves = await getOrCreateMySavesWiselist();
  console.log('[quickSaveItem] My Saves wiselist:', mySaves.id, mySaves.name);

  // Check if item already exists in "My Saves"
  // Note: Use .is() for NULL checks, not .eq()
  console.log('[quickSaveItem] Checking if item already exists...');
  let query = supabase
    .from('wiselist_items')
    .select('id')
    .eq('wiselist_id', mySaves.id);

  if (data.profileId) {
    query = query.eq('profile_id', data.profileId).is('listing_id', null).is('organisation_id', null);
  } else if (data.listingId) {
    query = query.is('profile_id', null).eq('listing_id', data.listingId).is('organisation_id', null);
  } else if (data.organisationId) {
    query = query.is('profile_id', null).is('listing_id', null).eq('organisation_id', data.organisationId);
  }

  const { data: existingItem } = await query.maybeSingle();
  console.log('[quickSaveItem] Existing item found:', existingItem);

  // If exists, remove it (unsave)
  if (existingItem) {
    console.log('[quickSaveItem] Removing existing item...');
    await removeWiselistItem(existingItem.id);
    console.log('[quickSaveItem] Item removed successfully');
    return { saved: false };
  }

  // Otherwise, add it (save)
  console.log('[quickSaveItem] Adding new item...');
  const newItem = await addWiselistItem({
    wiselistId: mySaves.id,
    profileId: data.profileId,
    listingId: data.listingId,
    organisationId: data.organisationId,
  });
  console.log('[quickSaveItem] New item added:', newItem.id);

  return { saved: true, itemId: newItem.id };
}

/**
 * Check if an item is saved in "My Saves"
 * Checks temp storage for non-logged-in users
 */
export async function isItemSaved(data: {
  profileId?: string;
  listingId?: string;
  organisationId?: string;
}): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // For non-logged-in users: Check localStorage
  if (!user) {
    const itemKey = data.profileId ? `profile-${data.profileId}` : data.listingId ? `listing-${data.listingId}` : `organisation-${data.organisationId}`;
    const tempSaves = getTempSaves();
    return tempSaves.includes(itemKey);
  }

  // For logged-in users: Check database
  // Get "My Saves" list
  const { data: mySaves } = await supabase
    .from('wiselists')
    .select('id')
    .eq('profile_id', user.id)
    .eq('name', 'My Saves')
    .maybeSingle();

  if (!mySaves) return false;

  // Check if item exists
  // Note: Use .is() for NULL checks, not .eq()
  let query = supabase
    .from('wiselist_items')
    .select('id')
    .eq('wiselist_id', mySaves.id);

  if (data.profileId) {
    query = query.eq('profile_id', data.profileId).is('listing_id', null).is('organisation_id', null);
  } else if (data.listingId) {
    query = query.is('profile_id', null).eq('listing_id', data.listingId).is('organisation_id', null);
  } else if (data.organisationId) {
    query = query.is('profile_id', null).is('listing_id', null).eq('organisation_id', data.organisationId);
  }

  const { data: item } = await query.maybeSingle();

  return !!item;
}
