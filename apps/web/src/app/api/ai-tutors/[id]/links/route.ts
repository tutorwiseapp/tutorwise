/**
 * Filename: api/ai-tutors/[id]/links/route.ts
 * Purpose: AI Tutor Links API - Add and list URL references
 * Created: 2026-02-23
 * Version: v1.0
 *
 * Routes:
 * - POST /api/ai-tutors/[id]/links - Add URL link
 * - GET /api/ai-tutors/[id]/links - List links
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { addLink, listLinks } from '@/lib/ai-tutors/links-manager';

/**
 * POST /api/ai-tutors/[id]/links
 * Add URL link as reference material
 *
 * Body:
 * {
 *   url: string (required)
 *   title?: string
 *   description?: string
 *   link_type?: 'article' | 'video' | 'documentation' | 'other'
 *   skills?: string[]
 *   priority?: 1 | 2 | 3
 * }
 */
export async function POST(
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

    // Validate required fields
    if (!body.url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(body.url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Validate priority
    if (body.priority !== undefined) {
      if (![1, 2, 3].includes(body.priority)) {
        return NextResponse.json(
          { error: 'Priority must be 1 (high), 2 (medium), or 3 (low)' },
          { status: 400 }
        );
      }
    }

    // Add link
    const link = await addLink(
      id,
      {
        url: body.url,
        title: body.title,
        description: body.description,
        link_type: body.link_type,
        skills: body.skills,
        priority: body.priority,
      },
      user.id
    );

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error('Error adding link:', error);

    const errorMessage = (error as Error).message;

    if (errorMessage.includes('Not authorized')) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }

    if (errorMessage.includes('already been added')) {
      return NextResponse.json({ error: errorMessage }, { status: 409 });
    }

    return NextResponse.json(
      { error: errorMessage || 'Failed to add link' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai-tutors/[id]/links
 * List all links for AI tutor
 *
 * Returns: Array of links ordered by priority
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

    // List links
    const links = await listLinks(id);

    return NextResponse.json({ links }, { status: 200 });
  } catch (error) {
    console.error('Error listing links:', error);

    const errorMessage = (error as Error).message;

    if (errorMessage.includes('Not authorized')) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }

    return NextResponse.json(
      { error: errorMessage || 'Failed to list links' },
      { status: 500 }
    );
  }
}
