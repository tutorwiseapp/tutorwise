/**
 * Filename: api/marketplace/ai-tutors/route.ts
 * Purpose: Marketplace API for AI tutors
 * Created: 2026-02-23
 * Version: v1.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/marketplace/ai-tutors
 * Fetch published AI tutors for marketplace
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const subject = searchParams.get('subject');
    const minPrice = searchParams.get('min_price');
    const maxPrice = searchParams.get('max_price');

    // Build query
    let query = supabase
      .from('ai_tutors')
      .select(
        `
        id,
        display_name,
        name,
        description,
        avatar_url,
        subject,
        price_per_hour,
        status,
        avg_rating,
        total_reviews,
        total_sessions,
        total_revenue
      `
      )
      .eq('status', 'published')
      .eq('subscription_status', 'active');

    // Apply filters
    if (subject) {
      query = query.eq('subject', subject);
    }

    if (minPrice) {
      query = query.gte('price_per_hour', parseFloat(minPrice));
    }

    if (maxPrice) {
      query = query.lte('price_per_hour', parseFloat(maxPrice));
    }

    // Execute with pagination
    const { data: aiTutors, error, count } = await query
      .order('total_sessions', { ascending: false }) // Popular first
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Fetch skills for each AI tutor
    const tutorsWithSkills = await Promise.all(
      (aiTutors || []).map(async (tutor) => {
        const { data: skills } = await supabase
          .from('ai_agent_skills')
          .select('skill_name')
          .eq('agent_id', tutor.id);

        return {
          ...tutor,
          skills: skills?.map((s) => s.skill_name) || [],
        };
      })
    );

    return NextResponse.json(
      {
        aiTutors: tutorsWithSkills,
        total: count || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching marketplace AI tutors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI tutors', aiTutors: [], total: 0 },
      { status: 500 }
    );
  }
}
