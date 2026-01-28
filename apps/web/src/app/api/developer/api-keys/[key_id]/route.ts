/**
 * DELETE /api/developer/api-keys/[key_id] - Revoke an API key
 */

import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{
    key_id: string;
  }>;
}

export async function DELETE(request: Request, props: RouteParams) {
  const params = await props.params;
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  // Validate key_id format (UUID)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(params.key_id)) {
    return NextResponse.json(
      { error: 'Invalid key ID format' },
      { status: 400 }
    );
  }

  // Call database function to revoke API key
  const { data, error } = await supabase.rpc('revoke_api_key', {
    p_key_id: params.key_id,
    p_revoked_by: profile.id,
  });

  if (error) {
    console.error('Failed to revoke API key:', error);
    return NextResponse.json(
      { error: 'Failed to revoke API key', details: error.message },
      { status: 500 }
    );
  }

  if (!data || !data.success) {
    return NextResponse.json(
      {
        error: data?.error || 'Failed to revoke API key',
        message: data?.message || 'Unknown error',
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'API key revoked successfully',
  });
}
