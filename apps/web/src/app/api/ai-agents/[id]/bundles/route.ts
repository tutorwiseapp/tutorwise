/**
 * Filename: api/ai-agents/[id]/bundles/route.ts
 * Purpose: Manage AI tutor bundle pricing
 * Created: 2026-02-24
 * Phase: 3C - Bundle Pricing
 *
 * Allows AI tutor owners to create and manage session bundles.
 * Clients can view available bundles for an AI tutor.
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface CreateBundleRequest {
  bundle_name: string;
  ai_sessions_count: number;
  human_sessions_count: number;
  total_price_pence: number;
  description?: string;
  badge_text?: string; // e.g., 'Best Value', 'Popular'
  valid_days?: number; // Number of days bundle is valid
}

/**
 * GET /api/ai-agents/[id]/bundles
 * Get all active bundles for an AI tutor
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: aiTutorId } = await params;

  try {
    // Fetch active bundles
    const { data: bundles, error } = await supabase
      .from('ai_tutor_bundles')
      .select('*')
      .eq('agent_id', aiTutorId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ bundles: bundles || [] });

  } catch (error) {
    console.error('[Get Bundles] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai-agents/[id]/bundles
 * Create a new bundle for an AI tutor (owner only)
 *
 * Body: {
 *   bundle_name: string,
 *   ai_sessions_count: number,
 *   human_sessions_count: number,
 *   total_price_pence: number,
 *   description?: string,
 *   badge_text?: string,
 *   valid_days?: number
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: aiTutorId } = await params;

  try {
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify user owns this AI tutor
    const { data: aiTutor, error: tutorError } = await supabase
      .from('ai_agents')
      .select('id, owner_id')
      .eq('id', aiTutorId)
      .single();

    if (tutorError || !aiTutor) {
      return NextResponse.json({ error: 'AI tutor not found' }, { status: 404 });
    }

    if (aiTutor.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the AI tutor owner can create bundles' },
        { status: 403 }
      );
    }

    // 3. Parse request body
    const body: CreateBundleRequest = await request.json();
    const {
      bundle_name,
      ai_sessions_count,
      human_sessions_count,
      total_price_pence,
      description,
      badge_text,
      valid_days
    } = body;

    // 4. Validate required fields
    if (!bundle_name || ai_sessions_count === undefined || human_sessions_count === undefined || !total_price_pence) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 5. Validate at least one session type
    if (ai_sessions_count === 0 && human_sessions_count === 0) {
      return NextResponse.json(
        { error: 'Bundle must include at least one AI or human session' },
        { status: 400 }
      );
    }

    // 6. Validate price
    if (total_price_pence <= 0) {
      return NextResponse.json(
        { error: 'Price must be greater than 0' },
        { status: 400 }
      );
    }

    // 7. Get max display_order for ordering
    const { data: maxOrder } = await supabase
      .from('ai_tutor_bundles')
      .select('display_order')
      .eq('agent_id', aiTutorId)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const newDisplayOrder = (maxOrder?.display_order ?? -1) + 1;

    // 8. Create bundle
    const { data: bundle, error: createError } = await supabase
      .from('ai_tutor_bundles')
      .insert({
        agent_id: aiTutorId,
        bundle_name,
        ai_sessions_count,
        human_sessions_count,
        total_price_pence,
        description: description || null,
        badge_text: badge_text || null,
        valid_days: valid_days || 90, // Default 90 days
        display_order: newDisplayOrder
      })
      .select()
      .single();

    if (createError) {
      console.error('[Create Bundle] Database error:', createError);
      throw createError;
    }

    console.log('[Create Bundle] Bundle created:', {
      bundleId: bundle.id,
      aiTutorId,
      ownerId: user.id
    });

    return NextResponse.json({
      bundle,
      message: 'Bundle created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('[Create Bundle] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
