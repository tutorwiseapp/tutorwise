/**
 * Filename: apps/web/src/app/api/resources/saves/route.ts
 * Purpose: API for saving/unsaving resource articles to wiselists
 * Created: 2026-01-16
 * Updated: 2026-01-16 - Added dual-write pattern (event + save record)
 *
 * DUAL-WRITE PATTERN:
 * 1. Create save record in resource_article_saves (user intent)
 * 2. Write 'save' event to blog_attribution_events (attribution signal)
 *
 * Note: blog_article_saves represents intent, not exclusive attribution.
 * For multi-touch attribution analysis, query blog_attribution_events.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/resources/saves
 * Save a resource article to the user's "My Saves" wiselist
 *
 * DUAL-WRITE IMPLEMENTATION:
 * 1. Create save record in resource_article_saves (user intent)
 * 2. Write 'save' event to blog_attribution_events (attribution signal)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { articleId, wiselistId, notes, sessionId, sourceComponent } = body;

    if (!articleId) {
      return NextResponse.json({ error: 'Missing required field: articleId' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get or create "My Saves" wiselist
    let targetWiselistId = wiselistId;

    if (!targetWiselistId) {
      // Find existing "My Saves" wiselist
      const { data: existingWiselist } = await supabase
        .from('wiselists')
        .select('id')
        .eq('profile_id', profile.id)
        .eq('name', 'My Saves')
        .single();

      if (existingWiselist) {
        targetWiselistId = existingWiselist.id;
      } else {
        // Create "My Saves" wiselist
        const { data: newWiselist, error: createError } = await supabase
          .from('wiselists')
          .insert({
            profile_id: profile.id,
            name: 'My Saves',
            description: 'My saved articles, tutors, and listings',
            visibility: 'private',
          })
          .select('id')
          .single();

        if (createError || !newWiselist) {
          console.error('[API] Error creating My Saves wiselist:', createError);
          return NextResponse.json({ error: 'Failed to create wiselist' }, { status: 500 });
        }

        targetWiselistId = newWiselist.id;
      }
    }

    // Check if article is already saved
    const { data: existingSave } = await supabase
      .from('resource_article_saves')
      .select('id')
      .eq('article_id', articleId)
      .eq('wiselist_id', targetWiselistId)
      .single();

    if (existingSave) {
      return NextResponse.json({
        success: true,
        message: 'Article already saved',
        saveId: existingSave.id,
      });
    }

    // STEP 1: Create save record (user intent)
    const { data: newSave, error: saveError } = await supabase
      .from('resource_article_saves')
      .insert({
        article_id: articleId,
        wiselist_id: targetWiselistId,
        profile_id: profile.id,
        notes: notes || null,
        visibility: 'private', // Default: private (privacy-first)
      })
      .select('id')
      .single();

    if (saveError || !newSave) {
      console.error('[API] Error saving article:', saveError);
      return NextResponse.json({ error: 'Failed to save article' }, { status: 500 });
    }

    // STEP 2: Write attribution event (influence signal)
    const { error: eventError } = await supabase.from('resource_attribution_events').insert({
      article_id: articleId,
      user_id: user.id,
      session_id: sessionId || null,
      target_type: 'article',
      target_id: articleId,
      event_type: 'save',
      source_component: sourceComponent || 'article_header',
      metadata: {
        wiselist_id: targetWiselistId,
        save_id: newSave.id,
      },
    });

    if (eventError) {
      console.error('[API] Error writing save event (non-fatal):', eventError);
      // Continue even if event write fails (graceful degradation)
    }

    return NextResponse.json({
      success: true,
      message: 'Article saved successfully (dual-write: save + event)',
      saveId: newSave.id,
    });
  } catch (error) {
    console.error('[API] Error in POST /api/resources/saves:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/resources/saves
 * Remove a resource article from the user's "My Saves" wiselist
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { articleId, wiselistId } = body;

    if (!articleId) {
      return NextResponse.json({ error: 'Missing required field: articleId' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete save (RLS will ensure user owns the save)
    let query = supabase.from('resource_article_saves').delete().eq('article_id', articleId).eq('profile_id', user.id);

    if (wiselistId) {
      query = query.eq('wiselist_id', wiselistId);
    }

    const { error } = await query;

    if (error) {
      console.error('[API] Error deleting article save:', error);
      return NextResponse.json({ error: 'Failed to unsave article' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Article unsaved successfully',
    });
  } catch (error) {
    console.error('[API] Error in DELETE /api/resources/saves:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
