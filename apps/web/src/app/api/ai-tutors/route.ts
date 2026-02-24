/**
 * Filename: api/ai-tutors/route.ts
 * Purpose: AI Tutor CRUD API - List and Create endpoints
 * Created: 2026-02-23
 * Version: v1.0
 *
 * Routes:
 * - GET /api/ai-tutors - List user's AI tutors
 * - POST /api/ai-tutors - Create new AI tutor
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAITutor, listUserAITutors } from '@/lib/ai-tutors/manager';
import { canCreateAITutor, getLimitTierForScore } from '@/lib/ai-tutors/limits';

/**
 * GET /api/ai-tutors
 * List all AI tutors owned by the current user
 */
export async function GET(_request: NextRequest) {
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

    // Get AI tutors
    const tutors = await listUserAITutors(user.id);

    return NextResponse.json(tutors, { status: 200 });
  } catch (error) {
    console.error('Error listing AI tutors:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to list AI tutors' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai-tutors
 * Create new AI tutor (draft status)
 *
 * Body:
 * {
 *   name: string (URL slug)
 *   display_name: string
 *   description?: string
 *   subject: string
 *   skills: string[]
 *   price_per_hour: number (5-100)
 * }
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

    // Validate required fields
    if (!body.name || !body.display_name || !body.subject || !body.price_per_hour) {
      return NextResponse.json(
        { error: 'Missing required fields: name, display_name, subject, price_per_hour' },
        { status: 400 }
      );
    }

    // Validate price range
    if (body.price_per_hour < 5 || body.price_per_hour > 100) {
      return NextResponse.json(
        { error: 'Price must be between £5 and £100 per hour' },
        { status: 400 }
      );
    }

    // Validate subject
    const validSubjects = [
      'maths',
      'english',
      'science',
      'biology',
      'chemistry',
      'physics',
      'computing',
      'history',
      'geography',
      'languages',
      'business',
      'economics',
      'psychology',
      'other',
    ];

    if (!validSubjects.includes(body.subject)) {
      return NextResponse.json(
        { error: `Invalid subject. Must be one of: ${validSubjects.join(', ')}` },
        { status: 400 }
      );
    }

    // Check CaaS-based limits and get active role
    const { data: profile } = await supabase
      .from('profiles')
      .select('caas_score, active_role')
      .eq('id', user.id)
      .single();

    const caasScore = profile?.caas_score ?? 0;
    const activeRole = profile?.active_role || 'tutor'; // Default to tutor if not set

    // Get current AI tutor count
    const { count: currentCount, error: countError } = await supabase
      .from('ai_tutors')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id);

    if (countError) {
      console.error('Error counting AI tutors:', countError);
      return NextResponse.json(
        { error: 'Failed to check AI tutor limits' },
        { status: 500 }
      );
    }

    // Check if user can create another AI tutor
    if (!canCreateAITutor(caasScore, currentCount || 0)) {
      const tier = getLimitTierForScore(caasScore);
      return NextResponse.json(
        {
          error: `AI Tutor limit reached. Your current tier (${tier.tierName}) allows ${tier.maxAITutors} AI tutor${tier.maxAITutors !== 1 ? 's' : ''}. Increase your CaaS score to unlock more slots.`,
          currentTier: tier.tierName,
          maxAITutors: tier.maxAITutors,
          currentCount: currentCount || 0,
          caasScore,
        },
        { status: 403 }
      );
    }

    // Create AI tutor
    const tutor = await createAITutor(
      {
        name: body.name,
        display_name: body.display_name,
        description: body.description,
        avatar_url: body.avatar_url,
        subject: body.subject,
        skills: body.skills || [],
        price_per_hour: body.price_per_hour,
      },
      user.id,
      activeRole
    );

    return NextResponse.json(tutor, { status: 201 });
  } catch (error) {
    console.error('Error creating AI tutor:', error);

    // Handle specific errors
    const errorMessage = (error as Error).message;

    if (errorMessage.includes('limit reached')) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }

    if (errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
      return NextResponse.json(
        { error: 'An AI tutor with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: errorMessage || 'Failed to create AI tutor' },
      { status: 500 }
    );
  }
}
