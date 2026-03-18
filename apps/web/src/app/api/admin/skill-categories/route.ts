/**
 * GET /api/admin/skill-categories — list all skill categories
 *
 * Returns the full taxonomy ordered by domain then sort_order.
 * Public read (RLS policy on skill_categories allows SELECT for all).
 * Auth check still required to prevent unauthenticated API access.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export interface SkillCategory {
  id: string;
  slug: string;
  label: string;
  domain: 'human' | 'ai' | 'enterprise' | 'education' | 'workspace';
  parent_slug: string | null;
  color: string;
  description: string | null;
  built_in: boolean;
  sort_order: number;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('skill_categories')
      .select('id, slug, label, domain, parent_slug, color, description, built_in, sort_order')
      .order('domain')
      .order('sort_order');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
