/**
 * Filename: api/ai-tutors/[id]/materials/[materialId]/route.ts
 * Purpose: Individual Material API - Update and delete material
 * Created: 2026-02-23
 * Version: v1.1 (Phase 2)
 * Updated: 2026-02-24 - Added PATCH for skill tagging
 *
 * Routes:
 * - PATCH /api/ai-tutors/[id]/materials/[materialId] - Update material (skills)
 * - DELETE /api/ai-tutors/[id]/materials/[materialId] - Delete material
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { deleteMaterial } from '@/lib/ai-tutors/material-upload';

/**
 * PATCH /api/ai-tutors/[id]/materials/[materialId]
 * Update material (currently only supports skills)
 *
 * Body: { skills: string[] }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; materialId: string }> }
) {
  try {
    const { id, materialId } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership through AI tutor
    const { data: aiTutor } = await supabase
      .from('ai_tutors')
      .select('id, owner_id')
      .eq('id', id)
      .single();

    if (!aiTutor || aiTutor.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this AI tutor' },
        { status: 403 }
      );
    }

    // Verify material belongs to this AI tutor
    const { data: material } = await supabase
      .from('ai_tutor_materials')
      .select('id')
      .eq('id', materialId)
      .eq('ai_tutor_id', id)
      .single();

    if (!material) {
      return NextResponse.json(
        { error: 'Material not found for this AI tutor' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { skills } = body;

    // Validate skills
    if (skills !== undefined && !Array.isArray(skills)) {
      return NextResponse.json(
        { error: 'skills must be an array' },
        { status: 400 }
      );
    }

    // Update material skills
    const { error: updateError } = await supabase
      .from('ai_tutor_materials')
      .update({ skills: skills || [] })
      .eq('id', materialId);

    if (updateError) {
      console.error('Error updating material:', updateError);
      return NextResponse.json(
        { error: 'Failed to update material' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error updating material:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai-tutors/[id]/materials/[materialId]
 * Delete material and all associated chunks
 *
 * Removes file from storage, deletes chunks, updates quota
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; materialId: string }> }
) {
  try {
    const { id, materialId } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify material belongs to this AI tutor
    const { data: material } = await supabase
      .from('ai_tutor_materials')
      .select('id')
      .eq('id', materialId)
      .eq('ai_tutor_id', id)
      .single();

    if (!material) {
      return NextResponse.json({ error: 'Material not found for this AI tutor' }, { status: 404 });
    }

    // Delete material
    await deleteMaterial(materialId, user.id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting material:', error);

    const errorMessage = (error as Error).message;

    if (errorMessage.includes('Not authorized')) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }

    if (errorMessage.includes('not found')) {
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }

    return NextResponse.json(
      { error: errorMessage || 'Failed to delete material' },
      { status: 500 }
    );
  }
}
