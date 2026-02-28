/**
 * Filename: api/ai-agents/[id]/links/[linkId]/route.ts
 * Purpose: Individual Link API - Update and delete links
 * Created: 2026-02-23
 * Version: v1.0
 *
 * Routes:
 * - PATCH /api/ai-agents/[id]/links/[linkId] - Update link
 * - DELETE /api/ai-agents/[id]/links/[linkId] - Delete link
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { updateLink, deleteLink } from '@/lib/ai-agents/links-manager';

/**
 * PATCH /api/ai-agents/[id]/links/[linkId]
 * Update link metadata
 *
 * Body:
 * {
 *   title?: string
 *   description?: string
 *   link_type?: string
 *   skills?: string[]
 *   priority?: 1 | 2 | 3
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  try {
    const { id, linkId } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify link belongs to this AI tutor
    const { data: existingLink } = await supabase
      .from('ai_agent_links')
      .select('id')
      .eq('id', linkId)
      .eq('agent_id', id)
      .single();

    if (!existingLink) {
      return NextResponse.json({ error: 'Link not found for this AI tutor' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();

    // Validate priority if provided
    if (body.priority !== undefined) {
      if (![1, 2, 3].includes(body.priority)) {
        return NextResponse.json(
          { error: 'Priority must be 1 (high), 2 (medium), or 3 (low)' },
          { status: 400 }
        );
      }
    }

    // Update link
    const link = await updateLink(
      linkId,
      {
        title: body.title,
        description: body.description,
        link_type: body.link_type,
        skills: body.skills,
        priority: body.priority,
      },
      user.id
    );

    return NextResponse.json(link, { status: 200 });
  } catch (error) {
    console.error('Error updating link:', error);

    const errorMessage = (error as Error).message;

    if (errorMessage.includes('Not authorized')) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }

    if (errorMessage.includes('not found')) {
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }

    return NextResponse.json(
      { error: errorMessage || 'Failed to update link' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai-agents/[id]/links/[linkId]
 * Delete link (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  try {
    const { id, linkId } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify link belongs to this AI tutor
    const { data: linkRecord } = await supabase
      .from('ai_agent_links')
      .select('id')
      .eq('id', linkId)
      .eq('agent_id', id)
      .single();

    if (!linkRecord) {
      return NextResponse.json({ error: 'Link not found for this AI tutor' }, { status: 404 });
    }

    // Delete link
    await deleteLink(linkId, user.id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting link:', error);

    const errorMessage = (error as Error).message;

    if (errorMessage.includes('Not authorized')) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }

    if (errorMessage.includes('not found')) {
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }

    return NextResponse.json(
      { error: errorMessage || 'Failed to delete link' },
      { status: 500 }
    );
  }
}
