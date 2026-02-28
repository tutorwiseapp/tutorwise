/**
 * Filename: api/ai-agents/[id]/skills/route.ts
 * Purpose: AI Tutor Skills Management API
 * Created: 2026-02-24
 * Version: v1.0 (Phase 2)
 *
 * Routes:
 * - GET /api/ai-agents/[id]/skills - Get AI tutor skills
 * - POST /api/ai-agents/[id]/skills - Add skill to AI tutor
 * - DELETE /api/ai-agents/[id]/skills - Remove skill from AI tutor
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/ai-agents/[id]/skills
 * Get all skills for an AI tutor
 *
 * Returns: Array<{ skill_name, is_custom, created_by }>
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get skills using RPC function
    const { data: skills, error: skillsError } = await supabase.rpc(
      'get_ai_agent_skills',
      { tutor_id: id }
    );

    if (skillsError) {
      console.error('Error fetching AI tutor skills:', skillsError);
      return NextResponse.json(
        { error: 'Failed to fetch skills' },
        { status: 500 }
      );
    }

    return NextResponse.json({ skills: skills || [] }, { status: 200 });
  } catch (error) {
    console.error('Error in skills GET:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai-agents/[id]/skills
 * Add skill to AI tutor
 *
 * Body: { skill_name: string, is_custom: boolean }
 *
 * Returns: { success: true, skill_name, is_custom }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: aiTutor, error: fetchError } = await supabase
      .from('ai_agents')
      .select('id, owner_id')
      .eq('id', id)
      .single();

    if (fetchError || !aiTutor) {
      return NextResponse.json({ error: 'AI tutor not found' }, { status: 404 });
    }

    if (aiTutor.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this AI tutor' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { skill_name, is_custom } = body;

    // Validate skill name
    if (!skill_name || typeof skill_name !== 'string') {
      return NextResponse.json(
        { error: 'skill_name is required' },
        { status: 400 }
      );
    }

    // If custom skill, verify it exists
    if (is_custom) {
      const { data: customSkill } = await supabase
        .from('custom_skills')
        .select('id, name')
        .ilike('name', skill_name)
        .single();

      if (!customSkill) {
        return NextResponse.json(
          { error: `Custom skill "${skill_name}" does not exist` },
          { status: 404 }
        );
      }
    }

    // Add skill using RPC function
    const { error: addError } = await supabase.rpc('add_skill_to_ai_agent', {
      tutor_id: id,
      skill: skill_name,
      custom: is_custom || false,
    });

    if (addError) {
      console.error('Error adding skill to AI tutor:', addError);
      return NextResponse.json(
        { error: 'Failed to add skill' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        skill_name,
        is_custom: is_custom || false,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in skills POST:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai-agents/[id]/skills
 * Remove skill from AI tutor
 *
 * Body: { skill_name: string }
 *
 * Returns: { success: true, skill_name }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: aiTutor, error: fetchError } = await supabase
      .from('ai_agents')
      .select('id, owner_id')
      .eq('id', id)
      .single();

    if (fetchError || !aiTutor) {
      return NextResponse.json({ error: 'AI tutor not found' }, { status: 404 });
    }

    if (aiTutor.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this AI tutor' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { skill_name } = body;

    // Validate skill name
    if (!skill_name || typeof skill_name !== 'string') {
      return NextResponse.json(
        { error: 'skill_name is required' },
        { status: 400 }
      );
    }

    // Remove skill using RPC function
    const { error: removeError } = await supabase.rpc('remove_skill_from_ai_agent', {
      tutor_id: id,
      skill: skill_name,
    });

    if (removeError) {
      console.error('Error removing skill from AI tutor:', removeError);
      return NextResponse.json(
        { error: 'Failed to remove skill' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        skill_name,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in skills DELETE:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}
