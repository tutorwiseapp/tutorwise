/**
 * Filename: api/ai-tutors/limits/route.ts
 * Purpose: AI Tutor Graduated Limits API
 * Created: 2026-02-23
 * Version: v1.0
 *
 * Routes:
 * - GET /api/ai-tutors/limits - Get user's AI tutor creation limits
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkCreationLimit } from '@/lib/ai-tutors/manager';

/**
 * GET /api/ai-tutors/limits
 * Get AI tutor creation limits for current user
 *
 * Returns:
 * {
 *   allowed: boolean (can create more AI tutors)
 *   current: number (current AI tutor count)
 *   limit: number (maximum allowed)
 *   caas_score: number (user's CaaS score)
 * }
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

    // Get limits
    const limits = await checkCreationLimit(user.id);

    return NextResponse.json(limits, { status: 200 });
  } catch (error) {
    console.error('Error checking AI tutor limits:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to check limits' },
      { status: 500 }
    );
  }
}
