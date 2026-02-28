/**
 * Filename: api/ai-agents/[id]/quality/route.ts
 * Purpose: AI Tutor Quality Score API
 * Created: 2026-02-24
 * Version: v1.0 (Phase 2)
 *
 * Routes:
 * - GET /api/ai-agents/[id]/quality - Get quality score and metrics
 * - POST /api/ai-agents/[id]/quality/recalculate - Force recalculation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/ai-agents/[id]/quality
 * Get AI tutor quality score and detailed metrics
 *
 * Returns:
 * {
 *   quality_score: number (0-100)
 *   metrics: {
 *     session_completion_rate: number
 *     avg_rating: number
 *     total_sessions: number
 *     review_count: number
 *     escalation_rate: number
 *     material_completeness: number
 *     material_count: number
 *     link_count: number
 *     last_calculated_at: string
 *   }
 *   breakdown: {
 *     session_completion: string
 *     avg_rating: string
 *     total_sessions: string
 *     escalation_rate: string
 *     materials: string
 *   }
 *   tier: 'excellent' | 'good' | 'average' | 'needs_improvement'
 * }
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

    // Get AI tutor with quality score
    const { data: aiTutor, error: fetchError } = await supabase
      .from('ai_agents')
      .select('id, owner_id, display_name, quality_score, quality_metrics')
      .eq('id', id)
      .single();

    if (fetchError || !aiTutor) {
      return NextResponse.json({ error: 'AI tutor not found' }, { status: 404 });
    }

    // Check access: Owner or public (for marketplace)
    const isOwner = aiTutor.owner_id === user.id;

    // Parse quality metrics
    const metrics = aiTutor.quality_metrics || {
      session_completion_rate: 0,
      avg_rating: 0,
      total_sessions: 0,
      review_count: 0,
      escalation_rate: 0,
      material_completeness: 0,
      material_count: 0,
      link_count: 0,
      last_calculated_at: null,
    };

    // Determine quality tier
    const qualityScore = aiTutor.quality_score || 0;
    let tier: 'excellent' | 'good' | 'average' | 'needs_improvement';
    if (qualityScore >= 80) tier = 'excellent';
    else if (qualityScore >= 60) tier = 'good';
    else if (qualityScore >= 40) tier = 'average';
    else tier = 'needs_improvement';

    // Human-readable breakdown
    const breakdown = {
      session_completion: `${metrics.session_completion_rate}%`,
      avg_rating: `${metrics.avg_rating.toFixed(1)}/5.0 (${metrics.review_count} reviews)`,
      total_sessions: `${metrics.total_sessions} sessions`,
      escalation_rate: `${metrics.escalation_rate}%`,
      materials: `${metrics.material_count} files + ${metrics.link_count} links`,
    };

    // Return detailed response
    return NextResponse.json(
      {
        id: aiTutor.id,
        display_name: aiTutor.display_name,
        quality_score: qualityScore,
        metrics,
        breakdown,
        tier,
        is_owner: isOwner,
        last_updated: metrics.last_calculated_at,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching AI tutor quality:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to fetch quality score' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai-agents/[id]/quality/recalculate
 * Force recalculation of quality score (owner only)
 */
export async function POST(
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
      return NextResponse.json({ error: 'Forbidden: You do not own this AI tutor' }, { status: 403 });
    }

    // Recalculate quality score
    const { data: newScore, error: calcError } = await supabase.rpc('calculate_ai_agent_quality_score', {
      tutor_id: id,
    });

    if (calcError) {
      console.error('Error recalculating quality score:', calcError);
      return NextResponse.json(
        { error: 'Failed to recalculate quality score' },
        { status: 500 }
      );
    }

    // Fetch updated metrics
    const { data: updated } = await supabase
      .from('ai_agents')
      .select('quality_score, quality_metrics')
      .eq('id', id)
      .single();

    return NextResponse.json(
      {
        success: true,
        quality_score: newScore,
        metrics: updated?.quality_metrics,
        message: 'Quality score recalculated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error recalculating quality score:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to recalculate quality score' },
      { status: 500 }
    );
  }
}
