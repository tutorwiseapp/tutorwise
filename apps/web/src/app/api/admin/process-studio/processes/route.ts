import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/process-studio/processes
 * List all workflow processes for the current admin user
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('workflow_processes')
      .select('id, name, description, category, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch processes', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/process-studio/processes
 * Create a new workflow process
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, category, nodes, edges } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Name is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('workflow_processes')
      .insert({
        name,
        description: description || null,
        category: category || 'general',
        nodes: nodes || [],
        edges: edges || [],
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to create process', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
