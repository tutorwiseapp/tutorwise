/**
 * Filename: api/ai-tutors/[id]/route.ts
 * Purpose: Individual AI Tutor API - Get, Update, Delete
 * Created: 2026-02-23
 * Version: v1.0
 *
 * Routes:
 * - GET /api/ai-tutors/[id] - Get AI tutor details
 * - PATCH /api/ai-tutors/[id] - Update AI tutor
 * - DELETE /api/ai-tutors/[id] - Delete AI tutor
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  getAITutorById,
  updateAITutor,
  deleteAITutor,
  getAITutorSkills,
} from '@/lib/ai-tutors/manager';

/**
 * GET /api/ai-tutors/[id]
 * Get AI tutor details with skills
 */
export async function GET(
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

    // Get AI tutor
    const tutor = await getAITutorById(id, user.id);

    if (!tutor) {
      return NextResponse.json({ error: 'AI tutor not found' }, { status: 404 });
    }

    // Get skills
    const skills = await getAITutorSkills(id);

    return NextResponse.json({ ...tutor, skills }, { status: 200 });
  } catch (error) {
    console.error('Error fetching AI tutor:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to fetch AI tutor' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/ai-tutors/[id]
 * Update AI tutor
 *
 * Body:
 * {
 *   display_name?: string
 *   description?: string
 *   avatar_url?: string
 *   subject?: string
 *   price_per_hour?: number
 * }
 */
export async function PATCH(
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

    // Parse request body
    const body = await request.json();

    // Validate price if provided
    if (body.price_per_hour !== undefined) {
      if (body.price_per_hour < 5 || body.price_per_hour > 100) {
        return NextResponse.json(
          { error: 'Price must be between £5 and £100 per hour' },
          { status: 400 }
        );
      }
    }

    // Update AI tutor
    const tutor = await updateAITutor(id, body, user.id);

    return NextResponse.json(tutor, { status: 200 });
  } catch (error) {
    console.error('Error updating AI tutor:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to update AI tutor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai-tutors/[id]
 * Delete AI tutor
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

    // Delete AI tutor
    await deleteAITutor(id, user.id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting AI tutor:', error);

    const errorMessage = (error as Error).message;

    if (errorMessage.includes('active subscription')) {
      return NextResponse.json({ error: errorMessage }, { status: 409 });
    }

    return NextResponse.json(
      { error: errorMessage || 'Failed to delete AI tutor' },
      { status: 500 }
    );
  }
}
