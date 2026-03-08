import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/workflow/templates
 * Fetch all workflow process templates
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
      .from('workflow_process_templates')
      .select('*')
      .order('category', { ascending: true })
      .order('complexity', { ascending: true });

    if (error) {
      console.error('[templates GET] DB error:', JSON.stringify(error));
      return NextResponse.json(
        { success: false, error: 'Failed to fetch templates', code: 'DB_ERROR', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[templates GET] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/workflow/templates
 * Create a new template
 */
export async function POST(request: Request) {
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
    const { name, description, category, complexity, nodes, edges, preview_steps, tags } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('workflow_process_templates')
      .insert({
        name,
        description: description || null,
        category: category || 'general',
        complexity: complexity || 'simple',
        nodes: nodes || [],
        edges: edges || [],
        preview_steps: preview_steps || [],
        tags: tags || [],
        is_system: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to create template', code: 'DB_ERROR' },
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
