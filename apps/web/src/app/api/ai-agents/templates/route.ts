/**
 * Filename: api/ai-agents/templates/route.ts
 * Purpose: AI Tutor Templates API
 * Created: 2026-02-23
 * Version: v1.0
 *
 * Routes:
 * - GET /api/ai-agents/templates - Get all templates
 */

import { NextResponse } from 'next/server';
import { AI_AGENT_TEMPLATES } from '@/lib/ai-agents/templates';

/**
 * GET /api/ai-agents/templates
 * Get all AI tutor templates
 */
export async function GET() {
  return NextResponse.json(AI_AGENT_TEMPLATES, { status: 200 });
}
