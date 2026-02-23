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
      user.id
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
