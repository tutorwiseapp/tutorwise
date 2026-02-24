/**
 * Filename: api/ai-tutors/custom-skills/route.ts
 * Purpose: Custom Skills Management API
 * Created: 2026-02-24
 * Version: v1.0 (Phase 2)
 *
 * Routes:
 * - POST /api/ai-tutors/custom-skills - Create custom skill
 * - GET /api/ai-tutors/custom-skills - List custom skills
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/ai-tutors/custom-skills
 * Create a new custom skill
 *
 * Body: { name: string }
 *
 * Returns: { id, name, created_by, created_at }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { name } = body;

    // Validate skill name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Skill name is required' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    // Check length (1-100 characters)
    if (trimmedName.length > 100) {
      return NextResponse.json(
        { error: 'Skill name must be 100 characters or less' },
        { status: 400 }
      );
    }

    // Check if skill already exists (case-insensitive)
    const { data: existing } = await supabase
      .from('custom_skills')
      .select('id, name')
      .ilike('name', trimmedName)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: `Skill "${existing.name}" already exists` },
        { status: 409 }
      );
    }

    // Create custom skill
    const { data: skill, error: createError } = await supabase
      .from('custom_skills')
      .insert({
        name: trimmedName,
        created_by: user.id,
      })
      .select('id, name, created_by, created_at')
      .single();

    if (createError) {
      console.error('Error creating custom skill:', createError);
      return NextResponse.json(
        { error: 'Failed to create custom skill' },
        { status: 500 }
      );
    }

    return NextResponse.json(skill, { status: 201 });
  } catch (error) {
    console.error('Error in custom skills POST:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai-tutors/custom-skills
 * Get list of custom skills (popular + user's own)
 *
 * Query params:
 * - popular: number (default: 20) - number of popular skills to return
 * - mine: boolean (default: true) - include user's own skills
 *
 * Returns: {
 *   popular: Array<{ skill_name, usage_count }>,
 *   mine: Array<{ id, name, created_at }>
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const popularLimit = parseInt(searchParams.get('popular') || '20', 10);
    const includeMine = searchParams.get('mine') !== 'false';

    // Get popular custom skills
    const { data: popular, error: popularError } = await supabase.rpc(
      'get_popular_custom_skills',
      { limit_count: popularLimit }
    );

    if (popularError) {
      console.error('Error fetching popular skills:', popularError);
    }

    // Get user's own custom skills
    let mine: Array<{ id: string; name: string; created_at: string }> = [];
    if (includeMine) {
      const { data: mySkills, error: mineError } = await supabase
        .from('custom_skills')
        .select('id, name, created_at')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (mineError) {
        console.error('Error fetching user skills:', mineError);
      } else {
        mine = mySkills || [];
      }
    }

    return NextResponse.json(
      {
        popular: popular || [],
        mine,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in custom skills GET:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}
