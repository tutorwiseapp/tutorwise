/**
 * GET /api/virtualspace/workflows/[slug]
 * Returns a single published workflow by slug.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ slug: string }> }
) {
  const { slug } = await props.params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: workflow, error } = await supabase
    .from('session_workflows')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single();

  if (error || !workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }

  return NextResponse.json({ workflow });
}
