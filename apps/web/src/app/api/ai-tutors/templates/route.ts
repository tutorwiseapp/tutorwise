/**
 * Filename: api/ai-tutors/templates/route.ts
 * Purpose: AI Tutor Templates API
 * Created: 2026-02-23
 * Version: v1.0
 *
 * Routes:
 * - GET /api/ai-tutors/templates - Get all templates
 */

import { NextResponse } from 'next/server';
import { AI_TUTOR_TEMPLATES } from '@/lib/ai-tutors/templates';

/**
 * GET /api/ai-tutors/templates
 * Get all AI tutor templates
 */
export async function GET() {
  return NextResponse.json(AI_TUTOR_TEMPLATES, { status: 200 });
}
